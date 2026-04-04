const { withTransaction } = require('../../../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { roomTypeImageUpload } = require('../../../middleware/upload');
const { createHandlerError, parseRequestObject, safeTrim } = require('../../utils/common');
const { parsePageParams, normalizeOptionalEnum } = require('../../utils/query');
const { withMulterUpload } = require('../../utils/upload');
const {
  roomTypeAuditStatus,
  auditStatusList,
  onSaleStatusList,
  maxRoomNameLength,
  maxBedConfigLength,
  maxFloorTextLength,
  maxDescriptionLength,
  maxRoomTypeImageCount,
} = require('./constants');
const {
  normalizeFacilityTags,
  normalizeIntIdList,
  toNullableNumber,
  toPriceCents,
  deleteLocalRoomTypeImageSafely,
  mapRoomTypeSummary,
  mapRoomTypeDetail,
} = require('./helpers');
const {
  runQuery,
  lockMerchantRow,
  getMerchantRoomTypesPage,
  getMerchantRoomTypeSuggestions,
  getMerchantRoomTypeDetail,
  getMerchantRoomTypeRowById,
  getRoomTypeImagesByRoomTypeId,
} = require('./repository');

const parseRequestPayload = (payload) => parseRequestObject(payload, 'payload');
const getUploadedRoomTypeImageFiles = (req) => (Array.isArray(req.files) ? req.files : []);
const mapRoomTypeUploadError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { message: '房型图片不能超过 5MB', field: 'images' };
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return { message: `房型图片最多上传 ${maxRoomTypeImageCount} 张`, field: 'images' };
  }
  return { message: '上传房型图片失败', field: 'images' };
};

const validateRoomTypePayload = (payload) => {
  const roomName = safeTrim(payload?.roomName);
  if (!roomName) {
    return { message: '请输入房型名称', field: 'roomName' };
  }
  if (roomName.length > maxRoomNameLength) {
    return { message: `房型名称不能超过 ${maxRoomNameLength} 个字符`, field: 'roomName' };
  }

  const bedConfig = safeTrim(payload?.bedConfig);
  if (!bedConfig) {
    return { message: '请输入床型配置', field: 'bedConfig' };
  }
  if (bedConfig.length > maxBedConfigLength) {
    return { message: `床型配置不能超过 ${maxBedConfigLength} 个字符`, field: 'bedConfig' };
  }

  const areaSize = toNullableNumber(payload?.areaSize);
  if (areaSize === null || Number.isNaN(areaSize) || areaSize <= 0) {
    return { message: '请输入合法的房间面积', field: 'areaSize' };
  }

  const floorText = safeTrim(payload?.floorText);
  if (!floorText) {
    return { message: '请输入楼层信息', field: 'floorText' };
  }
  if (floorText.length > maxFloorTextLength) {
    return { message: `楼层信息不能超过 ${maxFloorTextLength} 个字符`, field: 'floorText' };
  }

  const roomCount = Number(payload?.roomCount);
  if (!Number.isInteger(roomCount) || roomCount <= 0) {
    return { message: '请输入合法的房间数量', field: 'roomCount' };
  }

  const maxGuests = Number(payload?.maxGuests);
  if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
    return { message: '请输入合法的最多入住人数', field: 'maxGuests' };
  }

  const description = safeTrim(payload?.description);
  if (!description) {
    return { message: '请输入房型描述', field: 'description' };
  }
  if (description.length > maxDescriptionLength) {
    return { message: `房型描述不能超过 ${maxDescriptionLength} 个字符`, field: 'description' };
  }

  const facilityTags = normalizeFacilityTags(payload?.facilityTags);
  if (!facilityTags.length) {
    return { message: '请至少填写 1 个房型设施标签', field: 'facilityTags' };
  }

  const salePriceCents = toPriceCents(payload?.salePrice);
  if (salePriceCents === null || Number.isNaN(salePriceCents) || salePriceCents <= 0) {
    return { message: '请输入合法的销售价', field: 'salePrice' };
  }

  const listPriceCents = toPriceCents(payload?.listPrice);
  if (listPriceCents === null || Number.isNaN(listPriceCents) || listPriceCents <= 0) {
    return { message: '请输入合法的划线价', field: 'listPrice' };
  }
  if (listPriceCents < salePriceCents) {
    return { message: '划线价不能低于销售价', field: 'listPrice' };
  }

  const keptImageIds = normalizeIntIdList(payload?.keptImageIds);

  return {
    payload: {
      roomName,
      bedConfig,
      areaSize: Number(areaSize.toFixed(2)),
      floorText,
      roomCount,
      maxGuests,
      description,
      facilityTags,
      salePriceCents,
      listPriceCents,
      keptImageIds,
    },
  };
};

