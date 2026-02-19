import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Activity, BarChart3, Users, Shield, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(`Welcome, ${data.user.name}!`);

      // Redirect based on role
      if (data.user.role === 'CONSULTANT') {
        navigate('/my-engagement', { state: { user: data.user } });
      } else {
        navigate('/portfolio', { state: { user: data.user } });
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Activity,
      title: "Weekly Pulse Updates",
      description: "Consultants submit quick status updates in under 2 minutes"
    },
    {
      icon: BarChart3,
      title: "Health Scoring",
      description: "Automated engagement health scores based on RAG, issues, and risks"
    },
    {
      icon: Users,
      title: "Portfolio Dashboard",
      description: "Leadership view of all engagements with drill-down capability"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Track and mitigate risks before they impact delivery"
    }
  ];

  return (
    <div className="min-h-screen login-background relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 via-slate-900/70 to-slate-900/80"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white font-heading">Engagement Pulse</span>
            </div>
            <Button 
              onClick={() => setShowLoginForm(true)}
              className="bg-white text-sky-600 hover:bg-sky-50 font-semibold px-6"
              data-testid="header-login-btn"
            >
              Sign In
            </Button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text or Login Form */}
            {showLoginForm ? (
              <Card className="bg-white/95 backdrop-blur-lg shadow-2xl max-w-md mx-auto w-full" data-testid="login-card">
                <CardHeader className="text-center pb-2">
                  <div className="w-14 h-14 bg-sky-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-slate-900">Welcome Back</CardTitle>
                  <p className="text-slate-500 text-sm mt-1">Sign in to access your dashboard</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@compassx.com"
                        value={credentials.email}
                        onChange={(e) => setCredentials(c => ({ ...c, email: e.target.value }))}
                        className="h-11"
                        data-testid="email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={credentials.password}
                          onChange={(e) => setCredentials(c => ({ ...c, password: e.target.value }))}
                          className="h-11 pr-10"
                          data-testid="password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white font-semibold"
                      data-testid="login-submit-btn"
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setShowLoginForm(false)}
                      className="text-sm text-slate-500 hover:text-sky-600"
                    >
                      ← Back to home
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-heading leading-tight mb-6">
                  Track Engagement
                  <span className="text-sky-400"> Health </span>
                  in Real-Time
                </h1>
                <p className="text-lg text-slate-300 mb-8 max-w-xl">
                  Empower your consulting team with weekly pulse updates, health scoring, 
                  and comprehensive portfolio visibility. Identify risks early and deliver excellence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    onClick={() => setShowLoginForm(true)}
                    size="lg"
                    className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-6 text-lg"
                    data-testid="hero-login-btn"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
                
                {/* Trust indicators */}
                <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Quick Setup</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Secure Auth</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Real-time Data</span>
                  </div>
                </div>
              </div>
            )}

            {/* Right - Feature Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors duration-200"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 bg-sky-500/20 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 font-heading">{feature.title}</h3>
                  <p className="text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/10">
          <div className="max-w-7xl mx-auto text-center text-sm text-slate-400">
            <p>Engagement Pulse - Internal Consulting Management Tool</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
