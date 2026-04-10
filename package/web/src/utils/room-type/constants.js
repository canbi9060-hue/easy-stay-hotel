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

export const roomTypeFieldLabels = {
  roomName: '房型名称',
  bedType: '床型',
  bedWidth: '床宽',
  bedCount: '床位数量',
  roomCount: '房间总数',
  maxGuests: '最多入住',
  areaSize: '面积（㎡）',
  bedConfig: '床型配置',
};

export const roomTypeBedTypeOptions = [
  '单人床',
  '双人床',
  '大床',
  '特大床',
  '沙发床',
  '榻榻米',
].map((item) => ({
  label: item,
  value: item,
}));

export const roomTypeBedCountOptions = Array.from({ length: 10 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));

export const roomTypeAuditStatusMap = {
  draft: { text: '未提交', color: 'default' },
  [ROOM_TYPE_AUDIT_STATUS.PENDING]: { text: '审核中', color: 'gold' },
  [ROOM_TYPE_AUDIT_STATUS.APPROVED]: { text: '已通过', color: 'blue' },
  [ROOM_TYPE_AUDIT_STATUS.REJECTED]: { text: '已驳回', color: 'red' },
};

export const roomTypeSaleStatusMap = {
  [ROOM_TYPE_SALE_STATUS.OFF]: { text: '已下架', color: 'default' },
  [ROOM_TYPE_SALE_STATUS.ON]: { text: '已上架', color: 'green' },
};

export const maxRoomTypeImageCount = 12;
const roomTypeBedConfigPattern = /^(\d+)\s*张\s*([0-9]+(?:\.[0-9]+)?)\s*m\s*(.+)$/;
const roomTypeBedTypeValues = new Set(roomTypeBedTypeOptions.map((item) => item.value));

export const emptyRoomTypeFormValues = {
  roomName: '',
  bedConfig: '',
  bedType: undefined,
  bedWidth: null,
  bedCount: null,
  areaSize: null,
  maxGuests: 2,
  description: '',
  facilityTags: [],
  salePrice: null,
  listPrice: null,
};

const formatRoomTypeBedWidth = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '';
  }

  return numericValue.toString();
};

export const buildRoomTypeBedConfig = (bedType, bedWidth, bedCount) => {
  const normalizedBedType = String(bedType || '').trim();
  const normalizedBedWidth = formatRoomTypeBedWidth(bedWidth);
  const normalizedBedCount = Number(bedCount);
  if (
    !normalizedBedType
    || !roomTypeBedTypeValues.has(normalizedBedType)
    || !normalizedBedWidth
    || !Number.isInteger(normalizedBedCount)
    || normalizedBedCount <= 0
  ) {
    return '';
  }

  return `${normalizedBedCount} 张 ${normalizedBedWidth}m ${normalizedBedType}`;
};

export const parseRoomTypeBedConfig = (bedConfig) => {
  const text = String(bedConfig || '').trim();
  if (!text) {
    return null;
  }

  const match = text.match(roomTypeBedConfigPattern);
  if (!match) {
    return null;
  }

  const bedCount = Number(match[1]);
  const bedWidth = Number(match[2]);
  const bedType = String(match[3] || '').trim();
  if (
    !Number.isInteger(bedCount)
    || bedCount <= 0
    || !Number.isFinite(bedWidth)
    || bedWidth <= 0
    || !roomTypeBedTypeValues.has(bedType)
  ) {
    return null;
  }

  return {
    bedType,
    bedWidth,
    bedCount,
    bedConfig: buildRoomTypeBedConfig(bedType, bedWidth, bedCount),
  };
};

