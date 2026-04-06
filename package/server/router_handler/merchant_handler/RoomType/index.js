const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { roomTypeImageUpload } = require('../../../middleware/upload');
const { createHandlerError, parseRequestObject, safeTrim } = require('../../utils/common');
const { parsePageParams, normalizeOptionalEnum } = require('../../utils/query');
const { withMulterUpload } = require('../../utils/upload');
const {
  auditStatusList,
  onSaleStatusList,
  maxRoomTypeImageCount,
} = require('./constants');
const {
  mapRoomTypeSummary,
  mapRoomTypeDetail,
} = require('./helpers');
const {
  getMerchantRoomTypesPage,
  getMerchantRoomTypeSuggestions,
  getMerchantRoomTypeDetail,
} = require('./repository');
const {
  parseRoomTypeDraftRequestPayload,
  getMerchantRoomTypeDraftsView,
  saveMerchantRoomTypeDraft,
  submitMerchantRoomType,
  updateRoomTypeSaleStatus,
  batchUpdateRoomTypeSaleStatus,
  deleteMerchantRoomTypeDraftBySource,
  deleteMerchantRoomTypeById,
} = require('./service');

const parseRequestPayload = (payload) => parseRequestObject(payload, 'payload');
const getUploadedRoomTypeImageFiles = (req) => (Array.isArray(req.files) ? req.files : []);

const mapRoomTypeUploadError = (err) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return { message: '房型图片不能超过 5MB', field: 'images' };
  }
  if (err?.code === 'LIMIT_FILE_COUNT') {
    return { message: `房型图片最多上传 ${maxRoomTypeImageCount} 张`, field: 'images' };
  }
  return {
    message: err?.message || '上传房型图片失败',
    field: err?.field || 'images',
  };
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
        roomName: row.room_name || `房型#${row.id}`,
        auditStatus: Number(row.audit_status) || 0,
        isOnSale: Number(row.is_on_sale) || 0,
        isForcedOffSale: Number(row.is_forced_off_sale) || 0,
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

exports.getMerchantRoomTypeDrafts = async (req, res) => {
  try {
    const draftView = await getMerchantRoomTypeDraftsView(req.user.id);
    res.json(success(draftView, '获取房型草稿成功'));
  } catch (error) {
    console.error('获取房型草稿失败:', error);
    res.json(serverFail('获取房型草稿失败，请稍后重试'));
  }
};

exports.createMerchantRoomTypeDraft = withMulterUpload({
  uploader: roomTypeImageUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapRoomTypeUploadError,
  contextLabel: '保存房型草稿',
  serverMessage: '保存房型草稿失败，请稍后重试',
}, async (req, res) => {
  const { formValues, imagePlan } = parseRoomTypeDraftRequestPayload(parseRequestPayload(req.body?.payload));
  const draft = await saveMerchantRoomTypeDraft({
    merchantUserId: req.user.id,
    sourceRoomTypeId: 0,
    formValues,
    rawImagePlan: imagePlan,
    files: getUploadedRoomTypeImageFiles(req),
  });

  res.json(success(draft, '房型草稿已保存'));
});

exports.updateMerchantRoomTypeDraft = withMulterUpload({
  uploader: roomTypeImageUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapRoomTypeUploadError,
  contextLabel: '保存房型草稿',
  serverMessage: '保存房型草稿失败，请稍后重试',
}, async (req, res) => {
  const roomTypeId = Number(req.params.roomTypeId);
  if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
    throw createHandlerError('validation', '房型 ID 不合法', 'roomTypeId');
  }

  const { formValues, imagePlan } = parseRoomTypeDraftRequestPayload(parseRequestPayload(req.body?.payload));
  const draft = await saveMerchantRoomTypeDraft({
    merchantUserId: req.user.id,
    sourceRoomTypeId: roomTypeId,
    formValues,
    rawImagePlan: imagePlan,
    files: getUploadedRoomTypeImageFiles(req),
  });

  res.json(success(draft, '房型草稿已保存'));
});

exports.deleteMerchantRoomTypeCreateDraft = async (req, res) => {
  try {
    await deleteMerchantRoomTypeDraftBySource(req.user.id, 0);
    res.json(success(null, '草稿房型已删除'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'roomTypeId'));
    }
    console.error('删除新增房型草稿失败:', error);
    res.json(serverFail('删除新增房型草稿失败，请稍后重试'));
  }
};

exports.deleteMerchantRoomTypeDraft = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.roomTypeId);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'roomTypeId'));
    }

    await deleteMerchantRoomTypeDraftBySource(req.user.id, roomTypeId);
    res.json(success(null, '房型草稿已删除'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'roomTypeId'));
    }
    console.error('删除编辑房型草稿失败:', error);
    res.json(serverFail('删除编辑房型草稿失败，请稍后重试'));
  }
};

exports.createMerchantRoomType = withMulterUpload({
  uploader: roomTypeImageUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapRoomTypeUploadError,
  contextLabel: '处理房型提交',
  serverMessage: '房型提交失败，请稍后重试',
}, async (req, res) => {
  const roomType = await submitMerchantRoomType({
    merchantUserId: req.user.id,
    payload: parseRequestPayload(req.body?.payload),
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

  const roomType = await submitMerchantRoomType({
    merchantUserId: req.user.id,
    roomTypeId,
    payload: parseRequestPayload(req.body?.payload),
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
