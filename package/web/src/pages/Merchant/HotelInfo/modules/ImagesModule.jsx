import React, { useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Image, Upload } from 'antd';

const getBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

export default function ImagesModule({
  hotelImageGroups,
  imageLoadError,
  onRetryLoadImages,
  hotelImages,
  onDeleteImage,
  beforeHotelImageUpload,
  toUploadFileItem,
  readOnly = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const fileListByGroup = useMemo(() =>
    hotelImageGroups.reduce((acc, groupMeta) => {
      acc[groupMeta.key] = hotelImages[groupMeta.key].map((item) => toUploadFileItem(item, 'image.png'));
      return acc;
    }, {}), [hotelImageGroups, hotelImages, toUploadFileItem]);

  const handlePreview = async (file) => {
    if (!file.url && !file.thumbUrl && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }

    setPreviewImage(file.url || file.thumbUrl || file.preview || '');
    setPreviewOpen(true);
  };

  const uploadButton = (
    <button type="button" className="hotel-info__upload-trigger">
      <PlusOutlined />
      <span>上传图片</span>
    </button>
  );

  return (
    <>
      <Card className="hotel-info__section-card hotel-info__images-card">
        {imageLoadError ? (
          <Alert
            type="warning"
            showIcon
            title={imageLoadError}
            action={(
              <Button type="link" size="small" onClick={onRetryLoadImages}>
                重试
              </Button>
            )}
            style={{ marginTop: 12 }}
          />
        ) : null}

        {hotelImageGroups.map((groupMeta, groupIndex) => {
          const groupFileList = fileListByGroup[groupMeta.key];

          return (
            <div className="hotel-info__image-group" key={groupMeta.key}>
              <h3 className="hotel-info__image-group-title">{groupMeta.title}</h3>
              <div className="hotel-info__image-group-meta">
                <p className="hotel-info__image-group-desc">{groupMeta.desc}</p>
                <p className="hotel-info__image-group-limit">最多上传 {groupMeta.maxCount} 张</p>
              </div>
              <Upload
                listType="picture-card"
                fileList={groupFileList}
                beforeUpload={(file) => beforeHotelImageUpload(groupMeta.key, file)}
                accept=".jpg,.jpeg,.png"
                disabled={readOnly}
                maxCount={groupMeta.maxCount}
                onPreview={handlePreview}
                onRemove={(file) => {
                  if (readOnly) return false;
                  onDeleteImage(groupMeta.key, String(file.uid));
                  return false;
                }}
              >
                {groupFileList.length >= groupMeta.maxCount || readOnly ? null : uploadButton}
              </Upload>

              {groupIndex < hotelImageGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
            </div>
          );
        })}
      </Card>
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
    </>
  );
}
