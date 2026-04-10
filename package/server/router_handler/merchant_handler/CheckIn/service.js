const { withTransaction } = require('../../../db');
const { createHandlerError, safeTrim } = require('../../utils/common');
const { roomTypeAuditStatus } = require('../RoomType/constants');
const {
  merchantRoomPhysicalStatus,
  merchantRoomSalesStatus,
  merchantRoomTransitionActions,
} = require('../Room/constants');
const {
  resolveRoomSalesStatus,
} = require('../Room/helpers');
const {
  applyRoomTransitionWithinTx,
} = require('../Room/service');
const {
  stayOrderSourceType,
  stayOrderStatus,
  stayGuestGender,
  stayPaymentMethod,
  stayOrderStatusList,
  stayPaymentMethodList,
  checkInGuestCountLimit,
  maxStayRemarkLength,
  maxGuestNameLength,
  maxGuestIdNoLength,
  maxGuestPhoneLength,
} = require('./constants');
const {
  toPositiveInt,
  toNonNegativeInt,
  normalizeYuanToCents,
  parseDateText,
  toDateText,
  getNowDateText,
  toDateTimeText,
  getDateDiffDays,
  calcStayNights,
  calcRoomChargeCents,
  calcBalanceCents,
  normalizeGuestGender,
  normalizePaymentMethod,
  getCheckInBlockReason,
  resolveGuestCountLimit,
  generateStayOrderNo,
  mapStayOrderSummary,
  mapStayOrderDetail,
} = require('./helpers');
const {
  lockMerchantRow,
  getMerchantHotelReviewStatus,
  getMerchantRoomRowById,
  getMerchantCheckInRoomRows,
  createStayOrderRow,
  insertStayGuestRows,
  getStayOrderRowById,
  getStayGuestsByOrderId,
  getStayExtensionsByOrderId,
  updateStayOrderRow,
  insertStayExtensionRow,
  getStayOrdersPage,
  getStayOrdersByStatus,
  getStayOrderCountByOrderNo,
} = require('./repository');

const buildRoomTypeMeta = (roomRow) => ({
  audit_status: roomRow?.room_type_audit_status,
  is_on_sale: roomRow?.room_type_is_on_sale,
  is_forced_off_sale: roomRow?.room_type_is_forced_off_sale,
});

const resolveEffectiveRoomSalesStatus = (roomRow) => resolveRoomSalesStatus({
  physicalStatus: roomRow?.physical_status,
  storedSalesStatus: roomRow?.sales_status,
  roomTypeRow: buildRoomTypeMeta(roomRow),
  roomForcedOffSale: roomRow?.is_forced_off_sale,
});

const ensureHotelCanHandleCheckIn = async (merchantUserId, executor = null) => {
  const reviewStatus = await getMerchantHotelReviewStatus(merchantUserId, executor);
  if (reviewStatus !== 'approved') {
    throw createHandlerError(
      'validation',
      getCheckInBlockReason(reviewStatus || 'incomplete'),
      'reviewStatus'
    );
  }
  return reviewStatus;
};

const normalizeStayDateRange = ({
  checkInDate,
  checkOutDate,
  fallbackCheckInDate = '',
}) => {
  const checkInParsed = parseDateText(checkInDate || fallbackCheckInDate || getNowDateText());
  if (!checkInParsed) {
    throw createHandlerError('validation', '入住日期格式不合法', 'checkInDate');
  }
  const checkOutParsed = parseDateText(checkOutDate);
  if (!checkOutParsed) {
    throw createHandlerError('validation', '离店日期格式不合法', 'checkOutDate');
  }
  if (checkOutParsed.date.getTime() < checkInParsed.date.getTime()) {
    throw createHandlerError('validation', '离店日期不能早于入住日期', 'checkOutDate');
  }

  return {
    checkInDate: checkInParsed.text,
    checkOutDate: checkOutParsed.text,
    checkInDateObject: checkInParsed.date,
    checkOutDateObject: checkOutParsed.date,
    stayNights: calcStayNights(checkInParsed.date, checkOutParsed.date),
  };
};

