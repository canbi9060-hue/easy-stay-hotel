SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @merchant_hotels_exists = (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
);

SET @merchant_hotels_review_remark_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'merchant_hotels'
    AND column_name = 'review_remark'
);

SET @sql_add_merchant_hotels_review_remark = IF(
  @merchant_hotels_exists = 1 AND @merchant_hotels_review_remark_exists = 0,
  'ALTER TABLE merchant_hotels ADD COLUMN review_remark VARCHAR(100) NOT NULL DEFAULT '''' COMMENT ''审核备注/驳回原因'' AFTER review_status',
  'SELECT 1'
);
PREPARE stmt_add_merchant_hotels_review_remark FROM @sql_add_merchant_hotels_review_remark;
EXECUTE stmt_add_merchant_hotels_review_remark;
DEALLOCATE PREPARE stmt_add_merchant_hotels_review_remark;
