import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImgBase64 } from '../lib/cropImage';
import Header from './Header';
import FormSection from './FormSection';
import OutputSection from './OutputSection';
import { IdeaModal } from './Modals';
import { RppData } from '../types';
import { makeApiCall } from '../lib/api';
import { AppConfig, User, logActivity, getUserHistory, updatePassword, getUserDocuments, SavedDocument, getDocumentById, deleteDocument } from '../lib/store';
import { User as UserIcon, Clock, History, Key, X, Check, Menu, HelpCircle, LogOut, FileText, Download, MessageSquare, ChevronDown, Trash2, Star, MapPin, Phone, Mail, Globe, LayoutTemplate } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

const SUBJECTS = [
  'Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Daerah', 'Matematika', 
  'IPA', 'IPS', 'IPAS', 'Biologi', 'Fisika', 'Kimia', 'Ekonomi', 'Sosiologi', 'Geografi', 'Informatika', 'TKJ', 'RPL', 'DKV', 'PAI', 'BTQ', 'Pendidikan Pancasila', 
  'Seni Budaya/Seni Rupa', 'Prakarya', 'Tata Boga', 'PJOK'
];

export default function MainApp({ onLogout, appConfig, currentUser }: { onLogout: () => void, appConfig: AppConfig, currentUser: User }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Profile Mapel Dropdown State
  const [isMapelDropdownOpen, setIsMapelDropdownOpen] = useState(false);
  const mapelDropdownRef = useRef<HTMLDivElement>(null);

  // Logic to close sidebar & dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
      if (mapelDropdownRef.current && !mapelDropdownRef.current.contains(event.target as Node)) {
        setIsMapelDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSubject = (subject: string) => {
    setEditProfileData(prev => {
      const current = prev.mapel;
      if (current.includes(subject)) {
        return { ...prev, mapel: current.filter(s => s !== subject) };
      } else {
        return { ...prev, mapel: [...current, subject] };
      }
    });
  };

  const [currentView, setCurrentView] = useState<'generator' | 'profile' | 'history' | 'documents' | 'kop' | 'feedback' | 'help'>('generator');
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Theme dark mode handling
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userDocuments, setUserDocuments] = useState<SavedDocument[]>([]);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [editProfileData, setEditProfileData] = useState({
    username: currentUser.username || '',
    nip: currentUser.nip || '',
    namaSekolah: currentUser.namaSekolah || '',
    namaKepsek: currentUser.namaKepsek || '',
    nipKepsek: currentUser.nipKepsek || '',
    noHp: currentUser.noHp || '',
    mapel: currentUser.mapel || [],
    profile_picture: currentUser.profile_picture || '',
    kop_instansi: currentUser.kop_instansi || '',
    kop_dinas: currentUser.kop_dinas || '',
    kop_nama_sekolah: currentUser.kop_nama_sekolah || '',
    kop_alamat: currentUser.kop_alamat || '',
    kop_kontak: currentUser.kop_kontak || '',
    kop_website: currentUser.kop_website || '',
    kop_sekolah_image: currentUser.kop_sekolah_image || ''
  });

  // Photo Cropper State
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  // Ref for file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSendFeedback = async () => {
    if (!feedbackMsg.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Pesan kritik/saran tidak boleh kosong.',
      });
      return;
    }

    setIsSendingFeedback(true);
    try {
      const ratingStars = feedbackRating > 0 ? "⭐".repeat(feedbackRating) : "Belum dinilai";
      const formData = new FormData();
      formData.append('target', '08992124036'); // Hardcoded Admin WhatsApp Number
      formData.append('message', `*KRITIK/SARAN & SURVEY KEPUASAN*\n\nDari: *${currentUser.username}*\nSekolah: ${currentUser.namaSekolah || '-'}\nRating: ${ratingStars} (${feedbackRating}/5)\n\nPesan:\n"${feedbackMsg}"`);
      
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": "15nvY1EPBnyie3A8nX8n" // Fonnte token
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.status) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Kritik dan Saran berhasil dikirimkan via WhatsApp ke Admin. Terima kasih!',
        });
        setFeedbackMsg('');
        setFeedbackRating(0);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: "Gagal mengirim pesan: " + (result.reason || "Terjadi kesalahan."),
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Jaringan',
        text: 'Terjadi kesalahan sistem saat menghubungi server.',
      });
    } finally {
      setIsSendingFeedback(false);
    }
  };
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentView === 'profile' || currentView === 'history') {
      getUserHistory(currentUser.id).then(history => setUserHistory(history));
    }
  }, [currentView, currentUser.id]);

  useEffect(() => {
    if (currentView === 'documents') {
      getUserDocuments(currentUser.id).then(docs => setUserDocuments(docs));
    }
  }, [currentView, currentUser.id]);

  const guessJenjangFn = (sekolah: string): string => {
    if (!sekolah) return 'SMP';
    const s = sekolah.toUpperCase();
    if (s.includes('SD') || s.includes('MI')) return 'SD';
    if (s.includes('SMP') || s.includes('MTS')) return 'SMP';
    if (s.includes('SMA') || s.includes('SMK') || s.includes('MA ') || s.includes('MAK')) return 'SMA';
    if (s.includes('PAUD')) return 'PAUD';
    if (s.includes('TK')) return 'TK';
    return 'SMP';
  };

  const [rppData, setRppData] = useState<RppData>({
    namaSekolah: currentUser.namaSekolah || '', jenjang: guessJenjangFn(currentUser.namaSekolah || ''), mapel: currentUser.mapel?.join(', ') || '', tahunPelajaran: '2025/2026', kelasSemester: '', fase: '',
    jumlahPertemuan: 1, durasiPertemuan: ['1 JP x 40 Menit'], alokasiWaktu: '1 Pertemuan',
    lingkungan: '', namaGuru: currentUser.username || '', nipGuru: currentUser.nip || '', namaKepsek: currentUser.namaKepsek || '', nipKepsek: currentUser.nipKepsek || '', kota: 'Pasuruan',
    kktpTercapaiMin: 80,
    karakteristik: 'Sebagian siswa cenderung pasif, 2 siswa berkebutuhan khusus, ada yang belum lancar membaca/berhitung.', 
    minat: 'Sebagian siswa minat belajar rendah, lebih suka praktik di laboratorium dan kerja kelompok.', 
    motivasi: 'Sebagian siswa motivasi belajar rendah.', 
    prestasi: 'Rata-rata prestasi belajar menurun.',
    profilLulusan: [], saranaPrasarana: 'LCD Projector, Papan Tulis, Spidol',
    kemitraan: 'Guru Mapel Geografi, Pemerhati lingkungan hidup',
    lingkunganFisik: 'Laboratorium komputer dengan koneksi internet stabil', 
    lingkunganVirtual: 'Platform block-based programming (Scratch, Code.org)', 
    budayaBelajar: 'Mendorong eksperimen, tidak takut salah, saling membantu',
    digitalPerencanaan: 'Pemanfaatan AI, Canva.', 
    digitalPelaksanaan: 'Pemanfaatan AI, Canva.', 
    digitalAsesmen: 'Pemanfaatan Quizziz, Canva.',
    modelPembelajaran: 'Project Based Learning (PjBL)',
    sumberBelajar: [],
    cp_full_text: '', tujuanPembelajaran: [],
  });

  const [validationError, setValidationError] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [showValidationMarks, setShowValidationMarks] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const captureAndValidateData = () => {
    setShowValidationMarks(true);
    const requiredFields: (keyof RppData)[] = [
      'namaSekolah', 'jenjang', 'mapel', 'tahunPelajaran', 'kelasSemester', 'fase', 
      'jumlahPertemuan', 'durasiPertemuan', 'alokasiWaktu', 'namaGuru', 'nipGuru', 
      'namaKepsek', 'nipKepsek', 'kota', 'kktpTercapaiMin', 'saranaPrasarana', 
      'karakteristik', 'minat', 'motivasi', 'prestasi', 'lingkungan', 'kemitraan', 
      'lingkunganFisik', 'lingkunganVirtual', 'budayaBelajar', 'digitalPerencanaan', 
      'digitalPelaksanaan', 'digitalAsesmen', 'cp_full_text'
    ];
    let isValid = true;
    let errorMessage = '';
    
    // Check missing fields
    for (const field of requiredFields) {
      if (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0)) {
        isValid = false;
        errorMessage = 'Masih ada kolom yang belum diisi. Harap perhatikan notifikasi merah pada form dan lengkapi semua data.';
        break;
      }
    }

    // specific validation
    if (isValid && rppData.durasiPertemuan) {
      const match = rppData.alokasiWaktu.match(/(\d+)/);
      const numOfMeetings = match ? parseInt(match[1], 10) : 1;
      for (let i = 0; i < numOfMeetings; i++) {
        if (!rppData.durasiPertemuan[i]) {
            isValid = false;
            errorMessage = 'Durasi per pertemuan belum lengkap. Harap isi durasi untuk setiap pertemuan.';
            break;
        }
      }
    }
    if (isValid && (!rppData.jumlahPertemuan || rppData.jumlahPertemuan <= 0)) {
      isValid = false;
      errorMessage = 'Jumlah pertemuan harus diisi dan lebih dari 0.';
    }
    if (isValid && (isNaN(rppData.kktpTercapaiMin) || rppData.kktpTercapaiMin < 0 || rppData.kktpTercapaiMin > 100)) {
      isValid = false;
      errorMessage = 'Nilai Minimal "Tercapai" harus berupa angka antara 0-100.';
    }
    if (isValid && rppData.cp_full_text) {
      const materiCount = rppData.cp_full_text.split(';').map(m => m.trim()).filter(m => m.length > 0).length;
      if (materiCount !== rppData.jumlahPertemuan) {
        isValid = false;
        errorMessage = `Tidak Sinkron: Jumlah pertemuan (${rppData.jumlahPertemuan}) tidak sesuai dengan materi. Berdasarkan pemisah titik koma (;), Anda memasukkan ${materiCount} materi pokok. Harap ganti jumlah pertemuan menjadi ${materiCount} atau sesuaikan materinya.`;
      }
    }
    
    if (!isValid) {
      setValidationError(errorMessage);
      setShowValidationPopup(true);
    }
    return isValid;
  };

  const handleGenerateTP = async () => {
    if (!captureAndValidateData()) return;
    
    const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      setValidationError("Kunci API belum dikonfigurasi oleh Admin. Silakan hubungi Admin.");
      setShowValidationPopup(true);
      return;
    }

    setIsGenerating(true);
    
    const prompt = `Anda adalah ahli kurikulum pendidikan Indonesia. Analisis teks Materi Ajar berikut: "${rppData.cp_full_text}". 
PENTING: Teks tersebut mengandung ${rppData.jumlahPertemuan} materi pokok yang dipisahkan oleh tanda titik koma (;). Anda HARUS memecahnya tepat menjadi ${rppData.jumlahPertemuan} materi pokok sesuai pemisahan tersebut. 
Untuk setiap materi pokok, buatkan 3 Tujuan Pembelajaran (TP) sesuai level kognitif: Memahami, Mengaplikasi, dan Merefleksi. Berikan jawaban dalam format JSON. JSON harus memiliki satu kunci utama "materi" yang berisi array. Setiap objek dalam array mewakili satu materi pokok dan memiliki kunci "topic" (string) dan "tps" (array dari 3 objek TP). Setiap objek TP harus memiliki kunci "level" dan "text".`;
    const schema = { 
      type: "OBJECT", 
      properties: { 
        materi: {
          type: "ARRAY", 
          items: { 
            type: "OBJECT", 
            properties: { 
              topic: { type: "STRING" }, 
              tps: { 
                type: "ARRAY", 
                items: { 
                  type: "OBJECT", 
                  properties: { 
                    level: { type: "STRING" }, 
                    text: { type: "STRING" } 
                  }, 
                  required: ["level", "text"] 
                } 
              } 
            }, 
            required: ["topic", "tps"] 
          }
        }
      },
      required: ["materi"]
    };
    
    try {
      const aiResult = await makeApiCall(prompt, appConfig.apiKeys, schema);
      setRppData(prev => ({ ...prev, tujuanPembelajaran: aiResult.materi || [] }));
      
      // Log generate activity
      await logActivity(currentUser.id, 'generate', `Generate RPM: ${rppData.mapel} - Kelas ${rppData.kelasSemester}`);
      
      setShowOutput(true);
    } catch (error: any) {
      console.error("Error generating TPs:", error);
      Swal.fire({
        icon: 'error',
        title: 'Analisis Gagal',
        text: `Gagal menganalisis CP dengan AI. Detail: ${error.message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Password tidak cocok!');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg('Password minimal 4 karakter.');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await updatePassword(currentUser.id, newPassword);
      setPasswordMsg('Password berhasil diubah!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (err) {
      setPasswordMsg('Gagal mengubah password.');
      console.error(err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg('');
    try {
      const { updateUserProfile } = await import('../lib/store');
      await updateUserProfile(currentUser.id, editProfileData);
      
      setProfileMsg('Profil berhasil diperbarui!');
      setIsEditingProfile(false);
      setTimeout(() => setProfileMsg(''), 3000);
      
      currentUser.username = editProfileData.username;
      currentUser.nip = editProfileData.nip;
      currentUser.namaSekolah = editProfileData.namaSekolah;
      currentUser.namaKepsek = editProfileData.namaKepsek;
      currentUser.nipKepsek = editProfileData.nipKepsek;
      currentUser.noHp = editProfileData.noHp;
      currentUser.mapel = editProfileData.mapel;
      currentUser.profile_picture = editProfileData.profile_picture;
      currentUser.kop_instansi = editProfileData.kop_instansi;
      currentUser.kop_dinas = editProfileData.kop_dinas;
      currentUser.kop_nama_sekolah = editProfileData.kop_nama_sekolah;
      currentUser.kop_alamat = editProfileData.kop_alamat;
      currentUser.kop_kontak = editProfileData.kop_kontak;
      currentUser.kop_website = editProfileData.kop_website;
      currentUser.kop_sekolah_image = editProfileData.kop_sekolah_image;
      
      setRppData(prev => ({
        ...prev,
        namaSekolah: editProfileData.namaSekolah || prev.namaSekolah,
        namaGuru: editProfileData.username || prev.namaGuru,
        nipGuru: editProfileData.nip || prev.nipGuru,
        namaKepsek: editProfileData.namaKepsek || prev.namaKepsek,
        nipKepsek: editProfileData.nipKepsek || prev.nipKepsek,
        mapel: (editProfileData.mapel && editProfileData.mapel.length > 0) ? editProfileData.mapel.join(', ') : prev.mapel,
      }));
      
    } catch (err) {
      console.error(err);
      setProfileMsg('Gagal memperbarui profil: ' + (err as Error).message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'File Terlalu Besar',
        text: 'Ukuran foto maksimal 1MB. Silakan pilih foto yang lebih kecil.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setShowCropModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedImage = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImgBase64(imageSrc, croppedAreaPixels);
        setEditProfileData(prev => ({ ...prev, profile_picture: croppedImage }));
        setShowCropModal(false);
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memotong gambar.',
      });
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'profile':
        return (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-blue-600" /> Profil Pengguna
              </h2>
              <button 
                onClick={() => {
                  if (isEditingProfile) {
                    setIsEditingProfile(false);
                    // Reset to current user
                    setEditProfileData({
                      username: currentUser.username || '',
                      nip: currentUser.nip || '',
                      namaSekolah: currentUser.namaSekolah || '',
                      namaKepsek: currentUser.namaKepsek || '',
                      nipKepsek: currentUser.nipKepsek || '',
                      noHp: currentUser.noHp || '',
                      mapel: currentUser.mapel || [],
                      profile_picture: currentUser.profile_picture || '',
                      kop_instansi: currentUser.kop_instansi || '',
                      kop_dinas: currentUser.kop_dinas || '',
                      kop_nama_sekolah: currentUser.kop_nama_sekolah || '',
                      kop_alamat: currentUser.kop_alamat || '',
                      kop_kontak: currentUser.kop_kontak || '',
                      kop_website: currentUser.kop_website || '',
                      kop_sekolah_image: currentUser.kop_sekolah_image || ''
                    });
                  } else {
                    setEditProfileData({
                      username: currentUser.username || '',
                      nip: currentUser.nip || '',
                      namaSekolah: currentUser.namaSekolah || '',
                      namaKepsek: currentUser.namaKepsek || '',
                      nipKepsek: currentUser.nipKepsek || '',
                      noHp: currentUser.noHp || '',
                      mapel: currentUser.mapel || [],
                      profile_picture: currentUser.profile_picture || '',
                      kop_instansi: currentUser.kop_instansi || '',
                      kop_dinas: currentUser.kop_dinas || '',
                      kop_nama_sekolah: currentUser.kop_nama_sekolah || '',
                      kop_alamat: currentUser.kop_alamat || '',
                      kop_kontak: currentUser.kop_kontak || '',
                      kop_website: currentUser.kop_website || '',
                      kop_sekolah_image: currentUser.kop_sekolah_image || ''
                    });
                    setIsEditingProfile(true);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isEditingProfile ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                {isEditingProfile ? 'Batal Edit' : 'Edit Identitas'}
              </button>
            </div>

            {profileMsg && (
              <div className={`mb-6 text-sm p-3 rounded-lg border flex items-center gap-2 ${profileMsg.includes('berhasil') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <Check className="w-4 h-4" /> {profileMsg}
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="mb-8 space-y-4 bg-slate-50 p-5 rounded-xl border border-blue-100 shadow-sm relative">
                <div className="flex flex-col sm:flex-row gap-5 items-start mb-4 border-b border-gray-200 pb-5">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div 
                      className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {editProfileData.profile_picture ? (
                        <img src={editProfileData.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-semibold text-center px-1">Ubah Foto</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">(Maks. 1MB)</span>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap / Username</label>
                      <input type="text" value={editProfileData.username} onChange={e => setEditProfileData(prev => ({...prev, username: e.target.value}))} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIP (Opsional)</label>
                      <input type="text" value={editProfileData.nip} onChange={e => setEditProfileData(prev => ({...prev, nip: e.target.value}))} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
                    <input type="text" value={editProfileData.namaSekolah} onChange={e => setEditProfileData(prev => ({...prev, namaSekolah: e.target.value}))} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                    <input type="text" value={editProfileData.namaKepsek} onChange={e => setEditProfileData(prev => ({...prev, namaKepsek: e.target.value}))} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                    <input type="text" value={editProfileData.nipKepsek || ''} onChange={e => setEditProfileData(prev => ({...prev, nipKepsek: e.target.value}))} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2 relative" ref={mapelDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                    <div 
                      className={`w-full px-3 py-2 border ${isMapelDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/25' : 'border-gray-300'} rounded bg-white cursor-pointer flex justify-between items-center transition-all`}
                      onClick={() => setIsMapelDropdownOpen(!isMapelDropdownOpen)}
                    >
                      <span className={`truncate ${editProfileData.mapel.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
                        {editProfileData.mapel.length === 0 
                          ? 'Pilih Mata Pelajaran' 
                          : editProfileData.mapel.join(', ')}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isMapelDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isMapelDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {SUBJECTS.map((subject) => (
                          <div 
                            key={subject}
                            className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => toggleSubject(subject)}
                          >
                            <div className={`w-5 h-5 border rounded mr-3 flex items-center justify-center ${editProfileData.mapel.includes(subject) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {editProfileData.mapel.includes(subject) && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-gray-700">{subject}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? 'Menyimpan...' : 'Simpan Identitas'}
                </button>
              </form>
            ) : (
              <div className="mb-8 flex flex-col sm:flex-row gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100 items-start">
                <div className="w-24 h-24 shrink-0 rounded-full border-4 border-white shadow-md bg-gray-200 flex items-center justify-center overflow-hidden">
                  {currentUser.profile_picture ? (
                    <img src={currentUser.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 w-full text-sm">
                  <div>
                    <p className="text-gray-500 mb-0.5 font-medium">Username / Nama</p>
                    <p className="font-semibold text-gray-800 text-base">{currentUser.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5 font-medium">NIP</p>
                    <p className="font-semibold text-gray-800 text-base">{currentUser.nip || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5 font-medium">Sekolah</p>
                    <p className="font-semibold text-gray-800">{currentUser.namaSekolah || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5 font-medium">Kepala Sekolah</p>
                    <p className="font-semibold text-gray-800">{currentUser.namaKepsek || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5 font-medium">NIP Kepala Sekolah</p>
                    <p className="font-semibold text-gray-800">{currentUser.nipKepsek || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-gray-500 mb-0.5 font-medium">Mata Pelajaran</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentUser.mapel && currentUser.mapel.length > 0 ? currentUser.mapel.map((m, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">{m}</span>
                      )) : <span className="text-gray-800 font-semibold">-</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Section */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" /> Ubah Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                  <input 
                    type="password" 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                  <input 
                    type="password" 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {passwordMsg && (
                  <div className={`text-sm p-3 rounded-lg border content-center align-middle ${passwordMsg.includes('berhasil') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {passwordMsg}
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="w-full py-3 mt-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors disabled:opacity-70 shadow shadow-amber-200"
                >
                  {isChangingPassword ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </form>
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <History className="w-6 h-6 text-purple-600" /> Riwayat Aktivitas & Dokumen
            </h2>
            <div className="space-y-4">
              {userHistory.length === 0 ? (
                <p className="text-gray-500 italic text-center py-8">Belum ada riwayat aktivitas.</p>
              ) : (
                userHistory.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${item.activity_type === 'generate' ? 'bg-purple-200 text-purple-700' : 'bg-blue-200 text-blue-700'}`}>
                          {item.activity_type === 'generate' ? <History className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <span className={`font-semibold text-lg ${item.activity_type === 'generate' ? 'text-purple-800' : 'text-blue-800'}`}>
                          {item.activity_type === 'generate' ? 'Generate Dokumen RPM' : 'Login'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded shadow-sm">
                        {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </span>
                    </div>
                    {item.details && (
                      <div className="mt-3 pl-12">
                        <p className="text-gray-700 font-medium">{item.details}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <FileText className="w-6 h-6 text-green-600" /> Dokumen Tersimpan
            </h2>
            {userDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Belum ada dokumen yang disimpan.</p>
                <p className="text-sm text-gray-400 mt-2">Generate Rencana Pembelajaran Mendalam untuk menyimpan dokumen di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white border hover:bg-slate-50 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col items-start gap-3">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100/50 text-green-600 border border-green-200 rounded-lg">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-bold text-gray-800 line-clamp-1" title={doc.title}>{doc.title}</h3>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{format(new Date(doc.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full mt-3">
                      <button 
                        onClick={async () => {
                          const fullDoc = await getDocumentById(doc.id);
                          if (fullDoc && fullDoc.content) {
                            const wordDocument = `
                              <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                              <head>
                                <meta charset='utf-8'>
                                <title>Export HTML To Doc</title>
                                <style>
                                  @page WordSection1 { size: 21cm 29.7cm; margin: 2cm; }
                                  div.WordSection1 { page: WordSection1; }
                                  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; color: windowtext; }
                                  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                                  td, th { border: 1px solid windowtext; padding: 5px; vertical-align: top; }
                                  h2 { font-size: 14pt; font-weight: bold; text-align: center; }
                                  h3 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid windowtext; }
                                  h4, h5 { font-size: 11pt; font-weight: bold; }
                                  p { text-align: justify; margin: 0 0 10px 0; }
                                </style>
                              </head>
                              <body>
                                <div class="WordSection1">
                                  ${fullDoc.content}
                                </div>
                              </body>
                              </html>
                            `;
                            const blob = new Blob(['\ufeff', wordDocument], { type: 'application/msword;charset=utf-8' });
                            const downloadLink = document.createElement("a");
                            document.body.appendChild(downloadLink);
                            const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
                            const url = URL.createObjectURL(blob);
                            downloadLink.href = url;
                            downloadLink.download = `${filename}.doc`;
                            downloadLink.click();
                            setTimeout(() => {
                                document.body.removeChild(downloadLink);
                                window.URL.revokeObjectURL(url);
                            }, 100);
                          }
                        }} 
                        className="flex-1 flex justify-center items-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow shadow-emerald-200 text-sm font-semibold"
                      >
                        <Download className="w-5 h-5" /> Unduh
                      </button>
                      <button 
                        onClick={() => {
                          Swal.fire({
                            title: 'Apakah Anda yakin?',
                            text: "Dokumen yang dihapus tidak dapat dikembalikan!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            cancelButtonColor: '#3085d6',
                            confirmButtonText: 'Ya, Hapus!',
                            cancelButtonText: 'Batal'
                          }).then(async (result) => {
                            if (result.isConfirmed) {
                              try {
                                await deleteDocument(doc.id);
                                getUserDocuments(currentUser.id).then(docs => setUserDocuments(docs));
                                Swal.fire(
                                  'Terhapus!',
                                  'Dokumen Anda telah dihapus.',
                                  'success'
                                );
                              } catch (e) {
                                Swal.fire('Error', 'Gagal menghapus dokumen', 'error');
                              }
                            }
                          })
                        }}
                        className="flex-none flex justify-center items-center bg-red-50 text-red-600 p-2.5 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'kop':
        return (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <LayoutTemplate className="w-6 h-6 text-indigo-600" /> Pengaturan Kop Sekolah
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {profileMsg && (
                <div className={`p-4 rounded border text-sm ${profileMsg.includes('berhasil') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {profileMsg}
                </div>
              )}
              
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6 text-sm text-indigo-800 flex items-start gap-3">
                <LayoutTemplate className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Silakan upload gambar Kop Sekolah Anda di sini. Gambar ini akan disematkan secara otomatis ketika dokumen diunduh atau dicetak. Untuk hasil terbaik, gunakan gambar dengan proporsi memanjang (landscape) dan berlatar belakang putih atau transparan.</p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="block text-sm font-medium text-gray-700">Gambar Kop Sekolah</label>
                
                {editProfileData.kop_sekolah_image ? (
                  <div className="relative border border-gray-200 rounded-lg p-2 bg-gray-50 text-center">
                    <img src={editProfileData.kop_sekolah_image} alt="Kop Sekolah" className="max-w-full max-h-48 object-contain mx-auto" />
                    <button 
                      type="button" 
                      onClick={() => setEditProfileData(prev => ({...prev, kop_sekolah_image: ''}))}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded hover:bg-red-200"
                      title="Hapus gambar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer group relative">
                    <LayoutTemplate className="w-10 h-10 mb-2 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-sm font-medium">Klik untuk memilih gambar</p>
                    <p className="text-xs mt-1 opacity-70">PNG, JPG, max 2MB disarankan</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Ukuran file terlalu besar. Maksimal 2MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditProfileData(prev => ({...prev, kop_sekolah_image: reader.result as string}));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSavingProfile ? 'Menyimpan...' : 'Simpan Kop Sekolah'}
                </button>
              </div>
            </form>
          </div>
        );
      case 'feedback':
        return (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <MessageSquare className="w-6 h-6 text-cyan-600" /> Kritik & Saran
            </h2>
            <div className="space-y-4">
              <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 mb-4">
                 <p className="text-gray-700 font-medium">Bantu kami menjadi lebih baik! Pesan yang Anda kirim di bawah ini akan langsung masuk ke WhatsApp Admin <strong>{appConfig.appName}</strong>.</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Seberapa puas Anda dengan aplikasi ini?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        className={`w-10 h-10 ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                  {feedbackRating > 0 && (
                    <span className="ml-3 self-center font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {feedbackRating === 5 ? 'Sangat Puas! 😍' : 
                       feedbackRating === 4 ? 'Puas 🙂' : 
                       feedbackRating === 3 ? 'Cukup 😐' : 
                       feedbackRating === 2 ? 'Kecewa ☹️' : 'Sangat Kecewa 😡'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tuliskan Pesan Anda</label>
                <textarea 
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none h-40 transition-all font-medium text-gray-800" 
                  placeholder="Ketik kritik, masukan, pertayaan, atau saran fitur di sini..."
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                />
              </div>
              <button 
                onClick={handleSendFeedback}
                disabled={isSendingFeedback || !feedbackMsg.trim()}
                className="w-full py-3 mt-4 bg-cyan-600 text-white rounded-xl font-bold text-lg hover:bg-cyan-700 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-cyan-200"
              >
                {isSendingFeedback ? 'Mengirim Pesan...' : 'Kirim Ke WhatsApp Admin'}
              </button>
            </div>
          </div>
        );
      case 'help':
        return (
          <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
              <HelpCircle className="w-7 h-7 text-amber-500" /> Panduan & Pusat Bantuan
            </h2>
            <div className="space-y-8 text-gray-700">
              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">🚀 Apa itu {appConfig.appName}?</h3>
                <p className="leading-relaxed font-medium"><strong>Garda Spendus</strong> adalah asisten pintar berbasis Artificial Intelligence (AI) yang dirancang secara khusus untuk mempermudah tugas para guru dan pendidik. Aplikasi ini membantu Anda merancang, menyusun, dan mengembangkan Rencana Pembelajaran Mendalam (RPM) yang jauh lebih kreatif, adaptif, dan komprehensif tanpa harus pusing memulainya dari lembar kosong.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">Cara Menggenerate Rencana Pembelajaran Mendalam</h3>
                <ul className="grid gap-3">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">1</span>
                    <span className="font-medium">Buka menu <strong>Buat Rencana Pembelajaran Mendalam</strong> di panel sebelah kiri.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">2</span>
                    <span className="font-medium">Isi kelengkapan <strong>Form Rencana Pembelajaran</strong> seperti Fase pendidikan, Kelas, Topik yang dibawakan.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">!</span>
                    <span className="font-medium text-amber-900 bg-amber-50 p-2 rounded w-full"><strong>TIPS PENTING:</strong> Kunci hasil RPM yang bagus terletak pada kelengkapan isian <em>Profil Karakteristik & Minat Siswa</em>. Semakin spesifik kondisi siswa Anda (misal: "Siswa kurang minat baca, suka visual", dll), semakin cerdas AI membuati solusinya di Modul!</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">3</span>
                    <span className="font-medium">Klik tombol <strong>"Generate RPM AI"</strong> di bawah form.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">4</span>
                    <span className="font-medium">Tunggu proses AI dalam sekian detik, lalu Anda bisa me-review kembali serta Mengunduhnya menjadi file Ms.Word (DOCX).</span>
                  </li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-purple-500 pl-3">Penjelasan Menu Navigasi</h3>
                <div className="grid gap-4 mt-2">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start hover:border-purple-300 transition-colors">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg shrink-0"><History className="w-6 h-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">Riwayat Aktivitas</h4>
                      <p className="text-sm text-gray-600 font-medium">Fitur yang akan merekam aktivitas keseharian Anda seperti jejak kapan login terakhir, mengubah password, maupun history meng-generate RPM.</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start hover:border-green-300 transition-colors">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg shrink-0"><FileText className="w-6 h-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">Dokumen Anda</h4>
                      <p className="text-sm text-gray-600 font-medium">Meyimpan seluruh Rencana Pembelajaran Mendalam (RPM) yang pernah berhasil Anda ciptakan dengan AI secara permanen. Anda dapat kembali sewaktu-waktu dan Mengunduh ulangnya.</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start hover:border-cyan-300 transition-colors">
                    <div className="p-3 bg-cyan-100 text-cyan-600 rounded-lg shrink-0"><MessageSquare className="w-6 h-6" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">Kritik & Saran</h4>
                      <p className="text-sm text-gray-600 font-medium">Ada request fitur? Aplikasi bermasalah? Atau sekedar memberikan masukan? Gunakan form di halaman ini untuk terhubung langsung dengan Developer.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-red-500 pl-3">Kontak Kami</h3>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0"><MapPin className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800">Alamat SMPN 2 Sukorejo</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Jl. Desa Sebandung Kecamatan Sukorejo Kabupaten Pasuruan Jawa Timur<br />
                        <strong>Kode Pos: 67161</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-4 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="p-2.5 bg-white text-green-600 rounded-lg shadow-sm shrink-0"><Phone className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider opacity-60">Telepon</h4>
                        <p className="text-sm font-semibold text-gray-700">08113663900</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="p-2.5 bg-white text-emerald-600 rounded-lg shadow-sm shrink-0"><MessageSquare className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider opacity-60">Whatsapp (WA)</h4>
                        <p className="text-sm font-semibold text-gray-700">082139154024</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="p-2.5 bg-white text-blue-600 rounded-lg shadow-sm shrink-0"><Mail className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider opacity-60">E-mail</h4>
                      <p className="text-sm font-semibold text-gray-700">smpnduasukorejo@yahoo.co.id</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Globe className="w-5 h-5 text-blue-500" /> Lokasi Sekolah
                    </h4>
                    <div className="relative group overflow-hidden rounded-2xl border-4 border-gray-50 shadow-inner">
                      <img 
                        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" 
                        alt="Peta Lokasi" 
                        className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6 transition-opacity group-hover:bg-black/40">
                        <div className="w-full flex justify-between items-end">
                          <div className="text-white">
                            <p className="font-bold text-lg mb-1">SMPN 2 Sukorejo</p>
                            <p className="text-xs text-white/80">Kabupaten Pasuruan, Jawa Timur</p>
                          </div>
                          <a 
                            href="https://share.google/hk7fsUCPdzU5BOk7c" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2 text-sm"
                          >
                            <MapPin className="w-4 h-4" /> Buka Maps
                          </a>
                        </div>
                      </div>
                    </div>
                    <p className="text-center mt-3 text-xs font-medium text-gray-400 italic">Klik tombol di atas untuk mendapatkan rute navigasi terbaik</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      case 'generator':
      default:
        return (
          <>
            {!showOutput ? (
              <div className="w-full max-w-6xl mx-auto">
                <FormSection 
                  rppData={rppData} 
                  setRppData={setRppData} 
                  validationError={validationError}
                  showValidationMarks={showValidationMarks}
                  onGenerateTP={handleGenerateTP}
                  appConfig={appConfig}
                  userMapel={currentUser.mapel}
                  onShowIdeaModal={() => {
                    if (captureAndValidateData()) {
                      const validKeys = appConfig.apiKeys.filter(k => k && k.trim() !== '');
                      if (validKeys.length === 0) {
                        setValidationError("Kunci API belum dikonfigurasi oleh Admin.");
                        setShowValidationPopup(true);
                      } else {
                        setShowIdeaModal(true);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-full max-w-6xl mx-auto">
                <OutputSection 
                  rppData={rppData} 
                  setRppData={setRppData}
                  apiKeys={appConfig.apiKeys}
                  onBack={() => setShowOutput(false)}
                  userId={currentUser.id}
                  currentUser={currentUser}
                />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans flex overflow-hidden">
      {/* Sidebar - Dark theme for mismatching */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside ref={sidebarRef} className={`bg-slate-900 border-r border-slate-800 shadow-xl z-40 transition-all duration-300 flex flex-col h-screen shrink-0 absolute lg:relative ${isSidebarOpen ? 'w-64 -translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800 h-16 w-full">
          {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && (
            <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer" onClick={() => setCurrentView('generator')}>
              <img src={appConfig.appLogo} alt="Logo" className="h-8 w-8 object-contain shrink-0 bg-white rounded p-0.5" />
              <span className="font-bold text-white truncate text-sm">{appConfig.appName}</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors hidden lg:block ${!isSidebarOpen && 'mx-auto shrink-0'}`}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
          <div className="flex flex-col mb-4 gap-1">
            <button onClick={() => setCurrentView('generator')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'generator' ? 'bg-blue-600/20 text-blue-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Buat RPM (Rencana Pembelajaran Mendalam)">
              <div className="p-1 rounded bg-blue-500/10"><Menu className="w-4 h-4 shrink-0 text-blue-400" /></div>
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Buat RPM</span>}
            </button>
            <button onClick={() => setCurrentView('history')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'history' ? 'bg-purple-600/20 text-purple-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Riwayat Aktivitas">
              <div className="p-1 rounded bg-purple-500/10"><History className="w-4 h-4 shrink-0 text-purple-400" /></div>
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Riwayat Aktivitas</span>}
            </button>
            <button onClick={() => setCurrentView('documents')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'documents' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Dokumen Tersimpan">
              <div className="p-1 rounded bg-emerald-500/10"><FileText className="w-4 h-4 shrink-0 text-emerald-400" /></div>
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Dokumen Anda</span>}
            </button>
            <button onClick={() => setCurrentView('kop')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'kop' ? 'bg-indigo-600/20 text-indigo-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Upload Kop Sekolah">
              <div className="p-1 rounded bg-indigo-500/10"><LayoutTemplate className="w-4 h-4 shrink-0 text-indigo-400" /></div>
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Upload Kop Sekolah</span>}
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-slate-800">
            <button onClick={() => setCurrentView('feedback')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'feedback' ? 'bg-cyan-600/20 text-cyan-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Kritik & Saran">
              <MessageSquare className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Kritik & Saran</span>}
            </button>
            <button onClick={() => setCurrentView('help')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${!isSidebarOpen && 'lg:justify-center'} ${currentView === 'help' ? 'bg-amber-600/20 text-amber-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`} title="Bantuan">
              <HelpCircle className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Bantuan</span>}
            </button>
            <button onClick={onLogout} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors ${!isSidebarOpen && 'lg:justify-center'}`} title="Keluar">
              <LogOut className="w-5 h-5 shrink-0" />
              {(isSidebarOpen || (window.innerWidth >= 1024 && isSidebarOpen)) && <span>Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full lg:w-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 w-full relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors lg:hidden shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:flex items-center gap-2 truncate">
              {currentView === 'generator' && 'Generator Rencana Pembelajaran Mendalam (GARDA)'}
              {currentView === 'profile' && 'Profil Pengguna'}
              {currentView === 'history' && 'Riwayat Aktivitas'}
              {currentView === 'documents' && 'Dokumen Tersimpan'}
              {currentView === 'kop' && 'Pengaturan Kop Sekolah'}
              {currentView === 'feedback' && 'Kritik & Saran'}
              {currentView === 'help' && 'Pusat Bantuan'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="hidden md:flex flex-col items-end border-r border-gray-200 pr-4 sm:pr-6">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                {format(currentTime, 'HH:mm:ss')}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {format(currentTime, 'dd MMM yyyy', { locale: id })}
              </span>
            </div>

            <div className="toggle-switch scale-75 origin-right">
              <label className="switch-label">
                <input type="checkbox" className="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
                <span className="slider"></span>
              </label>
            </div>
            
            <button 
              onClick={() => setCurrentView('profile')} 
              className="flex items-center gap-3 text-left hover:bg-slate-50 p-1.5 rounded-xl transition-all border border-transparent hover:border-slate-200"
              title="Ke Profil Pengguna"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-slate-500">{getGreeting()},</p>
                <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{currentUser.username}</p>
              </div>
              <div className="h-10 w-10 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 overflow-hidden border-2 border-white">
                {currentUser.profile_picture ? (
                  <img src={currentUser.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
              </div>
            </button>
          </div>
        </header>

        {/* Marquee Header */}
        <div className="bg-slate-800 text-white py-1.5 relative overflow-hidden shrink-0 flex items-center">
          <div className="whitespace-nowrap animate-marquee font-bold tracking-widest text-xs sm:text-sm">
            {appConfig.appName}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 bg-slate-50 rounded-tl-xl border-t border-l border-slate-200/50 shadow-inner">
          {renderMainContent()}
        </main>
      </div>

      {/* Generating Loading Modal */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8 items-center text-center">
            
            <div className="loader-wrapper scale-[0.6] origin-center -mt-6 -mb-4">
              <span className="loader-letter">G</span>
              <span className="loader-letter">e</span>
              <span className="loader-letter">n</span>
              <span className="loader-letter">e</span>
              <span className="loader-letter">r</span>
              <span className="loader-letter">a</span>
              <span className="loader-letter">t</span>
              <span className="loader-letter">i</span>
              <span className="loader-letter">n</span>
              <span className="loader-letter">g</span>
              <div className="loader-element"></div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">Memproses Data...</h3>
            <p className="text-gray-600 font-medium">AI sedang membedah materi dan merumuskan Tujuan Pembelajaran yang sesuai dengan kriteria tingkat kognitif. Mohon tunggu sebentar.</p>
          </div>
        </div>
      )}

      {/* Validation Popup Modal */}
      {showValidationPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-3xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Peringatan</h3>
              <p className="text-gray-600 mb-6">{validationError}</p>
              <button 
                onClick={() => setShowValidationPopup(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Geser & Sesuaikan Foto</h3>
              <button onClick={() => setShowCropModal(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[400px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 bg-slate-50 border-t flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700 shrink-0">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCroppedImage}
                  className="px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIdeaModal && <IdeaModal onClose={() => setShowIdeaModal(false)} rppData={rppData} apiKeys={appConfig.apiKeys} />}
    </div>
  );
}
