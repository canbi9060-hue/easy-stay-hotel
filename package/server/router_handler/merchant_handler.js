const fs = require('fs');
const path = require('path');

const { query, withTransaction } = require('../db/index');
const { success, validationFail, notFoundFail, serverFail } = require('../utils/response');
const { hotelImageUpload, hotelCertificateUpload } = require('../middleware/upload');

const reviewStatusList = ['incomplete', 'reviewing', 'rejected_pending_fix', 'approved'];
const reviewStatusEditableOnSaveList = ['incomplete', 'rejected_pending_fix'];
const accommodationTypeList = ['hotel', 'homestay'];
const starLevelList = ['one', 'two', 'three', 'four', 'five'];
const defaultCountry = '中国';
const maxHotelNameLength = 100;
const maxAddressLength = 200;
const maxIntroductionLength = 2000;
const maxTagLength = 20;
const maxTagCount = 20;
const maxCustomFacilityLength = 30;
const maxCustomFacilityCount = 20;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const facilityOptionMap = {
  infrastructure: [
    'free_wifi',
    'free_parking',
    'paid_parking',
    'front_desk_24h',
    'central_air_conditioning',
    'guest_elevator',
    'hot_water_24h',
    'toiletries',
    'hair_dryer',
    'private_bathroom',
    'desk',
    'safe_box',
    'non_smoking_room',
    'accessible_facilities',
  ],
  entertainment: [
    'indoor_pool',
    'gym',
    'spa_massage',
    'chess_room',
    'kids_playground',
    'bar_coffee',
    'tea_room',
    'ktv_room',
  ],
  service: [
    'luggage_storage',
    'wake_up_service',
    'shuttle_service',
    'business_center',
    'meeting_room',
    'room_service',
    'laundry_dry_cleaning',
    'car_rental',
    'security_24h',
    'self_service_breakfast',
    'currency_exchange',
    'concierge_service',
  ],
  specialty: [
    'pet_friendly',
    'ev_charging',
    'terrace_garden',
    'self_laundry',
  ],
};
const facilityCategoryKeys = Object.keys(facilityOptionMap);
const hotelImageGroupList = ['signboard', 'frontdesk', 'facility', 'carousel'];
const hotelImageGroupLimits = {
  signboard: 2,
  frontdesk: 3,
  facility: 4,
  carousel: 5,
};
const hotelImageGroupLabels = {
  signboard: '店招图片',
  frontdesk: '前台图片',
  facility: '环境与设施',
  carousel: '轮播图',
};
const reviewRequiredImageGroups = ['signboard', 'frontdesk', 'facility', 'carousel'];
const hotelImageGroupEnum = "'signboard','frontdesk','facility','carousel'";
let ensureHotelImageTablePromise = null;
const hotelCertificateGroupList = [
  'business_license',
  'legal_person_front',
  'legal_person_back',
  'special_permit',
  'other_qualification',
];
const hotelCertificateGroupLimits = {
  business_license: 1,
  legal_person_front: 1,
  legal_person_back: 1,
  special_permit: 1,
  other_qualification: 3,
};
const hotelCertificateGroupLabels = {
  business_license: '营业执照',
  legal_person_front: '法人身份证正面',
  legal_person_back: '法人身份证反面',
  special_permit: '特种行业许可证',
  other_qualification: '其他资质证明',
};
const reviewRequiredCertificateGroups = [
  'business_license',
  'legal_person_front',
  'legal_person_back',
  'special_permit',
];
const hotelCertificateGroupEnum = "'business_license','legal_person_front','legal_person_back','special_permit','other_qualification'";
let ensureHotelCertificateTablePromise = null;

