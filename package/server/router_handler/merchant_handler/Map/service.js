require('../../../config/env');

const { createHandlerError, safeTrim } = require('../../utils/common');
const { requestJson } = require('../../../utils/http');
const { getMerchantHotelProfileView } = require('../HotelInfo/profile');

const amapBaseUrl = 'https://restapi.amap.com';
const defaultCountry = '中国';
const maxKeywordLength = 50;
const maxAddressLength = 200;

const normalizeCountryKeyword = (keyword) => (keyword === 'China' ? defaultCountry : keyword);
const unwrapAmapValue = (value) => (Array.isArray(value) ? value[0] : value);

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCoordinates = (coordinates) => {
  const longitude = Number(coordinates?.longitude);
  const latitude = Number(coordinates?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

const parseLocationText = (locationText) => {
  if (typeof locationText !== 'string' || !locationText.trim()) {
    return null;
  }

  const [longitude, latitude] = locationText.split(',').map((item) => Number(item));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

const parseRectangleCenter = (rectangle) => {
  if (typeof rectangle !== 'string' || !rectangle.includes(';')) {
    return null;
  }

  const [leftBottom, rightTop] = rectangle.split(';');
  const firstPoint = parseLocationText(leftBottom);
  const secondPoint = parseLocationText(rightTop);
  if (!firstPoint || !secondPoint) {
    return null;
  }

  return {
    longitude: (firstPoint.longitude + secondPoint.longitude) / 2,
    latitude: (firstPoint.latitude + secondPoint.latitude) / 2,
  };
};

const uniqueSegments = (parts = []) => parts.reduce((acc, part) => {
  const text = safeTrim(part);
  if (!text || acc.includes(text)) {
    return acc;
  }

  acc.push(text);
  return acc;
}, []);

const formatAddressText = (address = {}) => uniqueSegments([
  address.country || defaultCountry,
  address.province,
  address.city,
  address.district,
  address.detail,
]).join('');

const hasAddressText = (address = {}) => Boolean(
  safeTrim(address.province) ||
  safeTrim(address.city) ||
  safeTrim(address.district) ||
  safeTrim(address.detail)
);

const mapDistrictOption = (district) => ({
  label: district?.name || '',
  value: district?.name || '',
  adcode: district?.adcode || '',
  center: normalizeCoordinates(parseLocationText(district?.center)),
});

const buildLocation = (location = {}) => {
  const coordinates = normalizeCoordinates(location);
  return {
    country: safeTrim(location.country) || defaultCountry,
    province: safeTrim(location.province),
    city: safeTrim(location.city),
    district: safeTrim(location.district),
    detail: safeTrim(location.detail),
    formattedAddress: safeTrim(location.formattedAddress),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  };
};

const buildStoredLocation = (address = {}) => {
  const location = buildLocation({
    country: address.country,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    formattedAddress: formatAddressText(address),
    latitude: address.latitude,
    longitude: address.longitude,
  });

  if (!location.formattedAddress) {
    location.formattedAddress = formatAddressText(location);
  }

  return location;
};

const mergeResolvedLocation = (storedLocation, resolvedLocation) => buildLocation({
  country: resolvedLocation?.country || storedLocation?.country || defaultCountry,
  province: resolvedLocation?.province || storedLocation?.province,
  city: resolvedLocation?.city || storedLocation?.city,
  district: resolvedLocation?.district || storedLocation?.district,
  detail: resolvedLocation?.detail || storedLocation?.detail,
  formattedAddress:
    resolvedLocation?.formattedAddress ||
    formatAddressText({
      ...storedLocation,
      ...resolvedLocation,
      detail: resolvedLocation?.detail || storedLocation?.detail,
    }),
  latitude: resolvedLocation?.latitude,
  longitude: resolvedLocation?.longitude,
});

const mapRegeocodeLocation = (regeocode = {}, coordinates) => {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  if (!normalizedCoordinates) {
    return null;
  }

  const addressComponent = regeocode.addressComponent || {};
  const streetNumber = addressComponent.streetNumber || {};
  const pois = safeArray(regeocode.pois);
  const formattedAddress = safeTrim(regeocode.formatted_address || regeocode.formattedAddress);
  const detail =
    uniqueSegments([
      streetNumber.street,
      streetNumber.number,
    ]).join('') ||
    safeTrim(pois[0]?.name) ||
    formattedAddress;

  return buildLocation({
    country: addressComponent.country || defaultCountry,
    province: addressComponent.province || '',
    city:
      unwrapAmapValue(addressComponent.city) ||
      addressComponent.province ||
      '',
    district: addressComponent.district || '',
    detail,
    formattedAddress,
    latitude: normalizedCoordinates.latitude,
    longitude: normalizedCoordinates.longitude,
  });
};

const buildFallbackLocation = (addressText, geocode = {}) => {
  const coordinates = parseLocationText(geocode?.location);

  return buildLocation({
    country: safeTrim(geocode?.country) || defaultCountry,
    province: safeTrim(geocode?.province),
    city:
      safeTrim(unwrapAmapValue(geocode?.city)) ||
      safeTrim(geocode?.province) ||
      '',
    district: safeTrim(geocode?.district),
    detail: safeTrim(addressText).slice(0, maxAddressLength),
    formattedAddress:
      safeTrim(geocode?.formatted_address || geocode?.formattedAddress || addressText)
        .slice(0, maxAddressLength),
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
  });
};

const normalizeIpCandidate = (rawIp = '') => {
  const ipText = safeTrim(rawIp).replace(/^::ffff:/, '');
  if (!ipText || ipText === '::1' || ipText === '127.0.0.1') {
    return '';
  }

  if (
    /^10\./.test(ipText) ||
    /^192\.168\./.test(ipText) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ipText)
  ) {
    return '';
  }

  return ipText;
};

const getClientIp = (req) => {
  const forwardedFor = safeTrim(req.headers?.['x-forwarded-for']);
  const firstForwardedIp = forwardedFor ? forwardedFor.split(',')[0] : '';
  return normalizeIpCandidate(
    firstForwardedIp ||
    req.headers?.['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    ''
  );
};

const createAmapError = (kind, message, field = '') => createHandlerError(kind, message, field);

const buildAmapUrl = (path, params = {}) => {
  const amapWebKey = safeTrim(process.env.AMAP_WEB_KEY);
  if (!amapWebKey) {
    throw createAmapError('config', '服务器未配置地图服务 Key');
  }

  const searchParams = new URLSearchParams({
    key: amapWebKey,
    output: 'JSON',
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return `${amapBaseUrl}${path}?${searchParams.toString()}`;
};

const ensureAmapSuccess = (data, fallbackMessage) => {
  if (data?.status === '1') {
    return data;
  }

  const info = safeTrim(data?.info) || fallbackMessage;
  const errorKind = /INVALID_USER_KEY|USERKEY/i.test(info) ? 'config' : 'external';
  const error = createAmapError(errorKind, info);
  error.infoCode = safeTrim(data?.infocode);
  throw error;
};

const requestAmap = async (path, params, fallbackMessage) => {
  const requestUrl = buildAmapUrl(path, params);
  const data = await requestJson(requestUrl);
  return ensureAmapSuccess(data, fallbackMessage);
};

const geocodeAddressText = async (rawAddressText) => {
  const addressText = safeTrim(rawAddressText);
  if (!addressText) {
    throw createAmapError('validation', '地址不能为空', 'address');
  }
  if (addressText.length > maxAddressLength) {
    throw createAmapError('validation', `地址不能超过 ${maxAddressLength} 个字符`, 'address');
  }

  const data = await requestAmap(
    '/v3/geocode/geo',
    { address: addressText },
    '地图地理编码失败'
  );
  const geocode = safeArray(data?.geocodes)[0];
  const coordinates = parseLocationText(geocode?.location);
  if (!coordinates) {
    throw createAmapError('validation', '未找到匹配的地址位置', 'address');
  }

  try {
    const reverseLocation = await reverseGeocodeCoordinates(coordinates);
    return reverseLocation || buildFallbackLocation(addressText, geocode);
  } catch (error) {
    if (error.kind === 'validation') {
      return buildFallbackLocation(addressText, geocode);
    }
    throw error;
  }
};

const reverseGeocodeCoordinates = async (rawCoordinates) => {
  const coordinates = normalizeCoordinates(rawCoordinates);
  if (!coordinates) {
    throw createAmapError('validation', '经纬度参数无效', 'longitude');
  }

  const data = await requestAmap(
    '/v3/geocode/regeo',
    {
      location: `${coordinates.longitude},${coordinates.latitude}`,
      extensions: 'all',
    },
    '地图逆地理编码失败'
  );
  const location = mapRegeocodeLocation(data?.regeocode, coordinates);
  if (!location) {
    throw createAmapError('validation', '当前位置未能解析地址', 'longitude');
  }

  return location;
};

const locateByIp = async (clientIp = '') => {
  const data = await requestAmap(
    '/v3/ip',
    clientIp ? { ip: clientIp } : {},
    '地图 IP 定位失败'
  );

  const city = safeTrim(unwrapAmapValue(data?.city));
  const province = safeTrim(unwrapAmapValue(data?.province));
  const adcode = safeTrim(unwrapAmapValue(data?.adcode));
  let coordinates = parseRectangleCenter(data?.rectangle);

  if (!coordinates) {
    const keyword = city || province || adcode;
    if (keyword) {
      const geocodedLocation = await geocodeAddressText(keyword).catch(() => null);
      coordinates = normalizeCoordinates(geocodedLocation);
    }
  }

  if (!coordinates) {
    throw createAmapError('external', 'IP 定位未返回可用坐标');
  }

  return {
    coordinates,
    city,
    province,
    adcode,
  };
};

const getMerchantDistrictOptions = async (rawKeyword) => {
  const keyword = normalizeCountryKeyword(safeTrim(rawKeyword));
  if (!keyword) {
    return [];
  }
  if (keyword.length > maxKeywordLength) {
    throw createAmapError('validation', `行政区关键字不能超过 ${maxKeywordLength} 个字符`, 'keyword');
  }

  const data = await requestAmap(
    '/v3/config/district',
    {
      keywords: keyword,
      subdistrict: '1',
      extensions: 'base',
    },
    '地图行政区查询失败'
  );
  const districtList = safeArray(data?.districts?.[0]?.districts);
  return districtList
    .filter((item) => item?.name)
    .map(mapDistrictOption);
};

const getMerchantInitialLocation = async (merchantUserId, clientIp = '') => {
  const hotelProfile = await getMerchantHotelProfileView(merchantUserId);
  const storedLocation = buildStoredLocation(hotelProfile?.address);
  const storedCoordinates = normalizeCoordinates(storedLocation);

  if (storedCoordinates) {
    return {
      source: 'stored',
      location: storedLocation,
    };
  }

  if (hasAddressText(storedLocation)) {
    const geocodedLocation = await geocodeAddressText(formatAddressText(storedLocation)).catch(() => null);
    if (!geocodedLocation) {
      return {
        source: 'empty',
        location: null,
      };
    }

    return {
      source: 'stored_geocoded',
      location: mergeResolvedLocation(storedLocation, geocodedLocation),
    };
  }

  const ipLocation = await locateByIp(clientIp).catch(() => null);
  if (!ipLocation) {
    return {
      source: 'empty',
      location: null,
    };
  }

  const reverseLocation = await reverseGeocodeCoordinates(ipLocation.coordinates).catch(() => null);
  return {
    source: 'ip',
    location: reverseLocation || buildLocation({
      country: defaultCountry,
      province: ipLocation.province,
      city: ipLocation.city,
      district: '',
      detail: '',
      formattedAddress: uniqueSegments([ipLocation.province, ipLocation.city]).join(''),
      latitude: ipLocation.coordinates.latitude,
      longitude: ipLocation.coordinates.longitude,
    }),
  };
};

module.exports = {
  getClientIp,
  getMerchantInitialLocation,
  getMerchantDistrictOptions,
  geocodeAddressText,
  reverseGeocodeCoordinates,
};
