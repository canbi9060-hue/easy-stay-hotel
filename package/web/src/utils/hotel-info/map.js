import AMapLoader from '@amap/amap-jsapi-loader';
import {
  AMAP_VERSIONS,
  DEFAULT_CENTER,
  DEFAULT_COUNTRY,
  amapSecurityCode,
  ensureArray,
  formatAddressText,
  isPlainObject,
} from './constants';

// ---- shared utils ----

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

// ---- map compose ----

export const locateByAddressInput = async (address, webKey) => {
  if (!isPlainObject(address)) {
    return null;
  }

  const detailText = typeof address?.detail === 'string' ? address.detail.trim() : '';
  const regionKeyword = address?.district || address?.city || address?.province || '';
  const cityConstraint = address?.city || address?.province || '';

  if (detailText) {
    try {
      const geocoded = await geocodeAddress(webKey, formatAddressText({ ...address, detail: detailText }), {
        city: cityConstraint,
      });
      if (geocoded) {
        return geocoded;
      }
    } catch (error) {
      // fall back to region center
    }
  }

  if (!regionKeyword) {
    return null;
  }

  try {
    return await getDistrictCenterByKeyword(webKey, regionKeyword);
  } catch (error) {
    return null;
  }
};

export const resolveAddressFromPoint = async (coordinates, webKey) =>
  reverseGeocodeCoordinates(webKey, coordinates);

export const prefillAddressByIP = async (currentAddress, webKey) => {
  const latestAddress = isPlainObject(currentAddress) ? currentAddress : {};
  const location = await locateByIP(webKey);
  if (!location) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const coordinates = { latitude, longitude };
  const addressPatch = {};

  if (!latestAddress.country) {
    addressPatch.country = DEFAULT_COUNTRY;
  }
  if (!latestAddress.province && location.province) {
    addressPatch.province = location.province;
  }
  if (!latestAddress.city && location.city) {
    addressPatch.city = location.city;
  }

  try {
    const reverseAddress = await reverseGeocodeCoordinates(webKey, coordinates);
    if (!latestAddress.province && !addressPatch.province && reverseAddress?.province) {
      addressPatch.province = reverseAddress.province;
    }
    if (!latestAddress.city && !addressPatch.city && reverseAddress?.city) {
      addressPatch.city = reverseAddress.city;
    }
    if (!latestAddress.district && reverseAddress?.district) {
      addressPatch.district = reverseAddress.district;
    }
    if (!latestAddress.detail && reverseAddress?.detail) {
      addressPatch.detail = reverseAddress.detail;
    }
  } catch (error) {
    // keep ip result even if reverse-geocode fails
  }

  return { coordinates, addressPatch };
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

