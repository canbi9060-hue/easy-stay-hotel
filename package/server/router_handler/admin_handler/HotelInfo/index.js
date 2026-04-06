const { withTransaction } = require('../../../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const {
  getAdminHotelReviewSummary,
  getAdminHotelsPage,
  getAdminHotelProfileRowByMerchantUserId,
  getHotelImagesByMerchantId,
  getHotelCertificatesByMerchantId,
  getHotelFloorsByMerchantId,
  lockMerchantRow,
  runQuery,
} = require('../../merchant_handler/HotelInfo/repository');
const { mapHotelProfile } = require('../../merchant_handler/HotelInfo/profile');
const {
  minReviewRemarkLength,
  maxReviewRemarkLength,
} = require('../../merchant_handler/HotelInfo/constants');
const { groupHotelImages, groupHotelCertificates } = require('../../merchant_handler/HotelInfo/helpers');
const { createHandlerError, safeTrim } = require('../../utils/common');
const { parsePageParams } = require('../../utils/query');

const adminHotelReviewStatusList = ['reviewing', 'approved', 'rejected_pending_fix'];
const isAdminHotelReviewStatus = (reviewStatus = '') => adminHotelReviewStatusList.includes(reviewStatus);

const mapAdminHotelListItem = (row) => ({
  merchantUserId: Number(row.merchant_user_id),
  merchantName: row.merchant_name || row.merchant_username || '',
  hotelName: row.hotel_name || '',
  accommodationType: row.accommodation_type || 'hotel',
  city: row.city || '',
  district: row.district || '',
  addressDetail: row.address_detail || '',
  reviewStatus: row.review_status,
  reviewRemark: row.review_remark || '',
  updatedAt: row.updated_at,
});

const mapAdminHotelDetail = ({ row, images, certificates, floors }) => {
  const hotelProfile = mapHotelProfile(row, floors);
  return {
    ...hotelProfile,
    merchantUserId: Number(row.merchant_user_id),
    merchantName: row.merchant_name || row.merchant_username || '',
    merchantUsername: row.merchant_username || '',
    reviewStatus: row.review_status,
    reviewRemark: row.review_remark || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hotelImages: groupHotelImages(images),
    hotelCertificates: groupHotelCertificates(certificates),
  };
};

const getHotelReviewDetail = async (merchantUserId, executor = null, options = {}) => {
  const row = await getAdminHotelProfileRowByMerchantUserId(merchantUserId, executor, options);
  if (!row || !isAdminHotelReviewStatus(row.review_status)) {
    return null;
  }

  const images = await getHotelImagesByMerchantId(merchantUserId, '', executor);
  const certificates = await getHotelCertificatesByMerchantId(merchantUserId, '', executor);
  const floors = await getHotelFloorsByMerchantId(merchantUserId, executor);

  return {
    row,
    images,
    certificates,
    floors,
  };
};

exports.getAdminHotels = async (req, res) => {
  try {
    const status = safeTrim(req.query.status) || 'all';
    if (status !== 'all' && !adminHotelReviewStatusList.includes(status)) {
      return res.json(validationFail('审核状态参数不合法', 'status'));
    }

    const { page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, 10);
    const [summary, listResult] = await Promise.all([
      getAdminHotelReviewSummary(),
      getAdminHotelsPage({ status, page, pageSize }),
    ]);

    res.json(success({
      list: listResult.rows.map(mapAdminHotelListItem),
      summary,
      pagination: {
        page,
        pageSize,
        total: listResult.total,
      },
    }, '获取酒店审核列表成功'));
  } catch (error) {
    console.error('获取管理员酒店审核列表失败:', error);
    res.json(serverFail('获取酒店审核列表失败，请稍后重试'));
  }
};

exports.getAdminHotelDetail = async (req, res) => {
  try {
    const merchantUserId = Number(req.params.merchantUserId);
    if (!Number.isInteger(merchantUserId) || merchantUserId <= 0) {
      return res.json(validationFail('商家 ID 不合法', 'merchantUserId'));
    }

    const detail = await getHotelReviewDetail(merchantUserId);
    if (!detail) {
      return res.json(notFoundFail('酒店资料不存在', 'merchantUserId'));
    }

    res.json(success(mapAdminHotelDetail(detail), '获取酒店审核详情成功'));
  } catch (error) {
    console.error('获取管理员酒店审核详情失败:', error);
    res.json(serverFail('获取酒店审核详情失败，请稍后重试'));
  }
};

exports.reviewAdminHotel = async (req, res) => {
  try {
    const merchantUserId = Number(req.params.merchantUserId);
    if (!Number.isInteger(merchantUserId) || merchantUserId <= 0) {
      return res.json(validationFail('商家 ID 不合法', 'merchantUserId'));
    }

    const reviewStatus = safeTrim(req.body?.reviewStatus);
    if (!['approved', 'rejected_pending_fix'].includes(reviewStatus)) {
      return res.json(validationFail('审核状态参数不合法', 'reviewStatus'));
    }

    const reviewRemark = safeTrim(req.body?.reviewRemark);
    if (reviewStatus === 'rejected_pending_fix' && !reviewRemark) {
      return res.json(validationFail('驳回原因不能为空', 'reviewRemark'));
    }
    if (
      reviewStatus === 'rejected_pending_fix'
      && (reviewRemark.length < minReviewRemarkLength || reviewRemark.length > maxReviewRemarkLength)
    ) {
      return res.json(validationFail(`驳回原因需为 ${minReviewRemarkLength}～${maxReviewRemarkLength} 个字符`, 'reviewRemark'));
    }

    const result = await withTransaction(async (tx) => {
      await lockMerchantRow(tx, merchantUserId);
      const row = await getAdminHotelProfileRowByMerchantUserId(merchantUserId, tx, { forUpdate: true });
      if (!row) {
        throw createHandlerError('notFound', '酒店资料不存在', 'merchantUserId');
      }
      if (row.review_status !== 'reviewing') {
        throw createHandlerError('validation', '仅待审核酒店可执行审核操作', 'reviewStatus');
      }

      await runQuery(
        tx,
        `UPDATE merchant_hotels
         SET review_status = ?,
             review_remark = ?
         WHERE merchant_user_id = ?`,
        [
          reviewStatus,
          reviewStatus === 'rejected_pending_fix' ? reviewRemark : '',
          merchantUserId,
        ]
      );

      return getHotelReviewDetail(merchantUserId, tx);
    });

    res.json(success(
      mapAdminHotelDetail(result),
      reviewStatus === 'approved' ? '酒店审核通过' : '酒店已驳回'
    ));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'reviewStatus'));
    }
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'merchantUserId'));
    }
    console.error('管理员审核酒店失败:', error);
    res.json(serverFail('审核酒店失败，请稍后重试'));
  }
};
