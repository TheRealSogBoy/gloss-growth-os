const { execSync } = require('child_process');
const fs = require('fs');

const oldFile = execSync('git show 4c6cee0:src/pages/Finanzas.jsx', { encoding: 'utf-8' });

// Extract the missing block
const startIndex = oldFile.indexOf('export default function Finanzas() {');
const useMemoIndex = oldFile.indexOf('const { \n    totalIngresos, totalGastosEfectivo, utilidadBrutaMes, \n    fondoReinversionMes', startIndex);

if (startIndex === -1 || useMemoIndex === -1) {
  console.log("Could not find boundaries in old file.");
  process.exit(1);
}

// Get the block (excluding 'export default function Finanzas() {' itself, or just take it and replace the whole top)
let missingBlock = oldFile.substring(startIndex + 'export default function Finanzas() {'.length, useMemoIndex);

// I must also add the new states for ModalInyectar and ModalDistribuir!
const newStates = `
  const [modalInyectar, setModalInyectar] = useState(false);
  const [formInyectar, setFormInyectar] = useState({ monto: '', motivo: 'Aporte de Capital Propio', notas: '' });
  const [modalDistribuir, setModalDistribuir] = useState(false);
  const [formDistribuir, setFormDistribuir] = useState({ boveda: '', operacion: '', davilson: '', santiago: '' });
`;

// Insert new states right after formGastoBoveda
missingBlock = missingBlock.replace(
  "const [formGastoBoveda, setFormGastoBoveda] = useState({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });",
  "const [formGastoBoveda, setFormGastoBoveda] = useState({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });\n" + newStates
);

// Now read current file
let currentFile = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// Replace export default function Finanzas() { with itself + missing block
currentFile = currentFile.replace(
  'export default function Finanzas() {',
  'export default function Finanzas() {' + missingBlock
);

fs.writeFileSync('src/pages/Finanzas.jsx', currentFile);
console.log("✅ Restored missing states and variables!");
