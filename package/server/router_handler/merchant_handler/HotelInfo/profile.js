const { query } = require('../../../db/index');
const {
  reviewStatusList,
  reviewStatusEditableOnSaveList,
  accommodationTypeList,
  starLevelList,
  defaultCountry,
  maxHotelNameLength,
  maxAddressLength,
  maxIntroductionLength,
  timeRegex,
  phoneRegex,
  emailRegex,
  defaultProfile,
} = require('./constants');
const {
  safeTrim,
  parseJsonArray,
  parseJsonObject,
  normalizeTags,
  normalizeFacilitySelections,
  normalizeCustomFacilities,
} = require('./helpers');
const { getMerchantReviewStatus } = require('./repository');

const validateTime = (value, field, label) => {
  const val = safeTrim(value);
  if (!val) return `${label}不能为空`;
  if (!timeRegex.test(val)) return `${label}格式应为 HH:mm`;
  return '';
};

const mapHotelProfile = (row) => {
  if (!row) return defaultProfile;

  return {
    reviewStatus: reviewStatusList.includes(row.review_status) ? row.review_status : 'incomplete',
    accommodationType: row.accommodation_type || 'hotel',
    starLevel: row.star_level || 'three',
    hotelName: row.hotel_name || '',
    isGroup: Number(row.is_group) === 1,
    address: {
      country: row.country || defaultCountry,
      province: row.province || '',
      city: row.city || '',
      district: row.district || '',
      detail: row.address_detail || '',
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
    },
    propertyTags: parseJsonArray(row.property_tags),
    facilitySelections: normalizeFacilitySelections(parseJsonObject(row.facility_selections)),
    customFacilities: normalizeCustomFacilities(parseJsonArray(row.custom_facilities)),
    introduction: row.introduction || '',
    contactPhone: row.contact_phone || '',
    contactEmail: row.contact_email || '',
    operationRules: {
      isOpen24Hours: Number(row.is_open_24_hours) === 1,
      businessStartTime: row.business_start_time || '09:00',
      businessEndTime: row.business_end_time || '18:00',
      checkInTime: row.check_in_time || '14:00',
      checkOutTime: row.check_out_time || '12:00',
    },
  };
};

