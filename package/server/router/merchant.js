const express = require('express');

const router = express.Router();
const merchantController = require('../router_handler/merchant_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['merchant']));

router.get('/hotel-profile', merchantController.getHotelProfile);
router.put('/hotel-profile', merchantController.updateHotelProfile);
router.post('/hotel-profile/submit-review', merchantController.submitHotelProfileReview);
router.get('/hotel-images', merchantController.getHotelImages);
router.post('/hotel-images/upload', merchantController.uploadHotelImage);
router.delete('/hotel-images/:id', merchantController.deleteHotelImage);
router.put('/hotel-images/sort', merchantController.sortHotelImages);
router.get('/hotel-certificates', merchantController.getHotelCertificates);
router.post('/hotel-certificates/upload', merchantController.uploadHotelCertificate);
router.delete('/hotel-certificates/:id', merchantController.deleteHotelCertificate);

module.exports = router;
