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

const renderGroupUploadArea = ({
  groupMeta,
  hotelCertificates,
  uploadingByGroup,
  failedUploadByGroup,
  deletingCertificateIds,
  onPreviewCertificate,
  onDeleteCertificate,
  uploadHotelCertificate,
  beforeCertificateUpload,
  resolveImageUrl,
  readOnly,
}) => {
  const groupList = hotelCertificates[groupMeta.key] || [];
  const uploadingInfo = uploadingByGroup[groupMeta.key];
  const failedInfo = failedUploadByGroup[groupMeta.key];
  const canUpload = groupList.length < groupMeta.maxCount && !uploadingInfo && !readOnly;

  const handleUploadRequest = async ({ file, onSuccess, onError, onProgress }) => {
    try {
      await uploadHotelCertificate(groupMeta.key, file, (percent) => onProgress?.({ percent }));
      onSuccess?.({}, file);
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <div className="hotel-info__certificate-slot" key={groupMeta.key}>
      {groupMeta.title ? <h4 className="hotel-info__certificate-slot-title">{groupMeta.title}</h4> : null}
      {Number(groupMeta.maxCount) > 0 ? (
        <p className="hotel-info__certificate-slot-limit">最多上传 {groupMeta.maxCount} 张</p>
      ) : null}
      <div className="hotel-info__image-grid hotel-info__image-grid--certificate">
        {groupList.map((item) => {
          const imageUrl = resolveImageUrl(item.filePath);
          const isDeleting = Boolean(deletingCertificateIds[item.id]);
          return (
            <div key={item.id} className="hotel-info__image-item">
              <img src={imageUrl} alt={groupMeta.title || '资质证件'} />
              <div className="hotel-info__image-item-mask">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onPreviewCertificate(imageUrl, groupMeta.title || '资质证件')}
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
                  onClick={() => onDeleteCertificate(groupMeta.key, item.id)}
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
              disabled={readOnly}
              onClick={async () => {
                if (readOnly) return;
                try {
                  await uploadHotelCertificate(groupMeta.key, failedInfo.file);
                } catch (error) {
                  // 错误提示已在上传方法里处理
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
            beforeUpload={beforeCertificateUpload}
            customRequest={handleUploadRequest}
            accept=".jpg,.jpeg,.png"
            disabled={readOnly}
          >
            <button type="button" className="hotel-info__upload-trigger hotel-info__upload-trigger--certificate" disabled={readOnly}>
              <PlusOutlined />
              <span>上传附件</span>
            </button>
          </Upload>
        ) : null}
      </div>
    </div>
  );
};

export default function CertificatesModule({
  certificateGroups,
  certificateLoadError,
  onRetryLoadCertificates,
  hotelCertificates,
  uploadingByGroup,
  failedUploadByGroup,
  deletingCertificateIds,
  onPreviewCertificate,
  onDeleteCertificate,
  uploadHotelCertificate,
  beforeCertificateUpload,
  actionsNode,
  resolveImageUrl,
  readOnly = false,
}) {
  return (
    <>
      <Card className="hotel-info__section-card hotel-info__cert-card">
        <div className="hotel-info__cert-headline">资质证件管理区</div>
        <p className="hotel-info__cert-hint">
          请上传真实、清晰的资质证件图片，单个文件限制 5MB，支持 JPG/PNG 格式。
        </p>
        {certificateLoadError ? (
          <Alert
            type="warning"
            showIcon
            message={certificateLoadError}
            action={(
              <Button type="link" size="small" onClick={onRetryLoadCertificates}>
                重试
              </Button>
            )}
            style={{ marginBottom: 12 }}
          />
        ) : null}
        <Divider style={{ margin: '16px 0 22px' }} />

        {certificateGroups.map((section, index) => (
          <div className="hotel-info__cert-section" key={section.key}>
            <div className="hotel-info__cert-header">
              <h3 className="hotel-info__cert-title">{section.title}</h3>
              {section.subtitle ? <span className="hotel-info__cert-subtitle">{section.subtitle}</span> : null}
            </div>

            {Array.isArray(section.children) && section.children.length ? (
              <div className={`hotel-info__cert-row columns-${Math.min(section.children.length, 3)}`}>
                {section.children.map((group) =>
                  renderGroupUploadArea({
                    groupMeta: group,
                    hotelCertificates,
                    uploadingByGroup,
                    failedUploadByGroup,
                    deletingCertificateIds,
                    onPreviewCertificate,
                    onDeleteCertificate,
                    uploadHotelCertificate,
                    beforeCertificateUpload,
                    resolveImageUrl,
                    readOnly,
                  }))}
              </div>
            ) : (
              <div className={`hotel-info__cert-row columns-${Math.min(section.columns || 1, 3)}`}>
                {renderGroupUploadArea({
                  groupMeta: section,
                  hotelCertificates,
                  uploadingByGroup,
                  failedUploadByGroup,
                  deletingCertificateIds,
                  onPreviewCertificate,
                  onDeleteCertificate,
                  uploadHotelCertificate,
                  beforeCertificateUpload,
                  resolveImageUrl,
                  readOnly,
                })}
              </div>
            )}

            {index < certificateGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
          </div>
        ))}
      </Card>
      {actionsNode}
    </>
  );
}
