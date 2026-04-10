const { query } = require('../../../db/index');
const { auditStatusList, onSaleStatusList } = require('./constants');
const { runQuery, lockUserRow } = require('../../utils/repository');

const roomTypeSuggestionFieldMap = {
  hotel_name: 'mh.hotel_name',
  room_type: 'rt.room_name',
};

const appendStatusFilters = ({
  conditions,
  values,
  alias,
  auditStatus,
  saleStatus,
}) => {
  if (auditStatusList.includes(auditStatus)) {
    conditions.push(`${alias}.audit_status = ?`);
    values.push(auditStatus);
  }

  if (onSaleStatusList.includes(saleStatus)) {
    conditions.push(`${alias}.is_on_sale = ?`);
    values.push(saleStatus);
  }
};

const appendMerchantKeywordFilter = ({
  conditions,
  values,
  alias,
  keyword = '',
}) => {
  if (keyword) {
    conditions.push(`(${alias}.room_name LIKE ? OR CAST(${alias}.id AS CHAR) LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }
};

const getMerchantRoomTypesPage = async ({
  merchantUserId,
  auditStatus = null,
  saleStatus = null,
  keyword = '',
  page = 1,
  pageSize = 8,
}) => {
  const conditions = ['rt.merchant_user_id = ?'];
  const values = [merchantUserId];
  appendStatusFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
  });
  appendMerchantKeywordFilter({
    conditions,
    values,
    alias: 'rt',
    keyword,
  });

  const whereSql = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total
     FROM merchant_room_types rt
     WHERE ${whereSql}`,
    values
  );

  const rows = await query(
    `SELECT
       rt.*,
       COALESCE(room_counter.total, 0) AS current_room_count,
       cover_image.file_path AS cover_image_file_path,
       COALESCE(image_counter.total, 0) AS image_count
     FROM merchant_room_types rt
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_rooms
       GROUP BY room_type_id
     ) room_counter
       ON room_counter.room_type_id = rt.id
     LEFT JOIN merchant_room_type_images cover_image
       ON cover_image.id = (
         SELECT i.id
         FROM merchant_room_type_images i
         WHERE i.room_type_id = rt.id
         ORDER BY i.id ASC
         LIMIT 1
       )
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_room_type_images
       GROUP BY room_type_id
     ) image_counter
       ON image_counter.room_type_id = rt.id
     WHERE ${whereSql}
     ORDER BY rt.updated_at DESC, rt.id DESC
     LIMIT ?, ?`,
    [...values, offset, pageSize]
  );

  return {
    total: Number(countRow?.total || 0),
    rows,
  };
};

const getMerchantRoomTypeSuggestions = async ({
  merchantUserId,
  auditStatus = null,
  saleStatus = null,
  keyword = '',
  limit = 8,
}) => {
  const conditions = ['rt.merchant_user_id = ?'];
  const values = [merchantUserId];
  appendStatusFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
  });
  appendMerchantKeywordFilter({
    conditions,
    values,
    alias: 'rt',
    keyword,
  });

  const whereSql = conditions.join(' AND ');
  return query(
    `SELECT
       rt.id,
       rt.room_name,
       rt.audit_status,
       rt.is_on_sale,
       rt.is_forced_off_sale
     FROM merchant_room_types rt
     WHERE ${whereSql}
     ORDER BY
       CASE
         WHEN ? <> '' AND rt.room_name = ? THEN 0
         WHEN ? <> '' AND CAST(rt.id AS CHAR) = ? THEN 1
         ELSE 2
       END ASC,
       rt.updated_at DESC,
       rt.id DESC
     LIMIT ?`,
    [...values, keyword, keyword, keyword, keyword, limit]
  );
};

