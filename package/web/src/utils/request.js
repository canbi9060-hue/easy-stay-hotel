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
      errorMsg: data?.msg || '请求失败，请稍后重试。',
      field: data?.data?.field || '',
      errorCode: data?.code || 400,
      errorType: data?.errorType || 'UNKNOWN_ERROR',
      response,
    });
  },
  (error) => {
    let errorMsg = '网络异常，请稍后重试。';
    let field = '';
    let errorCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.response) {
      const res = error.response.data;
      errorMsg = res?.msg || `请求失败（状态码：${error.response.status}）`;
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

export const getRequestErrorMessage = (error, fallback = '请求失败，请稍后重试。') =>
  error?.errorMsg || error?.message || fallback;

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
export const updateMerchantHotelProfileAPI = (data) =>
  request.put('/merchant/hotel-profile', data, data instanceof FormData ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined);
export const submitMerchantHotelProfileReviewAPI = (data) =>
  request.post('/merchant/hotel-profile/submit-review', data, data instanceof FormData ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined);
export const getMerchantHotelImagesAPI = () => request.get('/merchant/hotel-images');
export const getMerchantHotelCertificatesAPI = () => request.get('/merchant/hotel-certificates');
export const getMerchantRoomTypesAPI = (params) => request.get('/merchant/room-types', { params });
export const getMerchantRoomTypeSuggestionsAPI = (params) => request.get('/merchant/room-types/suggestions', { params });
export const getMerchantRoomTypeDetailAPI = (id) => request.get(`/merchant/room-types/${id}`);
export const createMerchantRoomTypeAPI = (formData) =>
  request.post('/merchant/room-types', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
export const updateMerchantRoomTypeAPI = (id, formData) =>
  request.put(`/merchant/room-types/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
export const updateMerchantRoomTypeSaleStatusAPI = (id, data) => request.patch(`/merchant/room-types/${id}/on-sale`, data);
export const batchUpdateMerchantRoomTypeSaleStatusAPI = (data) => request.patch('/merchant/room-types/on-sale/batch', data);
export const deleteMerchantRoomTypeAPI = (id) => request.delete(`/merchant/room-types/${id}`);
export const getAdminRoomTypesAPI = (params) => request.get('/admin/room-types', { params });
export const getAdminRoomTypeDetailAPI = (id) => request.get(`/admin/room-types/${id}`);
export const auditAdminRoomTypeAPI = (id, data) => request.patch(`/admin/room-types/${id}/audit`, data);

export default request;
