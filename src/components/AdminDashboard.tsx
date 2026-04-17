import React, { useState, useEffect } from 'react';
import { Settings, Users, Key, BookOpen, LayoutDashboard, LogOut, Check, X, Save, ShieldCheck, Activity } from 'lucide-react';
import { AppConfig, User, getAppConfig, updateAppConfig, getUsers, updateUserStatus, getActivityStats } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configData, usersData, statsData] = await Promise.all([
        getAppConfig(),
        getUsers(),
        getActivityStats()
      ]);
      if (configData) setConfig(configData);
      setUsersList(usersData);
      
      // Process stats data for charts
      processChartData(statsData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processChartData = (stats: any[]) => {
    // Create an array of the last 7 days
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, 'yyyy-MM-dd');
    });

    const chartData = last7Days.map(dateStr => {
      const dayStats = stats.filter(s => s.created_at.startsWith(dateStr));
      const visitors = new Set(dayStats.filter(s => s.activity_type === 'visit').map(s => s.user_id)).size;
      const generations = dayStats.filter(s => s.activity_type === 'generate').length;
      return {
        name: format(parseISO(dateStr), 'dd MMM', { locale: id }),
        Pengunjung: visitors,
        GenerateRPP: generations
      };
    });

    setActivityData(chartData);
  };

  const handleSaveConfig = async () => {
    if (config) {
      try {
        await updateAppConfig(config);
        setSaveMessage('Konfigurasi berhasil disimpan!');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (err) {
        console.error('Error saving config:', err);
        alert('Gagal menyimpan konfigurasi.');
      }
    }
  };

  const handleUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      await updateUserStatus(userId, status);
      const updatedUsers = usersList.map(u => u.id === userId ? { ...u, status } : u);
      setUsersList(updatedUsers);
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Gagal memperbarui status pengguna.');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Memuat data admin...</div>;
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'general' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            <Settings className="w-5 h-5" /> Pengaturan Umum
          </button>
          <button onClick={() => setActiveTab('api')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'api' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            <Key className="w-5 h-5" /> Konfigurasi API
          </button>
          <button onClick={() => setActiveTab('cp')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'cp' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            <BookOpen className="w-5 h-5" /> Konfigurasi CP
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            <Users className="w-5 h-5" /> Pengguna
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-700 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {saveMessage && (
            <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded shadow-sm flex items-center">
              <Check className="w-5 h-5 mr-2" /> {saveMessage}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-gray-800">Selamat Datang, Admin</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Users className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Pengguna</p>
                    <p className="text-2xl font-bold">{usersList.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="p-4 bg-amber-100 text-amber-600 rounded-lg"><Users className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm">Menunggu Validasi</p>
                    <p className="text-2xl font-bold">{usersList.filter(u => u.status === 'pending').length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="p-4 bg-purple-100 text-purple-600 rounded-lg"><Activity className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm">Aktivitas Hari Ini</p>
                    <p className="text-2xl font-bold">
                      {activityData.length > 0 ? activityData[activityData.length - 1].Pengunjung + activityData[activityData.length - 1].GenerateRPP : 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Visitor Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Grafik Pengunjung (7 Hari Terakhir)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line type="monotone" dataKey="Pengunjung" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Generate RPP Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Grafik Generate RPP (7 Hari Terakhir)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Bar dataKey="GenerateRPP" name="Generate RPP" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings className="w-6 h-6 text-blue-600" /> Pengaturan Umum</h2>
              <div className="space-y-6">
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">Nama Aplikasi</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">URL Logo Aplikasi</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={config.appLogo} onChange={e => setConfig({...config, appLogo: e.target.value})} />
                  {config.appLogo && <img src={config.appLogo} alt="Preview" className="mt-4 h-20 object-contain border p-2 rounded" />}
                </div>
                <button onClick={handleSaveConfig} className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-5 h-5 mr-2" /> Simpan Pengaturan
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Key className="w-6 h-6 text-blue-600" /> Konfigurasi API Gemini</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4">Anda dapat memasukkan hingga 10 API Key. Jika API Key pertama kehabisan kuota atau bermasalah, sistem akan otomatis menggunakan API Key berikutnya.</p>
                  <div className="space-y-3">
                    {config.apiKeys.map((key, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-8 text-center font-semibold text-gray-500">{index + 1}.</span>
                        <input 
                          type="password" 
                          placeholder={`API Key ${index + 1}`} 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                          value={key} 
                          onChange={e => {
                            const newKeys = [...config.apiKeys];
                            newKeys[index] = e.target.value;
                            setConfig({...config, apiKeys: newKeys});
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveConfig} className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-5 h-5 mr-2" /> Simpan API Key
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cp' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-600" /> Konfigurasi Capaian Pembelajaran (CP)</h2>
              <p className="text-gray-600 mb-6">Atur teks default Capaian Pembelajaran untuk masing-masing fase. Teks ini dapat dimuat oleh pengguna saat membuat RPP.</p>
              <div className="space-y-6">
                {['A', 'B', 'C', 'D', 'E', 'F'].map(fase => (
                  <div key={fase}>
                    <label className="block font-semibold text-gray-700 mb-2">Fase {fase}</label>
                    <textarea 
                      rows={3} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder={`Masukkan CP Fase ${fase}`}
                      value={config.cpData[fase] || ''} 
                      onChange={e => setConfig({...config, cpData: { ...config.cpData, [fase]: e.target.value }})} 
                    />
                  </div>
                ))}
                <button onClick={handleSaveConfig} className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-5 h-5 mr-2" /> Simpan Konfigurasi CP
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" /> Manajemen Pengguna</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-left font-semibold text-gray-600">Nama Pengguna</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Sekolah</th>
                      <th className="p-3 text-left font-semibold text-gray-600">NIP</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="p-3 text-center font-semibold text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{user.username}</div>
                          <div className="text-xs text-gray-500">{user.role}</div>
                        </td>
                        <td className="p-3 text-gray-600">{user.namaSekolah || '-'}</td>
                        <td className="p-3 text-gray-600">{user.nip || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            user.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.role !== 'admin' && user.status === 'pending' && (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleUserStatus(user.id, 'approved')} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Setujui">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleUserStatus(user.id, 'rejected')} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Tolak">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
