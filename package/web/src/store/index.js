import { configureStore } from '@reduxjs/toolkit';
import userReducer, { fetchUserInfo, setInitialized } from './slices/userSlice';

/**
 * Redux Store 核心配置
 * configureStore 是 Redux Toolkit 封装的便捷方法，自动集成中间件、devTools 等
 */
const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

// 初始化用户信息：如果 localStorage 中有 token，则调用 getUserInfo 获取最新用户信息
let hasInitialized = false;
const initUserInfo = () => {
  // 防止重复初始化（注册后跳主页也会触发 store 重新渲染）
  if (hasInitialized) return;
  hasInitialized = true;

  const token = localStorage.getItem("token");
  if (token) {
    store.dispatch(fetchUserInfo());
  } else {
    // 没有 token，也要标记初始化完成，让 RootRedirect 正常跳转
    store.dispatch(setInitialized());
  }
};

// 仅在首次加载时执行一次初始化
initUserInfo();

export default store;

