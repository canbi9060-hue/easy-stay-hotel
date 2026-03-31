import { useCallback, useState } from 'react';
import { Upload, message } from 'antd';

import {
  deleteMerchantHotelCertificateAPI,
  getMerchantHotelCertificatesAPI,
  uploadMerchantHotelCertificateAPI,
} from '../../../../utils/request';
import {
  certificateLeafGroups,
  createEmptyHotelCertificates,
  normalizeHotelCertificatesPayload,
  removeKey,
} from '../modules/constants';

const defaultCertificateLoadMessageKey = 'merchant-hotel-certificate-load-error';

export default function useHotelCertificatesManager({
  getErrorMessage,
  certificateLoadMessageKey = defaultCertificateLoadMessageKey,
}) {
  const [hotelCertificates, setHotelCertificates] = useState(createEmptyHotelCertificates);
  const [uploadingByGroup, setUploadingByGroup] = useState({});
  const [failedUploadByGroup, setFailedUploadByGroup] = useState({});
  const [certificateLoadError, setCertificateLoadError] = useState('');
  const [deletingCertificateIds, setDeletingCertificateIds] = useState({});
  const [certificatePreview, setCertificatePreview] = useState({
    open: false,
    url: '',
    title: '',
  });

  const beforeCertificateUpload = useCallback((file) => {
    const isValidType = ['image/jpeg', 'image/png'].includes(file?.type);
    if (!isValidType) {
      message.error('仅支持 JPG/PNG 格式图片。');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 5) {
      message.error('单张图片不能超过 5MB。');
      return Upload.LIST_IGNORE;
    }
    return true;
  }, []);

  const uploadHotelCertificate = useCallback(
    async (groupKey, file, onProgress) => {
      const groupMeta = certificateLeafGroups.find((group) => group.key === groupKey);
      if (!groupMeta) return;
      const currentList = hotelCertificates[groupKey] || [];
      if (currentList.length >= groupMeta.maxCount) {
        message.warning(`${groupMeta.title}最多上传 ${groupMeta.maxCount} 张。`);
        return;
      }

      setFailedUploadByGroup((prev) => {
        if (!prev[groupKey]) return prev;
        return removeKey(prev, groupKey);
      });
      setUploadingByGroup((prev) => ({
        ...prev,
        [groupKey]: {
          file,
          fileName: file?.name || '证件上传中',
          percent: 0,
        },
      }));

      try {
        const formData = new FormData();
        formData.append('group', groupKey);
        formData.append('image', file);

        const uploadRes = await uploadMerchantHotelCertificateAPI(formData, ({ loaded, total }) => {
          const percent = total ? Math.max(1, Math.min(100, Math.round((loaded / total) * 100))) : 0;
          setUploadingByGroup((prev) => ({
            ...prev,
            [groupKey]: {
              ...prev[groupKey],
              file,
              fileName: file?.name || '证件上传中',
              percent,
            },
          }));
          if (typeof onProgress === 'function') {
            onProgress(percent);
          }
        });

        setHotelCertificates((prev) => ({
          ...prev,
          [groupKey]: [...(prev[groupKey] || []), uploadRes?.data?.image].filter(Boolean),
        }));
        message.success('资质证件上传成功。');
      } catch (error) {
        const errorMsg = getErrorMessage(error, '资质证件上传失败。');
        setFailedUploadByGroup((prev) => ({
          ...prev,
          [groupKey]: {
            file,
            fileName: file?.name || '上传失败证件',
            errorMsg,
          },
        }));
        message.error(errorMsg);
        throw error;
      } finally {
        setUploadingByGroup((prev) => {
          if (!prev[groupKey]) return prev;
          return removeKey(prev, groupKey);
        });
      }
    },
    [getErrorMessage, hotelCertificates]
  );

  const handleDeleteHotelCertificate = useCallback(
    async (groupKey, certificateId) => {
      if (deletingCertificateIds[certificateId]) {
        return;
      }

      const groupSnapshot = hotelCertificates[groupKey] || [];
      setDeletingCertificateIds((prev) => ({ ...prev, [certificateId]: true }));
      setHotelCertificates((prev) => ({
        ...prev,
        [groupKey]: (prev[groupKey] || []).filter((item) => item.id !== certificateId),
      }));

      try {
        await deleteMerchantHotelCertificateAPI(certificateId);
        message.success('资质证件删除成功。');
      } catch (error) {
        setHotelCertificates((prev) => ({
          ...prev,
          [groupKey]: groupSnapshot,
        }));
        message.error(getErrorMessage(error, '删除资质证件失败。'));
      } finally {
        setDeletingCertificateIds((prev) => removeKey(prev, certificateId));
      }
    },
    [deletingCertificateIds, getErrorMessage, hotelCertificates]
  );

  const handleCertificatePreview = useCallback((url, title) => {
    setCertificatePreview({ open: true, url, title });
  }, []);

  const closeCertificatePreview = useCallback(() => {
    setCertificatePreview({ open: false, url: '', title: '' });
  }, []);

  const loadHotelCertificates = useCallback(
    async ({ notify = false } = {}) => {
      try {
        const certificateRes = await getMerchantHotelCertificatesAPI();
        setHotelCertificates(normalizeHotelCertificatesPayload(certificateRes?.data));
        setCertificateLoadError('');
        return true;
      } catch (error) {
        const errorMsg = getErrorMessage(error, '获取资质证件失败，请稍后重试');
        setHotelCertificates(createEmptyHotelCertificates());
        setCertificateLoadError(errorMsg);
        if (notify) {
          message.open({
            key: certificateLoadMessageKey,
            type: 'warning',
            content: errorMsg,
          });
        }
        return false;
      }
    },
    [certificateLoadMessageKey, getErrorMessage]
  );

  const handleRetryLoadCertificates = useCallback(() => {
    loadHotelCertificates({ notify: true });
  }, [loadHotelCertificates]);

  const resetHotelCertificatesState = useCallback(() => {
    setHotelCertificates(createEmptyHotelCertificates());
    setUploadingByGroup({});
    setFailedUploadByGroup({});
    setCertificateLoadError('');
    setDeletingCertificateIds({});
    setCertificatePreview({ open: false, url: '', title: '' });
  }, []);

  return {
    hotelCertificates,
    uploadingByGroup,
    failedUploadByGroup,
    certificateLoadError,
    deletingCertificateIds,
    certificatePreview,
    beforeCertificateUpload,
    uploadHotelCertificate,
    handleDeleteHotelCertificate,
    handleCertificatePreview,
    closeCertificatePreview,
    loadHotelCertificates,
    handleRetryLoadCertificates,
    resetHotelCertificatesState,
  };
}
