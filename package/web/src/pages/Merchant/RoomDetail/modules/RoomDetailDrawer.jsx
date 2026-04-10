import React from 'react';
import { Drawer, Space, Tag } from 'antd';
import { getRoomPhysicalStatusMeta, getRoomSalesStatusMeta } from '../../../../utils/room-management';

const detailRows = (room) => ([
  { label: '房间号', value: room.roomNumber },
  { label: '楼层', value: room.floorLabel },
  { label: '所属房型', value: room.roomTypeName },
  {
    label: '物理房态',
    value: (
      <Tag color={getRoomPhysicalStatusMeta(room.physicalStatus).color}>
        {getRoomPhysicalStatusMeta(room.physicalStatus).text}
      </Tag>
    ),
  },
  {
    label: '销售状态',
    value: (
      <Tag color={getRoomSalesStatusMeta(room.salesStatus).color}>
        {getRoomSalesStatusMeta(room.salesStatus).text}
      </Tag>
    ),
  },
  {
    label: '房间特性',
    value: Array.isArray(room.featureTags) && room.featureTags.length ? (
      <div className="room-detail__feature-tags">
        {room.featureTags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
      </div>
    ) : '--',
  },
  { label: '设备备注', value: room.deviceRemark || '--' },
]);

export default function RoomDetailDrawer({
  open,
  room,
  onClose,
}) {
  return (
    <Drawer
      title={room ? `房间详情：${room.roomNumber}` : '房间详情'}
      open={open}
      size={520}
      onClose={onClose}
      destroyOnHidden
    >
      {room ? (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <div className="room-detail__detail-card">
            {detailRows(room).map((item) => (
              <div key={item.label} className="room-detail__detail-row">
                <span className="room-detail__detail-label">{item.label}</span>
                <div className="room-detail__detail-value">{item.value}</div>
              </div>
            ))}
          </div>
        </Space>
      ) : null}
    </Drawer>
  );
}
