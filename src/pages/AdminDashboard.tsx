import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  LogOut,
  BarChart3,
  Settings,
  Package,
  ShieldCheck,
  History,
  RotateCcw,
  Menu,
  X,
  Fingerprint
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRecord, AppVersion } from '../types';
import { supabase, syncToGoogleSheet } from '../lib/supabase';
import { bufferToBase64, generateRandomChallenge } from '../lib/webauthn';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'settings'>('dashboard');
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<AppRecord> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // History state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAppForHistory, setSelectedAppForHistory] = useState<AppRecord | null>(null);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    store_name: 'Nexus App Store',
    contact_email: 'admin@nexus.com',
    maintenance_mode: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isDemoSession = localStorage.getItem('nexus_demo_session') === 'true';
      
      if (!session && !isDemoSession) {
        navigate('/login');
      }
    };
    
    checkAuth();
    fetchApps();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'main').single();
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('settings').upsert({ id: 'main', ...settings });
      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricEnrollment = async () => {
    if (!window.PublicKeyCredential) {
      alert('Biometric authentication is not supported on this device/browser.');
      return;
    }

    try {
      let user;
      const { data: authData } = await supabase.auth.getUser();
      user = authData.user;

      // Support demo session if real user is not found
      if (!user && localStorage.getItem('nexus_demo_session') === 'true') {
        user = { id: 'demo-user-id', email: 'admin@nexus.com' };
      }

      if (!user) throw new Error('User not authenticated. Please log in first.');

      const challenge = generateRandomChallenge();
      const userId = new TextEncoder().encode(user.id);

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Nexus App Store",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: user.email || "Admin",
          displayName: user.email || "Admin",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential;

      if (!credential) throw new Error('Credential creation failed');

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Store the credential info
      // In a real app, you'd send this to your server to verify and store
      const credentialData = {
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey()),
        userId: user.id
      };

      // For this demo, we'll store it in localStorage to simulate a database
      // But we'll also try to save it to Supabase if the table exists
      localStorage.setItem('nexus_biometric_cred', JSON.stringify(credentialData));
      
      try {
        await supabase.from('admin_biometrics').insert([{
          user_id: user.id,
          credential_id: credentialData.credentialId,
          public_key: credentialData.publicKey
        }]);
      } catch (e) {
        console.warn('Could not save to Supabase table, falling back to local storage only');
      }

      alert('Biometric enrollment successful! You can now log in using your fingerprint/face ID.');
    } catch (err: any) {
      console.error('Biometric enrollment error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Enrollment cancelled or timed out.');
      } else {
        alert('Enrollment failed: ' + err.message);
      }
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('apps')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('apps')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const fetchHistory = async (app: AppRecord) => {
    setHistoryLoading(true);
    setSelectedAppForHistory(app);
    setIsHistoryModalOpen(true);
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('app_id', app.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAppVersions(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRollback = async (version: AppVersion) => {
    if (!selectedAppForHistory) return;
    if (!confirm(`Are you sure you want to rollback ${selectedAppForHistory.name} to version ${version.version}?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('apps')
        .update({
          version: version.version,
          apk_url: version.apk_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppForHistory.id);

      if (error) throw error;
      
      alert('Rollback successful!');
      await fetchApps();
      setIsHistoryModalOpen(false);
    } catch (err) {
      console.error('Error rolling back:', err);
      alert('Rollback failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setDbError('Database table "apps" not found. Please run the SQL setup script.');
        }
        throw error;
      }
      setApps(data || []);
    } catch (error) {
      console.error('Error fetching apps:', error);
      // Mock data for admin preview
      setApps([
        {
          id: '1',
          name: 'Nexus Browser',
          description: 'A fast browser.',
          category: 'Tools',
          icon_url: 'https://picsum.photos/seed/browser/400/400',
          apk_url: '#',
          screenshots: [],
          rating: 4.8,
          downloads: 12500,
          developer: 'Nexus Labs',
          version: '2.4.0',
          size: '45MB',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'published'
        },
        {
          id: '4',
          name: 'Crypto Wallet',
          description: 'Secure your assets.',
          category: 'Finance',
          icon_url: 'https://picsum.photos/seed/wallet/400/400',
          apk_url: '#',
          screenshots: [],
          rating: 0,
          downloads: 0,
          developer: 'FinTech Inc',
          version: '1.0.0',
          size: '15MB',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppRecord['status']) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setApps(apps.map(app => app.id === id ? { ...app, status: newStatus } : app));
      
      // Sync to Google Sheets
      const updatedApp = apps.find(a => a.id === id);
      if (updatedApp) {
        await syncToGoogleSheet({ ...updatedApp, status: newStatus, action: 'status_update' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    try {
      const { error } = await supabase.from('apps').delete().eq('id', id);
      if (error) throw error;
      setApps(apps.filter(app => app.id !== id));
    } catch (error) {
      console.error('Error deleting app:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    
    const formData = new FormData(e.currentTarget);
    const iconFile = (e.currentTarget.elements.namedItem('icon_file') as HTMLInputElement).files?.[0];
    const apkFile = (e.currentTarget.elements.namedItem('apk_file') as HTMLInputElement).files?.[0];
    const screenshotFiles = (e.currentTarget.elements.namedItem('screenshot_files') as HTMLInputElement).files;

    try {
      let icon_url = formData.get('icon_url') as string;
      let apk_url = formData.get('apk_url') as string;
      let screenshots: string[] = editingApp?.screenshots || [];

      // Handle File Uploads
      if (iconFile) icon_url = await uploadFile(iconFile, 'icons');
      if (apkFile) apk_url = await uploadFile(apkFile, 'apks');
      
      if (screenshotFiles && screenshotFiles.length > 0) {
        const newScreenshots = await Promise.all(
          Array.from(screenshotFiles).map(file => uploadFile(file, 'screenshots'))
        );
        screenshots = [...screenshots, ...newScreenshots];
      }

      const appData = {
        name: formData.get('name') as string,
        developer: formData.get('developer') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        version: formData.get('version') as string,
        icon_url,
        apk_url,
        screenshots,
        status: editingApp ? editingApp.status : 'pending',
        updated_at: new Date().toISOString(),
      };

      let appId = editingApp?.id;

      if (appId) {
        const { error } = await supabase
          .from('apps')
          .update(appData)
          .eq('id', appId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('apps')
          .insert([{ ...appData, downloads: 0, rating: 0 }])
          .select();
        if (error) throw error;
        appId = data[0].id;
      }

      // Save to version history
      const releaseNotes = formData.get('release_notes') as string;
      await supabase.from('app_versions').insert([{
        app_id: appId,
        version: appData.version,
        release_notes: releaseNotes || 'Initial release',
        apk_url: appData.apk_url
      }]);
      
      await fetchApps();
      setIsModalOpen(false);
      setEditingApp(null);
      
      await syncToGoogleSheet({ ...appData, action: editingApp ? 'update' : 'create' });
    } catch (error) {
      console.error('Error saving app:', error);
      alert('Error saving app. Make sure your Supabase Storage bucket "apps" is created and public.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nexus_demo_session');
    navigate('/');
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.developer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-neutral-900 text-white p-4 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-2 text-brand-500 font-display font-bold text-lg">
          <Package className="w-6 h-6" />
          Nexus Admin
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[50] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-neutral-900 text-white flex flex-col z-[55] transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-neutral-800 hidden md:block">
          <div className="flex items-center gap-2 text-brand-500 font-display font-bold text-xl">
            <Package className="w-8 h-8" />
            Nexus Admin
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-brand-500 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('review'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'review' ? 'bg-brand-500 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              App Review
            </div>
            {apps.filter(a => a.status === 'pending').length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'review' ? 'bg-white text-brand-600' : 'bg-brand-500 text-white'
              }`}>
                {apps.filter(a => a.status === 'pending').length}
              </span>
            )}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-xl font-medium transition-colors">
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'settings' ? 'bg-brand-500 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {dbError && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
            <ShieldCheck className="w-6 h-6 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Database Setup Required</p>
              <p className="text-sm opacity-90">{dbError}</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">App Management</h1>
                <p className="text-neutral-500 text-sm md:text-base">Manage, review, and publish applications.</p>
              </div>
              <button 
                onClick={() => { setEditingApp(null); setIsModalOpen(true); }}
                className="w-full md:w-auto px-6 py-3 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Upload New App
              </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="text-neutral-500 text-xs md:text-sm font-medium mb-1">Total Apps</div>
                <div className="text-xl md:text-3xl font-bold">{apps.length}</div>
              </div>
              <div 
                onClick={() => setActiveTab('review')}
                className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
              >
                <div className="text-neutral-500 text-xs md:text-sm font-medium mb-1">Pending</div>
                <div className="text-xl md:text-3xl font-bold text-amber-500">
                  {apps.filter(a => a.status === 'pending').length}
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="text-neutral-500 text-xs md:text-sm font-medium mb-1">Published</div>
                <div className="text-xl md:text-3xl font-bold text-brand-500">
                  {apps.filter(a => a.status === 'published').length}
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="text-neutral-500 text-xs md:text-sm font-medium mb-1">Downloads</div>
                <div className="text-xl md:text-3xl font-bold">
                  {apps.reduce((acc, curr) => acc + curr.downloads, 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search apps..."
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* App Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">App</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Downloads</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Updated</th>
                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic">Loading applications...</td>
                    </tr>
                  ) : filteredApps.length > 0 ? (
                    filteredApps.map(app => (
                      <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={app.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <div className="font-semibold text-neutral-900 text-sm">{app.name}</div>
                              <div className="text-xs text-neutral-500">{app.developer}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-sm text-neutral-600">{app.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${
                            app.status === 'published' ? 'bg-green-100 text-green-700' :
                            app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {app.status === 'published' ? <CheckCircle className="w-3 h-3" /> :
                             app.status === 'pending' ? <Clock className="w-3 h-3" /> :
                             <XCircle className="w-3 h-3" />}
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 hidden md:table-cell">
                          {app.downloads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 hidden lg:table-cell">
                          {new Date(app.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 md:gap-2">
                            {app.status === 'pending' && (
                              <button 
                                onClick={() => handleStatusChange(app.id, 'published')}
                                className="p-1.5 md:p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Approve & Publish"
                              >
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => fetchHistory(app)}
                              className="p-1.5 md:p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors"
                              title="Version History"
                            >
                              <History className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button 
                              onClick={() => { setEditingApp(app); setIsModalOpen(true); }}
                              className="p-1.5 md:p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(app.id)}
                              className="p-1.5 md:p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">No applications found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'review' ? (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-display font-bold text-neutral-900">App Review Queue</h1>
              <p className="text-neutral-500">Review and approve pending application submissions.</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
              {apps.filter(a => a.status === 'pending').length > 0 ? (
                apps.filter(a => a.status === 'pending').map(app => (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center"
                  >
                    <img src={app.icon_url} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-neutral-900">{app.name}</h3>
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>
                      </div>
                      <p className="text-neutral-500 text-sm mb-3 line-clamp-2">{app.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-neutral-400">
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {app.category}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4" />
                          v{app.version}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => handleStatusChange(app.id, 'published')}
                        className="flex-1 md:flex-none px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                      <button 
                        onClick={() => fetchHistory(app)}
                        className="flex-1 md:flex-none px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                        title="Version History"
                      >
                        <History className="w-5 h-5" />
                        History
                      </button>
                      <button 
                        onClick={() => { setEditingApp(app); setIsModalOpen(true); }}
                        className="flex-1 md:flex-none px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit className="w-5 h-5" />
                        Review Details
                      </button>
                      <button 
                        onClick={() => handleDelete(app.id)}
                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-neutral-300 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-1">Queue Clear!</h3>
                  <p className="text-neutral-500">There are no pending applications to review at this time.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-2xl">
            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">Store Settings</h1>
            <p className="text-neutral-500 mb-8">Configure your app store's global appearance and behavior.</p>
            
            <form onSubmit={handleSaveSettings} className="space-y-6 bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Store Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20"
                  value={settings.store_name}
                  onChange={(e) => setSettings({...settings, store_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Contact Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl">
                <div>
                  <div className="font-semibold text-neutral-900">Maintenance Mode</div>
                  <div className="text-xs text-neutral-500">Temporarily disable public access to the store.</div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.maintenance_mode ? 'bg-brand-500' : 'bg-neutral-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance_mode ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-display font-bold text-neutral-900">Security</h2>
              <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900">Biometric Authentication</div>
                    <div className="text-xs text-neutral-500">Enable fingerprint or face ID for faster, secure logins.</div>
                  </div>
                  <button 
                    onClick={handleBiometricEnrollment}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl font-semibold hover:bg-brand-100 transition-all border border-brand-100"
                  >
                    <Fingerprint className="w-5 h-5" />
                    Enroll Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
              <h2 className="text-2xl font-display font-bold">
                {editingApp ? 'Edit Application' : 'Upload New Application'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                <XCircle className="w-6 h-6 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">App Name</label>
                  <input name="name" type="text" required className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20" defaultValue={editingApp?.name} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">Developer</label>
                  <input name="developer" type="text" required className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20" defaultValue={editingApp?.developer} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-700">Description</label>
                <textarea name="description" required rows={4} className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20" defaultValue={editingApp?.description}></textarea>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-700">Release Notes</label>
                <textarea name="release_notes" placeholder="What's new in this version?" rows={2} className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">Category</label>
                  <select name="category" className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20" defaultValue={editingApp?.category || 'Tools'}>
                    <option>Games</option>
                    <option>Productivity</option>
                    <option>Social</option>
                    <option>Tools</option>
                    <option>Education</option>
                    <option>Finance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">Version</label>
                  <input name="version" type="text" required placeholder="e.g. 1.0.0" className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-500/20" defaultValue={editingApp?.version} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">App Icon</label>
                  <input name="icon_file" type="file" accept="image/*" className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                  <input name="icon_url" type="url" placeholder="Or provide URL" className="w-full px-4 py-2 border border-neutral-200 rounded-xl text-xs" defaultValue={editingApp?.icon_url} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-700">APK File</label>
                  <input name="apk_file" type="file" accept=".apk" className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                  <input name="apk_url" type="url" placeholder="Or provide URL" className="w-full px-4 py-2 border border-neutral-200 rounded-xl text-xs" defaultValue={editingApp?.apk_url} />
                </div>
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 text-center">
                <p className="text-sm text-neutral-500 mb-2">Screenshots (Up to 5)</p>
                <input name="screenshot_files" type="file" multiple accept="image/*" className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-neutral-600 font-semibold">Cancel</button>
                <button type="submit" disabled={uploading} className="px-8 py-2 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50">
                  {uploading ? 'Uploading...' : (editingApp ? 'Save Changes' : 'Submit for Review')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal for Version History */}
      {isHistoryModalOpen && selectedAppForHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
              <div className="flex items-center gap-4">
                <img src={selectedAppForHistory.icon_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <h2 className="text-2xl font-display font-bold">{selectedAppForHistory.name}</h2>
                  <p className="text-sm text-neutral-500">Version History</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                <XCircle className="w-6 h-6 text-neutral-400" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <div className="py-12 text-center text-neutral-500 italic">Loading history...</div>
              ) : appVersions.length > 0 ? (
                <div className="space-y-6">
                  {appVersions.map((version, index) => (
                    <div key={version.id} className="relative pl-8 border-l-2 border-neutral-100 pb-6 last:pb-0">
                      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${index === 0 ? 'bg-brand-500' : 'bg-neutral-300'}`}></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-lg font-bold text-neutral-900">v{version.version}</span>
                          {index === 0 && <span className="ml-2 px-2 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-bold rounded-full uppercase">Current</span>}
                          <div className="text-xs text-neutral-400 mt-0.5">{new Date(version.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={version.apk_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors"
                          >
                            Download APK
                          </a>
                          {index !== 0 && (
                            <button 
                              onClick={() => handleRollback(version)}
                              className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Rollback
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                        <p className="text-sm text-neutral-600 whitespace-pre-wrap">{version.release_notes || 'No release notes provided.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-neutral-500">No version history found for this app.</div>
              )}
            </div>
            
            <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-8 py-2 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
