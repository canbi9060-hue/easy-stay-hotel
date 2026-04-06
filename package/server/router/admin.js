const express = require('express');

const router = express.Router();
const adminController = require('../router_handler/admin_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['admin']));

router.get('/room-types', adminController.getAdminRoomTypes);
router.get('/room-types/:id', adminController.getAdminRoomTypeDetail);
router.patch('/room-types/:id/audit', adminController.auditAdminRoomType);
router.patch('/room-types/:id/sale-control', adminController.controlAdminRoomTypeSale);
router.get('/hotels', adminController.getAdminHotels);
router.get('/hotels/:merchantUserId', adminController.getAdminHotelDetail);
router.patch('/hotels/:merchantUserId/review', adminController.reviewAdminHotel);

module.exports = router;
