import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, Mail, HelpCircle } from 'lucide-react';

export default function UnauthorizedScreen() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gloss-black flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center text-center animate-scale-in">
        
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/50 rounded-3xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 shadow-inner">
          <ShieldAlert size={40} />
        </div>

        <h1 className="text-2xl font-zodiak font-bold text-gray-900 dark:text-white mb-2">
          Acceso No Autorizado
        </h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Tu correo electrónico <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg break-all">{user?.email}</span> no cuenta con una invitación activa en el sistema.
        </p>

        <div className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6 text-left text-xs space-y-2 text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
            <HelpCircle size={14} className="text-gloss-burgundy dark:text-gloss-pink" />
            <span>¿Cómo obtener acceso?</span>
          </div>
          <p>
            Comunícate con el Administrador Principal de Gloss Growth OS (<span className="text-gloss-burgundy dark:text-gloss-pink font-semibold">santiagokansas890@gmail.com</span>) para que registre tu invitación.
          </p>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-md text-sm"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión e Intentar con Otra Cuenta</span>
        </button>
      </div>
    </div>
  );
}
