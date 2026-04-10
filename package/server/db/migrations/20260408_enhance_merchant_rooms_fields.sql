ALTER TABLE `merchant_rooms`
  ADD COLUMN `feature_tags` JSON DEFAULT NULL COMMENT '房间特性标签' AFTER `sales_status`,
  MODIFY COLUMN `device_remark` varchar(50) NOT NULL DEFAULT '' COMMENT '设备备注';
