import React, { useState, useRef } from 'react';
import { Printer, FileText, Edit, Save, ArrowLeft, Download } from 'lucide-react';
import { RppData } from '../types';
import { makeApiCall } from '../lib/api';
import { saveDocument, User } from '../lib/store';
import MiniGame from './MiniGame';

interface OutputSectionProps {
  rppData: RppData;
  setRppData: React.Dispatch<React.SetStateAction<RppData>>;
  apiKeys: string[];
  onBack: () => void;
  userId: string;
  currentUser?: User;
}

export default function OutputSection({ rppData, setRppData, apiKeys, onBack, userId, currentUser }: OutputSectionProps) {
  const [step, setStep] = useState<number>(3); // 3: TP, 4: ATP, 5: KKTP, 6: RPP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rppHtml, setRppHtml] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const editContentRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (editContentRef.current && rppHtml) {
      if (!isEditing && editContentRef.current.innerHTML !== rppHtml) {
        editContentRef.current.innerHTML = rppHtml;
      }
    }
  }, [rppHtml, isEditing]);

  const handleEditToggle = () => {
    if (isEditing && editContentRef.current) {
      setRppHtml(editContentRef.current.innerHTML);
    }
    setIsEditing(!isEditing);
  };

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
        finalHtml += `<div class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50" role="alert"><span class="font-medium">Peringatan!</span> Jumlah pertemuan (${rppData.jumlahPertemuan}) lebih banyak dari jumlah materi pokok yang ditemukan (${rppData.tujuanPembelajaran.length}). Hanya ${meetingsToGenerate} RPM yang akan dibuat.</div>`;
      }

      // Identifikasi Materi uses generic rppData, so only needs to be generated once
      const identifikasiMateriHtml = await createIdentifikasiMateri(rppData, apiKeys);

      for (let i = 0; i < meetingsToGenerate; i++) {
        const currentTopicData = rppData.tujuanPembelajaran[i];
        
        const currentDurasi = Array.isArray(rppData.durasiPertemuan) ? (rppData.durasiPertemuan[i] || rppData.durasiPertemuan[0] || "") : rppData.durasiPertemuan;
        const meetingRppData = { ...rppData, durasiPertemuan: currentDurasi as any } as RppData;

        // Process these 2 at a time or sequentially to avoid hitting Gemini rate limits too fast
        const desainPembelajaranHtml = await createDesainPembelajaran(meetingRppData, currentTopicData, apiKeys);
        const langkahPembelajaranHtml = await createLangkahPembelajaran(meetingRppData, currentTopicData, apiKeys);
        
        const [
          asesmenAwalHtml,
          asesmenProsesHtml,
          asesmenAkhirResult
        ] = await Promise.all([
          createAsesmenAwal(meetingRppData, currentTopicData, apiKeys),
          createAsesmenProses(meetingRppData, currentTopicData, apiKeys),
          createAsesmenAkhirAndLKPD(meetingRppData, currentTopicData, apiKeys, langkahPembelajaranHtml)
        ]);
        
        let asesmenAkhirHtml = "";
        let lkpdHtml = "";
        
        if (typeof asesmenAkhirResult === 'object') {
           asesmenAkhirHtml = asesmenAkhirResult.asesmenAkhirHtml || "";
           lkpdHtml = asesmenAkhirResult.lkpdHtml || "";
        } else {
           asesmenAkhirHtml = asesmenAkhirResult || "";
        }

        finalHtml += `
          <div class="rpp-section mb-12" style="margin-bottom: 3rem; ${i > 0 ? 'page-break-before: always; break-before: page;' : ''}">
            <h2 style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 1.5rem;">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>
            ${createHeaderTable(meetingRppData)}
            
            <h3 style="font-weight: bold; font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem;">Identifikasi</h3>
            ${createIdentifikasiPesertaDidik(meetingRppData)}
            ${identifikasiMateriHtml}
            ${createDimensiProfilLulusan(meetingRppData)}
            ${createCapaianPembelajaran(meetingRppData)}

            <h3 style="font-weight: bold; font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem;">Desain Pembelajaran</h3>
            ${desainPembelajaranHtml}
            ${createSumberBelajarHtml(meetingRppData, currentTopicData)}

            <h3 style="font-weight: bold; font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem;">Langkah-Langkah Pembelajaran</h3>
            ${langkahPembelajaranHtml}

            <h3 style="font-weight: bold; font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem;">Asesmen Pembelajaran</h3>
            ${asesmenAwalHtml}
            ${asesmenProsesHtml}
            ${asesmenAkhirHtml}

            ${createTandaTangan(meetingRppData)}
            ${lkpdHtml}
          </div>
          ${i < meetingsToGenerate - 1 ? '<div style="page-break-after: always; break-after: page;"></div><br clear="all" style="mso-break-type: section-break" />' : ''}`;
      }

      finalHtml += `</div>`;
      setRppHtml(finalHtml);
      
      // Save document automatically
      const docTitle = `RPP ${rppData.mapel} - ${rppData.kelasSemester}`;
      saveDocument(userId, docTitle, finalHtml).catch(e => {
        console.error("Failed to save document:", e);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getKopSuratHtml = () => {
    if (!currentUser) return '';
    
    if (currentUser.kop_sekolah_image) {
      return `
        <div style="width: 100%; text-align: center; margin-bottom: 20px;">
          <img src="${currentUser.kop_sekolah_image}" style="max-width: 100%; max-height: 200px; object-fit: contain;" alt="Kop Sekolah" />
        </div>
      `;
    }

    if (!currentUser.kop_instansi && !currentUser.kop_nama_sekolah) return '';
    return `
      <table class="no-border" style="width: 100%; border-bottom: 4px double #000; margin-bottom: 20px; border-collapse: collapse; border: none; margin-top: 0;">
        <tr>
          <td style="text-align: center; border: none; padding: 0;">
            ${currentUser.kop_instansi ? `<div style="font-size: 14pt; font-weight: normal; margin-bottom: 2px;">${currentUser.kop_instansi}</div>` : ''}
            ${currentUser.kop_dinas ? `<div style="font-size: 16pt; font-weight: bold; margin-bottom: 2px;">${currentUser.kop_dinas}</div>` : ''}
            ${currentUser.kop_nama_sekolah ? `<div style="font-size: 18pt; font-weight: bold; margin-bottom: 2px;">${currentUser.kop_nama_sekolah}</div>` : ''}
            ${currentUser.kop_alamat ? `<div style="font-size: 11pt; margin-top: 5px; margin-bottom: 2px;">${currentUser.kop_alamat}</div>` : ''}
            ${currentUser.kop_kontak ? `<div style="font-size: 11pt; margin-bottom: 5px;">${currentUser.kop_kontak} ${currentUser.kop_website ? `| Website: ${currentUser.kop_website}` : ''}</div>` : ''}
          </td>
        </tr>
      </table>
    `;
  };

  const handlePrint = (contentId: string, title: string) => {
    const contentElement = document.getElementById(contentId);
    if (!contentElement) return;
    
    const kopHtml = getKopSuratHtml();

    // In an iframe (like AI Studio preview), window.open might be blocked or have issues printing.
    // Instead, we will inject an iframe, write to it, and print from it.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: A4 portrait; margin: 20mm; }
              body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: black; background: white; margin: 0; padding: 0; }
              * { box-sizing: border-box; }
              table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 11pt; page-break-inside: auto; border: none; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th, td { border: 1px solid #000; padding: 0.5rem; text-align: left; vertical-align: top; }
              th { font-weight: bold; }
              h2 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 1.5rem; }
              h3 { font-size: 12pt; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem; }
              h4, h5 { font-size: 11pt; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
              ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; }
              p { margin-bottom: 0.5rem; text-align: justify; }
              .page-break-after-always { page-break-after: always; }
              /* Force specific table elements to not have borders if requested */
              table.no-border td { border: none !important; }
            </style>
          </head>
          <body>${kopHtml}${contentElement.innerHTML}</body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        if (iframe.contentWindow) {
          iframe.contentWindow.onafterprint = () => {
            document.body.removeChild(iframe);
          };
          iframe.contentWindow.print();
          // Fallback if onafterprint doesn't fire
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 60000); // 1 minute fallback
        }
      }, 500);
    }
  };

  const handleDownloadWord = (contentId: string, filename: string) => {
    const rawContent = document.getElementById(contentId)?.innerHTML || '';
    const kopHtml = getKopSuratHtml();
    const content = kopHtml + rawContent;
    
    // Create a complete HTML document that Word can understand better
    const wordDocument = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export HTML To Doc</title>
        <style>
          /* Basic Word Styles */
          @page WordSection1 {
              size: 21cm 29.7cm; /* A4 */
              margin: 2cm 2cm 2cm 2cm;
          }
          div.WordSection1 { page: WordSection1; }
          body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; color: windowtext; }
          table { border-collapse: collapse; width: 100%; mso-table-layout-alt: fixed; margin: 10px 0; }
          td, th { border: 1px solid windowtext; padding: 5px; vertical-align: top; }
          h2 { font-size: 14pt; font-weight: bold; text-align: center; }
          h3 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid windowtext; }
          h4, h5 { font-size: 11pt; font-weight: bold; }
          p { text-align: justify; margin: 0 0 10px 0; }
          .page-break-after-always { mso-special-character: line-break; page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          ${content}
        </div>
      </body>
      </html>
    `;
    
    // Use Blob for better file downloading
    const blob = new Blob(['\ufeff', wordDocument], {
        type: 'application/msword;charset=utf-8'
    });
    
    // Create a link to download it
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    
    if ((navigator as any).msSaveOrOpenBlob) {
        (navigator as any).msSaveOrOpenBlob(blob, `${filename}.doc`); // IE10-11
    } else {
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = `${filename}.doc`;
        downloadLink.click();
        
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
  };

  return (
    <div className="space-y-6">
      {/* TP Section */}
      {step === 3 && (
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Kembali ke Form">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">3. Tujuan Pembelajaran (TP)</h2>
          </div>
          <button onClick={() => handlePrint('tp-output', 'Tujuan Pembelajaran')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
            <Printer className="w-4 h-4 mr-2" /> Cetak / PDF
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
          <div className="flex gap-3 mt-6">
            <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Kembali
            </button>
            <button onClick={handleGenerateATP} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              Lanjut: Buat Alur Tujuan Pembelajaran
            </button>
          </div>
        )}
      </section>
      )}

      {/* ATP Section */}
      {step === 4 && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(3)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Kembali ke TP">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-800">4. Alur Tujuan Pembelajaran (ATP)</h2>
            </div>
            <button onClick={() => handlePrint('atp-output', 'Alur Tujuan Pembelajaran')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
              <Printer className="w-4 h-4 mr-2" /> Cetak / PDF
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
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(3)} className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Kembali
              </button>
              <button onClick={handleGenerateKKTP} className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Lanjut: Buat KKTP
              </button>
            </div>
          )}
        </section>
      )}

      {/* KKTP Section */}
      {step === 5 && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" id="section-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(4)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Kembali ke ATP">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-800">5. Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h2>
            </div>
            <button onClick={() => handlePrint('kktp-output', 'KKTP')} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors text-sm">
              <Printer className="w-4 h-4 mr-2" /> Cetak / PDF
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
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(4)} className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Kembali
              </button>
              <button onClick={handleGenerateRPP} className="flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <FileText className="w-5 h-5 mr-2" /> Buat Rencana Pembelajaran Lengkap
              </button>
            </div>
          )}
        </section>
      )}

      {/* RPP Output */}
      {step === 6 && (
        <section className={`bg-white rounded-xl shadow-sm border border-gray-100 relative ${loading ? 'min-h-[460px] flex items-center justify-center p-0 overflow-hidden' : 'p-6'}`}>
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 z-20">
               <MiniGame />
            </div>
          ) : error ? (
            <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
              <h4 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h4>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep(5)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Kembali ke KKTP">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">Hasil Dokumen Rencana Pembelajaran</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleEditToggle} className={`flex items-center px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isEditing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    {isEditing ? <><Save className="w-4 h-4 mr-2" /> Simpan Edit</> : <><Edit className="w-4 h-4 mr-2" /> Edit Dokumen</>}
                  </button>
                  <button onClick={() => handlePrint('rpp-content-to-export', 'RPM')} disabled={isEditing} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Printer className="w-4 h-4 mr-2" /> Download PDF
                  </button>
                  <button onClick={() => handleDownloadWord('rpp-content-to-export', 'RPM_Garda_Spendus')} disabled={isEditing} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4 mr-2" /> Download Word
                  </button>
                </div>
              </div>
              <div 
                id="rpp-content-to-export"
                ref={editContentRef}
                suppressContentEditableWarning={true}
                contentEditable={isEditing}
                onBlur={(e) => {
                  if (isEditing) {
                    setRppHtml(e.currentTarget.innerHTML);
                  }
                }}
                className={`p-8 bg-white rounded-lg font-serif text-[11pt] leading-relaxed ${isEditing ? 'border-2 border-dashed border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] focus:outline-none' : 'border border-gray-200'}`}
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
    <table style="width: 100%; margin-bottom: 1.5rem; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
      <tbody>
        <tr><td style="font-weight: bold; width: 25%; padding: 8px; border: 1px solid #000; background-color: #f9fafb;">NAMA SEKOLAH</td><td style="padding: 8px; border: 1px solid #000;">: ${data.namaSekolah.toUpperCase()}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #000; background-color: #f9fafb;">KELAS / SEMESTER</td><td style="padding: 8px; border: 1px solid #000;">: ${data.kelasSemester.toUpperCase()}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #000; background-color: #f9fafb;">MATA PELAJARAN</td><td style="padding: 8px; border: 1px solid #000;">: ${data.mapel.toUpperCase()}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #000; background-color: #f9fafb;">ALOKASI WAKTU</td><td style="padding: 8px; border: 1px solid #000;">: ${data.durasiPertemuan}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #000; background-color: #f9fafb;">JUMLAH PERTEMUAN</td><td style="padding: 8px; border: 1px solid #000;">: ${data.alokasiWaktu}</td></tr>
      </tbody>
    </table>`;
}

function createIdentifikasiPesertaDidik(data: RppData) {
  return `
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Peserta Didik:</h4>
    <p style="margin-bottom: 0.5rem;">Identifikasi kesiapan peserta didik sebelum belajar, seperti pengetahuan awal, minat, latar belakang, dan kebutuhan belajar, serta aspek lainnya:</p>
    <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
      <li><strong>Pengetahuan awal:</strong> ${data.karakteristik}</li>
      <li><strong>Minat:</strong> ${data.minat}</li>
      <li><strong>Motivasi:</strong> ${data.motivasi}</li>
      <li><strong>Prestasi:</strong> ${data.prestasi}</li>
      <li><strong>Latar belakang & Lingkungan:</strong> ${data.lingkungan}</li>
    </ul>`;
}

async function createIdentifikasiMateri(data: RppData, apiKeys: string[]) {
  const prompt = `Anda adalah seorang ahli kurikulum. Berdasarkan Capaian Pembelajaran berikut: '${data.cp_full_text}' untuk mata pelajaran '${data.mapel}' kelas '${data.kelasSemester}'. Pertimbangkan juga Karakteristik siswa: ${data.karakteristik}, Minat: ${data.minat}, Motivasi: ${data.motivasi}, Prestasi: ${data.prestasi}, Lingkungan: ${data.lingkungan}. Buatlah analisis materi pelajaran yang mendalam dalam format JSON. JSON harus memiliki kunci berikut: 'jenis_pengetahuan' (dengan sub-kunci 'konseptual', 'procedural', 'metakognitif'), 'relevansi_kehidupan_nyata', 'tingkat_kesulitan' (jelaskan alasannya), 'struktur_materi', dan 'integrasi_nilai_karakter' (berikan list 5 nilai karakter dan jelaskan integrasinya).`;
  const schema = {
    type: "OBJECT",
    properties: {
      jenis_pengetahuan: { type: "OBJECT", properties: { konseptual: { type: "STRING" }, prosedural: { type: "STRING" }, metakognitif: { type: "STRING" } }, required: ["konseptual", "prosedural", "metakognitif"] },
      relevansi_kehidupan_nyata: { type: "STRING" },
      tingkat_kesulitan: { type: "STRING" },
      struktur_materi: { type: "STRING" },
      integrasi_nilai_karakter: { 
        type: "ARRAY", 
        items: { 
          type: "OBJECT", 
          properties: { 
            nilai: { type: "STRING" }, 
            penjelasan: { type: "STRING" } 
          }, 
          required: ["nilai", "penjelasan"] 
        } 
      }
    },
    required: ["jenis_pengetahuan", "relevansi_kehidupan_nyata", "tingkat_kesulitan", "struktur_materi", "integrasi_nilai_karakter"]
  };
  const result = await makeApiCall(prompt, apiKeys, schema);

  const renderIntegrasi = (Array.isArray(result?.integrasi_nilai_karakter) ? result.integrasi_nilai_karakter : [])
    .map((item: any) => `<div style="margin-top: 0.5rem; margin-bottom: 0.5rem;"><strong>${item.nilai}</strong>: ${item.penjelasan}</div>`)
    .join('');

  return `
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Materi Pelajaran:</h4>
    <ol style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal;">
      <li><strong style="font-weight:bold;">Jenis Pengetahuan yang akan Dicapai:</strong>
        <ul style="margin-left: 1.5rem; margin-top: 0.25rem; margin-bottom: 0.25rem; list-style-type: disc;">
          <li><strong style="font-weight:bold;">Konseptual:</strong> ${result?.jenis_pengetahuan?.konseptual || ''}</li>
          <li><strong style="font-weight:bold;">Prosedural:</strong> ${result?.jenis_pengetahuan?.prosedural || ''}</li>
          <li><strong style="font-weight:bold;">Metakognitif:</strong> ${result?.jenis_pengetahuan?.metakognitif || ''}</li>
        </ul>
      </li>
      <li><strong style="font-weight:bold;">Relevansi dengan Kehidupan Nyata Peserta Didik:</strong><p style="margin-top: 0.25rem; margin-bottom: 0.25rem;">${result?.relevansi_kehidupan_nyata || ''}</p></li>
      <li><strong style="font-weight:bold;">Tingkat Kesulitan:</strong><p style="margin-top: 0.25rem; margin-bottom: 0.25rem;">${result?.tingkat_kesulitan || ''}</p></li>
      <li><strong style="font-weight:bold;">Struktur Materi:</strong><p style="margin-top: 0.25rem; margin-bottom: 0.25rem;">${result?.struktur_materi || ''}</p></li>
      <li><strong style="font-weight:bold;">Integrasi Nilai dan Karakter:</strong><div style="margin-top: 0.25rem; margin-bottom: 0.25rem;">${renderIntegrasi}</div></li>
    </ol>`;
}

function createDimensiProfilLulusan(data: RppData) {
  const allProfils = ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Kewargaan", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Kemandirian", "Kesehatan", "Komunikasi"];
  let html = `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b;">Dimensi Profil Lulusan:</h4><p style="margin-bottom: 0.75rem; color: #475569; font-size: 10pt;">Karakter dan kompetensi yang akan dicapai dalam pembelajaran:</p><table style="width: 100%; margin-bottom: 1rem; border: none; border-collapse: separate; border-spacing: 0 8px;"><tr>`;
  allProfils.forEach((profil, index) => {
    const isChecked = data.profilLulusan.includes(profil);
    const checkBoxColor = isChecked ? '#059669' : '#94a3b8';
    const textColor = isChecked ? '#0f172a' : '#475569';
    const fontWeight = isChecked ? 'bold' : 'normal';
    
    html += `<td style="border: none; padding: 4px 8px; vertical-align: middle; width: 50%;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${checkBoxColor}; font-size: 16pt; font-family: 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; display: inline-block; line-height: 1;">${isChecked ? '☑' : '☐'}</span>
        <span style="color: ${textColor}; font-weight: ${fontWeight}; font-size: 10.5pt; line-height: 1.2;"><b>DPL${index+1}</b> - ${profil}</span>
      </div>
    </td>`;
    
    if ((index + 1) % 2 === 0 && index < allProfils.length - 1) html += `</tr><tr>`;
  });
  html += `</tr></table>`;
  return html;
}

