import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authApi, type RegisterPayload } from '../../shared/api/auth.api';
import { setSessionExpiredHandler } from '../../shared/api/client';
import { ApiError, type Account } from '../../shared/api/types';
import { reminders } from '../notifications/reminders';
import { tokenStorage } from '../../shared/storage/secure-storage';

type Status = 'carregando' | 'autenticado' | 'visitante';

interface AuthContextValue {
  status: Status;
  account: Account | null;
  /** Atalho para o usuario logado. */
  user: Account['user'] | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (sellsType: string, mainGoal: string) => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Guarda a sessao do usuario.
 *
 * Na abertura do app tenta restaurar a sessao com o token salvo; se o
 * access token estiver vencido, o cliente HTTP renova sozinho.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('carregando');
  const [account, setAccount] = useState<Account | null>(null);

  const loadAccount = useCallback(async () => {
    const data = await authApi.me();
    setAccount(data);
    setStatus('autenticado');
  }, []);

  const signOutLocally = useCallback(async () => {
    await reminders.clear().catch(() => undefined);
    await tokenStorage.clear();
    setAccount(null);
    setStatus('visitante');
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await tokenStorage.getRefreshToken();

      if (!token) {
        if (active) setStatus('visitante');
        return;
      }

      try {
        const data = await authApi.me();
        if (!active) return;
        setAccount(data);
        setStatus('autenticado');
      } catch (error) {
        if (!active) return;
        // Erro de rede nao deve apagar a sessao: o usuario pode estar sem Wi-Fi.
        if (error instanceof ApiError && error.isNetwork) {
          setStatus('visitante');
          return;
        }
        await tokenStorage.clear();
        setStatus('visitante');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void reminders.clear().catch(() => undefined);
      setAccount(null);
      setStatus('visitante');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      await tokenStorage.save(result.tokens.accessToken, result.tokens.refreshToken);
      await loadAccount();
    },
    [loadAccount],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authApi.register(payload);
      await tokenStorage.save(result.tokens.accessToken, result.tokens.refreshToken);
      await loadAccount();
    },
    [loadAccount],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Logout e idempotente: mesmo se a chamada falhar, limpamos o aparelho.
    }
    await signOutLocally();
  }, [signOutLocally]);

  const completeOnboarding = useCallback(
    async (sellsType: string, mainGoal: string) => {
      await authApi.onboarding(sellsType, mainGoal);
      await loadAccount();
    },
    [loadAccount],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      account,
      user: account?.user ?? null,
      login,
      register,
      logout,
      completeOnboarding,
      reload: loadAccount,
    }),
    [status, account, login, register, logout, completeOnboarding, loadAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
