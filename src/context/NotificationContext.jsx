import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { generarNotificacionesAutomaticas } from '../utils/notifications';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      // First run automated generation check for today's events
      await generarNotificacionesAutomaticas();

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Set up interval check every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.leido).length;

  const marcarComoLeida = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
      );
      await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })));
      const unreadIds = notifications.filter((n) => !n.leido).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notificaciones')
          .update({ leido: true })
          .in('id', unreadIds);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const value = {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    marcarComoLeida,
    marcarTodasComoLeidas,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
