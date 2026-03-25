// router/index.js
const express = require('express');
const router = express.Router();
// 导入 auth 路由模块
const authRouter = require('./auth');
// 把 authRouter 挂载到 /auth 路径下
router.use('/auth', authRouter);

module.exports = router;