function createCapaianPembelajaran(data: RppData) {
  return `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Capaian Pembelajaran:</h4><p style="margin-bottom: 1rem; text-align: justify;">${data.cp_full_text}</p>`;
}

async function createDesainPembelajaran(data: RppData, topicData: any, apiKeys: string[]) {
  const prompt = `Anda adalah seorang desainer pembelajaran. Untuk materi pokok: "${topicData.topic}", buatlah detail desain pembelajaran dalam format JSON. JSON harus memiliki kunci: 'lintas_disiplin' (array string nama mapel), 'topik_pembelajaran' (array string topik spesifik turunan dari materi pokok), dan 'praktik_pedagogis' (berikan list 3 praktik yang sesuai). Gunakan juga data karakteristik siswa (${data.karakteristik}, minat ${data.minat}, motivasi ${data.motivasi}, prestasi ${data.prestasi}) dan lingkungan belajar (Fisik='${data.lingkunganFisik}', Virtual='${data.lingkunganVirtual}', Budaya='${data.budayaBelajar}') untuk merancang praktik pedagogis yang inklusif dan efektif bagi mereka.`;
  const schema = {
    type: "OBJECT",
    properties: {
      lintas_disiplin: { type: "ARRAY", items: { type: "STRING" } },
      topik_pembelajaran: { type: "ARRAY", items: { type: "STRING" } },
      praktik_pedagogis: { 
        type: "ARRAY", 
        items: { 
          type: "OBJECT", 
          properties: { 
            nama_praktik: { type: "STRING" }, 
            penjelasan: { type: "STRING" } 
          }, 
          required: ["nama_praktik", "penjelasan"] 
        } 
      }
    },
    required: ["lintas_disiplin", "topik_pembelajaran", "praktik_pedagogis"]
  };
  const result = await makeApiCall(prompt, apiKeys, schema);
  const tpsForThisMeeting = `<h5 style="font-weight: bold; font-size: 11pt; margin-top: 0.75rem; margin-bottom: 0.25rem;">Tujuan Pembelajaran Pertemuan Ini:</h5><ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: disc;">${topicData.tps.map((tp:any) => `<li>${tp.text}</li>`).join('')}</ul>`;

  const renderPraktik = (Array.isArray(result?.praktik_pedagogis) ? result.praktik_pedagogis : [])
    .map((item: any, idx: number) => `<div style="margin-bottom: 0.5rem;">${idx + 1}. <strong>${item.nama_praktik}</strong>: ${item.penjelasan}</div>`)
    .join('');

  return `
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Lintas Disiplin Ilmu:</h4><ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: disc;">${(result?.lintas_disiplin || []).map((item:string) => `<li>${item}</li>`).join('')}</ul>
    ${tpsForThisMeeting}
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Topik Pembelajaran:</h4><ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: disc;">${(result?.topik_pembelajaran || []).map((item:string) => `<li>${item}</li>`).join('')}</ul>
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Praktik Pedagogis:</h4><div style="margin-bottom: 0.75rem;">${renderPraktik}</div>
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Kemitraan Pembelajaran:</h4><p style="margin-bottom: 0.75rem;">${data.kemitraan}</p>
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Lingkungan Pembelajaran:</h4>
    <ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: disc;">
      <li><strong style="font-weight:bold;">Ruang Fisik:</strong> ${data.lingkunganFisik}</li>
      <li><strong style="font-weight:bold;">Ruang Virtual:</strong> ${data.lingkunganVirtual}</li>
      <li><strong style="font-weight:bold;">Budaya Belajar:</strong> ${data.budayaBelajar}</li>
    </ul>
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Pemanfaatan Digital:</h4><p style="margin-bottom: 1rem;">${data.digitalPerencanaan}, ${data.digitalPelaksanaan}, ${data.digitalAsesmen}</p>`;
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
  return `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Sumber Belajar:</h4><ul style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc;">${listItems}</ul>`;
}

