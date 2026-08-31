const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// Button 1: Caja General
const cajaRegex = /<p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Utilidad Neta Disponible<\/p>\s*<h3 className=\{`text-2xl font-bold font-zodiak \$\{utilidadBrutaMes >= 0 \? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'\}`\}>\{formatCOP\(utilidadBrutaMes\)\}<\/h3>/;

const cajaNew = `<div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Caja General / Disponible</p>
                <h3 className={\`text-2xl font-bold font-zodiak \${cajaDisponible >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}\}>{formatCOP(cajaDisponible)}</h3>
              </div>
              <button onClick={() => setModalDistribuir(true)} className="bg-gloss-burgundy hover:bg-red-800 text-white text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-xl transition-colors shadow flex items-center gap-1">
                Distribuir
              </button>
            </div>`;

if (fj.match(cajaRegex)) {
  fj = fj.replace(cajaRegex, cajaNew);
  console.log('✅ Patched Caja General UI.');
} else {
  console.log('❌ Could not match Caja General UI.');
}

// Button 2: Boveda Inyectar
// Find:
// <div className="mt-6 relative z-10 space-y-3">
//   <button 
//     onClick={() => {
//       setTabBoveda('transferir');

const bovedaRegex = /<div className="mt-6 relative z-10 space-y-3">\s*<button/;

const bovedaNew = `<div className="mt-6 relative z-10 space-y-3">
              <button 
                onClick={() => setModalInyectar(true)}
                className="w-full flex items-center justify-center gap-2 bg-white text-gloss-burgundy font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
              >
                + Inyectar Fondos
              </button>
              <button `;

if (fj.match(bovedaRegex)) {
  fj = fj.replace(bovedaRegex, bovedaNew);
  console.log('✅ Patched Boveda Inyectar UI.');
} else {
  console.log('❌ Could not match Boveda Inyectar UI.');
}

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
