import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { 
  Activity, LogOut, Calendar, AlertTriangle, CheckCircle2, 
  Clock, FileText, Users, Target, AlertCircle, ChevronRight,
  TrendingUp, Bell, Plus, Edit2, Trash2, Phone, Mail
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
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [milestoneDialog, setMilestoneDialog] = useState({ open: false, data: null });
  const [riskDialog, setRiskDialog] = useState({ open: false, data: null });
  const [issueDialog, setIssueDialog] = useState({ open: false, data: null });
  const [contactDialog, setContactDialog] = useState({ open: false, data: null });

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

      const engRes = await fetch(`${API_URL}/api/engagements`, { headers: getAuthHeader() });
      if (engRes.ok) {
        const engagements = await engRes.json();
        if (engagements.length > 0) {
          const eng = engagements[0];
          setEngagement(eng);

          const [pulseRes, historyRes, msRes, riskRes, issueRes, contactRes] = await Promise.all([
            fetch(`${API_URL}/api/pulses/current-week/${eng.engagement_id}`, { headers: getAuthHeader() }),
            fetch(`${API_URL}/api/pulses/engagement/${eng.engagement_id}`, { headers: getAuthHeader() }),
            fetch(`${API_URL}/api/milestones/engagement/${eng.engagement_id}`, { headers: getAuthHeader() }),
            fetch(`${API_URL}/api/risks/engagement/${eng.engagement_id}`, { headers: getAuthHeader() }),
            fetch(`${API_URL}/api/issues/engagement/${eng.engagement_id}`, { headers: getAuthHeader() }),
            fetch(`${API_URL}/api/contacts/engagement/${eng.engagement_id}`, { headers: getAuthHeader() })
          ]);

          if (pulseRes.ok) setCurrentPulse(await pulseRes.json());
          if (historyRes.ok) setPulseHistory(await historyRes.json());
          if (msRes.ok) setMilestones(await msRes.json());
          if (riskRes.ok) setRisks(await riskRes.json());
          if (issueRes.ok) setIssues(await issueRes.json());
          if (contactRes.ok) setContacts(await contactRes.json());
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // CRUD Handlers
  const handleSaveMilestone = async (data) => {
    try {
      const url = data.milestone_id 
        ? `${API_URL}/api/milestones/${data.milestone_id}`
        : `${API_URL}/api/milestones`;
      const res = await fetch(url, {
        method: data.milestone_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagement.engagement_id })
      });
      if (!res.ok) throw new Error('Failed to save milestone');
      toast.success(data.milestone_id ? 'Milestone updated' : 'Milestone created');
      setMilestoneDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      const res = await fetch(`${API_URL}/api/milestones/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Milestone deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveRisk = async (data) => {
    try {
      const url = data.risk_id 
        ? `${API_URL}/api/risks/${data.risk_id}`
        : `${API_URL}/api/risks`;
      const res = await fetch(url, {
        method: data.risk_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagement.engagement_id })
      });
      if (!res.ok) throw new Error('Failed to save risk');
      toast.success(data.risk_id ? 'Risk updated' : 'Risk created');
      setRiskDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteRisk = async (id) => {
    if (!window.confirm('Delete this risk?')) return;
    try {
      const res = await fetch(`${API_URL}/api/risks/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Risk deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveIssue = async (data) => {
    try {
      const url = data.issue_id 
        ? `${API_URL}/api/issues/${data.issue_id}`
        : `${API_URL}/api/issues`;
      const res = await fetch(url, {
        method: data.issue_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagement.engagement_id })
      });
      if (!res.ok) throw new Error('Failed to save issue');
      toast.success(data.issue_id ? 'Issue updated' : 'Issue created');
      setIssueDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Delete this issue?')) return;
    try {
      const res = await fetch(`${API_URL}/api/issues/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Issue deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveContact = async (data) => {
    try {
      const url = data.contact_id 
        ? `${API_URL}/api/contacts/${data.contact_id}`
        : `${API_URL}/api/contacts`;
      const res = await fetch(url, {
        method: data.contact_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagement.engagement_id })
      });
      if (!res.ok) throw new Error('Failed to save contact');
      toast.success(data.contact_id ? 'Contact updated' : 'Contact created');
      setContactDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contact deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 70) return "text-emerald-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getRagBadge = (status) => {
    const styles = {
      GREEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
      AMBER: "bg-amber-100 text-amber-700 border-amber-200",
      RED: "bg-red-100 text-red-700 border-red-200"
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-2">No Engagement Found</h2>
          <p className="text-slate-600 mb-4">You are not assigned to any engagement.</p>
          <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-background" data-testid="consultant-dashboard">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 font-heading">Engagement Pulse</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">Consultant</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Pulse Due Banner */}
        {!currentPulse && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between" data-testid="pulse-due-banner">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <p className="text-amber-800 font-medium">Weekly pulse due by Friday</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate(`/pulse/${engagement.engagement_id}`)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Submit Now
            </Button>
          </div>
        )}

        {/* Engagement Header */}
        <Card className="mb-6 glass-card" data-testid="engagement-header">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-heading font-bold text-slate-900">{engagement.engagement_name}</h1>
                <p className="text-slate-500 mt-1">{engagement.client_name}</p>
                <div className="flex items-center gap-4 mt-3">
                  {getRagBadge(engagement.rag_status)}
                  <span className="text-sm text-slate-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {format(parseISO(engagement.start_date), 'MMM d')} - {format(parseISO(engagement.target_end_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Health Score */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Health Score</p>
                  <div className="health-circle">
                    <svg className="w-14 h-14" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                      <circle
                        cx="28" cy="28" r="24" fill="none"
                        className={getHealthColor(engagement.health_score).replace('text-', 'stroke-')}
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

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="risks" data-testid="tab-risks">Risks ({risks.filter(r => r.status === 'OPEN').length})</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-issues">Issues ({issues.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length})</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Pulse History</TabsTrigger>
          </TabsList>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle className="text-lg font-heading">Milestones</CardTitle>
                <Button size="sm" onClick={() => setMilestoneDialog({ open: true, data: null })} data-testid="add-milestone-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Milestone
                </Button>
              </CardHeader>
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
                          <Button variant="ghost" size="icon" onClick={() => setMilestoneDialog({ open: true, data: ms })}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMilestone(ms.milestone_id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No milestones defined</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle className="text-lg font-heading">Risks</CardTitle>
                <Button size="sm" onClick={() => setRiskDialog({ open: true, data: null })} data-testid="add-risk-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Risk
                </Button>
              </CardHeader>
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
                          <div className="flex items-center gap-2">
                            <Badge variant={risk.status === 'OPEN' ? 'destructive' : 'secondary'}>{risk.status}</Badge>
                            <Button variant="ghost" size="icon" onClick={() => setRiskDialog({ open: true, data: risk })}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRisk(risk.risk_id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No risks identified</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle className="text-lg font-heading">Issues</CardTitle>
                <Button size="sm" onClick={() => setIssueDialog({ open: true, data: null })} data-testid="add-issue-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Issue
                </Button>
              </CardHeader>
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{issue.status}</Badge>
                            <Button variant="ghost" size="icon" onClick={() => setIssueDialog({ open: true, data: issue })}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteIssue(issue.issue_id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No issues reported</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
                <CardTitle className="text-lg font-heading">Contacts</CardTitle>
                <Button size="sm" onClick={() => setContactDialog({ open: true, data: null })} data-testid="add-contact-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {contacts.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <div key={contact.contact_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{contact.name}</p>
                            <p className="text-sm text-slate-500">{contact.title}</p>
                            <Badge variant="outline" className="mt-2 text-xs">{contact.type}</Badge>
                            {contact.email && (
                              <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {contact.email}
                              </p>
                            )}
                            {contact.phone && (
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {contact.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setContactDialog({ open: true, data: contact })}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.contact_id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No contacts added</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pulse History Tab */}
          <TabsContent value="history">
            <Card className="glass-card">
              <CardContent className="p-6">
                {pulseHistory.length > 0 ? (
                  <div className="space-y-4">
                    {pulseHistory.slice(0, 10).map((pulse) => (
                      <div key={pulse.pulse_id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-lg ml-4">
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
                  <div className="text-center py-8 text-slate-500">No pulse history yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Milestone Dialog */}
      <MilestoneDialog 
        open={milestoneDialog.open} 
        data={milestoneDialog.data} 
        onClose={() => setMilestoneDialog({ open: false, data: null })}
        onSave={handleSaveMilestone}
      />

      {/* Risk Dialog */}
      <RiskDialog 
        open={riskDialog.open} 
        data={riskDialog.data} 
        onClose={() => setRiskDialog({ open: false, data: null })}
        onSave={handleSaveRisk}
      />

      {/* Issue Dialog */}
      <IssueDialog 
        open={issueDialog.open} 
        data={issueDialog.data} 
        onClose={() => setIssueDialog({ open: false, data: null })}
        onSave={handleSaveIssue}
      />

      {/* Contact Dialog */}
      <ContactDialog 
        open={contactDialog.open} 
        data={contactDialog.data} 
        onClose={() => setContactDialog({ open: false, data: null })}
        onSave={handleSaveContact}
      />
    </div>
  );
}

// Milestone Dialog Component
function MilestoneDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', due_date: '', status: 'NOT_STARTED', completion_percent: 0, notes: ''
  });

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title || '',
        due_date: data.due_date?.split('T')[0] || '',
        status: data.status || 'NOT_STARTED',
        completion_percent: data.completion_percent || 0,
        notes: data.notes || ''
      });
    } else {
      setForm({ title: '', due_date: '', status: 'NOT_STARTED', completion_percent: 0, notes: '' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Due Date *</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="AT_RISK">At Risk</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Completion %</Label>
            <Input type="number" min="0" max="100" value={form.completion_percent} onChange={e => setForm(f => ({ ...f, completion_percent: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, milestone_id: data?.milestone_id })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Risk Dialog Component
function RiskDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'TECHNICAL', probability: 'MEDIUM', impact: 'MEDIUM', mitigation_plan: '', status: 'OPEN'
  });

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'TECHNICAL',
        probability: data.probability || 'MEDIUM',
        impact: data.impact || 'MEDIUM',
        mitigation_plan: data.mitigation_plan || '',
        status: data.status || 'OPEN'
      });
    } else {
      setForm({ title: '', description: '', category: 'TECHNICAL', probability: 'MEDIUM', impact: 'MEDIUM', mitigation_plan: '', status: 'OPEN' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="RESOURCE">Resource</SelectItem>
                  <SelectItem value="SCOPE">Scope</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Probability</Label>
              <Select value={form.probability} onValueChange={v => setForm(f => ({ ...f, probability: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact</Label>
              <Select value={form.impact} onValueChange={v => setForm(f => ({ ...f, impact: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="MITIGATED">Mitigated</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mitigation Plan</Label>
            <Textarea value={form.mitigation_plan} onChange={e => setForm(f => ({ ...f, mitigation_plan: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, risk_id: data?.risk_id })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Issue Dialog Component
function IssueDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', severity: 'MEDIUM', status: 'OPEN', owner: '', resolution: ''
  });

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title || '',
        description: data.description || '',
        severity: data.severity || 'MEDIUM',
        status: data.status || 'OPEN',
        owner: data.owner || '',
        resolution: data.resolution || ''
      });
    } else {
      setForm({ title: '', description: '', severity: 'MEDIUM', status: 'OPEN', owner: '', resolution: '' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Issue' : 'Add Issue'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
          </div>
          <div>
            <Label>Resolution</Label>
            <Textarea value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} placeholder="How was this issue resolved?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, issue_id: data?.issue_id })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Contact Dialog Component
function ContactDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', title: '', email: '', phone: '', type: 'CLIENT'
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || '',
        title: data.title || '',
        email: data.email || '',
        phone: data.phone || '',
        type: data.type || 'CLIENT'
      });
    } else {
      setForm({ name: '', title: '', email: '', phone: '', type: 'CLIENT' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Project Manager" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="STAKEHOLDER">Stakeholder</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, contact_id: data?.contact_id })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
