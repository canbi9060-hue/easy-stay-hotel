import AMapLoader from '@amap/amap-jsapi-loader';

export const amapJsKey = process.env.REACT_APP_AMAP_JS_KEY || process.env.REACT_APP_AMAP_KEY;
export const amapWebKey = process.env.REACT_APP_AMAP_WEB_KEY || process.env.REACT_APP_AMAP_KEY;
export const amapSecurityCode = process.env.REACT_APP_AMAP_SECURITY_CODE || '';

export const countryOptions = [{ label: '中国', value: '中国' }];

export const hotelTabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'images', label: '图片资料' },
  { key: 'facilities', label: '设施设备' },
  { key: 'certificates', label: '资质证件' },
];

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
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '审核通过', color: 'green' },
  rejected: { text: '审核驳回', color: 'red' },
};

export const defaultPropertyTags = [
  '豪华',
  '商务出行',
  '亲子友好',
  '度假休闲',
  '宠物友好',
  '24小时入住',
  '免费 Wi-Fi',
  '免费停车',
];

export const emptyHotelProfile = {
  reviewStatus: 'pending',
  accommodationType: 'hotel',
  starLevel: 'three',
  hotelName: '',
  isGroup: false,
  address: {
    country: '中国',
    province: '',
    city: '',
    district: '',
    detail: '',
    latitude: null,
    longitude: null,
    // 新增：标记是否手动定位，防止被自动定位覆盖
    isManualLocation: false,
  },
  propertyTags: [],
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

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const AMAP_VERSIONS = ['2.0', '1.4.15'];
const MAP_ERROR_PATTERNS = /(USERKEY|INVALID_USER_KEY|PLAT_NOMATCH|SECURITY|Unimplemented type)/i;
export const DEFAULT_CENTER = { longitude: 116.397428, latitude: 39.90923 };

let amapScriptPromise = null;
let activeAmapVersion = AMAP_VERSIONS[0];

const createMapError = (message) =>
  new Error(message || '地图加载失败，请检查高德 Key 和安全域名配置。');

const normalizeCountryKeyword = (keyword) => (keyword === 'China' ? '中国' : keyword);
const WEB_KEY_ERROR_PATTERNS = /(USERKEY|INVALID_USER_KEY|PLAT_NOMATCH|KEY)/i;
const parseLocationText = (locationText) => {
  if (!locationText || typeof locationText !== 'string') {
    return null;
  }
  const [longitude, latitude] = locationText.split(',').map((item) => Number(item));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  return { longitude, latitude };
};

const buildSearchParams = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams;
};

const loadAmapWithVersion = async (key, version) => {
  if (amapSecurityCode) {
    window._AMapSecurityConfig = {
      securityJsCode: amapSecurityCode,
    };
  }

  const AMap = await AMapLoader.load({
    key,
    version,
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.CitySearch', 'AMap.DistrictSearch', 'AMap.Geolocation'],
  });

  activeAmapVersion = version;
  return AMap;
};

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

export const normalizeHotelProfile = (profile) => {
  const source = profile && typeof profile === 'object' ? profile : {};
  const normalizedAddress =
    source.address && typeof source.address === 'object' ? source.address : {};
  const normalizedCountry =
    !normalizedAddress.country || normalizedAddress.country === 'China'
      ? emptyHotelProfile.address.country
      : normalizedAddress.country;

  return {
    ...emptyHotelProfile,
    ...source,
    address: {
      ...emptyHotelProfile.address,
      ...normalizedAddress,
      country: normalizedCountry,
      isManualLocation: !!normalizedAddress.isManualLocation,
    },
    propertyTags: ensureArray(source.propertyTags)
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
    operationRules: {
      ...emptyHotelProfile.operationRules,
      ...(source.operationRules && typeof source.operationRules === 'object'
        ? source.operationRules
        : {}),
    },
  };
};

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

const requestAmap = async (path, params) => {
  const keyCandidates = [...new Set([amapWebKey, amapJsKey].filter(Boolean))];
  if (!keyCandidates.length) {
    throw createMapError('缺少高德 Web 服务 Key。');
  }

  let lastError = null;
  for (const key of keyCandidates) {
    const searchParams = buildSearchParams({
      key,
      ...params,
    });

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
      resolve(
        districts
          .filter((item) => item?.name)
          .map((item) => ({
            label: item.name,
            value: item.name,
            adcode: item.adcode || '',
            center: parseLocationText(item.center),
          }))
      );
    });
  });
};

