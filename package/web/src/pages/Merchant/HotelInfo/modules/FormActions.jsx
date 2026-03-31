import React from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

export default function FormActions({
  saving,
  submitting,
  onSave,
  onSubmit,
  onPrev,
  onNext,
  showPrev = false,
  showNext = false,
  prevDisabled = false,
  nextDisabled = false,
  showSubmit = true,
  submitDisabled = false,
  saveDisabled = false,
}) {
  return (
    <div className="hotel-info__actions">
      {showPrev ? (
        <Button onClick={onPrev} icon={<LeftOutlined />} disabled={prevDisabled}>
          上一页
        </Button>
      ) : null}
      <Button onClick={onSave} loading={saving} disabled={saveDisabled}>
        保存
      </Button>
      {showNext ? (
        <Button onClick={onNext} icon={<RightOutlined />} disabled={nextDisabled}>
          下一页
        </Button>
      ) : null}
      {showSubmit ? (
        <Button type="primary" onClick={onSubmit} loading={submitting} disabled={submitDisabled}>
          提交审核
        </Button>
      ) : null}
    </div>
  );
}
