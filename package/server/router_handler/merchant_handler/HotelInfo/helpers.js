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
const { safeTrim } = require('../../utils/common');
const { deleteLocalUploadSafely } = require('../../utils/files');

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

const deleteLocalHotelImageSafely = (filePath) => {
  return deleteLocalUploadSafely(filePath, '/uploads/hotel-images/');
};

const deleteLocalHotelCertificateSafely = (filePath) => {
  return deleteLocalUploadSafely(filePath, '/uploads/hotel-certificates/');
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
  fileName: row.file_name || '',
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
  fileName: row.file_name || '',
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

module.exports = {
  normalizeTags,
  normalizeFacilitySelections,
  normalizeCustomFacilities,
  deleteLocalHotelImageSafely,
  deleteLocalHotelCertificateSafely,
  groupHotelImages,
  groupHotelCertificates,
};
