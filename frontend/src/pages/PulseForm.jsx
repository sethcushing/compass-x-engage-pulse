import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { 
  Activity, ArrowLeft, Save, Send, CheckCircle, Clock, FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PulseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { engagementId, pulseId } = useParams();
  const [user, setUser] = useState(location.state?.user || null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [form, setForm] = useState({
    rag_status_this_week: 'GREEN',
    what_went_well: '',
    delivered_this_week: '',
    issues_facing: '',
    roadblocks: '',
    plan_next_week: '',
    time_allocation: '',
    sentiment: ''
  });

  useEffect(() => {
    fetchData();
  }, [engagementId, pulseId]);

  const fetchData = async () => {
    try {
      // Fetch user if not available
      if (!user) {
        const userRes = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!userRes.ok) throw new Error('Not authenticated');
        const userData = await userRes.json();
        setUser(userData);
        
        // Check if user is not consultant - they can only view
        if (userData.role !== 'CONSULTANT') {
          setIsReadOnly(true);
        }
      } else if (user.role !== 'CONSULTANT') {
        setIsReadOnly(true);
      }

      // Fetch engagement
      const engRes = await fetch(`${API_URL}/api/engagements/${engagementId}`, { credentials: 'include' });
      if (!engRes.ok) throw new Error('Engagement not found');
      setEngagement(await engRes.json());

      // Fetch pulse if editing
      if (pulseId) {
        const pulseRes = await fetch(`${API_URL}/api/pulses/${pulseId}`, { credentials: 'include' });
        if (pulseRes.ok) {
          const pulse = await pulseRes.json();
          setForm({
            rag_status_this_week: pulse.rag_status_this_week || 'GREEN',
            what_went_well: pulse.what_went_well || '',
            delivered_this_week: pulse.delivered_this_week || '',
            issues_facing: pulse.issues_facing || '',
            roadblocks: pulse.roadblocks || '',
            plan_next_week: pulse.plan_next_week || '',
            time_allocation: pulse.time_allocation || '',
            sentiment: pulse.sentiment || ''
          });
          
          // Check if pulse is editable (before week end)
          const weekEnd = parseISO(pulse.week_end_date);
          if (new Date() > weekEnd && user?.role !== 'ADMIN') {
            setIsReadOnly(true);
          }
        }
      } else {
        // Check if current week pulse exists
        const currentRes = await fetch(`${API_URL}/api/pulses/current-week/${engagementId}`, { credentials: 'include' });
        if (currentRes.ok) {
          const existingPulse = await currentRes.json();
          if (existingPulse) {
            // Redirect to edit
            navigate(`/pulse/${engagementId}/${existingPulse.pulse_id}`, { state: { user }, replace: true });
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pulse form');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isDraft = true) => {
    if (!form.rag_status_this_week) {
      toast.error('Please select a RAG status');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        engagement_id: engagementId,
        rag_status_this_week: form.rag_status_this_week,
        what_went_well: form.what_went_well || null,
        delivered_this_week: form.delivered_this_week || null,
        issues_facing: form.issues_facing || null,
        roadblocks: form.roadblocks || null,
        plan_next_week: form.plan_next_week || null,
        time_allocation: form.time_allocation ? parseFloat(form.time_allocation) : null,
        sentiment: form.sentiment || null,
        is_draft: isDraft
      };

      const url = pulseId ? `${API_URL}/api/pulses/${pulseId}` : `${API_URL}/api/pulses`;
      const method = pulseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save pulse');
      }

      const savedPulse = await res.json();
      toast.success(isDraft ? 'Draft saved' : 'Pulse submitted successfully');
      
      if (!isDraft) {
        navigate(`/my-engagement`, { state: { user } });
      } else if (!pulseId) {
        navigate(`/pulse/${engagementId}/${savedPulse.pulse_id}`, { state: { user }, replace: true });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRagColor = (status) => {
    switch (status) {
      case 'GREEN': return 'bg-emerald-500 border-emerald-600';
      case 'AMBER': return 'bg-amber-500 border-amber-600';
      case 'RED': return 'bg-red-500 border-red-600';
      default: return 'bg-slate-200';
    }
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

  return (
    <div className="min-h-screen app-background">
      {/* Topbar */}
      <header className="topbar">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
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
              <span className="text-lg font-bold text-slate-900 font-heading">Weekly Pulse</span>
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSave(true)}
                disabled={saving}
                data-testid="save-draft-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => handleSave(false)}
                disabled={saving}
                className="bg-sky-500 hover:bg-sky-600"
                data-testid="submit-pulse-btn"
              >
                <Send className="w-4 h-4 mr-2" />
                {saving ? 'Submitting...' : 'Submit Pulse'}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Engagement Info */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{engagement?.client?.client_name}</p>
            <h1 className="text-xl font-bold font-heading text-slate-900">{engagement?.engagement_name}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Week of</p>
            <p className="font-medium text-slate-900">
              {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-amber-800">
              {user?.role !== 'CONSULTANT' 
                ? 'View-only mode. Only consultants can edit pulses.'
                : 'This pulse is read-only as the submission window has closed.'}
            </p>
          </div>
        )}

        {/* RAG Status */}
        <Card className="glass-card mb-6" data-testid="rag-section">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              RAG Status This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={form.rag_status_this_week} 
              onValueChange={v => setForm(f => ({ ...f, rag_status_this_week: v }))}
              className="flex gap-6"
              disabled={isReadOnly}
            >
              {['GREEN', 'AMBER', 'RED'].map((status) => (
                <label 
                  key={status}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.rag_status_this_week === status 
                      ? `border-${status.toLowerCase() === 'green' ? 'emerald' : status.toLowerCase() === 'amber' ? 'amber' : 'red'}-500 bg-${status.toLowerCase() === 'green' ? 'emerald' : status.toLowerCase() === 'amber' ? 'amber' : 'red'}-50`
                      : 'border-slate-200 hover:border-slate-300'
                  } ${isReadOnly ? 'cursor-default' : ''}`}
                >
                  <RadioGroupItem value={status} id={status} />
                  <div className={`w-4 h-4 rounded-full ${getRagColor(status)}`}></div>
                  <span className="font-medium text-slate-900">{status}</span>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* What Went Well */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              What Went Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Highlights and successes from this week..."
              value={form.what_went_well}
              onChange={e => setForm(f => ({ ...f, what_went_well: e.target.value }))}
              className="min-h-[100px]"
              disabled={isReadOnly}
              data-testid="what-went-well-input"
            />
          </CardContent>
        </Card>

        {/* Delivered This Week */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Delivered This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="• Completed task 1&#10;• Delivered feature X&#10;• Finished documentation"
              value={form.delivered_this_week}
              onChange={e => setForm(f => ({ ...f, delivered_this_week: e.target.value }))}
              className="min-h-[120px]"
              disabled={isReadOnly}
              data-testid="delivered-input"
            />
            <p className="text-xs text-slate-500 mt-2">Use bullet points for better readability</p>
          </CardContent>
        </Card>

        {/* Issues Facing */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Issues Facing</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Current challenges or concerns..."
              value={form.issues_facing}
              onChange={e => setForm(f => ({ ...f, issues_facing: e.target.value }))}
              className="min-h-[100px]"
              disabled={isReadOnly}
              data-testid="issues-input"
            />
          </CardContent>
        </Card>

        {/* Roadblocks */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Roadblocks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Anything blocking progress..."
              value={form.roadblocks}
              onChange={e => setForm(f => ({ ...f, roadblocks: e.target.value }))}
              className="min-h-[100px]"
              disabled={isReadOnly}
              data-testid="roadblocks-input"
            />
          </CardContent>
        </Card>

        {/* Plan for Next Week */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Plan for Next Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="• Priority task 1&#10;• Goal for next week&#10;• Upcoming deliverables"
              value={form.plan_next_week}
              onChange={e => setForm(f => ({ ...f, plan_next_week: e.target.value }))}
              className="min-h-[120px]"
              disabled={isReadOnly}
              data-testid="plan-input"
            />
          </CardContent>
        </Card>

        {/* Optional Fields */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Optional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours Worked</Label>
                <Input 
                  type="number"
                  placeholder="40"
                  value={form.time_allocation}
                  onChange={e => setForm(f => ({ ...f, time_allocation: e.target.value }))}
                  disabled={isReadOnly}
                  data-testid="hours-input"
                />
              </div>
              <div>
                <Label>Sentiment</Label>
                <Select 
                  value={form.sentiment} 
                  onValueChange={v => setForm(f => ({ ...f, sentiment: v }))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger data-testid="sentiment-select">
                    <SelectValue placeholder="How are you feeling?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High - Great week!</SelectItem>
                    <SelectItem value="OK">OK - Normal week</SelectItem>
                    <SelectItem value="LOW">Low - Tough week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons (Mobile) */}
        {!isReadOnly && (
          <div className="flex gap-3 lg:hidden">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              className="flex-1 bg-sky-500 hover:bg-sky-600"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
