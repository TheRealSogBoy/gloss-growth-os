const fs = require('fs');

function patchKanban(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Update board container for snap and mobile flex
  const boardRegex = /<div className="flex-1 overflow-x-auto custom-scrollbar">[\s\S]*?<div className="flex gap-6 min-w-max pb-4 h-full items-start">/;
  const newBoard = `<div className="flex-1 overflow-x-auto custom-scrollbar snap-x snap-mandatory touch-manipulation">
        <div className="flex gap-4 md:gap-6 min-w-max pb-4 h-full items-start flex-nowrap px-2 md:px-0">`;
  
  // 2. Update Column styling (touch-action manipulation + width fixes + snap)
  // For Clientes: "w-[320px] bg-gray-50/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-full shadow-sm"
  // For Tareas: "w-[320px] bg-gray-100 dark:bg-gray-900/60 rounded-2xl flex flex-col max-h-full border border-gray-200 dark:border-gray-800"
  
  if (filePath.includes('Clientes')) {
    const colRegex = /className="w-\[320px\] bg-gray-50\/90 dark:bg-gray-900\/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-full shadow-sm"/;
    const newCol = `className="w-[85vw] sm:w-[320px] min-w-[280px] md:min-w-[320px] snap-center touch-manipulation bg-gray-50/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh] md:max-h-full shadow-sm"`;
    content = content.replace(colRegex, newCol);
    
    // Draggable card
    const cardRegex = /className={`bg-white dark:bg-gloss-black p-4 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing group relative hover:border-gloss-burgundy\/40 border-2 \${remarketingStatus\?\.urgent \? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}/;
    const newCard = "className={`bg-white dark:bg-gloss-black p-4 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing group relative hover:border-gloss-burgundy/40 border-2 touch-none ${remarketingStatus?.urgent ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}";
    content = content.replace(cardRegex, newCard);
  } else if (filePath.includes('Tareas')) {
    const colRegex = /className="w-\[320px\] bg-gray-100 dark:bg-gray-900\/60 rounded-2xl flex flex-col max-h-full border border-gray-200 dark:border-gray-800"/;
    const newCol = `className="w-[85vw] sm:w-[320px] min-w-[280px] md:min-w-[320px] snap-center touch-manipulation bg-gray-100 dark:bg-gray-900/60 rounded-2xl flex flex-col max-h-[80vh] md:max-h-full border border-gray-200 dark:border-gray-800"`;
    content = content.replace(colRegex, newCol);
    
    // Draggable card
    const cardRegex = /className="bg-white dark:bg-gloss-black p-3.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-gloss-burgundy\/50 transition-all group relative"/;
    const newCard = `className="bg-white dark:bg-gloss-black p-3.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-gloss-burgundy/50 transition-all group relative touch-none"`;
    content = content.replace(cardRegex, newCard);
  }

  content = content.replace(boardRegex, newBoard);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Patched layout and touch classes in ${filePath}`);
}

patchKanban('src/pages/KanbanClientes.jsx');
patchKanban('src/pages/KanbanTareas.jsx');
