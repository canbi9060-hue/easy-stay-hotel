SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @merchant_hotels_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
);

SET @facility_selections_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
    AND column_name = 'facility_selections'
);

SET @sql_add_facility_selections = IF(
  @merchant_hotels_exists = 1 AND @facility_selections_exists = 0,
  'ALTER TABLE merchant_hotels ADD COLUMN facility_selections JSON NULL COMMENT ''设施设备勾选'' AFTER property_tags',
  'SELECT 1'
);
PREPARE stmt_add_facility_selections FROM @sql_add_facility_selections;
EXECUTE stmt_add_facility_selections;
DEALLOCATE PREPARE stmt_add_facility_selections;

SET @custom_facilities_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
    AND column_name = 'custom_facilities'
);

SET @sql_add_custom_facilities = IF(
  @merchant_hotels_exists = 1 AND @custom_facilities_exists = 0,
  'ALTER TABLE merchant_hotels ADD COLUMN custom_facilities JSON NULL COMMENT ''自定义设施'' AFTER facility_selections',
  'SELECT 1'
);
PREPARE stmt_add_custom_facilities FROM @sql_add_custom_facilities;
EXECUTE stmt_add_custom_facilities;
DEALLOCATE PREPARE stmt_add_custom_facilities;

SET @sql_expand_merchant_hotels_review_status = IF(
  @merchant_hotels_exists = 1,
  'ALTER TABLE merchant_hotels MODIFY COLUMN review_status ENUM(''pending'',''approved'',''rejected'',''incomplete'',''reviewing'',''rejected_pending_fix'') NOT NULL DEFAULT ''incomplete'' COMMENT ''审核状态''',
  'SELECT 1'
);
PREPARE stmt_expand_merchant_hotels_review_status FROM @sql_expand_merchant_hotels_review_status;
EXECUTE stmt_expand_merchant_hotels_review_status;
DEALLOCATE PREPARE stmt_expand_merchant_hotels_review_status;

SET @sql_migrate_merchant_hotels_review_status = IF(
  @merchant_hotels_exists = 1,
  'UPDATE merchant_hotels SET review_status = CASE review_status WHEN ''pending'' THEN ''incomplete'' WHEN ''rejected'' THEN ''rejected_pending_fix'' ELSE review_status END',
  'SELECT 1'
);
PREPARE stmt_migrate_merchant_hotels_review_status FROM @sql_migrate_merchant_hotels_review_status;
EXECUTE stmt_migrate_merchant_hotels_review_status;
DEALLOCATE PREPARE stmt_migrate_merchant_hotels_review_status;

SET @sql_finalize_merchant_hotels = IF(
  @merchant_hotels_exists = 1,
  'ALTER TABLE merchant_hotels
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    MODIFY COLUMN merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'' AFTER id,
    MODIFY COLUMN review_status ENUM(''incomplete'',''reviewing'',''rejected_pending_fix'',''approved'') NOT NULL DEFAULT ''incomplete'' COMMENT ''审核状态'' AFTER merchant_user_id,
    MODIFY COLUMN accommodation_type ENUM(''hotel'',''homestay'') NOT NULL DEFAULT ''hotel'' COMMENT ''住宿类型'' AFTER review_status,
    MODIFY COLUMN star_level ENUM(''one'',''two'',''three'',''four'',''five'') NOT NULL DEFAULT ''three'' COMMENT ''酒店星级'' AFTER accommodation_type,
    MODIFY COLUMN hotel_name VARCHAR(100) NOT NULL DEFAULT '''' COMMENT ''酒店名称'' AFTER star_level,
    MODIFY COLUMN is_group TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''是否集团酒店'' AFTER hotel_name,
    MODIFY COLUMN country VARCHAR(50) NOT NULL DEFAULT ''中国'' COMMENT ''国家或地区'' AFTER is_group,
    MODIFY COLUMN province VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''省份'' AFTER country,
    MODIFY COLUMN city VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''城市'' AFTER province,
    MODIFY COLUMN district VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''行政区'' AFTER city,
    MODIFY COLUMN address_detail VARCHAR(200) NOT NULL DEFAULT '''' COMMENT ''详细地址'' AFTER district,
    MODIFY COLUMN latitude DECIMAL(10,6) NULL DEFAULT NULL COMMENT ''纬度'' AFTER address_detail,
    MODIFY COLUMN longitude DECIMAL(10,6) NULL DEFAULT NULL COMMENT ''经度'' AFTER latitude,
    MODIFY COLUMN property_tags JSON NULL DEFAULT NULL COMMENT ''酒店属性标签'' AFTER longitude,
    MODIFY COLUMN facility_selections JSON NULL DEFAULT NULL COMMENT ''设施设备勾选'' AFTER property_tags,
    MODIFY COLUMN custom_facilities JSON NULL DEFAULT NULL COMMENT ''自定义设施'' AFTER facility_selections,
    MODIFY COLUMN introduction TEXT NULL COMMENT ''酒店简介'' AFTER custom_facilities,
    MODIFY COLUMN contact_phone VARCHAR(20) NOT NULL DEFAULT '''' COMMENT ''联系电话'' AFTER introduction,
    MODIFY COLUMN contact_email VARCHAR(100) NOT NULL DEFAULT '''' COMMENT ''联系邮箱'' AFTER contact_phone,
    MODIFY COLUMN is_open_24_hours TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''是否24小时营业'' AFTER contact_email,
    MODIFY COLUMN business_start_time CHAR(5) NOT NULL DEFAULT ''09:00'' COMMENT ''营业开始时间'' AFTER is_open_24_hours,
    MODIFY COLUMN business_end_time CHAR(5) NOT NULL DEFAULT ''18:00'' COMMENT ''营业结束时间'' AFTER business_start_time,
    MODIFY COLUMN check_in_time CHAR(5) NOT NULL DEFAULT ''14:00'' COMMENT ''入住时间'' AFTER business_end_time,
    MODIFY COLUMN check_out_time CHAR(5) NOT NULL DEFAULT ''12:00'' COMMENT ''退房时间'' AFTER check_in_time,
    MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'' AFTER check_out_time,
    MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER created_at,
    COMMENT = ''商家酒店资料表''',
  'SELECT 1'
);
PREPARE stmt_finalize_merchant_hotels FROM @sql_finalize_merchant_hotels;
EXECUTE stmt_finalize_merchant_hotels;
DEALLOCATE PREPARE stmt_finalize_merchant_hotels;

SET @users_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'users'
);

SET @sql_align_users = IF(
  @users_exists = 1,
  'ALTER TABLE users
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''用户ID（主键）'',
    MODIFY COLUMN username VARCHAR(50) NOT NULL COMMENT ''登录账号（唯一）'' AFTER id,
    MODIFY COLUMN password VARCHAR(100) NOT NULL COMMENT ''登录密码（加密存储）'' AFTER username,
    MODIFY COLUMN role ENUM(''admin'',''merchant'',''user'') NOT NULL DEFAULT ''user'' COMMENT ''用户角色：admin/merchant/user'' AFTER password,
    MODIFY COLUMN name VARCHAR(50) DEFAULT '''' COMMENT ''真实姓名或商家名称'' AFTER role,
    MODIFY COLUMN phone VARCHAR(20) DEFAULT '''' COMMENT ''联系电话'' AFTER name,
    MODIFY COLUMN email VARCHAR(100) DEFAULT '''' COMMENT ''邮箱'' AFTER phone,
    MODIFY COLUMN avatar VARCHAR(255) DEFAULT '''' COMMENT ''头像地址'' AFTER email,
    MODIFY COLUMN status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT ''账号状态：0-禁用，1-正常'' AFTER avatar,
    MODIFY COLUMN create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'' AFTER status,
    MODIFY COLUMN update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER create_time,
    COMMENT = ''系统用户表（管理员、商家、普通用户）''',
  'SELECT 1'
);
PREPARE stmt_align_users FROM @sql_align_users;
EXECUTE stmt_align_users;
DEALLOCATE PREPARE stmt_align_users;