const normalizeGuest = (source, options = {}) => {
  const guest = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const name = safeTrim(guest.name).slice(0, maxGuestNameLength);
  const idNo = safeTrim(guest.idNo).slice(0, maxGuestIdNoLength);
  const phone = safeTrim(guest.phone).slice(0, maxGuestPhoneLength);
  const gender = normalizeGuestGender(guest.gender, options.defaultGender || stayGuestGender.unknown);

  if (options.requiredName && !name) {
    throw createHandlerError('validation', options.nameErrorMessage || '请输入住客姓名', options.field || 'name');
  }
  if (options.requiredIdNo && !idNo) {
    throw createHandlerError('validation', options.idNoErrorMessage || '请输入证件号', options.field || 'idNo');
  }
  if (options.requiredPhone && !phone) {
    throw createHandlerError('validation', options.phoneErrorMessage || '请输入手机号', options.field || 'phone');
  }
  if (options.requiredGender && ![stayGuestGender.male, stayGuestGender.female].includes(gender)) {
    throw createHandlerError('validation', options.genderErrorMessage || '请选择性别', options.field || 'gender');
  }

  return {
    name,
    idNo,
    phone,
    gender,
  };
};

const normalizeGuestPayload = (payload, roomRow) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const primaryGuest = normalizeGuest(source.primaryGuest, {
    requiredName: true,
    requiredIdNo: true,
    requiredPhone: true,
    requiredGender: true,
    field: 'primaryGuest',
    nameErrorMessage: '请输入主入住人姓名',
    idNoErrorMessage: '请输入主入住人证件号',
    phoneErrorMessage: '请输入主入住人手机号',
    genderErrorMessage: '请选择主入住人性别',
  });

  const normalizedGuestCount = toPositiveInt(source.guestCount) || 1;
  if (normalizedGuestCount < 1 || normalizedGuestCount > checkInGuestCountLimit) {
    throw createHandlerError(
      'validation',
      `入住人数需在 1-${checkInGuestCountLimit} 之间`,
      'guestCount'
    );
  }
  const guestCountLimit = resolveGuestCountLimit(roomRow?.room_type_max_guests);
  if (normalizedGuestCount > guestCountLimit) {
    throw createHandlerError(
      'validation',
      `该房型最多可登记 ${guestCountLimit} 位住客`,
      'guestCount'
    );
  }

  const companions = Array.isArray(source.companions) ? source.companions : [];
  if (companions.length !== normalizedGuestCount - 1) {
    throw createHandlerError('validation', '同行人数量需与入住人数匹配', 'companions');
  }

  const normalizedCompanions = companions.map((item, index) => normalizeGuest(item, {
    requiredName: true,
    requiredIdNo: true,
    requiredPhone: false,
    requiredGender: false,
    field: `companions.${index}`,
    nameErrorMessage: `请填写同行人${index + 1}姓名`,
    idNoErrorMessage: `请填写同行人${index + 1}证件号`,
  }));

  const idNoSet = new Set();
  [primaryGuest, ...normalizedCompanions].forEach((guest) => {
    if (idNoSet.has(guest.idNo)) {
      throw createHandlerError('validation', '同一入住单内证件号不能重复', 'guests');
    }
    idNoSet.add(guest.idNo);
  });

  return {
    guestCount: normalizedGuestCount,
    primaryGuest,
    companions: normalizedCompanions,
  };
};

