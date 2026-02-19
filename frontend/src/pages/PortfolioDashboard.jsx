import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { 
  Activity, LogOut, Search, AlertTriangle, AlertCircle,
  Target, ChevronRight, Settings, Clock, Building2,
  BarChart3, Menu, Plus, Users, Briefcase, Home, MoreVertical,
  Edit2, Trash2, X, CheckCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAuthHeader, getCurrentUser, logout } from "../App";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PortfolioDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || getCurrentUser());
  const [summary, setSummary] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    rag: "all",
    missingPulse: false
  });

  // Dialog states
  const [clientDialog, setClientDialog] = useState({ open: false, data: null });
  const [engagementDialog, setEngagementDialog] = useState({ open: false, data: null });
  const [userDialog, setUserDialog] = useState({ open: false, data: null });
  
  // Management sheet states
  const [clientsSheet, setClientsSheet] = useState(false);
  const [consultantsSheet, setConsultantsSheet] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!user) {
        const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeader() });
        if (!userRes.ok) throw new Error('Not authenticated');
        const userData = await userRes.json();
        setUser(userData);
      }

      const summaryRes = await fetch(`${API_URL}/api/dashboard/summary`, { headers: getAuthHeader() });
      if (summaryRes.ok) setSummary(await summaryRes.json());

      const engRes = await fetch(`${API_URL}/api/engagements`, { headers: getAuthHeader() });
      if (engRes.ok) setEngagements(await engRes.json());

      const clientsRes = await fetch(`${API_URL}/api/clients`, { headers: getAuthHeader() });
      if (clientsRes.ok) setClients(await clientsRes.json());

      const usersRes = await fetch(`${API_URL}/api/users`, { headers: getAuthHeader() });
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: getAuthHeader() });
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

  // CRUD Handlers
  const handleSaveClient = async (data) => {
    try {
      const url = data.client_id 
        ? `${API_URL}/api/clients/${data.client_id}`
        : `${API_URL}/api/clients`;
      const method = data.client_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save client');
      }
      toast.success(data.client_id ? 'Client updated' : 'Client created');
      setClientDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This will also affect related engagements.')) return;
    try {
      const res = await fetch(`${API_URL}/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete client');
      toast.success('Client deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveEngagement = async (data) => {
    try {
      const url = data.engagement_id 
        ? `${API_URL}/api/engagements/${data.engagement_id}`
        : `${API_URL}/api/engagements`;
      const method = data.engagement_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save engagement');
      }
      toast.success(data.engagement_id ? 'Engagement updated' : 'Engagement created');
      setEngagementDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteEngagement = async (engagementId) => {
    if (!window.confirm('Are you sure you want to delete this engagement?')) return;
    try {
      const res = await fetch(`${API_URL}/api/engagements/${engagementId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete engagement');
      toast.success('Engagement deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCompleteEngagement = async (engagement) => {
    if (!window.confirm(`Mark "${engagement.engagement_name}" as complete? This will set it as inactive.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/engagements/${engagement.engagement_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        headers: getAuthHeader(),
        body: JSON.stringify({
          is_active: false,
          completed_date: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error('Failed to complete engagement');
      toast.success('Engagement marked as complete');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveUser = async (data) => {
    try {
      const url = data.user_id 
        ? `${API_URL}/api/users/${data.user_id}`
        : `${API_URL}/api/users`;
      const method = data.user_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save user');
      }
      toast.success(data.user_id ? 'User updated' : 'User created');
      setUserDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

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
      {/* Sidebar for Desktop */}
      <aside className="sidebar">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 font-heading">Engagement Pulse</span>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          <a href="/portfolio" className="sidebar-link active">
            <Home className="w-5 h-5" />
            Dashboard
          </a>
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Manage</p>
          </div>
          <button onClick={() => setClientsSheet(true)} className="sidebar-link w-full text-left">
            <Building2 className="w-5 h-5" />
            Clients ({clients.length})
          </button>
          <button onClick={() => setConsultantsSheet(true)} className="sidebar-link w-full text-left">
            <Users className="w-5 h-5" />
            Consultants ({users.filter(u => u.role === 'CONSULTANT').length})
          </button>
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Add</p>
          </div>
          <button onClick={() => setClientDialog({ open: true, data: null })} className="sidebar-link w-full text-left">
            <Plus className="w-5 h-5" />
            New Client
          </button>
          <button onClick={() => setEngagementDialog({ open: true, data: null })} className="sidebar-link w-full text-left">
            <Plus className="w-5 h-5" />
            New Engagement
          </button>
          <button onClick={() => setUserDialog({ open: true, data: null })} className="sidebar-link w-full text-left">
            <Plus className="w-5 h-5" />
            New Consultant
          </button>
          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
              </div>
              <a href="/admin" className="sidebar-link">
                <Settings className="w-5 h-5" />
                Admin Setup
              </a>
            </>
          )}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-700">{user?.name?.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden topbar">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-700">{user?.name?.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 font-heading">Pulse</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <a href="/portfolio" className="sidebar-link active" onClick={() => setSidebarOpen(false)}>
              <Home className="w-5 h-5" />
              Dashboard
            </a>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Manage</p>
            </div>
            <button onClick={() => { setClientsSheet(true); setSidebarOpen(false); }} className="sidebar-link w-full text-left">
              <Building2 className="w-5 h-5" />
              Clients
            </button>
            <button onClick={() => { setConsultantsSheet(true); setSidebarOpen(false); }} className="sidebar-link w-full text-left">
              <Users className="w-5 h-5" />
              Consultants
            </button>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Add</p>
            </div>
            <button onClick={() => { setClientDialog({ open: true, data: null }); setSidebarOpen(false); }} className="sidebar-link w-full text-left">
              <Plus className="w-5 h-5" />
              New Client
            </button>
            <button onClick={() => { setEngagementDialog({ open: true, data: null }); setSidebarOpen(false); }} className="sidebar-link w-full text-left">
              <Plus className="w-5 h-5" />
              New Engagement
            </button>
            <button onClick={() => { setUserDialog({ open: true, data: null }); setSidebarOpen(false); }} className="sidebar-link w-full text-left">
              <Plus className="w-5 h-5" />
              New Consultant
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:ml-64">
        <main className="p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold font-heading text-slate-900">Portfolio Dashboard</h1>
              <p className="text-slate-600 mt-1">Monitor engagement health across all clients</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setClientsSheet(true)}>
                <Building2 className="w-4 h-4 mr-1" />
                Clients
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConsultantsSheet(true)}>
                <Users className="w-4 h-4 mr-1" />
                Consultants
              </Button>
              <Button size="sm" onClick={() => setEngagementDialog({ open: true, data: null })} className="bg-sky-500 hover:bg-sky-600">
                <Plus className="w-4 h-4 mr-1" />
                Engagement
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <Card className="glass-card stat-card blue" data-testid="total-engagements-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active Engagements</p>
                    <p className="text-3xl font-bold text-slate-900 font-heading mt-1">{summary?.total_engagements || 0}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-sky-400" />
                </div>
                <p className="text-xs text-slate-500 mt-2">Across {clients.length} clients</p>
              </CardContent>
            </Card>
          </div>

          {/* Critical Items Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                        onClick={() => navigate(`/engagement/${issue.engagement_id}`)}>
                        <p className="font-medium text-slate-900 text-sm">{issue.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{issue.engagement?.engagement_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">No critical issues</div>
                )}
              </CardContent>
            </Card>

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
                        onClick={() => navigate(`/engagement/${risk.engagement_id}`)}>
                        <p className="font-medium text-slate-900 text-sm">{risk.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{risk.engagement?.engagement_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">No high impact risks</div>
                )}
              </CardContent>
            </Card>

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
                        onClick={() => navigate(`/engagement/${ms.engagement_id}`)}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 text-sm">{ms.title}</p>
                          <span className="text-xs text-slate-500">{format(parseISO(ms.due_date), 'MMM d')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{ms.engagement?.engagement_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">No upcoming milestones</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="engagements-grid">
            {filteredEngagements.map((eng, index) => (
              <Card 
                key={eng.engagement_id}
                className="glass-card animate-fadeInUp relative group"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`engagement-card-${eng.engagement_id}`}
              >
                {/* Actions Dropdown */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/engagement/${eng.engagement_id}`, { state: { user } })}>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEngagementDialog({ open: true, data: eng }); }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleCompleteEngagement(eng); }}
                        className="text-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleDeleteEngagement(eng.engagement_id); }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-5 cursor-pointer" onClick={() => navigate(`/engagement/${eng.engagement_id}`, { state: { user } })}>
                  <div className="flex items-start justify-between mb-4 pr-8">
                    <div>
                      <p className="text-sm text-slate-500">{eng.client?.client_name}</p>
                      <h3 className="font-semibold text-slate-900 font-heading mt-0.5">{eng.engagement_name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{eng.engagement_code}</p>
                    </div>
                    {getRagBadge(eng.rag_status)}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {eng.consultant?.picture ? (
                      <img src={eng.consultant.picture} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-sky-700">{eng.consultant?.name?.charAt(0) || '?'}</span>
                      </div>
                    )}
                    <span className="text-sm text-slate-600">{eng.consultant?.name || 'Unassigned'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className={`text-xl font-bold font-heading ${getHealthColor(eng.health_score)}`}>
                        {eng.health_score}
                      </p>
                      <p className="text-xs text-slate-500">Health</p>
                    </div>
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
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">{eng.risks_count || 0}</p>
                      <p className="text-xs text-slate-500">Risks</p>
                    </div>
                  </div>

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

      {/* Clients Management Sheet */}
      <Sheet open={clientsSheet} onOpenChange={setClientsSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Manage Clients</span>
              <Button size="sm" onClick={() => { setClientDialog({ open: true, data: null }); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Client
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {clients.map((client) => (
              <div key={client.client_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{client.client_name}</p>
                  <p className="text-sm text-slate-500">{client.industry || 'No industry'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setClientDialog({ open: true, data: client })}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.client_id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-center text-slate-500 py-8">No clients yet</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Consultants Management Sheet */}
      <Sheet open={consultantsSheet} onOpenChange={setConsultantsSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Manage Consultants</span>
              <Button size="sm" onClick={() => { setUserDialog({ open: true, data: null }); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Consultant
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {users.filter(u => u.role === 'CONSULTANT').map((consultant) => {
              const engagement = engagements.find(e => e.consultant_user_id === consultant.user_id);
              return (
                <div key={consultant.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {consultant.picture ? (
                      <img src={consultant.picture} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-sky-700">{consultant.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{consultant.name}</p>
                      <p className="text-sm text-slate-500">{consultant.email}</p>
                      {engagement && (
                        <p className="text-xs text-sky-600 mt-0.5">{engagement.client?.client_name} - {engagement.engagement_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setUserDialog({ open: true, data: consultant })}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {users.filter(u => u.role === 'CONSULTANT').length === 0 && (
              <p className="text-center text-slate-500 py-8">No consultants yet</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <ClientDialog 
        open={clientDialog.open}
        data={clientDialog.data}
        onClose={() => setClientDialog({ open: false, data: null })}
        onSave={handleSaveClient}
      />
      <EngagementDialog 
        open={engagementDialog.open}
        data={engagementDialog.data}
        clients={clients}
        users={users.filter(u => u.role === 'CONSULTANT')}
        onClose={() => setEngagementDialog({ open: false, data: null })}
        onSave={handleSaveEngagement}
      />
      <UserDialog 
        open={userDialog.open}
        data={userDialog.data}
        onClose={() => setUserDialog({ open: false, data: null })}
        onSave={handleSaveUser}
      />
    </div>
  );
}

// Client Dialog
function ClientDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    client_name: '',
    industry: '',
    notes: '',
    primary_contact_name: '',
    primary_contact_email: ''
  });

  useEffect(() => {
    if (open) {
      if (data) {
        setForm({
          client_name: data.client_name || '',
          industry: data.industry || '',
          notes: data.notes || '',
          primary_contact_name: data.primary_contact_name || '',
          primary_contact_email: data.primary_contact_email || ''
        });
      } else {
        setForm({ client_name: '', industry: '', notes: '', primary_contact_name: '', primary_contact_email: '' });
      }
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client Name *</Label>
            <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Enter client name" />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g., Technology, Healthcare" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Contact</Label>
              <Input value={form.primary_contact_name} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, client_id: data?.client_id })} disabled={!form.client_name} className="bg-sky-500 hover:bg-sky-600">
            {data ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Engagement Dialog
function EngagementDialog({ open, data, clients, users, onClose, onSave }) {
  const [form, setForm] = useState({
    client_id: '',
    engagement_name: '',
    engagement_code: '',
    consultant_user_id: '',
    start_date: '',
    target_end_date: '',
    rag_status: 'GREEN',
    overall_summary: ''
  });

  useEffect(() => {
    if (open) {
      if (data) {
        setForm({
          client_id: data.client_id || '',
          engagement_name: data.engagement_name || '',
          engagement_code: data.engagement_code || '',
          consultant_user_id: data.consultant_user_id || '',
          start_date: data.start_date ? format(parseISO(data.start_date), 'yyyy-MM-dd') : '',
          target_end_date: data.target_end_date ? format(parseISO(data.target_end_date), 'yyyy-MM-dd') : '',
          rag_status: data.rag_status || 'GREEN',
          overall_summary: data.overall_summary || ''
        });
      } else {
        setForm({
          client_id: '', engagement_name: '', engagement_code: '', consultant_user_id: '',
          start_date: format(new Date(), 'yyyy-MM-dd'), target_end_date: '', rag_status: 'GREEN', overall_summary: ''
        });
      }
    }
  }, [data, open]);

  const handleSubmit = () => {
    onSave({
      ...form,
      engagement_id: data?.engagement_id,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      target_end_date: form.target_end_date ? new Date(form.target_end_date).toISOString() : null,
      consultant_user_id: form.consultant_user_id || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Engagement' : 'Add New Engagement'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.client_id} value={c.client_id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Engagement Name *</Label>
            <Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} placeholder="e.g., Digital Transformation" />
          </div>
          <div>
            <Label>Engagement Code *</Label>
            <Input value={form.engagement_code} onChange={e => setForm(f => ({ ...f, engagement_code: e.target.value }))} placeholder="e.g., INF-DT-2024" />
          </div>
          <div>
            <Label>Consultant</Label>
            <Select value={form.consultant_user_id || 'none'} onValueChange={v => setForm(f => ({ ...f, consultant_user_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select consultant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.target_end_date} onChange={e => setForm(f => ({ ...f, target_end_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>RAG Status</Label>
            <Select value={form.rag_status} onValueChange={v => setForm(f => ({ ...f, rag_status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">Green</SelectItem>
                <SelectItem value="AMBER">Amber</SelectItem>
                <SelectItem value="RED">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea value={form.overall_summary} onChange={e => setForm(f => ({ ...f, overall_summary: e.target.value }))} placeholder="Brief description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.client_id || !form.engagement_name || !form.engagement_code || !form.start_date} className="bg-sky-500 hover:bg-sky-600">
            {data ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// User Dialog
function UserDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'CONSULTANT',
    is_active: true
  });

  useEffect(() => {
    if (open) {
      if (data) {
        setForm({
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'CONSULTANT',
          is_active: data.is_active !== false
        });
      } else {
        setForm({ name: '', email: '', role: 'CONSULTANT', is_active: true });
      }
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit User' : 'Add New Consultant'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" disabled={!!data} />
            {!data && <p className="text-xs text-slate-500 mt-1">User can login with this email via Google</p>}
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSULTANT">Consultant</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <Label htmlFor="is_active">Active</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, user_id: data?.user_id })} disabled={!form.name || (!data && !form.email)} className="bg-sky-500 hover:bg-sky-600">
            {data ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
