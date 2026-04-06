const buildRandomSuffix = (prefix) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

export const createEmptyGroupedMedia = (groups = []) =>
  groups.reduce((acc, group) => {
    acc[group.key] = [];
    return acc;
  }, {});

export const flattenGroupedMediaItems = (groupedItems) =>
  Object.values(groupedItems || {}).flatMap((items) => (Array.isArray(items) ? items : []));

export const createExistingMediaItem = (item, resolveImageUrl, options = {}) => {
  const id = Number(item?.id) || 0;
  const fallbackName = options.fallbackName || 'image.png';
  const groupKey = options.group || item?.group || '';

  return {
    uid: id > 0 ? `existing-${id}` : buildRandomSuffix('existing'),
    kind: 'existing',
    id,
    group: groupKey,
    name: item?.fileName || item?.filePath?.split('/')?.pop() || fallbackName,
    filePath: item?.filePath || '',
    previewUrl: resolveImageUrl(item?.filePath || ''),
    sizeBytes: Number(item?.sizeBytes) || 0,
    mimeType: item?.mimeType || '',
    createdAt: item?.createdAt || '',
  };
};

export const createNewMediaItem = ({ file, group = '', fallbackName = 'image.png' }) => ({
  uid: buildRandomSuffix('new'),
  kind: 'new',
  id: 0,
  group,
  name: file?.name || fallbackName,
  filePath: '',
  file,
  previewUrl: URL.createObjectURL(file),
  sizeBytes: Number(file?.size) || 0,
  mimeType: file?.type || '',
  createdAt: '',
});

export const revokePreviewUrls = (items = []) => {
  items.forEach((item) => {
    if (item?.kind === 'new' && item?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
};

export const createGroupedExistingMediaItems = ({
  payload,
  groups,
  resolveImageUrl,
  fallbackName = 'image.png',
}) => {
  const emptyGroups = createEmptyGroupedMedia(groups);
  const source = payload && typeof payload === 'object' ? payload : {};

  groups.forEach(({ key }) => {
    const list = Array.isArray(source[key]) ? source[key] : [];
    emptyGroups[key] = list.map((item) =>
      createExistingMediaItem(item, resolveImageUrl, {
        fallbackName,
        group: key,
      })
    );
  });

  return emptyGroups;
};

export const toUploadFileItem = (item, fallbackName = 'image.png') => ({
  uid: String(item?.uid || item?.id || buildRandomSuffix('upload')),
  name: item?.name || fallbackName,
  status: 'done',
  url: item?.previewUrl || '',
  thumbUrl: item?.previewUrl || '',
  originFileObj: item?.file,
});

export const validateImageFile = (
  file,
  {
    maxCountReached = false,
    maxSizeMb = 5,
    invalidTypeMessage = '仅支持 JPG/PNG 格式图片。',
    oversizeMessage = '单张图片不能超过 5MB。',
    countLimitMessage = '图片数量已达到上限。',
  } = {}
) => {
  if (maxCountReached) {
    return {
      valid: false,
      message: countLimitMessage,
    };
  }

  const isValidType = ['image/jpeg', 'image/png'].includes(file?.type);
  if (!isValidType) {
    return {
      valid: false,
      message: invalidTypeMessage,
    };
  }

  if (Number(file?.size) / 1024 / 1024 > maxSizeMb) {
    return {
      valid: false,
      message: oversizeMessage,
    };
  }

  return {
    valid: true,
    message: '',
  };
};

export const buildGroupedMediaSubmitPayload = (groupedItems, groups = []) => {
  const groupedPlan = {};
  const files = [];

  groups.forEach(({ key }) => {
    const list = Array.isArray(groupedItems?.[key]) ? groupedItems[key] : [];
    groupedPlan[key] = [];

    list.forEach((item) => {
      if (item?.kind === 'existing' && Number(item?.id) > 0) {
        groupedPlan[key].push(`existing:${Number(item.id)}`);
        return;
      }

      if (item?.kind === 'new' && item?.file) {
        groupedPlan[key].push(`new:${files.length}`);
        files.push(item.file);
      }
    });
  });

  return {
    groupedPlan,
    files,
  };
};

export const createMultipartFormData = (payload, fileFields = {}) => {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));

  Object.entries(fileFields).forEach(([fieldName, files]) => {
    (Array.isArray(files) ? files : []).forEach((file) => {
      formData.append(fieldName, file);
    });
  });

  return formData;
};
