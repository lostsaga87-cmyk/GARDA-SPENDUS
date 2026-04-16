import React, { useState } from 'react';
import { Hash, Lock, UserPlus } from 'lucide-react';
import { loginUser, AppConfig } from '../lib/store';

export default function LoginScreen({ onLogin, onGoToRegister, appConfig }: { onLogin: (user: any) => void, onGoToRegister: () => void, appConfig: AppConfig }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          
          <div className="pt-4 border-t border-gray-200">
            <button 
              onClick={onGoToRegister}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-70"
            >
              <UserPlus className="w-5 h-5 mr-2" /> Daftar Pengguna Baru
            </button>
          </div>
        </div>
      </div>
      <footer className="text-center mt-8 text-gray-600">
        <p>&copy; 2025 {appConfig.appName}</p>
      </footer>
    </div>
  );
}
