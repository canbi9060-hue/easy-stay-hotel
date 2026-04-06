import React from 'react';
import { AutoComplete, Button, Input, Segmented, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getAuditStatusMeta,
  getSaleStatusMeta,
  roomTypeAuditStatusOptions,
  roomTypeSaleStatusOptions,
} from '../../../../utils/room-type';

export default function FilterBar({
  filters,
  keywordInput,
  searchOptions,
  searchDropdownOpen,
  searchLoading,
  selectedCount,
  showBatchActions,
  onKeywordChange,
  onSearch,
  onSearchFocus,
  onSearchBlur,
  onSelectSuggestion,
  onAuditChange,
  onSaleChange,
  canCreate,
  createLoading,
  createDisabledReason,
  onCreate,
  onBatchUp,
  onBatchDown,
}) {
  const saleDisabled = filters.auditStatus === 'pending' || filters.auditStatus === 'rejected';
  const createButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={onCreate}
      disabled={!canCreate || createLoading}
    >
      添加房型
    </Button>
  );
  const autoCompleteOptions = searchOptions.map((option) => {
    const auditMeta = getAuditStatusMeta(option.auditStatus);
    const saleMeta = getSaleStatusMeta(option.isOnSale, option.isForcedOffSale);

    return {
      ...option,
      label: (
        <div className="room-type__suggestion-item">
          <div className="room-type__suggestion-main">
            <span className="room-type__suggestion-name">{option.roomName}</span>
            <span className="room-type__suggestion-id">ID: {option.id}</span>
          </div>
          <div className="room-type__suggestion-meta">
            <span className={`room-type__suggestion-tag is-${auditMeta.color}`}>{auditMeta.text}</span>
            <span className={`room-type__suggestion-tag is-${saleMeta.color}`}>{saleMeta.text}</span>
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="room-type__filter-shell">
      <div className="room-type__filter-row room-type__filter-row--top">
        <div className="room-type__filter-group">
          <span className="room-type__filter-label">审核状态</span>
          <Segmented
            value={filters.auditStatus}
            options={roomTypeAuditStatusOptions}
            onChange={onAuditChange}
          />
        </div>

        <div className="room-type__filter-group">
          <span className="room-type__filter-label">售卖状态</span>
          <Segmented
            value={filters.saleStatus}
            options={roomTypeSaleStatusOptions}
            onChange={onSaleChange}
            disabled={saleDisabled}
          />
        </div>
      </div>

      <div className="room-type__filter-row room-type__filter-row--bottom">
        <AutoComplete
          className="room-type__search"
          value={keywordInput}
          options={autoCompleteOptions}
          open={searchDropdownOpen}
          filterOption={false}
          notFoundContent={searchLoading ? '正在加载房型候选...' : '暂无匹配房型'}
          onChange={onKeywordChange}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          onSelect={onSelectSuggestion}
        >
          <Input.Search
            placeholder="按房型名或房型 ID 搜索"
            allowClear
            onSearch={onSearch}
          />
        </AutoComplete>

        <div className="room-type__toolbar-row">
          <div
            className={`room-type__batch-actions ${showBatchActions ? 'is-visible' : 'is-hidden'}`}
            aria-hidden={!showBatchActions}
          >
            <Button onClick={onBatchUp} disabled={!selectedCount || !showBatchActions} tabIndex={showBatchActions ? 0 : -1}>
              批量上架
            </Button>
            <Button onClick={onBatchDown} disabled={!selectedCount || !showBatchActions} tabIndex={showBatchActions ? 0 : -1}>
              批量下架
            </Button>
          </div>
          {!canCreate && createDisabledReason ? (
            <Tooltip title={createDisabledReason}>
              <span>{createButton}</span>
            </Tooltip>
          ) : createButton}
        </div>
      </div>
    </div>
  );
}
