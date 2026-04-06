const reviewStatusList = ['incomplete', 'reviewing', 'rejected_pending_fix', 'approved'];
const accommodationTypeList = ['hotel', 'homestay'];
const starLevelList = ['one', 'two', 'three', 'four', 'five'];
const defaultCountry = '中国';
const maxHotelNameLength = 100;
const maxAddressLength = 200;
const maxIntroductionLength = 200;
const defaultTotalFloorCount = 1;
const maxTotalFloorCount = 200;
const minReviewRemarkLength = 10;
const maxReviewRemarkLength = 100;
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
const facilityOptionLabelMap = {
  free_wifi: '免费 WiFi',
  free_parking: '免费停车场',
  paid_parking: '付费停车场',
  front_desk_24h: '24 小时前台服务',
  central_air_conditioning: '中央空调',
  guest_elevator: '客用电梯',
  hot_water_24h: '24 小时热水',
  toiletries: '洗漱用品',
  hair_dryer: '吹风机',
  private_bathroom: '独立卫浴',
  desk: '书桌',
  safe_box: '保险箱',
  non_smoking_room: '禁烟房',
  accessible_facilities: '无障碍设施',
  indoor_pool: '室内游泳池',
  gym: '健身房',
  spa_massage: 'SPA / 按摩',
  chess_room: '棋牌室',
  kids_playground: '儿童乐园',
  bar_coffee: '酒吧 / 咖啡厅',
  tea_room: '茶室',
  ktv_room: 'KTV 包厢',
  luggage_storage: '行李寄存',
  wake_up_service: '叫醒服务',
  shuttle_service: '接送服务',
  business_center: '商务中心',
  meeting_room: '会议室',
  room_service: '送餐服务',
  laundry_dry_cleaning: '洗衣 / 干洗',
  car_rental: '租车服务',
  security_24h: '24 小时安保',
  self_service_breakfast: '自助早餐',
  currency_exchange: '外币兑换',
  concierge_service: '礼宾服务',
  pet_friendly: '宠物友好',
  ev_charging: '充电桩（新能源）',
  terrace_garden: '露台 / 花园',
  self_laundry: '洗衣房（自助）',
};
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
const createFloorLabels = (totalFloorCount = defaultTotalFloorCount) => Array.from(
  { length: totalFloorCount },
  (_, index) => `${index + 1}层`
);

const defaultProfile = {
  hasPendingDraft: false,
  reviewStatus: 'incomplete',
  reviewRemark: '',
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
  floorInfo: {
    totalFloorCount: defaultTotalFloorCount,
    floors: createFloorLabels(defaultTotalFloorCount),
  },
};

module.exports = {
  reviewStatusList,
  accommodationTypeList,
  starLevelList,
  defaultCountry,
  maxHotelNameLength,
  maxAddressLength,
  maxIntroductionLength,
  defaultTotalFloorCount,
  maxTotalFloorCount,
  minReviewRemarkLength,
  maxReviewRemarkLength,
  maxTagLength,
  maxTagCount,
  maxCustomFacilityLength,
  maxCustomFacilityCount,
  timeRegex,
  phoneRegex,
  emailRegex,
  facilityOptionMap,
  facilityCategoryKeys,
  facilityOptionLabelMap,
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
  createFloorLabels,
  defaultProfile,
};
