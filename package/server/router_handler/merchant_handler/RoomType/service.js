const { withTransaction } = require('../../../db/index');
const { createHandlerError, parseJsonArray, parseJsonObject, safeTrim } = require('../../utils/common');
const {
  roomTypeAuditStatus,
  maxRoomNameLength,
  maxBedConfigLength,
  maxDescriptionLength,
  maxRoomTypeImageCount,
} = require('./constants');
const { facilityOptionLabelMap } = require('../HotelInfo/constants');
const {
  normalizeFacilityTags,
  normalizeIntIdList,
  toNullableNumber,
  toPriceCents,
  deleteLocalRoomTypeImageSafely,
  mapRoomTypeSummary,
  mapRoomTypeDetail,
  mapRoomTypeDraft,
} = require('./helpers');
const {
  runQuery,
  lockMerchantRow,
  getMerchantRoomTypeRowById,
  getRoomTypeImagesByRoomTypeId,
  getRoomTypeDraftRowsByMerchantUserId,
  getRoomTypeDraftRowBySource,
  saveRoomTypeDraftBySource,
  deleteRoomTypeDraftBySource,
  getRoomTypeDraftImagesByDraftId,
  getRoomTypeDraftImagesByDraftIds,
  getReferencedRoomTypeImageFilePaths,
  getMerchantHotelReviewStatus,
  getMerchantHotelRoomTypeMeta,
} = require('./repository');
const { countRoomsByRoomTypeId } = require('../Room/repository');

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const roundTwoDecimals = (value) => Number(Number(value).toFixed(2));

const normalizePositiveInt = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

const normalizeDraftPrice = (value) => {
  const numericValue = toNullableNumber(value);
  if (numericValue === null || Number.isNaN(numericValue) || numericValue <= 0) {
    return null;
  }
  return roundTwoDecimals(numericValue);
};

const getRawRoomTypeImagePlan = (payload, files = []) => {
  if (Array.isArray(payload?.imagePlan)) {
    return payload.imagePlan;
  }

  const keptImageIds = normalizeIntIdList(payload?.keptImageIds);
  if (!keptImageIds.length && !files.length) {
    return [];
  }

  return [
    ...keptImageIds.map((id) => `live:${id}`),
    ...files.map((_, index) => `new:${index}`),
  ];
};

const parseRoomTypeDraftRequestPayload = (payload) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const formValues = isPlainObject(source?.formValues) ? source.formValues : source;
  const imagePlan = getRawRoomTypeImagePlan(source);

  return {
    formValues: isPlainObject(formValues) ? formValues : {},
    imagePlan,
  };
};

const normalizeRoomTypeDraftFormValues = (value) => {
  const source = isPlainObject(value) ? value : {};

  return {
    roomName: safeTrim(source.roomName).slice(0, maxRoomNameLength),
    bedConfig: safeTrim(source.bedConfig).slice(0, maxBedConfigLength),
    areaSize: (() => {
      const numericValue = toNullableNumber(source.areaSize);
      return numericValue === null || Number.isNaN(numericValue) || numericValue <= 0 ? null : roundTwoDecimals(numericValue);
    })(),
    maxGuests: normalizePositiveInt(source.maxGuests),
    description: safeTrim(source.description).slice(0, maxDescriptionLength),
    facilityTags: normalizeFacilityTags(source.facilityTags),
    salePrice: normalizeDraftPrice(source.salePrice),
    listPrice: normalizeDraftPrice(source.listPrice),
  };
};

const collectHotelFacilityLabels = (hotelMetaRow) => {
  const facilitySelections = parseJsonObject(hotelMetaRow?.facility_selections);
  const customFacilities = parseJsonArray(hotelMetaRow?.custom_facilities);
  const selectedLabels = Object.values(facilitySelections)
    .flatMap((list) => (Array.isArray(list) ? list : []))
    .map((value) => facilityOptionLabelMap[value] || '')
    .filter(Boolean);
  const customLabels = customFacilities
    .filter((item) => typeof item === 'string')
    .map((item) => safeTrim(item))
    .filter(Boolean);

  return [...new Set([...selectedLabels, ...customLabels])];
};

