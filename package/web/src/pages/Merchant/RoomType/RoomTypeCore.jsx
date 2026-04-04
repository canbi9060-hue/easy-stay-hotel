import React from 'react';
import { Col, Empty, Pagination, Row, Spin } from 'antd';
import useRoomTypeList from './hooks/useRoomTypeList';
import useRoomTypeForm from './hooks/useRoomTypeForm';
import FilterBar from './modules/FilterBar';
import RoomTypeCard from './modules/RoomTypeCard';
import RoomTypeFormModal from './modules/RoomTypeFormModal';
import RoomTypeDetailDrawer from './modules/RoomTypeDetailDrawer';
import './index.scss';

export default function RoomTypeCore() {
  const { listState, listActions } = useRoomTypeList();
  const { form, formState, formActions } = useRoomTypeForm({
    onSuccess: () => {
      listActions.clearSelection();
      listActions.refreshList();
    },
  });

  return (
    <div className="page-container room-type-page">
      <div className="room-type__page-head">
        <div>
          <h2 className="room-type__title">房型管理</h2>
          <p className="room-type__subtitle">管理酒店房型信息、审核状态与售卖状态，确保流程闭环。</p>
        </div>
      </div>

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
        onCreate={formActions.openCreateModal}
        onBatchUp={() => listActions.handleBatchToggleSale(true)}
        onBatchDown={() => listActions.handleBatchToggleSale(false)}
      />

      <Spin spinning={listState.loading}>
        {listState.records.length ? (
          <>
            <Row gutter={[18, 18]}>
              {listState.records.map((record) => (
                <Col xs={24} lg={12} key={record.id}>
                  <RoomTypeCard
                    record={record}
                    selected={listState.selectedSet.has(Number(record.id))}
                    onToggleSelect={listActions.toggleSelect}
                    onView={(item) => listActions.openDetail(item.id)}
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
                onChange={listActions.handlePageChange}
                showSizeChanger
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          </>
        ) : (
          <Empty className="room-type__empty" description="暂无房型，点击右上角添加房型开始管理。" />
        )}
      </Spin>

      <RoomTypeFormModal
        form={form}
        open={formState.open}
        mode={formState.mode}
        loading={formState.loading}
        submitting={formState.submitting}
        imageFileList={formState.imageFileList}
        statusNotice={formState.statusNotice}
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
