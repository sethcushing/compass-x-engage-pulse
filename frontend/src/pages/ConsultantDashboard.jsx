import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Activity, LogOut, Calendar, AlertTriangle, CheckCircle2, 
  Clock, FileText, Users, Target, AlertCircle, ChevronRight,
  TrendingUp, Bell
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAuthHeader, getCurrentUser, logout } from "../App";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConsultantDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || getCurrentUser());
  const [engagement, setEngagement] = useState(null);
  const [currentPulse, setCurrentPulse] = useState(null);
  const [pulseHistory, setPulseHistory] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user if not available
      if (!user) {
        const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeader() });
        if (!userRes.ok) throw new Error('Not authenticated');
        const userData = await userRes.json();
        setUser(userData);
      }

      // Fetch engagement
      const engRes = await fetch(`${API_URL}/api/engagements`, { headers: getAuthHeader() });
      if (engRes.ok) {
        const engagements = await engRes.json();
        if (engagements.length > 0) {
          const eng = engagements[0];
          setEngagement(eng);

          // Fetch current week pulse
          const pulseRes = await fetch(`${API_URL}/api/pulses/current-week/${eng.engagement_id}`, { credentials: 'include' });
          if (pulseRes.ok) {
            const pulse = await pulseRes.json();
            setCurrentPulse(pulse);
          }

          // Fetch pulse history
          const historyRes = await fetch(`${API_URL}/api/pulses?engagement_id=${eng.engagement_id}`, { credentials: 'include' });
          if (historyRes.ok) {
            setPulseHistory(await historyRes.json());
          }

          // Fetch milestones
          const msRes = await fetch(`${API_URL}/api/milestones?engagement_id=${eng.engagement_id}`, { credentials: 'include' });
          if (msRes.ok) {
            setMilestones(await msRes.json());
          }

          // Fetch risks
          const riskRes = await fetch(`${API_URL}/api/risks?engagement_id=${eng.engagement_id}`, { credentials: 'include' });
          if (riskRes.ok) {
            setRisks(await riskRes.json());
          }

          // Fetch issues
          const issueRes = await fetch(`${API_URL}/api/issues?engagement_id=${eng.engagement_id}`, { credentials: 'include' });
          if (issueRes.ok) {
            setIssues(await issueRes.json());
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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
      console.error('Logout error:', error);
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
    if (score >= 70) return "text-emerald-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getHealthBg = (score) => {
    if (score >= 70) return "stroke-emerald-500";
    if (score >= 40) return "stroke-amber-500";
    return "stroke-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading your engagement...</p>
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="min-h-screen app-background">
        <Topbar user={user} onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="empty-state">
            <Activity className="empty-state-icon" />
            <h2 className="empty-state-title">No Engagement Assigned</h2>
            <p className="empty-state-description">
              You haven't been assigned to any engagement yet. Please contact your admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const needsPulse = !currentPulse;

  return (
    <div className="min-h-screen app-background">
      <Topbar user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Notification Banner */}
        {needsPulse && (
          <div className="notification-banner warning mb-6" data-testid="pulse-reminder-banner">
            <Bell className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Weekly Pulse Due</p>
              <p className="text-sm text-amber-700">Submit your pulse update by Friday EOD</p>
            </div>
            <Button 
              onClick={() => navigate(`/pulse/${engagement.engagement_id}`)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="submit-pulse-btn"
            >
              Submit Now
            </Button>
          </div>
        )}

        {/* Engagement Header Card */}
        <Card className="mb-6 glass-card" data-testid="engagement-header-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{engagement.client?.client_name}</p>
                <h1 className="text-2xl font-bold font-heading text-slate-900">{engagement.engagement_name}</h1>
                <p className="text-sm text-slate-500 font-mono mt-1">{engagement.engagement_code}</p>
              </div>
              <div className="flex items-center gap-6">
                {/* RAG Status */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  {getRagBadge(engagement.rag_status)}
                </div>
                {/* Health Score */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Health</p>
                  <div className="health-circle w-14 h-14">
                    <svg className="w-14 h-14">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                      <circle 
                        cx="28" cy="28" r="24" 
                        fill="none" 
                        className={getHealthBg(engagement.health_score)}
                        strokeWidth="4"
                        strokeDasharray={`${(engagement.health_score / 100) * 150.8} 150.8`}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                      />
                    </svg>
                    <span className={`health-circle-text text-lg ${getHealthColor(engagement.health_score)}`}>
                      {engagement.health_score}
                    </span>
                  </div>
                </div>
                {/* Last Pulse */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Last Pulse</p>
                  <p className="text-sm font-medium text-slate-700">
                    {engagement.last_pulse_date 
                      ? format(parseISO(engagement.last_pulse_date), 'MMM d')
                      : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week's Pulse */}
        <Card className="mb-6 glass-card" data-testid="current-pulse-card">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              This Week's Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {currentPulse ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRagBadge(currentPulse.rag_status_this_week)}
                    <span className="text-sm text-slate-500">
                      Submitted {format(parseISO(currentPulse.submitted_at), 'MMM d, h:mm a')}
                    </span>
                    {currentPulse.is_draft && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Draft</Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/pulse/${engagement.engagement_id}/${currentPulse.pulse_id}`)}
                    data-testid="edit-pulse-btn"
                  >
                    Edit Pulse
                  </Button>
                </div>
                {currentPulse.what_went_well && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">What Went Well</p>
                    <p className="text-sm text-slate-600">{currentPulse.what_went_well}</p>
                  </div>
                )}
                {currentPulse.delivered_this_week && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Delivered This Week</p>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{currentPulse.delivered_this_week}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">No pulse submitted for this week</p>
                <Button 
                  onClick={() => navigate(`/pulse/${engagement.engagement_id}`)}
                  className="btn-primary"
                  data-testid="create-pulse-btn"
                >
                  Submit Weekly Pulse
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for History and Engagement Items */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="history" data-testid="tab-history">Pulse History</TabsTrigger>
            <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="risks" data-testid="tab-risks">Risks ({risks.filter(r => r.status === 'OPEN').length})</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-issues">Issues ({issues.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card className="glass-card">
              <CardContent className="p-6">
                {pulseHistory.length > 0 ? (
                  <div className="space-y-4">
                    {pulseHistory.slice(0, 10).map((pulse, index) => (
                      <div 
                        key={pulse.pulse_id}
                        className="timeline-item"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`timeline-dot ${pulse.rag_status_this_week?.toLowerCase()}`}></div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              Week of {format(parseISO(pulse.week_start_date), 'MMM d, yyyy')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getRagBadge(pulse.rag_status_this_week)}
                              <span className="text-xs text-slate-500">
                                Submitted {format(parseISO(pulse.submitted_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/pulse/${engagement.engagement_id}/${pulse.pulse_id}`)}
                          >
                            View <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No pulse history yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card className="glass-card">
              <CardContent className="p-6">
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((ms) => (
                      <div key={ms.milestone_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className={`w-5 h-5 ${ms.status === 'DONE' ? 'text-emerald-500' : ms.status === 'AT_RISK' ? 'text-amber-500' : 'text-slate-400'}`} />
                          <div>
                            <p className="font-medium text-slate-900">{ms.title}</p>
                            <p className="text-sm text-slate-500">Due: {format(parseISO(ms.due_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${ms.status === 'DONE' ? 'bg-emerald-500' : ms.status === 'AT_RISK' ? 'bg-amber-500' : 'bg-sky-500'}`}
                              style={{ width: `${ms.completion_percent}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-10">{ms.completion_percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No milestones defined
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <Card className="glass-card">
              <CardContent className="p-6">
                {risks.length > 0 ? (
                  <div className="space-y-3">
                    {risks.map((risk) => (
                      <div key={risk.risk_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`w-5 h-5 mt-0.5 ${risk.probability === 'HIGH' && risk.impact === 'HIGH' ? 'text-red-500' : 'text-amber-500'}`} />
                            <div>
                              <p className="font-medium text-slate-900">{risk.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                                <span className="text-xs text-slate-500">P: {risk.probability} | I: {risk.impact}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={risk.status === 'OPEN' ? 'destructive' : 'secondary'}>{risk.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No risks identified
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <Card className="glass-card">
              <CardContent className="p-6">
                {issues.length > 0 ? (
                  <div className="space-y-3">
                    {issues.map((issue) => (
                      <div key={issue.issue_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertCircle className={`w-5 h-5 mt-0.5 ${
                              issue.severity === 'CRITICAL' ? 'text-red-500' : 
                              issue.severity === 'HIGH' ? 'text-amber-500' : 'text-slate-400'
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900">{issue.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                                  {issue.severity}
                                </Badge>
                                {issue.owner && <span className="text-xs text-slate-500">Owner: {issue.owner}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{issue.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No issues logged
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Topbar component
function Topbar({ user, onLogout }) {
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
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-700">{user?.name?.charAt(0)}</span>
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
