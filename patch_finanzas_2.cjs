const fs = require('fs');

let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const useMemoRegex = /const \{[\s\S]*?\} = useMemo\(\(\) => \{[\s\S]*?const tIngresos = ingresos\.reduce[\s\S]*?return \{[\s\S]*?\};\s*\}, \[ingresos, gastos, gastosFijos, comprasTDC, retiros, transferenciasBoveda, porcentajeBoveda\]\);/;

const newUseMemo = `const { 
    totalIngresos, totalGastosEfectivo, utilidadBrutaMes, 
    cajaDisponible, fondoTotalBoveda, 
    saldoDavilson, saldoSantiago,
    totalTDC
  } = useMemo(() => {
    const tIngresos = ingresos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    // Gastos que afectan caja general (Cuentas que no son Bóveda ni Socios)
    const tGastosVar = gastos.filter(g => !['Bóveda de Agencia', 'Cuenta Davilson', 'Cuenta Santiago'].includes(g.metodo)).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosFijos = gastosFijos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosCaja = tGastosVar + tGastosFijos; 
    
    // Gastos pagados con fondos específicos
    const gastosDavilson = gastos.filter(g => g.metodo === 'Cuenta Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const gastosSantiago = gastos.filter(g => g.metodo === 'Cuenta Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Transferencias desde Bóveda a socios (modelo anterior)
    const transfDavilson = transferenciasBoveda.filter(t => t.socio === 'Davilson' || (t.tipo === 'transferencia' && t.destino === 'Davilson')).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const transfSantiago = transferenciasBoveda.filter(t => t.socio === 'Santiago' || (t.tipo === 'transferencia' && t.destino === 'Santiago')).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // NUEVO: Distribuciones manuales desde Caja General
    const distribucionesCaja = transferenciasBoveda.filter(t => t.tipo === 'distribucion_caja');
    const distBoveda = distribucionesCaja.filter(d => d.destino === 'Bóveda').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distOperacion = distribucionesCaja.filter(d => d.destino === 'Fondo Operación').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distDavilson = distribucionesCaja.filter(d => d.destino === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distSantiago = distribucionesCaja.filter(d => d.destino === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    const tDistribuciones = distBoveda + distOperacion + distDavilson + distSantiago;

    const tTDC = comprasTDC.reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Utilidad Bruta (Ingresos - Gastos operacionales de caja)
    const uBruta = tIngresos - tGastosCaja;
    
    // CAJA GENERAL DISPONIBLE (U. Bruta - lo que se ha distribuido manual)
    const cDisponible = uBruta - tDistribuciones;

    // Retiros Socios
    const retirosDavilson = retiros.filter(r => r.socio === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const retirosSantiago = retiros.filter(r => r.socio === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Saldo Final Bóveda (ahora manual)
    const fBovedaTotal = saldoBoveda; // Ya viene del estado global

    // Saldo Socios (Transferencias/Distribuciones a favor - Retiros - Gastos personales)
    const sDavilson = distDavilson + transfDavilson - retirosDavilson - gastosDavilson;
    const sSantiago = distSantiago + transfSantiago - retirosSantiago - gastosSantiago;

    return {
      totalIngresos: tIngresos,
      totalGastosEfectivo: tGastosCaja,
      utilidadBrutaMes: uBruta,
      cajaDisponible: cDisponible,
      fondoTotalBoveda: fBovedaTotal,
      saldoDavilson: sDavilson,
      saldoSantiago: sSantiago,
      totalTDC: tTDC
    };
  }, [ingresos, gastos, gastosFijos, comprasTDC, retiros, transferenciasBoveda, saldoBoveda]);`;

if (fj.match(useMemoRegex)) {
  fj = fj.replace(useMemoRegex, newUseMemo);
  fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
  console.log('✅ useMemo patched successfully.');
} else {
  // Let's try matching with relaxed regex because of encoding and spaces
  const relaxedMemo = /const \{[\s\S]*?\} = useMemo\(\(\) => \{[\s\S]*?return \{[\s\S]*?\};\s*\}, \[ingresos, gastos, gastosFijos, comprasTDC, retiros, transferenciasBoveda, porcentajeBoveda\]\);/;
  if (fj.match(relaxedMemo)) {
    fj = fj.replace(relaxedMemo, newUseMemo);
    fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
    console.log('✅ useMemo patched successfully with relaxed regex.');
  } else {
    console.log('❌ Could not match useMemo.');
  }
}