const normalizeImageSelection = ({ currentImageRows, keptImageIds, files }) => {
  const currentIdSet = new Set(currentImageRows.map((row) => Number(row.id)));
  const normalizedKeptIds = normalizeIntIdList(keptImageIds);

  const invalidKeptId = normalizedKeptIds.find((id) => !currentIdSet.has(id));
  if (invalidKeptId) {
    throw createHandlerError('validation', '图片保留列表中包含无效的历史图片', 'images');
  }

  const totalCount = normalizedKeptIds.length + files.length;
  if (!totalCount) {
    throw createHandlerError('validation', '请至少上传 1 张房型图片', 'images');
  }
  if (totalCount > maxRoomTypeImageCount) {
    throw createHandlerError('validation', `房型图片最多上传 ${maxRoomTypeImageCount} 张`, 'images');
  }

  return {
    keepImageIds: new Set(normalizedKeptIds),
  };
};

const saveMerchantRoomType = async ({
  merchantUserId,
  roomTypeId = null,
  normalizedPayload,
  files = [],
}) => {
  const {
    roomName,
    bedConfig,
    areaSize,
    floorText,
    roomCount,
    maxGuests,
    description,
    facilityTags,
    salePriceCents,
    listPriceCents,
    keptImageIds,
  } = normalizedPayload;
  const removedFilePaths = [];

  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);

    let currentImageRows = [];

    if (roomTypeId) {
      const currentRoom = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId, tx, { forUpdate: true });
      if (!currentRoom) {
        throw createHandlerError('notFound', '房型不存在或无权限编辑', 'id');
      }
      currentImageRows = await getRoomTypeImagesByRoomTypeId(roomTypeId, tx, { forUpdate: true });
    }

    const imageSelection = normalizeImageSelection({
      currentImageRows,
      keptImageIds,
      files,
    });

    let targetRoomTypeId = roomTypeId;

    if (!targetRoomTypeId) {
      const insertResult = await runQuery(
        tx,
        `INSERT INTO merchant_room_types
          (merchant_user_id, room_name, bed_config, area_size, floor_text, room_count, max_guests, description, facility_tags, sale_price_cents, list_price_cents, audit_status, audit_remark, is_on_sale, audit_admin_id, audit_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          merchantUserId,
          roomName,
          bedConfig,
          areaSize,
          floorText,
          roomCount,
          maxGuests,
          description,
          JSON.stringify(facilityTags),
          salePriceCents,
          listPriceCents,
          roomTypeAuditStatus.pending,
          '',
          0,
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
             floor_text = ?,
             room_count = ?,
             max_guests = ?,
             description = ?,
             facility_tags = ?,
             sale_price_cents = ?,
             list_price_cents = ?,
             audit_status = ?,
             audit_remark = '',
             is_on_sale = 0,
             audit_admin_id = NULL,
             audit_at = NULL
         WHERE id = ? AND merchant_user_id = ?`,
        [
          roomName,
          bedConfig,
          areaSize,
          floorText,
          roomCount,
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

    if (currentImageRows.length) {
      const removedRows = currentImageRows.filter((row) => !imageSelection.keepImageIds.has(Number(row.id)));
      if (removedRows.length) {
        const placeholders = removedRows.map(() => '?').join(', ');
        await runQuery(
          tx,
          `DELETE FROM merchant_room_type_images
           WHERE room_type_id = ? AND id IN (${placeholders})`,
          [targetRoomTypeId, ...removedRows.map((row) => row.id)]
        );
        removedRows.forEach((row) => removedFilePaths.push(row.file_path));
      }
    }

    for (const file of files) {
      const filePath = `/uploads/room-type-images/${file.filename}`;

      await runQuery(
        tx,
        `INSERT INTO merchant_room_type_images
          (room_type_id, file_path, file_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          targetRoomTypeId,
          filePath,
          file.originalname || '',
          file.mimetype || '',
          Number(file.size) || 0,
        ]
      );
    }

    const latestRoomRow = await getMerchantRoomTypeRowById(merchantUserId, targetRoomTypeId, tx);
    const latestImageRows = await getRoomTypeImagesByRoomTypeId(targetRoomTypeId, tx);
    return {
      roomRow: latestRoomRow,
      imageRows: latestImageRows,
      removedFilePaths,
    };
  });

  result.removedFilePaths.forEach((filePath) => {
    const fileResult = deleteLocalRoomTypeImageSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn('删除旧房型图片失败:', { filePath, reason: fileResult.message });
    }
  });

  return mapRoomTypeDetail(result.roomRow, result.imageRows);
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
      `SELECT id, audit_status
       FROM merchant_room_types
       WHERE merchant_user_id = ? AND id IN (${placeholders})
       FOR UPDATE`,
      [merchantUserId, ...uniqueIds]
    );

    const approvedIds = rows
      .filter((row) => Number(row.audit_status) === roomTypeAuditStatus.approved)
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
    const skippedIds = uniqueIds.filter((id) => !approvedSet.has(id));
    return {
      affectedIds: approvedIds,
      skippedIds,
    };
  });
};

const deleteMerchantRoomTypeById = async (merchantUserId, roomTypeId) => {
  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const row = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId, tx, { forUpdate: true });
    if (!row) {
      throw createHandlerError('notFound', '房型不存在或无权限删除', 'id');
    }

    const imageRows = await getRoomTypeImagesByRoomTypeId(roomTypeId, tx, { forUpdate: true });
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

    return imageRows.map((rowItem) => rowItem.file_path);
  });

  result.forEach((filePath) => {
    const fileResult = deleteLocalRoomTypeImageSafely(filePath);
    if (!fileResult.ok && !fileResult.missing) {
      console.warn('删除房型图片失败:', { filePath, reason: fileResult.message });
    }
  });
};

exports.getMerchantRoomTypes = async (req, res) => {
  try {
    const auditStatus = normalizeOptionalEnum(req.query.auditStatus, auditStatusList);
    if (Number.isNaN(auditStatus)) {
      return res.json(validationFail('审核状态参数不合法', 'auditStatus'));
    }

    const saleStatus = normalizeOptionalEnum(req.query.saleStatus, onSaleStatusList);
    if (Number.isNaN(saleStatus)) {
      return res.json(validationFail('售卖状态参数不合法', 'saleStatus'));
    }

    const { page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, 8);
    const keyword = safeTrim(req.query.keyword);
    const listResult = await getMerchantRoomTypesPage({
      merchantUserId: req.user.id,
      auditStatus,
      saleStatus,
      keyword,
      page,
      pageSize,
    });

    res.json(success({
      list: listResult.rows.map(mapRoomTypeSummary),
      pagination: {
        page,
        pageSize,
        total: listResult.total,
      },
    }, '获取房型列表成功'));
  } catch (error) {
    console.error('获取房型列表失败:', error);
    res.json(serverFail('获取房型列表失败，请稍后重试'));
  }
};

exports.getMerchantRoomTypeSuggestions = async (req, res) => {
  try {
    const auditStatus = normalizeOptionalEnum(req.query.auditStatus, auditStatusList);
    if (Number.isNaN(auditStatus)) {
      return res.json(validationFail('审核状态参数不合法', 'auditStatus'));
    }

    const saleStatus = normalizeOptionalEnum(req.query.saleStatus, onSaleStatusList);
    if (Number.isNaN(saleStatus)) {
      return res.json(validationFail('售卖状态参数不合法', 'saleStatus'));
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 12) : 8;
    const keyword = safeTrim(req.query.keyword);

    const rows = await getMerchantRoomTypeSuggestions({
      merchantUserId: req.user.id,
      auditStatus,
      saleStatus,
      keyword,
      limit,
    });

    res.json(success({
      list: rows.map((row) => ({
        id: Number(row.id),
        roomName: row.room_name || '',
        auditStatus: Number(row.audit_status) || 0,
        isOnSale: Number(row.is_on_sale) || 0,
      })),
    }, '获取房型候选成功'));
  } catch (error) {
    console.error('获取房型候选失败:', error);
    res.json(serverFail('获取房型候选失败，请稍后重试'));
  }
};

exports.getMerchantRoomTypeDetail = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'id'));
    }

    const detail = await getMerchantRoomTypeDetail(req.user.id, roomTypeId);
    if (!detail) {
      return res.json(notFoundFail('房型不存在', 'id'));
    }

    res.json(success(mapRoomTypeDetail(detail.row, detail.images), '获取房型详情成功'));
  } catch (error) {
    console.error('获取房型详情失败:', error);
    res.json(serverFail('获取房型详情失败，请稍后重试'));
  }
};

exports.createMerchantRoomType = withMulterUpload({
  uploader: roomTypeImageUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapRoomTypeUploadError,
  contextLabel: '处理房型提交',
  serverMessage: '房型提交失败，请稍后重试',
}, async (req, res) => {
  const payload = parseRequestPayload(req.body?.payload);
  const validated = validateRoomTypePayload(payload);
  if (!validated.payload) {
    throw createHandlerError('validation', validated.message, validated.field);
  }

  const roomType = await saveMerchantRoomType({
    merchantUserId: req.user.id,
    normalizedPayload: validated.payload,
    files: getUploadedRoomTypeImageFiles(req),
  });

  res.json(success(roomType, '房型已提交审核'));
});

exports.updateMerchantRoomType = withMulterUpload({
  uploader: roomTypeImageUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapRoomTypeUploadError,
  contextLabel: '处理房型提交',
  serverMessage: '房型提交失败，请稍后重试',
}, async (req, res) => {
  const roomTypeId = Number(req.params.id);
  if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
    throw createHandlerError('validation', '房型 ID 不合法', 'id');
  }

  const payload = parseRequestPayload(req.body?.payload);
  const validated = validateRoomTypePayload(payload);
  if (!validated.payload) {
    throw createHandlerError('validation', validated.message, validated.field);
  }

  const roomType = await saveMerchantRoomType({
    merchantUserId: req.user.id,
    roomTypeId,
    normalizedPayload: validated.payload,
    files: getUploadedRoomTypeImageFiles(req),
  });

  res.json(success(roomType, '房型修改已提交审核'));
});

exports.toggleMerchantRoomTypeOnSale = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'id'));
    }

    const isOnSale = Number(req.body?.isOnSale);
    if (!onSaleStatusList.includes(isOnSale)) {
      return res.json(validationFail('上架状态参数不合法', 'isOnSale'));
    }

    const roomType = await updateRoomTypeSaleStatus({
      merchantUserId: req.user.id,
      roomTypeId,
      isOnSale,
    });

    res.json(success(roomType, isOnSale ? '房型已上架' : '房型已下架'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'isOnSale'));
    }
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    console.error('切换房型上下架失败:', error);
    res.json(serverFail('切换房型上下架失败，请稍后重试'));
  }
};

exports.batchToggleMerchantRoomTypesOnSale = async (req, res) => {
  try {
    const isOnSale = Number(req.body?.isOnSale);
    if (!onSaleStatusList.includes(isOnSale)) {
      return res.json(validationFail('上架状态参数不合法', 'isOnSale'));
    }

    const result = await batchUpdateRoomTypeSaleStatus({
      merchantUserId: req.user.id,
      roomTypeIds: req.body?.roomTypeIds,
      isOnSale,
    });

    res.json(success(result, isOnSale ? '批量上架完成' : '批量下架完成'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'roomTypeIds'));
    }
    console.error('批量上下架房型失败:', error);
    res.json(serverFail('批量上下架房型失败，请稍后重试'));
  }
};

exports.deleteMerchantRoomType = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'id'));
    }

    await deleteMerchantRoomTypeById(req.user.id, roomTypeId);
    res.json(success(null, '房型删除成功'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'id'));
    }
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    console.error('删除房型失败:', error);
    res.json(serverFail('删除房型失败，请稍后重试'));
  }
};
