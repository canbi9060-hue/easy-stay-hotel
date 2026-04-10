const stayOrderSourceType = {
  walkIn: 'walk_in',
  reservation: 'reservation',
};

const stayOrderStatus = {
  reserved: 'reserved',
  checkedIn: 'checked_in',
  checkedOut: 'checked_out',
  cancelled: 'cancelled',
};

const stayGuestGender = {
  male: 'male',
  female: 'female',
  unknown: 'unknown',
};

const stayPaymentMethod = {
  cash: 'cash',
  wechat: 'wechat',
  alipay: 'alipay',
  bankCard: 'bank_card',
  other: 'other',
};

const stayOrderStatusList = Object.values(stayOrderStatus);
const stayOrderSourceTypeList = Object.values(stayOrderSourceType);
const stayPaymentMethodList = Object.values(stayPaymentMethod);
const stayGuestGenderList = Object.values(stayGuestGender);

const checkInGuestCountLimit = 4;
const defaultCheckInPageSize = 10;
const maxStayRemarkLength = 500;
const maxGuestNameLength = 30;
const maxGuestIdNoLength = 40;
const maxGuestPhoneLength = 20;

module.exports = {
  stayOrderSourceType,
  stayOrderStatus,
  stayGuestGender,
  stayPaymentMethod,
  stayOrderStatusList,
  stayOrderSourceTypeList,
  stayPaymentMethodList,
  stayGuestGenderList,
  checkInGuestCountLimit,
  defaultCheckInPageSize,
  maxStayRemarkLength,
  maxGuestNameLength,
  maxGuestIdNoLength,
  maxGuestPhoneLength,
};
