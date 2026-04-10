import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import Loading from '../components/Loading';

// 权限守卫组件
export const AuthGuard = ({ meta, children }) => {
  const { userInfo, token, initialized } = useSelector(state => state.user);

  // 1. 未初始化（正在获取用户信息）→ 等待
  if (!initialized) {
    return <Loading />;
  }

  // 2. 没登录 → 跳登录
  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  // 3. 已登录但需要权限验证，且角色不匹配 → 跳 NotFound
  if (meta?.requiresAuth && userInfo.role !== meta.role) {
    return <Navigate to="/404" replace />;
  }

  // 4. 权限通过 → 渲染子组件
  return children;
};
