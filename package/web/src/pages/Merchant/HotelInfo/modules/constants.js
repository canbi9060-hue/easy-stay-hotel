export const hotelInfoTabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'images', label: '酒店图片' },
  { key: 'facilities', label: '设施设备' },
  { key: 'certificates', label: '资质证件' },
];

export const hotelInfoPlaceholderCopy = {
  images: '酒店图片模块正在建设中，后续会补充封面图、详情图和展示排序能力。',
  facilities: '设施设备模块正在建设中，后续会补充设备勾选、分组展示和补充说明。',
  certificates: '资质证件模块正在建设中，后续会补充证件上传与审核管理能力。',
};

export const hotelImageGroups = [
  {
    key: 'signboard',
    title: '店招图片',
    desc: '主入口、门头或建筑外观。支持 JPG/PNG，单张不超过 5MB。',
    maxCount: 2,
  },
  {
    key: 'frontdesk',
    title: '前台图片',
    desc: '前台接待区域全景及细节展示。',
    maxCount: 3,
  },
  {
    key: 'facility',
    title: '环境与设施',
    desc: '餐厅、泳池、健身房、走廊等公共设施展示。',
    maxCount: 4,
  },
  {
    key: 'carousel',
    title: '轮播图（APP/小程序首页）',
    desc: '建议尺寸 750x422，最多上传 5 张。',
    maxCount: 5,
  },
];

export const certificateGroups = [
  {
    key: 'business_license',
    title: '营业执照',
    subtitle: '支持 JPG/PNG 格式，单张最大 5MB',
    maxCount: 1,
    columns: 2,
  },
  {
    key: 'legal_person_identity',
    title: '法人身份证',
    columns: 2,
    children: [
      { key: 'legal_person_front', title: '身份证人像面', maxCount: 1 },
      { key: 'legal_person_back', title: '身份证国徽面', maxCount: 1 },
    ],
  },
  {
    key: 'special_permit',
    title: '特种行业许可证',
    maxCount: 1,
    columns: 1,
  },
  {
    key: 'other_qualification',
    title: '其他资质证明',
    maxCount: 3,
    columns: 3,
  },
];

export const certificateLeafGroups = [
  { key: 'business_license', title: '营业执照', maxCount: 1 },
  { key: 'legal_person_front', title: '法人身份证人像面', maxCount: 1 },
  { key: 'legal_person_back', title: '法人身份证国徽面', maxCount: 1 },
  { key: 'special_permit', title: '特种行业许可证', maxCount: 1 },
  { key: 'other_qualification', title: '其他资质证明', maxCount: 3 },
];

export const createEmptyHotelImages = () => ({
  signboard: [],
  frontdesk: [],
  facility: [],
  carousel: [],
});

export const createEmptyHotelCertificates = () => ({
  business_license: [],
  legal_person_front: [],
  legal_person_back: [],
  special_permit: [],
  other_qualification: [],
});

export const createEmptyImageGroupFlags = (defaultValue = false) =>
  hotelImageGroups.reduce((acc, group) => {
    acc[group.key] = defaultValue;
    return acc;
  }, {});

export const createEmptyCertificateGroupFlags = (defaultValue = false) =>
  certificateLeafGroups.reduce((acc, group) => {
    acc[group.key] = defaultValue;
    return acc;
  }, {});

export const removeKey = (target, key) => {
  if (!target || !(key in target)) return target;
  const next = { ...target };
  delete next[key];
  return next;
};

const mapFileItem = (item, defaultKey) => ({
  id: item?.id,
  group: item?.group || defaultKey,
  filePath: item?.filePath || '',
  sortOrder: Number(item?.sortOrder) || 0,
  sizeBytes: Number(item?.sizeBytes) || 0,
  mimeType: item?.mimeType || '',
  createdAt: item?.createdAt || '',
});

export const normalizeHotelImagesPayload = (payload) => {
  const base = createEmptyHotelImages();
  if (!payload || typeof payload !== 'object') {
    return base;
  }
  hotelImageGroups.forEach(({ key }) => {
    const list = Array.isArray(payload[key]) ? payload[key] : [];
    base[key] = list.map((item) => mapFileItem(item, key));
  });
  return base;
};

export const normalizeHotelCertificatesPayload = (payload) => {
  const base = createEmptyHotelCertificates();
  if (!payload || typeof payload !== 'object') {
    return base;
  }
  certificateLeafGroups.forEach(({ key }) => {
    const list = Array.isArray(payload[key]) ? payload[key] : [];
    base[key] = list.map((item) => mapFileItem(item, key));
  });
  return base;
};
