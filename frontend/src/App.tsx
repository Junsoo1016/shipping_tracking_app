import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import FinanceOfferListPage from './pages/FinanceOfferListPage';
import LoginPage from './pages/LoginPage';
import ContactsPage from './pages/ContactsPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ShipmentsProvider } from './context/ShipmentsContext';
import { FinanceOffersProvider } from './context/FinanceOffersContext';
import { ContactsProvider } from './context/ContactsContext';

const App = () => (
  <AuthProvider>
    <ShipmentsProvider>
      <FinanceOffersProvider>
        <ContactsProvider>
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
                <Route path="finance/offers" element={<FinanceOfferListPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ContactsProvider>
      </FinanceOffersProvider>
    </ShipmentsProvider>
  </AuthProvider>
);

export default App;
