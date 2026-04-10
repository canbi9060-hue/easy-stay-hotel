const {
  merchantRoomPhysicalStatus,
  merchantRoomSalesStatus,
  roomFeatureTagList,
} = require('./constants');

const roomManagementReviewBlockReasonMap = {
  incomplete: '请先完善并提交酒店信息审核，通过后才能管理房间。',
  reviewing: '酒店信息正在审核中，审核通过后才能管理房间。',
  rejected_pending_fix: '酒店信息未通过审核，请先修改并重新提交审核。',
};

const toPositiveInt = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item);
  }
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string' && item)
      : [];
  } catch (_error) {
    return [];
  }
};

const isRoomTypeSellable = (roomTypeRow) => (
  Number(roomTypeRow?.audit_status) === 1
  && Number(roomTypeRow?.is_on_sale) === 1
  && Number(roomTypeRow?.is_forced_off_sale) !== 1
);

const getVacantSalesStatus = (roomTypeRow) => (
  isRoomTypeSellable(roomTypeRow)
    ? merchantRoomSalesStatus.available
    : merchantRoomSalesStatus.unavailable
);
const isRoomForcedOffSale = (value) => Number(value) === 1;

const normalizeRequestedSalesStatus = (requestedSalesStatus) => {
  if (requestedSalesStatus === merchantRoomSalesStatus.reserved) {
    return merchantRoomSalesStatus.reserved;
  }
  if (requestedSalesStatus === merchantRoomSalesStatus.unavailable) {
    return merchantRoomSalesStatus.unavailable;
  }
  return merchantRoomSalesStatus.available;
};

const resolveManualRoomSalesStatus = ({
  physicalStatus,
  requestedSalesStatus,
  roomTypeRow,
  roomForcedOffSale = 0,
}) => {
  if (physicalStatus !== merchantRoomPhysicalStatus.vacantClean) {
    return merchantRoomSalesStatus.unavailable;
  }

  const normalizedRequestedSalesStatus = normalizeRequestedSalesStatus(requestedSalesStatus);
  if (normalizedRequestedSalesStatus === merchantRoomSalesStatus.reserved) {
    return merchantRoomSalesStatus.reserved;
  }
  if (normalizedRequestedSalesStatus === merchantRoomSalesStatus.unavailable) {
    return merchantRoomSalesStatus.unavailable;
  }
  if (isRoomForcedOffSale(roomForcedOffSale)) {
    return merchantRoomSalesStatus.unavailable;
  }

  return getVacantSalesStatus(roomTypeRow);
};

const resolveRoomSalesStatus = ({
  physicalStatus,
  storedSalesStatus,
  roomTypeRow,
  roomForcedOffSale = 0,
}) => {
  if (physicalStatus !== merchantRoomPhysicalStatus.vacantClean) {
    return merchantRoomSalesStatus.unavailable;
  }

  if (storedSalesStatus === merchantRoomSalesStatus.reserved) {
    return merchantRoomSalesStatus.reserved;
  }
  if (isRoomForcedOffSale(roomForcedOffSale)) {
    return merchantRoomSalesStatus.unavailable;
  }

  return getVacantSalesStatus(roomTypeRow);
};

const getRoomManagementBlockReason = (reviewStatus) => (
  roomManagementReviewBlockReasonMap[reviewStatus] || roomManagementReviewBlockReasonMap.incomplete
);

const mapMerchantRoomFloorOption = (row) => ({
  floorNumber: toPositiveInt(row?.floor_number) || 0,
  floorLabel: row?.floor_label || `${toPositiveInt(row?.floor_number) || 0}层`,
});

const mapMerchantRoomTypeOption = (row) => ({
  id: toPositiveInt(row?.id) || 0,
  roomName: row?.room_name || '',
  isSellable: isRoomTypeSellable(row),
});

const mapMerchantRoom = (row) => {
  const roomTypeRow = {
    audit_status: row?.room_type_audit_status,
    is_on_sale: row?.room_type_is_on_sale,
    is_forced_off_sale: row?.room_type_is_forced_off_sale,
  };
  const physicalStatus = row?.physical_status || merchantRoomPhysicalStatus.vacantClean;
  const storedSalesStatus = row?.sales_status || merchantRoomSalesStatus.available;

  return {
    id: toPositiveInt(row?.id) || 0,
    roomNumber: row?.room_number || '',
    floorNumber: toPositiveInt(row?.floor_number) || 0,
    floorLabel: row?.floor_label || `${toPositiveInt(row?.floor_number) || 0}层`,
    roomTypeId: toPositiveInt(row?.room_type_id) || 0,
    roomTypeName: row?.room_type_name || '未绑定房型',
    physicalStatus,
    salesStatus: resolveRoomSalesStatus({
      physicalStatus,
      storedSalesStatus,
      roomTypeRow,
      roomForcedOffSale: row?.is_forced_off_sale,
    }),
    isForcedOffSale: isRoomForcedOffSale(row?.is_forced_off_sale) ? 1 : 0,
    featureTags: parseJsonArray(row?.feature_tags).filter((item) => roomFeatureTagList.includes(item)),
    deviceRemark: row?.device_remark || '',
    roomTypeSellable: isRoomTypeSellable(roomTypeRow),
    createdAt: row?.created_at || '',
    updatedAt: row?.updated_at || '',
  };
};

module.exports = {
  toPositiveInt,
  parseJsonArray,
  isRoomTypeSellable,
  isRoomForcedOffSale,
  getVacantSalesStatus,
  resolveManualRoomSalesStatus,
  resolveRoomSalesStatus,
  getRoomManagementBlockReason,
  mapMerchantRoomFloorOption,
  mapMerchantRoomTypeOption,
  mapMerchantRoom,
};
