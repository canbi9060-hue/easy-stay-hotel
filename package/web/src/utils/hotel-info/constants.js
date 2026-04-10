
// ---- config/constants ----
export const amapJsKey = process.env.REACT_APP_AMAP_JS_KEY || '';

export const DEFAULT_COUNTRY = '中国';
export const DEFAULT_CENTER = { longitude: 116.397428, latitude: 39.90923 };
export const AMAP_VERSIONS = ['2.0', '1.4.15'];
export const MAP_ERROR_PATTERNS = /(USERKEY|INVALID_USER_KEY|PLAT_NOMATCH|SECURITY|Unimplemented type)/i;

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
  rejected_pending_fix: { text: '不通过', color: 'red' },
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
export const facilityOptionLabelMap = facilityCategoryList.reduce((acc, category) => {
  category.options.forEach((option) => {
    acc[option.value] = option.label;
  });
  return acc;
}, {});

export const MAX_CUSTOM_FACILITY_COUNT = 20;
export const MAX_CUSTOM_FACILITY_LENGTH = 30;
export const MAX_INTRODUCTION_LENGTH = 200;
export const DEFAULT_TOTAL_FLOOR_COUNT = 1;
export const MAX_TOTAL_FLOOR_COUNT = 200;
export const createFloorLabels = (totalFloorCount = DEFAULT_TOTAL_FLOOR_COUNT) => Array.from(
  { length: totalFloorCount },
  (_, index) => `${index + 1}层`
);

export const createEmptyFacilitySelections = () => ({
  infrastructure: [],
  entertainment: [],
  service: [],
  specialty: [],
});

export const emptyHotelProfile = {
  hasPendingDraft: false,
  reviewStatus: 'incomplete',
  reviewRemark: '',
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
  floorInfo: {
    totalFloorCount: DEFAULT_TOTAL_FLOOR_COUNT,
    floors: createFloorLabels(DEFAULT_TOTAL_FLOOR_COUNT),
  },
};


export const hotelInfoTabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'images', label: '酒店图片' },
  { key: 'facilities', label: '设施设备' },
  { key: 'certificates', label: '资质证件' },
];

export const hotelImageGroups = [
  {
    key: 'signboard',
    title: '店招图片',
    desc: '主入口、门头或建筑外观。支持 JPG/PNG，单张不超过 5MB。',
    maxCount: 2,
  },
  {
    key: 'frontdesk',
    title: '前台图片',
    desc: '前台接待区域全景及细节展示。',
    maxCount: 3,
  },
  {
    key: 'facility',
    title: '环境与设施',
    desc: '餐厅、泳池、健身房、走廊等公共设施展示。',
    maxCount: 4,
  },
  {
    key: 'carousel',
    title: '轮播图（APP/小程序首页）',
    desc: '建议尺寸 750x422，最多上传 5 张。',
    maxCount: 5,
  },
];

export const certificateGroups = [
  {
    key: 'business_license',
    title: '营业执照',
    subtitle: '支持 JPG/PNG 格式，单张最大 5MB',
    maxCount: 1,
    columns: 2,
  },
  {
    key: 'legal_person_identity',
    title: '法人身份证',
    columns: 2,
    children: [
      { key: 'legal_person_front', title: '身份证人像面', maxCount: 1 },
      { key: 'legal_person_back', title: '身份证国徽面', maxCount: 1 },
    ],
  },
  {
    key: 'special_permit',
    title: '特种行业许可证',
    maxCount: 1,
    columns: 1,
  },
  {
    key: 'other_qualification',
    title: '其他资质证明',
    maxCount: 3,
    columns: 3,
  },
];

export const certificateLeafGroups = [
  { key: 'business_license', title: '营业执照', maxCount: 1 },
  { key: 'legal_person_front', title: '法人身份证人像面', maxCount: 1 },
  { key: 'legal_person_back', title: '法人身份证国徽面', maxCount: 1 },
  { key: 'special_permit', title: '特种行业许可证', maxCount: 1 },
  { key: 'other_qualification', title: '其他资质证明', maxCount: 3 },
];

export const hotelImageGroupKeys = hotelImageGroups.map((group) => group.key);
export const hotelImageGroupLimits = hotelImageGroups.reduce((acc, group) => {
  acc[group.key] = Number(group.maxCount) || 0;
  return acc;
}, {});
export const hotelImageGroupLabels = hotelImageGroups.reduce((acc, group) => {
  acc[group.key] = group.title || group.key;
  return acc;
}, {});
export const reviewRequiredImageGroupKeys = [...hotelImageGroupKeys];

export const certificateGroupKeys = certificateLeafGroups.map((group) => group.key);
export const certificateGroupLimits = certificateLeafGroups.reduce((acc, group) => {
  acc[group.key] = Number(group.maxCount) || 0;
  return acc;
}, {});
export const certificateGroupLabels = certificateLeafGroups.reduce((acc, group) => {
  acc[group.key] = group.title || group.key;
  return acc;
}, {});
export const reviewRequiredCertificateGroupKeys = [
  'business_license',
  'legal_person_front',
  'legal_person_back',
  'special_permit',
];

export const findMissingRequiredMediaGroups = (groupedItems, requiredGroupKeys = []) =>
  requiredGroupKeys.filter((groupKey) => {
    const list = Array.isArray(groupedItems?.[groupKey]) ? groupedItems[groupKey] : [];
    return list.length < 1;
  });

export const createEmptyHotelImages = () => ({
  signboard: [],
  frontdesk: [],
  facility: [],
  carousel: [],
});

