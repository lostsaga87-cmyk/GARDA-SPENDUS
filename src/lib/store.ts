import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
  password?: string;
  namaSekolah?: string;
  noHp?: string;
  nip?: string;
  role: 'admin' | 'user';
  status: 'approved' | 'pending' | 'rejected';
}

export interface AppConfig {
  appName: string;
  appLogo: string;
  apiKey: string;
  cpData: Record<string, string>;
}

export const DEFAULT_CONFIG: AppConfig = {
  appName: "GARDA SPENDUS",
  appLogo: "https://lh3.googleusercontent.com/d/1ltGZoLoeamrE79q-Uzwx3KUg6A987qo2",
  apiKey: "",
  cpData: {
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
    F: ""
  }
};

// Fungsi ini dipertahankan untuk kompatibilitas jika ada yang memanggilnya,
// tapi inisialisasi sekarang dilakukan di Supabase via SQL schema.
export const initStore = () => {};

export async function getAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase.from('app_config').select('*').eq('id', 1).single();
  if (error || !data) {
    console.error('Error fetching app config:', error);
    return null;
  }
  return {
    appName: data.app_name,
    appLogo: data.app_logo,
    apiKey: data.api_key || '',
    cpData: data.cp_data || {}
  };
}

export async function updateAppConfig(config: AppConfig) {
  const { error } = await supabase.from('app_config').upsert({
    id: 1,
    app_name: config.appName,
    app_logo: config.appLogo,
    api_key: config.apiKey,
    cp_data: config.cpData
  });
  if (error) throw error;
}

export async function loginUser(nip: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('nip', nip)
    .eq('password', password)
    .single();
  
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    role: data.role,
    status: data.status,
    namaSekolah: data.nama_sekolah,
    noHp: data.no_hp,
    nip: data.nip
  };
}

export async function registerUser(userData: any) {
  const { error } = await supabase.from('users').insert([{
    username: userData.username,
    password: userData.password,
    nama_sekolah: userData.namaSekolah,
    no_hp: userData.noHp,
    nip: userData.nip,
    role: 'user',
    status: 'pending'
  }]);
  if (error) throw error;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(d => ({
    id: d.id,
    username: d.username,
    role: d.role,
    status: d.status,
    namaSekolah: d.nama_sekolah,
    noHp: d.no_hp,
    nip: d.nip
  }));
}

export async function updateUserStatus(id: string, status: string) {
  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updatePassword(userId: string, newPassword: string) {
  const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId);
  if (error) throw error;
}

export async function logActivity(userId: string, activityType: 'visit' | 'generate', details: string = '') {
  const { error } = await supabase.from('user_activities').insert([{
    user_id: userId,
    activity_type: activityType,
    details: details
  }]);
  if (error) console.error('Error logging activity:', error);
}

export async function getUserHistory(userId: string) {
  const { data, error } = await supabase
    .from('user_activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }
  return data;
}

export async function getActivityStats() {
  const { data, error } = await supabase
    .from('user_activities')
    .select('activity_type, created_at');
  if (error) {
    console.error('Error fetching stats:', error);
    return [];
  }
  return data;
}

// Fungsi dummy untuk kompatibilitas sementara jika ada komponen yang masih menggunakan getStoreData secara sinkron
export const getStoreData = <T>(key: string, defaultValue: T): T => {
  return defaultValue;
};

export const setStoreData = <T>(key: string, value: T): void => {
  console.warn('setStoreData is deprecated. Use Supabase async functions instead.');
};
