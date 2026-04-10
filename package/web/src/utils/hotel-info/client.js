import {
  getMerchantMapDistrictOptionsAPI,
  getMerchantMapGeocodeAPI,
  getMerchantMapInitialLocationAPI,
  getMerchantMapRegeocodeAPI,
  submitMerchantHotelProfileReviewAPI,
  updateMerchantHotelProfileAPI,
} from '../request';
import { createMultipartFormData } from '../common';
import { normalizeHotelProfile } from './constants';
import { buildHotelMediaSubmitPayload } from './mediaDraft';

const buildMerchantHotelProfileFormData = ({
  formValues,
  customFacilities,
  hotelImages,
  hotelCertificates,
}) => {
  const payload = normalizeHotelProfile({
    ...formValues,
    customFacilities,
  });
  const mediaPayload = buildHotelMediaSubmitPayload({
    hotelImages,
    hotelCertificates,
  });

  return createMultipartFormData(
    {
      ...payload,
      hotelImagePlan: mediaPayload.hotelImagePlan,
      hotelCertificatePlan: mediaPayload.hotelCertificatePlan,
    },
    {
      hotelImageFiles: mediaPayload.hotelImageFiles,
      hotelCertificateFiles: mediaPayload.hotelCertificateFiles,
    }
  );
};

export const saveMerchantHotelProfileSnapshot = (args) => (
  updateMerchantHotelProfileAPI(buildMerchantHotelProfileFormData(args))
);

export const submitMerchantHotelProfileSnapshot = (args) => (
  submitMerchantHotelProfileReviewAPI(buildMerchantHotelProfileFormData(args))
);

export const fetchMerchantMapInitialLocation = async () => {
  const response = await getMerchantMapInitialLocationAPI();
  return response?.data || { source: 'empty', location: null };
};

export const fetchMerchantMapDistrictOptions = async (keyword) => {
  const response = await getMerchantMapDistrictOptionsAPI({ keyword });
  return Array.isArray(response?.data) ? response.data : [];
};

export const fetchMerchantMapGeocode = async (address) => {
  const response = await getMerchantMapGeocodeAPI({ address });
  return response?.data || null;
};

export const fetchMerchantMapRegeocode = async (coordinates) => {
  const response = await getMerchantMapRegeocodeAPI({
    longitude: coordinates?.longitude,
    latitude: coordinates?.latitude,
  });
  return response?.data || null;
};
