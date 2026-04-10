const { runQuery, lockUserRow } = require('../../utils/repository');

const getMerchantHotelReviewStatus = async (merchantUserId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT review_status
     FROM merchant_hotels
     WHERE merchant_user_id = ?
     LIMIT 1`,
    [merchantUserId]
  );
  return row?.review_status || '';
};

const getMerchantRoomRowById = async (merchantUserId, roomId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.max_guests AS room_type_max_guests,
       rt.sale_price_cents AS room_type_sale_price_cents,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     WHERE r.merchant_user_id = ? AND r.id = ?
     LIMIT 1${suffix}`,
    [merchantUserId, roomId]
  );

  return row || null;
};

const getMerchantCheckInRoomRows = async (merchantUserId, executor = null) => (
  runQuery(
    executor,
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.max_guests AS room_type_max_guests,
       rt.sale_price_cents AS room_type_sale_price_cents,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     WHERE r.merchant_user_id = ?
     ORDER BY r.floor_number DESC, r.room_number ASC, r.id ASC`,
    [merchantUserId]
  )
);

const createStayOrderRow = async ({
  merchantUserId,
  orderNo,
  sourceType,
  status,
  roomId,
  roomNumberSnapshot,
  roomTypeIdSnapshot,
  roomTypeNameSnapshot,
  guestCount,
  primaryGuestName,
  primaryGuestIdNo,
  primaryGuestPhone,
  primaryGuestGender,
  plannedCheckInDate,
  plannedCheckOutDate,
  actualCheckInAt,
  actualCheckOutAt,
  nightlyPriceCents,
  stayNights,
  roomChargeCents,
  depositCents,
  settlementPaidCents,
  balanceCents,
  paymentMethod,
  remark,
}, executor = null) => {
  const result = await runQuery(
    executor,
    `INSERT INTO merchant_stay_orders
      (merchant_user_id, order_no, source_type, status, room_id, room_number_snapshot, room_type_id_snapshot, room_type_name_snapshot,
       guest_count, primary_guest_name, primary_guest_id_no, primary_guest_phone, primary_guest_gender,
       planned_check_in_date, planned_check_out_date, actual_check_in_at, actual_check_out_at,
       nightly_price_cents, stay_nights, room_charge_cents, deposit_cents, settlement_paid_cents, balance_cents, payment_method, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      merchantUserId,
      orderNo,
      sourceType,
      status,
      roomId,
      roomNumberSnapshot,
      roomTypeIdSnapshot,
      roomTypeNameSnapshot,
      guestCount,
      primaryGuestName,
      primaryGuestIdNo,
      primaryGuestPhone,
      primaryGuestGender,
      plannedCheckInDate,
      plannedCheckOutDate,
      actualCheckInAt || null,
      actualCheckOutAt || null,
      nightlyPriceCents,
      stayNights,
      roomChargeCents,
      depositCents,
      settlementPaidCents,
      balanceCents,
      paymentMethod,
      remark,
    ]
  );

  return Number(result.insertId);
};

