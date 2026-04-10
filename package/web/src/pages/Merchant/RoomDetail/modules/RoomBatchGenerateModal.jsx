import React from 'react';
import { Form, Input, Modal, Select } from 'antd';
import {
  batchGenerateCountOptions,
  isRoomSalesStatusEditable,
  normalizeRoomSalesStatusByPhysicalStatus,
  roomManualSalesStatusFormOptions,
  roomFeatureTagOptions,
  roomPhysicalStatusFormOptions,
} from '../../../../utils/room-management';

export default function RoomBatchGenerateModal({
  form,
  open,
  floorOptions,
  roomTypeOptions,
  submitting,
  onCancel,
  onSubmit,
}) {
  const selectedFloors = Form.useWatch('floorNumbers', form) || [];
  const physicalStatus = Form.useWatch('physicalStatus', form);
  const salesStatusEditable = isRoomSalesStatusEditable(physicalStatus);
  const prefixDisabled = selectedFloors.length !== 1;

  return (
    <Modal
      open={open}
      forceRender
      title={(
        <div className="room-detail__modal-head">
          <h3>批量生成房间</h3>
          <p>请选择房型、楼层和编号规则，系统将按当前配置批量生成房间。</p>
        </div>
      )}
      okText="生成房间"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={onSubmit}
      destroyOnHidden
      width={820}
      className="room-detail__form-modal"
    >
      <Form form={form} layout="vertical" className="room-detail__form">
        <div className="room-detail__form-grid">
          <Form.Item
            label="房型"
            name="roomTypeId"
            className="room-detail__form-grid-item--full"
            rules={[{ required: true, message: '请选择房型' }]}
            extra="仅显示审核通过且已上架的房型"
          >
            <Select options={roomTypeOptions} placeholder="请选择房型" />
          </Form.Item>

          <Form.Item
            label="楼层"
            name="floorNumbers"
            rules={[{ required: true, message: '请至少选择一个楼层' }]}
          >
            <Select
              mode="multiple"
              maxTagCount="responsive"
              options={floorOptions}
              placeholder="请选择楼层"
            />
          </Form.Item>

          <Form.Item
            label="房号前缀"
            name="roomPrefix"
            extra={prefixDisabled ? '多楼层时将自动按楼层号作为房号前缀。' : '单楼层时可自定义房号前缀。'}
          >
            <Input
              placeholder={prefixDisabled ? '多楼层自动生成前缀' : '例如：B'}
              maxLength={20}
              disabled={prefixDisabled}
            />
          </Form.Item>

          <Form.Item
            label="起始编号"
            name="startNumber"
            rules={[{ required: true, message: '请输入起始编号' }]}
          >
            <Input placeholder="例如：01" maxLength={10} />
          </Form.Item>

          <Form.Item
            label="生成房间数"
            name="generateCount"
            rules={[{ required: true, message: '请选择生成房间数' }]}
          >
            <Select options={batchGenerateCountOptions} placeholder="请选择" />
          </Form.Item>

          <Form.Item
            label="物理房态"
            name="physicalStatus"
            rules={[{ required: true, message: '请选择物理房态' }]}
          >
            <Select
              options={roomPhysicalStatusFormOptions}
              placeholder="请选择物理房态"
              onChange={(value) => {
                form.setFieldValue(
                  'salesStatus',
                  normalizeRoomSalesStatusByPhysicalStatus(value, form.getFieldValue('salesStatus'))
                );
              }}
            />
          </Form.Item>

          <Form.Item
            label="销售状态"
            name="salesStatus"
            rules={[{ required: true, message: '请选择销售状态' }]}
            extra={salesStatusEditable ? null : '非空净房态下，销售状态自动为不可售。'}
          >
            <Select
              options={roomManualSalesStatusFormOptions}
              placeholder="请选择销售状态"
              disabled={!salesStatusEditable}
            />
          </Form.Item>

          <Form.Item
            label="房间特性"
            name="featureTags"
            className="room-detail__form-grid-item--full"
          >
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              options={roomFeatureTagOptions}
              placeholder="请选择房间特性"
            />
          </Form.Item>

          <Form.Item
            label="设备备注"
            name="deviceRemark"
            className="room-detail__form-grid-item--full"
          >
            <Input.TextArea
              rows={4}
              maxLength={50}
              showCount
              placeholder="请输入房间设备状况或特殊备注"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