const validateHotelProfilePayload = (payload, options = {}) => {
  const strictRequired = options.strictRequired !== false;

  const rawAccommodationType = safeTrim(payload?.accommodationType);
  if (rawAccommodationType && !accommodationTypeList.includes(rawAccommodationType)) {
    return { message: '请选择合法的住宿类型', field: 'accommodationType' };
  }
  if (strictRequired && !rawAccommodationType) {
    return { message: '请选择合法的住宿类型', field: 'accommodationType' };
  }
  const accommodationType = rawAccommodationType || defaultProfile.accommodationType;

  const rawStarLevel = safeTrim(payload?.starLevel);
  if (rawStarLevel && !starLevelList.includes(rawStarLevel)) {
    return { message: '请选择合法的酒店星级', field: 'starLevel' };
  }
  if (strictRequired && !rawStarLevel) {
    return { message: '请选择合法的酒店星级', field: 'starLevel' };
  }
  const starLevel = rawStarLevel || defaultProfile.starLevel;

  const hotelName = safeTrim(payload?.hotelName);
  if (strictRequired && !hotelName) {
    return { message: '请输入酒店名称', field: 'hotelName' };
  }
  if (hotelName.length > maxHotelNameLength) {
    return { message: `酒店名称不能超过 ${maxHotelNameLength} 个字符`, field: 'hotelName' };
  }

  const address = payload?.address || {};
  const country = safeTrim(address.country) || defaultCountry;
  const province = safeTrim(address.province);
  const city = safeTrim(address.city);
  const district = safeTrim(address.district);
  const detail = safeTrim(address.detail);

  if (strictRequired) {
    if (!country) return { message: '请选择国家或地区', field: 'address.country' };
    if (!province) return { message: '请选择省份', field: 'address.province' };
    if (!city) return { message: '请选择城市', field: 'address.city' };
    if (!district) return { message: '请选择行政区', field: 'address.district' };
    if (!detail) return { message: '请输入详细地址', field: 'address.detail' };
  }
  if (detail.length > maxAddressLength) {
    return { message: `详细地址不能超过 ${maxAddressLength} 个字符`, field: 'address.detail' };
  }

  const latitude = address.latitude === '' || address.latitude === undefined || address.latitude === null
    ? null
    : Number(address.latitude);
  const longitude = address.longitude === '' || address.longitude === undefined || address.longitude === null
    ? null
    : Number(address.longitude);

  if (latitude !== null && Number.isNaN(latitude)) {
    return { message: '地图纬度数据无效', field: 'address.latitude' };
  }
  if (longitude !== null && Number.isNaN(longitude)) {
    return { message: '地图经度数据无效', field: 'address.longitude' };
  }

  const propertyTags = normalizeTags(payload?.propertyTags);
  const facilitySelections = normalizeFacilitySelections(payload?.facilitySelections);
  const customFacilities = normalizeCustomFacilities(payload?.customFacilities);
  const introduction = safeTrim(payload?.introduction);
  if (introduction.length > maxIntroductionLength) {
    return { message: `酒店简介不能超过 ${maxIntroductionLength} 个字符`, field: 'introduction' };
  }

  const contactPhone = safeTrim(payload?.contactPhone);
  if (strictRequired && !contactPhone) {
    return { message: '请输入联系电话', field: 'contactPhone' };
  }
  if (contactPhone && !phoneRegex.test(contactPhone)) {
    return { message: '请输入正确的 11 位手机号', field: 'contactPhone' };
  }

  const contactEmail = safeTrim(payload?.contactEmail);
  if (strictRequired && !contactEmail) {
    return { message: '请输入联系邮箱', field: 'contactEmail' };
  }
  if (contactEmail && !emailRegex.test(contactEmail)) {
    return { message: '请输入正确的邮箱格式', field: 'contactEmail' };
  }

  const operationRules = payload?.operationRules || {};
  const isOpen24Hours = Boolean(operationRules.isOpen24Hours);
  const businessStartTimeRaw = safeTrim(operationRules.businessStartTime);
  const businessEndTimeRaw = safeTrim(operationRules.businessEndTime);
  const checkInTimeRaw = safeTrim(operationRules.checkInTime);
  const checkOutTimeRaw = safeTrim(operationRules.checkOutTime);

  if (!isOpen24Hours) {
    if (strictRequired) {
      const businessStartTimeError = validateTime(businessStartTimeRaw, 'operationRules.businessStartTime', '营业开始时间');
      if (businessStartTimeError) return { message: businessStartTimeError, field: 'operationRules.businessStartTime' };

      const businessEndTimeError = validateTime(businessEndTimeRaw, 'operationRules.businessEndTime', '营业结束时间');
      if (businessEndTimeError) return { message: businessEndTimeError, field: 'operationRules.businessEndTime' };
    } else {
      if (businessStartTimeRaw && !timeRegex.test(businessStartTimeRaw)) {
        return { message: '营业开始时间格式应为 HH:mm', field: 'operationRules.businessStartTime' };
      }
      if (businessEndTimeRaw && !timeRegex.test(businessEndTimeRaw)) {
        return { message: '营业结束时间格式应为 HH:mm', field: 'operationRules.businessEndTime' };
      }
    }
  }

  if (strictRequired) {
    const checkInTimeError = validateTime(checkInTimeRaw, 'operationRules.checkInTime', '入住时间');
    if (checkInTimeError) return { message: checkInTimeError, field: 'operationRules.checkInTime' };

    const checkOutTimeError = validateTime(checkOutTimeRaw, 'operationRules.checkOutTime', '退房时间');
    if (checkOutTimeError) return { message: checkOutTimeError, field: 'operationRules.checkOutTime' };
  } else {
    if (checkInTimeRaw && !timeRegex.test(checkInTimeRaw)) {
      return { message: '入住时间格式应为 HH:mm', field: 'operationRules.checkInTime' };
    }
    if (checkOutTimeRaw && !timeRegex.test(checkOutTimeRaw)) {
      return { message: '退房时间格式应为 HH:mm', field: 'operationRules.checkOutTime' };
    }
  }

  const operationRuleDefaults = defaultProfile.operationRules;
  const businessStartTime = isOpen24Hours ? '00:00' : (businessStartTimeRaw || operationRuleDefaults.businessStartTime);
  const businessEndTime = isOpen24Hours ? '23:59' : (businessEndTimeRaw || operationRuleDefaults.businessEndTime);
  const checkInTime = checkInTimeRaw || operationRuleDefaults.checkInTime;
  const checkOutTime = checkOutTimeRaw || operationRuleDefaults.checkOutTime;

  return {
    payload: {
      accommodationType,
      starLevel,
      hotelName,
      isGroup: payload?.isGroup ? 1 : 0,
      address: { country, province, city, district, detail, latitude, longitude },
      propertyTags,
      facilitySelections,
      customFacilities,
      introduction,
      contactPhone,
      contactEmail,
      operationRules: {
        isOpen24Hours: isOpen24Hours ? 1 : 0,
        businessStartTime,
        businessEndTime,
        checkInTime,
        checkOutTime,
      },
    },
  };
};

