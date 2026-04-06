import {
  submitMerchantHotelProfileReviewAPI,
  updateMerchantHotelProfileAPI,
} from '../request';
import { createMultipartFormData } from '../common';
import {
  normalizeHotelProfile,
} from './constants';
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
