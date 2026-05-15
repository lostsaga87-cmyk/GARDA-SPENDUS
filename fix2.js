import fs from 'fs';
let code = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

// select
code = code.replace(/(\$\{b\('(\w+)'\)\}.*?<\/select>)/gs, '$1\n            <E field="$2" />');

// textarea
code = code.replace(/(\$\{b\('(\w+)'\)\}.*?<\/textarea>)/gs, '$1\n            <E field="$2" />');

// inputs (self-closing). Note we MUST only match up to `/>` to avoid overmatching.
code = code.replace(/([^\n]+\$\{b\('(\w+)'\)\}[^\n]+?\/>)/g, '$1\n            <E field="$2" />');

fs.writeFileSync('src/components/FormSection.tsx', code);
