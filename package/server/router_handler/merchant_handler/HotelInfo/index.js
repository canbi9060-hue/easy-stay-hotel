const { query } = require('../../../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { hotelImageUpload, hotelCertificateUpload } = require('../../../middleware/upload');

const { safeTrim, cleanupUploadedTempFile } = require('./helpers');
const { hotelImageGroupList, hotelCertificateGroupList } = require('./constants');
const {
  getHotelProfileByMerchantId,
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
  uploadHotelImageByMerchantId,
  deleteHotelImageByMerchantId,
  sortHotelImagesByMerchantId,
  getGroupedHotelCertificates,
  uploadHotelCertificateByMerchantId,
  deleteHotelCertificateByMerchantId,
  validateReviewRequiredImages,
  validateReviewRequiredCertificates,
} = require('./media');

exports.getHotelProfile = async (req, res) => {
  try {
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '获取酒店信息成功'));
  } catch (error) {
    console.error('获取酒店信息失败:', error);
    res.json(serverFail('获取酒店信息失败，请稍后重试'));
  }
};

exports.updateHotelProfile = async (req, res) => {
  try {
    const editableResult = await ensureMerchantHotelEditable(req.user.id);
    if (!editableResult.ok) {
      return res.json(validationFail(editableResult.message, editableResult.field));
    }

    const validated = validateHotelProfilePayload(req.body, { strictRequired: false });
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    await saveHotelProfile(req.user.id, validated.payload, {
      reviewStatus: resolveReviewStatusAfterSave(editableResult.reviewStatus),
    });
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);

    res.json(success(mapHotelProfile(hotelProfile), '酒店信息保存成功'));
  } catch (error) {
    console.error('保存酒店信息失败:', error);
    res.json(serverFail('保存酒店信息失败，请稍后重试'));
  }
};

exports.getHotelImages = async (req, res) => {
  try {
    const groupedImages = await getGroupedHotelImages(req.user.id);
    res.json(success(groupedImages, '获取酒店图片成功'));
  } catch (error) {
    console.error('获取酒店图片失败:', error);
    res.json(serverFail('获取酒店图片失败，请稍后重试'));
  }
};

exports.uploadHotelImage = (req, res) => {
  hotelImageUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.json(validationFail('酒店图片不能超过 5MB', 'image'));
        }
        return res.json(validationFail('上传酒店图片失败', 'image'));
      }

      const imageGroup = safeTrim(req.body?.group);
      if (!hotelImageGroupList.includes(imageGroup)) {
        cleanupUploadedTempFile(req.file);
        return res.json(validationFail('请选择合法的图片分组', 'group'));
      }

      if (!req.file) {
        return res.json(validationFail('请选择需要上传的图片', 'image'));
      }

      const image = await uploadHotelImageByMerchantId(req.user.id, imageGroup, req.file);
      res.json(success({ image }, '酒店图片上传成功'));
    } catch (error) {
      cleanupUploadedTempFile(req.file);
      if (error.kind === 'validation') {
        return res.json(validationFail(error.message, error.field || 'image'));
      }
      console.error('上传酒店图片失败:', error);
      res.json(serverFail('上传酒店图片失败，请稍后重试'));
    }
  });
};

exports.deleteHotelImage = async (req, res) => {
  try {
    const imageId = Number(req.params.id);
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return res.json(validationFail('图片 ID 不合法', 'id'));
    }

    await deleteHotelImageByMerchantId(req.user.id, imageId);
    res.json(success(null, '酒店图片删除成功'));
  } catch (error) {
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'id'));
    }
    console.error('删除酒店图片失败:', error);
    res.json(serverFail('删除酒店图片失败，请稍后重试'));
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

exports.uploadHotelCertificate = (req, res) => {
  hotelCertificateUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.json(validationFail('资质证件不能超过 5MB', 'image'));
        }
        return res.json(validationFail('上传资质证件失败', 'image'));
      }

      const certGroup = safeTrim(req.body?.group);
      if (!hotelCertificateGroupList.includes(certGroup)) {
        cleanupUploadedTempFile(req.file);
        return res.json(validationFail('请选择合法的资质证件分组', 'group'));
      }

      if (!req.file) {
        return res.json(validationFail('请选择需要上传的证件图片', 'image'));
      }

      const image = await uploadHotelCertificateByMerchantId(req.user.id, certGroup, req.file);
      res.json(success({ image }, '资质证件上传成功'));
    } catch (error) {
      cleanupUploadedTempFile(req.file);
      if (error.kind === 'validation') {
        return res.json(validationFail(error.message, error.field || 'image'));
      }
      console.error('上传资质证件失败:', error);
      res.json(serverFail('上传资质证件失败，请稍后重试'));
    }
  });
};

exports.deleteHotelCertificate = async (req, res) => {
  try {
    const certificateId = Number(req.params.id);
    if (!Number.isInteger(certificateId) || certificateId <= 0) {
      return res.json(validationFail('证件 ID 不合法', 'id'));
    }

    await deleteHotelCertificateByMerchantId(req.user.id, certificateId);
    res.json(success(null, '资质证件删除成功'));
  } catch (error) {
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'id'));
    }
    console.error('删除资质证件失败:', error);
    res.json(serverFail('删除资质证件失败，请稍后重试'));
  }
};

exports.sortHotelImages = async (req, res) => {
  try {
    const imageGroup = safeTrim(req.body?.group);
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
      : [];

    if (!hotelImageGroupList.includes(imageGroup)) {
      return res.json(validationFail('请选择合法的图片分组', 'group'));
    }

    if (!orderedIds.length) {
      return res.json(validationFail('排序列表不能为空', 'orderedIds'));
    }

    if (new Set(orderedIds).size !== orderedIds.length) {
      return res.json(validationFail('排序列表包含重复图片', 'orderedIds'));
    }

    const images = await sortHotelImagesByMerchantId(req.user.id, imageGroup, orderedIds);
    res.json(success({ group: imageGroup, images }, '酒店图片排序成功'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'orderedIds'));
    }
    console.error('排序酒店图片失败:', error);
    res.json(serverFail('排序酒店图片失败，请稍后重试'));
  }
};

exports.submitHotelProfileReview = async (req, res) => {
  try {
    const editableResult = await ensureMerchantHotelEditable(req.user.id);
    if (!editableResult.ok) {
      return res.json(validationFail(editableResult.message, editableResult.field));
    }

    const validated = validateHotelProfilePayload(req.body, { strictRequired: true });
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    await saveHotelProfile(req.user.id, validated.payload, {
      reviewStatus: resolveReviewStatusAfterSave(editableResult.reviewStatus),
    });

    const reviewImageValidation = await validateReviewRequiredImages(req.user.id);
    if (!reviewImageValidation.ok) {
      return res.json(validationFail(reviewImageValidation.message, reviewImageValidation.field));
    }

    const reviewCertificateValidation = await validateReviewRequiredCertificates(req.user.id);
    if (!reviewCertificateValidation.ok) {
      return res.json(validationFail(reviewCertificateValidation.message, reviewCertificateValidation.field));
    }

    await query(
      `UPDATE merchant_hotels
       SET review_status = 'reviewing'
       WHERE merchant_user_id = ?`,
      [req.user.id]
    );

    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '酒店信息已提交审核'));
  } catch (error) {
    console.error('提交审核失败:', error);
    res.json(serverFail('提交审核失败，请稍后重试'));
  }
};
