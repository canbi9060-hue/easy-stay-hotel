import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Form,
  Modal,
  Pagination,
  Spin,
  message,
} from 'antd';
import {
  batchBindMerchantRoomTypeAPI,
  batchGenerateMerchantRoomsAPI,
  batchUpdateMerchantRoomPhysicalStatusAPI,
  createMerchantRoomAPI,
  deleteMerchantRoomAPI,
  getMerchantRoomsAPI,
  getRequestErrorMessage,
  transitionMerchantRoomAPI,
  updateMerchantRoomAPI,
} from '../../../utils/request';
import {
  buildRoomTypeOptionLabel,
  groupRoomsByFloor,
  ROOM_PHYSICAL_STATUS,
  ROOM_SALES_STATUS,
} from '../../../utils/room-management';
import RoomBatchGenerateModal from './modules/RoomBatchGenerateModal';
import RoomDetailDrawer from './modules/RoomDetailDrawer';
import RoomFilterPanel from './modules/RoomFilterPanel';
import RoomFloorTables from './modules/RoomFloorTables';
import RoomFormModal from './modules/RoomFormModal';
import RoomPageHeader from './modules/RoomPageHeader';
import './index.scss';

const defaultFilters = {
  keyword: '',
  floorNumber: 'all',
  roomTypeId: 'all',
  physicalStatus: 'all',
  salesStatus: 'all',
  featureTags: [],
};

const emptyMeta = {
  hotelReviewStatus: 'incomplete',
  canManageRooms: false,
  blockReason: '',
  floors: [],
  roomTypes: [],
};

const defaultCreateValues = {
  roomNumber: '',
  floorNumber: undefined,
  roomTypeId: undefined,
  physicalStatus: ROOM_PHYSICAL_STATUS.VACANT_CLEAN,
  salesStatus: ROOM_SALES_STATUS.AVAILABLE,
  featureTags: [],
  deviceRemark: '',
};

const defaultBatchGenerateValues = {
  roomTypeId: undefined,
  floorNumbers: [],
  roomPrefix: '',
  startNumber: '01',
  generateCount: 1,
  physicalStatus: ROOM_PHYSICAL_STATUS.VACANT_CLEAN,
  salesStatus: ROOM_SALES_STATUS.AVAILABLE,
  featureTags: [],
  deviceRemark: '',
};

const getCreateDisabledReason = (meta) => {
  if (!meta.canManageRooms) {
    return meta.blockReason || '酒店信息审核通过后才能管理房间。';
  }
  if (!meta.floors.length) {
    return '请先在酒店信息页完善正式楼层信息。';
  }
  if (!meta.roomTypes.length) {
    return '请先创建并上架至少一个已审核通过的房型。';
  }
  return '';
};

const mapRoomFormValues = (room) => ({
  roomNumber: room?.roomNumber || '',
  floorNumber: room?.floorNumber || undefined,
  roomTypeId: room?.roomTypeId || undefined,
  physicalStatus: room?.physicalStatus || ROOM_PHYSICAL_STATUS.VACANT_CLEAN,
  salesStatus: room?.salesStatus || ROOM_SALES_STATUS.AVAILABLE,
  featureTags: Array.isArray(room?.featureTags) ? room.featureTags : [],
  deviceRemark: room?.deviceRemark || '',
});

