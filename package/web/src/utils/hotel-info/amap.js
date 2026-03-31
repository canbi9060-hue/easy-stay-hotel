import AMapLoader from '@amap/amap-jsapi-loader';

import {
  amapJsKey,
  amapSecurityCode,
  amapWebKey,
  AMAP_VERSIONS,
  DEFAULT_CENTER,
  MAP_ERROR_PATTERNS,
  WEB_KEY_ERROR_PATTERNS,
} from './constants';
import {
  buildAddressResult,
  buildSearchParams,
  createMapError,
  ensureArray,
  getCityConstraint,
  mapDistrictOption,
  normalizeCoordinates,
  normalizeCountryKeyword,
  parseLocationText,
} from './shared';

let amapScriptPromise = null;
let activeAmapVersion = AMAP_VERSIONS[0];

// 根据高德返回的矩形边界文本计算中心点坐标。
const getCenterFromRectangle = (rectangleText) => {
  if (typeof rectangleText !== 'string' || !rectangleText.includes(';')) {
    return null;
  }

  const [leftBottom, rightTop] = rectangleText.split(';');
  const [lng1, lat1] = leftBottom.split(',').map((item) => Number(item));
  const [lng2, lat2] = rightTop.split(',').map((item) => Number(item));

  if (![lng1, lat1, lng2, lat2].every((item) => Number.isFinite(item))) {
    return null;
  }

  return {
    longitude: (lng1 + lng2) / 2,
    latitude: (lat1 + lat2) / 2,
  };
};

// 构造兜底定位结果，保证定位失败时地图也有可用中心点。
const createFallbackLocation = (payload = {}) => ({
  ...DEFAULT_CENTER,
  city: payload.city || '',
  province: payload.province || '',
  isFallback: true,
});

// 按指定版本加载高德 JSAPI，并记录当前生效版本。
const loadAmapWithVersion = async (key, version) => {
  if (amapSecurityCode) {
    window._AMapSecurityConfig = { securityJsCode: amapSecurityCode };
  }

  const AMap = await AMapLoader.load({
    key,
    version,
    plugins: [
      'AMap.Scale',
      'AMap.ToolBar',
      'AMap.Geocoder',
      'AMap.CitySearch',
      'AMap.DistrictSearch',
      'AMap.Geolocation',
    ],
  });

  activeAmapVersion = version;
  return AMap;
};

// 按候选版本顺序尝试加载高德地图，直到成功或遇到不可恢复错误。
const tryLoadAmap = async (key, versions) => {
  let lastError = null;

  for (const version of versions) {
    try {
      return await loadAmapWithVersion(key, version);
    } catch (error) {
      lastError = error;
      if (!MAP_ERROR_PATTERNS.test(error?.message || '')) {
        break;
      }
    }
  }

  throw lastError || createMapError();
};

// 发起高德 Web 服务请求，并在多个 key 之间做降级重试。
const requestAmap = async (path, params) => {
  const keyCandidates = [...new Set([amapWebKey, amapJsKey].filter(Boolean))];
  if (!keyCandidates.length) {
    throw createMapError('缺少高德 Web 服务 Key。');
  }

  let lastError = null;

  for (const key of keyCandidates) {
    const searchParams = buildSearchParams({ key, ...params });

    try {
      const response = await fetch(`https://restapi.amap.com${path}?${searchParams.toString()}`);
      const data = await response.json();

      if (data?.status === '1') {
        return data;
      }

      const infoText = data?.info || '高德地图服务请求失败。';
      lastError = createMapError(infoText);
      if (!WEB_KEY_ERROR_PATTERNS.test(infoText)) {
        break;
      }
    } catch (error) {
      lastError = createMapError(error?.message || '高德地图服务请求失败。');
    }
  }

  throw lastError || createMapError('高德地图服务请求失败。');
};

// 确保 JSAPI 回退链路可用，没有全局 AMap 时尝试主动加载。
const ensureAmapForJsApiFallback = async () => {
  if (window.AMap) {
    return window.AMap;
  }

  if (!amapJsKey) {
    return null;
  }

  try {
    return await loadAmapScript(amapJsKey);
  } catch (error) {
    return null;
  }
};

// 查询行政区数据，供省市区联动和中心点推断复用。
const requestDistrict = async (keyword, subdistrict) => {
  const data = await requestAmap('/v3/config/district', {
    keywords: normalizeCountryKeyword(keyword),
    subdistrict,
    extensions: 'base',
  });

  return ensureArray(data?.districts);
};

// 使用 JSAPI 查询行政区选项，作为 Web 服务不可用时的降级方案。
const fetchDistrictOptionsByJsApi = async (keyword) => {
  if (!keyword) {
    return [];
  }

  const AMap = await ensureAmapForJsApiFallback();
  if (!AMap || typeof AMap.DistrictSearch !== 'function') {
    return [];
  }

  return new Promise((resolve) => {
    const districtSearch = new AMap.DistrictSearch({
      subdistrict: 1,
      extensions: 'base',
    });

    districtSearch.search(normalizeCountryKeyword(keyword), (status, result) => {
      if (status !== 'complete') {
        resolve([]);
        return;
      }

      const districts = ensureArray(result?.districtList?.[0]?.districtList);
      resolve(districts.filter((item) => item?.name).map(mapDistrictOption));
    });
  });
};

