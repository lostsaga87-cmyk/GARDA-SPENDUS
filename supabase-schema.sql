-- Jalankan script ini di SQL Editor pada dashboard Supabase Anda

-- 0. (Opsional) Hapus tabel lama jika Anda ingin mereset/mengulang dari awal
-- DROP TABLE IF EXISTS user_activities;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS app_config;

-- 1. Buat tabel users
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  nama_sekolah TEXT,
  no_hp TEXT,
  nip TEXT UNIQUE NOT NULL,
  nama_kepsek TEXT,
  mapel JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- JIKA TABEL USERS SUDAH ADA SEBELUMNYA, JALANKAN PERINTAH ALTER INI:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS nama_kepsek TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS mapel JSONB;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_instansi TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_dinas TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_nama_sekolah TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_alamat TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_kontak TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS kop_sekolah_image TEXT;

-- 2. Buat tabel app_config (hanya satu baris)
CREATE TABLE app_config (
  id INT PRIMARY KEY DEFAULT 1,
  app_name TEXT NOT NULL,
  app_logo TEXT NOT NULL,
  api_key TEXT,
  cp_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. Buat tabel user_activities untuk riwayat dan grafik
CREATE TABLE user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'visit' atau 'generate'
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Masukkan data admin default
INSERT INTO users (username, nip, password, role, status)
VALUES ('Admin', '1', '1', 'admin', 'approved');

-- 5. Masukkan konfigurasi aplikasi default
INSERT INTO app_config (id, app_name, app_logo, cp_data)
VALUES (
  1, 
  'GARDA SPENDUS', 
  'https://lh3.googleusercontent.com/d/1ltGZoLoeamrE79q-Uzwx3KUg6A987qo2', 
  '{"A": "", "B": "", "C": "", "D": "", "E": "", "F": ""}'::jsonb
);

-- 6. Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Izinkan akses baca/tulis anonim (HANYA UNTUK PROTOTIPE/PENGEMBANGAN)
CREATE POLICY "Allow anonymous read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on users" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access on app_config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update access on app_config" ON app_config FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous insert access on app_config" ON app_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access on user_activities" ON user_activities FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on user_activities" ON user_activities FOR INSERT WITH CHECK (true);
