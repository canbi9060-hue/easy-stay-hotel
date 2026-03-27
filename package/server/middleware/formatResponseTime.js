const isoDateTimeRegex =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const formatIsoDateTime = (value) => {
  const matched = String(value).match(isoDateTimeRegex);
  if (!matched) {
    return value;
  }

  return `${matched[1]} ${matched[2]}`;
};

const formatDateInstance = (value) => {
  return formatIsoDateTime(value.toISOString());
};

const transformResponseDates = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map((item) => transformResponseDates(item));
  }

  if (payload instanceof Date) {
    return formatDateInstance(payload);
  }

  if (payload && typeof payload === 'object') {
    return Object.keys(payload).reduce((result, key) => {
      result[key] = transformResponseDates(payload[key]);
      return result;
    }, {});
  }

  if (typeof payload === 'string') {
    return formatIsoDateTime(payload);
  }

  return payload;
};

const formatResponseTime = (_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    return originalJson(transformResponseDates(payload));
  };

  next();
};

module.exports = {
  formatResponseTime,
  formatDateInstance,
  formatIsoDateTime,
  transformResponseDates,
};
