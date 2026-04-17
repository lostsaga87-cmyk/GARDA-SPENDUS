import React, { useState, useEffect } from 'react';
import Header from './Header';
import FormSection from './FormSection';
import OutputSection from './OutputSection';
import { HelpModal, IdeaModal } from './Modals';
import { RppData } from '../types';
import { makeApiCall } from '../lib/api';
import { AppConfig, User, logActivity, getUserHistory, updatePassword, getUserDocuments, SavedDocument, getDocumentById } from '../lib/store';
import { User as UserIcon, Clock, History, Key, X, Check, Menu, HelpCircle, LogOut, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function MainApp({ onLogout, appConfig, currentUser }: { onLogout: () => void, appConfig: AppConfig, currentUser: User }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userDocuments, setUserDocuments] = useState<SavedDocument[]>([]);
  
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
    if (showProfile || showHistory) {
      getUserHistory(currentUser.id).then(history => setUserHistory(history));
    }
  }, [showProfile, showHistory, currentUser.id]);

  useEffect(() => {
    if (showDocuments) {
      getUserDocuments(currentUser.id).then(docs => setUserDocuments(docs));
    }
  }, [showDocuments, currentUser.id]);

  const [rppData, setRppData] = useState<RppData>({
    namaSekolah: currentUser.namaSekolah || '', jenjang: 'SMP', mapel: currentUser.mapel?.join(', ') || '', tahunPelajaran: '2025/2026', kelasSemester: '', fase: '',
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
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const captureAndValidateData = () => {
    const requiredFields: (keyof RppData)[] = ['namaSekolah', 'jenjang', 'mapel', 'tahunPelajaran', 'kelasSemester', 'fase', 'durasiPertemuan', 'namaGuru', 'namaKepsek', 'kota', 'cp_full_text'];
    let isValid = true;
    let errorMessage = '';
    
    for (const field of requiredFields) {
      if (!rppData[field]) {
        isValid = false;
        errorMessage = 'Kolom wajib diisi. Harap lengkapi semua data identitas dan capaian pembelajaran.';
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
    if (isValid && rppData.cp_full_text) {
      const materiCount = rppData.cp_full_text.split(';').map(m => m.trim()).filter(m => m.length > 0).length;
      if (materiCount !== rppData.jumlahPertemuan) {
        isValid = false;
        errorMessage = `Tidak Sinkron: Jumlah pertemuan (${rppData.jumlahPertemuan}) tidak sesuai dengan materi. Berdasarkan pemisah titik koma (;), Anda memasukkan ${materiCount} materi pokok. Harap ganti jumlah pertemuan menjadi ${materiCount} atau sesuaikan materinya.`;
      }
    }
    
    if (!isValid) {
      setValidationError(errorMessage);
      setShowValidationPopup(true);
    }
    return isValid;
  };

  const handleGenerateTP = async () => {
    if (!captureAndValidateData()) return;
    
    const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      setValidationError("Kunci API belum dikonfigurasi oleh Admin. Silakan hubungi Admin.");
      setShowValidationPopup(true);
      return;
    }

    setIsGenerating(true);
    
    const prompt = `Anda adalah ahli kurikulum pendidikan Indonesia. Analisis teks Capaian Pembelajaran/Materi berikut: "${rppData.cp_full_text}". 
PENTING: Teks tersebut mengandung ${rppData.jumlahPertemuan} materi pokok yang dipisahkan oleh tanda titik koma (;). Anda HARUS memecahnya tepat menjadi ${rppData.jumlahPertemuan} materi pokok sesuai pemisahan tersebut. 
Untuk setiap materi pokok, buatkan 3 Tujuan Pembelajaran (TP) sesuai level kognitif: Memahami, Mengaplikasi, dan Merefleksi. Berikan jawaban dalam format JSON. JSON harus memiliki satu kunci utama "materi" yang berisi array. Setiap objek dalam array mewakili satu materi pokok dan memiliki kunci "topic" (string) dan "tps" (array dari 3 objek TP). Setiap objek TP harus memiliki kunci "level" dan "text".`;
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
      
      setShowOutput(true);
    } catch (error: any) {
      console.error("Error generating TPs:", error);
      alert(`Gagal menganalisis CP dengan AI. Detail: ${error.message}`);
    } finally {
      setIsGenerating(false);
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
          <div className={`p-3 rounded-xl bg-blue-50 border border-blue-100 flex flex-col ${isSidebarOpen ? 'items-start' : 'items-center'} mb-2`}>
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 w-full text-left" title="Profil Pengguna">
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
          
          <div className="flex flex-col mb-4">
            <button onClick={() => setShowHistory(true)} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors ${!isSidebarOpen && 'justify-center'}`} title="Riwayat Aktivitas">
              <History className="w-5 h-5 shrink-0 text-purple-500" />
              {isSidebarOpen && <span className="font-medium text-gray-700">Riwayat Aktivitas</span>}
            </button>
            <button onClick={() => setShowDocuments(true)} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors mt-1 ${!isSidebarOpen && 'justify-center'}`} title="Dokumen Tersimpan">
              <FileText className="w-5 h-5 shrink-0 text-green-500" />
              {isSidebarOpen && <span className="font-medium text-gray-700">Dokumen</span>}
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
                userMapel={currentUser.mapel}
                onShowIdeaModal={() => {
                  if (captureAndValidateData()) {
                    const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
                    if (validKeys.length === 0) {
                      setValidationError("Kunci API belum dikonfigurasi oleh Admin.");
                      setShowValidationPopup(true);
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
                userId={currentUser.id}
              />
            </div>
          )}
        </main>
      </div>

      {/* Generating Loading Modal */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8 items-center text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Memproses Data...</h3>
            <p className="text-gray-600">AI sedang membedah materi dan merumuskan Tujuan Pembelajaran yang sesuai dengan kriteria tingkat kognitif. Mohon tunggu sebentar.</p>
          </div>
        </div>
      )}

      {/* Validation Popup Modal */}
      {showValidationPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-3xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Peringatan</h3>
              <p className="text-gray-600 mb-6">{validationError}</p>
              <button 
                onClick={() => setShowValidationPopup(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-blue-600" /> Profil Pengguna
              </h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
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
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <History className="w-6 h-6 text-purple-600" /> Riwayat Aktivitas & Dokumen
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {userHistory.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">Belum ada riwayat aktivitas.</p>
                ) : (
                  userHistory.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${item.activity_type === 'generate' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.activity_type === 'generate' ? <History className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                          </div>
                          <span className={`font-semibold text-lg ${item.activity_type === 'generate' ? 'text-purple-700' : 'text-blue-700'}`}>
                            {item.activity_type === 'generate' ? 'Generate Dokumen RPP' : 'Login'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                          {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </span>
                      </div>
                      {item.details && (
                        <div className="mt-3 pl-10">
                          <p className="text-gray-700 font-medium">{item.details}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocuments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-600" /> Dokumen Tersimpan
              </h2>
              <button onClick={() => setShowDocuments(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {userDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Belum ada dokumen yang disimpan.</p>
                  <p className="text-sm text-gray-400 mt-2">Generate RPP untuk menyimpan dokumen di sini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="bg-white border text-left border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col items-start gap-3">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">{doc.title}</h3>
                            <p className="text-xs text-gray-500">{format(new Date(doc.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full mt-2">
                        <button 
                          onClick={async () => {
                            const fullDoc = await getDocumentById(doc.id);
                            if (fullDoc && fullDoc.content) {
                              // Re-use logic to download word
                              const wordDocument = `
                                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                                <head>
                                  <meta charset='utf-8'>
                                  <title>Export HTML To Doc</title>
                                  <style>
                                    @page WordSection1 { size: 21cm 29.7cm; margin: 2cm; }
                                    div.WordSection1 { page: WordSection1; }
                                    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; color: windowtext; }
                                    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                                    td, th { border: 1px solid windowtext; padding: 5px; vertical-align: top; }
                                    h2 { font-size: 14pt; font-weight: bold; text-align: center; }
                                    h3 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid windowtext; }
                                    h4, h5 { font-size: 11pt; font-weight: bold; }
                                    p { text-align: justify; margin: 0 0 10px 0; }
                                  </style>
                                </head>
                                <body>
                                  <div class="WordSection1">
                                    ${fullDoc.content}
                                  </div>
                                </body>
                                </html>
                              `;
                              const blob = new Blob(['\ufeff', wordDocument], { type: 'application/msword;charset=utf-8' });
                              const downloadLink = document.createElement("a");
                              document.body.appendChild(downloadLink);
                              const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
                              const url = URL.createObjectURL(blob);
                              downloadLink.href = url;
                              downloadLink.download = `${filename}.doc`;
                              downloadLink.click();
                              setTimeout(() => {
                                  document.body.removeChild(downloadLink);
                                  window.URL.revokeObjectURL(url);
                              }, 100);
                            }
                          }} 
                          className="flex-1 flex justify-center items-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Download className="w-4 h-4" /> Unduh (Word)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showIdeaModal && <IdeaModal onClose={() => setShowIdeaModal(false)} rppData={rppData} apiKeys={appConfig.apiKeys} />}
    </div>
  );
}
