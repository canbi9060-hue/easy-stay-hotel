import React, { useMemo } from 'react';
import { Alert, Card, Descriptions, Empty, Image, Space, Tag } from 'antd';
import { getFileUrl } from '../../../utils/request';
import { collectHotelFacilityLabels, formatAddressText } from '../../../utils/hotel-info';
import {
  getAccommodationTypeLabel,
  hotelReviewCertificateGroups,
  hotelReviewImageGroups,
  hotelReviewStatusMetaMap,
} from './constants';

const renderMediaGroup = (title, items = [], emptyText, className) => (
  <div className="admin-hotel-review__media-group" key={title}>
    <div className="admin-hotel-review__media-title">{title}</div>
    {items.length ? (
      <Image.PreviewGroup>
        <div className={className}>
          {items.map((item) => (
            <Image
              key={item.id}
              src={getFileUrl(item.filePath)}
              alt={item.fileName || title}
              className="admin-hotel-review__media-image"
            />
          ))}
        </div>
      </Image.PreviewGroup>
    ) : (
      <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    )}
  </div>
);

export default function DetailContent({ hotel }) {
  const statusMeta = hotelReviewStatusMetaMap[hotel?.reviewStatus] || null;
  const facilityLabels = useMemo(() => collectHotelFacilityLabels(hotel), [hotel]);

  if (!hotel) {
    return <Empty description="暂无酒店资料" />;
  }

  return (
    <div className="admin-hotel-review__detail-content">
      <div className="admin-hotel-review__page-head">
        <div>
          <h1 className="admin-hotel-review__title">{hotel.hotelName || '未命名酒店'}</h1>
          <p className="admin-hotel-review__subtitle">
            商家：{hotel.merchantName || `商家 #${hotel.merchantUserId}`}
          </p>
        </div>
        <Space wrap>
          {statusMeta ? <Tag color={statusMeta.color}>{statusMeta.text}</Tag> : null}
          <Tag>{getAccommodationTypeLabel(hotel.accommodationType)}</Tag>
        </Space>
      </div>

      {hotel.reviewStatus === 'rejected_pending_fix' && hotel.reviewRemark ? (
        <Alert
          type="error"
          showIcon
          title="驳回原因"
          description={hotel.reviewRemark}
        />
      ) : null}

      <Card title="基本信息" className="admin-hotel-review__section-card">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="酒店名称">{hotel.hotelName || '--'}</Descriptions.Item>
          <Descriptions.Item label="住宿类型">{getAccommodationTypeLabel(hotel.accommodationType)}</Descriptions.Item>
          <Descriptions.Item label="星级">{hotel.starLevel || '--'}</Descriptions.Item>
          <Descriptions.Item label="集团酒店">{hotel.isGroup ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{hotel.contactPhone || '--'}</Descriptions.Item>
          <Descriptions.Item label="联系邮箱">{hotel.contactEmail || '--'}</Descriptions.Item>
          <Descriptions.Item label="详细地址" span={2}>{formatAddressText(hotel.address) || '--'}</Descriptions.Item>
          <Descriptions.Item label="酒店简介" span={2}>{hotel.introduction || '--'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="运营规则" className="admin-hotel-review__section-card">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="24 小时营业">{hotel.operationRules?.isOpen24Hours ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="营业时间">
            {hotel.operationRules?.isOpen24Hours
              ? '00:00 - 23:59'
              : `${hotel.operationRules?.businessStartTime || '--'} - ${hotel.operationRules?.businessEndTime || '--'}`}
          </Descriptions.Item>
          <Descriptions.Item label="入住时间">{hotel.operationRules?.checkInTime || '--'}</Descriptions.Item>
          <Descriptions.Item label="退房时间">{hotel.operationRules?.checkOutTime || '--'}</Descriptions.Item>
          <Descriptions.Item label="总楼层" span={2}>
            {hotel.floorInfo?.totalFloorCount ? `${hotel.floorInfo.totalFloorCount}层` : '--'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="设施设备" className="admin-hotel-review__section-card">
        {facilityLabels.length ? (
          <Space wrap size={[8, 8]}>
            {facilityLabels.map((label) => <Tag key={label}>{label}</Tag>)}
          </Space>
        ) : (
          <Empty description="暂无设施信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card title="酒店图片" className="admin-hotel-review__section-card">
        <div className="admin-hotel-review__media-stack">
          {hotelReviewImageGroups.map((group) =>
            renderMediaGroup(
              group.title,
              hotel.hotelImages?.[group.key] || [],
              `${group.title}暂无图片`,
              'admin-hotel-review__media-grid'
            ))}
        </div>
      </Card>

      <Card title="资质证件" className="admin-hotel-review__section-card">
        <div className="admin-hotel-review__media-stack">
          {hotelReviewCertificateGroups.map((group) =>
            renderMediaGroup(
              group.title,
              hotel.hotelCertificates?.[group.key] || [],
              `${group.title}暂无图片`,
              'admin-hotel-review__media-grid admin-hotel-review__media-grid--cert'
            ))}
        </div>
      </Card>
    </div>
  );
}
