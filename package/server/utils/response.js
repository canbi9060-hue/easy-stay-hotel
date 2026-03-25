// server/utils/response.js

/**
 * 统一成功响应
 * @param {any} data 返回数据
 * @param {string} msg 提示信息
 * @returns {object} 标准化响应体
 */
exports.success = (data = null, msg = '操作成功') => {
  return {
    code: 0,               // 业务状态码（0=成功）
    msg: msg,              // 提示信息
    data: data,            // 业务数据
    timestamp: Date.now()  // 响应时间戳（便于排查问题）
  };
};

/**
 * 统一失败响应
 * @param {string} msg 错误提示
 * @param {number} code 业务错误码（默认400=通用错误）
 * @param {any} data 附加数据（如错误字段名，可选）
 * @returns {object} 标准化响应体
 */
exports.fail = (msg = '操作失败', code = 400, data = null) => {
  // 预设错误类型映射（语义化，便于前端分类处理）
  const errorTypeMap = {
    400: 'BAD_REQUEST',        // 通用参数错误
    401: 'UNAUTHORIZED',       // 未登录/密码错误
    404: 'NOT_FOUND',          // 资源不存在
    422: 'VALIDATION_ERROR',   // 表单验证错误
    500: 'SERVER_ERROR'        // 服务器内部错误
  };

  return {
    code: code,                     // 业务错误码
    msg: msg,                       // 具体错误信息
    data: data || null,             // 附加数据（如错误字段）
    errorType: errorTypeMap[code] || 'UNKNOWN_ERROR', // 错误类型
    timestamp: Date.now()           // 响应时间戳
  };
};

// ========== 快捷错误函数（补充 field 参数） ==========
/**
 * 表单验证错误（如格式错误、验证码错误）
 * @param {string} msg 错误信息
 * @param {string} field 错误字段名（前端可直接定位）
 * @returns {object}
 */
exports.validationFail = (msg, field = '') => {
  return exports.fail(msg, 422, { field });
};

/**
 * 认证错误（如密码错误、Token失效）
 * @param {string} msg 错误信息
 * @param {string} field 错误字段名（前端可直接定位）
 * @returns {object}
 */
exports.authFail = (msg, field = '') => {
  return exports.fail(msg, 401, { field }); // 关键：传递 field 到 data 中
};

/**
 * 资源不存在错误（如账号不存在）
 * @param {string} msg 错误信息
 * @param {string} field 错误字段名（前端可直接定位）
 * @returns {object}
 */
exports.notFoundFail = (msg, field = '') => {
  return exports.fail(msg, 404, { field }); // 关键：传递 field 到 data 中
};

/**
 * 服务器内部错误（屏蔽敏感信息）
 * @param {string} msg 错误信息（默认友好提示）
 * @returns {object}
 */
exports.serverFail = (msg = '服务器内部错误，请稍后重试') => {
  return exports.fail(msg, 500);
};