export const createEmptyHotelCertificates = () => ({
  business_license: [],
  legal_person_front: [],
  legal_person_back: [],
  special_permit: [],
  other_qualification: [],
});

const mapFileItem = (item, defaultKey) => ({
  id: item?.id,
  group: item?.group || defaultKey,
  filePath: item?.filePath || '',
  sizeBytes: Number(item?.sizeBytes) || 0,
  mimeType: item?.mimeType || '',
  createdAt: item?.createdAt || '',
});

export const normalizeHotelImagesPayload = (payload) => {
  const base = createEmptyHotelImages();
  if (!payload || typeof payload !== 'object') {
    return base;
  }
  hotelImageGroups.forEach(({ key }) => {
    const list = Array.isArray(payload[key]) ? payload[key] : [];
    base[key] = list.map((item) => mapFileItem(item, key));
  });
  return base;
};

export const normalizeHotelCertificatesPayload = (payload) => {
  const base = createEmptyHotelCertificates();
  if (!payload || typeof payload !== 'object') {
    return base;
  }
  certificateLeafGroups.forEach(({ key }) => {
    const list = Array.isArray(payload[key]) ? payload[key] : [];
    base[key] = list.map((item) => mapFileItem(item, key));
  });
  return base;
};

export const validateImageUploadFile = (
  file,
  {
    maxSizeMb = 5,
    invalidTypeMessage = '仅支持 JPG/PNG 格式图片。',
    oversizeMessage = '单张图片不能超过 5MB。',
  } = {}
) => {
  const isValidType = ['image/jpeg', 'image/png'].includes(file?.type);
  if (!isValidType) {
    return {
      valid: false,
      message: invalidTypeMessage,
    };
  }

  if (Number(file?.size) / 1024 / 1024 > maxSizeMb) {
    return {
      valid: false,
      message: oversizeMessage,
    };
  }

  return {
    valid: true,
    message: '',
  };
};

export const calculateUploadPercent = ({ loaded, total }) =>
  total ? Math.max(1, Math.min(100, Math.round((loaded / total) * 100))) : 0;

// ---- shared utils ----

export const ensureArray = (value) => (Array.isArray(value) ? value : []);

// 判断一个值是否为普通对象，便于做表单和接口数据的结构校验。
export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// ---- profile normalize ----

const normalizeFacilitySelections = (sourceValue) => {
  const source = isPlainObject(sourceValue) ? sourceValue : {};
  const result = createEmptyFacilitySelections();

  facilityCategoryKeys.forEach((categoryKey) => {
    const whiteList = new Set(facilityOptionValueMap[categoryKey] || []);
    const normalized = ensureArray(source[categoryKey])
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item, index, arr) => item && whiteList.has(item) && arr.indexOf(item) === index);
    result[categoryKey] = normalized;
  });

  return result;
};

const normalizeCustomFacilities = (value) =>
  ensureArray(value)
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, MAX_CUSTOM_FACILITY_LENGTH))
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, MAX_CUSTOM_FACILITY_COUNT);

export const normalizeHotelProfile = (profile) => {
  const source = isPlainObject(profile) ? profile : {};
  const address = isPlainObject(source.address) ? source.address : {};
  const operationRules = isPlainObject(source.operationRules) ? source.operationRules : {};
  const floorInfo = isPlainObject(source.floorInfo) ? source.floorInfo : {};
  const country =
    !address.country || address.country === 'China'
      ? emptyHotelProfile.address.country
      : address.country;
  const reviewStatus = reviewStatusMap[source.reviewStatus] ? source.reviewStatus : emptyHotelProfile.reviewStatus;
  const totalFloorCount = Number.isInteger(Number(floorInfo.totalFloorCount))
    ? Math.min(MAX_TOTAL_FLOOR_COUNT, Math.max(DEFAULT_TOTAL_FLOOR_COUNT, Number(floorInfo.totalFloorCount)))
    : emptyHotelProfile.floorInfo.totalFloorCount;

  return {
    ...emptyHotelProfile,
    ...source,
    hasPendingDraft: Boolean(source.hasPendingDraft),
    reviewStatus,
    address: {
      ...emptyHotelProfile.address,
      ...address,
      country,
      isManualLocation: Boolean(address.isManualLocation),
    },
    propertyTags: ensureArray(source.propertyTags)
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
    facilitySelections: normalizeFacilitySelections(source.facilitySelections),
    customFacilities: normalizeCustomFacilities(source.customFacilities),
    operationRules: {
      ...emptyHotelProfile.operationRules,
      ...operationRules,
    },
    floorInfo: {
      totalFloorCount,
      floors: Array.isArray(floorInfo.floors) && floorInfo.floors.length === totalFloorCount
        ? floorInfo.floors
        : createFloorLabels(totalFloorCount),
    },
  };
};

export const formatAddressText = (address) => {
  if (!isPlainObject(address)) {
    return '';
  }

  return [address.country, address.province, address.city, address.district, address.detail]
    .filter(Boolean)
    .join('');
};

export const collectHotelFacilityLabels = (profile) => {
  const selections = isPlainObject(profile?.facilitySelections) ? profile.facilitySelections : {};
  const selectedLabels = facilityCategoryKeys
    .flatMap((categoryKey) => ensureArray(selections[categoryKey]))
    .map((value) => facilityOptionLabelMap[value] || '')
    .filter(Boolean);
  const customLabels = ensureArray(profile?.customFacilities)
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set([...selectedLabels, ...customLabels])];
};
