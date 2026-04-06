import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  certificateGroupLabels,
  emptyHotelProfile,
  findMissingRequiredMediaGroups,
  hotelInfoTabs,
  hotelImageGroupLabels,
  MAX_CUSTOM_FACILITY_COUNT,
  MAX_CUSTOM_FACILITY_LENGTH,
  loadMerchantHotelSnapshot,
  normalizeMerchantHotelSnapshot,
  normalizeHotelProfile,
  reviewRequiredCertificateGroupKeys,
  reviewRequiredImageGroupKeys,
  reviewStatusMap,
  saveMerchantHotelProfileSnapshot,
  submitMerchantHotelProfileSnapshot,
} from '../../../../utils/hotel-info';

const addressDraftStorageKey = 'merchant_hotel_address_draft';
const hotelInfoLoadMessageKey = 'merchant-hotel-info-load-error';

export default function useHotelInfoProfile({
  form,
  hotelImages,
  hotelCertificates,
  loadHotelImages,
  loadHotelCertificates,
  resetHotelImagesState,
  resetHotelCertificatesState,
  getErrorMessage,
}) {
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(hotelInfoTabs[0].key);
  const [customFacilityInput, setCustomFacilityInput] = useState('');
  const [customFacilities, setCustomFacilities] = useState([]);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [reviewRemark, setReviewRemark] = useState(emptyHotelProfile.reviewRemark);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);

  const statusReady = reviewStatus !== null;
  const reviewStatusMeta = statusReady ? (reviewStatusMap[reviewStatus] || null) : null;
  const isReviewing = reviewStatus === 'reviewing';
  const isCertificatesTab = activeTab === 'certificates';
  const submitValidation = useMemo(() => {
    const missingImageGroups = findMissingRequiredMediaGroups(hotelImages, reviewRequiredImageGroupKeys);
    const missingCertificateGroups = findMissingRequiredMediaGroups(hotelCertificates, reviewRequiredCertificateGroupKeys);
    return {
      missingImageGroups,
      missingCertificateGroups,
      ready: missingImageGroups.length === 0 && missingCertificateGroups.length === 0,
    };
  }, [hotelCertificates, hotelImages]);
  const canSubmitReview = !isReviewing && submitValidation.ready;

  const tabOrder = useMemo(() => hotelInfoTabs.map((item) => item.key), []);
  const activeTabIndex = tabOrder.indexOf(activeTab);
  const hasPrevTab = activeTabIndex > 0;
  const hasNextTab = activeTabIndex >= 0 && activeTabIndex < tabOrder.length - 1;

  const applyHotelSnapshot = useCallback((snapshot) => {
    const profile = snapshot?.profile || normalizeHotelProfile();
    form.setFieldsValue(profile);
    setCustomFacilities(profile.customFacilities);
    setReviewStatus(snapshot?.reviewStatus ?? profile.reviewStatus);
    setReviewRemark(snapshot?.reviewRemark ?? (profile.reviewRemark || ''));
    setHasPendingDraft(Boolean(snapshot?.hasPendingDraft));
    return profile;
  }, [form]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setInitializing(true);
        setReviewStatus(null);
        setReviewRemark('');
        const snapshot = await loadMerchantHotelSnapshot();
        if (!active) return;
        applyHotelSnapshot(snapshot);
        loadHotelImages({ notify: false });
        loadHotelCertificates({ notify: false });
      } catch (error) {
        if (!active) return;
        form.setFieldsValue(emptyHotelProfile);
        setCustomFacilities(emptyHotelProfile.customFacilities);
        setReviewStatus(null);
        setReviewRemark(emptyHotelProfile.reviewRemark);
        setHasPendingDraft(false);
        resetHotelImagesState();
        resetHotelCertificatesState();
        message.open({
          key: hotelInfoLoadMessageKey,
          type: 'error',
          content: getErrorMessage(error, '加载酒店资料失败，请稍后重试。'),
        });
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    form,
    getErrorMessage,
    loadHotelCertificates,
    loadHotelImages,
    applyHotelSnapshot,
    resetHotelCertificatesState,
    resetHotelImagesState,
  ]);

  const handleAddCustomFacility = useCallback(() => {
    const normalizedName = String(customFacilityInput || '').trim().slice(0, MAX_CUSTOM_FACILITY_LENGTH);
    if (!normalizedName) {
      message.warning('请输入设施名称后再添加。');
      return;
    }

    if (customFacilities.includes(normalizedName)) {
      message.warning('该自定义设施已存在。');
      return;
    }
    if (customFacilities.length >= MAX_CUSTOM_FACILITY_COUNT) {
      message.warning('最多可添加 ' + MAX_CUSTOM_FACILITY_COUNT + ' 项自定义设施。');
      return;
    }

    setCustomFacilities((prev) => [...prev, normalizedName]);
    setCustomFacilityInput('');
  }, [customFacilities, customFacilityInput]);

  const handleRemoveCustomFacility = useCallback((facilityName) => {
    setCustomFacilities((prev) => prev.filter((item) => item !== facilityName));
  }, []);

  const refreshProfileMediaState = useCallback(async () => {
    await loadHotelImages({ notify: false });
    await loadHotelCertificates({ notify: false });
    window.sessionStorage.removeItem(addressDraftStorageKey);
  }, [loadHotelCertificates, loadHotelImages]);

  const saveAllProfile = useCallback(async () => {
    const saved = await saveMerchantHotelProfileSnapshot({
      formValues: form.getFieldsValue(true),
      customFacilities,
      hotelImages,
      hotelCertificates,
    });
    applyHotelSnapshot(normalizeMerchantHotelSnapshot(saved.data));
    await refreshProfileMediaState();
    return saved.data;
  }, [
    applyHotelSnapshot,
    customFacilities,
    form,
    hotelCertificates,
    hotelImages,
    refreshProfileMediaState,
  ]);

  const goToTabByIndex = useCallback((targetIndex) => {
    if (targetIndex < 0 || targetIndex >= tabOrder.length) return;
    setActiveTab(tabOrder[targetIndex]);
  }, [tabOrder]);

  const handleGoPrevTab = useCallback(() => {
    if (!hasPrevTab) return;
    goToTabByIndex(activeTabIndex - 1);
  }, [activeTabIndex, goToTabByIndex, hasPrevTab]);

  const handleGoNextTab = useCallback(() => {
    if (!hasNextTab) return;
    goToTabByIndex(activeTabIndex + 1);
  }, [activeTabIndex, goToTabByIndex, hasNextTab]);

  const handleSaveProfile = useCallback(async () => {
    if (isReviewing) return;
    try {
      setSaving(true);
      await saveAllProfile();
      message.success('酒店资料保存成功。');
    } catch (error) {
      message.error(getErrorMessage(error, '保存酒店资料失败。'));
    } finally {
      setSaving(false);
    }
  }, [getErrorMessage, isReviewing, saveAllProfile]);

  const handleSubmitValidationFailed = useCallback(() => {
    const [missingImageGroup] = submitValidation.missingImageGroups;
    if (missingImageGroup) {
      setActiveTab('images');
      const groupLabel = hotelImageGroupLabels[missingImageGroup] || '酒店图片';
      message.warning(`${groupLabel}至少上传 1 张后才能提交审核。`);
      return true;
    }

    const [missingCertificateGroup] = submitValidation.missingCertificateGroups;
    if (missingCertificateGroup) {
      setActiveTab('certificates');
      const groupLabel = certificateGroupLabels[missingCertificateGroup] || '资质证件';
      message.warning(`${groupLabel}至少上传 1 张后才能提交审核。`);
      return true;
    }

    return false;
  }, [submitValidation]);

  const handleSubmitProfile = useCallback(async () => {
    if (isReviewing) return;
    if (!submitValidation.ready) {
      handleSubmitValidationFailed();
      return;
    }
    try {
      setSubmitting(true);
      const submitted = await submitMerchantHotelProfileSnapshot({
        formValues: form.getFieldsValue(true),
        customFacilities,
        hotelImages,
        hotelCertificates,
      });
      applyHotelSnapshot(normalizeMerchantHotelSnapshot(submitted.data));
      await refreshProfileMediaState();
      message.success('酒店资料已提交审核。');
    } catch (error) {
      message.error(getErrorMessage(error, '提交酒店资料失败。'));
    } finally {
      setSubmitting(false);
    }
  }, [
    getErrorMessage,
    handleSubmitValidationFailed,
    isReviewing,
    applyHotelSnapshot,
    customFacilities,
    form,
    hotelCertificates,
    hotelImages,
    refreshProfileMediaState,
    submitValidation.ready,
  ]);

  return {
    profileState: {
      loading: initializing,
      initializing,
      saving,
      submitting,
      activeTab,
      customFacilityInput,
      customFacilities,
      reviewStatus,
      reviewRemark,
      hasPendingDraft,
      statusReady,
      reviewStatusMeta,
      isReviewing,
      isCertificatesTab,
      canSubmitReview,
      submitValidation,
      hasPrevTab,
      hasNextTab,
    },
    profileActions: {
      setActiveTab,
      setCustomFacilityInput,
      handleAddCustomFacility,
      handleRemoveCustomFacility,
      handleGoPrevTab,
      handleGoNextTab,
      handleSaveProfile,
      handleSubmitProfile,
    },
  };
}
