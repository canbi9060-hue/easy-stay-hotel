import React from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Progress,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';

export default function ImagesModule({
  hotelImageGroups,
  imageLoadError,
  onRetryLoadImages,
  hotelImages,
  uploadingByGroup,
  failedUploadByGroup,
  sortingByGroup,
  deletingImageIds,
  dragOverTargetByGroup,
  onDragStartImage,
  onDragOverImage,
  onDragLeaveImage,
  onDropImage,
  onDragEndImage,
  onPreviewImage,
  onDeleteImage,
  uploadHotelImage,
  beforeHotelImageUpload,
  actionsNode,
  resolveImageUrl,
  readOnly = false,
}) {
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
          const groupList = hotelImages[groupMeta.key] || [];
          const uploadingInfo = uploadingByGroup[groupMeta.key];
          const failedInfo = failedUploadByGroup[groupMeta.key];
          const canUpload = groupList.length < groupMeta.maxCount && !uploadingInfo && !readOnly;
          const groupSorting = Boolean(sortingByGroup[groupMeta.key]);

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

              <div className="hotel-info__image-grid">
                {groupList.map((item) => {
                  const imageUrl = resolveImageUrl(item.filePath);
                  const isDeleting = Boolean(deletingImageIds[item.id]);
                  const isDragOver = dragOverTargetByGroup[groupMeta.key] === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`hotel-info__image-item ${isDragOver ? 'is-drag-over' : ''}`}
                      draggable={!groupSorting && !readOnly}
                      onDragStart={() => onDragStartImage(groupMeta.key, item.id, groupSorting || readOnly)}
                      onDragOver={(event) => onDragOverImage(event, groupMeta.key, item.id, groupSorting || readOnly)}
                      onDragLeave={() => onDragLeaveImage(groupMeta.key)}
                      onDrop={(event) => {
                        if (readOnly) return;
                        onDropImage(event, groupMeta.key, item.id);
                      }}
                      onDragEnd={() => onDragEndImage(groupMeta.key)}
                    >
                      <img src={imageUrl} alt={groupMeta.title} />
                      <div className="hotel-info__image-item-mask">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => onPreviewImage(imageUrl, groupMeta.title)}
                        >
                          预览
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          loading={isDeleting}
                          disabled={isDeleting || readOnly}
                          onClick={() => onDeleteImage(groupMeta.key, item.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {uploadingInfo ? (
                  <div className="hotel-info__image-item hotel-info__image-item--uploading">
                    <div className="hotel-info__image-uploading-title">
                      <LoadingOutlined /> 上传中
                    </div>
                    <div className="hotel-info__image-uploading-name">{uploadingInfo.fileName}</div>
                    <Progress percent={Math.max(1, Math.min(99, Number(uploadingInfo.percent) || 0))} size="small" />
                  </div>
                ) : null}

                {failedInfo ? (
                  <div className="hotel-info__image-item hotel-info__image-item--error">
                    <div className="hotel-info__image-error-title">上传失败，请重新上传</div>
                    <div className="hotel-info__image-error-name">{failedInfo.fileName}</div>
                    <Button
                      type="link"
                      onClick={async () => {
                        try {
                          await uploadHotelImage(groupMeta.key, failedInfo.file);
                        } catch (error) {
                          // 错误提示已在上传方法内处理
                        }
                      }}
                    >
                      重新上传
                    </Button>
                  </div>
                ) : null}

                {canUpload ? (
                  <Upload
                    showUploadList={false}
                    beforeUpload={beforeHotelImageUpload}
                    customRequest={handleUploadRequest}
                    accept=".jpg,.jpeg,.png"
                    disabled={groupSorting || readOnly}
                  >
                    <button type="button" className="hotel-info__upload-trigger" disabled={groupSorting || readOnly}>
                      <PlusOutlined />
                      <span>上传图片</span>
                    </button>
                  </Upload>
                ) : null}
              </div>

              {groupIndex < hotelImageGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
            </div>
          );
        })}
      </Card>
      {actionsNode}
    </>
  );
}
