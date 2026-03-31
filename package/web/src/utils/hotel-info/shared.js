import { DEFAULT_COUNTRY } from './constants';

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
