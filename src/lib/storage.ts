/** localStorage com JSON e sem explodir em modo privado / cota cheia. */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

const TOKEN_KEY = 'mv.session.token';

/**
 * Sessão: o token fica salvo no navegador, então quem já entrou com a senha
 * não precisa digitar de novo.
 */
export const session = {
  getToken: () => storage.get<string | null>(TOKEN_KEY, null),
  setToken: (token: string) => storage.set(TOKEN_KEY, token),
  clear: () => storage.remove(TOKEN_KEY),
};
