import React, { useMemo } from 'react';
import { Button, Card, Dropdown, Space, Table, Tag, Tooltip } from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  canDeleteRoom,
  getRoomPhysicalStatusMeta,
  getRoomSalesStatusMeta,
  getRoomTransitionActions,
  roomTransitionActionLabelMap,
} from '../../../../utils/room-management';

export default function RoomFloorTables({
  groupedRooms,
  onView,
  onEdit,
  onDelete,
  onTransition,
}) {
  const columns = useMemo(() => ([
    {
      title: '序号',
      dataIndex: 'sequence',
      width: 72,
      render: (_value, _record, index) => String(index + 1).padStart(2, '0'),
    },
    {
      title: '房间号',
      dataIndex: 'roomNumber',
      width: 120,
      render: (value) => <span className="room-detail__room-number">{value}</span>,
    },
    {
      title: '楼层',
      dataIndex: 'floorLabel',
      width: 110,
    },
    {
      title: '所属房型',
      dataIndex: 'roomTypeName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '物理房态',
      dataIndex: 'physicalStatus',
      width: 140,
      render: (value) => {
        const metaInfo = getRoomPhysicalStatusMeta(value);
        return <Tag color={metaInfo.color}>{metaInfo.text}</Tag>;
      },
    },
    {
      title: '销售状态',
      dataIndex: 'salesStatus',
      width: 140,
      render: (value) => {
        const metaInfo = getRoomSalesStatusMeta(value);
        return <Tag color={metaInfo.color}>{metaInfo.text}</Tag>;
      },
    },
    {
      title: '房间特性',
      dataIndex: 'featureTags',
      width: 240,
      render: (value) => {
        const tags = Array.isArray(value) ? value : [];
        if (!tags.length) {
          return '--';
        }

        const visibleTags = tags.slice(0, 3);
        const hiddenCount = tags.length - visibleTags.length;

        return (
          <div className="room-detail__feature-tags">
            {visibleTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {hiddenCount > 0 ? (
              <Tooltip title={tags.join('、')}>
                <Tag>+{hiddenCount}</Tag>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 240,
      render: (_value, record) => {
        const transitionActions = getRoomTransitionActions(record);
        const menu = {
          items: transitionActions.map((action) => ({
            key: action,
            label: roomTransitionActionLabelMap[action],
          })),
          onClick: ({ key }) => onTransition(record, key),
        };

        return (
          <Space size={4} className="room-detail__table-actions">
            <Button type="link" icon={<EyeOutlined />} onClick={() => onView(record)}>
              查看
            </Button>
            <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              编辑
            </Button>
            {canDeleteRoom(record) ? (
              <Button danger type="link" icon={<DeleteOutlined />} onClick={() => onDelete(record)}>
                删除
              </Button>
            ) : null}
            {transitionActions.length ? (
              <Dropdown menu={menu} trigger={['click']}>
                <Button type="link">
                  状态流转 <DownOutlined />
                </Button>
              </Dropdown>
            ) : null}
          </Space>
        );
      },
    },
  ]), [onDelete, onEdit, onTransition, onView]);

  return (
    <>
      {groupedRooms.map((group) => (
        <div key={group.floorNumber} className="room-detail__floor-group">
          <div className="room-detail__floor-head">
            <span className="room-detail__floor-chip">{group.floorLabel}</span>
            <h3>{group.floorLabel} 客房（{group.rooms.length}）</h3>
          </div>
          <Card variant="borderless" className="room-detail__floor-card">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={group.rooms}
              pagination={false}
              scroll={{ x: 1080 }}
            />
          </Card>
        </div>
      ))}
    </>
  );
}
