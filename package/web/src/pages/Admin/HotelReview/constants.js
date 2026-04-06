import {
  accommodationTypeOptions,
  certificateLeafGroups,
  hotelImageGroups,
} from '../../../utils/hotel-info';

export const hotelReviewTabItems = [
  { key: 'all', label: '全部' },
  { key: 'reviewing', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected_pending_fix', label: '已驳回' },
];

export const hotelReviewCardItems = [
  { key: 'all', label: '全部' },
  { key: 'reviewing', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

export const hotelReviewStatusMetaMap = {
  reviewing: { text: '待审核', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected_pending_fix: { text: '已驳回', color: 'error' },
};

export const hotelRejectReasonOptions = [
  '资质证件不清晰或缺失',
  '酒店图片不完整或不符合要求',
  '地址信息不完整或不准确',
  '联系方式无效',
];

export const hotelRejectReasonMinLength = 10;
export const hotelRejectReasonMaxLength = 100;

const accommodationLabelMap = accommodationTypeOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const getAccommodationTypeLabel = (value) => accommodationLabelMap[value] || value || '--';

export const hotelReviewImageGroups = hotelImageGroups;
export const hotelReviewCertificateGroups = certificateLeafGroups;
