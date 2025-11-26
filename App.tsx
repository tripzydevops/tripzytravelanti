import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SearchProvider } from './contexts/SearchContext';
import { DealProvider } from './contexts/DealContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import { NotificationProvider } from './contexts/NotificationContext';
import HomePage from './pages/HomePage';
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
      {/* DEBUG OVERLAY */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: 'lime', padding: '10px', fontSize: '12px' }}>
        <p>Loading: {String(loading)}</p>
        <p>User: {user ? user.email : 'null'}</p>
        <p>Path: {window.location.hash}</p>
      </div>
      <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text-light">
        <main className={`flex-grow ${user ? 'pb-24' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
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
          <ThemeProvider>
            <LayoutProvider>
              <NotificationProvider>
                <HashRouter>
                  <AppContent />
                </HashRouter>
              </NotificationProvider>
            </LayoutProvider>
          </ThemeProvider>
        </DealProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;