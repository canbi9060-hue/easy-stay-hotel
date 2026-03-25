import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router/routes';
import Loading from './components/Loading';

const router = createBrowserRouter(routes);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
