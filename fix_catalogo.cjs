const fs = require('fs');
let content = fs.readFileSync('src/pages/Catalogo.jsx', 'utf-8');

// The original modal starts with:
// <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
//   <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">

// We want to replace it entirely to fix the layout AND syntax:
const oldModalRegex = /\{isSvcOpen && svcForm && \([\s\S]*?<div className="fixed inset-0 bg-black\/60 z-\[70\] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">[\s\S]*?<div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">[\s\S]*?<button onClick=\{\(\) => setSvcOpen\(false\)\} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size=\{18\}\/><\/button>[\s\S]*?<h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted border-b border-gray-100 dark:border-gray-800 pb-4">\{svcForm\.id \? 'Editar Servicio' : 'Nuevo Servicio'\}<\/h3>[\s\S]*?<form onSubmit=\{saveSvc\} className="space-y-4">/;

const newModalStart = `{isSvcOpen && svcForm && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 dark:border-gray-800 relative flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">{svcForm.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
              <button onClick={() => setSvcOpen(false)} className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full text-gray-500 hover:text-gray-800 transition-colors"><X size={16}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="svc-form" onSubmit={saveSvc} className="space-y-4">`;

content = content.replace(oldModalRegex, newModalStart);

// Now the end part
const oldModalEndRegex = /<\/form>\s*<\/div>\s*<div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900\/50 rounded-b-2xl flex-shrink-0">\s*<button form="svc-form" type="submit" className="w-full bg-gloss-burgundy hover:bg-gloss-burgundy\/90 text-white font-bold py-2\.5 rounded-xl transition-all shadow-md">Guardar Servicio<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)}/;

const newModalEnd = `              </form>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex-shrink-0">
              <button form="svc-form" type="submit" className="w-full bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-bold py-2.5 rounded-xl transition-all shadow-md">Guardar Servicio</button>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(oldModalEndRegex, newModalEnd);

fs.writeFileSync('src/pages/Catalogo.jsx', content, 'utf-8');
