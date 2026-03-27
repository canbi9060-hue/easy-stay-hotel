/**
 * 统一成功响应
 * @param {any} data 返回数据
 * @param {string} msg 提示信息
 * @returns {object}
 */
exports.success = (data = null, msg = '操作成功') => {
  return {
    code: 0,
    msg,
    data,
    timestamp: Date.now(),
  };
};

/**
 * 统一失败响应
 * @param {string} msg 错误信息
 * @param {number} code 业务错误码
 * @param {any} data 附加数据
 * @returns {object}
 */
exports.fail = (msg = '操作失败', code = 400, data = null) => {
  const errorTypeMap = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    422: 'VALIDATION_ERROR',
    500: 'SERVER_ERROR',
  };

  return {
    code,
    msg,
    data: data || null,
    errorType: errorTypeMap[code] || 'UNKNOWN_ERROR',
    timestamp: Date.now(),
  };
};

exports.validationFail = (msg, field = '') => {
  return exports.fail(msg, 422, { field });
};

exports.authFail = (msg, field = '') => {
  return exports.fail(msg, 401, { field });
};

exports.notFoundFail = (msg, field = '') => {
  return exports.fail(msg, 404, { field });
};

exports.serverFail = (msg = '服务器内部错误，请稍后重试') => {
  return exports.fail(msg, 500);
};
