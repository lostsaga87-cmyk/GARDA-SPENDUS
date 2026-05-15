import fs from 'fs';
let code = fs.readFileSync('src/components/FormSection.tsx', 'utf-8');

// The injected code looks like this:
// value={rppData.namaSekolah} onChange={e =>
//             <E field="namaSekolah" /> handleChange('namaSekolah', e.target.value)}
// We need to move `<E field="FIELD" />` OUT of the input tag.
// Actually, it's easier to just match:
// <input ... className={`... ${b('field')}`} ... onChange={e => \n <E field="field" /> handleChange... } />

// wait, let me just replace all `\n            <E field="(\w+)" />` and move it past the closing tag.
const badSyntax = /\n\s*<E field="(\w+)" \/>/g;
code = code.replace(badSyntax, '');

// Now we need to append <E field="..." /> AFTER each input/select/textarea.
// We can do this by regexing over:
// <input ... ${b('field')} ... />
// <select ... ${b('field')} ... > ... </select>
// <textarea ... ${b('field')} ... ></textarea>

// Since it's simpler, let's just do it.
// Let's actually match ${b('field')} and find the end of the element.
fs.writeFileSync('src/components/FormSection.tsx', code);
