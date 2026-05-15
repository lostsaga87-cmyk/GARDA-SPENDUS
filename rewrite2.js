const fs = require('fs');
let code = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

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
