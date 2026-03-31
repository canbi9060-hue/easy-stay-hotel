SET @schema_name = DATABASE();

SET @table_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
);

SET @sql_expand_enum = IF(
  @table_exists = 1,
  'ALTER TABLE merchant_hotels MODIFY COLUMN review_status ENUM(''pending'',''approved'',''rejected'',''incomplete'',''reviewing'',''rejected_pending_fix'') NOT NULL DEFAULT ''incomplete'' COMMENT ''审核状态''',
  'SELECT 1'
);
PREPARE stmt_expand_enum FROM @sql_expand_enum;
EXECUTE stmt_expand_enum;
DEALLOCATE PREPARE stmt_expand_enum;

SET @sql_migrate_values = IF(
  @table_exists = 1,
  'UPDATE merchant_hotels SET review_status = CASE review_status WHEN ''pending'' THEN ''incomplete'' WHEN ''rejected'' THEN ''rejected_pending_fix'' ELSE review_status END',
  'SELECT 1'
);
PREPARE stmt_migrate_values FROM @sql_migrate_values;
EXECUTE stmt_migrate_values;
DEALLOCATE PREPARE stmt_migrate_values;

SET @sql_finalize_enum = IF(
  @table_exists = 1,
  'ALTER TABLE merchant_hotels MODIFY COLUMN review_status ENUM(''incomplete'',''reviewing'',''rejected_pending_fix'',''approved'') NOT NULL DEFAULT ''incomplete'' COMMENT ''审核状态''',
  'SELECT 1'
);
PREPARE stmt_finalize_enum FROM @sql_finalize_enum;
EXECUTE stmt_finalize_enum;
DEALLOCATE PREPARE stmt_finalize_enum;
