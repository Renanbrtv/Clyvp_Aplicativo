import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Descobre sozinho o endereco da API.
 *
 * O celular nao enxerga o "localhost" do computador - "localhost" no celular
 * e o proprio celular. O Expo ja sabe o IP da maquina que esta servindo o
 * bundle (e o mesmo IP que aparece no QR Code), entao reaproveitamos ele.
 *
 * Ordem de prioridade:
 *   1. EXPO_PUBLIC_API_URL (.env no desenvolvimento, eas.json no build)
 *   2. IP da maquina de desenvolvimento, detectado pelo Expo
 *   3. Emulador Android (10.0.2.2) ou localhost no iOS/web
 *
 * Em producao so o item 1 vale: um app publicado que caisse no localhost
 * simplesmente nao funcionaria no celular de ninguem.
 */
const API_PORT = 3333;
const API_PREFIX = '/api';

/** "development" durante o `expo start`; "production" no app publicado. */
export const APP_ENV = (process.env.APP_ENV ?? (__DEV__ ? 'development' : 'production')) as
  | 'development'
  | 'preview'
  | 'production';

export const IS_PRODUCTION = APP_ENV === 'production';

function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.debuggerHost ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (typeof hostUri !== 'string' || hostUri.length === 0) return null;

  const host = hostUri.split('://').pop()?.split(':')[0];
  return host && host.length > 0 ? host : null;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    if (IS_PRODUCTION && !/^https:\/\//.test(fromEnv)) {
      throw new Error('[Clyvo] A API de producao precisa usar HTTPS.');
    }
    return fromEnv.replace(/\/$/, '');
  }

  if (IS_PRODUCTION) {
    // Sem endereco configurado o app nao tem como funcionar. Avisamos alto
    // no log do build em vez de deixar o usuario final com telas vazias.
    throw new Error('[Clyvo] Configure EXPO_PUBLIC_API_URL antes de gerar a versao de producao.');
  }

  const host = hostFromExpo();
  if (host) {
    return `http://${host}:${API_PORT}${API_PREFIX}`;
  }

  const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${fallbackHost}:${API_PORT}${API_PREFIX}`;
}

export const API_BASE_URL = resolveBaseUrl();

/** Tempo maximo de espera por resposta (ms). */
export const API_TIMEOUT = 15000;
