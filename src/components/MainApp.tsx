import React, { useState, useEffect } from 'react';
import Header from './Header';
import FormSection from './FormSection';
import OutputSection from './OutputSection';
import { HelpModal, IdeaModal } from './Modals';
import { RppData } from '../types';
import { makeApiCall } from '../lib/api';
import { AppConfig, User, logActivity, getUserHistory, updatePassword } from '../lib/store';
import { User as UserIcon, Clock, History, Key, X, Check, Menu, HelpCircle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function MainApp({ onLogout, appConfig, currentUser }: { onLogout: () => void, appConfig: AppConfig, currentUser: User }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userHistory, setUserHistory] = useState<any[]>([]);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showProfile) {
      getUserHistory(currentUser.id).then(history => setUserHistory(history));
    }
  }, [showProfile, currentUser.id]);

  const [rppData, setRppData] = useState<RppData>({
    namaSekolah: currentUser.namaSekolah || '', jenjang: 'SMP', mapel: currentUser.mapel?.join(', ') || '', tahunPelajaran: '', kelasSemester: '', fase: '',
    jumlahPertemuan: 1, durasiPertemuan: '1 JP x 40 Menit', alokasiWaktu: '',
    lingkungan: '', namaGuru: currentUser.username || '', namaKepsek: currentUser.namaKepsek || '', kota: '',
    kktpTercapaiMin: 80,
    karakteristik: 'Sebagian siswa cenderung pasif, 2 siswa berkebutuhan khusus, ada yang belum lancar membaca/berhitung.', 
    minat: 'Sebagian siswa minat belajar rendah, lebih suka praktik di laboratorium dan kerja kelompok.', 
    motivasi: 'Sebagian siswa motivasi belajar rendah.', 
    prestasi: 'Rata-rata prestasi belajar menurun.',
    profilLulusan: [], saranaPrasarana: 'LCD Projector, Papan Tulis, Spidol',
    kemitraan: 'Guru Mapel Geografi, Pemerhati lingkungan hidup',
    lingkunganFisik: 'Laboratorium komputer dengan koneksi internet stabil', 
    lingkunganVirtual: 'Platform block-based programming (Scratch, Code.org)', 
    budayaBelajar: 'Mendorong eksperimen, tidak takut salah, saling membantu',
    digitalPerencanaan: 'Pemanfaatan AI, Canva.', 
    digitalPelaksanaan: 'Pemanfaatan AI, Canva.', 
    digitalAsesmen: 'Pemanfaatan Quizziz, Canva.',
    modelPembelajaran: 'Project Based Learning (PjBL)',
    sumberBelajar: [],
    cp_full_text: '', tujuanPembelajaran: [],
  });

  const [validationError, setValidationError] = useState('');
  const [showOutput, setShowOutput] = useState(false);

  const captureAndValidateData = () => {
    const requiredFields: (keyof RppData)[] = ['namaSekolah', 'jenjang', 'mapel', 'tahunPelajaran', 'kelasSemester', 'fase', 'durasiPertemuan', 'namaGuru', 'namaKepsek', 'kota', 'cp_full_text'];
    let isValid = true;
    let errorMessage = '';
    
    for (const field of requiredFields) {
      if (!rppData[field]) {
        isValid = false;
        errorMessage = 'Harap isi semua kolom wajib.';
        break;
      }
    }
    if (isValid && (!rppData.jumlahPertemuan || rppData.jumlahPertemuan <= 0)) {
      isValid = false;
      errorMessage = 'Jumlah pertemuan harus diisi dan lebih dari 0.';
    }
    if (isValid && (isNaN(rppData.kktpTercapaiMin) || rppData.kktpTercapaiMin < 0 || rppData.kktpTercapaiMin > 100)) {
      isValid = false;
      errorMessage = 'Nilai Minimal "Tercapai" harus berupa angka antara 0-100.';
    }
    
    setValidationError(errorMessage);
    return isValid;
  };

  const handleGenerateTP = async () => {
    if (!captureAndValidateData()) return;
    
    const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      alert("Kunci API belum dikonfigurasi oleh Admin. Silakan hubungi Admin.");
      return;
    }

    setShowOutput(true);
    
    const prompt = `Anda adalah seorang ahli kurikulum pendidikan Indonesia. Analisis kalimat Capaian Pembelajaran (CP) berikut: "${rppData.cp_full_text}". Identifikasi setiap materi pokok yang utuh dan berbeda di dalamnya. Untuk setiap materi pokok, buatkan 3 Tujuan Pembelajaran (TP) sesuai level kognitif: Memahami, Mengaplikasi, dan Merefleksi. Berikan jawaban dalam format JSON. JSON harus memiliki satu kunci utama "materi" yang berisi array. Setiap objek dalam array mewakili satu materi pokok dan memiliki kunci "topic" (string) dan "tps" (array dari 3 objek TP). Setiap objek TP harus memiliki kunci "level" dan "text".`;
    const schema = { 
      type: "OBJECT", 
      properties: { 
        materi: {
          type: "ARRAY", 
          items: { 
            type: "OBJECT", 
            properties: { 
              topic: { type: "STRING" }, 
              tps: { 
                type: "ARRAY", 
                items: { 
                  type: "OBJECT", 
                  properties: { 
                    level: { type: "STRING" }, 
                    text: { type: "STRING" } 
                  }, 
                  required: ["level", "text"] 
                } 
              } 
            }, 
            required: ["topic", "tps"] 
          }
        }
      },
      required: ["materi"]
    };
    
    try {
      const aiResult = await makeApiCall(prompt, appConfig.apiKeys, schema);
      setRppData(prev => ({ ...prev, tujuanPembelajaran: aiResult.materi || [] }));
      
      // Log generate activity
      await logActivity(currentUser.id, 'generate', `Generate RPP: ${rppData.mapel} - Kelas ${rppData.kelasSemester}`);
    } catch (error: any) {
      console.error("Error generating TPs:", error);
      alert(`Gagal menganalisis CP dengan AI. Detail: ${error.message}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Password tidak cocok!');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg('Password minimal 4 karakter.');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await updatePassword(currentUser.id, newPassword);
      setPasswordMsg('Password berhasil diubah!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (err) {
      setPasswordMsg('Gagal mengubah password.');
      console.error(err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-white shadow-xl z-40 transition-all duration-300 flex flex-col h-screen shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100 h-16">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={appConfig.appLogo} alt="Logo" className="h-8 w-8 object-contain shrink-0" />
              <span className="font-bold text-blue-800 truncate">{appConfig.appName}</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 mx-auto shrink-0">
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {/* Time Section - Moved below logo */}
        <div className={`px-3 py-3 border-b border-gray-100 flex items-center gap-3 text-gray-600 ${!isSidebarOpen && 'justify-center'}`} title={format(currentTime, 'HH:mm:ss')}>
          <Clock className="w-5 h-5 shrink-0 text-blue-500" />
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{format(currentTime, 'HH:mm:ss')}</p>
              <p className="text-xs truncate">{format(currentTime, 'dd MMM yyyy', { locale: id })}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
          {/* Profile Section */}
          <div className={`p-3 rounded-xl bg-blue-50 border border-blue-100 flex flex-col ${isSidebarOpen ? 'items-start' : 'items-center'} mb-4`}>
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 w-full text-left" title="Profil & Riwayat">
              <div className="p-2 bg-blue-600 text-white rounded-full shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-800 truncate">{getGreeting()},</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{currentUser.username}!</p>
                  <p className="text-xs text-gray-500 truncate mt-1">{currentUser.namaSekolah || 'Sekolah Belum Diatur'}</p>
                </div>
              )}
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-100">
            <button onClick={() => setShowHelp(true)} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors ${!isSidebarOpen && 'justify-center'}`} title="Bantuan">
              <HelpCircle className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Bantuan</span>}
            </button>
            <button onClick={onLogout} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors ${!isSidebarOpen && 'justify-center'}`} title="Keluar">
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Marquee Header */}
        <div className="bg-slate-800 text-white py-2 relative overflow-hidden shrink-0 h-10 flex items-center">
          <div className="whitespace-nowrap animate-marquee font-bold tracking-widest text-sm">
            {appConfig.appName}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          {!showOutput ? (
            <div className="w-full">
              <FormSection 
                rppData={rppData} 
                setRppData={setRppData} 
                validationError={validationError}
                onGenerateTP={handleGenerateTP}
                appConfig={appConfig}
                onShowIdeaModal={() => {
                  if (captureAndValidateData()) {
                    const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
                    if (validKeys.length === 0) {
                      alert("Kunci API belum dikonfigurasi oleh Admin.");
                    } else {
                      setShowIdeaModal(true);
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-full">
              <OutputSection 
                rppData={rppData} 
                setRppData={setRppData}
                apiKeys={appConfig.apiKeys}
                onBack={() => setShowOutput(false)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Profile & History Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-blue-600" /> Profil Pengguna
              </h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Change Password Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" /> Ubah Password
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                      <input 
                        type="password" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                      <input 
                        type="password" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {passwordMsg && (
                      <div className={`text-sm p-2 rounded ${passwordMsg.includes('berhasil') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {passwordMsg}
                      </div>
                    )}
                    <button 
                      type="submit" 
                      disabled={isChangingPassword}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                    >
                      {isChangingPassword ? 'Menyimpan...' : 'Simpan Password'}
                    </button>
                  </form>
                </div>

                {/* History Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" /> Riwayat Aktivitas
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {userHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Belum ada riwayat aktivitas.</p>
                    ) : (
                      userHistory.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-semibold ${item.activity_type === 'generate' ? 'text-purple-600' : 'text-blue-600'}`}>
                              {item.activity_type === 'generate' ? 'Generate RPP' : 'Login'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                            </span>
                          </div>
                          {item.details && <p className="text-gray-600 text-xs mt-1">{item.details}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showIdeaModal && <IdeaModal onClose={() => setShowIdeaModal(false)} rppData={rppData} apiKeys={appConfig.apiKeys} />}
    </div>
  );
}
