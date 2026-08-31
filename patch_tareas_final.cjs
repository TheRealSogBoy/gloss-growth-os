const fs = require('fs');

let kt = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');

// The exact structure ending the task card:
// <div className="ml-auto w-6 h-6 rounded-full bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-[10px] font-bold text-gloss-burgundy dark:text-gloss-pink border border-gloss-burgundy/20" title={t.responsable || 'Sin asignar'}>
//   {t.responsable?.substring(0, 2).toUpperCase() || 'SA'}
// </div>
// </div>
// </div>

const regex = /(<div className="ml-auto w-6 h-6 rounded-full bg-gloss-burgundy\/10 dark:bg-gloss-pink\/10 flex items-center justify-center text-\[10px\] font-bold text-gloss-burgundy dark:text-gloss-pink border border-gloss-burgundy\/20" title=\{t\.responsable \|\| 'Sin asignar'\}>\s*\{t\.responsable\?\.substring\(0, 2\)\.toUpperCase\(\) \|\| 'SA'\}\s*<\/div>\s*<\/div>)/;

const selectElement = `
                          {/* Selector Rápido */}
                          <div className="relative z-10 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <select 
                              value={t.estado}
                              onChange={(e) => changeStatus(t.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-[10px] sm:text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-gloss-burgundy font-bold cursor-pointer"
                            >
                              {COLUMNAS.map(opt => <option key={opt} value={opt}>Mover a: {opt}</option>)}
                            </select>
                          </div>
`;

if (kt.match(regex)) {
  kt = kt.replace(regex, '$1' + selectElement);
  console.log('✅ Selector injected successfully in KanbanTareas.jsx via regex');
  fs.writeFileSync('src/pages/KanbanTareas.jsx', kt, 'utf-8');
} else {
  console.log('❌ Still could not find exact target block for KanbanTareas');
}
