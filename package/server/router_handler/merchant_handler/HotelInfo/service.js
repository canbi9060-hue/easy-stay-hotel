const { withTransaction } = require('../../../db/index');
const { createHandlerError } = require('../../utils/common');
const {
  replaceHotelFloorsByMerchantId,
  saveHotelProfileDraftByMerchantId,
  deleteHotelProfileDraftByMerchantId,
  lockMerchantRow,
} = require('./repository');
const {
  getMerchantHotelDraftState,
  shouldUseHotelProfileDraft,
} = require('./draftState');
const {
  getMerchantHotelProfileView,
  validateHotelProfilePayload,
  ensureMerchantHotelEditable,
  saveHotelProfile,
} = require('./profile');
const {
  getGroupedHotelImages,
  getGroupedHotelCertificates,
  replaceGroupedMediaByMerchantId,
  clearGroupedMediaDraftsByMerchantId,
  deleteRemovedHotelImageFiles,
  deleteRemovedHotelCertificateFiles,
  validateReviewRequiredMedia,
} = require('./media');

const getMerchantHotelGroupedMedia = async ({ merchantUserId, type, executor = null }) => {
  const draftState = await getMerchantHotelDraftState(merchantUserId, executor);
  return type === 'image'
    ? getGroupedHotelImages(merchantUserId, { scope: draftState.mediaScope, executor })
    : getGroupedHotelCertificates(merchantUserId, { scope: draftState.mediaScope, executor });
};

const assertHotelProfileMutationAllowed = async ({
  merchantUserId,
  submitReview = false,
  executor = null,
}) => {
  const editableResult = await ensureMerchantHotelEditable(merchantUserId, executor);
  if (!editableResult.ok) {
    throw createHandlerError('validation', editableResult.message, editableResult.field);
  }

  if (!submitReview && editableResult.reviewStatus === 'reviewing') {
    throw createHandlerError('validation', '酒店资料正在审核中，暂不允许修改。', 'reviewStatus');
  }

  if (submitReview && editableResult.reviewStatus === 'reviewing') {
    throw createHandlerError('validation', '酒店资料正在审核中，暂不能重复提交审核。', 'reviewStatus');
  }

  return editableResult;
};

const saveHotelProfileWithMedia = async ({
  merchantUserId,
  normalizedPayload,
  hotelImagePlan,
  hotelCertificatePlan,
  hotelImageFiles,
  hotelCertificateFiles,
  submitReview = false,
}) => {
  const result = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const draftState = await getMerchantHotelDraftState(merchantUserId, tx);
    const useDraftSave = !submitReview && shouldUseHotelProfileDraft(draftState.reviewStatus);
    const sourceScope = submitReview && draftState.hasProfileDraft
      ? 'draft'
      : (useDraftSave && draftState.hasProfileDraft ? 'draft' : 'live');

    let removedImagePaths = [];
    let removedCertificatePaths = [];

    if (useDraftSave) {
      await saveHotelProfileDraftByMerchantId(merchantUserId, normalizedPayload, tx);
      removedImagePaths = await replaceGroupedMediaByMerchantId({
        tx,
        merchantUserId,
        rawPlan: hotelImagePlan,
        files: hotelImageFiles,
        type: 'image',
        sourceScope,
        targetScope: 'draft',
      });
      removedCertificatePaths = await replaceGroupedMediaByMerchantId({
        tx,
        merchantUserId,
        rawPlan: hotelCertificatePlan,
        files: hotelCertificateFiles,
        type: 'certificate',
        sourceScope,
        targetScope: 'draft',
      });
    } else {
      await saveHotelProfile(merchantUserId, normalizedPayload, {
        reviewStatus: submitReview ? 'reviewing' : 'incomplete',
        reviewRemark: submitReview ? '' : draftState.reviewRemark,
        executor: tx,
      });
      await replaceHotelFloorsByMerchantId(
        merchantUserId,
        normalizedPayload.floorInfo.floors.map((floorLabel, index) => ({
          floorNumber: index + 1,
          floorLabel,
        })),
        tx
      );
      removedImagePaths = await replaceGroupedMediaByMerchantId({
        tx,
        merchantUserId,
        rawPlan: hotelImagePlan,
        files: hotelImageFiles,
        type: 'image',
        sourceScope,
        targetScope: 'live',
      });
      removedCertificatePaths = await replaceGroupedMediaByMerchantId({
        tx,
        merchantUserId,
        rawPlan: hotelCertificatePlan,
        files: hotelCertificateFiles,
        type: 'certificate',
        sourceScope,
        targetScope: 'live',
      });
    }

    if (submitReview) {
      const reviewMediaValidation = await validateReviewRequiredMedia(merchantUserId, tx);
      if (!reviewMediaValidation.ok) {
        throw createHandlerError('validation', reviewMediaValidation.message, reviewMediaValidation.field);
      }

      removedImagePaths.push(...await clearGroupedMediaDraftsByMerchantId({
        tx,
        merchantUserId,
        type: 'image',
      }));
      removedCertificatePaths.push(...await clearGroupedMediaDraftsByMerchantId({
        tx,
        merchantUserId,
        type: 'certificate',
      }));
      await deleteHotelProfileDraftByMerchantId(merchantUserId, tx);
    }

    return {
      removedImagePaths,
      removedCertificatePaths,
    };
  });

  await deleteRemovedHotelImageFiles(result.removedImagePaths);
  await deleteRemovedHotelCertificateFiles(result.removedCertificatePaths);
};

const executeHotelProfileMutation = async ({
  merchantUserId,
  rawPayload,
  hotelImageFiles,
  hotelCertificateFiles,
  strictRequired,
  submitReview = false,
}) => {
  await assertHotelProfileMutationAllowed({
    merchantUserId,
    submitReview,
  });

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
    merchantUserId,
    normalizedPayload: validated.payload,
    hotelImagePlan: rawPayload.hotelImagePlan,
    hotelCertificatePlan: rawPayload.hotelCertificatePlan,
    hotelImageFiles,
    hotelCertificateFiles,
    submitReview,
  });

  return getMerchantHotelProfileView(merchantUserId);
};

module.exports = {
  getMerchantHotelDraftState,
  getMerchantHotelGroupedMedia,
  executeHotelProfileMutation,
};
