const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. STATE
fj = fj.replace(
  /const \[modalBoveda, setModalBoveda\] = useState\(false\);/,
  `const [modalBoveda, setModalBoveda] = useState(false);
  const [modalInyectar, setModalInyectar] = useState(false);
  const [formInyectar, setFormInyectar] = useState({ monto: '', motivo: 'Aporte de Capital Propio', notas: '' });
  const [modalDistribuir, setModalDistribuir] = useState(false);
  const [formDistribuir, setFormDistribuir] = useState({ boveda: '', operacion: '', davilson: '', santiago: '' });`
);

// 2. handleIngreso Boveda block removal
const bovedaAhorroRegex = /\/\/\s*Bóveda:\s*Añadir Ahorro[\s\S]*?\} catch \(err\) \{\}/;
if (fj.match(bovedaAhorroRegex)) {
  fj = fj.replace(bovedaAhorroRegex, `// Bóveda: Añadir Ahorro automático removido (nuevo modelo manual).`);
} else {
  // Try relaxed regex due to encoding
  const relaxedBovedaRegex = /\/\/\s*B[^:]+:\s*A[^a-zA-Z]*adir Ahorro[\s\S]*?\} catch \(err\) \{\}/;
  fj = fj.replace(relaxedBovedaRegex, `// Bóveda: Añadir Ahorro automático removido (nuevo modelo manual).`);
}

// 3. New Handlers
const handlersCode = `
  const handleInyectar = async (e) => {
    e.preventDefault();
    const m = Number(formInyectar.monto);
    if (m <= 0) return;
    
    const conceptoFinal = \`\${formInyectar.motivo}\${formInyectar.notas ? ' - ' + formInyectar.notas : ''}\`;
    const nuevoSaldo = saldoBoveda + m;
    
    try {
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
      setSaldoBoveda(nuevoSaldo);
      
      const newLog = {
        tipo: 'deposito_manual',
        concepto: conceptoFinal,
        monto: m,
        destino: 'Bóveda'
      };
      
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert([newLog]).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([data[0], ...transferenciasBoveda]);
      }
      
      logAuditoria(user, 'Finanzas', 'CREAR', \`Inyección a Bóveda: \${conceptoFinal} - \${m}\`);
      alert('Fondos inyectados a la bóveda con éxito.');
    } catch (err) {
      alert('Error inyectando fondos: ' + err.message);
    }
    
    setModalInyectar(false);
    setFormInyectar({ monto: '', motivo: 'Aporte de Capital Propio', notas: '' });
  };

  const handleDistribuir = async (e) => {
    e.preventDefault();
    const mBoveda = Number(formDistribuir.boveda) || 0;
    const mOperacion = Number(formDistribuir.operacion) || 0;
    const mDavilson = Number(formDistribuir.davilson) || 0;
    const mSantiago = Number(formDistribuir.santiago) || 0;
    
    const suma = mBoveda + mOperacion + mDavilson + mSantiago;
    if (suma <= 0) return alert('Ingresa al menos un monto para distribuir.');
    if (suma > cajaDisponible) return alert('La suma de las partes (' + formatCOP(suma) + ') supera el saldo de Caja General (' + formatCOP(cajaDisponible) + ').');
    
    try {
      const logs = [];
      if (mBoveda > 0) {
        logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mBoveda, destino: 'Bóveda' });
        const nuevoSaldo = saldoBoveda + mBoveda;
        await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
        setSaldoBoveda(nuevoSaldo);
      }
      if (mOperacion > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mOperacion, destino: 'Fondo Operación' });
      if (mDavilson > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mDavilson, destino: 'Davilson' });
      if (mSantiago > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mSantiago, destino: 'Santiago' });
      
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert(logs).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([...data, ...transferenciasBoveda]);
      }
      
      logAuditoria(user, 'Finanzas', 'CREAR', \`Distribución manual de Caja General: \${suma}\`);
      alert('Distribución realizada con éxito.');
    } catch (err) {
      alert('Error distribuyendo fondos: ' + err.message);
    }
    
    setModalDistribuir(false);
    setFormDistribuir({ boveda: '', operacion: '', davilson: '', santiago: '' });
  };
`;

fj = fj.replace(/const handleIngreso = async \(e\) => \{/, handlersCode + '\n  const handleIngreso = async (e) => {');

// 4. Modals JSX
const modalsJsx = `
      {/* MODAL INYECTAR FONDOS */}
      {modalInyectar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative">
            <button onClick={() => setModalInyectar(false)} className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white">
              <X size={18} />
            </button>
            <h3 className="font-zodiak font-bold text-xl text-gray-900 dark:text-white mb-4">+ Inyectar a Bóveda</h3>
            <form onSubmit={handleInyectar} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Monto ($)</label>
                <input required type="number" value={formInyectar.monto} onChange={e=>setFormInyectar({...formInyectar, monto: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy font-bold"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Motivo / Origen</label>
                <select value={formInyectar.motivo} onChange={e=>setFormInyectar({...formInyectar, motivo: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <option>Aporte de Capital Propio</option>
                  <option>Pago / Devolución de Deuda</option>
                  <option>Ajuste de Caja / Rendimientos</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Notas / Detalle (Opcional)</label>
                <input type="text" value={formInyectar.notas} onChange={e=>setFormInyectar({...formInyectar, notas: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"/>
              </div>
              <button type="submit" className="w-full bg-gloss-burgundy text-white font-bold py-3 rounded-xl hover:opacity-90 shadow-lg">Confirmar Inyección</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DISTRIBUIR FONDOS */}
      {modalDistribuir && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative my-8">
            <button onClick={() => setModalDistribuir(false)} className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white">
              <X size={18} />
            </button>
            <h3 className="font-zodiak font-bold text-xl text-gray-900 dark:text-white mb-2">Distribuir Fondos</h3>
            <p className="text-sm text-gray-500 mb-6">Caja Disponible: <strong className="text-green-600 dark:text-green-400">{formatCOP(cajaDisponible)}</strong></p>
            <form onSubmit={handleDistribuir} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hacia Bóveda de Ahorro ($)</label>
                <input type="number" value={formDistribuir.boveda} onChange={e=>setFormDistribuir({...formDistribuir, boveda: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hacia Fondo Operación / Gastos ($)</label>
                <input type="number" value={formDistribuir.operacion} onChange={e=>setFormDistribuir({...formDistribuir, operacion: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hacia Socio Davilson ($)</label>
                <input type="number" value={formDistribuir.davilson} onChange={e=>setFormDistribuir({...formDistribuir, davilson: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hacia Socio Santiago ($)</label>
                <input type="number" value={formDistribuir.santiago} onChange={e=>setFormDistribuir({...formDistribuir, santiago: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold"/>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy text-white font-bold py-3 rounded-xl hover:opacity-90 shadow-lg">Confirmar Distribución</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

fj = fj.replace(/(<\/div>\s*)$/, modalsJsx + '\n$1');

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
console.log('✅ Base patches written');
