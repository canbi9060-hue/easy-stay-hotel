const {
  hotelImageGroupList,
  hotelImageGroupLimits,
  hotelImageGroupLabels,
  reviewRequiredImageGroups,
  hotelCertificateGroupList,
  hotelCertificateGroupLimits,
  hotelCertificateGroupLabels,
  reviewRequiredCertificateGroups,
} = require('./constants');
const {
  groupHotelImages,
  groupHotelCertificates,
  deleteLocalHotelImageSafely,
  deleteLocalHotelCertificateSafely,
} = require('./helpers');
const { createHandlerError, safeTrim } = require('../../utils/common');
const {
  runQuery,
  getHotelImagesByMerchantId,
  getHotelCertificatesByMerchantId,
  getHotelImageDraftsByMerchantId,
  getHotelCertificateDraftsByMerchantId,
} = require('./repository');
const { shouldUseHotelProfileDraft } = require('./draftState');

const buildMediaTableConfig = (type, scope = 'live') => {
  const isDraft = scope === 'draft';
  if (type === 'image') {
    return {
      tableName: isDraft ? 'merchant_hotel_image_drafts' : 'merchant_hotel_images',
      draftTableName: 'merchant_hotel_image_drafts',
      liveTableName: 'merchant_hotel_images',
      groupColumn: 'image_group',
      groupList: hotelImageGroupList,
      groupLimits: hotelImageGroupLimits,
      groupLabels: hotelImageGroupLabels,
      filePathPrefix: '/uploads/hotel-images/',
      mediaField: 'hotelImagePlan',
      newFileLabel: '酒店图片',
    };
  }

  return {
    tableName: isDraft ? 'merchant_hotel_certificate_drafts' : 'merchant_hotel_certificates',
    draftTableName: 'merchant_hotel_certificate_drafts',
    liveTableName: 'merchant_hotel_certificates',
    groupColumn: 'cert_group',
    groupList: hotelCertificateGroupList,
    groupLimits: hotelCertificateGroupLimits,
    groupLabels: hotelCertificateGroupLabels,
    filePathPrefix: '/uploads/hotel-certificates/',
    mediaField: 'hotelCertificatePlan',
    newFileLabel: '资质证件',
  };
};

const getScopedMediaRowsByMerchantId = async ({ merchantUserId, type, scope = 'live', executor = null }) => {
  if (type === 'image') {
    return scope === 'draft'
      ? getHotelImageDraftsByMerchantId(merchantUserId, '', executor)
      : getHotelImagesByMerchantId(merchantUserId, '', executor);
  }

  return scope === 'draft'
    ? getHotelCertificateDraftsByMerchantId(merchantUserId, '', executor)
    : getHotelCertificatesByMerchantId(merchantUserId, '', executor);
};

const normalizeGroupedPlan = (rawPlan, config) => {
  const source = rawPlan && typeof rawPlan === 'object' && !Array.isArray(rawPlan) ? rawPlan : {};
  const normalizedPlan = {};

  config.groupList.forEach((groupKey) => {
    const tokens = Array.isArray(source[groupKey]) ? source[groupKey] : [];
    const normalizedTokens = tokens.map((token) => safeTrim(token)).filter(Boolean);

    if (normalizedTokens.length !== tokens.length) {
      throw createHandlerError('validation', `${config.groupLabels[groupKey]}的媒体计划格式不正确`, config.mediaField);
    }
    if (normalizedTokens.length > config.groupLimits[groupKey]) {
      throw createHandlerError(
        'validation',
        `${config.groupLabels[groupKey]}最多上传 ${config.groupLimits[groupKey]} 张`,
        config.mediaField
      );
    }
    if (new Set(normalizedTokens).size !== normalizedTokens.length) {
      throw createHandlerError('validation', `${config.groupLabels[groupKey]}存在重复媒体项`, config.mediaField);
    }

    normalizedPlan[groupKey] = normalizedTokens;
  });

  return normalizedPlan;
};

