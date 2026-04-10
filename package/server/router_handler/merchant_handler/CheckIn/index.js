const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { parsePageParams } = require('../../utils/query');
const { safeTrim } = require('../../utils/common');
const { defaultCheckInPageSize, stayOrderStatusList } = require('./constants');
const {
  getMerchantCheckInMeta,
  createReservationStayOrder,
  createWalkInStayOrder,
  confirmReservationCheckIn,
  cancelReservationOrder,
  extendStayOrder,
  checkOutStayOrder,
  getStayOrdersView,
  getStayOrderDetailView,
} = require('./service');

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

const parseOrderId = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

const normalizeOptionalStatus = (value) => {
  const status = safeTrim(value);
  if (!status || status === 'all') {
    return '';
  }
  return stayOrderStatusList.includes(status) ? status : null;
};

exports.getMerchantCheckInMeta = async (req, res) => {
  try {
    const result = await getMerchantCheckInMeta(req.user.id);
    res.json(success(result, '获取入住办理基础数据成功'));
  } catch (error) {
    mapHandlerError(res, error, '获取入住办理基础数据失败');
  }
};

exports.createMerchantStayReservation = async (req, res) => {
  try {
    const result = await createReservationStayOrder({
      merchantUserId: req.user.id,
      payload: req.body,
    });
    res.json(success(result, '预订创建成功'));
  } catch (error) {
    mapHandlerError(res, error, '创建预订失败');
  }
};

exports.createMerchantStayWalkIn = async (req, res) => {
  try {
    const result = await createWalkInStayOrder({
      merchantUserId: req.user.id,
      payload: req.body,
    });
    res.json(success(result, '入住办理成功'));
  } catch (error) {
    mapHandlerError(res, error, '办理入住失败');
  }
};

exports.confirmMerchantStayCheckIn = async (req, res) => {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.json(validationFail('入住单 ID 不合法', 'id'));
    }

    const result = await confirmReservationCheckIn({
      merchantUserId: req.user.id,
      orderId,
    });
    res.json(success(result, '确认入住成功'));
  } catch (error) {
    mapHandlerError(res, error, '确认入住失败');
  }
};

exports.cancelMerchantStayReservation = async (req, res) => {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.json(validationFail('入住单 ID 不合法', 'id'));
    }

    const result = await cancelReservationOrder({
      merchantUserId: req.user.id,
      orderId,
    });
    res.json(success(result, '取消预订成功'));
  } catch (error) {
    mapHandlerError(res, error, '取消预订失败');
  }
};

exports.extendMerchantStayOrder = async (req, res) => {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.json(validationFail('入住单 ID 不合法', 'id'));
    }

    const result = await extendStayOrder({
      merchantUserId: req.user.id,
      orderId,
      payload: req.body,
    });
    res.json(success(result, '续住办理成功'));
  } catch (error) {
    mapHandlerError(res, error, '续住办理失败');
  }
};

exports.checkOutMerchantStayOrder = async (req, res) => {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.json(validationFail('入住单 ID 不合法', 'id'));
    }

    const result = await checkOutStayOrder({
      merchantUserId: req.user.id,
      orderId,
      payload: req.body,
    });
    res.json(success(result, '退房结算成功'));
  } catch (error) {
    mapHandlerError(res, error, '退房结算失败');
  }
};

exports.getMerchantStayOrders = async (req, res) => {
  try {
    const status = normalizeOptionalStatus(req.query.status);
    if (status === null) {
      return res.json(validationFail('入住状态参数不合法', 'status'));
    }

    const { page, pageSize } = parsePageParams(
      req.query.page,
      req.query.pageSize,
      defaultCheckInPageSize
    );
    const result = await getStayOrdersView({
      merchantUserId: req.user.id,
      orderNo: safeTrim(req.query.orderNo),
      roomNumber: safeTrim(req.query.roomNumber),
      primaryGuestName: safeTrim(req.query.primaryGuestName),
      status,
      startDate: safeTrim(req.query.startDate),
      endDate: safeTrim(req.query.endDate),
      page,
      pageSize,
    });
    res.json(success(result, '获取入住查询列表成功'));
  } catch (error) {
    mapHandlerError(res, error, '获取入住查询列表失败');
  }
};

exports.getMerchantStayOrderDetail = async (req, res) => {
  try {
    const orderId = parseOrderId(req.params.id);
    if (!orderId) {
      return res.json(validationFail('入住单 ID 不合法', 'id'));
    }

    const result = await getStayOrderDetailView({
      merchantUserId: req.user.id,
      orderId,
    });
    res.json(success(result, '获取入住单详情成功'));
  } catch (error) {
    mapHandlerError(res, error, '获取入住单详情失败');
  }
};
