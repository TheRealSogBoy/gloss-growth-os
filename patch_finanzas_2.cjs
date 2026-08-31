const fs = require('fs');
let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. handleIngreso: add to Boveda
const oldHandleIngreso = `const handleIngreso = async (e) => {
    e.preventDefault();
    const payload = { concepto: formIngreso.concepto, cliente: formIngreso.cliente, tipo: formIngreso.tipo, monto: Number(formIngreso.monto), fecha: formIngreso.fecha };
    const { data } = await supabase.from('finanzas_ingresos').insert([payload]).select();
    if (data && data.length > 0) {
      setIngresos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...ingresos]);
      logAuditoria(user, 'Finanzas', 'CREAR', \`Nuevo Ingreso: \${payload.concepto} - $\${payload.monto}\`);
      
      // VERCEL SERVERLESS TRIGGERS (COBRO)`;

const newHandleIngreso = `const handleIngreso = async (e) => {
    e.preventDefault();
    const montoNum = Number(formIngreso.monto);
    const payload = { concepto: formIngreso.concepto, cliente: formIngreso.cliente, tipo: formIngreso.tipo, monto: montoNum, fecha: formIngreso.fecha };
    const { data } = await supabase.from('finanzas_ingresos').insert([payload]).select();
    if (data && data.length > 0) {
      setIngresos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...ingresos]);
      logAuditoria(user, 'Finanzas', 'CREAR', \`Nuevo Ingreso: \${payload.concepto} - $\${montoNum}\`);
      
      // Bóveda: Añadir Ahorro
      const montoAhorro = montoNum * (porcentajeBoveda / 100);
      const nuevoSaldo = saldoBoveda + montoAhorro;
      try {
        await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo, boveda_ahorro_porcentaje: porcentajeBoveda }]);
        setSaldoBoveda(nuevoSaldo);
      } catch (err) {}
      
      // VERCEL SERVERLESS TRIGGERS (COBRO)`;

fj = fj.replace(oldHandleIngreso, newHandleIngreso);

// Normalize space for replacements
function normalizeStr(str) { return str.replace(/\s+/g, ' '); }
function replaceBlock(content, oldBlock, newBlock) {
    const normContent = normalizeStr(content);
    const normOld = normalizeStr(oldBlock);
    if(normContent.includes(normOld)) {
        // Find exact bounds in original
        let startIndex = content.indexOf(oldBlock.trim().substring(0, 30));
        // If rough matching is needed, we can just do a regex replace based on unique parts.
    }
}

// 2. handleTransferenciaBoveda
const oldHandleTransfBovedaRegex = /const handleTransferenciaBoveda = async \(e\) => \{[\s\S]*?localStorage\.setItem\('gloss_transferencias_boveda', JSON\.stringify\(updated\)\);[\s\S]*?setFormTransfBoveda\(\{ socio: 'Davilson', monto: '', motivo: '' \}\);\s*\};/;

const newHandleTransfBoveda = `const handleTransferenciaBoveda = async (e) => {
    e.preventDefault();
    const montoNum = Number(formTransfBoveda.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa un monto válido para transferir.');
      return;
    }

    const newTransf = {
      tipo: 'transferencia',
      destino: formTransfBoveda.socio,
      monto: montoNum,
      concepto: formTransfBoveda.motivo || \`Transferencia Bóveda → \${formTransfBoveda.socio}\`
    };

    const nuevoSaldo = saldoBoveda - montoNum;
    
    try {
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert([newTransf]).select();
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
      if (data && data.length > 0) {
        setTransferenciasBoveda([data[0], ...transferenciasBoveda]);
        setSaldoBoveda(nuevoSaldo);
        logAuditoria(user, 'Finanzas', 'TRANSFERENCIA', \`Retiro de bóveda de $\${montoNum} hacia \${formTransfBoveda.socio}\`);
      }
    } catch(err) { console.error(err); }

    setModalBoveda(false);
    setFormTransfBoveda({ socio: 'Davilson', monto: '', motivo: '' });
  };`;

fj = fj.replace(oldHandleTransfBovedaRegex, newHandleTransfBoveda);


