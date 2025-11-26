import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SearchProvider } from './contexts/SearchContext';
import { DealProvider } from './contexts/DealContext';
import { ContentProvider } from './contexts/ContentContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import MyDealsPage from './pages/MyDealsPage';
import Chatbot from './components/Chatbot';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route
              path="/checkout"
              element={
                <AuthenticatedRoute>
                  <CheckoutPage />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <AuthenticatedRoute>
                  <PaymentSuccessPage />
                </AuthenticatedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/deals" element={<HomePage />} />
            <Route
              path="/my-deals"
              element={
                <AuthenticatedRoute>
                  <MyDealsPage />
                </AuthenticatedRoute>
              }
            />
            <Route path="/deals/:id" element={<DealDetailPage />} />
            <Route path="/flights" element={<FlightsPage />} />
            <Route path="/travel" element={<TravelPage />} />
            <Route path="/plan" element={<TripPlannerPage />} />
            <Route
              path="/profile"
              element={
                <AuthenticatedRoute>
                  <ProfilePage />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        {isChatbotVisible && user && <Chatbot />}
        {user && <BottomNav />}
      </div>
    </SearchProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DealProvider>
          <ContentProvider>
            <ThemeProvider>
              <LayoutProvider>
                <NotificationProvider>
                  <HashRouter>
                    <AppContent />
                  </HashRouter>
                </NotificationProvider>
              </LayoutProvider>
            </ThemeProvider>
          </ContentProvider>
        </DealProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;