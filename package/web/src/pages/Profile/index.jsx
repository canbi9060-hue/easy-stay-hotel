import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, Button, Card, Col, Form, Input, Row, Upload, message } from 'antd';
import {
  LoadingOutlined,
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';

import defaultAvatar from '../../assets/images/default-avatar.svg';
import { fetchUserInfo, setUserInfo } from '../../store/slices/userSlice';
import { getFileUrl, updateProfileAPI, uploadAvatarAPI } from '../../utils/request';
import {
  validateEmail,
  validatePhone,
  validateProfileName,
} from '../../utils/validateRules';
import './index.scss';

const roleLabelMap = {
  admin: '管理员',
  merchant: '商家',
  user: '普通用户',
};

const statusLabelMap = {
  0: '已禁用',
  1: '正常',
};

const formatDisplayValue = (value, fallback = '-') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text ? text : fallback;
};

export default function Profile() {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    dispatch(fetchUserInfo());
  }, [dispatch]);

  useEffect(() => {
    if (userInfo) {
      form.setFieldsValue({
        name: userInfo.name || '',
        phone: userInfo.phone || '',
        email: userInfo.email || '',
      });
    }
  }, [form, userInfo]);

  const avatarSrc = useMemo(
    () => getFileUrl(userInfo?.avatar) || defaultAvatar,
    [userInfo?.avatar]
  );
  const roleLabel = roleLabelMap[userInfo?.role] || '未知身份';
  const accountInfoList = useMemo(
    () => [
      { label: '身份', value: roleLabel },
      { label: '账号状态', value: statusLabelMap[Number(userInfo?.status)] || '未知状态' },
      { label: '创建时间', value: formatDisplayValue(userInfo?.createTime) },
      { label: '最后更新', value: formatDisplayValue(userInfo?.updateTime) },
    ],
    [roleLabel, userInfo]
  );

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const res = await updateProfileAPI(values);
      dispatch(setUserInfo(res.data));
      message.success('个人资料已更新');
    } catch (error) {
      const { field, errorMsg } = error;
      if (field) {
        form.setFields([{ name: field, errors: [errorMsg] }]);
      } else {
        message.error(errorMsg || '更新失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('仅支持上传图片文件');
      return Upload.LIST_IGNORE;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('头像图片不能超过 2MB');
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const handleAvatarUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setAvatarUploading(true);
      const res = await uploadAvatarAPI(formData);
      dispatch(setUserInfo(res.data));
      message.success('头像更新成功');
      onSuccess?.(res.data, file);
    } catch (error) {
      message.error(error.errorMsg || '头像上传失败');
      onError?.(error);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="page-container profile-page">
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={8}>
          <Card className="profile-page__card profile-page__overview">
            <div className="profile-page__avatar-wrap">
              <Avatar src={avatarSrc} size={118} />
              <div className="profile-page__account">{userInfo?.username || '未登录'}</div>
             
            </div>

            <Upload
              showUploadList={false}
              customRequest={handleAvatarUpload}
              beforeUpload={beforeUpload}
            >
              <Button
                className="profile-page__upload-btn"
                type="primary"
                block
                icon={avatarUploading ? <LoadingOutlined /> : <UploadOutlined />}
                loading={avatarUploading}
              >
                修改头像
              </Button>
            </Upload>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            className="profile-page__card"
            title="编辑资料"
            extra={<span className="profile-page__card-tip">保存后会立即同步到右上角</span>}
          >
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Row gutter={18}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="姓名"
                    name="name"
                    rules={[{ validator: validateProfileName }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="请输入姓名" maxLength={50} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="手机号"
                    name="phone"
                    rules={[{ validator: validatePhone }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" maxLength={11} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[{ validator: validateEmail }]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
                  </Form.Item>
                </Col>
              </Row>

              <div className="profile-page__actions">
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存资料
                </Button>
              </div>
            </Form>
          </Card>

          <Card className="profile-page__card profile-page__details" title="账号信息">
            <div className="profile-page__details-grid">
              {accountInfoList.map((item) => (
                <div className="profile-page__detail-item" key={item.label}>
                  <span className="profile-page__detail-label">{item.label}</span>
                  <strong className="profile-page__detail-value">{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
