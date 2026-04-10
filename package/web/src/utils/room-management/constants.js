export const ROOM_PHYSICAL_STATUS = {
  VACANT_CLEAN: 'vacant_clean',
  OCCUPIED: 'occupied',
  DIRTY: 'dirty',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
};

export const ROOM_SALES_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  UNAVAILABLE: 'unavailable',
};

export const ROOM_TRANSITION_ACTION = {
  RESERVE: 'reserve',
  CANCEL_RESERVATION: 'cancel_reservation',
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  START_CLEANING: 'start_cleaning',
  FINISH_CLEANING: 'finish_cleaning',
  SET_MAINTENANCE: 'set_maintenance',
  FINISH_MAINTENANCE: 'finish_maintenance',
};

export const roomFeatureTagOptions = [
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
].map((label) => ({ label, value: label }));

export const roomPhysicalStatusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '空净', value: ROOM_PHYSICAL_STATUS.VACANT_CLEAN },
  { label: '入住', value: ROOM_PHYSICAL_STATUS.OCCUPIED },
  { label: '脏房', value: ROOM_PHYSICAL_STATUS.DIRTY },
  { label: '清洁中', value: ROOM_PHYSICAL_STATUS.CLEANING },
  { label: '维修', value: ROOM_PHYSICAL_STATUS.MAINTENANCE },
];

export const roomSalesStatusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '可售', value: ROOM_SALES_STATUS.AVAILABLE },
  { label: '已预订', value: ROOM_SALES_STATUS.RESERVED },
  { label: '不可售', value: ROOM_SALES_STATUS.UNAVAILABLE },
];

export const roomBatchPhysicalStatusOptions = [
  { label: '设为空净', value: ROOM_PHYSICAL_STATUS.VACANT_CLEAN },
  { label: '设为脏房', value: ROOM_PHYSICAL_STATUS.DIRTY },
  { label: '设为清洁中', value: ROOM_PHYSICAL_STATUS.CLEANING },
  { label: '设为维修', value: ROOM_PHYSICAL_STATUS.MAINTENANCE },
];

export const roomPhysicalStatusFormOptions = roomPhysicalStatusFilterOptions.filter((item) => item.value !== 'all');
export const roomSalesStatusFormOptions = roomSalesStatusFilterOptions.filter((item) => item.value !== 'all');
export const roomManualSalesStatusFormOptions = roomSalesStatusFormOptions.filter(
  (item) => item.value !== ROOM_SALES_STATUS.RESERVED
);
export const batchGenerateCountOptions = Array.from({ length: 50 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));

export const roomPhysicalStatusMetaMap = {
  [ROOM_PHYSICAL_STATUS.VACANT_CLEAN]: { text: '空净', color: 'green' },
  [ROOM_PHYSICAL_STATUS.OCCUPIED]: { text: '入住', color: 'blue' },
  [ROOM_PHYSICAL_STATUS.DIRTY]: { text: '脏房', color: 'gold' },
  [ROOM_PHYSICAL_STATUS.CLEANING]: { text: '清洁中', color: 'orange' },
  [ROOM_PHYSICAL_STATUS.MAINTENANCE]: { text: '维修', color: 'red' },
};

export const roomSalesStatusMetaMap = {
  [ROOM_SALES_STATUS.AVAILABLE]: { text: '可售', color: 'green' },
  [ROOM_SALES_STATUS.RESERVED]: { text: '已预订', color: 'blue' },
  [ROOM_SALES_STATUS.UNAVAILABLE]: { text: '不可售', color: 'default' },
};

export const roomTransitionActionLabelMap = {
  [ROOM_TRANSITION_ACTION.RESERVE]: '预订',
  [ROOM_TRANSITION_ACTION.CANCEL_RESERVATION]: '取消预订',
  [ROOM_TRANSITION_ACTION.CHECK_IN]: '办理入住',
  [ROOM_TRANSITION_ACTION.CHECK_OUT]: '办理退房',
  [ROOM_TRANSITION_ACTION.START_CLEANING]: '开始清洁',
  [ROOM_TRANSITION_ACTION.FINISH_CLEANING]: '清洁完成',
  [ROOM_TRANSITION_ACTION.SET_MAINTENANCE]: '送修',
  [ROOM_TRANSITION_ACTION.FINISH_MAINTENANCE]: '完成维修',
};

