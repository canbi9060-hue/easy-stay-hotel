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
  name: item?.filePath?.split('/')?.pop() || 'certificate.png',
  status: 'done',
  url: resolveImageUrl(item?.filePath),
  response: item,
});

const renderGroupUploadArea = ({
  groupMeta,
  groupFileList,
  onFileListChange,
  onPreview,
  onDeleteCertificate,
  uploadHotelCertificate,
  beforeCertificateUpload,
  readOnly,
}) => {
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
      <Upload
        listType="picture-card"
        fileList={groupFileList}
        beforeUpload={beforeCertificateUpload}
        customRequest={handleUploadRequest}
        accept=".jpg,.jpeg,.png"
        disabled={readOnly}
        maxCount={groupMeta.maxCount}
        onChange={({ fileList }) => onFileListChange(groupMeta.key, fileList)}
        onPreview={onPreview}
        onRemove={async (file) => {
          if (readOnly) return false;
          const certificateId = file?.response?.id || Number(file?.uid);
          if (!certificateId) return false;
          try {
            await onDeleteCertificate(groupMeta.key, certificateId);
            return true;
          } catch (error) {
            return false;
          }
        }}
      >
        {groupFileList.length >= groupMeta.maxCount || readOnly ? null : (
          <button type="button" className="hotel-info__upload-trigger hotel-info__upload-trigger--certificate">
            <PlusOutlined />
            <span>上传附件</span>
          </button>
        )}
      </Upload>
    </div>
  );
};

export default function CertificatesModule({
  certificateGroups,
  certificateLoadError,
  onRetryLoadCertificates,
  hotelCertificates,
  onDeleteCertificate,
  uploadHotelCertificate,
  beforeCertificateUpload,
  actionsNode,
  resolveImageUrl,
  readOnly = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileListByGroup, setFileListByGroup] = useState({});

  useEffect(() => {
    const nextFileList = {};
    Object.keys(hotelCertificates || {}).forEach((groupKey) => {
      nextFileList[groupKey] = (hotelCertificates[groupKey] || []).map((item) => toUploadFileItem(item, resolveImageUrl));
    });
    setFileListByGroup(nextFileList);
  }, [hotelCertificates, resolveImageUrl]);

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
                    groupFileList: fileListByGroup[group.key] || [],
                    onFileListChange: handleFileListChange,
                    onPreview: handlePreview,
                    onDeleteCertificate,
                    uploadHotelCertificate,
                    beforeCertificateUpload,
                    readOnly,
                  }))}
              </div>
            ) : (
              <div className={`hotel-info__cert-row columns-${Math.min(section.columns || 1, 3)}`}>
                {renderGroupUploadArea({
                  groupMeta: section,
                  groupFileList: fileListByGroup[section.key] || [],
                  onFileListChange: handleFileListChange,
                  onPreview: handlePreview,
                  onDeleteCertificate,
                  uploadHotelCertificate,
                  beforeCertificateUpload,
                  readOnly,
                })}
              </div>
            )}

            {index < certificateGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
          </div>
        ))}
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
