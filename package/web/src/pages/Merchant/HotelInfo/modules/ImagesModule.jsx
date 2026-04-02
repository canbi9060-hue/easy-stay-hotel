import React, { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Image, Upload } from 'antd';

const getBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

const toUploadFileItem = (item, resolveImageUrl) => ({
  uid: String(item?.id),
  name: item?.filePath?.split('/')?.pop() || 'image.png',
  status: 'done',
  url: resolveImageUrl(item?.filePath),
  response: item,
});

const mapGroupFileList = (hotelImages, hotelImageGroups, resolveImageUrl) =>
  hotelImageGroups.reduce((acc, groupMeta) => {
    acc[groupMeta.key] = (hotelImages[groupMeta.key] || []).map((item) => toUploadFileItem(item, resolveImageUrl));
    return acc;
  }, {});

export default function ImagesModule({
  hotelImageGroups,
  imageLoadError,
  onRetryLoadImages,
  hotelImages,
  onDeleteImage,
  uploadHotelImage,
  beforeHotelImageUpload,
  actionsNode,
  resolveImageUrl,
  readOnly = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileListByGroup, setFileListByGroup] = useState({});

  useEffect(() => {
    setFileListByGroup(mapGroupFileList(hotelImages, hotelImageGroups, resolveImageUrl));
  }, [hotelImageGroups, hotelImages, resolveImageUrl]);

  const handleFileListChange = (groupKey, nextFileList) => {
    setFileListByGroup((prev) => ({ ...prev, [groupKey]: nextFileList }));
  };

  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || '');
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
        <div className="hotel-info__images-headline">酒店图片管理区</div>
        <p className="hotel-info__images-hint">
          请上传真实、高清的酒店照片，建议尺寸 1920x1080px。单个文件限制 5MB，支持 JPG/PNG 格式。
        </p>
        {imageLoadError ? (
          <Alert
            type="warning"
            showIcon
            message={imageLoadError}
            action={(
              <Button type="link" size="small" onClick={onRetryLoadImages}>
                重试
              </Button>
            )}
            style={{ marginTop: 12 }}
          />
        ) : null}
        <Divider style={{ margin: '16px 0 22px' }} />

        {hotelImageGroups.map((groupMeta, groupIndex) => {
          const groupFileList = fileListByGroup[groupMeta.key] || [];

          const handleUploadRequest = async ({ file, onSuccess, onError, onProgress }) => {
            try {
              await uploadHotelImage(groupMeta.key, file, (percent) => onProgress?.({ percent }));
              onSuccess?.({}, file);
            } catch (error) {
              onError?.(error);
            }
          };

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
                beforeUpload={beforeHotelImageUpload}
                customRequest={handleUploadRequest}
                accept=".jpg,.jpeg,.png"
                disabled={readOnly}
                maxCount={groupMeta.maxCount}
                onChange={({ fileList }) => handleFileListChange(groupMeta.key, fileList)}
                onPreview={handlePreview}
                onRemove={async (file) => {
                  if (readOnly) return false;
                  const imageId = file?.response?.id || Number(file?.uid);
                  if (!imageId) return false;
                  try {
                    await onDeleteImage(groupMeta.key, imageId);
                    return true;
                  } catch (error) {
                    return false;
                  }
                }}
              >
                {groupFileList.length >= groupMeta.maxCount || readOnly ? null : uploadButton}
              </Upload>

              {groupIndex < hotelImageGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
            </div>
          );
        })}
      </Card>
      {actionsNode}

      {previewImage ? (
        <Image
          style={{ display: 'none' }}
          preview={{
            open: previewOpen,
            onOpenChange: setPreviewOpen,
            afterOpenChange: (open) => {
              if (!open) setPreviewImage('');
            },
          }}
          src={previewImage}
        />
      ) : null}
    </>
  );
}
