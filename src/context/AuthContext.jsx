import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'unauthenticated' | 'unauthorized' | 'needs_onboarding' | 'authorized'
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(async (currentUser) => {
    if (!currentUser?.email) {
      setPerfil(null);
      setAuthStatus('unauthenticated');
      setLoading(false);
      return;
    }

    try {
      const emailLower = currentUser.email.toLowerCase().trim();
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .ilike('email', emailLower)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (!data) {
        // Not in perfiles_usuarios -> Unauthorized
        setPerfil(null);
        setAuthStatus('unauthorized');
      } else {
        setPerfil(data);

        // Check if user_id needs linking
        if (!data.user_id && currentUser.id) {
          await supabase
            .from('perfiles_usuarios')
            .update({ user_id: currentUser.id })
            .eq('id', data.id);
        }

        if (!data.perfil_completado) {
          setAuthStatus('needs_onboarding');
        } else {
          setAuthStatus('authorized');
        }
      }
    } catch (err) {
      console.error('Unexpected error in profile fetch:', err);
      setAuthStatus('unauthorized');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user);
      } else {
        setAuthStatus('unauthenticated');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user);
      } else {
        setPerfil(null);
        setAuthStatus('unauthenticated');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPerfil]);

  const completarPerfil = async ({ codigoAcceso, nombreCompleto, telefono }) => {
    if (!perfil) return { error: 'No se encontró perfil para este usuario.' };

    const inputCode = (codigoAcceso || '').trim().toUpperCase();
    const expectedCode = (perfil.codigo_acceso || '').trim().toUpperCase();

    if (inputCode !== expectedCode) {
      return { error: 'El código de acceso / invitación es incorrecto.' };
    }

    try {
      const payload = {
        user_id: user?.id,
        nombre_completo: nombreCompleto.trim(),
        telefono: telefono.trim(),
        perfil_completado: true,
        activo: true,
      };

      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .update(payload)
        .eq('id', perfil.id)
        .select()
        .single();

      if (error) throw error;

      setPerfil(data);
      setAuthStatus('authorized');
      return { success: true, data };
    } catch (err) {
      console.error('Error completing profile:', err);
      return { error: err.message || 'Error al completar el perfil.' };
    }
  };

  const refreshPerfil = async () => {
    if (user) {
      await fetchPerfil(user);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setSession(null);
      setUser(null);
      setPerfil(null);
      setAuthStatus('unauthenticated');
    }
  };

  const isSuperAdmin = 
    perfil?.rol === 'superadmin' || 
    user?.email?.toLowerCase() === 'santiagokansas890@gmail.com';

  const value = {
    session,
    user,
    perfil,
    authStatus,
    loading,
    isSuperAdmin,
    completarPerfil,
    refreshPerfil,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
