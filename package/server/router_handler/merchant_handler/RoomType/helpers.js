const {
  maxFacilityTagCount,
  maxFacilityTagLength,
} = require('./constants');
const { safeTrim, parseJsonArray, parseJsonObject } = require('../../utils/common');
const { deleteLocalUploadSafely } = require('../../utils/files');

const normalizeFacilityTags = (value) => {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(
    list
      .map((item) => safeTrim(item))
      .filter(Boolean)
      .map((item) => item.slice(0, maxFacilityTagLength))
  )].slice(0, maxFacilityTagCount);
};

const normalizeIntIdList = (value) => {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(
    list
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];
};

const toNullableNumber = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

const toPriceCents = (value) => {
  const num = toNullableNumber(value);
  if (num === null) return null;
  if (Number.isNaN(num)) return NaN;
  return Math.round(num * 100);
};

const parseRoomTypeFloorText = (value) => {
  const floorText = safeTrim(value);
  if (!floorText) {
    return null;
  }

  const match = floorText.match(/^(\d+)(?:-(\d+))?层$/);
  if (!match) {
    return null;
  }

  const floorStart = Number(match[1]);
  const floorEnd = Number(match[2] || match[1]);
  if (!Number.isInteger(floorStart) || !Number.isInteger(floorEnd) || floorStart <= 0 || floorEnd < floorStart) {
    return null;
  }

  return {
    floorStart,
    floorEnd,
    floorText: floorStart === floorEnd ? `${floorStart}层` : `${floorStart}-${floorEnd}层`,
  };
};

const deleteLocalRoomTypeImageSafely = (filePath) => {
  return deleteLocalUploadSafely(filePath, '/uploads/room-type-images/');
};

const mapRoomTypeImage = (row) => ({
  id: Number(row.id),
  filePath: row.file_path,
  fileName: row.file_name || '',
  mimeType: row.mime_type || '',
  sizeBytes: Number(row.size_bytes) || 0,
  createdAt: row.created_at,
});

const mapRoomTypeDraftImage = (row) => ({
  id: Number(row.id),
  filePath: row.file_path,
  fileName: row.file_name || '',
  mimeType: row.mime_type || '',
  sizeBytes: Number(row.size_bytes) || 0,
  createdAt: row.created_at,
});

const mapRoomTypeSummary = (row) => ({
  id: Number(row.id),
  merchantUserId: Number(row.merchant_user_id),
  merchantName: row.merchant_name || row.merchant_username || '',
  roomName: row.room_name || '',
  bedConfig: row.bed_config || '',
  areaSize: row.area_size === null || row.area_size === undefined ? null : Number(row.area_size),
  floorText: row.floor_text || '',
  roomCount: Number(row.room_count) || 0,
  maxGuests: Number(row.max_guests) || 0,
  description: row.description || '',
  facilityTags: parseJsonArray(row.facility_tags),
  salePriceCents: Number(row.sale_price_cents) || 0,
  listPriceCents: Number(row.list_price_cents) || 0,
  auditStatus: Number(row.audit_status) || 0,
  auditRemark: row.audit_remark || '',
  isOnSale: Number(row.is_on_sale) || 0,
  isForcedOffSale: Number(row.is_forced_off_sale) || 0,
  coverImageFilePath: row.cover_image_file_path || '',
  imageCount: Number(row.image_count) || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  auditAt: row.audit_at,
});

const mapRoomTypeDetail = (row, images = []) => ({
  ...mapRoomTypeSummary(row),
  images: images.map(mapRoomTypeImage),
});

const mapRoomTypeDraft = (row, images = []) => {
  const draftPayload = parseJsonObject(row?.payload_json);
  const formValues = draftPayload?.formValues && typeof draftPayload.formValues === 'object' && !Array.isArray(draftPayload.formValues)
    ? draftPayload.formValues
    : {};

  return {
    roomTypeId: Number(row?.source_room_type_id) || 0,
    sourceRoomTypeId: Number(row?.source_room_type_id) || 0,
    draftType: Number(row?.source_room_type_id) > 0 ? 'edit' : 'create',
    formValues,
    images: images.map(mapRoomTypeDraftImage),
    auditStatus: Number.isInteger(Number(row?.source_audit_status)) ? Number(row.source_audit_status) : null,
    savedAt: row?.updated_at || row?.created_at || '',
    updatedAt: row?.updated_at || row?.created_at || '',
  };
};

module.exports = {
  normalizeFacilityTags,
  normalizeIntIdList,
  toNullableNumber,
  toPriceCents,
  parseRoomTypeFloorText,
  deleteLocalRoomTypeImageSafely,
  mapRoomTypeSummary,
  mapRoomTypeDetail,
  mapRoomTypeDraft,
};
