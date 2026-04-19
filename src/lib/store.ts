import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
  password?: string;
  namaSekolah?: string;
  noHp?: string;
  nip?: string;
  namaKepsek?: string;
  mapel?: string[];
  role: 'admin' | 'user';
  status: 'approved' | 'pending' | 'rejected';
  profile_picture?: string;
}

export interface AppConfig {
  appName: string;
  appLogo: string;
  apiKeys: string[];
  cpData: Record<string, string>;
}

export const DEFAULT_CONFIG: AppConfig = {
  appName: "GARDA SPENDUS",
  appLogo: "https://lh3.googleusercontent.com/d/1ltGZoLoeamrE79q-Uzwx3KUg6A987qo2",
  apiKeys: Array(10).fill(""),
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
  
  let parsedApiKeys: string[] = Array(10).fill("");
  if (data.api_key) {
    try {
      const parsed = JSON.parse(data.api_key);
      if (Array.isArray(parsed)) {
        parsedApiKeys = [...parsed, ...Array(10)].slice(0, 10);
      } else {
        parsedApiKeys[0] = data.api_key;
      }
    } catch (e) {
      parsedApiKeys[0] = data.api_key;
    }
  }

  return {
    appName: data.app_name,
    appLogo: data.app_logo,
    apiKeys: parsedApiKeys,
    cpData: data.cp_data || {}
  };
}

export async function updateAppConfig(config: AppConfig) {
  const { error } = await supabase.from('app_config').upsert({
    id: 1,
    app_name: config.appName,
    app_logo: config.appLogo,
    api_key: JSON.stringify(config.apiKeys),
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
  
  let parsedMapel: string[] = [];
  if (data.mapel) {
    try {
      parsedMapel = typeof data.mapel === 'string' ? JSON.parse(data.mapel) : data.mapel;
    } catch (e) {
      console.error('Error parsing mapel:', e);
    }
  }

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    status: data.status,
    namaSekolah: data.nama_sekolah,
    noHp: data.no_hp,
    nip: data.nip,
    namaKepsek: data.nama_kepsek,
    mapel: parsedMapel,
    profile_picture: data.profile_picture
  };
}

export async function registerUser(userData: any) {
  const { error } = await supabase.from('users').insert([{
    username: userData.username,
    password: userData.password,
    nama_sekolah: userData.namaSekolah,
    no_hp: userData.noHp,
    nip: userData.nip,
    nama_kepsek: userData.namaKepsek,
    mapel: userData.mapel,
    role: 'user',
    status: 'pending'
  }]);
  if (error) throw error;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(d => {
    let parsedMapel: string[] = [];
    if (d.mapel) {
      try {
        parsedMapel = typeof d.mapel === 'string' ? JSON.parse(d.mapel) : d.mapel;
      } catch (e) {}
    }
    return {
      id: d.id,
      username: d.username,
      role: d.role,
      status: d.status,
      namaSekolah: d.nama_sekolah,
      noHp: d.no_hp,
      nip: d.nip,
      namaKepsek: d.nama_kepsek,
      mapel: parsedMapel,
      profile_picture: d.profile_picture
    };
  });
}

export async function updateUserStatus(id: string, status: string) {
  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updatePassword(userId: string, newPassword: string) {
  const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId);
  if (error) throw error;
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const dbUpdates: any = {};
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.nip !== undefined) dbUpdates.nip = updates.nip;
  if (updates.namaSekolah !== undefined) dbUpdates.nama_sekolah = updates.namaSekolah;
  if (updates.namaKepsek !== undefined) dbUpdates.nama_kepsek = updates.namaKepsek;
  if (updates.noHp !== undefined) dbUpdates.no_hp = updates.noHp;
  if (updates.mapel !== undefined) dbUpdates.mapel = updates.mapel;
  if (updates.profile_picture !== undefined) dbUpdates.profile_picture = updates.profile_picture;

  const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
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
    .select('user_id, activity_type, created_at');
  if (error) {
    console.error('Error fetching stats:', error);
    return [];
  }
  return data;
}

export interface SavedDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export async function saveDocument(userId: string, title: string, content: string) {
  const { error } = await supabase.from('saved_documents').insert([{
    user_id: userId,
    title,
    content
  }]);
  if (error) throw error;
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from('saved_documents')
    .select('id, user_id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data;
}

export async function getDocumentById(docId: string) {
  const { data, error } = await supabase
    .from('saved_documents')
    .select('*')
    .eq('id', docId)
    .single();
  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }
  return data;
}

export async function deleteDocument(docId: string) {
  const { error } = await supabase
    .from('saved_documents')
    .delete()
    .eq('id', docId);
  if (error) throw error;
}

// Fungsi dummy untuk kompatibilitas sementara jika ada komponen yang masih menggunakan getStoreData secara sinkron
export const getStoreData = <T>(key: string, defaultValue: T): T => {
  return defaultValue;
};

export const setStoreData = <T>(key: string, value: T): void => {
  console.warn('setStoreData is deprecated. Use Supabase async functions instead.');
};
