import React from 'react';
import { Button, Card, Checkbox, Space, Tag, Tooltip } from 'antd';
import {
  canDeleteRoomType,
  canEditRoomType,
  canSelectRoomType,
  canToggleRoomTypeSale,
  formatPrice,
  getAuditStatusMeta,
  getSaleStatusMeta,
  isRoomTypeForcedOffSale,
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
  const saleMeta = getSaleStatusMeta(record.isOnSale, record.isForcedOffSale);
  const isForcedOffSale = isRoomTypeForcedOffSale(record);
  const coverImageSrc = record.coverImagePreviewUrl || getFileUrl(record.coverImageFilePath);
  const roomTypeIdText = record.isCreateDraft ? '草稿' : record.id;
  const canEdit = canEditRoomType(record);
  const canDelete = canDeleteRoomType(record);

  const handleCardClick = () => {
    if (!selectable) return;
    onToggleSelect(record);
  };

  return (
    <Card
      hoverable
      className={`room-type-card ${selected ? 'is-selected' : ''} ${selectable ? 'is-selectable' : 'is-disabled-select'}`}
      onClick={handleCardClick}
      styles={{ body: { padding: 18 } }}
    >
      <div className="room-type-card__head">
        <div className="room-type-card__head-left">
          <Checkbox
            checked={selected}
            disabled={!selectable}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleSelect(record)}
          />
          {record.hasDraft ? <Tag color="orange" className="room-type-card__draft-tag">草稿中</Tag> : null}
        </div>
        <div className="room-type-card__tags">
          <Tag color={auditMeta.color}>{auditMeta.text}</Tag>
          <Tag color={saleMeta.color}>{saleMeta.text}</Tag>
        </div>
      </div>

      <div className="room-type-card__hero">
        <div className="room-type-card__image-wrap">
          {coverImageSrc ? (
            <img src={coverImageSrc} alt={record.roomName} className="room-type-card__image" />
          ) : (
            <div className="room-type-card__image room-type-card__image--empty">暂无图片</div>
          )}
          <span className="room-type-card__image-count">{record.imageCount || 0} 张</span>
        </div>

        <div className="room-type-card__content">
          <h3 className="room-type-card__title">{record.roomName}</h3>
          <div className="room-type-card__id">ID: {roomTypeIdText}</div>
          <div className="room-type-card__meta">{record.bedConfig}</div>
          <div className="room-type-card__meta">{record.areaSize || '--'} ㎡</div>
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
        {canEdit ? <Button type="link" size="small" onClick={() => onEdit(record)}>编辑</Button> : null}
        {Number(record.auditStatus) === 1 ? (
          <Tooltip
            title={isForcedOffSale
              ? '已被平台强行下架，请联系管理员'
              : Number(record.isOnSale) === 1
                ? '点击后下架'
                : '点击后上架'}
          >
            <span>
              <Button
                type="link"
                size="small"
                onClick={() => onToggleSale(record, !record.isOnSale)}
                disabled={!canToggleSale}
              >
                {saleMeta.text}
              </Button>
            </span>
          </Tooltip>
        ) : null}
        {canDelete ? <Button danger type="link" size="small" onClick={() => onDelete(record)}>删除</Button> : null}
      </Space>
    </Card>
  );
}
