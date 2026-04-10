const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { safeTrim } = require('../../utils/common');
const { parsePageParams } = require('../../utils/query');
const {
  roomPhysicalStatusList,
  roomSalesStatusList,
  roomTransitionActionList,
  roomBatchPhysicalStatusList,
  roomFeatureTagList,
  defaultRoomPageSize,
} = require('./constants');
const {
  getMerchantRoomsView,
  createMerchantRoom,
  updateMerchantRoom,
  deleteMerchantRoom,
  transitionMerchantRoom,
  batchUpdateMerchantRoomPhysicalStatus,
  batchBindMerchantRoomType,
  batchGenerateMerchantRooms,
} = require('./service');

const normalizeOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return null;
  }
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : NaN;
};

const normalizeOptionalPhysicalStatus = (value) => {
  const status = safeTrim(value);
  if (!status || status === 'all') {
    return '';
  }
  return roomPhysicalStatusList.includes(status) ? status : null;
};

const normalizeOptionalSalesStatus = (value) => {
  const status = safeTrim(value);
  if (!status || status === 'all') {
    return '';
  }
  return roomSalesStatusList.includes(status) ? status : null;
};

const normalizeOptionalFeatureTags = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => safeTrim(item))
      .filter(Boolean);

  if (!list.length) {
    return [];
  }

  const normalizedList = [...new Set(list)];
  return normalizedList.every((item) => roomFeatureTagList.includes(item)) ? normalizedList : null;
};

const mapHandlerError = (res, error, fallbackMessage) => {
  if (error.kind === 'validation') {
    return res.json(validationFail(error.message, error.field || 'payload'));
  }
  if (error.kind === 'notFound') {
    return res.json(notFoundFail(error.message, error.field || 'id'));
  }

  console.error(`${fallbackMessage}:`, error);
  return res.json(serverFail(`${fallbackMessage}，请稍后重试`));
};

exports.getMerchantRooms = async (req, res) => {
  try {
    const floorNumber = normalizeOptionalPositiveInt(req.query.floorNumber);
    if (Number.isNaN(floorNumber)) {
      return res.json(validationFail('楼层参数不合法', 'floorNumber'));
    }

    const roomTypeId = normalizeOptionalPositiveInt(req.query.roomTypeId);
    if (Number.isNaN(roomTypeId)) {
      return res.json(validationFail('房型参数不合法', 'roomTypeId'));
    }

    const physicalStatus = normalizeOptionalPhysicalStatus(req.query.physicalStatus);
    if (physicalStatus === null) {
      return res.json(validationFail('房态参数不合法', 'physicalStatus'));
    }

    const salesStatus = normalizeOptionalSalesStatus(req.query.salesStatus);
    if (salesStatus === null) {
      return res.json(validationFail('销售状态参数不合法', 'salesStatus'));
    }

    const featureTags = normalizeOptionalFeatureTags(req.query.featureTags);
    if (featureTags === null) {
      return res.json(validationFail('房间特性参数不合法', 'featureTags'));
    }

    const { page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, defaultRoomPageSize);
    const result = await getMerchantRoomsView({
      merchantUserId: req.user.id,
      keyword: safeTrim(req.query.keyword),
      floorNumber,
      roomTypeId,
      physicalStatus,
      salesStatus,
      featureTags,
      page,
      pageSize,
    });

    res.json(success(result, '获取房间列表成功'));
  } catch (error) {
    mapHandlerError(res, error, '获取房间列表失败');
  }
};

exports.createMerchantRoom = async (req, res) => {
  try {
    const room = await createMerchantRoom({
      merchantUserId: req.user.id,
      payload: req.body,
    });
    res.json(success(room, '房间创建成功'));
  } catch (error) {
    mapHandlerError(res, error, '创建房间失败');
  }
};

exports.updateMerchantRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.json(validationFail('房间 ID 不合法', 'id'));
    }

    const room = await updateMerchantRoom({
      merchantUserId: req.user.id,
      roomId,
      payload: req.body,
    });
    res.json(success(room, '房间更新成功'));
  } catch (error) {
    mapHandlerError(res, error, '更新房间失败');
  }
};

exports.deleteMerchantRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.json(validationFail('房间 ID 不合法', 'id'));
    }

    await deleteMerchantRoom({
      merchantUserId: req.user.id,
      roomId,
    });
    res.json(success(null, '房间删除成功'));
  } catch (error) {
    mapHandlerError(res, error, '删除房间失败');
  }
};

exports.transitionMerchantRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.json(validationFail('房间 ID 不合法', 'id'));
    }

    const action = safeTrim(req.body?.action);
    if (!roomTransitionActionList.includes(action)) {
      return res.json(validationFail('房间状态流转动作不合法', 'action'));
    }

    const room = await transitionMerchantRoom({
      merchantUserId: req.user.id,
      roomId,
      action,
    });
    res.json(success(room, '房间状态更新成功'));
  } catch (error) {
    mapHandlerError(res, error, '更新房间状态失败');
  }
};

exports.batchUpdateMerchantRoomPhysicalStatus = async (req, res) => {
  try {
    const physicalStatus = safeTrim(req.body?.physicalStatus);
    if (!roomBatchPhysicalStatusList.includes(physicalStatus)) {
      return res.json(validationFail('批量房态参数不合法', 'physicalStatus'));
    }

    const result = await batchUpdateMerchantRoomPhysicalStatus({
      merchantUserId: req.user.id,
      roomIds: req.body?.roomIds,
      physicalStatus,
    });
    res.json(success(result, '批量修改房态成功'));
  } catch (error) {
    mapHandlerError(res, error, '批量修改房态失败');
  }
};

exports.batchBindMerchantRoomType = async (req, res) => {
  try {
    const result = await batchBindMerchantRoomType({
      merchantUserId: req.user.id,
      roomIds: req.body?.roomIds,
      roomTypeId: req.body?.roomTypeId,
    });
    res.json(success(result, '批量绑定房型成功'));
  } catch (error) {
    mapHandlerError(res, error, '批量绑定房型失败');
  }
};

exports.batchGenerateMerchantRooms = async (req, res) => {
  try {
    const result = await batchGenerateMerchantRooms({
      merchantUserId: req.user.id,
      payload: req.body,
    });
    res.json(success(result, '批量生成房间成功'));
  } catch (error) {
    mapHandlerError(res, error, '批量生成房间失败');
  }
};
