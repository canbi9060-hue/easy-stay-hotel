const { withTransaction } = require('../../../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { createHandlerError, safeTrim } = require('../../utils/common');
const { parsePageParams } = require('../../utils/query');
const { runQuery } = require('../../utils/repository');
const {
  roomTypeAuditStatus,
} = require('../../merchant_handler/RoomType/constants');
const {
  merchantRoomPhysicalStatus,
  merchantRoomSalesStatus,
  roomPhysicalStatusList,
  roomSalesStatusList,
} = require('../../merchant_handler/Room/constants');
const { mapMerchantRoom } = require('../../merchant_handler/Room/helpers');

const roomSaleControlAction = {
  forceOff: 'force_off',
  restoreOn: 'restore_on',
};
const roomSuggestionFieldMap = {
  hotel_name: {
    column: 'mh.hotel_name',
    label: '酒店名称',
  },
  room_type: {
    column: 'rt.room_name',
    label: '房型',
  },
  room_number: {
    column: 'r.room_number',
    label: '房间号',
  },
};

const salesStatusCaseSql = `
  CASE
    WHEN r.physical_status <> '${merchantRoomPhysicalStatus.vacantClean}' THEN '${merchantRoomSalesStatus.unavailable}'
    WHEN r.sales_status = '${merchantRoomSalesStatus.reserved}' THEN '${merchantRoomSalesStatus.reserved}'
    WHEN COALESCE(r.is_forced_off_sale, 0) = 1 THEN '${merchantRoomSalesStatus.unavailable}'
    WHEN rt.audit_status = ${roomTypeAuditStatus.approved}
      AND rt.is_on_sale = 1
      AND COALESCE(rt.is_forced_off_sale, 0) <> 1
      THEN '${merchantRoomSalesStatus.available}'
    ELSE '${merchantRoomSalesStatus.unavailable}'
  END
`;

const normalizeOptionalSuggestionField = (value) => {
  const field = safeTrim(value);
  return roomSuggestionFieldMap[field] ? field : '';
};

const normalizeSuggestionLimit = (value) => {
  const raw = Number(value);
  if (!Number.isInteger(raw) || raw <= 0) {
    return 10;
  }
  return Math.min(raw, 20);
};

const normalizeOptionalPhysicalStatus = (value) => {
  const status = safeTrim(value);
  if (!status || status === 'all') {
    return '';
  }
  return roomPhysicalStatusList.includes(status) ? status : null;
};

const normalizeOptionalSalesStatus = (value) => {
  const status = safeTrim(value);
  if (!status || status === 'all') {
    return '';
  }
  return roomSalesStatusList.includes(status) ? status : null;
};

const appendRoomFilters = ({
  conditions,
  values,
  hotelName = '',
  roomTypeName = '',
  roomNumber = '',
  physicalStatus = '',
  salesStatus = '',
}) => {
  if (hotelName) {
    conditions.push('mh.hotel_name = ?');
    values.push(hotelName);
  }

  if (roomTypeName) {
    conditions.push('rt.room_name = ?');
    values.push(roomTypeName);
  }

  if (roomNumber) {
    conditions.push('r.room_number = ?');
    values.push(roomNumber);
  }

  if (physicalStatus) {
    conditions.push('r.physical_status = ?');
    values.push(physicalStatus);
  }

  if (salesStatus) {
    conditions.push(`(${salesStatusCaseSql}) = ?`);
    values.push(salesStatus);
  }

};

const mapAdminRoom = (row) => {
  const mappedRoom = mapMerchantRoom(row);
  return {
    ...mappedRoom,
    merchantUserId: Number(row?.merchant_user_id || 0),
    merchantName: row?.merchant_name || row?.merchant_username || '',
    merchantUsername: row?.merchant_username || '',
    hotelName: row?.hotel_name || '',
  };
};

const getAdminRoomRowById = async (roomId, executor = null, options = {}) => {
  const suffix = options.forUpdate ? ' FOR UPDATE' : '';
  const [row] = await runQuery(
    executor,
    `SELECT
       r.*,
       rt.room_name AS room_type_name,
       rt.audit_status AS room_type_audit_status,
       rt.is_on_sale AS room_type_is_on_sale,
       rt.is_forced_off_sale AS room_type_is_forced_off_sale,
       hf.floor_label,
       u.name AS merchant_name,
       u.username AS merchant_username,
       mh.hotel_name
     FROM merchant_rooms r
     LEFT JOIN merchant_room_types rt
       ON rt.id = r.room_type_id
     LEFT JOIN merchant_hotel_floors hf
       ON hf.merchant_user_id = r.merchant_user_id
      AND hf.floor_number = r.floor_number
     LEFT JOIN users u
       ON u.id = r.merchant_user_id
     LEFT JOIN merchant_hotels mh
       ON mh.merchant_user_id = r.merchant_user_id
     WHERE r.id = ?
     LIMIT 1${suffix}`,
    [roomId]
  );
  return row || null;
};

exports.getAdminRoomSuggestions = async (req, res) => {
  try {
    const field = normalizeOptionalSuggestionField(req.query.field);
    if (!field) {
      return res.json(validationFail('候选字段参数不合法', 'field'));
    }

    const physicalStatus = normalizeOptionalPhysicalStatus(req.query.physicalStatus);
    if (physicalStatus === null) {
      return res.json(validationFail('物理房态参数不合法', 'physicalStatus'));
    }

    const salesStatus = normalizeOptionalSalesStatus(req.query.salesStatus);
    if (salesStatus === null) {
      return res.json(validationFail('销售状态参数不合法', 'salesStatus'));
    }

    const keyword = safeTrim(req.query.keyword);
    const limit = normalizeSuggestionLimit(req.query.limit);
    const fieldConfig = roomSuggestionFieldMap[field];
    const conditions = [
      `${fieldConfig.column} IS NOT NULL`,
      `${fieldConfig.column} <> ''`,
    ];
    const values = [];

    appendRoomFilters({
      conditions,
      values,
      hotelName: field === 'hotel_name' ? '' : safeTrim(req.query.hotelName),
      roomTypeName: field === 'room_type' ? '' : safeTrim(req.query.roomTypeName),
      roomNumber: field === 'room_number' ? '' : safeTrim(req.query.roomNumber),
      physicalStatus,
      salesStatus,
    });

    if (keyword) {
      conditions.push(`${fieldConfig.column} LIKE ?`);
      values.push(`%${keyword}%`);
    }

    const rows = await runQuery(
      null,
      `SELECT DISTINCT ${fieldConfig.column} AS value
       FROM merchant_rooms r
       LEFT JOIN merchant_room_types rt
         ON rt.id = r.room_type_id
       LEFT JOIN merchant_hotels mh
         ON mh.merchant_user_id = r.merchant_user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY value ASC
       LIMIT ?`,
      [...values, limit]
    );

    const list = rows
      .map((row) => safeTrim(row?.value))
      .filter(Boolean)
      .map((value) => ({
        label: value,
        value,
      }));

    return res.json(success({ list }, `获取${fieldConfig.label}候选成功`));
  } catch (error) {
    console.error('获取管理员房间筛选候选失败:', error);
    return res.json(serverFail('获取筛选候选失败，请稍后重试'));
  }
};

exports.getAdminRooms = async (req, res) => {
  try {
    const physicalStatus = normalizeOptionalPhysicalStatus(req.query.physicalStatus);
    if (physicalStatus === null) {
      return res.json(validationFail('物理房态参数不合法', 'physicalStatus'));
    }

    const salesStatus = normalizeOptionalSalesStatus(req.query.salesStatus);
    if (salesStatus === null) {
      return res.json(validationFail('销售状态参数不合法', 'salesStatus'));
    }

    const { page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, 10);
    const conditions = ['1 = 1'];
    const values = [];
    appendRoomFilters({
      conditions,
      values,
      hotelName: safeTrim(req.query.hotelName),
      roomTypeName: safeTrim(req.query.roomTypeName),
      roomNumber: safeTrim(req.query.roomNumber),
      physicalStatus,
      salesStatus,
    });
    const whereSql = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    const [countRow] = await runQuery(
      null,
      `SELECT COUNT(*) AS total
       FROM merchant_rooms r
       LEFT JOIN merchant_room_types rt
         ON rt.id = r.room_type_id
       LEFT JOIN merchant_hotels mh
         ON mh.merchant_user_id = r.merchant_user_id
       WHERE ${whereSql}`,
      values
    );

    const rows = await runQuery(
      null,
      `SELECT
         r.*,
         rt.room_name AS room_type_name,
         rt.audit_status AS room_type_audit_status,
         rt.is_on_sale AS room_type_is_on_sale,
         rt.is_forced_off_sale AS room_type_is_forced_off_sale,
         hf.floor_label,
         u.name AS merchant_name,
         u.username AS merchant_username,
         mh.hotel_name
       FROM merchant_rooms r
       LEFT JOIN merchant_room_types rt
         ON rt.id = r.room_type_id
       LEFT JOIN merchant_hotel_floors hf
         ON hf.merchant_user_id = r.merchant_user_id
        AND hf.floor_number = r.floor_number
       LEFT JOIN users u
         ON u.id = r.merchant_user_id
       LEFT JOIN merchant_hotels mh
         ON mh.merchant_user_id = r.merchant_user_id
       WHERE ${whereSql}
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT ?, ?`,
      [...values, offset, pageSize]
    );

    return res.json(success({
      list: rows.map(mapAdminRoom),
      pagination: {
        page,
        pageSize,
        total: Number(countRow?.total || 0),
      },
    }, '获取房间列表成功'));
  } catch (error) {
    console.error('获取管理员房间列表失败:', error);
    return res.json(serverFail('获取房间列表失败，请稍后重试'));
  }
};

exports.getAdminRoomDetail = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.json(validationFail('房间 ID 不合法', 'id'));
    }

    const row = await getAdminRoomRowById(roomId);
    if (!row) {
      return res.json(notFoundFail('房间不存在', 'id'));
    }

    return res.json(success(mapAdminRoom(row), '获取房间详情成功'));
  } catch (error) {
    console.error('获取管理员房间详情失败:', error);
    return res.json(serverFail('获取房间详情失败，请稍后重试'));
  }
};

