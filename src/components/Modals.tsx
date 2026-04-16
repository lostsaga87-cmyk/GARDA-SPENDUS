import React, { useState } from 'react';
import { makeApiCall } from '../lib/api';

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Bantuan Penggunaan Aplikasi</h2>
        <div className="space-y-4 text-gray-700">
          <p>Selamat datang di GARDA SPENDUS. Ikuti langkah-langkah berikut untuk membuat Rencana Pembelajaran secara otomatis:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Login:</strong> Masukkan username dan password yang telah ditentukan untuk masuk ke aplikasi.</li>
            <li><strong>Isi Identitas Rencana Pembelajaran & Siswa:</strong> Lengkapi semua data pada formulir pertama, seperti nama sekolah, jenjang, hingga data identifikasi awal siswa.</li>
            <li><strong>Masukkan Capaian Pembelajaran:</strong> Tulis kalimat CP atau beberapa materi pokok pada kolom yang tersedia.</li>
            <li><strong>Generate TP, ATP, KKTP:</strong> Klik tombol "Lanjutkan" atau "Buat" pada setiap langkah. Aplikasi akan otomatis menghasilkan Tujuan Pembelajaran (TP), Alur Tujuan Pembelajaran (ATP), dan Kriteria Ketercapaian (KKTP) berdasarkan materi yang Anda input.</li>
            <li><strong>Ide Kreatif (Opsional):</strong> Gunakan tombol "✨ Dapatkan Ide Kreatif" untuk mendapatkan ide ice breaking, rangkuman materi untuk siswa, dan pertanyaan refleksi dari AI.</li>
            <li><strong>Generate Rencana Pembelajaran & LKPD:</strong> Setelah KKTP dibuat, gunakan tombol "Buat Rencana Pembelajaran Lengkap" untuk menghasilkan dokumen yang diinginkan.</li>
            <li><strong>Cetak atau Simpan:</strong> Gunakan tombol "Cetak" atau "Unduh Word" pada bagian hasil Rencana Pembelajaran untuk mencetak dokumen atau menyimpannya sebagai file.</li>
            <li><strong>Edit Dokumen (Baru):</strong> Setelah RPP lengkap dibuat, gunakan tombol "📝 Edit Dokumen" untuk melakukan penyesuaian langsung pada teks. Klik "💾 Simpan Edit" jika sudah selesai. Tombol "Cetak" tidak bisa digunakan saat mode edit aktif.</li>
          </ol>
          <p>Jika ada kendala, silakan hubungi pengembang.</p>
        </div>
        <div className="text-right mt-6">
          <button onClick={onClose} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Tutup</button>
        </div>
      </div>
    </div>
  );
}

export function ApiKeyModal({ 
  onClose, 
  apiKey, 
  setApiKey 
}: { 
  onClose: () => void, 
  apiKey: string, 
  setApiKey: (key: string) => void 
}) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setApiKey(inputKey);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Pengaturan Kunci API</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <label className="font-semibold text-gray-700 mb-2 block">Kunci API Google Gemini</label>
            <input 
              type="password" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/25" 
              placeholder="Masukkan kunci API Gemini Anda"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Diperlukan untuk semua fitur AI.</p>
          </div>
          {success && (
            <div className="text-green-600 bg-green-100 p-3 rounded-md">
              Pengaturan berhasil disimpan.
            </div>
          )}
        </div>
        <div className="text-right mt-6 space-x-3">
          <button onClick={handleSave} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Simpan</button>
          <button onClick={onClose} className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-500 hover:bg-gray-600 transition-colors">Tutup</button>
        </div>
      </div>
    </div>
  );
}

export function IdeaModal({ 
  onClose, 
  rppData, 
  apiKey 
}: { 
  onClose: () => void, 
  rppData: any, 
  apiKey: string 
}) {
  const [iceBreaking, setIceBreaking] = useState('');
  const [summary, setSummary] = useState('');
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState({ ice: false, summary: false, reflection: false });

  const handleGenerate = async (type: 'ice' | 'summary' | 'reflection') => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      let prompt = '';
      if (type === 'ice') {
        prompt = `Berikan 3 ide kegiatan "ice breaking" yang kreatif dan menyenangkan untuk siswa jenjang ${rppData.jenjang} (${rppData.kelasSemester}). Kegiatan harus relevan dengan topik pelajaran: "${rppData.cp_full_text}". Sajikan dalam format daftar bernomor.`;
      } else if (type === 'summary') {
        prompt = `Anda adalah seorang guru yang pandai menyederhanakan konsep. Buat rangkuman singkat (sekitar 2-3 paragraf) dari materi berikut: "${rppData.cp_full_text}". Gunakan bahasa yang mudah dipahami oleh siswa jenjang ${rppData.jenjang} dan berikan judul yang menarik.`;
      } else {
        prompt = `Buat 3 pertanyaan refleksi yang mendalam untuk siswa jenjang ${rppData.jenjang} di akhir pelajaran dengan topik "${rppData.cp_full_text}". Pertanyaan harus mendorong siswa untuk menghubungkan materi dengan pengalaman mereka sendiri. Sajikan dalam format daftar bernomor.`;
      }

      const result = await makeApiCall(prompt, apiKey);
      
      if (type === 'ice') setIceBreaking(result);
      if (type === 'summary') setSummary(result);
      if (type === 'reflection') setReflection(result);
    } catch (error: any) {
      const errorMsg = `Gagal: ${error.message}`;
      if (type === 'ice') setIceBreaking(errorMsg);
      if (type === 'summary') setSummary(errorMsg);
      if (type === 'reflection') setReflection(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">✨ Ide Kreatif dari AI</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">🧊 Ide Ice Breaking</h3>
            <p className="text-sm text-gray-600 mb-3">Dapatkan ide kegiatan pemanasan yang relevan dengan topik pelajaran.</p>
            <button onClick={() => handleGenerate('ice')} disabled={loading.ice} className="w-full py-2 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm">
              {loading.ice ? 'Memproses...' : '✨ Hasilkan Ide'}
            </button>
            <div className="mt-4 text-sm bg-gray-50 p-3 rounded-md min-h-[100px] whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: iceBreaking.replace(/\\n/g, '<br>') }}></div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">📝 Rangkuman untuk Siswa</h3>
            <p className="text-sm text-gray-600 mb-3">Buat ringkasan materi yang mudah dipahami oleh siswa.</p>
            <button onClick={() => handleGenerate('summary')} disabled={loading.summary} className="w-full py-2 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm">
              {loading.summary ? 'Memproses...' : '✨ Buat Rangkuman'}
            </button>
            <div className="mt-4 text-sm bg-gray-50 p-3 rounded-md min-h-[100px] whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: summary.replace(/\\n/g, '<br>') }}></div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">🤔 Pertanyaan Refleksi</h3>
            <p className="text-sm text-gray-600 mb-3">Hasilkan pertanyaan di akhir pelajaran untuk mengukur pemahaman.</p>
            <button onClick={() => handleGenerate('reflection')} disabled={loading.reflection} className="w-full py-2 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm">
              {loading.reflection ? 'Memproses...' : '✨ Buat Pertanyaan'}
            </button>
            <div className="mt-4 text-sm bg-gray-50 p-3 rounded-md min-h-[100px] whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: reflection.replace(/\\n/g, '<br>') }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