const defaultProfile = {
  reviewStatus: 'incomplete',
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
  facilitySelections: {
    infrastructure: [],
    entertainment: [],
    service: [],
    specialty: [],
  },
  customFacilities: [],
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
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const parseJsonObject = (value) => {
  if (!value) return {};
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
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

const createEmptyFacilitySelections = () => ({
  infrastructure: [],
  entertainment: [],
  service: [],
  specialty: [],
});

const normalizeFacilitySelections = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = createEmptyFacilitySelections();

  facilityCategoryKeys.forEach((categoryKey) => {
    const whiteList = new Set(facilityOptionMap[categoryKey] || []);
    const rawList = Array.isArray(source[categoryKey]) ? source[categoryKey] : [];
    result[categoryKey] = [...new Set(
      rawList
        .map((item) => safeTrim(item))
        .filter((item) => whiteList.has(item))
    )];
  });

  return result;
};

const normalizeCustomFacilities = (value) => {
  const rawList = Array.isArray(value) ? value : [];
  return [...new Set(
    rawList
      .map((item) => safeTrim(item))
      .filter(Boolean)
      .map((item) => item.slice(0, maxCustomFacilityLength))
  )].slice(0, maxCustomFacilityCount);
};

const deleteLocalHotelImageSafely = (filePath) => {
  if (!filePath || !filePath.startsWith('/uploads/hotel-images/')) {
    return { ok: false, message: '图片路径不合法' };
  }

  const absolutePath = path.join(__dirname, '..', filePath.replace(/^\//, ''));
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, missing: true };
  }

  fs.unlinkSync(absolutePath);
  return { ok: true };
};

const deleteLocalHotelCertificateSafely = (filePath) => {
  if (!filePath || !filePath.startsWith('/uploads/hotel-certificates/')) {
    return { ok: false, message: '证件路径不合法' };
  }

  const absolutePath = path.join(__dirname, '..', filePath.replace(/^\//, ''));
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, missing: true };
  }

  fs.unlinkSync(absolutePath);
  return { ok: true };
};

const createEmptyHotelImages = () => ({
  signboard: [],
  frontdesk: [],
  facility: [],
  carousel: [],
});

const createEmptyHotelCertificates = () => ({
  business_license: [],
  legal_person_front: [],
  legal_person_back: [],
  special_permit: [],
  other_qualification: [],
});

const mapHotelImage = (row) => ({
  id: row.id,
  group: row.image_group,
  filePath: row.file_path,
  sortOrder: Number(row.sort_order) || 0,
  sizeBytes: Number(row.size_bytes) || 0,
  mimeType: row.mime_type || '',
  createdAt: row.created_at,
});

const groupHotelImages = (rows) => {
  const result = createEmptyHotelImages();
  rows.forEach((row) => {
    const key = row.image_group;
    if (!hotelImageGroupList.includes(key)) return;
    result[key].push(mapHotelImage(row));
  });
  return result;
};

const mapHotelCertificate = (row) => ({
  id: row.id,
  group: row.cert_group,
  filePath: row.file_path,
  sortOrder: Number(row.sort_order) || 0,
  sizeBytes: Number(row.size_bytes) || 0,
  mimeType: row.mime_type || '',
  createdAt: row.created_at,
});

const groupHotelCertificates = (rows) => {
  const result = createEmptyHotelCertificates();
  rows.forEach((row) => {
    const key = row.cert_group;
    if (!hotelCertificateGroupList.includes(key)) return;
    result[key].push(mapHotelCertificate(row));
  });
  return result;
};

const runQuery = (executor, sql, values) => {
  if (executor?.query) {
    return executor.query(sql, values);
  }
  return query(sql, values);
};

const createHandlerError = (kind, message, field = '') => {
  const error = new Error(message);
  error.kind = kind;
  error.field = field;
  return error;
};

const lockMerchantRow = async (executor, merchantUserId) => {
  await runQuery(
    executor,
    `SELECT id FROM users WHERE id = ? FOR UPDATE`,
    [merchantUserId]
  );
};

const getHotelImagesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  const sql = group
    ? `SELECT * FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? ORDER BY sort_order ASC, id ASC`
    : `SELECT * FROM merchant_hotel_images WHERE merchant_user_id = ? ORDER BY image_group ASC, sort_order ASC, id ASC`;
  const values = group ? [merchantUserId, group] : [merchantUserId];
  const rows = await runQuery(executor, sql, values);
  return rows || [];
};

const getHotelCertificatesByMerchantId = async (merchantUserId, group = '', executor = null) => {
  const sql = group
    ? `SELECT * FROM merchant_hotel_certificates WHERE merchant_user_id = ? AND cert_group = ? ORDER BY sort_order ASC, id ASC`
    : `SELECT * FROM merchant_hotel_certificates WHERE merchant_user_id = ? ORDER BY cert_group ASC, sort_order ASC, id ASC`;
  const values = group ? [merchantUserId, group] : [merchantUserId];
  const rows = await runQuery(executor, sql, values);
  return rows || [];
};

