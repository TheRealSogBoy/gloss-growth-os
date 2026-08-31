const fs = require('fs');

function patchCatalogo() {
  const filePath = 'src/pages/Catalogo.jsx';
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Remove disabled from Precio Principal
  content = content.replace(
    /disabled=\{svcForm\.tipoPrecio === 'custom'\}/g,
    ""
  );

  // 2. Fix the Modal layout for isSvcOpen
  const svcModalRegex = /\{isSvcOpen && svcForm && \([\s\S]*?<div className="fixed inset-0 bg-black\/60 z-\[70\] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">[\s\S]*?<div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">[\s\S]*?<button onClick=\{\(\) => setSvcOpen\(false\)\} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size=\{18\}\/><\/button>[\s\S]*?<h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted border-b border-gray-100 dark:border-gray-800 pb-4">\{svcForm\.id \? 'Editar Servicio' : 'Nuevo Servicio'\}<\/h3>[\s\S]*?<form onSubmit=\{saveSvc\} className="space-y-4">/;
  
  // Wait, let's do this safely using indexOf and slice, or just precise replace.
  const oldModalStart = `{isSvcOpen && svcForm && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">
            <button onClick={() => setSvcOpen(false)} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size={18}/></button>
            <h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted border-b border-gray-100 dark:border-gray-800 pb-4">{svcForm.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
            <form onSubmit={saveSvc} className="space-y-4">`;

  const newModalStart = `{isSvcOpen && svcForm && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 dark:border-gray-800 relative flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">{svcForm.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
              <button onClick={() => setSvcOpen(false)} className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full text-gray-500 hover:text-gray-800 transition-colors"><X size={16}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="svc-form" onSubmit={saveSvc} className="space-y-4">`;
              
  const oldModalEnd = `<div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 shadow-md">Guardar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}`;

  const newModalEnd = `</form>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex-shrink-0">
              <button form="svc-form" type="submit" className="w-full bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-bold py-2.5 rounded-xl transition-all shadow-md">Guardar Servicio</button>
            </div>
          </div>
        </div>
      )}`;

  // Find exact match
  if (content.includes(oldModalStart)) {
    content = content.replace(oldModalStart, newModalStart);
  } else {
    console.log("Could not find exact oldModalStart");
  }

  if (content.includes(oldModalEnd)) {
    content = content.replace(oldModalEnd, newModalEnd);
  } else {
    console.log("Could not find exact oldModalEnd");
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log("Catalogo patched.");
}

patchCatalogo();
