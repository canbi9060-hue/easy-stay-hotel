const { query } = require('../db/index');
const { success, validationFail, serverFail } = require('../utils/response');

const reviewStatusList = ['pending', 'approved', 'rejected'];
const accommodationTypeList = ['hotel', 'homestay'];
const starLevelList = ['one', 'two', 'three', 'four', 'five'];
const defaultCountry = '中国';
const maxHotelNameLength = 100;
const maxAddressLength = 200;
const maxIntroductionLength = 2000;
const maxTagLength = 20;
const maxTagCount = 20;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

const defaultProfile = {
  reviewStatus: 'pending',
  accommodationType: 'hotel',
  starLevel: 'three',
  hotelName: '',
  isGroup: false,
  address: {
    country: defaultCountry,
    province: '',
    city: '',
    district: '',
    detail: '',
    latitude: null,
    longitude: null,
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

const safeTrim = (value) => String(value ?? '').trim();

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .map(tag => safeTrim(tag))
      .filter(Boolean)
      .slice(0, maxTagCount)
      .map(tag => tag.slice(0, maxTagLength))
  )];
};

const validateTime = (value, field, label) => {
  const val = safeTrim(value);
  if (!val) return `${label}不能为空`;
  if (!timeRegex.test(val)) return `${label}格式应为 HH:mm`;
  return '';
};