const getAdminRoomTypesPage = async ({
  auditStatus = null,
  saleStatus = null,
  hotelName = '',
  roomTypeName = '',
  page = 1,
  pageSize = 10,
}) => {
  const conditions = ['1 = 1'];
  const values = [];
  appendStatusFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
  });
  if (hotelName) {
    conditions.push('mh.hotel_name = ?');
    values.push(hotelName);
  }
  if (roomTypeName) {
    conditions.push('rt.room_name = ?');
    values.push(roomTypeName);
  }

  const whereSql = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total
     FROM merchant_room_types rt
     LEFT JOIN merchant_hotels mh ON mh.merchant_user_id = rt.merchant_user_id
     WHERE ${whereSql}`,
    values
  );

  const rows = await query(
    `SELECT
       rt.*,
       COALESCE(u.name, u.username, CONCAT('商家#', rt.merchant_user_id)) AS merchant_name,
       u.username AS merchant_username,
       mh.hotel_name AS hotel_name,
       COALESCE(room_counter.total, 0) AS current_room_count,
       cover_image.file_path AS cover_image_file_path,
       COALESCE(image_counter.total, 0) AS image_count
     FROM merchant_room_types rt
     LEFT JOIN users u ON u.id = rt.merchant_user_id
     LEFT JOIN merchant_hotels mh ON mh.merchant_user_id = rt.merchant_user_id
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_rooms
       GROUP BY room_type_id
     ) room_counter
       ON room_counter.room_type_id = rt.id
     LEFT JOIN merchant_room_type_images cover_image
       ON cover_image.id = (
         SELECT i.id
         FROM merchant_room_type_images i
         WHERE i.room_type_id = rt.id
         ORDER BY i.id ASC
         LIMIT 1
       )
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_room_type_images
       GROUP BY room_type_id
     ) image_counter
       ON image_counter.room_type_id = rt.id
     WHERE ${whereSql}
     ORDER BY
       CASE WHEN rt.audit_status = 0 THEN 0 ELSE 1 END ASC,
       rt.updated_at DESC,
       rt.id DESC
     LIMIT ?, ?`,
    [...values, offset, pageSize]
  );

  return {
    total: Number(countRow?.total || 0),
    rows,
  };
};

const getAdminRoomTypeSuggestions = async ({
  field,
  keyword = '',
  auditStatus = null,
  saleStatus = null,
  hotelName = '',
  roomTypeName = '',
  limit = 10,
}) => {
  const fieldColumn = roomTypeSuggestionFieldMap[field];
  const conditions = [
    `${fieldColumn} IS NOT NULL`,
    `${fieldColumn} <> ''`,
  ];
  const values = [];
  appendStatusFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
  });

  if (field !== 'hotel_name' && hotelName) {
    conditions.push('mh.hotel_name = ?');
    values.push(hotelName);
  }

  if (field !== 'room_type' && roomTypeName) {
    conditions.push('rt.room_name = ?');
    values.push(roomTypeName);
  }

  if (keyword) {
    conditions.push(`${fieldColumn} LIKE ?`);
    values.push(`%${keyword}%`);
  }

  return query(
    `SELECT DISTINCT ${fieldColumn} AS value
     FROM merchant_room_types rt
     LEFT JOIN merchant_hotels mh ON mh.merchant_user_id = rt.merchant_user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY value ASC
     LIMIT ?`,
    [...values, limit]
  );
};

const getMerchantRoomTypeRowById = async (merchantUserId, roomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       rt.*,
       COALESCE(room_counter.total, 0) AS current_room_count
     FROM merchant_room_types rt
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_rooms
       GROUP BY room_type_id
     ) room_counter
       ON room_counter.room_type_id = rt.id
     WHERE rt.id = ? AND rt.merchant_user_id = ?
     LIMIT 1${suffix}`,
    [roomTypeId, merchantUserId]
  );
  return row || null;
};

const getAdminRoomTypeRowById = async (roomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       rt.*,
       COALESCE(u.name, u.username, CONCAT('商家#', rt.merchant_user_id)) AS merchant_name,
       u.username AS merchant_username,
       mh.hotel_name AS hotel_name,
       COALESCE(room_counter.total, 0) AS current_room_count
     FROM merchant_room_types rt
     LEFT JOIN users u ON u.id = rt.merchant_user_id
     LEFT JOIN merchant_hotels mh ON mh.merchant_user_id = rt.merchant_user_id
     LEFT JOIN (
       SELECT room_type_id, COUNT(*) AS total
       FROM merchant_rooms
       GROUP BY room_type_id
     ) room_counter
       ON room_counter.room_type_id = rt.id
     WHERE rt.id = ?
     LIMIT 1${suffix}`,
    [roomTypeId]
  );
  return row || null;
};

const getRoomTypeImagesByRoomTypeId = async (roomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  return runQuery(
    executor,
    `SELECT *
     FROM merchant_room_type_images
     WHERE room_type_id = ?
     ORDER BY id ASC${suffix}`,
    [roomTypeId]
  );
};

const getRoomTypeDraftRowsByMerchantUserId = async (merchantUserId, executor = null) => {
  return runQuery(
    executor,
    `SELECT
       d.*,
       rt.audit_status AS source_audit_status
     FROM merchant_room_type_drafts d
     LEFT JOIN merchant_room_types rt
       ON rt.id = d.source_room_type_id
      AND rt.merchant_user_id = d.merchant_user_id
     WHERE d.merchant_user_id = ?
     ORDER BY d.updated_at DESC, d.id DESC`,
    [merchantUserId]
  );
};

const getRoomTypeDraftRowBySource = async (merchantUserId, sourceRoomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       d.*,
       rt.audit_status AS source_audit_status
     FROM merchant_room_type_drafts d
     LEFT JOIN merchant_room_types rt
       ON rt.id = d.source_room_type_id
      AND rt.merchant_user_id = d.merchant_user_id
     WHERE d.merchant_user_id = ? AND d.source_room_type_id = ?
     LIMIT 1${suffix}`,
    [merchantUserId, sourceRoomTypeId]
  );
  return row || null;
};

