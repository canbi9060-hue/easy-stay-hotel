const { withTransaction } = require('../../../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../../../utils/response');
const { roomTypeAuditStatus, auditStatusList, onSaleStatusList } = require('../../merchant_handler/RoomType/constants');
const { mapRoomTypeSummary, mapRoomTypeDetail } = require('../../merchant_handler/RoomType/helpers');
const {
  runQuery,
  getAdminRoomTypesPage,
  getAdminRoomTypeDetail,
  getAdminRoomTypeRowById,
  getRoomTypeImagesByRoomTypeId,
} = require('../../merchant_handler/RoomType/repository');
const { createHandlerError, safeTrim } = require('../../utils/common');
const { parsePageParams, normalizeOptionalEnum } = require('../../utils/query');

exports.getAdminRoomTypes = async (req, res) => {
  try {
    const auditStatus = normalizeOptionalEnum(req.query.auditStatus, auditStatusList);
    if (Number.isNaN(auditStatus)) {
      return res.json(validationFail('审核状态参数不合法', 'auditStatus'));
    }

    const saleStatus = normalizeOptionalEnum(req.query.saleStatus, onSaleStatusList);
    if (Number.isNaN(saleStatus)) {
      return res.json(validationFail('售卖状态参数不合法', 'saleStatus'));
    }

    const { page, pageSize } = parsePageParams(req.query.page, req.query.pageSize, 10);
    const listResult = await getAdminRoomTypesPage({
      auditStatus,
      saleStatus,
      keyword: safeTrim(req.query.keyword),
      merchantKeyword: safeTrim(req.query.merchantKeyword),
      page,
      pageSize,
    });

    res.json(success({
      list: listResult.rows.map(mapRoomTypeSummary),
      pagination: {
        page,
        pageSize,
        total: listResult.total,
      },
    }, '获取房型审核列表成功'));
  } catch (error) {
    console.error('获取管理员房型列表失败:', error);
    res.json(serverFail('获取房型审核列表失败，请稍后重试'));
  }
};

exports.getAdminRoomTypeDetail = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'id'));
    }

    const detail = await getAdminRoomTypeDetail(roomTypeId);
    if (!detail) {
      return res.json(notFoundFail('房型不存在', 'id'));
    }

    res.json(success(mapRoomTypeDetail(detail.row, detail.images), '获取房型审核详情成功'));
  } catch (error) {
    console.error('获取管理员房型详情失败:', error);
    res.json(serverFail('获取房型审核详情失败，请稍后重试'));
  }
};

exports.auditAdminRoomType = async (req, res) => {
  try {
    const roomTypeId = Number(req.params.id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.json(validationFail('房型 ID 不合法', 'id'));
    }

    const auditStatus = Number(req.body?.auditStatus);
    if (![roomTypeAuditStatus.approved, roomTypeAuditStatus.rejected].includes(auditStatus)) {
      return res.json(validationFail('审核状态参数不合法', 'auditStatus'));
    }

    const auditRemark = safeTrim(req.body?.auditRemark);
    if (auditStatus === roomTypeAuditStatus.rejected && !auditRemark) {
      return res.json(validationFail('驳回原因不能为空', 'auditRemark'));
    }

    const result = await withTransaction(async (tx) => {
      const row = await getAdminRoomTypeRowById(roomTypeId, tx, { forUpdate: true });
      if (!row) {
        throw createHandlerError('notFound', '房型不存在', 'id');
      }
      if (Number(row.audit_status) !== roomTypeAuditStatus.pending) {
        throw createHandlerError('validation', '仅待审核房型可执行审核操作', 'auditStatus');
      }

      await runQuery(
        tx,
        `UPDATE merchant_room_types
         SET audit_status = ?,
             audit_remark = ?,
             is_on_sale = 0,
             audit_admin_id = ?,
             audit_at = NOW()
         WHERE id = ?`,
        [
          auditStatus,
          auditStatus === roomTypeAuditStatus.rejected ? auditRemark : '',
          req.user.id,
          roomTypeId,
        ]
      );

      const latestRow = await getAdminRoomTypeRowById(roomTypeId, tx);
      const imageRows = await getRoomTypeImagesByRoomTypeId(roomTypeId, tx);
      return mapRoomTypeDetail(latestRow, imageRows);
    });

    res.json(success(result, auditStatus === roomTypeAuditStatus.approved ? '房型审核通过' : '房型已驳回'));
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'auditStatus'));
    }
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    console.error('管理员审核房型失败:', error);
    res.json(serverFail('审核房型失败，请稍后重试'));
  }
};