export const fetchDistrictOptions = async (keyword) => {
  if (!keyword) {
    return [];
  }
  try {
    const data = await requestAmap('/v3/config/district', {
      keywords: normalizeCountryKeyword(keyword),
      subdistrict: 1,
      extensions: 'base',
    });

    const districts = ensureArray(data?.districts?.[0]?.districts);
    if (districts.length) {
      return districts
        .filter((item) => item?.name)
        .map((item) => ({
          label: item.name,
          value: item.name,
          adcode: item.adcode || '',
          center: parseLocationText(item.center),
        }));
    }
  } catch (error) {
    // ignore and fallback to JSAPI
  }

  return fetchDistrictOptionsByJsApi(keyword);
};

export const getDistrictMetaByKeyword = async (keyword) => {
  if (!keyword || typeof keyword !== 'string') {
    return null;
  }

  try {
    const data = await requestAmap('/v3/config/district', {
      keywords: normalizeCountryKeyword(keyword),
      subdistrict: 0,
      extensions: 'base',
    });

    const district = ensureArray(data?.districts)?.[0];
    if (!district) {
      return null;
    }
    const center = parseLocationText(district?.center);
    return {
      name: district?.name || keyword,
      adcode: district?.adcode || '',
      longitude: center?.longitude,
      latitude: center?.latitude,
    };
  } catch (error) {
    return null;
  }
};

export const getDistrictCenterByKeyword = async (keyword) => {
  if (!keyword || typeof keyword !== 'string') {
    return null;
  }

  const districtMeta = await getDistrictMetaByKeyword(keyword);
  if (Number.isFinite(districtMeta?.longitude) && Number.isFinite(districtMeta?.latitude)) {
    return {
      longitude: districtMeta.longitude,
      latitude: districtMeta.latitude,
      name: districtMeta?.name || keyword,
      adcode: districtMeta?.adcode || '',
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

export const geocodeAddress = async (addressText, options = {}) => {
  if (!addressText || typeof addressText !== 'string') {
    return null;
  }

  const cityConstraint =
    (typeof options.adcode === 'string' ? options.adcode.trim() : '') ||
    (typeof options.city === 'string' ? options.city.trim() : '') ||
    (typeof options.regionKeyword === 'string' ? options.regionKeyword.trim() : '');

  try {
    const poiData = await requestAmap('/v3/place/text', {
      keywords: addressText,
      city: cityConstraint || undefined,
      citylimit: cityConstraint ? true : undefined,
      offset: 1,
      page: 1,
      extensions: 'base',
    });
    const firstPoi = ensureArray(poiData?.pois)?.[0];
    const poiLocation = parseLocationText(firstPoi?.location);
    if (poiLocation) {
      return poiLocation;
    }
  } catch (error) {
    // ignore and fallback to geocode
  }

  const data = await requestAmap('/v3/geocode/geo', {
    address: addressText,
    city: cityConstraint || undefined,
    citylimit: cityConstraint ? true : undefined,
  });

  const geocode = data?.geocodes?.[0];
  const geocodeLocation = parseLocationText(geocode?.location);
  if (geocodeLocation) {
    return geocodeLocation;
  }

  return null;
};

export const geocodeAddressByJsApi = async (AMap, addressText, options = {}) => {
  if (!AMap || typeof AMap.Geocoder !== 'function' || !addressText || typeof addressText !== 'string') {
    return null;
  }

  const cityText =
    (typeof options.city === 'string' ? options.city.trim() : '') ||
    (typeof options.regionKeyword === 'string' ? options.regionKeyword.trim() : '');

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder({
      city: cityText || undefined,
      citylimit: cityText ? true : undefined,
    });

    geocoder.getLocation(addressText, (status, result) => {
      if (status !== 'complete') {
        resolve(null);
        return;
      }

      const geocodes = ensureArray(result?.geocodes);
      const location = geocodes[0]?.location;
      const longitude = Number(location?.lng);
      const latitude = Number(location?.lat);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        resolve(null);
        return;
      }
      resolve({ longitude, latitude });
    });
  });
};

