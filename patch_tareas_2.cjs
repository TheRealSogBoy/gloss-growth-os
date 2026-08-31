const fs = require('fs');
let kt = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');

const target = `                            <div className="ml-auto w-6 h-6 rounded-full bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-[10px] font-bold text-gloss-burgundy dark:text-gloss-pink border border-gloss-burgundy/20" title={t.responsable || 'Sin asignar'}>
                              {t.responsable?.substring(0, 2).toUpperCase() || 'SA'}
                            </div>
                          </div>`;

const selectElement = `                            <div className="ml-auto w-6 h-6 rounded-full bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-[10px] font-bold text-gloss-burgundy dark:text-gloss-pink border border-gloss-burgundy/20" title={t.responsable || 'Sin asignar'}>
                              {t.responsable?.substring(0, 2).toUpperCase() || 'SA'}
                            </div>
                          </div>
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
                          </div>`;

// Use simple split-join since regex with CRLF might fail again
if (kt.includes(target)) {
    kt = kt.split(target).join(selectElement);
    console.log("✅ Selector added to KanbanTareas successfully");
} else {
    // Try CRLF normalization
    const ktNorm = kt.replace(/\\r\\n/g, '\\n');
    const targetNorm = target.replace(/\\r\\n/g, '\\n');
    if (ktNorm.includes(targetNorm)) {
        kt = ktNorm.split(targetNorm).join(selectElement);
        console.log("✅ Selector added to KanbanTareas (CRLF normalized) successfully");
    } else {
        console.log("❌ Target string not found in KanbanTareas");
    }
}
fs.writeFileSync('src/pages/KanbanTareas.jsx', kt, 'utf-8');