// 3. handleGastoBoveda
const oldHandleGastoBovedaRegex = /const handleGastoBoveda = async \(e\) => \{[\s\S]*?logAuditoria\([\s\S]*?user,[\s\S]*?'Finanzas',[\s\S]*?'CREAR',[\s\S]*?\`Nuevo Gasto Bóveda: \$\{payload\.concepto\} - \$\$\{montoNum\}\`[\s\S]*?\);[\s\S]*?\}[\s\S]*?setModalBoveda\(false\);[\s\S]*?setFormGastoBoveda\(\{ concepto: '', categoria: 'Herramientas y Software', monto: '', fecha: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], metodo: 'Bóveda de Agencia' \}\);\s*\};/;

const newHandleGastoBoveda = `const handleGastoBoveda = async (e) => {
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
    setFormGastoBoveda({ concepto: '', categoria: 'Herramientas y Software', monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Bóveda de Agencia' });
  };`;

if(fj.match(oldHandleGastoBovedaRegex)) {
   fj = fj.replace(oldHandleGastoBovedaRegex, newHandleGastoBoveda);
} else {
   console.log("Could not find handleGastoBoveda");
}

// 4. handleGasto (Main gasto form)
const oldHandleGastoRegex = /const handleGasto = async \(e\) => \{[\s\S]*?setGastos\(\[\{ id: data\[0\]\.id, created_at: data\[0\]\.created_at, \.\.\.payload \}, \.\.\.gastos\]\);[\s\S]*?logAuditoria\(user, 'Finanzas', 'CREAR', \`Nuevo Gasto \(\$\{payload\.metodo\}\): \$\{payload\.concepto\} - \$\$\{payload\.monto\}\`\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?setModalGasto\(false\);[\s\S]*?setFormGasto\(\{ concepto: '', categoria: 'Operativos', monto: '', fecha: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], metodo: 'Caja General' \}\);\s*\};/;

const newHandleGasto = `const handleGasto = async (e) => {
    e.preventDefault();
    const payload = { concepto: formGasto.concepto, categoria: formGasto.categoria, monto: Number(formGasto.monto), fecha: formGasto.fecha, metodo: formGasto.metodo };
    
    if (formGasto.metodo === 'Tarjeta de Crédito (TDC)' || formGasto.metodo === 'Tarjeta de Crédito') {
      const { data } = await supabase.from('finanzas_compras_tdc').insert([payload]).select();
      if (data && data.length > 0) setComprasTDC([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...comprasTDC]);
    } else {
      const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
      if (data && data.length > 0) {
        setGastos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...gastos]);
        
        // Deduct from Bóveda if method is Bóveda
        if (payload.metodo === 'Bóveda de Agencia') {
            const nuevoSaldo = saldoBoveda - payload.monto;
            await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
            setSaldoBoveda(nuevoSaldo);
        }

        logAuditoria(user, 'Finanzas', 'CREAR', \`Nuevo Gasto (\${payload.metodo}): \${payload.concepto} - $\${payload.monto}\`);
      }
    }
    setModalGasto(false);
    setFormGasto({ concepto: '', categoria: 'Operativos', monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Caja General' });
  };`;

fj = fj.replace(oldHandleGastoRegex, newHandleGasto);

// 5. Update useMemo logic
fj = fj.replace(/const fBovedaTotal = fReinversion - gastosBoveda - tTransfBoveda;/, `const fBovedaTotal = saldoBoveda;`);

// 6. Delete item protection (wait, I already did this in patch_finanzas_1, let's verify if I need to hide buttons)
// Hide Trash icon in Libro Mayor
fj = fj.replace(/<button onClick=\{\(\) => deleteItem\(item\.tabla, item\.setter, item\.list, item\.id\)\}/g, `{isSuperAdmin && (<button onClick={() => deleteItem(item.tabla, item.setter, item.list, item.id)}`);
fj = fj.replace(/<Trash2 size=\{16\} \/>\s*<\/button>/g, `<Trash2 size={16} />\n                          </button>)}`);

// 7. Hide Editar Porcentaje 
fj = fj.replace(/<button onClick=\{\(\) => setIsEditingPct\(true\)\} className="p-0\.5 hover:text-gloss-pink transition-colors" title="Editar porcentaje"><Pencil size=\{12\} \/><\/button>/g, `{isSuperAdmin && (<button onClick={() => setIsEditingPct(true)} className="p-0.5 hover:text-gloss-pink transition-colors" title="Editar porcentaje"><Pencil size={12} /></button>)}`);

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
console.log('✅ Applied phase 2 of Finanzas patch');
