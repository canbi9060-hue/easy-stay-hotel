const express = require('express');

const router = express.Router();
const merchantController = require('../router_handler/merchant_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['merchant']));

router.get('/hotel-profile', merchantController.getHotelProfile);
router.put('/hotel-profile', merchantController.updateHotelProfile);
router.post('/hotel-profile/submit-review', merchantController.submitHotelProfileReview);

module.exports = router;
