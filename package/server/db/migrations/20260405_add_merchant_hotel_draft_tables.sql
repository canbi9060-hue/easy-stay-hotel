SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @merchant_hotel_profile_drafts_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_profile_drafts'
);

SET @sql_create_merchant_hotel_profile_drafts = IF(
  @merchant_hotel_profile_drafts_exists = 0,
  'CREATE TABLE merchant_hotel_profile_drafts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'',
    payload_json JSON NOT NULL COMMENT ''酒店资料草稿JSON'',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'',
    PRIMARY KEY (id),
    UNIQUE KEY uk_merchant_hotel_profile_drafts_user (merchant_user_id),
    CONSTRAINT fk_merchant_hotel_profile_drafts_user FOREIGN KEY (merchant_user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=''商家酒店资料草稿表''',
  'SELECT 1'
);
PREPARE stmt_create_merchant_hotel_profile_drafts FROM @sql_create_merchant_hotel_profile_drafts;
EXECUTE stmt_create_merchant_hotel_profile_drafts;
DEALLOCATE PREPARE stmt_create_merchant_hotel_profile_drafts;

SET @merchant_hotel_image_drafts_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_image_drafts'
);

SET @sql_create_merchant_hotel_image_drafts = IF(
  @merchant_hotel_image_drafts_exists = 0,
  'CREATE TABLE merchant_hotel_image_drafts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'',
    image_group ENUM(''signboard'',''frontdesk'',''facility'',''carousel'') NOT NULL COMMENT ''图片分组'',
    file_path VARCHAR(255) NOT NULL COMMENT ''图片访问路径'',
    file_name VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''原始文件名'',
    mime_type VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''文件MIME类型'',
    size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''文件大小（字节）'',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'',
    PRIMARY KEY (id),
    KEY idx_merchant_hotel_image_drafts_group (merchant_user_id, image_group),
    CONSTRAINT fk_merchant_hotel_image_drafts_user FOREIGN KEY (merchant_user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=''商家酒店图片草稿表''',
  'SELECT 1'
);
PREPARE stmt_create_merchant_hotel_image_drafts FROM @sql_create_merchant_hotel_image_drafts;
EXECUTE stmt_create_merchant_hotel_image_drafts;
DEALLOCATE PREPARE stmt_create_merchant_hotel_image_drafts;

SET @merchant_hotel_certificate_drafts_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificate_drafts'
);

SET @sql_create_merchant_hotel_certificate_drafts = IF(
  @merchant_hotel_certificate_drafts_exists = 0,
  'CREATE TABLE merchant_hotel_certificate_drafts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'',
    cert_group ENUM(''business_license'',''legal_person_front'',''legal_person_back'',''special_permit'',''other_qualification'') NOT NULL COMMENT ''资质证件分组'',
    file_path VARCHAR(255) NOT NULL COMMENT ''图片访问路径'',
    file_name VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''原始文件名'',
    mime_type VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''文件MIME类型'',
    size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''文件大小（字节）'',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'',
    PRIMARY KEY (id),
    KEY idx_merchant_hotel_certificate_drafts_group (merchant_user_id, cert_group),
    CONSTRAINT fk_merchant_hotel_certificate_drafts_user FOREIGN KEY (merchant_user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=''商家资质证件草稿表''',
  'SELECT 1'
);
PREPARE stmt_create_merchant_hotel_certificate_drafts FROM @sql_create_merchant_hotel_certificate_drafts;
EXECUTE stmt_create_merchant_hotel_certificate_drafts;
DEALLOCATE PREPARE stmt_create_merchant_hotel_certificate_drafts;
