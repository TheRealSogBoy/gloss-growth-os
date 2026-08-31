const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/\s*\/\/\s*Orden cronológico/g, '\n      });\n\n      // Orden cronológico');

// relax regex
f = f.replace(/\s*\/\/\s*Orden cronol[^g]*gico/g, '\n      });\n\n      // Orden cronológico');

fs.writeFileSync('src/pages/Finanzas.jsx', f);
