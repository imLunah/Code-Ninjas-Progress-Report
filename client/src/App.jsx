import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ParentAuthProvider } from './context/ParentAuthContext';
import { CurriculumProvider } from './context/CurriculumContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ParentRoute from './components/layout/ParentRoute';
import AdminBar from './components/ui/AdminBar';
import WhatsNewModal from './components/shared/WhatsNewModal';
import ThemeSync from './components/ThemeSync';

// Eager: only the pages on the unauthenticated first-paint path.
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// Lazy: everything behind auth. Keeps the initial bundle small and pushes heavy deps
// (emoji picker on club pages, markdown, papaparse, crop) into per-route chunks that
// only download when that route is actually visited.
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const StudentRoster = lazy(() => import('./pages/manager/StudentRoster'));
const AddStudentPage = lazy(() => import('./pages/manager/AddStudentPage'));
const StudentProfile = lazy(() => import('./pages/manager/StudentProfile'));
const StaffPage = lazy(() => import('./pages/manager/StaffPage'));
const ReportsPage = lazy(() => import('./pages/manager/ReportsPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const SenseiDashboard = lazy(() => import('./pages/sensei/SenseiDashboard'));
const LogProgressPage = lazy(() => import('./pages/sensei/LogProgressPage'));
const LogClubPage = lazy(() => import('./pages/sensei/LogClubPage'));
const ClubsPage = lazy(() => import('./pages/ClubsPage'));
const ClubProfilePage = lazy(() => import('./pages/ClubProfilePage'));
const ClubSessionPage = lazy(() => import('./pages/ClubSessionPage'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentStudentProfile = lazy(() => import('./pages/parent/ParentStudentProfile'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage'));
const CurriculumRoadmapPage = lazy(() => import('./pages/CurriculumRoadmapPage'));
const LocationsPage = lazy(() => import('./pages/admin/LocationsPage'));
const CurriculumPage = lazy(() => import('./pages/admin/CurriculumPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
// Lazy — pulls in lottie; keep it out of the main bundle (only new accounts / revisits load it).
const GettingStartedPage = lazy(() => import('./pages/GettingStartedPage'));
const AppearancePage = lazy(() => import('./pages/AppearancePage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <ThemeProvider>
      <CurriculumProvider>
      <ParentAuthProvider>
      <AuthProvider>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<LandingPage />} />

            {/* Manager routes */}
            <Route path="/manager/dashboard" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/students"  element={<ProtectedRoute role="sensei"><StudentRoster /></ProtectedRoute>} />
            <Route path="/manager/staff"     element={<ProtectedRoute role="sensei"><StaffPage /></ProtectedRoute>} />
            <Route path="/manager/reports"  element={<ProtectedRoute role="sensei"><ReportsPage /></ProtectedRoute>} />
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

            {/* Admin */}
            <Route path="/admin/locations" element={<ProtectedRoute role="admin"><LocationsPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/curriculum" element={<ProtectedRoute role="admin"><CurriculumPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><SettingsPage /></ProtectedRoute>} />

            {/* Curriculum Roadmap */}
            <Route path="/curriculum-roadmap" element={<ProtectedRoute role="sensei"><CurriculumRoadmapPage /></ProtectedRoute>} />
            <Route path="/changelog" element={<ProtectedRoute role="sensei"><ChangelogPage /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute role="sensei"><WelcomePage /></ProtectedRoute>} />
            <Route path="/getting-started" element={<ProtectedRoute role="sensei"><GettingStartedPage /></ProtectedRoute>} />

            {/* Account */}
            <Route path="/account" element={<ProtectedRoute role="sensei"><AccountPage /></ProtectedRoute>} />
            <Route path="/appearance" element={<ProtectedRoute role="sensei"><AppearancePage /></ProtectedRoute>} />

            {/* Public */}
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          <ThemeSync />
          <AdminBar />
          <WhatsNewModal />
      </AuthProvider>
      </ParentAuthProvider>
      </CurriculumProvider>
      </ThemeProvider>
      <Analytics />
    </BrowserRouter>
    </MotionConfig>
  );
}
