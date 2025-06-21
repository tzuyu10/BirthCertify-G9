import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Contexts
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RequestProvider } from "./contexts/RequestContext";
import { OwnerProvider } from "./contexts/OwnerContext";

// Protected Routing
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";

// Pages (regular imports)
import LandingPage from "./pages/LandingPage";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Request from "./pages/Request";
import Unauthorized from "./components/Unauthorized";
import Owner from "./pages/OwnerInfo";
import MyDraftsPage from "./components/MyDrafts";
import InvoiceViewer from "./components/InvoiceViewer";
import DownloadBox from "./components/DownloadBox"; 
import ResetPasswordForm from './components/ResetPasswordForm';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Lazy loaded component
const Help = React.lazy(() => import("./pages/Help"));

// Loading Spinner
const LoadingSpinner = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
    }}
  >
    <div
      style={{
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #3498db",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        animation: "spin 2s linear infinite",
      }}
    ></div>
    <p style={{ marginTop: "1rem", fontSize: "1.1rem" }}></p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Smaller loading component for lazy-loaded components
const LazyLoadSpinner = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "#666",
    }}
  >
    <div
      style={{
        border: "2px solid #f3f3f3",
        borderTop: "2px solid #3498db",
        borderRadius: "50%",
        width: "24px",
        height: "24px",
        animation: "spin 1s linear infinite",
      }}
    ></div>
    <span style={{ marginLeft: "10px" }}>Loading...</span>
  </div>
);

// Default route logic for logged-in users
const AuthenticatedHome = () => <RoleBasedRedirect />;

// AppRoutes with full routing
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/reset-password-form" element={<ResetPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuthenticatedHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/drafts"
        element={
          <ProtectedRoute>
            <MyDraftsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/request"
        element={
          <ProtectedRoute>
            <Request />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <Owner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LazyLoadSpinner />}>
              <Help />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pdf-generator"
        element={
          <ProtectedRoute>
            <InvoiceViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/download-box"
        element={
          <ProtectedRoute>
            <DownloadBox />
          </ProtectedRoute>
        }
      />

      {/* ADD THESE ROUTES FOR AUTHENTICATED USERS */}
      <Route path="/reset-password-form" element={<ResetPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// App with providers
function App() {
  return (
    <AuthProvider>
      <RequestProvider>
        <OwnerProvider>
          <Router>
            <AppRoutes />
          </Router>
        </OwnerProvider>
      </RequestProvider>
    </AuthProvider>
  );
}

export default App;