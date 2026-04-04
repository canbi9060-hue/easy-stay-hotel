const { query } = require('../../../db/index');
const { auditStatusList, onSaleStatusList } = require('./constants');
const { runQuery, lockUserRow } = require('../../utils/repository');

const appendListFilters = ({
  conditions,
  values,
  alias,
  auditStatus,
  saleStatus,
  keyword,
  merchantKeyword = '',
  includeMerchantKeyword = false,
}) => {
  if (auditStatusList.includes(auditStatus)) {
    conditions.push(`${alias}.audit_status = ?`);
    values.push(auditStatus);
  }

  if (onSaleStatusList.includes(saleStatus)) {
    conditions.push(`${alias}.is_on_sale = ?`);
    values.push(saleStatus);
  }

  if (keyword) {
    conditions.push(`(${alias}.room_name LIKE ? OR CAST(${alias}.id AS CHAR) LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (includeMerchantKeyword && merchantKeyword) {
    conditions.push(`(COALESCE(u.name, '') LIKE ? OR COALESCE(u.username, '') LIKE ? OR CAST(${alias}.merchant_user_id AS CHAR) LIKE ?)`);
    values.push(`%${merchantKeyword}%`, `%${merchantKeyword}%`, `%${merchantKeyword}%`);
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
  appendListFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
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
       cover_image.file_path AS cover_image_file_path,
       COALESCE(image_counter.total, 0) AS image_count
     FROM merchant_room_types rt
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
  appendListFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
    keyword,
  });

  const whereSql = conditions.join(' AND ');
  return query(
    `SELECT
       rt.id,
       rt.room_name,
       rt.audit_status,
       rt.is_on_sale
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
  keyword = '',
  merchantKeyword = '',
  page = 1,
  pageSize = 10,
}) => {
  const conditions = ['1 = 1'];
  const values = [];
  appendListFilters({
    conditions,
    values,
    alias: 'rt',
    auditStatus,
    saleStatus,
    keyword,
    merchantKeyword,
    includeMerchantKeyword: true,
  });

  const whereSql = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total
     FROM merchant_room_types rt
     LEFT JOIN users u ON u.id = rt.merchant_user_id
     WHERE ${whereSql}`,
    values
  );

  const rows = await query(
    `SELECT
       rt.*,
       COALESCE(u.name, u.username, CONCAT('商家#', rt.merchant_user_id)) AS merchant_name,
       u.username AS merchant_username,
       cover_image.file_path AS cover_image_file_path,
       COALESCE(image_counter.total, 0) AS image_count
     FROM merchant_room_types rt
     LEFT JOIN users u ON u.id = rt.merchant_user_id
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

const getMerchantRoomTypeRowById = async (merchantUserId, roomTypeId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT rt.*
     FROM merchant_room_types rt
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
       u.username AS merchant_username
     FROM merchant_room_types rt
     LEFT JOIN users u ON u.id = rt.merchant_user_id
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

const getMerchantRoomTypeDetail = async (merchantUserId, roomTypeId) => {
  const row = await getMerchantRoomTypeRowById(merchantUserId, roomTypeId);
  if (!row) return null;
  const images = await getRoomTypeImagesByRoomTypeId(roomTypeId);
  return { row, images };
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
  getMerchantRoomTypeRowById,
  getAdminRoomTypeRowById,
  getRoomTypeImagesByRoomTypeId,
  getMerchantRoomTypeDetail,
  getAdminRoomTypeDetail,
  getVisibleRoomTypesByMerchantId,
};
