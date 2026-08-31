const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. Check isSuperAdmin
if (!fj.includes('const { user, isSuperAdmin } = useAuth();')) {
  fj = fj.replace(
    /const { user } = useAuth\(\);/,
    `const { user, isSuperAdmin } = useAuth();`
  );
}

// 2. Add saldoBoveda state
if (!fj.includes('const [saldoBoveda, setSaldoBoveda] = useState(0);')) {
  fj = fj.replace(
    /const \[porcentajeBoveda, setPorcentajeBoveda\] = useState\(15\);/,
    `const [porcentajeBoveda, setPorcentajeBoveda] = useState(15);\n  const [saldoBoveda, setSaldoBoveda] = useState(0);`
  );
}

// 3. Update fetchData
const oldFetchData = `
  const fetchData = useCallback(async () => {
    try {
      // Cargar porcentaje de bveda de localStorage o Supabase
      const savedPct = localStorage.getItem('gloss_porcentaje_boveda');
      if (savedPct) {
        const parsed = Number(savedPct);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          setPorcentajeBoveda(parsed);
          setTempPct(parsed);
        }
      }

      // Cargar transferencias de bveda de localStorage
      const savedTransf = localStorage.getItem('gloss_transferencias_boveda');
      if (savedTransf) {
        try {
          setTransferenciasBoveda(JSON.parse(savedTransf));
        } catch (e) {}
      }

      const [ing, gas, gf, tdc, deu, ret, tf, cl, audit] = await Promise.all([
        supabase.from('finanzas_ingresos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos_fijos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_tdc').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_deudas').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_retiros').select('*').order('created_at', { ascending: false }),
        supabase.from('tareas').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('historial_auditoria').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (audit && audit.data) setAuditLogs(audit.data);
`;

const newFetchData = `
  const fetchData = useCallback(async () => {
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

// regex for old fetchData, it can be tricky due to CRLF, so we use replace with strings and remove spaces
fj = fj.replace(/const fetchData = useCallback\(async \(\) => \{\s*try \{\s*\/\/ Cargar porcentaje[\s\S]*?if \(audit && audit\.data\) setAuditLogs\(audit\.data\);/, newFetchData.trim());

// 4. Modificar handleSavePorcentaje
fj = fj.replace(
  /localStorage\.setItem\('gloss_porcentaje_boveda', String\(val\)\);\s*try \{\s*await supabase\.from\('finanzas_config'\)\.upsert\(\[\{ id: 'default', porcentaje_boveda: val \}\]\);\s*\} catch \(e\) \{\}/,
  `try { await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_ahorro_porcentaje: val }]); } catch (e) {}`
);

// 5. Update deleteItem
fj = fj.replace(
  /const deleteItem = async \(tabla, setter, list, id\) => \{/,
  `const deleteItem = async (tabla, setter, list, id) => {
    if (!isSuperAdmin) {
      alert("No tienes permisos de Super Admin para eliminar transacciones.");
      return;
    }`
);

fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
console.log('✅ Applied phase 1 of Finanzas patch');
