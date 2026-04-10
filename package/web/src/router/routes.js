import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { AuthGuard } from './guard';
import Loading from '../components/Loading';

const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const ForgetPassword = lazy(() => import('../pages/Auth/ForgetPassword'));
const MerchantLayout = lazy(() => import('../pages/Merchant/MerchantLayout'));
const MerchantDashboard = lazy(() => import('../pages/Merchant/Dashboard'));
const HotelInfo = lazy(() => import('../pages/Merchant/HotelInfo'));
const RoomType = lazy(() => import('../pages/Merchant/RoomType'));
const RoomDetail = lazy(() => import('../pages/Merchant/RoomDetail'));
const CheckIn = lazy(() => import('../pages/Merchant/CheckIn'));
const Order = lazy(() => import('../pages/Merchant/Order'));
const Customer = lazy(() => import('../pages/Merchant/Customer'));
const Review = lazy(() => import('../pages/Merchant/Review'));
const Housekeeping = lazy(() => import('../pages/Merchant/Housekeeping'));
const RoomStatus = lazy(() => import('../pages/Merchant/RoomStatus'));
const AdminLayout = lazy(() => import('../pages/Admin/layout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const AdminRoomTypeReview = lazy(() => import('../pages/Admin/RoomTypeReview'));
const AdminRoomManage = lazy(() => import('../pages/Admin/RoomManage'));
const AdminHotelReview = lazy(() => import('../pages/Admin/HotelReview'));
const AdminHotelReviewDetail = lazy(() => import('../pages/Admin/HotelReview/DetailPage'));
const AdminHotelReviewAudit = lazy(() => import('../pages/Admin/HotelReview/AuditPage'));
const Profile = lazy(() => import('../pages/Auth/Profile'));
const NotFound = lazy(() => import('../pages/Auth/NotFound'));

const adminMeta = { requiresAuth: true, role: 'admin' };
const merchantMeta = { requiresAuth: true, role: 'merchant' };

const RootRedirect = () => {
  const { token, userInfo, initialized } = useSelector((state) => state.user);

  if (!initialized) {
    return <Loading />;
  }

  if (token && userInfo) {
    const targetPath = userInfo.role === 'admin' ? '/admin' : '/merchant';
    return <Navigate to={targetPath} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const routes = [
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forget-password', element: <ForgetPassword /> },
  {
    path: '/merchant',
    element: (
      <AuthGuard meta={merchantMeta}>
        <MerchantLayout />
      </AuthGuard>
    ),
    meta: merchantMeta,
    children: [
      { path: '', element: <Navigate to="/merchant/dashboard" replace /> },
      { path: 'dashboard', element: <MerchantDashboard /> },
      { path: 'hotel-info', element: <HotelInfo /> },
      { path: 'room-type', element: <RoomType /> },
      { path: 'room-detail', element: <RoomDetail /> },
      { path: 'check-in', element: <CheckIn /> },
      { path: 'order', element: <Order /> },
      { path: 'customer', element: <Customer /> },
      { path: 'review', element: <Review /> },
      { path: 'housekeeping', element: <Housekeeping /> },
      { path: 'room-status', element: <RoomStatus /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AuthGuard meta={adminMeta}>
        <AdminLayout />
      </AuthGuard>
    ),
    meta: adminMeta,
    children: [
      { path: '', element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'room-type-review', element: <AdminRoomTypeReview /> },
      { path: 'rooms', element: <AdminRoomManage /> },
      { path: 'hotel-review', element: <AdminHotelReview /> },
      { path: 'hotel-review/:merchantUserId', element: <AdminHotelReviewDetail /> },
      { path: 'hotel-review/:merchantUserId/audit', element: <AdminHotelReviewAudit /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];