async function createLangkahPembelajaran(data: RppData, topicData: any, apiKeys: string[]) {
  const tpsJoined = topicData.tps.map((t:any) => t.text).join(', ');
  const numMeetingsMatch = data.alokasiWaktu.match(/(\d+)/);
  const numMeetings = numMeetingsMatch ? parseInt(numMeetingsMatch[1], 10) : 1;

  const prompt = `Anda adalah seorang guru inovatif. Rancang langkah-langkah pembelajaran dalam format tabel untuk ${numMeetings} pertemuan. Model Pembelajaran yang harus digunakan adalah: ${data.modelPembelajaran}. Topik materi ini adalah: '${topicData.topic}' beserta Tujuan Pembelajaran: '${tpsJoined}'.

PENTING UNTUK DISTRIBUSI WAKTU & SINTAKS:
- Durasi per pertemuan adalah ${data.durasiPertemuan}. Total waktu untuk ${numMeetings} pertemuan harus dipecah/didistribusikan secara proporsional.
- Kegiatan setiap pertemuan tetap MURNI memiliki bagian AWAL, INTI, PENUTUP (masing-masing pertemuan menghabiskan waktu ${data.durasiPertemuan}).
- PADA BAGIAN INTI, Anda HARUS mendistribusikan sintaks (langkah-langkah) dari model ${data.modelPembelajaran} secara berurutan melintasi ${numMeetings} pertemuan tersebut. BUKAN mengulang seluruh sintaks pada setiap pertemuan. Misalnya, jika ada 2 pertemuan, pertemuan pertama menggunakan sintaks tahap awal, dan pertemuan kedua menggunakan sisa sintaks akhir model tersebut.
- Tuliskan alokasi waktu dengan tag <strong> (contoh: <strong>15 menit</strong>) di setiap deskripsi agar realistis memenuhi durasi ${data.durasiPertemuan} di tiap pertemuannya.

Kondisi Awal Siswa: Karakteristik (${data.karakteristik}), Minat (${data.minat}), Lingkungan Sekolah (${data.lingkungan}).
INSTRUKSI KHUSUS LINGKUNGAN: Jika "Lingkungan Sekolah" mendeskripsikan kondisi spesifik (misal desa pesisir, dll), Anda HARUS memprioritaskan aktivitas pembelajaran yang berbasis pada konteks lingkungan tersebut.

Format jawaban dalam JSON dengan kunci 'pertemuan_list' (array of objects). Tiap objek pertemuan memiliki kunci 'pertemuan_ke' (angka), dan kunci 'awal', 'inti', 'penutup'. Masing-masing ('awal', 'inti', 'penutup') berisi array objek yang mewakili satu baris tabel dan memiliki kunci 'tahap' (nama sintaks model untuk tahap inti), 'prinsip' (pilih 'Berkesadaran', 'Bermakna', 'Menggembirakan'), dan 'deskripsi' (berupa poin-poin menggunakan tag HTML <ul> dan <li> secara detail).`;

  const schema = {
    type: "OBJECT",
    properties: {
      pertemuan_list: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            pertemuan_ke: { type: "INTEGER" },
            awal: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } },
            inti: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } },
            penutup: { type: "ARRAY", items: { type: "OBJECT", properties: { tahap: { type: "STRING" }, prinsip: { type: "STRING" }, deskripsi: { type: "STRING" } }, required: ["tahap", "prinsip", "deskripsi"] } }
          },
          required: ["pertemuan_ke", "awal", "inti", "penutup"]
        }
      }
    },
    required: ["pertemuan_list"]
  };
  const result = await makeApiCall(prompt, apiKeys, schema);

  const renderTableSection = (title: string, steps: any[]) => {
    if (!steps || steps.length === 0) return '';
    let tableRows = steps.map(step => `<tr><td style="border: 1px solid #000; padding: 0.5rem; width: 33.333%; vertical-align: top;"><strong style="font-weight:bold;">${step.tahap}</strong><br/><span style="font-style: italic; font-size: 10pt;">(${step.prinsip})</span></td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${step.deskripsi}</td></tr>`).join('');
    return `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">${title}</h4><table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;"><tbody>${tableRows}</tbody></table>`;
  };

  let allHtml = '';
  if (result.pertemuan_list && Array.isArray(result.pertemuan_list)) {
      result.pertemuan_list.forEach((p: any) => {
          allHtml += `<h3 style="font-weight: bold; font-size: 13pt; margin-top: 2rem; margin-bottom: 1rem; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem;">Pertemuan Ke-${p.pertemuan_ke} <span style="font-weight: normal; font-size: 11pt; color: #4b5563;">(Durasi: ${data.durasiPertemuan})</span></h3>`;
          allHtml += renderTableSection('AWAL', p.awal);
          allHtml += `<p style="margin-bottom: 0.5rem;">Pada tahap ini, siswa aktif terlibat dalam pengalaman belajar memahami, mengaplikasi, dan merefleksi. Sintaks didistribusikan sesuai progres pembelajaran untuk model ${data.modelPembelajaran}.</p>`;
          allHtml += renderTableSection('INTI (Pengalaman Belajar)', p.inti);
          allHtml += renderTableSection('PENUTUP', p.penutup);
      });
  } else {
      // Fallback in case of incorrect schema return
      allHtml += renderTableSection('AWAL', result.awal);
      allHtml += renderTableSection('INTI (Pengalaman Belajar)', result.inti);
      allHtml += renderTableSection('PENUTUP', result.penutup);
  }
  return allHtml;
}