const collectPlanUsage = ({ normalizedPlan, files, sourceRows, config }) => {
  const sourceRowMap = new Map(sourceRows.map((row) => [Number(row.id), row]));
  const usedExistingIds = new Set();
  const usedNewIndexes = new Set();

  config.groupList.forEach((groupKey) => {
    const tokens = normalizedPlan[groupKey] || [];

    tokens.forEach((token) => {
      if (token.startsWith('existing:')) {
        const mediaId = Number(token.replace('existing:', ''));
        const row = sourceRowMap.get(mediaId);
        if (!Number.isInteger(mediaId) || !row) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含无效的历史媒体`, config.mediaField);
        }
        if (String(row[config.groupColumn]) !== groupKey) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含跨分组媒体`, config.mediaField);
        }
        if (usedExistingIds.has(mediaId)) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含重复的历史媒体`, config.mediaField);
        }
        usedExistingIds.add(mediaId);
        return;
      }

      if (token.startsWith('new:')) {
        const fileIndex = Number(token.replace('new:', ''));
        if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= files.length || !files[fileIndex]) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含无效的新媒体`, config.mediaField);
        }
        if (usedNewIndexes.has(fileIndex)) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含重复的新媒体`, config.mediaField);
        }
        usedNewIndexes.add(fileIndex);
        return;
      }

      throw createHandlerError('validation', `${config.groupLabels[groupKey]}的媒体计划格式不正确`, config.mediaField);
    });
  });

  if (usedNewIndexes.size !== files.length) {
    throw createHandlerError('validation', `存在未参与保存的${config.newFileLabel}`, config.mediaField);
  }

  return { sourceRowMap };
};

const deleteScopedMediaRowsByMerchantId = async ({ tx, merchantUserId, type, scope = 'live' }) => {
  const config = buildMediaTableConfig(type, scope);
  const rows = await getScopedMediaRowsByMerchantId({
    merchantUserId,
    type,
    scope,
    executor: tx,
  });

  if (rows.length) {
    await runQuery(
      tx,
      `DELETE FROM ${config.tableName} WHERE merchant_user_id = ?`,
      [merchantUserId]
    );
  }

  return rows;
};

const replaceGroupedMediaByMerchantId = async ({
  tx,
  merchantUserId,
  rawPlan,
  files = [],
  type,
  sourceScope = 'live',
  targetScope = 'live',
}) => {
  const targetConfig = buildMediaTableConfig(type, targetScope);
  const normalizedPlan = normalizeGroupedPlan(rawPlan, targetConfig);
  const sourceRows = await getScopedMediaRowsByMerchantId({
    merchantUserId,
    type,
    scope: sourceScope,
    executor: tx,
  });
  const { sourceRowMap } = collectPlanUsage({
    normalizedPlan,
    files,
    sourceRows,
    config: targetConfig,
  });
  const removedRows = await deleteScopedMediaRowsByMerchantId({
    tx,
    merchantUserId,
    type,
    scope: targetScope,
  });

  for (const groupKey of targetConfig.groupList) {
    const tokens = normalizedPlan[groupKey] || [];

    for (const token of tokens) {
      if (token.startsWith('existing:')) {
        const sourceRow = sourceRowMap.get(Number(token.replace('existing:', '')));
        await runQuery(
          tx,
          `INSERT INTO ${targetConfig.tableName}
            (merchant_user_id, ${targetConfig.groupColumn}, file_path, file_name, mime_type, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            merchantUserId,
            groupKey,
            sourceRow.file_path,
            sourceRow.file_name || '',
            sourceRow.mime_type || '',
            Number(sourceRow.size_bytes) || 0,
          ]
        );
        continue;
      }

      const fileIndex = Number(token.replace('new:', ''));
      const file = files[fileIndex];
      const filePath = `${targetConfig.filePathPrefix}${file.filename}`;
      await runQuery(
        tx,
        `INSERT INTO ${targetConfig.tableName}
          (merchant_user_id, ${targetConfig.groupColumn}, file_path, file_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          merchantUserId,
          groupKey,
          filePath,
          file.originalname || '',
          file.mimetype || '',
          Number(file.size) || 0,
        ]
      );
    }
  }

  return removedRows.map((row) => row.file_path);
};

const clearGroupedMediaDraftsByMerchantId = async ({ tx, merchantUserId, type }) => {
  const removedRows = await deleteScopedMediaRowsByMerchantId({
    tx,
    merchantUserId,
    type,
    scope: 'draft',
  });
  return removedRows.map((row) => row.file_path);
};

const getGroupedHotelImages = async (merchantUserId, options = {}) => {
  const useDraft = options.scope
    ? options.scope === 'draft'
    : (shouldUseHotelProfileDraft(options.reviewStatus) && Boolean(options.hasProfileDraft));
  const rows = await getScopedMediaRowsByMerchantId({
    merchantUserId,
    type: 'image',
    scope: useDraft ? 'draft' : 'live',
    executor: options.executor || null,
  });
  return groupHotelImages(rows);
};

const getGroupedHotelCertificates = async (merchantUserId, options = {}) => {
  const useDraft = options.scope
    ? options.scope === 'draft'
    : (shouldUseHotelProfileDraft(options.reviewStatus) && Boolean(options.hasProfileDraft));
  const rows = await getScopedMediaRowsByMerchantId({
    merchantUserId,
    type: 'certificate',
    scope: useDraft ? 'draft' : 'live',
    executor: options.executor || null,
  });
  return groupHotelCertificates(rows);
};

const getReferencedMediaFilePaths = async ({ filePaths = [], type }) => {
  const uniquePaths = [...new Set(filePaths.filter(Boolean))];
  if (!uniquePaths.length) {
    return new Set();
  }

  const config = buildMediaTableConfig(type, 'live');
  const placeholders = uniquePaths.map(() => '?').join(', ');
  const rows = await runQuery(
    null,
    `SELECT DISTINCT file_path
     FROM ${config.liveTableName}
     WHERE file_path IN (${placeholders})
     UNION
     SELECT DISTINCT file_path
     FROM ${config.draftTableName}
     WHERE file_path IN (${placeholders})`,
    [...uniquePaths, ...uniquePaths]
  );

  return new Set(rows.map((row) => row.file_path));
};

const deleteRemovedHotelMediaFiles = async ({ filePaths = [], type }) => {
  const uniquePaths = [...new Set(filePaths.filter(Boolean))];
  if (!uniquePaths.length) {
    return;
  }

  const referencedFilePaths = await getReferencedMediaFilePaths({ filePaths: uniquePaths, type });
  const deleteFileSafely = type === 'image'
    ? deleteLocalHotelImageSafely
    : deleteLocalHotelCertificateSafely;
  const logLabel = type === 'image' ? '删除旧酒店图片失败:' : '删除旧资质证件失败:';

  uniquePaths.forEach((filePath) => {
    if (referencedFilePaths.has(filePath)) {
      return;
    }

    const fileResult = deleteFileSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn(logLabel, { filePath, reason: fileResult.message });
    }
  });
};

const deleteRemovedHotelImageFiles = async (filePaths = []) => {
  await deleteRemovedHotelMediaFiles({ filePaths, type: 'image' });
};

const deleteRemovedHotelCertificateFiles = async (filePaths = []) => {
  await deleteRemovedHotelMediaFiles({ filePaths, type: 'certificate' });
};

const validateReviewRequiredImages = async (merchantUserId, executor = null) => {
  return validateRequiredGroupedMedia({
    merchantUserId,
    executor,
    tableName: 'merchant_hotel_images',
    groupColumn: 'image_group',
    requiredGroups: reviewRequiredImageGroups,
    groupLabels: hotelImageGroupLabels,
    fieldPrefix: 'hotelImages',
  });
};

const validateReviewRequiredCertificates = async (merchantUserId, executor = null) => {
  return validateRequiredGroupedMedia({
    merchantUserId,
    executor,
    tableName: 'merchant_hotel_certificates',
    groupColumn: 'cert_group',
    requiredGroups: reviewRequiredCertificateGroups,
    groupLabels: hotelCertificateGroupLabels,
    fieldPrefix: 'hotelCertificates',
  });
};

const validateRequiredGroupedMedia = async ({
  merchantUserId,
  executor = null,
  tableName,
  groupColumn,
  requiredGroups,
  groupLabels,
  fieldPrefix,
}) => {
  const placeholders = requiredGroups.map(() => '?').join(',');
  const rows = await runQuery(
    executor,
    `SELECT ${groupColumn} AS group_key, COUNT(*) AS total
     FROM ${tableName}
     WHERE merchant_user_id = ?
       AND ${groupColumn} IN (${placeholders})
     GROUP BY ${groupColumn}`,
    [merchantUserId, ...requiredGroups]
  );

  const counters = rows.reduce((acc, row) => {
    acc[row.group_key] = Number(row.total) || 0;
    return acc;
  }, {});

  for (const groupKey of requiredGroups) {
    if ((counters[groupKey] || 0) >= 1) {
      continue;
    }
    return {
      ok: false,
      field: `${fieldPrefix}.${groupKey}`,
      message: `${groupLabels[groupKey]}至少上传 1 张后才能提交审核`,
    };
  }

  return { ok: true };
};

const validateReviewRequiredMedia = async (merchantUserId, executor = null) => {
  const imageValidation = await validateReviewRequiredImages(merchantUserId, executor);
  if (!imageValidation.ok) {
    return imageValidation;
  }
  return validateReviewRequiredCertificates(merchantUserId, executor);
};

module.exports = {
  getGroupedHotelImages,
  getGroupedHotelCertificates,
  replaceGroupedMediaByMerchantId,
  clearGroupedMediaDraftsByMerchantId,
  deleteRemovedHotelImageFiles,
  deleteRemovedHotelCertificateFiles,
  validateReviewRequiredImages,
  validateReviewRequiredCertificates,
  validateReviewRequiredMedia,
};
