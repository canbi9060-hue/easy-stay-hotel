import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import {
  AuditOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  FileTextOutlined,
  LayoutOutlined,
  StarOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import logo from '../../assets/images/hotel.png';
import './index.scss';

const items = [
  { key: '/merchant/dashboard', icon: <BarChartOutlined />, label: '数据统计' },
  { key: '/merchant/hotel-info', icon: <BankOutlined />, label: '酒店信息' },
  { key: '/merchant/room-type', icon: <AppstoreOutlined />, label: '房型管理' },
  { key: '/merchant/room-detail', icon: <UnorderedListOutlined />, label: '房间管理' },
  { key: '/merchant/check-in', icon: <AuditOutlined />, label: '入住登记' },
  { key: '/merchant/order', icon: <FileTextOutlined />, label: '订单管理' },
  { key: '/merchant/customer', icon: <TeamOutlined />, label: '客户管理' },
  { key: '/merchant/review', icon: <StarOutlined />, label: '评价管理' },
  { key: '/merchant/housekeeping', icon: <ToolOutlined />, label: '房务管理' },
  { key: '/merchant/room-status', icon: <LayoutOutlined />, label: '房态图' },
];

export default function LeftNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <div className="left-nav">
      <div className="left-nav-header">
        <img src={logo} alt="logo" />
        <h1>易宿酒店管理系统</h1>
      </div>
      <Menu
        selectedKeys={[location.pathname]}
        mode="inline"
        theme="dark"
        items={items}
        onClick={handleMenuClick}
      />
    </div>
  );
}
