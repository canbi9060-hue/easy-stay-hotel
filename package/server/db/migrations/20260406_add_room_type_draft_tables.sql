CREATE TABLE merchant_room_type_drafts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  merchant_user_id INT UNSIGNED NOT NULL COMMENT '商家用户ID',
  source_room_type_id INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '来源正式房型ID，0表示新增房型草稿',
  payload_json JSON NOT NULL COMMENT '房型草稿JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_merchant_room_type_drafts_source (merchant_user_id, source_room_type_id),
  KEY idx_merchant_room_type_drafts_updated (merchant_user_id, updated_at),
  CONSTRAINT fk_merchant_room_type_drafts_user FOREIGN KEY (merchant_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型草稿表';

CREATE TABLE merchant_room_type_draft_images (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  draft_id INT UNSIGNED NOT NULL COMMENT '房型草稿ID',
  file_path VARCHAR(255) NOT NULL COMMENT '图片访问路径',
  file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  mime_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_room_type_draft_images_draft_id (draft_id, id),
  CONSTRAINT fk_room_type_draft_images_draft FOREIGN KEY (draft_id) REFERENCES merchant_room_type_drafts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家房型草稿图片表';
