import { getMerchantHotelProfileAPI } from '../request';
import {
  collectHotelFacilityLabels,
  normalizeHotelProfile,
} from './constants';

const buildMerchantHotelFacilityOptions = (profile) => collectHotelFacilityLabels(profile)
  .map((label) => ({
    label,
    value: label,
  }));

export const normalizeMerchantHotelSnapshot = (profileData) => {
  const profile = normalizeHotelProfile(profileData);

  return {
    profile,
    reviewStatus: profile.reviewStatus,
    reviewRemark: profile.reviewRemark || '',
    hasPendingDraft: Boolean(profile.hasPendingDraft),
    floorInfo: profile.floorInfo,
    facilitySelections: profile.facilitySelections,
    customFacilities: profile.customFacilities,
    roomTypeFacilityOptions: buildMerchantHotelFacilityOptions(profile),
  };
};

export const loadMerchantHotelSnapshot = async () => {
  const res = await getMerchantHotelProfileAPI();
  return normalizeMerchantHotelSnapshot(res.data);
};