SET @merchant_hotel_images_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
);

SET @sql_align_merchant_hotel_images = IF(
  @merchant_hotel_images_exists = 1,
  'ALTER TABLE merchant_hotel_images
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    MODIFY COLUMN merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'' AFTER id,
    MODIFY COLUMN image_group ENUM(''signboard'',''frontdesk'',''facility'',''carousel'') NOT NULL COMMENT ''图片分组'' AFTER merchant_user_id,
    MODIFY COLUMN file_path VARCHAR(255) NOT NULL COMMENT ''图片访问路径'' AFTER image_group,
    MODIFY COLUMN file_name VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''原始文件名'' AFTER file_path,
    MODIFY COLUMN mime_type VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''文件MIME类型'' AFTER file_name,
    MODIFY COLUMN size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''文件大小（字节）'' AFTER mime_type,
    MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'' AFTER size_bytes,
    MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER created_at,
    COMMENT = ''商家酒店图片表''',
  'SELECT 1'
);
PREPARE stmt_align_merchant_hotel_images FROM @sql_align_merchant_hotel_images;
EXECUTE stmt_align_merchant_hotel_images;
DEALLOCATE PREPARE stmt_align_merchant_hotel_images;

SET @merchant_hotel_certificates_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificates'
);

SET @sql_align_merchant_hotel_certificates = IF(
  @merchant_hotel_certificates_exists = 1,
  'ALTER TABLE merchant_hotel_certificates
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID'',
    MODIFY COLUMN merchant_user_id INT UNSIGNED NOT NULL COMMENT ''商家用户ID'' AFTER id,
    MODIFY COLUMN cert_group ENUM(''business_license'',''legal_person_front'',''legal_person_back'',''special_permit'',''other_qualification'') NOT NULL COMMENT ''资质证件分组'' AFTER merchant_user_id,
    MODIFY COLUMN file_path VARCHAR(255) NOT NULL COMMENT ''图片访问路径'' AFTER cert_group,
    MODIFY COLUMN file_name VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''原始文件名'' AFTER file_path,
    MODIFY COLUMN mime_type VARCHAR(50) NOT NULL DEFAULT '''' COMMENT ''文件MIME类型'' AFTER file_name,
    MODIFY COLUMN size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''文件大小（字节）'' AFTER mime_type,
    MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间'' AFTER size_bytes,
    MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER created_at,
    COMMENT = ''商家资质证件表''',
  'SELECT 1'
);
PREPARE stmt_align_merchant_hotel_certificates FROM @sql_align_merchant_hotel_certificates;
EXECUTE stmt_align_merchant_hotel_certificates;
DEALLOCATE PREPARE stmt_align_merchant_hotel_certificates;
