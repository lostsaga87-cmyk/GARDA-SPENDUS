import React, { useState, useEffect } from 'react';
import { Settings, Users, Key, BookOpen, LayoutDashboard, LogOut, Check, X, Save, ShieldCheck, Activity, RefreshCw, Menu } from 'lucide-react';
import { AppConfig, User, getAppConfig, updateAppConfig, getUsers, updateUserStatus, getActivityStats } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO, subDays, differenceInDays, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  
  // Date Range State
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rawStats, setRawStats] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefreshAction = false) => {
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const [configData, usersData, statsData] = await Promise.all([
        getAppConfig(),
        getUsers(),
        getActivityStats()
      ]);
      if (configData) setConfig(configData);
      setUsersList(usersData);
      setRawStats(statsData);
      
      // Process stats data for charts
      processChartData(statsData, startDate, endDate);
      
      if (isRefreshAction) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Data berhasil diperbarui',
          showConfirmButton: false,
          timer: 2000
        });
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      if (isRefreshAction) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: 'Gagal memperbarui data',
          showConfirmButton: false,
          timer: 2000
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const processChartData = (stats: any[], start: string, end: string) => {
    const sDate = parseISO(start);
    const eDate = parseISO(end);
    const daysCount = differenceInDays(eDate, sDate) + 1;
    
    // Safety check for large ranges to avoid crash
    const finalDaysCount = Math.min(Math.max(daysCount, 1), 90); 

    const dateRange = Array.from({ length: finalDaysCount }).map((_, i) => {
      const d = addDays(sDate, i);
      return format(d, 'yyyy-MM-dd');
    });

    const chartData = dateRange.map(dateStr => {
      const dayStats = stats.filter(s => s.created_at.startsWith(dateStr));
      const visitors = new Set(dayStats.filter(s => s.activity_type === 'visit').map(s => s.user_id)).size;
      const generations = dayStats.filter(s => s.activity_type === 'generate').length;
      return {
        name: format(parseISO(dateStr), 'dd MMM', { locale: id }),
        fullDate: dateStr,
        Pengunjung: visitors,
        GenerateRPP: generations
      };
    });

    setActivityData(chartData);
  };

  useEffect(() => {
    if (rawStats.length > 0) {
      processChartData(rawStats, startDate, endDate);
    }
  }, [startDate, endDate]);

  const handleSaveConfig = async () => {
    if (config) {
      try {
        await updateAppConfig(config);
        Swal.fire({
          icon: 'success',
          title: 'Tersimpan',
          text: 'Konfigurasi berhasil disimpan!',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        console.error('Error saving config:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan konfigurasi.',
        });
      }
    }
  };

  const handleUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      await updateUserStatus(userId, status);
      const updatedUsers = usersList.map(u => u.id === userId ? { ...u, status } : u);
      setUsersList(updatedUsers);
      
      const statusText = status === 'approved' ? 'disetujui' : 'ditolak';
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Pengguna berhasil ${statusText}`,
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err) {
      console.error('Error updating user status:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memperbarui status pengguna.',
      });
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Memuat data admin...</div>;
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-slate-900 border-r border-slate-800 shadow-xl z-40 transition-all duration-300 flex flex-col h-screen shrink-0 ${isSidebarMinimized ? 'w-20' : 'w-64'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800 h-16 w-full">
          {!isSidebarMinimized && (
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
              <span className="font-bold text-white truncate text-sm">Admin Panel</span>
            </div>
          )}
          <button onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} className={`p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors ${isSidebarMinimized ? 'mx-auto' : ''}`}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Dashboard</span>}
          </button>
          <button 
            onClick={() => setActiveTab('general')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Pengaturan Umum"
          >
            <Settings className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Pengaturan Umum</span>}
          </button>
          <button 
            onClick={() => setActiveTab('api')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'api' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Konfigurasi API"
          >
            <Key className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Konfigurasi API</span>}
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Pengguna"
          >
            <Users className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Pengguna</span>}
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800 mt-auto">
          <button 
            onClick={onLogout} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-red-400 hover:bg-red-500/10 ${isSidebarMinimized ? 'justify-center' : ''}`}
            title="Keluar"
          >
            <LogOut className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-gray-50 flex flex-col">
        <div className="p-6 md:p-10 flex-1">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                {activeTab === 'dashboard' && 'Statistik & Ringkasan'}
                {activeTab === 'general' && 'Pengaturan Aplikasi'}
                {activeTab === 'api' && 'Konfigurasi AI'}
                {activeTab === 'users' && 'Manajemen Pengguna'}
              </h1>
              <button 
                onClick={() => fetchData(true)} 
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-semibold disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Memuat...' : 'Muat Ulang Data'}
              </button>
            </div>

          {saveMessage && (
            <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded shadow-sm flex items-center">
              <Check className="w-5 h-5 mr-2" /> {saveMessage}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-lg text-white">
                <h2 className="text-3xl font-extrabold mb-2">Selamat Datang, Admin</h2>
                <p className="text-blue-100 font-medium">Pantau performa aplikasi dan aktivitas pengguna Garda Spendus secara real-time.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Pengguna</p>
                    <p className="text-2xl font-bold text-gray-800">{usersList.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-xl"><Users className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Menunggu Validasi</p>
                    <p className="text-2xl font-bold text-gray-800">{usersList.filter(u => u.status === 'pending').length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><Activity className="w-8 h-8" /></div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Aktivitas Hari Ini</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {(() => {
                        const todayStr = format(new Date(), 'yyyy-MM-dd');
                        const todayStats = rawStats.filter(s => s.created_at.startsWith(todayStr));
                        const visitors = new Set(todayStats.filter(s => s.activity_type === 'visit').map(s => s.user_id)).size;
                        const generations = todayStats.filter(s => s.activity_type === 'generate').length;
                        return visitors + generations;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Filter Control */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">Filter Grafik:</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500">Mulai</label>
                    <input 
                      type="date" 
                      className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500">Sampai</label>
                    <input 
                      type="date" 
                      className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 ml-auto">
                  <button 
                    onClick={() => {
                      setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
                      setEndDate(format(new Date(), 'yyyy-MM-dd'));
                    }}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                  >
                    7 Hari Terakhir
                  </button>
                  <button 
                    onClick={() => {
                      setStartDate(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
                      setEndDate(format(new Date(), 'yyyy-MM-dd'));
                    }}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                  >
                    30 Hari Terakhir
                  </button>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 gap-8 mt-4">
                {/* Visitor Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Grafik Pengunjung Aplikasi</h3>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{activityData.length} Hari Ditampilkan</span>
                  </div>
                  <div className="h-80 w-full overflow-x-auto">
                    <div style={{ minWidth: activityData.length > 15 ? `${activityData.length * 50}px` : '100%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} 
                            itemStyle={{ fontWeight: 700 }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Line type="monotone" dataKey="Pengunjung" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6' }} activeDot={{ r: 7, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Generate RPP Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Grafik Generate RPP</h3>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">{activityData.length} Hari Ditampilkan</span>
                  </div>
                  <div className="h-80 w-full overflow-x-auto">
                    <div style={{ minWidth: activityData.length > 15 ? `${activityData.length * 50}px` : '100%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} allowDecimals={false} />
                          <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="GenerateRPP" name="Generate RPP" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings className="w-7 h-7 text-blue-600" /> Pengaturan Umum</h2>
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
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Key className="w-7 h-7 text-blue-600" /> Konfigurasi API Gemini</h2>
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

          {activeTab === 'users' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Users className="w-7 h-7 text-blue-600" /> Manajemen Pengguna</h2>
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
      </div>
    </main>
  </div>
);
}
