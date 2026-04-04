import React from 'react';
import {
  Alert,
  Form,
  Tag,
} from 'antd';
import {
  getFileUrl,
  getRequestErrorMessage,
  getMerchantHotelCertificatesAPI,
  getMerchantHotelImagesAPI,
} from '../../../utils/request';
import {
  accommodationTypeOptions,
  certificateLeafGroups,
  certificateGroups,
  countryOptions,
  createEmptyHotelCertificates,
  createEmptyHotelImages,
  emptyHotelProfile,
  facilityCategoryList,
  hotelImageGroups,
  hotelInfoTabs,
  MAX_CUSTOM_FACILITY_LENGTH,
  MAX_INTRODUCTION_LENGTH,
  starLevelOptions,
} from '../../../utils/hotel-info';
import { toUploadFileItem, useGroupedMediaDraft } from '../../../utils/common';
import { validateEmail, validatePhone } from '../../../utils/validateRules';
import useHotelInfoMap from './hooks/useHotelInfoMap';
import useHotelInfoProfile from './hooks/useHotelInfoProfile';
import FormActions from './modules/FormActions';
import HotelInfoTabs from './HotelInfoTabs';
import './index.scss';

export default function HotelInfoCore() {
  const [form] = Form.useForm();
  const resolveImageUrl = getFileUrl;

  const {
    groupedItems: hotelImages,
    loadError: imageLoadError,
    beforeUpload: beforeHotelImageUpload,
    removeItem: removeHotelImage,
    loadItems: loadHotelImages,
    handleRetryLoad: handleRetryLoadImages,
    resetState: resetHotelImagesState,
  } = useGroupedMediaDraft({
    groups: hotelImageGroups,
    createEmptyState: createEmptyHotelImages,
    loadApi: getMerchantHotelImagesAPI,
    resolveImageUrl,
    fallbackName: 'image.png',
    loadErrorMessage: '获取酒店图片失败，请稍后重试',
    loadErrorMessageKey: 'merchant-hotel-image-load-error',
  });
  const {
    groupedItems: hotelCertificates,
    loadError: certificateLoadError,
    beforeUpload: beforeCertificateUpload,
    removeItem: removeHotelCertificate,
    loadItems: loadHotelCertificates,
    handleRetryLoad: handleRetryLoadCertificates,
    resetState: resetHotelCertificatesState,
  } = useGroupedMediaDraft({
    groups: certificateLeafGroups,
    createEmptyState: createEmptyHotelCertificates,
    loadApi: getMerchantHotelCertificatesAPI,
    resolveImageUrl,
    fallbackName: 'certificate.png',
    loadErrorMessage: '获取资质证件失败，请稍后重试',
    loadErrorMessageKey: 'merchant-hotel-certificate-load-error',
  });

  const { profileState, profileActions } = useHotelInfoProfile({
    form,
    hotelImages,
    hotelCertificates,
    loadHotelImages,
    loadHotelCertificates,
    resetHotelImagesState,
    resetHotelCertificatesState,
    getErrorMessage: getRequestErrorMessage,
  });

  const { mapState, mapRefs, mapValues, mapActions } = useHotelInfoMap({
    form,
    activeTab: profileState.activeTab,
    isReviewing: profileState.isReviewing,
    loading: profileState.loading,
    getErrorMessage: getRequestErrorMessage,
  });

  const isOpen24Hours = Form.useWatch(['operationRules', 'isOpen24Hours'], form);

  const handleOpen24HoursChange = (event) => {
    const checked = Boolean(event?.target?.checked);
    const latestRules = form.getFieldValue(['operationRules']) || emptyHotelProfile.operationRules;
    form.setFieldsValue({
      operationRules: {
        ...latestRules,
        isOpen24Hours: checked,
        businessStartTime: checked ? '00:00' : (latestRules.businessStartTime || '09:00'),
        businessEndTime: checked ? '23:59' : (latestRules.businessEndTime || '18:00'),
      },
    });
  };

  const formActionsNode = (
    <FormActions
      saving={profileState.saving}
      submitting={profileState.submitting}
      onSave={profileActions.handleSaveProfile}
      onSubmit={profileActions.handleSubmitProfile}
      onPrev={profileActions.handleGoPrevTab}
      onNext={profileActions.handleGoNextTab}
      showPrev={profileState.hasPrevTab}
      showNext={profileState.hasNextTab}
      prevDisabled={profileState.saving || profileState.submitting}
      nextDisabled={profileState.saving || profileState.submitting}
      showSubmit={profileState.isCertificatesTab}
      saveDisabled={profileState.isReviewing || profileState.submitting}
      submitDisabled={!profileState.canSubmitReview}
    />
  );

  const renderMapAlerts = () => (
    <>
      {mapState.mapUnavailableReason ? <Alert type="warning" showIcon message="地图不可用" description={mapState.mapUnavailableReason} style={{ marginBottom: 12 }} /> : null}
      {mapState.mapLoadError ? <Alert type="warning" showIcon message="地图加载失败" description={mapState.mapLoadError} style={{ marginBottom: 12 }} /> : null}
      {mapState.addressLocateError ? <Alert type="warning" showIcon message="根据地址定位失败" description={mapState.addressLocateError} style={{ marginBottom: 12 }} /> : null}
      {mapState.pointPickError ? <Alert type="warning" showIcon message="根据地图选点回填地址失败" description={mapState.pointPickError} style={{ marginBottom: 12 }} /> : null}
    </>
  );

  const basicProps = {
    accommodationTypeOptions,
    starLevelOptions,
    countryOptions,
    provinceOptions: mapState.provinceOptions,
    cityOptions: mapState.cityOptions,
    districtOptions: mapState.districtOptions,
    regionLoading: mapState.regionLoading,
    addressValue: mapValues.addressValue,
    handleProvinceChange: mapActions.handleProvinceChange,
    handleCityChange: mapActions.handleCityChange,
    handleDistrictChange: mapActions.handleDistrictChange,
    handleDetailInputChange: mapActions.handleDetailInputChange,
    renderMapAlerts,
    previewMapContainerRef: mapRefs.previewMapContainerRef,
    handleSaveAddressDraft: mapActions.handleSaveAddressDraft,
    setMapModalOpen: mapActions.setMapModalOpen,
    mapModalOpen: mapState.mapModalOpen,
    modalMapContainerRef: mapRefs.modalMapContainerRef,
    mapLoadError: mapState.mapLoadError,
    onMapModalAfterOpenChange: mapActions.onMapModalAfterOpenChange,
    mapStatusText: mapState.mapStatusText,
    mapUnavailableReason: mapState.mapUnavailableReason,
    mapActionDisabled: profileState.isReviewing || Boolean(mapState.mapUnavailableReason),
    validatePhone,
    validateEmail,
    MAX_INTRODUCTION_LENGTH,
    isOpen24Hours,
    handleOpen24HoursChange,
    readOnly: profileState.isReviewing,
  };

  const imagesProps = {
    hotelImageGroups,
    imageLoadError,
    onRetryLoadImages: handleRetryLoadImages,
    hotelImages,
    onDeleteImage: removeHotelImage,
    beforeHotelImageUpload,
    toUploadFileItem,
    readOnly: profileState.isReviewing,
  };

  const facilitiesProps = {
    facilityCategoryList,
    customFacilityInput: profileState.customFacilityInput,
    setCustomFacilityInput: profileActions.setCustomFacilityInput,
    MAX_CUSTOM_FACILITY_LENGTH,
    handleAddCustomFacility: profileActions.handleAddCustomFacility,
    customFacilities: profileState.customFacilities,
    handleRemoveCustomFacility: profileActions.handleRemoveCustomFacility,
    readOnly: profileState.isReviewing,
  };

  const certificatesProps = {
    certificateGroups,
    certificateLoadError,
    onRetryLoadCertificates: handleRetryLoadCertificates,
    hotelCertificates,
    onDeleteCertificate: removeHotelCertificate,
    beforeCertificateUpload,
    toUploadFileItem,
    readOnly: profileState.isReviewing,
  };

  return (
    <div className="page-container hotel-info">
      <div className="hotel-info__header">
        <div>
          <h2 className="hotel-info__title">酒店资料</h2>
          <p className="hotel-info__subtitle">完善酒店资料，便于后续审核与展示。</p>
        </div>
        <Tag color={profileState.reviewStatusMeta.color} className="hotel-info__status-tag">{profileState.reviewStatusMeta.text}</Tag>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={emptyHotelProfile}
        className="hotel-info__form"
        disabled={profileState.isReviewing || profileState.initializing}
      >
        <HotelInfoTabs
          activeTab={profileState.activeTab}
          setActiveTab={profileActions.setActiveTab}
          tabs={hotelInfoTabs}
          basicProps={basicProps}
          imagesProps={imagesProps}
          facilitiesProps={facilitiesProps}
          certificatesProps={certificatesProps}
        />
        {formActionsNode}
      </Form>
    </div>
  );
}
