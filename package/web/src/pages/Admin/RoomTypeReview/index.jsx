import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  auditAdminRoomTypeAPI,
  controlAdminRoomTypeSaleAPI,
  getAdminRoomTypeDetailAPI,
  getAdminRoomTypeSuggestionsAPI,
  getAdminRoomTypesAPI,
  getRequestErrorMessage,
} from '../../../utils/request';
import {
  formatPrice,
  getAdminRoomTypeQuery,
  getAuditStatusMeta,
  getSaleStatusMeta,
  ROOM_TYPE_AUDIT_STATUS,
  roomTypeAuditStatusOptions,
  roomTypeSaleStatusOptions,
} from '../../../utils/room-type';
import RoomTypeDetailContent from '../../../components/RoomTypeDetailContent';
import './index.scss';

const roomTypeRejectReasonOptions = [
  '房型图片不完整或与房型信息不符，请补充后重新提交。',
  '房型名称或描述不清晰，无法准确判断房型特征，请修改后重新提交。',
  '床型、面积、入住人数等关键信息不完整或不一致，请核实后重新提交。',
  '房型设施标签与酒店已配置设施不匹配，请调整后重新提交。',
];

const initialFilters = {
  hotelName: undefined,
  roomTypeName: undefined,
  auditStatus: 'all',
  saleStatus: 'all',
};

const suggestionFieldMap = {
  hotelName: 'hotel_name',
  roomTypeName: 'room_type',
};

const emptySuggestionState = {
  hotelName: [],
  roomTypeName: [],
};

const emptySuggestionLoading = {
  hotelName: false,
  roomTypeName: false,
};

const defaultSuggestionRequestState = {
  hotelName: 0,
  roomTypeName: 0,
};

const buildSuggestionParams = (field, filters, keyword) => {
  const query = getAdminRoomTypeQuery({
    auditStatus: filters.auditStatus,
    saleStatus: filters.saleStatus,
    hotelName: filters.hotelName,
    roomTypeName: filters.roomTypeName,
    page: 1,
    pageSize: 1,
  });

  const params = {
    field: suggestionFieldMap[field],
    keyword: keyword || undefined,
    auditStatus: query.auditStatus ?? undefined,
    saleStatus: query.saleStatus ?? undefined,
    limit: 12,
  };

  if (field !== 'hotelName' && filters.hotelName) {
    params.hotelName = filters.hotelName;
  }
  if (field !== 'roomTypeName' && filters.roomTypeName) {
    params.roomTypeName = filters.roomTypeName;
  }

  return params;
};

