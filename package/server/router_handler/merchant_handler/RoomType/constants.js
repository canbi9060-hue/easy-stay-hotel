const roomTypeAuditStatus = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

const auditStatusList = [
  roomTypeAuditStatus.pending,
  roomTypeAuditStatus.approved,
  roomTypeAuditStatus.rejected,
];

const onSaleStatusList = [0, 1];

const maxRoomNameLength = 60;
const maxBedConfigLength = 100;
const maxDescriptionLength = 2000;
const maxFacilityTagCount = 20;
const maxFacilityTagLength = 30;
const maxRoomTypeImageCount = 12;

module.exports = {
  roomTypeAuditStatus,
  auditStatusList,
  onSaleStatusList,
  maxRoomNameLength,
  maxBedConfigLength,
  maxDescriptionLength,
  maxFacilityTagCount,
  maxFacilityTagLength,
  maxRoomTypeImageCount,
};