const insertStayGuestRows = async (guestRows = [], executor = null) => {
  for (const guest of guestRows) {
    await runQuery(
      executor,
      `INSERT INTO merchant_stay_guests
        (stay_order_id, merchant_user_id, is_primary, name, id_no, phone, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        guest.stayOrderId,
        guest.merchantUserId,
        guest.isPrimary,
        guest.name,
        guest.idNo,
        guest.phone,
        guest.gender,
      ]
    );
  }
};

const getStayOrderRowById = async (merchantUserId, orderId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       so.*,
       r.room_number,
       r.physical_status AS room_physical_status,
       r.sales_status AS room_sales_status,
       r.is_forced_off_sale AS room_is_forced_off_sale,
       rt.room_name AS current_room_type_name,
       rt.max_guests AS current_room_type_max_guests,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale
     FROM merchant_stay_orders so
     LEFT JOIN merchant_rooms r
       ON r.id = so.room_id
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     WHERE so.merchant_user_id = ? AND so.id = ?
     LIMIT 1${suffix}`,
    [merchantUserId, orderId]
  );

  return row || null;
};

const getStayGuestsByOrderId = async (merchantUserId, orderId, executor = null) => (
  runQuery(
    executor,
    `SELECT *
     FROM merchant_stay_guests
     WHERE merchant_user_id = ? AND stay_order_id = ?
     ORDER BY is_primary DESC, id ASC`,
    [merchantUserId, orderId]
  )
);

const getStayExtensionsByOrderId = async (merchantUserId, orderId, executor = null) => (
  runQuery(
    executor,
    `SELECT *
     FROM merchant_stay_extensions
     WHERE merchant_user_id = ? AND stay_order_id = ?
     ORDER BY created_at DESC, id DESC`,
    [merchantUserId, orderId]
  )
);

const updateStayOrderRow = async (merchantUserId, orderId, patch, executor = null) => {
  const entries = Object.entries(patch || {});
  if (!entries.length) {
    return;
  }

  const setSql = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  await runQuery(
    executor,
    `UPDATE merchant_stay_orders
     SET ${setSql}
     WHERE merchant_user_id = ? AND id = ?`,
    [...values, merchantUserId, orderId]
  );
};

const insertStayExtensionRow = async ({
  stayOrderId,
  merchantUserId,
  oldCheckoutDate,
  newCheckoutDate,
  addedNights,
  addedAmountCents,
  remark,
}, executor = null) => {
  await runQuery(
    executor,
    `INSERT INTO merchant_stay_extensions
      (stay_order_id, merchant_user_id, old_checkout_date, new_checkout_date, added_nights, added_amount_cents, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      stayOrderId,
      merchantUserId,
      oldCheckoutDate,
      newCheckoutDate,
      addedNights,
      addedAmountCents,
      remark,
    ]
  );
};

const getStayOrdersPage = async ({
  merchantUserId,
  orderNo = '',
  roomNumber = '',
  primaryGuestName = '',
  status = '',
  startDate = '',
  endDate = '',
  page = 1,
  pageSize = 10,
}, executor = null) => {
  const conditions = ['so.merchant_user_id = ?'];
  const values = [merchantUserId];

  if (orderNo) {
    conditions.push('so.order_no LIKE ?');
    values.push(`%${orderNo}%`);
  }
  if (roomNumber) {
    conditions.push('so.room_number_snapshot LIKE ?');
    values.push(`%${roomNumber}%`);
  }
  if (primaryGuestName) {
    conditions.push('so.primary_guest_name LIKE ?');
    values.push(`%${primaryGuestName}%`);
  }
  if (status) {
    conditions.push('so.status = ?');
    values.push(status);
  }
  if (startDate) {
    conditions.push('so.planned_check_in_date >= ?');
    values.push(startDate);
  }
  if (endDate) {
    conditions.push('so.planned_check_out_date <= ?');
    values.push(endDate);
  }

  const whereSql = conditions.join(' AND ');
  const [countRow] = await runQuery(
    executor,
    `SELECT COUNT(*) AS total
     FROM merchant_stay_orders so
     WHERE ${whereSql}`,
    values
  );

  const offset = (page - 1) * pageSize;
  const rows = await runQuery(
    executor,
    `SELECT so.*
     FROM merchant_stay_orders so
     WHERE ${whereSql}
     ORDER BY so.created_at DESC, so.id DESC
     LIMIT ?, ?`,
    [...values, offset, pageSize]
  );

  return {
    total: Number(countRow?.total || 0),
    rows,
  };
};

const getStayOrdersByStatus = async ({
  merchantUserId,
  status,
  limit = 20,
}, executor = null) => (
  runQuery(
    executor,
    `SELECT *
     FROM merchant_stay_orders
     WHERE merchant_user_id = ? AND status = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
    [merchantUserId, status, limit]
  )
);

const getStayOrderCountByOrderNo = async (orderNo, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT COUNT(*) AS total
     FROM merchant_stay_orders
     WHERE order_no = ?`,
    [orderNo]
  );
  return Number(row?.total || 0);
};

module.exports = {
  lockMerchantRow: lockUserRow,
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
};
