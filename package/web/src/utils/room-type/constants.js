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
const roomTypeFloorTextPattern = /^(\d+)(?:-(\d+))?层$/;

export const emptyRoomTypeFormValues = {
  roomName: '',
  bedConfig: '',
  areaSize: null,
  floorText: '',
  floorStart: null,
  floorEnd: null,
  roomCount: 1,
  maxGuests: 2,
  description: '',
  facilityTags: [],
  salePrice: null,
  listPrice: null,
};

export const normalizeHotelFloorInfo = (hotelFloorInfo) => {
  const totalFloorCount = Number(hotelFloorInfo?.totalFloorCount);
  if (!Number.isInteger(totalFloorCount) || totalFloorCount <= 0) {
    return {
      totalFloorCount: 0,
      floors: [],
    };
  }

  return {
    totalFloorCount,
    floors: Array.from({ length: totalFloorCount }, (_, index) => `${index + 1}层`),
  };
};

export const hasHotelFloorInfo = (hotelFloorInfo) => normalizeHotelFloorInfo(hotelFloorInfo).totalFloorCount > 0;

export const getHotelFloorOptions = (hotelFloorInfo, minFloor = 1) => {
  const normalized = normalizeHotelFloorInfo(hotelFloorInfo);
  if (!normalized.totalFloorCount || minFloor > normalized.totalFloorCount) {
    return [];
  }

  return Array.from({ length: normalized.totalFloorCount - minFloor + 1 }, (_, index) => {
    const floorNumber = minFloor + index;
    return {
      value: floorNumber,
      label: `${floorNumber}层`,
    };
  });
};

export const buildRoomTypeFloorText = (floorStart, floorEnd) => {
  const start = Number(floorStart);
  const end = Number(floorEnd ?? floorStart);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
    return '';
  }

  return start === end ? `${start}层` : `${start}-${end}层`;
};

export const parseRoomTypeFloorText = (floorText) => {
  const text = String(floorText || '').trim();
  if (!text) {
    return null;
  }

  const match = text.match(roomTypeFloorTextPattern);
  if (!match) {
    return null;
  }

  const floorStart = Number(match[1]);
  const floorEnd = Number(match[2] || match[1]);
  if (!Number.isInteger(floorStart) || !Number.isInteger(floorEnd) || floorStart <= 0 || floorEnd < floorStart) {
    return null;
  }

  return {
    floorStart,
    floorEnd,
    floorText: buildRoomTypeFloorText(floorStart, floorEnd),
  };
};

export const resolveRoomTypeFloorSelection = (floorText, hotelFloorInfo) => {
  const originalFloorText = String(floorText || '').trim();
  if (!originalFloorText) {
    return {
      floorStart: null,
      floorEnd: null,
      isInvalid: false,
      invalidMessage: '',
      originalFloorText: '',
    };
  }

  const parsedFloor = parseRoomTypeFloorText(originalFloorText);
  if (!parsedFloor) {
    return {
      floorStart: null,
      floorEnd: null,
      isInvalid: true,
      invalidMessage: '当前楼层说明格式不受支持，请重新选择。',
      originalFloorText,
    };
  }

  const normalizedHotelFloorInfo = normalizeHotelFloorInfo(hotelFloorInfo);
  if (!normalizedHotelFloorInfo.totalFloorCount) {
    return {
      floorStart: null,
      floorEnd: null,
      isInvalid: true,
      invalidMessage: '请先在酒店资料中完善总楼层。',
      originalFloorText,
    };
  }

  if (parsedFloor.floorEnd > normalizedHotelFloorInfo.totalFloorCount) {
    return {
      floorStart: null,
      floorEnd: null,
      isInvalid: true,
      invalidMessage: `当前楼层区间已超出酒店总楼层（${normalizedHotelFloorInfo.totalFloorCount}层），请重新选择。`,
      originalFloorText,
    };
  }

  return {
    floorStart: parsedFloor.floorStart,
    floorEnd: parsedFloor.floorEnd,
    isInvalid: false,
    invalidMessage: '',
    originalFloorText,
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
  const floorText = buildRoomTypeFloorText(formValues.floorStart, formValues.floorEnd) || String(formValues.floorText || '').trim();
  const salePrice = toNullableNumber(formValues.salePrice);
  const listPrice = toNullableNumber(formValues.listPrice);

  return {
    ...roomType,
    roomName: typeof formValues.roomName === 'string' ? formValues.roomName : roomType.roomName,
    bedConfig: typeof formValues.bedConfig === 'string' ? formValues.bedConfig : roomType.bedConfig,
    areaSize: toNullableNumber(formValues.areaSize) ?? roomType.areaSize,
    floorText: floorText || roomType.floorText,
    roomCount: Number.isInteger(Number(formValues.roomCount)) ? Number(formValues.roomCount) : roomType.roomCount,
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
  const floorText = buildRoomTypeFloorText(formValues.floorStart, formValues.floorEnd) || String(formValues.floorText || '').trim();
  const salePrice = toNullableNumber(formValues.salePrice);
  const listPrice = toNullableNumber(formValues.listPrice);

  return {
    id: 'draft-create',
    merchantUserId: 0,
    merchantName: '',
    roomName: typeof formValues.roomName === 'string' && formValues.roomName.trim() ? formValues.roomName : '未命名草稿房型',
    bedConfig: typeof formValues.bedConfig === 'string' ? formValues.bedConfig : '',
    areaSize: toNullableNumber(formValues.areaSize),
    floorText,
    roomCount: Number.isInteger(Number(formValues.roomCount)) ? Number(formValues.roomCount) : 1,
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

export const normalizeRoomTypeFormValues = (detail, hotelFloorInfo = null) => {
  const nextFloorText = buildRoomTypeFloorText(detail?.floorStart, detail?.floorEnd) || detail?.floorText || '';
  const floorSelection = resolveRoomTypeFloorSelection(nextFloorText, hotelFloorInfo);

  return {
    ...emptyRoomTypeFormValues,
    roomName: detail?.roomName || '',
    bedConfig: detail?.bedConfig || '',
    areaSize: detail?.areaSize ?? null,
    floorText: nextFloorText,
    floorStart: floorSelection.floorStart,
    floorEnd: floorSelection.floorEnd,
    roomCount: detail?.roomCount || 1,
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
    message: '房型当前正在审核中，暂不允许编辑、删除或提交新的修改。',
  };
};
