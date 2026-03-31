import { useCallback, useRef, useState } from 'react';
import { Upload, message } from 'antd';

import {
  deleteMerchantHotelImageAPI,
  getMerchantHotelImagesAPI,
  sortMerchantHotelImagesAPI,
  uploadMerchantHotelImageAPI,
} from '../../../../utils/request';
import {
  createEmptyHotelImages,
  createEmptyImageGroupFlags,
  hotelImageGroups,
  normalizeHotelImagesPayload,
  removeKey,
} from '../modules/constants';

const defaultImageLoadMessageKey = 'merchant-hotel-image-load-error';

export default function useHotelImagesManager({ getErrorMessage, imageLoadMessageKey = defaultImageLoadMessageKey }) {
  const [hotelImages, setHotelImages] = useState(createEmptyHotelImages);
  const [uploadingByGroup, setUploadingByGroup] = useState({});
  const [failedUploadByGroup, setFailedUploadByGroup] = useState({});
  const [imageLoadError, setImageLoadError] = useState('');
  const [deletingImageIds, setDeletingImageIds] = useState({});
  const [sortingByGroup, setSortingByGroup] = useState(createEmptyImageGroupFlags);
  const [dragOverTargetByGroup, setDragOverTargetByGroup] = useState({});
  const [imagePreview, setImagePreview] = useState({ open: false, url: '', title: '' });

  const draggingImageRef = useRef(null);
  const imageOpVersionRef = useRef(createEmptyImageGroupFlags(0));

  const bumpImageOpVersion = useCallback((groupKey) => {
    const current = Number(imageOpVersionRef.current[groupKey] || 0);
    const next = current + 1;
    imageOpVersionRef.current[groupKey] = next;
    return next;
  }, []);

  const beforeHotelImageUpload = useCallback((file) => {
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

  const uploadHotelImage = useCallback(async (groupKey, file, onProgress) => {
    const groupMeta = hotelImageGroups.find((group) => group.key === groupKey);
    if (!groupMeta) return;
    const currentList = hotelImages[groupKey] || [];
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
        fileName: file?.name || '图片上传中',
        percent: 0,
      },
    }));

    try {
      const formData = new FormData();
      formData.append('group', groupKey);
      formData.append('image', file);

      const uploadRes = await uploadMerchantHotelImageAPI(formData, ({ loaded, total }) => {
        const percent = total ? Math.max(1, Math.min(100, Math.round((loaded / total) * 100))) : 0;
        setUploadingByGroup((prev) => ({
          ...prev,
          [groupKey]: {
            ...prev[groupKey],
            file,
            fileName: file?.name || '图片上传中',
            percent,
          },
        }));
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
      setFailedUploadByGroup((prev) => ({
        ...prev,
        [groupKey]: {
          file,
          fileName: file?.name || '上传失败图片',
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
  }, [getErrorMessage, hotelImages]);

  const handleDeleteHotelImage = useCallback(async (groupKey, imageId) => {
    if (deletingImageIds[imageId]) {
      return;
    }

    const groupSnapshot = hotelImages[groupKey] || [];
    const operationVersion = bumpImageOpVersion(groupKey);
    setDeletingImageIds((prev) => ({ ...prev, [imageId]: true }));
    setHotelImages((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] || []).filter((item) => item.id !== imageId),
    }));

    try {
      await deleteMerchantHotelImageAPI(imageId);
      message.success('酒店图片删除成功。');
    } catch (error) {
      if (imageOpVersionRef.current[groupKey] === operationVersion) {
        setHotelImages((prev) => ({
          ...prev,
          [groupKey]: groupSnapshot,
        }));
      }
      message.error(getErrorMessage(error, '删除酒店图片失败。'));
    } finally {
      setDeletingImageIds((prev) => removeKey(prev, imageId));
    }
  }, [bumpImageOpVersion, deletingImageIds, getErrorMessage, hotelImages]);

  const handleSortHotelImages = useCallback(async (groupKey, orderedList, snapshot, operationVersion) => {
    setSortingByGroup((prev) => ({ ...prev, [groupKey]: true }));
    try {
      await sortMerchantHotelImagesAPI({
        group: groupKey,
        orderedIds: orderedList.map((item) => item.id),
      });
    } catch (error) {
      if (imageOpVersionRef.current[groupKey] === operationVersion) {
        setHotelImages((prev) => ({
          ...prev,
          [groupKey]: snapshot,
        }));
      }
      message.error(getErrorMessage(error, '酒店图片排序失败。'));
    } finally {
      setSortingByGroup((prev) => ({ ...prev, [groupKey]: false }));
    }
  }, [getErrorMessage]);

  const handleImageDrop = useCallback((event, groupKey, targetImageId) => {
    event.preventDefault();
    setDragOverTargetByGroup((prev) => removeKey(prev, groupKey));
    if (sortingByGroup[groupKey]) {
      return;
    }
    const dragging = draggingImageRef.current;
    if (!dragging || dragging.groupKey !== groupKey || dragging.imageId === targetImageId) {
      return;
    }

    const currentGroupImages = hotelImages[groupKey] || [];
    const fromIndex = currentGroupImages.findIndex((item) => item.id === dragging.imageId);
    const toIndex = currentGroupImages.findIndex((item) => item.id === targetImageId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const reordered = [...currentGroupImages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const snapshot = [...currentGroupImages];
    const operationVersion = bumpImageOpVersion(groupKey);
    setHotelImages((prev) => ({
      ...prev,
      [groupKey]: reordered,
    }));
    handleSortHotelImages(groupKey, reordered, snapshot, operationVersion);
  }, [bumpImageOpVersion, handleSortHotelImages, hotelImages, sortingByGroup]);

  const handleImageDragStart = useCallback((groupKey, imageId, groupSorting) => {
    if (groupSorting) return;
    draggingImageRef.current = { groupKey, imageId };
  }, []);

  const handleImageDragOver = useCallback((event, groupKey, imageId, groupSorting) => {
    if (groupSorting) return;
    if (draggingImageRef.current?.groupKey === groupKey) {
      event.preventDefault();
      setDragOverTargetByGroup((prev) => ({ ...prev, [groupKey]: imageId }));
    }
  }, []);

  const handleImageDragLeave = useCallback((groupKey) => {
    setDragOverTargetByGroup((prev) => removeKey(prev, groupKey));
  }, []);

  const handleImageDragEnd = useCallback((groupKey) => {
    draggingImageRef.current = null;
    setDragOverTargetByGroup((prev) => removeKey(prev, groupKey));
  }, []);

  const handleImagePreview = useCallback((url, title) => {
    setImagePreview({ open: true, url, title });
  }, []);

  const closeImagePreview = useCallback(() => {
    setImagePreview({ open: false, url: '', title: '' });
  }, []);

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
    setUploadingByGroup({});
    setFailedUploadByGroup({});
    setImageLoadError('');
    setDeletingImageIds({});
    setSortingByGroup(createEmptyImageGroupFlags());
    setDragOverTargetByGroup({});
    setImagePreview({ open: false, url: '', title: '' });
    draggingImageRef.current = null;
    imageOpVersionRef.current = createEmptyImageGroupFlags(0);
  }, []);

  return {
    hotelImages,
    uploadingByGroup,
    failedUploadByGroup,
    imageLoadError,
    deletingImageIds,
    sortingByGroup,
    dragOverTargetByGroup,
    imagePreview,
    beforeHotelImageUpload,
    uploadHotelImage,
    handleDeleteHotelImage,
    handleImageDrop,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDragLeave,
    handleImageDragEnd,
    handleImagePreview,
    closeImagePreview,
    loadHotelImages,
    handleRetryLoadImages,
    resetHotelImagesState,
  };
}