export default function RoomTypeReview() {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [suggestionOptions, setSuggestionOptions] = useState(emptySuggestionState);
  const [suggestionLoading, setSuggestionLoading] = useState(emptySuggestionLoading);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectForm] = Form.useForm();
  const [reloadVersion, setReloadVersion] = useState(0);

  const suggestionTimerRef = useRef({});
  const suggestionRequestRef = useRef(defaultSuggestionRequestState);

  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;
  const refreshList = useCallback(() => setReloadVersion((value) => value + 1), []);

  const clearSuggestionTimer = useCallback((field) => {
    const timer = suggestionTimerRef.current[field];
    if (timer) {
      clearTimeout(timer);
      suggestionTimerRef.current[field] = null;
    }
  }, []);

  const fetchSuggestions = useCallback(async (field, rawKeyword = '') => {
    const keyword = String(rawKeyword || '').trim();
    const requestId = (suggestionRequestRef.current[field] || 0) + 1;
    suggestionRequestRef.current[field] = requestId;
    setSuggestionLoading((prev) => ({ ...prev, [field]: true }));

    try {
      const res = await getAdminRoomTypeSuggestionsAPI(buildSuggestionParams(field, filters, keyword));
      if (suggestionRequestRef.current[field] !== requestId) {
        return;
      }
      const list = Array.isArray(res.data?.list) ? res.data.list : [];
      setSuggestionOptions((prev) => ({
        ...prev,
        [field]: list.map((item) => ({
          label: item.label || item.value,
          value: item.value,
        })),
      }));
    } catch (_error) {
      if (suggestionRequestRef.current[field] === requestId) {
        setSuggestionOptions((prev) => ({ ...prev, [field]: [] }));
      }
    } finally {
      if (suggestionRequestRef.current[field] === requestId) {
        setSuggestionLoading((prev) => ({ ...prev, [field]: false }));
      }
    }
  }, [filters]);

  const scheduleFetchSuggestions = useCallback((field, rawKeyword = '', delay = 260) => {
    clearSuggestionTimer(field);
    suggestionTimerRef.current[field] = setTimeout(() => {
      fetchSuggestions(field, rawKeyword);
    }, delay);
  }, [clearSuggestionTimer, fetchSuggestions]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAdminRoomTypesAPI(getAdminRoomTypeQuery({
          auditStatus: filters.auditStatus,
          saleStatus: filters.saleStatus,
          hotelName: filters.hotelName,
          roomTypeName: filters.roomTypeName,
          page: currentPage,
          pageSize: currentPageSize,
        }));
        const nextList = Array.isArray(res.data?.list) ? res.data.list : [];
        const total = Number(res.data?.pagination?.total || 0);
        setTableData(nextList);
        setPagination((prev) => ({
          ...prev,
          total,
        }));
      } catch (error) {
        message.error(getRequestErrorMessage(error, '加载房型审核列表失败。'));
        setTableData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    currentPage,
    currentPageSize,
    filters.auditStatus,
    filters.saleStatus,
    filters.hotelName,
    filters.roomTypeName,
    reloadVersion,
  ]);

  useEffect(() => {
    setSuggestionOptions(emptySuggestionState);
  }, [filters.auditStatus, filters.saleStatus]);

  useEffect(() => () => {
    Object.keys(suggestionFieldMap).forEach((field) => clearSuggestionTimer(field));
  }, [clearSuggestionTimer]);

  const openDetail = useCallback(async (recordId) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getAdminRoomTypeDetailAPI(recordId);
      setDetailData(res.data);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '获取房型详情失败。'));
      setDetailOpen(false);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleApprove = useCallback((record) => {
    Modal.confirm({
      title: '审核通过房型',
      content: `确认通过“${record.roomName}”吗？通过后房型仍保持下架，需商家手动上架。`,
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await auditAdminRoomTypeAPI(record.id, { auditStatus: ROOM_TYPE_AUDIT_STATUS.APPROVED });
          message.success('房型审核通过。');
          refreshList();
          if (detailData?.id === record.id) {
            openDetail(record.id);
          }
        } catch (error) {
          message.error(getRequestErrorMessage(error, '审核通过失败。'));
        }
      },
    });
  }, [detailData?.id, openDetail, refreshList]);

  const openRejectModal = useCallback((record) => {
    setRejectTarget(record);
    rejectForm.resetFields();
    setRejectOpen(true);
  }, [rejectForm]);

  const handleSaleControl = useCallback(async (record, action) => {
    try {
      await controlAdminRoomTypeSaleAPI(record.id, { action });
      message.success(action === 'force_off' ? '房型已强行下架。' : '房型已恢复上架。');
      refreshList();
      if (detailData?.id === record.id) {
        openDetail(record.id);
      }
    } catch (error) {
      message.error(getRequestErrorMessage(error, '控制房型售卖状态失败。'));
    }
  }, [detailData?.id, openDetail, refreshList]);

  const handleRejectSubmit = useCallback(async () => {
    try {
      const values = await rejectForm.validateFields();
      setRejectSubmitting(true);
      await auditAdminRoomTypeAPI(rejectTarget.id, {
        auditStatus: ROOM_TYPE_AUDIT_STATUS.REJECTED,
        auditRemark: values.auditRemark,
      });
      message.success('房型已驳回。');
      setRejectOpen(false);
      setRejectTarget(null);
      refreshList();
      if (detailData?.id === rejectTarget.id) {
        openDetail(rejectTarget.id);
      }
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(getRequestErrorMessage(error, '驳回房型失败。'));
    } finally {
      setRejectSubmitting(false);
    }
  }, [detailData?.id, openDetail, refreshList, rejectForm, rejectTarget]);

  const updateFilter = useCallback((key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  const handleStatusFilterChange = useCallback((key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters(initialFilters);
    setSuggestionOptions(emptySuggestionState);
  }, []);

  const columns = useMemo(() => ([
    {
      title: '房型信息',
      dataIndex: 'roomName',
      render: (_value, record) => (
        <div>
          <div className="admin-room-review__room-name">{record.roomName}</div>
          <div className="admin-room-review__sub">ID: {record.id}</div>
        </div>
      ),
    },
    {
      title: '酒店',
      dataIndex: 'hotelName',
      render: (value) => value || '--',
    },
    {
      title: '审核状态',
      dataIndex: 'auditStatus',
      render: (value) => {
        const meta = getAuditStatusMeta(value);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '售卖状态',
      dataIndex: 'isOnSale',
      render: (value, record) => {
        const meta = getSaleStatusMeta(value, record.isForcedOffSale);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'salePriceCents',
      render: (value, record) => `￥${formatPrice(value)} / ￥${formatPrice(record.listPriceCents)}`,
    },
    {
      title: '驳回原因',
      dataIndex: 'auditRemark',
      ellipsis: true,
      render: (value) => value || '--',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => (
        <Space wrap>
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          {Number(record.auditStatus) === ROOM_TYPE_AUDIT_STATUS.PENDING ? (
            <>
              <Button type="link" size="small" onClick={() => handleApprove(record)}>通过</Button>
              <Button type="link" size="small" danger onClick={() => openRejectModal(record)}>驳回</Button>
            </>
          ) : null}
          {Number(record.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED && Number(record.isForcedOffSale) === 0 && Number(record.isOnSale) === 1 ? (
            <Button type="link" size="small" danger onClick={() => handleSaleControl(record, 'force_off')}>强行下架</Button>
          ) : null}
          {Number(record.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED && Number(record.isForcedOffSale) === 1 ? (
            <Button type="link" size="small" onClick={() => handleSaleControl(record, 'restore_on')}>恢复上架</Button>
          ) : null}
        </Space>
      ),
    },
  ]), [handleApprove, handleSaleControl, openDetail, openRejectModal]);

  return (
    <div className="admin-room-review">
      <div className="admin-room-review__header">
        <div>
          <h1>房型审核</h1>
          <p>集中处理商家提交的房型审核请求，并确保未通过审核房型保持下架。</p>
        </div>
      </div>

      <div className="admin-room-review__toolbar">
        <div className="admin-room-review__toolbar-left">
          <Select
            showSearch
            allowClear
            value={filters.hotelName}
            filterOption={false}
            options={suggestionOptions.hotelName}
            placeholder="按酒店名称筛选"
            style={{ width: 220 }}
            notFoundContent={suggestionLoading.hotelName ? '加载中...' : '暂无匹配选项'}
            onChange={(value) => updateFilter('hotelName', value)}
            onSearch={(value) => scheduleFetchSuggestions('hotelName', value)}
            onOpenChange={(open) => {
              if (open) {
                fetchSuggestions('hotelName');
              }
            }}
          />
          <Select
            showSearch
            allowClear
            value={filters.roomTypeName}
            filterOption={false}
            options={suggestionOptions.roomTypeName}
            placeholder="按房型筛选"
            style={{ width: 220 }}
            notFoundContent={suggestionLoading.roomTypeName ? '加载中...' : '暂无匹配选项'}
            onChange={(value) => updateFilter('roomTypeName', value)}
            onSearch={(value) => scheduleFetchSuggestions('roomTypeName', value)}
            onOpenChange={(open) => {
              if (open) {
                fetchSuggestions('roomTypeName');
              }
            }}
          />
          <Select
            value={filters.auditStatus}
            options={roomTypeAuditStatusOptions}
            style={{ width: 150 }}
            onChange={(value) => handleStatusFilterChange('auditStatus', value)}
          />
          <Select
            value={filters.saleStatus}
            options={roomTypeSaleStatusOptions}
            style={{ width: 150 }}
            onChange={(value) => handleStatusFilterChange('saleStatus', value)}
          />
        </div>
        <div className="admin-room-review__toolbar-right">
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>重置</Button>
        </div>
      </div>

      <div className="admin-room-review__table-shell">
        <Spin spinning={loading}>
          {tableData.length ? (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={tableData}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => setPagination((prev) => ({ ...prev, current: page, pageSize })),
              }}
            />
          ) : (
            <Empty description="暂无房型审核数据" className="admin-room-review__empty" />
          )}
        </Spin>
      </div>

      <Drawer title="房型审核详情" size={760} open={detailOpen} onClose={() => setDetailOpen(false)} destroyOnHidden>
        <Spin spinning={detailLoading}>
          {!detailData ? <Empty description="暂无详情" /> : (
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={getAuditStatusMeta(detailData.auditStatus).color}>{getAuditStatusMeta(detailData.auditStatus).text}</Tag>
                <Tag color={getSaleStatusMeta(detailData.isOnSale, detailData.isForcedOffSale).color}>
                  {getSaleStatusMeta(detailData.isOnSale, detailData.isForcedOffSale).text}
                </Tag>
                <Tag>{detailData.hotelName || '--'}</Tag>
              </Space>

              <RoomTypeDetailContent roomType={detailData} roomTypeIdText={detailData.id} />
            </Space>
          )}
        </Spin>
      </Drawer>

      <Modal
        open={rejectOpen}
        title={rejectTarget ? `驳回房型：${rejectTarget.roomName}` : '驳回房型'}
        onCancel={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        onOk={handleRejectSubmit}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: rejectSubmitting }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="常用原因">
            <div className="admin-room-review__reason-shortcuts">
              {roomTypeRejectReasonOptions.map((reason) => (
                <Button
                  key={reason}
                  size="small"
                  onClick={() => rejectForm.setFieldsValue({ auditRemark: reason })}
                >
                  {reason}
                </Button>
              ))}
            </div>
          </Form.Item>
          <Form.Item
            label="驳回原因"
            name="auditRemark"
            rules={[{ required: true, message: '请输入驳回原因' }]}
          >
            <Input.TextArea rows={4} maxLength={500} placeholder="请输入明确的驳回原因，方便商家修改后重新提交。" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
