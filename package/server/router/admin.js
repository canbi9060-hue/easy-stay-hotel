const express = require('express');

const router = express.Router();
const adminController = require('../router_handler/admin_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['admin']));

router.get('/room-types', adminController.getAdminRoomTypes);
router.get('/room-types/:id', adminController.getAdminRoomTypeDetail);
router.patch('/room-types/:id/audit', adminController.auditAdminRoomType);

module.exports = router;
