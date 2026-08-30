import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UnauthorizedScreen from './UnauthorizedScreen';
import OnboardingModal from './OnboardingModal';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute() {
  const { session, authStatus, loading } = useAuth();

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gloss-black flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-gloss-burgundy/10 dark:bg-gloss-pink/10 rounded-2xl flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink">
            <Sparkles size={32} />
          </div>
          <p className="text-sm font-zodiak font-bold text-gray-700 dark:text-gray-300">
            Iniciando Gloss Growth OS...
          </p>
        </div>
      </div>
    );
  }

  if (!session || authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (authStatus === 'unauthorized') {
    return <UnauthorizedScreen />;
  }

  if (authStatus === 'needs_onboarding') {
    return <OnboardingModal />;
  }

  return <Outlet />;
}
