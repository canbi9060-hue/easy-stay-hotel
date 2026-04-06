import React, { useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Empty, Spin, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminHotelDetailAPI, getRequestErrorMessage } from '../../../utils/request';
import DetailContent from './DetailContent';
import './index.scss';

export default function HotelReviewDetailPage() {
  const navigate = useNavigate();
  const { merchantUserId } = useParams();
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAdminHotelDetailAPI(merchantUserId);
        setHotel(res.data);
      } catch (error) {
        message.error(getRequestErrorMessage(error, '获取酒店审核详情失败。'));
        setHotel(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantUserId]);

  return (
    <div className="admin-hotel-review">
      <div className="admin-hotel-review__page-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/hotel-review')}>
          返回列表
        </Button>
      </div>

      <Spin spinning={loading}>
        {hotel ? <DetailContent hotel={hotel} /> : <Empty description="暂无酒店资料" />}
      </Spin>
    </div>
  );
}
