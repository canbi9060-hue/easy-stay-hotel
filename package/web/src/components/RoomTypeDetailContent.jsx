import React from 'react';
import { Descriptions, Empty, Image } from 'antd';
import { formatPrice, roomTypeFieldLabels } from '../utils/room-type';
import { getFileUrl } from '../utils/request';
import './RoomTypeDetailContent.scss';

export default function RoomTypeDetailContent({ roomType, roomTypeIdText = undefined }) {
  if (!roomType) {
    return <Empty description="暂无房型数据" />;
  }

  const nextRoomTypeIdText = roomTypeIdText ?? (roomType?.isCreateDraft ? '草稿' : roomType?.id);
  const images = Array.isArray(roomType.images) ? roomType.images : [];
  const facilityTags = Array.isArray(roomType.facilityTags) ? roomType.facilityTags : [];

  return (
    <>
      <Descriptions column={2} bordered>
        <Descriptions.Item label={roomTypeFieldLabels.roomName}>{roomType.roomName}</Descriptions.Item>
        <Descriptions.Item label="房型 ID">{nextRoomTypeIdText}</Descriptions.Item>
        <Descriptions.Item label={roomTypeFieldLabels.bedConfig}>{roomType.bedConfig}</Descriptions.Item>
        <Descriptions.Item label="房间面积">{roomType.areaSize} ㎡</Descriptions.Item>
        <Descriptions.Item label={roomTypeFieldLabels.roomCount}>{roomType.roomCount}</Descriptions.Item>
        <Descriptions.Item label={roomTypeFieldLabels.maxGuests}>{roomType.maxGuests} 人</Descriptions.Item>
        <Descriptions.Item label="销售价">￥{formatPrice(roomType.salePriceCents)}</Descriptions.Item>
        <Descriptions.Item label="划线价">￥{formatPrice(roomType.listPriceCents)}</Descriptions.Item>
        <Descriptions.Item label="设施标签" span={2}>{facilityTags.length ? facilityTags.join(' / ') : '--'}</Descriptions.Item>
        <Descriptions.Item label="房型描述" span={2}>{roomType.description || '--'}</Descriptions.Item>
        {roomType.auditRemark ? <Descriptions.Item label="驳回原因" span={2}>{roomType.auditRemark}</Descriptions.Item> : null}
      </Descriptions>

      <div>
        <div className="room-type-detail-content__title">房型图片</div>
        {images.length ? (
          <Image.PreviewGroup>
            <div className="room-type-detail-content__images">
              {images.map((image) => (
                <Image
                  key={image.id}
                  src={image.previewUrl || getFileUrl(image.filePath)}
                  alt={image.fileName || roomType.roomName}
                  className="room-type-detail-content__image"
                />
              ))}
            </div>
          </Image.PreviewGroup>
        ) : <Empty description="暂无房型图片" />}
      </div>
    </>
  );
}
