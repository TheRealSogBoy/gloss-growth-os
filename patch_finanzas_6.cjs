const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(
  "className={`text-2xl font-bold font-zodiak ${cajaDisponible >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}}>{formatCOP(cajaDisponible)}</h3>",
  "className={`text-2xl font-bold font-zodiak ${cajaDisponible >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCOP(cajaDisponible)}</h3>"
);

fs.writeFileSync('src/pages/Finanzas.jsx', f);
