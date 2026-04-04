// router/index.js
const express = require('express');
const router = express.Router();
// 导入 auth 路由模块
const authRouter = require('./auth');
const adminRouter = require('./admin');
const merchantRouter = require('./merchant');
// 把 authRouter 挂载到 /auth 路径下
router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/merchant', merchantRouter);

module.exports = router;
