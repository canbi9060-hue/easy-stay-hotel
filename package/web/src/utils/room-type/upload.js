import {
  createExistingMediaItem,
  createNewMediaItem,
  revokePreviewUrls,
  validateImageFile,
} from '../common';

export const validateRoomTypeImageFile = (file, maxCountReached = false) => validateImageFile(file, {
  maxCountReached,
  countLimitMessage: '房型图片数量已达到上限。',
});

export const createExistingImageItem = (image, resolveImageUrl) => createExistingMediaItem(image, resolveImageUrl, {
  fallbackName: `图片-${image?.id || ''}`,
});

export const createNewImageItem = (file) => createNewMediaItem({
  file,
  fallbackName: file?.name || 'image.png',
});

export const revokeDraftPreviewUrls = (items = []) => revokePreviewUrls(items);

export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const dataUrlToFile = async (dataUrl, fileName, mimeType = 'image/jpeg') => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName || 'draft-image.jpg', { type: mimeType || blob.type || 'image/jpeg' });
};

export const serializeImageDrafts = async (items = []) => {
  return Promise.all(items.map(async (item) => {
    if (item.kind === 'existing') {
      return {
        kind: 'existing',
        id: item.id,
        name: item.name,
        previewUrl: item.previewUrl,
      };
    }

    return {
      kind: 'new',
      name: item.name,
      mimeType: item.file?.type || 'image/jpeg',
      dataUrl: await fileToDataUrl(item.file),
    };
  }));
};

export const hydrateImageDrafts = async (draftItems = []) => {
  const hydrated = [];

  for (const item of draftItems) {
    if (item.kind === 'existing') {
      hydrated.push({
        uid: `existing-${item.id}`,
        kind: 'existing',
        id: item.id,
        name: item.name,
        previewUrl: item.previewUrl,
      });
      continue;
    }

    const file = await dataUrlToFile(item.dataUrl, item.name, item.mimeType);
    hydrated.push(createNewImageItem(file));
  }

  return hydrated;
};

export const buildRoomTypeSubmitPayload = (values, imageItems = []) => {
  const payload = {
    ...values,
    keptImageIds: [],
  };
  const files = [];

  imageItems.forEach((item) => {
    if (item.kind === 'existing') {
      payload.keptImageIds.push(item.id);
      return;
    }

    files.push(item.file);
  });

  return {
    payload,
    files,
  };
};
