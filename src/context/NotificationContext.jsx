import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { generarNotificacionesAutomaticas } from '../utils/notifications';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Run automated generation check for today's events
      await generarNotificacionesAutomaticas();

      // 2. Fetch from Supabase ordered strictly by created_at DESC
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

    // Set up polling fallback interval check every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

    // Setup Supabase Realtime channel for instant team-wide updates
    const channel = supabase
      .channel('notificaciones_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificaciones' },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
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

  const crearNotificacion = async ({ titulo, mensaje, tipo = 'sistema', enlace = '/' }) => {
    try {
      const payload = {
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo,
        enlace,
        leido: false,
      };
      const { data, error } = await supabase
        .from('notificaciones')
        .insert([payload])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setNotifications((prev) => [data[0], ...prev]);
        return { success: true, data: data[0] };
      }
      return { success: true };
    } catch (err) {
      console.error('Error creating notification:', err);
      return { error: err.message || 'Error al crear la notificación' };
    }
  };

  const value = {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    marcarComoLeida,
    marcarTodasComoLeidas,
    crearNotificacion,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
