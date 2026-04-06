import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Form, Input, Modal, Space, Spin, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminHotelDetailAPI, getRequestErrorMessage, reviewAdminHotelAPI } from '../../../utils/request';
import DetailContent from './DetailContent';
import {
  hotelRejectReasonMaxLength,
  hotelRejectReasonMinLength,
  hotelRejectReasonOptions,
} from './constants';
import './index.scss';

export default function HotelReviewAuditPage() {
  const navigate = useNavigate();
  const { merchantUserId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [hotel, setHotel] = useState(null);
  const [rejectForm] = Form.useForm();

  const loadHotelDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminHotelDetailAPI(merchantUserId);
      setHotel(res.data);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '获取酒店审核详情失败。'));
      setHotel(null);
    } finally {
      setLoading(false);
    }
  }, [merchantUserId]);

  useEffect(() => {
    loadHotelDetail();
  }, [loadHotelDetail]);

  const handleApprove = useCallback(async () => {
    try {
      setSubmitting(true);
      await reviewAdminHotelAPI(merchantUserId, {
        reviewStatus: 'approved',
      });
      message.success('酒店审核通过。');
      navigate(`/admin/hotel-review/${merchantUserId}`, { replace: true });
    } catch (error) {
      message.error(getRequestErrorMessage(error, '审核通过失败。'));
    } finally {
      setSubmitting(false);
    }
  }, [merchantUserId, navigate]);

  const handleRejectSubmit = useCallback(async () => {
    try {
      const values = await rejectForm.validateFields();
      setSubmitting(true);
      await reviewAdminHotelAPI(merchantUserId, {
        reviewStatus: 'rejected_pending_fix',
        reviewRemark: values.reviewRemark,
      });
      message.success('酒店已驳回。');
      setRejectOpen(false);
      navigate(`/admin/hotel-review/${merchantUserId}`, { replace: true });
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(getRequestErrorMessage(error, '驳回酒店失败。'));
    } finally {
      setSubmitting(false);
    }
  }, [merchantUserId, navigate, rejectForm]);

  const isPendingReview = hotel?.reviewStatus === 'reviewing';
  const actionDescription = isPendingReview
    ? '审核页 = 详情页 + 底部操作区。通过直接提交，驳回需填写原因。'
    : '当前酒店不在待审核状态，无法再次执行通过或驳回操作。';

  return (
    <div className="admin-hotel-review">
      <div className="admin-hotel-review__page-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/hotel-review')}>
          返回列表
        </Button>
      </div>

      <Spin spinning={loading}>
        {hotel ? (
          <>
            {!isPendingReview ? (
              <Alert
                type="warning"
                showIcon
                title="当前酒店不处于待审核状态"
                description="该酒店已不在待审核队列中，审核页保留只读详情和操作区展示，但审核按钮已禁用。"
                style={{ marginBottom: 16 }}
              />
            ) : null}

            <DetailContent hotel={hotel} />

            <Card className="admin-hotel-review__section-card admin-hotel-review__action-card">
              <div className="admin-hotel-review__action-head">
                <div>
                  <div className="admin-hotel-review__action-title">审核操作</div>
                  <div className="admin-hotel-review__action-desc">{actionDescription}</div>
                </div>
                <Space>
                  <Button
                    danger
                    disabled={!isPendingReview || submitting}
                    onClick={() => {
                      rejectForm.resetFields();
                      setRejectOpen(true);
                    }}
                  >
                    驳回
                  </Button>
                  <Button
                    type="primary"
                    loading={submitting}
                    disabled={!isPendingReview}
                    onClick={handleApprove}
                  >
                    通过
                  </Button>
                </Space>
              </div>
            </Card>
          </>
        ) : (
          <Empty description="暂无酒店资料" />
        )}
      </Spin>

      <Modal
        open={rejectOpen}
        title={hotel ? `驳回酒店：${hotel.hotelName || `商家 #${hotel.merchantUserId}`}` : '驳回酒店'}
        onCancel={() => setRejectOpen(false)}
        onOk={handleRejectSubmit}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: submitting }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="常用原因">
            <div className="admin-hotel-review__reason-shortcuts">
              {hotelRejectReasonOptions.map((reason) => (
                <Button
                  key={reason}
                  size="small"
                  onClick={() => rejectForm.setFieldsValue({ reviewRemark: reason })}
                >
                  {reason}
                </Button>
              ))}
            </div>
          </Form.Item>
          <Form.Item
            label="驳回原因"
            name="reviewRemark"
            rules={[
              { required: true, message: '请输入驳回原因' },
              {
                validator: (_, value) => {
                  const length = String(value || '').trim().length;
                  if (length >= hotelRejectReasonMinLength && length <= hotelRejectReasonMaxLength) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(`驳回原因需为 ${hotelRejectReasonMinLength}～${hotelRejectReasonMaxLength} 个字符`));
                },
              },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={hotelRejectReasonMaxLength}
              placeholder="请输入明确的驳回原因，长度 10～100 个字符，商家端将同步可见。"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
