CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID（主键）',
  `username` varchar(50) NOT NULL COMMENT '登录账号（唯一）',
  `password` varchar(100) NOT NULL COMMENT '登录密码（加密存储）',
  `role` enum('admin','merchant','user') NOT NULL DEFAULT 'user' COMMENT '用户角色：admin/merchant/user',
  `name` varchar(50) DEFAULT '' COMMENT '真实姓名或商家名称',
  `phone` varchar(20) DEFAULT '' COMMENT '联系电话',
  `email` varchar(100) DEFAULT '' COMMENT '邮箱',
  `avatar` varchar(255) DEFAULT '' COMMENT '头像地址',
  `status` tinyint unsigned NOT NULL DEFAULT '1' COMMENT '账号状态：0-禁用，1-正常',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表（管理员、商家、普通用户）';

CREATE TABLE `merchant_hotels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `review_status` enum('incomplete','reviewing','rejected_pending_fix','approved') NOT NULL DEFAULT 'incomplete' COMMENT '审核状态',
  `review_remark` varchar(100) NOT NULL DEFAULT '' COMMENT '审核备注/驳回原因',
  `accommodation_type` enum('hotel','homestay') NOT NULL DEFAULT 'hotel' COMMENT '住宿类型',
  `star_level` enum('one','two','three','four','five') NOT NULL DEFAULT 'three' COMMENT '酒店星级',
  `hotel_name` varchar(100) NOT NULL DEFAULT '' COMMENT '酒店名称',
  `is_group` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '是否集团酒店',
  `country` varchar(50) NOT NULL DEFAULT '中国' COMMENT '国家或地区',
  `province` varchar(50) NOT NULL DEFAULT '' COMMENT '省份',
  `city` varchar(50) NOT NULL DEFAULT '' COMMENT '城市',
  `district` varchar(50) NOT NULL DEFAULT '' COMMENT '行政区',
  `address_detail` varchar(200) NOT NULL DEFAULT '' COMMENT '详细地址',
  `latitude` decimal(10,6) DEFAULT NULL COMMENT '纬度',
  `longitude` decimal(10,6) DEFAULT NULL COMMENT '经度',
  `property_tags` json DEFAULT NULL COMMENT '酒店属性标签',
  `facility_selections` json DEFAULT NULL COMMENT '设施设备勾选',
  `custom_facilities` json DEFAULT NULL COMMENT '自定义设施',
  `introduction` text COMMENT '酒店简介',
  `contact_phone` varchar(20) NOT NULL DEFAULT '' COMMENT '联系电话',
  `contact_email` varchar(100) NOT NULL DEFAULT '' COMMENT '联系邮箱',
  `is_open_24_hours` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '是否24小时营业',
  `business_start_time` char(5) NOT NULL DEFAULT '09:00' COMMENT '营业开始时间',
  `business_end_time` char(5) NOT NULL DEFAULT '18:00' COMMENT '营业结束时间',
  `check_in_time` char(5) NOT NULL DEFAULT '14:00' COMMENT '入住时间',
  `check_out_time` char(5) NOT NULL DEFAULT '12:00' COMMENT '退房时间',
  `total_floor_count` int unsigned NOT NULL DEFAULT '1' COMMENT '总楼层数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_user_id` (`merchant_user_id`),
  KEY `idx_review_status` (`review_status`),
  CONSTRAINT `fk_merchant_hotels_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店资料表';

CREATE TABLE `merchant_hotel_profile_drafts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `payload_json` json NOT NULL COMMENT '酒店资料草稿JSON',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_hotel_profile_drafts_user` (`merchant_user_id`),
  CONSTRAINT `fk_merchant_hotel_profile_drafts_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店资料草稿表';