const validateRoomTypePayload = (payload, options = {}) => {
  const normalizedValues = normalizeRoomTypeDraftFormValues(payload);
  const hotelMeta = options.hotelMeta || null;

  if (!normalizedValues.roomName) {
    return { message: '请输入房型名称', field: 'roomName' };
  }
  if (!normalizedValues.bedConfig) {
    return { message: '请输入床型配置', field: 'bedConfig' };
  }
  if (normalizedValues.areaSize === null) {
    return { message: '请输入合法的房间面积', field: 'areaSize' };
  }
  if (!normalizedValues.maxGuests) {
    return { message: '请输入合法的最多入住人数', field: 'maxGuests' };
  }
  if (!normalizedValues.description) {
    return { message: '请输入房型描述', field: 'description' };
  }

  if (!normalizedValues.facilityTags.length) {
    return { message: '请至少选择 1 个房型设施标签', field: 'facilityTags' };
  }
  const allowedFacilityLabels = collectHotelFacilityLabels(hotelMeta);
  if (!allowedFacilityLabels.length) {
    return { message: '请先在酒店信息页勾选或添加设施', field: 'facilityTags' };
  }
  const allowedFacilitySet = new Set(allowedFacilityLabels);
  if (normalizedValues.facilityTags.some((item) => !allowedFacilitySet.has(item))) {
    return { message: '房型设施标签必须从酒店信息页已配置设施中选择', field: 'facilityTags' };
  }

  if (normalizedValues.salePrice === null) {
    return { message: '请输入合法的销售价', field: 'salePrice' };
  }
  if (normalizedValues.listPrice === null) {
    return { message: '请输入合法的划线价', field: 'listPrice' };
  }
  if (normalizedValues.listPrice < normalizedValues.salePrice) {
    return { message: '划线价不能低于销售价', field: 'listPrice' };
  }

  return {
    payload: {
      roomName: normalizedValues.roomName,
      bedConfig: normalizedValues.bedConfig,
      areaSize: normalizedValues.areaSize,
      maxGuests: normalizedValues.maxGuests,
      description: normalizedValues.description,
      facilityTags: normalizedValues.facilityTags,
      salePriceCents: toPriceCents(normalizedValues.salePrice),
      listPriceCents: toPriceCents(normalizedValues.listPrice),
    },
  };
};

const normalizeRoomTypeImagePlan = ({
  rawPlan,
  files = [],
  liveRows = [],
  draftRows = [],
  allowEmpty = false,
}) => {
  const tokens = Array.isArray(rawPlan) ? rawPlan.map((item) => safeTrim(item)) : [];
  if (tokens.some((item) => !item)) {
    throw createHandlerError('validation', '房型图片同步计划格式不正确', 'images');
  }
  if (tokens.length > maxRoomTypeImageCount) {
    throw createHandlerError('validation', `房型图片最多上传 ${maxRoomTypeImageCount} 张`, 'images');
  }

  const liveRowMap = new Map(liveRows.map((row) => [Number(row.id), row]));
  const draftRowMap = new Map(draftRows.map((row) => [Number(row.id), row]));
  const usedLiveIds = new Set();
  const usedDraftIds = new Set();
  const usedNewIndexes = new Set();

  const planItems = tokens.map((token) => {
    if (token.startsWith('live:')) {
      const imageId = Number(token.replace('live:', ''));
      const row = liveRowMap.get(imageId);
      if (!Number.isInteger(imageId) || !row || usedLiveIds.has(imageId)) {
        throw createHandlerError('validation', '房型图片同步计划包含无效的历史图片', 'images');
      }
      usedLiveIds.add(imageId);
      return { source: 'live', row };
    }

    if (token.startsWith('draft:')) {
      const imageId = Number(token.replace('draft:', ''));
      const row = draftRowMap.get(imageId);
      if (!Number.isInteger(imageId) || !row || usedDraftIds.has(imageId)) {
        throw createHandlerError('validation', '房型图片同步计划包含无效的草稿图片', 'images');
      }
      usedDraftIds.add(imageId);
      return { source: 'draft', row };
    }

    if (token.startsWith('new:')) {
      const fileIndex = Number(token.replace('new:', ''));
      const file = files[fileIndex];
      if (!Number.isInteger(fileIndex) || fileIndex < 0 || !file || usedNewIndexes.has(fileIndex)) {
        throw createHandlerError('validation', '房型图片同步计划包含无效的新图片', 'images');
      }
      usedNewIndexes.add(fileIndex);
      return { source: 'new', file };
    }

    throw createHandlerError('validation', '房型图片同步计划格式不正确', 'images');
  });

  if (usedNewIndexes.size !== files.length) {
    throw createHandlerError('validation', '存在未参与保存的房型图片', 'images');
  }
  if (!allowEmpty && !planItems.length) {
    throw createHandlerError('validation', '请至少上传 1 张房型图片', 'images');
  }

  return planItems;
};

