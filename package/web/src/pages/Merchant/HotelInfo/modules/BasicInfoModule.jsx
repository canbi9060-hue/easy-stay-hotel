import React from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
} from 'antd';
import {
  ClockCircleFilled,
  EnvironmentOutlined,
} from '@ant-design/icons';

export default function BasicInfoModule({
  accommodationTypeOptions,
  starLevelOptions,
  countryOptions,
  provinceOptions,
  cityOptions,
  districtOptions,
  regionLoading,
  addressValue,
  handleProvinceChange,
  handleCityChange,
  handleDistrictChange,
  handleDetailInputChange,
  renderMapAlerts,
  previewMapContainerRef,
  handleSaveAddressDraft,
  setMapModalOpen,
  mapModalOpen,
  modalMapContainerRef,
  mapLoadError = '',
  mapStatusText,
  mapUnavailableReason = '',
  onMapModalAfterOpenChange,
  mapActionDisabled = false,
  validatePhone,
  validateEmail,
  MAX_INTRODUCTION_LENGTH,
  isOpen24Hours,
  handleOpen24HoursChange,
  readOnly = false,
}) {
  return (
    <>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <Card className="hotel-info__section-card">
            <Row gutter={[20, 20]}>
              <Col xs={24} md={12}>
                <Form.Item label="住宿类型" name="accommodationType" className="hotel-info__label-strong">
                  <Radio.Group optionType="button" buttonStyle="solid" className="hotel-info__radio-group">
                    {accommodationTypeOptions.map((option) => (
                      <Radio.Button key={option.value} value={option.value}>{option.label}</Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="星级" name="starLevel" className="hotel-info__label-strong">
                  <Select options={starLevelOptions} placeholder="请选择星级" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item className="hotel-info__label-strong hotel-info__label-no-required-mark" label="酒店名称" name="hotelName" rules={[{ required: true, message: '请输入酒店名称。' }]}>
                  <Input maxLength={100} placeholder="请输入酒店名称" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  className="hotel-info__label-strong hotel-info__label-no-required-mark"
                  label="酒店简介（选填）"
                  name="introduction"
                >
                  <Input.TextArea
                    maxLength={MAX_INTRODUCTION_LENGTH}
                    showCount
                    autoSize={{ minRows: 4, maxRows: 6 }}
                    placeholder="请输入酒店简介，如酒店特色、周边信息或服务亮点"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <div className="hotel-info__section-title">酒店地址</div>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12} lg={6}><Form.Item label="国家 / 地区" name={['address', 'country']}><Select options={countryOptions} disabled /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item label="省份" name={['address', 'province']} rules={[{ required: true, message: '请选择省份。' }]}><Select options={provinceOptions} placeholder="请选择省份" loading={regionLoading} onChange={handleProvinceChange} /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item label="城市" name={['address', 'city']} rules={[{ required: true, message: '请选择城市。' }]}><Select options={cityOptions} placeholder="请选择城市" loading={regionLoading} disabled={!addressValue?.province} onChange={handleCityChange} /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item label="区县" name={['address', 'district']} rules={[{ required: true, message: '请选择区县。' }]}><Select options={districtOptions} placeholder="请选择区县" loading={regionLoading} disabled={!addressValue?.city} onChange={handleDistrictChange} /></Form.Item></Col>
                </Row>
                <Form.Item name={['address', 'detail']} rules={[{ required: true, message: '请输入详细地址。' }]}>
                  <Input maxLength={200} placeholder="请输入详细地址" prefix={<EnvironmentOutlined />} onChange={handleDetailInputChange} />
                </Form.Item>

                {renderMapAlerts()}

                <div className="hotel-info__map-shell">
                  {mapUnavailableReason ? (
                    <div className="hotel-info__map-empty">
                      <div className="hotel-info__map-empty-content">
                        <div className="hotel-info__map-empty-title">地图功能不可用</div>
                        <div className="hotel-info__map-empty-desc">{mapUnavailableReason}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="hotel-info__map-preview" ref={previewMapContainerRef} />
                  )}
                  <Button className="hotel-info__map-save" onClick={handleSaveAddressDraft} disabled={readOnly || mapActionDisabled}>暂存定位</Button>
                  <Button className="hotel-info__map-expand" onClick={() => setMapModalOpen(true)} disabled={readOnly || mapActionDisabled}>展开地图</Button>
                  {!mapUnavailableReason && mapStatusText ? <div className="hotel-info__map-loading">{mapStatusText}</div> : null}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <div className="hotel-info__aside">
            <Card className="hotel-info__section-card hotel-info__info-card" title="联系方式">
              <Form.Item label="联系电话" name="contactPhone" rules={[{ validator: validatePhone }]}>
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item label="联系邮箱" name="contactEmail" rules={[{ validator: validateEmail }]}>
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Card>

            <Card className="hotel-info__section-card hotel-info__info-card" title={<><ClockCircleFilled />运营规则</>}>
              <div className="hotel-info__rule-header">
                <span>营业时间</span>
                <Form.Item name={['operationRules', 'isOpen24Hours']} valuePropName="checked" noStyle>
                  <Checkbox onChange={handleOpen24HoursChange}>24小时</Checkbox>
                </Form.Item>
              </div>
              <Row gutter={10}>
                <Col span={12}>
                  <Form.Item name={['operationRules', 'businessStartTime']}>
                    <Input type="time" disabled={Boolean(isOpen24Hours)} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['operationRules', 'businessEndTime']}>
                    <Input type="time" disabled={Boolean(isOpen24Hours)} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '14px 0' }} />

              <div className="hotel-info__rule-item">
                <span>入住规则</span>
                <Form.Item name={['operationRules', 'checkInTime']} style={{ marginBottom: 0 }}>
                  <Input type="time" />
                </Form.Item>
              </div>

              <div className="hotel-info__rule-item">
                <span>退房规则</span>
                <Form.Item name={['operationRules', 'checkOutTime']} style={{ marginBottom: 0 }}>
                  <Input type="time" />
                </Form.Item>
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      <Modal
        open={mapModalOpen}
        width={960}
        title="地图预览"
        footer={null}
        forceRender
        onCancel={() => setMapModalOpen(false)}
        afterOpenChange={onMapModalAfterOpenChange}
        destroyOnHidden
      >
        {mapUnavailableReason || mapLoadError ? (
          <Alert
            type="warning"
            showIcon
            message={mapUnavailableReason ? '地图不可用' : '地图加载失败'}
            description={mapUnavailableReason || mapLoadError}
          />
        ) : (
          <div className="hotel-info__map-shell hotel-info__map-shell--modal">
            <div className="hotel-info__map-modal" ref={modalMapContainerRef} />
            <Button className="hotel-info__map-save" onClick={handleSaveAddressDraft} disabled={readOnly}>暂存定位</Button>
            {mapStatusText ? <div className="hotel-info__map-loading">{mapStatusText}</div> : null}
          </div>
        )}
      </Modal>
    </>
  );
}
