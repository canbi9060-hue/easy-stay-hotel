CREATE TABLE `merchant_rooms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `room_number` varchar(20) NOT NULL COMMENT '房间号',
  `floor_number` int unsigned NOT NULL COMMENT '所属楼层号',
  `room_type_id` int unsigned NOT NULL COMMENT '所属房型ID',
  `physical_status` enum('vacant_clean','occupied','dirty','cleaning','maintenance') NOT NULL DEFAULT 'vacant_clean' COMMENT '物理房态',
  `sales_status` enum('available','reserved','unavailable') NOT NULL DEFAULT 'available' COMMENT '销售状态',
  `device_remark` varchar(200) NOT NULL DEFAULT '' COMMENT '设备备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_rooms_number` (`merchant_user_id`,`room_number`),
  KEY `idx_merchant_rooms_floor` (`merchant_user_id`,`floor_number`),
  KEY `idx_merchant_rooms_room_type` (`room_type_id`),
  KEY `idx_merchant_rooms_physical_sales` (`merchant_user_id`,`physical_status`,`sales_status`),
  CONSTRAINT `fk_merchant_rooms_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_merchant_rooms_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `merchant_room_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房间表';