export const getRoomPhysicalStatusMeta = (status) => (
  roomPhysicalStatusMetaMap[status] || roomPhysicalStatusMetaMap[ROOM_PHYSICAL_STATUS.VACANT_CLEAN]
);

export const getRoomSalesStatusMeta = (status) => (
  roomSalesStatusMetaMap[status] || roomSalesStatusMetaMap[ROOM_SALES_STATUS.UNAVAILABLE]
);

export const buildRoomTypeOptionLabel = (roomType) => {
  return roomType?.roomName || '';
};

export const canDeleteRoom = (room) => (
  room?.salesStatus !== ROOM_SALES_STATUS.RESERVED
  && room?.physicalStatus !== ROOM_PHYSICAL_STATUS.OCCUPIED
);

export const isRoomTypeChangeLocked = (room) => (
  room?.salesStatus === ROOM_SALES_STATUS.RESERVED
  || room?.physicalStatus === ROOM_PHYSICAL_STATUS.OCCUPIED
);

export const isRoomSalesStatusEditable = (physicalStatus) => physicalStatus === ROOM_PHYSICAL_STATUS.VACANT_CLEAN;

export const normalizeRoomSalesStatusByPhysicalStatus = (physicalStatus, salesStatus) => (
  isRoomSalesStatusEditable(physicalStatus)
    ? (salesStatus === ROOM_SALES_STATUS.UNAVAILABLE ? ROOM_SALES_STATUS.UNAVAILABLE : ROOM_SALES_STATUS.AVAILABLE)
    : ROOM_SALES_STATUS.UNAVAILABLE
);

export const getRoomTransitionActions = (room) => {
  const actions = [];
  if (!room) {
    return actions;
  }

  switch (room.physicalStatus) {
    case ROOM_PHYSICAL_STATUS.VACANT_CLEAN:
      if (room.salesStatus === ROOM_SALES_STATUS.AVAILABLE) {
        actions.push(
          ROOM_TRANSITION_ACTION.RESERVE,
          ROOM_TRANSITION_ACTION.CHECK_IN,
          ROOM_TRANSITION_ACTION.SET_MAINTENANCE
        );
      } else if (room.salesStatus === ROOM_SALES_STATUS.RESERVED) {
        actions.push(
          ROOM_TRANSITION_ACTION.CANCEL_RESERVATION,
          ROOM_TRANSITION_ACTION.CHECK_IN,
          ROOM_TRANSITION_ACTION.SET_MAINTENANCE
        );
      } else {
        actions.push(ROOM_TRANSITION_ACTION.SET_MAINTENANCE);
      }
      break;
    case ROOM_PHYSICAL_STATUS.OCCUPIED:
      actions.push(ROOM_TRANSITION_ACTION.CHECK_OUT);
      break;
    case ROOM_PHYSICAL_STATUS.DIRTY:
      actions.push(ROOM_TRANSITION_ACTION.START_CLEANING, ROOM_TRANSITION_ACTION.SET_MAINTENANCE);
      break;
    case ROOM_PHYSICAL_STATUS.CLEANING:
      actions.push(ROOM_TRANSITION_ACTION.FINISH_CLEANING, ROOM_TRANSITION_ACTION.SET_MAINTENANCE);
      break;
    case ROOM_PHYSICAL_STATUS.MAINTENANCE:
      actions.push(ROOM_TRANSITION_ACTION.FINISH_MAINTENANCE);
      break;
    default:
      break;
  }

  return actions;
};

export const groupRoomsByFloor = (rooms = []) => {
  const groups = rooms.reduce((acc, room) => {
    const floorNumber = Number(room?.floorNumber) || 0;
    if (!acc[floorNumber]) {
      acc[floorNumber] = {
        floorNumber,
        floorLabel: room?.floorLabel || `${floorNumber}层`,
        rooms: [],
      };
    }
    acc[floorNumber].rooms.push(room);
    return acc;
  }, {});

  return Object.values(groups).sort((left, right) => right.floorNumber - left.floorNumber);
};
