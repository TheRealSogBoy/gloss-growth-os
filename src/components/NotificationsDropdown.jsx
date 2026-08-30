import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingDown, 
  Video, 
  CheckSquare, 
  Activity, 
  Bell, 
  X, 
  CheckCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationsDropdown({ isOpen, onClose }) {
  const { 
    notifications, 
    loading, 
    unreadCount, 
    marcarComoLeida, 
    marcarTodasComoLeidas 
  } = useNotifications();

  const [filtro, setFiltro] = useState('todas'); // 'todas' | 'no_leidas'
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filtro === 'no_leidas') return !n.leido;
    return true;
  });

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'cobro':
        return {
          icon: DollarSign,
          bg: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/60',
        };
      case 'gasto':
        return {
          icon: TrendingDown,
          bg: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60',
        };
      case 'reunion':
        return {
          icon: Video,
          bg: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
        };
      case 'tarea':
        return {
          icon: CheckSquare,
          bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
        };
      case 'sistema':
      default:
        return {
          icon: Activity,
          bg: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
        };
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.leido) {
      await marcarComoLeida(notif.id);
    }
    onClose();
    if (notif.enlace) {
      navigate(notif.enlace);
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gloss-black border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-zodiak font-bold text-lg text-gray-900 dark:text-white">
            Notificaciones
          </h3>
          {unreadCount > 0 && (
            <span className="bg-gloss-burgundy text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={marcarTodasComoLeidas}
              className="text-xs text-gloss-burgundy dark:text-gloss-pink hover:underline font-semibold flex items-center gap-1 p-1 mr-1"
              title="Marcar todas como leídas"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Marcar leídas</span>
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 pt-2 gap-2 text-xs font-semibold">
        <button
          onClick={() => setFiltro('todas')}
          className={`pb-2 border-b-2 transition-colors ${
            filtro === 'todas'
              ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFiltro('no_leidas')}
          className={`pb-2 border-b-2 transition-colors flex items-center gap-1 ${
            filtro === 'no_leidas'
              ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          No leídas
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-gloss-burgundy inline-block"></span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 custom-scrollbar">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Cargando notificaciones...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <Sparkles size={28} className="mx-auto mb-2 opacity-40 text-gloss-burgundy dark:text-gloss-pink" />
            <p className="text-sm font-medium">No hay notificaciones {filtro === 'no_leidas' ? 'sin leer' : ''}</p>
            <p className="text-xs text-gray-400 mt-1">Estás al día con todos los compromisos.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon: Icon, bg } = getNotificationIcon(notif.tipo);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                  !notif.leido
                    ? 'bg-gloss-burgundy/[0.04] dark:bg-gloss-pink/[0.04] hover:bg-gloss-burgundy/[0.08] dark:hover:bg-gloss-pink/[0.08]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
              >
                {/* Icon */}
                <div className={`p-2 rounded-xl border flex-shrink-0 ${bg}`}>
                  <Icon size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={`text-xs truncate ${!notif.leido ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {notif.titulo}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {notif.mensaje}
                  </p>
                </div>

                {/* Unread indicator dot & hover action */}
                <div className="flex items-center self-center flex-shrink-0 pl-1">
                  {!notif.leido ? (
                    <span className="w-2 h-2 rounded-full bg-gloss-burgundy dark:bg-gloss-pink" />
                  ) : (
                    <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 text-center">
          <button
            onClick={() => {
              onClose();
              navigate('/calendario');
            }}
            className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gloss-burgundy dark:hover:text-gloss-pink transition-colors flex items-center justify-center gap-1.5 w-full py-1"
          >
            <span>Ver Calendario de Compromisos</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
