import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error("Authentication failed - no session ID");
          navigate('/');
          return;
        }

        // Exchange session_id for session_token
        const response = await fetch(`${API_URL}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Authentication failed');
        }

        const user = await response.json();
        toast.success(`Welcome, ${user.name}!`);

        // Clean URL and redirect to dashboard with user data
        window.history.replaceState({}, document.title, '/dashboard');
        navigate('/dashboard', { state: { user }, replace: true });

      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error(error.message || "Authentication failed");
        navigate('/');
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen app-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
