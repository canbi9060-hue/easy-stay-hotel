import React, { useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Image, Upload } from 'antd';

const getBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

const renderGroupUploadArea = ({
  groupMeta,
  showGroupTitle = true,
  groupFileList,
  onPreview,
  onDeleteCertificate,
  beforeCertificateUpload,
  readOnly,
}) => (
  <div className="hotel-info__certificate-slot" key={groupMeta.key}>
    {showGroupTitle && groupMeta.title ? <h4 className="hotel-info__certificate-slot-title">{groupMeta.title}</h4> : null}
    {Number(groupMeta.maxCount) > 0 ? (
      <p className="hotel-info__certificate-slot-limit">最多上传 {groupMeta.maxCount} 张</p>
    ) : null}
    <Upload
      listType="picture-card"
      fileList={groupFileList}
      beforeUpload={(file) => beforeCertificateUpload(groupMeta.key, file)}
      accept=".jpg,.jpeg,.png"
      disabled={readOnly}
      maxCount={groupMeta.maxCount}
      onPreview={onPreview}
      onRemove={(file) => {
        if (readOnly) return false;
        onDeleteCertificate(groupMeta.key, String(file.uid));
        return false;
      }}
    >
      {groupFileList.length >= groupMeta.maxCount || readOnly ? null : (
        <button type="button" className="hotel-info__upload-trigger hotel-info__upload-trigger--certificate">
          <PlusOutlined />
          <span>上传图片</span>
        </button>
      )}
    </Upload>
  </div>
);

export default function CertificatesModule({
  certificateGroups,
  certificateLoadError,
  onRetryLoadCertificates,
  hotelCertificates,
  onDeleteCertificate,
  beforeCertificateUpload,
  toUploadFileItem,
  readOnly = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const fileListByGroup = useMemo(() =>
    Object.keys(hotelCertificates).reduce((acc, groupKey) => {
      acc[groupKey] = hotelCertificates[groupKey].map((item) => toUploadFileItem(item, 'certificate.png'));
      return acc;
    }, {}), [hotelCertificates, toUploadFileItem]);

  const handlePreview = async (file) => {
    if (!file.url && !file.thumbUrl && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }

    setPreviewImage(file.url || file.thumbUrl || file.preview || '');
    setPreviewOpen(true);
  };

  return (
    <>
      <Card className="hotel-info__section-card hotel-info__cert-card">
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

        {certificateGroups.map((section, index) => (
          <div className="hotel-info__cert-section" key={section.key}>
            <div className="hotel-info__cert-header">
              <h3 className="hotel-info__cert-title">
                {section.key === 'other_qualification' ? `${section.title}（选填）` : section.title}
              </h3>
              {section.subtitle ? <span className="hotel-info__cert-subtitle">{section.subtitle}</span> : null}
            </div>

            {Array.isArray(section.children) && section.children.length ? (
              <div className={`hotel-info__cert-row columns-${Math.min(section.children.length, 3)}`}>
                {section.children.map((group) =>
                  renderGroupUploadArea({
                    groupMeta: group,
                    showGroupTitle: true,
                    groupFileList: fileListByGroup[group.key],
                    onPreview: handlePreview,
                    onDeleteCertificate,
                    beforeCertificateUpload,
                    readOnly,
                  }))}
              </div>
            ) : (
              <div className={`hotel-info__cert-row columns-${Math.min(section.columns || 1, 3)}`}>
                {renderGroupUploadArea({
                  groupMeta: section,
                  showGroupTitle: false,
                  groupFileList: fileListByGroup[section.key],
                  onPreview: handlePreview,
                  onDeleteCertificate,
                  beforeCertificateUpload,
                  readOnly,
                })}
              </div>
            )}

            {index < certificateGroups.length - 1 ? <Divider style={{ margin: '24px 0 0' }} /> : null}
          </div>
        ))}
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
