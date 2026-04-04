SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @merchant_room_type_images_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_room_type_images'
);

SET @merchant_room_type_images_new_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_room_type_images'
    AND index_name = 'idx_room_type_images_room_id'
);

SET @sql_add_room_type_images_new_idx = IF(
  @merchant_room_type_images_exists = 1 AND @merchant_room_type_images_new_idx_exists = 0,
  'ALTER TABLE merchant_room_type_images ADD INDEX idx_room_type_images_room_id (room_type_id, id)',
  'SELECT 1'
);
PREPARE stmt_add_room_type_images_new_idx FROM @sql_add_room_type_images_new_idx;
EXECUTE stmt_add_room_type_images_new_idx;
DEALLOCATE PREPARE stmt_add_room_type_images_new_idx;

SET @merchant_room_type_images_old_idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_room_type_images'
    AND index_name = 'idx_room_type_images_room_sort'
);

SET @sql_drop_room_type_images_old_idx = IF(
  @merchant_room_type_images_exists = 1 AND @merchant_room_type_images_old_idx_exists > 0,
  'ALTER TABLE merchant_room_type_images DROP INDEX idx_room_type_images_room_sort',
  'SELECT 1'
);
PREPARE stmt_drop_room_type_images_old_idx FROM @sql_drop_room_type_images_old_idx;
EXECUTE stmt_drop_room_type_images_old_idx;
DEALLOCATE PREPARE stmt_drop_room_type_images_old_idx;

SET @merchant_room_type_images_sort_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_room_type_images'
    AND column_name = 'sort_order'
);

SET @sql_drop_room_type_images_sort = IF(
  @merchant_room_type_images_exists = 1 AND @merchant_room_type_images_sort_exists = 1,
  'ALTER TABLE merchant_room_type_images DROP COLUMN sort_order',
  'SELECT 1'
);
PREPARE stmt_drop_room_type_images_sort FROM @sql_drop_room_type_images_sort;
EXECUTE stmt_drop_room_type_images_sort;
DEALLOCATE PREPARE stmt_drop_room_type_images_sort;
