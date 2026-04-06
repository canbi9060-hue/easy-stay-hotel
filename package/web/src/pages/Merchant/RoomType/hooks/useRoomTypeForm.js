import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message, Upload } from 'antd';
import {
  getFileUrl,
  getMerchantRoomTypeDetailAPI,
  getRequestErrorMessage,
} from '../../../../utils/request';
import {
  buildRoomTypeFloorText,
  createDraftImageItem,
  createExistingImageItem,
  createNewImageItem,
  emptyRoomTypeFormValues,
  getRoomTypeEditNotice,
  hasHotelFloorInfo,
  maxRoomTypeImageCount,
  normalizeHotelFloorInfo,
  normalizeRoomTypeFormValues,
  resolveRoomTypeFacilitySelection,
  resolveRoomTypeFloorSelection,
  revokeDraftPreviewUrls,
  saveMerchantRoomTypeCreateDraft,
  saveMerchantRoomTypeEditDraft,
  submitMerchantRoomTypeCreate,
  submitMerchantRoomTypeEdit,
  validateRoomTypeImageFile,
  isPendingRoomType,
} from '../../../../utils/room-type';
import { toUploadFileItem } from '../../../../utils/common';

export default function useRoomTypeForm({
  hotelFloorInfo,
  hotelFacilityOptions = [],
  createDraft,
  editDraftMap = {},
  onSuccess,
  onDraftSaved,
}) {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [roomTypeId, setRoomTypeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageItems, setImageItems] = useState([]);
  const [detail, setDetail] = useState(null);
  const [floorSelectionIssue, setFloorSelectionIssue] = useState(null);
  const [facilityTagIssue, setFacilityTagIssue] = useState(null);
  const floorStart = Form.useWatch('floorStart', form);
  const floorEnd = Form.useWatch('floorEnd', form);
  const facilityTags = Form.useWatch('facilityTags', form);
  const normalizedHotelFloorInfo = useMemo(() => normalizeHotelFloorInfo(hotelFloorInfo), [hotelFloorInfo]);
  const normalizedHotelFacilityOptions = useMemo(() => {
    const seen = new Set();
    return Array.isArray(hotelFacilityOptions)
      ? hotelFacilityOptions.reduce((acc, item) => {
        const label = String(item?.label || item?.value || '').trim();
        if (!label || seen.has(label)) {
          return acc;
        }
        seen.add(label);
        acc.push({ label, value: label });
        return acc;
      }, [])
      : [];
  }, [hotelFacilityOptions]);

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
    setFloorSelectionIssue(null);
    setFacilityTagIssue(null);
    replaceImageItems([]);
  }, [form, replaceImageItems]);

  const closeFormModal = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setSubmitting(false);
    resetFormState();
  }, [resetFormState]);

  const statusNotice = useMemo(() => getRoomTypeEditNotice(detail), [detail]);
  const submitDisabled = mode === 'edit' && isPendingRoomType(detail);
  const editLocked = mode === 'edit' && isPendingRoomType(detail);
  const imageFileList = useMemo(
    () => imageItems.map((item) => toUploadFileItem(item, 'image.png')),
    [imageItems]
  );

  const applyRoomTypeValues = useCallback((sourceValues) => {
    const normalizedValues = normalizeRoomTypeFormValues(sourceValues, normalizedHotelFloorInfo);
    const floorSelection = resolveRoomTypeFloorSelection(normalizedValues.floorText, normalizedHotelFloorInfo);
    const nextFacilityTagIssue = resolveRoomTypeFacilitySelection(
      normalizedValues.facilityTags,
      normalizedHotelFacilityOptions
    );

    form.setFieldsValue(normalizedValues);
    setFloorSelectionIssue(floorSelection.isInvalid ? {
      message: floorSelection.invalidMessage,
      floorText: floorSelection.originalFloorText,
    } : null);
    setFacilityTagIssue(nextFacilityTagIssue.isInvalid ? {
      message: nextFacilityTagIssue.invalidMessage,
      invalidTags: nextFacilityTagIssue.invalidTags,
    } : null);
  }, [form, normalizedHotelFacilityOptions, normalizedHotelFloorInfo]);

  useEffect(() => {
    const nextFloorText = buildRoomTypeFloorText(floorStart, floorEnd);
    if (nextFloorText && floorSelectionIssue) {
      setFloorSelectionIssue(null);
    }

    const currentFloorText = String(form.getFieldValue('floorText') || '');
    const targetFloorText = nextFloorText || (floorSelectionIssue ? currentFloorText : '');
    if (currentFloorText !== targetFloorText) {
      form.setFieldValue('floorText', targetFloorText);
    }
  }, [floorEnd, floorSelectionIssue, floorStart, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextFacilityTagIssue = resolveRoomTypeFacilitySelection(
      facilityTags,
      normalizedHotelFacilityOptions
    );

    setFacilityTagIssue(nextFacilityTagIssue.isInvalid ? {
      message: nextFacilityTagIssue.invalidMessage,
      invalidTags: nextFacilityTagIssue.invalidTags,
    } : null);
  }, [facilityTags, normalizedHotelFacilityOptions, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        if (mode === 'edit' && roomTypeId) {
          const res = await getMerchantRoomTypeDetailAPI(roomTypeId);
          if (!active) {
            return;
          }

          const nextDetail = res.data;
          const draft = editDraftMap[Number(roomTypeId)] || null;
          const sourceValues = draft?.formValues || nextDetail;
          const sourceImages = draft?.images?.length
            ? draft.images.map((image) => createDraftImageItem(image, getFileUrl))
            : nextDetail.images.map((image) => createExistingImageItem(image, getFileUrl));

          setDetail(nextDetail);
          applyRoomTypeValues(sourceValues);
          replaceImageItems(sourceImages);
          return;
        }

        setDetail(null);
        const nextCreateDraft = createDraft || null;
        applyRoomTypeValues(nextCreateDraft?.formValues || emptyRoomTypeFormValues);
        replaceImageItems(nextCreateDraft?.images?.length
          ? nextCreateDraft.images.map((image) => createDraftImageItem(image, getFileUrl))
          : []);
      } catch (error) {
        if (!active) {
          return;
        }
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
  }, [applyRoomTypeValues, createDraft, editDraftMap, mode, open, replaceImageItems, resetFormState, roomTypeId]);

  const openCreateModal = useCallback((options = {}) => {
    if (options.canCreate === false) {
      message.warning(options.disabledReason || '酒店信息审核通过后才能添加房型');
      return;
    }
    if (createDraft) {
      message.warning('已存在 1 个新增房型草稿，请先完善并提交审核后再新建。');
      return;
    }
    setMode('create');
    setRoomTypeId(null);
    setOpen(true);
  }, [createDraft]);

  const openEditModal = useCallback((record) => {
    if (record?.isCreateDraft) {
      setMode('create');
      setRoomTypeId(null);
      setOpen(true);
      return;
    }
    if (isPendingRoomType(record)) {
      message.warning('房型正在审核中，暂不允许编辑。');
      return;
    }
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
    if (editLocked) {
      message.warning('房型正在审核中，暂不允许保存草稿。');
      return;
    }

    try {
      const values = {
        ...emptyRoomTypeFormValues,
        ...form.getFieldsValue(true),
      };
      if (mode === 'edit' && roomTypeId) {
        await saveMerchantRoomTypeEditDraft(roomTypeId, values, imageItems);
      } else {
        await saveMerchantRoomTypeCreateDraft(values, imageItems);
      }

      if (typeof onDraftSaved === 'function') {
        onDraftSaved();
      }
      message.success('草稿已保存。');
    } catch (error) {
      message.error(getRequestErrorMessage(error, '保存草稿失败，请稍后重试。'));
    }
  }, [editLocked, form, imageItems, mode, onDraftSaved, roomTypeId]);

  const handleFloorStartChange = useCallback((value) => {
    const nextFloorStart = value ?? null;
    form.setFieldValue('floorStart', nextFloorStart);
    const currentFloorEnd = Number(form.getFieldValue('floorEnd'));
    if (Number.isInteger(nextFloorStart) && Number.isInteger(currentFloorEnd) && currentFloorEnd < nextFloorStart) {
      form.setFieldValue('floorEnd', null);
    }
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      if (submitDisabled) {
        message.warning('房型正在审核中，暂不允许提交新的修改。');
        return;
      }
      if (!hasHotelFloorInfo(normalizedHotelFloorInfo)) {
        message.error('请先在酒店资料中完善总楼层。');
        return;
      }
      if (!normalizedHotelFacilityOptions.length) {
        message.error('请先在酒店信息页勾选或添加设施。');
        return;
      }
      if (floorSelectionIssue) {
        message.error(floorSelectionIssue.message);
        return;
      }
      if (facilityTagIssue) {
        message.error(facilityTagIssue.message);
        return;
      }

      const values = await form.validateFields();
      if (!Number.isInteger(Number(values.floorStart)) || !Number.isInteger(Number(values.floorEnd))) {
        message.error('请选择合法的楼层区间。');
        return;
      }
      if (!imageItems.length) {
        message.error('请至少上传 1 张房型图片。');
        return;
      }

      setSubmitting(true);
      const response = mode === 'edit' && roomTypeId
        ? await submitMerchantRoomTypeEdit(roomTypeId, values, imageItems)
        : await submitMerchantRoomTypeCreate(values, imageItems);

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
  }, [
    closeFormModal,
    facilityTagIssue,
    floorSelectionIssue,
    form,
    imageItems,
    mode,
    normalizedHotelFacilityOptions.length,
    normalizedHotelFloorInfo,
    onSuccess,
    roomTypeId,
    submitDisabled,
  ]);

  return {
    form,
    formState: {
      open,
      mode,
      loading,
      submitting,
      imageFileList,
      statusNotice,
      editLocked,
      submitDisabled,
      hotelFloorInfo: normalizedHotelFloorInfo,
      floorSelectionIssue,
      hotelFacilityOptions: normalizedHotelFacilityOptions,
      facilityTagIssue,
    },
    formActions: {
      openCreateModal,
      openEditModal,
      closeFormModal,
      handleBeforeUpload,
      handleFloorStartChange,
      removeImage,
      handleSaveDraft,
      handleSubmit,
    },
  };
}