const normalizeStayAmounts = (payload, roomRow, stayNights, options = {}) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const nightlyPriceCents = toNonNegativeInt(source.nightlyPriceCents)
    || normalizeYuanToCents(source.nightlyPrice)
    || toNonNegativeInt(roomRow?.room_type_sale_price_cents);

  if (!nightlyPriceCents || nightlyPriceCents <= 0) {
    throw createHandlerError('validation', '请填写合法的单晚房费', 'nightlyPrice');
  }

  const depositCents = toNonNegativeInt(source.depositCents)
    ?? normalizeYuanToCents(source.deposit)
    ?? 0;

  const settlementPaidCents = toNonNegativeInt(source.settlementPaidCents)
    ?? normalizeYuanToCents(source.settlementPaid)
    ?? options.defaultSettlementPaidCents
    ?? 0;

  const roomChargeCents = calcRoomChargeCents(nightlyPriceCents, stayNights);
  const balanceCents = calcBalanceCents({
    roomChargeCents,
    depositCents,
    settlementPaidCents,
  });

  return {
    nightlyPriceCents,
    depositCents,
    settlementPaidCents,
    roomChargeCents,
    balanceCents,
  };
};

const buildStayGuestRows = ({
  stayOrderId,
  merchantUserId,
  primaryGuest,
  companions,
}) => ([
  {
    stayOrderId,
    merchantUserId,
    isPrimary: 1,
    name: primaryGuest.name,
    idNo: primaryGuest.idNo,
    phone: primaryGuest.phone,
    gender: primaryGuest.gender,
  },
  ...companions.map((guest) => ({
    stayOrderId,
    merchantUserId,
    isPrimary: 0,
    name: guest.name,
    idNo: guest.idNo,
    phone: guest.phone,
    gender: guest.gender,
  })),
]);

const ensureRoomExists = async (merchantUserId, roomId, executor = null) => {
  const roomRow = await getMerchantRoomRowById(merchantUserId, roomId, executor, { forUpdate: true });
  if (!roomRow) {
    throw createHandlerError('notFound', '房间不存在或无权限操作', 'roomId');
  }
  if (Number(roomRow.room_type_audit_status) !== roomTypeAuditStatus.approved) {
    throw createHandlerError('validation', '房间绑定房型未审核通过，暂不可办理入住业务', 'roomId');
  }
  return roomRow;
};

const ensureRoomCanReserve = (roomRow) => {
  const effectiveSalesStatus = resolveEffectiveRoomSalesStatus(roomRow);
  if (
    roomRow.physical_status !== merchantRoomPhysicalStatus.vacantClean
    || effectiveSalesStatus !== merchantRoomSalesStatus.available
  ) {
    throw createHandlerError('validation', '仅空净且可售的房间可创建预订', 'roomId');
  }
};

const ensureRoomCanWalkIn = (roomRow) => {
  const effectiveSalesStatus = resolveEffectiveRoomSalesStatus(roomRow);
  if (
    roomRow.physical_status !== merchantRoomPhysicalStatus.vacantClean
    || effectiveSalesStatus !== merchantRoomSalesStatus.available
  ) {
    throw createHandlerError('validation', '仅空净且可售的房间可办理散客入住', 'roomId');
  }
};

const generateUniqueStayOrderNo = async (executor = null) => {
  for (let index = 0; index < 8; index += 1) {
    const orderNo = generateStayOrderNo();
    const existsCount = await getStayOrderCountByOrderNo(orderNo, executor);
    if (!existsCount) {
      return orderNo;
    }
  }
  throw createHandlerError('server', '生成入住单号失败，请稍后重试', 'orderNo');
};

const getStayOrderDetailById = async (merchantUserId, orderId, executor = null) => {
  const orderRow = await getStayOrderRowById(merchantUserId, orderId, executor);
  if (!orderRow) {
    throw createHandlerError('notFound', '入住单不存在或无权限查看', 'id');
  }
  const [guestRows, extensionRows] = await Promise.all([
    getStayGuestsByOrderId(merchantUserId, orderId, executor),
    getStayExtensionsByOrderId(merchantUserId, orderId, executor),
  ]);
  return mapStayOrderDetail(orderRow, guestRows, extensionRows);
};

