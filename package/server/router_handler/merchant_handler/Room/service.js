const { withTransaction } = require('../../../db/index');
const { createHandlerError, safeTrim } = require('../../utils/common');
const { roomTypeAuditStatus } = require('../RoomType/constants');
const {
  merchantRoomPhysicalStatus,
  merchantRoomSalesStatus,
  merchantRoomTransitionActions,
  roomBatchPhysicalStatusList,
  roomPhysicalStatusList,
  roomSalesStatusList,
  roomFeatureTagList,
  maxRoomNumberLength,
  maxDeviceRemarkLength,
  maxRoomFeatureTagCount,
  maxBatchGenerateCountPerFloor,
} = require('./constants');
const {
  toPositiveInt,
  getVacantSalesStatus,
  resolveManualRoomSalesStatus,
  resolveRoomSalesStatus,
  getRoomManagementBlockReason,
  mapMerchantRoomFloorOption,
  mapMerchantRoomTypeOption,
  mapMerchantRoom,
} = require('./helpers');
const {
  lockMerchantRow,
  getMerchantHotelRoomMeta,
  getMerchantHotelFloorByNumber,
  getMerchantHotelFloors,
  getMerchantApprovedRoomTypeOptions,
  getMerchantRoomTypeMetaById,
  getMerchantRoomByNumber,
  getMerchantRoomsPage,
  getMerchantRoomRowById,
  getMerchantRoomRowsByIds,
  createMerchantRoomRow,
  updateMerchantRoomRow,
  updateMerchantRoomStatus,
  deleteMerchantRoomRow,
  batchUpdateMerchantRoomPhysicalStatusRows,
  batchBindMerchantRoomTypeRows,
  getMerchantExistingRoomNumbers,
} = require('./repository');

const roomFeatureTagSet = new Set(roomFeatureTagList);
const roomMaintenanceSourcePhysicalStatusSet = new Set([
  merchantRoomPhysicalStatus.vacantClean,
  merchantRoomPhysicalStatus.dirty,
  merchantRoomPhysicalStatus.cleaning,
]);

const normalizeFeatureTags = (value) => [...new Set((Array.isArray(value) ? value : [])
  .map((item) => safeTrim(item))
  .filter(Boolean))];

const normalizeRoomPayload = (payload) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  return {
    roomNumber: safeTrim(source.roomNumber).slice(0, maxRoomNumberLength),
    floorNumber: toPositiveInt(source.floorNumber),
    roomTypeId: toPositiveInt(source.roomTypeId),
    physicalStatus: safeTrim(source.physicalStatus) || merchantRoomPhysicalStatus.vacantClean,
    salesStatus: safeTrim(source.salesStatus) || merchantRoomSalesStatus.available,
    featureTags: normalizeFeatureTags(source.featureTags),
    deviceRemark: safeTrim(source.deviceRemark).slice(0, maxDeviceRemarkLength),
  };
};

const normalizeBatchGeneratePayload = (payload) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const startNumber = safeTrim(source.startNumber || source.startSequence || '01');
  return {
    roomTypeId: toPositiveInt(source.roomTypeId),
    floorNumbers: [...new Set((Array.isArray(source.floorNumbers) ? source.floorNumbers : [])
      .map((item) => toPositiveInt(item))
      .filter((item) => Number.isInteger(item) && item > 0))],
    roomPrefix: safeTrim(source.roomPrefix).slice(0, maxRoomNumberLength),
    startNumber,
    generateCount: toPositiveInt(source.generateCount),
    physicalStatus: safeTrim(source.physicalStatus) || merchantRoomPhysicalStatus.vacantClean,
    salesStatus: safeTrim(source.salesStatus) || merchantRoomSalesStatus.available,
    featureTags: normalizeFeatureTags(source.featureTags),
    deviceRemark: safeTrim(source.deviceRemark).slice(0, maxDeviceRemarkLength),
  };
};

const normalizeIdList = (value) => [...new Set((Array.isArray(value) ? value : [])
  .map((item) => Number(item))
  .filter((item) => Number.isInteger(item) && item > 0))];

