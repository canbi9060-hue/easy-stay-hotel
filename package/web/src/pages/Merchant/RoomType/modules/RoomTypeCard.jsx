import React from 'react';
import { Button, Card, Checkbox, Space, Tag } from 'antd';
import {
  canSelectRoomType,
  canToggleRoomTypeSale,
  formatPrice,
  getAuditStatusMeta,
  getSaleStatusMeta,
} from '../../../../utils/room-type';
import { getFileUrl } from '../../../../utils/request';

export default function RoomTypeCard({
  record,
  selected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onToggleSale,
}) {
  const selectable = canSelectRoomType(record);
  const canToggleSale = canToggleRoomTypeSale(record);
  const auditMeta = getAuditStatusMeta(record.auditStatus);
  const saleMeta = getSaleStatusMeta(record.isOnSale);

  const handleCardClick = () => {
    if (!selectable) return;
    onToggleSelect(record);
  };

  return (
    <Card
      hoverable
      className={`room-type-card ${selected ? 'is-selected' : ''} ${selectable ? 'is-selectable' : 'is-disabled-select'}`}
      onClick={handleCardClick}
      bodyStyle={{ padding: 18 }}
    >
      <div className="room-type-card__head">
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelect(record)}
        />
        <div className="room-type-card__tags">
          <Tag color={auditMeta.color}>{auditMeta.text}</Tag>
          <Tag color={saleMeta.color}>{saleMeta.text}</Tag>
        </div>
      </div>

      <div className="room-type-card__hero">
        <div className="room-type-card__image-wrap">
          {record.coverImageFilePath ? (
            <img src={getFileUrl(record.coverImageFilePath)} alt={record.roomName} className="room-type-card__image" />
          ) : (
            <div className="room-type-card__image room-type-card__image--empty">暂无图片</div>
          )}
          <span className="room-type-card__image-count">{record.imageCount || 0} 张</span>
        </div>

        <div className="room-type-card__content">
          <h3 className="room-type-card__title">{record.roomName}</h3>
          <div className="room-type-card__id">ID: {record.id}</div>
          <div className="room-type-card__meta">{record.bedConfig}</div>
          <div className="room-type-card__meta">{record.areaSize || '--'} ㎡</div>
          <div className="room-type-card__meta">{record.floorText || '--'}</div>
          <div className="room-type-card__meta">最多入住 {record.maxGuests || 0} 人</div>
          <div className="room-type-card__price-row">
            <span className="room-type-card__price">￥{formatPrice(record.salePriceCents)}</span>
            <span className="room-type-card__list-price">￥{formatPrice(record.listPriceCents)}</span>
          </div>
          {record.auditRemark ? (
            <div className="room-type-card__remark">驳回原因：{record.auditRemark}</div>
          ) : null}
        </div>
      </div>

      <Space size={4} wrap className="room-type-card__actions" onClick={(event) => event.stopPropagation()}>
        <Button type="link" size="small" onClick={() => onView(record)}>详情</Button>
        <Button type="link" size="small" onClick={() => onEdit(record)}>编辑</Button>
        {canToggleSale ? (
          <Button type="link" size="small" onClick={() => onToggleSale(record, !record.isOnSale)}>
            {Number(record.isOnSale) === 1 ? '下架' : '上架'}
          </Button>
        ) : null}
        <Button danger type="link" size="small" onClick={() => onDelete(record)}>删除</Button>
      </Space>
    </Card>
  );
}
