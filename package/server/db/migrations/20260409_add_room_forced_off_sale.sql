ALTER TABLE `merchant_rooms`
  ADD COLUMN IF NOT EXISTS `is_forced_off_sale` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '平台强制禁售：0否 1是' AFTER `sales_status`;