async function createAsesmenAwal(data: RppData, topicData: any, apiKeys: string[]) {
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
  const result = await makeApiCall(prompt, apiKeys, schema);
  return `
    <h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Asesmen pada Awal Pembelajaran:</h4>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Tujuan:</strong> ${result.tujuan}</p>
    <p style="margin-bottom: 0.75rem;"><strong style="font-weight:bold;">Metode:</strong> ${result.metode}</p>
    <h5 style="font-weight: bold; font-size: 11pt; margin-top: 0.5rem; margin-bottom: 0.25rem;">${result.bagian_a.deskripsi}</h5>
    <ol style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: decimal;">${result.bagian_a.pertanyaan.map((q:string) => `<li>${q}</li>`).join('')}</ol>
    <h5 style="font-weight: bold; font-size: 11pt; margin-top: 0.5rem; margin-bottom: 0.25rem;">${result.bagian_b.deskripsi}</h5>
    <ol style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: decimal;">${result.bagian_b.pertanyaan.map((q:string) => `<li>${q}</li>`).join('')}</ol>
    <h5 style="font-weight: bold; font-size: 11pt; margin-top: 0.5rem; margin-bottom: 0.25rem;">Cara Menggunakan Asesmen Diagnostik Ini:</h5>
    <p style="margin-bottom: 1rem;">${result.cara_penggunaan.replace(/\\n/g, '<br>')}</p>`;
}

