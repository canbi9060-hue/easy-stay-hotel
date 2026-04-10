import {
  createExistingMediaItem,
  createNewMediaItem,
  revokePreviewUrls,
  validateImageFile,
} from '../common';
import { ROOM_TYPE_AUDIT_STATUS } from './constants';

const normalizeMerchantUserId = (merchantUserId) => {
  const numericId = Number(merchantUserId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildRoomTypeImagePlan = (imageItems = []) => {
  const imagePlan = [];
  const files = [];

  imageItems.forEach((item) => {
    if (item?.kind === 'existing' && Number(item?.id) > 0) {
      imagePlan.push(`${item?.source === 'draft' ? 'draft' : 'live'}:${Number(item.id)}`);
      return;
    }

    if (item?.kind === 'new' && item?.file) {
      imagePlan.push(`new:${files.length}`);
      files.push(item.file);
    }
  });

  return {
    imagePlan,
    files,
  };
};

const createDraftDisplayImage = (item, index, resolveImageUrl) => {
  const filePath = String(item?.filePath || '').trim();
  const previewUrl = String(item?.previewUrl || '').trim() || (filePath ? resolveImageUrl(filePath) : '');
  return {
    id: Number(item?.id) || `draft-image-${index}`,
    filePath,
    fileName: item?.fileName || `图片-${index + 1}`,
    previewUrl,
    mimeType: item?.mimeType || '',
    sizeBytes: Number(item?.sizeBytes) || 0,
    createdAt: item?.createdAt || '',
  };
};

export const getRoomTypeCreateDraftKey = (merchantUserId) => {
  const normalizedMerchantUserId = normalizeMerchantUserId(merchantUserId);
  return normalizedMerchantUserId ? `merchant_room_type_draft:${normalizedMerchantUserId}:create` : '';
};

export const getRoomTypeEditDraftKeyPrefix = (merchantUserId) => {
  const normalizedMerchantUserId = normalizeMerchantUserId(merchantUserId);
  return normalizedMerchantUserId ? `merchant_room_type_draft:${normalizedMerchantUserId}:edit:` : '';
};

export const validateRoomTypeImageFile = (file, maxCountReached = false) => validateImageFile(file, {
  maxCountReached,
  countLimitMessage: '房型图片数量已达到上限。',
});

export const createExistingImageItem = (image, resolveImageUrl, options = {}) => ({
  ...createExistingMediaItem(image, resolveImageUrl, {
    fallbackName: `图片-${image?.id || ''}`,
  }),
  source: options.source || 'live',
});

export const createDraftImageItem = (image, resolveImageUrl) => createExistingImageItem(image, resolveImageUrl, {
  source: 'draft',
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

export const serializeImageDrafts = async (items = []) => Promise.all(items.map(async (item) => {
  if (item.kind === 'existing') {
    return {
      kind: 'existing',
      source: item.source || 'live',
      id: item.id,
      name: item.name,
      previewUrl: item.previewUrl,
      filePath: item.filePath || '',
      mimeType: item.mimeType || '',
      sizeBytes: Number(item.sizeBytes) || 0,
      createdAt: item.createdAt || '',
    };
  }

  return {
    kind: 'new',
    name: item.name,
    mimeType: item.file?.type || 'image/jpeg',
    dataUrl: await fileToDataUrl(item.file),
  };
}));

export const hydrateImageDrafts = async (draftItems = [], resolveImageUrl = (value) => value) => {
  const hydrated = [];

  for (const item of draftItems) {
    if (item.kind === 'existing') {
      hydrated.push(createExistingImageItem({
        id: item.id,
        filePath: item.filePath || '',
        fileName: item.name,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt,
      }, resolveImageUrl, { source: item.source || 'live' }));
      continue;
    }

    const file = await dataUrlToFile(item.dataUrl, item.name, item.mimeType);
    hydrated.push(createNewImageItem(file));
  }

  return hydrated;
};

export const buildRoomTypeDraftSavePayload = (values, imageItems = []) => {
  const { imagePlan, files } = buildRoomTypeImagePlan(imageItems);

  return {
    payload: {
      formValues: { ...values },
      imagePlan,
    },
    files,
  };
};

export const buildRoomTypeSubmitPayload = (values, imageItems = []) => {
  const { imagePlan, files } = buildRoomTypeImagePlan(imageItems);
  const payload = {
    ...values,
    imagePlan,
  };

  return {
    payload,
    files,
  };
};

const parseStoredRoomTypeDraft = (rawDraft, meta = {}) => {
  if (!rawDraft) {
    return null;
  }

  const parsedDraft = JSON.parse(rawDraft);
  const formValues = isPlainObject(parsedDraft?.formValues) ? parsedDraft.formValues : null;
  const imageItems = Array.isArray(parsedDraft?.imageItems) ? parsedDraft.imageItems : [];
  if (!formValues) {
    return null;
  }

  return {
    ...meta,
    formValues,
    imageItems,
    auditStatus: Number.isInteger(Number(parsedDraft?.auditStatus))
      ? Number(parsedDraft.auditStatus)
      : null,
    images: imageItems
      .map((item, imageIndex) => createDraftDisplayImage(item, imageIndex, (value) => value))
      .filter(Boolean),
    savedAt: Number(parsedDraft?.savedAt) || 0,
  };
};

export const readRoomTypeEditDraftMap = (merchantUserId) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  const roomTypeEditDraftKeyPrefix = getRoomTypeEditDraftKeyPrefix(merchantUserId);
  if (!roomTypeEditDraftKeyPrefix) {
    return {};
  }

  const draftMap = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (!storageKey || !storageKey.startsWith(roomTypeEditDraftKeyPrefix)) {
      continue;
    }

    const roomTypeId = Number(storageKey.slice(roomTypeEditDraftKeyPrefix.length));
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      continue;
    }

    try {
      const parsedDraft = parseStoredRoomTypeDraft(window.localStorage.getItem(storageKey), {
        roomTypeId,
        sourceRoomTypeId: roomTypeId,
        draftType: 'edit',
      });
      if (!parsedDraft || parsedDraft.auditStatus === ROOM_TYPE_AUDIT_STATUS.PENDING) {
        continue;
      }

      draftMap[roomTypeId] = parsedDraft;
    } catch (_error) {
      continue;
    }
  }

  return draftMap;
};

export const readRoomTypeCreateDraft = (merchantUserId) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const roomTypeCreateDraftKey = getRoomTypeCreateDraftKey(merchantUserId);
  if (!roomTypeCreateDraftKey) {
    return null;
  }

  try {
    return parseStoredRoomTypeDraft(window.localStorage.getItem(roomTypeCreateDraftKey), {
      roomTypeId: 0,
      sourceRoomTypeId: 0,
      draftType: 'create',
    });
  } catch (_error) {
    return null;
  }
};