export const reverseGeocodeCoordinates = async (coordinates) => {
  if (!coordinates) {
    return null;
  }

  const longitude = Number(coordinates.longitude);
  const latitude = Number(coordinates.latitude);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  const data = await requestAmap('/v3/geocode/regeo', {
    location: `${longitude},${latitude}`,
    extensions: 'all',
  });

  const regeocode = data?.regeocode;
  const component = regeocode?.addressComponent || {};
  const streetNumber = component?.streetNumber || {};
  const formattedAddress = regeocode?.formatted_address || '';
  const detail =
    [streetNumber.street, streetNumber.number].filter(Boolean).join('') ||
    regeocode?.pois?.[0]?.name ||
    formattedAddress;

  return {
    country: component.country || '中国',
    province: component.province || '',
    city:
      (Array.isArray(component.city) ? component.city[0] : component.city) ||
      component.province ||
      '',
    district: component.district || '',
    detail: detail || '',
    formattedAddress,
    longitude,
    latitude,
  };
};

export const reverseGeocodeCoordinatesByJsApi = async (AMap, coordinates) => {
  if (!AMap || typeof AMap.Geocoder !== 'function' || !coordinates) {
    return null;
  }

  const longitude = Number(coordinates.longitude);
  const latitude = Number(coordinates.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder();
    geocoder.getAddress([longitude, latitude], (status, result) => {
      if (status !== 'complete') {
        resolve(null);
        return;
      }

      const regeocode = result?.regeocode;
      const component = regeocode?.addressComponent || {};
      const streetNumber = component?.streetNumber || {};
      const formattedAddress = regeocode?.formattedAddress || '';
      const detail =
        [streetNumber.street, streetNumber.number].filter(Boolean).join('') ||
        ensureArray(regeocode?.pois)?.[0]?.name ||
        formattedAddress;

      resolve({
        country: component.country || '中国',
        province: component.province || '',
        city:
          (Array.isArray(component.city) ? component.city[0] : component.city) ||
          component.province ||
          '',
        district: component.district || '',
        detail: detail || '',
        formattedAddress,
        longitude,
        latitude,
      });
    });
  });
};

const resolveIpCenterByWebService = async () => {
  try {
    const ipData = await requestAmap('/v3/ip');
    const cityText = Array.isArray(ipData?.city) ? ipData.city[0] : ipData?.city;
    const provinceText = Array.isArray(ipData?.province) ? ipData.province[0] : ipData?.province;
    const adcodeText = Array.isArray(ipData?.adcode) ? ipData.adcode[0] : ipData?.adcode;
    const ipKeyword = adcodeText || cityText || provinceText || '';
    if (!ipKeyword) {
      return null;
    }

    let center = null;
    const rectangleText = typeof ipData?.rectangle === 'string' ? ipData.rectangle : '';
    if (rectangleText.includes(';')) {
      const [leftBottom, rightTop] = rectangleText.split(';');
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
      center = await getDistrictCenterByKeyword(ipKeyword);
    }
    if (!center || !Number.isFinite(center.longitude) || !Number.isFinite(center.latitude)) {
      return null;
    }

    return {
      longitude: center.longitude,
      latitude: center.latitude,
      city: cityText || '',
      province: provinceText || '',
      adcode: adcodeText || '',
      isFallback: false,
    };
  } catch (error) {
    return null;
  }
};

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

      const position = result?.position;
      const longitude = Number(position?.lng);
      const latitude = Number(position?.lat);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        resolve(null);
        return;
      }

      const component = result?.addressComponent || {};
      resolve({
        longitude,
        latitude,
        city: component.city || component.province || '',
        province: component.province || '',
        district: component.district || '',
        isFallback: false,
      });
    });
  });
};

// ====================== 修复 1：自动 IP 定位（初始化调用）======================
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
    return {
      ...DEFAULT_CENTER,
      city: '',
      province: '',
      isFallback: true,
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const citySearch = new AMap.CitySearch();
    citySearch.getLocalCity(async (status, result) => {
      if (status === 'complete' && result?.bounds) {
        const bounds = result.bounds;
        const ne = bounds.getNorthEast?.();
        const sw = bounds.getSouthWest?.();
        if (ne && sw) {
          finish({
            longitude: (ne.lng + sw.lng) / 2,
            latitude: (ne.lat + sw.lat) / 2,
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
          // ignore and fallback to default center
        }
      }

      const finalWebIpCenter = await resolveIpCenterByWebService();
      if (finalWebIpCenter) {
        finish(finalWebIpCenter);
        return;
      }

      finish({
        ...DEFAULT_CENTER,
        city: result?.city || '',
        province: result?.province || '',
        isFallback: true,
      });
    });
  });
};

