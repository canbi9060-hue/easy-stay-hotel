import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export default function RoomPageHeader({
  onCreate,
  onBatchGenerate,
  createDisabled,
}) {
  return (
    <div className="room-detail__page-head">
      <div>
        <h2 className="room-detail__title">房间管理</h2>
        <p className="room-detail__subtitle">管理酒店所有客房状态、分配及设施维护。</p>
      </div>
      <div className="room-detail__page-head-actions">
        <Button onClick={onBatchGenerate} disabled={createDisabled}>
          批量生成房间
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
          disabled={createDisabled}
        >
          新增房间
        </Button>
      </div>
    </div>
  );
}
