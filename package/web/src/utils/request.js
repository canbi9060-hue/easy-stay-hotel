import axios from 'axios';

const request = axios.create({
  baseURL: 'http://127.0.0.1:3007/api',
  timeout: 10000
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器（精准解析后端 field 字段）
// data: { code:0, msg:"登录成功", data: { token:"xxx", user:{...} } }, // 后端实际返回的内容
request.interceptors.response.use(
  response => {
    const { data } = response;
    if (data.code === 0) {
      return data;
    }
    // 业务失败：解析后端返回的 field（在 data.data.field 中）
    return Promise.reject({
      errorMsg: data.msg || '请求失败',
      field: data.data?.field || '', // 核心：取后端返回的错误字段名
      errorCode: data.code || 400,
      errorType: data.errorType || 'UNKNOWN_ERROR',
      response: response
    });
  },
  error => {
    let errorMsg = '网络异常，请稍后重试';
    let field = '';
    let errorCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.response) {
      const res = error.response.data;
      errorMsg = res.msg || `请求失败（${error.response.status}）`;
      field = res.data?.field || ''; // 兼容后端有响应的情况
      errorCode = res.code || error.response.status;
      errorType = res.errorType || 'UNKNOWN_ERROR';
    } else if (error.message) {
      errorMsg = error.message;
    }

    // 401未登录：清除登录态并跳转登录页
    if (errorCode === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject({
      errorMsg,
      field,
      errorCode,
      errorType,
      originalError: error
    });
  }
);

// API封装
export const captchaAPI = {
  getCaptcha: (captchaId) => request.get('/auth/captcha', { params: { captchaId } })
};
export const loginAPI = (data) => request.post('/auth/login', data);
export const registerAPI = (data) => request.post('/auth/register', data);
export const forgetPasswordAPI = (data) => request.post('/auth/forget-password', data);
export const getUserInfoAPI = () => request.get('/auth/info');
export default request;