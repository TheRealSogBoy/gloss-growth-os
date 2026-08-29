import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ConfigProvider } from './context/ConfigContext';

import Finanzas from './pages/Finanzas';
import Directorio from './pages/Directorio';
import KanbanClientes from './pages/KanbanClientes';
import KanbanTareas from './pages/KanbanTareas';
import Calendario from './pages/Calendario';
import Catalogo from './pages/Catalogo';
import Dashboard from './pages/Dashboard';

// Placeholder components for routes
const NotFound = () => <div className="p-6"><h1 className="text-3xl font-zodiak mb-4 text-red-500">404</h1><p>Página no encontrada.</p></div>;

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="directorio" element={<Directorio />} />
            <Route path="kanban-clientes" element={<KanbanClientes />} />
            <Route path="kanban-tareas" element={<KanbanTareas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="finanzas" element={<Finanzas />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
