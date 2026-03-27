const express = require('express');

const router = express.Router();
const authController = require('../router_handler/auth_handler');
const { authMiddleware } = require('../middleware/auth');

router.get('/captcha', authController.getCaptcha);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgetPassword', authController.forgetPassword);

router.get('/info', authMiddleware, authController.getUserInfo);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/avatar', authMiddleware, authController.updateAvatar);

module.exports = router;
