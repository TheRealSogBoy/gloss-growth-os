const fs = require('fs');

let kt = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');

// 1. Add changeStatus function right below onDrop
const changeStatusFunc = `
  const changeStatus = async (id, nuevaColumna) => {
    setTareas(prev => prev.map(t => String(t.id) === String(id) ? { ...t, estado: nuevaColumna } : t));
    if (selectedTarea && String(selectedTarea.id) === String(id)) {
      setSelectedTarea(prev => ({ ...prev, estado: nuevaColumna }));
    }
    try {
      const { error } = await supabase.from('tareas').update({ estado: nuevaColumna }).eq('id', id);
      if (!error) {
        logAuditoria(user, 'Kanban Tareas', 'EDITAR', \`Tarea movida a columna: \${nuevaColumna}\`);
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };
`;

const onDropRegex = /const onDrop = async \([\s\S]*?console\.error\([\s\S]*?\}\s*};\s*/;
if (kt.match(onDropRegex)) {
  const match = kt.match(onDropRegex)[0];
  if (!kt.includes('const changeStatus = async')) {
    kt = kt.replace(match, match + changeStatusFunc);
    console.log("✅ Added changeStatus function in KanbanTareas");
  }
}

// 2. Add Select element in card rendering
// We look for where the badges section ends, right before closing the card div
const cardEndRegex = /(<div className="flex -space-x-2">[\s\S]*?<\/div>\s*<\/div>\s*)(<\/div>\s*\);\s*\}\)\s*\}\s*<\/div>)/;

if (kt.match(cardEndRegex)) {
  const match = kt.match(cardEndRegex);
  
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
  
  kt = kt.replace(match[0], match[1] + selectElement + match[2]);
  console.log("✅ Added select element to task cards in KanbanTareas");
} else {
    console.log("❌ Could not find the end of card rendering in KanbanTareas!");
}

fs.writeFileSync('src/pages/KanbanTareas.jsx', kt, 'utf-8');
