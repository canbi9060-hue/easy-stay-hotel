const { withTransaction } = require('../../../db/index');
const { success, serverFail } = require('../../../utils/response');
const { hotelProfileMediaUpload } = require('../../../middleware/upload');

const { createHandlerError, parseRequestObject } = require('../../utils/common');
const { withMulterUpload } = require('../../utils/upload');
const {
  getHotelProfileByMerchantId,
  lockMerchantRow,
} = require('./repository');
const {
  mapHotelProfile,
  validateHotelProfilePayload,
  ensureMerchantHotelEditable,
  resolveReviewStatusAfterSave,
  saveHotelProfile,
} = require('./profile');
const {
  getGroupedHotelImages,
  getGroupedHotelCertificates,
  syncGroupedMediaByMerchantId,
  deleteRemovedHotelImageFiles,
  deleteRemovedHotelCertificateFiles,
  validateReviewRequiredMedia,
} = require('./media');

const mapHotelMediaUploadError = (error) => {
  if (!error) {
    return { message: '上传酒店资料媒体失败', field: 'payload' };
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return error.field === 'hotelCertificateFiles'
      ? { message: '资质证件不能超过 5MB', field: 'hotelCertificateFiles' }
      : { message: '酒店图片不能超过 5MB', field: 'hotelImageFiles' };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return error.field === 'hotelCertificateFiles'
      ? { message: '资质证件上传数量超过上限', field: 'hotelCertificateFiles' }
      : { message: '酒店图片上传数量超过上限', field: 'hotelImageFiles' };
  }

  return {
    message: error.message || '上传酒店资料媒体失败',
    field: error.field || 'payload',
  };
};

const getHotelProfilePayload = (req) => parseRequestObject(req.body?.payload, 'payload');
const getUploadedHotelImageFiles = (req) => (Array.isArray(req.files?.hotelImageFiles) ? req.files.hotelImageFiles : []);
const getUploadedHotelCertificateFiles = (req) => (Array.isArray(req.files?.hotelCertificateFiles) ? req.files.hotelCertificateFiles : []);

const saveHotelProfileWithMedia = async ({
  merchantUserId,
  normalizedPayload,
  reviewStatus,
  hotelImagePlan,
  hotelCertificatePlan,
  hotelImageFiles,
  hotelCertificateFiles,
  requireReviewMedia = false,
}) => {
  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);

    await saveHotelProfile(merchantUserId, normalizedPayload, {
      reviewStatus,
      executor: tx,
    });

    const removedImagePaths = await syncGroupedMediaByMerchantId({
      tx,
      merchantUserId,
      rawPlan: hotelImagePlan,
      files: hotelImageFiles,
      type: 'image',
    });
    const removedCertificatePaths = await syncGroupedMediaByMerchantId({
      tx,
      merchantUserId,
      rawPlan: hotelCertificatePlan,
      files: hotelCertificateFiles,
      type: 'certificate',
    });

    if (requireReviewMedia) {
      const reviewMediaValidation = await validateReviewRequiredMedia(merchantUserId, tx);
      if (!reviewMediaValidation.ok) {
        throw createHandlerError('validation', reviewMediaValidation.message, reviewMediaValidation.field);
      }
    }

    return {
      removedImagePaths,
      removedCertificatePaths,
    };
  });

  deleteRemovedHotelImageFiles(result.removedImagePaths);
  deleteRemovedHotelCertificateFiles(result.removedCertificatePaths);
};

const handleHotelProfileMutation = ({
  strictRequired,
  submitReview = false,
  successMessage,
}) => async (req, res) => {
  const editableResult = await ensureMerchantHotelEditable(req.user.id);
  if (!editableResult.ok) {
    throw createHandlerError('validation', editableResult.message, editableResult.field);
  }

  const rawPayload = getHotelProfilePayload(req);
  if (!rawPayload?.hotelImagePlan || typeof rawPayload.hotelImagePlan !== 'object') {
    throw createHandlerError('validation', '酒店图片同步计划缺失', 'hotelImagePlan');
  }
  if (!rawPayload?.hotelCertificatePlan || typeof rawPayload.hotelCertificatePlan !== 'object') {
    throw createHandlerError('validation', '资质证件同步计划缺失', 'hotelCertificatePlan');
  }

  const validated = validateHotelProfilePayload(rawPayload, { strictRequired });
  if (!validated.payload) {
    throw createHandlerError('validation', validated.message, validated.field);
  }

  await saveHotelProfileWithMedia({
    merchantUserId: req.user.id,
    normalizedPayload: validated.payload,
    reviewStatus: submitReview ? 'reviewing' : resolveReviewStatusAfterSave(editableResult.reviewStatus),
    hotelImagePlan: rawPayload.hotelImagePlan,
    hotelCertificatePlan: rawPayload.hotelCertificatePlan,
    hotelImageFiles: getUploadedHotelImageFiles(req),
    hotelCertificateFiles: getUploadedHotelCertificateFiles(req),
    requireReviewMedia: submitReview,
  });

  const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
  res.json(success(mapHotelProfile(hotelProfile), successMessage));
};

exports.getHotelProfile = async (req, res) => {
  try {
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '获取酒店信息成功'));
  } catch (error) {
    console.error('获取酒店信息失败:', error);
    res.json(serverFail('获取酒店信息失败，请稍后重试'));
  }
};

exports.updateHotelProfile = withMulterUpload({
  uploader: hotelProfileMediaUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapHotelMediaUploadError,
  contextLabel: '保存酒店信息',
  serverMessage: '保存酒店信息失败，请稍后重试',
}, handleHotelProfileMutation({
  strictRequired: false,
  successMessage: '酒店信息保存成功',
}));

exports.getHotelImages = async (req, res) => {
  try {
    const groupedImages = await getGroupedHotelImages(req.user.id);
    res.json(success(groupedImages, '获取酒店图片成功'));
  } catch (error) {
    console.error('获取酒店图片失败:', error);
    res.json(serverFail('获取酒店图片失败，请稍后重试'));
  }
};

exports.getHotelCertificates = async (req, res) => {
  try {
    const groupedCertificates = await getGroupedHotelCertificates(req.user.id);
    res.json(success(groupedCertificates, '获取资质证件成功'));
  } catch (error) {
    console.error('获取资质证件失败:', error);
    res.json(serverFail('获取资质证件失败，请稍后重试'));
  }
};

exports.submitHotelProfileReview = withMulterUpload({
  uploader: hotelProfileMediaUpload,
  getFiles: (req) => req.files,
  mapMulterError: mapHotelMediaUploadError,
  contextLabel: '提交酒店审核',
  serverMessage: '提交审核失败，请稍后重试',
}, handleHotelProfileMutation({
  strictRequired: true,
  submitReview: true,
  successMessage: '酒店信息已提交审核',
}));