const buildRoomTypeMetaFromRoomRow = (roomRow) => ({
  audit_status: roomRow?.room_type_audit_status,
  is_on_sale: roomRow?.room_type_is_on_sale,
  is_forced_off_sale: roomRow?.room_type_is_forced_off_sale,
});
const isRoomForcedOffSale = (roomRow) => Number(roomRow?.is_forced_off_sale) === 1;
const getVacantSalesStatusByRoom = (roomRow, roomTypeRow) => (
  isRoomForcedOffSale(roomRow)
    ? merchantRoomSalesStatus.unavailable
    : getVacantSalesStatus(roomTypeRow)
);

const isRoomReserved = (roomRow) => resolveRoomSalesStatus({
  physicalStatus: roomRow?.physical_status,
  storedSalesStatus: roomRow?.sales_status,
  roomTypeRow: buildRoomTypeMetaFromRoomRow(roomRow),
  roomForcedOffSale: roomRow?.is_forced_off_sale,
}) === merchantRoomSalesStatus.reserved;

const isRoomOccupied = (roomRow) => roomRow?.physical_status === merchantRoomPhysicalStatus.occupied;

const ensureHotelCanManageRooms = async (merchantUserId, executor = null) => {
  const hotelMeta = await getMerchantHotelRoomMeta(merchantUserId, executor);
  if (hotelMeta?.review_status !== 'approved') {
    throw createHandlerError(
      'validation',
      getRoomManagementBlockReason(hotelMeta?.review_status || 'incomplete'),
      'reviewStatus'
    );
  }
  return hotelMeta;
};

const ensureHotelFloorExists = async (merchantUserId, floorNumber, executor = null) => {
  const floorRow = await getMerchantHotelFloorByNumber(merchantUserId, floorNumber, executor);
  if (!floorRow) {
    throw createHandlerError('validation', '请选择酒店已配置的楼层', 'floorNumber');
  }
  return floorRow;
};

const ensureApprovedRoomType = async (merchantUserId, roomTypeId, executor = null) => {
  const roomTypeRow = await getMerchantRoomTypeMetaById(merchantUserId, roomTypeId, executor, { forUpdate: true });
  if (!roomTypeRow || Number(roomTypeRow.audit_status) !== roomTypeAuditStatus.approved) {
    throw createHandlerError('validation', '请选择已审核通过且已上架的房型', 'roomTypeId');
  }
  if (
    Number(roomTypeRow.is_on_sale) !== 1
    || Number(roomTypeRow.is_forced_off_sale) === 1
  ) {
    throw createHandlerError('validation', '请选择已审核通过且已上架的房型', 'roomTypeId');
  }
  return roomTypeRow;
};

const ensureUniqueRoomNumber = async ({
  merchantUserId,
  roomNumber,
  executor = null,
  excludeRoomId = null,
}) => {
  const existing = await getMerchantRoomByNumber(merchantUserId, roomNumber, executor, {
    excludeRoomId,
    forUpdate: true,
  });
  if (existing) {
    throw createHandlerError('validation', '房间号已存在，请更换后重试', 'roomNumber');
  }
};

const validateRoomFeatureTags = (featureTags) => {
  if (featureTags.length > maxRoomFeatureTagCount) {
    throw createHandlerError('validation', `房间特性最多可选择 ${maxRoomFeatureTagCount} 项`, 'featureTags');
  }
  if (featureTags.some((item) => !roomFeatureTagSet.has(item))) {
    throw createHandlerError('validation', '房间特性参数不合法', 'featureTags');
  }
};

const validatePhysicalStatus = (physicalStatus) => {
  if (!roomPhysicalStatusList.includes(physicalStatus)) {
    throw createHandlerError('validation', '物理房态参数不合法', 'physicalStatus');
  }
};

const validateSalesStatus = (salesStatus) => {
  if (!roomSalesStatusList.includes(salesStatus)) {
    throw createHandlerError('validation', '销售状态参数不合法', 'salesStatus');
  }
};

