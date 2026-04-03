import React from 'react';
import { Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import './index.scss';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-page__bg-glow not-found-page__bg-glow--left" />
      <div className="not-found-page__bg-glow not-found-page__bg-glow--right" />

      <div className="not-found-page__card">
        <div className="not-found-page__code">404</div>
        <h1 className="not-found-page__title">页面走丢了</h1>
        <p className="not-found-page__desc">
          抱歉，你访问的页面不存在或已被移动。
          <br />
          你可以返回上一页，或前往登录页重新开始。
        </p>

        <div className="not-found-page__actions">
          <Button type="primary" size="large" onClick={() => navigate(-1)}>
            返回上一页
          </Button>
          <Button size="large">
            <Link to="/login">前往登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