const saveRoomTypeDraftBySource = async (merchantUserId, sourceRoomTypeId, payload, executor = null) => {
  await runQuery(
    executor,
    `INSERT INTO merchant_room_type_drafts (merchant_user_id, source_room_type_id, payload_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
    [merchantUserId, sourceRoomTypeId, JSON.stringify(payload || {})]
  );

  return getRoomTypeDraftRowBySource(merchantUserId, sourceRoomTypeId, executor);
};

const deleteRoomTypeDraftBySource = async (merchantUserId, sourceRoomTypeId, executor = null) => {
  await runQuery(
    executor,
    `DELETE FROM merchant_room_type_drafts
     WHERE merchant_user_id = ? AND source_room_type_id = ?`,
    [merchantUserId, sourceRoomTypeId]
  );
};

const getRoomTypeDraftImagesByDraftId = async (draftId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  return runQuery(
    executor,
    `SELECT *
     FROM merchant_room_type_draft_images
     WHERE draft_id = ?
     ORDER BY id ASC${suffix}`,
    [draftId]
  );
};

const getRoomTypeDraftImagesByDraftIds = async (draftIds = [], executor = null) => {
  const normalizedIds = [...new Set((Array.isArray(draftIds) ? draftIds : [])
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))];

  if (!normalizedIds.length) {
    return [];
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');
  return runQuery(
    executor,
    `SELECT *
     FROM merchant_room_type_draft_images
     WHERE draft_id IN (${placeholders})
     ORDER BY draft_id ASC, id ASC`,
    normalizedIds
  );
};

const getReferencedRoomTypeImageFilePaths = async (filePaths = [], executor = null) => {
  const normalizedPaths = [...new Set((Array.isArray(filePaths) ? filePaths : []).filter(Boolean))];
  if (!normalizedPaths.length) {
    return [];
  }

  const placeholders = normalizedPaths.map(() => '?').join(', ');
  return runQuery(
    executor,
    `SELECT DISTINCT file_path
     FROM merchant_room_type_images
     WHERE file_path IN (${placeholders})
     UNION
     SELECT DISTINCT file_path
     FROM merchant_room_type_draft_images
     WHERE file_path IN (${placeholders})`,
    [...normalizedPaths, ...normalizedPaths]
  );
};

const getMerchantRoomTypeDetail = async (merchantUserId, roomTypeId) => {
  const row = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId);
  if (!row) return null;
  const images = await getRoomTypeImagesByRoomTypeId(roomTypeId);
  return { row, images };
};

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

const getMerchantHotelRoomTypeMeta = async (merchantUserId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT review_status, facility_selections, custom_facilities
     FROM merchant_hotels
     WHERE merchant_user_id = ?
     LIMIT 1`,
    [merchantUserId]
  );
  return row || null;
};

const getAdminRoomTypeDetail = async (roomTypeId) => {
  const row = await getAdminRoomTypeRowById(roomTypeId);
  if (!row) return null;
  const images = await getRoomTypeImagesByRoomTypeId(roomTypeId);
  return { row, images };
};

const getVisibleRoomTypesByMerchantId = async (merchantUserId) => {
  return query(
    `SELECT *
     FROM merchant_room_types
     WHERE merchant_user_id = ?
       AND audit_status = 1
       AND is_on_sale = 1
       AND is_forced_off_sale = 0
     ORDER BY updated_at DESC, id DESC`,
    [merchantUserId]
  );
};

module.exports = {
  runQuery,
  lockMerchantRow: lockUserRow,
  getMerchantRoomTypesPage,
  getMerchantRoomTypeSuggestions,
  getAdminRoomTypesPage,
  getAdminRoomTypeSuggestions,
  getMerchantRoomTypeRowById,
  getAdminRoomTypeRowById,
  getRoomTypeImagesByRoomTypeId,
  getRoomTypeDraftRowsByMerchantUserId,
  getRoomTypeDraftRowBySource,
  saveRoomTypeDraftBySource,
  deleteRoomTypeDraftBySource,
  getRoomTypeDraftImagesByDraftId,
  getRoomTypeDraftImagesByDraftIds,
  getReferencedRoomTypeImageFilePaths,
  getMerchantRoomTypeDetail,
  getMerchantHotelReviewStatus,
  getMerchantHotelRoomTypeMeta,
  getAdminRoomTypeDetail,
  getVisibleRoomTypesByMerchantId,
};