const getMerchantCheckInMeta = async (merchantUserId) => {
  const reviewStatus = await getMerchantHotelReviewStatus(merchantUserId);
  const canManageCheckIn = reviewStatus === 'approved';
  if (!canManageCheckIn) {
    return {
      canManageCheckIn,
      blockReason: getCheckInBlockReason(reviewStatus || 'incomplete'),
      rooms: [],
      reservedOrders: [],
      checkedInOrders: [],
      paymentMethods: stayPaymentMethodList,
      guestCountLimit: checkInGuestCountLimit,
    };
  }

  const [roomRows, reservedRows, checkedInRows] = await Promise.all([
    getMerchantCheckInRoomRows(merchantUserId),
    getStayOrdersByStatus({
      merchantUserId,
      status: stayOrderStatus.reserved,
      limit: 50,
    }),
    getStayOrdersByStatus({
      merchantUserId,
      status: stayOrderStatus.checkedIn,
      limit: 50,
    }),
  ]);

  const rooms = roomRows.map((row) => ({
    id: Number(row.id) || 0,
    roomNumber: row.room_number || '',
    roomTypeId: Number(row.room_type_id) || 0,
    roomTypeName: row.room_type_name || '',
    maxGuests: resolveGuestCountLimit(row.room_type_max_guests),
    physicalStatus: row.physical_status || merchantRoomPhysicalStatus.vacantClean,
    salesStatus: resolveEffectiveRoomSalesStatus(row),
    nightlyPriceCents: Number(row.room_type_sale_price_cents) || 0,
  }));

  return {
    canManageCheckIn,
    blockReason: '',
    rooms,
    reservedOrders: reservedRows.map(mapStayOrderSummary),
    checkedInOrders: checkedInRows.map(mapStayOrderSummary),
    paymentMethods: stayPaymentMethodList,
    guestCountLimit: checkInGuestCountLimit,
  };
};