async function createAsesmenProses(data: RppData, topicData: any, apiKeys: string[]) {
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
  const parsedResult = await makeApiCall(prompt, apiKeys, schema);

  let observasiHtml = `<h5 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">1. Observasi (Assessment as Learning & For Learning)</h5>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Fokus Observasi:</strong> ${parsedResult?.observasi?.fokus_observasi || ''}</p>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Indikator yang Diobservasi:</strong></p><ul style="margin-left: 1.5rem; margin-bottom: 0.5rem; list-style-type: disc;">${(parsedResult?.observasi?.indikator || []).map((i:string) => `<li>${i}</li>`).join('')}</ul>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Skala Penilaian:</strong></p><ul style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc;">${(parsedResult?.observasi?.skala_penilaian || []).map((s:any) => `<li><strong style="font-weight:bold;">${s.skala}:</strong> ${s.deskripsi}</li>`).join('')}</ul>`;

  let kinerjaHtml = `<h5 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">2. Penilaian Kinerja (Assessment as Learning & For Learning)</h5>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Fokus Penilaian:</strong> ${parsedResult?.penilaian_kinerja?.fokus_penilaian || ''}</p>
    <p style="margin-bottom: 0.5rem;"><strong style="font-weight:bold;">Contoh Tugas Kinerja:</strong> ${parsedResult?.penilaian_kinerja?.contoh_tugas || ''}</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;"><thead><tr style="background-color: #f9fafb;"><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Aspek Penilaian</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Sangat Baik (4)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Baik (3)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Cukup (2)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Kurang (1)</th></tr></thead><tbody>`;
  (parsedResult?.penilaian_kinerja?.rubrik || []).forEach((r:any) => {
    kinerjaHtml += `<tr><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.aspek}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.sangat_baik}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.baik}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.cukup}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.kurang}</td></tr>`;
  });
  kinerjaHtml += `</tbody></table>`;

  let peerHtml = `<h5 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">3. Peer Assessment (Assessment as Learning)</h5>
    <p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Contoh Pertanyaan/Kriteria untuk Peer Assessment:</strong></p>
    <ol style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal;">${(parsedResult?.peer_assessment?.contoh_pertanyaan || []).map((p:string) => `<li>${p}</li>`).join('')}</ol>`;

  return `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Asesmen pada Proses Pembelajaran:</h4>${observasiHtml}${kinerjaHtml}${peerHtml}`;
}

