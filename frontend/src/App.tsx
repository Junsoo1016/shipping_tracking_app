import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import MonitorActivePage from './pages/MonitorActivePage';
import MonitorArchivePage from './pages/MonitorArchivePage';
import AdminUsersPage from './pages/AdminUsersPage';
import FinanceOfferListPage from './pages/FinanceOfferListPage';
import LoginPage from './pages/LoginPage';
import ContactsPage from './pages/ContactsPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ShipmentsProvider } from './context/ShipmentsContext';
import { FinanceOffersProvider } from './context/FinanceOffersContext';

const App = () => (
  <AuthProvider>
    <ShipmentsProvider>
      <FinanceOffersProvider>
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
              <Route path="finance/offers" element={<FinanceOfferListPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FinanceOffersProvider>
    </ShipmentsProvider>
  </AuthProvider>
);

export default App;
