import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ParentAuthProvider } from './context/ParentAuthContext';
import { TransitionProvider, usePageTransition } from './context/TransitionContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ParentRoute from './components/layout/ParentRoute';

import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import StudentRoster from './pages/manager/StudentRoster';
import AddStudentPage from './pages/manager/AddStudentPage';
import StudentProfile from './pages/manager/StudentProfile';
import StaffPage from './pages/manager/StaffPage';
import AccountPage from './pages/AccountPage';
import SenseiDashboard from './pages/sensei/SenseiDashboard';
import LogProgressPage from './pages/sensei/LogProgressPage';
import LogClubPage from './pages/sensei/LogClubPage';
import ClubsPage from './pages/ClubsPage';
import ClubProfilePage from './pages/ClubProfilePage';
import ClubSessionPage from './pages/ClubSessionPage';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudentProfile from './pages/parent/ParentStudentProfile';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LandingPage from './pages/LandingPage';

const TransitionScene = lazy(() => import('./components/ui/TransitionScene'));

// Rendered outside <Routes> so it survives route changes — fixes the cut
function TransitionOverlay() {
  const { pending, end } = usePageTransition();
  const navigate = useNavigate();

  const handleNavigate = useCallback(() => {
    navigate(pending.to, { state: pending.state });
  }, [pending, navigate]);

  if (!pending) return null;
  return (
    <Suspense fallback={null}>
      <TransitionScene onNavigate={handleNavigate} onComplete={end} />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TransitionProvider>
        <ThemeProvider>
        <ParentAuthProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<LandingPage />} />

            {/* Manager routes */}
            <Route path="/manager/dashboard" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/students"  element={<ProtectedRoute role="sensei"><StudentRoster /></ProtectedRoute>} />
            <Route path="/manager/staff"     element={<ProtectedRoute role="sensei"><StaffPage /></ProtectedRoute>} />
            <Route path="/manager/students/new" element={<ProtectedRoute role="manager"><AddStudentPage /></ProtectedRoute>} />
            <Route path="/manager/students/:id" element={<ProtectedRoute role="sensei"><StudentProfile /></ProtectedRoute>} />

            {/* Sensei routes */}
            <Route path="/sensei/dashboard"    element={<ProtectedRoute role="sensei"><SenseiDashboard /></ProtectedRoute>} />
            <Route path="/sensei/student/:id"  element={<ProtectedRoute role="sensei"><LogProgressPage /></ProtectedRoute>} />
            <Route path="/clubs/log"           element={<ProtectedRoute role="manager"><LogClubPage /></ProtectedRoute>} />

            {/* Clubs */}
            <Route path="/clubs"                    element={<ProtectedRoute role="sensei"><ClubsPage /></ProtectedRoute>} />
            <Route path="/clubs/:slug"              element={<ProtectedRoute role="sensei"><ClubProfilePage /></ProtectedRoute>} />
            <Route path="/clubs/:slug/sessions/:id" element={<ProtectedRoute role="sensei"><ClubSessionPage /></ProtectedRoute>} />

            {/* Parent portal */}
            <Route path="/parent/login"       element={<Navigate to="/login?tab=parent" replace />} />
            <Route path="/parent/dashboard"   element={<ParentRoute><ParentDashboard /></ParentRoute>} />
            <Route path="/parent/students/:id" element={<ParentRoute><ParentStudentProfile /></ParentRoute>} />

            {/* Account */}
            <Route path="/account" element={<ProtectedRoute role="sensei"><AccountPage /></ProtectedRoute>} />

            {/* Public */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms"   element={<TermsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <TransitionOverlay />
        </AuthProvider>
        </ParentAuthProvider>
        </ThemeProvider>
        <Analytics />
      </TransitionProvider>
    </BrowserRouter>
  );
}
