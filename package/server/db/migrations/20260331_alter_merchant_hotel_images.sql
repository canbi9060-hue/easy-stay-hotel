SET @schema_name = DATABASE();

SET @table_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
);

SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
    AND index_name = 'idx_merchant_group_sort'
);

SET @sql_idx = IF(
  @table_exists = 1 AND @idx_exists = 0,
  'ALTER TABLE merchant_hotel_images ADD INDEX idx_merchant_group_sort (merchant_user_id, image_group, sort_order)',
  'SELECT 1'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @column_type = (
  SELECT COLUMN_TYPE
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotel_images'
    AND column_name = 'image_group'
  LIMIT 1
);

SET @need_fix_enum = IF(
  @table_exists = 1
  AND (
    @column_type IS NULL
    OR LOCATE('''signboard''', @column_type) = 0
    OR LOCATE('''frontdesk''', @column_type) = 0
    OR LOCATE('''facility''', @column_type) = 0
    OR LOCATE('''carousel''', @column_type) = 0
  ),
  1,
  0
);

SET @sql_enum = IF(
  @need_fix_enum = 1,
  'ALTER TABLE merchant_hotel_images MODIFY COLUMN image_group ENUM(''signboard'',''frontdesk'',''facility'',''carousel'') NOT NULL COMMENT ''图片分组''',
  'SELECT 1'
);
PREPARE stmt_enum FROM @sql_enum;
EXECUTE stmt_enum;
DEALLOCATE PREPARE stmt_enum;
