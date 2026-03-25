import React from 'react';
import './index.scss';

// 公共认证布局组件（登录/注册/忘记密码共用）
const AuthLayout = ({ title, desc, children }) => {
  return (
    <div className="login">
      {/* 左侧背景区域 */}
      <div className="login-left">
        <div className="content-wrap">
          <h1 className="title">易宿酒店管理系统</h1>
          <p className="subtitleEn">HOTEL APPOINTMENT MANAGEMENT SYSTEM</p>
          <div className="divider"></div>
          <p className="slogan">便捷预约，舒适体验</p>
          <div className="divider"></div>
        </div>
      </div>

      {/* 右侧卡片区域 */}
      <div className="login-right">
        <div className="login-right-content">
          <h2 className="cardTitle">{title}</h2>
          <p className="cardDesc">{desc}</p>
          {/* 表单插槽 */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;