const validateManualWriteSalesStatus = ({
  salesStatus,
  allowReserved = false,
  field = 'salesStatus',
}) => {
  if (salesStatus === merchantRoomSalesStatus.reserved && !allowReserved) {
    throw createHandlerError(
      'validation',
      '销售状态不支持直接设置为“已预订”，请使用“预订”状态流转操作',
      field
    );
  }
};

const getPersistedRoomSalesStatus = ({
  physicalStatus,
  requestedSalesStatus,
  roomTypeRow,
  roomForcedOffSale = 0,
}) => resolveManualRoomSalesStatus({
  physicalStatus,
  requestedSalesStatus,
  roomTypeRow,
  roomForcedOffSale,
});

const serializeFeatureTags = (featureTags) => (featureTags.length ? JSON.stringify(featureTags) : null);

const validateRoomPayload = async ({
  merchantUserId,
  payload,
  executor = null,
  excludeRoomId = null,
  allowExistingRoomTypeId = null,
  roomForcedOffSale = 0,
}) => {
  const normalized = normalizeRoomPayload(payload);
  if (!normalized.roomNumber) {
    throw createHandlerError('validation', '请输入房间号', 'roomNumber');
  }
  if (!normalized.floorNumber) {
    throw createHandlerError('validation', '请选择楼层', 'floorNumber');
  }
  if (!normalized.roomTypeId) {
    throw createHandlerError('validation', '请选择所属房型', 'roomTypeId');
  }

  validatePhysicalStatus(normalized.physicalStatus);
  validateSalesStatus(normalized.salesStatus);
  validateRoomFeatureTags(normalized.featureTags);

  await ensureHotelFloorExists(merchantUserId, normalized.floorNumber, executor);
  let roomTypeRow;
  if (
    Number.isInteger(allowExistingRoomTypeId)
    && allowExistingRoomTypeId > 0
    && allowExistingRoomTypeId === normalized.roomTypeId
  ) {
    roomTypeRow = await getMerchantRoomTypeMetaById(merchantUserId, normalized.roomTypeId, executor, { forUpdate: true });
    if (!roomTypeRow || Number(roomTypeRow.audit_status) !== roomTypeAuditStatus.approved) {
      throw createHandlerError('validation', '请选择已审核通过且已上架的房型', 'roomTypeId');
    }
  } else {
    roomTypeRow = await ensureApprovedRoomType(merchantUserId, normalized.roomTypeId, executor);
  }
  await ensureUniqueRoomNumber({
    merchantUserId,
    roomNumber: normalized.roomNumber,
    executor,
    excludeRoomId,
  });

  return {
    normalized,
    roomTypeRow,
    persistedSalesStatus: getPersistedRoomSalesStatus({
      physicalStatus: normalized.physicalStatus,
      requestedSalesStatus: normalized.salesStatus,
      roomTypeRow,
      roomForcedOffSale,
    }),
  };
};

const buildRoomListMeta = async (merchantUserId, executor = null) => {
  const [hotelMeta, floorRows, roomTypeRows] = await Promise.all([
    getMerchantHotelRoomMeta(merchantUserId, executor),
    getMerchantHotelFloors(merchantUserId, executor),
    getMerchantApprovedRoomTypeOptions(merchantUserId, executor),
  ]);

  return {
    hotelReviewStatus: hotelMeta?.review_status || 'incomplete',
    canManageRooms: hotelMeta?.review_status === 'approved',
    blockReason: hotelMeta?.review_status === 'approved'
      ? ''
      : getRoomManagementBlockReason(hotelMeta?.review_status || 'incomplete'),
    floors: floorRows.map(mapMerchantRoomFloorOption),
    roomTypes: roomTypeRows.map(mapMerchantRoomTypeOption),
  };
};

