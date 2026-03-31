import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:3007/api';
export const STATIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => {
    const { data } = response;

    if (data?.code === 0) {
      return data;
    }

    return Promise.reject({
      errorMsg: data?.msg || 'Request failed.',
      field: data?.data?.field || '',
      errorCode: data?.code || 400,
      errorType: data?.errorType || 'UNKNOWN_ERROR',
      response,
    });
  },
  (error) => {
    let errorMsg = 'Network error. Please try again later.';
    let field = '';
    let errorCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.response) {
      const res = error.response.data;
      errorMsg = res?.msg || `Request failed (status: ${error.response.status}).`;
      field = res?.data?.field || '';
      errorCode = res?.code || error.response.status;
      errorType = res?.errorType || 'UNKNOWN_ERROR';
    } else if (error.message) {
      errorMsg = error.message;
    }

    if (errorCode === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject({
      errorMsg,
      field,
      errorCode,
      errorType,
      originalError: error,
    });
  }
);

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//.test(filePath)) return filePath;
  return `${STATIC_BASE_URL}${filePath.startsWith('/') ? filePath : `/${filePath}`}`;
};

export const captchaAPI = {
  getCaptcha: (captchaId) => request.get('/auth/captcha', { params: { captchaId } }),
};

export const loginAPI = (data) => request.post('/auth/login', data);
export const registerAPI = (data) => request.post('/auth/register', data);
export const forgetPasswordAPI = (data) => request.post('/auth/forgetPassword', data);
export const getUserInfoAPI = () => request.get('/auth/info');
export const updateProfileAPI = (data) => request.put('/auth/profile', data);
export const uploadAvatarAPI = (formData) =>
  request.post('/auth/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const getMerchantHotelProfileAPI = () => request.get('/merchant/hotel-profile');
export const updateMerchantHotelProfileAPI = (data) => request.put('/merchant/hotel-profile', data);
export const submitMerchantHotelProfileReviewAPI = () => request.post('/merchant/hotel-profile/submit-review');

export default request;
