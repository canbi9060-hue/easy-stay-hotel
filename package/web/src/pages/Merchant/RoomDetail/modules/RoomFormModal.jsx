import React from 'react';
import { Form, Input, Modal, Select } from 'antd';
import {
  ROOM_SALES_STATUS,
  isRoomSalesStatusEditable,
  isRoomTypeChangeLocked,
  normalizeRoomSalesStatusByPhysicalStatus,
  roomManualSalesStatusFormOptions,
  roomFeatureTagOptions,
  roomPhysicalStatusFormOptions,
} from '../../../../utils/room-management';

const renderRoomTypeLabel = () => (
  <div className="room-detail__field-label-row">
    <span>绑定房型</span>
    <span className="room-detail__field-hint">仅显示审核通过且已上架的房型</span>
  </div>
);

export default function RoomFormModal({
  form,
  open,
  mode,
  room,
  floorOptions,
  roomTypeOptions,
  submitting,
  onCancel,
  onSubmit,
}) {
  const physicalStatus = Form.useWatch('physicalStatus', form);
  const salesStatusEditable = isRoomSalesStatusEditable(physicalStatus);
  const roomTypeLocked = Boolean(room && isRoomTypeChangeLocked(room));
  const isReservedRoom = mode === 'edit' && room?.salesStatus === ROOM_SALES_STATUS.RESERVED;
  const salesStatusOptions = React.useMemo(() => {
    if (!isReservedRoom) {
      return roomManualSalesStatusFormOptions;
    }
    return [
      {
        label: '已预订（仅可通过状态流转修改）',
        value: ROOM_SALES_STATUS.RESERVED,
        disabled: true,
      },
      ...roomManualSalesStatusFormOptions,
    ];
  }, [isReservedRoom]);

  return (
    <Modal
      open={open}
      forceRender
      title={(
        <div className="room-detail__modal-head">
          <h3>{mode === 'create' ? '新增房间' : '编辑房间'}</h3>
          <p>请完善下方房间的基础设置信息</p>
        </div>
      )}
      okText="保存房间"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={onSubmit}
      destroyOnHidden
      width={760}
      className="room-detail__form-modal"
    >
      <Form form={form} layout="vertical" className="room-detail__form">
        <div className="room-detail__form-grid">
          <Form.Item
            label="房间号"
            name="roomNumber"
            rules={[{ required: true, message: '请输入房间号' }]}
          >
            <Input placeholder="请输入房间号" maxLength={20} />
          </Form.Item>

          <Form.Item
            label="所属楼层"
            name="floorNumber"
            rules={[{ required: true, message: '请选择所属楼层' }]}
          >
            <Select options={floorOptions} placeholder="请选择" />
          </Form.Item>

          <Form.Item
            label={renderRoomTypeLabel()}
            name="roomTypeId"
            required
            className="room-detail__form-grid-item--full"
            extra={roomTypeLocked ? '当前房间已预订或入住，暂不允许改绑房型。' : null}
            rules={[{ required: true, message: '请选择绑定房型' }]}
          >
            <Select
              options={roomTypeOptions}
              placeholder="请选择房型"
              disabled={roomTypeLocked}
            />
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
            extra={
              isReservedRoom
                ? '已预订状态仅可通过“取消预订”或“办理入住”流转修改。'
                : (salesStatusEditable ? null : '非空净房态下，销售状态自动为不可售。')
            }
          >
            <Select
              options={salesStatusOptions}
              placeholder="请选择销售状态"
              disabled={!salesStatusEditable || isReservedRoom}
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
