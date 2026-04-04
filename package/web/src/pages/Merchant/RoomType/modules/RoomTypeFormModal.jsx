import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Upload,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { maxRoomTypeImageCount, roomTypeFacilitySuggestions } from '../../../../utils/room-type';

const { TextArea } = Input;

const getBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

export default function RoomTypeFormModal({
  form,
  open,
  mode,
  loading,
  submitting,
  imageFileList,
  statusNotice,
  onClose,
  onBeforeUpload,
  onRemoveImage,
  onSaveDraft,
  onSubmit,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const uploadButton = (
    <button type="button" className="room-type__upload-trigger">
      <PlusOutlined />
      <div>上传图片</div>
    </button>
  );

  const handlePreview = async (file) => {
    if (!file.url && !file.thumbUrl && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }

    setPreviewImage(file.url || file.thumbUrl || file.preview || '');
    setPreviewOpen(true);
  };

  return (
    <Form form={form} layout="vertical">
      <div className="room-type__modal-mask" style={{ display: open ? 'block' : 'none' }}>
        <div className="room-type__modal-shell">
          <div className="room-type__modal-header">
            <div>
              <h3>{mode === 'edit' ? '编辑房型' : '新增房型'}</h3>
              <p>提交后自动进入审核流程，审核通过后方可上架售卖。</p>
            </div>
            <Button onClick={onClose}>关闭</Button>
          </div>

          {statusNotice?.message ? (
            <Alert type={statusNotice.type} showIcon message={statusNotice.message} className="room-type__modal-alert" />
          ) : null}

          <Spin spinning={loading || submitting}>
            <div className="room-type__modal-content">
              <Card className="room-type__modal-card" title="基础设置">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="房型名称" name="roomName" rules={[{ required: true, message: '请输入房型名称' }]}>
                      <Input maxLength={60} placeholder="例如：豪华大床房" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="床型配置" name="bedConfig" rules={[{ required: true, message: '请输入床型配置' }]}>
                      <Input maxLength={100} placeholder="例如：1 张 2m 大床" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card className="room-type__modal-card" title="布局接待">
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item label="面积（㎡）" name="areaSize" rules={[{ required: true, message: '请输入房间面积' }]}>
                      <InputNumber min={1} precision={2} addonAfter="㎡" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="楼层说明" name="floorText" rules={[{ required: true, message: '请输入楼层说明' }]}>
                      <Input maxLength={60} placeholder="例如：12-18层" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Form.Item label="房间数量" name="roomCount" rules={[{ required: true, message: '请输入房间数量' }]}>
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Form.Item label="最多入住" name="maxGuests" rules={[{ required: true, message: '请输入最多入住人数' }]}>
                      <InputNumber min={1} precision={0} addonAfter="人" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card className="room-type__modal-card" title="描述设施">
                <Form.Item label="房型描述" name="description" rules={[{ required: true, message: '请输入房型描述' }]}>
                  <TextArea rows={4} maxLength={2000} placeholder="描述房型亮点、空间体验、适合人群等。" />
                </Form.Item>
                <Form.Item label="设施标签" name="facilityTags" rules={[{ required: true, message: '请至少填写 1 个设施标签' }]}>
                  <Select
                    mode="tags"
                    tokenSeparators={[',']}
                    options={roomTypeFacilitySuggestions.map((item) => ({ label: item, value: item }))}
                    placeholder="输入或选择房型设施标签"
                    maxTagCount="responsive"
                  />
                </Form.Item>
              </Card>

              <Card className="room-type__modal-card" title="图片管理">
                <div className="room-type__image-toolbar">
                  <span className="room-type__image-tip">最多 {maxRoomTypeImageCount} 张，支持 JPG/PNG，单张不超过 5MB。</span>
                </div>

                <Upload
                  accept="image/jpeg,image/png"
                  listType="picture-card"
                  fileList={imageFileList}
                  multiple
                  beforeUpload={onBeforeUpload}
                  onPreview={handlePreview}
                  onRemove={(file) => {
                    onRemoveImage(String(file.uid));
                    return false;
                  }}
                  className="room-type__image-upload"
                >
                  {imageFileList.length >= maxRoomTypeImageCount ? null : uploadButton}
                </Upload>
                {!imageFileList.length ? <div className="room-type__image-empty">请至少上传 1 张房型图片。</div> : null}
                {previewImage ? (
                  <Image
                    styles={{ root: { display: 'none' } }}
                    preview={{
                      open: previewOpen,
                      onOpenChange: (visible) => setPreviewOpen(visible),
                      afterOpenChange: (visible) => {
                        if (!visible) setPreviewImage('');
                      },
                    }}
                    src={previewImage}
                  />
                ) : null}
              </Card>

              <Card className="room-type__modal-card" title="定价">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="销售价" name="salePrice" rules={[{ required: true, message: '请输入销售价' }]}>
                      <InputNumber min={0.01} precision={2} addonBefore="￥" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="划线价" name="listPrice" rules={[{ required: true, message: '请输入划线价' }]}>
                      <InputNumber min={0.01} precision={2} addonBefore="￥" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </div>
          </Spin>

          <div className="room-type__modal-footer">
            <Button onClick={onSaveDraft} disabled={loading || submitting}>保存草稿</Button>
            <Button type="primary" onClick={onSubmit} loading={submitting}>提交审核</Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
