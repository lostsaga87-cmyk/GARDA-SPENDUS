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

  useEffect(() => {
    if (isSupabaseConfigured()) {
      getAppConfig().then(config => {
        setAppConfig(config);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('main');
      await logActivity(user.id, 'visit');
    }
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Memuat konfigurasi aplikasi...</div>;
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