// 通过高德 IP 服务推断当前位置中心点。
const resolveIpCenterByWebService = async () => {
  try {
    const ipData = await requestAmap('/v3/ip');
    const city = Array.isArray(ipData?.city) ? ipData.city[0] : ipData?.city;
    const province = Array.isArray(ipData?.province) ? ipData.province[0] : ipData?.province;
    const adcode = Array.isArray(ipData?.adcode) ? ipData.adcode[0] : ipData?.adcode;
    const keyword = adcode || city || province || '';

    if (!keyword) {
      return null;
    }

    const center = getCenterFromRectangle(ipData?.rectangle) || (await getDistrictCenterByKeyword(keyword));
    if (!Number.isFinite(center?.longitude) || !Number.isFinite(center?.latitude)) {
      return null;
    }

    return {
      longitude: center.longitude,
      latitude: center.latitude,
      city: city || '',
      province: province || '',
      adcode: adcode || '',
      isFallback: false,
    };
  } catch (error) {
    return null;
  }
};

// 调用浏览器高精度定位能力获取当前位置。
const resolveGeolocationCenter = async (AMap) => {
  if (!AMap || typeof AMap.Geolocation !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 8000,
      convert: true,
    });

    geolocation.getCurrentPosition((status, result) => {
      if (status !== 'complete') {
        resolve(null);
        return;
      }

      const position = normalizeCoordinates({
        longitude: result?.position?.lng,
        latitude: result?.position?.lat,
      });

      if (!position) {
        resolve(null);
        return;
      }

      const component = result?.addressComponent || {};
      resolve({
        longitude: position.longitude,
        latitude: position.latitude,
        city: component.city || component.province || '',
        province: component.province || '',
        district: component.district || '',
        isFallback: false,
      });
    });
  });
};

// 加载高德地图脚本，优先使用新版本内核。
export const loadAmapScript = async (key) => {
  if (!key) {
    throw createMapError('缺少高德地图 JS Key。');
  }

  if (window.AMap) {
    return window.AMap;
  }

  if (!amapScriptPromise) {
    amapScriptPromise = tryLoadAmap(key, AMAP_VERSIONS).catch((error) => {
      amapScriptPromise = null;
      throw createMapError(error?.message);
    });
  }

  return amapScriptPromise;
};

// 在新版本加载异常时，强制切换到旧版本高德内核重试。
export const retryAmapWithLegacyVersion = async (key) => {
  if (!key) {
    throw createMapError('缺少高德地图 JS Key。');
  }

  if (activeAmapVersion === '1.4.15' && window.AMap) {
    return window.AMap;
  }

  amapScriptPromise = tryLoadAmap(key, ['1.4.15']).catch((error) => {
    amapScriptPromise = null;
    throw createMapError(error?.message);
  });

  return amapScriptPromise;
};

// 获取指定行政区的下级区域选项，供表单级联选择使用。
export const fetchDistrictOptions = async (keyword) => {
  if (!keyword) {
    return [];
  }

  try {
    const districts = ensureArray((await requestDistrict(keyword, 1))?.[0]?.districts);
    if (districts.length) {
      return districts.filter((item) => item?.name).map(mapDistrictOption);
    }
  } catch (error) {
    // Web 服务不可用时回退到 JSAPI 方案。
  }

  return fetchDistrictOptionsByJsApi(keyword);
};

// 根据行政区关键字获取名称、adcode 和中心点等元信息。
export const getDistrictMetaByKeyword = async (keyword) => {
  if (typeof keyword !== 'string' || !keyword.trim()) {
    return null;
  }

  try {
    const district = (await requestDistrict(keyword, 0))?.[0];
    if (!district) {
      return null;
    }

    const center = parseLocationText(district.center);
    return {
      name: district.name || keyword,
      adcode: district.adcode || '',
      longitude: center?.longitude,
      latitude: center?.latitude,
    };
  } catch (error) {
    return null;
  }
};

// 根据行政区关键字推断中心点坐标，优先使用区域元数据，失败后回退地理编码。
export const getDistrictCenterByKeyword = async (keyword) => {
  if (typeof keyword !== 'string' || !keyword.trim()) {
    return null;
  }

  const districtMeta = await getDistrictMetaByKeyword(keyword);
  if (Number.isFinite(districtMeta?.longitude) && Number.isFinite(districtMeta?.latitude)) {
    return {
      longitude: districtMeta.longitude,
      latitude: districtMeta.latitude,
      name: districtMeta.name || keyword,
      adcode: districtMeta.adcode || '',
    };
  }

  const AMap = await ensureAmapForJsApiFallback();
  if (!AMap || typeof AMap.Geocoder !== 'function') {
    return null;
  }

  const center = await geocodeAddressByJsApi(AMap, normalizeCountryKeyword(keyword));
  if (!center) {
    return null;
  }

  return {
    ...center,
    name: keyword,
    adcode: '',
  };
};

