import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { getUserInfoAPI } from '../../utils/request';

export const fetchUserInfo = createAsyncThunk(
  'user/fetchUserInfo',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getUserInfoAPI();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.errorMsg || '获取用户信息失败');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    userInfo: null,
    token: localStorage.getItem('token') || '',
    initialized: false,
  },
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    setUserInfo: (state, action) => {
      state.userInfo = action.payload;
    },
    setInitialized: (state) => {
      state.initialized = true;
    },
    logout: (state) => {
      state.token = '';
      state.userInfo = null;
      state.initialized = true;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserInfo.fulfilled, (state, action) => {
        state.userInfo = action.payload;
        state.initialized = true;
      })
      .addCase(fetchUserInfo.rejected, (state) => {
        state.token = '';
        state.userInfo = null;
        state.initialized = true;
        localStorage.removeItem('token');
      });
  },
});

export const { setToken, setUserInfo, setInitialized, logout } = userSlice.actions;
export default userSlice.reducer;