const ensureMerchantHotelImagesTable = async () => {
  if (ensureHotelImageTablePromise) {
    return ensureHotelImageTablePromise;
  }

  ensureHotelImageTablePromise = (async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS merchant_hotel_images (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary ID',
        merchant_user_id INT UNSIGNED NOT NULL COMMENT 'Merchant user ID',
        image_group ENUM(${hotelImageGroupEnum}) NOT NULL COMMENT 'Image group',
        file_path VARCHAR(255) NOT NULL COMMENT 'Image file path',
        file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Original file name',
        mime_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'MIME type',
        size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
        sort_order INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Sort order within group',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created at',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated at',
        PRIMARY KEY (id),
        KEY idx_merchant_group_sort (merchant_user_id, image_group, sort_order),
        CONSTRAINT fk_merchant_hotel_images_user
          FOREIGN KEY (merchant_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Merchant hotel images'`
    );

    const [indexRow] = await query(
      `SELECT COUNT(1) AS total
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'merchant_hotel_images'
         AND index_name = 'idx_merchant_group_sort'`
    );
    if (Number(indexRow?.total || 0) < 1) {
      await query(
        `ALTER TABLE merchant_hotel_images
         ADD INDEX idx_merchant_group_sort (merchant_user_id, image_group, sort_order)`
      );
    }

    const [enumRow] = await query(
      `SELECT COLUMN_TYPE AS columnType
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'merchant_hotel_images'
         AND column_name = 'image_group'
       LIMIT 1`
    );
    const enumText = String(enumRow?.columnType || '').toLowerCase();
    const enumReady = ['signboard', 'frontdesk', 'facility', 'carousel'].every((value) => enumText.includes(`'${value}'`));
    if (!enumReady) {
      await query(
        `ALTER TABLE merchant_hotel_images
         MODIFY COLUMN image_group ENUM(${hotelImageGroupEnum}) NOT NULL COMMENT 'Image group'`
      );
    }
  })().catch((error) => {
    ensureHotelImageTablePromise = null;
    throw error;
  });

  return ensureHotelImageTablePromise;
};

