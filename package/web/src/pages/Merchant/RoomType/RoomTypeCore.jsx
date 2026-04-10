import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Col, Empty, Pagination, Row, Spin, message } from 'antd';
import useRoomTypeList from './hooks/useRoomTypeList';
import useRoomTypeForm from './hooks/useRoomTypeForm';
import FilterBar from './modules/FilterBar';
import RoomTypeCard from './modules/RoomTypeCard';
import RoomTypeFormModal from './modules/RoomTypeFormModal';
import RoomTypeDetailDrawer from './modules/RoomTypeDetailDrawer';
import { getRequestErrorMessage } from '../../../utils/request';
import { loadMerchantHotelSnapshot } from '../../../utils/hotel-info';
import './index.scss';

export default function RoomTypeCore() {
  const { userInfo } = useSelector((state) => state.user);
  const merchantUserId = userInfo?.id || null;
  const { listState, listActions } = useRoomTypeList({ merchantUserId });
  const [hotelReviewStatus, setHotelReviewStatus] = useState(null);
  const [hotelFacilityOptions, setHotelFacilityOptions] = useState([]);
  const [hotelStatusLoading, setHotelStatusLoading] = useState(true);
  const [listReady, setListReady] = useState(false);
  const { form, formState, formActions } = useRoomTypeForm({
    hotelFacilityOptions,
    createDraft: listState.createDraft,
    editDraftMap: listState.editDraftMap,
    onSuccess: () => {
      listActions.clearSelection();
      listActions.refreshList();
    },
    onDraftSaved: listActions.refreshDrafts,
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setHotelStatusLoading(true);
        const snapshot = await loadMerchantHotelSnapshot();
        if (!active) {
          return;
        }
        setHotelReviewStatus(snapshot.reviewStatus);
        setHotelFacilityOptions(snapshot.roomTypeFacilityOptions || []);
      } catch (error) {
        if (!active) {
          return;
        }
        setHotelReviewStatus(null);
        setHotelFacilityOptions([]);
        message.error(getRequestErrorMessage(error, '获取酒店审核状态失败。'));
      } finally {
        if (active) {
          setHotelStatusLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!listReady && !listState.loading) {
      setListReady(true);
    }
  }, [listReady, listState.loading]);

  const canCreateRoomType = hotelReviewStatus === 'approved';
  const createDisabledReason = hotelStatusLoading
    ? '正在获取酒店审核状态...'
    : '酒店信息审核通过后才能添加房型';
  const handleCreate = useCallback(() => {
    formActions.openCreateModal({
      canCreate: canCreateRoomType,
      disabledReason: createDisabledReason,
    });
  }, [canCreateRoomType, createDisabledReason, formActions]);

  return (
    <div className="page-container room-type-page">
      <div className="room-type__page-head">
        <div>
          <h2 className="room-type__title">房型管理</h2>
          <p className="room-type__subtitle">管理酒店房型信息、审核状态与售卖状态，确保流程闭环。</p>
        </div>
      </div>

      {listState.hasAnyDraft ? (
        <Alert
          type="warning"
          showIcon
          title="您有未提交的草稿，当前展示为修改后内容，提交审核通过后才会正式生效。"
          className="room-type__draft-alert"
        />
      ) : null}

      <FilterBar
        filters={listState.filters}
        keywordInput={listState.keywordInput}
        searchOptions={listState.searchOptions}
        searchDropdownOpen={listState.searchDropdownOpen}
        searchLoading={listState.searchLoading}
        selectedCount={listState.selectedCount}
        showBatchActions={listState.showBatchActions}
        onKeywordChange={listActions.handleKeywordChange}
        onSearch={listActions.handleSearch}
        onSearchFocus={listActions.handleSearchFocus}
        onSearchBlur={listActions.handleSearchBlur}
        onSelectSuggestion={listActions.handleSelectSuggestion}
        onAuditChange={listActions.handleAuditFilterChange}
        onSaleChange={listActions.handleSaleFilterChange}
        canCreate={canCreateRoomType}
        createLoading={hotelStatusLoading}
        createDisabledReason={createDisabledReason}
        onCreate={handleCreate}
        onBatchUp={() => listActions.handleBatchToggleSale(true)}
        onBatchDown={() => listActions.handleBatchToggleSale(false)}
      />

      {listReady ? (
        <Spin spinning={listState.loading}>
          {listState.records.length ? (
            <>
              <Row gutter={[18, 18]}>
                {listState.records.map((record) => (
                  <Col xs={24} lg={12} key={record.id} className="room-type__grid-col">
                    <RoomTypeCard
                      record={record}
                      selected={listState.selectedSet.has(Number(record.id))}
                      onToggleSelect={listActions.toggleSelect}
                      onView={listActions.openDetail}
                      onEdit={formActions.openEditModal}
                      onDelete={listActions.handleDelete}
                      onToggleSale={listActions.handleToggleSale}
                    />
                  </Col>
                ))}
              </Row>
              <div className="room-type__pagination">
                <Pagination
                  current={listState.pagination.current}
                  pageSize={listState.pagination.pageSize}
                  total={listState.pagination.total}
                  showSizeChanger
                  onChange={listActions.handlePageChange}
                  onShowSizeChange={listActions.handlePageSizeChange}
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          ) : (
            <Empty className="room-type__empty" description="暂无房型，点击右上角添加房型开始管理。" />
          )}
        </Spin>
      ) : null}

      <RoomTypeFormModal
        form={form}
        open={formState.open}
        mode={formState.mode}
        loading={formState.loading}
        submitting={formState.submitting}
        imageFileList={formState.imageFileList}
        statusNotice={formState.statusNotice}
        editLocked={formState.editLocked}
        submitDisabled={formState.submitDisabled}
        bedConfigIssue={formState.bedConfigIssue}
        hotelFacilityOptions={formState.hotelFacilityOptions}
        facilityTagIssue={formState.facilityTagIssue}
        onClose={formActions.closeFormModal}
        onBeforeUpload={formActions.handleBeforeUpload}
        onRemoveImage={formActions.removeImage}
        onSaveDraft={formActions.handleSaveDraft}
        onSubmit={formActions.handleSubmit}
      />

      <RoomTypeDetailDrawer
        open={listState.detailOpen}
        loading={listState.detailLoading}
        roomType={listState.detailData}
        onClose={listActions.closeDetail}
      />
    </div>
  );
}
