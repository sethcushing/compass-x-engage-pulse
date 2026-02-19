import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useState, useEffect } from "react";
import "@/App.css";

// Pages
import LandingPage from "./pages/LandingPage";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import PortfolioDashboard from "./pages/PortfolioDashboard";
import EngagementDetail from "./pages/EngagementDetail";
import PulseForm from "./pages/PulseForm";
import AdminSetup from "./pages/AdminSetup";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get auth header
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper to get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper to logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
};

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
      <Route path="/my-engagement" element={<ProtectedRoute requiredRoles={["CONSULTANT"]}><ConsultantDashboard /></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute requiredRoles={["LEAD", "ADMIN"]}><PortfolioDashboard /></ProtectedRoute>} />
      <Route path="/engagement/:engagementId" element={<ProtectedRoute><EngagementDetail /></ProtectedRoute>} />
      <Route path="/pulse/:engagementId" element={<ProtectedRoute requiredRoles={["CONSULTANT"]}><PulseForm /></ProtectedRoute>} />
      <Route path="/pulse/:engagementId/:pulseId" element={<ProtectedRoute><PulseForm /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requiredRoles={["ADMIN"]}><AdminSetup /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Role-based redirect component
function RoleBasedRedirect() {
  const user = getCurrentUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (user.role === "CONSULTANT") {
    return <Navigate to="/my-engagement" state={{ user }} replace />;
  }
  
  return <Navigate to="/portfolio" state={{ user }} replace />;
}

// Protected route component
function ProtectedRoute({ children, requiredRoles }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(location.state?.user || getCurrentUser());
  
  useEffect(() => {
    // Check if we have a valid token
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    
    // If user data passed from navigation or localStorage, verify token
    if (user) {
      // Verify token is still valid
      fetch(`${API_URL}/api/auth/me`, {
        headers: getAuthHeader()
      })
        .then(res => {
          if (!res.ok) throw new Error('Token invalid');
          return res.json();
        })
        .then(userData => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        });
    } else {
      setIsAuthenticated(false);
    }
  }, []);
  
  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Not authenticated
  if (isAuthenticated === false) {
    return <Navigate to="/" replace />;
  }
  
  // Check role access
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    if (user.role === "CONSULTANT") {
      return <Navigate to="/my-engagement" state={{ user }} replace />;
    }
    return <Navigate to="/portfolio" state={{ user }} replace />;
  }
  
  // Clone children and pass user prop
  return (
    <>
      {typeof children === 'function' 
        ? children({ user }) 
        : children && typeof children.type === 'function'
          ? <children.type {...children.props} user={user} />
          : children
      }
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