// 将地址文本转换为坐标，优先 POI 搜索，再回退到普通地理编码。
export const geocodeAddress = async (addressText, options = {}) => {
  if (typeof addressText !== 'string' || !addressText.trim()) {
    return null;
  }

  const cityConstraint = getCityConstraint(options);

  try {
    const poiData = await requestAmap('/v3/place/text', {
      keywords: addressText,
      city: cityConstraint || undefined,
      citylimit: cityConstraint ? true : undefined,
      offset: 1,
      page: 1,
      extensions: 'base',
    });

    const poiLocation = parseLocationText(ensureArray(poiData?.pois)?.[0]?.location);
    if (poiLocation) {
      return poiLocation;
    }
  } catch (error) {
    // POI 搜索失败后继续回退到普通地理编码。
  }

  const data = await requestAmap('/v3/geocode/geo', {
    address: addressText,
    city: cityConstraint || undefined,
    citylimit: cityConstraint ? true : undefined,
  });

  return parseLocationText(data?.geocodes?.[0]?.location);
};

// 使用高德 JSAPI 对地址做地理编码，作为 Web 服务的本地降级方案。
export const geocodeAddressByJsApi = async (AMap, addressText, options = {}) => {
  if (!AMap || typeof AMap.Geocoder !== 'function') {
    return null;
  }

  if (typeof addressText !== 'string' || !addressText.trim()) {
    return null;
  }

  const cityConstraint = getCityConstraint(options);

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder({
      city: cityConstraint || undefined,
      citylimit: cityConstraint ? true : undefined,
    });

    geocoder.getLocation(addressText, (status, result) => {
      if (status !== 'complete') {
        resolve(null);
        return;
      }

      const geocodes = ensureArray(result?.geocodes);
      const location = geocodes[0]?.location;
      resolve(
        normalizeCoordinates({
          longitude: location?.lng,
          latitude: location?.lat,
        })
      );
    });
  });
};

// 使用高德 Web 服务把经纬度反查为地址信息。
export const reverseGeocodeCoordinates = async (coordinates) => {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  if (!normalizedCoordinates) {
    return null;
  }

  const data = await requestAmap('/v3/geocode/regeo', {
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

// 使用高德 JSAPI 把经纬度反查为地址信息，供 Web 服务失败时回退。
export const reverseGeocodeCoordinatesByJsApi = async (AMap, coordinates) => {
  if (!AMap || typeof AMap.Geocoder !== 'function') {
    return null;
  }

  const normalizedCoordinates = normalizeCoordinates(coordinates);
  if (!normalizedCoordinates) {
    return null;
  }

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder();

    geocoder.getAddress(
      [normalizedCoordinates.longitude, normalizedCoordinates.latitude],
      (status, result) => {
        if (status !== 'complete') {
          resolve(null);
          return;
        }

        resolve(
          buildAddressResult({
            component: result?.regeocode?.addressComponent || {},
            regeocode: result?.regeocode,
            formattedAddress: result?.regeocode?.formattedAddress || '',
            coordinates: normalizedCoordinates,
          })
        );
      }
    );
  });
};

// 按多级降级链路推断用户当前位置，尽可能给地图一个可用初始中心点。
export const locateByIP = async (AMap) => {
  const webIpCenter = await resolveIpCenterByWebService();
  if (webIpCenter) {
    return webIpCenter;
  }

  const geolocationCenter = await resolveGeolocationCenter(AMap);
  if (geolocationCenter) {
    return geolocationCenter;
  }

  if (!AMap || typeof AMap.CitySearch !== 'function') {
    return createFallbackLocation();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (!settled) {
        settled = true;
        resolve(payload);
      }
    };

    const citySearch = new AMap.CitySearch();
    citySearch.getLocalCity(async (status, result) => {
      if (status === 'complete' && result?.bounds) {
        const northEast = result.bounds.getNorthEast?.();
        const southWest = result.bounds.getSouthWest?.();

        if (northEast && southWest) {
          finish({
            longitude: (northEast.lng + southWest.lng) / 2,
            latitude: (northEast.lat + southWest.lat) / 2,
            city: result.city || '',
            province: result.province || '',
            isFallback: false,
          });
          return;
        }
      }

      const keyword = result?.city || result?.province || '';
      if (keyword) {
        try {
          const center = await getDistrictCenterByKeyword(keyword);
          if (center) {
            finish({
              longitude: center.longitude,
              latitude: center.latitude,
              city: result?.city || keyword,
              province: result?.province || '',
              isFallback: false,
            });
            return;
          }
        } catch (error) {
          // 继续执行后续降级链路，避免整个定位流程直接中断。
        }
      }

      const finalWebIpCenter = await resolveIpCenterByWebService();
      if (finalWebIpCenter) {
        finish(finalWebIpCenter);
        return;
      }

      finish(
        createFallbackLocation({
          city: result?.city || '',
          province: result?.province || '',
        })
      );
    });
  });
};

// 判断当前错误是否属于可通过切换地图版本恢复的问题。
export const isAmapRecoverableError = (error) => MAP_ERROR_PATTERNS.test(error?.message || '');
