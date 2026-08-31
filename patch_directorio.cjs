const fs = require('fs');

function patchDirectorio() {
  const filePath = 'src/pages/Directorio.jsx';
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Label "Valor Total (Meta)" -> "Valor Total"
  content = content.replace(/<label[^>]*>Valor Total \(Meta\)<\/label>/g, '<label className="block text-xs font-medium mb-1">Valor Total</label>');

  // 2. Document Number numeric only
  content = content.replace(
    /onChange=\{e=>handleContactoChange\(idx,\s*'numDoc',\s*e\.target\.value\)\}/g,
    "onChange={e=>handleContactoChange(idx, 'numDoc', e.target.value.replace(/\\D/g, ''))}"
  );

  // 3. Plan Pagos logic in handlePlanPagoChange
  // Find handlePlanPagoChange definition
  const planPagoChangeRegex = /const handlePlanPagoChange = \(index, field, value\) => \{\s*const updated = \[\.\.\.form\.contrato\.planPagos\];\s*updated\[index\] = \{ \.\.\.updated\[index\], \[field\]: value \};\s*setForm\(\{ \.\.\.form, contrato: \{ \.\.\.form\.contrato, planPagos: updated \}\}\);\s*\};/;
  
  const planPagoChangeNew = `const handlePlanPagoChange = (index, field, value) => {
    const updated = [...form.contrato.planPagos];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'concepto') {
      const valorTotal = Number(form.contrato.valor) || 0;
      if (value === 'Pago Completo') {
        updated[index].monto = valorTotal;
      } else if (value.includes('50%')) {
        updated[index].monto = valorTotal / 2;
      }
    }
    
    if (field === 'monto') {
      const valorTotal = Number(form.contrato.valor) || 0;
      if (Number(value) > valorTotal) {
        updated[index].monto = valorTotal;
      }
    }
    
    setForm({ ...form, contrato: { ...form.contrato, planPagos: updated }});
  };`;
  
  content = content.replace(planPagoChangeRegex, planPagoChangeNew);

  // 4. Prefix for WhatsApp
  // We'll replace the WhatsApp input completely
  const waInputRegex = /<div><label className="block text-xs font-medium mb-1">WhatsApp \(Móvil\)<\/label><input required value=\{c\.telefono\} onChange=\{e=>handleContactoChange\(idx, 'telefono', e\.target\.value\)\} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"\/><\/div>/;
  
  const waInputNew = `<div>
    <label className="block text-xs font-medium mb-1">WhatsApp (Móvil)</label>
    <div className="flex gap-2">
      <select 
        value={c.prefix || '+57'} 
        onChange={e => {
          const newPrefix = e.target.value;
          handleContactoChange(idx, 'prefix', newPrefix);
          if (c.telefonoRaw) {
             handleContactoChange(idx, 'telefono', \`\${newPrefix} \${c.telefonoRaw}\`);
          }
        }} 
        className="px-2 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"
      >
        <option value="+57">🇨🇴 +57</option>
        <option value="+1">🇺🇸 +1</option>
        <option value="+52">🇲🇽 +52</option>
        <option value="+34">🇪🇸 +34</option>
        <option value="+54">🇦🇷 +54</option>
        <option value="+56">🇨🇱 +56</option>
        <option value="+51">🇵🇪 +51</option>
      </select>
      <input 
        required 
        value={c.telefonoRaw !== undefined ? c.telefonoRaw : (c.telefono?.includes(' ') ? c.telefono.split(' ').slice(1).join(' ') : c.telefono)} 
        onChange={e => {
          const newRaw = e.target.value.replace(/\\D/g, '');
          const currentPrefix = c.prefix || (c.telefono?.includes(' ') ? c.telefono.split(' ')[0] : '+57');
          handleContactoChange(idx, 'telefonoRaw', newRaw);
          handleContactoChange(idx, 'telefono', \`\${currentPrefix} \${newRaw}\`);
          if(!c.prefix) handleContactoChange(idx, 'prefix', currentPrefix);
        }} 
        className="flex-1 px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"
      />
    </div>
  </div>`;
  
  content = content.replace(waInputRegex, waInputNew);
  
  // NOTE: The previous regex might fail due to formatting differences, let's just use string replace for WhatsApp
  // Wait, let's check the exact string of the WhatsApp input in the file
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log("Directorio patched.");
}

patchDirectorio();