const insertLiveRoomTypeImages = async (tx, roomTypeId, planItems = []) => {
  for (const item of planItems) {
    if (item.source === 'new') {
      const filePath = `/uploads/room-type-images/${item.file.filename}`;
      await runQuery(
        tx,
        `INSERT INTO merchant_room_type_images
          (room_type_id, file_path, file_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          roomTypeId,
          filePath,
          item.file.originalname || '',
          item.file.mimetype || '',
          Number(item.file.size) || 0,
        ]
      );
      continue;
    }

    const row = item.row;
    await runQuery(
      tx,
      `INSERT INTO merchant_room_type_images
        (room_type_id, file_path, file_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        roomTypeId,
        row.file_path,
        row.file_name || '',
        row.mime_type || '',
        Number(row.size_bytes) || 0,
      ]
    );
  }
};

const replaceRoomTypeDraftImages = async ({
  tx,
  draftId,
  rawPlan,
  files = [],
  liveRows = [],
  draftRows = [],
}) => {
  const planItems = normalizeRoomTypeImagePlan({
    rawPlan,
    files,
    liveRows,
    draftRows,
    allowEmpty: true,
  });

  if (draftRows.length) {
    await runQuery(
      tx,
      `DELETE FROM merchant_room_type_draft_images WHERE draft_id = ?`,
      [draftId]
    );
  }

  for (const item of planItems) {
    if (item.source === 'new') {
      const filePath = `/uploads/room-type-images/${item.file.filename}`;
      await runQuery(
        tx,
        `INSERT INTO merchant_room_type_draft_images
          (draft_id, file_path, file_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          draftId,
          filePath,
          item.file.originalname || '',
          item.file.mimetype || '',
          Number(item.file.size) || 0,
        ]
      );
      continue;
    }

    const row = item.row;
    await runQuery(
      tx,
      `INSERT INTO merchant_room_type_draft_images
        (draft_id, file_path, file_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        draftId,
        row.file_path,
        row.file_name || '',
        row.mime_type || '',
        Number(row.size_bytes) || 0,
      ]
    );
  }

  return draftRows.map((row) => row.file_path);
};

const clearRoomTypeDraftBySourceWithFiles = async ({
  tx,
  merchantUserId,
  sourceRoomTypeId,
}) => {
  const draftRow = await getRoomTypeDraftRowBySource(merchantUserId, sourceRoomTypeId, tx, { forUpdate: true });
  if (!draftRow) {
    return [];
  }

  const draftRows = await getRoomTypeDraftImagesByDraftId(draftRow.id, tx, { forUpdate: true });
  await deleteRoomTypeDraftBySource(merchantUserId, sourceRoomTypeId, tx);
  return draftRows.map((row) => row.file_path);
};

const deleteRemovedRoomTypeImageFiles = async (filePaths = []) => {
  const uniquePaths = [...new Set((Array.isArray(filePaths) ? filePaths : []).filter(Boolean))];
  if (!uniquePaths.length) {
    return;
  }

  const referencedRows = await getReferencedRoomTypeImageFilePaths(uniquePaths);
  const referencedSet = new Set(referencedRows.map((row) => row.file_path));

  uniquePaths.forEach((filePath) => {
    if (referencedSet.has(filePath)) {
      return;
    }

    const fileResult = deleteLocalRoomTypeImageSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn('删除房型图片失败:', { filePath, reason: fileResult.message });
    }
  });
};

const getMerchantRoomTypeDraftsView = async (merchantUserId, executor = null) => {
  const draftRows = await getRoomTypeDraftRowsByMerchantUserId(merchantUserId, executor);
  const visibleDraftRows = draftRows.filter((row) => {
    const sourceRoomTypeId = Number(row.source_room_type_id) || 0;
    if (sourceRoomTypeId === 0) {
      return true;
    }

    if (!Number.isInteger(Number(row.source_audit_status))) {
      return false;
    }

    return Number(row.source_audit_status) !== roomTypeAuditStatus.pending;
  });

  if (!visibleDraftRows.length) {
    return {
      createDraft: null,
      editDrafts: [],
    };
  }

  const draftImageRows = await getRoomTypeDraftImagesByDraftIds(
    visibleDraftRows.map((row) => row.id),
    executor
  );
  const imageMap = draftImageRows.reduce((acc, row) => {
    const draftId = Number(row.draft_id);
    if (!acc[draftId]) {
      acc[draftId] = [];
    }
    acc[draftId].push(row);
    return acc;
  }, {});

  const mappedDrafts = visibleDraftRows.map((row) => mapRoomTypeDraft(row, imageMap[Number(row.id)] || []));
  return {
    createDraft: mappedDrafts.find((item) => item.draftType === 'create') || null,
    editDrafts: mappedDrafts.filter((item) => item.draftType === 'edit'),
  };
};

const ensureMerchantHotelApprovedForCreate = async (merchantUserId, executor = null) => {
  const reviewStatus = await getMerchantHotelReviewStatus(merchantUserId, executor);
  if (reviewStatus !== 'approved') {
    throw createHandlerError('validation', '酒店信息审核通过后才能添加房型', 'reviewStatus');
  }
};

const ensureEditableRoomType = async (merchantUserId, roomTypeId, executor = null) => {
  const roomRow = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId, executor, { forUpdate: true });
  if (!roomRow) {
    throw createHandlerError('notFound', '房型不存在或无权限操作', 'id');
  }
  if (Number(roomRow.audit_status) === roomTypeAuditStatus.pending) {
    throw createHandlerError('validation', '房型正在审核中，暂不允许修改。', 'auditStatus');
  }
  return roomRow;
};

