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
  User as UserIcon,
  ShieldCheck,
  Crown,
  Video,
  Zap,
  PhoneCall,
  Sparkles,
  GraduationCap,
  Share2,
  MessageSquare,
  Camera
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
  const { user, perfil, isSuperAdmin, signOut } = useAuth();
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
  const userName = perfil?.nombre_completo || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Miembro';
  const userEmail = perfil?.email || user?.email || '';
  const userRole = (perfil?.rol || 'socio').toLowerCase();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return {
          label: 'SuperAdmin',
          class: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
          icon: Crown,
        };
      case 'socio':
        return {
          label: 'Socio',
          class: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
          icon: ShieldCheck,
        };
      case 'comercial':
        return {
          label: 'Comercial',
          class: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
          icon: UserIcon,
        };
      case 'media_buyer':
        return {
          label: 'Media Buyer',
          class: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
          icon: UserIcon,
        };
      case 'edicion_multimedia':
        return {
          label: 'Edición Multimedia',
          class: 'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-700/60',
          icon: Video,
        };
      case 'closer':
        return {
          label: 'Closer',
          class: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
          icon: Zap,
        };
      case 'setter':
        return {
          label: 'Setter',
          class: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
          icon: PhoneCall,
        };
      case 'lavaculos':
        return {
          label: 'Lavaculos',
          class: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
          icon: Sparkles,
        };
      case 'junior':
        return {
          label: 'Junior',
          class: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700/60',
          icon: GraduationCap,
        };
      case 'social_media':
        return {
          label: 'Social Media',
          class: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-700/60',
          icon: Share2,
        };
      case 'comunicaciones':
        return {
          label: 'Comunicaciones',
          class: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700/60',
          icon: MessageSquare,
        };
      case 'ugc':
        return {
          label: 'UGC',
          class: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
          icon: Camera,
        };
      default:
        return {
          label: role.toUpperCase(),
          class: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700',
          icon: UserIcon,
        };
    }
  };

  const roleInfo = getRoleBadge(userRole);
  const RoleIcon = roleInfo.icon;

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
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/60 transition-colors"
                title={`${userName} (${userEmail})`}
              >
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName} 
                    className="w-8 h-8 rounded-full object-cover border border-gloss-pink/60 shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gloss-burgundy/15 dark:bg-gloss-pink/20 flex items-center justify-center border border-gloss-burgundy/40 dark:border-gloss-pink/40 text-gloss-burgundy dark:text-gloss-pink font-bold text-xs flex-shrink-0">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <div className="hidden md:flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[120px]">
                      {userName}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${roleInfo.class}`}>
                      <RoleIcon size={9} />
                      {roleInfo.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                    {userEmail}
                  </span>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gloss-black border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {userEmail}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${roleInfo.class}`}>
                        <RoleIcon size={11} />
                        Rol: {roleInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setConfigOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserIcon size={15} className="text-gray-400" />
                        <span>Configuración y Equipo</span>
                      </div>
                      {isSuperAdmin && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                          Admin
                        </span>
                      )}
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
