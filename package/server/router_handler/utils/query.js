const parsePageParams = (rawPage, rawPageSize, defaultPageSize, maxPageSize = 100) => {
  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);
  const safeMaxPageSize = Number.isInteger(maxPageSize) && maxPageSize > 0
    ? maxPageSize
    : 100;
  const safeDefaultPageSize = Number.isInteger(defaultPageSize) && defaultPageSize > 0
    ? Math.min(defaultPageSize, safeMaxPageSize)
    : 10;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
    ? Math.min(pageSize, safeMaxPageSize)
    : safeDefaultPageSize;

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: normalizedPageSize,
  };
};

const normalizeOptionalEnum = (value, allowList) => {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return null;
  }
  const num = Number(value);
  return allowList.includes(num) ? num : NaN;
};

module.exports = {
  parsePageParams,
  normalizeOptionalEnum,
};
