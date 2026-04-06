const { query } = require('../../../db/index');
const { reviewStatusList } = require('./constants');
const { runQuery, lockUserRow } = require('../../utils/repository');

const adminHotelReviewVisibleStatuses = ['reviewing', 'approved', 'rejected_pending_fix'];

const getHotelMediaTableName = (type, scope = 'live') => {
  if (type === 'image') {
    return scope === 'draft' ? 'merchant_hotel_image_drafts' : 'merchant_hotel_images';
  }
  return scope === 'draft' ? 'merchant_hotel_certificate_drafts' : 'merchant_hotel_certificates';
};

const getHotelMediaGroupColumn = (type) => (type === 'image' ? 'image_group' : 'cert_group');

const getScopedHotelMediaByMerchantId = async ({
  merchantUserId,
  type,
  scope = 'live',
  group = '',
  executor = null,
}) => {
  const tableName = getHotelMediaTableName(type, scope);
  const groupColumn = getHotelMediaGroupColumn(type);
  const sql = group
    ? `SELECT * FROM ${tableName} WHERE merchant_user_id = ? AND ${groupColumn} = ? ORDER BY id ASC`
    : `SELECT * FROM ${tableName} WHERE merchant_user_id = ? ORDER BY ${groupColumn} ASC, id ASC`;
  const values = group ? [merchantUserId, group] : [merchantUserId];
  return runQuery(executor, sql, values);
};

const getHotelImagesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  return getScopedHotelMediaByMerchantId({
    merchantUserId,
    type: 'image',
    scope: 'live',
    group,
    executor,
  });
};

const getHotelCertificatesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  return getScopedHotelMediaByMerchantId({
    merchantUserId,
    type: 'certificate',
    scope: 'live',
    group,
    executor,
  });
};

const getHotelProfileByMerchantId = async (merchantUserId, executor = null) => {
  const [hotelProfile] = await runQuery(
    executor,
    `SELECT * FROM merchant_hotels WHERE merchant_user_id = ? LIMIT 1`,
    [merchantUserId]
  );
  return hotelProfile || null;
};

const getHotelProfileDraftByMerchantId = async (merchantUserId, executor = null) => {
  const [draftRow] = await runQuery(
    executor,
    `SELECT * FROM merchant_hotel_profile_drafts WHERE merchant_user_id = ? LIMIT 1`,
    [merchantUserId]
  );
  return draftRow || null;
};

const getHotelFloorsByMerchantId = async (merchantUserId, executor = null) => {
  return runQuery(
    executor,
    `SELECT * FROM merchant_hotel_floors WHERE merchant_user_id = ? ORDER BY floor_number ASC, id ASC`,
    [merchantUserId]
  );
};

const replaceHotelFloorsByMerchantId = async (merchantUserId, floors = [], executor = null) => {
  await runQuery(
    executor,
    `DELETE FROM merchant_hotel_floors WHERE merchant_user_id = ?`,
    [merchantUserId]
  );

  if (!Array.isArray(floors) || floors.length === 0) {
    return;
  }

  const values = [];
  const placeholders = floors.map((item) => {
    values.push(
      merchantUserId,
      Number(item.floorNumber),
      String(item.floorLabel || '').trim()
    );
    return '(?, ?, ?)';
  }).join(', ');

  await runQuery(
    executor,
    `INSERT INTO merchant_hotel_floors (merchant_user_id, floor_number, floor_label)
     VALUES ${placeholders}`,
    values
  );
};

const saveHotelProfileDraftByMerchantId = async (merchantUserId, payload, executor = null) => {
  const sql = `
    INSERT INTO merchant_hotel_profile_drafts (merchant_user_id, payload_json)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)
  `;
  await runQuery(executor, sql, [merchantUserId, JSON.stringify(payload || {})]);
};

const deleteHotelProfileDraftByMerchantId = async (merchantUserId, executor = null) => {
  await runQuery(
    executor,
    `DELETE FROM merchant_hotel_profile_drafts WHERE merchant_user_id = ?`,
    [merchantUserId]
  );
};

