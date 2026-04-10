const express = require('express');

const router = express.Router();
const merchantController = require('../router_handler/merchant_handler');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware(['merchant']));

router.get('/map/initial-location', merchantController.getMerchantMapInitialLocation);
router.get('/map/district-options', merchantController.getMerchantMapDistrictOptions);
router.get('/map/geocode', merchantController.getMerchantMapGeocode);
router.get('/map/regeocode', merchantController.getMerchantMapRegeocode);
router.get('/hotel-profile', merchantController.getHotelProfile);
router.put('/hotel-profile', merchantController.updateHotelProfile);
router.post('/hotel-profile/submit-review', merchantController.submitHotelProfileReview);
router.get('/hotel-images', merchantController.getHotelImages);
router.get('/hotel-certificates', merchantController.getHotelCertificates);
router.get('/room-types', merchantController.getMerchantRoomTypes);
router.get('/room-types/suggestions', merchantController.getMerchantRoomTypeSuggestions);
router.get('/room-types/:id', merchantController.getMerchantRoomTypeDetail);
router.get('/room-type-drafts', merchantController.getMerchantRoomTypeDrafts);
router.post('/room-type-drafts', merchantController.createMerchantRoomTypeDraft);
router.put('/room-type-drafts/:roomTypeId', merchantController.updateMerchantRoomTypeDraft);
router.delete('/room-type-drafts/create', merchantController.deleteMerchantRoomTypeCreateDraft);
router.delete('/room-type-drafts/:roomTypeId', merchantController.deleteMerchantRoomTypeDraft);
router.post('/room-types', merchantController.createMerchantRoomType);
router.put('/room-types/:id', merchantController.updateMerchantRoomType);
router.patch('/room-types/:id/on-sale', merchantController.toggleMerchantRoomTypeOnSale);
router.patch('/room-types/on-sale/batch', merchantController.batchToggleMerchantRoomTypesOnSale);
router.delete('/room-types/:id', merchantController.deleteMerchantRoomType);
router.get('/rooms', merchantController.getMerchantRooms);
router.post('/rooms', merchantController.createMerchantRoom);
router.post('/rooms/batch-generate', merchantController.batchGenerateMerchantRooms);
router.patch('/rooms/batch-physical-status', merchantController.batchUpdateMerchantRoomPhysicalStatus);
router.patch('/rooms/batch-room-type', merchantController.batchBindMerchantRoomType);
router.patch('/rooms/:id/transition', merchantController.transitionMerchantRoom);
router.put('/rooms/:id', merchantController.updateMerchantRoom);
router.delete('/rooms/:id', merchantController.deleteMerchantRoom);
router.get('/check-in/meta', merchantController.getMerchantCheckInMeta);
router.post('/check-in/reservations', merchantController.createMerchantStayReservation);
router.post('/check-in/walk-ins', merchantController.createMerchantStayWalkIn);
router.get('/check-in/orders', merchantController.getMerchantStayOrders);
router.patch('/check-in/orders/:id/check-in', merchantController.confirmMerchantStayCheckIn);
router.patch('/check-in/orders/:id/cancel', merchantController.cancelMerchantStayReservation);
router.patch('/check-in/orders/:id/extend', merchantController.extendMerchantStayOrder);
router.patch('/check-in/orders/:id/check-out', merchantController.checkOutMerchantStayOrder);
router.get('/check-in/orders/:id', merchantController.getMerchantStayOrderDetail);

module.exports = router;