async function createAsesmenAkhirAndLKPD(data: RppData, topicData: any, apiKeys: string[], langkahPembelajaranHtml: string): Promise<{asesmenAkhirHtml: string, lkpdHtml: string}> {
  const tpsJoined = topicData.tps.map((t:any) => t.text).join(', ');
  
  // Create a clean text version of the HTML to pass to the AI, removing tags
  const cleanLangkah = langkahPembelajaranHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();

  const prompt = `Anda adalah seorang ahli kurikulum dan pendidikan. Berdasarkan materi: '${topicData.topic}' dengan tujuan pembelajaran: '${tpsJoined}'. Kelas: '${data.kelasSemester}', Alokasi Waktu Keseluruhan: '${data.alokasiWaktu}', Durasi Pertemuan ini: '${data.durasiPertemuan}'. Model Pembelajaran yang digunakan adalah: '${data.modelPembelajaran}'. Kondisi Siswa: Karakteristik: ${data.karakteristik}, Minat: ${data.minat}, dan Lingkungan Sekolah: ${data.lingkungan}.
  
  PENTING SEKALI: Sebelumnya telah disusun Langkah Pembelajaran / Kegiatan Inti (skenario diskusi/proyek/aktivitas kelas) sebagai berikut:
  """
  ${cleanLangkah}
  """

  Buatlah dua hal secara bersamaan:
  1. Rubrik Penilaian untuk Lembar Kerja Peserta Didik (LKPD).
  2. Konten LKPD yang HARUS SANGAT SELARAS dengan skenario pokok bahasan pada kegiatan inti di atas. (JANGAN membuat topik atau skenario baru yang berbeda jalur. Jika kegiatan intinya siswa mencari A, LKPD-nya harus tentang mencari A). Konten harus berbasis proyek jika instruksi adalah PjBL, masalah jika PBL, dsb sesuai desain tabel tersebut.
  INSTRUKSI KHUSUS LINGKUNGAN: Jika "Lingkungan Sekolah" mendeskripsikan kondisi spesifik (lebih dari 1 kata, misal desa pesisir, dll), Anda HARUS sangat mengutamakan integrasi kondisi tersebut sebagai studi kasus, sumber belajar, bahan proyek, atau tema permasalahan utama dalam LKPD ini, menyesuaikan dengan aktivitas yang ada di Langkah Pembelajaran.
  PENTING TAMBAHAN: Durasi untuk pertemuan ini adalah tepat ${data.durasiPertemuan}. Anda HARUS menyesuaikan scope/kesulitan tugas di LKPD agar logis diselesaikan dalam tenggat waktu tersebut di kelas. Nilai "alokasi_waktu" di LKPD HARUS diisi persis sama dengan nilai: "${data.durasiPertemuan}".
  Selain itu, tambahkan rekomendasi media sumber belajar (Video / Gambar) berupa URL relevan yang bisa diakses untuk membantu/menunjang pengerjaan LKPD siswa. Contoh url: https://www.youtube.com/results?search_query=... atau https://id.wikipedia.org/wiki/...

  Keluarkan jawaban dalam format JSON ketat dengan struktur berikut:
  {
    "rubrik_asesmen": {
       "fokus_penilaian": "Apa yang dinilai dari LKPD ini",
       "rubrik": [
         {
           "aspek": "string",
           "sangat_baik": "string",
           "baik": "string",
           "cukup": "string",
           "kurang": "string"
         }
       ]
    },
    "lkpd": {
       "judul_kegiatan": "string",
       "alokasi_waktu": "string",
       "pengantar": "string",
       "sumber_belajar_multimedia": [
         {
           "jenis": "Video / Gambar / Artikel",
           "deskripsi": "Deskripsi singkat mengenai isi dari URL tersebut",
           "url": "URL nyata atau URL pencarian youtube yang relevan"
         }
       ],
       "alat_bahan": ["string"],
       "langkah_kegiatan": ["string"],
       "pertanyaan_diskusi": ["string"]
    }
  }`;

  const schema = {
    type: "OBJECT",
    properties: {
      rubrik_asesmen: { 
        type: "OBJECT", 
        properties: { 
          fokus_penilaian: { type: "STRING" }, 
          rubrik: { type: "ARRAY", items: { type: "OBJECT", properties: { aspek: { type: "STRING" }, sangat_baik: { type: "STRING" }, baik: { type: "STRING" }, cukup: { type: "STRING" }, kurang: { type: "STRING" } }, required: ["aspek", "sangat_baik", "baik", "cukup", "kurang"] } } 
        }, 
        required: ["fokus_penilaian", "rubrik"] 
      },
      lkpd: { 
        type: "OBJECT", 
        properties: { 
          judul_kegiatan: { type: "STRING" }, 
          alokasi_waktu: { type: "STRING" }, 
          pengantar: { type: "STRING" }, 
          sumber_belajar_multimedia: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                jenis: { type: "STRING" },
                deskripsi: { type: "STRING" },
                url: { type: "STRING" }
              },
              required: ["jenis", "deskripsi", "url"]
            }
          },
          alat_bahan: { type: "ARRAY", items: { type: "STRING" } }, 
          langkah_kegiatan: { type: "ARRAY", items: { type: "STRING" } }, 
          pertanyaan_diskusi: { type: "ARRAY", items: { type: "STRING" } } 
        }, 
        required: ["judul_kegiatan", "alokasi_waktu", "pengantar", "langkah_kegiatan", "pertanyaan_diskusi"] 
      }
    },
    required: ["rubrik_asesmen", "lkpd"]
  };
  
  const parsedResult = await makeApiCall(prompt, apiKeys, schema);

  let asesmenAkhirHtml = '';
  const rubrikData = parsedResult?.rubrik_asesmen;
  if (rubrikData) {
    asesmenAkhirHtml += `<h5 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Asesmen Lembar Kerja Peserta Didik (LKPD)</h5>`;
    asesmenAkhirHtml += `<p style="margin-bottom: 0.25rem;"><strong style="font-weight:bold;">Fokus Penilaian:</strong> ${rubrikData.fokus_penilaian || ''}</p>`;
    asesmenAkhirHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;"><thead><tr style="background-color: #f9fafb;"><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Aspek Penilaian</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Sangat Baik (4)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Baik (3)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Cukup (2)</th><th style="border: 1px solid #000; padding: 0.5rem; font-weight: bold;">Kurang (1)</th></tr></thead><tbody>`;
    (rubrikData.rubrik || []).forEach((r:any) => {
      asesmenAkhirHtml += `<tr><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.aspek}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.sangat_baik}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.baik}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.cukup}</td><td style="border: 1px solid #000; padding: 0.5rem; vertical-align: top;">${r.kurang}</td></tr>`;
    });
    asesmenAkhirHtml += `</tbody></table>`;
  }

  let lkpdHtml = '';
  const lkpdData = parsedResult?.lkpd;
  if (lkpdData) {
    let alatBahanHtml = '';
    if (lkpdData.alat_bahan && lkpdData.alat_bahan.length > 0) {
       alatBahanHtml = `<h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">C. Alat dan Bahan</h4>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc;">
          ${lkpdData.alat_bahan.map((a:string) => `<li>${a}</li>`).join('')}
        </ul>`;
    }

    let sumberBelajarHtml = '';
    if (lkpdData.sumber_belajar_multimedia && lkpdData.sumber_belajar_multimedia.length > 0) {
      sumberBelajarHtml = `<div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f0f9ff; border-left: 4px solid #3b82f6;">
        <h5 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem; color: #1e3a8a;">Referensi Sumber Belajar / Multimedia:</h5>
        <ul style="margin-left: 1.5rem; margin-bottom: 0; list-style-type: circle; color: #1e40af;">
          ${lkpdData.sumber_belajar_multimedia.map((s:any) => `
            <li style="margin-bottom: 0.25rem;">
              <strong>${s.jenis}:</strong> ${s.deskripsi} <br/> 
              <a href="${s.url}" target="_blank" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${s.url}</a>
            </li>`).join('')}
        </ul>
      </div>`;
    }

    lkpdHtml = `
      <br clear="all" style="page-break-before: always; mso-break-type: section-break" />
      <div style="margin-top: 2rem;">
        <h2 style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 0.5rem;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h2>
        <h3 style="text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 2rem; text-transform: uppercase;">${lkpdData.judul_kegiatan}</h3>
        
        <table class="no-border" style="width: 100%; border: none; margin-bottom: 1.5rem; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
          <tr><td style="width: 25%; border: none !important; padding: 0.35rem 0;">Mata Pelajaran</td><td style="width: 2%; border: none !important; padding: 0.35rem 0;">:</td><td style="border: none !important; padding: 0.35rem 0; font-weight: bold;">${data.mapel}</td></tr>
          <tr><td style="border: none !important; padding: 0.35rem 0;">Kelas/Semester</td><td style="border: none !important; padding: 0.35rem 0;">:</td><td style="border: none !important; padding: 0.35rem 0;">${data.kelasSemester}</td></tr>
          <tr><td style="border: none !important; padding: 0.35rem 0;">Alokasi Waktu</td><td style="border: none !important; padding: 0.35rem 0;">:</td><td style="border: none !important; padding: 0.35rem 0;">${data.durasiPertemuan}</td></tr>
          <tr><td style="border: none !important; padding: 0.35rem 0;">Model Pembelajaran</td><td style="border: none !important; padding: 0.35rem 0;">:</td><td style="border: none !important; padding: 0.35rem 0;">${data.modelPembelajaran}</td></tr>
        </table>

        <div style="border: 1px solid #000; padding: 1rem; margin-bottom: 2rem;">
          <p style="margin: 0 0 0.5rem 0;"><strong>Nama Kelompok / Individu :</strong> ..........................................................................</p>
          <p style="margin: 0 0 0.5rem 0;"><strong>Nama Anggota / No. Absen :</strong></p>
          <ol style="margin-left: 1.5rem; margin-bottom: 0;">
             <li style="margin-bottom: 0.25rem;">....................................................................... ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</li>
             <li style="margin-bottom: 0.25rem;">....................................................................... ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</li>
             <li style="margin-bottom: 0.25rem;">....................................................................... ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</li>
             <li style="margin-bottom: 0.25rem;">....................................................................... ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</li>
             <li>....................................................................... ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</li>
          </ol>
        </div>

        <h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">A. Tujuan Kegiatan</h4>
        <p style="margin-bottom: 1.5rem; text-align: justify;">Melalui kegiatan ini, peserta didik diharapkan mampu: ${tpsJoined}</p>

        <h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">B. Pengantar</h4>
        <p style="margin-bottom: 1.5rem; text-align: justify;">${lkpdData.pengantar}</p>

        ${sumberBelajarHtml}

        ${alatBahanHtml}

        <h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">${lkpdData.alat_bahan && lkpdData.alat_bahan.length > 0 ? 'D' : 'C'}. Langkah-Langkah Kegiatan</h4>
        <ol style="margin-left: 1.5rem; margin-bottom: 2rem; text-align: justify;">
          ${(lkpdData.langkah_kegiatan || []).map((l:string) => `<li style="margin-bottom: 0.5rem;">${l}</li>`).join('')}
        </ol>

        <h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">${lkpdData.alat_bahan && lkpdData.alat_bahan.length > 0 ? 'E' : 'D'}. Ruang Diskusi / Lembar Kerja</h4>
        <ol style="margin-left: 1.5rem; margin-bottom: 2rem; text-align: justify;">
          ${(lkpdData.pertanyaan_diskusi || []).map((p:string) => `<li style="margin-bottom: 1.5rem;">${p}<div style="margin-top: 0.5rem;"><table style="width: 100%; border-collapse: collapse; border: 1px solid #000;" border="1"><tbody><tr><td style="border: 1px solid #000; padding: 10px;"><br><br><br><br><br><br><br></td></tr></tbody></table></div></li>`).join('')}
        </ol>
        
        <h4 style="font-weight: bold; font-size: 11pt; margin-bottom: 0.5rem;">${lkpdData.alat_bahan && lkpdData.alat_bahan.length > 0 ? 'F' : 'E'}. Kesimpulan</h4>
        <div><table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; border: 1px solid #000;" border="1"><tbody><tr><td style="border: 1px solid #000; padding: 10px;"><br><br><br><br><br><br><br></td></tr></tbody></table></div>
      </div>
    `;
  }

  return { asesmenAkhirHtml: `<h4 style="font-weight: bold; font-size: 11pt; margin-top: 1rem; margin-bottom: 0.5rem;">Asesmen pada Akhir Pembelajaran:</h4>${asesmenAkhirHtml}`, lkpdHtml };
}

