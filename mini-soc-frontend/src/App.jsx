import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { SocDataProvider } from './context/SocDataContext';
import { isAuthenticated } from './services/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SecurityLogs from './pages/SecurityLogs';
import LogDetails from './pages/LogDetails';
import Alerts from './pages/Alerts';
import AlertDetails from './pages/AlertDetails';
import Analytics from './pages/Analytics';
import IPActivity from './pages/IPActivity';
import UploadLogs from './pages/UploadLogs';
import Settings from './pages/Settings';

// Only logged-in users can see the pages inside the Layout.
function ProtectedLayout() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return (
    <SocDataProvider>
      <Layout />
    </SocDataProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/logs" element={<SecurityLogs />} />
        <Route path="/logs/:id" element={<LogDetails />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alerts/:id" element={<AlertDetails />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ip-activity" element={<IPActivity />} />
        <Route path="/upload" element={<UploadLogs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