export const normalizeRoomTypeDraftResponse = (draft, resolveImageUrl) => {
  if (!isPlainObject(draft)) {
    return null;
  }

  const savedAtValue = Date.parse(draft.savedAt || draft.updatedAt || '') || Number(draft.savedAt) || 0;
  const updatedAtValue = Date.parse(draft.updatedAt || draft.savedAt || '') || Number(draft.updatedAt) || savedAtValue;

  return {
    roomTypeId: Number(draft.roomTypeId) || 0,
    sourceRoomTypeId: Number(draft.sourceRoomTypeId) || 0,
    draftType: draft.draftType === 'edit' ? 'edit' : 'create',
    formValues: isPlainObject(draft.formValues) ? draft.formValues : {},
    images: Array.isArray(draft.images)
      ? draft.images.map((item, index) => createDraftDisplayImage(item, index, resolveImageUrl)).filter(Boolean)
      : [],
    savedAt: savedAtValue,
    updatedAt: updatedAtValue,
    auditStatus: Number.isInteger(Number(draft.auditStatus)) ? Number(draft.auditStatus) : null,
  };
};

export const normalizeRoomTypeDraftBundle = (payload, resolveImageUrl) => {
  const createDraft = normalizeRoomTypeDraftResponse(payload?.createDraft, resolveImageUrl);
  const editDrafts = Array.isArray(payload?.editDrafts)
    ? payload.editDrafts
      .map((draft) => normalizeRoomTypeDraftResponse(draft, resolveImageUrl))
      .filter(Boolean)
    : [];

  const editDraftMap = editDrafts.reduce((acc, draft) => {
    const roomTypeId = Number(draft.sourceRoomTypeId);
    if (roomTypeId > 0) {
      acc[roomTypeId] = draft;
    }
    return acc;
  }, {});

  return {
    createDraft,
    editDrafts,
    editDraftMap,
  };
};
