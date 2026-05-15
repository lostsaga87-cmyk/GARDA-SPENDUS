import fs from 'fs';
let code = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

// First inject showValidationMarks and b, E
code = code.replace(
  'interface FormSectionProps {',
  'interface FormSectionProps {\n  showValidationMarks: boolean;'
);
code = code.replace(
  'export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig, userMapel = [] }: FormSectionProps) {',
  'export default function FormSection({ rppData, setRppData, validationError, onGenerateTP, onShowIdeaModal, appConfig, userMapel = [], showValidationMarks }: FormSectionProps) {\n  const b = (field: keyof typeof rppData) => `${showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0)) ? "border-red-400 bg-red-50" : "border-gray-300"}`;\n  const E = ({field, msg}: {field: keyof typeof rppData, msg?: string}) => ((showValidationMarks && (!rppData[field] || (Array.isArray(rppData[field]) && (rppData[field] as any[]).length === 0))) ? <span className="text-red-500 text-xs mt-1 block font-medium">{msg || "Wajib diisi"}</span> : null) as any;'
);


const regex = /className="([^"]*border-gray-300[^"]*)"([^>]*value={rppData\.(\w+)}[^>]*>)/g;
code = code.replace(regex, (match, classNames, rest, fieldName) => {
  const newClassNames = classNames.replace('border-gray-300', '${b(\'' + fieldName + '\')}');
  return `className={\`${newClassNames}\`}${rest}\n            <E field="${fieldName}" />`;
});

// For cp_full_text (textarea)
const regex2 = /className="([^"]*border-gray-300[^"]*)"([^>]*value={rppData\.cp_full_text}[^>]*><\/textarea>)/g;
code = code.replace(regex2, (match, classNames, rest) => {
  const newClassNames = classNames.replace('border-gray-300', '${b(\'cp_full_text\')}');
  return `className={\`${newClassNames}\`}${rest}\n            <E field="cp_full_text" />`;
});

fs.writeFileSync('src/components/FormSection.tsx', code);