const ensureMerchantHotelCertificatesTable = async () => {
  if (ensureHotelCertificateTablePromise) {
    return ensureHotelCertificateTablePromise;
  }

  ensureHotelCertificateTablePromise = (async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS merchant_hotel_certificates (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary ID',
        merchant_user_id INT UNSIGNED NOT NULL COMMENT 'Merchant user ID',
        cert_group ENUM(${hotelCertificateGroupEnum}) NOT NULL COMMENT 'Certificate group',
        file_path VARCHAR(255) NOT NULL COMMENT 'Certificate file path',
        file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Original file name',
        mime_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'MIME type',
        size_bytes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
        sort_order INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Sort order within group',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created at',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated at',
        PRIMARY KEY (id),
        KEY idx_merchant_cert_group_sort (merchant_user_id, cert_group, sort_order),
        CONSTRAINT fk_merchant_hotel_certificates_user
          FOREIGN KEY (merchant_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Merchant hotel certificates'`
    );

    const [indexRow] = await query(
      `SELECT COUNT(1) AS total
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'merchant_hotel_certificates'
         AND index_name = 'idx_merchant_cert_group_sort'`
    );
    if (Number(indexRow?.total || 0) < 1) {
      await query(
        `ALTER TABLE merchant_hotel_certificates
         ADD INDEX idx_merchant_cert_group_sort (merchant_user_id, cert_group, sort_order)`
      );
    }

    const [enumRow] = await query(
      `SELECT COLUMN_TYPE AS columnType
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'merchant_hotel_certificates'
         AND column_name = 'cert_group'
       LIMIT 1`
    );
    const enumText = String(enumRow?.columnType || '').toLowerCase();
    const enumReady = hotelCertificateGroupList.every((value) => enumText.includes(`'${value}'`));
    if (!enumReady) {
      await query(
        `ALTER TABLE merchant_hotel_certificates
         MODIFY COLUMN cert_group ENUM(${hotelCertificateGroupEnum}) NOT NULL COMMENT 'Certificate group'`
      );
    }
  })().catch((error) => {
    ensureHotelCertificateTablePromise = null;
    throw error;
  });

  return ensureHotelCertificateTablePromise;
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

// ====================== 修复：极简查询，不做额外转换，仅查询数据 ======================
const getHotelProfileByMerchantId = async (merchantUserId) => {
  const [hotelProfile] = await query(
    `SELECT * FROM merchant_hotels WHERE merchant_user_id = ? LIMIT 1`,
    [merchantUserId]
  );
  return hotelProfile || null;
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

const getMerchantReviewStatus = async (merchantUserId, executor = null) => {
  const [row] = await runQuery(
    executor,
    `SELECT review_status
     FROM merchant_hotels
     WHERE merchant_user_id = ?
     LIMIT 1`,
    [merchantUserId]
  );
  return safeTrim(row?.review_status);
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

// ====================== 修复：简洁安全的自动 SQL，不手写超长字段 ======================
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
  const updates = keys.map(k => `${k} = VALUES(${k})`).join(', ');
  const values = Object.values(data);

  const sql = `
    INSERT INTO merchant_hotels (${keys.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  await query(sql, values);
};

const validateReviewRequiredImages = async (merchantUserId) => {
  await ensureMerchantHotelImagesTable();
  const placeholders = reviewRequiredImageGroups.map(() => '?').join(',');
  const rows = await query(
    `SELECT image_group, COUNT(*) AS total
     FROM merchant_hotel_images
     WHERE merchant_user_id = ?
       AND image_group IN (${placeholders})
     GROUP BY image_group`,
    [merchantUserId, ...reviewRequiredImageGroups]
  );

  const counters = rows.reduce((acc, row) => {
    acc[row.image_group] = Number(row.total) || 0;
    return acc;
  }, {});

  for (const groupKey of reviewRequiredImageGroups) {
    if ((counters[groupKey] || 0) < 1) {
      return {
        ok: false,
        field: `hotelImages.${groupKey}`,
        message: `${hotelImageGroupLabels[groupKey]}至少上传 1 张后才能提交审核`,
      };
    }
  }

  return { ok: true };
};

const validateReviewRequiredCertificates = async (merchantUserId) => {
  await ensureMerchantHotelCertificatesTable();
  const placeholders = reviewRequiredCertificateGroups.map(() => '?').join(',');
  const rows = await query(
    `SELECT cert_group, COUNT(*) AS total
     FROM merchant_hotel_certificates
     WHERE merchant_user_id = ?
       AND cert_group IN (${placeholders})
     GROUP BY cert_group`,
    [merchantUserId, ...reviewRequiredCertificateGroups]
  );

  const counters = rows.reduce((acc, row) => {
    acc[row.cert_group] = Number(row.total) || 0;
    return acc;
  }, {});

  for (const groupKey of reviewRequiredCertificateGroups) {
    if ((counters[groupKey] || 0) < 1) {
      return {
        ok: false,
        field: `hotelCertificates.${groupKey}`,
        message: `${hotelCertificateGroupLabels[groupKey]}至少上传 1 张后才能提交审核`,
      };
    }
  }

  return { ok: true };
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
    const editableResult = await ensureMerchantHotelEditable(req.user.id);
    if (!editableResult.ok) {
      return res.json(validationFail(editableResult.message, editableResult.field));
    }

    const validated = validateHotelProfilePayload(req.body, { strictRequired: false });
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    await saveHotelProfile(req.user.id, validated.payload, {
      reviewStatus: resolveReviewStatusAfterSave(editableResult.reviewStatus),
    });
    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);

    res.json(success(mapHotelProfile(hotelProfile), '酒店信息保存成功'));
  } catch (error) {
    console.error('保存酒店信息失败:', error);
    res.json(serverFail('保存酒店信息失败，请稍后重试'));
  }
};

exports.getHotelImages = async (req, res) => {
  try {
    await ensureMerchantHotelImagesTable();
    const rows = await getHotelImagesByMerchantId(req.user.id);
    res.json(success(groupHotelImages(rows), '获取酒店图片成功'));
  } catch (error) {
    console.error('获取酒店图片失败:', error);
    res.json(serverFail('获取酒店图片失败，请稍后重试'));
  }
};

const cleanupUploadedTempFile = (file) => {
  if (!file?.path || !fs.existsSync(file.path)) {
    return;
  }
  fs.unlinkSync(file.path);
};

exports.uploadHotelImage = (req, res) => {
  hotelImageUpload(req, res, async (err) => {
    try {
      await ensureMerchantHotelImagesTable();
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.json(validationFail('酒店图片不能超过 5MB', 'image'));
        }
        return res.json(validationFail(err.message || '上传酒店图片失败', 'image'));
      }

      const imageGroup = safeTrim(req.body?.group);
      if (!hotelImageGroupList.includes(imageGroup)) {
        cleanupUploadedTempFile(req.file);
        return res.json(validationFail('请选择合法的图片分组', 'group'));
      }

      if (!req.file) {
        return res.json(validationFail('请选择需要上传的图片', 'image'));
      }

      const insertedImage = await withTransaction(async (tx) => {
        await lockMerchantRow(tx, req.user.id);
        const editableResult = await ensureMerchantHotelEditable(req.user.id, tx);
        if (!editableResult.ok) {
          throw createHandlerError('validation', editableResult.message, editableResult.field);
        }

        const existingCountRows = await runQuery(
          tx,
          'SELECT COUNT(*) AS total FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? FOR UPDATE',
          [req.user.id, imageGroup]
        );
        const currentCount = Number(existingCountRows?.[0]?.total || 0);
        const maxCount = hotelImageGroupLimits[imageGroup];
        if (currentCount >= maxCount) {
          throw createHandlerError(
            'validation',
            `${hotelImageGroupLabels[imageGroup]}最多上传 ${maxCount} 张`,
            `hotelImages.${imageGroup}`
          );
        }

        const nextSortRows = await runQuery(
          tx,
          'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? FOR UPDATE',
          [req.user.id, imageGroup]
        );
        const nextSort = Number(nextSortRows?.[0]?.nextSort || 1);
        const filePath = `/uploads/hotel-images/${req.file.filename}`;

        const insertResult = await runQuery(
          tx,
          'INSERT INTO merchant_hotel_images (merchant_user_id, image_group, file_path, file_name, mime_type, size_bytes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            req.user.id,
            imageGroup,
            filePath,
            req.file.originalname || '',
            req.file.mimetype || '',
            Number(req.file.size) || 0,
            nextSort,
          ]
        );

        const [row] = await runQuery(
          tx,
          'SELECT * FROM merchant_hotel_images WHERE id = ? LIMIT 1',
          [insertResult.insertId]
        );
        return row;
      });

      res.json(success({ image: mapHotelImage(insertedImage) }, '酒店图片上传成功'));
    } catch (error) {
      cleanupUploadedTempFile(req.file);
      if (error.kind === 'validation') {
        return res.json(validationFail(error.message, error.field || 'image'));
      }
      console.error('上传酒店图片失败:', error);
      res.json(serverFail('上传酒店图片失败，请稍后重试'));
    }
  });
};

exports.deleteHotelImage = async (req, res) => {
  try {
    await ensureMerchantHotelImagesTable();
    const imageId = Number(req.params.id);
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return res.json(validationFail('图片 ID 不合法', 'id'));
    }

    await withTransaction(async (tx) => {
      await lockMerchantRow(tx, req.user.id);
      const editableResult = await ensureMerchantHotelEditable(req.user.id, tx);
      if (!editableResult.ok) {
        throw createHandlerError('validation', editableResult.message, editableResult.field);
      }
      const [targetImage] = await runQuery(
        tx,
        `SELECT * FROM merchant_hotel_images
         WHERE id = ? AND merchant_user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [imageId, req.user.id]
      );

      if (!targetImage) {
        throw createHandlerError('notFound', '图片不存在或无权限删除', 'id');
      }

      await runQuery(
        tx,
        `DELETE FROM merchant_hotel_images WHERE id = ? AND merchant_user_id = ?`,
        [imageId, req.user.id]
      );

      const fileResult = deleteLocalHotelImageSafely(targetImage.file_path);
      if (!fileResult.ok && !fileResult.missing) {
        throw createHandlerError('server', fileResult.message || '删除本地图片文件失败');
      }
    });

    res.json(success(null, '酒店图片删除成功'));
  } catch (error) {
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'id'));
    }
    console.error('删除酒店图片失败:', error);
    res.json(serverFail('删除酒店图片失败，请稍后重试'));
  }
};

