import React from 'react';
import { Button, Card, Checkbox, Input, Select } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  roomBatchPhysicalStatusOptions,
  roomFeatureTagOptions,
  roomPhysicalStatusFilterOptions,
  roomSalesStatusFilterOptions,
} from '../../../../utils/room-management';

export default function RoomFilterPanel({
  filterDraft,
  floorOptions,
  roomTypeOptions,
  batchPhysicalStatus,
  batchRoomTypeId,
  selectedCount,
  isSelectAllChecked,
  isSelectAllIndeterminate,
  onFilterDraftChange,
  onApplyFilters,
  onResetFilters,
  onToggleSelectPage,
  onBatchPhysicalStatusChange,
  onBatchRoomTypeChange,
  onBatchUpdatePhysicalStatus,
  onBatchBindRoomType,
}) {
  return (
    <Card className="room-detail__filter-shell" variant="borderless">
      <div className="room-detail__filter-grid room-detail__filter-grid--primary">
        <div className="room-detail__filter-item">
          <span className="room-detail__filter-label">房间号</span>
          <Input
            value={filterDraft.keyword}
            onChange={(event) => onFilterDraftChange('keyword', event.target.value)}
            placeholder="输入房间号..."
          />
        </div>
        <div className="room-detail__filter-item">
          <span className="room-detail__filter-label">楼层</span>
          <Select
            value={filterDraft.floorNumber}
            options={[{ label: '全部楼层', value: 'all' }, ...floorOptions]}
            onChange={(value) => onFilterDraftChange('floorNumber', value)}
          />
        </div>
        <div className="room-detail__filter-item">
          <span className="room-detail__filter-label">房型</span>
          <Select
            value={filterDraft.roomTypeId}
            options={[{ label: '所有房型', value: 'all' }, ...roomTypeOptions]}
            onChange={(value) => onFilterDraftChange('roomTypeId', value)}
          />
        </div>
        <div className="room-detail__filter-item">
          <span className="room-detail__filter-label">物理房态</span>
          <Select
            value={filterDraft.physicalStatus}
            options={roomPhysicalStatusFilterOptions}
            onChange={(value) => onFilterDraftChange('physicalStatus', value)}
          />
        </div>
        <div className="room-detail__filter-item">
          <span className="room-detail__filter-label">销售状态</span>
          <Select
            value={filterDraft.salesStatus}
            options={roomSalesStatusFilterOptions}
            onChange={(value) => onFilterDraftChange('salesStatus', value)}
          />
        </div>
      </div>

      <div className="room-detail__filter-grid room-detail__filter-grid--secondary">
        <div className="room-detail__filter-item room-detail__filter-item--feature">
          <span className="room-detail__filter-label">房间特性</span>
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={filterDraft.featureTags}
            options={roomFeatureTagOptions}
            placeholder="选择房间特性"
            onChange={(value) => onFilterDraftChange('featureTags', value)}
          />
        </div>
        <div className="room-detail__filter-actions">
          <Button type="primary" icon={<FilterOutlined />} onClick={onApplyFilters}>筛选</Button>
          <Button icon={<ReloadOutlined />} onClick={onResetFilters}>重置</Button>
        </div>
      </div>

      <div className="room-detail__batch-row">
        <div className="room-detail__batch-left">
          <Checkbox
            checked={isSelectAllChecked}
            indeterminate={isSelectAllIndeterminate}
            onChange={onToggleSelectPage}
          >
            全选当前页
          </Checkbox>
          <div className="room-detail__batch-actions">
            <Select
              placeholder="批量修改物理房态"
              value={batchPhysicalStatus}
              options={roomBatchPhysicalStatusOptions}
              style={{ width: 180 }}
              onChange={onBatchPhysicalStatusChange}
            />
            <Button onClick={onBatchUpdatePhysicalStatus}>应用</Button>
            <Select
              placeholder="批量绑定房型"
              value={batchRoomTypeId}
              options={roomTypeOptions}
              style={{ width: 220 }}
              onChange={onBatchRoomTypeChange}
            />
            <Button onClick={onBatchBindRoomType}>绑定</Button>
          </div>
        </div>
        <div className="room-detail__selected-count">已选择 {selectedCount} 个房间</div>
      </div>
    </Card>
  );
}
