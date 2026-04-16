import React, { useState } from 'react';
import { User, Lock, School, Phone, Hash, ArrowLeft } from 'lucide-react';
import { registerUser } from '../lib/store';

export default function RegisterScreen({ onRegister, onCancel, appConfig }: any) {
  const [formData, setFormData] = useState({
    username: '',
    namaSekolah: '',
    noHp: '',
    nip: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.password || !formData.namaSekolah || !formData.username) {
      setError('Nama Pengguna, NIP, Nama Sekolah, dan Password wajib diisi.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await registerUser(formData);
      onRegister();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('NIP atau Nama Pengguna sudah digunakan. Silakan pilih yang lain.');
      } else {
        setError('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#e0f7fa] to-[#d1c4e9]">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 w-full max-w-md">
        <button onClick={onCancel} disabled={isLoading} className="text-gray-500 hover:text-gray-800 mb-4 flex items-center transition-colors disabled:opacity-50">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
        </button>
        
        <div className="text-center mb-6">
          <img src={appConfig.appLogo} alt="Logo" className="mx-auto h-20 w-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">Daftar Pengguna Baru</h1>
          <p className="text-gray-500 text-sm">{appConfig.appName}</p>
        </div>
        
        {error && <div className="text-red-500 text-sm text-center mb-4 bg-red-50 p-2 rounded">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><User className="text-gray-400 w-5 h-5" /></span>
            <input 
              type="text" 
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all disabled:bg-gray-100" 
              placeholder="Nama Pengguna (Wajib)"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Hash className="text-gray-400 w-5 h-5" /></span>
            <input 
              type="text" 
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all disabled:bg-gray-100" 
              placeholder="NIP (Wajib untuk Login)"
              value={formData.nip}
              onChange={(e) => setFormData({...formData, nip: e.target.value})}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><School className="text-gray-400 w-5 h-5" /></span>
            <input 
              type="text" 
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all disabled:bg-gray-100" 
              placeholder="Nama Sekolah (Wajib)"
              value={formData.namaSekolah}
              onChange={(e) => setFormData({...formData, namaSekolah: e.target.value})}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Phone className="text-gray-400 w-5 h-5" /></span>
            <input 
              type="text" 
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all disabled:bg-gray-100" 
              placeholder="Nomor HP"
              value={formData.noHp}
              onChange={(e) => setFormData({...formData, noHp: e.target.value})}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Lock className="text-gray-400 w-5 h-5" /></span>
            <input 
              type="password" 
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all disabled:bg-gray-100" 
              placeholder="Password (Wajib)"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_4px_15px_0_rgba(59,130,246,0.75)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_0_rgba(59,130,246,0.85)] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? 'MEMPROSES...' : 'Daftar Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
