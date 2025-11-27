import React from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SearchProvider } from './contexts/SearchContext';
import { DealProvider } from './contexts/DealContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ContentProvider } from './contexts/ContentContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import HomePage from './pages/HomePage';
import FlightsPage from './pages/FlightsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';
import TravelPage from './pages/TravelPage';
import TripPlannerPage from './pages/TripPlannerPage';
import DealDetailPage from './pages/DealDetailPage';
import AdminPage from './pages/AdminPage';
import PartnerLayout from './components/layouts/PartnerLayout';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerScanPage from './pages/partner/PartnerScanPage';
import CreateDealPage from './pages/partner/CreateDealPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import MyDealsPage from './pages/MyDealsPage';
import Chatbot from './components/Chatbot';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/subscriptions" element={<PageTransition><SubscriptionsPage /></PageTransition>} />
        <Route
          path="/checkout"
          element={
            <AuthenticatedRoute>
              <PageTransition><CheckoutPage /></PageTransition>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <AuthenticatedRoute>
              <PageTransition><PaymentSuccessPage /></PageTransition>
            </AuthenticatedRoute>
          }
        />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/deals" element={<PageTransition><HomePage /></PageTransition>} />
        <Route
          path="/my-deals"
          element={
            <AuthenticatedRoute>
              <PageTransition><MyDealsPage /></PageTransition>
            </AuthenticatedRoute>
          }
        />
        <Route path="/deals/:id" element={<PageTransition><DealDetailPage /></PageTransition>} />
        <Route path="/flights" element={<PageTransition><FlightsPage /></PageTransition>} />
        <Route path="/travel" element={<PageTransition><TravelPage /></PageTransition>} />
        <Route path="/plan" element={<PageTransition><TripPlannerPage /></PageTransition>} />
        <Route
          path="/profile"
          element={
            <AuthenticatedRoute>
              <PageTransition><ProfilePage /></PageTransition>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PageTransition><AdminPage /></PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Partner Portal Routes */}
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<Navigate to="/partner/dashboard" replace />} />
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="create-deal" element={<CreateDealPage />} />
          <Route path="scan" element={<PartnerScanPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  const { isChatbotVisible } = useLayout();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text-light">
        <main className={`flex-grow ${user ? 'pb-24' : ''}`}>
          <AnimatedRoutes />
        </main>
        {isChatbotVisible && user && <Chatbot />}
        {user && <BottomNav />}
      </div>
    </SearchProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <DealProvider>
            <SubscriptionProvider>
              <ContentProvider>
                <ThemeProvider>
                  <LayoutProvider>
                    <NotificationProvider>
                      <ToastProvider>
                        <HashRouter>
                          <ScrollToTop />
                          <AppContent />
                        </HashRouter>
                      </ToastProvider>
                    </NotificationProvider>
                  </LayoutProvider>
                </ThemeProvider>
              </ContentProvider>
            </SubscriptionProvider>
          </DealProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;