const getMerchantRoomsView = async ({
  merchantUserId,
  keyword = '',
  floorNumber = null,
  roomTypeId = null,
  physicalStatus = '',
  salesStatus = '',
  featureTags = [],
  page = 1,
  pageSize = 10,
}) => {
  const [meta, pageResult] = await Promise.all([
    buildRoomListMeta(merchantUserId),
    getMerchantRoomsPage({
      merchantUserId,
      keyword,
      floorNumber,
      roomTypeId,
      physicalStatus,
      salesStatus,
      featureTags,
      page,
      pageSize,
    }),
  ]);

  return {
    list: pageResult.rows.map(mapMerchantRoom),
    pagination: {
      page,
      pageSize,
      total: pageResult.total,
    },
    meta,
  };
};

const createMerchantRoom = async ({ merchantUserId, payload }) => {
  const room = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    const { normalized, persistedSalesStatus } = await validateRoomPayload({
      merchantUserId,
      payload,
      executor: tx,
    });
    validateManualWriteSalesStatus({
      salesStatus: normalized.salesStatus,
    });

    const roomId = await createMerchantRoomRow({
      merchantUserId,
      roomNumber: normalized.roomNumber,
      floorNumber: normalized.floorNumber,
      roomTypeId: normalized.roomTypeId,
      physicalStatus: normalized.physicalStatus,
      salesStatus: persistedSalesStatus,
      featureTags: serializeFeatureTags(normalized.featureTags),
      deviceRemark: normalized.deviceRemark,
    }, tx);

    return getMerchantRoomRowById(merchantUserId, roomId, tx);
  });

  return mapMerchantRoom(room);
};

const updateMerchantRoom = async ({ merchantUserId, roomId, payload }) => {
  const room = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    const currentRoom = await getMerchantRoomRowById(merchantUserId, roomId, tx, { forUpdate: true });
    if (!currentRoom) {
      throw createHandlerError('notFound', '房间不存在或无权限操作', 'id');
    }

    const { normalized, persistedSalesStatus } = await validateRoomPayload({
      merchantUserId,
      payload,
      executor: tx,
      excludeRoomId: roomId,
      allowExistingRoomTypeId: Number(currentRoom.room_type_id) || null,
      roomForcedOffSale: currentRoom.is_forced_off_sale,
    });
    validateManualWriteSalesStatus({
      salesStatus: normalized.salesStatus,
      allowReserved: isRoomReserved(currentRoom),
    });

    if (
      (isRoomReserved(currentRoom) || isRoomOccupied(currentRoom))
      && Number(currentRoom.room_type_id) !== Number(normalized.roomTypeId)
    ) {
      throw createHandlerError('validation', '已预订或入住中的房间暂不允许改绑房型', 'roomTypeId');
    }

    await updateMerchantRoomRow({
      roomId,
      merchantUserId,
      roomNumber: normalized.roomNumber,
      floorNumber: normalized.floorNumber,
      roomTypeId: normalized.roomTypeId,
      physicalStatus: normalized.physicalStatus,
      salesStatus: persistedSalesStatus,
      featureTags: serializeFeatureTags(normalized.featureTags),
      deviceRemark: normalized.deviceRemark,
    }, tx);

    return getMerchantRoomRowById(merchantUserId, roomId, tx);
  });

  return mapMerchantRoom(room);
};

const deleteMerchantRoom = async ({ merchantUserId, roomId }) => {
  await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    const roomRow = await getMerchantRoomRowById(merchantUserId, roomId, tx, { forUpdate: true });
    if (!roomRow) {
      throw createHandlerError('notFound', '房间不存在或无权限删除', 'id');
    }
    if (isRoomReserved(roomRow) || isRoomOccupied(roomRow)) {
      throw createHandlerError('validation', '已预订或入住中的房间暂不允许删除', 'id');
    }

    await deleteMerchantRoomRow(merchantUserId, roomId, tx);
  });
};