export const resolveRoomTypeBedConfigSelection = (bedConfig) => {
  const originalBedConfig = String(bedConfig || '').trim();
  if (!originalBedConfig) {
    return {
      bedType: undefined,
      bedWidth: null,
      bedCount: null,
      isInvalid: false,
      invalidMessage: '',
      originalBedConfig: '',
    };
  }

  const parsedBedConfig = parseRoomTypeBedConfig(originalBedConfig);
  if (!parsedBedConfig) {
    return {
      bedType: undefined,
      bedWidth: null,
      bedCount: null,
      isInvalid: true,
      invalidMessage: '当前床型配置格式不受支持，请重新选择。',
      originalBedConfig,
    };
  }

  return {
    bedType: parsedBedConfig.bedType,
    bedWidth: parsedBedConfig.bedWidth,
    bedCount: parsedBedConfig.bedCount,
    isInvalid: false,
    invalidMessage: '',
    originalBedConfig,
  };
};

const toNullableNumber = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const resolveRoomTypeFacilitySelection = (facilityTags, hotelFacilityOptions = []) => {
  const normalizedTags = Array.isArray(facilityTags)
    ? [...new Set(facilityTags.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

  if (!normalizedTags.length) {
    return {
      invalidTags: [],
      isInvalid: false,
      invalidMessage: '',
    };
  }

  const allowedValues = Array.isArray(hotelFacilityOptions)
    ? hotelFacilityOptions
      .map((option) => String(option?.value || '').trim())
      .filter(Boolean)
    : [];

  if (!allowedValues.length) {
    return {
      invalidTags: normalizedTags,
      isInvalid: true,
      invalidMessage: '请先在酒店信息页勾选或添加设施。',
    };
  }

  const allowedSet = new Set(allowedValues);
  const invalidTags = normalizedTags.filter((item) => !allowedSet.has(item));

  return {
    invalidTags,
    isInvalid: invalidTags.length > 0,
    invalidMessage: invalidTags.length ? '当前设施标签已超出酒店设施范围，请重新选择。' : '',
  };
};

export const isPendingRoomType = (record) => Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.PENDING;
export const canEditRoomType = (record) => Boolean(record?.isCreateDraft) || !isPendingRoomType(record);
export const canDeleteRoomType = canEditRoomType;

export const applyRoomTypeDraftOverlay = (roomType, draft) => {
  if (!roomType || !draft) {
    return roomType;
  }

  if (isPendingRoomType(roomType)) {
    return roomType;
  }

  const formValues = draft?.formValues && typeof draft.formValues === 'object' && !Array.isArray(draft.formValues)
    ? draft.formValues
    : {};
  const draftImages = Array.isArray(draft?.images) ? draft.images : [];
  const hasDraftImages = draftImages.length > 0;
  const salePrice = toNullableNumber(formValues.salePrice);
  const listPrice = toNullableNumber(formValues.listPrice);

  return {
    ...roomType,
    roomName: typeof formValues.roomName === 'string' ? formValues.roomName : roomType.roomName,
    bedConfig: typeof formValues.bedConfig === 'string' ? formValues.bedConfig : roomType.bedConfig,
    areaSize: toNullableNumber(formValues.areaSize) ?? roomType.areaSize,
    maxGuests: Number.isInteger(Number(formValues.maxGuests)) ? Number(formValues.maxGuests) : roomType.maxGuests,
    description: typeof formValues.description === 'string' ? formValues.description : roomType.description,
    facilityTags: Array.isArray(formValues.facilityTags) ? formValues.facilityTags : roomType.facilityTags,
    salePriceCents: salePrice === null ? roomType.salePriceCents : Math.round(salePrice * 100),
    listPriceCents: listPrice === null ? roomType.listPriceCents : Math.round(listPrice * 100),
    imageCount: hasDraftImages ? draftImages.length : roomType.imageCount,
    coverImageFilePath: hasDraftImages ? '' : roomType.coverImageFilePath,
    coverImagePreviewUrl: hasDraftImages ? (draftImages[0]?.previewUrl || '') : '',
    images: hasDraftImages ? draftImages : roomType.images,
    hasDraft: true,
    draftSavedAt: Number(draft?.savedAt) || 0,
  };
};

export const buildCreateRoomTypeDraftRecord = (draft) => {
  if (!draft) {
    return null;
  }

  const formValues = draft?.formValues && typeof draft.formValues === 'object' && !Array.isArray(draft.formValues)
    ? draft.formValues
    : {};
  const draftImages = Array.isArray(draft?.images) ? draft.images : [];
  const salePrice = toNullableNumber(formValues.salePrice);
  const listPrice = toNullableNumber(formValues.listPrice);

  return {
    id: 'draft-create',
    merchantUserId: 0,
    merchantName: '',
    roomName: typeof formValues.roomName === 'string' && formValues.roomName.trim() ? formValues.roomName : '未命名草稿房型',
    bedConfig: typeof formValues.bedConfig === 'string' ? formValues.bedConfig : '',
    areaSize: toNullableNumber(formValues.areaSize),
    roomCount: 0,
    maxGuests: Number.isInteger(Number(formValues.maxGuests)) ? Number(formValues.maxGuests) : 1,
    description: typeof formValues.description === 'string' ? formValues.description : '',
    facilityTags: Array.isArray(formValues.facilityTags) ? formValues.facilityTags : [],
    salePriceCents: salePrice === null ? 0 : Math.max(0, Math.round(salePrice * 100)),
    listPriceCents: listPrice === null ? 0 : Math.max(0, Math.round(listPrice * 100)),
    auditStatus: 'draft',
    auditRemark: '',
    isOnSale: 'draft',
    isForcedOffSale: 0,
    coverImageFilePath: '',
    coverImagePreviewUrl: draftImages[0]?.previewUrl || '',
    imageCount: draftImages.length,
    images: draftImages,
    hasDraft: true,
    isCreateDraft: true,
    draftSavedAt: Number(draft?.savedAt) || 0,
  };
};

export const isRoomTypeForcedOffSale = (record) => Number(record?.isForcedOffSale) === 1;
export const canSelectRoomType = (record) => (
  Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED && !isRoomTypeForcedOffSale(record)
);
export const canToggleRoomTypeSale = canSelectRoomType;

export const getAuditStatusMeta = (auditStatus) => {
  if (auditStatus === 'draft') {
    return roomTypeAuditStatusMap.draft;
  }
  return roomTypeAuditStatusMap[auditStatus] || roomTypeAuditStatusMap[ROOM_TYPE_AUDIT_STATUS.PENDING];
};
export const getSaleStatusMeta = (isOnSale, isForcedOffSale = 0) => {
  if (isOnSale === 'draft') {
    return { text: '未上架', color: 'default' };
  }
  if (Number(isForcedOffSale) === 1) {
    return { text: '已下架（异常）', color: 'orange' };
  }

  return roomTypeSaleStatusMap[isOnSale] || roomTypeSaleStatusMap[ROOM_TYPE_SALE_STATUS.OFF];
};

export const formatPrice = (cents) => {
  const amount = Number(cents || 0) / 100;
  return amount.toFixed(2);
};

export const normalizeRoomTypeFormValues = (detail) => {
  const bedConfigSelection = resolveRoomTypeBedConfigSelection(detail?.bedConfig);

  return {
    ...emptyRoomTypeFormValues,
    roomName: detail?.roomName || '',
    bedConfig: detail?.bedConfig || '',
    bedType: bedConfigSelection.bedType,
    bedWidth: bedConfigSelection.bedWidth,
    bedCount: bedConfigSelection.bedCount,
    areaSize: detail?.areaSize ?? null,
    maxGuests: detail?.maxGuests || 1,
    description: detail?.description || '',
    facilityTags: Array.isArray(detail?.facilityTags) ? detail.facilityTags : [],
    salePrice: detail?.salePrice ?? (detail?.salePriceCents ? Number(detail.salePriceCents) / 100 : null),
    listPrice: detail?.listPrice ?? (detail?.listPriceCents ? Number(detail.listPriceCents) / 100 : null),
  };
};

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

export const getAdminRoomTypeQuery = ({ auditStatus, saleStatus, hotelName, roomTypeName, page, pageSize }) => ({
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
  hotelName: hotelName || undefined,
  roomTypeName: roomTypeName || undefined,
  page,
  pageSize,
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
    message: '房型当前正在审核中，暂不允许编辑、删除或提交新的修改。',
  };
};
