CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID（主键）',
  `username` varchar(50) NOT NULL COMMENT '登录账号（唯一）',
  `password` varchar(100) NOT NULL COMMENT '登录密码（加密存储）',
  `role` enum('admin','merchant','user') NOT NULL DEFAULT 'user' COMMENT '用户角色：admin/merchant/user',
  `name` varchar(50) DEFAULT '' COMMENT '真实姓名或商家名称',
  `phone` varchar(20) DEFAULT '' COMMENT '联系电话',
  `email` varchar(100) DEFAULT '' COMMENT '邮箱',
  `avatar` varchar(255) DEFAULT '' COMMENT '头像地址',
  `status` tinyint unsigned NOT NULL DEFAULT '1' COMMENT '账号状态：0-禁用，1-正常',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表（管理员、商家、普通用户）';
