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
} = require('./repository');

const buildMediaTableConfig = (type) => {
  if (type === 'image') {
    return {
      tableName: 'merchant_hotel_images',
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
    tableName: 'merchant_hotel_certificates',
    groupColumn: 'cert_group',
    groupList: hotelCertificateGroupList,
    groupLimits: hotelCertificateGroupLimits,
    groupLabels: hotelCertificateGroupLabels,
    filePathPrefix: '/uploads/hotel-certificates/',
    mediaField: 'hotelCertificatePlan',
    newFileLabel: '资质证件',
  };
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

const collectPlanUsage = ({ normalizedPlan, files, existingRows, config }) => {
  const rowMap = new Map(existingRows.map((row) => [Number(row.id), row]));
  const keepExistingIds = new Set();
  const usedNewIndexes = new Set();

  config.groupList.forEach((groupKey) => {
    const tokens = normalizedPlan[groupKey] || [];

    tokens.forEach((token) => {
      if (token.startsWith('existing:')) {
        const mediaId = Number(token.replace('existing:', ''));
        const row = rowMap.get(mediaId);
        if (!Number.isInteger(mediaId) || !row) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含无效的历史媒体`, config.mediaField);
        }
        if (String(row[config.groupColumn]) !== groupKey) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含跨分组媒体`, config.mediaField);
        }
        if (keepExistingIds.has(mediaId)) {
          throw createHandlerError('validation', `${config.groupLabels[groupKey]}包含重复的历史媒体`, config.mediaField);
        }
        keepExistingIds.add(mediaId);
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

  return {
    keepExistingIds,
    usedNewIndexes,
  };
};

const syncGroupedMediaByMerchantId = async ({ tx, merchantUserId, rawPlan, files = [], type }) => {
  const config = buildMediaTableConfig(type);
  const normalizedPlan = normalizeGroupedPlan(rawPlan, config);
  const existingRows = await runQuery(
    tx,
    `SELECT * FROM ${config.tableName}
     WHERE merchant_user_id = ?
     ORDER BY ${config.groupColumn} ASC, id ASC
     FOR UPDATE`,
    [merchantUserId]
  );
  const { keepExistingIds } = collectPlanUsage({
    normalizedPlan,
    files,
    existingRows,
    config,
  });

  const removedRows = existingRows.filter((row) => !keepExistingIds.has(Number(row.id)));
  if (removedRows.length) {
    const placeholders = removedRows.map(() => '?').join(', ');
    await runQuery(
      tx,
      `DELETE FROM ${config.tableName}
       WHERE merchant_user_id = ? AND id IN (${placeholders})`,
      [merchantUserId, ...removedRows.map((row) => row.id)]
    );
  }

  for (const groupKey of config.groupList) {
    const tokens = normalizedPlan[groupKey] || [];
    for (const token of tokens) {
      if (!token.startsWith('new:')) {
        continue;
      }

      const fileIndex = Number(token.replace('new:', ''));
      const file = files[fileIndex];
      const filePath = `${config.filePathPrefix}${file.filename}`;
      await runQuery(
        tx,
        `INSERT INTO ${config.tableName}
          (merchant_user_id, ${config.groupColumn}, file_path, file_name, mime_type, size_bytes)
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

const getGroupedHotelImages = async (merchantUserId) => {
  const rows = await getHotelImagesByMerchantId(merchantUserId);
  return groupHotelImages(rows);
};

const getGroupedHotelCertificates = async (merchantUserId) => {
  const rows = await getHotelCertificatesByMerchantId(merchantUserId);
  return groupHotelCertificates(rows);
};

const deleteRemovedHotelImageFiles = (filePaths = []) => {
  filePaths.forEach((filePath) => {
    const fileResult = deleteLocalHotelImageSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn('删除旧酒店图片失败:', { filePath, reason: fileResult.message });
    }
  });
};

const deleteRemovedHotelCertificateFiles = (filePaths = []) => {
  filePaths.forEach((filePath) => {
    const fileResult = deleteLocalHotelCertificateSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn('删除旧资质证件失败:', { filePath, reason: fileResult.message });
    }
  });
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
  syncGroupedMediaByMerchantId,
  deleteRemovedHotelImageFiles,
  deleteRemovedHotelCertificateFiles,
  validateReviewRequiredImages,
  validateReviewRequiredCertificates,
  validateReviewRequiredMedia,
};
