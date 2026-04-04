SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @hotel_images_hotel_fk_exists = (
  SELECT COUNT(1)
  FROM information_schema.referential_constraints
  WHERE CONVERT(constraint_schema USING utf8mb4) = CONVERT(@schema_name USING utf8mb4)
    AND CONVERT(table_name USING utf8mb4) = 'merchant_hotel_images'
    AND CONVERT(constraint_name USING utf8mb4) = 'fk_merchant_hotel_images_hotel'
);

SET @sql_add_hotel_images_hotel_fk = IF(
  @hotel_images_hotel_fk_exists = 0,
  'ALTER TABLE merchant_hotel_images ADD CONSTRAINT fk_merchant_hotel_images_hotel FOREIGN KEY (merchant_user_id) REFERENCES merchant_hotels (merchant_user_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt_add_hotel_images_hotel_fk FROM @sql_add_hotel_images_hotel_fk;
EXECUTE stmt_add_hotel_images_hotel_fk;
DEALLOCATE PREPARE stmt_add_hotel_images_hotel_fk;

SET @hotel_certificates_hotel_fk_exists = (
  SELECT COUNT(1)
  FROM information_schema.referential_constraints
  WHERE CONVERT(constraint_schema USING utf8mb4) = CONVERT(@schema_name USING utf8mb4)
    AND CONVERT(table_name USING utf8mb4) = 'merchant_hotel_certificates'
    AND CONVERT(constraint_name USING utf8mb4) = 'fk_merchant_hotel_certificates_hotel'
);

SET @sql_add_hotel_certificates_hotel_fk = IF(
  @hotel_certificates_hotel_fk_exists = 0,
  'ALTER TABLE merchant_hotel_certificates ADD CONSTRAINT fk_merchant_hotel_certificates_hotel FOREIGN KEY (merchant_user_id) REFERENCES merchant_hotels (merchant_user_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt_add_hotel_certificates_hotel_fk FROM @sql_add_hotel_certificates_hotel_fk;
EXECUTE stmt_add_hotel_certificates_hotel_fk;
DEALLOCATE PREPARE stmt_add_hotel_certificates_hotel_fk;
