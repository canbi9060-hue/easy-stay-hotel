const express = require('express');
const router = express.Router();
const authController = require('../router_handler/auth_handler');
const { authMiddleware } = require('../middleware/auth'); // 导入中间件

// 基础接口（无需登录）
router.get('/captcha', authController.getCaptcha);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgetPassword', authController.forgetPassword);

// 需要登录的接口（先过authMiddleware校验token）
router.get('/info', authMiddleware, authController.getUserInfo); // 挂载中间件

module.exports = router;