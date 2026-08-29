import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  CheckSquare, 
  Calendar, 
  Wallet, 
  ShoppingBag,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  Settings
} from 'lucide-react';
import ConfigModal from './ConfigModal';

const SidebarItem = ({ icon: Icon, label, to, isActive, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-gloss-burgundy text-white' 
        : 'hover:bg-gloss-pink/10 text-gloss-black dark:text-gloss-inverted dark:hover:bg-white/10'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { label: 'Directorio', icon: Users, to: '/directorio' },
    { label: 'Kanban Clientes', icon: KanbanSquare, to: '/kanban-clientes' },
    { label: 'Kanban Tareas', icon: CheckSquare, to: '/kanban-tareas' },
    { label: 'Calendario', icon: Calendar, to: '/calendario' },
    { label: 'Finanzas', icon: Wallet, to: '/finanzas' },
    { label: 'Catálogo', icon: ShoppingBag, to: '/catalogo' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#2a1f1b] flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gloss-black border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="text-xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted flex items-center gap-2">
            Gloss Growth OS
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <SidebarItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              isActive={location.pathname === item.to}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Sidebar Footer: Configuración */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              setSidebarOpen(false);
              setConfigOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gloss-pink/10 hover:text-gloss-burgundy dark:hover:bg-white/10 dark:hover:text-gloss-pink transition-colors font-medium text-sm group"
          >
            <Settings size={20} className="text-gray-400 group-hover:text-gloss-burgundy dark:group-hover:text-gloss-pink transition-colors" />
            <span>Configuración</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gloss-black border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <img src="/logo.png" alt="Gloss Growth" className="h-8 dark:hidden" onError={(e) => e.target.style.display = 'none'} />
              <img src="/logo-invertido.png" alt="Gloss Growth" className="h-8 hidden dark:block" onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Quick Settings Gear in Header */}
            <button
              onClick={() => setConfigOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Configuración y Equipo"
            >
              <Settings size={20} />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gloss-burgundy rounded-full"></span>
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gloss-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-zodiak font-bold text-lg">Notificaciones</h3>
                    <button onClick={() => setNotificationsOpen(false)}>
                      <X size={16} className="text-gray-500" />
                    </button>
                  </div>
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                    <p>No tienes notificaciones nuevas</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Profile Avatar Placeholder */}
            <div 
              onClick={() => setConfigOpen(true)}
              className="w-8 h-8 rounded-full bg-gloss-pink/30 flex items-center justify-center border border-gloss-pink cursor-pointer hover:scale-105 transition-transform"
              title="Perfil y Configuración"
            >
              <span className="text-gloss-burgundy text-sm font-bold">GG</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Config & Team Modal */}
      <ConfigModal 
        isOpen={configOpen} 
        onClose={() => setConfigOpen(false)} 
      />
    </div>
  );
}
