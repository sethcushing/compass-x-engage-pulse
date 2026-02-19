import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { 
  Activity, ArrowLeft, Plus, Edit2, Trash2, Building2, Users, Briefcase,
  LogOut, Database, Key
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAuthHeader, getCurrentUser, logout } from "../App";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || getCurrentUser());
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [clientDialog, setClientDialog] = useState({ open: false, data: null });
  const [engagementDialog, setEngagementDialog] = useState({ open: false, data: null });
  const [userDialog, setUserDialog] = useState({ open: false, data: null });

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
        
        if (userData.role !== 'ADMIN') {
          toast.error('Admin access required');
          navigate('/portfolio');
          return;
        }
      }

      const [clientsRes, engRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/engagements`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/users`, { headers: getAuthHeader() })
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (engRes.ok) setEngagements(await engRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const seedDemoData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/seed-data`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      const result = await res.json();
      if (result.seeded) {
        toast.success('Demo data seeded successfully');
        fetchData();
      } else {
        toast.info('Data already exists');
      }
    } catch (error) {
      toast.error('Failed to seed data');
    }
  };

  // Client CRUD
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

      if (!res.ok) throw new Error('Failed to save client');
      toast.success(data.client_id ? 'Client updated' : 'Client created');
      setClientDialog({ open: false, data: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      const res = await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Client deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Engagement CRUD
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

  const handleDeleteEngagement = async (id) => {
    if (!window.confirm('Delete this engagement?')) return;
    try {
      const res = await fetch(`${API_URL}/api/engagements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Engagement deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // User CRUD
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
          <p className="text-slate-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-background">
      {/* Topbar */}
      <header className="topbar">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 font-heading">Admin Setup</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={seedDemoData} data-testid="seed-data-btn">
              <Database className="w-4 h-4 mr-2" />
              Seed Demo Data
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 mb-6">
            <TabsTrigger value="clients" data-testid="tab-clients">
              <Building2 className="w-4 h-4 mr-2" />
              Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="engagements" data-testid="tab-engagements">
              <Briefcase className="w-4 h-4 mr-2" />
              Engagements ({engagements.length})
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Clients</CardTitle>
                <Button onClick={() => setClientDialog({ open: true, data: null })} data-testid="add-client-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </CardHeader>
              <CardContent>
                {clients.length > 0 ? (
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div key={client.client_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{client.client_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {client.industry && <Badge variant="outline">{client.industry}</Badge>}
                            {client.primary_contact_name && (
                              <span className="text-sm text-slate-500">Contact: {client.primary_contact_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setClientDialog({ open: true, data: client })}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.client_id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No clients yet. Add your first client or seed demo data.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagements Tab */}
          <TabsContent value="engagements">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Engagements</CardTitle>
                <Button onClick={() => setEngagementDialog({ open: true, data: null })} data-testid="add-engagement-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Engagement
                </Button>
              </CardHeader>
              <CardContent>
                {engagements.length > 0 ? (
                  <div className="space-y-3">
                    {engagements.map((eng) => (
                      <div key={eng.engagement_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{eng.engagement_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-slate-500">{eng.client?.client_name}</span>
                            <span className="text-xs text-slate-400 font-mono">{eng.engagement_code}</span>
                            {eng.consultant && (
                              <span className="text-sm text-slate-500">Consultant: {eng.consultant.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={eng.rag_status === 'GREEN' ? 'default' : eng.rag_status === 'RED' ? 'destructive' : 'secondary'}>
                            {eng.rag_status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setEngagementDialog({ open: true, data: eng })}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEngagement(eng.engagement_id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No engagements yet. Create clients first, then add engagements.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading">Users</CardTitle>
                <Button onClick={() => setUserDialog({ open: true, data: null })} data-testid="add-user-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.user_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-sky-700">{u.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{u.name}</p>
                            <p className="text-sm text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'LEAD' ? 'secondary' : 'outline'}>
                            {u.role}
                          </Badge>
                          {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => setUserDialog({ open: true, data: u })}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No users yet. Users are created when they sign in via Google.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
      </main>
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
    if (data) {
      setForm(data);
    } else {
      setForm({ client_name: '', industry: '', notes: '', primary_contact_name: '', primary_contact_email: '' });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client Name *</Label>
            <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry || ''} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Contact Name</Label>
              <Input value={form.primary_contact_name || ''} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>Primary Contact Email</Label>
              <Input type="email" value={form.primary_contact_email || ''} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, client_id: data?.client_id })} disabled={!form.client_name}>Save</Button>
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
    if (data) {
      setForm({
        ...data,
        start_date: data.start_date ? format(parseISO(data.start_date), 'yyyy-MM-dd') : '',
        target_end_date: data.target_end_date ? format(parseISO(data.target_end_date), 'yyyy-MM-dd') : ''
      });
    } else {
      setForm({
        client_id: '', engagement_name: '', engagement_code: '', consultant_user_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'), target_end_date: '', rag_status: 'GREEN', overall_summary: ''
      });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Engagement' : 'Add Engagement'}</DialogTitle>
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
            <Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} />
          </div>
          <div>
            <Label>Engagement Code *</Label>
            <Input value={form.engagement_code} onChange={e => setForm(f => ({ ...f, engagement_code: e.target.value }))} placeholder="e.g., TC-DT-2024" />
          </div>
          <div>
            <Label>Assigned Consultant</Label>
            <Select value={form.consultant_user_id || ''} onValueChange={v => setForm(f => ({ ...f, consultant_user_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select consultant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
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
              <Label>Target End Date</Label>
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
            <Textarea value={form.overall_summary || ''} onChange={e => setForm(f => ({ ...f, overall_summary: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onSave({ 
              ...form, 
              engagement_id: data?.engagement_id,
              start_date: new Date(form.start_date).toISOString(),
              target_end_date: form.target_end_date ? new Date(form.target_end_date).toISOString() : null,
              consultant_user_id: form.consultant_user_id || null
            })} 
            disabled={!form.client_id || !form.engagement_name || !form.engagement_code || !form.start_date}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// User Dialog (Edit only)
function UserDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CONSULTANT',
    is_active: true
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        email: data.email,
        password: '',
        role: data.role,
        is_active: data.is_active
      });
    } else {
      setForm({ name: '', email: '', password: '', role: 'CONSULTANT', is_active: true });
    }
  }, [data, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          {!data && (
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          )}
          <div>
            <Label>{data ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
            <Input 
              type="password" 
              value={form.password} 
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={data ? 'Leave blank to keep current password' : 'Enter password'}
            />
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
              <input 
                type="checkbox" 
                id="is_active" 
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const submitData = { ...form, user_id: data?.user_id };
            // Don't send empty password for edits
            if (data && !submitData.password) {
              delete submitData.password;
            }
            onSave(submitData);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
