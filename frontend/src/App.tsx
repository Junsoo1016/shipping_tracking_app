import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import MonitorActivePage from './pages/MonitorActivePage';
import MonitorArchivePage from './pages/MonitorArchivePage';
import AdminUsersPage from './pages/AdminUsersPage';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ShipmentsProvider } from './context/ShipmentsContext';

const App = () => (
  <AuthProvider>
    <ShipmentsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="monitor/active" element={<MonitorActivePage />} />
            <Route path="monitor/archive" element={<MonitorArchivePage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ShipmentsProvider>
  </AuthProvider>
);

export default App;
