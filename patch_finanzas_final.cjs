const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. Check isSuperAdmin
if (!fj.includes('const { user, isSuperAdmin } = useAuth();')) {
  fj = fj.replace(
    /const \{ user \} = useAuth\(\);/,
    "const { user, isSuperAdmin } = useAuth();"
  );
}

// 2. Add saldoBoveda state
if (!fj.includes('const [saldoBoveda, setSaldoBoveda] = useState(0);')) {
  fj = fj.replace(
    /const \[porcentajeBoveda, setPorcentajeBoveda\] = useState\(15\);/,
    "const [porcentajeBoveda, setPorcentajeBoveda] = useState(15);\n  const [saldoBoveda, setSaldoBoveda] = useState(0);"
  );
}

// 3. Update fetchData
const newFetchData = `  const fetchData = useCallback(async () => {
    try {
      const [ing, gas, gf, tdc, deu, ret, tf, cl, audit, configData, transfData] = await Promise.all([
        supabase.from('finanzas_ingresos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos_fijos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_tdc').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_deudas').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_retiros').select('*').order('created_at', { ascending: false }),
        supabase.from('tareas').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('historial_auditoria').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('finanzas_config').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('finanzas_transferencias_boveda').select('*').order('created_at', { ascending: false })
      ]);

      if (audit && audit.data) setAuditLogs(audit.data);

      if (configData && configData.data) {
        setPorcentajeBoveda(Number(configData.data.boveda_ahorro_porcentaje) || 15);
        setTempPct(Number(configData.data.boveda_ahorro_porcentaje) || 15);
        setSaldoBoveda(Number(configData.data.boveda_saldo_acumulado) || 0);
      }
      
      if (transfData && transfData.data) {
        setTransferenciasBoveda(transfData.data);
      }
`;

fj = fj.replace(/const fetchData = useCallback\(async \(\) => \{\s*try \{\s*\/\/ Cargar porcentaje[\s\S]*?if \(audit && audit\.data\) setAuditLogs\(audit\.data\);/, newFetchData.trim());


// 4. Update deleteItem
fj = fj.replace(
  /const deleteItem = async \(tabla, setter, list, id\) => \{/,
  `const deleteItem = async (tabla, setter, list, id) => {
    if (!isSuperAdmin) {
      alert("No tienes permisos de Super Admin para eliminar transacciones.");
      return;
    }`
);


// 5. Modificar handleSavePorcentaje
fj = fj.replace(
  /localStorage\.setItem\('gloss_porcentaje_boveda', String\(val\)\);\s*try \{\s*await supabase\.from\('finanzas_config'\)\.upsert\(\[\{ id: 'default', porcentaje_boveda: val \}\]\);\s*\} catch \(e\) \{\}/,
  `try { await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_ahorro_porcentaje: val }]); } catch (e) {}`
);


// 6. handleIngreso
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

fj = fj.replace(/const handleIngreso = async \(e\) => \{[\s\S]*?const payload = \{ concepto: formIngreso\.concepto, cliente: formIngreso\.cliente, tipo: formIngreso\.tipo, monto: Number\(formIngreso\.monto\), fecha: formIngreso\.fecha \};[\s\S]*?const \{ data \} = await supabase\.from\('finanzas_ingresos'\)\.insert\(\[payload\]\)\.select\(\);[\s\S]*?if \(data && data\.length > 0\) \{[\s\S]*?setIngresos\(\[\{ id: data\[0\]\.id, created_at: data\[0\]\.created_at, \.\.\.payload \}, \.\.\.ingresos\]\);[\s\S]*?logAuditoria\(user, 'Finanzas', 'CREAR', \`Nuevo Ingreso: \$\{payload\.concepto\} - \$\$\{payload\.monto\}\`\);[\s\S]*?\/\/ VERCEL SERVERLESS TRIGGERS \(COBRO\)/, newHandleIngreso);


// 7. handleTransferenciaBoveda
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

fj = fj.replace(/const handleTransferenciaBoveda = async \(e\) => \{[\s\S]*?localStorage\.setItem\('gloss_transferencias_boveda', JSON\.stringify\(updated\)\);[\s\S]*?setFormTransfBoveda\(\{ socio: 'Davilson', monto: '', motivo: '' \}\);\s*\};/, newHandleTransfBoveda);


// 8. handleGastoBoveda
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
    setFormGastoBoveda({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });
  };`;

fj = fj.replace(/const handleGastoBoveda = async \(e\) => \{[\s\S]*?setFormGastoBoveda\(\{[\s\S]*?metodo: 'Transferencia' \}\);\s*\};/, newHandleGastoBoveda);


// 9. handleGasto (Main gasto form)
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

fj = fj.replace(/const handleGasto = async \(e\) => \{[\s\S]*?setFormGasto\(\{ concepto: '', categoria: 'Operativos', monto: '', fecha: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], metodo: 'Caja General' \}\);\s*\};/, newHandleGasto);


// 10. Update useMemo logic for fBovedaTotal
fj = fj.replace(/const fBovedaTotal = fReinversion - gastosBoveda - tTransfBoveda;/, `const fBovedaTotal = saldoBoveda;`);

// 11. Hide "Ajuste manual de saldos" and "Editar porcentaje"
fj = fj.replace(
  /<button onClick=\{\(\) => setIsEditingPct\(true\)\} className="p-0\.5 hover:text-gloss-pink transition-colors" title="Editar porcentaje"><Pencil size=\{12\} \/><\/button>/,
  `{isSuperAdmin && (<button onClick={() => setIsEditingPct(true)} className="p-0.5 hover:text-gloss-pink transition-colors" title="Editar porcentaje"><Pencil size={12} /></button>)}`
);

fj = fj.replace(/<button onClick=\{\(\) => deleteItem/g, `<button className={!isSuperAdmin ? 'hidden' : ''} onClick={() => deleteItem`);

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
console.log('✅ Final Finanzas patch executed successfully.');