exports.getHotelCertificates = async (req, res) => {
  try {
    await ensureMerchantHotelCertificatesTable();
    const rows = await getHotelCertificatesByMerchantId(req.user.id);
    res.json(success(groupHotelCertificates(rows), '获取资质证件成功'));
  } catch (error) {
    console.error('获取资质证件失败:', error);
    res.json(serverFail('获取资质证件失败，请稍后重试'));
  }
};

exports.uploadHotelCertificate = (req, res) => {
  hotelCertificateUpload(req, res, async (err) => {
    try {
      await ensureMerchantHotelCertificatesTable();
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.json(validationFail('资质证件不能超过 5MB', 'image'));
        }
        return res.json(validationFail(err.message || '上传资质证件失败', 'image'));
      }

      const certGroup = safeTrim(req.body?.group);
      if (!hotelCertificateGroupList.includes(certGroup)) {
        cleanupUploadedTempFile(req.file);
        return res.json(validationFail('请选择合法的资质证件分组', 'group'));
      }

      if (!req.file) {
        return res.json(validationFail('请选择需要上传的证件图片', 'image'));
      }

      const insertedCertificate = await withTransaction(async (tx) => {
        await lockMerchantRow(tx, req.user.id);
        const editableResult = await ensureMerchantHotelEditable(req.user.id, tx);
        if (!editableResult.ok) {
          throw createHandlerError('validation', editableResult.message, editableResult.field);
        }

        const existingCountRows = await runQuery(
          tx,
          `SELECT COUNT(*) AS total
           FROM merchant_hotel_certificates
           WHERE merchant_user_id = ? AND cert_group = ?
           FOR UPDATE`,
          [req.user.id, certGroup]
        );
        const currentCount = Number(existingCountRows?.[0]?.total || 0);
        const maxCount = hotelCertificateGroupLimits[certGroup];
        if (currentCount >= maxCount) {
          throw createHandlerError(
            'validation',
            `${hotelCertificateGroupLabels[certGroup]}最多上传 ${maxCount} 张`,
            `hotelCertificates.${certGroup}`
          );
        }

        const nextSortRows = await runQuery(
          tx,
          `SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort
           FROM merchant_hotel_certificates
           WHERE merchant_user_id = ? AND cert_group = ?
           FOR UPDATE`,
          [req.user.id, certGroup]
        );
        const nextSort = Number(nextSortRows?.[0]?.nextSort || 1);
        const filePath = `/uploads/hotel-certificates/${req.file.filename}`;

        const insertResult = await runQuery(
          tx,
          `INSERT INTO merchant_hotel_certificates
            (merchant_user_id, cert_group, file_path, file_name, mime_type, size_bytes, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            certGroup,
            filePath,
            req.file.originalname || '',
            req.file.mimetype || '',
            Number(req.file.size) || 0,
            nextSort,
          ]
        );

        const [row] = await runQuery(
          tx,
          `SELECT * FROM merchant_hotel_certificates WHERE id = ? LIMIT 1`,
          [insertResult.insertId]
        );
        return row;
      });

      res.json(success({ image: mapHotelCertificate(insertedCertificate) }, '资质证件上传成功'));
    } catch (error) {
      cleanupUploadedTempFile(req.file);
      if (error.kind === 'validation') {
        return res.json(validationFail(error.message, error.field || 'image'));
      }
      console.error('上传资质证件失败:', error);
      res.json(serverFail('上传资质证件失败，请稍后重试'));
    }
  });
};

exports.deleteHotelCertificate = async (req, res) => {
  try {
    await ensureMerchantHotelCertificatesTable();
    const certificateId = Number(req.params.id);
    if (!Number.isInteger(certificateId) || certificateId <= 0) {
      return res.json(validationFail('证件 ID 不合法', 'id'));
    }

    await withTransaction(async (tx) => {
      await lockMerchantRow(tx, req.user.id);
      const editableResult = await ensureMerchantHotelEditable(req.user.id, tx);
      if (!editableResult.ok) {
        throw createHandlerError('validation', editableResult.message, editableResult.field);
      }
      const [targetCertificate] = await runQuery(
        tx,
        `SELECT * FROM merchant_hotel_certificates
         WHERE id = ? AND merchant_user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [certificateId, req.user.id]
      );

      if (!targetCertificate) {
        throw createHandlerError('notFound', '证件不存在或无权限删除', 'id');
      }

      await runQuery(
        tx,
        `DELETE FROM merchant_hotel_certificates WHERE id = ? AND merchant_user_id = ?`,
        [certificateId, req.user.id]
      );

      const fileResult = deleteLocalHotelCertificateSafely(targetCertificate.file_path);
      if (!fileResult.ok && !fileResult.missing) {
        throw createHandlerError('server', fileResult.message || '删除本地证件文件失败');
      }
    });

    res.json(success(null, '资质证件删除成功'));
  } catch (error) {
    if (error.kind === 'notFound') {
      return res.json(notFoundFail(error.message, error.field || 'id'));
    }
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'id'));
    }
    console.error('删除资质证件失败:', error);
    res.json(serverFail('删除资质证件失败，请稍后重试'));
  }
};

