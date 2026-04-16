import React from 'react';
import { RppData } from '../types';
import { AppConfig } from '../lib/store';

interface FormSectionProps {
  rppData: RppData;
  setRppData: React.Dispatch<React.SetStateAction<RppData>>;
  validationError: string;
  onGenerateTP: () => void;
  onShowIdeaModal: () => void;
  appConfig: AppConfig;
}

export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig }: FormSectionProps) {
  const handleChange = (field: keyof RppData, value: any) => {
    setRppData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckbox = (field: 'profilLulusan' | 'sumberBelajar', value: string) => {
    setRppData(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const updateKelasFaseOptions = () => {
    const jenjang = rppData.jenjang;
    const kelasOptions: Record<string, string[]> = { 
      'PAUD': ['Kelompok Bermain (2-4 Tahun)'], 
      'TK': ['Kelompok A (4-5 Tahun)', 'Kelompok B (5-6 Tahun)'], 
      'SD': ['I / Ganjil', 'I / Genap', 'II / Ganjil', 'II / Genap', 'III / Ganjil', 'III / Genap', 'IV / Ganjil', 'IV / Genap', 'V / Ganjil', 'V / Genap', 'VI / Ganjil', 'VI / Genap'], 
      'SMP': ['VII / Ganjil', 'VII / Genap', 'VIII / Ganjil', 'VIII / Genap', 'IX / Ganjil', 'IX / Genap'], 
      'SMA': ['X / Ganjil', 'X / Genap', 'XI / Ganjil', 'XI / Genap', 'XII / Ganjil', 'XII / Genap'], 
      'SDLB': ['Kelas I-VI'], 'SMPLB': ['Kelas VII-IX'], 'SMALB': ['Kelas X-XII'] 
    };
    const faseOptions: Record<string, string[]> = { 
      'PAUD': ['Fondasi'], 'TK': ['Fondasi'], 'SD': ['A', 'B', 'C'], 'SMP': ['D'], 'SMA': ['E', 'F'], 'SDLB': ['A', 'B', 'C'], 'SMPLB': ['D'], 'SMALB': ['E', 'F'] 
    };

    return {
      kelas: kelasOptions[jenjang] || [],
      fase: faseOptions[jenjang] || []
    };
  };

  const options = updateKelasFaseOptions();

  const handleLoadCP = () => {
    if (rppData.fase && appConfig.cpData[rppData.fase]) {
      handleChange('cp_full_text', appConfig.cpData[rppData.fase]);
    } else {
      alert('Pilih Fase terlebih dahulu atau CP untuk fase ini belum dikonfigurasi oleh Admin.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">1. Identitas Rencana Pembelajaran & Sekolah</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">a. Nama Sekolah</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: SMP NEGERI 2 SUKOREJO" value={rppData.namaSekolah} onChange={e => handleChange('namaSekolah', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">b. Jenjang Sekolah</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.jenjang} onChange={e => { handleChange('jenjang', e.target.value); handleChange('kelasSemester', ''); handleChange('fase', ''); }}>
              <option value="">Pilih Jenjang</option>
              <option value="PAUD">PAUD</option>
              <option value="TK">TK</option>
              <option value="SD">SD/MI</option>
              <option value="SMP">SMP/MTs</option>
              <option value="SMA">SMA/MA/SMK</option>
              <option value="SDLB">SDLB</option>
              <option value="SMPLB">SMPLB</option>
              <option value="SMALB">SMALB</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">c. Mata Pelajaran</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: Bahasa Indonesia" value={rppData.mapel} onChange={e => handleChange('mapel', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">d. Tahun Pelajaran</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: 2025/2026" value={rppData.tahunPelajaran} onChange={e => handleChange('tahunPelajaran', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">e. Kelas / Semester</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={!rppData.jenjang} value={rppData.kelasSemester} onChange={e => handleChange('kelasSemester', e.target.value)}>
              <option value="">Pilih Kelas/Semester</option>
              {options.kelas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">f. Fase</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={!rppData.jenjang} value={rppData.fase} onChange={e => handleChange('fase', e.target.value)}>
              <option value="">Pilih Fase</option>
              {options.fase.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-2">g. Alokasi Waktu</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Jumlah Pertemuan</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.jumlahPertemuan} min="1" onChange={e => handleChange('jumlahPertemuan', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Durasi per Pertemuan</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.durasiPertemuan} onChange={e => handleChange('durasiPertemuan', e.target.value)}>
                  <option value="1 JP x 30 Menit">1 JP x 30 Menit</option>
                  <option value="2 JP x 30 Menit">2 JP x 30 Menit</option>
                  <option value="3 JP x 30 Menit">3 JP x 30 Menit</option>
                  <option value="1 JP x 35 Menit">1 JP x 35 Menit</option>
                  <option value="2 JP x 35 Menit">2 JP x 35 Menit</option>
                  <option value="3 JP x 35 Menit">3 JP x 35 Menit</option>
                  <option value="4 JP x 35 Menit">4 JP x 35 Menit</option>
                  <option value="1 JP x 40 Menit">1 JP x 40 Menit</option>
                  <option value="2 JP x 40 Menit">2 JP x 40 Menit</option>
                  <option value="3 JP x 40 Menit">3 JP x 40 Menit</option>
                  <option value="1 JP x 45 Menit">1 JP x 45 Menit</option>
                  <option value="2 JP x 45 Menit">2 JP x 45 Menit</option>
                  <option value="3 JP x 45 Menit">3 JP x 45 Menit</option>
                  <option value="4 JP x 45 Menit">4 JP x 45 Menit</option>
                  <option value="5 JP x 45 Menit">5 JP x 45 Menit</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">h. Nama Guru / NIP</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Wiwit Wardhani, S.Pd / NIP: 19..." value={rppData.namaGuru} onChange={e => handleChange('namaGuru', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">i. Nama Kepala Sekolah / NIP</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Drs. Jasmak, M.Pd / NIP: 1965......" value={rppData.namaKepsek} onChange={e => handleChange('namaKepsek', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">j. Lokasi</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Pasuruan" value={rppData.kota} onChange={e => handleChange('kota', e.target.value)} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Pengaturan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Nilai Minimal "Tercapai"</label>
            <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.kktpTercapaiMin} min="0" max="100" onChange={e => handleChange('kktpTercapaiMin', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Profil Lulusan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          {["Keimanan dan Ketakwaan terhadap Tuhan YME", "Kewargaan", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Kemandirian", "Kesehatan", "Komunikasi"].map((item, idx) => (
            <div key={item} className={`flex items-center ${idx === 0 ? 'sm:col-span-2' : ''}`}>
              <input type="checkbox" id={`profil-${idx}`} checked={rppData.profilLulusan.includes(item)} onChange={() => handleCheckbox('profilLulusan', item)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor={`profil-${idx}`} className="ml-2 block text-sm text-gray-900">{item}</label>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <label className="block font-semibold text-gray-700 mb-2">Sarana & Prasarana</label>
          <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.saranaPrasarana} onChange={e => handleChange('saranaPrasarana', e.target.value)} />
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Identifikasi Awal Siswa</h3>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">1. Karakteristik Siswa</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.karakteristik} onChange={e => handleChange('karakteristik', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">2. Minat Belajar</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.minat} onChange={e => handleChange('minat', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">3. Motivasi Belajar</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.motivasi} onChange={e => handleChange('motivasi', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">4. Prestasi Belajar</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.prestasi} onChange={e => handleChange('prestasi', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">5. Lingkungan Sekolah</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Contoh: Perkotaan, mayoritas siswa dari keluarga ekonomi menengah" value={rppData.lingkungan} onChange={e => handleChange('lingkungan', e.target.value)} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Kerangka Pembelajaran</h3>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Kemitraan Pembelajaran</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.kemitraan} onChange={e => handleChange('kemitraan', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Lingkungan Pembelajaran (Fisik)</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.lingkunganFisik} onChange={e => handleChange('lingkunganFisik', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Lingkungan Pembelajaran (Virtual)</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.lingkunganVirtual} onChange={e => handleChange('lingkunganVirtual', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Budaya Belajar di Kelas</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.budayaBelajar} onChange={e => handleChange('budayaBelajar', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Perencanaan)</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.digitalPerencanaan} onChange={e => handleChange('digitalPerencanaan', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Pelaksanaan)</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.digitalPelaksanaan} onChange={e => handleChange('digitalPelaksanaan', e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Asesmen)</label>
            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={rppData.digitalAsesmen} onChange={e => handleChange('digitalAsesmen', e.target.value)} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Pengaturan Konten Rencana Pembelajaran & LKPD</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Model Pembelajaran</label>
            <div className="space-y-2">
              {['Project Based Learning (PjBL)', 'Problem Based Learning (PBL)', 'Discovery Learning', 'Cooperative Learning', 'Inquiry Learning'].map(item => (
                <div key={item} className="flex items-center">
                  <input type="radio" id={`model-${item}`} name="model-pembelajaran" value={item} checked={rppData.modelPembelajaran === item} onChange={() => handleChange('modelPembelajaran', item)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                  <label htmlFor={`model-${item}`} className="ml-2 block text-sm text-gray-900">{item}</label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Sumber Belajar (untuk LKPD)</label>
            <div className="space-y-2">
              {['Gambar', 'Video dari YouTube', 'Quizizz', 'Wordwall'].map(item => (
                <div key={item} className="flex items-center">
                  <input type="checkbox" id={`sumber-${item}`} checked={rppData.sumberBelajar.includes(item)} onChange={() => handleCheckbox('sumberBelajar', item)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor={`sumber-${item}`} className="ml-2 block text-sm text-gray-900">{item}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">2. Capaian Pembelajaran / Materi</h2>
          <button onClick={handleLoadCP} className="px-4 py-2 text-sm rounded-lg font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
            Muat CP Fase {rppData.fase || '?'}
          </button>
        </div>
        <label className="block font-semibold text-gray-700 mb-2">Masukkan kalimat Capaian Pembelajaran atau beberapa materi pokok dipisahkan koma (,)</label>
        <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={4} placeholder="Contoh: Mengenali berbagai model jaringan komputer, dan melakukan pengiriman data antarperangkat." value={rppData.cp_full_text} onChange={e => handleChange('cp_full_text', e.target.value)}></textarea>

        {validationError && (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
            {validationError}
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button onClick={onGenerateTP} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Lanjutkan ke Tujuan Pembelajaran</button>
          <button onClick={onShowIdeaModal} className="px-6 py-3 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors">✨ Dapatkan Ide Kreatif</button>
        </div>
      </section>
    </div>
  );
}
