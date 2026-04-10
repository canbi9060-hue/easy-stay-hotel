import React from 'react';
import { Alert, Drawer, Empty, Space, Spin, Tag } from 'antd';
import { getAuditStatusMeta, getSaleStatusMeta } from '../../../../utils/room-type';
import RoomTypeDetailContent from '../../../../components/RoomTypeDetailContent';

export default function RoomTypeDetailDrawer({ open, loading, roomType, onClose }) {
  const auditMeta = getAuditStatusMeta(roomType?.auditStatus);
  const saleMeta = getSaleStatusMeta(roomType?.isOnSale, roomType?.isForcedOffSale);
  const roomTypeIdText = roomType?.isCreateDraft ? '草稿' : roomType?.id;

  return (
    <Drawer title="房型详情" size={720} open={open} onClose={onClose} destroyOnHidden>
      <Spin spinning={loading}>
        {!roomType ? <Empty description="暂无房型数据" /> : (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            {roomType.hasDraft ? (
              <Alert
                type="warning"
                showIcon
                title="您有未提交的草稿，当前展示为修改后内容，提交审核通过后才会正式生效。"
              />
            ) : null}
            <Space wrap>
              {roomType.hasDraft ? <Tag color="orange">草稿中</Tag> : null}
              <Tag color={auditMeta.color}>{auditMeta.text}</Tag>
              <Tag color={saleMeta.color}>{saleMeta.text}</Tag>
            </Space>

            <RoomTypeDetailContent roomType={roomType} roomTypeIdText={roomTypeIdText} />
          </Space>
        )}
      </Spin>
    </Drawer>
  );
}
