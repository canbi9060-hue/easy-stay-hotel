import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Space } from 'antd';
import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';

import defaultAvatar from '../../assets/images/default-avatar.svg';
import { logout } from '../../store/slices/userSlice';
import { getFileUrl } from '../../utils/request';
import './index.scss';

const roleLabelMap = {
  admin: '管理员',
  merchant: '商家',
  user: '普通用户',
};

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.user);

  const currentSection = location.pathname.split('/')[1];
  const rolePrefix = userInfo?.role
    ? `/${userInfo.role}`
    : `/${currentSection || 'merchant'}`;
  const avatarSrc = getFileUrl(userInfo?.avatar) || defaultAvatar;
  const roleLabel = roleLabelMap[userInfo?.role] || '账号信息';

  const handleMenuClick = ({ key }) => {
    if (key === 'profile') {
      navigate(`${rolePrefix}/profile`);
      return;
    }

    if (key === 'logout') {
      dispatch(logout());
      navigate('/login');
    }
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  return (
    <div className="app-header">
      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Space className="app-header__user" size={12}>
          <Avatar src={avatarSrc} size={42} />
          <div className="app-header__meta">
            <span className="app-header__account">{userInfo?.username || '未登录'}</span>
            <span className="app-header__role">{roleLabel}</span>
          </div>
        </Space>
      </Dropdown>
    </div>
  );
}
