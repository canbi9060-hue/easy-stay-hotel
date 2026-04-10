import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  controlAdminRoomSaleAPI,
  getAdminRoomDetailAPI,
  getAdminRoomsAPI,
  getAdminRoomSuggestionsAPI,
  getRequestErrorMessage,
} from '../../../utils/request';
import {
  getRoomPhysicalStatusMeta,
  getRoomSalesStatusMeta,
  ROOM_PHYSICAL_STATUS,
  ROOM_SALES_STATUS,
} from '../../../utils/room-management';
import './index.scss';

const initialFilters = {
  hotelName: undefined,
  roomTypeName: undefined,
  roomNumber: undefined,
  physicalStatus: 'all',
  salesStatus: 'all',
};

const physicalStatusOptions = [
  { label: '全部物理房态', value: 'all' },
  { label: '空净', value: ROOM_PHYSICAL_STATUS.VACANT_CLEAN },
  { label: '入住', value: ROOM_PHYSICAL_STATUS.OCCUPIED },
  { label: '脏房', value: ROOM_PHYSICAL_STATUS.DIRTY },
  { label: '清洁中', value: ROOM_PHYSICAL_STATUS.CLEANING },
  { label: '维修', value: ROOM_PHYSICAL_STATUS.MAINTENANCE },
];

const salesStatusOptions = [
  { label: '全部销售状态', value: 'all' },
  { label: '可售', value: ROOM_SALES_STATUS.AVAILABLE },
  { label: '已预订', value: ROOM_SALES_STATUS.RESERVED },
  { label: '不可售', value: ROOM_SALES_STATUS.UNAVAILABLE },
];

const suggestionFieldMap = {
  hotelName: 'hotel_name',
  roomTypeName: 'room_type',
  roomNumber: 'room_number',
};

const emptySuggestionState = {
  hotelName: [],
  roomTypeName: [],
  roomNumber: [],
};

const emptySuggestionLoading = {
  hotelName: false,
  roomTypeName: false,
  roomNumber: false,
};

const buildSalesMeta = (record) => {
  if (Number(record?.isForcedOffSale) === 1) {
    if (record?.salesStatus === ROOM_SALES_STATUS.RESERVED) {
      return { text: '已预订（平台禁售）', color: 'red' };
    }
    return { text: '平台禁售', color: 'red' };
  }

  return getRoomSalesStatusMeta(record?.salesStatus);
};

const buildSuggestionParams = (field, filters, keyword) => {
  const params = {
    field: suggestionFieldMap[field],
    keyword: keyword || undefined,
    physicalStatus: filters.physicalStatus === 'all' ? undefined : filters.physicalStatus,
    salesStatus: filters.salesStatus === 'all' ? undefined : filters.salesStatus,
    limit: 12,
  };

  if (field !== 'hotelName' && filters.hotelName) {
    params.hotelName = filters.hotelName;
  }
  if (field !== 'roomTypeName' && filters.roomTypeName) {
    params.roomTypeName = filters.roomTypeName;
  }
  if (field !== 'roomNumber' && filters.roomNumber) {
    params.roomNumber = filters.roomNumber;
  }

  return params;
};

