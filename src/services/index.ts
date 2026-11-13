import { config } from '@/config/env';
import type { Services } from './contracts';
import { createMockServices } from './mock';
import { createHttpServices } from './http';

/** Ponto único de acesso aos serviços. VITE_USE_MOCK decide qual implementação usar. */
export const services: Services = config.useMock ? createMockServices() : createHttpServices();

export type * from './contracts';
