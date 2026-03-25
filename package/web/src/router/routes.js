import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
// 导入 AuthGuard 组件
import { AuthGuard } from './guard';

// 懒加载页面组件
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const ForgetPassword = lazy(() => import('../pages/Auth/ForgetPassword'));
const MerchantLayout = lazy(() => import('../pages/Merchant/MerchantLayout'));
const MerchantDashboard = lazy(() => import('../pages/Merchant/Dashboard'));
const AdminLayout = lazy(() => import('../pages/Admin/layout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const NotFound = lazy(() => import('../pages/NotFound'));

// 定义管理员路由的 meta 配置（抽离成变量）
const adminMeta = { requiresAuth: true, role: 'admin' };
// 定义商家路由的 meta 配置
const merchantMeta = { requiresAuth: true, role: 'merchant' };

// 根路径组件：根据登录状态自动跳转
const RootRedirect = () => {
  const { token, userInfo, initialized } = useSelector(state => state.user);

  // 未初始化完成时，显示 loading 或等待
  if (!initialized) {
    return null;
  }

  // 已登录，根据角色跳转到对应页面
  if (token && userInfo) {
    const targetPath = userInfo.role === 'admin' ? '/admin' : '/merchant';
    return <Navigate to={targetPath} replace />;
  }

  // 未登录，跳转到登录页
  return <Navigate to="/login" replace />;
};

// 路由表
export const routes = [
  // 根路径：根据登录状态自动跳转
  { path: '/', element: <RootRedirect /> },

  // 公开路由（无需登录）
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forget-password', element: <ForgetPassword /> },

  // Merchant 模块（挂载 AuthGuard，角色不符跳 NotFound）
  {
    path: '/merchant',
    element: <AuthGuard meta={merchantMeta}>
      <MerchantLayout />
    </AuthGuard>,
    meta: merchantMeta,
    children: [
      { path: 'dashboard', element: <MerchantDashboard /> },
      { path: '', element: <Navigate to="/merchant/dashboard" replace /> }
    ]
  },

  // Admin 模块（同理挂载 AuthGuard）
  {
    path: '/admin',
    element: <AuthGuard meta={adminMeta}>
      <AdminLayout />
    </AuthGuard>,
    meta: adminMeta,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: '', element: <Navigate to="/admin/dashboard" replace /> }
    ]
  },

  // 404 页面（匹配所有未定义的路径，包括角色不符跳转的 /NotFound）
  { path: '*', element: <NotFound /> },
];