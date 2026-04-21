import React, { useState } from 'react';
import { Hash, Lock, UserPlus, MessageCircle, X, HelpCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { loginUser, AppConfig } from '../lib/store';
import Swal from 'sweetalert2';

export default function LoginScreen({ onLogin, onGoToRegister, appConfig }: { onLogin: (user: any) => void, onGoToRegister: () => void, appConfig: AppConfig }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contact Admin modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userNama, setUserNama] = useState('');
  const [userSekolah, setUserSekolah] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleContactAdmin = async () => {
    if (!userNama || !userSekolah) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Nama Lengkap dan Asal Sekolah wajib diisi.',
      });
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('target', '08992124036'); // Hardcoded Admin WhatsApp Number
      formData.append('message', `Halo Admin, saya pengguna dengan Nama *${userNama}* dari sekolah *${userSekolah}* memohon untuk segera disetujui (approve) akunnya di aplikasi *${appConfig.appName}*. Terima kasih.`);
      
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": "15nvY1EPBnyie3A8nX8n" // Fonnte token
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.status) {
        Swal.fire({
          icon: 'success',
          title: 'Terkirim!',
          text: 'Pesan berhasil terkirim via WhatsApp ke Admin!',
        });
        setShowContactModal(false);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: "Gagal mengirim pesan: " + (result.reason || "Terjadi kesalahan."),
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Jaringan',
        text: 'Terjadi kesalahan sistem saat menghubungi server Fonnte.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async () => {
    if (!nip || !password) {
      setError('NIP dan Password wajib diisi.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const user = await loginUser(nip, password);
      
      if (user) {
        if (user.status === 'pending') {
          setError('Akun Anda masih menunggu validasi dari Admin.');
        } else if (user.status === 'rejected') {
          setError('Akun Anda ditolak oleh Admin.');
        } else {
          onLogin(user);
        }
      } else {
        setError('NIP atau Password salah.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-900">
      {/* Modern Kekinian Mesh / Aurora Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/50 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/40 blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-cyan-400/30 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/70 via-[#2563eb]/50 to-[#4f46e5]/70 pointer-events-none backdrop-blur-[20px]"></div>

      {/* Header Bar */}
      <header className="w-full flex items-center p-4 border-b border-white/10 relative z-10 bg-white/5 backdrop-blur-sm">
        <div className="bg-white rounded-full p-1.5 mr-3 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          <img src={appConfig.appLogo} alt="Logo" className="h-8 w-8 object-contain" />
        </div>
        <div className="flex flex-col text-white">
          <span className="font-bold text-lg leading-tight uppercase tracking-wide drop-shadow-md">{appConfig.appName}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden flex flex-col items-center border border-white/40">
          
          {/* Logo and Titles inside Card */}
          <div className="pt-10 pb-6 flex flex-col items-center">
            <img src={appConfig.appLogo} alt="Logo" className="h-20 w-auto mb-4 object-contain drop-shadow-md animate-float" />
            <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
            <p className="text-slate-500 font-medium mt-1">Silakan login untuk memulai aplikasi</p>
          </div>

          <div className="w-full px-8 pb-8 space-y-5">
            {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 px-3 border border-red-100 rounded-lg">{error}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">NIP</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Hash className="text-slate-400 w-5 h-5" />
                  </span>
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    placeholder="NIP"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="text-slate-400 w-5 h-5" />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    disabled={isLoading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-2.5 rounded-lg font-bold text-white bg-[#4A8DF4] hover:bg-[#3b7ae0] transition-colors text-base shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {isLoading ? 'MEMPROSES...' : 'Masuk'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-6 w-full border-t border-slate-100 mt-2">
              <p className="text-xs text-slate-400 text-center mb-1">Pusat Bantuan & Layanan Akun</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setShowHelpModal(true)} className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors group">
                  <HelpCircle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-center">Bantuan<br/>Login</span>
                </button>
                <button onClick={onGoToRegister} className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors group">
                  <UserPlus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-center">Daftar<br/>Akun Baru</span>
                </button>
                <button onClick={() => setShowContactModal(true)} className="flex flex-col items-center justify-center p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors group">
                  <MessageCircle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-center">Hubungi<br/>Admin</span>
                </button>
              </div>
            </div>
            
          </div>
          
          <div className="bg-slate-50 border-t border-slate-100 w-full py-4 text-center">
             <p className="text-[11px] font-medium text-slate-500 tracking-wide">
               © 2026 GARDA SPENDUS | Muhammad Risyad Rahaf Faldi
             </p>
          </div>
        </div>

      </div>

      {/* Modal Hubungi Admin */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-green-50">
              <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Mohon Persetujuan Akun
              </h2>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Pesan WhatsApp akan dikirim otomatis ke Admin untuk mempercepat persetujuan akun Anda.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500" 
                    placeholder="Masukkan Nama Lengkap Anda"
                    value={userNama}
                    onChange={(e) => setUserNama(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500" 
                    placeholder="Masukkan Asal Sekolah Anda"
                    value={userSekolah}
                    onChange={(e) => setUserSekolah(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={handleContactAdmin}
                disabled={isSending}
                className="w-full py-2.5 mt-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSending ? 'Mengirim Pesan...' : 'Kirim via WhatsApp (Fonnte)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bantuan Login */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Panduan Login & Mendaftar
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              <section className="bg-white border text-left border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><UserPlus className="w-4 h-4 text-blue-500" /> Tata Cara Mendaftar Baru</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  <li>Klik tombol <span className="font-semibold text-blue-600">"Daftar Akun"</span> pada halaman awal.</li>
                  <li>Isi semua formulir pendaftaran secara lengkap, termasuk NIP, Nama Lengkap, dan Password.</li>
                  <li>Setelah selesai mendaftar, akun Anda akan masuk ke status <strong>"Menunggu Persetujuan" (Pending)</strong>.</li>
                </ol>
              </section>

              <section className="bg-white border text-left border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><MessageCircle className="w-4 h-4 text-green-500" /> Tata Cara Menghubungi Admin</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  <li>Agar akun yang Anda daftarkan bisa dipakai, akun wajib disetujui (Approved) oleh Admin.</li>
                  <li>Klik tombol <span className="font-semibold text-green-600">"Hubungi Admin"</span>.</li>
                  <li>Masukkan NIP atau Username yang telah Anda daftarkan.</li>
                  <li>Sistem akan otomatis mengirim pesan permohonan persetujuan ke WhatsApp Admin. Mohon tunggu respon admin.</li>
                </ol>
              </section>

              <section className="bg-white border text-left border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-purple-500" /> Tata Cara Login</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  <li>Setelah akun Anda disetujui, kembali ke halaman login.</li>
                  <li>Masukkan NIP Anda pada kolom pertama.</li>
                  <li>Masukkan Password yang Anda buat saat pendaftaran.</li>
                  <li>Klik tombol <strong>Masuk</strong> untuk bisa mulai menggunakan aplikasi.</li>
                </ol>
              </section>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
