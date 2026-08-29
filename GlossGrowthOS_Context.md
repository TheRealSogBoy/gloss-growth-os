# 🧠 Contexto Maestro: Gloss Growth OS

Este documento sirve como **Ventana de Contexto (System Prompt / Context Window)** para cualquier IA o Agente que se integre o asista en el desarrollo de **Gloss Growth OS**. Contiene la arquitectura, reglas de negocio, estructura de módulos y stack tecnológico del proyecto.

---

## 1. 🏢 Visión General del Proyecto
**Nombre del Proyecto:** Gloss Growth OS | Agency Management
**Descripción:** Es un sistema operativo interno (ERP/CRM) diseñado a medida para la agencia creativa y de marketing estratégico "Gloss & Growth". Funciona como el centro de mando (Dashboard Central) para gestionar clientes, finanzas, tareas del equipo, calendario de citas y cotizaciones, todo interconectado en tiempo real.

---

## 2. 🛠 Stack Tecnológico y Arquitectura
- **Frontend:** React (SPA) empaquetado con Vite.
- **Enrutamiento:** `react-router-dom`.
- **Estilos:** Tailwind CSS con soporte para modo Claro/Oscuro (Dark Mode).
- **Backend / Base de Datos:** Supabase (PostgreSQL autogestionado).
- **Iconografía:** `lucide-react`.
- **Generación de PDFs:** `jspdf` + `jspdf-autotable` (Generación 100% vectorial, en memoria. Prohibido el uso de capturas de DOM como `html2canvas`).

---

## 3. 🎨 Sistema de Diseño (Design Tokens)
La plataforma sigue lineamientos de branding estrictos:
- **Colores Corporativos:**
  - Borgoña (Burgundy): `#8C2536` (Color principal, acciones, branding)
  - Rosa (Pink): `#FDA4AF` (Acentos, highlights en dark mode)
  - Invertido (Beige): `#F2ECC2` (Fondos claros secundarios)
  - Negro (Black): `#352925` (Texto principal, fondos oscuros)
- **Tipografía:** Se utiliza una fuente Serif corporativa llamada `Zodiak` para los encabezados importantes (`font-zodiak`), y fuentes Sans-Serif limpias para datos e interfaz.
- **Restricciones de Navegador:** Cuenta con un control estricto anti-traducción (`translate="no"` y `class="notranslate"`) en el HTML base para evitar que Google Chrome traduzca el nombre de la marca a "Crecimiento brillante".

---

## 4. 🗄️ Esquema de Base de Datos (Supabase)
Todas las interacciones locales han sido migradas a Supabase. Las tablas principales son:
1. `clientes`: CRM completo (datos de negocio, contactos, contrato, plan de pagos, enlaces).
2. `transacciones_finanzas`: Ingresos y egresos, vinculables al plan de pagos de clientes.
3. `tareas`: Tickets del equipo (Kanban).
4. `eventos_calendario`: Citas (virtuales, presenciales, llamadas).
5. `catalogo_servicios`: Items para armar cotizaciones.
6. `equipo`: Miembros internos de la agencia.
7. `configuracion_agencia`: Branding y ajustes globales.

---

## 5. 🧩 Esqueleto y Módulos Principales (Routing)

### A. Panel Maestro (`/` - Dashboard.jsx)
Centro neurálgico que interconecta todos los datos.
- **KPIs Globales:** MRR Activo, Cartera Pendiente (<15 días), Salud del Pipeline, Carga Operativa.
- **Widgets:** Agenda del Día (Calendario), Próximos Cobros (Finanzas), Sprint del Equipo (Tareas), Prospectos Calientes (Kanban), Distribución del Pipeline.
- Cuenta con un modal de Acción Rápida (Botón flotante / Header) para crear elementos rápidamente (Cotización, Cliente, Ingreso, Tarea, Cita).

### B. Directorio 360 (`/directorio` - Directorio.jsx)
Base de datos CRM de clientes.
- **Tabla Inteligente:** Filtros por estado, calculador de estado de pago automático basado en cuotas vencidas.
- **Ficha 360° (Drawer Lateral):** Panel deslizable que muestra toda la info del cliente, plan de pagos, metas y métricas sin salir de la vista.
- **Gestión:** Creación, edición y eliminación de clientes con confirmación segura.

### C. Kanban Clientes (`/kanban-clientes` - KanbanClientes.jsx)
Pipeline comercial (Drag & Drop lógico o visual).
- **Columnas:** Interesado/Prospecto → Onboarding → Activo → Retención → Inactivo.
- Permite mover clientes entre fases y visualizar el valor potencial del pipeline.

### D. Kanban Tareas (`/kanban-tareas` - KanbanTareas.jsx)
Gestor de tickets para el equipo (Sprint de producción).
- **Columnas:** Backlog → En Progreso → Revisión → Completado.
- Soporta asignación a miembros del equipo, niveles de prioridad (Alta/Media/Baja) y fechas límite.

### E. Calendario (`/calendario` - Calendario.jsx)
Gestor de tiempo y reuniones.
- Vista de eventos por tipo (Llamada, Presencial, Virtual).
- Identificadores visuales de color según el tipo de cita.

### F. Finanzas (`/finanzas` - Finanzas.jsx)
Control de tesorería y facturación.
- Registro de Ingresos y Egresos.
- Vinculación inteligente: Al cobrar una cuota, se puede vincular al "Plan de Pagos" de un cliente en el Directorio 360, actualizando automáticamente su estado a "Pagado".

### G. Catálogo / Cotizador (`/catalogo` - Catalogo.jsx)
Motor de ventas.
- Base de servicios base.
- Generador de Cotizaciones: Permite seleccionar servicios, agregar entregables, calcular subtotales e impuestos, y **generar un PDF profesional programático vectorial** utilizando `jsPDF`.

### H. Configuración y Equipo (Modal/Vista)
- Ajustes de agencia.
- Gestión de la lista de miembros internos disponibles para asignación de tareas.

---

## 6. 🚨 Reglas Críticas de Desarrollo para la IA
Cuando escribas o modifiques código para Gloss Growth OS, DEBES respetar lo siguiente:
1. **Nada de Mock Data en producción:** Todo debe conectarse a las llamadas asíncronas de `supabase`.
2. **Cero Capturas de Pantalla para PDFs:** El exportador de PDF tiene PROHIBIDO el uso de `html2canvas` o `window.print()`. Todo documento debe dibujarse en memoria usando primitivas vectoriales (textos, rectángulos, líneas).
3. **Manejo de Estado Inmutable:** Utiliza siempre copias del estado en React (`...prev`) para prevenir mutaciones directas.
4. **Diseño Responsivo e Inclusivo:** Mantener siempre el soporte `dark:` de Tailwind CSS y asegurar que las interfaces sean modulares (evitar archivos JSX monolíticos inmensos siempre que sea posible, aunque la arquitectura actual usa páginas robustas).
5. **Componentes Puros:** Mantener la UI limpia, asegurando que los cierres de JSX (`</div>`, `</>`) y las expresiones estén perfectamente balanceadas.
