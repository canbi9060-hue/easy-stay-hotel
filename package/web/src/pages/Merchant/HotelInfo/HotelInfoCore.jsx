import React, { useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Modal,
  Space,
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
  MAX_TOTAL_FLOOR_COUNT,
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
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
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
    loading: profileState.loading,
    readOnly: profileState.isReviewing,
    getErrorMessage: getRequestErrorMessage,
  });

  const isOpen24Hours = Form.useWatch(['operationRules', 'isOpen24Hours'], form);
  const totalFloorCount = Form.useWatch(['floorInfo', 'totalFloorCount'], form) || emptyHotelProfile.floorInfo.totalFloorCount;
  const isReadOnly = profileState.isReviewing;
  const sharedReadOnlyProps = { readOnly: isReadOnly };

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
      saveDisabled={profileState.submitting || isReadOnly}
      submitDisabled={!profileState.canSubmitReview}
    />
  );

  const renderMapAlerts = () => (
    <>
      {mapState.mapUnavailableReason ? <Alert type="warning" showIcon title="地图不可用" description={mapState.mapUnavailableReason} style={{ marginBottom: 12 }} /> : null}
      {mapState.mapLoadError ? <Alert type="warning" showIcon title="地图加载失败" description={mapState.mapLoadError} style={{ marginBottom: 12 }} /> : null}
      {mapState.addressLocateError ? <Alert type="warning" showIcon title={mapState.addressLocateErrorTitle || '根据地址定位失败'} description={mapState.addressLocateError} style={{ marginBottom: 12 }} /> : null}
      {mapState.markerResolveError ? <Alert type="warning" showIcon title="拖动地图标记回填地址失败" description={mapState.markerResolveError} style={{ marginBottom: 12 }} /> : null}
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
    handleDetailSearch: mapActions.handleDetailSearch,
    handleDetailSelect: mapActions.handleDetailSelect,
    detailAutocompleteOptions: mapState.detailAutocompleteOptions,
    detailAutocompleteLoading: mapState.detailAutocompleteLoading,
    renderMapAlerts,
    previewMapContainerRef: mapRefs.previewMapContainerRef,
    setMapModalOpen: mapActions.setMapModalOpen,
    mapModalOpen: mapState.mapModalOpen,
    modalMapContainerRef: mapRefs.modalMapContainerRef,
    mapLoadError: mapState.mapLoadError,
    onMapModalAfterOpenChange: mapActions.onMapModalAfterOpenChange,
    mapStatusText: mapState.mapStatusText,
    mapUnavailableReason: mapState.mapUnavailableReason,
    mapActionDisabled: Boolean(mapState.mapUnavailableReason || mapState.mapLoadError),
    validatePhone,
    validateEmail,
    MAX_INTRODUCTION_LENGTH,
    totalFloorCount,
    MAX_TOTAL_FLOOR_COUNT,
    isOpen24Hours,
    handleOpen24HoursChange,
    ...sharedReadOnlyProps,
  };

  const imagesProps = {
    hotelImageGroups,
    imageLoadError,
    onRetryLoadImages: handleRetryLoadImages,
    hotelImages,
    onDeleteImage: removeHotelImage,
    beforeHotelImageUpload,
    toUploadFileItem,
    ...sharedReadOnlyProps,
  };

  const facilitiesProps = {
    facilityCategoryList,
    customFacilityInput: profileState.customFacilityInput,
    setCustomFacilityInput: profileActions.setCustomFacilityInput,
    MAX_CUSTOM_FACILITY_LENGTH,
    handleAddCustomFacility: profileActions.handleAddCustomFacility,
    customFacilities: profileState.customFacilities,
    handleRemoveCustomFacility: profileActions.handleRemoveCustomFacility,
    ...sharedReadOnlyProps,
  };

  const certificatesProps = {
    certificateGroups,
    certificateLoadError,
    onRetryLoadCertificates: handleRetryLoadCertificates,
    hotelCertificates,
    onDeleteCertificate: removeHotelCertificate,
    beforeCertificateUpload,
    toUploadFileItem,
    ...sharedReadOnlyProps,
  };

  return (
    <div className="page-container hotel-info">
      <div className="hotel-info__header">
        <div>
          <h2 className="hotel-info__title">酒店资料</h2>
          <p className="hotel-info__subtitle">完善酒店资料，便于后续审核与展示。</p>
        </div>
        {profileState.statusReady && profileState.reviewStatusMeta ? (
          <Space size={8} wrap>
            <Tag color={profileState.reviewStatusMeta.color} className="hotel-info__status-tag">{profileState.reviewStatusMeta.text}</Tag>
            {profileState.reviewStatus === 'rejected_pending_fix' && profileState.reviewRemark ? (
              <Button type="link" onClick={() => setReasonModalOpen(true)}>
                查看原因
              </Button>
            ) : null}
          </Space>
        ) : null}
      </div>

      {profileState.hasPendingDraft && !profileState.isReviewing ? (
        <Alert
          type="warning"
          showIcon
          title="您当前有未提交的修改内容，提交审核后才会正式生效。"
          className="hotel-info__draft-alert"
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={emptyHotelProfile}
        className="hotel-info__form"
        disabled={profileState.initializing}
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

      <Modal
        open={reasonModalOpen}
        title="驳回原因"
        footer={null}
        onCancel={() => setReasonModalOpen(false)}
      >
        <Alert
          type="error"
          showIcon
          title="酒店资料审核未通过"
          description={profileState.reviewRemark || '暂无驳回原因'}
        />
      </Modal>
    </div>
  );
}
