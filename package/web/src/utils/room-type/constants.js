export const ROOM_TYPE_AUDIT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

export const ROOM_TYPE_SALE_STATUS = {
  OFF: 0,
  ON: 1,
};

export const roomTypeAuditStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '已通过', value: 'approved' },
  { label: '审核中', value: 'pending' },
  { label: '已驳回', value: 'rejected' },
];

export const roomTypeSaleStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '已上架', value: 'on' },
  { label: '已下架', value: 'off' },
];

export const roomTypeAuditStatusMap = {
  [ROOM_TYPE_AUDIT_STATUS.PENDING]: { text: '审核中', color: 'gold' },
  [ROOM_TYPE_AUDIT_STATUS.APPROVED]: { text: '已通过', color: 'blue' },
  [ROOM_TYPE_AUDIT_STATUS.REJECTED]: { text: '已驳回', color: 'red' },
};

export const roomTypeSaleStatusMap = {
  [ROOM_TYPE_SALE_STATUS.OFF]: { text: '已下架', color: 'default' },
  [ROOM_TYPE_SALE_STATUS.ON]: { text: '已上架', color: 'green' },
};

export const roomTypeFacilitySuggestions = [
  '独立卫浴',
  '智能电视',
  '中央空调',
  '高速 WiFi',
  '落地窗',
  '迷你吧',
  '浴缸',
  '办公桌',
  '沙发会客区',
  '保险箱',
  '智能门锁',
  '观景阳台',
];

export const maxRoomTypeImageCount = 12;

export const emptyRoomTypeFormValues = {
  roomName: '',
  bedConfig: '',
  areaSize: null,
  floorText: '',
  roomCount: 1,
  maxGuests: 2,
  description: '',
  facilityTags: [],
  salePrice: null,
  listPrice: null,
};

export const buildRoomTypeDraftKey = (mode, roomTypeId) => (
  mode === 'edit' && roomTypeId
    ? `merchant_room_type_draft:edit:${roomTypeId}`
    : 'merchant_room_type_draft:create'
);

export const canSelectRoomType = (record) => Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED;
export const canToggleRoomTypeSale = canSelectRoomType;

export const getAuditStatusMeta = (auditStatus) => roomTypeAuditStatusMap[auditStatus] || roomTypeAuditStatusMap[ROOM_TYPE_AUDIT_STATUS.PENDING];
export const getSaleStatusMeta = (isOnSale) => roomTypeSaleStatusMap[isOnSale] || roomTypeSaleStatusMap[ROOM_TYPE_SALE_STATUS.OFF];

export const formatPrice = (cents) => {
  const amount = Number(cents || 0) / 100;
  return amount.toFixed(2);
};

export const normalizeRoomTypeFormValues = (detail) => ({
  ...emptyRoomTypeFormValues,
  roomName: detail?.roomName || '',
  bedConfig: detail?.bedConfig || '',
  areaSize: detail?.areaSize ?? null,
  floorText: detail?.floorText || '',
  roomCount: detail?.roomCount || 1,
  maxGuests: detail?.maxGuests || 1,
  description: detail?.description || '',
  facilityTags: Array.isArray(detail?.facilityTags) ? detail.facilityTags : [],
  salePrice: detail?.salePriceCents ? Number(detail.salePriceCents) / 100 : null,
  listPrice: detail?.listPriceCents ? Number(detail.listPriceCents) / 100 : null,
});

export const getMerchantRoomTypeQuery = ({ auditStatus, saleStatus, keyword, page, pageSize }) => ({
  auditStatus: auditStatus === 'all'
    ? undefined
    : auditStatus === 'pending'
      ? ROOM_TYPE_AUDIT_STATUS.PENDING
      : auditStatus === 'approved'
        ? ROOM_TYPE_AUDIT_STATUS.APPROVED
        : ROOM_TYPE_AUDIT_STATUS.REJECTED,
  saleStatus: saleStatus === 'all'
    ? undefined
    : saleStatus === 'on'
      ? ROOM_TYPE_SALE_STATUS.ON
      : ROOM_TYPE_SALE_STATUS.OFF,
  keyword: keyword || undefined,
  page,
  pageSize,
});

export const getAdminRoomTypeQuery = ({ auditStatus, saleStatus, keyword, merchantKeyword, page, pageSize }) => ({
  ...getMerchantRoomTypeQuery({ auditStatus, saleStatus, keyword, page, pageSize }),
  merchantKeyword: merchantKeyword || undefined,
});

export const getRoomTypeEditNotice = (detail) => {
  if (!detail) {
    return {
      type: 'info',
      message: '提交后房型将进入审核流程，并默认保持下架。',
    };
  }

  if (Number(detail.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED) {
    return {
      type: 'warning',
      message: '编辑后房型将自动变为待审核 + 下架，需重新审核通过后才可上架。',
    };
  }

  if (Number(detail.auditStatus) === ROOM_TYPE_AUDIT_STATUS.REJECTED) {
    return {
      type: 'error',
      message: detail.auditRemark
        ? `当前房型已驳回：${detail.auditRemark}`
        : '当前房型处于已驳回状态，提交后将重新进入审核流程。',
    };
  }

  return {
    type: 'info',
    message: '房型当前为待审核状态，提交后将重新进入审核流程。',
  };
};
