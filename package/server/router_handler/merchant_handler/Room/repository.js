const { query } = require('../../../db/index');
const { roomTypeAuditStatus } = require('../RoomType/constants');
const { runQuery, lockUserRow } = require('../../utils/repository');
const { merchantRoomPhysicalStatus, merchantRoomSalesStatus } = require('./constants');

const appendRoomFilters = ({
  conditions,
  values,
  keyword = '',
  floorNumber = null,
  roomTypeId = null,
  physicalStatus = '',
  salesStatus = '',
  featureTags = [],
}) => {
  if (keyword) {
    conditions.push(`r.room_number LIKE ?`);
    values.push(`%${keyword}%`);
  }

  if (Number.isInteger(floorNumber) && floorNumber > 0) {
    conditions.push(`r.floor_number = ?`);
    values.push(floorNumber);
  }

  if (Number.isInteger(roomTypeId) && roomTypeId > 0) {
    conditions.push(`r.room_type_id = ?`);
    values.push(roomTypeId);
  }

  if (physicalStatus) {
    conditions.push(`r.physical_status = ?`);
    values.push(physicalStatus);
  }

  if (salesStatus) {
    conditions.push(`(
      CASE
        WHEN r.physical_status <> '${merchantRoomPhysicalStatus.vacantClean}' THEN '${merchantRoomSalesStatus.unavailable}'
        WHEN r.sales_status = '${merchantRoomSalesStatus.reserved}' THEN '${merchantRoomSalesStatus.reserved}'
        WHEN COALESCE(r.is_forced_off_sale, 0) = 1 THEN '${merchantRoomSalesStatus.unavailable}'
        WHEN rt.audit_status = ${roomTypeAuditStatus.approved}
          AND rt.is_on_sale = 1
          AND COALESCE(rt.is_forced_off_sale, 0) <> 1
          THEN '${merchantRoomSalesStatus.available}'
        ELSE '${merchantRoomSalesStatus.unavailable}'
      END
    ) = ?`);
    values.push(salesStatus);
  }

  featureTags.forEach((featureTag) => {
    conditions.push(`JSON_SEARCH(COALESCE(r.feature_tags, JSON_ARRAY()), 'one', ?) IS NOT NULL`);
    values.push(featureTag);
  });
};

const getMerchantHotelRoomMeta = async (merchantUserId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT review_status, total_floor_count
     FROM merchant_hotels
     WHERE merchant_user_id = ?
     LIMIT 1`,
    [merchantUserId]
  );
  return row || null;
};

const getMerchantHotelFloors = async (merchantUserId, executor = null) => (
  runQuery(
    executor,
    `SELECT floor_number, floor_label
     FROM merchant_hotel_floors
     WHERE merchant_user_id = ?
     ORDER BY floor_number DESC, id DESC`,
    [merchantUserId]
  )
);

const getMerchantHotelFloorByNumber = async (merchantUserId, floorNumber, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT floor_number, floor_label
     FROM merchant_hotel_floors
     WHERE merchant_user_id = ? AND floor_number = ?
     LIMIT 1`,
    [merchantUserId, floorNumber]
  );
  return row || null;
};

const getMerchantApprovedRoomTypeOptions = async (merchantUserId, executor = null) => (
  runQuery(
    executor,
    `SELECT
       rt.id,
       rt.room_name,
       rt.audit_status,
       rt.is_on_sale,
       rt.is_forced_off_sale
     FROM merchant_room_types rt
     WHERE rt.merchant_user_id = ?
       AND rt.audit_status = ?
       AND rt.is_on_sale = 1
       AND COALESCE(rt.is_forced_off_sale, 0) <> 1
     ORDER BY rt.updated_at DESC, rt.id DESC`,
    [merchantUserId, roomTypeAuditStatus.approved]
  )
);

