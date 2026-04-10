const merchantRoomPhysicalStatus = {
  vacantClean: 'vacant_clean',
  occupied: 'occupied',
  dirty: 'dirty',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
};

const merchantRoomSalesStatus = {
  available: 'available',
  reserved: 'reserved',
  unavailable: 'unavailable',
};

const merchantRoomTransitionActions = {
  reserve: 'reserve',
  cancelReservation: 'cancel_reservation',
  checkIn: 'check_in',
  checkOut: 'check_out',
  startCleaning: 'start_cleaning',
  finishCleaning: 'finish_cleaning',
  setMaintenance: 'set_maintenance',
  finishMaintenance: 'finish_maintenance',
};

const roomPhysicalStatusList = Object.values(merchantRoomPhysicalStatus);
const roomSalesStatusList = Object.values(merchantRoomSalesStatus);
const roomTransitionActionList = Object.values(merchantRoomTransitionActions);
const roomBatchPhysicalStatusList = [
  merchantRoomPhysicalStatus.vacantClean,
  merchantRoomPhysicalStatus.dirty,
  merchantRoomPhysicalStatus.cleaning,
  merchantRoomPhysicalStatus.maintenance,
];

const roomFeatureTagList = [
  '朝阳',
  '景观房',
  '不临街',
  '远离电梯',
  '高楼层',
  '连通房',
  '珍稀房',
  '残疾人房',
  '无窗',
  '朝东',
  '朝西',
  '朝南',
  '朝北',
  '吸烟房',
  '靠近安全出口',
];

const maxRoomNumberLength = 20;
const maxDeviceRemarkLength = 50;
const maxRoomFeatureTagCount = 15;
const maxBatchGenerateCountPerFloor = 50;
const defaultRoomPageSize = 10;

module.exports = {
  merchantRoomPhysicalStatus,
  merchantRoomSalesStatus,
  merchantRoomTransitionActions,
  roomPhysicalStatusList,
  roomSalesStatusList,
  roomTransitionActionList,
  roomBatchPhysicalStatusList,
  roomFeatureTagList,
  maxRoomNumberLength,
  maxDeviceRemarkLength,
  maxRoomFeatureTagCount,
  maxBatchGenerateCountPerFloor,
  defaultRoomPageSize,
};
