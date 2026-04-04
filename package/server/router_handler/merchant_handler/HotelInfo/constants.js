const reviewStatusList = ['incomplete', 'reviewing', 'rejected_pending_fix', 'approved'];
const reviewStatusEditableOnSaveList = ['incomplete', 'rejected_pending_fix'];
const accommodationTypeList = ['hotel', 'homestay'];
const starLevelList = ['one', 'two', 'three', 'four', 'five'];
const defaultCountry = '中国';
const maxHotelNameLength = 100;
const maxAddressLength = 200;
const maxIntroductionLength = 200;
const maxTagLength = 20;
const maxTagCount = 20;
const maxCustomFacilityLength = 30;
const maxCustomFacilityCount = 20;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

const facilityOptionMap = {
  infrastructure: [
    'free_wifi',
    'free_parking',
    'paid_parking',
    'front_desk_24h',
    'central_air_conditioning',
    'guest_elevator',
    'hot_water_24h',
    'toiletries',
    'hair_dryer',
    'private_bathroom',
    'desk',
    'safe_box',
    'non_smoking_room',
    'accessible_facilities',
  ],
  entertainment: [
    'indoor_pool',
    'gym',
    'spa_massage',
    'chess_room',
    'kids_playground',
    'bar_coffee',
    'tea_room',
    'ktv_room',
  ],
  service: [
    'luggage_storage',
    'wake_up_service',
    'shuttle_service',
    'business_center',
    'meeting_room',
    'room_service',
    'laundry_dry_cleaning',
    'car_rental',
    'security_24h',
    'self_service_breakfast',
    'currency_exchange',
    'concierge_service',
  ],
  specialty: [
    'pet_friendly',
    'ev_charging',
    'terrace_garden',
    'self_laundry',
  ],
};

const facilityCategoryKeys = Object.keys(facilityOptionMap);
const hotelImageGroupList = ['signboard', 'frontdesk', 'facility', 'carousel'];
const hotelImageGroupLimits = {
  signboard: 2,
  frontdesk: 3,
  facility: 4,
  carousel: 5,
};
const hotelImageGroupLabels = {
  signboard: '店招图片',
  frontdesk: '前台图片',
  facility: '环境与设施',
  carousel: '轮播图',
};
const reviewRequiredImageGroups = ['signboard', 'frontdesk', 'facility', 'carousel'];
const hotelImageGroupEnum = "'signboard','frontdesk','facility','carousel'";

const hotelCertificateGroupList = [
  'business_license',
  'legal_person_front',
  'legal_person_back',
  'special_permit',
  'other_qualification',
];
const hotelCertificateGroupLimits = {
  business_license: 1,
  legal_person_front: 1,
  legal_person_back: 1,
  special_permit: 1,
  other_qualification: 3,
};
const hotelCertificateGroupLabels = {
  business_license: '营业执照',
  legal_person_front: '法人身份证正面',
  legal_person_back: '法人身份证反面',
  special_permit: '特种行业许可证',
  other_qualification: '其他资质证明',
};
const reviewRequiredCertificateGroups = [
  'business_license',
  'legal_person_front',
  'legal_person_back',
  'special_permit',
];
const hotelCertificateGroupEnum = "'business_license','legal_person_front','legal_person_back','special_permit','other_qualification'";

const defaultProfile = {
  reviewStatus: 'incomplete',
  accommodationType: 'hotel',
  starLevel: 'three',
  hotelName: '',
  isGroup: false,
  address: {
    country: defaultCountry,
    province: '',
    city: '',
    district: '',
    detail: '',
    latitude: null,
    longitude: null,
  },
  propertyTags: [],
  facilitySelections: {
    infrastructure: [],
    entertainment: [],
    service: [],
    specialty: [],
  },
  customFacilities: [],
  introduction: '',
  contactPhone: '',
  contactEmail: '',
  operationRules: {
    isOpen24Hours: false,
    businessStartTime: '09:00',
    businessEndTime: '18:00',
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
};

module.exports = {
  reviewStatusList,
  reviewStatusEditableOnSaveList,
  accommodationTypeList,
  starLevelList,
  defaultCountry,
  maxHotelNameLength,
  maxAddressLength,
  maxIntroductionLength,
  maxTagLength,
  maxTagCount,
  maxCustomFacilityLength,
  maxCustomFacilityCount,
  timeRegex,
  phoneRegex,
  emailRegex,
  facilityOptionMap,
  facilityCategoryKeys,
  hotelImageGroupList,
  hotelImageGroupLimits,
  hotelImageGroupLabels,
  reviewRequiredImageGroups,
  hotelImageGroupEnum,
  hotelCertificateGroupList,
  hotelCertificateGroupLimits,
  hotelCertificateGroupLabels,
  reviewRequiredCertificateGroups,
  hotelCertificateGroupEnum,
  defaultProfile,
};
