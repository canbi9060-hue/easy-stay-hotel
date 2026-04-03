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

const mapGroupFileList = (hotelCertificates, resolveImageUrl) =>
  Object.keys(hotelCertificates || {}).reduce((acc, groupKey) => {
    acc[groupKey] = (hotelCertificates[groupKey] || []).map((item) => toUploadFileItem(item, resolveImageUrl, 'certificate.png'));
    return acc;
  }, {});

const renderGroupUploadArea = ({
  groupMeta,
  showGroupTitle = true,
  groupFileList,
  onFileListChange,
  onPreview,
  onDeleteCertificate,
  uploadHotelCertificate,
  beforeCertificateUpload,
  readOnly,
}) => {
  const handleUploadRequest = createUploadRequestHandler(
    uploadHotelCertificate,
    groupMeta.key,
    '上传响应缺少证件 ID'
  );

  return (
    <div className="hotel-info__certificate-slot" key={groupMeta.key}>
      {showGroupTitle && groupMeta.title ? <h4 className="hotel-info__certificate-slot-title">{groupMeta.title}</h4> : null}
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
        onChange={({ fileList }) => onFileListChange(groupMeta.key, normalizeUploadFileList(fileList))}
        onPreview={onPreview}
        onRemove={async (file) => {
          if (readOnly) return false;
          const certificateId = resolveUploadItemId(file);
          if (!certificateId) return false;
          try {
            await onDeleteCertificate(groupMeta.key, certificateId);
            return true;
          } catch {
            return false;
          }
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
    setFileListByGroup(mapGroupFileList(hotelCertificates, resolveImageUrl));
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
              <h3 className="hotel-info__cert-title">{section.title}</h3>
              {section.subtitle ? <span className="hotel-info__cert-subtitle">{section.subtitle}</span> : null}
            </div>

            {Array.isArray(section.children) && section.children.length ? (
              <div className={`hotel-info__cert-row columns-${Math.min(section.children.length, 3)}`}>
                {section.children.map((group) =>
                  renderGroupUploadArea({
                    groupMeta: group,
                    showGroupTitle: true,
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
                  showGroupTitle: false,
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