const saveMerchantRoomTypeDraft = async ({
  merchantUserId,
  sourceRoomTypeId,
  formValues,
  rawImagePlan,
  files = [],
}) => {
  const removedFilePaths = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);

    let liveRows = [];
    if (sourceRoomTypeId > 0) {
      await ensureEditableRoomType(merchantUserId, sourceRoomTypeId, tx);
      liveRows = await getRoomTypeImagesByRoomTypeId(sourceRoomTypeId, tx, { forUpdate: true });
    } else {
      await ensureMerchantHotelApprovedForCreate(merchantUserId, tx);
    }

    const normalizedFormValues = normalizeRoomTypeDraftFormValues(formValues);
    const existingDraftRow = await getRoomTypeDraftRowBySource(merchantUserId, sourceRoomTypeId, tx, { forUpdate: true });
    const existingDraftImages = existingDraftRow
      ? await getRoomTypeDraftImagesByDraftId(existingDraftRow.id, tx, { forUpdate: true })
      : [];

    const savedDraftRow = await saveRoomTypeDraftBySource(
      merchantUserId,
      sourceRoomTypeId,
      { formValues: normalizedFormValues },
      tx
    );
    const nextDraftImages = existingDraftRow && Number(savedDraftRow.id) === Number(existingDraftRow.id)
      ? existingDraftImages
      : [];

    return replaceRoomTypeDraftImages({
      tx,
      draftId: savedDraftRow.id,
      rawPlan: rawImagePlan,
      files,
      liveRows,
      draftRows: nextDraftImages,
    });
  });

  await deleteRemovedRoomTypeImageFiles(removedFilePaths);
  const draftView = await getMerchantRoomTypeDraftsView(merchantUserId);
  return sourceRoomTypeId > 0
    ? draftView.editDrafts.find((item) => Number(item.sourceRoomTypeId) === Number(sourceRoomTypeId)) || null
    : draftView.createDraft;
};

