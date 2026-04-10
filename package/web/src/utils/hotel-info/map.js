import AMapLoader from '@amap/amap-jsapi-loader';
import {
  AMAP_VERSIONS,
  DEFAULT_CENTER,
  DEFAULT_COUNTRY,
  MAP_ERROR_PATTERNS,
  ensureArray,
} from './constants';
import { fetchMerchantMapDistrictOptions } from './client';

export const createMapError = (message) =>
  new Error(message || '地图加载失败，请检查高德 Key 配置。');

export const isMapConfigError = (error) =>
  MAP_ERROR_PATTERNS.test(String(error?.message || error?.code || '').trim());

export const getMapDisplayErrorMessage = (
  error,
  fallback = '地图服务异常，请稍后重试。'
) => {
  const rawMessage = String(error?.errorMsg || error?.message || '').trim();
  if (!rawMessage) {
    return fallback;
  }

  if (/USERKEY_PLAT_NOMATCH/i.test(rawMessage)) {
    return '高德地图配置异常：当前 JS Key 与高德控制台绑定的平台或域名不匹配。';
  }

  if (/INVALID_USER_KEY/i.test(rawMessage)) {
    return '高德地图配置异常：当前 JS Key 无效。';
  }

  if (/USERKEY|KEY|SECURITY/i.test(rawMessage)) {
    return `高德地图配置异常：${rawMessage}`;
  }

  return rawMessage || fallback;
};

export const normalizeCoordinates = (coordinates) => {
  const longitude = Number(coordinates?.longitude);
  const latitude = Number(coordinates?.latitude);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { longitude, latitude };
};

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

const normalizeCountryKeyword = (keyword) =>
  keyword === 'China' ? DEFAULT_COUNTRY : keyword;

const uniqueSegments = (parts = []) => parts.reduce((acc, part) => {
  const text = String(part || '').trim();
  if (!text || acc.includes(text)) {
    return acc;
  }

  acc.push(text);
  return acc;
}, []);

const defaultAmapTimeoutMs = 8000;

const createAmapPromise = (
  executor,
  {
    fallbackMessage,
    timeoutMessage = fallbackMessage,
    timeoutMs = defaultAmapTimeoutMs,
  }
) => new Promise((resolve, reject) => {
  let settled = false;
  let timeoutId = null;

  const finish = (handler, value) => {
    if (settled) {
      return;
    }

    settled = true;
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    handler(value);
  };

  timeoutId = window.setTimeout(() => {
    finish(reject, createMapError(timeoutMessage));
  }, timeoutMs);

  try {
    executor(
      (value) => finish(resolve, value),
      (error) => finish(reject, error instanceof Error ? error : createMapError(error?.message || fallbackMessage))
    );
  } catch (error) {
    finish(reject, error instanceof Error ? error : createMapError(fallbackMessage));
  }
});

const createAmapService = (AMap, serviceName, options = {}) => {
  if (!AMap) {
    throw createMapError('地图 SDK 尚未加载完成。');
  }

  if (typeof AMap[serviceName] !== 'function') {
    throw createMapError(`地图能力未加载：${serviceName}`);
  }

  return new AMap[serviceName](options);
};

const buildSuggestionText = (tip) => uniqueSegments([
  tip?.district,
  tip?.address,
  tip?.name,
]).join('');

const mapSuggestionOption = (tip) => {
  const location = extractCoordinates(tip?.location);
  const primaryText = String(tip?.name || tip?.address || '').trim();
  const secondaryText = uniqueSegments([tip?.district, tip?.address]).join(' ');
  const fullAddress = buildSuggestionText(tip);
  const value = primaryText || fullAddress;

  if (!value || !fullAddress) {
    return null;
  }

  return {
    value,
    label: secondaryText ? `${value} ${secondaryText}` : value,
    fullAddress,
    coordinates: location,
  };
};

const mapDistrictOption = (district) => ({
  label: district?.label || district?.name || district?.value || '',
  value: district?.value || district?.name || district?.label || '',
  adcode: district?.adcode || '',
  center: normalizeCoordinates(district?.center),
});

