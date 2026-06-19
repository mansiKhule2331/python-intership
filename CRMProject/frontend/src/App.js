/**
 * App.js - Root application component
 * Routes, providers, and protected route logic
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/common';
import './styles/globals.css';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/auth/ProfilePage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Customers
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';

// Leads
import LeadsPage from './pages/leads/LeadsPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import PipelinePage from './pages/leads/PipelinePage';

// Interactions
import InteractionsPage from './pages/interactions/InteractionsPage';

// Admin
import UsersPage from './pages/admin/UsersPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';

// ─── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: '44px', height: '44px',
          background: 'var(--accent)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: '800',
        }}>N</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.7,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}

// ─── Public Route (redirect if logged in) ────────────────────
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── App Routes ───────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected - App Layout */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />

        {/* Leads */}
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />

        {/* Interactions */}
        <Route path="interactions" element={<InteractionsPage />} />

        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Admin Only */}
        <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
        <Route path="activity" element={<ProtectedRoute adminOnly><ActivityLogsPage /></ProtectedRoute>} />
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
