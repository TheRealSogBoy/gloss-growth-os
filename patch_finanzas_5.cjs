const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/\}\);\s*\}\);\s*\/\/\s*Orden cronológico/g, '});\n\n      // Orden cronológico');

// Try generic replace if encoding fails
f = f.replace(/\}\);\s*\}\);\s*\/\/\s*Orden cron/g, '});\n\n      // Orden cron');

fs.writeFileSync('src/pages/Finanzas.jsx', f);
