import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import type { LoginResponse } from './auth';
import { useFavorites, type FavoritesState } from './FavoritesPanel';

type SessionContextValue = {
  session: LoginResponse | null;
  setSession: (session: LoginResponse | null) => void;
  expireSession: () => void;
  favorites: FavoritesState;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const expireSession = useCallback(() => {
    setSession(null);
    router.navigate('/login');
  }, []);
  const favorites = useFavorites(session?.accessToken ?? null, expireSession);
  return <SessionContext.Provider value={{ session, setSession, expireSession, favorites }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