const getMerchantRoomTypeMetaById = async (merchantUserId, roomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       rt.id,
       rt.merchant_user_id,
       rt.room_name,
       rt.audit_status,
       rt.is_on_sale,
       rt.is_forced_off_sale
     FROM merchant_room_types rt
     WHERE rt.merchant_user_id = ? AND rt.id = ?
     LIMIT 1${suffix}`,
    [merchantUserId, roomTypeId]
  );
  return row || null;
};

const getMerchantRoomByNumber = async (merchantUserId, roomNumber, executor = null, options = {}) => {
  const values = [merchantUserId, roomNumber];
  let sql = `SELECT id
             FROM merchant_rooms
             WHERE merchant_user_id = ? AND room_number = ?`;

  if (Number.isInteger(options.excludeRoomId) && options.excludeRoomId > 0) {
    sql += ' AND id <> ?';
    values.push(options.excludeRoomId);
  }

  sql += ` LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`;
  const [row] = await runQuery(executor, sql, values);
  return row || null;
};

const getMerchantRoomsPage = async ({
  merchantUserId,
  keyword = '',
  floorNumber = null,
  roomTypeId = null,
  physicalStatus = '',
  salesStatus = '',
  featureTags = [],
  page = 1,
  pageSize = 10,
}) => {
  const conditions = ['r.merchant_user_id = ?'];
  const values = [merchantUserId];
  appendRoomFilters({
    conditions,
    values,
    keyword,
    floorNumber,
    roomTypeId,
    physicalStatus,
    salesStatus,
    featureTags,
  });

  const whereSql = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     WHERE ${whereSql}`,
    values
  );

  const rows = await query(
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale,
       hf.floor_label
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     LEFT JOIN merchant_hotel_floors hf
       ON hf.merchant_user_id = r.merchant_user_id
      AND hf.floor_number = r.floor_number
     WHERE ${whereSql}
     ORDER BY r.floor_number DESC, r.room_number ASC, r.id ASC
     LIMIT ?, ?`,
    [...values, offset, pageSize]
  );

  return {
    total: Number(countRow?.total || 0),
    rows,
  };
};

const getMerchantRoomRowById = async (merchantUserId, roomId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale,
       hf.floor_label
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     LEFT JOIN merchant_hotel_floors hf
       ON hf.merchant_user_id = r.merchant_user_id
      AND hf.floor_number = r.floor_number
     WHERE r.merchant_user_id = ? AND r.id = ?
     LIMIT 1${suffix}`,
    [merchantUserId, roomId]
  );
  return row || null;
};

const getMerchantRoomRowsByIds = async (merchantUserId, roomIds = [], executor = null, options = {}) => {
  const normalizedIds = [...new Set((Array.isArray(roomIds) ? roomIds : [])
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))];
  if (!normalizedIds.length) {
    return [];
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  return runQuery(
    executor,
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale,
       hf.floor_label
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     LEFT JOIN merchant_hotel_floors hf
       ON hf.merchant_user_id = r.merchant_user_id
      AND hf.floor_number = r.floor_number
     WHERE r.merchant_user_id = ? AND r.id IN (${placeholders})
     ORDER BY r.floor_number DESC, r.room_number ASC, r.id ASC${suffix}`,
    [merchantUserId, ...normalizedIds]
  );
};

const createMerchantRoomRow = async ({
  merchantUserId,
  roomNumber,
  floorNumber,
  roomTypeId,
  physicalStatus,
  salesStatus,
  featureTags,
  deviceRemark,
}, executor = null) => {
  const result = await runQuery(
    executor,
    `INSERT INTO merchant_rooms
      (merchant_user_id, room_number, floor_number, room_type_id, physical_status, sales_status, feature_tags, device_remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      merchantUserId,
      roomNumber,
      floorNumber,
      roomTypeId,
      physicalStatus,
      salesStatus,
      featureTags,
      deviceRemark,
    ]
  );
  return Number(result.insertId);
};

