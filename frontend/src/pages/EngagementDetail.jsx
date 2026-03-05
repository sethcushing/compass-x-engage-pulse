import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { 
  Activity, ArrowLeft, AlertTriangle, AlertCircle, Target, Users,
  FileText, Phone, Mail, Building2, Calendar, Plus, Edit2, Trash2,
  CheckCircle, XCircle, TrendingUp, Lock, History, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAuthHeader, getCurrentUser } from "../App";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EngagementDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { engagementId } = useParams();
  const [user, setUser] = useState(location.state?.user || getCurrentUser());
  const [engagement, setEngagement] = useState(null);
  const [pulses, setPulses] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [ragTrend, setRagTrend] = useState([]);
  const [fourBlocker, setFourBlocker] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [milestoneDialog, setMilestoneDialog] = useState({ open: false, data: null });
  const [dateChangeDialog, setDateChangeDialog] = useState({ open: false, milestone: null });
  const [dateHistoryDialog, setDateHistoryDialog] = useState({ open: false, milestone: null });
  const [riskDialog, setRiskDialog] = useState({ open: false, data: null });
  const [issueDialog, setIssueDialog] = useState({ open: false, data: null });
  const [contactDialog, setContactDialog] = useState({ open: false, data: null });
  const [meetingDialog, setMeetingDialog] = useState({ open: false, data: null });
  const [actionItemDialog, setActionItemDialog] = useState({ open: false, data: null });

  useEffect(() => {
    fetchData();
  }, [engagementId]);

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
      const engRes = await fetch(`${API_URL}/api/engagements/${engagementId}`, { headers: getAuthHeader() });
      if (!engRes.ok) throw new Error('Engagement not found');
      setEngagement(await engRes.json());

      // Fetch related data
      const [pulsesRes, msRes, risksRes, issuesRes, contactsRes, trendRes, fourBlockerRes, meetingsRes, actionItemsRes] = await Promise.all([
        fetch(`${API_URL}/api/pulses?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/milestones?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/risks?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/issues?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/contacts?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/dashboard/rag-trend/${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/engagements/${engagementId}/four-blocker`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/meetings?engagement_id=${engagementId}`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/action-items?engagement_id=${engagementId}`, { headers: getAuthHeader() })
      ]);

      if (pulsesRes.ok) setPulses(await pulsesRes.json());
      if (msRes.ok) setMilestones(await msRes.json());
      if (risksRes.ok) setRisks(await risksRes.json());
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (trendRes.ok) setRagTrend(await trendRes.json());
      if (fourBlockerRes.ok) setFourBlocker(await fourBlockerRes.json());
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (actionItemsRes.ok) setActionItems(await actionItemsRes.json());

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load engagement');
      navigate(-1);
    } finally {
      setLoading(false);
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

  const canEdit = user?.role === 'ADMIN' || user?.role === 'LEAD' || 
    (user?.role === 'CONSULTANT' && engagement?.consultant_user_id === user?.user_id);

  // CRUD handlers
  const handleSaveMilestone = async (data) => {
    try {
      const url = data.milestone_id 
        ? `${API_URL}/api/milestones/${data.milestone_id}`
        : `${API_URL}/api/milestones`;
      const method = data.milestone_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
      });

      if (!res.ok) throw new Error('Failed to save milestone');
      toast.success(data.milestone_id ? 'Milestone updated' : 'Milestone created');
      setMilestoneDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChangeMilestoneDate = async (milestoneId, newDate, reason) => {
    try {
      const res = await fetch(`${API_URL}/api/milestones/${milestoneId}/change-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ new_date: newDate, reason })
      });
      if (!res.ok) throw new Error('Failed to change date');
      toast.success('Milestone date updated');
      setDateChangeDialog({ open: false, milestone: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      const res = await fetch(`${API_URL}/api/milestones/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
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
      const method = data.risk_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
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
      const res = await fetch(`${API_URL}/api/risks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
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
      const method = data.issue_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
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
      const res = await fetch(`${API_URL}/api/issues/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
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
      const method = data.contact_id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
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
      const res = await fetch(`${API_URL}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contact deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveMeeting = async (data) => {
    try {
      const url = data.meeting_id 
        ? `${API_URL}/api/meetings/${data.meeting_id}`
        : `${API_URL}/api/meetings`;
      const res = await fetch(url, {
        method: data.meeting_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
      });
      if (!res.ok) throw new Error('Failed to save meeting');
      toast.success(data.meeting_id ? 'Meeting updated' : 'Meeting created');
      setMeetingDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Delete this meeting and its action items?')) return;
    try {
      const res = await fetch(`${API_URL}/api/meetings/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Meeting deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCompleteMeeting = async (meeting) => {
    try {
      await fetch(`${API_URL}/api/meetings/${meeting.meeting_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      toast.success('Meeting marked complete. Add action items now!');
      setActionItemDialog({ open: true, data: { meeting_id: meeting.meeting_id } });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveActionItem = async (data) => {
    try {
      const url = data.action_item_id 
        ? `${API_URL}/api/action-items/${data.action_item_id}`
        : `${API_URL}/api/action-items`;
      const res = await fetch(url, {
        method: data.action_item_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, engagement_id: engagementId })
      });
      if (!res.ok) throw new Error('Failed to save action item');
      toast.success(data.action_item_id ? 'Action item updated' : 'Action item created');
      setActionItemDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteActionItem = async (id) => {
    if (!window.confirm('Delete this action item?')) return;
    try {
      const res = await fetch(`${API_URL}/api/action-items/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Action item deleted');
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
          <p className="text-slate-600 font-medium">Loading engagement...</p>
        </div>
      </div>
    );
  }

  if (!engagement) return null;

  return (
    <div className="min-h-screen app-background">
      {/* Topbar */}
      <header className="topbar">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 font-heading">Engagement Pulse</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Engagement Header */}
        <Card className="glass-card mb-6" data-testid="engagement-detail-header">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  {engagement.client?.client_name}
                </div>
                <h1 className="text-2xl font-bold font-heading text-slate-900">{engagement.engagement_name}</h1>
                <p className="text-sm text-slate-500 font-mono mt-1">{engagement.engagement_code}</p>
              </div>
              <div className="flex items-center gap-6">
                {/* RAG Status */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  {getRagBadge(engagement.rag_status)}
                  {engagement.rag_reason && (
                    <p className="text-xs text-slate-500 mt-1 max-w-[150px] truncate" title={engagement.rag_reason}>
                      {engagement.rag_reason}
                    </p>
                  )}
                </div>
                {/* Health Score */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Health</p>
                  <p className={`text-3xl font-bold font-heading ${getHealthColor(engagement.health_score)}`}>
                    {engagement.health_score}
                  </p>
                </div>
                {/* Consultant */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Consultant</p>
                  <div className="flex items-center gap-2">
                    {engagement.consultant?.picture ? (
                      <img src={engagement.consultant.picture} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-sky-700">{engagement.consultant?.name?.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-700">{engagement.consultant?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="pulses" data-testid="tab-pulses">Pulses ({pulses.length})</TabsTrigger>
            <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-meetings">Meetings ({meetings.length})</TabsTrigger>
            <TabsTrigger value="action-items" data-testid="tab-action-items">Actions ({actionItems.filter(a => a.status !== 'DONE').length})</TabsTrigger>
            <TabsTrigger value="risks" data-testid="tab-risks">Risks ({risks.length})</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts ({contacts.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{engagement.overall_summary || 'No summary provided.'}</p>
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Start Date</p>
                      <p className="font-medium text-slate-900">
                        {format(parseISO(engagement.start_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Target End Date</p>
                      <p className="font-medium text-slate-900">
                        {engagement.target_end_date 
                          ? format(parseISO(engagement.target_end_date), 'MMM d, yyyy')
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RAG Trend */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-heading flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-500" />
                    RAG Trend (8 weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ragTrend.length > 0 ? (
                    <div className="space-y-2">
                      {ragTrend.map((week, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-12 shrink-0">
                            {format(parseISO(week.week_start_date), 'M/d')}
                          </span>
                          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                              week.rag_status === 'GREEN' ? 'bg-emerald-500' :
                              week.rag_status === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'
                            }`} style={{ width: week.rag_status === 'GREEN' ? '100%' : week.rag_status === 'AMBER' ? '60%' : '30%' }}></div>
                          </div>
                          <span className={`text-xs font-semibold w-14 text-right ${
                            week.rag_status === 'GREEN' ? 'text-emerald-600' :
                            week.rag_status === 'AMBER' ? 'text-amber-600' : 'text-red-600'
                          }`}>{week.rag_status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No pulse data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* 4-Blocker Overview */}
              {fourBlocker && (
                <Card className="glass-card lg:col-span-3" data-testid="engagement-four-blocker">
                  <CardHeader>
                    <CardTitle className="text-lg font-heading">4-Blocker Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pulse Block */}
                      <div className={`p-4 rounded-xl border-l-4 bg-slate-50 ${
                        fourBlocker.pulse_block.summary?.status === 'CRITICAL' ? 'border-l-red-500' :
                        fourBlocker.pulse_block.summary?.status === 'ATTENTION' ? 'border-l-amber-500' :
                        fourBlocker.pulse_block.summary?.status === 'HEALTHY' ? 'border-l-emerald-500' : 'border-l-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-sky-500" />
                          <h4 className="font-semibold text-slate-900 text-sm">Pulse Status</h4>
                        </div>
                        <p className="text-sm text-slate-600">{fourBlocker.pulse_block.summary?.message}</p>
                      </div>

                      {/* Milestones Block */}
                      <div className={`p-4 rounded-xl border-l-4 bg-slate-50 ${
                        fourBlocker.milestones_block.summary?.status === 'CRITICAL' ? 'border-l-red-500' :
                        fourBlocker.milestones_block.summary?.status === 'ATTENTION' ? 'border-l-amber-500' :
                        fourBlocker.milestones_block.summary?.status === 'HEALTHY' ? 'border-l-emerald-500' : 'border-l-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-sky-500" />
                          <h4 className="font-semibold text-slate-900 text-sm">Milestones</h4>
                        </div>
                        <div className="flex gap-3 mb-1 text-xs">
                          <span className="text-emerald-600">{fourBlocker.milestones_block.completed} done</span>
                          <span className="text-amber-600">{fourBlocker.milestones_block.at_risk} at risk</span>
                          <span className="text-red-600">{fourBlocker.milestones_block.overdue} overdue</span>
                        </div>
                        <p className="text-sm text-slate-600">{fourBlocker.milestones_block.summary?.message}</p>
                      </div>

                      {/* Risks Block */}
                      <div className={`p-4 rounded-xl border-l-4 bg-slate-50 ${
                        fourBlocker.risks_block.summary?.status === 'CRITICAL' ? 'border-l-red-500' :
                        fourBlocker.risks_block.summary?.status === 'ATTENTION' ? 'border-l-amber-500' :
                        fourBlocker.risks_block.summary?.status === 'HEALTHY' ? 'border-l-emerald-500' : 'border-l-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="font-semibold text-slate-900 text-sm">Risks</h4>
                        </div>
                        <div className="flex gap-3 mb-1 text-xs">
                          <span className="text-slate-600">{fourBlocker.risks_block.open} open</span>
                          <span className="text-red-600">{fourBlocker.risks_block.high_impact} high impact</span>
                        </div>
                        <p className="text-sm text-slate-600">{fourBlocker.risks_block.summary?.message}</p>
                      </div>

                      {/* Issues Block */}
                      <div className={`p-4 rounded-xl border-l-4 bg-slate-50 ${
                        fourBlocker.issues_block.summary?.status === 'CRITICAL' ? 'border-l-red-500' :
                        fourBlocker.issues_block.summary?.status === 'ATTENTION' ? 'border-l-amber-500' :
                        fourBlocker.issues_block.summary?.status === 'HEALTHY' ? 'border-l-emerald-500' : 'border-l-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <h4 className="font-semibold text-slate-900 text-sm">Issues</h4>
                        </div>
                        <div className="flex gap-3 mb-1 text-xs">
                          <span className="text-slate-600">{fourBlocker.issues_block.open} open</span>
                          <span className="text-red-600">{fourBlocker.issues_block.critical} critical</span>
                          <span className="text-amber-600">{fourBlocker.issues_block.high} high</span>
                        </div>
                        <p className="text-sm text-slate-600">{fourBlocker.issues_block.summary?.message}</p>
                      </div>

                      {/* Meetings & Actions Block */}
                      <div className={`p-4 rounded-xl border-l-4 bg-slate-50 md:col-span-2 ${
                        fourBlocker.meetings_block?.summary?.status === 'CRITICAL' ? 'border-l-red-500' :
                        fourBlocker.meetings_block?.summary?.status === 'ATTENTION' ? 'border-l-amber-500' :
                        fourBlocker.meetings_block?.summary?.status === 'HEALTHY' ? 'border-l-emerald-500' : 'border-l-violet-300'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-violet-500" />
                          <h4 className="font-semibold text-slate-900 text-sm">Meetings & Actions</h4>
                        </div>
                        <div className="flex gap-4 mb-1 text-xs">
                          <span className="text-slate-600">{fourBlocker.meetings_block?.upcoming || 0} upcoming meetings</span>
                          <span className="text-emerald-600">{fourBlocker.meetings_block?.completed || 0} completed</span>
                          <span className="text-slate-600">{fourBlocker.action_items_block?.open || 0} open action items</span>
                          <span className="text-red-600">{fourBlocker.action_items_block?.overdue || 0} overdue</span>
                        </div>
                        <p className="text-sm text-slate-600">{fourBlocker.meetings_block?.summary?.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Health Score Breakdown */}
              <Card className="glass-card lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Health Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <p className="text-2xl font-bold font-heading text-slate-900">{engagement.health_score}</p>
                      <p className="text-sm text-slate-500">Overall Score</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <p className="text-2xl font-bold font-heading text-slate-900">
                        {issues.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length}
                      </p>
                      <p className="text-sm text-slate-500">Open Issues</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <p className="text-2xl font-bold font-heading text-slate-900">
                        {risks.filter(r => r.status === 'OPEN').length}
                      </p>
                      <p className="text-sm text-slate-500">Open Risks</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <p className="text-2xl font-bold font-heading text-slate-900">
                        {milestones.filter(m => m.status === 'AT_RISK' || m.status === 'BLOCKED').length}
                      </p>
                      <p className="text-sm text-slate-500">At Risk Milestones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pulses Tab */}
          <TabsContent value="pulses">
            <Card className="glass-card">
              <CardContent className="p-6">
                {pulses.length > 0 ? (
                  <div className="space-y-4">
                    {pulses.map((pulse) => (
                      <div key={pulse.pulse_id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/pulse/${engagementId}/${pulse.pulse_id}`, { state: { user } })}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-sky-500" />
                            <span className="font-medium text-slate-900">
                              Week of {format(parseISO(pulse.week_start_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRagBadge(pulse.rag_status_this_week)}
                            {pulse.is_draft && <Badge variant="outline">Draft</Badge>}
                          </div>
                        </div>
                        {pulse.what_went_well && (
                          <p className="text-sm text-slate-600 line-clamp-2">{pulse.what_went_well}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Submitted {format(parseISO(pulse.submitted_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No pulses submitted yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Milestones</CardTitle>
                {canEdit && (
                  <Button 
                    size="sm" 
                    onClick={() => setMilestoneDialog({ open: true, data: null })}
                    data-testid="add-milestone-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Milestone
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((ms) => (
                      <div key={ms.milestone_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <Target className={`w-5 h-5 ${
                            ms.status === 'DONE' ? 'text-emerald-500' :
                            ms.status === 'AT_RISK' || ms.status === 'BLOCKED' ? 'text-amber-500' : 'text-slate-400'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{ms.title}</p>
                            <div className="flex items-center gap-4 mt-1 flex-wrap">
                              <span className="text-sm text-slate-500">Due: {format(parseISO(ms.due_date), 'MMM d, yyyy')}</span>
                              {ms.original_due_date && ms.original_due_date !== ms.due_date && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Original: {format(parseISO(ms.original_due_date), 'MMM d')}
                                </span>
                              )}
                              {ms.date_change_history?.length > 0 && (
                                <button 
                                  onClick={() => setDateHistoryDialog({ open: true, milestone: ms })}
                                  className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                                  data-testid={`date-history-${ms.milestone_id}`}
                                >
                                  <History className="w-3 h-3" />
                                  {ms.date_change_history.length} change(s)
                                </button>
                              )}
                              {ms.owner && <span className="text-sm text-slate-500">Owner: {ms.owner}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={ms.status === 'DONE' ? 'default' : ms.status === 'AT_RISK' ? 'destructive' : 'secondary'}>
                            {ms.status.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${ms.status === 'DONE' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                style={{ width: `${ms.completion_percent}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-slate-600 w-10">{ms.completion_percent}%</span>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setDateChangeDialog({ open: true, milestone: ms })} title="Change Due Date">
                                <Calendar className="w-4 h-4 text-amber-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setMilestoneDialog({ open: true, data: ms })}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMilestone(ms.milestone_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
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

          {/* Meetings Tab */}
          <TabsContent value="meetings">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Meetings</CardTitle>
                {canEdit && (
                  <Button size="sm" onClick={() => setMeetingDialog({ open: true, data: null })} data-testid="add-meeting-btn">
                    <Plus className="w-4 h-4 mr-2" /> Add Meeting
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {meetings.length > 0 ? (
                  <div className="space-y-3">
                    {meetings.map((m) => (
                      <div key={m.meeting_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`meeting-${m.meeting_id}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <Users className={`w-5 h-5 ${m.status === 'COMPLETED' ? 'text-emerald-500' : m.status === 'CANCELLED' ? 'text-slate-400' : 'text-violet-500'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 text-base">{m.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                              <span>{m.date}</span>
                              {m.time && <span>{m.time}</span>}
                              <Badge variant="outline" className="text-xs">{m.meeting_type.replace('_', ' ')}</Badge>
                            </div>
                            {m.attendees && <p className="text-sm text-slate-500 mt-1">Attendees: {m.attendees}</p>}
                            {m.notes && <p className="text-sm text-slate-400 mt-1 italic">{m.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : m.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-700'}>
                            {m.status}
                          </Badge>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              {m.status === 'SCHEDULED' && (
                                <Button variant="ghost" size="sm" onClick={() => handleCompleteMeeting(m)} title="Mark Complete">
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setMeetingDialog({ open: true, data: m })}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMeeting(m.meeting_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-base">No meetings logged yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="action-items">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Action Items</CardTitle>
                {canEdit && (
                  <Button size="sm" onClick={() => setActionItemDialog({ open: true, data: null })} data-testid="add-action-item-btn">
                    <Plus className="w-4 h-4 mr-2" /> Add Action Item
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.map((ai) => {
                      const linkedMeeting = meetings.find(m => m.meeting_id === ai.meeting_id);
                      return (
                        <div key={ai.action_item_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`action-item-${ai.action_item_id}`}>
                          <div className="flex items-center gap-3 flex-1">
                            <CheckCircle className={`w-5 h-5 ${ai.status === 'DONE' ? 'text-emerald-500' : ai.status === 'IN_PROGRESS' ? 'text-sky-500' : 'text-slate-400'}`} />
                            <div className="flex-1">
                              <p className={`font-medium text-base ${ai.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{ai.description}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                {ai.owner && <span>Owner: {ai.owner}</span>}
                                {ai.due_date && <span>Due: {ai.due_date}</span>}
                                {linkedMeeting && (
                                  <span className="text-violet-600 text-xs flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {linkedMeeting.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              ai.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                              ai.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }>{ai.priority}</Badge>
                            <Badge className={
                              ai.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                              ai.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                            }>{ai.status.replace('_', ' ')}</Badge>
                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setActionItemDialog({ open: true, data: ai })}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteActionItem(ai.action_item_id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-base">No action items yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Risks</CardTitle>
                {canEdit && (
                  <Button 
                    size="sm" 
                    onClick={() => setRiskDialog({ open: true, data: null })}
                    data-testid="add-risk-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Risk
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {risks.length > 0 ? (
                  <div className="space-y-3">
                    {risks.map((risk) => (
                      <div key={risk.risk_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                              risk.probability === 'HIGH' && risk.impact === 'HIGH' ? 'text-red-500' : 'text-amber-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{risk.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline">{risk.category}</Badge>
                                <span className="text-xs text-slate-500">P: {risk.probability} | I: {risk.impact}</span>
                                {risk.owner && <span className="text-xs text-slate-500">Owner: {risk.owner}</span>}
                              </div>
                              {risk.mitigation_plan && (
                                <p className="text-sm text-slate-500 mt-2 italic">Mitigation: {risk.mitigation_plan}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={risk.status === 'OPEN' ? 'destructive' : 'secondary'}>{risk.status}</Badge>
                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setRiskDialog({ open: true, data: risk })}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRisk(risk.risk_id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
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

          {/* Issues Tab */}
          <TabsContent value="issues">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Issues</CardTitle>
                {canEdit && (
                  <Button 
                    size="sm" 
                    onClick={() => setIssueDialog({ open: true, data: null })}
                    data-testid="add-issue-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Issue
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {issues.length > 0 ? (
                  <div className="space-y-3">
                    {issues.map((issue) => (
                      <div key={issue.issue_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <AlertCircle className={`w-5 h-5 mt-0.5 ${
                              issue.severity === 'CRITICAL' ? 'text-red-500' :
                              issue.severity === 'HIGH' ? 'text-amber-500' : 'text-slate-400'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{issue.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                                  {issue.severity}
                                </Badge>
                                {issue.owner && <span className="text-xs text-slate-500">Owner: {issue.owner}</span>}
                                {issue.due_date && (
                                  <span className="text-xs text-slate-500">Due: {format(parseISO(issue.due_date), 'MMM d')}</span>
                                )}
                              </div>
                              {issue.resolution && (
                                <p className="text-sm text-emerald-600 mt-2">Resolution: {issue.resolution}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{issue.status.replace('_', ' ')}</Badge>
                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setIssueDialog({ open: true, data: issue })}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteIssue(issue.issue_id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
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

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Contacts</CardTitle>
                {canEdit && (
                  <Button 
                    size="sm" 
                    onClick={() => setContactDialog({ open: true, data: null })}
                    data-testid="add-contact-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <div key={contact.contact_id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-sky-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-slate-900">{contact.name}</p>
                              {contact.title && <p className="text-sm text-slate-500">{contact.title}</p>}
                              <Badge variant="outline" className="mt-1">{contact.type}</Badge>
                              <div className="mt-2 space-y-1">
                                {contact.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail className="w-4 h-4" />
                                    <a href={`mailto:${contact.email}`} className="hover:text-sky-600">{contact.email}</a>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="w-4 h-4" />
                                    <span>{contact.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setContactDialog({ open: true, data: contact })}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.contact_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No contacts added
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <MilestoneDialog 
          open={milestoneDialog.open} 
          data={milestoneDialog.data}
          onClose={() => setMilestoneDialog({ open: false, data: null })}
          onSave={handleSaveMilestone}
        />
        <RiskDialog 
          open={riskDialog.open} 
          data={riskDialog.data}
          onClose={() => setRiskDialog({ open: false, data: null })}
          onSave={handleSaveRisk}
        />
        <IssueDialog 
          open={issueDialog.open} 
          data={issueDialog.data}
          onClose={() => setIssueDialog({ open: false, data: null })}
          onSave={handleSaveIssue}
        />
        <ContactDialog 
          open={contactDialog.open} 
          data={contactDialog.data}
          onClose={() => setContactDialog({ open: false, data: null })}
          onSave={handleSaveContact}
        />
        <DateChangeDialog
          open={dateChangeDialog.open}
          milestone={dateChangeDialog.milestone}
          onClose={() => setDateChangeDialog({ open: false, milestone: null })}
          onSave={handleChangeMilestoneDate}
        />
        <DateHistoryDialog
          open={dateHistoryDialog.open}
          milestone={dateHistoryDialog.milestone}
          onClose={() => setDateHistoryDialog({ open: false, milestone: null })}
        />
        <MeetingDialog
          open={meetingDialog.open}
          data={meetingDialog.data}
          onClose={() => setMeetingDialog({ open: false, data: null })}
          onSave={handleSaveMeeting}
        />
        <ActionItemDialog
          open={actionItemDialog.open}
          data={actionItemDialog.data}
          meetings={meetings}
          onClose={() => setActionItemDialog({ open: false, data: null })}
          onSave={handleSaveActionItem}
        />
      </main>
    </div>
  );
}

// Milestone Dialog
function MilestoneDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    owner: '',
    due_date: '',
    status: 'NOT_STARTED',
    completion_percent: 0
  });

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        due_date: data.due_date ? format(parseISO(data.due_date), 'yyyy-MM-dd') : ''
      });
    } else {
      setForm({ title: '', description: '', owner: '', due_date: '', status: 'NOT_STARTED', completion_percent: 0 });
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
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="AT_RISK">At Risk</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion %</Label>
              <Input type="number" min="0" max="100" value={form.completion_percent} onChange={e => setForm(f => ({ ...f, completion_percent: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, milestone_id: data?.milestone_id, due_date: new Date(form.due_date).toISOString() })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Risk Dialog
function RiskDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'OTHER', probability: 'MEDIUM', impact: 'MEDIUM',
    mitigation_plan: '', owner: '', status: 'OPEN'
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ title: '', description: '', category: 'OTHER', probability: 'MEDIUM', impact: 'MEDIUM', mitigation_plan: '', owner: '', status: 'OPEN' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['SCOPE', 'SCHEDULE', 'RESOURCING', 'DEPENDENCY', 'TECH', 'SECURITY', 'BUDGET', 'OTHER'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <Label>Owner</Label>
            <Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
          </div>
          <div>
            <Label>Mitigation Plan</Label>
            <Textarea value={form.mitigation_plan || ''} onChange={e => setForm(f => ({ ...f, mitigation_plan: e.target.value }))} />
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

// Issue Dialog
function IssueDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', severity: 'MEDIUM', status: 'OPEN', owner: '', resolution: ''
  });

  useEffect(() => {
    if (data) {
      setForm(data);
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
            <Label>Title</Label>
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
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
          </div>
          {(form.status === 'RESOLVED' || form.status === 'CLOSED') && (
            <div>
              <Label>Resolution</Label>
              <Textarea value={form.resolution || ''} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, issue_id: data?.issue_id })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Contact Dialog
function ContactDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', title: '', email: '', phone: '', type: 'CLIENT', notes: ''
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ name: '', title: '', email: '', phone: '', type: 'CLIENT', notes: '' });
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
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

// Date Change Dialog
function DateChangeDialog({ open, milestone, onClose, onSave }) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setNewDate(milestone?.due_date?.split('T')[0] || '');
      setReason('');
    }
  }, [open, milestone]);

  const handleSubmit = () => {
    if (!newDate || !reason.trim()) return;
    onSave(milestone.milestone_id, new Date(newDate).toISOString(), reason);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Due Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-900">{milestone?.title}</p>
            <p className="text-xs text-slate-500 mt-1">
              Current date: {milestone?.due_date ? format(parseISO(milestone.due_date), 'MMM d, yyyy') : 'N/A'}
            </p>
            {milestone?.original_due_date && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Original: {format(parseISO(milestone.original_due_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <div>
            <Label>New Due Date *</Label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} data-testid="date-change-input" />
          </div>
          <div>
            <Label>Reason for Change *</Label>
            <Textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Explain why the date needs to change..."
              data-testid="date-change-reason"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!newDate || !reason.trim()} data-testid="date-change-submit">
            Update Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Date History Dialog
function DateHistoryDialog({ open, milestone, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-500" />
            Date Change History
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-900">{milestone?.title}</p>
            {milestone?.original_due_date && (
              <p className="text-xs text-slate-500 mt-1">
                Original date: {format(parseISO(milestone.original_due_date), 'MMM d, yyyy')}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Current date: {milestone?.due_date ? format(parseISO(milestone.due_date), 'MMM d, yyyy') : 'N/A'}
            </p>
          </div>
          {milestone?.date_change_history?.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {milestone.date_change_history.map((change, i) => (
                <div key={i} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{change.changed_by_name}</span>
                    <span className="text-xs text-slate-500">
                      {format(parseISO(change.changed_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <span>{format(parseISO(change.previous_date), 'MMM d, yyyy')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{format(parseISO(change.new_date), 'MMM d, yyyy')}</span>
                  </div>
                  <p className="text-sm text-slate-500 italic">"{change.reason}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No date changes recorded</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Meeting Dialog
function MeetingDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', meeting_type: 'OTHER', date: '', time: '', attendees: '', notes: '', status: 'SCHEDULED'
  });

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title || '', meeting_type: data.meeting_type || 'OTHER',
        date: data.date || '', time: data.time || '',
        attendees: data.attendees || '', notes: data.notes || '',
        status: data.status || 'SCHEDULED'
      });
    } else {
      setForm({ title: '', meeting_type: 'OTHER', date: '', time: '', attendees: '', notes: '', status: 'SCHEDULED' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.meeting_id ? 'Edit Meeting' : 'Add Meeting'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="meeting-title-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} data-testid="meeting-date-input" />
            </div>
            <div>
              <Label>Time</Label>
              <Input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="e.g., 10:00 AM" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meeting Type</Label>
              <Select value={form.meeting_type} onValueChange={v => setForm(f => ({ ...f, meeting_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT_CALL">Client Call</SelectItem>
                  <SelectItem value="INTERNAL_SYNC">Internal Sync</SelectItem>
                  <SelectItem value="STEERING_COMMITTEE">Steering Committee</SelectItem>
                  <SelectItem value="WORKSHOP">Workshop</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Attendees</Label>
            <Input value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} placeholder="e.g., John, Sarah, Client PM" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Meeting notes or agenda..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, meeting_id: data?.meeting_id })} disabled={!form.title || !form.date}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Action Item Dialog
function ActionItemDialog({ open, data, meetings, onClose, onSave }) {
  const [form, setForm] = useState({
    description: '', owner: '', due_date: '', status: 'OPEN', priority: 'MEDIUM', meeting_id: ''
  });

  useEffect(() => {
    if (data?.action_item_id) {
      setForm({
        description: data.description || '', owner: data.owner || '',
        due_date: data.due_date || '', status: data.status || 'OPEN',
        priority: data.priority || 'MEDIUM', meeting_id: data.meeting_id || ''
      });
    } else {
      setForm({
        description: '', owner: '', due_date: '', status: 'OPEN',
        priority: 'MEDIUM', meeting_id: data?.meeting_id || ''
      });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.action_item_id ? 'Edit Action Item' : 'Add Action Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What needs to be done?" data-testid="action-item-description-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Owner</Label>
              <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Responsible person" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
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
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {meetings && meetings.length > 0 && (
            <div>
              <Label>Linked Meeting (optional)</Label>
              <Select value={form.meeting_id || 'none'} onValueChange={v => setForm(f => ({ ...f, meeting_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked meeting</SelectItem>
                  {meetings.map(m => (
                    <SelectItem key={m.meeting_id} value={m.meeting_id}>{m.title} ({m.date})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, action_item_id: data?.action_item_id })} disabled={!form.description}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
