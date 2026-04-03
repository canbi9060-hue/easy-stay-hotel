import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  getMerchantHotelProfileAPI,
  submitMerchantHotelProfileReviewAPI,
  updateMerchantHotelProfileAPI,
} from '../../../../utils/request';
import {
  emptyHotelProfile,
  hotelInfoTabs,
  MAX_CUSTOM_FACILITY_COUNT,
  MAX_CUSTOM_FACILITY_LENGTH,
  normalizeHotelProfile,
  reviewStatusMap,
} from '../../../../utils/hotel-info';

const addressDraftStorageKey = 'merchant_hotel_address_draft';
const hotelInfoLoadMessageKey = 'merchant-hotel-info-load-error';
const reviewRequiredCertificateGroupKeys = ['business_license', 'legal_person_front', 'legal_person_back', 'special_permit'];

export default function useHotelInfoProfile({
  form,
  hotelCertificates,
  loadHotelImages,
  loadHotelCertificates,
  resetHotelImagesState,
  resetHotelCertificatesState,
  getErrorMessage,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(hotelInfoTabs[0].key);
  const [customFacilityInput, setCustomFacilityInput] = useState('');
  const [customFacilities, setCustomFacilities] = useState([]);
  const [reviewStatus, setReviewStatus] = useState(emptyHotelProfile.reviewStatus);

  const reviewStatusMeta = reviewStatusMap[reviewStatus] || reviewStatusMap.incomplete;
  const isReviewing = reviewStatus === 'reviewing';
  const isCertificatesTab = activeTab === 'certificates';
  const hasRequiredCertificates = reviewRequiredCertificateGroupKeys.every((groupKey) => (hotelCertificates[groupKey] || []).length > 0);
  const canSubmitReview = !isReviewing && hasRequiredCertificates;

  const tabOrder = useMemo(() => hotelInfoTabs.map((item) => item.key), []);
  const activeTabIndex = tabOrder.indexOf(activeTab);
  const hasPrevTab = activeTabIndex > 0;
  const hasNextTab = activeTabIndex >= 0 && activeTabIndex < tabOrder.length - 1;

  const normalizeAndApplyProfile = useCallback((profileData) => {
    const profile = normalizeHotelProfile(profileData);
    form.setFieldsValue(profile);
    setCustomFacilities(profile.customFacilities || []);
    setReviewStatus(profile.reviewStatus || emptyHotelProfile.reviewStatus);
    return profile;
  }, [form]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const profileRes = await getMerchantHotelProfileAPI();
        normalizeAndApplyProfile(profileRes?.data);
        await loadHotelImages({ notify: false });
        await loadHotelCertificates({ notify: false });
      } catch (error) {
        form.setFieldsValue(emptyHotelProfile);
        setCustomFacilities(emptyHotelProfile.customFacilities || []);
        setReviewStatus(emptyHotelProfile.reviewStatus);
        resetHotelImagesState();
        resetHotelCertificatesState();
        message.open({
          key: hotelInfoLoadMessageKey,
          type: 'error',
          content: getErrorMessage(error, '加载酒店资料失败，请稍后重试。'),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [
    form,
    getErrorMessage,
    loadHotelCertificates,
    loadHotelImages,
    normalizeAndApplyProfile,
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

  const saveAllProfile = useCallback(async () => {
    const formValues = form.getFieldsValue(true);
    const values = normalizeHotelProfile({
      ...formValues,
      customFacilities,
    });
    const saved = await updateMerchantHotelProfileAPI(values);
    normalizeAndApplyProfile(saved?.data);
    window.sessionStorage.removeItem(addressDraftStorageKey);
    return values;
  }, [customFacilities, form, normalizeAndApplyProfile]);

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

  const handleSubmitProfile = useCallback(async () => {
    if (!canSubmitReview || isReviewing) return;
    try {
      setSubmitting(true);
      let values;
      try {
        values = await saveAllProfile();
      } catch (error) {
        message.error(getErrorMessage(error, '保存酒店资料失败。'));
        return;
      }
      const submitted = await submitMerchantHotelProfileReviewAPI(values);
      normalizeAndApplyProfile(submitted?.data);
      message.success('酒店资料已提交审核。');
    } catch (error) {
      message.error(getErrorMessage(error, '提交酒店资料失败。'));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmitReview, getErrorMessage, isReviewing, normalizeAndApplyProfile, saveAllProfile]);

  return {
    profileState: {
      loading,
      saving,
      submitting,
      activeTab,
      customFacilityInput,
      customFacilities,
      reviewStatusMeta,
      isReviewing,
      isCertificatesTab,
      canSubmitReview,
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
