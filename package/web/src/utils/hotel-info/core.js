import AMapLoader from '@amap/amap-jsapi-loader';

// ---- config/constants ----
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

export const createEmptyImageGroupFlags = (defaultValue = false) =>
  hotelImageGroups.reduce((acc, group) => {
    acc[group.key] = defaultValue;
    return acc;
  }, {});

export const createEmptyCertificateGroupFlags = (defaultValue = false) =>
  certificateLeafGroups.reduce((acc, group) => {
    acc[group.key] = defaultValue;
    return acc;
  }, {});

export const removeKey = (target, key) => {
  if (!target || !(key in target)) return target;
  const next = { ...target };
  delete next[key];
  return next;
};

const mapFileItem = (item, defaultKey) => ({
  id: item?.id,
  group: item?.group || defaultKey,
  filePath: item?.filePath || '',
  sortOrder: Number(item?.sortOrder) || 0,
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

// 统一把不确定类型的值兜底成数组，避免后续遍历时报错。
export const ensureArray = (value) => (Array.isArray(value) ? value : []);

// 判断一个值是否为普通对象，便于做表单和接口数据的结构校验。
export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// 构造地图相关错误对象，统一错误出口和提示文案。
export const createMapError = (message) =>
  new Error(message || '地图加载失败，请检查高德 Key 和安全域名配置。');

// 兼容英文国家名输入，统一转换为系统内部使用的国家关键字。
export const normalizeCountryKeyword = (keyword) =>
  keyword === 'China' ? DEFAULT_COUNTRY : keyword;

// 根据传入对象构造 URL 查询参数，并自动过滤空字段。
export const buildSearchParams = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
};

// 解析高德接口返回的 "经度,纬度" 文本为坐标对象。
export const parseLocationText = (locationText) => {
  if (typeof locationText !== 'string' || !locationText.trim()) {
    return null;
  }

  const [longitude, latitude] = locationText.split(',').map((item) => Number(item));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

// 规范化坐标结构，确保经纬度都是合法数字。
export const normalizeCoordinates = (coordinates) => {
  const longitude = Number(coordinates?.longitude);
  const latitude = Number(coordinates?.latitude);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

// 从地图事件对象或原始经纬度对象中提取统一坐标结构。
export const extractCoordinates = (payload) => {
  const source = payload?.lnglat || payload?.lngLat || payload;
  if (!source) {
    return null;
  }

  const longitude = Number(typeof source.getLng === 'function' ? source.getLng() : source.lng);
  const latitude = Number(typeof source.getLat === 'function' ? source.getLat() : source.lat);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

// 获取地理编码时的城市约束，优先使用 adcode，其次使用 city 和区域关键字。
export const getCityConstraint = (options = {}) =>
  (typeof options.adcode === 'string' ? options.adcode.trim() : '') ||
  (typeof options.city === 'string' ? options.city.trim() : '') ||
  (typeof options.regionKeyword === 'string' ? options.regionKeyword.trim() : '');

// 将行政区数据转换为前端下拉框可直接使用的选项格式。
export const mapDistrictOption = (district) => ({
  label: district.name,
  value: district.name,
  adcode: district.adcode || '',
  center: parseLocationText(district.center),
});

// 把逆地理编码结果整理成页面表单所需的地址对象。
export const buildAddressResult = ({ component = {}, regeocode, formattedAddress, coordinates }) => {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  if (!normalizedCoordinates) {
    return null;
  }

  const streetNumber = component.streetNumber || {};
  const pois = ensureArray(regeocode?.pois);
  const detail =
    [streetNumber.street, streetNumber.number].filter(Boolean).join('') ||
    pois[0]?.name ||
    formattedAddress;

  return {
    country: component.country || DEFAULT_COUNTRY,
    province: component.province || '',
    city:
      (Array.isArray(component.city) ? component.city[0] : component.city) ||
      component.province ||
      '',
    district: component.district || '',
    detail: detail || '',
    formattedAddress: formattedAddress || '',
    longitude: normalizedCoordinates.longitude,
    latitude: normalizedCoordinates.latitude,
  };
};


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
  const country =
    !address.country || address.country === 'China'
      ? emptyHotelProfile.address.country
      : address.country;

  return {
    ...emptyHotelProfile,
    ...source,
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


// ---- map runtime ----

// 渲染或更新地图实例，并统一处理点选与拖拽选点逻辑。
export const renderMapInstance = (AMap, container, coordinates, refs, onPointSelect) => {
  if (!AMap || !container || !refs?.mapRef || !refs?.markerRef) {
    return;
  }

  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs;
  const activeContainer = mapRef.current?.getContainer?.();
  if (mapRef.current && activeContainer && activeContainer !== container) {
    destroyMapInstance(refs);
  }
  const position = normalizeCoordinates(coordinates);
  const hasPosition = Boolean(position);
  const center = hasPosition
    ? [position.longitude, position.latitude]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  if (!mapRef.current) {
    mapRef.current = new AMap.Map(container, {
      resizeEnable: true,
      viewMode: '2D',
      zoom: hasPosition ? 15 : 11,
      center,
    });

    if (AMap.TileLayer) {
      try {
        mapRef.current.add(new AMap.TileLayer());
      } catch (error) {
        // 旧版插件环境下可能不需要显式添加底图图层。
      }
    }

    if (AMap.Scale) {
      mapRef.current.addControl(new AMap.Scale());
    }

    if (AMap.ToolBar) {
      mapRef.current.addControl(new AMap.ToolBar());
    }
  } else {
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(hasPosition ? 15 : 11);
  }

  if (!clickHandlerRef.current) {
    clickHandlerRef.current = (event) => {
      const point = extractCoordinates(event);
      if (point) {
        onPointSelect?.(point);
      }
    };

    mapRef.current.on('click', clickHandlerRef.current);
  }

  if (!hasPosition) {
    if (markerRef.current) {
      if (dragHandlerRef.current) {
        markerRef.current.off('dragend', dragHandlerRef.current);
      }

      mapRef.current.remove?.(markerRef.current);
      markerRef.current = null;
      dragHandlerRef.current = null;
    }

    return;
  }

  if (!markerRef.current) {
    markerRef.current = new AMap.Marker({
      position: center,
      draggable: true,
    });
    mapRef.current.add(markerRef.current);
  } else {
    markerRef.current.setPosition(center);
  }

  if (!dragHandlerRef.current) {
    dragHandlerRef.current = (event) => {
      const point = extractCoordinates(event) || extractCoordinates(event?.target?.getPosition?.());
      if (point) {
        onPointSelect?.(point);
      }
    };

    markerRef.current.on('dragend', dragHandlerRef.current);
  }
};

// 销毁地图实例和事件绑定，避免弹窗关闭后遗留无效引用。
export const destroyMapInstance = (refs) => {
  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs || {};

  if (markerRef?.current && dragHandlerRef?.current) {
    markerRef.current.off('dragend', dragHandlerRef.current);
  }

  if (mapRef?.current && clickHandlerRef?.current) {
    mapRef.current.off('click', clickHandlerRef.current);
  }

  mapRef?.current?.destroy();

  if (mapRef) {
    mapRef.current = null;
  }
  if (markerRef) {
    markerRef.current = null;
  }
  if (clickHandlerRef) {
    clickHandlerRef.current = null;
  }
  if (dragHandlerRef) {
    dragHandlerRef.current = null;
  }
};


// ---- amap services ----
let amapScriptPromise = null;

const requestAmap = async (key, path, params) => {
  if (!key) {
    throw createMapError('缺少高德 Web 服务 Key。');
  }

  const searchParams = buildSearchParams({ key, ...params });
  const response = await fetch('https://restapi.amap.com' + path + '?' + searchParams.toString());
  const data = await response.json();
  if (data?.status !== '1') {
    throw createMapError(data?.info || '高德地图服务请求失败。');
  }
  return data;
};

export const loadAmapScript = async (jsKey) => {
  if (!jsKey) {
    throw createMapError('缺少高德地图 JS Key。');
  }

  if (window.AMap) {
    return window.AMap;
  }

  if (!amapScriptPromise) {
    amapScriptPromise = AMapLoader.load({
      key: jsKey,
      version: AMAP_VERSIONS[0],
      plugins: [
        'AMap.Scale',
        'AMap.ToolBar',
        'AMap.Geocoder',
        'AMap.CitySearch',
        'AMap.DistrictSearch',
      ],
      ...(amapSecurityCode ? { securityJsCode: amapSecurityCode } : {}),
    }).catch((error) => {
      amapScriptPromise = null;
      throw createMapError(error?.message || '地图加载失败。');
    });
  }

  return amapScriptPromise;
};

export const fetchDistrictOptions = async (webKey, keyword) => {
  if (!keyword) {
    return [];
  }

  const data = await requestAmap(webKey, '/v3/config/district', {
    keywords: normalizeCountryKeyword(keyword),
    subdistrict: 1,
    extensions: 'base',
  });

  const districts = ensureArray(data?.districts?.[0]?.districts);
  return districts.filter((item) => item?.name).map(mapDistrictOption);
};

export const getDistrictCenterByKeyword = async (webKey, keyword) => {
  if (typeof keyword !== 'string' || !keyword.trim()) {
    return null;
  }

  const data = await requestAmap(webKey, '/v3/config/district', {
    keywords: normalizeCountryKeyword(keyword),
    subdistrict: 0,
    extensions: 'base',
  });

  const district = data?.districts?.[0];
  const center = parseLocationText(district?.center);
  if (!center) {
    return null;
  }
  return {
    ...center,
    adcode: district?.adcode || '',
    name: district?.name || keyword,
  };
};

export const geocodeAddress = async (webKey, addressText, options = {}) => {
  if (typeof addressText !== 'string' || !addressText.trim()) {
    return null;
  }

  const cityConstraint = getCityConstraint(options);
  const data = await requestAmap(webKey, '/v3/geocode/geo', {
    address: addressText,
    city: cityConstraint || undefined,
    citylimit: cityConstraint ? true : undefined,
  });

  return parseLocationText(data?.geocodes?.[0]?.location);
};

export const reverseGeocodeCoordinates = async (webKey, coordinates) => {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  if (!normalizedCoordinates) {
    return null;
  }

  const data = await requestAmap(webKey, '/v3/geocode/regeo', {
    location: `${normalizedCoordinates.longitude},${normalizedCoordinates.latitude}`,
    extensions: 'all',
  });

  return buildAddressResult({
    component: data?.regeocode?.addressComponent || {},
    regeocode: data?.regeocode,
    formattedAddress: data?.regeocode?.formatted_address || '',
    coordinates: normalizedCoordinates,
  });
};

export const locateByIP = async (webKey) => {
  const ipData = await requestAmap(webKey, '/v3/ip');
  const city = Array.isArray(ipData?.city) ? ipData.city[0] : ipData?.city;
  const province = Array.isArray(ipData?.province) ? ipData.province[0] : ipData?.province;
  const adcode = Array.isArray(ipData?.adcode) ? ipData.adcode[0] : ipData?.adcode;
  const rectangle = typeof ipData?.rectangle === 'string' ? ipData.rectangle : '';

  let center = null;
  if (rectangle.includes(';')) {
    const [leftBottom, rightTop] = rectangle.split(';');
    const [lng1, lat1] = leftBottom.split(',').map((item) => Number(item));
    const [lng2, lat2] = rightTop.split(',').map((item) => Number(item));
    if ([lng1, lat1, lng2, lat2].every((item) => Number.isFinite(item))) {
      center = {
        longitude: (lng1 + lng2) / 2,
        latitude: (lat1 + lat2) / 2,
      };
    }
  }

  if (!center) {
    const keyword = adcode || city || province;
    if (!keyword) {
      return null;
    }
    center = await getDistrictCenterByKeyword(webKey, keyword);
  }

  if (!Number.isFinite(center?.longitude) || !Number.isFinite(center?.latitude)) {
    return null;
  }

  return {
    longitude: center.longitude,
    latitude: center.latitude,
    city: city || '',
    province: province || '',
    adcode: adcode || '',
  };
};
