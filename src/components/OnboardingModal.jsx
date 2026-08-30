import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Phone, Sparkles, LogOut, AlertCircle, ArrowRight } from 'lucide-react';

export default function OnboardingModal() {
  const { user, perfil, completarPerfil, signOut } = useAuth();

  const [form, setForm] = useState({
    codigoAcceso: '',
    nombreCompleto: perfil?.nombre_completo || user?.user_metadata?.full_name || '',
    telefono: perfil?.telefono || '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.codigoAcceso.trim()) {
      setErrorMsg('Por favor ingresa tu código de acceso o invitación.');
      return;
    }
    if (!form.nombreCompleto.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!form.telefono.trim()) {
      setErrorMsg('Por favor ingresa tu número de teléfono / WhatsApp.');
      return;
    }

    setIsSubmitting(true);
    const res = await completarPerfil(form);
    setIsSubmitting(false);

    if (res?.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-gloss-burgundy to-gloss-burgundy/80 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles size={28} className="text-gloss-pink" />
          </div>
          <h2 className="text-2xl font-zodiak font-bold">
            Completa tu Registro de Miembro
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto">
            Bienvenido a Gloss Growth OS. Ingresa tu código de invitación para activar tu cuenta oficial.
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-scale-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
              <KeyRound size={13} className="text-gloss-burgundy dark:text-gloss-pink" />
              Código de Acceso / Invitación
            </label>
            <input
              type="text"
              required
              placeholder="Ej. GLOSS-7842"
              value={form.codigoAcceso}
              onChange={(e) => setForm({ ...form, codigoAcceso: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-mono font-bold tracking-wider uppercase text-gray-900 dark:text-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Proporcionado por el administrador para tu correo <span className="font-semibold text-gray-600 dark:text-gray-300">{user?.email}</span>.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
              <User size={13} className="text-gloss-burgundy dark:text-gloss-pink" />
              Nombre Completo
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Santiago Hurtado"
              value={form.nombreCompleto}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
              <Phone size={13} className="text-gloss-burgundy dark:text-gloss-pink" />
              Número de WhatsApp / Teléfono
            </label>
            <input
              type="tel"
              required
              placeholder="Ej. +57 300 123 4567"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                'Verificando código...'
              ) : (
                <>
                  <span>Activar Cuenta y Entrar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-2 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut size={13} />
              <span>Cerrar Sesión / Salir</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
