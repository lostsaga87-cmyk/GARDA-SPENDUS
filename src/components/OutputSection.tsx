import React, { useState } from 'react';
import { Printer, FileText, Edit, Save } from 'lucide-react';
import { RppData } from '../types';
import { makeApiCall } from '../lib/api';

interface OutputSectionProps {
  rppData: RppData;
  setRppData: React.Dispatch<React.SetStateAction<RppData>>;
  apiKey: string;
}

export default function OutputSection({ rppData, setRppData, apiKey }: OutputSectionProps) {
  const [step, setStep] = useState<number>(3); // 3: TP, 4: ATP, 5: KKTP, 6: RPP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rppHtml, setRppHtml] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerateATP = () => {
    setStep(4);
  };

  const handleGenerateKKTP = () => {
    setStep(5);
  };

  const handleGenerateRPP = async () => {
    setStep(6);
    setLoading(true);
    setError('');
    try {
      let finalHtml = `
        <div id="rpp-content-to-export" class="rpp-final-container p-6 bg-white border border-gray-200 rounded-md font-serif text-[11pt] leading-relaxed">`;

      const meetingsToGenerate = Math.min(rppData.jumlahPertemuan, rppData.tujuanPembelajaran.length);

      if (rppData.jumlahPertemuan > rppData.tujuanPembelajaran.length) {
        finalHtml += `<div class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50" role="alert"><span class="font-medium">Peringatan!</span> Jumlah pertemuan (${rppData.jumlahPertemuan}) lebih banyak dari jumlah materi pokok yang ditemukan (${rppData.tujuanPembelajaran.length}). Hanya ${meetingsToGenerate} RPP yang akan dibuat.</div>`;
      }

      for (let i = 0; i < meetingsToGenerate; i++) {
        const currentTopicData = rppData.tujuanPembelajaran[i];

        const [
          identifikasiMateriHtml,
          desainPembelajaranHtml,
          langkahPembelajaranHtml,
          asesmenAwalHtml,
          asesmenProsesHtml,
          asesmenAkhirHtml
        ] = await Promise.all([
          createIdentifikasiMateri(rppData, apiKey),
          createDesainPembelajaran(rppData, currentTopicData, apiKey),
          createLangkahPembelajaran(rppData, currentTopicData, apiKey),
          createAsesmenAwal(rppData, currentTopicData, apiKey),
          createAsesmenProses(rppData, currentTopicData, apiKey),
          createAsesmenAkhir(rppData, currentTopicData, apiKey)
        ]);

        finalHtml += `
          <div class="rpp-section mb-12 page-break-after-always">
            <h2 class="text-center font-bold text-[14pt] mb-6">RENCANA PERANGKAT PEMBELAJARAN</h2>
            ${createHeaderTable(rppData)}
            
            <h3 class="font-bold text-[12pt] mt-6 mb-2 border-b pb-1">Identifikasi</h3>
            ${createIdentifikasiPesertaDidik(rppData)}
            ${identifikasiMateriHtml}
            ${createDimensiProfilLulusan(rppData)}
            ${createCapaianPembelajaran(rppData)}

            <h3 class="font-bold text-[12pt] mt-6 mb-2 border-b pb-1">Desain Pembelajaran</h3>
            ${desainPembelajaranHtml}
            ${createSumberBelajarHtml(rppData, currentTopicData)}

            <h3 class="font-bold text-[12pt] mt-6 mb-2 border-b pb-1">Langkah-Langkah Pembelajaran</h3>
            ${langkahPembelajaranHtml}

            <h3 class="font-bold text-[12pt] mt-6 mb-2 border-b pb-1">Asesmen Pembelajaran</h3>
            ${asesmenAwalHtml}
            ${asesmenProsesHtml}
            ${asesmenAkhirHtml}

            ${createTandaTangan(rppData)}
          </div>`;
      }

      finalHtml += `</div>`;
      setRppHtml(finalHtml);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (contentId: string, title: string) => {
    const content = document.getElementById(contentId)?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 portrait; margin: 2cm 2cm 3cm 3cm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem; font-size: 10pt; }
            th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; vertical-align: top; }
            th { background-color: #f9fafb; font-weight: bold; }
            h2 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 1.5rem; }
            h3 { font-size: 12pt; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
            h4, h5 { font-size: 11pt; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
            ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; }
            p { margin-bottom: 0.5rem; text-align: justify; }
            .page-break-after-always { page-break-after: always; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6 mt-8">
      {/* TP Section */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">3. Tujuan Pembelajaran (TP)</h2>
          <button onClick={() => handlePrint('tp-output', 'Tujuan Pembelajaran')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
            <Printer className="w-4 h-4 mr-2" /> Cetak
          </button>
        </div>
        <div id="tp-output">
          <p className="mb-4 text-gray-700">Berdasarkan analisis AI, berhasil diidentifikasi <strong>{rppData.tujuanPembelajaran.length} materi pokok</strong> dengan rincian Tujuan Pembelajaran sebagai berikut:</p>
          {rppData.tujuanPembelajaran.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h4 className="font-bold text-lg mb-2 bg-gray-50 p-3 rounded-lg border border-gray-200">Materi Pokok: {group.topic}</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 p-3 text-left w-1/3">Level Kognitif</th>
                      <th className="border border-gray-200 p-3 text-left">Tujuan Pembelajaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.tps.map((tp: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-gray-200 p-3 font-semibold">{tp.level}</td>
                        <td className="border border-gray-200 p-3">{tp.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        {step === 3 && (
          <button onClick={handleGenerateATP} className="mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            Buat Alur Tujuan Pembelajaran
          </button>
        )}
      </section>

      {/* ATP Section */}
      {step >= 4 && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">4. Alur Tujuan Pembelajaran (ATP)</h2>
            <button onClick={() => handlePrint('atp-output', 'Alur Tujuan Pembelajaran')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </button>
          </div>
          <div id="atp-output">
            <p className="mb-4 text-gray-700">Tujuan pembelajaran diurutkan berdasarkan materi pokok untuk membentuk Alur Tujuan Pembelajaran (ATP).</p>
            {rppData.tujuanPembelajaran.map((group, idx) => (
              <div key={idx} className="mb-6">
                <h4 className="font-bold text-lg mb-2">ATP untuk: {group.topic}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 p-3 text-center w-16">Urutan</th>
                        <th className="border border-gray-200 p-3 text-left">Tujuan Pembelajaran (diurutkan)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.tps.map((tp: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-gray-200 p-3 text-center">{i + 1}</td>
                          <td className="border border-gray-200 p-3">{tp.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {step === 4 && (
            <button onClick={handleGenerateKKTP} className="mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              Buat KKTP
            </button>
          )}
        </section>
      )}

      {/* KKTP Section */}
      {step >= 5 && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">5. Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h2>
            <button onClick={() => handlePrint('kktp-output', 'KKTP')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </button>
          </div>
          <div id="kktp-output">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 p-3 text-left w-1/3">Tujuan Pembelajaran</th>
                    <th className="border border-gray-200 p-3 text-left w-1/3">Kriteria Ketercapaian</th>
                    <th className="border border-gray-200 p-3 text-left">Interval Nilai & Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {rppData.tujuanPembelajaran.flatMap(group => group.tps).map((tp: any, idx: number) => {
                    const criteria: any = {
                      'Memahami': "Kemampuan menjelaskan konsep dasar, karakteristik, dan fungsi utama dengan benar.",
                      'Mengaplikasi': "Kemampuan mengklasifikasikan contoh nyata atau menggambarkan alur proses secara logis dan tepat.",
                      'Merefleksi': "Kemampuan memberikan evaluasi kritis, membandingkan, dan menyajikan rekomendasi yang beralasan."
                    };
                    const min = rppData.kktpTercapaiMin;
                    const hampir = Math.max(0, min - 10);
                    const belum = Math.max(0, hampir - 1);
                    return (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="border border-gray-200 p-3" rowSpan={3}>{tp.text}</td>
                          <td className="border border-gray-200 p-3" rowSpan={3}>{criteria[tp.level] || 'Kriteria belum ditentukan.'}</td>
                          <td className="border border-gray-200 p-3"><strong>{min} - 100:</strong> Tercapai</td>
                        </tr>
                        <tr><td className="border border-gray-200 p-3"><strong>{hampir} - {min - 1}:</strong> Hampir Tercapai</td></tr>
                        <tr><td className="border border-gray-200 p-3"><strong>0 - {belum}:</strong> Belum Tercapai</td></tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-lg text-blue-800">Kesimpulan Kriteria Ketercapaian</h4>
              <p className="mt-2 text-gray-700">Peserta didik dianggap telah mencapai KKTP apabila memperoleh <strong>nilai minimal {rppData.kktpTercapaiMin}</strong> pada asesmen yang diberikan. Bagi yang belum mencapai, akan diberikan program remedial.</p>
            </div>
          </div>
          {step === 5 && (
            <button onClick={handleGenerateRPP} className="mt-6 flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <FileText className="w-5 h-5 mr-2" /> Buat Rencana Pembelajaran Lengkap
            </button>
          )}
        </section>
      )}

      {/* RPP Output */}
      {step >= 6 && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Sedang membuat Rencana Perangkat Pembelajaran yang komprehensif... Proses ini akan memakan waktu beberapa saat.</p>
            </div>
          ) : error ? (
            <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
              <h4 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h4>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Hasil Dokumen Rencana Pembelajaran</h2>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isEditing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    {isEditing ? <><Save className="w-4 h-4 mr-2" /> Simpan Edit</> : <><Edit className="w-4 h-4 mr-2" /> Edit Dokumen</>}
                  </button>
                  <button onClick={() => handlePrint('rpp-content-to-export', 'RPP')} disabled={isEditing} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Printer className="w-4 h-4 mr-2" /> Cetak
                  </button>
                </div>
              </div>
              <div 
                id="rpp-content-to-export"
                contentEditable={isEditing}
                className={`p-8 bg-white rounded-lg font-serif text-[11pt] leading-relaxed ${isEditing ? 'border-2 border-dashed border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] focus:outline-none' : 'border border-gray-200'}`}
                dangerouslySetInnerHTML={{ __html: rppHtml }}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}

// Helper functions for RPP generation
function createHeaderTable(data: RppData) {
  return `
    <table class="w-full mb-6 border-collapse">
      <tbody>
        <tr><td class="font-bold w-1/4 p-2 border border-gray-300 bg-gray-50">NAMA SEKOLAH</td><td class="p-2 border border-gray-300">: ${data.namaSekolah.toUpperCase()}</td></tr>
        <tr><td class="font-bold p-2 border border-gray-300 bg-gray-50">KELAS / SEMESTER</td><td class="p-2 border border-gray-300">: ${data.kelasSemester.toUpperCase()}</td></tr>
        <tr><td class="font-bold p-2 border border-gray-300 bg-gray-50">MATA PELAJARAN</td><td class="p-2 border border-gray-300">: ${data.mapel.toUpperCase()}</td></tr>
        <tr><td class="font-bold p-2 border border-gray-300 bg-gray-50">ALOKASI WAKTU</td><td class="p-2 border border-gray-300">: ${data.durasiPertemuan}</td></tr>
      </tbody>
    </table>`;
}

function createIdentifikasiPesertaDidik(data: RppData) {
  return `
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Peserta Didik:</h4>
    <p class="mb-2">Identifikasi kesiapan peserta didik sebelum belajar, seperti pengetahuan awal, minat, latar belakang, dan kebutuhan belajar, serta aspek lainnya:</p>
    <ul class="list-disc pl-6 mb-4 space-y-1">
      <li><strong>Pengetahuan awal:</strong> ${data.karakteristik}</li>
      <li><strong>Minat:</strong> ${data.minat}</li>
      <li><strong>Motivasi:</strong> ${data.motivasi}</li>
      <li><strong>Prestasi:</strong> ${data.prestasi}</li>
      <li><strong>Latar belakang & Lingkungan:</strong> ${data.lingkungan}</li>
    </ul>`;
}

async function createIdentifikasiMateri(data: RppData, apiKey: string) {
  const prompt = `Anda adalah seorang ahli kurikulum. Berdasarkan Capaian Pembelajaran berikut: '${data.cp_full_text}' untuk mata pelajaran '${data.mapel}' kelas '${data.kelasSemester}', buatlah analisis materi pelajaran yang mendalam dalam format JSON. JSON harus memiliki kunci berikut: 'jenis_pengetahuan' (dengan sub-kunci 'konseptual', 'procedural', 'metakognitif'), 'relevansi_kehidupan_nyata', 'tingkat_kesulitan' (jelaskan alasannya), 'struktur_materi', dan 'integrasi_nilai_karakter' (sebutkan 5 nilai karakter dan jelaskan integrasinya).`;
  const schema = {
    type: "OBJECT",
    properties: {
      jenis_pengetahuan: { type: "OBJECT", properties: { konseptual: { type: "STRING" }, prosedural: { type: "STRING" }, metakognitif: { type: "STRING" } }, required: ["konseptual", "prosedural", "metakognitif"] },
      relevansi_kehidupan_nyata: { type: "STRING" },
      tingkat_kesulitan: { type: "STRING" },
      struktur_materi: { type: "STRING" },
      integrasi_nilai_karakter: { type: "STRING" }
    },
    required: ["jenis_pengetahuan", "relevansi_kehidupan_nyata", "tingkat_kesulitan", "struktur_materi", "integrasi_nilai_karakter"]
  };
  const result = await makeApiCall(prompt, apiKey, schema);
  return `
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Materi Pelajaran:</h4>
    <ol class="list-decimal pl-6 mb-4 space-y-2">
      <li><strong>Jenis Pengetahuan yang akan Dicapai:</strong>
        <ul class="list-disc pl-6 mt-1 space-y-1">
          <li><strong>Konseptual:</strong> ${result?.jenis_pengetahuan?.konseptual || ''}</li>
          <li><strong>Prosedural:</strong> ${result?.jenis_pengetahuan?.prosedural || ''}</li>
          <li><strong>Metakognitif:</strong> ${result?.jenis_pengetahuan?.metakognitif || ''}</li>
        </ul>
      </li>
      <li><strong>Relevansi dengan Kehidupan Nyata Peserta Didik:</strong><p class="mt-1">${result?.relevansi_kehidupan_nyata || ''}</p></li>
      <li><strong>Tingkat Kesulitan:</strong><p class="mt-1">${result?.tingkat_kesulitan || ''}</p></li>
      <li><strong>Struktur Materi:</strong><p class="mt-1">${result?.struktur_materi || ''}</p></li>
      <li><strong>Integrasi Nilai dan Karakter:</strong><p class="mt-1">${result?.integrasi_nilai_karakter || ''}</p></li>
    </ol>`;
}

function createDimensiProfilLulusan(data: RppData) {
  const allProfils = ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Kewargaan", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Kemandirian", "Kesehatan", "Komunikasi"];
  let html = `<h4 class="font-bold text-[11pt] mt-4 mb-2">Dimensi Profil Lulusan:</h4><p class="mb-2">Pilihlah dimensi profil lulusan yang akan dicapai dalam pembelajaran</p><div class="grid grid-cols-2 gap-2 mb-4">`;
  allProfils.forEach((profil, index) => {
    const isChecked = data.profilLulusan.includes(profil);
    html += `<div>${isChecked ? '☑' : '☐'} DPL${index+1} ${profil}</div>`;
  });
  html += `</div>`;
  return html;
}

function createCapaianPembelajaran(data: RppData) {
  return `<h4 class="font-bold text-[11pt] mt-4 mb-2">Capaian Pembelajaran:</h4><p class="mb-4">${data.cp_full_text}</p>`;
}

async function createDesainPembelajaran(data: RppData, topicData: any, apiKey: string) {
  const prompt = `Anda adalah seorang desainer pembelajaran. Untuk materi pokok: "${topicData.topic}", buatlah detail desain pembelajaran dalam format JSON. JSON harus memiliki kunci: 'lintas_disiplin' (array string nama mapel), 'topik_pembelajaran' (array string topik spesifik turunan dari materi pokok), dan 'praktik_pedagogis' (jelaskan 3 praktik yang sesuai). Gunakan juga data lingkungan belajar ini: Fisik='${data.lingkunganFisik}', Virtual='${data.lingkunganVirtual}', Budaya='${data.budayaBelajar}' untuk melengkapi penjelasan Anda.`;
  const schema = {
    type: "OBJECT",
    properties: {
      lintas_disiplin: { type: "ARRAY", items: { type: "STRING" } },
      topik_pembelajaran: { type: "ARRAY", items: { type: "STRING" } },
      praktik_pedagogis: { type: "STRING" }
    },
    required: ["lintas_disiplin", "topik_pembelajaran", "praktik_pedagogis"]
  };
  const result = await makeApiCall(prompt, apiKey, schema);
  const tpsForThisMeeting = `<h5 class="font-bold mt-3 mb-1">Tujuan Pembelajaran Pertemuan Ini:</h5><ul class="list-disc pl-6 mb-3">${topicData.tps.map((tp:any) => `<li>${tp.text}</li>`).join('')}</ul>`;

  return `
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Lintas Disiplin Ilmu:</h4><ul class="list-disc pl-6 mb-3">${(result?.lintas_disiplin || []).map((item:string) => `<li>${item}</li>`).join('')}</ul>
    ${tpsForThisMeeting}
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Topik Pembelajaran:</h4><ul class="list-disc pl-6 mb-3">${(result?.topik_pembelajaran || []).map((item:string) => `<li>${item}</li>`).join('')}</ul>
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Praktik Pedagogis:</h4><p class="mb-3">${result?.praktik_pedagogis || ''}</p>
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Kemitraan Pembelajaran:</h4><p class="mb-3">${data.kemitraan}</p>
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Lingkungan Pembelajaran:</h4>
    <ul class="list-disc pl-6 mb-3">
      <li><strong>Ruang Fisik:</strong> ${data.lingkunganFisik}</li>
      <li><strong>Ruang Virtual:</strong> ${data.lingkunganVirtual}</li>
      <li><strong>Budaya Belajar:</strong> ${data.budayaBelajar}</li>
    </ul>
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Pemanfaatan Digital:</h4><p class="mb-4">${data.digitalPerencanaan}, ${data.digitalPelaksanaan}, ${data.digitalAsesmen}</p>`;
}

function createSumberBelajarHtml(data: RppData, topicData: any) {
  if (!data.sumberBelajar || data.sumberBelajar.length === 0) return '';
  let listItems = data.sumberBelajar.map(sumber => {
    let link = '#';
    let linkText = `Cari referensi di ${sumber}`;
    const encodedTopic = encodeURIComponent(topicData.topic);
    if (sumber === 'Gambar') { link = `https://www.google.com/search?tbm=isch&q=${encodedTopic}`; linkText = `Cari gambar terkait "${topicData.topic}"`; }
    else if (sumber === 'Video dari YouTube') { link = `https://www.youtube.com/results?search_query=${encodedTopic}`; linkText = `Cari video terkait "${topicData.topic}" di YouTube`; }
    else if (sumber === 'Quizizz') { link = `https://quizizz.com/search?query=${encodedTopic}`; linkText = `Cari kuis terkait "${topicData.topic}" di Quizizz`; }
    else if (sumber === 'Wordwall') { link = `https://wordwall.net/search?query=${encodedTopic}`; linkText = `Cari aktivitas terkait "${topicData.topic}" di Wordwall`; }
    return `<li>${sumber}: <a href="${link}" target="_blank" style="color: blue; text-decoration: underline;" rel="noopener noreferrer">${linkText}</a></li>`;
  }).join('');
  return `<h4 class="font-bold text-[11pt] mt-4 mb-2">Sumber Belajar:</h4><ul class="list-disc pl-6 mb-4">${listItems}</ul>`;
}

async function createLangkahPembelajaran(data: RppData, topicData: any, apiKey: string) {
  const tpsJoined = topicData.tps.map((t:any) => t.text).join(', ');
  const prompt = `Anda adalah seorang guru inovatif. Rancang langkah-langkah pembelajaran dalam format tabel untuk sebuah pertemuan. Model Pembelajaran yang harus digunakan adalah: ${data.modelPembelajaran}. Bagian 'inti' dari pembelajaran HARUS secara eksplisit mengikuti sintaks/langkah-langkah dari model ${data.modelPembelajaran}. Topik pertemuan ini adalah: '${topicData.topic}', dengan Tujuan Pembelajaran: '${tpsJoined}'. Format jawaban dalam JSON dengan kunci: 'awal', 'inti', dan 'penutup'. Masing-masing kunci berisi array objek. Setiap objek mewakili satu baris tabel dan harus memiliki kunci 'tahap' (untuk tahap inti, gunakan nama sintaks modelnya), 'prinsip' (pilih dari 'Berkesadaran', 'Bermakna', 'Menggembirakan'), dan 'deskripsi' (jelaskan aktivitas guru dan siswa secara rinci).`;
  const schema = {
    type: "OBJECT",
    properties: {
      awal: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } },
      inti: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } },
      penutup: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } }
    },
    required: ["awal", "inti", "penutup"]
  };
  const result = await makeApiCall(prompt, apiKey, schema);

  const renderTableSection = (title: string, steps: any[]) => {
    if (!steps || steps.length === 0) return '';
    let tableRows = steps.map(step => `<tr><td class="border border-gray-300 p-2 w-1/3"><strong>${step.tahap}</strong><br/><span class="italic text-sm">(${step.prinsip})</span></td><td class="border border-gray-300 p-2">${step.deskripsi}</td></tr>`).join('');
    return `<h4 class="font-bold text-[11pt] mt-4 mb-2">${title}</h4><table class="w-full border-collapse mb-4"><tbody>${tableRows}</tbody></table>`;
  };

  return renderTableSection('AWAL', result.awal) + 
         `<p class="mb-2">Pada tahap ini, siswa aktif terlibat dalam pengalaman belajar memahami, mengaplikasi, dan merefleksi. Guru menerapkan prinsip pembelajaran berkesadaran, bermakna, menyenangkan untuk mencapai tujuan pembelajaran dengan model ${data.modelPembelajaran}.</p>` +
         renderTableSection('INTI (Pengalaman Belajar)', result.inti) + 
         renderTableSection('PENUTUP', result.penutup);
}

async function createAsesmenAwal(data: RppData, topicData: any, apiKey: string) {
  const prompt = `Anda adalah seorang ahli evaluasi pendidikan. Buat draf asesmen diagnostik (asesmen pada awal pembelajaran) untuk topik "${topicData.topic}" bagi siswa jenjang ${data.jenjang}. Format jawaban dalam JSON. JSON harus memiliki kunci: 'tujuan' (string), 'metode' (string), 'bagian_a' (objek dengan kunci 'deskripsi' dan 'pertanyaan', dimana 'pertanyaan' adalah array string), 'bagian_b' (objek dengan kunci 'deskripsi' dan 'pertanyaan', dimana 'pertanyaan' adalah array string), dan 'cara_penggunaan' (string, jelaskan analisis, diferensiasi, dan koneksi materi). Buat 3-4 pertanyaan untuk setiap bagian yang relevan dengan topik.`;
  const schema = {
    type: "OBJECT",
    properties: {
      tujuan: { type: "STRING" },
      metode: { type: "STRING" },
      bagian_a: { type: "OBJECT", properties: { deskripsi: { type: "STRING" }, pertanyaan: { type: "ARRAY", items: { type: "STRING" } } }, required: ["deskripsi", "pertanyaan"] },
      bagian_b: { type: "OBJECT", properties: { deskripsi: { type: "STRING" }, pertanyaan: { type: "ARRAY", items: { type: "STRING" } } }, required: ["deskripsi", "pertanyaan"] },
      cara_penggunaan: { type: "STRING" }
    },
    required: ["tujuan", "metode", "bagian_a", "bagian_b", "cara_penggunaan"]
  };
  const result = await makeApiCall(prompt, apiKey, schema);
  return `
    <h4 class="font-bold text-[11pt] mt-4 mb-2">Asesmen pada Awal Pembelajaran:</h4>
    <p class="mb-1"><strong>Tujuan:</strong> ${result.tujuan}</p>
    <p class="mb-3"><strong>Metode:</strong> ${result.metode}</p>
    <h5 class="font-bold mt-2 mb-1">${result.bagian_a.deskripsi}</h5>
    <ol class="list-decimal pl-6 mb-3">${result.bagian_a.pertanyaan.map((q:string) => `<li>${q}</li>`).join('')}</ol>
    <h5 class="font-bold mt-2 mb-1">${result.bagian_b.deskripsi}</h5>
    <ol class="list-decimal pl-6 mb-3">${result.bagian_b.pertanyaan.map((q:string) => `<li>${q}</li>`).join('')}</ol>
    <h5 class="font-bold mt-2 mb-1">Cara Menggunakan Asesmen Diagnostik Ini:</h5>
    <p class="mb-4">${result.cara_penggunaan.replace(/\\n/g, '<br>')}</p>`;
}

async function createAsesmenProses(data: RppData, topicData: any, apiKey: string) {
  const prompt = `Anda adalah ahli asesmen. Buat draf asesmen proses pembelajaran untuk topik "${topicData.topic}". Format jawaban dalam JSON dengan tiga kunci utama: 'observasi', 'penilaian_kinerja', dan 'peer_assessment'. Untuk 'observasi', berikan 'fokus_observasi', 4 'indikator' (array), dan 'skala_penilaian' (array objek dengan kunci 'skala' dan 'deskripsi'). Untuk 'penilaian_kinerja', berikan 'fokus_penilaian', 'contoh_tugas', dan 'rubrik' (array objek dengan kunci 'aspek', 'sangat_baik', 'baik', 'cukup', 'kurang'). Untuk 'peer_assessment', berikan 4 'contoh_pertanyaan' (array).`;
  const schema = {
    type: "OBJECT",
    properties: {
      observasi: { type: "OBJECT", properties: { fokus_observasi: { type: "STRING" }, indikator: { type: "ARRAY", items: { type: "STRING" } }, skala_penilaian: { type: "ARRAY", items: { type: "OBJECT", properties: { skala: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["skala", "deskripsi"] } } }, required: ["fokus_observasi", "indikator", "skala_penilaian"] },
      penilaian_kinerja: { type: "OBJECT", properties: { fokus_penilaian: { type: "STRING" }, contoh_tugas: { type: "STRING" }, rubrik: { type: "ARRAY", items: { type: "OBJECT", properties: { aspek: { type: "STRING" }, sangat_baik: { type: "STRING" }, baik: { type: "STRING" }, cukup: { type: "STRING" }, kurang: { type: "STRING" } }, required: ["aspek", "sangat_baik", "baik", "cukup", "kurang"] } } }, required: ["fokus_penilaian", "contoh_tugas", "rubrik"] },
      peer_assessment: { type: "OBJECT", properties: { contoh_pertanyaan: { type: "ARRAY", items: { type: "STRING" } } }, required: ["contoh_pertanyaan"] }
    },
    required: ["observasi", "penilaian_kinerja", "peer_assessment"]
  };
  const parsedResult = await makeApiCall(prompt, apiKey, schema);

  let observasiHtml = `<h5 class="font-bold mt-4 mb-2">1. Observasi (Assessment as Learning & For Learning)</h5>
    <p class="mb-1"><b>Fokus Observasi:</b> ${parsedResult?.observasi?.fokus_observasi || ''}</p>
    <p class="mb-1"><b>Indikator yang Diobservasi:</b></p><ul class="list-disc pl-6 mb-2">${(parsedResult?.observasi?.indikator || []).map((i:string) => `<li>${i}</li>`).join('')}</ul>
    <p class="mb-1"><b>Skala Penilaian:</b></p><ul class="list-disc pl-6 mb-4">${(parsedResult?.observasi?.skala_penilaian || []).map((s:any) => `<li><b>${s.skala}:</b> ${s.deskripsi}</li>`).join('')}</ul>`;

  let kinerjaHtml = `<h5 class="font-bold mt-4 mb-2">2. Penilaian Kinerja (Assessment as Learning & For Learning)</h5>
    <p class="mb-1"><b>Fokus Penilaian:</b> ${parsedResult?.penilaian_kinerja?.fokus_penilaian || ''}</p>
    <p class="mb-2"><b>Contoh Tugas Kinerja:</b> ${parsedResult?.penilaian_kinerja?.contoh_tugas || ''}</p>
    <table class="w-full border-collapse mb-4"><thead><tr class="bg-gray-50"><th class="border border-gray-300 p-2">Aspek Penilaian</th><th class="border border-gray-300 p-2">Sangat Baik (4)</th><th class="border border-gray-300 p-2">Baik (3)</th><th class="border border-gray-300 p-2">Cukup (2)</th><th class="border border-gray-300 p-2">Kurang (1)</th></tr></thead><tbody>`;
  (parsedResult?.penilaian_kinerja?.rubrik || []).forEach((r:any) => {
    kinerjaHtml += `<tr><td class="border border-gray-300 p-2">${r.aspek}</td><td class="border border-gray-300 p-2">${r.sangat_baik}</td><td class="border border-gray-300 p-2">${r.baik}</td><td class="border border-gray-300 p-2">${r.cukup}</td><td class="border border-gray-300 p-2">${r.kurang}</td></tr>`;
  });
  kinerjaHtml += `</tbody></table>`;

  let peerHtml = `<h5 class="font-bold mt-4 mb-2">3. Peer Assessment (Assessment as Learning)</h5>
    <p class="mb-1"><b>Contoh Pertanyaan/Kriteria untuk Peer Assessment:</b></p>
    <ol class="list-decimal pl-6 mb-4">${(parsedResult?.peer_assessment?.contoh_pertanyaan || []).map((p:string) => `<li>${p}</li>`).join('')}</ol>`;

  return `<h4 class="font-bold text-[11pt] mt-4 mb-2">Asesmen pada Proses Pembelajaran:</h4>${observasiHtml}${kinerjaHtml}${peerHtml}`;
}

async function createAsesmenAkhir(data: RppData, topicData: any, apiKey: string) {
  const prompt = `Anda adalah ahli asesmen. Buat draf asesmen akhir pembelajaran untuk topik "${topicData.topic}". Format jawaban dalam JSON dengan dua kunci utama: 'penilaian_proyek' dan 'portofolio'. Untuk 'penilaian_proyek', berikan 'fokus_penilaian', 'contoh_proyek' (jelaskan detailnya), dan 'rubrik' (array objek dengan kunci 'aspek', 'sangat_baik', 'baik', 'cukup', 'kurang'). Untuk 'portofolio', berikan 'fokus_penilaian', 5 'contoh_isi' (array), dan 'rubrik' (array objek dengan kunci 'aspek', 'sangat_baik', 'baik', 'cukup', 'kurang').`;
  const schema = {
    type: "OBJECT",
    properties: {
      penilaian_proyek: { type: "OBJECT", properties: { fokus_penilaian: { type: "STRING" }, contoh_proyek: { type: "STRING" }, rubrik: { type: "ARRAY", items: { type: "OBJECT", properties: { aspek: { type: "STRING" }, sangat_baik: { type: "STRING" }, baik: { type: "STRING" }, cukup: { type: "STRING" }, kurang: { type: "STRING" } }, required: ["aspek", "sangat_baik", "baik", "cukup", "kurang"] } } }, required: ["fokus_penilaian", "contoh_proyek", "rubrik"] },
      portofolio: { type: "OBJECT", properties: { fokus_penilaian: { type: "STRING" }, contoh_isi: { type: "ARRAY", items: { type: "STRING" } }, rubrik: { type: "ARRAY", items: { type: "OBJECT", properties: { aspek: { type: "STRING" }, sangat_baik: { type: "STRING" }, baik: { type: "STRING" }, cukup: { type: "STRING" }, kurang: { type: "STRING" } }, required: ["aspek", "sangat_baik", "baik", "cukup", "kurang"] } } }, required: ["fokus_penilaian", "contoh_isi", "rubrik"] }
    },
    required: ["penilaian_proyek", "portofolio"]
  };
  const parsedResult = await makeApiCall(prompt, apiKey, schema);

  let proyekHtml = `<h5 class="font-bold mt-4 mb-2">1. Penilaian Proyek (Assessment of Learning)</h5>
    <p class="mb-1"><b>Fokus Penilaian:</b> ${parsedResult?.penilaian_proyek?.fokus_penilaian || ''}</p>
    <p class="mb-2"><b>Contoh Proyek:</b> ${parsedResult?.penilaian_proyek?.contoh_proyek || ''}</p>
    <table class="w-full border-collapse mb-4"><thead><tr class="bg-gray-50"><th class="border border-gray-300 p-2">Aspek Penilaian</th><th class="border border-gray-300 p-2">Sangat Baik (4)</th><th class="border border-gray-300 p-2">Baik (3)</th><th class="border border-gray-300 p-2">Cukup (2)</th><th class="border border-gray-300 p-2">Kurang (1)</th></tr></thead><tbody>`;
  (parsedResult?.penilaian_proyek?.rubrik || []).forEach((r:any) => {
    proyekHtml += `<tr><td class="border border-gray-300 p-2">${r.aspek}</td><td class="border border-gray-300 p-2">${r.sangat_baik}</td><td class="border border-gray-300 p-2">${r.baik}</td><td class="border border-gray-300 p-2">${r.cukup}</td><td class="border border-gray-300 p-2">${r.kurang}</td></tr>`;
  });
  proyekHtml += `</tbody></table>`;

  let portofolioHtml = `<h5 class="font-bold mt-4 mb-2">2. Portofolio (Assessment of Learning)</h5>
    <p class="mb-1"><b>Fokus Penilaian:</b> ${parsedResult?.portofolio?.fokus_penilaian || ''}</p>
    <p class="mb-1"><b>Contoh Isi Portofolio:</b></p><ul class="list-disc pl-6 mb-2">${(parsedResult?.portofolio?.contoh_isi || []).map((i:string) => `<li>${i}</li>`).join('')}</ul>
    <table class="w-full border-collapse mb-4"><thead><tr class="bg-gray-50"><th class="border border-gray-300 p-2">Aspek Penilaian</th><th class="border border-gray-300 p-2">Sangat Baik (4)</th><th class="border border-gray-300 p-2">Baik (3)</th><th class="border border-gray-300 p-2">Cukup (2)</th><th class="border border-gray-300 p-2">Kurang (1)</th></tr></thead><tbody>`;
  (parsedResult?.portofolio?.rubrik || []).forEach((r:any) => {
    portofolioHtml += `<tr><td class="border border-gray-300 p-2">${r.aspek}</td><td class="border border-gray-300 p-2">${r.sangat_baik}</td><td class="border border-gray-300 p-2">${r.baik}</td><td class="border border-gray-300 p-2">${r.cukup}</td><td class="border border-gray-300 p-2">${r.kurang}</td></tr>`;
  });
  portofolioHtml += `</tbody></table>`;

  return `<h4 class="font-bold text-[11pt] mt-4 mb-2">Asesmen pada Akhir Pembelajaran:</h4>${proyekHtml}${portofolioHtml}`;
}

function createTandaTangan(data: RppData) {
  const parseNameAndNip = (s: string) => s.includes('/') ? { name: s.split('/')[0].trim(), nip: s.split('/')[1].trim() } : { name: s.trim(), nip: '' };
  const guru = parseNameAndNip(data.namaGuru);
  const kepsek = parseNameAndNip(data.namaKepsek);
  const formattedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const kepsekNipDisplay = kepsek.nip ? `NIP: ${kepsek.nip}` : 'NIP: .................................';
  const guruNipDisplay = guru.nip ? `NIP: ${guru.nip}` : 'NIP: .................................';
  return `
    <div class="mt-16 flex justify-between text-center" style="page-break-inside: avoid;">
      <div class="w-[40%]">
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div class="h-24"></div>
        <p class="font-bold underline">${kepsek.name}</p>
        <p>${kepsekNipDisplay}</p>
      </div>
      <div class="w-[40%]">
        <p>${data.kota}, ${formattedDate}</p>
        <p>Guru Mata Pelajaran</p>
        <div class="h-24"></div>
        <p class="font-bold underline">${guru.name}</p>
        <p>${guruNipDisplay}</p>
      </div>
    </div>`;
}