const createReservationStayOrder = async ({
  merchantUserId,
  payload,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const roomId = toPositiveInt(payload?.roomId);
  if (!roomId) {
    throw createHandlerError('validation', '请选择房间', 'roomId');
  }

  const roomRow = await ensureRoomExists(merchantUserId, roomId, tx);
  ensureRoomCanReserve(roomRow);

  const guestPayload = normalizeGuestPayload(payload, roomRow);
  const stayDateRange = normalizeStayDateRange({
    checkInDate: payload?.checkInDate,
    checkOutDate: payload?.checkOutDate,
  });

  const amountPayload = normalizeStayAmounts(payload, roomRow, stayDateRange.stayNights);
  const paymentMethod = normalizePaymentMethod(payload?.paymentMethod);
  const remark = safeTrim(payload?.remark).slice(0, maxStayRemarkLength);
  const orderNo = await generateUniqueStayOrderNo(tx);

  await applyRoomTransitionWithinTx({
    merchantUserId,
    roomId,
    action: merchantRoomTransitionActions.reserve,
    executor: tx,
  });

  const orderId = await createStayOrderRow({
    merchantUserId,
    orderNo,
    sourceType: stayOrderSourceType.reservation,
    status: stayOrderStatus.reserved,
    roomId,
    roomNumberSnapshot: roomRow.room_number || '',
    roomTypeIdSnapshot: Number(roomRow.room_type_id) || 0,
    roomTypeNameSnapshot: roomRow.room_type_name || '',
    guestCount: guestPayload.guestCount,
    primaryGuestName: guestPayload.primaryGuest.name,
    primaryGuestIdNo: guestPayload.primaryGuest.idNo,
    primaryGuestPhone: guestPayload.primaryGuest.phone,
    primaryGuestGender: guestPayload.primaryGuest.gender,
    plannedCheckInDate: stayDateRange.checkInDate,
    plannedCheckOutDate: stayDateRange.checkOutDate,
    actualCheckInAt: null,
    actualCheckOutAt: null,
    nightlyPriceCents: amountPayload.nightlyPriceCents,
    stayNights: stayDateRange.stayNights,
    roomChargeCents: amountPayload.roomChargeCents,
    depositCents: amountPayload.depositCents,
    settlementPaidCents: 0,
    balanceCents: amountPayload.balanceCents,
    paymentMethod,
    remark,
  }, tx);

  await insertStayGuestRows(buildStayGuestRows({
    stayOrderId: orderId,
    merchantUserId,
    primaryGuest: guestPayload.primaryGuest,
    companions: guestPayload.companions,
  }), tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const createWalkInStayOrder = async ({
  merchantUserId,
  payload,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const roomId = toPositiveInt(payload?.roomId);
  if (!roomId) {
    throw createHandlerError('validation', '请选择房间', 'roomId');
  }

  const roomRow = await ensureRoomExists(merchantUserId, roomId, tx);
  ensureRoomCanWalkIn(roomRow);

  const guestPayload = normalizeGuestPayload(payload, roomRow);
  const stayDateRange = normalizeStayDateRange({
    checkInDate: payload?.checkInDate,
    checkOutDate: payload?.checkOutDate,
    fallbackCheckInDate: getNowDateText(),
  });
  const amountPayload = normalizeStayAmounts(payload, roomRow, stayDateRange.stayNights);
  const paymentMethod = normalizePaymentMethod(payload?.paymentMethod);
  const remark = safeTrim(payload?.remark).slice(0, maxStayRemarkLength);
  const orderNo = await generateUniqueStayOrderNo(tx);
  const checkInAt = toDateTimeText(new Date());

  await applyRoomTransitionWithinTx({
    merchantUserId,
    roomId,
    action: merchantRoomTransitionActions.checkIn,
    executor: tx,
  });

  const orderId = await createStayOrderRow({
    merchantUserId,
    orderNo,
    sourceType: stayOrderSourceType.walkIn,
    status: stayOrderStatus.checkedIn,
    roomId,
    roomNumberSnapshot: roomRow.room_number || '',
    roomTypeIdSnapshot: Number(roomRow.room_type_id) || 0,
    roomTypeNameSnapshot: roomRow.room_type_name || '',
    guestCount: guestPayload.guestCount,
    primaryGuestName: guestPayload.primaryGuest.name,
    primaryGuestIdNo: guestPayload.primaryGuest.idNo,
    primaryGuestPhone: guestPayload.primaryGuest.phone,
    primaryGuestGender: guestPayload.primaryGuest.gender,
    plannedCheckInDate: stayDateRange.checkInDate,
    plannedCheckOutDate: stayDateRange.checkOutDate,
    actualCheckInAt: checkInAt,
    actualCheckOutAt: null,
    nightlyPriceCents: amountPayload.nightlyPriceCents,
    stayNights: stayDateRange.stayNights,
    roomChargeCents: amountPayload.roomChargeCents,
    depositCents: amountPayload.depositCents,
    settlementPaidCents: amountPayload.settlementPaidCents,
    balanceCents: amountPayload.balanceCents,
    paymentMethod,
    remark,
  }, tx);

  await insertStayGuestRows(buildStayGuestRows({
    stayOrderId: orderId,
    merchantUserId,
    primaryGuest: guestPayload.primaryGuest,
    companions: guestPayload.companions,
  }), tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const confirmReservationCheckIn = async ({
  merchantUserId,
  orderId,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const orderRow = await getStayOrderRowById(merchantUserId, orderId, tx, { forUpdate: true });
  if (!orderRow) {
    throw createHandlerError('notFound', '入住单不存在或无权限操作', 'id');
  }
  if (orderRow.status !== stayOrderStatus.reserved) {
    throw createHandlerError('validation', '仅预订状态入住单可确认入住', 'status');
  }

  await applyRoomTransitionWithinTx({
    merchantUserId,
    roomId: Number(orderRow.room_id),
    action: merchantRoomTransitionActions.checkIn,
    executor: tx,
  });

  await updateStayOrderRow(merchantUserId, orderId, {
    status: stayOrderStatus.checkedIn,
    actual_check_in_at: toDateTimeText(new Date()),
  }, tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const cancelReservationOrder = async ({
  merchantUserId,
  orderId,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const orderRow = await getStayOrderRowById(merchantUserId, orderId, tx, { forUpdate: true });
  if (!orderRow) {
    throw createHandlerError('notFound', '入住单不存在或无权限操作', 'id');
  }
  if (orderRow.status !== stayOrderStatus.reserved) {
    throw createHandlerError('validation', '仅预订状态入住单可取消预订', 'status');
  }

  await applyRoomTransitionWithinTx({
    merchantUserId,
    roomId: Number(orderRow.room_id),
    action: merchantRoomTransitionActions.cancelReservation,
    executor: tx,
  });

  await updateStayOrderRow(merchantUserId, orderId, {
    status: stayOrderStatus.cancelled,
    updated_at: toDateTimeText(new Date()),
  }, tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const extendStayOrder = async ({
  merchantUserId,
  orderId,
  payload,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const orderRow = await getStayOrderRowById(merchantUserId, orderId, tx, { forUpdate: true });
  if (!orderRow) {
    throw createHandlerError('notFound', '入住单不存在或无权限操作', 'id');
  }
  if (orderRow.status !== stayOrderStatus.checkedIn) {
    throw createHandlerError('validation', '仅在住状态入住单可办理续住', 'status');
  }

  const oldCheckout = parseDateText(toDateText(orderRow.planned_check_out_date));
  if (!oldCheckout) {
    throw createHandlerError('validation', '入住单离店日期异常，无法续住', 'plannedCheckOutDate');
  }
  const newCheckout = parseDateText(payload?.newCheckOutDate);
  if (!newCheckout) {
    throw createHandlerError('validation', '请选择新的离店日期', 'newCheckOutDate');
  }
  const addedNights = getDateDiffDays(oldCheckout.date, newCheckout.date);
  if (addedNights <= 0) {
    throw createHandlerError('validation', '新的离店日期必须晚于当前离店日期', 'newCheckOutDate');
  }

  const checkInDate = parseDateText(toDateText(orderRow.planned_check_in_date));
  if (!checkInDate) {
    throw createHandlerError('validation', '入住单入住日期异常，无法续住', 'plannedCheckInDate');
  }
  const stayNights = calcStayNights(checkInDate.date, newCheckout.date);
  const nightlyPriceCents = Number(orderRow.nightly_price_cents) || 0;
  const roomChargeCents = calcRoomChargeCents(nightlyPriceCents, stayNights);
  const depositCents = Number(orderRow.deposit_cents) || 0;
  const settlementPaidCents = Number(orderRow.settlement_paid_cents) || 0;
  const balanceCents = calcBalanceCents({
    roomChargeCents,
    depositCents,
    settlementPaidCents,
  });
  const addedAmountCents = calcRoomChargeCents(nightlyPriceCents, addedNights);
  const remark = safeTrim(payload?.remark).slice(0, maxStayRemarkLength);

  await updateStayOrderRow(merchantUserId, orderId, {
    planned_check_out_date: newCheckout.text,
    stay_nights: stayNights,
    room_charge_cents: roomChargeCents,
    balance_cents: balanceCents,
    remark: remark || orderRow.remark || '',
  }, tx);

  await insertStayExtensionRow({
    stayOrderId: orderId,
    merchantUserId,
    oldCheckoutDate: oldCheckout.text,
    newCheckoutDate: newCheckout.text,
    addedNights,
    addedAmountCents,
    remark,
  }, tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const checkOutStayOrder = async ({
  merchantUserId,
  orderId,
  payload,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanHandleCheckIn(merchantUserId, tx);

  const orderRow = await getStayOrderRowById(merchantUserId, orderId, tx, { forUpdate: true });
  if (!orderRow) {
    throw createHandlerError('notFound', '入住单不存在或无权限操作', 'id');
  }
  if (orderRow.status !== stayOrderStatus.checkedIn) {
    throw createHandlerError('validation', '仅在住状态入住单可办理退房', 'status');
  }

  const checkInDateText = toDateText(orderRow.actual_check_in_at || orderRow.planned_check_in_date);
  const checkInDate = parseDateText(checkInDateText);
  const checkOutDate = parseDateText(payload?.actualCheckOutDate || getNowDateText());
  if (!checkInDate || !checkOutDate) {
    throw createHandlerError('validation', '退房日期参数不合法', 'actualCheckOutDate');
  }
  if (checkOutDate.date.getTime() < checkInDate.date.getTime()) {
    throw createHandlerError('validation', '退房日期不能早于入住日期', 'actualCheckOutDate');
  }

  const stayNights = calcStayNights(checkInDate.date, checkOutDate.date);
  const nightlyPriceCents = Number(orderRow.nightly_price_cents) || 0;
  const roomChargeCents = calcRoomChargeCents(nightlyPriceCents, stayNights);
  const depositCents = Number(orderRow.deposit_cents) || 0;
  const settlementPaidCents = toNonNegativeInt(payload?.settlementPaidCents)
    ?? normalizeYuanToCents(payload?.settlementPaid)
    ?? 0;
  const balanceCents = calcBalanceCents({
    roomChargeCents,
    depositCents,
    settlementPaidCents,
  });
  const paymentMethod = stayPaymentMethodList.includes(payload?.paymentMethod)
    ? payload.paymentMethod
    : (orderRow.payment_method || stayPaymentMethod.cash);
  const remark = safeTrim(payload?.remark).slice(0, maxStayRemarkLength) || safeTrim(orderRow.remark);

  await applyRoomTransitionWithinTx({
    merchantUserId,
    roomId: Number(orderRow.room_id),
    action: merchantRoomTransitionActions.checkOut,
    executor: tx,
  });

  await updateStayOrderRow(merchantUserId, orderId, {
    status: stayOrderStatus.checkedOut,
    actual_check_out_at: toDateTimeText(new Date()),
    stay_nights: stayNights,
    room_charge_cents: roomChargeCents,
    settlement_paid_cents: settlementPaidCents,
    balance_cents: balanceCents,
    payment_method: paymentMethod,
    remark,
  }, tx);

  return getStayOrderDetailById(merchantUserId, orderId, tx);
});

const getStayOrdersView = async ({
  merchantUserId,
  orderNo = '',
  roomNumber = '',
  primaryGuestName = '',
  status = '',
  startDate = '',
  endDate = '',
  page = 1,
  pageSize = 10,
}) => {
  const pageResult = await getStayOrdersPage({
    merchantUserId,
    orderNo,
    roomNumber,
    primaryGuestName,
    status,
    startDate,
    endDate,
    page,
    pageSize,
  });

  return {
    list: pageResult.rows.map(mapStayOrderSummary),
    pagination: {
      page,
      pageSize,
      total: pageResult.total,
    },
    statusOptions: stayOrderStatusList,
  };
};

const getStayOrderDetailView = async ({
  merchantUserId,
  orderId,
}) => getStayOrderDetailById(merchantUserId, orderId);

module.exports = {
  stayOrderStatus,
  stayOrderSourceType,
  stayPaymentMethod,
  getMerchantCheckInMeta,
  createReservationStayOrder,
  createWalkInStayOrder,
  confirmReservationCheckIn,
  cancelReservationOrder,
  extendStayOrder,
  checkOutStayOrder,
  getStayOrdersView,
  getStayOrderDetailView,
};
