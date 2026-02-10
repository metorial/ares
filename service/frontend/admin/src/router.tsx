import { ModalRoot, Toaster } from '@metorial-io/ui';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Layout } from './pages/_layout';
import { RouterErrorPage } from './pages/_error/routerError';
import { LoginPage } from './pages/login';
import { UsersPage } from './pages/users/page';
import { UserPage } from './pages/users/[userId]/page';
import { AdminsPage } from './pages/admin/page';
import { AppsPage } from './pages/apps/page';
import { AppPage } from './pages/apps/[appId]/page';
import { TenantsPage } from './pages/tenants/page';
import { TenantPage } from './pages/tenants/[tenantId]/page';

let router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <>
        <LoginPage />
        <Toaster />
        <ModalRoot />
      </>
    )
  },
  {
    path: '/',
    element: (
      <>
        <Layout />
        <Toaster />
        <ModalRoot />
      </>
    ),
    errorElement: <RouterErrorPage />,
    children: [
      { path: '', element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/:userId', element: <UserPage /> },
      { path: 'admins', element: <AdminsPage /> },
      { path: 'apps', element: <AppsPage /> },
      { path: 'apps/:appId', element: <AppPage /> },
      { path: 'tenants', element: <TenantsPage /> },
      { path: 'tenants/:tenantId', element: <TenantPage /> }
    ]
  }
]);

export let App = () => {
  return <RouterProvider router={router} />;
};
