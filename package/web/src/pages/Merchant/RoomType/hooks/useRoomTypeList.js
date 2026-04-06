import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message, Modal } from 'antd';
import {
  deleteMerchantRoomTypeAPI,
  getMerchantRoomTypeDetailAPI,
  getMerchantRoomTypeSuggestionsAPI,
  getMerchantRoomTypesAPI,
  getRequestErrorMessage,
  updateMerchantRoomTypeSaleStatusAPI,
  batchUpdateMerchantRoomTypeSaleStatusAPI,
} from '../../../../utils/request';
import {
  applyRoomTypeDraftOverlay,
  buildCreateRoomTypeDraftRecord,
  canDeleteRoomType,
  canSelectRoomType,
  fetchMerchantRoomTypeDraftBundle,
  getEmptyRoomTypeDraftBundle,
  getMerchantRoomTypeQuery,
  migrateScopedLocalRoomTypeDrafts,
  removeMerchantRoomTypeCreateDraft,
  ROOM_TYPE_AUDIT_STATUS,
  ROOM_TYPE_SALE_STATUS,
} from '../../../../utils/room-type';
const initialFilters = {
  auditStatus: 'all',
  saleStatus: 'all',
};

export default function useRoomTypeList({ merchantUserId } = {}) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8, total: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [draftMap, setDraftMap] = useState({});
  const [createDraft, setCreateDraft] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const suggestionTimerRef = useRef(null);
  const blurTimerRef = useRef(null);
  const suggestionRequestRef = useRef(0);
  const skipSuggestionChangeRef = useRef(false);
  const filterSignatureRef = useRef(`${initialFilters.auditStatus}:${initialFilters.saleStatus}`);
  const draftMigrationUserRef = useRef(null);
  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;
  const emptyDraftBundle = useMemo(() => getEmptyRoomTypeDraftBundle(), []);

  const applyDraftBundle = useCallback((bundle) => {
    setCreateDraft(bundle?.createDraft || null);
    setDraftMap(bundle?.editDraftMap || {});
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      let draftBundle = await fetchMerchantRoomTypeDraftBundle();

      const shouldMigrate = draftMigrationUserRef.current !== merchantUserId;
      draftMigrationUserRef.current = merchantUserId;
      if (shouldMigrate) {
        const { migrated, migrationFailed } = await migrateScopedLocalRoomTypeDrafts({
          merchantUserId,
          serverBundle: draftBundle,
        });
        if (migrationFailed) {
          message.warning('部分本地房型草稿迁移失败，已继续使用后端草稿数据。');
        }
        if (migrated) {
          draftBundle = await fetchMerchantRoomTypeDraftBundle();
        }
      }

      applyDraftBundle(draftBundle);
      return draftBundle;
    } catch (error) {
      applyDraftBundle(emptyDraftBundle);
      message.error(getRequestErrorMessage(error, '加载房型草稿失败。'));
      return emptyDraftBundle;
    }
  }, [applyDraftBundle, emptyDraftBundle, merchantUserId]);

  const refreshList = useCallback(() => {
    setReloadVersion((value) => value + 1);
  }, []);

  const refreshDrafts = useCallback(() => {
    loadDrafts();
  }, [loadDrafts]);

  const clearSuggestionTimer = useCallback(() => {
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
  }, []);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const fetchSearchOptions = useCallback(async (rawKeyword = '') => {
    const nextKeyword = String(rawKeyword || '').trim();
    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    setSearchLoading(true);

    try {
      const res = await getMerchantRoomTypeSuggestionsAPI({
        ...getMerchantRoomTypeQuery({
          auditStatus: filters.auditStatus,
          saleStatus: filters.saleStatus,
          keyword: nextKeyword,
        }),
        limit: 8,
      });

      if (suggestionRequestRef.current !== requestId) {
        return;
      }

      setSearchOptions(res.data.list.map((item) => ({
        id: Number(item.id),
        value: item.roomName || `房型#${item.id}`,
        roomName: item.roomName || `房型#${item.id}`,
        searchValue: String(item.id),
        auditStatus: Number(item.auditStatus),
        isOnSale: Number(item.isOnSale),
        isForcedOffSale: Number(item.isForcedOffSale) || 0,
      })));
    } catch (_error) {
      if (suggestionRequestRef.current === requestId) {
        setSearchOptions([]);
      }
    } finally {
      if (suggestionRequestRef.current === requestId) {
        setSearchLoading(false);
      }
    }
  }, [filters.auditStatus, filters.saleStatus]);

  const scheduleFetchSearchOptions = useCallback((rawKeyword = '', delay = 260) => {
    clearSuggestionTimer();
    suggestionTimerRef.current = setTimeout(() => {
      fetchSearchOptions(rawKeyword);
    }, delay);
  }, [clearSuggestionTimer, fetchSearchOptions]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMerchantRoomTypesAPI(getMerchantRoomTypeQuery({
        auditStatus: filters.auditStatus,
        saleStatus: filters.saleStatus,
        keyword,
        page: currentPage,
        pageSize: currentPageSize,
      }));
      const { list, pagination: nextPagination } = res.data;
      setRecords(list);
      setPagination((prev) => ({
        ...prev,
        total: Number(nextPagination.total),
      }));
      setSelectedIds((prev) => prev.filter((id) => list.some((item) => Number(item.id) === Number(id) && canSelectRoomType(item))));
    } catch (error) {
      message.error(getRequestErrorMessage(error, '加载房型列表失败。'));
      setRecords([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentPageSize, filters.auditStatus, filters.saleStatus, keyword]);

  useEffect(() => {
    loadList();
  }, [loadList, reloadVersion]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts, reloadVersion]);

  const showBatchActions = filters.auditStatus === 'all' || filters.auditStatus === 'approved';
  const selectedCount = selectedIds.length;
  const createDraftRecord = useMemo(() => buildCreateRoomTypeDraftRecord(createDraft), [createDraft]);
  const displayRecords = useMemo(() => {
    const roomTypeRecords = records.map((record) => applyRoomTypeDraftOverlay(record, draftMap[Number(record.id)]) || record);
    const canApplyFullOrdering = filters.auditStatus === 'all' && filters.saleStatus === 'all';
    const canShowCreateDraft = Boolean(createDraftRecord) && canApplyFullOrdering;
    const mergedRecords = canShowCreateDraft ? [createDraftRecord, ...roomTypeRecords] : roomTypeRecords;
    const keywordText = String(keyword || keywordInput || '').trim().toLowerCase();
    const visibleRecords = keywordText && canShowCreateDraft
      ? mergedRecords.filter((record) => {
        if (!record?.isCreateDraft) {
          return true;
        }

        const draftSearchText = [
          record.roomName,
          record.bedConfig,
          '草稿',
          '未提交',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return draftSearchText.includes(keywordText);
      })
      : mergedRecords;

    if (!canApplyFullOrdering) {
      return visibleRecords;
    }

    const groupedRecords = visibleRecords.map((record, index) => {
      const isDraft = Boolean(record?.hasDraft);
      let order = 99;

      if (isDraft) {
        order = 0;
      } else if (Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.PENDING) {
        order = 1;
      } else if (Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.REJECTED) {
        order = 2;
      } else if (Number(record?.auditStatus) === ROOM_TYPE_AUDIT_STATUS.APPROVED) {
        order = Number(record?.isOnSale) === ROOM_TYPE_SALE_STATUS.ON ? 3 : 4;
      }

      return {
        record,
        index,
        order,
        draftSavedAt: Number(record?.draftSavedAt) || 0,
      };
    });

    groupedRecords.sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      if (left.order === 0 && left.draftSavedAt !== right.draftSavedAt) {
        return right.draftSavedAt - left.draftSavedAt;
      }

      return left.index - right.index;
    });

    return groupedRecords.map((item) => item.record);
  }, [createDraftRecord, draftMap, filters.auditStatus, filters.saleStatus, keyword, keywordInput, records]);

  const displayDetailData = useMemo(() => {
    if (!detailData) {
      return null;
    }
    if (detailData?.isCreateDraft) {
      return detailData;
    }
    return applyRoomTypeDraftOverlay(detailData, draftMap[Number(detailData.id)]) || detailData;
  }, [detailData, draftMap]);

  const hasAnyDraft = Boolean(createDraftRecord) || Object.keys(draftMap).length > 0;
  const selectedSet = useMemo(() => new Set(selectedIds.map((id) => Number(id))), [selectedIds]);

  const handleAuditFilterChange = useCallback((value) => {
    setSelectedIds([]);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters({
      auditStatus: value,
      saleStatus: value === 'pending' || value === 'rejected' ? 'off' : 'all',
    });
  }, []);

  const handleSaleFilterChange = useCallback((value) => {
    setSelectedIds([]);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilters((prev) => ({
      auditStatus: value === 'on' ? 'approved' : prev.auditStatus,
      saleStatus: (prev.auditStatus === 'pending' || prev.auditStatus === 'rejected') ? 'off' : value,
    }));
  }, []);

  const handleSearch = useCallback((searchText) => {
    const nextKeyword = String(searchText ?? keywordInput).trim();
    setSelectedIds([]);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setKeywordInput(nextKeyword);
    setKeyword(nextKeyword);
    setSearchDropdownOpen(false);
  }, [keywordInput]);

  const handleKeywordChange = useCallback((value) => {
    const nextValue = String(value || '');
    clearBlurTimer();

    if (skipSuggestionChangeRef.current) {
      skipSuggestionChangeRef.current = false;
      setKeywordInput(nextValue);
      return;
    }

    setKeywordInput(nextValue);
    setSearchDropdownOpen(true);

    if (!nextValue.trim()) {
      clearSuggestionTimer();
      setSelectedIds([]);
      setPagination((prev) => ({ ...prev, current: 1 }));
      setKeyword('');
      fetchSearchOptions('');
      return;
    }

    scheduleFetchSearchOptions(nextValue);
  }, [clearBlurTimer, clearSuggestionTimer, fetchSearchOptions, scheduleFetchSearchOptions]);

  const handleSearchFocus = useCallback(() => {
    clearBlurTimer();
    setSearchDropdownOpen(true);
    fetchSearchOptions(keywordInput);
  }, [clearBlurTimer, fetchSearchOptions, keywordInput]);

  const handleSearchBlur = useCallback(() => {
    clearBlurTimer();
    blurTimerRef.current = setTimeout(() => {
      setSearchDropdownOpen(false);
    }, 120);
  }, [clearBlurTimer]);

  const handleSelectSuggestion = useCallback((_value, option) => {
    clearSuggestionTimer();
    clearBlurTimer();
    skipSuggestionChangeRef.current = true;
    setSelectedIds([]);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setKeywordInput(option?.roomName || '');
    setKeyword(option?.searchValue || '');
    setSearchDropdownOpen(false);
  }, [clearBlurTimer, clearSuggestionTimer]);

  const handlePageChange = useCallback((page, pageSize) => {
    setSelectedIds([]);
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  }, []);

  const toggleSelect = useCallback((record) => {
    if (!canSelectRoomType(record)) {
      return;
    }

    setSelectedIds((prev) => (
      prev.includes(record.id)
        ? prev.filter((item) => item !== record.id)
        : [...prev, record.id]
    ));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleToggleSale = useCallback(async (record, nextOnSale) => {
    if (Number(record?.isForcedOffSale) === 1) {
      message.warning('已被平台强行下架，请联系管理员。');
      return;
    }
    try {
      await updateMerchantRoomTypeSaleStatusAPI(record.id, { isOnSale: nextOnSale ? ROOM_TYPE_SALE_STATUS.ON : ROOM_TYPE_SALE_STATUS.OFF });
      message.success(nextOnSale ? '房型已上架。' : '房型已下架。');
      refreshList();
    } catch (error) {
      message.error(getRequestErrorMessage(error, '切换上下架失败。'));
    }
  }, [refreshList]);

  const handleBatchToggleSale = useCallback(async (nextOnSale) => {
    if (!selectedIds.length) {
      message.warning('请先选择房型。');
      return;
    }

    try {
      const res = await batchUpdateMerchantRoomTypeSaleStatusAPI({
        roomTypeIds: selectedIds,
        isOnSale: nextOnSale ? ROOM_TYPE_SALE_STATUS.ON : ROOM_TYPE_SALE_STATUS.OFF,
      });
      const { skippedIds } = res.data;
      message.success(skippedIds.length
        ? `批量操作完成，已跳过 ${skippedIds.length} 个不可处理房型。`
        : '批量操作完成。');
      clearSelection();
      refreshList();
    } catch (error) {
      message.error(getRequestErrorMessage(error, '批量操作失败。'));
    }
  }, [clearSelection, refreshList, selectedIds]);

  const handleDelete = useCallback((record) => {
    if (record?.isCreateDraft) {
      Modal.confirm({
        title: '删除草稿房型',
        content: `确定删除“${record.roomName}”草稿吗？删除后不可恢复。`,
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await removeMerchantRoomTypeCreateDraft();
            message.success('草稿房型已删除。');
            if (detailData?.isCreateDraft) {
              setDetailOpen(false);
              setDetailData(null);
              setDetailLoading(false);
            }
            refreshDrafts();
          } catch (error) {
            message.error(getRequestErrorMessage(error, '删除草稿房型失败。'));
          }
        },
      });
      return;
    }

    if (!canDeleteRoomType(record)) {
      message.warning('房型正在审核中，暂不允许删除。');
      return;
    }

    Modal.confirm({
      title: '删除房型',
      content: `确定删除“${record.roomName}”吗？删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMerchantRoomTypeAPI(record.id);
          message.success('房型删除成功。');
          clearSelection();
          refreshList();
        } catch (error) {
          message.error(getRequestErrorMessage(error, '删除房型失败。'));
        }
      },
    });
  }, [clearSelection, detailData?.isCreateDraft, refreshDrafts, refreshList]);

  const openDetail = useCallback(async (recordOrId) => {
    if (recordOrId?.isCreateDraft) {
      setDetailOpen(true);
      setDetailLoading(false);
      setDetailData(recordOrId);
      return;
    }

    if (recordOrId === 'draft-create' && createDraftRecord) {
      setDetailOpen(true);
      setDetailLoading(false);
      setDetailData(createDraftRecord);
      return;
    }

    const roomTypeId = typeof recordOrId === 'object' ? recordOrId?.id : recordOrId;
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getMerchantRoomTypeDetailAPI(roomTypeId);
      setDetailData(res.data);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '获取房型详情失败。'));
      setDetailOpen(false);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [createDraftRecord]);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailData(null);
    setDetailLoading(false);
  }, []);

  useEffect(() => () => {
    clearSuggestionTimer();
    clearBlurTimer();
  }, [clearBlurTimer, clearSuggestionTimer]);

  useEffect(() => {
    const handleFocus = () => loadDrafts();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDrafts]);

  useEffect(() => {
    const nextSignature = `${filters.auditStatus}:${filters.saleStatus}`;
    if (filterSignatureRef.current === nextSignature) {
      return;
    }

    filterSignatureRef.current = nextSignature;
    clearSuggestionTimer();
    setSearchOptions([]);

    if (searchDropdownOpen) {
      fetchSearchOptions(keywordInput);
    }
  }, [
    clearSuggestionTimer,
    fetchSearchOptions,
    filters.auditStatus,
    filters.saleStatus,
    keywordInput,
    searchDropdownOpen,
  ]);

  return {
    listState: {
      loading,
      records: displayRecords,
      filters,
      keywordInput,
      searchOptions,
      searchDropdownOpen,
      searchLoading,
      pagination,
      selectedSet,
      selectedCount,
      showBatchActions,
      detailOpen,
      detailLoading,
      detailData: displayDetailData,
      hasAnyDraft,
      createDraft,
      editDraftMap: draftMap,
    },
    listActions: {
      handleKeywordChange,
      handleAuditFilterChange,
      handleSaleFilterChange,
      handleSearch,
      handleSearchFocus,
      handleSearchBlur,
      handleSelectSuggestion,
      handlePageChange,
      toggleSelect,
      clearSelection,
      handleToggleSale,
      handleBatchToggleSale,
      handleDelete,
      openDetail,
      closeDetail,
      refreshList,
      refreshDrafts,
    },
  };
}
