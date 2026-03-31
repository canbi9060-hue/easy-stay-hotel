import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Spin,
  Tag,
  message,
} from 'antd';
import { ClockCircleFilled, EnvironmentOutlined } from '@ant-design/icons';
import {
  getMerchantHotelProfileAPI,
  submitMerchantHotelProfileReviewAPI,
  updateMerchantHotelProfileAPI,
} from '../../../utils/request';
import {
  accommodationTypeOptions,
  amapJsKey,
  amapWebKey,
  countryOptions,
  destroyMapInstance,
  emptyHotelProfile,
  fetchDistrictOptions,
  formatAddressText,
  geocodeAddress,
  geocodeAddressByJsApi,
  getDistrictCenterByKeyword,
  getDistrictMetaByKeyword,
  isAmapRecoverableError,
  loadAmapScript,
  locateByIP,
  normalizeHotelProfile,
  renderMapInstance,
  reverseGeocodeCoordinates,
  reverseGeocodeCoordinatesByJsApi,
  reviewStatusMap,
  retryAmapWithLegacyVersion,
  starLevelOptions,
} from '../../../utils/hotelInfo';
import { validateEmail, validatePhone } from '../../../utils/validateRules';
import './index.scss';

const getErrorMessage = (error, fallback) => error?.errorMsg || error?.message || fallback;
const addressDraftStorageKey = 'merchant_hotel_address_draft';
const defaultCenterCoordinates = { longitude: 116.397428, latitude: 39.90923 };
const isDefaultCenterCoordinates = (coordinates) => {
  if (!coordinates) return false;
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return (
    Math.abs(latitude - defaultCenterCoordinates.latitude) < 0.000001 &&
    Math.abs(longitude - defaultCenterCoordinates.longitude) < 0.000001
  );
};
const getValidCoordinates = (address) => {
  const latitude = Number(address?.latitude);
  const longitude = Number(address?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
};
const getDeepestRegionKeyword = (address) => address?.district || address?.city || address?.province || '';
const hasAddressTextInput = (address) => {
  const detail = typeof address?.detail === 'string' ? address.detail.trim() : '';
  return Boolean(getDeepestRegionKeyword(address) || detail);
};
const hasAddressInput = (address) => {
  const detail = typeof address?.detail === 'string' ? address.detail.trim() : '';
  const coordinates = getValidCoordinates(address);
  const hasMeaningfulCoordinates = coordinates && !isDefaultCenterCoordinates(coordinates);
  return Boolean(getDeepestRegionKeyword(address) || detail || hasMeaningfulCoordinates);
};
const getOptionCoordinates = (options, value) => {
  if (!Array.isArray(options) || !value) {
    return null;
  }
  const matched = options.find((item) => item?.value === value);
  const latitude = Number(matched?.center?.latitude);
  const longitude = Number(matched?.center?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
};

export default function HotelInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(emptyHotelProfile.reviewStatus);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapRetrying, setMapRetrying] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapLoadError, setMapLoadError] = useState('');
  const [addressLocateError, setAddressLocateError] = useState('');
  const [pointPickError, setPointPickError] = useState('');
  const [mapStatusText, setMapStatusText] = useState('');
  const [initialCoordinates, setInitialCoordinates] = useState(null);

  const previewMapContainerRef = useRef(null);
  const previewMapRef = useRef(null);
  const previewMarkerRef = useRef(null);
  const previewClickHandlerRef = useRef(null);
  const previewDragHandlerRef = useRef(null);
  const modalMapContainerRef = useRef(null);
  const modalMapRef = useRef(null);
  const modalMarkerRef = useRef(null);
  const modalClickHandlerRef = useRef(null);
  const modalDragHandlerRef = useRef(null);
  const updateSourceRef = useRef('idle');
  const ipLocateTriedRef = useRef(false);
  const geocodeRequestIdRef = useRef(0);
  const districtCenterRequestIdRef = useRef(0);
  const locateTaskIdRef = useRef(0);
  const pointPickRequestIdRef = useRef(0);
  const draftRestoredRef = useRef(false);
  const hasManualSelectionRef = useRef(false);

  const previewBindings = useMemo(
    () => ({ mapRef: previewMapRef, markerRef: previewMarkerRef, clickHandlerRef: previewClickHandlerRef, dragHandlerRef: previewDragHandlerRef }),
    []
  );
  const modalBindings = useMemo(
    () => ({ mapRef: modalMapRef, markerRef: modalMarkerRef, clickHandlerRef: modalClickHandlerRef, dragHandlerRef: modalDragHandlerRef }),
    []
  );

  const addressValue = Form.useWatch(['address'], form) || emptyHotelProfile.address;
  const isOpen24Hours = Form.useWatch(['operationRules', 'isOpen24Hours'], form);
  const provinceValue = Form.useWatch(['address', 'province'], form);
  const cityValue = Form.useWatch(['address', 'city'], form);
  const districtValue = Form.useWatch(['address', 'district'], form);
  const detailValue = Form.useWatch(['address', 'detail'], form);
  const reviewStatusMeta = reviewStatusMap[reviewStatus] || reviewStatusMap.pending;

  const addressTextInput = useMemo(() => hasAddressTextInput(addressValue), [addressValue]);
  const currentCoordinates = useMemo(() => {
    const coordinates = getValidCoordinates(addressValue);
    if (!coordinates) return null;
    if (!addressTextInput && !hasManualSelectionRef.current) {
      return null;
    }
    if (isDefaultCenterCoordinates(coordinates) && !addressTextInput && !hasManualSelectionRef.current) {
      return null;
    }
    return coordinates;
  }, [addressTextInput, addressValue]);
  const displayCoordinates = currentCoordinates || initialCoordinates;

  const saveAddressDraftToSession = useCallback((address, { silent = true, mode = 'manual' } = {}) => {
    try {
      const coordinates = getValidCoordinates(address);
      const detail = typeof address?.detail === 'string' ? address.detail.trim() : '';
      const regionKeyword = getDeepestRegionKeyword(address);
      const hasMeaningfulCoordinates = coordinates && !isDefaultCenterCoordinates(coordinates);

      if (mode === 'manual' && !regionKeyword && !detail && !hasMeaningfulCoordinates) {
        if (!silent) {
          message.warning('请先选择有效定位后再暂存。');
        }
        return false;
      }

      const payload = {
        mode,
        savedAt: Date.now(),
        address: {
          country: address?.country || emptyHotelProfile.address.country,
          province: address?.province || '',
          city: address?.city || '',
          district: address?.district || '',
          detail: address?.detail || '',
          latitude: hasMeaningfulCoordinates ? coordinates?.latitude : null,
          longitude: hasMeaningfulCoordinates ? coordinates?.longitude : null,
        },
      };
      window.sessionStorage.setItem(addressDraftStorageKey, JSON.stringify(payload));
      if (!silent) {
        message.success('已暂存当前定位，稍后可继续编辑。');
      }
      return true;
    } catch (error) {
      if (!silent) {
        message.warning('暂存定位失败，请稍后重试。');
      }
      return false;
    }
  }, []);

  const refreshRegionOptions = useCallback(async (address) => {
    try {
      if (address?.province) setCityOptions(await fetchDistrictOptions(address.province));
      else setCityOptions([]);
    } catch (error) {
      setCityOptions([]);
    }
    try {
      if (address?.city) setDistrictOptions(await fetchDistrictOptions(address.city));
      else setDistrictOptions([]);
    } catch (error) {
      setDistrictOptions([]);
    }
  }, []);

  const restoreAddressDraftFromSession = useCallback(async () => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const rawDraft = window.sessionStorage.getItem(addressDraftStorageKey);
      if (!rawDraft) return;
      const parsedDraft = JSON.parse(rawDraft);
      if (parsedDraft?.mode !== 'manual') {
        window.sessionStorage.removeItem(addressDraftStorageKey);
        return;
      }
      const draftAddress = parsedDraft?.address;
      if (!draftAddress || typeof draftAddress !== 'object') return;

      const currentAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
      const draftCoordinates = getValidCoordinates(draftAddress);
      const draftDetailText = typeof draftAddress?.detail === 'string' ? draftAddress.detail.trim() : '';
      const draftHasAddressIntent = Boolean(getDeepestRegionKeyword(draftAddress) || draftDetailText);
      const draftHasMeaningfulCoordinates =
        Boolean(draftCoordinates) &&
        (!isDefaultCenterCoordinates(draftCoordinates) || draftHasAddressIntent);
      if (!draftHasAddressIntent && !draftHasMeaningfulCoordinates) {
        window.sessionStorage.removeItem(addressDraftStorageKey);
        return;
      }

      const mergedAddress = {
        ...currentAddress,
        country: draftAddress.country || currentAddress.country || emptyHotelProfile.address.country,
        province: draftAddress.province || currentAddress.province,
        city: draftAddress.city || currentAddress.city,
        district: draftAddress.district || currentAddress.district,
        detail: draftAddress.detail || currentAddress.detail,
        latitude: draftHasMeaningfulCoordinates ? draftCoordinates.latitude : currentAddress.latitude,
        longitude: draftHasMeaningfulCoordinates ? draftCoordinates.longitude : currentAddress.longitude,
      };
      hasManualSelectionRef.current = draftHasMeaningfulCoordinates;

      await refreshRegionOptions(mergedAddress);
      form.setFieldsValue({ address: mergedAddress });
    } catch (error) {
      // ignore invalid local draft data
    }
  }, [form, refreshRegionOptions]);

  const triggerAddressLocate = useCallback(async ({ source = 'auto', address } = {}) => {
    if (!mapReady) return null;

    const targetAddress = address || form.getFieldValue(['address']) || emptyHotelProfile.address;
    const detailText = typeof targetAddress?.detail === 'string' ? targetAddress.detail.trim() : '';
    const cityConstraint = targetAddress?.city || targetAddress?.province || '';
    const regionKeyword = [targetAddress?.province, targetAddress?.city, targetAddress?.district].filter(Boolean).join('');
    const deepestRegionKeyword = targetAddress?.district || targetAddress?.city || targetAddress?.province || '';
    let regionMetaPromise = null;
    const resolveRegionMeta = async () => {
      if (regionMetaPromise !== null) {
        return regionMetaPromise;
      }
      const targetKeyword = regionKeyword || deepestRegionKeyword;
      if (!targetKeyword) {
        regionMetaPromise = Promise.resolve(null);
        return regionMetaPromise;
      }
      regionMetaPromise = getDistrictMetaByKeyword(targetKeyword).catch(() => null);
      return regionMetaPromise;
    };
    const locateRegionCenter = async () => {
      const regionMeta = await resolveRegionMeta();
      if (Number.isFinite(regionMeta?.longitude) && Number.isFinite(regionMeta?.latitude)) {
        return {
          longitude: regionMeta.longitude,
          latitude: regionMeta.latitude,
          adcode: regionMeta.adcode || '',
          name: regionMeta.name || regionKeyword || deepestRegionKeyword,
        };
      }

      const targetKeyword = regionKeyword || deepestRegionKeyword;
      if (!targetKeyword) return null;
      let center = null;
      try {
        center = await getDistrictCenterByKeyword(targetKeyword);
      } catch (error) {
        center = null;
      }
      if (!center && window.AMap) {
        center = await geocodeAddressByJsApi(window.AMap, targetKeyword, { city: cityConstraint });
      }
      return center;
    };

    if (!detailText && !regionKeyword && !deepestRegionKeyword) {
      if (source === 'manual') message.warning('请先填写省市区或详细地址。');
      return null;
    }

    const locateTaskId = ++locateTaskIdRef.current;
    setAddressLocateError('');
    setMapStatusText(detailText ? '正在根据详细地址定位...' : '正在定位到行政区中心...');

    try {
      if (detailText) {
        const requestId = ++geocodeRequestIdRef.current;
        districtCenterRequestIdRef.current += 1;
        let geocode = null;
        const regionMeta = await resolveRegionMeta();
        try {
          geocode = await geocodeAddress(formatAddressText({ ...targetAddress, detail: detailText }), {
            city: cityConstraint,
            adcode: regionMeta?.adcode || '',
            regionKeyword,
          });
        } catch (error) {
          geocode = null;
        }
        if (!geocode && window.AMap) {
          geocode = await geocodeAddressByJsApi(window.AMap, formatAddressText({ ...targetAddress, detail: detailText }), {
            city: cityConstraint,
          });
        }
        if (!geocode) {
          geocode = await locateRegionCenter();
        }
        if (locateTaskId !== locateTaskIdRef.current || requestId !== geocodeRequestIdRef.current) return null;
        if (!geocode) throw new Error('未能定位当前详细地址。');
        const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
        const nextCoordinates = { latitude: geocode.latitude, longitude: geocode.longitude };
        form.setFieldsValue({ address: { ...latestAddress, ...nextCoordinates } });
        setInitialCoordinates(nextCoordinates);
        return geocode;
      }

      const centerRequestId = ++districtCenterRequestIdRef.current;
      geocodeRequestIdRef.current += 1;
      const center = await locateRegionCenter();
      if (locateTaskId !== locateTaskIdRef.current || centerRequestId !== districtCenterRequestIdRef.current) return null;
      if (!center) throw new Error('未能定位当前行政区。');
      const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
      const nextCoordinates = { latitude: center.latitude, longitude: center.longitude };
      form.setFieldsValue({ address: { ...latestAddress, ...nextCoordinates } });
      setInitialCoordinates(nextCoordinates);
      return center;
    } catch (error) {
      if (locateTaskId === locateTaskIdRef.current) {
        setAddressLocateError(getErrorMessage(error, '定位失败，请检查地址信息。'));
      }
      return null;
    } finally {
      if (locateTaskId === locateTaskIdRef.current) window.setTimeout(() => setMapStatusText(''), 1200);
    }
  }, [form, mapReady]);

  const applyPointSelection = useCallback(async (coordinates) => {
    hasManualSelectionRef.current = true;
    const requestId = ++pointPickRequestIdRef.current;
    setPointPickError('');
    setAddressLocateError('');
    locateTaskIdRef.current += 1;
    geocodeRequestIdRef.current += 1;
    districtCenterRequestIdRef.current += 1;
    setMapStatusText('正在解析地图选点...');

    const baseAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
    setInitialCoordinates(coordinates);
    form.setFieldsValue({
      address: {
        ...baseAddress,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });

    try {
      let nextAddressInfo = null;
      if (amapWebKey) {
        nextAddressInfo = await reverseGeocodeCoordinates(coordinates);
      }
      if (!nextAddressInfo && window.AMap) {
        nextAddressInfo = await reverseGeocodeCoordinatesByJsApi(window.AMap, coordinates);
      }
      if (requestId !== pointPickRequestIdRef.current) return;
      if (!nextAddressInfo) {
        throw new Error('未能解析当前选点地址。');
      }

      const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
      const nextAddress = {
        ...latestAddress,
        country: nextAddressInfo.country || latestAddress.country || emptyHotelProfile.address.country,
        province: nextAddressInfo.province || latestAddress.province,
        city: nextAddressInfo.city || latestAddress.city,
        district: nextAddressInfo.district || latestAddress.district,
        detail: nextAddressInfo.detail || latestAddress.detail,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      updateSourceRef.current = 'map';
      await refreshRegionOptions(nextAddress);
      form.setFieldsValue({ address: nextAddress });
    } catch (error) {
      if (requestId === pointPickRequestIdRef.current) {
        const rawMessage = getErrorMessage(error, '根据地图选点回填地址失败。');
        if (/CUQPS_HAS_EXCEEDED_THE_LIMIT/i.test(rawMessage)) {
          setPointPickError('逆地理编码配额已超限，已更新坐标，请手动修改地址或稍后再试。');
        } else {
          setPointPickError(rawMessage);
        }
      }
    } finally {
      if (requestId === pointPickRequestIdRef.current) window.setTimeout(() => setMapStatusText(''), 1200);
    }
  }, [form, refreshRegionOptions]);

  const normalizeAndApplyProfile = useCallback(async (profileData) => {
    const profile = normalizeHotelProfile(profileData);
    form.setFieldsValue(profile);
    setReviewStatus(profile.reviewStatus || emptyHotelProfile.reviewStatus);
    await refreshRegionOptions(profile.address);
  }, [form, refreshRegionOptions]);

  const resetMapObjects = useCallback(() => {
    destroyMapInstance(previewBindings);
    destroyMapInstance(modalBindings);
  }, [modalBindings, previewBindings]);

  const fallbackToLegacyMap = useCallback(async () => {
    if (mapRetrying || !amapJsKey) return;
    try {
      setMapRetrying(true);
      resetMapObjects();
      await retryAmapWithLegacyVersion(amapJsKey);
      setMapReady(true);
      setMapLoadError('');
    } catch (error) {
      setMapLoadError(getErrorMessage(error, '地图加载失败。'));
      setMapReady(false);
    } finally {
      setMapRetrying(false);
    }
  }, [mapRetrying, resetMapObjects]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await normalizeAndApplyProfile((await getMerchantHotelProfileAPI())?.data);
      } catch (error) {
        form.setFieldsValue(emptyHotelProfile);
        setReviewStatus(emptyHotelProfile.reviewStatus);
        message.error(getErrorMessage(error, '获取酒店资料失败。'));
      } finally {
        setLoading(false);
      }
    })();
  }, [form, normalizeAndApplyProfile]);

  useEffect(() => {
    if (loading) return;
    restoreAddressDraftFromSession();
  }, [loading, restoreAddressDraftFromSession]);

  useEffect(() => {
    (async () => {
      try {
        setRegionLoading(true);
        setProvinceOptions(await fetchDistrictOptions(emptyHotelProfile.address.country));
      } catch (error) {
        message.warning(getErrorMessage(error, '加载省份选项失败。'));
      } finally {
        setRegionLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!amapJsKey) {
      setMapLoadError('缺少高德地图 JS Key。');
      setMapReady(false);
      return;
    }
    loadAmapScript(amapJsKey)
      .then(() => {
        setMapReady(true);
        setMapLoadError('');
      })
      .catch((error) => {
        setMapLoadError(getErrorMessage(error, '地图加载失败。'));
        setMapReady(false);
      });
  }, []);

  const hasUsableUserLocation = useMemo(
    () => Boolean(currentCoordinates && (addressTextInput || hasManualSelectionRef.current)),
    [addressTextInput, currentCoordinates]
  );

  useEffect(() => {
    if (loading || hasUsableUserLocation || !mapReady || ipLocateTriedRef.current || !window.AMap) return;
    ipLocateTriedRef.current = true;

    locateByIP(window.AMap)
      .then(async (location) => {
        const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
        const hasTextInput = hasAddressTextInput(latestAddress);
        if (hasTextInput || hasManualSelectionRef.current) {
          return;
        }

        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
        if (!hasValidCoordinates) {
          setInitialCoordinates(null);
          setMapStatusText('未获取到有效 IP 位置，请补充地址后定位。');
          return;
        }

        const ipCoordinates = { latitude: location.latitude, longitude: location.longitude };
        if (location?.isFallback) {
          setMapStatusText('未获取到有效 IP 位置，地图暂时显示默认中心。');
          setInitialCoordinates(null);
        } else {
          setMapStatusText('正在根据 IP 定位...');
          setInitialCoordinates(ipCoordinates);
        }

        if (location?.isFallback) {
          return;
        }

        const addressPatch = {};
        if (!latestAddress.country) {
          addressPatch.country = emptyHotelProfile.address.country;
        }
        if (!latestAddress.province && location?.province) {
          addressPatch.province = location.province;
        }
        if (!latestAddress.city && location?.city) {
          addressPatch.city = location.city;
        }

        try {
          let reverseAddress = null;
          if (amapWebKey) {
            reverseAddress = await reverseGeocodeCoordinates(ipCoordinates);
          }
          if (!reverseAddress && window.AMap) {
            reverseAddress = await reverseGeocodeCoordinatesByJsApi(window.AMap, ipCoordinates);
          }

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
          // ignore ip reverse geocode error
        }

        const nextAddress = {
          ...latestAddress,
          ...addressPatch,
          latitude: ipCoordinates.latitude,
          longitude: ipCoordinates.longitude,
        };

        if (Object.keys(addressPatch).length) {
          await refreshRegionOptions(nextAddress);
        }
        form.setFieldsValue({ address: nextAddress });
      })
      .finally(() => {
        window.setTimeout(() => setMapStatusText(''), 1200);
      });
  }, [form, hasUsableUserLocation, loading, mapReady, refreshRegionOptions]);

  useEffect(() => {
    if (!mapReady || !window.AMap || !previewMapContainerRef.current || mapLoadError) return;
    try {
      renderMapInstance(window.AMap, previewMapContainerRef.current, displayCoordinates, previewBindings, applyPointSelection);
    } catch (error) {
      if (isAmapRecoverableError(error)) fallbackToLegacyMap();
      else setMapLoadError(getErrorMessage(error, '地图预览渲染失败。'));
    }
  }, [applyPointSelection, displayCoordinates, fallbackToLegacyMap, mapLoadError, mapReady, previewBindings]);

  useEffect(() => {
    if (!mapModalOpen || !mapReady || !window.AMap || !modalMapContainerRef.current || mapLoadError) return;
    const timer = window.setTimeout(() => {
      try {
        renderMapInstance(window.AMap, modalMapContainerRef.current, displayCoordinates, modalBindings, applyPointSelection);
        modalMapRef.current?.resize?.();
        if (displayCoordinates) {
          modalMapRef.current?.setCenter?.([displayCoordinates.longitude, displayCoordinates.latitude]);
        }
      } catch (error) {
        if (isAmapRecoverableError(error)) fallbackToLegacyMap();
        else setMapLoadError(getErrorMessage(error, '地图弹窗渲染失败。'));
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [applyPointSelection, displayCoordinates, fallbackToLegacyMap, mapLoadError, mapModalOpen, mapReady, modalBindings]);

  const syncMapByCoordinates = useCallback((bindings, coordinates) => {
    if (!bindings || !coordinates) return;
    const map = bindings.mapRef?.current;
    const marker = bindings.markerRef?.current;
    if (!map || !marker) return;
    const center = [coordinates.longitude, coordinates.latitude];
    marker.setPosition?.(center);
    map.setCenter?.(center);
  }, []);

  useEffect(() => {
    if (!displayCoordinates) return;
    syncMapByCoordinates(previewBindings, displayCoordinates);
    syncMapByCoordinates(modalBindings, displayCoordinates);
  }, [displayCoordinates, modalBindings, previewBindings, syncMapByCoordinates]);

  useEffect(() => {
    geocodeRequestIdRef.current += 1;
    districtCenterRequestIdRef.current += 1;
    locateTaskIdRef.current += 1;
  }, [provinceValue, cityValue, districtValue, detailValue]);

  useEffect(() => {
    const detailText = typeof detailValue === 'string' ? detailValue.trim() : '';
    const regionKeyword = districtValue || cityValue || provinceValue || '';
    if (!mapReady || (!detailText && !regionKeyword)) return;
    if (updateSourceRef.current === 'map') {
      updateSourceRef.current = 'idle';
      return;
    }
    const timer = window.setTimeout(() => {
      triggerAddressLocate({ source: 'auto' });
    }, detailText ? 350 : 250);
    return () => window.clearTimeout(timer);
  }, [provinceValue, cityValue, districtValue, detailValue, mapReady, triggerAddressLocate]);

  useEffect(() => () => resetMapObjects(), [resetMapObjects]);

  const updateAddressField = (patch) => {
    const nextAddress = { ...addressValue, ...patch };
    form.setFieldsValue({ address: nextAddress });
    return nextAddress;
  };
  const handleProvinceChange = async (value) => {
    hasManualSelectionRef.current = false;
    const nextAddress = updateAddressField({ province: value, city: '', district: '', latitude: null, longitude: null });
    setAddressLocateError('');
    setPointPickError('');
    const optionCoordinates = getOptionCoordinates(provinceOptions, value);
    if (optionCoordinates) {
      form.setFieldsValue({ address: { ...nextAddress, ...optionCoordinates } });
      setInitialCoordinates(optionCoordinates);
    }
    try {
      setCityOptions(value ? await fetchDistrictOptions(value) : []);
    } catch (error) {
      setCityOptions([]);
    }
    setDistrictOptions([]);
    if (mapReady) {
      triggerAddressLocate({ source: 'auto', address: nextAddress });
    }
  };

  const handleCityChange = async (value) => {
    hasManualSelectionRef.current = false;
    const nextAddress = updateAddressField({ city: value, district: '', latitude: null, longitude: null });
    setAddressLocateError('');
    setPointPickError('');
    const optionCoordinates = getOptionCoordinates(cityOptions, value);
    if (optionCoordinates) {
      form.setFieldsValue({ address: { ...nextAddress, ...optionCoordinates } });
      setInitialCoordinates(optionCoordinates);
    }
    try {
      setDistrictOptions(value ? await fetchDistrictOptions(value) : []);
    } catch (error) {
      setDistrictOptions([]);
    }
    if (mapReady) {
      triggerAddressLocate({ source: 'auto', address: nextAddress });
    }
  };

  const handleDistrictChange = (value) => {
    hasManualSelectionRef.current = false;
    const nextAddress = updateAddressField({ district: value, latitude: null, longitude: null });
    const optionCoordinates = getOptionCoordinates(districtOptions, value);
    if (optionCoordinates) {
      form.setFieldsValue({ address: { ...nextAddress, ...optionCoordinates } });
      setInitialCoordinates(optionCoordinates);
    }
    if (mapReady) {
      triggerAddressLocate({ source: 'auto', address: nextAddress });
    }
  };

  const handleDetailInputChange = () => {
    hasManualSelectionRef.current = false;
  };
  const handleOpen24HoursChange = (event) => {
    const checked = Boolean(event?.target?.checked);
    const latestRules = form.getFieldValue(['operationRules']) || emptyHotelProfile.operationRules;
    form.setFieldsValue({
      operationRules: {
        ...latestRules,
        isOpen24Hours: checked,
        businessStartTime: checked ? '00:00' : (latestRules.businessStartTime || '09:00'),
        businessEndTime: checked ? '23:59' : (latestRules.businessEndTime || '18:00'),
      },
    });
  };

  const handleManualAddressLocate = async () => {
    if (!hasAddressInput(addressValue)) {
      message.warning('请先填写省市区或详细地址。');
      return;
    }
    await triggerAddressLocate({ source: 'manual', address: addressValue });
  };

  const handleSaveAddressDraft = () => {
    const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
    saveAddressDraftToSession(latestAddress, { silent: false, mode: 'manual' });
  };

  const persistProfile = async (submitReview = false) => {
    const values = normalizeHotelProfile(await form.validateFields());
    const saved = await updateMerchantHotelProfileAPI(values);
    await normalizeAndApplyProfile(saved?.data);
    window.sessionStorage.removeItem(addressDraftStorageKey);
    if (submitReview) {
      const submitted = await submitMerchantHotelProfileReviewAPI();
      await normalizeAndApplyProfile(submitted?.data);
    }
  };

  const renderMapAlerts = () => (
    <>
      {mapLoadError ? <Alert type="warning" showIcon message="地图加载失败" description={mapLoadError} style={{ marginBottom: 12 }} /> : null}
      {!amapWebKey ? <Alert type="info" showIcon message="缺少高德 Web 服务 Key" description="已自动回退到 JSAPI 定位能力，建议补齐 Web Key 以提升稳定性。" style={{ marginBottom: 12 }} /> : null}
      {addressLocateError ? <Alert type="warning" showIcon message="根据地址定位失败" description={addressLocateError} style={{ marginBottom: 12 }} /> : null}
      {pointPickError ? <Alert type="warning" showIcon message="根据地图选点回填地址失败" description={pointPickError} style={{ marginBottom: 12 }} /> : null}
    </>
  );

  if (loading) {
    return <div className="hotel-info__loading"><Spin description="正在加载酒店资料..." /></div>;
  }

  return (
    <div className="page-container hotel-info">
      <div className="hotel-info__header">
        <div>
          <h2 className="hotel-info__title">酒店资料</h2>
          <p className="hotel-info__subtitle">完善酒店资料，便于后续审核与展示。</p>
        </div>
        <Tag color={reviewStatusMeta.color} className="hotel-info__status-tag">{reviewStatusMeta.text}</Tag>
      </div>

      <Form form={form} layout="vertical" initialValues={emptyHotelProfile} className="hotel-info__form">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card className="hotel-info__section-card">
              <Row gutter={[20, 20]}>
                <Col xs={24} md={12}>
                  <Form.Item label="住宿类型" name="accommodationType" className="hotel-info__label-strong">
                    <Radio.Group optionType="button" buttonStyle="solid" className="hotel-info__radio-group">
                      {accommodationTypeOptions.map((option) => (
                        <Radio.Button key={option.value} value={option.value}>{option.label}</Radio.Button>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="星级" name="starLevel" className="hotel-info__label-strong">
                    <Select options={starLevelOptions} placeholder="请选择星级" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item className="hotel-info__label-strong hotel-info__label-no-required-mark" label="酒店名称" name="hotelName" rules={[{ required: true, message: '请输入酒店名称。' }]}>
                    <Input maxLength={100} placeholder="请输入酒店名称" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <div className="hotel-info__section-title">酒店地址</div>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} lg={6}><Form.Item label="国家 / 地区" name={['address', 'country']}><Select options={countryOptions} disabled /></Form.Item></Col>
                    <Col xs={24} sm={12} lg={6}><Form.Item label="省份" name={['address', 'province']} rules={[{ required: true, message: '请选择省份。' }]}><Select options={provinceOptions} placeholder="请选择省份" loading={regionLoading} onChange={handleProvinceChange} /></Form.Item></Col>
                    <Col xs={24} sm={12} lg={6}><Form.Item label="城市" name={['address', 'city']} rules={[{ required: true, message: '请选择城市。' }]}><Select options={cityOptions} placeholder="请选择城市" loading={regionLoading} disabled={!addressValue?.province} onChange={handleCityChange} /></Form.Item></Col>
                    <Col xs={24} sm={12} lg={6}><Form.Item label="区县" name={['address', 'district']} rules={[{ required: true, message: '请选择区县。' }]}><Select options={districtOptions} placeholder="请选择区县" loading={regionLoading} disabled={!addressValue?.city} onChange={handleDistrictChange} /></Form.Item></Col>
                  </Row>
                  <Form.Item name={['address', 'detail']} rules={[{ required: true, message: '请输入详细地址。' }]}>
                    <Input maxLength={200} placeholder="请输入详细地址" prefix={<EnvironmentOutlined />} onChange={handleDetailInputChange} />
                  </Form.Item>

                  {renderMapAlerts()}

                  <div className="hotel-info__map-shell">
                    <div className="hotel-info__map-preview" ref={previewMapContainerRef} />
                    <Button className="hotel-info__map-save" onClick={handleSaveAddressDraft}>暂存定位</Button>
                    <Button className="hotel-info__map-locate" onClick={handleManualAddressLocate}>按输入地址定位</Button>
                    <Button className="hotel-info__map-expand" onClick={() => setMapModalOpen(true)}>展开地图</Button>
                    {mapRetrying || mapStatusText ? <div className="hotel-info__map-loading">{mapRetrying ? '正在切换兼容地图内核...' : mapStatusText}</div> : null}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <div className="hotel-info__aside">
              <Card className="hotel-info__section-card hotel-info__info-card" title="联系方式">
                <Form.Item label="联系电话" name="contactPhone" rules={[{ validator: validatePhone }]}>
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
                <Form.Item label="联系邮箱" name="contactEmail" rules={[{ validator: validateEmail }]}>
                  <Input placeholder="请输入联系邮箱" />
                </Form.Item>
              </Card>

              <Card className="hotel-info__section-card hotel-info__info-card" title={<><ClockCircleFilled />运营规则</>}>
                <div className="hotel-info__rule-header">
                  <span>营业时间</span>
                  <Form.Item name={['operationRules', 'isOpen24Hours']} valuePropName="checked" noStyle>
                    <Checkbox onChange={handleOpen24HoursChange}>24小时</Checkbox>
                  </Form.Item>
                </div>
                <Row gutter={10}>
                  <Col span={12}>
                    <Form.Item name={['operationRules', 'businessStartTime']} noStyle={false}>
                      <Input type="time" disabled={Boolean(isOpen24Hours)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['operationRules', 'businessEndTime']} noStyle={false}>
                      <Input type="time" disabled={Boolean(isOpen24Hours)} />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: '14px 0' }} />

                <div className="hotel-info__rule-item">
                  <span>入住规则</span>
                  <Form.Item name={['operationRules', 'checkInTime']} style={{ marginBottom: 0 }}>
                    <Input type="time" />
                  </Form.Item>
                </div>

                <div className="hotel-info__rule-item">
                  <span>退房规则</span>
                  <Form.Item name={['operationRules', 'checkOutTime']} style={{ marginBottom: 0 }}>
                    <Input type="time" />
                  </Form.Item>
                </div>
              </Card>

            </div>
          </Col>
        </Row>

        <div className="hotel-info__actions">
          <Button onClick={async () => { try { setSaving(true); await persistProfile(false); message.success('酒店资料保存成功。'); } catch (error) { message.error(getErrorMessage(error, '保存酒店资料失败。')); } finally { setSaving(false); } }} loading={saving}>保存</Button>
          <Button type="primary" onClick={async () => { try { setSubmitting(true); await persistProfile(true); message.success('酒店资料已提交审核。'); } catch (error) { message.error(getErrorMessage(error, '提交酒店资料失败。')); } finally { setSubmitting(false); } }} loading={submitting}>提交审核</Button>
        </div>
      </Form>

      <Modal
        open={mapModalOpen}
        width={960}
        title="地图预览"
        footer={null}
        forceRender
        onCancel={() => setMapModalOpen(false)}
        afterOpenChange={(open) => {
          if (!open) destroyMapInstance(modalBindings);
        }}
        destroyOnHidden
      >
        {mapLoadError ? (
          <Alert type="warning" showIcon message="地图加载失败" description={mapLoadError} />
        ) : (
          <div className="hotel-info__map-shell hotel-info__map-shell--modal">
            <div className="hotel-info__map-modal" ref={modalMapContainerRef} />
            <Button className="hotel-info__map-save" onClick={handleSaveAddressDraft}>暂存定位</Button>
            <Button className="hotel-info__map-locate" onClick={handleManualAddressLocate}>按输入地址定位</Button>
            {mapRetrying || mapStatusText ? <div className="hotel-info__map-loading">{mapRetrying ? '正在切换兼容地图内核...' : mapStatusText}</div> : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