exports.sortHotelImages = async (req, res) => {
  try {
    await ensureMerchantHotelImagesTable();
    const imageGroup = safeTrim(req.body?.group);
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
      : [];

    if (!hotelImageGroupList.includes(imageGroup)) {
      return res.json(validationFail('请选择合法的图片分组', 'group'));
    }

    if (!orderedIds.length) {
      return res.json(validationFail('排序列表不能为空', 'orderedIds'));
    }

    if (new Set(orderedIds).size !== orderedIds.length) {
      return res.json(validationFail('排序列表包含重复图片', 'orderedIds'));
    }

    const latestRows = await withTransaction(async (tx) => {
      await lockMerchantRow(tx, req.user.id);
      const editableResult = await ensureMerchantHotelEditable(req.user.id, tx);
      if (!editableResult.ok) {
        throw createHandlerError('validation', editableResult.message, editableResult.field);
      }
      const rows = await runQuery(
        tx,
        `SELECT * FROM merchant_hotel_images
         WHERE merchant_user_id = ? AND image_group = ?
         ORDER BY sort_order ASC, id ASC
         FOR UPDATE`,
        [req.user.id, imageGroup]
      );
      const currentIds = rows.map((row) => Number(row.id));
      if (currentIds.length !== orderedIds.length) {
        throw createHandlerError('validation', '排序数量与分组内图片数量不一致', 'orderedIds');
      }

      const idSet = new Set(currentIds);
      const allMatch = orderedIds.every((id) => idSet.has(id));
      if (!allMatch) {
        throw createHandlerError('validation', '排序列表包含无效图片', 'orderedIds');
      }

      const caseSql = orderedIds.map(() => 'WHEN ? THEN ?').join(' ');
      const caseValues = [];
      orderedIds.forEach((id, index) => {
        caseValues.push(id, index + 1);
      });
      const inPlaceholders = orderedIds.map(() => '?').join(', ');

      await runQuery(
        tx,
        `UPDATE merchant_hotel_images
         SET sort_order = CASE id ${caseSql} END
         WHERE merchant_user_id = ? AND image_group = ? AND id IN (${inPlaceholders})`,
        [...caseValues, req.user.id, imageGroup, ...orderedIds]
      );

      return getHotelImagesByMerchantId(req.user.id, imageGroup, tx);
    });

    res.json(
      success(
        {
          group: imageGroup,
          images: latestRows.map(mapHotelImage),
        },
        '酒店图片排序成功'
      )
    );
  } catch (error) {
    if (error.kind === 'validation') {
      return res.json(validationFail(error.message, error.field || 'orderedIds'));
    }
    console.error('排序酒店图片失败:', error);
    res.json(serverFail('排序酒店图片失败，请稍后重试'));
  }
};