const ensureMerchantHotelEditable = async (merchantUserId, executor = null) => {
  const reviewStatus = await getMerchantReviewStatus(merchantUserId, executor);
  if (reviewStatus === 'reviewing') {
    return {
      ok: false,
      message: '酒店资料正在审核中，暂不支持编辑。',
      field: 'reviewStatus',
      reviewStatus,
    };
  }
  return {
    ok: true,
    reviewStatus,
  };
};

const resolveReviewStatusAfterSave = (currentStatus = '') => {
  return reviewStatusEditableOnSaveList.includes(currentStatus) ? currentStatus : 'incomplete';
};

const saveHotelProfile = async (merchantUserId, normalizedPayload, options = {}) => {
  const {
    accommodationType,
    starLevel,
    hotelName,
    isGroup,
    address,
    propertyTags,
    facilitySelections,
    customFacilities,
    introduction,
    contactPhone,
    contactEmail,
    operationRules,
  } = normalizedPayload;
  const reviewStatus = reviewStatusList.includes(options.reviewStatus)
    ? options.reviewStatus
    : 'incomplete';

  const data = {
    merchant_user_id: merchantUserId,
    review_status: reviewStatus,
    accommodation_type: accommodationType,
    star_level: starLevel,
    hotel_name: hotelName,
    is_group: isGroup,
    country: address.country,
    province: address.province,
    city: address.city,
    district: address.district,
    address_detail: address.detail,
    latitude: address.latitude,
    longitude: address.longitude,
    property_tags: JSON.stringify(propertyTags),
    facility_selections: JSON.stringify(facilitySelections),
    custom_facilities: JSON.stringify(customFacilities),
    introduction,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    is_open_24_hours: operationRules.isOpen24Hours,
    business_start_time: operationRules.businessStartTime,
    business_end_time: operationRules.businessEndTime,
    check_in_time: operationRules.checkInTime,
    check_out_time: operationRules.checkOutTime,
  };

  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const updates = keys.map((k) => `${k} = VALUES(${k})`).join(', ');
  const values = Object.values(data);

  const sql = `
    INSERT INTO merchant_hotels (${keys.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  await query(sql, values);
};

module.exports = {
  mapHotelProfile,
  validateHotelProfilePayload,
  ensureMerchantHotelEditable,
  resolveReviewStatusAfterSave,
  saveHotelProfile,
};