// ====================== 修复：读取数据库原始下划线字段 ======================
const mapHotelProfile = (row) => {
  if (!row) return defaultProfile;

  return {
    reviewStatus: reviewStatusList.includes(row.review_status) ? row.review_status : 'pending',
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

// ====================== 修复：极简查询，不做驼峰转换，只查数据 ======================
const getHotelProfileByMerchantId = async (merchantUserId) => {
  const [hotelProfile] = await query(
    `SELECT * FROM merchant_hotels WHERE merchant_user_id = ? LIMIT 1`,
    [merchantUserId]
  );
  return hotelProfile || null;
};

const validateHotelProfilePayload = (payload) => {
  const accommodationType = safeTrim(payload?.accommodationType);
  if (!accommodationTypeList.includes(accommodationType)) {
    return { message: '请选择合法的住宿类型', field: 'accommodationType' };
  }

  const starLevel = safeTrim(payload?.starLevel);
  if (!starLevelList.includes(starLevel)) {
    return { message: '请选择合法的酒店星级', field: 'starLevel' };
  }

  const hotelName = safeTrim(payload?.hotelName);
  if (!hotelName) {
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

  if (!country) return { message: '请选择国家或地区', field: 'address.country' };
  if (!province) return { message: '请选择省份', field: 'address.province' };
  if (!city) return { message: '请选择城市', field: 'address.city' };
  if (!district) return { message: '请选择行政区', field: 'address.district' };
  if (!detail) return { message: '请输入详细地址', field: 'address.detail' };
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
  const introduction = safeTrim(payload?.introduction);
  if (introduction.length > maxIntroductionLength) {
    return { message: `酒店简介不能超过 ${maxIntroductionLength} 个字符`, field: 'introduction' };
  }

  const contactPhone = safeTrim(payload?.contactPhone);
  if (!contactPhone) return { message: '请输入联系电话', field: 'contactPhone' };
  if (!phoneRegex.test(contactPhone)) return { message: '请输入正确的 11 位手机号', field: 'contactPhone' };

  const contactEmail = safeTrim(payload?.contactEmail);
  if (!contactEmail) return { message: '请输入联系邮箱', field: 'contactEmail' };
  if (!emailRegex.test(contactEmail)) return { message: '请输入正确的邮箱格式', field: 'contactEmail' };

  const operationRules = payload?.operationRules || {};
  const isOpen24Hours = Boolean(operationRules.isOpen24Hours);
  const businessStartTime = safeTrim(operationRules.businessStartTime);
  const businessEndTime = safeTrim(operationRules.businessEndTime);
  const checkInTime = safeTrim(operationRules.checkInTime);
  const checkOutTime = safeTrim(operationRules.checkOutTime);

  if (!isOpen24Hours) {
    const businessStartTimeError = validateTime(businessStartTime, 'operationRules.businessStartTime', '营业开始时间');
    if (businessStartTimeError) return { message: businessStartTimeError, field: 'operationRules.businessStartTime' };

    const businessEndTimeError = validateTime(businessEndTime, 'operationRules.businessEndTime', '营业结束时间');
    if (businessEndTimeError) return { message: businessEndTimeError, field: 'operationRules.businessEndTime' };
  }

  const checkInTimeError = validateTime(checkInTime, 'operationRules.checkInTime', '入住时间');
  if (checkInTimeError) return { message: checkInTimeError, field: 'operationRules.checkInTime' };

  const checkOutTimeError = validateTime(checkOutTime, 'operationRules.checkOutTime', '退房时间');
  if (checkOutTimeError) return { message: checkOutTimeError, field: 'operationRules.checkOutTime' };

  return {
    payload: {
      accommodationType,
      starLevel,
      hotelName,
      isGroup: payload?.isGroup ? 1 : 0,
      address: { country, province, city, district, detail, latitude, longitude },
      propertyTags,
      introduction,
      contactPhone,
      contactEmail,
      operationRules: {
        isOpen24Hours: isOpen24Hours ? 1 : 0,
        businessStartTime: isOpen24Hours ? '00:00' : businessStartTime,
        businessEndTime: isOpen24Hours ? '23:59' : businessEndTime,
        checkInTime,
        checkOutTime,
      },
    },
  };
};

// ====================== 修复：简洁安全的自动SQL，不手写超长字段 ======================
const saveHotelProfile = async (merchantUserId, normalizedPayload) => {
  const {
    accommodationType,
    starLevel,
    hotelName,
    isGroup,
    address,
    propertyTags,
    introduction,
    contactPhone,
    contactEmail,
    operationRules,
  } = normalizedPayload;

  const data = {
    merchant_user_id: merchantUserId,
    review_status: 'pending',
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
  const updates = keys.map(k => `${k} = VALUES(${k})`).join(', ');
  const values = Object.values(data);

  const sql = `
    INSERT INTO merchant_hotels (${keys.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  await query(sql, values);
};

// ====================== 接口：保持清晰，无多余逻辑 ======================
exports.getHotelProfile = async (req, res) => {
  try {
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '获取酒店信息成功'));
  } catch (error) {
    console.error('获取酒店信息失败:', error);
    res.json(serverFail('获取酒店信息失败，请稍后重试'));
  }
};

exports.updateHotelProfile = async (req, res) => {
  try {
    const validated = validateHotelProfilePayload(req.body);
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    await saveHotelProfile(req.user.id, validated.payload);
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);

    res.json(success(mapHotelProfile(hotelProfile), '酒店信息保存成功'));
  } catch (error) {
    console.error('保存酒店信息失败:', error);
    res.json(serverFail('保存酒店信息失败，请稍后重试'));
  }
};

// ====================== 修复：复用save逻辑，不手写重复SQL ======================
exports.submitHotelProfileReview = async (req, res) => {
  try {
    // 1. 先做完整表单验证！（必须！）
    const validated = validateHotelProfilePayload(req.body);
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    // 2. 验证通过 → 保存完整数据（第一次也会创建）
    await saveHotelProfile(req.user.id, validated.payload);

    // 3. 把审核状态改为待审核
    await query(
      `UPDATE merchant_hotels 
       SET review_status = 'pending' 
       WHERE merchant_user_id = ?`,
      [req.user.id]
    );

    // 4. 返回最新数据
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '酒店信息已提交审核'));
  } catch (error) {
    console.error('提交审核失败:', error);
    res.json(serverFail('提交审核失败，请稍后重试'));
  }
};