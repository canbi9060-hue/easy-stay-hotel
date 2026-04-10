import { Form, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  amapJsKey,
  DEFAULT_COUNTRY,
  destroyMapInstance,
  emptyHotelProfile,
  fetchDistrictOptions,
  fetchMerchantMapGeocode,
  fetchMerchantMapInitialLocation,
  fetchMerchantMapRegeocode,
  formatAddressText,
  getMapDisplayErrorMessage,
  loadAmapScript,
  normalizeCoordinates,
  renderMapInstance,
  searchAddressSuggestions,
} from '../../../../utils/hotel-info';

const defaultLocateErrorTitle = '根据地址定位失败';

const getDetailText = (address) =>
  String(address?.detail || '').trim();

const isSameCoordinates = (left, right) => {
  const first = normalizeCoordinates(left);
  const second = normalizeCoordinates(right);

  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  return (
    Math.abs(first.longitude - second.longitude) < 0.000001 &&
    Math.abs(first.latitude - second.latitude) < 0.000001
  );
};

const getOptionCenter = (options, value) => {
  if (!Array.isArray(options) || !value) {
    return null;
  }

  return normalizeCoordinates(options.find((item) => item?.value === value)?.center);
};

const buildAddressFromLocation = (location, fallbackAddress = emptyHotelProfile.address, { markManual = false } = {}) => {
  const coordinates = normalizeCoordinates(location);

  return {
    ...fallbackAddress,
    country: String(location?.country || fallbackAddress.country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY,
    province: String(location?.province || '').trim(),
    city: String(location?.city || '').trim(),
    district: String(location?.district || '').trim(),
    detail: String(location?.detail || '').trim(),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    isManualLocation: markManual || Boolean(fallbackAddress?.isManualLocation),
  };
};

export default function useHotelInfoMap({
  form,
  activeTab,
  loading,
  readOnly,
  getErrorMessage,
}) {
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState('');
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapStatusText, setMapStatusText] = useState('');
  const [addressLocateErrorTitle, setAddressLocateErrorTitle] = useState(defaultLocateErrorTitle);
  const [addressLocateError, setAddressLocateError] = useState('');
  const [markerResolveError, setMarkerResolveError] = useState('');
  const [detailAutocompleteOptions, setDetailAutocompleteOptions] = useState([]);
  const [detailAutocompleteLoading, setDetailAutocompleteLoading] = useState(false);
  const [displayCoordinates, setDisplayCoordinates] = useState(null);

  const previewMapContainerRef = useRef(null);
  const previewMapRef = useRef(null);
  const previewMarkerRef = useRef(null);
  const previewDragHandlerRef = useRef(null);
  const modalMapContainerRef = useRef(null);
  const modalMapRef = useRef(null);
  const modalMarkerRef = useRef(null);
  const modalDragHandlerRef = useRef(null);
  const initDoneRef = useRef(false);
  const regionLoadingCountRef = useRef(0);
  const autocompleteRequestIdRef = useRef(0);
  const geocodeRequestIdRef = useRef(0);
  const markerRequestIdRef = useRef(0);

  const addressValue = Form.useWatch(['address'], form) || emptyHotelProfile.address;
  const committedCoordinates = useMemo(
    () => normalizeCoordinates(addressValue),
    [addressValue]
  );

  const mapUnavailableReason = !amapJsKey
    ? '地图不可用：请在 .env 中配置 REACT_APP_AMAP_JS_KEY，并重启应用。'
    : '';

  const previewBindings = useMemo(
    () => ({
      mapRef: previewMapRef,
      markerRef: previewMarkerRef,
      dragHandlerRef: previewDragHandlerRef,
    }),
    []
  );

  const modalBindings = useMemo(
    () => ({
      mapRef: modalMapRef,
      markerRef: modalMarkerRef,
      dragHandlerRef: modalDragHandlerRef,
    }),
    []
  );

  const getLatestAddress = useCallback(
    () => form.getFieldValue(['address']) || emptyHotelProfile.address,
    [form]
  );

  const updateDisplayCoordinates = useCallback((coordinates) => {
    const nextCoordinates = normalizeCoordinates(coordinates);
    setDisplayCoordinates((currentCoordinates) => (
      isSameCoordinates(currentCoordinates, nextCoordinates)
        ? currentCoordinates
        : nextCoordinates
    ));
    return nextCoordinates;
  }, []);

  const setAddressFields = useCallback((nextAddress) => {
    form.setFieldsValue({ address: nextAddress });
    return nextAddress;
  }, [form]);

  const patchAddressFields = useCallback((patch) => {
    const nextAddress = {
      ...getLatestAddress(),
      ...patch,
    };
    return setAddressFields(nextAddress);
  }, [getLatestAddress, setAddressFields]);

  const applyResolvedLocation = useCallback((location, { markManual = false } = {}) => {
    const nextAddress = buildAddressFromLocation(location, getLatestAddress(), { markManual });
    setAddressFields(nextAddress);
    updateDisplayCoordinates(nextAddress);
    return nextAddress;
  }, [getLatestAddress, setAddressFields, updateDisplayCoordinates]);

  const clearLocationErrors = useCallback(() => {
    setAddressLocateErrorTitle(defaultLocateErrorTitle);
    setAddressLocateError('');
    setMarkerResolveError('');
  }, []);

  const runRegionTask = useCallback(async (task) => {
    regionLoadingCountRef.current += 1;
    setRegionLoading(true);

    try {
      return await task();
    } finally {
      regionLoadingCountRef.current = Math.max(0, regionLoadingCountRef.current - 1);
      if (regionLoadingCountRef.current === 0) {
        setRegionLoading(false);
      }
    }
  }, []);

  const loadDistrictOptionsByKeyword = useCallback(async (keyword, setter) => {
    const normalizedKeyword = String(keyword || '').trim();
    if (!normalizedKeyword) {
      setter([]);
      return [];
    }

    return runRegionTask(async () => {
      const options = await fetchDistrictOptions(normalizedKeyword);
      setter(options);
      return options;
    });
  }, [runRegionTask]);

  const handleMarkerDragEnd = useCallback(async (coordinates) => {
    if (readOnly) {
      return;
    }

    const nextCoordinates = normalizeCoordinates(coordinates);
    if (!nextCoordinates) {
      return;
    }

    const requestId = ++markerRequestIdRef.current;
    clearLocationErrors();
    updateDisplayCoordinates(nextCoordinates);
    patchAddressFields({
      latitude: nextCoordinates.latitude,
      longitude: nextCoordinates.longitude,
      isManualLocation: true,
    });
    setMapStatusText('正在解析拖拽位置...');

    try {
      const location = await fetchMerchantMapRegeocode(nextCoordinates);
      if (requestId !== markerRequestIdRef.current) {
        return;
      }

      applyResolvedLocation(location, { markManual: true });
    } catch (error) {
      if (requestId === markerRequestIdRef.current) {
        setMarkerResolveError(getMapDisplayErrorMessage(
          error,
          '拖动地图标记后回填地址失败，请稍后重试。'
        ));
      }
    } finally {
      if (requestId === markerRequestIdRef.current) {
        setMapStatusText('');
      }
    }
  }, [
    applyResolvedLocation,
    clearLocationErrors,
    patchAddressFields,
    readOnly,
    updateDisplayCoordinates,
  ]);

  useEffect(() => {
    if (committedCoordinates) {
      updateDisplayCoordinates(committedCoordinates);
    }
  }, [committedCoordinates, updateDisplayCoordinates]);

  useEffect(() => {
    let active = true;

    runRegionTask(async () => {
      try {
        const options = await fetchDistrictOptions(DEFAULT_COUNTRY);
        if (active) {
          setProvinceOptions(options);
        }
      } catch (error) {
        if (active) {
          setProvinceOptions([]);
          message.warning(getErrorMessage(error, '加载省份选项失败。'));
        }
      }
    });

    return () => {
      active = false;
    };
  }, [getErrorMessage, runRegionTask]);

  useEffect(() => {
    if (!amapJsKey) {
      setMapReady(false);
      setMapLoadError('');
      return undefined;
    }

    let active = true;

    loadAmapScript(amapJsKey)
      .then(() => {
        if (active) {
          setMapReady(true);
          setMapLoadError('');
        }
      })
      .catch((error) => {
        if (active) {
          setMapReady(false);
          setMapLoadError(getMapDisplayErrorMessage(error, '地图加载失败。'));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    let active = true;
    const province = String(addressValue?.province || '').trim();
    const city = String(addressValue?.city || '').trim();

    if (!province) {
      setCityOptions([]);
      setDistrictOptions([]);
      return;
    }

    loadDistrictOptionsByKeyword(province, (options) => {
      if (active) {
        setCityOptions(options);
      }
    }).catch((error) => {
      if (active) {
        setCityOptions([]);
        setDistrictOptions([]);
        message.warning(getErrorMessage(error, '加载城市选项失败。'));
      }
    });

    if (!city) {
      setDistrictOptions([]);
      return () => {
        active = false;
      };
    }

    loadDistrictOptionsByKeyword(city, (options) => {
      if (active) {
        setDistrictOptions(options);
      }
    }).catch((error) => {
      if (active) {
        setDistrictOptions([]);
        message.warning(getErrorMessage(error, '加载区县选项失败。'));
      }
    });

    return () => {
      active = false;
    };
  }, [
    addressValue?.city,
    addressValue?.province,
    getErrorMessage,
    loadDistrictOptionsByKeyword,
    loading,
  ]);

  useEffect(() => {
    if (loading || !mapReady || initDoneRef.current) {
      return;
    }

    let active = true;
    initDoneRef.current = true;
    clearLocationErrors();
    setMapStatusText('正在初始化地图...');

    fetchMerchantMapInitialLocation()
      .then((result) => {
        if (!active) {
          return;
        }

        const source = result?.source || 'empty';
        const location = result?.location || null;
        const coordinates = normalizeCoordinates(location);

        if ((source === 'stored' || source === 'stored_geocoded') && location) {
          applyResolvedLocation(location, { markManual: false });
          return;
        }

        if (source === 'ip' && coordinates) {
          updateDisplayCoordinates(coordinates);
          return;
        }

        updateDisplayCoordinates(null);
      })
      .catch((error) => {
        if (active) {
          setAddressLocateErrorTitle('初始化定位失败');
          setAddressLocateError(getMapDisplayErrorMessage(
            error,
            '获取地图初始化位置失败，请稍后重试。'
          ));
        }
      })
      .finally(() => {
        if (active) {
          setMapStatusText('');
        }
      });

    return () => {
      active = false;
    };
  }, [
    applyResolvedLocation,
    clearLocationErrors,
    loading,
    mapReady,
    updateDisplayCoordinates,
  ]);

  const canRenderMap = !loading && !mapUnavailableReason && !mapLoadError && mapReady;

  useEffect(() => {
    if (activeTab !== 'basic' || !canRenderMap) {
      destroyMapInstance(previewBindings);
      return;
    }

    if (!window.AMap || !previewMapContainerRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        renderMapInstance(
          window.AMap,
          previewMapContainerRef.current,
          displayCoordinates,
          previewBindings,
          {
            draggable: !readOnly,
            onMarkerDragEnd: handleMarkerDragEnd,
          }
        );
        previewMapRef.current?.resize?.();
      } catch (error) {
        setMapLoadError(getMapDisplayErrorMessage(error, '地图预览渲染失败。'));
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    canRenderMap,
    displayCoordinates,
    handleMarkerDragEnd,
    previewBindings,
    readOnly,
  ]);

  useEffect(() => {
    if (!canRenderMap || !mapModalOpen) {
      destroyMapInstance(modalBindings);
      return;
    }

    if (!window.AMap || !modalMapContainerRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        renderMapInstance(
          window.AMap,
          modalMapContainerRef.current,
          displayCoordinates,
          modalBindings,
          {
            draggable: !readOnly,
            onMarkerDragEnd: handleMarkerDragEnd,
          }
        );
        modalMapRef.current?.resize?.();
      } catch (error) {
        setMapLoadError(getMapDisplayErrorMessage(error, '地图弹窗渲染失败。'));
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    canRenderMap,
    displayCoordinates,
    handleMarkerDragEnd,
    mapModalOpen,
    modalBindings,
    readOnly,
  ]);

  useEffect(() => () => {
    destroyMapInstance(previewBindings);
    destroyMapInstance(modalBindings);
  }, [modalBindings, previewBindings]);

  const handleProvinceChange = useCallback((value) => {
    clearLocationErrors();
    setDetailAutocompleteOptions([]);

    const center = getOptionCenter(provinceOptions, value);
    updateDisplayCoordinates(center);
    setCityOptions([]);
    setDistrictOptions([]);
    patchAddressFields({
      country: DEFAULT_COUNTRY,
      province: value,
      city: '',
      district: '',
      latitude: center?.latitude ?? null,
      longitude: center?.longitude ?? null,
      isManualLocation: true,
    });
  }, [
    clearLocationErrors,
    patchAddressFields,
    provinceOptions,
    updateDisplayCoordinates,
  ]);

  const handleCityChange = useCallback((value) => {
    clearLocationErrors();
    setDetailAutocompleteOptions([]);

    const center = getOptionCenter(cityOptions, value);
    updateDisplayCoordinates(center);
    setDistrictOptions([]);
    patchAddressFields({
      city: value,
      district: '',
      latitude: center?.latitude ?? null,
      longitude: center?.longitude ?? null,
      isManualLocation: true,
    });
  }, [
    cityOptions,
    clearLocationErrors,
    patchAddressFields,
    updateDisplayCoordinates,
  ]);

  const handleDistrictChange = useCallback((value) => {
    clearLocationErrors();
    setDetailAutocompleteOptions([]);

    const center = getOptionCenter(districtOptions, value);
    updateDisplayCoordinates(center);
    patchAddressFields({
      district: value,
      latitude: center?.latitude ?? null,
      longitude: center?.longitude ?? null,
      isManualLocation: true,
    });
  }, [
    clearLocationErrors,
    districtOptions,
    patchAddressFields,
    updateDisplayCoordinates,
  ]);

  const handleDetailInputChange = useCallback((event) => {
    clearLocationErrors();
    const nextValue = String(event?.target?.value || '').trim();
    if (!nextValue) {
      setDetailAutocompleteOptions([]);
    }
  }, [clearLocationErrors]);

  const handleDetailSearch = useCallback(async (keyword) => {
    const normalizedKeyword = String(keyword || '').trim();
    const requestId = ++autocompleteRequestIdRef.current;

    if (!normalizedKeyword || !mapReady || !window.AMap) {
      setDetailAutocompleteLoading(false);
      setDetailAutocompleteOptions([]);
      return;
    }

    clearLocationErrors();
    setDetailAutocompleteLoading(true);

    try {
      const suggestions = await searchAddressSuggestions(window.AMap, normalizedKeyword, {
        city: addressValue?.city || addressValue?.province || '',
      });
      if (requestId !== autocompleteRequestIdRef.current) {
        return;
      }

      setDetailAutocompleteOptions(
        suggestions.map((item) => ({
          value: item.value,
          label: item.label,
          fullAddress: item.fullAddress,
          coordinates: item.coordinates,
        }))
      );
    } catch (error) {
      if (requestId === autocompleteRequestIdRef.current) {
        setDetailAutocompleteOptions([]);
      }
    } finally {
      if (requestId === autocompleteRequestIdRef.current) {
        setDetailAutocompleteLoading(false);
      }
    }
  }, [
    addressValue?.city,
    addressValue?.province,
    clearLocationErrors,
    mapReady,
  ]);

  const handleDetailSelect = useCallback(async (value, option) => {
    const requestId = ++geocodeRequestIdRef.current;
    const latestAddress = getLatestAddress();
    const fallbackAddress = formatAddressText({
      ...latestAddress,
      detail: value || getDetailText(latestAddress),
    });
    const fullAddress = String(option?.fullAddress || fallbackAddress).trim();

    if (!fullAddress) {
      return;
    }

    clearLocationErrors();
    setMapStatusText('正在根据地址定位...');
    setDetailAutocompleteOptions([]);

    try {
      const location = await fetchMerchantMapGeocode(fullAddress);
      if (requestId !== geocodeRequestIdRef.current) {
        return;
      }

      applyResolvedLocation({
        ...location,
        detail: String(location?.detail || value || '').trim(),
      }, { markManual: true });
    } catch (error) {
      if (requestId === geocodeRequestIdRef.current) {
        setAddressLocateErrorTitle(defaultLocateErrorTitle);
        setAddressLocateError(getMapDisplayErrorMessage(
          error,
          '根据当前地址定位失败，请重新选择地址联想项。'
        ));
      }
    } finally {
      if (requestId === geocodeRequestIdRef.current) {
        setMapStatusText('');
      }
    }
  }, [
    applyResolvedLocation,
    clearLocationErrors,
    getLatestAddress,
  ]);

  const onMapModalAfterOpenChange = useCallback((open) => {
    if (!open) {
      destroyMapInstance(modalBindings);
    }
  }, [modalBindings]);

  return {
    mapState: {
      provinceOptions,
      cityOptions,
      districtOptions,
      regionLoading,
      mapModalOpen,
      mapLoadError,
      addressLocateErrorTitle,
      addressLocateError,
      markerResolveError,
      mapStatusText,
      mapUnavailableReason,
      detailAutocompleteOptions,
      detailAutocompleteLoading,
    },
    mapRefs: {
      previewMapContainerRef,
      modalMapContainerRef,
    },
    mapValues: {
      addressValue,
      displayCoordinates,
    },
    mapActions: {
      setMapModalOpen,
      handleProvinceChange,
      handleCityChange,
      handleDistrictChange,
      handleDetailInputChange,
      handleDetailSearch,
      handleDetailSelect,
      onMapModalAfterOpenChange,
    },
  };
}
