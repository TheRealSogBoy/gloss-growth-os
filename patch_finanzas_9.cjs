const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

const regexToRemove = /<div className="pt-3 border-t border-white\/20 flex justify-between items-center text-xs">\s*<span>\+\{formatCOP\(fondoReinversionMes\)\} \(Mes actual\)<\/span>\s*<span className="px-2 py-0\.5 bg-white\/20 rounded font-bold">\{porcentajeBoveda\}% de Ingresos Brutos<\/span>\s*<\/div>/m;

if (f.match(regexToRemove)) {
  f = f.replace(regexToRemove, '');
  console.log('✅ Removed fondoReinversionMes UI block');
} else {
  // Relax regex
  const relaxedRegex = /<div className="pt-3 border-t border-white\/20 flex justify-between items-center text-xs">[\s\S]*?<\/div>/m;
  if (f.match(relaxedRegex)) {
    f = f.replace(relaxedRegex, '');
    console.log('✅ Removed fondoReinversionMes UI block with relaxed regex');
  } else {
    console.log('❌ Could not find fondoReinversionMes UI block');
  }
}

fs.writeFileSync('src/pages/Finanzas.jsx', f);