const getHotelImageDraftsByMerchantId = async (merchantUserId, group = '', executor = null) => {
  return getScopedHotelMediaByMerchantId({
    merchantUserId,
    type: 'image',
    scope: 'draft',
    group,
    executor,
  });
};

const getHotelCertificateDraftsByMerchantId = async (merchantUserId, group = '', executor = null) => {
  return getScopedHotelMediaByMerchantId({
    merchantUserId,
    type: 'certificate',
    scope: 'draft',
    group,
    executor,
  });
};

const getAdminHotelReviewSummary = async () => {
  const [row] = await query(
    `SELECT
       SUM(CASE WHEN review_status IN (?, ?, ?) THEN 1 ELSE 0 END) AS all_total,
       SUM(CASE WHEN review_status = ? THEN 1 ELSE 0 END) AS reviewing_total,
       SUM(CASE WHEN review_status = ? THEN 1 ELSE 0 END) AS approved_total,
       SUM(CASE WHEN review_status = ? THEN 1 ELSE 0 END) AS rejected_total
     FROM merchant_hotels`,
    [
      ...adminHotelReviewVisibleStatuses,
      'reviewing',
      'approved',
      'rejected_pending_fix',
    ]
  );

  return {
    all: Number(row?.all_total || 0),
    reviewing: Number(row?.reviewing_total || 0),
    approved: Number(row?.approved_total || 0),
    rejected: Number(row?.rejected_total || 0),
  };
};

const getAdminHotelsPage = async ({ status = 'all', page = 1, pageSize = 10 }) => {
  const conditions = [];
  const values = [];

  if (status === 'all') {
    conditions.push(`h.review_status IN (${adminHotelReviewVisibleStatuses.map(() => '?').join(', ')})`);
    values.push(...adminHotelReviewVisibleStatuses);
  } else if (reviewStatusList.includes(status)) {
    conditions.push('h.review_status = ?');
    values.push(status);
  } else {
    conditions.push(`h.review_status IN (${adminHotelReviewVisibleStatuses.map(() => '?').join(', ')})`);
    values.push(...adminHotelReviewVisibleStatuses);
  }

  const whereSql = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [countRow] = await query(
    `SELECT COUNT(*) AS total
     FROM merchant_hotels h
     LEFT JOIN users u ON u.id = h.merchant_user_id
     WHERE ${whereSql}`,
    values
  );

  const rows = await query(
    `SELECT
       h.*,
       COALESCE(u.name, u.username, CONCAT('商家#', h.merchant_user_id)) AS merchant_name,
       u.username AS merchant_username
     FROM merchant_hotels h
     LEFT JOIN users u ON u.id = h.merchant_user_id
     WHERE ${whereSql}
     ORDER BY
       CASE WHEN h.review_status = 'reviewing' THEN 0 ELSE 1 END ASC,
       h.updated_at DESC,
       h.id DESC
     LIMIT ?, ?`,
    [...values, offset, pageSize]
  );

  return {
    total: Number(countRow?.total || 0),
    rows,
  };
};

const getAdminHotelProfileRowByMerchantUserId = async (merchantUserId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       h.*,
       COALESCE(u.name, u.username, CONCAT('商家#', h.merchant_user_id)) AS merchant_name,
       u.username AS merchant_username
     FROM merchant_hotels h
     LEFT JOIN users u ON u.id = h.merchant_user_id
     WHERE h.merchant_user_id = ?
     LIMIT 1${suffix}`,
    [merchantUserId]
  );

  return row || null;
};

module.exports = {
  runQuery,
  lockMerchantRow: lockUserRow,
  getScopedHotelMediaByMerchantId,
  getHotelImagesByMerchantId,
  getHotelCertificatesByMerchantId,
  getHotelProfileByMerchantId,
  getHotelProfileDraftByMerchantId,
  getHotelFloorsByMerchantId,
  replaceHotelFloorsByMerchantId,
  saveHotelProfileDraftByMerchantId,
  deleteHotelProfileDraftByMerchantId,
  getHotelImageDraftsByMerchantId,
  getHotelCertificateDraftsByMerchantId,
  getAdminHotelReviewSummary,
  getAdminHotelsPage,
  getAdminHotelProfileRowByMerchantUserId,
};
