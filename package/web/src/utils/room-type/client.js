import {
  createMerchantRoomTypeAPI,
  createMerchantRoomTypeDraftAPI,
  deleteMerchantRoomTypeCreateDraftAPI,
  getFileUrl,
  getMerchantRoomTypeDraftsAPI,
  updateMerchantRoomTypeAPI,
  updateMerchantRoomTypeDraftAPI,
} from '../request';
import { createMultipartFormData } from '../common';
import {
  buildRoomTypeDraftSavePayload,
  buildRoomTypeSubmitPayload,
  getRoomTypeCreateDraftKey,
  getRoomTypeEditDraftKeyPrefix,
  hydrateImageDrafts,
  normalizeRoomTypeDraftBundle,
  readRoomTypeCreateDraft,
  readRoomTypeEditDraftMap,
} from './upload';

const emptyRoomTypeDraftBundle = {
  createDraft: null,
  editDrafts: [],
  editDraftMap: {},
};

const submitRoomTypeMultipart = (requestFn, payloadBuilder, ...args) => {
  const { payload, files } = payloadBuilder(...args);
  return requestFn(createMultipartFormData(payload, { images: files }));
};

export const fetchMerchantRoomTypeDraftBundle = async (resolveImageUrl = getFileUrl) => {
  const res = await getMerchantRoomTypeDraftsAPI();
  return normalizeRoomTypeDraftBundle(res.data, resolveImageUrl);
};

export const saveMerchantRoomTypeCreateDraft = async (formValues, imageItems = []) => {
  return submitRoomTypeMultipart(
    createMerchantRoomTypeDraftAPI,
    buildRoomTypeDraftSavePayload,
    formValues,
    imageItems
  );
};

export const saveMerchantRoomTypeEditDraft = async (roomTypeId, formValues, imageItems = []) => {
  return submitRoomTypeMultipart(
    (formData) => updateMerchantRoomTypeDraftAPI(roomTypeId, formData),
    buildRoomTypeDraftSavePayload,
    formValues,
    imageItems
  );
};

export const submitMerchantRoomTypeCreate = async (formValues, imageItems = []) => {
  return submitRoomTypeMultipart(
    createMerchantRoomTypeAPI,
    buildRoomTypeSubmitPayload,
    formValues,
    imageItems
  );
};

export const submitMerchantRoomTypeEdit = async (roomTypeId, formValues, imageItems = []) => {
  return submitRoomTypeMultipart(
    (formData) => updateMerchantRoomTypeAPI(roomTypeId, formData),
    buildRoomTypeSubmitPayload,
    formValues,
    imageItems
  );
};

export const removeMerchantRoomTypeCreateDraft = async () => deleteMerchantRoomTypeCreateDraftAPI();

export const migrateScopedLocalRoomTypeDrafts = async ({
  merchantUserId,
  serverBundle,
  resolveImageUrl = getFileUrl,
}) => {
  if (typeof window === 'undefined' || !window.localStorage || !merchantUserId) {
    return { migrated: false, migrationFailed: false };
  }

  let migrated = false;
  let migrationFailed = false;
  const createDraftKey = getRoomTypeCreateDraftKey(merchantUserId);
  const editDraftKeyPrefix = getRoomTypeEditDraftKeyPrefix(merchantUserId);

  const localCreateDraft = readRoomTypeCreateDraft(merchantUserId);
  if (localCreateDraft) {
    if (serverBundle?.createDraft) {
      window.localStorage.removeItem(createDraftKey);
    } else {
      try {
        const imageItems = await hydrateImageDrafts(localCreateDraft.imageItems || [], resolveImageUrl);
        await saveMerchantRoomTypeCreateDraft(localCreateDraft.formValues || {}, imageItems);
        window.localStorage.removeItem(createDraftKey);
        migrated = true;
      } catch (_error) {
        migrationFailed = true;
      }
    }
  }

  const localEditDraftMap = readRoomTypeEditDraftMap(merchantUserId);
  for (const [roomTypeIdText, draft] of Object.entries(localEditDraftMap)) {
    const roomTypeId = Number(roomTypeIdText);
    const draftKey = `${editDraftKeyPrefix}${roomTypeId}`;
    if (serverBundle?.editDraftMap?.[roomTypeId]) {
      window.localStorage.removeItem(draftKey);
      continue;
    }

    try {
      const imageItems = await hydrateImageDrafts(draft.imageItems || [], resolveImageUrl);
      await saveMerchantRoomTypeEditDraft(roomTypeId, draft.formValues || {}, imageItems);
      window.localStorage.removeItem(draftKey);
      migrated = true;
    } catch (_error) {
      migrationFailed = true;
    }
  }

  return { migrated, migrationFailed };
};

export const getEmptyRoomTypeDraftBundle = () => ({
  ...emptyRoomTypeDraftBundle,
  editDraftMap: {},
});
