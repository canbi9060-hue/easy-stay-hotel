import React from 'react';
import { Descriptions, Drawer, Empty, Image, Space, Spin, Tag } from 'antd';
import { formatPrice, getAuditStatusMeta, getSaleStatusMeta } from '../../../../utils/room-type';
import { getFileUrl } from '../../../../utils/request';

export default function RoomTypeDetailDrawer({ open, loading, roomType, onClose }) {
  const auditMeta = getAuditStatusMeta(roomType?.auditStatus);
  const saleMeta = getSaleStatusMeta(roomType?.isOnSale);

  return (
    <Drawer title="房型详情" width={720} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={loading}>
        {!roomType ? <Empty description="暂无房型数据" /> : (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={auditMeta.color}>{auditMeta.text}</Tag>
              <Tag color={saleMeta.color}>{saleMeta.text}</Tag>
            </Space>

            <Descriptions column={2} bordered>
              <Descriptions.Item label="房型名称">{roomType.roomName}</Descriptions.Item>
              <Descriptions.Item label="房型 ID">{roomType.id}</Descriptions.Item>
              <Descriptions.Item label="床型配置">{roomType.bedConfig}</Descriptions.Item>
              <Descriptions.Item label="房间面积">{roomType.areaSize} ㎡</Descriptions.Item>
              <Descriptions.Item label="楼层说明">{roomType.floorText}</Descriptions.Item>
              <Descriptions.Item label="房间数量">{roomType.roomCount}</Descriptions.Item>
              <Descriptions.Item label="最多入住">{roomType.maxGuests} 人</Descriptions.Item>
              <Descriptions.Item label="销售价">￥{formatPrice(roomType.salePriceCents)}</Descriptions.Item>
              <Descriptions.Item label="划线价">￥{formatPrice(roomType.listPriceCents)}</Descriptions.Item>
              <Descriptions.Item label="设施标签" span={2}>{roomType.facilityTags.length ? roomType.facilityTags.join(' / ') : '--'}</Descriptions.Item>
              <Descriptions.Item label="房型描述" span={2}>{roomType.description || '--'}</Descriptions.Item>
              {roomType.auditRemark ? <Descriptions.Item label="驳回原因" span={2}>{roomType.auditRemark}</Descriptions.Item> : null}
            </Descriptions>

            <div>
              <div className="room-type__drawer-title">房型图片</div>
              {roomType.images.length ? (
                <Image.PreviewGroup>
                  <div className="room-type__drawer-images">
                    {roomType.images.map((image) => (
                      <Image
                        key={image.id}
                        src={getFileUrl(image.filePath)}
                        alt={image.fileName || roomType.roomName}
                        className="room-type__drawer-image"
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              ) : <Empty description="暂无房型图片" />}
            </div>
          </Space>
        )}
      </Spin>
    </Drawer>
  );
}
