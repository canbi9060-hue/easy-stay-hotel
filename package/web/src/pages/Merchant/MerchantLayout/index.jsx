import React from 'react';
import { Layout } from 'antd';
import './index.scss'; 
import LeftNav from '../../../components/LeftNav';
import Header from '../../../components/Header';



const {  Footer, Sider, Content } = Layout;

export default function MerchantLayout() {
    return (
      // 这里必须写 100vh，不要写 100%
      <Layout style={{ height: '100vh', margin: 0 }}>
        <Sider width="20%" className="sider">
          <LeftNav />
        </Sider>
        
        <Layout style={{ height: '100%' }}>        
          <Header />
          <Content className="content">Content</Content>
          <Footer className="footer">便捷管理，舒适体验，尽在易宿酒店管理系统</Footer>
        </Layout>
      </Layout>
    );
  }