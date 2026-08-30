import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (error) {
      console.error('Error logging in:', error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gloss-black flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-gloss-burgundy/10 dark:bg-gloss-pink/10 rounded-2xl flex items-center justify-center mb-6">
          <LogIn size={40} className="text-gloss-burgundy dark:text-gloss-pink" />
        </div>
        
        <h1 className="text-3xl font-zodiak font-bold text-gray-900 dark:text-white mb-2 text-center">
          Gloss Growth OS
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Inicia sesi&oacute;n para acceder al sistema operativo de la agencia.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-white border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 py-3.5 px-6 rounded-xl font-bold transition-all shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          Iniciar Sesión con Google
        </button>

        <div className="mt-8 text-xs text-gray-400 dark:text-gray-600 text-center">
          Sistema de acceso restringido para miembros de Gloss Growth.
        </div>
      </div>
    </div>
  );
}
