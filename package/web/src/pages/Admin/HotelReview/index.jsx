import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Spin, Table, Tabs, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getAdminHotelsAPI, getRequestErrorMessage } from '../../../utils/request';
import { getAccommodationTypeLabel, hotelReviewCardItems, hotelReviewStatusMetaMap, hotelReviewTabItems } from './constants';
import './index.scss';

const buildAddressSummary = (record) => [record.city, record.district, record.addressDetail].filter(Boolean).join('');

export default function HotelReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [tableData, setTableData] = useState([]);
  const [summary, setSummary] = useState({ all: 0, reviewing: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAdminHotelsAPI({
          status: activeTab,
          page: currentPage,
          pageSize: currentPageSize,
        });

        setTableData(res.data.list);
        setSummary(res.data.summary);
        setPagination((prev) => ({
          ...prev,
          total: Number(res.data.pagination.total),
        }));
      } catch (error) {
        message.error(getRequestErrorMessage(error, '加载酒店审核列表失败。'));
        setTableData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab, currentPage, currentPageSize]);

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  }, []);

  const columns = useMemo(() => ([
    {
      title: '酒店名称',
      dataIndex: 'hotelName',
      render: (value, record) => (
        <div>
          <div className="admin-hotel-review__table-title">{value || '--'}</div>
          <div className="admin-hotel-review__table-sub">{getAccommodationTypeLabel(record.accommodationType)}</div>
        </div>
      ),
    },
    {
      title: '商家名称',
      dataIndex: 'merchantName',
      render: (value, record) => value || `商家 #${record.merchantUserId}`,
    },
    {
      title: '城市 / 地址',
      key: 'address',
      render: (_, record) => buildAddressSummary(record) || '--',
    },
    {
      title: '审核状态',
      dataIndex: 'reviewStatus',
      render: (value) => {
        const meta = hotelReviewStatusMetaMap[value];
        return meta ? <Tag color={meta.color}>{meta.text}</Tag> : '--';
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (value) => value || '--',
    },
    {
      title: '驳回原因',
      dataIndex: 'reviewRemark',
      ellipsis: true,
      render: (value) => value || '--',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <div className="admin-hotel-review__table-actions">
          <Button type="link" size="small" onClick={() => navigate(`/admin/hotel-review/${record.merchantUserId}`)}>
            查看
          </Button>
          {record.reviewStatus === 'reviewing' ? (
            <Button type="link" size="small" onClick={() => navigate(`/admin/hotel-review/${record.merchantUserId}/audit`)}>
              审核
            </Button>
          ) : null}
        </div>
      ),
    },
  ]), [navigate]);

  return (
    <div className="admin-hotel-review">
      <div className="admin-hotel-review__header">
        <div>
          <h1>酒店审核</h1>
          <p>集中处理商家提交的酒店资料审核请求，快速查看当前整体审核状态。</p>
        </div>
      </div>

      <div className="admin-hotel-review__stats">
        {hotelReviewCardItems.map((item) => (
          <div className={`admin-hotel-review__stat-card admin-hotel-review__stat-card--${item.key}`} key={item.key}>
            <div className="admin-hotel-review__stat-label">{item.label}</div>
            <div className="admin-hotel-review__stat-value">{summary[item.key] || 0}</div>
          </div>
        ))}
      </div>

      <div className="admin-hotel-review__tabs-shell">
        <Tabs
          activeKey={activeTab}
          items={hotelReviewTabItems}
          onChange={handleTabChange}
        />
      </div>

      <div className="admin-hotel-review__table-shell">
        <Spin spinning={loading}>
          {tableData.length ? (
            <Table
              rowKey="merchantUserId"
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
            <Empty description="暂无酒店审核数据" className="admin-hotel-review__empty" />
          )}
        </Spin>
      </div>
    </div>
  );
}
