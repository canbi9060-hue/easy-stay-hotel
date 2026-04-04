import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message, Modal, Upload } from 'antd';
import {
  createMerchantRoomTypeAPI,
  getFileUrl,
  getRequestErrorMessage,
  getMerchantRoomTypeDetailAPI,
  updateMerchantRoomTypeAPI,
} from '../../../../utils/request';
import {
  buildRoomTypeDraftKey,
  buildRoomTypeSubmitPayload,
  createExistingImageItem,
  createNewImageItem,
  emptyRoomTypeFormValues,
  getRoomTypeEditNotice,
  hydrateImageDrafts,
  maxRoomTypeImageCount,
  normalizeRoomTypeFormValues,
  revokeDraftPreviewUrls,
  serializeImageDrafts,
  validateRoomTypeImageFile,
} from '../../../../utils/room-type';
import { toUploadFileItem } from '../../../../utils/common';

const createRestoreDraftPrompt = (draft) => new Promise((resolve) => {
  let settled = false;
  const finish = (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };

  const savedAt = draft?.savedAt ? new Date(draft.savedAt).toLocaleString() : '';
  Modal.confirm({
    title: '发现本地草稿',
    content: savedAt ? `检测到 ${savedAt} 保存的草稿，是否恢复？` : '检测到未提交的本地草稿，是否恢复？',
    okText: '恢复草稿',
    cancelText: '丢弃草稿',
    onOk: () => finish(true),
    onCancel: () => finish(false),
  });
});

export default function useRoomTypeForm({ onSuccess }) {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [roomTypeId, setRoomTypeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageItems, setImageItems] = useState([]);
  const [detail, setDetail] = useState(null);

  const replaceImageItems = useCallback((nextItems) => {
    setImageItems((prev) => {
      revokeDraftPreviewUrls(prev);
      return nextItems;
    });
  }, []);

  const resetFormState = useCallback(() => {
    form.resetFields();
    setDetail(null);
    setRoomTypeId(null);
    replaceImageItems([]);
  }, [form, replaceImageItems]);

  const closeFormModal = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setSubmitting(false);
    resetFormState();
  }, [resetFormState]);

  const draftKey = useMemo(() => buildRoomTypeDraftKey(mode, roomTypeId), [mode, roomTypeId]);
  const statusNotice = useMemo(() => getRoomTypeEditNotice(detail), [detail]);
  const imageFileList = useMemo(
    () => imageItems.map((item) => toUploadFileItem(item, 'image.png')),
    [imageItems]
  );

  const maybeRestoreDraft = useCallback(async (baseValues, baseImages, currentDraftKey) => {
    form.setFieldsValue(baseValues);
    replaceImageItems(baseImages);

    const rawDraft = window.localStorage.getItem(currentDraftKey);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      const shouldRestore = await createRestoreDraftPrompt(draft);
      if (!shouldRestore) {
        window.localStorage.removeItem(currentDraftKey);
        return;
      }

      const restoredImages = await hydrateImageDrafts(Array.isArray(draft?.imageItems) ? draft.imageItems : []);
      form.setFieldsValue({
        ...baseValues,
        ...(draft?.formValues || {}),
      });
      replaceImageItems(restoredImages);
      message.success('已恢复本地草稿。');
    } catch (error) {
      window.localStorage.removeItem(currentDraftKey);
      message.warning('本地草稿已损坏，已自动清除。');
    }
  }, [form, replaceImageItems]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        if (mode === 'edit' && roomTypeId) {
          const res = await getMerchantRoomTypeDetailAPI(roomTypeId);
          if (!active) return;
          const nextDetail = res.data;
          const baseValues = normalizeRoomTypeFormValues(nextDetail);
          const baseImages = nextDetail.images.map((image) => createExistingImageItem(image, getFileUrl));
          setDetail(nextDetail);
          await maybeRestoreDraft(baseValues, baseImages, buildRoomTypeDraftKey('edit', roomTypeId));
          return;
        }

        setDetail(null);
        await maybeRestoreDraft(emptyRoomTypeFormValues, [], buildRoomTypeDraftKey('create'));
      } catch (error) {
        if (!active) return;
        message.error(getRequestErrorMessage(error, '加载房型信息失败。'));
        setOpen(false);
        resetFormState();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, mode, roomTypeId, maybeRestoreDraft, resetFormState]);

  const openCreateModal = useCallback(() => {
    setMode('create');
    setRoomTypeId(null);
    setOpen(true);
  }, []);

  const openEditModal = useCallback((record) => {
    setMode('edit');
    setRoomTypeId(record?.id || null);
    setOpen(true);
  }, []);

  const handleBeforeUpload = useCallback((file) => {
    const validation = validateRoomTypeImageFile(file, false);
    if (!validation.valid) {
      message.error(validation.message);
      return Upload.LIST_IGNORE;
    }

    let reachedLimit = false;
    setImageItems((prev) => {
      if (prev.length >= maxRoomTypeImageCount) {
        reachedLimit = true;
        return prev;
      }
      return [...prev, createNewImageItem(file)];
    });
    if (reachedLimit) {
      message.warning(`房型图片最多上传 ${maxRoomTypeImageCount} 张。`);
    }
    return Upload.LIST_IGNORE;
  }, []);

  const removeImage = useCallback((uid) => {
    setImageItems((prev) => {
      const next = prev.filter((item) => item.uid !== uid);
      const removed = prev.find((item) => item.uid === uid);
      revokeDraftPreviewUrls(removed ? [removed] : []);
      return next;
    });
  }, []);

  const handleSaveDraft = useCallback(async () => {
    try {
      const values = {
        ...emptyRoomTypeFormValues,
        ...form.getFieldsValue(true),
      };
      const serializedImages = await serializeImageDrafts(imageItems);
      window.localStorage.setItem(draftKey, JSON.stringify({
        formValues: values,
        imageItems: serializedImages,
        savedAt: Date.now(),
      }));
      message.success('草稿已保存到本地。');
    } catch (error) {
      message.error('保存草稿失败，请稍后重试。');
    }
  }, [draftKey, form, imageItems]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!imageItems.length) {
        message.error('请至少上传 1 张房型图片。');
        return;
      }

      setSubmitting(true);
      const { payload, files } = buildRoomTypeSubmitPayload(values, imageItems);
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = mode === 'edit' && roomTypeId
        ? await updateMerchantRoomTypeAPI(roomTypeId, formData)
        : await createMerchantRoomTypeAPI(formData);

      window.localStorage.removeItem(draftKey);
      message.success(mode === 'edit' ? '房型修改已提交审核。' : '房型已提交审核。');
      closeFormModal();
      if (typeof onSuccess === 'function') {
        onSuccess(response.data);
      }
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(getRequestErrorMessage(error, '提交房型失败。'));
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, draftKey, form, imageItems, mode, onSuccess, roomTypeId]);

  return {
    form,
    formState: {
      open,
      mode,
      loading,
      submitting,
      imageFileList,
      statusNotice,
    },
    formActions: {
      openCreateModal,
      openEditModal,
      closeFormModal,
      handleBeforeUpload,
      removeImage,
      handleSaveDraft,
      handleSubmit,
    },
  };
}
