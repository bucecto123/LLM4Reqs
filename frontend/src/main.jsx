import React, { useEffect, useState, lazy, Suspense } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { isAuthenticated, getAccessToken } from "./utils/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast.jsx";
import PerfOverlay from "./components/PerfOverlay.jsx";

// Route-based code splitting — heavy pages are lazy-loaded
const LLMDashboard = lazy(() => import("./pages/DashBoard"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const AuthPages = lazy(() => import("./pages/Login_SignUp"));
// Public pages — keep static (small, rarely visited)
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main App Component
function AppContent() {
  const { isAuthenticated: authState, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!authState) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AuthPages />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/dashboard" element={<LLMDashboard />} />

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Suspense>
  );
}

// App wrapper with providers
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Fallback for apps that don't use the new auth hooks
function LegacyApp() {
  const [token, setToken] = useState(() => getAccessToken());

  useEffect(() => {
    function onAuth() {
      setToken(getAccessToken());
    }
    window.addEventListener("authChanged", onAuth);
    return () => window.removeEventListener("authChanged", onAuth);
  }, []);

  if (!token) {
    return <AuthPages />;
  }

  return <LLMDashboard />;
}

// NOTE: StrictMode disabled in development to prevent duplicate API calls
// Re-enable before production build for better error detection
// Production builds automatically disable StrictMode anyway
createRoot(document.getElementById("root")).render(
  // <StrictMode>  // Temporarily disabled - causes duplicate renders
  <ToastProvider>
  <App />
  <PerfOverlay />
  </ToastProvider>
  // </StrictMode>
);
