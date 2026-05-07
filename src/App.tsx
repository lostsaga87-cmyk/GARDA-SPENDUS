/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import MainApp from './components/MainApp';
import AdminDashboard from './components/AdminDashboard';
import { User, AppConfig, getAppConfig, logActivity } from './lib/store';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'main' | 'admin'>('login');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      getAppConfig().then(config => {
        setAppConfig(config);
        setLoading(false);
        
        // Update document title and favicon
        if (config) {
          document.title = config.appName || 'GARDA SPENDUS';
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = config.appLogo || 'https://lh3.googleusercontent.com/d/1ltGZoLoeamrE79q-Uzwx3KUg6A987qo2';
        }
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (user: User) => {
    setIsEntering(true);
    
    // Memberikan efek visual "memasuki" ruang kerja
    setTimeout(() => {
      setCurrentUser(user);
      if (user.role === 'admin') {
        setCurrentScreen('admin');
      } else {
        setCurrentScreen('main');
        logActivity(user.id, 'visit').catch(console.error);
      }
      setIsEntering(false);
    }, 2500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  const handleRegisterSuccess = () => {
    alert('Pendaftaran berhasil! Silakan tunggu admin memvalidasi akun Anda.');
    setCurrentScreen('login');
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-lg w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Supabase Belum Dikonfigurasi</h1>
          <p className="mb-4 text-gray-700">Silakan tambahkan variabel lingkungan berikut di pengaturan aplikasi Anda:</p>
          <ul className="list-disc pl-5 mb-6 text-gray-600 font-mono text-sm">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-gray-700 text-sm">Setelah ditambahkan, muat ulang halaman ini.</p>
          <p className="text-gray-500 text-xs mt-4">Catatan: Anda juga perlu menjalankan script SQL di Supabase SQL Editor. Script tersedia di file <code className="bg-gray-100 px-1 rounded">supabase-schema.sql</code>.</p>
        </div>
      </div>
    );
  }

  if (loading || !appConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium animate-pulse">Menyiapkan Ruang Kerja Anda...</p>
      </div>
    );
  }

  if (isEntering) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 overflow-hidden relative">
        <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-blue-600/30 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }}></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-8">
             <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
             <div className="absolute inset-2 border-r-4 border-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
             <div className="absolute inset-4 border-b-4 border-indigo-500 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <img src={appConfig?.appLogo} alt="Logo" className="w-8 h-8 object-contain animate-pulse" />
             </div>
          </div>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase shadow-sm mb-2">Memasuki Ruang Kerja</h2>
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
             <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-6 text-slate-400 text-sm font-medium tracking-wide animate-pulse">Menyiapkan profil dan preferensi Anda ...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentScreen === 'login' && (
        <LoginScreen 
          onLogin={handleLogin} 
          onGoToRegister={() => setCurrentScreen('register')} 
          appConfig={appConfig}
        />
      )}
      {currentScreen === 'register' && (
        <RegisterScreen 
          onRegister={handleRegisterSuccess} 
          onCancel={() => setCurrentScreen('login')} 
          appConfig={appConfig}
        />
      )}
      {currentScreen === 'main' && currentUser && (
        <MainApp onLogout={handleLogout} appConfig={appConfig} currentUser={currentUser} />
      )}
      {currentScreen === 'admin' && currentUser?.role === 'admin' && (
        <AdminDashboard onLogout={handleLogout} />
      )}
    </>
  );
}