exports.controlAdminRoomSale = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.json(validationFail('房间 ID 不合法', 'id'));
    }

    const action = safeTrim(req.body?.action);
    if (![roomSaleControlAction.forceOff, roomSaleControlAction.restoreOn].includes(action)) {
      return res.json(validationFail('售卖控制动作不合法', 'action'));
    }

    const result = await withTransaction(async (tx) => {
      const row = await getAdminRoomRowById(roomId, tx, { forUpdate: true });
      if (!row) {
        throw createHandlerError('notFound', '房间不存在', 'id');
      }

      if (action === roomSaleControlAction.forceOff) {
        if (Number(row.is_forced_off_sale) === 1) {
          throw createHandlerError('validation', '当前房间已是平台禁售状态', 'action');
        }
        await runQuery(
          tx,
          `UPDATE merchant_rooms
           SET is_forced_off_sale = 1
           WHERE id = ?`,
          [roomId]
        );
      } else {
        if (Number(row.is_forced_off_sale) !== 1) {
          throw createHandlerError('validation', '当前房间未处于平台禁售状态', 'action');
        }
        await runQuery(
          tx,
          `UPDATE merchant_rooms
           SET is_forced_off_sale = 0
           WHERE id = ?`,
          [roomId]
        );
      }

      const latestRow = await getAdminRoomRowById(roomId, tx);
      return mapAdminRoom(latestRow);
    });

    return res.json(success(
      result,
      action === roomSaleControlAction.forceOff ? '房间已设为平台禁售' : '房间已解除平台禁售'
    ));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'action'));
    }
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    console.error('管理员控制房间售卖状态失败:', error);
    return res.json(serverFail('控制房间售卖状态失败，请稍后重试'));
  }
};
