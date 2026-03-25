import React, { useState } from 'react';
import logo from '../../assets/images/hotel.png'
import './index.scss'

import {  
    ContainerOutlined,
    DesktopOutlined,
    PieChartOutlined,
} from '@ant-design/icons';
import {  Menu } from 'antd';
const items = [
    { key: '1', icon: <PieChartOutlined />, label: '数据统计' },
    { key: '2', icon: <DesktopOutlined />, label: '酒店信息' },
    { key: '3', icon: <ContainerOutlined />, label: '房型管理' },
    { key: '4', icon: <ContainerOutlined />, label: '房间明细' },
    { key: '5', icon: <ContainerOutlined />, label: '订单管理' },
    { key: '6', icon: <ContainerOutlined />, label: '客户管理' },
    { key: '7', icon: <ContainerOutlined />, label: '评价管理' },
    { key: '8', icon: <ContainerOutlined />, label: '房务管理' },
    { key: '9', icon: <ContainerOutlined />, label: '房态图' },
   
];

export default function LeftNav() {
    const [collapsed, setCollapsed] = useState(false);
    
    return (

        <div className="left-nav">
            <div className="left-nav-header">
                <img src={logo} alt="logo" />
                <h1>易宿酒店管理系统</h1>
            </div>
            <div >
               
                <Menu
                    defaultSelectedKeys={['1']}
                    defaultOpenKeys={['sub1']}
                    mode="inline"
                    theme="dark"
                    inlineCollapsed={collapsed}
                    items={items}
                />
            </div>
        </div>
    )
}