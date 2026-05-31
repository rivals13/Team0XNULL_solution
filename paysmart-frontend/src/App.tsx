import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import SocketProvider from './context/SocketProvider';
import PreferencesProvider from './context/PreferencesContext';

import Onboarding        from './pages/onboarding/Onboarding';
import Login             from './pages/auth/Login';
import Register          from './pages/auth/Register';
import Dashboard         from './pages/dashboard/Dashboard';
import Schedules         from './pages/schedules/Schedules';
import NewSchedule       from './pages/schedules/NewSchedule';
import Suggestions       from './pages/suggestions/Suggestions';
import BillAlert         from './pages/payments/BillAlert';
import SmartBills        from './pages/payments/SmartBills';
import PaymentConfirm    from './pages/payments/PaymentConfirm';
import Statement         from './pages/payments/Statement';
import HealthScorePage   from './pages/HealthScore';
import NotificationsPage from './pages/Notifications';
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import MerchantSetup     from './pages/merchant/MerchantSetup';
import More              from './pages/More';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PreferencesProvider>
      <SocketProvider>
      <Routes>
        <Route path="/"            element={<Navigate to="/login" replace />} />
        <Route path="/onboarding"  element={<Onboarding />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/merchant/setup" element={<MerchantSetup />} />
        <Route path="/merchant"    element={<MerchantDashboard />} />
        <Route path="/dashboard"   element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/statement"   element={<RequireAuth><Statement /></RequireAuth>} />
        <Route path="/schedules"   element={<RequireAuth><Schedules /></RequireAuth>} />
        <Route path="/schedules/new" element={<RequireAuth><NewSchedule /></RequireAuth>} />
        <Route path="/suggestions" element={<RequireAuth><Suggestions /></RequireAuth>} />
        <Route path="/bill-alert"   element={<RequireAuth><BillAlert /></RequireAuth>} />
        <Route path="/smart-bills"  element={<RequireAuth><SmartBills /></RequireAuth>} />
        <Route path="/payments/confirm" element={<RequireAuth><PaymentConfirm /></RequireAuth>} />
        <Route path="/health-score" element={<RequireAuth><HealthScorePage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/more"        element={<RequireAuth><More /></RequireAuth>} />
        <Route path="/scan"        element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/pay/*"       element={<RequireAuth><PaymentConfirm /></RequireAuth>} />
        <Route path="*"            element={<Navigate to="/login" replace />} />
      </Routes>
      </SocketProvider>
      </PreferencesProvider>
    </BrowserRouter>
  );
}
