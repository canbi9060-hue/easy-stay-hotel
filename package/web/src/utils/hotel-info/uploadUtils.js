export const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export const toUploadFileItem = (item, resolveImageUrl, fallbackName) => ({
  uid: String(item?.id),
  name: item?.filePath?.split('/')?.pop() || fallbackName,
  status: 'done',
  url: resolveImageUrl(item?.filePath),
  response: item,
});

export const normalizeUploadFileList = (nextFileList) =>
  nextFileList.map((item) => {
    if (item?.status !== 'done') {
      return item;
    }
    const responseId = Number(item?.response?.id);
    if (!Number.isInteger(responseId) || responseId <= 0) {
      return item;
    }
    return {
      ...item,
      uid: String(responseId),
    };
  });

export const resolveUploadItemId = (file) => {
  const id = Number(file?.uid);
  return Number.isInteger(id) && id > 0 ? id : 0;
};

export const createUploadRequestHandler = (uploadHandler, groupKey, missingIdMessage) =>
  async ({ file, onSuccess, onError, onProgress }) => {
    try {
      const uploadedItem = await uploadHandler(groupKey, file, (percent) => onProgress?.({ percent }));
      if (!uploadedItem?.id) {
        throw new Error(missingIdMessage);
      }
      onSuccess?.(uploadedItem, file);
    } catch (error) {
      onError?.(error);
    }
  };
