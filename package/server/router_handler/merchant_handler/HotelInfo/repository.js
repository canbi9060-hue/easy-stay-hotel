const { query } = require('../../../db/index');
const { runQuery, lockUserRow } = require('../../utils/repository');

const getHotelImagesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  const sql = group
    ? `SELECT * FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? ORDER BY id ASC`
    : `SELECT * FROM merchant_hotel_images WHERE merchant_user_id = ? ORDER BY image_group ASC, id ASC`;
  const values = group ? [merchantUserId, group] : [merchantUserId];
  return runQuery(executor, sql, values);
};

const getHotelCertificatesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  const sql = group
    ? `SELECT * FROM merchant_hotel_certificates WHERE merchant_user_id = ? AND cert_group = ? ORDER BY id ASC`
    : `SELECT * FROM merchant_hotel_certificates WHERE merchant_user_id = ? ORDER BY cert_group ASC, id ASC`;
  const values = group ? [merchantUserId, group] : [merchantUserId];
  return runQuery(executor, sql, values);
};

const getHotelProfileByMerchantId = async (merchantUserId) => {
  const [hotelProfile] = await query(
    `SELECT * FROM merchant_hotels WHERE merchant_user_id = ? LIMIT 1`,
    [merchantUserId]
  );
  return hotelProfile || null;
};

const getMerchantReviewStatus = async (merchantUserId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT review_status
     FROM merchant_hotels
     WHERE merchant_user_id = ?
     LIMIT 1`,
    [merchantUserId]
  );
  return String(row?.review_status || '').trim();
};

module.exports = {
  runQuery,
  lockMerchantRow: lockUserRow,
  getHotelImagesByMerchantId,
  getHotelCertificatesByMerchantId,
  getHotelProfileByMerchantId,
  getMerchantReviewStatus,
};
