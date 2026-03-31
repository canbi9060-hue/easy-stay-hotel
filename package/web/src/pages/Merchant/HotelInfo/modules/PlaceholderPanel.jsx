import React from 'react';
import { Card } from 'antd';

export default function PlaceholderPanel({ activeTabMeta, placeholderCopy }) {
  return (
    <Card className="hotel-info__placeholder-card">
      <div className="hotel-info__placeholder-content">
        <span className="hotel-info__placeholder-eyebrow">功能建设中</span>
        <h3 className="hotel-info__placeholder-title">{activeTabMeta.label}</h3>
        <p className="hotel-info__placeholder-desc">
          {placeholderCopy[activeTabMeta.key] || '当前模块内容正在补充中，敬请期待。'}
        </p>
      </div>
    </Card>
  );
}
