import React from 'react';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Tag,
} from 'antd';

const facilityHintMap = {
  infrastructure: '（选填）请勾选酒店实际提供的客房与基础硬件设施。',
  entertainment: '（选填）请勾选住客可使用的娱乐休闲设施。',
  service: '（选填）请勾选酒店当前可稳定提供的服务能力。',
  specialty: '（选填）请勾选有明确配置的特色服务或特色空间。',
};

export default function FacilitiesModule({
  facilityCategoryList,
  customFacilityInput,
  setCustomFacilityInput,
  MAX_CUSTOM_FACILITY_LENGTH,
  handleAddCustomFacility,
  customFacilities,
  handleRemoveCustomFacility,
  readOnly = false,
}) {
  const normalizedCustomFacilities = Array.isArray(customFacilities) ? customFacilities : [];

  return (
    <>
      {facilityCategoryList.map((category) => (
        <Card className="hotel-info__section-card hotel-info__facility-card" key={category.key}>
          <div className="hotel-info__facility-header">
            <h3 className="hotel-info__facility-title">{category.label}（选填）</h3>
          </div>
          <p className="hotel-info__facility-hint">{facilityHintMap[category.key] || '（选填）请按实际情况勾选。'}</p>
          <Form.Item name={['facilitySelections', category.key]} style={{ marginBottom: 0 }}>
            <Checkbox.Group className="hotel-info__facility-options" disabled={readOnly}>
              {category.options.map((option) => (
                <Checkbox className="hotel-info__facility-option" key={option.value} value={option.value}>
                  {option.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Card>
      ))}

      <Card className="hotel-info__section-card hotel-info__facility-card hotel-info__facility-custom-card">
        <h3 className="hotel-info__facility-title">自定义设施（选填）</h3>
        <p className="hotel-info__facility-custom-desc">
          （选填）如果以上选项不包含你的设施，请在此手动输入后添加。
        </p>
        <div className="hotel-info__facility-custom-editor">
          <Input
            value={customFacilityInput}
            maxLength={MAX_CUSTOM_FACILITY_LENGTH}
            disabled={readOnly}
            onChange={(event) => setCustomFacilityInput(event.target.value)}
            onPressEnter={(event) => {
              event.preventDefault();
              if (readOnly) return;
              handleAddCustomFacility();
            }}
            placeholder="输入设施名称，如：直升机停机坪"
          />
          <Button type="primary" onClick={handleAddCustomFacility} disabled={readOnly}>添加设施</Button>
        </div>
        <div className="hotel-info__facility-custom-tags">
          {normalizedCustomFacilities.length ? (
            normalizedCustomFacilities.map((facilityName) => (
              <Tag
                key={facilityName}
                closable={!readOnly}
                onClose={(event) => {
                  event.preventDefault();
                  if (readOnly) return;
                  handleRemoveCustomFacility(facilityName);
                }}
              >
                {facilityName}
              </Tag>
            ))
          ) : (
            <span className="hotel-info__facility-custom-empty">暂无自定义设施</span>
          )}
        </div>
      </Card>
    </>
  );
}