let amapScriptPromise = null;

export const loadAmapScript = async (jsKey) => {
  if (!jsKey) {
    throw createMapError('缺少高德地图 JS Key。');
  }

  if (window.AMap && typeof window.AMap.AutoComplete === 'function') {
    return window.AMap;
  }

  if (!amapScriptPromise) {
    amapScriptPromise = AMapLoader.load({
      key: jsKey,
      version: AMAP_VERSIONS[0],
      plugins: ['AMap.AutoComplete'],
    }).catch((error) => {
      amapScriptPromise = null;
      throw createMapError(error?.message || '地图加载失败。');
    });
  }

  return amapScriptPromise;
};

export const renderMapInstance = (
  AMap,
  container,
  coordinates,
  refs,
  { draggable = true, onMarkerDragEnd } = {}
) => {
  if (!AMap || !container || !refs?.mapRef || !refs?.markerRef) {
    return;
  }

  const { mapRef, markerRef, dragHandlerRef } = refs;
  const activeContainer = mapRef.current?.getContainer?.();
  if (mapRef.current && activeContainer && activeContainer !== container) {
    destroyMapInstance(refs);
  }

  const point = normalizeCoordinates(coordinates);
  const center = point
    ? [point.longitude, point.latitude]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  if (!mapRef.current) {
    mapRef.current = new AMap.Map(container, {
      resizeEnable: true,
      viewMode: '2D',
      zoom: point ? 15 : 11,
      center,
    });
  } else {
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(point ? 15 : 11);
  }

  if (!point) {
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
      draggable,
    });
    mapRef.current.add(markerRef.current);
  } else {
    markerRef.current.setPosition(center);
    markerRef.current.setDraggable?.(draggable);
  }

  if (dragHandlerRef.current) {
    markerRef.current.off('dragend', dragHandlerRef.current);
    dragHandlerRef.current = null;
  }

  if (!draggable) {
    return;
  }

  dragHandlerRef.current = (event) => {
    const nextPoint = extractCoordinates(event) || extractCoordinates(event?.target?.getPosition?.());
    if (nextPoint) {
      onMarkerDragEnd?.(nextPoint);
    }
  };

  markerRef.current.on('dragend', dragHandlerRef.current);
};

export const destroyMapInstance = (refs) => {
  const { mapRef, markerRef, dragHandlerRef } = refs || {};

  if (markerRef?.current && dragHandlerRef?.current) {
    markerRef.current.off('dragend', dragHandlerRef.current);
  }

  mapRef?.current?.destroy?.();

  if (mapRef) {
    mapRef.current = null;
  }
  if (markerRef) {
    markerRef.current = null;
  }
  if (dragHandlerRef) {
    dragHandlerRef.current = null;
  }
};

export const fetchDistrictOptions = async (keyword) => {
  const normalizedKeyword = normalizeCountryKeyword(String(keyword || '').trim());
  if (!normalizedKeyword) {
    return [];
  }

  const options = await fetchMerchantMapDistrictOptions(normalizedKeyword);
  return ensureArray(options)
    .filter((item) => item?.label || item?.value || item?.name)
    .map(mapDistrictOption);
};

export const searchAddressSuggestions = async (AMap, keyword, options = {}) => {
  const normalizedKeyword = String(keyword || '').trim();
  if (!normalizedKeyword) {
    return [];
  }

  return createAmapPromise((resolve, reject) => {
    const city = String(options.city || '').trim();
    const autocomplete = createAmapService(AMap, 'AutoComplete', city ? { city } : {});

    autocomplete.search(normalizedKeyword, (status, result) => {
      if (status !== 'complete') {
        reject(createMapError(result?.info || '地址联想失败。'));
        return;
      }

      const suggestions = ensureArray(result?.tips)
        .map(mapSuggestionOption)
        .filter(Boolean);
      resolve(suggestions);
    });
  }, {
    fallbackMessage: '地址联想失败。',
    timeoutMessage: '地址联想超时。',
  });
};
