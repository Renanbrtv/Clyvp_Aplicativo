import { API_BASE_URL, API_TIMEOUT } from './config';
import { ApiError, type ApiErrorBody, type ApiSuccess, type Tokens } from './types';
import { tokenStorage } from '../storage/secure-storage';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

/** Chamado quando a sessao expira de vez - a UI leva o usuario para o login. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/**
 * Evita varias renovacoes simultaneas: se tres chamadas receberem 401 ao
 * mesmo tempo, apenas uma renova o token e as outras esperam por ela.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        signal: AbortSignal.timeout(API_TIMEOUT),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status !== 401 && response.status !== 403) {
          throw new ApiError('Nao foi possivel renovar sua sessao agora.', 0, 'NETWORK_ERROR');
        }
        await tokenStorage.clear();
        return false;
      }

      const body = (await response.json()) as ApiSuccess<{ tokens: Tokens }>;
      await tokenStorage.save(body.data.tokens.accessToken, body.data.tokens.refreshToken);
      return true;
    } catch {
      throw new ApiError('Nao foi possivel renovar sua sessao agora. Tente novamente.', 0, 'NETWORK_ERROR');
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function execute<T>(
  method: Method,
  path: string,
  options: RequestOptions,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.auth !== false) {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      aborted
        ? 'O servidor demorou demais para responder.'
        : 'Nao foi possivel conectar. Confira sua internet e tente novamente.',
      0,
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    throw new ApiError('Resposta invalida do servidor.', response.status, 'INVALID_RESPONSE');
  }

  if (response.ok) {
    return (payload as ApiSuccess<T>).data;
  }

  const errorBody = payload as ApiErrorBody | null;
  const code = errorBody?.error?.code ?? 'UNKNOWN';

  // Access token venceu: renova uma vez e repete a chamada.
  const shouldRefresh =
    response.status === 401 &&
    options.auth !== false &&
    !isRetry &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/login');

  if (shouldRefresh) {
    const renewed = await refreshTokens();
    if (renewed) {
      return execute<T>(method, path, options, true);
    }

    await tokenStorage.clear();
    onSessionExpired?.();
  }

  throw new ApiError(
    errorBody?.error?.message ?? 'Algo deu errado. Tente novamente.',
    response.status,
    code,
    errorBody?.error?.details,
  );
}

export const api = {
  get: <T>(path: string, options: RequestOptions = {}) => execute<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    execute<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    execute<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options: RequestOptions = {}) => execute<T>('DELETE', path, options),
  baseUrl: API_BASE_URL,
};
