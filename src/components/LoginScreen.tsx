import React, { useState } from 'react';
import { Hash, Lock, UserPlus, MessageCircle, X, HelpCircle } from 'lucide-react';
import { loginUser, AppConfig } from '../lib/store';

export default function LoginScreen({ onLogin, onGoToRegister, appConfig }: { onLogin: (user: any) => void, onGoToRegister: () => void, appConfig: AppConfig }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contact Admin modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userNip, setUserNip] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleContactAdmin = async () => {
    if (!userNip) {
      alert("NIP/Username Anda wajib diisi.");
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('target', '08992124036'); // Hardcoded Admin WhatsApp Number
      formData.append('message', `Halo Admin, saya pengguna dengan NIP/Username *${userNip}* memohon untuk segera disetujui (approve) akunnya di aplikasi *${appConfig.appName}*. Terima kasih.`);
      
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": "15nvY1EPBnyie3A8nX8n" // Fonnte token
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.status) {
        alert("Pesan berhasil terkirim via WhatsApp ke Admin!");
        setShowContactModal(false);
      } else {
        alert("Gagal mengirim pesan: " + (result.reason || "Terjadi kesalahan."));
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menghubungi server Fonnte.");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#e0f7fa] to-[#d1c4e9]">
      <div className="bg-white/90 backdrop-blur-md p-10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 w-full max-w-sm text-center">
        <img src={appConfig.appLogo} alt="Logo" className="mx-auto h-24 w-auto mb-4 object-contain" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{appConfig.appName}</h1>
        <p className="text-center text-gray-500 mb-8">Generator Rencana Pembelajaran Mendalam</p>
        
        {error && <div className="text-red-500 text-sm text-center mb-4 bg-red-50 p-2 rounded">{error}</div>}
        
        <div className="space-y-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Hash className="text-gray-400 w-5 h-5" />
            </span>
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/25 transition-all" 
              placeholder="NIP"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={isLoading}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="text-gray-400 w-5 h-5" />
            </span>
            <input 
              type="password" 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/25 transition-all" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={isLoading}
            />
          </div>
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_4px_15px_0_rgba(59,130,246,0.75)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_0_rgba(59,130,246,0.85)] transition-all text-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'MEMPROSES...' : 'LOGIN'}
          </button>
          
          <div className="pt-4 border-t border-gray-200 mt-4 space-y-3">
            <button 
              onClick={onGoToRegister}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-70"
            >
              <UserPlus className="w-5 h-5 mr-2" /> Daftar Pengguna Baru
            </button>
            <button 
              onClick={() => setShowContactModal(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-70"
            >
              <MessageCircle className="w-5 h-5 mr-2" /> Hubungi Admin (WhatsApp)
            </button>
            <button 
              onClick={() => setShowHelpModal(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-70"
            >
              <HelpCircle className="w-5 h-5 mr-2" /> Bantuan Login & Daftar
            </button>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIP / Username Anda</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500" 
                  placeholder="Masukkan identitas Anda"
                  value={userNip}
                  onChange={(e) => setUserNip(e.target.value)}
                />
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
                  <li>Klik tombol <span className="font-semibold text-blue-600">"Daftar Pengguna Baru"</span> pada halaman awal.</li>
                  <li>Isi semua formulir pendaftaran secara lengkap, termasuk NIP, Nama Lengkap, dan Password.</li>
                  <li>Setelah selesai mendaftar, akun Anda akan masuk ke status <strong>"Menunggu Persetujuan" (Pending)</strong>.</li>
                </ol>
              </section>

              <section className="bg-white border text-left border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><MessageCircle className="w-4 h-4 text-green-500" /> Tata Cara Menghubungi Admin</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  <li>Agar akun yang Anda daftarkan bisa dipakai, akun wajib disetujui (Approved) oleh Admin.</li>
                  <li>Klik tombol <span className="font-semibold text-green-600">"Hubungi Admin (WhatsApp)"</span>.</li>
                  <li>Masukkan NIP atau Username yang telah Anda daftarkan.</li>
                  <li>Sistem akan otomatis mengirim pesan permohonan persetujuan ke WhatsApp Admin. Mohon tunggu respon admin.</li>
                </ol>
              </section>

              <section className="bg-white border text-left border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-purple-500" /> Tata Cara Login</h3>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                  <li>Setelah akun Anda disetujui, kembali ke halaman login.</li>
                  <li>Masukkan NIP Anda pada kolom NIP/Username.</li>
                  <li>Masukkan Password yang Anda buat saat pendaftaran.</li>
                  <li>Klik tombol <strong>LOGIN</strong> untuk bisa mulai menggunakan AI Generator.</li>
                </ol>
              </section>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center mt-8 text-gray-600">
        <p>&copy; 2025 {appConfig.appName}</p>
      </footer>
    </div>
  );
}
