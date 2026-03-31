import {
  createEmptyFacilitySelections,
  emptyHotelProfile,
  facilityCategoryKeys,
  facilityOptionValueMap,
  MAX_CUSTOM_FACILITY_COUNT,
  MAX_CUSTOM_FACILITY_LENGTH,
} from './constants';
import { ensureArray, isPlainObject } from './shared';

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