export default function RoomManage() {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [suggestionOptions, setSuggestionOptions] = useState(emptySuggestionState);
  const [suggestionLoading, setSuggestionLoading] = useState(emptySuggestionLoading);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const suggestionTimerRef = useRef({});
  const suggestionRequestRef = useRef({
    hotelName: 0,
    roomTypeName: 0,
    roomNumber: 0,
  });

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
      const res = await getAdminRoomSuggestionsAPI(buildSuggestionParams(field, filters, keyword));
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
        const res = await getAdminRoomsAPI({
          hotelName: filters.hotelName || undefined,
          roomTypeName: filters.roomTypeName || undefined,
          roomNumber: filters.roomNumber || undefined,
          physicalStatus: filters.physicalStatus === 'all' ? undefined : filters.physicalStatus,
          salesStatus: filters.salesStatus === 'all' ? undefined : filters.salesStatus,
          page: currentPage,
          pageSize: currentPageSize,
        });
        const nextList = Array.isArray(res.data?.list) ? res.data.list : [];
        const nextTotal = Number(res.data?.pagination?.total || 0);
        setTableData(nextList);
        setPagination((prev) => ({ ...prev, total: nextTotal }));
      } catch (error) {
        message.error(getRequestErrorMessage(error, '加载房间列表失败。'));
        setTableData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    currentPage,
    currentPageSize,
    filters.hotelName,
    filters.roomTypeName,
    filters.roomNumber,
    filters.physicalStatus,
    filters.salesStatus,
    reloadVersion,
  ]);

  useEffect(() => {
    setSuggestionOptions(emptySuggestionState);
  }, [filters.physicalStatus, filters.salesStatus]);

  useEffect(() => () => {
    Object.keys(suggestionFieldMap).forEach((field) => clearSuggestionTimer(field));
  }, [clearSuggestionTimer]);

  const openDetail = useCallback(async (roomId) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getAdminRoomDetailAPI(roomId);
      setDetailData(res.data || null);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '获取房间详情失败。'));
      setDetailOpen(false);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleControlSale = useCallback(async (record, action) => {
    try {
      await controlAdminRoomSaleAPI(record.id, { action });
      message.success(action === 'force_off' ? '房间已设为平台禁售。' : '房间已解除平台禁售。');
      refreshList();
      if (detailData?.id === record.id) {
        openDetail(record.id);
      }
    } catch (error) {
      message.error(getRequestErrorMessage(error, '控制房间售卖状态失败。'));
    }
  }, [detailData?.id, openDetail, refreshList]);

  const updateFilter = useCallback((key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }, []);

  const handleStatusFilterChange = useCallback((key, value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters(initialFilters);
    setSuggestionOptions(emptySuggestionState);
  }, []);

  const columns = useMemo(() => ([
    {
      title: '房间信息',
      dataIndex: 'roomNumber',
      render: (_value, record) => (
        <div>
          <div className="admin-room-manage__title">{record.roomNumber}</div>
          <div className="admin-room-manage__sub">ID: {record.id} · {record.floorLabel}</div>
        </div>
      ),
    },
    {
      title: '酒店',
      key: 'merchantHotel',
      render: (_value, record) => (
        <div>{record.hotelName || '--'}</div>
      ),
    },
    {
      title: '所属房型',
      key: 'roomType',
      render: (_value, record) => (
        <div>
          <div>{record.roomTypeName || '--'}</div>
          <div className="admin-room-manage__sub">房型ID: {record.roomTypeId || '--'}</div>
        </div>
      ),
    },
    {
      title: '物理房态',
      dataIndex: 'physicalStatus',
      render: (value) => {
        const meta = getRoomPhysicalStatusMeta(value);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '销售状态',
      key: 'salesStatus',
      render: (_value, record) => {
        const meta = buildSalesMeta(record);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (value) => value || '--',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => (
        <Space wrap>
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          {Number(record.isForcedOffSale) === 1 ? (
            <Button type="link" size="small" onClick={() => handleControlSale(record, 'restore_on')}>解除禁售</Button>
          ) : (
            <Button type="link" size="small" danger onClick={() => handleControlSale(record, 'force_off')}>平台禁售</Button>
          )}
        </Space>
      ),
    },
  ]), [handleControlSale, openDetail]);

  return (
    <div className="admin-room-manage">
      <div className="admin-room-manage__header">
        <div>
          <h1>房间管理</h1>
          <p>管理员仅可查看房间信息，并执行单房平台禁售/解除禁售，不参与房态运营操作。</p>
        </div>
      </div>

      <div className="admin-room-manage__toolbar">
        <div className="admin-room-manage__toolbar-left">
          <Select
            showSearch
            allowClear
            value={filters.hotelName}
            filterOption={false}
            options={suggestionOptions.hotelName}
            placeholder="按酒店名称搜索"
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
            placeholder="按房型搜索"
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
            showSearch
            allowClear
            value={filters.roomNumber}
            filterOption={false}
            options={suggestionOptions.roomNumber}
            placeholder="按房间号搜索"
            style={{ width: 200 }}
            notFoundContent={suggestionLoading.roomNumber ? '加载中...' : '暂无匹配选项'}
            onChange={(value) => updateFilter('roomNumber', value)}
            onSearch={(value) => scheduleFetchSuggestions('roomNumber', value)}
            onOpenChange={(open) => {
              if (open) {
                fetchSuggestions('roomNumber');
              }
            }}
          />
          <Select
            value={filters.physicalStatus}
            options={physicalStatusOptions}
            style={{ width: 160 }}
            onChange={(value) => handleStatusFilterChange('physicalStatus', value)}
          />
          <Select
            value={filters.salesStatus}
            options={salesStatusOptions}
            style={{ width: 160 }}
            onChange={(value) => handleStatusFilterChange('salesStatus', value)}
          />
        </div>
        <div className="admin-room-manage__toolbar-right">
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
            重置
          </Button>
        </div>
      </div>

      <div className="admin-room-manage__table-shell">
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
            <Empty description="暂无房间数据" className="admin-room-manage__empty" />
          )}
        </Spin>
      </div>

      <Drawer
        open={detailOpen}
        title={detailData ? `房间详情：${detailData.roomNumber}` : '房间详情'}
        size={640}
        onClose={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {!detailData ? (
            <Empty description="暂无详情" />
          ) : (
            <div className="admin-room-manage__detail">
              <div className="admin-room-manage__detail-row">
                <span>商家</span>
                <span>{detailData.merchantName || detailData.merchantUsername || `商家 #${detailData.merchantUserId}`}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>酒店</span>
                <span>{detailData.hotelName || '--'}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>房间号</span>
                <span>{detailData.roomNumber}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>楼层</span>
                <span>{detailData.floorLabel}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>所属房型</span>
                <span>{detailData.roomTypeName || '--'}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>物理房态</span>
                <Tag color={getRoomPhysicalStatusMeta(detailData.physicalStatus).color}>
                  {getRoomPhysicalStatusMeta(detailData.physicalStatus).text}
                </Tag>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>销售状态</span>
                <Tag color={buildSalesMeta(detailData).color}>{buildSalesMeta(detailData).text}</Tag>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>房间特性</span>
                <span>{Array.isArray(detailData.featureTags) && detailData.featureTags.length ? detailData.featureTags.join('、') : '--'}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>设备备注</span>
                <span>{detailData.deviceRemark || '--'}</span>
              </div>
              <div className="admin-room-manage__detail-row">
                <span>更新时间</span>
                <span>{detailData.updatedAt || '--'}</span>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
