const fs = require('fs');

let content = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

// We need to pass showValidationMarks as prop
content = content.replace(
  'interface FormSectionProps {',
  'interface FormSectionProps {\n  showValidationMarks: boolean;'
);
content = content.replace(
  'export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig, userMapel = [] }: FormSectionProps) {',
  'export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig, userMapel = [], showValidationMarks }: FormSectionProps) {\n  const b = (field: keyof typeof rppData) => `${showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0)) ? "border-red-400 bg-red-50" : "border-gray-300"}`;\n  const E = ({field, msg}: {field: keyof typeof rppData, msg?: string}) => (showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0))) ? <span className="text-red-500 text-xs mt-1 block font-medium">{msg || "Bidang ini wajib diisi"}</span> : null;'
);

// Map of lines to replace to inject `b` and `E` based on the field.
const mappings = [
  {field: 'namaSekolah', msg: 'Nama sekolah wajib diisi'},
  {field: 'jenjang', msg: 'Jenjang wajib dipilih'},
  {field: 'mapel', msg: 'Mata pelajaran wajib diisi'},
  {field: 'tahunPelajaran', msg: 'Tahun pelajaran wajib diisi'},
  {field: 'kelasSemester', msg: 'Kelas & Semester wajib dipilih'},
  {field: 'fase', msg: 'Fase wajib dipilih'},
  {field: 'jumlahPertemuan', msg: 'Jumlah pertemuan wajib diisi'},
  {field: 'alokasiWaktu', msg: 'Jumlah pertemuan alokasi wajib diisi'},
  {field: 'namaGuru', msg: 'Nama guru wajib diisi'},
  {field: 'nipGuru', msg: 'NIP guru wajib diisi (isi - jika tidak ada)'},
  {field: 'namaKepsek', msg: 'Nama Kepala Sekolah wajib diisi'},
  {field: 'nipKepsek', msg: 'NIP Kepsek wajib diisi (isi - jika tidak ada)'},
  {field: 'kota', msg: 'Kota penandatanganan wajib diisi'},
  {field: 'kktpTercapaiMin', msg: 'Nilai KKTP wajib diisi'},
  {field: 'saranaPrasarana', msg: 'Sarana prasarana wajib diisi'},
  {field: 'karakteristik', msg: 'Karakteristik peserta didik wajib diisi'},
  {field: 'minat', msg: 'Minat peserta didik wajib diisi'},
  {field: 'motivasi', msg: 'Motivasi belajar wajib diisi'},
  {field: 'prestasi', msg: 'Prestasi belajar wajib diisi'},
  {field: 'lingkungan', msg: 'Lingkungan sekolah wajib diisi'},
  {field: 'kemitraan', msg: 'Kemitraan wajib diisi'},
  {field: 'lingkunganFisik', msg: 'Lingkungan fisik wajib diisi'},
  {field: 'lingkunganVirtual', msg: 'Lingkungan virtual wajib diisi'},
  {field: 'budayaBelajar', msg: 'Budaya belajar wajib diisi'},
  {field: 'digitalPerencanaan', msg: 'Pemanfaatan platform digital dalam perencanaan wajib diisi'},
  {field: 'digitalPelaksanaan', msg: 'Pemanfaatan platform digital dalam pelaksanaan wajib diisi'},
  {field: 'digitalAsesmen', msg: 'Pemanfaatan platform digital dalam asesmen wajib diisi'},
  {field: 'cp_full_text', msg: 'Materi / Rincian Belajar wajib diisi'},
];

for (const m of mappings) {
  // Regex to find the <input>, <select>, <textarea> with value={rppData.FIELD}
  // We need to replace the border-gray-300 part with ${b('FIELD')}
  // We also need to append <E field="FIELD" msg="MSG"/> after it but that's tricky since it might be closed.
  
  // Actually, we can use a simpler approach. If we find:
  // value={rppData.XXX}
  // Let's just find the exact block and replace it.
  
  const regex = new RegExp(`(<(?:input|select|textarea)[^>]*?className="[^"]*?)\\bborder-gray-300\\b([^"]*?"[^>]*?value={?rppData\.${m.field}}?[^>]*?>)`, 'g');
  
  content = content.replace(regex, (match, prefix, suffix) => {
    // Convert className="..." to className={\`...\`}
    let replacedPrefix = prefix.replace('className="', 'className={`');
    let replacedSuffix = suffix.replace('"', '`}')
    // Wait, the suffix ends with `"`, but there might be other attributes after className.
    return match; // fallback: we need a better regex.
  });
}

fs.writeFileSync('src/components/FormSection_new.tsx', content);
console.log("Done");
