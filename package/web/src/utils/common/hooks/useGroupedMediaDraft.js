import { useCallback, useState } from 'react';
import { Upload, message } from 'antd';

import {
  createGroupedExistingMediaItems,
  createNewMediaItem,
  flattenGroupedMediaItems,
  revokePreviewUrls,
  validateImageFile,
} from '../media';
import { getRequestErrorMessage } from '../../request';

export default function useGroupedMediaDraft({
  groups = [],
  createEmptyState = () => ({}),
  loadApi,
  resolveImageUrl,
  fallbackName = 'image.png',
  loadErrorMessage = '加载媒体失败，请稍后重试',
  loadErrorMessageKey = 'grouped-media-load-error',
}) {
  const [groupedItems, setGroupedItems] = useState(createEmptyState);
  const [loadError, setLoadError] = useState('');

  const replaceItems = useCallback((nextItems) => {
    setGroupedItems((prev) => {
      revokePreviewUrls(flattenGroupedMediaItems(prev));
      return nextItems;
    });
  }, []);

  const beforeUpload = useCallback((groupKey, file) => {
    const groupMeta = groups.find((group) => group.key === groupKey);
    if (!groupMeta) {
      return Upload.LIST_IGNORE;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      message.error(validation.message);
      return Upload.LIST_IGNORE;
    }

    let reachedLimit = false;
    setGroupedItems((prev) => {
      const currentList = prev[groupKey] || [];
      if (currentList.length >= Number(groupMeta.maxCount || 0)) {
        reachedLimit = true;
        return prev;
      }

      return {
        ...prev,
        [groupKey]: [
          ...currentList,
          createNewMediaItem({
            file,
            group: groupKey,
            fallbackName,
          }),
        ],
      };
    });

    if (reachedLimit) {
      message.warning(`${groupMeta.title}最多上传 ${groupMeta.maxCount} 张。`);
    }

    return Upload.LIST_IGNORE;
  }, [fallbackName, groups]);

  const removeItem = useCallback((groupKey, uid) => {
    setGroupedItems((prev) => {
      const currentItems = prev[groupKey] || [];
      const targetItem = currentItems.find((item) => item.uid === uid);
      revokePreviewUrls(targetItem ? [targetItem] : []);

      return {
        ...prev,
        [groupKey]: currentItems.filter((item) => item.uid !== uid),
      };
    });
  }, []);

  const loadItems = useCallback(async ({ notify = false } = {}) => {
    try {
      const res = await loadApi();
      replaceItems(createGroupedExistingMediaItems({
        payload: res.data,
        groups,
        resolveImageUrl,
        fallbackName,
      }));
      setLoadError('');
      return true;
    } catch (error) {
      const errorMsg = getRequestErrorMessage(error, loadErrorMessage);
      replaceItems(createEmptyState());
      setLoadError(errorMsg);
      if (notify) {
        message.open({
          key: loadErrorMessageKey,
          type: 'warning',
          content: errorMsg,
        });
      }
      return false;
    }
  }, [
    createEmptyState,
    fallbackName,
    groups,
    loadApi,
    loadErrorMessage,
    loadErrorMessageKey,
    replaceItems,
    resolveImageUrl,
  ]);

  const handleRetryLoad = useCallback(() => {
    loadItems({ notify: true });
  }, [loadItems]);

  const resetState = useCallback(() => {
    replaceItems(createEmptyState());
    setLoadError('');
  }, [createEmptyState, replaceItems]);

  return {
    groupedItems,
    loadError,
    beforeUpload,
    removeItem,
    loadItems,
    handleRetryLoad,
    resetState,
    replaceItems,
  };
}
