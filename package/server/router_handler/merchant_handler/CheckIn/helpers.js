const { safeTrim } = require('../../utils/common');
const {
  stayOrderSourceType,
  stayOrderStatus,
  stayGuestGender,
  stayPaymentMethod,
  checkInGuestCountLimit,
} = require('./constants');

const mapReviewStatusBlockReason = {
  incomplete: '请先完善并提交酒店信息审核，通过后才能办理入住。',
  reviewing: '酒店信息正在审核中，审核通过后才能办理入住。',
  rejected_pending_fix: '酒店信息未通过审核，请先修改并重新提交审核。',
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

const toPositiveInt = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

const toNonNegativeInt = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : null;
};

const normalizeYuanToCents = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }
  return Math.round(numericValue * 100);
};

const parseDateText = (value) => {
  const text = safeTrim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const date = Number(text.slice(8, 10));
  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() + 1 !== month
    || parsed.getDate() !== date
  ) {
    return null;
  }

  return {
    text,
    date: parsed,
  };
};

const toDateText = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getNowDateText = () => toDateText(new Date());

const toDateTimeText = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getDateDiffDays = (startDate, endDate) => Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);

const calcStayNights = (startDate, endDate) => Math.max(1, getDateDiffDays(startDate, endDate));

const calcRoomChargeCents = (nightlyPriceCents, stayNights) => {
  const unit = toNonNegativeInt(nightlyPriceCents) || 0;
  const nights = toPositiveInt(stayNights) || 1;
  return unit * nights;
};

const calcBalanceCents = ({
  roomChargeCents,
  depositCents,
  settlementPaidCents,
}) => {
  const roomCharge = toNonNegativeInt(roomChargeCents) || 0;
  const deposit = toNonNegativeInt(depositCents) || 0;
  const paid = toNonNegativeInt(settlementPaidCents) || 0;
  return roomCharge - deposit - paid;
};

const normalizeGuestGender = (value, fallback = stayGuestGender.unknown) => {
  const gender = safeTrim(value);
  if (gender === stayGuestGender.male || gender === stayGuestGender.female) {
    return gender;
  }
  return fallback;
};

const normalizePaymentMethod = (value) => {
  const method = safeTrim(value);
  if (Object.values(stayPaymentMethod).includes(method)) {
    return method;
  }
  return stayPaymentMethod.cash;
};

const getCheckInBlockReason = (reviewStatus) => (
  mapReviewStatusBlockReason[reviewStatus] || mapReviewStatusBlockReason.incomplete
);

const resolveGuestCountLimit = (roomTypeMaxGuests) => {
  const roomMaxGuests = toPositiveInt(roomTypeMaxGuests) || 1;
  return Math.min(checkInGuestCountLimit, roomMaxGuests);
};

const generateStayOrderNo = () => {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `CI${datePart}${randomPart}`;
};

const mapStayOrderSummary = (row) => ({
  id: Number(row?.id) || 0,
  merchantUserId: Number(row?.merchant_user_id) || 0,
  orderNo: row?.order_no || '',
  sourceType: row?.source_type || stayOrderSourceType.walkIn,
  status: row?.status || stayOrderStatus.reserved,
  roomId: Number(row?.room_id) || 0,
  roomNumber: row?.room_number_snapshot || row?.room_number || '',
  roomTypeIdSnapshot: Number(row?.room_type_id_snapshot) || 0,
  roomTypeNameSnapshot: row?.room_type_name_snapshot || '',
  guestCount: Number(row?.guest_count) || 1,
  primaryGuestName: row?.primary_guest_name || '',
  primaryGuestIdNo: row?.primary_guest_id_no || '',
  primaryGuestPhone: row?.primary_guest_phone || '',
  primaryGuestGender: row?.primary_guest_gender || stayGuestGender.unknown,
  plannedCheckInDate: toDateText(row?.planned_check_in_date),
  plannedCheckOutDate: toDateText(row?.planned_check_out_date),
  actualCheckInAt: row?.actual_check_in_at || '',
  actualCheckOutAt: row?.actual_check_out_at || '',
  nightlyPriceCents: Number(row?.nightly_price_cents) || 0,
  stayNights: Number(row?.stay_nights) || 1,
  roomChargeCents: Number(row?.room_charge_cents) || 0,
  depositCents: Number(row?.deposit_cents) || 0,
  settlementPaidCents: Number(row?.settlement_paid_cents) || 0,
  balanceCents: Number(row?.balance_cents) || 0,
  paymentMethod: row?.payment_method || stayPaymentMethod.cash,
  remark: row?.remark || '',
  createdAt: row?.created_at || '',
  updatedAt: row?.updated_at || '',
});

const mapStayGuest = (row) => ({
  id: Number(row?.id) || 0,
  stayOrderId: Number(row?.stay_order_id) || 0,
  merchantUserId: Number(row?.merchant_user_id) || 0,
  isPrimary: Number(row?.is_primary) === 1 ? 1 : 0,
  name: row?.name || '',
  idNo: row?.id_no || '',
  phone: row?.phone || '',
  gender: row?.gender || stayGuestGender.unknown,
});

const mapStayExtension = (row) => ({
  id: Number(row?.id) || 0,
  stayOrderId: Number(row?.stay_order_id) || 0,
  merchantUserId: Number(row?.merchant_user_id) || 0,
  oldCheckoutDate: toDateText(row?.old_checkout_date),
  newCheckoutDate: toDateText(row?.new_checkout_date),
  addedNights: Number(row?.added_nights) || 0,
  addedAmountCents: Number(row?.added_amount_cents) || 0,
  remark: row?.remark || '',
  createdAt: row?.created_at || '',
});

const mapStayOrderDetail = (row, guests = [], extensions = []) => ({
  ...mapStayOrderSummary(row),
  guests: guests.map(mapStayGuest),
  extensions: extensions.map(mapStayExtension),
});

module.exports = {
  stayOrderSourceType,
  stayOrderStatus,
  stayGuestGender,
  stayPaymentMethod,
  toPositiveInt,
  toNonNegativeInt,
  normalizeYuanToCents,
  parseDateText,
  toDateText,
  getNowDateText,
  toDateTimeText,
  getDateDiffDays,
  calcStayNights,
  calcRoomChargeCents,
  calcBalanceCents,
  normalizeGuestGender,
  normalizePaymentMethod,
  getCheckInBlockReason,
  resolveGuestCountLimit,
  generateStayOrderNo,
  mapStayOrderSummary,
  mapStayGuest,
  mapStayExtension,
  mapStayOrderDetail,
};
