const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

// Replace all .filter( with ?.filter( or just add a fallback inside useMemo
const safeUseMemo = `const tIngresos = (ingresos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    // Gastos que afectan caja general (Cuentas que no son Bóveda ni Socios)
    const tGastosVar = (gastos || []).filter(g => !['Bóveda de Agencia', 'Cuenta Davilson', 'Cuenta Santiago'].includes(g.metodo)).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosFijos = (gastosFijos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosCaja = tGastosVar + tGastosFijos; 
    
    // Gastos pagados con fondos específicos
    const gastosDavilson = (gastos || []).filter(g => g.metodo === 'Cuenta Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const gastosSantiago = (gastos || []).filter(g => g.metodo === 'Cuenta Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Transferencias desde Bóveda a socios (modelo anterior)
    const transfDavilson = (transferenciasBoveda || []).filter(t => t.socio === 'Davilson' || (t.tipo === 'transferencia' && t.destino === 'Davilson')).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const transfSantiago = (transferenciasBoveda || []).filter(t => t.socio === 'Santiago' || (t.tipo === 'transferencia' && t.destino === 'Santiago')).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // NUEVO: Distribuciones manuales desde Caja General
    const distribucionesCaja = (transferenciasBoveda || []).filter(t => t.tipo === 'distribucion_caja');
    const distBoveda = distribucionesCaja.filter(d => d.destino === 'Bóveda').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distOperacion = distribucionesCaja.filter(d => d.destino === 'Fondo Operación').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distDavilson = distribucionesCaja.filter(d => d.destino === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distSantiago = distribucionesCaja.filter(d => d.destino === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    const tDistribuciones = distBoveda + distOperacion + distDavilson + distSantiago;

    const tTDC = (comprasTDC || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Utilidad Bruta (Ingresos - Gastos operacionales de caja)
    const uBruta = tIngresos - tGastosCaja;
    
    // CAJA GENERAL DISPONIBLE (U. Bruta - lo que se ha distribuido manual)
    const cDisponible = uBruta - tDistribuciones;

    // Retiros Socios
    const retirosDavilson = (retiros || []).filter(r => r.socio === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const retirosSantiago = (retiros || []).filter(r => r.socio === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);`;

// Find the block inside useMemo
const startMarker = `const tIngresos = ingresos.reduce((acc, curr) => acc + Number(curr.monto), 0);`;
const endMarker = `const retirosSantiago = retiros.filter(r => r.socio === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);`;

let idxStart = f.indexOf(startMarker);
let idxEnd = f.indexOf(endMarker);

if (idxStart !== -1 && idxEnd !== -1) {
  f = f.substring(0, idxStart) + safeUseMemo + f.substring(idxEnd + endMarker.length);
  fs.writeFileSync('src/pages/Finanzas.jsx', f);
  console.log('✅ Safed useMemo variables.');
} else {
  // Relaxed regex replacement if exact strings differ
  const regex = /const tIngresos = ingresos\.reduce[\s\S]*?const retirosSantiago = retiros\.filter\([^)]+\)\.reduce\([^)]+\);/m;
  if (f.match(regex)) {
    f = f.replace(regex, safeUseMemo);
    fs.writeFileSync('src/pages/Finanzas.jsx', f);
    console.log('✅ Safed useMemo variables (relaxed).');
  } else {
    console.log('❌ Could not find useMemo block to safe.');
  }
}
