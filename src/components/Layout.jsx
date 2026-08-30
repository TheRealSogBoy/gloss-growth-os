import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationsDropdown from './NotificationsDropdown';
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
  Settings,
  LogOut,
  User as UserIcon
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { label: 'Directorio', icon: Users, to: '/directorio' },
    { label: 'Kanban Clientes', icon: KanbanSquare, to: '/kanban-clientes' },
    { label: 'Kanban Tareas', icon: CheckSquare, to: '/kanban-tareas' },
    { label: 'Calendario', icon: Calendar, to: '/calendario' },
    { label: 'Finanzas', icon: Wallet, to: '/finanzas' },
    { label: 'Catálogo', icon: ShoppingBag, to: '/catalogo' },
  ];

  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Socio';
  const userEmail = user?.email || '';

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

          <div className="flex items-center gap-2 lg:gap-3">
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
              title={darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 rounded-full transition-all relative ${
                  notificationsOpen 
                    ? 'bg-gloss-burgundy/10 text-gloss-burgundy dark:bg-gloss-pink/10 dark:text-gloss-pink' 
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
                title="Notificaciones"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-gloss-black animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown 
                isOpen={notificationsOpen} 
                onClose={() => setNotificationsOpen(false)} 
              />
            </div>
            
            {/* User Profile Avatar & Dropdown */}
            <div className="relative pl-1" ref={userMenuRef}>
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={`${userName} (${userEmail})`}
              >
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName} 
                    className="w-8 h-8 rounded-full object-cover border border-gloss-pink/60 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gloss-burgundy/15 dark:bg-gloss-pink/20 flex items-center justify-center border border-gloss-burgundy/40 dark:border-gloss-pink/40 text-gloss-burgundy dark:text-gloss-pink font-bold text-xs">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gloss-black border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {userEmail}
                    </p>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setConfigOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <UserIcon size={15} className="text-gray-400" />
                      <span>Perfil y Equipo</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
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
