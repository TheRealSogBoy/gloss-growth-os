const fs = require('fs');
let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const regex = /const handleGastoBoveda = async \(e\) => \{[\s\S]*?setFormGastoBoveda\(\{[\s\S]*?metodo: 'Transferencia' \}\);\s*\};/;

const newHandleGastoBoveda = `  const handleGastoBoveda = async (e) => {
    e.preventDefault();
    const montoNum = Number(formGastoBoveda.monto);
    if (isNaN(montoNum) || montoNum <= 0) return;

    const payload = { concepto: formGastoBoveda.concepto, categoria: formGastoBoveda.categoria, monto: montoNum, fecha: formGastoBoveda.fecha, metodo: 'Bóveda de Agencia' };
    const nuevoSaldo = saldoBoveda - montoNum;

    try {
      const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
      if (data && data.length > 0) {
        setGastos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...gastos]);
        setSaldoBoveda(nuevoSaldo);
        logAuditoria(user, 'Finanzas', 'CREAR', \`Nuevo Gasto Bóveda: \${payload.concepto} - $\${montoNum}\`);
      }
    } catch(err) {}

    setModalBoveda(false);
    setFormGastoBoveda({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });
  };`;

if(fj.match(regex)) {
   fj = fj.replace(regex, newHandleGastoBoveda);
   console.log('✅ Applied handleGastoBoveda patch via relaxed regex');
   fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
} else {
   console.log('❌ Could not match handleGastoBoveda');
}