// ====================== 修复 2：省市区联动更新地图 ======================
export const syncAddressToMap = async (address) => {
  if (!address || address.isManualLocation) return null;

  const { province, city, district } = address;
  const keyword = [province, city, district].filter(Boolean).join('');
  if (!keyword) return null;

  return getDistrictCenterByKeyword(keyword);
};

export const formatAddressText = (address) => {
  if (!address || typeof address !== 'object') return '';
  return [address.country, address.province, address.city, address.district, address.detail]
    .filter(Boolean).join('');
};

// ====================== 修复 3/4：统一地图渲染（预览+弹窗共用，支持拖动）======================
export const getStaticMapUrl = (coordinates, options = {}) => {
  if (!amapWebKey || !coordinates) return '';
  const lng = Number(coordinates.longitude);
  const lat = Number(coordinates.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return '';

  const sp = buildSearchParams({
    location: `${lng},${lat}`,
    zoom: options.zoom || 15,
    size: options.size || '1000*520',
    key: amapWebKey,
  });
  return `https://restapi.amap.com/v3/staticmap?${sp.toString()}`;
};

export const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

export const isAmapRecoverableError = (error) => MAP_ERROR_PATTERNS.test(error?.message || '');

const extractCoordinates = (payload) => {
  const source = payload?.lnglat || payload?.lngLat || payload;
  if (!source) {
    return null;
  }

  const longitude = Number(
    typeof source.getLng === 'function' ? source.getLng() : source.lng
  );
  const latitude = Number(
    typeof source.getLat === 'function' ? source.getLat() : source.lat
  );
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  return { longitude, latitude };
};

// ====================== 核心地图渲染（已修复同步 + 可编辑）======================
export const renderMapInstance = (AMap, container, coordinates, refs, onPointSelect) => {
  if (!AMap || !container || !refs?.mapRef || !refs?.markerRef) return;

  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs;
  const lng = Number(coordinates?.longitude);
  const lat = Number(coordinates?.latitude);
  const hasPos = Number.isFinite(lng) && Number.isFinite(lat);
  const center = hasPos ? [lng, lat] : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  if (!mapRef.current) {
    mapRef.current = new AMap.Map(container, {
      resizeEnable: true,
      viewMode: '2D',
      zoom: hasPos ? 15 : 11,
      center,
    });

    if (AMap.TileLayer) {
      try { mapRef.current.add(new AMap.TileLayer()) } catch {}
    }
    if (AMap.Scale) mapRef.current.addControl(new AMap.Scale());
    if (AMap.ToolBar) mapRef.current.addControl(new AMap.ToolBar());
  } else {
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(hasPos ? 15 : 11);
  }

  if (!clickHandlerRef.current) {
    clickHandlerRef.current = (e) => {
      const point = extractCoordinates(e);
      if (point) {
        onPointSelect?.(point);
      }
    };
    mapRef.current.on('click', clickHandlerRef.current);
  }

  if (!hasPos) {
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
    markerRef.current = new AMap.Marker({ position: center, draggable: true });
    mapRef.current.add(markerRef.current);
  } else {
    markerRef.current.setPosition(center);
  }

  if (!dragHandlerRef.current) {
    dragHandlerRef.current = (e) => {
      const point = extractCoordinates(e) || extractCoordinates(e?.target?.getPosition?.());
      if (point) {
        onPointSelect?.(point);
      }
    };
    markerRef.current.on('dragend', dragHandlerRef.current);
  }
};

export const destroyMapInstance = (refs) => {
  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs || {};
  if (markerRef?.current && dragHandlerRef?.current) {
    markerRef.current.off('dragend', dragHandlerRef.current);
  }
  if (mapRef?.current && clickHandlerRef?.current) {
    mapRef.current.off('click', clickHandlerRef.current);
  }
  mapRef?.current?.destroy();
  mapRef && (mapRef.current = null);
  markerRef && (markerRef.current = null);
  clickHandlerRef && (clickHandlerRef.current = null);
  dragHandlerRef && (dragHandlerRef.current = null);
};
