const parsePageParams = (rawPage, rawPageSize, defaultPageSize) => {
  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, defaultPageSize) : defaultPageSize,
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
