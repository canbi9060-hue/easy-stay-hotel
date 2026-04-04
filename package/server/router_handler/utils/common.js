const safeTrim = (value) => String(value ?? '').trim();
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const createHandlerError = (kind, message, field = '') => {
  const error = new Error(message);
  error.kind = kind;
  error.field = field;
  return error;
};

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
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const parseRequestObject = (value, field = 'payload') => {
  if (isPlainObject(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    throw createHandlerError('validation', '请求数据不能为空', field);
  }
  if (typeof value !== 'string') {
    throw createHandlerError('validation', '请求数据格式不合法', field);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw createHandlerError('validation', '请求数据不能为空', field);
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch (error) {
    throw createHandlerError('validation', '请求数据格式不合法', field);
  }

  throw createHandlerError('validation', '请求数据格式不合法', field);
};

module.exports = {
  safeTrim,
  parseJsonArray,
  parseJsonObject,
  parseRequestObject,
  createHandlerError,
};
