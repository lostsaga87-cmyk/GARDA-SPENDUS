import fs from 'fs';
let code = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

// 1. Remove all `<E field="..." />` lines.
code = code.replace(/\n\s*<E field="[^"]+" \/>/g, '');

// 2. We can look for `b('fieldName')`.
// In the current file, we have: `className={\`... ${b('fieldName')} ...\`}`
// We want to add `<E field="fieldName" />` immediately after the UI element closes.

// To do this, let's locate `${b('fieldName')}` and then march forward to find the end of the tag.
// For self-closing tags like `<input ... />`:
// We can use a regex that doesn't cross lines (assuming <input ... /> is mostly single line)
const lines = code.split('\n');
const newLines = [];
let pendingE = null;

for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  
  const bMatch = lines[i].match(/\$\{b\('(\w+)'\)\}/);
  if (bMatch) {
    pendingE = bMatch[1];
  }
  
  if (pendingE) {
    if (lines[i].includes('/>') || lines[i].includes('</select>') || lines[i].includes('</textarea>')) {
      // Append E
      newLines.push(`            <E field="${pendingE}" />`);
      pendingE = null;
    }
  }
}

fs.writeFileSync('src/components/FormSection.tsx', newLines.join('\n'));
