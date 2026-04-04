import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message, Modal } from 'antd';
import {
  batchUpdateMerchantRoomTypeSaleStatusAPI,
  deleteMerchantRoomTypeAPI,
  getRequestErrorMessage,
  getMerchantRoomTypeDetailAPI,
  getMerchantRoomTypeSuggestionsAPI,
  getMerchantRoomTypesAPI,
  updateMerchantRoomTypeSaleStatusAPI,
} from '../../../../utils/request';
import {
  canSelectRoomType,
  getMerchantRoomTypeQuery,
  ROOM_TYPE_SALE_STATUS,
} from '../../../../utils/room-type';

const initialFilters = {
  auditStatus: 'all',
  saleStatus: 'all',
};

export default function useRoomTypeList() {
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
  const [reloadVersion, setReloadVersion] = useState(0);
  const suggestionTimerRef = useRef(null);
  const blurTimerRef = useRef(null);
  const suggestionRequestRef = useRef(0);
  const skipSuggestionChangeRef = useRef(false);
  const filterSignatureRef = useRef(`${initialFilters.auditStatus}:${initialFilters.saleStatus}`);
  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;

  const refreshList = useCallback(() => {
    setReloadVersion((value) => value + 1);
  }, []);

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

      const nextOptions = res.data.list.map((item) => ({
          id: Number(item.id),
          value: item.roomName || `房型#${item.id}`,
          roomName: item.roomName || `房型#${item.id}`,
          searchValue: String(item.id),
          auditStatus: Number(item.auditStatus),
          isOnSale: Number(item.isOnSale),
        }));

      setSearchOptions(nextOptions);
    } catch (error) {
      if (suggestionRequestRef.current !== requestId) {
        return;
      }
      setSearchOptions([]);
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

  const showBatchActions = filters.auditStatus === 'all' || filters.auditStatus === 'approved';
  const selectedCount = selectedIds.length;

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
  }, [clearSelection, refreshList]);

  const openDetail = useCallback(async (roomTypeId) => {
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
  }, []);

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
      records,
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
      detailData,
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
    },
  };
}
