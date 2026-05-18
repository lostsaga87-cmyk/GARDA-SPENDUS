import React from 'react';
import { RppData } from '../types';
import { AppConfig } from '../lib/store';
import Swal from 'sweetalert2';

interface FormSectionProps {
  showValidationMarks: boolean;
  rppData: RppData;
  setRppData: React.Dispatch<React.SetStateAction<RppData>>;
  validationError: string;
  onGenerateTP: () => void;
  onShowIdeaModal: () => void;
  appConfig: AppConfig;
  userMapel?: string[];
}

export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig, userMapel = [], showValidationMarks }: FormSectionProps) {
  const b = (field: keyof typeof rppData) => `${showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0)) ? "border-red-400 bg-red-50" : "border-gray-300"}`;
  const E = ({field, msg}: {field: keyof typeof rppData, msg?: string}) => ((showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0))) ? <span className="text-red-500 text-xs mt-1 block font-medium">{msg || "Wajib diisi"}</span> : null) as any;
  const handleChange = (field: keyof RppData, value: any) => {
    setRppData(prev => {
      const updates: any = { [field]: value };
      if (field === 'namaSekolah' && typeof value === 'string') {
        const s = value.toUpperCase();
        let guessedJenjang = '';
        if (s.includes('SD') || s.includes('MI')) guessedJenjang = 'SD';
        else if (s.includes('SMP') || s.includes('MTS')) guessedJenjang = 'SMP';
        else if (s.includes('SMA') || s.includes('SMK') || s.includes('MA ') || s.includes('MAK')) guessedJenjang = 'SMA';
        else if (s.includes('PAUD')) guessedJenjang = 'PAUD';
        else if (s.includes('TK')) guessedJenjang = 'TK';
        
        if (guessedJenjang && guessedJenjang !== prev.jenjang) {
          updates.jenjang = guessedJenjang;
          updates.kelasSemester = '';
          updates.fase = '';
        }
      }
      return { ...prev, ...updates };
    });
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

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">1. Identitas Rencana Pembelajaran & Sekolah</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">a. Nama Sekolah</label>
            <input type="text" className={`w-full p-3 border ${b('namaSekolah')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Contoh: SMP NEGERI 2 SUKOREJO" value={rppData.namaSekolah} onChange={e => handleChange('namaSekolah', e.target.value)} />
            <E field="namaSekolah" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">b. Jenjang Sekolah</label>
            <select className={`w-full p-3 border ${b('jenjang')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.jenjang} onChange={e => { handleChange('jenjang', e.target.value); handleChange('kelasSemester', ''); handleChange('fase', ''); }}>
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
            <E field="jenjang" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">c. Mata Pelajaran</label>
            {userMapel && userMapel.length > 0 ? (
              <select 
                className={`w-full p-3 border ${b('mapel')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} 
                value={rppData.mapel} 
                onChange={e => handleChange('mapel', e.target.value)}
              >
                <option value="">Pilih Mata Pelajaran</option>
                {userMapel.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input type="text" className={`w-full p-3 border ${b('mapel')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Contoh: Bahasa Indonesia" value={rppData.mapel} onChange={e => handleChange('mapel', e.target.value)} />
            )}
            <E field="mapel" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">d. Tahun Pelajaran</label>
            <input type="text" className={`w-full p-3 border ${b('tahunPelajaran')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Contoh: 2025/2026" value={rppData.tahunPelajaran} onChange={e => handleChange('tahunPelajaran', e.target.value)} />
            <E field="tahunPelajaran" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">e. Kelas / Semester</label>
            <select className={`w-full p-3 border ${b('kelasSemester')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} disabled={!rppData.jenjang} value={rppData.kelasSemester} onChange={e => handleChange('kelasSemester', e.target.value)}>
              <option value="">Pilih Kelas/Semester</option>
              {options.kelas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <E field="kelasSemester" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">f. Fase</label>
            <select className={`w-full p-3 border ${b('fase')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} disabled={!rppData.jenjang} value={rppData.fase} onChange={e => handleChange('fase', e.target.value)}>
              <option value="">Pilih Fase</option>
              {options.fase.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <E field="fase" />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-gray-700 mb-2">g. Alokasi Waktu</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Jumlah RPM yang akan Digenerate</label>
                <div className="relative mt-1">
                  <input type="number" className={`w-full p-3 pr-10 border ${b('jumlahPertemuan')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} value={rppData.jumlahPertemuan} min="1" onChange={e => handleChange('jumlahPertemuan', parseInt(e.target.value) || 1)} />
            <E field="jumlahPertemuan" />
                  <div className="absolute inset-y-0 right-0 flex flex-col border-l border-gray-300">
                    <button type="button" className="flex-1 px-2 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-tr-lg border-b border-gray-300 text-gray-600" onClick={() => handleChange('jumlahPertemuan', Math.max(1, rppData.jumlahPertemuan + 1))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button type="button" className="flex-1 px-2 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-br-lg text-gray-600" onClick={() => handleChange('jumlahPertemuan', Math.max(1, rppData.jumlahPertemuan - 1))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Jumlah Pertemuan</label>
                <select className={`w-full p-3 border ${b('alokasiWaktu')} rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.alokasiWaktu} onChange={e => handleChange('alokasiWaktu', e.target.value)}>
                  <option value="">Pilih Jumlah Pertemuan</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={`${num} Pertemuan`}>{num} Pertemuan</option>
                  ))}
                </select>
            <E field="alokasiWaktu" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-600">Durasi per Pertemuan {(showValidationMarks && (!rppData.durasiPertemuan || rppData.durasiPertemuan.length === 0 || rppData.durasiPertemuan.some(d => !d))) && <span className="text-xs text-red-500 font-normal italic ml-2">(Wajib diisi sesuai jumlah pertemuan)</span>}</label>
                {(() => {
                  const match = rppData.alokasiWaktu.match(/(\d+)/);
                  const numOfMeetings = match ? parseInt(match[1], 10) : 1;
                  return Array.from({ length: numOfMeetings }).map((_, i) => (
                    <div key={i} className="flex flex-col">
                      <select 
                        className={`w-full p-3 border ${(!rppData.durasiPertemuan?.[i]) ? 'border-red-400 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} 
                        value={rppData.durasiPertemuan?.[i] || ""} 
                        onChange={e => {
                          const newDurasi = [...(rppData.durasiPertemuan || [])];
                          newDurasi[i] = e.target.value;
                          // If shrinking, we don't truncate here, but it's fine since we only read up to numOfMeetings
                          handleChange('durasiPertemuan', newDurasi);
                        }}
                      >
                        <option value="">Pilih Durasi Pertemuan {i + 1}</option>
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
                      {(showValidationMarks && !rppData.durasiPertemuan?.[i]) && <span className="text-xs text-red-500 mt-1 font-medium">Harap pilih durasi untuk pertemuan {i + 1}</span>}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">h. Nama Guru</label>
              <input type="text" className={`w-full p-3 border ${b('namaGuru')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Wiwit Wardhani, S.Pd" value={rppData.namaGuru} onChange={e => handleChange('namaGuru', e.target.value)} />
            <E field="namaGuru" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">NIP Guru</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="NIP: 19..." value={rppData.nipGuru || ''} onChange={e => handleChange('nipGuru', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">i. Nama Kepala Sekolah</label>
              <input type="text" className={`w-full p-3 border ${b('namaKepsek')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Drs. Jasmak, M.Pd" value={rppData.namaKepsek} onChange={e => handleChange('namaKepsek', e.target.value)} />
            <E field="namaKepsek" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">NIP Kepala Sekolah</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="NIP: 1965..." value={rppData.nipKepsek || ''} onChange={e => handleChange('nipKepsek', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">j. Lokasi</label>
            <input type="text" className={`w-full p-3 border ${b('kota')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Pasuruan" value={rppData.kota} onChange={e => handleChange('kota', e.target.value)} />
            <E field="kota" />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Pengaturan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Nilai Minimal "Tercapai"</label>
            <input type="number" className={`w-full p-3 border ${b('kktpTercapaiMin')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.kktpTercapaiMin} min="0" max="100" onChange={e => handleChange('kktpTercapaiMin', parseInt(e.target.value) || 0)} />
            <E field="kktpTercapaiMin" />
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
          <input type="text" className={`w-full p-3 border ${b('saranaPrasarana')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.saranaPrasarana} onChange={e => handleChange('saranaPrasarana', e.target.value)} />
            <E field="saranaPrasarana" />
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Identifikasi Awal Siswa</h3>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">1. Karakteristik Siswa</label>
            <input type="text" className={`w-full p-3 border ${b('karakteristik')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.karakteristik} onChange={e => handleChange('karakteristik', e.target.value)} />
            <E field="karakteristik" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">2. Minat Belajar</label>
            <input type="text" className={`w-full p-3 border ${b('minat')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.minat} onChange={e => handleChange('minat', e.target.value)} />
            <E field="minat" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">3. Motivasi Belajar</label>
            <input type="text" className={`w-full p-3 border ${b('motivasi')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.motivasi} onChange={e => handleChange('motivasi', e.target.value)} />
            <E field="motivasi" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">4. Prestasi Belajar</label>
            <input type="text" className={`w-full p-3 border ${b('prestasi')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.prestasi} onChange={e => handleChange('prestasi', e.target.value)} />
            <E field="prestasi" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">5. Lingkungan Sekolah</label>
            <input type="text" className={`w-full p-3 border ${b('lingkungan')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} placeholder="Contoh: Perkotaan, mayoritas siswa dari keluarga ekonomi menengah" value={rppData.lingkungan} onChange={e => handleChange('lingkungan', e.target.value)} />
            <E field="lingkungan" />
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-4 border-t pt-6 text-gray-800">Kerangka Pembelajaran</h3>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Kemitraan Pembelajaran</label>
            <input type="text" className={`w-full p-3 border ${b('kemitraan')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.kemitraan} onChange={e => handleChange('kemitraan', e.target.value)} />
            <E field="kemitraan" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Lingkungan Pembelajaran (Fisik)</label>
            <input type="text" className={`w-full p-3 border ${b('lingkunganFisik')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.lingkunganFisik} onChange={e => handleChange('lingkunganFisik', e.target.value)} />
            <E field="lingkunganFisik" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Lingkungan Pembelajaran (Virtual)</label>
            <input type="text" className={`w-full p-3 border ${b('lingkunganVirtual')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.lingkunganVirtual} onChange={e => handleChange('lingkunganVirtual', e.target.value)} />
            <E field="lingkunganVirtual" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Budaya Belajar di Kelas</label>
            <input type="text" className={`w-full p-3 border ${b('budayaBelajar')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.budayaBelajar} onChange={e => handleChange('budayaBelajar', e.target.value)} />
            <E field="budayaBelajar" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Perencanaan)</label>
            <input type="text" className={`w-full p-3 border ${b('digitalPerencanaan')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.digitalPerencanaan} onChange={e => handleChange('digitalPerencanaan', e.target.value)} />
            <E field="digitalPerencanaan" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Pelaksanaan)</label>
            <input type="text" className={`w-full p-3 border ${b('digitalPelaksanaan')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.digitalPelaksanaan} onChange={e => handleChange('digitalPelaksanaan', e.target.value)} />
            <E field="digitalPelaksanaan" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Pemanfaatan Digital (Asesmen)</label>
            <input type="text" className={`w-full p-3 border ${b('digitalAsesmen')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} value={rppData.digitalAsesmen} onChange={e => handleChange('digitalAsesmen', e.target.value)} />
            <E field="digitalAsesmen" />
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
          <h2 className="text-xl font-bold text-gray-800">2. Materi Ajar</h2>
        </div>
        <label className="block font-semibold text-gray-700 mb-2">Masukkan materi pokok dipisahkan titik koma (;)</label>
        <textarea className={`w-full p-3 border ${b('cp_full_text')} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`} rows={4} placeholder="Contoh: Tata Surya; Planet;" value={rppData.cp_full_text} onChange={e => handleChange('cp_full_text', e.target.value)}></textarea>
            <E field="cp_full_text" />
        
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button onClick={onGenerateTP} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Lanjutkan ke Tujuan Pembelajaran</button>
          <button onClick={onShowIdeaModal} className="px-6 py-3 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors">✨ Dapatkan Ide Kreatif</button>
        </div>
      </section>
    </div>
  );
}