const updateMerchantRoomRow = async ({
  roomId,
  merchantUserId,
  roomNumber,
  floorNumber,
  roomTypeId,
  physicalStatus,
  salesStatus,
  featureTags,
  deviceRemark,
}, executor = null) => {
  await runQuery(
    executor,
    `UPDATE merchant_rooms
     SET room_number = ?,
         floor_number = ?,
         room_type_id = ?,
         physical_status = ?,
         sales_status = ?,
         feature_tags = ?,
         device_remark = ?
     WHERE id = ? AND merchant_user_id = ?`,
    [
      roomNumber,
      floorNumber,
      roomTypeId,
      physicalStatus,
      salesStatus,
      featureTags,
      deviceRemark,
      roomId,
      merchantUserId,
    ]
  );
};

const updateMerchantRoomStatus = async ({
  roomId,
  merchantUserId,
  physicalStatus,
  salesStatus,
}, executor = null) => {
  await runQuery(
    executor,
    `UPDATE merchant_rooms
     SET physical_status = ?, sales_status = ?
     WHERE id = ? AND merchant_user_id = ?`,
    [physicalStatus, salesStatus, roomId, merchantUserId]
  );
};

const deleteMerchantRoomRow = async (merchantUserId, roomId, executor = null) => {
  await runQuery(
    executor,
    `DELETE FROM merchant_rooms
     WHERE merchant_user_id = ? AND id = ?`,
    [merchantUserId, roomId]
  );
};

const batchUpdateMerchantRoomPhysicalStatusRows = async ({
  merchantUserId,
  updates = [],
}, executor = null) => {
  for (const update of updates) {
    await updateMerchantRoomStatus({
      roomId: update.roomId,
      merchantUserId,
      physicalStatus: update.physicalStatus,
      salesStatus: update.salesStatus,
    }, executor);
  }
};

const batchBindMerchantRoomTypeRows = async ({
  merchantUserId,
  roomTypeId,
  updates = [],
}, executor = null) => {
  for (const update of updates) {
    await runQuery(
      executor,
      `UPDATE merchant_rooms
       SET room_type_id = ?, sales_status = ?
       WHERE id = ? AND merchant_user_id = ?`,
      [roomTypeId, update.salesStatus, update.roomId, merchantUserId]
    );
  }
};

const getMerchantExistingRoomNumbers = async (merchantUserId, roomNumbers = [], executor = null) => {
  const normalizedRoomNumbers = [...new Set((Array.isArray(roomNumbers) ? roomNumbers : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))];

  if (!normalizedRoomNumbers.length) {
    return [];
  }

  const placeholders = normalizedRoomNumbers.map(() => '?').join(', ');
  return runQuery(
    executor,
    `SELECT room_number
     FROM merchant_rooms
     WHERE merchant_user_id = ? AND room_number IN (${placeholders})`,
    [merchantUserId, ...normalizedRoomNumbers]
  );
};

const countRoomsByRoomTypeId = async (roomTypeId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT COUNT(*) AS total
     FROM merchant_rooms
     WHERE room_type_id = ?`,
    [roomTypeId]
  );
  return Number(row?.total || 0);
};

module.exports = {
  lockMerchantRow: lockUserRow,
  getMerchantHotelRoomMeta,
  getMerchantHotelFloors,
  getMerchantHotelFloorByNumber,
  getMerchantApprovedRoomTypeOptions,
  getMerchantRoomTypeMetaById,
  getMerchantRoomByNumber,
  getMerchantRoomsPage,
  getMerchantRoomRowById,
  getMerchantRoomRowsByIds,
  createMerchantRoomRow,
  updateMerchantRoomRow,
  updateMerchantRoomStatus,
  deleteMerchantRoomRow,
  batchUpdateMerchantRoomPhysicalStatusRows,
  batchBindMerchantRoomTypeRows,
  getMerchantExistingRoomNumbers,
  countRoomsByRoomTypeId,
};
