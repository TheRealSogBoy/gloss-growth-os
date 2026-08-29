import { useState, useMemo } from 'react';
import { 
  Search, Plus, Map, Megaphone, Monitor, LayoutTemplate, 
  Share2, Briefcase, ChevronDown, ChevronUp, CheckCircle2, 
  FileText, ShoppingCart, Trash2, X, User, Pencil, Download
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_CATALOGO = [
  {
     nombre: 'Pauta Digital (Meta Ads)', categoria: 'Publicidad',
    tipoPrecio: 'base', precio: 600000, precioMax: null, icono: 'Megaphone',
    color: 'bg-orange-100 text-orange-600',
    descripcion: 'Diseño, montaje y optimización de campañas publicitarias en Meta.',
    entregables: [
      'Análisis profundo de público objetivo',
      'Creación de creativos (Copys y Diseño base)',
      'Configuración avanzada de Business Manager',
      'Optimización semanal y escalado de pauta',
      'Reporte de métricas mensual',
    ],
  },
  {
     nombre: 'Gestión de Redes Sociales', categoria: 'Contenido',
    tipoPrecio: 'rango', precio: 800000, precioMax: 1500000, icono: 'Share2',
    color: 'bg-pink-100 text-pink-600',
    descripcion: 'Administración de perfiles, grilla de contenidos y Reels según el plan.',
    entregables: [
      'Parrilla mensual estratégica de contenidos',
      'Edición de Reels y diseño de Carruseles',
      'Estrategia de crecimiento orgánico e identidad visual',
      'Interacción comunitaria (respuestas a comentarios)',
      'Programación automatizada de publicaciones',
    ],
  },
  {
     nombre: 'Página Web Corporativa', categoria: 'Desarrollo Web',
    tipoPrecio: 'base', precio: 730000, precioMax: null, icono: 'Monitor',
    color: 'bg-blue-100 text-blue-600',
    descripcion: 'Sitio web profesional y escalable para marcas médicas o estéticas.',
    entregables: [
      'Hasta 5 secciones interiores detalladas',
      'Diseño Responsivo (móviles y tablets)',
      'Arquitectura SEO inicial (Velocidad y Etiquetas)',
      'Integración con WhatsApp y Redes Sociales',
      'Dominio corporativo y SSL por 1 año',
    ],
  },
  {
     nombre: 'Landing Page Comercial', categoria: 'Desarrollo Web',
    tipoPrecio: 'fijo', precio: 490000, precioMax: null, icono: 'LayoutTemplate',
    color: 'bg-cyan-100 text-cyan-600',
    descripcion: 'Página de aterrizaje de alta conversión para captura de leads.',
    entregables: [
      'Diseño UX/UI orientado a conversión',
      'Integración con Formularios de Captura',
      'Copywriting persuasivo y ganchos comerciales',
      'Optimización de carga rápida',
      'Dominio y Hosting por 1 año',
    ],
  },
  {
     nombre: 'SEO Local Omnicanal', categoria: 'Posicionamiento',
    tipoPrecio: 'custom', precio: 350000, precioMax: null, icono: 'Map',
    color: 'bg-green-100 text-green-600',
    descripcion: 'Dominio de búsquedas geolocalizadas para atraer pacientes locales.',
    entregables: [
      'Perfil Optimizado en Google Business Profile',
      'Presencia activa en Apple Maps',
      'Presencia en OpenStreetMap',
      'Creación y optimización en Doctoralia',
      'Aparición en directorios médicos de nicho',
    ],
  },
  {
     nombre: 'Consultoría Estratégica', categoria: 'Asesoría',
    tipoPrecio: 'custom', precio: 250000, precioMax: null, icono: 'Briefcase',
    color: 'bg-purple-100 text-purple-600',
    descripcion: 'Asesoría de alto nivel, reestructuración de ofertas y planes de crecimiento.',
    entregables: [
      'Auditoría profunda del negocio actual',
      'Diseño de rutas comerciales y nuevas ofertas',
      'Optimización de protocolos del equipo de ventas',
      'Sesiones de seguimiento quincenal o mensual',
    ],
  },
];

const CATEGORIAS = ['Todas', 'Publicidad', 'Contenido', 'Desarrollo Web', 'Posicionamiento', 'Asesoría'];

const CLIENTES_MOCK = [
  {  nombre: 'SkinGlow Spa', contacto: 'Laura Martínez', ciudad: 'Bogotá', documento: 'NIT 901.234.567-8' },
  {  nombre: 'Dr. Aesthetic Clinic', contacto: 'Carlos Ruiz', ciudad: 'CDMX', documento: 'RFC AES980214XYZ' },
  {  nombre: 'Dra. Elena Derma', contacto: 'Elena Gómez', ciudad: 'Medellín', documento: 'CC 1.020.333.444' },
];

const ICON_MAP = {
  Megaphone, Share2, Monitor, LayoutTemplate, Map, Briefcase,
};

// Contador correlativo en memoria (reset al recargar, suficiente para demo)
let quoteCounter = 1000;

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0);

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR DE PDF  — jsPDF + jspdf-autotable (100% datos en memoria, sin DOM)
// ─────────────────────────────────────────────────────────────────────────────
async function generarPDF({ cliente, cart, terminos, total, agencia }) {
  // Importación dinámica (lazy). Solo se carga cuando el usuario pulsa "Descargar".
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  // jspdf-autotable se instala como plugin vía su default export
  const autoTable = autoTableMod.default ?? autoTableMod;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W   = doc.internal.pageSize.getWidth();
  const M   = 15;      // margen lateral
  const CW  = W - M * 2; // ancho útil
  const NUM = String(++quoteCounter);
  const fechaEmision   = new Date();
  const fechaVencimiento = new Date(Date.now() + 15 * 86400000);
  const fmtDate = (d) => d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const nombreAgencia = (agencia?.nombre || 'GLOSS GROWTH').toUpperCase();
  const lemaAgencia = agencia?.lema || 'Soluciones Estratégicas para el Sector Salud & Estética';
  const nitAgencia = agencia?.nit ? ` • ${agencia.nit}` : '';
  const ciudadAgencia = agencia?.ciudad || 'Medellín, Colombia';

  // ── Paleta corporativa (R,G,B) ──────────────────────────────────────
  const BURGUNDY   = [140, 37, 54];
  const PINK_LIGHT = [253, 164, 175];
  const DARK       = [53, 41, 37];
  const GRAY       = [107, 114, 128];
  const GRAY_LIGHT = [243, 244, 246];
  const WHITE      = [255, 255, 255];

  let y = 0; // cursor vertical

  // ── 1. Barra superior degradada (simulada con dos rect) ─────────────
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, 0, W / 2, 8, 'F');
  doc.setFillColor(...PINK_LIGHT);
  doc.rect(W / 2, 0, W / 2, 8, 'F');

  y = 18;

  // ── 2. Membrete ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...BURGUNDY);
  doc.text(nombreAgencia, M, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`${lemaAgencia}${nitAgencia}`, M, y + 5.5);
  if (agencia?.direccion || agencia?.telefono) {
    const contactLine = [agencia.direccion, ciudadAgencia, agencia.telefono].filter(Boolean).join(' • ');
    doc.setFontSize(7.5);
    doc.text(contactLine, M, y + 9.5);
  }

  // Número + fechas (columna derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(`Cotización #${NUM}`, W - M, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Emisión: ${fmtDate(fechaEmision)}`, W - M, y + 6, { align: 'right' });
  doc.text(`Válido hasta: ${fmtDate(fechaVencimiento)}`, W - M, y + 11, { align: 'right' });

  // Línea divisoria
  y += 18;
  doc.setDrawColor(...BURGUNDY);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 8;

  // ── 3. Bloque de cliente (cuadrícula 2 col) ───────────────────────
  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(M, y, CW, 30, 3, 3, 'F');

  const col1x = M + 5;
  const col2x = M + CW / 2 + 5;

  const drawField = (label, value, x, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(value || '—', x, yy + 5);
  };

  drawField('Nombre / Razón Social', cliente.nombre, col1x, y + 7);
  drawField('Ciudad', cliente.ciudad, col2x, y + 7);
  drawField('Contacto Principal', cliente.contacto, col1x, y + 19);
  drawField('NIT / Documento', cliente.documento, col2x, y + 19);

  y += 36;

  // ── 4. Título de sección ──────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('DETALLE DE SERVICIOS', M, y);
  y += 4;

  // ── 5. Tabla de servicios (jspdf-autotable) ───────────────────────
  // Construimos las filas: una por cada entregable para máxima claridad.
  const bodyRows = [];

  cart.forEach((item, idx) => {
    // Fila de nombre del servicio (encabezado del grupo)
    bodyRows.push([
      { content: item.nombre, colSpan: 2, styles: { fontStyle: 'bold', textColor: BURGUNDY, fontSize: 10, cellPadding: { top: 4, bottom: 1, left: 3 } } },
      { content: fmt(item.precioFinal), styles: { fontStyle: 'bold', halign: 'right', textColor: DARK, fontSize: 10, cellPadding: { top: 4, bottom: 1, right: 3 } } },
    ]);

    // Descripción en cursiva
    bodyRows.push([
      { content: item.descripcion, colSpan: 2, styles: { fontStyle: 'italic', textColor: GRAY, fontSize: 8, cellPadding: { top: 0, bottom: 3, left: 3 } } },
      { content: '', styles: { cellPadding: 0 } },
    ]);

    // Entregables
    item.entregables.forEach((ent) => {
      bodyRows.push([
        { content: '• ' + ent, colSpan: 2, styles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 1, bottom: 1, left: 6 } } },
        { content: '', styles: { cellPadding: 0 } },
      ]);
    });

    // Separador entre ítems (excepto el último)
    if (idx < cart.length - 1) {
      bodyRows.push([
        { content: '', colSpan: 3, styles: { lineColor: GRAY_LIGHT, lineWidth: 0.3, minCellHeight: 2, cellPadding: 1 } },
      ]);
    }
  });

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [[
      { content: 'Servicio', styles: { halign: 'left' } },
      { content: 'Entregables Incluidos', styles: { halign: 'left' } },
      { content: 'Inversión', styles: { halign: 'right' } },
    ]],
    body: bodyRows,
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
    },
    headStyles: {
      fillColor: BURGUNDY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.2,
    styles: { overflow: 'linebreak', cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.2 },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── 6. Cuadro de total ────────────────────────────────────────────
  const boxH = 22;
  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(W - M - 80, y, 80, boxH, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('TOTAL INVERSIÓN', W - M - 40, y + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BURGUNDY);
  doc.text(fmt(total), W - M - 40, y + 17, { align: 'center' });

  y += boxH + 10;

  // ── 7. Cláusulas comerciales ──────────────────────────────────────
  // Verificar que quepan en la misma página
  const pageH = doc.internal.pageSize.getHeight();
  if (y + 40 > pageH - 20) { doc.addPage(); y = 20; }

  doc.setFillColor(255, 251, 235); // amber-50
  const clausH = 8 + doc.splitTextToSize(terminos, CW - 10).length * 4.5;
  doc.roundedRect(M, y, CW, clausH, 3, 3, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, clausH, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('TÉRMINOS COMERCIALES Y ACUERDOS', M + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(terminos, CW - 10);
  doc.text(lines, M + 4, y + 12);

  y += clausH + 8;

  // ── 8. Firmas ─────────────────────────────────────────────────────
  if (y + 30 < pageH - 15) {
    const sigW = (CW - 20) / 2;
    [
      { label: `Agencia: ${agencia?.nombre || 'Gloss Growth OS'}`, x: M },
      { label: `Cliente: ${cliente.nombre}`, x: M + sigW + 20 },
    ].forEach(({ label, x }) => {
      doc.setDrawColor(...GRAY);
      doc.setLineWidth(0.4);
      doc.line(x, y + 18, x + sigW, y + 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(label, x, y + 23);
    });
    y += 30;
  }

  // ── 9. Pie de página ──────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BURGUNDY);
    doc.rect(0, pageH - 8, W, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(
      `Cotización #${NUM}  •  ${agencia?.nombre || 'Gloss Growth OS'}  •  Documento Confidencial  •  Página ${i} de ${totalPages}`,
      W / 2, pageH - 3, { align: 'center' }
    );
  }

  // ── 10. Descarga binaria directa (funciona en móvil) ──────────────
  const safeName = (cliente.nombre || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Cotizacion_${safeName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Catalogo() {
  const [servicios, setServicios]     = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);

  useEffect(() => {
    const loadServicios = async () => {
      try {
        let { data, error } = await supabase.from('catalogo_servicios').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        
        if (!data || data.length === 0) {
          // seed initial data
          const { data: newSvc, error: insertErr } = await supabase.from('catalogo_servicios').insert(INITIAL_CATALOGO).select();
          if (newSvc) data = newSvc;
        }
        setServicios(data || []);
      } catch (e) {
        console.error('Error loading catalogo:', e);
      } finally {
        setLoadingServicios(false);
      }
    };
    loadServicios();
  }, []);
  const { datosAgencia } = useConfig();
    const [search, setSearch]           = useState('');
  const [filtro, setFiltro]           = useState('Todas');
  const [expandedIds, setExpanded]    = useState([]);
  const [cart, setCart]               = useState([]);
  const [isQuoteOpen, setQuoteOpen]   = useState(false);
  const [isSvcOpen, setSvcOpen]       = useState(false);
  const [isGenerating, setGenerating] = useState(false);
  const [svcForm, setSvcForm]         = useState(null);

  const [form, setForm] = useState({
    clienteId: 'nuevo',
    nombre: '', contacto: '', ciudad: '', documento: '',
    terminos:
      'El presente documento tiene una validez de 15 días calendario.\n' +
      'Condiciones de pago: 50% anticipo al inicio del proyecto y 50% contra entrega.\n' +
      'Los tiempos de ejecución inician a partir de la recepción total de los insumos por parte del cliente.\n' +
      'Gloss Growth OS se reserva el derecho de ajustar condiciones ante cambios sustanciales en el alcance acordado.',
  });

  const toggleExpand = (id) =>
    setExpanded((p) => (p.includes(id) ? p.filter((i) => i !== id) : [...p, id]));

  const filtered = useMemo(
    () =>
      servicios.filter(
        (s) =>
          (filtro === 'Todas' || s.categoria === filtro) &&
          (s.nombre.toLowerCase().includes(search.toLowerCase()) ||
            s.descripcion.toLowerCase().includes(search.toLowerCase()))
      ),
    [servicios, search, filtro]
  );

  const addToCart   = (s) => !cart.find((c) => c.id === s.id) && setCart((p) => [...p, { ...s, precioFinal: s.precio || 0 }]);
  const removeCart  = (id) => setCart((p) => p.filter((c) => c.id !== id));
  const updatePrice = (id, v) => setCart((p) => p.map((c) => (c.id === id ? { ...c, precioFinal: Number(v) } : c)));
  const totalCart   = cart.reduce((a, c) => a + c.precioFinal, 0);

  const clientData = useMemo(() => {
    if (form.clienteId === 'nuevo')
      return { nombre: form.nombre || 'Cliente', contacto: form.contacto || '—', ciudad: form.ciudad || '—', documento: form.documento || '—' };
    return CLIENTES_MOCK.find((c) => c.id === parseInt(form.clienteId)) ?? {};
  }, [form]);

  // Nuevo / Editar Servicio
  const openNew = () => {
    setSvcForm({ id: null, nombre: '', categoria: 'Desarrollo Web', tipoPrecio: 'fijo', precio: 0, precioMax: 0, icono: 'LayoutTemplate', color: 'bg-gray-100 text-gray-600', descripcion: '', entregablesText: '' });
    setSvcOpen(true);
  };
  const openEdit = (s) => { setSvcForm({ ...s, entregablesText: s.entregables.join('\n') }); setSvcOpen(true); };
  const saveSvc = async (e) => {
    e.preventDefault();
    const savedData = { 
      ...svcForm, 
      precio: Number(svcForm.precio) || 0, 
      precioMax: Number(svcForm.precioMax) || null, 
      entregables: svcForm.entregablesText.split('\n').filter((l) => l.trim()) 
    };
    delete savedData.id;
    delete savedData.entregablesText;
    
    if (svcForm.id) {
      const { data, error } = await supabase.from('catalogo_servicios').update(savedData).eq('id', svcForm.id).select();
      if (!error && data) {
        setServicios((p) => p.map((s) => (s.id === svcForm.id ? data[0] : s)));
        setCart((p) => p.map((c) => (c.id === svcForm.id ? { ...c, ...data[0], precioFinal: c.precioFinal } : c)));
      }
    } else {
      const { data, error } = await supabase.from('catalogo_servicios').insert([savedData]).select();
      if (!error && data) {
        setServicios((p) => [...p, data[0]]);
      }
    }
    setSvcOpen(false);
  };

  const PriceBadge = ({ s }) => {
    if (s.tipoPrecio === 'fijo')  return <span className="text-xl font-bold text-gray-900 dark:text-white">{fmt(s.precio)}</span>;
    if (s.tipoPrecio === 'base')  return <div><p className="text-[10px] uppercase font-bold text-gray-500">Desde</p><p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(s.precio)}</p></div>;
    if (s.tipoPrecio === 'rango') return <div><p className="text-[10px] uppercase font-bold text-gray-500">Rango</p><p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(s.precio)} — {fmt(s.precioMax)}</p></div>;
    return <span className="text-sm font-bold italic text-gray-500">A Medida</span>;
  };

  // ── ACCIÓN PRINCIPAL: generar PDF ─────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!cart.length) return;
    setGenerating(true);
    try {
      await generarPDF({ cliente: clientData, cart, terminos: form.terminos, total: totalCart, agencia: datosAgencia });
      setQuoteOpen(false);
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col animate-fade-in pb-12 relative">

      {/* ── HEADER ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Catálogo y Cotizador</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de portafolio y generación de propuestas PDF vectoriales.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
            className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy shadow-sm font-medium cursor-pointer">
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Buscar servicio…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy shadow-sm w-full sm:w-64"/>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 shadow-md transition-opacity">
            <Plus size={16}/> Servicio
          </button>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s) => {
          const isEx   = expandedIds.includes(s.id);
          const inCart = cart.some((c) => c.id === s.id);
          const Ico    = ICON_MAP[s.icono] || Megaphone;
          return (
            <div key={s.id} className={`bg-white dark:bg-gloss-black rounded-2xl border ${inCart ? 'border-gloss-burgundy shadow-md shadow-gloss-burgundy/10' : 'border-gray-200 dark:border-gray-800'} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col relative`}>
              <button onClick={() => openEdit(s)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gloss-burgundy hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Editar"><Pencil size={16}/></button>
              <div className="p-6 pb-5 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.color}`}><Ico size={24}/></div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 pr-8 leading-tight">{s.nombre}</h3>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded mb-4">{s.categoria}</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{s.descripcion}</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800"><PriceBadge s={s}/></div>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => toggleExpand(s.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors text-sm font-bold text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-2"><FileText size={16}/> Ver qué incluye</span>
                  {isEx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {isEx && (
                  <div className="p-5 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <ul className="space-y-2">
                      {s.entregables.map((e, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5"/>{e}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => (inCart ? removeCart(s.id) : addToCart(s))}
                      className={`w-full py-2.5 border-2 rounded-xl font-bold transition-colors ${inCart ? 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400' : 'border-gloss-burgundy text-gloss-burgundy hover:bg-gloss-burgundy hover:text-white dark:border-gloss-pink dark:text-gloss-pink dark:hover:bg-gloss-pink dark:hover:text-black'}`}>
                      {inCart ? '✓ Quitar de Propuesta' : 'Añadir a Propuesta'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Search size={48} className="mb-4 opacity-20"/>
          <p className="text-lg font-medium">No se encontraron servicios</p>
        </div>
      )}

      {/* ── BOTÓN FLOTANTE ── */}
      {cart.length > 0 && !isQuoteOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-scale-in">
          <button onClick={() => setQuoteOpen(true)}
            className="flex items-center gap-3 bg-gloss-burgundy text-white px-6 py-4 rounded-full font-bold shadow-2xl hover:bg-gloss-burgundy/90 hover:scale-105 transition-all">
            <ShoppingCart size={22}/>
            <span>Ver Propuesta PDF ({cart.length})</span>
          </button>
        </div>
      )}

      {/* ── MODAL NUEVO / EDITAR SERVICIO ── */}
      {isSvcOpen && svcForm && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">
            <button onClick={() => setSvcOpen(false)} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size={18}/></button>
            <h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted border-b border-gray-100 dark:border-gray-800 pb-4">{svcForm.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
            <form onSubmit={saveSvc} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Nombre</label>
                <input required value={svcForm.nombre} onChange={(e) => setSvcForm({ ...svcForm, nombre: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Categoría</label>
                  <select value={svcForm.categoria} onChange={(e) => setSvcForm({ ...svcForm, categoria: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    {CATEGORIAS.filter((c) => c !== 'Todas').map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ícono</label>
                  <select value={svcForm.icono} onChange={(e) => setSvcForm({ ...svcForm, icono: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    {Object.keys(ICON_MAP).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tipo de Precio</label>
                  <select value={svcForm.tipoPrecio} onChange={(e) => setSvcForm({ ...svcForm, tipoPrecio: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    <option value="fijo">Fijo</option><option value="base">Base (Desde X)</option><option value="rango">Rango (X a Y)</option><option value="custom">A Medida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Precio Principal</label>
                  <input type="number" value={svcForm.precio} onChange={(e) => setSvcForm({ ...svcForm, precio: e.target.value })} disabled={svcForm.tipoPrecio === 'custom'} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 disabled:opacity-50"/>
                </div>
              </div>
              {svcForm.tipoPrecio === 'rango' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Precio Máximo</label>
                  <input type="number" required value={svcForm.precioMax} onChange={(e) => setSvcForm({ ...svcForm, precioMax: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"/>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Descripción</label>
                <textarea required value={svcForm.descripcion} onChange={(e) => setSvcForm({ ...svcForm, descripcion: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-h-[60px]"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Entregables (uno por línea)</label>
                <textarea required value={svcForm.entregablesText} onChange={(e) => setSvcForm({ ...svcForm, entregablesText: e.target.value })} placeholder={'Entregable 1\nEntregable 2…'} className="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-h-[90px]"/>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 shadow-md">Guardar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIGURACIÓN COTIZACIÓN ── */}
      {isQuoteOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 dark:border-gray-800 relative my-8 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl flex-shrink-0">
              <h2 className="text-2xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted flex items-center gap-2">
                <FileText size={24}/> Propuesta Comercial — PDF Vectorial
              </h2>
              <button onClick={() => setQuoteOpen(false)} className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-700"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">

              {/* Cliente */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><User size={18} className="text-gloss-burgundy"/> Datos del Cliente</h4>
                <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy cursor-pointer font-medium">
                  <option value="nuevo">— Cliente Nuevo / Registro Manual —</option>
                  {CLIENTES_MOCK.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.contacto})</option>)}
                </select>
                {form.clienteId === 'nuevo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {[['nombre','Nombre Comercial','Centro Estético…'],['contacto','Contacto Principal','Dr. Martínez'],['ciudad','Ciudad','Bogotá'],['documento','NIT / Documento','Opcional']].map(([k, lbl, ph]) => (
                      <div key={k}>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{lbl}</label>
                        <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-1 focus:ring-gloss-burgundy"/>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precios */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-gloss-burgundy"/> Ajuste de Precios</h4>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-500 truncate">{item.entregables.length} entregables incluidos</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input type="number" value={item.precioFinal} onChange={(e) => updatePrice(item.id, e.target.value)}
                            className="pl-7 pr-3 py-2 w-36 text-sm font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 focus:ring-2 focus:ring-gloss-burgundy outline-none"/>
                        </div>
                        <button onClick={() => removeCart(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                  <span className="uppercase font-bold text-xs text-gray-500">Total Inversión:</span>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">{fmt(totalCart)}</span>
                </div>
              </div>

              {/* Términos */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Cláusulas Comerciales (visibles en PDF)</h4>
                <textarea value={form.terminos} onChange={(e) => setForm({ ...form, terminos: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy min-h-[90px] resize-y"/>
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setQuoteOpen(false)} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 transition-colors">Cancelar</button>
              <button onClick={handleGeneratePDF} disabled={!cart.length || isGenerating}
                className="flex items-center gap-2 bg-gloss-burgundy text-white px-8 py-2.5 rounded-xl font-bold hover:bg-gloss-burgundy/90 shadow-lg shadow-gloss-burgundy/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <Download size={18}/> {isGenerating ? 'Generando…' : 'Descargar PDF Vectorial'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
