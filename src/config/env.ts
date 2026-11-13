const env = import.meta.env;

export const config = {
  /** Enquanto o back-end não existe, tudo roda em memória + localStorage. */
  useMock: env.VITE_USE_MOCK !== 'false',
  apiUrl: (env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, ''),
  wsUrl: env.VITE_WS_URL ?? 'ws://localhost:3333/ws',
  mockPassword: env.VITE_MOCK_ACCESS_PASSWORD ?? 'macaco',
} as const;
