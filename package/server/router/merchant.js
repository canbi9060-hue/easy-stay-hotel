const express = require('express');

const router = express.Router();
const merchantController = require('../router_handler/merchant_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['merchant']));

router.get('/hotel-profile', merchantController.getHotelProfile);
router.put('/hotel-profile', merchantController.updateHotelProfile);
router.post('/hotel-profile/submit-review', merchantController.submitHotelProfileReview);
router.get('/hotel-images', merchantController.getHotelImages);
router.get('/hotel-certificates', merchantController.getHotelCertificates);
router.get('/room-types', merchantController.getMerchantRoomTypes);
router.get('/room-types/suggestions', merchantController.getMerchantRoomTypeSuggestions);
router.get('/room-types/:id', merchantController.getMerchantRoomTypeDetail);
router.post('/room-types', merchantController.createMerchantRoomType);
router.put('/room-types/:id', merchantController.updateMerchantRoomType);
router.patch('/room-types/:id/on-sale', merchantController.toggleMerchantRoomTypeOnSale);
router.patch('/room-types/on-sale/batch', merchantController.batchToggleMerchantRoomTypesOnSale);
router.delete('/room-types/:id', merchantController.deleteMerchantRoomType);

module.exports = router;
