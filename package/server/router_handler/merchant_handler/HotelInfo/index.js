const { success, serverFail } = require('../../../utils/response');
const { hotelProfileMediaUpload } = require('../../../middleware/upload');

const { parseRequestObject } = require('../../utils/common');
const { withMulterUpload } = require('../../utils/upload');
const {
  getMerchantHotelProfileView,
} = require('./profile');
const {
  getMerchantHotelGroupedMedia,
  executeHotelProfileMutation,
} = require('./service');

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

const handleHotelProfileMutation = ({
  strictRequired,
  submitReview = false,
  successMessage,
}) => async (req, res) => {
  const hotelProfile = await executeHotelProfileMutation({
    merchantUserId: req.user.id,
    rawPayload: getHotelProfilePayload(req),
    hotelImageFiles: getUploadedHotelImageFiles(req),
    hotelCertificateFiles: getUploadedHotelCertificateFiles(req),
    strictRequired,
    submitReview,
  });

  res.json(success(hotelProfile, successMessage));
};

exports.getHotelProfile = async (req, res) => {
  try {
    const hotelProfile = await getMerchantHotelProfileView(req.user.id);
    res.json(success(hotelProfile, '获取酒店信息成功'));
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
    const groupedImages = await getMerchantHotelGroupedMedia({
      merchantUserId: req.user.id,
      type: 'image',
    });
    res.json(success(groupedImages, '获取酒店图片成功'));
  } catch (error) {
    console.error('获取酒店图片失败:', error);
    res.json(serverFail('获取酒店图片失败，请稍后重试'));
  }
};

exports.getHotelCertificates = async (req, res) => {
  try {
    const groupedCertificates = await getMerchantHotelGroupedMedia({
      merchantUserId: req.user.id,
      type: 'certificate',
    });
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
