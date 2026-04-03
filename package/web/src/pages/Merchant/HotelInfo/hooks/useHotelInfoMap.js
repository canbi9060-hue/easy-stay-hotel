import { Form, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  amapJsKey,
  amapWebKey,
  destroyMapInstance,
  emptyHotelProfile,
  fetchDistrictOptions,
  formatAddressText,
  geocodeAddress,
  getDistrictCenterByKeyword,
  loadAmapScript,
  locateByIP,
  renderMapInstance,
  reverseGeocodeCoordinates,
} from '../../../../utils/hotel-info';

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

export default function useHotelInfoMap({
  form,
  activeTab,
  isReviewing,
  loading,
  getErrorMessage,
}) {
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
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
  const locateRequestIdRef = useRef(0);
  const pointPickRequestIdRef = useRef(0);
  const draftRestoredRef = useRef(false);
  const hasManualSelectionRef = useRef(false);

  const addressValue = Form.useWatch(['address'], form) || emptyHotelProfile.address;
  const detailValue = Form.useWatch(['address', 'detail'], form);

  const previewBindings = useMemo(
    () => ({ mapRef: previewMapRef, markerRef: previewMarkerRef, clickHandlerRef: previewClickHandlerRef, dragHandlerRef: previewDragHandlerRef }),
    []
  );
  const modalBindings = useMemo(
    () => ({ mapRef: modalMapRef, markerRef: modalMarkerRef, clickHandlerRef: modalClickHandlerRef, dragHandlerRef: modalDragHandlerRef }),
    []
  );

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

  const mapUnavailableReason = (!amapJsKey || !amapWebKey)
    ? '地图不可用：请在 .env 中配置 REACT_APP_AMAP_JS_KEY 和 REACT_APP_AMAP_WEB_KEY，并重启应用。'
    : '';

  const syncRegionOptionsFromAddress = useCallback(async (address) => {
    try {
      if (address?.province) setCityOptions(await fetchDistrictOptions(amapWebKey, address.province));
      else setCityOptions([]);
    } catch (error) {
      setCityOptions([]);
    }
    try {
      if (address?.city) setDistrictOptions(await fetchDistrictOptions(amapWebKey, address.city));
      else setDistrictOptions([]);
    } catch (error) {
      setDistrictOptions([]);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
    syncRegionOptionsFromAddress(currentAddress);
  }, [form, loading, syncRegionOptionsFromAddress]);

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

      form.setFieldsValue({ address: mergedAddress });
      syncRegionOptionsFromAddress(mergedAddress);
    } catch (error) {
      // ignore invalid local draft data
    }
  }, [form, syncRegionOptionsFromAddress]);

  useEffect(() => {
    if (loading) return;
    restoreAddressDraftFromSession();
  }, [loading, restoreAddressDraftFromSession]);

  const triggerAddressLocate = useCallback(async ({ address } = {}) => {
    if (!mapReady) return null;

    const targetAddress = address || form.getFieldValue(['address']) || emptyHotelProfile.address;
    const detailText = typeof targetAddress?.detail === 'string' ? targetAddress.detail.trim() : '';
    const regionKeyword = targetAddress?.district || targetAddress?.city || targetAddress?.province || '';

    if (!detailText && !regionKeyword) return null;

    const requestId = ++locateRequestIdRef.current;
    setAddressLocateError('');
    setMapStatusText('正在定位...');

    try {
      const located = detailText
        ? await geocodeAddress(amapWebKey, formatAddressText({ ...targetAddress, detail: detailText }), {
          city: targetAddress?.city || targetAddress?.province || '',
        })
        : await getDistrictCenterByKeyword(amapWebKey, regionKeyword);

      if (requestId !== locateRequestIdRef.current) return null;
      if (!located) throw new Error(detailText ? '详细地址定位失败。' : '所选区域定位失败。');

      const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
      const nextCoordinates = { latitude: located.latitude, longitude: located.longitude };
      form.setFieldsValue({ address: { ...latestAddress, ...nextCoordinates } });
      setInitialCoordinates(nextCoordinates);
      return located;
    } catch (error) {
      if (requestId === locateRequestIdRef.current) {
        setAddressLocateError(getErrorMessage(error, '定位失败，请检查地址信息。'));
      }
      return null;
    } finally {
      if (requestId === locateRequestIdRef.current) window.setTimeout(() => setMapStatusText(''), 800);
    }
  }, [form, getErrorMessage, mapReady]);

  const applyPointSelection = useCallback(async (coordinates) => {
    if (isReviewing) return;
    hasManualSelectionRef.current = true;
    const requestId = ++pointPickRequestIdRef.current;
    setPointPickError('');
    setAddressLocateError('');
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
      const nextAddressInfo = await reverseGeocodeCoordinates(amapWebKey, coordinates);
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
      form.setFieldsValue({ address: nextAddress });
      syncRegionOptionsFromAddress(nextAddress);
    } catch (error) {
      if (requestId === pointPickRequestIdRef.current) {
        setPointPickError(getErrorMessage(error, '根据地图选点回填地址失败。'));
      }
    } finally {
      if (requestId === pointPickRequestIdRef.current) window.setTimeout(() => setMapStatusText(''), 800);
    }
  }, [form, getErrorMessage, isReviewing, syncRegionOptionsFromAddress]);

  const resetMapObjects = useCallback(() => {
    destroyMapInstance(previewBindings);
    destroyMapInstance(modalBindings);
  }, [modalBindings, previewBindings]);

  useEffect(() => {
    if (!amapWebKey) {
      setProvinceOptions([]);
      return;
    }
    (async () => {
      try {
        setRegionLoading(true);
        setProvinceOptions(await fetchDistrictOptions(amapWebKey, emptyHotelProfile.address.country));
      } catch (error) {
        message.warning(getErrorMessage(error, '加载省份选项失败。'));
      } finally {
        setRegionLoading(false);
      }
    })();
  }, [getErrorMessage]);

  useEffect(() => {
    if (!amapJsKey || !amapWebKey) {
      setMapLoadError('');
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
  }, [getErrorMessage]);

  const hasUsableUserLocation = useMemo(
    () => Boolean(currentCoordinates && (addressTextInput || hasManualSelectionRef.current)),
    [addressTextInput, currentCoordinates]
  );

  useEffect(() => {
    if (loading || hasUsableUserLocation || !mapReady || ipLocateTriedRef.current || isReviewing) return;
    ipLocateTriedRef.current = true;

    locateByIP(amapWebKey)
      .then(async (location) => {
        if (!location) return;
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
          return;
        }

        const ipCoordinates = { latitude: location.latitude, longitude: location.longitude };
        setMapStatusText('正在根据 IP 定位...');
        setInitialCoordinates(ipCoordinates);

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
          const reverseAddress = await reverseGeocodeCoordinates(amapWebKey, ipCoordinates);

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

        form.setFieldsValue({ address: nextAddress });
        if (Object.keys(addressPatch).length) {
          syncRegionOptionsFromAddress(nextAddress);
        }
      })
      .finally(() => {
        window.setTimeout(() => setMapStatusText(''), 800);
      });
  }, [form, hasUsableUserLocation, isReviewing, loading, mapReady, syncRegionOptionsFromAddress]);

  useEffect(() => {
    if (activeTab !== 'basic') {
      destroyMapInstance(previewBindings);
      return;
    }
    if (!mapReady || !window.AMap || !previewMapContainerRef.current || mapLoadError) return;
    const timer = window.setTimeout(() => {
      try {
        renderMapInstance(window.AMap, previewMapContainerRef.current, displayCoordinates, previewBindings, applyPointSelection);
        previewMapRef.current?.resize?.();
        if (displayCoordinates) {
          previewMapRef.current?.setCenter?.([displayCoordinates.longitude, displayCoordinates.latitude]);
        }
      } catch (error) {
        setMapLoadError(getErrorMessage(error, '地图预览渲染失败。'));
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeTab, applyPointSelection, displayCoordinates, getErrorMessage, mapLoadError, mapReady, previewBindings]);

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
        setMapLoadError(getErrorMessage(error, '地图弹窗渲染失败。'));
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [applyPointSelection, displayCoordinates, getErrorMessage, mapLoadError, mapModalOpen, mapReady, modalBindings]);

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
    const detailText = typeof detailValue === 'string' ? detailValue.trim() : '';
    if (!mapReady || !detailText) return;
    if (updateSourceRef.current === 'map') {
      updateSourceRef.current = 'idle';
      return;
    }
    const timer = window.setTimeout(() => {
      triggerAddressLocate();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [detailValue, mapReady, triggerAddressLocate]);

  useEffect(() => () => resetMapObjects(), [resetMapObjects]);

  const updateAddressField = useCallback((patch) => {
    const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
    const nextAddress = { ...latestAddress, ...patch };
    form.setFieldsValue({ address: nextAddress });
    return nextAddress;
  }, [form]);

  const handleRegionChange = useCallback(async ({ level, value, patch }) => {
    hasManualSelectionRef.current = false;
    const nextAddress = updateAddressField(patch);
    setAddressLocateError('');
    setPointPickError('');

    const optionsMap = {
      province: provinceOptions,
      city: cityOptions,
      district: districtOptions,
    };
    const optionCoordinates = getOptionCoordinates(optionsMap[level], value);
    if (optionCoordinates) {
      form.setFieldsValue({ address: { ...nextAddress, ...optionCoordinates } });
      setInitialCoordinates(optionCoordinates);
    }

    if (level === 'province') {
      try {
        setCityOptions(value ? await fetchDistrictOptions(amapWebKey, value) : []);
      } catch (error) {
        setCityOptions([]);
      }
      setDistrictOptions([]);
    }

    if (level === 'city') {
      try {
        setDistrictOptions(value ? await fetchDistrictOptions(amapWebKey, value) : []);
      } catch (error) {
        setDistrictOptions([]);
      }
    }

    if (mapReady) {
      triggerAddressLocate({ address: nextAddress });
    }
  }, [cityOptions, districtOptions, form, mapReady, provinceOptions, triggerAddressLocate, updateAddressField]);

  const handleProvinceChange = useCallback((value) => handleRegionChange({
    level: 'province',
    value,
    patch: { province: value, city: '', district: '', latitude: null, longitude: null },
  }), [handleRegionChange]);

  const handleCityChange = useCallback((value) => handleRegionChange({
    level: 'city',
    value,
    patch: { city: value, district: '', latitude: null, longitude: null },
  }), [handleRegionChange]);

  const handleDistrictChange = useCallback((value) => handleRegionChange({
    level: 'district',
    value,
    patch: { district: value, latitude: null, longitude: null },
  }), [handleRegionChange]);

  const handleDetailInputChange = useCallback(() => {
    hasManualSelectionRef.current = false;
  }, []);

  const handleSaveAddressDraft = useCallback(() => {
    if (isReviewing) return;
    const latestAddress = form.getFieldValue(['address']) || emptyHotelProfile.address;
    saveAddressDraftToSession(latestAddress, { silent: false, mode: 'manual' });
  }, [form, isReviewing, saveAddressDraftToSession]);

  const onMapModalAfterOpenChange = useCallback((open) => {
    if (!open) destroyMapInstance(modalBindings);
  }, [modalBindings]);

  return {
    mapState: {
      provinceOptions,
      cityOptions,
      districtOptions,
      regionLoading,
      mapModalOpen,
      mapLoadError,
      addressLocateError,
      pointPickError,
      mapStatusText,
      mapUnavailableReason,
    },
    mapRefs: {
      previewMapContainerRef,
      modalMapContainerRef,
    },
    mapValues: {
      addressValue,
    },
    mapActions: {
      setMapModalOpen,
      handleProvinceChange,
      handleCityChange,
      handleDistrictChange,
      handleDetailInputChange,
      handleSaveAddressDraft,
      onMapModalAfterOpenChange,
    },
  };
}
