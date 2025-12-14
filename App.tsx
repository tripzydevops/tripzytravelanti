import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserActivityProvider } from './contexts/UserActivityContext';
import { AdminProvider } from './contexts/AdminContext';
import { SearchProvider } from './contexts/SearchContext';
import { DealProvider } from './contexts/DealContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ContentProvider } from './contexts/ContentContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import PartnerLayout from './components/layouts/PartnerLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components
const Chatbot = React.lazy(() => import('./components/Chatbot'));

// Helper to retry lazy imports and reload on chunk error
const lazyLoadRetry = (importFn: () => Promise<any>) => {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      // Check if it's a chunk load error
      if (error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Importing a module script failed')) {
        // Only reload once to avoid infinite loops
        const storageKey = `retry-lazy-${window.location.pathname}`;
        if (!sessionStorage.getItem(storageKey)) {
          sessionStorage.setItem(storageKey, 'true');
          window.location.reload();
          // Return a never-resolving promise to wait for reload
          return new Promise(() => { });
        }
      }
      throw error;
    }
  });
};

// Lazy load pages with retry
const HomePage = lazyLoadRetry(() => import('./pages/HomePage'));
const FlightsPage = lazyLoadRetry(() => import('./pages/FlightsPage'));
const SubscriptionsPage = lazyLoadRetry(() => import('./pages/SubscriptionsPage'));
const LoginPage = lazyLoadRetry(() => import('./pages/LoginPage'));
const ProfilePage = lazyLoadRetry(() => import('./pages/ProfilePage'));
const TravelPage = lazyLoadRetry(() => import('./pages/TravelPage'));
const TripPlannerPage = lazyLoadRetry(() => import('./pages/TripPlannerPage'));
const DealDetailPage = lazyLoadRetry(() => import('./pages/DealDetailPage'));
const AdminPage = lazyLoadRetry(() => import('./pages/AdminPage'));
const PartnerDashboard = lazyLoadRetry(() => import('./pages/partner/PartnerDashboard'));
const PartnerScanPage = lazyLoadRetry(() => import('./pages/partner/PartnerScanPage'));
const CreateDealPage = lazyLoadRetry(() => import('./pages/partner/CreateDealPage'));
const MyDealsPage = lazyLoadRetry(() => import('./pages/MyDealsPage'));
const SavedDealsPage = lazyLoadRetry(() => import('./pages/SavedDealsPage'));
const WalletPage = lazyLoadRetry(() => import('./pages/WalletPage'));
const CheckoutPage = lazyLoadRetry(() => import('./pages/CheckoutPage'));
const PaymentSuccessPage = lazyLoadRetry(() => import('./pages/PaymentSuccessPage'));
const RedemptionHistoryPage = lazyLoadRetry(() => import('./pages/RedemptionHistoryPage'));
const PrivacyPage = lazyLoadRetry(() => import('./pages/PrivacyPage'));
const TermsPage = lazyLoadRetry(() => import('./pages/TermsPage'));
const FAQPage = lazyLoadRetry(() => import('./pages/FAQPage'));

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

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-brand-bg">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingSpinner />}>
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
          <Route
            path="/saved"
            element={
              <AuthenticatedRoute>
                <PageTransition><SavedDealsPage /></PageTransition>
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <AuthenticatedRoute>
                <PageTransition><WalletPage /></PageTransition>
              </AuthenticatedRoute>
            }
          />
          <Route path="/flights" element={<PageTransition><FlightsPage /></PageTransition>} />
          <Route path="/travel" element={<PageTransition><TravelPage /></PageTransition>} />
          <Route path="/plan" element={<PageTransition><TripPlannerPage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} />
          <Route
            path="/profile"
            element={
              <AuthenticatedRoute>
                <PageTransition><ProfilePage /></PageTransition>
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/redemptions"
            element={
              <AuthenticatedRoute>
                <PageTransition><RedemptionHistoryPage /></PageTransition>
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
            <Route path="edit-deal/:id" element={<CreateDealPage />} />
            <Route path="scan" element={<PartnerScanPage />} />
          </Route>
        </Routes>
      </Suspense>
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

  /* Check if we are on an admin route */
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <SearchProvider>
      <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text-light">
        <main className={`flex-grow ${user && !isAdminRoute ? 'pb-24' : ''}`}>
          <AnimatedRoutes />
        </main>
        {isChatbotVisible && user && !isAdminRoute && (
          <Suspense fallback={<div />}>
            <Chatbot />
          </Suspense>
        )}
        {user && !isAdminRoute && <BottomNav />}
        {!isAdminRoute && !user && <Footer />}
      </div>
    </SearchProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <UserActivityProvider>
            <AdminProvider>
              <DealProvider>
                <SubscriptionProvider>
                  <ContentProvider>
                    <ThemeProvider>
                      <LayoutProvider>
                        <NotificationProvider>
                          <ToastProvider>
                            <BrowserRouter>
                              <ScrollToTop />
                              <AppContent />
                            </BrowserRouter>
                          </ToastProvider>
                        </NotificationProvider>
                      </LayoutProvider>
                    </ThemeProvider>
                  </ContentProvider>
                </SubscriptionProvider>
              </DealProvider>
            </AdminProvider>
          </UserActivityProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;