export default function RoomDetail() {
  const [form] = Form.useForm();
  const [batchGenerateForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [filters, setFilters] = useState(defaultFilters);
  const [filterDraft, setFilterDraft] = useState(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [detailRoom, setDetailRoom] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [batchGenerateModalOpen, setBatchGenerateModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingRoom, setEditingRoom] = useState(null);
  const [batchPhysicalStatus, setBatchPhysicalStatus] = useState();
  const [batchRoomTypeId, setBatchRoomTypeId] = useState();

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const res = await getMerchantRoomsAPI({
        keyword: filters.keyword || undefined,
        floorNumber: filters.floorNumber === 'all' ? undefined : filters.floorNumber,
        roomTypeId: filters.roomTypeId === 'all' ? undefined : filters.roomTypeId,
        physicalStatus: filters.physicalStatus === 'all' ? undefined : filters.physicalStatus,
        salesStatus: filters.salesStatus === 'all' ? undefined : filters.salesStatus,
        featureTags: filters.featureTags.length ? filters.featureTags.join(',') : undefined,
        page: currentPage,
        pageSize,
      });

      const nextData = res.data || {};
      setRecords(Array.isArray(nextData.list) ? nextData.list : []);
      setMeta(nextData.meta || emptyMeta);
      setTotal(Number(nextData.pagination?.total || 0));
      setSelectedRoomIds([]);
    } catch (error) {
      setRecords([]);
      setMeta(emptyMeta);
      setTotal(0);
      setSelectedRoomIds([]);
      setPageError(getRequestErrorMessage(error, '获取房间列表失败，请稍后重试。'));
    } finally {
      setLoading(false);
      setMetaReady(true);
    }
  }, [currentPage, filters, pageSize]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const groupedRooms = useMemo(() => groupRoomsByFloor(records), [records]);
  const currentPageRoomIds = useMemo(() => records.map((item) => Number(item.id)), [records]);
  const selectedCount = selectedRoomIds.length;
  const isSelectAllChecked = currentPageRoomIds.length > 0
    && currentPageRoomIds.every((roomId) => selectedRoomIds.includes(roomId));
  const isSelectAllIndeterminate = selectedCount > 0 && !isSelectAllChecked;
  const createDisabledReason = getCreateDisabledReason(meta);

  const roomTypeOptions = useMemo(() => {
    const options = meta.roomTypes.map((item) => ({
      label: buildRoomTypeOptionLabel(item),
      value: item.id,
    }));

    if (
      formMode === 'edit'
      && editingRoom?.roomTypeId
      && editingRoom?.roomTypeName
      && !options.some((item) => item.value === editingRoom.roomTypeId)
    ) {
      return [
        {
          label: `${editingRoom.roomTypeName}（当前已绑定）`,
          value: editingRoom.roomTypeId,
        },
        ...options,
      ];
    }

    return options;
  }, [editingRoom?.roomTypeId, editingRoom?.roomTypeName, formMode, meta.roomTypes]);

  const floorOptions = useMemo(() => meta.floors.map((item) => ({
    label: item.floorLabel,
    value: item.floorNumber,
  })), [meta.floors]);

  const handleFilterDraftChange = useCallback((key, value) => {
    setFilterDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openCreateModal = () => {
    if (createDisabledReason) {
      message.warning(createDisabledReason);
      return;
    }

    setFormMode('create');
    setEditingRoom(null);
    form.setFieldsValue(defaultCreateValues);
    setFormModalOpen(true);
  };

  const openBatchGenerateModal = () => {
    if (createDisabledReason) {
      message.warning(createDisabledReason);
      return;
    }

    batchGenerateForm.setFieldsValue(defaultBatchGenerateValues);
    setBatchGenerateModalOpen(true);
  };

  const openEditModal = (room) => {
    setFormMode('edit');
    setEditingRoom(room);
    form.setFieldsValue(mapRoomFormValues(room));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setEditingRoom(null);
    form.resetFields();
  };

  const closeBatchGenerateModal = () => {
    setBatchGenerateModalOpen(false);
    batchGenerateForm.resetFields();
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setFilters(filterDraft);
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilterDraft(defaultFilters);
    setFilters(defaultFilters);
  };

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((_page, nextPageSize) => {
    setCurrentPage(1);
    setPageSize(nextPageSize);
  }, []);

  const handleToggleSelectPage = (event) => {
    const checked = Boolean(event?.target?.checked);
    setSelectedRoomIds(checked ? currentPageRoomIds : []);
  };

  const handleSubmitRoom = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (formMode === 'create') {
        await createMerchantRoomAPI(values);
        message.success('房间创建成功。');
      } else if (editingRoom) {
        const res = await updateMerchantRoomAPI(editingRoom.id, values);
        if (detailOpen && detailRoom?.id === editingRoom.id) {
          setDetailRoom(res.data || detailRoom);
        }
        message.success('房间更新成功。');
      }
      closeFormModal();
      loadRooms();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(getRequestErrorMessage(error, '保存房间失败，请稍后重试。'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBatchGenerate = async () => {
    try {
      const values = await batchGenerateForm.validateFields();
      setSubmitting(true);
      const res = await batchGenerateMerchantRoomsAPI(values);
      message.success(`批量生成成功，共创建 ${Number(res.data?.createdCount || 0)} 间房。`);
      closeBatchGenerateModal();
      loadRooms();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(getRequestErrorMessage(error, '批量生成房间失败，请稍后重试。'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = (room) => {
    Modal.confirm({
      title: `删除房间 ${room.roomNumber}`,
      content: '删除后不可恢复，确定继续吗？',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMerchantRoomAPI(room.id);
          if (detailOpen && detailRoom?.id === room.id) {
            setDetailOpen(false);
            setDetailRoom(null);
          }
          message.success('房间删除成功。');
          loadRooms();
        } catch (error) {
          message.error(getRequestErrorMessage(error, '删除房间失败，请稍后重试。'));
        }
      },
    });
  };

  const handleTransition = async (room, action) => {
    try {
      const res = await transitionMerchantRoomAPI(room.id, { action });
      const nextRoom = res.data || null;
      if (detailOpen && detailRoom?.id === room.id && nextRoom) {
        setDetailRoom(nextRoom);
      }
      message.success('房间状态更新成功。');
      loadRooms();
    } catch (error) {
      message.error(getRequestErrorMessage(error, '更新房间状态失败，请稍后重试。'));
    }
  };

  const handleBatchUpdatePhysicalStatus = async () => {
    if (!selectedRoomIds.length) {
      message.warning('请先勾选“全选当前页”后再执行批量操作。');
      return;
    }
    if (!batchPhysicalStatus) {
      message.warning('请先选择需要批量修改的物理房态。');
      return;
    }

    try {
      const res = await batchUpdateMerchantRoomPhysicalStatusAPI({
        roomIds: selectedRoomIds,
        physicalStatus: batchPhysicalStatus,
      });
      const skippedIds = Array.isArray(res.data?.skippedIds) ? res.data.skippedIds : [];
      message.success(skippedIds.length ? `批量修改完成，跳过 ${skippedIds.length} 间房。` : '批量修改房态成功。');
      setBatchPhysicalStatus(undefined);
      loadRooms();
    } catch (error) {
      message.error(getRequestErrorMessage(error, '批量修改房态失败，请稍后重试。'));
    }
  };

  const handleBatchBindRoomType = async () => {
    if (!selectedRoomIds.length) {
      message.warning('请先勾选“全选当前页”后再执行批量操作。');
      return;
    }
    if (!batchRoomTypeId) {
      message.warning('请先选择需要绑定的房型。');
      return;
    }

    try {
      const res = await batchBindMerchantRoomTypeAPI({
        roomIds: selectedRoomIds,
        roomTypeId: batchRoomTypeId,
      });
      const skippedIds = Array.isArray(res.data?.skippedIds) ? res.data.skippedIds : [];
      message.success(skippedIds.length ? `批量绑定完成，跳过 ${skippedIds.length} 间房。` : '批量绑定房型成功。');
      setBatchRoomTypeId(undefined);
      loadRooms();
    } catch (error) {
      message.error(getRequestErrorMessage(error, '批量绑定房型失败，请稍后重试。'));
    }
  };

  const renderPageAlerts = () => {
    if (pageError) {
      return (
        <Alert
          type="error"
          showIcon
          title="房间列表加载失败"
          description={pageError}
          action={<Button size="small" onClick={loadRooms}>重试</Button>}
          className="room-detail__page-alert"
        />
      );
    }

    if (!metaReady) {
      return null;
    }

    if (!meta.canManageRooms) {
      return null;
    }

    return (
      <>
        {!meta.floors.length ? (
          <Alert
            type="warning"
            showIcon
            title="暂无正式楼层信息"
            description="请先在酒店信息页完善并提交楼层信息，通过审核后再新增房间。"
            className="room-detail__page-alert"
          />
        ) : null}
        {!meta.roomTypes.length ? (
          <Alert
            type="warning"
            showIcon
            title="暂无可选房型"
            description="请先创建并上架至少一个已审核通过的房型后，再进行房间管理。"
            className="room-detail__page-alert"
          />
        ) : null}
      </>
    );
  };

  return (
    <div className="page-container room-detail-page">
      <RoomPageHeader
        onCreate={openCreateModal}
        onBatchGenerate={openBatchGenerateModal}
        createDisabled={Boolean(createDisabledReason)}
      />

      {renderPageAlerts()}

      {metaReady && !pageError && meta.canManageRooms ? (
        <>
          <RoomFilterPanel
            filterDraft={filterDraft}
            floorOptions={floorOptions}
            roomTypeOptions={roomTypeOptions}
            batchPhysicalStatus={batchPhysicalStatus}
            batchRoomTypeId={batchRoomTypeId}
            selectedCount={selectedCount}
            isSelectAllChecked={isSelectAllChecked}
            isSelectAllIndeterminate={isSelectAllIndeterminate}
            onFilterDraftChange={handleFilterDraftChange}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            onToggleSelectPage={handleToggleSelectPage}
            onBatchPhysicalStatusChange={setBatchPhysicalStatus}
            onBatchRoomTypeChange={setBatchRoomTypeId}
            onBatchUpdatePhysicalStatus={handleBatchUpdatePhysicalStatus}
            onBatchBindRoomType={handleBatchBindRoomType}
          />

          <Spin spinning={loading}>
            {groupedRooms.length ? (
              <>
                <RoomFloorTables
                  groupedRooms={groupedRooms}
                  onView={(room) => {
                    setDetailRoom(room);
                    setDetailOpen(true);
                  }}
                  onEdit={openEditModal}
                  onDelete={handleDeleteRoom}
                  onTransition={handleTransition}
                />
                <div className="room-detail__pagination">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    showSizeChanger
                    showTotal={(value) => `共 ${value} 条记录`}
                    onChange={handlePageChange}
                    onShowSizeChange={handlePageSizeChange}
                  />
                </div>
              </>
            ) : (
              <Empty
                className="room-detail__empty"
                description="暂无房间数据，点击右上角新增房间开始管理。"
              />
            )}
          </Spin>
        </>
      ) : null}

      <RoomFormModal
        form={form}
        open={formModalOpen}
        mode={formMode}
        room={editingRoom}
        floorOptions={floorOptions}
        roomTypeOptions={roomTypeOptions}
        submitting={submitting}
        onCancel={closeFormModal}
        onSubmit={handleSubmitRoom}
      />

      <RoomBatchGenerateModal
        form={batchGenerateForm}
        open={batchGenerateModalOpen}
        floorOptions={floorOptions}
        roomTypeOptions={roomTypeOptions}
        submitting={submitting}
        onCancel={closeBatchGenerateModal}
        onSubmit={handleSubmitBatchGenerate}
      />

      <RoomDetailDrawer
        open={detailOpen}
        room={detailRoom}
        onClose={() => {
          setDetailOpen(false);
          setDetailRoom(null);
        }}
      />
    </div>
  );
}