// ====================== 修复：复用 save 逻辑，不手写重复 SQL ======================
exports.submitHotelProfileReview = async (req, res) => {
  try {
    const editableResult = await ensureMerchantHotelEditable(req.user.id);
    if (!editableResult.ok) {
      return res.json(validationFail(editableResult.message, editableResult.field));
    }

    const validated = validateHotelProfilePayload(req.body, { strictRequired: true });
    if (!validated.payload) {
      return res.json(validationFail(validated.message, validated.field));
    }

    await saveHotelProfile(req.user.id, validated.payload, {
      reviewStatus: resolveReviewStatusAfterSave(editableResult.reviewStatus),
    });

    const reviewImageValidation = await validateReviewRequiredImages(req.user.id);
    if (!reviewImageValidation.ok) {
      return res.json(validationFail(reviewImageValidation.message, reviewImageValidation.field));
    }
    const reviewCertificateValidation = await validateReviewRequiredCertificates(req.user.id);
    if (!reviewCertificateValidation.ok) {
      return res.json(validationFail(reviewCertificateValidation.message, reviewCertificateValidation.field));
    }

    await query(
      `UPDATE merchant_hotels 
       SET review_status = 'reviewing' 
       WHERE merchant_user_id = ?`,
      [req.user.id]
    );

    const hotelProfile = await getHotelProfileByMerchantId(req.user.id);
    res.json(success(mapHotelProfile(hotelProfile), '酒店信息已提交审核'));
  } catch (error) {
    console.error('提交审核失败:', error);
    res.json(serverFail('提交审核失败，请稍后重试'));
  }
};

