import { useCallback, useState } from 'react';
import { Upload, message } from 'antd';

import {
  deleteMerchantHotelImageAPI,
  getMerchantHotelImagesAPI,
  uploadMerchantHotelImageAPI,
} from '../../../../utils/request';
import {
  calculateUploadPercent,
  createEmptyHotelImages,
  hotelImageGroups,
  normalizeHotelImagesPayload,
  removeKey,
  validateImageUploadFile,
} from '../../../../utils/hotel-info';

const defaultImageLoadMessageKey = 'merchant-hotel-image-load-error';

export default function useHotelImagesManager({ getErrorMessage, imageLoadMessageKey = defaultImageLoadMessageKey }) {
  const [hotelImages, setHotelImages] = useState(createEmptyHotelImages);
  const [imageLoadError, setImageLoadError] = useState('');
  const [deletingImageIds, setDeletingImageIds] = useState({});

  const beforeHotelImageUpload = useCallback((file) => {
    const validation = validateImageUploadFile(file);
    if (!validation.valid) {
      message.error(validation.message);
      return Upload.LIST_IGNORE;
    }
    return true;
  }, []);

  const uploadHotelImage = useCallback(async (groupKey, file, onProgress) => {
    const groupMeta = hotelImageGroups.find((group) => group.key === groupKey);
    if (!groupMeta) return;
    const currentList = hotelImages[groupKey] || [];
    if (currentList.length >= groupMeta.maxCount) {
      message.warning(`${groupMeta.title}最多上传 ${groupMeta.maxCount} 张。`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('group', groupKey);
      formData.append('image', file);

      const uploadRes = await uploadMerchantHotelImageAPI(formData, ({ loaded, total }) => {
        const percent = calculateUploadPercent({ loaded, total });
        if (typeof onProgress === 'function') {
          onProgress(percent);
        }
      });

      setHotelImages((prev) => ({
        ...prev,
        [groupKey]: [...(prev[groupKey] || []), uploadRes?.data?.image].filter(Boolean),
      }));
      message.success('酒店图片上传成功。');
    } catch (error) {
      const errorMsg = getErrorMessage(error, '酒店图片上传失败。');
      message.error(errorMsg);
      throw error;
    }
  }, [getErrorMessage, hotelImages]);

  const handleDeleteHotelImage = useCallback(async (groupKey, imageId) => {
    if (deletingImageIds[imageId]) {
      return;
    }

    const groupSnapshot = hotelImages[groupKey] || [];
    setDeletingImageIds((prev) => ({ ...prev, [imageId]: true }));
    setHotelImages((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] || []).filter((item) => item.id !== imageId),
    }));

    try {
      await deleteMerchantHotelImageAPI(imageId);
      message.success('酒店图片删除成功。');
    } catch (error) {
      setHotelImages((prev) => ({
        ...prev,
        [groupKey]: groupSnapshot,
      }));
      message.error(getErrorMessage(error, '删除酒店图片失败。'));
      throw error;
    } finally {
      setDeletingImageIds((prev) => removeKey(prev, imageId));
    }
  }, [deletingImageIds, getErrorMessage, hotelImages]);

  const loadHotelImages = useCallback(async ({ notify = false } = {}) => {
    try {
      const imageRes = await getMerchantHotelImagesAPI();
      setHotelImages(normalizeHotelImagesPayload(imageRes?.data));
      setImageLoadError('');
      return true;
    } catch (error) {
      const errorMsg = getErrorMessage(error, '获取酒店图片失败，请稍后重试');
      setHotelImages(createEmptyHotelImages());
      setImageLoadError(errorMsg);
      if (notify) {
        message.open({
          key: imageLoadMessageKey,
          type: 'warning',
          content: errorMsg,
        });
      }
      return false;
    }
  }, [getErrorMessage, imageLoadMessageKey]);

  const handleRetryLoadImages = useCallback(() => {
    loadHotelImages({ notify: true });
  }, [loadHotelImages]);

  const resetHotelImagesState = useCallback(() => {
    setHotelImages(createEmptyHotelImages());
    setImageLoadError('');
    setDeletingImageIds({});
  }, []);

  return {
    hotelImages,
    imageLoadError,
    deletingImageIds,
    beforeHotelImageUpload,
    uploadHotelImage,
    handleDeleteHotelImage,
    loadHotelImages,
    handleRetryLoadImages,
    resetHotelImagesState,
  };
}
