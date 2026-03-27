import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

import LeftNav from '../../../components/LeftNav';
import Header from '../../../components/Header';
import './index.scss';

const { Footer, Sider, Content } = Layout;

export default function MerchantLayout() {
  return (
    <Layout style={{ minHeight: '100vh', margin: 0 }}>
      <Sider width="20%" className="sider">
        <LeftNav />
      </Sider>

      <Layout className="merchant-main">
        <Header />
        <Content className="content">
          <Outlet />
        </Content>
        <Footer className="footer">便捷管理，舒适体验，尽在易宿酒店管理系统</Footer>
      </Layout>
    </Layout>
  );
}
