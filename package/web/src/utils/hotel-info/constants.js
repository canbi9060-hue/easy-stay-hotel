export const amapJsKey = process.env.REACT_APP_AMAP_JS_KEY || process.env.REACT_APP_AMAP_KEY;
export const amapWebKey = process.env.REACT_APP_AMAP_WEB_KEY || process.env.REACT_APP_AMAP_KEY;
export const amapSecurityCode = process.env.REACT_APP_AMAP_SECURITY_CODE || '';

export const DEFAULT_COUNTRY = '中国';
export const DEFAULT_CENTER = { longitude: 116.397428, latitude: 39.90923 };
export const AMAP_VERSIONS = ['2.0', '1.4.15'];
export const MAP_ERROR_PATTERNS = /(USERKEY|INVALID_USER_KEY|PLAT_NOMATCH|SECURITY|Unimplemented type)/i;
export const WEB_KEY_ERROR_PATTERNS = /(USERKEY|INVALID_USER_KEY|PLAT_NOMATCH|KEY)/i;

export const countryOptions = [{ label: DEFAULT_COUNTRY, value: DEFAULT_COUNTRY }];

export const accommodationTypeOptions = [
  { label: '酒店', value: 'hotel' },
  { label: '民宿', value: 'homestay' },
];

export const starLevelOptions = [
  { label: '一星', value: 'one' },
  { label: '二星', value: 'two' },
  { label: '三星', value: 'three' },
  { label: '四星', value: 'four' },
  { label: '五星', value: 'five' },
];

export const reviewStatusMap = {
  incomplete: { text: '待完善', color: 'orange' },
  reviewing: { text: '审核中', color: 'blue' },
  rejected_pending_fix: { text: '驳回待修改', color: 'red' },
  approved: { text: '审核通过', color: 'green' },
};

export const facilityCategoryList = [
  {
    key: 'infrastructure',
    label: '基础设施',
    enLabel: 'Infrastructure',
    options: [
      { value: 'free_wifi', label: '免费 WiFi' },
      { value: 'free_parking', label: '免费停车场' },
      { value: 'paid_parking', label: '付费停车场' },
      { value: 'front_desk_24h', label: '24 小时前台服务' },
      { value: 'central_air_conditioning', label: '中央空调' },
      { value: 'guest_elevator', label: '客用电梯' },
      { value: 'hot_water_24h', label: '24 小时热水' },
      { value: 'toiletries', label: '洗漱用品' },
      { value: 'hair_dryer', label: '吹风机' },
      { value: 'private_bathroom', label: '独立卫浴' },
      { value: 'desk', label: '书桌' },
      { value: 'safe_box', label: '保险箱' },
      { value: 'non_smoking_room', label: '禁烟房' },
      { value: 'accessible_facilities', label: '无障碍设施' },
    ],
  },
  {
    key: 'entertainment',
    label: '娱乐设施',
    enLabel: 'Entertainment',
    options: [
      { value: 'indoor_pool', label: '室内游泳池' },
      { value: 'gym', label: '健身房' },
      { value: 'spa_massage', label: 'SPA / 按摩' },
      { value: 'chess_room', label: '棋牌室' },
      { value: 'kids_playground', label: '儿童乐园' },
      { value: 'bar_coffee', label: '酒吧 / 咖啡厅' },
      { value: 'tea_room', label: '茶室' },
      { value: 'ktv_room', label: 'KTV 包厢' },
    ],
  },
  {
    key: 'service',
    label: '服务设施',
    enLabel: 'Service',
    options: [
      { value: 'luggage_storage', label: '行李寄存' },
      { value: 'wake_up_service', label: '叫醒服务' },
      { value: 'shuttle_service', label: '接送服务' },
      { value: 'business_center', label: '商务中心' },
      { value: 'meeting_room', label: '会议室' },
      { value: 'room_service', label: '送餐服务' },
      { value: 'laundry_dry_cleaning', label: '洗衣 / 干洗' },
      { value: 'car_rental', label: '租车服务' },
      { value: 'security_24h', label: '24 小时安保' },
      { value: 'self_service_breakfast', label: '自助早餐' },
      { value: 'currency_exchange', label: '外币兑换' },
      { value: 'concierge_service', label: '礼宾服务' },
    ],
  },
  {
    key: 'specialty',
    label: '特色设施',
    enLabel: 'Specialty',
    options: [
      { value: 'pet_friendly', label: '宠物友好' },
      { value: 'ev_charging', label: '充电桩（新能源）' },
      { value: 'terrace_garden', label: '露台 / 花园' },
      { value: 'self_laundry', label: '洗衣房（自助）' },
    ],
  },
];

export const facilityCategoryKeys = facilityCategoryList.map((item) => item.key);
export const facilityOptionValueMap = facilityCategoryList.reduce((acc, category) => {
  acc[category.key] = category.options.map((option) => option.value);
  return acc;
}, {});

export const MAX_CUSTOM_FACILITY_COUNT = 20;
export const MAX_CUSTOM_FACILITY_LENGTH = 30;

export const createEmptyFacilitySelections = () => ({
  infrastructure: [],
  entertainment: [],
  service: [],
  specialty: [],
});

export const emptyHotelProfile = {
  reviewStatus: 'incomplete',
  accommodationType: 'hotel',
  starLevel: 'three',
  hotelName: '',
  isGroup: false,
  address: {
    country: DEFAULT_COUNTRY,
    province: '',
    city: '',
    district: '',
    detail: '',
    latitude: null,
    longitude: null,
    isManualLocation: false,
  },
  propertyTags: [],
  facilitySelections: createEmptyFacilitySelections(),
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