function createTandaTangan(data: RppData) {
  const parseNameAndNip = (s: string) => s.includes('/') ? { name: s.split('/')[0].trim(), nip: s.split('/')[1].trim() } : { name: s.trim(), nip: '' };
  
  const guruParsed = parseNameAndNip(data.namaGuru);
  const kepsekParsed = parseNameAndNip(data.namaKepsek);
  
  const guruName = guruParsed.name;
  const guruNip = data.nipGuru || guruParsed.nip;
  
  const kepsekName = kepsekParsed.name;
  const kepsekNip = data.nipKepsek || kepsekParsed.nip;

  const formattedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const kepsekNipDisplay = kepsekNip ? `NIP: ${kepsekNip}` : 'NIP: .................................';
  const guruNipDisplay = guruNip ? `NIP: ${guruNip}` : 'NIP: .................................';
  return `
    <table class="no-border" style="width: 100%; margin-top: 4rem; border: none; font-family: 'Times New Roman', Times, serif; font-size: 11pt; page-break-inside: avoid; break-inside: avoid;">
      <tr>
        <td style="width: 50%; border: none !important; vertical-align: top;">
          <p style="margin: 0; text-align: left;">Mengetahui,</p>
          <p style="margin: 0; text-align: left;">Kepala Sekolah</p>
          <br><br><br><br>
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: left;">${kepsekName}</p>
          <p style="margin: 0; text-align: left;">${kepsekNipDisplay}</p>
        </td>
        <td style="width: 50%; border: none !important; vertical-align: top;">
          <div style="float: right; text-align: center;">
            <p style="margin: 0; text-align: center;">${data.kota}, ${formattedDate}</p>
            <p style="margin: 0; text-align: center;">Guru Mata Pelajaran</p>
            <br><br><br><br>
            <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center;">${guruName}</p>
            <p style="margin: 0; text-align: center;">${guruNipDisplay}</p>
          </div>
          <div style="clear: both;"></div>
        </td>
      </tr>
    </table>`;
}
