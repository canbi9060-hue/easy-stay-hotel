const {
  getHotelProfileByMerchantId,
  getHotelProfileDraftByMerchantId,
} = require('./repository');

const shouldUseHotelProfileDraft = (reviewStatus = '') => (
  reviewStatus === 'approved' || reviewStatus === 'rejected_pending_fix'
);

const getMerchantHotelDraftState = async (merchantUserId, executor = null, hotelProfileRow = null) => {
  const hotelProfile = hotelProfileRow || await getHotelProfileByMerchantId(merchantUserId, executor);
  if (!hotelProfile) {
    return {
      hotelProfile: null,
      reviewStatus: '',
      reviewRemark: '',
      hasProfileDraft: false,
      profileDraftRow: null,
      useDraft: false,
      mediaScope: 'live',
    };
  }

  if (!shouldUseHotelProfileDraft(hotelProfile.review_status)) {
    return {
      hotelProfile,
      reviewStatus: hotelProfile.review_status,
      reviewRemark: hotelProfile.review_remark || '',
      hasProfileDraft: false,
      profileDraftRow: null,
      useDraft: false,
      mediaScope: 'live',
    };
  }

  const profileDraftRow = await getHotelProfileDraftByMerchantId(merchantUserId, executor);
  const hasProfileDraft = Boolean(profileDraftRow);
  return {
    hotelProfile,
    reviewStatus: hotelProfile.review_status,
    reviewRemark: hotelProfile.review_remark || '',
    hasProfileDraft,
    profileDraftRow,
    useDraft: hasProfileDraft,
    mediaScope: hasProfileDraft ? 'draft' : 'live',
  };
};

module.exports = {
  shouldUseHotelProfileDraft,
  getMerchantHotelDraftState,
};
