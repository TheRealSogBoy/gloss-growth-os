const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. Inject ultimoAjuste
fj = fj.replace(
  /return \(\s*<div className="space-y-8 animate-fade-in pb-12">/,
  `const ultimoAjuste = transferenciasBoveda.find(t => t.tipo === 'ajuste_porcentaje');\n\n  return (\n    <div className="space-y-8 animate-fade-in pb-12">`
);

// 2. Update handleSavePorcentaje to insert audit
const oldHandleSavePorcentajeRegex = /const handleSavePorcentaje = async \(\) => \{[\s\S]*?logAuditoria\(user, 'Finanzas', 'EDITAR', \`Porcentaje de Bóveda actualizado a \$\{val\}%\`\);\s*\};/;

const newHandleSavePorcentaje = `const handleSavePorcentaje = async () => {
    const val = Number(tempPct);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Por favor ingresa un porcentaje válido entre 0 y 100.');
      return;
    }
    setPorcentajeBoveda(val);
    setIsEditingPct(false);
    try { 
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_ahorro_porcentaje: val }]); 
      
      const newLog = {
        tipo: 'ajuste_porcentaje',
        concepto: \`Ajuste de Porcentaje de Bóveda: Cambiado a \${val}%. Aplicable a ingresos a partir de esta fecha/hora.\`,
        monto: 0,
        destino: user?.email || 'Admin'
      };
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert([newLog]).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([data[0], ...transferenciasBoveda]);
      }
    } catch (e) {}
    logAuditoria(user, 'Finanzas', 'EDITAR', \`Porcentaje de Bóveda actualizado a \${val}%\`);
  };`;

if (fj.match(oldHandleSavePorcentajeRegex)) {
  fj = fj.replace(oldHandleSavePorcentajeRegex, newHandleSavePorcentaje);
  console.log("✅ Patched handleSavePorcentaje");
} else {
  // Let's try matching with generic characters in case of encoding
  const relaxedRegex = /const handleSavePorcentaje = async \(\) => \{[\s\S]*?logAuditoria\(user, 'Finanzas', 'EDITAR', [^)]+\);\s*\};/;
  if (fj.match(relaxedRegex)) {
    fj = fj.replace(relaxedRegex, newHandleSavePorcentaje);
    console.log("✅ Patched handleSavePorcentaje with relaxed regex");
  } else {
    console.log("❌ Could not patch handleSavePorcentaje");
  }
}

// 3. Add visual indicator in UI
const uiOld = /\{\s*isSuperAdmin && \(\s*<button onClick=\{\(\) => setIsEditingPct\(true\)\}\s*className="p-0\.5 hover:text-gloss-pink transition-colors"\s*title="Editar porcentaje">\s*<Pencil size=\{12\} \/>\s*<\/button>\s*\)\s*\}\s*<\/div>\s*\)\s*\}\s*<\/div>\s*<\/div>\s*<div className="mt-4">/m;

// Let's find exactly how the UI is laid out currently
// Based on Get-Content earlier:
//                  )}
//                </div>
//              </div>
//  
//              <div className="mt-4">

const uiRegex = /<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<div className="mt-4">/m;
const uiReplacement = `</div>
                  )}
                  {ultimoAjuste && (
                    <p className="text-[10px] text-white/70 mt-3 italic leading-tight border-t border-white/20 pt-2">
                      Vigente desde: {new Date(ultimoAjuste.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}<br/>
                      <span className="opacity-80">Los ingresos anteriores conservan su corte original.</span>
                    </p>
                  )}
                </div>
              </div>
  
              <div className="mt-4">`;

if (fj.match(uiRegex)) {
  fj = fj.replace(uiRegex, uiReplacement);
  console.log("✅ Patched UI to include ultimoAjuste tag");
} else {
  console.log("❌ Could not match UI block");
  // Let's just find `<div className="mt-4">` that's under `Saldo Total Protegido`
  fj = fj.replace(
    /<\/div>\s*\)\s*\}\s*<\/div>\s*<\/div>\s*<div className="mt-4">\s*<p className="text-white\/80 text-xs mb-1">Saldo Total Protegido en/g,
    `</div>
                  )}
                  {ultimoAjuste && (
                    <p className="text-[10px] text-white/70 mt-3 italic leading-tight border-t border-white/20 pt-2">
                      Vigente desde: {new Date(ultimoAjuste.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}<br/>
                      <span className="opacity-80">Los ingresos anteriores conservan su corte original.</span>
                    </p>
                  )}
                </div>
              </div>
  
              <div className="mt-4">
                <p className="text-white/80 text-xs mb-1">Saldo Total Protegido en`
  );
}

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
