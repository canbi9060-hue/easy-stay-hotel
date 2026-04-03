const fs = require('fs');
const path = require('path');

const {
  maxTagCount,
  maxTagLength,
  maxCustomFacilityLength,
  maxCustomFacilityCount,
  facilityCategoryKeys,
  facilityOptionMap,
  hotelImageGroupList,
  hotelCertificateGroupList,
} = require('./constants');

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
      .map((tag) => safeTrim(tag))
      .filter(Boolean)
      .slice(0, maxTagCount)
      .map((tag) => tag.slice(0, maxTagLength))
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

const resolveServerPathByUploadPath = (filePath) => {
  return path.join(__dirname, '..', '..', '..', filePath.replace(/^\//, ''));
};

const deleteLocalHotelImageSafely = (filePath) => {
  if (!filePath || !filePath.startsWith('/uploads/hotel-images/')) {
    return { ok: false, message: '图片路径不合法' };
  }

  const absolutePath = resolveServerPathByUploadPath(filePath);
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

  const absolutePath = resolveServerPathByUploadPath(filePath);
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, missing: true };
  }

  fs.unlinkSync(absolutePath);
  return { ok: true };
};

const cleanupUploadedTempFile = (file) => {
  if (!file?.path || !fs.existsSync(file.path)) {
    return;
  }
  fs.unlinkSync(file.path);
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

const createHandlerError = (kind, message, field = '') => {
  const error = new Error(message);
  error.kind = kind;
  error.field = field;
  return error;
};

module.exports = {
  safeTrim,
  parseJsonArray,
  parseJsonObject,
  normalizeTags,
  normalizeFacilitySelections,
  normalizeCustomFacilities,
  deleteLocalHotelImageSafely,
  deleteLocalHotelCertificateSafely,
  cleanupUploadedTempFile,
  mapHotelImage,
  groupHotelImages,
  mapHotelCertificate,
  groupHotelCertificates,
  createHandlerError,
};
