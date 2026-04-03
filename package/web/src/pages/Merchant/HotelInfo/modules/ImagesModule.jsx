import React, { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Image, Upload } from 'antd';
import {
  createUploadRequestHandler,
  getBase64,
  normalizeUploadFileList,
  resolveUploadItemId,
  toUploadFileItem,
} from '../../../../utils/hotel-info/uploadUtils';

const mapGroupFileList = (hotelImages, hotelImageGroups, resolveImageUrl) =>
  hotelImageGroups.reduce((acc, groupMeta) => {
    acc[groupMeta.key] = (hotelImages[groupMeta.key] || []).map((item) => toUploadFileItem(item, resolveImageUrl, 'image.png'));
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
    setFileListByGroup((prev) => ({
      ...prev,
      [groupKey]: normalizeUploadFileList(nextFileList),
    }));
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

        {hotelImageGroups.map((groupMeta, groupIndex) => {
          const groupFileList = fileListByGroup[groupMeta.key] || [];

          const handleUploadRequest = createUploadRequestHandler(
            uploadHotelImage,
            groupMeta.key,
            '上传响应缺少图片 ID'
          );

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
                  const imageId = resolveUploadItemId(file);
                  if (!imageId) return false;
                  try {
                    await onDeleteImage(groupMeta.key, imageId);
                    return true;
                  } catch {
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