const applyRoomTransitionWithinTx = async ({
  merchantUserId,
  roomId,
  action,
  executor = null,
}) => {
  const roomRow = await getMerchantRoomRowById(merchantUserId, roomId, executor, { forUpdate: true });
  if (!roomRow) {
    throw createHandlerError('notFound', '房间不存在或无权限操作', 'id');
  }

  const roomTypeRow = buildRoomTypeMetaFromRoomRow(roomRow);
  const effectiveSalesStatus = resolveRoomSalesStatus({
    physicalStatus: roomRow.physical_status,
    storedSalesStatus: roomRow.sales_status,
    roomTypeRow,
    roomForcedOffSale: roomRow.is_forced_off_sale,
  });

  let nextPhysicalStatus = roomRow.physical_status;
  let nextSalesStatus = roomRow.sales_status;

  switch (action) {
    case merchantRoomTransitionActions.reserve:
      if (
        roomRow.physical_status !== merchantRoomPhysicalStatus.vacantClean
        || effectiveSalesStatus !== merchantRoomSalesStatus.available
      ) {
        throw createHandlerError('validation', '仅空净且可售的房间可执行预订', 'action');
      }
      nextSalesStatus = merchantRoomSalesStatus.reserved;
      break;
    case merchantRoomTransitionActions.cancelReservation:
      if (effectiveSalesStatus !== merchantRoomSalesStatus.reserved) {
        throw createHandlerError('validation', '仅已预订的房间可取消预订', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.vacantClean;
      nextSalesStatus = getVacantSalesStatusByRoom(roomRow, roomTypeRow);
      break;
    case merchantRoomTransitionActions.checkIn:
      if (
        roomRow.physical_status !== merchantRoomPhysicalStatus.vacantClean
        || ![
          merchantRoomSalesStatus.available,
          merchantRoomSalesStatus.reserved,
        ].includes(effectiveSalesStatus)
      ) {
        throw createHandlerError('validation', '仅空净且可售/已预订的房间可办理入住', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.occupied;
      nextSalesStatus = merchantRoomSalesStatus.unavailable;
      break;
    case merchantRoomTransitionActions.checkOut:
      if (roomRow.physical_status !== merchantRoomPhysicalStatus.occupied) {
        throw createHandlerError('validation', '仅入住房间可办理退房', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.dirty;
      nextSalesStatus = merchantRoomSalesStatus.unavailable;
      break;
    case merchantRoomTransitionActions.startCleaning:
      if (roomRow.physical_status !== merchantRoomPhysicalStatus.dirty) {
        throw createHandlerError('validation', '仅脏房可开始清洁', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.cleaning;
      nextSalesStatus = merchantRoomSalesStatus.unavailable;
      break;
    case merchantRoomTransitionActions.finishCleaning:
      if (roomRow.physical_status !== merchantRoomPhysicalStatus.cleaning) {
        throw createHandlerError('validation', '仅清洁中的房间可完成清洁', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.vacantClean;
      nextSalesStatus = getVacantSalesStatusByRoom(roomRow, roomTypeRow);
      break;
    case merchantRoomTransitionActions.setMaintenance:
      if (!roomMaintenanceSourcePhysicalStatusSet.has(roomRow.physical_status)) {
        throw createHandlerError('validation', '仅空净、脏房或清洁中的房间可送修', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.maintenance;
      nextSalesStatus = merchantRoomSalesStatus.unavailable;
      break;
    case merchantRoomTransitionActions.finishMaintenance:
      if (roomRow.physical_status !== merchantRoomPhysicalStatus.maintenance) {
        throw createHandlerError('validation', '仅维修中的房间可完成维修', 'action');
      }
      nextPhysicalStatus = merchantRoomPhysicalStatus.vacantClean;
      nextSalesStatus = getVacantSalesStatusByRoom(roomRow, roomTypeRow);
      break;
    default:
      throw createHandlerError('validation', '房间状态流转动作不合法', 'action');
  }

  await updateMerchantRoomStatus({
    roomId,
    merchantUserId,
    physicalStatus: nextPhysicalStatus,
    salesStatus: nextSalesStatus,
  }, executor);

  return getMerchantRoomRowById(merchantUserId, roomId, executor);
};

const transitionMerchantRoom = async ({
  merchantUserId,
  roomId,
  action,
}) => {
  const room = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    return applyRoomTransitionWithinTx({
      merchantUserId,
      roomId,
      action,
      executor: tx,
    });
  });

  return mapMerchantRoom(room);
};

const batchUpdateMerchantRoomPhysicalStatus = async ({
  merchantUserId,
  roomIds,
  physicalStatus,
}) => {
  const normalizedRoomIds = normalizeIdList(roomIds);
  if (!normalizedRoomIds.length) {
    throw createHandlerError('validation', '请选择需要批量修改状态的房间', 'roomIds');
  }
  if (!roomBatchPhysicalStatusList.includes(physicalStatus)) {
    throw createHandlerError('validation', '批量房态参数不合法', 'physicalStatus');
  }

  return withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    const roomRows = await getMerchantRoomRowsByIds(merchantUserId, normalizedRoomIds, tx, { forUpdate: true });
    const roomRowMap = new Map(roomRows.map((row) => [Number(row.id), row]));

    const updates = [];
    const skippedIds = [];

    normalizedRoomIds.forEach((roomId) => {
      const row = roomRowMap.get(roomId);
      if (!row || isRoomReserved(row) || isRoomOccupied(row)) {
        skippedIds.push(roomId);
        return;
      }

      const roomTypeRow = buildRoomTypeMetaFromRoomRow(row);
      updates.push({
        roomId,
        physicalStatus,
        salesStatus: physicalStatus === merchantRoomPhysicalStatus.vacantClean
          ? getVacantSalesStatusByRoom(row, roomTypeRow)
          : merchantRoomSalesStatus.unavailable,
      });
    });

    await batchUpdateMerchantRoomPhysicalStatusRows({
      merchantUserId,
      updates,
    }, tx);

    return {
      affectedIds: updates.map((item) => item.roomId),
      skippedIds,
    };
  });
};

const batchBindMerchantRoomType = async ({
  merchantUserId,
  roomIds,
  roomTypeId,
}) => {
  const normalizedRoomIds = normalizeIdList(roomIds);
  const normalizedRoomTypeId = toPositiveInt(roomTypeId);
  if (!normalizedRoomIds.length) {
    throw createHandlerError('validation', '请选择需要批量绑定房型的房间', 'roomIds');
  }
  if (!normalizedRoomTypeId) {
    throw createHandlerError('validation', '请选择需要绑定的房型', 'roomTypeId');
  }

  return withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    await ensureHotelCanManageRooms(merchantUserId, tx);
    const roomTypeRow = await ensureApprovedRoomType(merchantUserId, normalizedRoomTypeId, tx);
    const roomRows = await getMerchantRoomRowsByIds(merchantUserId, normalizedRoomIds, tx, { forUpdate: true });
    const roomRowMap = new Map(roomRows.map((row) => [Number(row.id), row]));

    const updates = [];
    const skippedIds = [];

    normalizedRoomIds.forEach((roomId) => {
      const row = roomRowMap.get(roomId);
      if (!row || isRoomReserved(row) || isRoomOccupied(row)) {
        skippedIds.push(roomId);
        return;
      }

      updates.push({
        roomId,
        currentRoomTypeId: Number(row.room_type_id),
        salesStatus: row.physical_status === merchantRoomPhysicalStatus.vacantClean
          ? getVacantSalesStatusByRoom(row, roomTypeRow)
          : merchantRoomSalesStatus.unavailable,
      });
    });

    await batchBindMerchantRoomTypeRows({
      merchantUserId,
      roomTypeId: normalizedRoomTypeId,
      updates,
    }, tx);

    return {
      affectedIds: updates.map((item) => item.roomId),
      skippedIds,
    };
  });
};

const batchGenerateMerchantRooms = async ({
  merchantUserId,
  payload,
}) => withTransaction(async (tx) => {
  await lockMerchantRow(tx, merchantUserId);
  await ensureHotelCanManageRooms(merchantUserId, tx);

  const normalized = normalizeBatchGeneratePayload(payload);
  if (!normalized.roomTypeId) {
    throw createHandlerError('validation', '请选择绑定房型', 'roomTypeId');
  }
  if (!normalized.floorNumbers.length) {
    throw createHandlerError('validation', '请至少选择一个楼层', 'floorNumbers');
  }
  if (!normalized.generateCount || normalized.generateCount > maxBatchGenerateCountPerFloor) {
    throw createHandlerError(
      'validation',
      `每个楼层最多可批量生成 ${maxBatchGenerateCountPerFloor} 间房`,
      'generateCount'
    );
  }
  if (!/^\d+$/.test(normalized.startNumber)) {
    throw createHandlerError('validation', '起始编号仅支持数字格式', 'startNumber');
  }

  validatePhysicalStatus(normalized.physicalStatus);
  validateSalesStatus(normalized.salesStatus);
  validateManualWriteSalesStatus({
    salesStatus: normalized.salesStatus,
  });
  validateRoomFeatureTags(normalized.featureTags);

  await Promise.all(normalized.floorNumbers.map((floorNumber) => ensureHotelFloorExists(merchantUserId, floorNumber, tx)));
  const roomTypeRow = await ensureApprovedRoomType(merchantUserId, normalized.roomTypeId, tx);
  const generatedNumbers = [];
  const startNumericValue = Number(normalized.startNumber);
  const numberWidth = normalized.startNumber.length;
  normalized.floorNumbers.forEach((floorNumber) => {
    const prefix = normalized.floorNumbers.length > 1
      ? String(floorNumber)
      : (normalized.roomPrefix || String(floorNumber));

    for (let index = 0; index < normalized.generateCount; index += 1) {
      const suffix = String(startNumericValue + index).padStart(numberWidth, '0');
      const roomNumber = `${prefix}${suffix}`;
      if (roomNumber.length > maxRoomNumberLength) {
        throw createHandlerError('validation', `生成的房间号 ${roomNumber} 超出长度限制`, 'roomPrefix');
      }
      generatedNumbers.push({
        floorNumber,
        roomNumber,
      });
    }
  });

  const uniqueRoomNumbers = [...new Set(generatedNumbers.map((item) => item.roomNumber))];
  if (uniqueRoomNumbers.length !== generatedNumbers.length) {
    throw createHandlerError('validation', '批量生成的房间号存在重复，请调整楼层或起始编号', 'startNumber');
  }

  const existingRows = await getMerchantExistingRoomNumbers(merchantUserId, uniqueRoomNumbers, tx);
  if (existingRows.length) {
    throw createHandlerError(
      'validation',
      `以下房间号已存在：${existingRows.map((item) => item.room_number).join('、')}`,
      'startNumber'
    );
  }

  const persistedSalesStatus = getPersistedRoomSalesStatus({
    physicalStatus: normalized.physicalStatus,
    requestedSalesStatus: normalized.salesStatus,
    roomTypeRow,
  });
  const featureTags = serializeFeatureTags(normalized.featureTags);
  const createdIds = [];

  for (const roomItem of generatedNumbers) {
    const roomId = await createMerchantRoomRow({
      merchantUserId,
      roomNumber: roomItem.roomNumber,
      floorNumber: roomItem.floorNumber,
      roomTypeId: normalized.roomTypeId,
      physicalStatus: normalized.physicalStatus,
      salesStatus: persistedSalesStatus,
      featureTags,
      deviceRemark: normalized.deviceRemark,
    }, tx);
    createdIds.push(roomId);
  }

  return {
    createdCount: createdIds.length,
    createdIds,
  };
});

module.exports = {
  applyRoomTransitionWithinTx,
  getMerchantRoomsView,
  createMerchantRoom,
  updateMerchantRoom,
  deleteMerchantRoom,
  transitionMerchantRoom,
  batchUpdateMerchantRoomPhysicalStatus,
  batchBindMerchantRoomType,
  batchGenerateMerchantRooms,
};
