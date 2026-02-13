import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Activity, LogOut, Search, Filter, AlertTriangle, AlertCircle,
  Target, ChevronRight, Settings, TrendingDown, Clock, Users,
  BarChart3, Building2
} from "lucide-react";
import { format, parseISO } from "date-fns";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PortfolioDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || null);
  const [summary, setSummary] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    rag: "all",
    missingPulse: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user if not available
      if (!user) {
        const userRes = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!userRes.ok) throw new Error('Not authenticated');
        const userData = await userRes.json();
        setUser(userData);
      }

      // Fetch dashboard summary
      const summaryRes = await fetch(`${API_URL}/api/dashboard/summary`, { credentials: 'include' });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // Fetch all engagements
      const engRes = await fetch(`${API_URL}/api/engagements`, { credentials: 'include' });
      if (engRes.ok) {
        setEngagements(await engRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  const getRagBadge = (status) => {
    const styles = {
      GREEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
      AMBER: "bg-amber-100 text-amber-700 border-amber-200",
      RED: "bg-red-100 text-red-700 border-red-200"
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${styles[status] || styles.GREEN}`}>
        {status}
      </span>
    );
  };

  const getHealthColor = (score) => {
    if (score >= 70) return "text-emerald-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const filteredEngagements = engagements.filter(eng => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = 
        eng.engagement_name.toLowerCase().includes(search) ||
        eng.client?.client_name?.toLowerCase().includes(search) ||
        eng.consultant?.name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (filters.rag !== "all" && eng.rag_status !== filters.rag) return false;
    if (filters.missingPulse) {
      const isMissing = summary?.missing_pulses?.some(mp => mp.engagement_id === eng.engagement_id);
      if (!isMissing) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-background">
      <Topbar user={user} onLogout={handleLogout} navigate={navigate} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-slate-900">Portfolio Dashboard</h1>
          <p className="text-slate-600 mt-1">Monitor engagement health across all clients</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* RAG Overview Card */}
          <Card className="glass-card col-span-1 md:col-span-2" data-testid="rag-overview-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-500" />
                RAG Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1 text-center p-4 bg-emerald-50 rounded-xl">
                  <p className="text-4xl font-bold text-emerald-600 font-heading">{summary?.rag_counts?.GREEN || 0}</p>
                  <p className="text-sm text-emerald-700 mt-1">Green</p>
                </div>
                <div className="flex-1 text-center p-4 bg-amber-50 rounded-xl">
                  <p className="text-4xl font-bold text-amber-600 font-heading">{summary?.rag_counts?.AMBER || 0}</p>
                  <p className="text-sm text-amber-700 mt-1">Amber</p>
                </div>
                <div className="flex-1 text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-4xl font-bold text-red-600 font-heading">{summary?.rag_counts?.RED || 0}</p>
                  <p className="text-sm text-red-700 mt-1">Red</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Pulses */}
          <Card className="glass-card stat-card amber" data-testid="missing-pulses-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Missing Pulses</p>
                  <p className="text-3xl font-bold text-slate-900 font-heading mt-1">{summary?.missing_pulses_count || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">This week</p>
            </CardContent>
          </Card>

          {/* Total Engagements */}
          <Card className="glass-card stat-card blue" data-testid="total-engagements-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Engagements</p>
                  <p className="text-3xl font-bold text-slate-900 font-heading mt-1">{summary?.total_engagements || 0}</p>
                </div>
                <Building2 className="w-8 h-8 text-sky-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">Across all clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Items Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Critical Issues */}
          <Card className="glass-card" data-testid="critical-issues-card">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary?.critical_issues?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {summary.critical_issues.slice(0, 5).map((issue) => (
                    <div key={issue.issue_id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/engagement/${issue.engagement_id}`)}
                    >
                      <p className="font-medium text-slate-900 text-sm">{issue.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{issue.engagement?.engagement_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No critical issues
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Risks */}
          <Card className="glass-card" data-testid="high-risks-card">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                High Impact Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary?.high_risks?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {summary.high_risks.slice(0, 5).map((risk) => (
                    <div key={risk.risk_id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/engagement/${risk.engagement_id}`)}
                    >
                      <p className="font-medium text-slate-900 text-sm">{risk.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{risk.engagement?.engagement_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No high impact risks
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Milestones */}
          <Card className="glass-card" data-testid="upcoming-milestones-card">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                <Target className="w-5 h-5 text-sky-500" />
                Milestones Due (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary?.upcoming_milestones?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {summary.upcoming_milestones.slice(0, 5).map((ms) => (
                    <div key={ms.milestone_id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/engagement/${ms.engagement_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900 text-sm">{ms.title}</p>
                        <span className="text-xs text-slate-500">{format(parseISO(ms.due_date), 'MMM d')}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{ms.engagement?.engagement_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No upcoming milestones
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search engagements, clients, or consultants..."
              className="pl-10"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              data-testid="search-input"
            />
          </div>
          <Select value={filters.rag} onValueChange={(v) => setFilters(f => ({ ...f, rag: v }))}>
            <SelectTrigger className="w-40" data-testid="rag-filter">
              <SelectValue placeholder="RAG Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="GREEN">Green</SelectItem>
              <SelectItem value="AMBER">Amber</SelectItem>
              <SelectItem value="RED">Red</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant={filters.missingPulse ? "default" : "outline"}
            onClick={() => setFilters(f => ({ ...f, missingPulse: !f.missingPulse }))}
            className={filters.missingPulse ? "bg-amber-500 hover:bg-amber-600" : ""}
            data-testid="missing-pulse-toggle"
          >
            <Clock className="w-4 h-4 mr-2" />
            Missing Pulse
          </Button>
        </div>

        {/* Engagements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="engagements-grid">
          {filteredEngagements.map((eng, index) => (
            <Card 
              key={eng.engagement_id}
              className="glass-card card-interactive animate-fadeInUp"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/engagement/${eng.engagement_id}`, { state: { user } })}
              data-testid={`engagement-card-${eng.engagement_id}`}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">{eng.client?.client_name}</p>
                    <h3 className="font-semibold text-slate-900 font-heading mt-0.5">{eng.engagement_name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{eng.engagement_code}</p>
                  </div>
                  {getRagBadge(eng.rag_status)}
                </div>

                {/* Consultant */}
                <div className="flex items-center gap-2 mb-4">
                  {eng.consultant?.picture ? (
                    <img src={eng.consultant.picture} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-sky-700">{eng.consultant?.name?.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-sm text-slate-600">{eng.consultant?.name || 'Unassigned'}</span>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  {/* Health Score */}
                  <div className="text-center">
                    <p className={`text-xl font-bold font-heading ${getHealthColor(eng.health_score)}`}>
                      {eng.health_score}
                    </p>
                    <p className="text-xs text-slate-500">Health</p>
                  </div>
                  {/* Issues */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {eng.issues_summary?.critical > 0 && (
                        <span className="text-xs font-bold text-red-600">{eng.issues_summary.critical}C</span>
                      )}
                      {eng.issues_summary?.high > 0 && (
                        <span className="text-xs font-bold text-amber-600">{eng.issues_summary.high}H</span>
                      )}
                      {(eng.issues_summary?.critical || 0) + (eng.issues_summary?.high || 0) === 0 && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Issues</p>
                  </div>
                  {/* Risks */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{eng.risks_count || 0}</p>
                    <p className="text-xs text-slate-500">Risks</p>
                  </div>
                </div>

                {/* Last Pulse */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Last pulse: {eng.last_pulse_date ? format(parseISO(eng.last_pulse_date), 'MMM d') : 'Never'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEngagements.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No engagements match your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Topbar component
function Topbar({ user, onLogout, navigate }) {
  return (
    <header className="topbar">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 font-heading">Engagement Pulse</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'ADMIN' && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} data-testid="admin-btn">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          )}
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-700">{user?.name?.charAt(0)}</span>
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
