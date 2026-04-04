import {
  certificateLeafGroups,
  hotelImageGroups,
} from './constants';
import { buildGroupedMediaSubmitPayload } from '../common';

export const buildHotelMediaSubmitPayload = ({ hotelImages, hotelCertificates }) => {
  const hotelImageResult = buildGroupedMediaSubmitPayload(hotelImages, hotelImageGroups);
  const hotelCertificateResult = buildGroupedMediaSubmitPayload(hotelCertificates, certificateLeafGroups);

  return {
    hotelImagePlan: hotelImageResult.groupedPlan,
    hotelImageFiles: hotelImageResult.files,
    hotelCertificatePlan: hotelCertificateResult.groupedPlan,
    hotelCertificateFiles: hotelCertificateResult.files,
  };
};
