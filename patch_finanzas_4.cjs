const fs = require('fs');
let fj = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const oldLibroBovedaRegex = /\/\/ 4\. Transferencias de Bóveda[\s\S]*?transferenciasBoveda\.forEach\(t => \{[\s\S]*?\}\);/m;

const newLibroBoveda = `// 4. Transferencias de Bóveda y Caja Manual
    transferenciasBoveda.forEach(t => {
      if (t.tipo === 'ajuste_porcentaje') return; // Ignorar logs administrativos

      const esDeposito = t.tipo === 'deposito_manual';
      const label = esDeposito ? '[DEPÓSITO]' : '[RETIRO/DISTR]';
      const conceptoFinal = t.concepto || t.motivo || '';

      list.push({
        id: 'trb_' + t.id,
        fecha: t.fecha || 'Reciente',
        created_at: t.created_at || t.fecha,
        tipo: t.tipo === 'distribucion_caja' ? 'Distr. Caja' : 'Mov. Bóveda',
        categoria: 'Mov. Interno',
        concepto: \`\${label} \${conceptoFinal}\`,
        origenDestino: t.destino || t.socio || 'Bóveda',
        monto: Number(t.monto),
        esTransferencia: !esDeposito, // Red/Blue for withdrawal/distribution
        esPositivo: esDeposito // Green for deposits
      });
    });`;

if (fj.match(oldLibroBovedaRegex)) {
  fj = fj.replace(oldLibroBovedaRegex, newLibroBoveda);
  fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
  console.log('✅ Patched Libro Mayor for Bóveda/Caja history');
} else {
  // Relaxed regex for encoding issues
  const relaxedLibroBovedaRegex = /\/\/ 4\. Transferencias de B[^:]*veda[\s\S]*?transferenciasBoveda\.forEach\(t => \{[\s\S]*?\}\);/m;
  if (fj.match(relaxedLibroBovedaRegex)) {
    fj = fj.replace(relaxedLibroBovedaRegex, newLibroBoveda);
    fs.writeFileSync('src/pages/Finanzas.jsx', fj, 'utf-8');
    console.log('✅ Patched Libro Mayor for Bóveda/Caja history with relaxed regex');
  } else {
    console.log('❌ Could not match Libro Mayor for Bóveda');
  }
}
