SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @merchant_hotel_images_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
);

SET @merchant_hotel_images_new_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
    AND index_name = 'idx_merchant_group'
);

SET @sql_add_merchant_hotel_images_new_idx = IF(
  @merchant_hotel_images_exists = 1 AND @merchant_hotel_images_new_idx_exists = 0,
  'ALTER TABLE merchant_hotel_images ADD INDEX idx_merchant_group (merchant_user_id, image_group)',
  'SELECT 1'
);
PREPARE stmt_add_merchant_hotel_images_new_idx FROM @sql_add_merchant_hotel_images_new_idx;
EXECUTE stmt_add_merchant_hotel_images_new_idx;
DEALLOCATE PREPARE stmt_add_merchant_hotel_images_new_idx;

SET @merchant_hotel_images_old_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
    AND index_name = 'idx_merchant_group_sort'
);

SET @sql_drop_merchant_hotel_images_old_idx = IF(
  @merchant_hotel_images_exists = 1 AND @merchant_hotel_images_old_idx_exists > 0,
  'ALTER TABLE merchant_hotel_images DROP INDEX idx_merchant_group_sort',
  'SELECT 1'
);
PREPARE stmt_drop_merchant_hotel_images_old_idx FROM @sql_drop_merchant_hotel_images_old_idx;
EXECUTE stmt_drop_merchant_hotel_images_old_idx;
DEALLOCATE PREPARE stmt_drop_merchant_hotel_images_old_idx;

SET @merchant_hotel_images_sort_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
    AND column_name = 'sort_order'
);

SET @sql_drop_merchant_hotel_images_sort = IF(
  @merchant_hotel_images_exists = 1 AND @merchant_hotel_images_sort_exists = 1,
  'ALTER TABLE merchant_hotel_images DROP COLUMN sort_order',
  'SELECT 1'
);
PREPARE stmt_drop_merchant_hotel_images_sort FROM @sql_drop_merchant_hotel_images_sort;
EXECUTE stmt_drop_merchant_hotel_images_sort;
DEALLOCATE PREPARE stmt_drop_merchant_hotel_images_sort;

SET @merchant_hotel_certificates_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificates'
);

SET @merchant_hotel_certificates_new_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificates'
    AND index_name = 'idx_merchant_cert_group'
);

SET @sql_add_merchant_hotel_certificates_new_idx = IF(
  @merchant_hotel_certificates_exists = 1 AND @merchant_hotel_certificates_new_idx_exists = 0,
  'ALTER TABLE merchant_hotel_certificates ADD INDEX idx_merchant_cert_group (merchant_user_id, cert_group)',
  'SELECT 1'
);
PREPARE stmt_add_merchant_hotel_certificates_new_idx FROM @sql_add_merchant_hotel_certificates_new_idx;
EXECUTE stmt_add_merchant_hotel_certificates_new_idx;
DEALLOCATE PREPARE stmt_add_merchant_hotel_certificates_new_idx;

SET @merchant_hotel_certificates_old_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificates'
    AND index_name = 'idx_merchant_cert_group_sort'
);

SET @sql_drop_merchant_hotel_certificates_old_idx = IF(
  @merchant_hotel_certificates_exists = 1 AND @merchant_hotel_certificates_old_idx_exists > 0,
  'ALTER TABLE merchant_hotel_certificates DROP INDEX idx_merchant_cert_group_sort',
  'SELECT 1'
);
PREPARE stmt_drop_merchant_hotel_certificates_old_idx FROM @sql_drop_merchant_hotel_certificates_old_idx;
EXECUTE stmt_drop_merchant_hotel_certificates_old_idx;
DEALLOCATE PREPARE stmt_drop_merchant_hotel_certificates_old_idx;

SET @merchant_hotel_certificates_sort_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_certificates'
    AND column_name = 'sort_order'
);

SET @sql_drop_merchant_hotel_certificates_sort = IF(
  @merchant_hotel_certificates_exists = 1 AND @merchant_hotel_certificates_sort_exists = 1,
  'ALTER TABLE merchant_hotel_certificates DROP COLUMN sort_order',
  'SELECT 1'
);
PREPARE stmt_drop_merchant_hotel_certificates_sort FROM @sql_drop_merchant_hotel_certificates_sort;
EXECUTE stmt_drop_merchant_hotel_certificates_sort;
DEALLOCATE PREPARE stmt_drop_merchant_hotel_certificates_sort;
