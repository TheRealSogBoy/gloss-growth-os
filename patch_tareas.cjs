const fs = require('fs');

let fj = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');

const regex = /const changeStatus = async \(id, nuevaColumna\) => \{[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\('Error actualizando estado:', err\);[\s\S]*?\}\s*\};/;

const newFunc = `const changeStatus = async (id, nuevaColumna) => {
    setTareas(prev => prev.map(t => String(t.id) === String(id) ? { ...t, estado: nuevaColumna } : t));
    if (selectedTarea && String(selectedTarea.id) === String(id)) {
      setSelectedTarea(prev => ({ ...prev, estado: nuevaColumna }));
    }
    try {
      const { error } = await supabase.from('tareas').update({ estado: nuevaColumna }).eq('id', id);
      if (!error) {
        logAuditoria(user, 'Kanban Tareas', 'EDITAR', \`Tarea movida a columna: \${nuevaColumna}\`);
        alert(\`Tarea movida con éxito a '\${nuevaColumna}'\`);
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };`;

if(fj.match(regex)) {
  fj = fj.replace(regex, newFunc);
  fs.writeFileSync('src/pages/KanbanTareas.jsx', fj, 'utf-8');
  console.log('✅ Patched KanbanTareas');
} else {
  console.log('❌ Could not match changeStatus');
}
