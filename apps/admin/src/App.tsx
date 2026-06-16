import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import OrdersPage from './pages/Orders';
import DriversPage from './pages/Drivers';
import UsersPage from './pages/Users';
import RoutesPage from './pages/Routes';
import VouchersPage from './pages/Vouchers';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
      </Route>
    </Routes>
  );
}
