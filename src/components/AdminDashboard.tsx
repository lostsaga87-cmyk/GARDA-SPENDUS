import React, { useState, useEffect } from 'react';
import { Settings, Users, Key, BookOpen, LayoutDashboard, LogOut, Check, X, Save, ShieldCheck, Activity, RefreshCw, Menu, Bug, ArrowUpDown, ChevronUp, ChevronDown, Trash2, UserCheck, Plus } from 'lucide-react';
import { AppConfig, User, getAppConfig, updateAppConfig, getUsers, updateUserStatus, deleteUser, getActivityStats, getActivities, updateUserProfile, createDummyUser, injectFakeActivity } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO, subDays, differenceInDays, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function AdminDashboard({ currentUser, onLogout }: { currentUser: User, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Profile State
  const [adminUsername, setAdminUsername] = useState(currentUser.username || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState(currentUser.namaKepsek || '');
  
  const [activityData, setActivityData] = useState<any[]>([]);
  
  // Secret / Dev Mode State
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [showSecretTab, setShowSecretTab] = useState(false);
  const [dummyCount, setDummyCount] = useState(1);
  const [dummyVisitCount, setDummyVisitCount] = useState(1);
  const [dummyGenerateCount, setDummyGenerateCount] = useState(1);
  const [dummyVisitDate, setDummyVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dummyGenerateDate, setDummyGenerateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [dummyUserIds, setDummyUserIds] = useState<string[]>([]);
  const [dummyGenerateUserIds, setDummyGenerateUserIds] = useState<string[]>([]);

  const sortedUsersList = React.useMemo(() => {
    let sortableItems = [...usersList];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = (a as any)[sortConfig.key] || '';
        let bValue = (b as any)[sortConfig.key] || '';
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [usersList, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />;
    }
    return <ChevronDown className="w-4 h-4 text-blue-600" />;
  };
  
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
      const [configData, usersData, statsData, activityList] = await Promise.all([
        getAppConfig(),
        getUsers(),
        getActivityStats(),
        getActivities()
      ]);
      if (configData) {
        setConfig(configData);
      }
      setUsersList(usersData);
      setActivitiesList(activityList);
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
        GenerateRPM: generations
      };
    });

    setActivityData(chartData);
  };

  const handleUpdateAdminProfile = async () => {
    try {
      const updates: any = {
        username: adminUsername,
        namaKepsek: adminName
      };
      if (adminPassword.trim() !== '') {
        updates.password = adminPassword;
      }
      await updateUserProfile(currentUser.id, updates);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Profil Admin berhasil diperbarui',
        showConfirmButton: false,
        timer: 3000
      });
      setAdminPassword('');
    } catch (err) {
      console.error(err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Gagal memperbarui profil',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const handleSecretClick = () => {
    setSecretClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setShowSecretTab(true);
        setActiveTab('dev');
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Dev / Secret Mode Unlocked!',
          showConfirmButton: false,
          timer: 3000
        });
        return 0; // reset after triggering
      }
      
      // Auto reset if not clicked quickly (1.5 seconds)
      setTimeout(() => setSecretClickCount(0), 1000);
      return newCount;
    });
  };

  const handleGenerateFakeSpecific = async (type: 'users' | 'visit' | 'generate') => {
    try {
      Swal.fire({
        title: 'Generating Data...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      if (type === 'users') {
        const adjs = ["Ahmad", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Intan", "Joko"];
        const nouns = ["Wijaya", "Kusuma", "Santoso", "Sari", "Raharjo", "Hidayat", "Putra", "Putri", "Pratama", "Lestari"];
        const schools = ["SMPN 1", "SMPN 2", "SMPN 3", "SMPN 4", "SMPN 5", "SMAN 1", "SMAN 2", "SDN 1", "SDN 2", "SMP Muhammadiyah", "SMA Al-Azhar"];
        const cities = ["Jakarta", "Bandung", "Surabaya", "Malang", "Pasuruan", "Sidoarjo", "Yogyakarta", "Semarang", "Madiun"];
        const titles = ["S.Pd", "S.Pd", "S.Pd", "S.Pd", "M.Pd", "S.Pd.I", "S.Kom", ""];

        for (let i = 0; i < dummyCount; i++) {
          const randTitle = titles[Math.floor(Math.random() * titles.length)];
          const randNameText = `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
          const randName = randTitle ? `${randNameText}, ${randTitle}` : randNameText;
          
          const randSchool = `${schools[Math.floor(Math.random() * schools.length)]} ${cities[Math.floor(Math.random() * cities.length)]}`;
          const nip = `198${Math.floor(Math.random() * 9)}0${Math.floor(Math.random() * 10000000)}`;

          await createDummyUser(randName, nip, randSchool);
        }
      } else if (type === 'visit') {
        const targets = dummyUserIds.length > 0 ? dummyUserIds : [currentUser.id];
        for (const targetUser of targets) {
          for (let i = 0; i < dummyVisitCount; i++) {
            await injectFakeActivity(targetUser, 'visit', `Login ke aplikasi`, `${dummyVisitDate}T10:00:00Z`);
          }
        }
      } else if (type === 'generate') {
        const targets = dummyGenerateUserIds.length > 0 ? dummyGenerateUserIds : [currentUser.id];
        const mapels = ["Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "Pendidikan Pancasila", "PJOK"];
        const kelas = ["7 / Ganjil", "7 / Genap", "8 / Ganjil", "8 / Genap", "9 / Ganjil", "9 / Genap"];

        for (const targetUser of targets) {
          for (let i = 0; i < dummyGenerateCount; i++) {
            const mapel = mapels[Math.floor(Math.random() * mapels.length)];
            const kl = kelas[Math.floor(Math.random() * kelas.length)];
            await injectFakeActivity(targetUser, 'generate', `Generate RPM: ${mapel} - Kelas ${kl}`, `${dummyGenerateDate}T10:00:00Z`);
          }
        }
      }
      await fetchData(true);
      Swal.fire('Success', `Successfully injected ${type}`, 'success');
    } catch (err) {
      Swal.fire('Error', String(err), 'error');
    }
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

  const handleAddApiKey = async () => {
    if (!newApiKey.trim() || !config) return;
    try {
      const updatedKeys = [...config.apiKeys, newApiKey.trim()];
      const newConfig = { ...config, apiKeys: updatedKeys };
      await updateAppConfig(newConfig);
      setConfig(newConfig);
      setNewApiKey('');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'API Key berhasil ditambahkan!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Error adding API key:', err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Gagal menambahkan API Key.',
        showConfirmButton: false,
        timer: 2000
      });
    }
  };

  const handleRemoveApiKey = async (indexToRemove: number) => {
    if (!config) return;
    try {
      const updatedKeys = config.apiKeys.filter((_, idx) => idx !== indexToRemove);
      const newConfig = { ...config, apiKeys: updatedKeys };
      await updateAppConfig(newConfig);
      setConfig(newConfig);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'API Key berhasil dihapus!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Error removing API key:', err);
       Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Gagal menghapus API Key.',
        showConfirmButton: false,
        timer: 2000
      });
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

  const handleDeleteUser = async (user: any) => {
    const result = await Swal.fire({
      title: 'Hapus Akun?',
      text: `Anda yakin ingin menghapus permanen akun ${user.username}? Semua data riwayat akun ini akan hilang.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(user.id);
        const updatedUsers = usersList.filter(u => u.id !== user.id);
        setUsersList(updatedUsers);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Akun berhasil dihapus',
          showConfirmButton: false,
          timer: 3000
        });
      } catch (err) {
        console.error('Error deleting user:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal menghapus pengguna.',
        });
      }
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
              <span onClick={handleSecretClick} className="font-bold text-white truncate text-sm select-none cursor-pointer">Admin Panel</span>
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
          <button 
            onClick={() => setActiveTab('pending_users')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'pending_users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Validasi Pengguna"
          >
            <UserCheck className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && (
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium">Validasi Pengguna</span>
                {usersList.filter(u => u.status === 'pending').length > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {usersList.filter(u => u.status === 'pending').length}
                  </span>
                )}
              </div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('activities')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'activities' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Riwayat"
          >
            <Activity className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Riwayat</span>}
          </button>
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Profil Admin"
          >
            <ShieldCheck className="w-5 h-5 shrink-0" /> 
            {!isSidebarMinimized && <span className="font-medium">Profil Admin</span>}
          </button>
          
          {showSecretTab && (
            <button 
              onClick={() => setActiveTab('dev')} 
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all mt-4 border border-rose-500/30 ${isSidebarMinimized ? 'justify-center' : ''} ${activeTab === 'dev' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-rose-400 hover:bg-rose-900/40'}`}
              title="Dev Mode"
            >
              <Bug className="w-5 h-5 shrink-0" /> 
              {!isSidebarMinimized && <span className="font-medium">Dev / Inject</span>}
            </button>
          )}
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
                {activeTab === 'pending_users' && 'Validasi Pengguna'}
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

                {/* Generate RPM Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Grafik Generate RPM</h3>
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
                          <Bar dataKey="GenerateRPM" name="Generate RPM" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
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
                  <p className="text-sm text-gray-600 mb-4">Anda dapat memasukkan API Key tak terbatas. Jika API Key pertama kehabisan kuota atau bermasalah, sistem akan otomatis menggunakan API Key berikutnya.</p>
                  
                  <div className="space-y-3 mb-6">
                    {config.apiKeys.map((key, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-8 text-center font-semibold text-gray-500">{index + 1}.</span>
                        <input 
                          type="password" 
                          placeholder={`API Key ${index + 1}`} 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 bg-opacity-50" 
                          value={key} 
                          onChange={e => {
                            const newKeys = [...config.apiKeys];
                            newKeys[index] = e.target.value;
                            setConfig({...config, apiKeys: newKeys});
                          }} 
                        />
                        <button 
                          onClick={() => handleRemoveApiKey(index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus API Key"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    
                    {config.apiKeys.length === 0 && (
                       <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">Belum ada API Key</div>
                    )}
                  </div>

                  <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Tambah API Key Baru</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Masukkan API Key baru..." 
                        className="flex-1 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
                        value={newApiKey}
                        onChange={e => setNewApiKey(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddApiKey();
                          }
                        }}
                      />
                      <button 
                        onClick={handleAddApiKey}
                        disabled={!newApiKey.trim()}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5 mr-2" /> Tambah
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button onClick={handleSaveConfig} className="flex items-center px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors">
                    <Save className="w-5 h-5 mr-2" /> Simpan Perubahan API
                  </button>
                </div>
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
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('username')}>
                        <div className="flex items-center gap-1">Nama Pengguna {getSortIcon('username')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaSekolah')}>
                        <div className="flex items-center gap-1">Sekolah {getSortIcon('namaSekolah')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('nip')}>
                        <div className="flex items-center gap-1">NIP {getSortIcon('nip')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                        <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsersList.filter(u => u.status !== 'pending').map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{user.username}</div>
                          <div className="text-xs text-gray-500">{user.role}</div>
                        </td>
                        <td className="p-3 text-gray-600">{user.namaSekolah || '-'}</td>
                        <td className="p-3 text-gray-600">{user.nip || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.role !== 'admin' && (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleDeleteUser(user)} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200" title="Hapus Akun">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sortedUsersList.filter(u => u.status !== 'pending').length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada pengguna.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pending_users' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><UserCheck className="w-7 h-7 text-amber-500" /> Validasi Pengguna Baru</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('username')}>
                        <div className="flex items-center gap-1">Nama Pengguna {getSortIcon('username')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaSekolah')}>
                        <div className="flex items-center gap-1">Sekolah {getSortIcon('namaSekolah')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('nip')}>
                        <div className="flex items-center gap-1">NIP {getSortIcon('nip')}</div>
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => requestSort('created_at')}>
                        <div className="flex items-center gap-1">Waktu Daftar {getSortIcon('created_at')}</div>
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-600">Aksi Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsersList.filter(u => u.status === 'pending').map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-amber-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{user.username}</div>
                        </td>
                        <td className="p-3 text-gray-600">{user.namaSekolah || '-'}</td>
                        <td className="p-3 text-gray-600">{user.nip || '-'}</td>
                        <td className="p-3 text-gray-600 text-sm">
                          {user.created_at ? format(parseISO(user.created_at), 'dd MMM yyyy, HH:mm', { locale: id }) : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleUserStatus(user.id, 'approved')} className="px-3 py-1.5 bg-green-100 text-green-700 font-medium rounded hover:bg-green-200 flex items-center gap-1 text-sm" title="Setujui">
                              <Check className="w-4 h-4" /> Setujui
                            </button>
                            <button onClick={() => handleUserStatus(user.id, 'rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 flex items-center gap-1 text-sm" title="Tolak">
                              <X className="w-4 h-4" /> Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sortedUsersList.filter(u => u.status === 'pending').length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada pengguna baru yang menunggu validasi.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity className="w-7 h-7 text-blue-600" /> Riwayat Aktivitas & Login
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-left font-semibold text-gray-600">Tanggal & Waktu</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Pengguna</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Instansi</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Tipe Aktivitas</th>
                      <th className="p-3 text-left font-semibold text-gray-600">Detail Lengkap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitiesList.map((act) => (
                      <tr key={act.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-800 text-sm">{format(parseISO(act.created_at), 'dd MMM yyyy', { locale: id })}</td>
                        <td className="p-3 font-medium text-gray-800">{act.users?.username || 'Tidak diketahui'}</td>
                        <td className="p-3 text-gray-600">{act.users?.nama_sekolah || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            act.activity_type === 'visit' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {act.activity_type === 'visit' ? 'LOGIN' : 'GENERATE'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-sm max-w-xs truncate" title={act.details}>{act.details || '-'}</td>
                      </tr>
                    ))}
                    {activitiesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada riwayat aktivitas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-blue-600" /> Profil Admin
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Username / Login ID (NIP)</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Username Admin"
                  />
                  <p className="text-xs text-gray-500 mt-1">Username ini digunakan untuk login.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tampilan Admin</label>
                  <input 
                    type="text" 
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nama Tampilan (Opsional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password Baru</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                  />
                </div>
                <div>
                  <button 
                    onClick={handleUpdateAdminProfile}
                    className="flex justify-center items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors font-semibold"
                  >
                    <Save className="w-5 h-5 mr-2" /> Simpan Perubahan Profil
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dev' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-200 animate-in fade-in slide-in-from-right-4 duration-500 max-w-6xl relative">
              
              <div className="flex justify-between items-center mb-6 border-b border-rose-200 pb-4">
                <h2 className="text-2xl font-bold text-rose-700 flex items-center gap-2">
                  <Bug className="w-7 h-7 text-rose-600" /> Dev & Inject Mode
                </h2>
                <button 
                  onClick={() => {
                    setShowSecretTab(false);
                    setActiveTab('dashboard');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Tutup Dev Mode
                </button>
              </div>

              <p className="text-gray-600 mb-6">Menu rahasia untuk memanipulasi data dummy secara manual. Hati-hati, data ini akan langsung masuk ke database.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-rose-50/50 p-6 rounded-xl border border-rose-100">
                  <h3 className="font-bold text-lg text-rose-800 mb-4 border-b border-rose-200 pb-2">Inject Akun Dummy</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah Akun (max 50)</label>
                      <input 
                        type="number" 
                        min="1" max="50"
                        value={dummyCount}
                        onChange={(e) => setDummyCount(parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                    <button 
                      onClick={() => handleGenerateFakeSpecific('users')}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded shadow transition-colors font-semibold mt-4"
                    >
                      Buat Akun Dummy
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-lg text-blue-800 mb-4 border-b border-blue-200 pb-2">Inject Riwayat Login</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Pengguna</label>
                      <select 
                        multiple
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 h-32 text-sm"
                        value={dummyUserIds}
                        onChange={(e) => {
                          const options = e.target.options;
                          const selected = [];
                          for (let i = 0; i < options.length; i++) {
                            if (options[i].selected) selected.push(options[i].value);
                          }
                          setDummyUserIds(selected);
                        }}
                      >
                        <option value={currentUser.id}>(Admin / Diri Sendiri)</option>
                        {sortedUsersList.map(u => (
                          <option key={u.id} value={u.id}>{u.username} - {u.namaSekolah}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Tahan Ctrl/Cmd untuk pilih banyak</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Eksekusi</label>
                      <input 
                        type="date"
                        value={dummyVisitDate}
                        onChange={(e) => setDummyVisitDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah Per Pengguna</label>
                      <input 
                        type="number" 
                        min="1" max="100"
                        value={dummyVisitCount}
                        onChange={(e) => setDummyVisitCount(parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button 
                      onClick={() => handleGenerateFakeSpecific('visit')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition-colors font-semibold mt-2"
                    >
                      Suntik Riwayat Login
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
                  <h3 className="font-bold text-lg text-purple-800 mb-4 border-b border-purple-200 pb-2">Inject Generate RPM</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Pengguna</label>
                      <select 
                        multiple
                        className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 h-32 text-sm"
                        value={dummyGenerateUserIds}
                        onChange={(e) => {
                          const options = e.target.options;
                          const selected = [];
                          for (let i = 0; i < options.length; i++) {
                            if (options[i].selected) selected.push(options[i].value);
                          }
                          setDummyGenerateUserIds(selected);
                        }}
                      >
                        <option value={currentUser.id}>(Admin / Diri Sendiri)</option>
                        {sortedUsersList.map(u => (
                          <option key={u.id} value={u.id}>{u.username} - {u.namaSekolah}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Tahan Ctrl/Cmd untuk pilih banyak</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Eksekusi</label>
                      <input 
                        type="date"
                        value={dummyGenerateDate}
                        onChange={(e) => setDummyGenerateDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah Per Pengguna</label>
                      <input 
                        type="number" 
                        min="1" max="100"
                        value={dummyGenerateCount}
                        onChange={(e) => setDummyGenerateCount(parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <button 
                      onClick={() => handleGenerateFakeSpecific('generate')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow transition-colors font-semibold mt-2"
                    >
                      Suntik Generate RPM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
);
}
