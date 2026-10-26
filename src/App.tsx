import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BrandProvider } from '@/contexts/BrandContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/HomePage';
import { PropertyPage } from '@/pages/PropertyPage';
import { HouseDetailPage } from '@/pages/HouseDetailPage';
import { ExperiencePage } from '@/pages/ExperiencePage';
import { LocationPage } from '@/pages/LocationPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { PoliciesPage } from '@/pages/PoliciesPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminReservationsPage } from '@/pages/admin/AdminReservationsPage';
import { AdminCalendarPage } from '@/pages/admin/AdminCalendarPage';
import { AdminHousesPage } from '@/pages/admin/AdminHousesPage';
import { AdminGuestsPage } from '@/pages/admin/AdminGuestsPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sand-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrandProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/property" element={<PropertyPage />} />
              <Route path="/the-house" element={<HouseDetailPage />} />
              <Route path="/houses/:slug" element={<HouseDetailPage />} />
              <Route path="/houses" element={<Navigate to="/the-house" replace />} />
              <Route path="/experience" element={<ExperiencePage />} />
              <Route path="/location" element={<LocationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/policies" element={<PoliciesPage />} />
            </Route>

            {/* Admin login */}
            <Route path="/admin" element={<AdminLoginPage />} />

            {/* Admin protected routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="reservations" element={<AdminReservationsPage />} />
              <Route path="calendar" element={<AdminCalendarPage />} />
              <Route path="houses" element={<AdminHousesPage />} />
              <Route path="guests" element={<AdminGuestsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BrandProvider>
    </AuthProvider>
  );
}
