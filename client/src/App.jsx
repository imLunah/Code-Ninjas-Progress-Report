import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import StudentRoster from './pages/manager/StudentRoster';
import AddStudentPage from './pages/manager/AddStudentPage';
import StudentProfile from './pages/manager/StudentProfile';
import StaffPage from './pages/manager/StaffPage';
import SenseiDashboard from './pages/sensei/SenseiDashboard';
import LogProgressPage from './pages/sensei/LogProgressPage';

function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ninja-bg flex items-center justify-center">
        <p className="text-ninja-muted font-ninja text-xl">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/sensei/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Manager routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute role="manager">
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/students"
            element={
              <ProtectedRoute role="sensei">
                <StudentRoster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/staff"
            element={
              <ProtectedRoute role="manager">
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/students/new"
            element={
              <ProtectedRoute role="manager">
                <AddStudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/students/:id"
            element={
              <ProtectedRoute role="sensei">
                <StudentProfile />
              </ProtectedRoute>
            }
          />

          {/* Sensei routes */}
          <Route
            path="/sensei/dashboard"
            element={
              <ProtectedRoute role="sensei">
                <SenseiDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sensei/student/:id"
            element={
              <ProtectedRoute role="sensei">
                <LogProgressPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
