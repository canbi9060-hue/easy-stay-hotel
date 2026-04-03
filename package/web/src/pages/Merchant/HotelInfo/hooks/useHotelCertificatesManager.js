import { useCallback, useState } from 'react';
import { Upload, message } from 'antd';

import {
  deleteMerchantHotelCertificateAPI,
  getMerchantHotelCertificatesAPI,
  uploadMerchantHotelCertificateAPI,
} from '../../../../utils/request';
import {
  calculateUploadPercent,
  certificateLeafGroups,
  createEmptyHotelCertificates,
  normalizeHotelCertificatesPayload,
  removeKey,
  validateImageUploadFile,
} from '../../../../utils/hotel-info';

const defaultCertificateLoadMessageKey = 'merchant-hotel-certificate-load-error';

export default function useHotelCertificatesManager({
  getErrorMessage,
  certificateLoadMessageKey = defaultCertificateLoadMessageKey,
}) {
  const [hotelCertificates, setHotelCertificates] = useState(createEmptyHotelCertificates);
  const [certificateLoadError, setCertificateLoadError] = useState('');
  const [deletingCertificateIds, setDeletingCertificateIds] = useState({});

  const beforeCertificateUpload = useCallback((file) => {
    const validation = validateImageUploadFile(file);
    if (!validation.valid) {
      message.error(validation.message);
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

      try {
        const formData = new FormData();
        formData.append('group', groupKey);
        formData.append('image', file);

        const uploadRes = await uploadMerchantHotelCertificateAPI(formData, ({ loaded, total }) => {
          const percent = calculateUploadPercent({ loaded, total });
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
        message.error(errorMsg);
        throw error;
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
        throw error;
      } finally {
        setDeletingCertificateIds((prev) => removeKey(prev, certificateId));
      }
    },
    [deletingCertificateIds, getErrorMessage, hotelCertificates]
  );

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
    setCertificateLoadError('');
    setDeletingCertificateIds({});
  }, []);

  return {
    hotelCertificates,
    certificateLoadError,
    beforeCertificateUpload,
    uploadHotelCertificate,
    handleDeleteHotelCertificate,
    loadHotelCertificates,
    handleRetryLoadCertificates,
    resetHotelCertificatesState,
  };
}
