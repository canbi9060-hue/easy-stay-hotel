ALTER TABLE `merchant_hotels`
  ADD COLUMN `total_floor_count` int unsigned NOT NULL DEFAULT '1' COMMENT '总楼层数' AFTER `check_out_time`;

CREATE TABLE `merchant_hotel_floors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `merchant_user_id` int unsigned NOT NULL COMMENT '商家用户ID',
  `floor_number` int unsigned NOT NULL COMMENT '楼层序号',
  `floor_label` varchar(20) NOT NULL DEFAULT '' COMMENT '楼层名称',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_hotel_floors_number` (`merchant_user_id`,`floor_number`),
  KEY `idx_merchant_hotel_floors_user` (`merchant_user_id`),
  CONSTRAINT `fk_merchant_hotel_floors_hotel` FOREIGN KEY (`merchant_user_id`) REFERENCES `merchant_hotels` (`merchant_user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商家酒店楼层表';

WITH RECURSIVE seq AS (
  SELECT 1 AS floor_number
  UNION ALL
  SELECT floor_number + 1
  FROM seq
  WHERE floor_number < 200
)
INSERT INTO `merchant_hotel_floors` (`merchant_user_id`, `floor_number`, `floor_label`)
SELECT
  h.`merchant_user_id`,
  seq.`floor_number`,
  CONCAT(seq.`floor_number`, '层')
FROM `merchant_hotels` h
JOIN seq ON seq.`floor_number` <= h.`total_floor_count`;