CREATE TABLE `merchant_hotel_floors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `floor_number` int unsigned NOT NULL COMMENT '楼层序号',
  `floor_label` varchar(20) NOT NULL DEFAULT '' COMMENT '楼层名称',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_hotel_floors_number` (`merchant_user_id`,`floor_number`),
  KEY `idx_merchant_hotel_floors_user` (`merchant_user_id`),
  CONSTRAINT `fk_merchant_hotel_floors_hotel` FOREIGN KEY (`merchant_user_id`) REFERENCES `merchant_hotels` (`merchant_user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店楼层表';

CREATE TABLE `merchant_hotel_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `image_group` enum('signboard','frontdesk','facility','carousel') NOT NULL COMMENT '图片分组',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_merchant_group` (`merchant_user_id`,`image_group`),
  CONSTRAINT `fk_merchant_hotel_images_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_merchant_hotel_images_hotel` FOREIGN KEY (`merchant_user_id`) REFERENCES `merchant_hotels` (`merchant_user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店图片表';

CREATE TABLE `merchant_hotel_image_drafts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `image_group` enum('signboard','frontdesk','facility','carousel') NOT NULL COMMENT '图片分组',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_merchant_hotel_image_drafts_group` (`merchant_user_id`,`image_group`),
  CONSTRAINT `fk_merchant_hotel_image_drafts_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店图片草稿表';

CREATE TABLE `merchant_hotel_certificates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `cert_group` enum('business_license','legal_person_front','legal_person_back','special_permit','other_qualification') NOT NULL COMMENT '资质证件分组',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_merchant_cert_group` (`merchant_user_id`,`cert_group`),
  CONSTRAINT `fk_merchant_hotel_certificates_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_merchant_hotel_certificates_hotel` FOREIGN KEY (`merchant_user_id`) REFERENCES `merchant_hotels` (`merchant_user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家资质证件表';

CREATE TABLE `merchant_hotel_certificate_drafts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `cert_group` enum('business_license','legal_person_front','legal_person_back','special_permit','other_qualification') NOT NULL COMMENT '资质证件分组',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_merchant_hotel_certificate_drafts_group` (`merchant_user_id`,`cert_group`),
  CONSTRAINT `fk_merchant_hotel_certificate_drafts_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家资质证件草稿表';

CREATE TABLE `merchant_room_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `room_name` varchar(60) NOT NULL DEFAULT '' COMMENT '房型名称',
  `bed_config` varchar(100) NOT NULL DEFAULT '' COMMENT '床型配置',
  `area_size` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '面积（平方米）',
  `floor_text` varchar(60) NOT NULL DEFAULT '' COMMENT '楼层说明',
  `room_count` int unsigned NOT NULL DEFAULT '1' COMMENT '该房型房间数量',
  `max_guests` int unsigned NOT NULL DEFAULT '1' COMMENT '最多可住人数',
  `description` text COMMENT '房型描述',
  `facility_tags` json DEFAULT NULL COMMENT '房型设施标签',
  `sale_price_cents` int unsigned NOT NULL DEFAULT '0' COMMENT '销售价（分）',
  `list_price_cents` int unsigned NOT NULL DEFAULT '0' COMMENT '划线价（分）',
  `audit_status` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '审核状态：0审核中 1已通过 2已驳回',
  `audit_remark` varchar(500) NOT NULL DEFAULT '' COMMENT '审核备注/驳回原因',
  `is_on_sale` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '上架状态：0下架 1上架',
  `is_forced_off_sale` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '平台强制下架状态：0否 1是',
  `audit_admin_id` int unsigned DEFAULT NULL COMMENT '审核管理员ID',
  `forced_off_admin_id` int unsigned DEFAULT NULL COMMENT '强制下架管理员ID',
  `audit_at` datetime DEFAULT NULL COMMENT '审核时间',
  `forced_off_at` datetime DEFAULT NULL COMMENT '强制下架时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_merchant_room_types_merchant` (`merchant_user_id`),
  KEY `idx_merchant_room_types_audit_sale` (`audit_status`,`is_on_sale`),
  KEY `idx_merchant_room_types_updated` (`updated_at`),
  KEY `fk_merchant_room_types_forced_off_admin` (`forced_off_admin_id`),
  CONSTRAINT `fk_merchant_room_types_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_merchant_room_types_admin` FOREIGN KEY (`audit_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_merchant_room_types_forced_off_admin` FOREIGN KEY (`forced_off_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型表';

CREATE TABLE `merchant_room_type_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `room_type_id` int unsigned NOT NULL COMMENT '房型ID',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_room_type_images_room_id` (`room_type_id`,`id`),
  CONSTRAINT `fk_room_type_images_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `merchant_room_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型图片表';

CREATE TABLE `merchant_room_type_drafts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `source_room_type_id` int unsigned NOT NULL DEFAULT '0' COMMENT '来源正式房型ID，0表示新增房型草稿',
  `payload_json` json NOT NULL COMMENT '房型草稿JSON',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_room_type_drafts_source` (`merchant_user_id`,`source_room_type_id`),
  KEY `idx_merchant_room_type_drafts_updated` (`merchant_user_id`,`updated_at`),
  CONSTRAINT `fk_merchant_room_type_drafts_user` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型草稿表';

CREATE TABLE `merchant_room_type_draft_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `draft_id` int unsigned NOT NULL COMMENT '房型草稿ID',
  `file_path` varchar(255) NOT NULL COMMENT '图片访问路径',
  `file_name` varchar(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `mime_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `size_bytes` int unsigned NOT NULL DEFAULT '0' COMMENT '文件大小（字节）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_room_type_draft_images_draft_id` (`draft_id`,`id`),
  CONSTRAINT `fk_room_type_draft_images_draft` FOREIGN KEY (`draft_id`) REFERENCES `merchant_room_type_drafts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型草稿图片表';
