SET @has_is_forced_off_sale = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'merchant_room_types'
    AND column_name = 'is_forced_off_sale'
);

SET @sql_add_is_forced_off_sale = IF(
  @has_is_forced_off_sale = 0,
  'ALTER TABLE merchant_room_types ADD COLUMN is_forced_off_sale TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''平台强制下架状态：0否 1是'' AFTER is_on_sale',
  'SELECT 1'
);
PREPARE stmt_add_is_forced_off_sale FROM @sql_add_is_forced_off_sale;
EXECUTE stmt_add_is_forced_off_sale;
DEALLOCATE PREPARE stmt_add_is_forced_off_sale;

SET @has_forced_off_admin_id = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'merchant_room_types'
    AND column_name = 'forced_off_admin_id'
);

SET @sql_add_forced_off_admin_id = IF(
  @has_forced_off_admin_id = 0,
  'ALTER TABLE merchant_room_types ADD COLUMN forced_off_admin_id INT UNSIGNED NULL COMMENT ''强制下架管理员ID'' AFTER audit_admin_id',
  'SELECT 1'
);
PREPARE stmt_add_forced_off_admin_id FROM @sql_add_forced_off_admin_id;
EXECUTE stmt_add_forced_off_admin_id;
DEALLOCATE PREPARE stmt_add_forced_off_admin_id;

SET @has_forced_off_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'merchant_room_types'
    AND column_name = 'forced_off_at'
);

SET @sql_add_forced_off_at = IF(
  @has_forced_off_at = 0,
  'ALTER TABLE merchant_room_types ADD COLUMN forced_off_at DATETIME NULL COMMENT ''强制下架时间'' AFTER audit_at',
  'SELECT 1'
);
PREPARE stmt_add_forced_off_at FROM @sql_add_forced_off_at;
EXECUTE stmt_add_forced_off_at;
DEALLOCATE PREPARE stmt_add_forced_off_at;

SET @has_forced_off_admin_idx = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'merchant_room_types'
    AND index_name = 'fk_merchant_room_types_forced_off_admin'
);

SET @sql_add_forced_off_admin_idx = IF(
  @has_forced_off_admin_idx = 0,
  'ALTER TABLE merchant_room_types ADD INDEX fk_merchant_room_types_forced_off_admin (forced_off_admin_id)',
  'SELECT 1'
);
PREPARE stmt_add_forced_off_admin_idx FROM @sql_add_forced_off_admin_idx;
EXECUTE stmt_add_forced_off_admin_idx;
DEALLOCATE PREPARE stmt_add_forced_off_admin_idx;

SET @has_forced_off_admin_fk = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE constraint_schema = DATABASE()
    AND table_name = 'merchant_room_types'
    AND constraint_name = 'fk_merchant_room_types_forced_off_admin'
);

SET @sql_add_forced_off_admin_fk = IF(
  @has_forced_off_admin_fk = 0,
  'ALTER TABLE merchant_room_types ADD CONSTRAINT fk_merchant_room_types_forced_off_admin FOREIGN KEY (forced_off_admin_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_add_forced_off_admin_fk FROM @sql_add_forced_off_admin_fk;
EXECUTE stmt_add_forced_off_admin_fk;
DEALLOCATE PREPARE stmt_add_forced_off_admin_fk;