const saveMerchantRoomType = async ({
  merchantUserId,
  roomTypeId = null,
  normalizedPayload,
  rawImagePlan,
  files = [],
}) => {
  const {
    roomName,
    bedConfig,
    areaSize,
    maxGuests,
    description,
    facilityTags,
    salePriceCents,
    listPriceCents,
  } = normalizedPayload;

  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);

    let liveImageRows = [];
    let sourceDraftRoomTypeId = 0;

    if (roomTypeId) {
      await ensureEditableRoomType(merchantUserId, roomTypeId, tx);
      liveImageRows = await getRoomTypeImagesByRoomTypeId(roomTypeId, tx, { forUpdate: true });
      sourceDraftRoomTypeId = roomTypeId;
    } else {
      await ensureMerchantHotelApprovedForCreate(merchantUserId, tx);
    }

    const draftRow = await getRoomTypeDraftRowBySource(merchantUserId, sourceDraftRoomTypeId, tx, { forUpdate: true });
    const draftImageRows = draftRow
      ? await getRoomTypeDraftImagesByDraftId(draftRow.id, tx, { forUpdate: true })
      : [];
    const planItems = normalizeRoomTypeImagePlan({
      rawPlan,
      files,
      liveRows: liveImageRows,
      draftRows: draftImageRows,
      allowEmpty: false,
    });

    let targetRoomTypeId = roomTypeId;
    if (!targetRoomTypeId) {
      const insertResult = await runQuery(
        tx,
        `INSERT INTO merchant_room_types
          (merchant_user_id, room_name, bed_config, area_size, max_guests, description, facility_tags, sale_price_cents, list_price_cents, audit_status, audit_remark, is_on_sale, is_forced_off_sale, audit_admin_id, forced_off_admin_id, audit_at, forced_off_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          merchantUserId,
          roomName,
          bedConfig,
          areaSize,
          maxGuests,
          description,
          JSON.stringify(facilityTags),
          salePriceCents,
          listPriceCents,
          roomTypeAuditStatus.pending,
          '',
          0,
          0,
          null,
          null,
          null,
          null,
        ]
      );
      targetRoomTypeId = Number(insertResult.insertId);
    } else {
      await runQuery(
        tx,
        `UPDATE merchant_room_types
         SET room_name = ?,
             bed_config = ?,
             area_size = ?,
             max_guests = ?,
             description = ?,
             facility_tags = ?,
             sale_price_cents = ?,
             list_price_cents = ?,
             audit_status = ?,
             audit_remark = '',
             is_on_sale = 0,
             is_forced_off_sale = 0,
             audit_admin_id = NULL,
             forced_off_admin_id = NULL,
             audit_at = NULL,
             forced_off_at = NULL
         WHERE id = ? AND merchant_user_id = ?`,
        [
          roomName,
          bedConfig,
          areaSize,
          maxGuests,
          description,
          JSON.stringify(facilityTags),
          salePriceCents,
          listPriceCents,
          roomTypeAuditStatus.pending,
          targetRoomTypeId,
          merchantUserId,
        ]
      );
    }

    if (liveImageRows.length) {
      await runQuery(
        tx,
        `DELETE FROM merchant_room_type_images WHERE room_type_id = ?`,
        [targetRoomTypeId]
      );
    }
    await insertLiveRoomTypeImages(tx, targetRoomTypeId, planItems);

    const removedDraftPaths = await clearRoomTypeDraftBySourceWithFiles({
      tx,
      merchantUserId,
      sourceRoomTypeId: sourceDraftRoomTypeId,
    });

    const latestRoomRow = await getMerchantRoomTypeRowById(merchantUserId, targetRoomTypeId, tx);
    const latestImageRows = await getRoomTypeImagesByRoomTypeId(targetRoomTypeId, tx);
    return {
      roomRow: latestRoomRow,
      imageRows: latestImageRows,
      removedFilePaths: [
        ...liveImageRows.map((row) => row.file_path),
        ...removedDraftPaths,
      ],
    };
  });

  await deleteRemovedRoomTypeImageFiles(result.removedFilePaths);
  return mapRoomTypeDetail(result.roomRow, result.imageRows);
};

const submitMerchantRoomType = async ({
  merchantUserId,
  roomTypeId = null,
  payload,
  files = [],
}) => {
  const hotelMeta = await getMerchantHotelRoomTypeMeta(merchantUserId);
  if (!roomTypeId) {
    await ensureMerchantHotelApprovedForCreate(merchantUserId);
  }

  const validated = validateRoomTypePayload(payload, { hotelMeta });
  if (!validated.payload) {
    throw createHandlerError('validation', validated.message, validated.field);
  }

  return saveMerchantRoomType({
    merchantUserId,
    roomTypeId,
    normalizedPayload: validated.payload,
    rawImagePlan: getRawRoomTypeImagePlan(payload, files),
    files,
  });
};

const updateRoomTypeSaleStatus = async ({ merchantUserId, roomTypeId, isOnSale }) => {
  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const row = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId, tx, { forUpdate: true });
    if (!row) {
      throw createHandlerError('notFound', '房型不存在或无权限操作', 'id');
    }
    if (Number(row.audit_status) !== roomTypeAuditStatus.approved) {
      throw createHandlerError('validation', '仅审核通过的房型可操作上下架', 'auditStatus');
    }
    if (Number(row.is_forced_off_sale) === 1) {
      throw createHandlerError('validation', '已被平台强行下架，请联系管理员', 'isOnSale');
    }

    await runQuery(
      tx,
      `UPDATE merchant_room_types
       SET is_on_sale = ?
       WHERE id = ? AND merchant_user_id = ?`,
      [isOnSale ? 1 : 0, roomTypeId, merchantUserId]
    );

    return getMerchantRoomTypeRowById(merchantUserId, roomTypeId, tx);
  });

  return mapRoomTypeSummary(result);
};

const batchUpdateRoomTypeSaleStatus = async ({ merchantUserId, roomTypeIds, isOnSale }) => {
  const uniqueIds = normalizeIntIdList(roomTypeIds);
  if (!uniqueIds.length) {
    throw createHandlerError('validation', '请选择需要批量操作的房型', 'roomTypeIds');
  }

  return withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const rows = await runQuery(
      tx,
      `SELECT id, audit_status, is_forced_off_sale
       FROM merchant_room_types
       WHERE merchant_user_id = ? AND id IN (${placeholders})
       FOR UPDATE`,
      [merchantUserId, ...uniqueIds]
    );

    const approvedIds = rows
      .filter((row) => Number(row.audit_status) === roomTypeAuditStatus.approved && Number(row.is_forced_off_sale) !== 1)
      .map((row) => Number(row.id));

    if (approvedIds.length) {
      const approvedPlaceholders = approvedIds.map(() => '?').join(', ');
      await runQuery(
        tx,
        `UPDATE merchant_room_types
         SET is_on_sale = ?
         WHERE merchant_user_id = ? AND id IN (${approvedPlaceholders})`,
        [isOnSale ? 1 : 0, merchantUserId, ...approvedIds]
      );
    }

    const approvedSet = new Set(approvedIds);
    return {
      affectedIds: approvedIds,
      skippedIds: uniqueIds.filter((id) => !approvedSet.has(id)),
    };
  });
};

const deleteMerchantRoomTypeById = async (merchantUserId, roomTypeId) => {
  const removedFilePaths = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const row = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId, tx, { forUpdate: true });
    if (!row) {
      throw createHandlerError('notFound', '房型不存在或无权限删除', 'id');
    }
    if (Number(row.audit_status) === roomTypeAuditStatus.pending) {
      throw createHandlerError('validation', '房型正在审核中，暂不允许删除。', 'auditStatus');
    }
    const referencedRoomCount = await countRoomsByRoomTypeId(roomTypeId, tx);
    if (referencedRoomCount > 0) {
      throw createHandlerError('validation', '该房型已绑定房间，暂不允许删除。', 'id');
    }

    const imageRows = await getRoomTypeImagesByRoomTypeId(roomTypeId, tx, { forUpdate: true });
    const draftImagePaths = await clearRoomTypeDraftBySourceWithFiles({
      tx,
      merchantUserId,
      sourceRoomTypeId: roomTypeId,
    });

    await runQuery(
      tx,
      `DELETE FROM merchant_room_type_images WHERE room_type_id = ?`,
      [roomTypeId]
    );
    await runQuery(
      tx,
      `DELETE FROM merchant_room_types WHERE id = ? AND merchant_user_id = ?`,
      [roomTypeId, merchantUserId]
    );

    return [
      ...imageRows.map((item) => item.file_path),
      ...draftImagePaths,
    ];
  });

  await deleteRemovedRoomTypeImageFiles(removedFilePaths);
};

const deleteMerchantRoomTypeDraftBySource = async (merchantUserId, sourceRoomTypeId) => {
  const removedFilePaths = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    return clearRoomTypeDraftBySourceWithFiles({
      tx,
      merchantUserId,
      sourceRoomTypeId,
    });
  });

  await deleteRemovedRoomTypeImageFiles(removedFilePaths);
};

module.exports = {
  parseRoomTypeDraftRequestPayload,
  getMerchantRoomTypeDraftsView,
  saveMerchantRoomTypeDraft,
  submitMerchantRoomType,
  updateRoomTypeSaleStatus,
  batchUpdateRoomTypeSaleStatus,
  deleteMerchantRoomTypeDraftBySource,
  deleteMerchantRoomTypeById,
};
