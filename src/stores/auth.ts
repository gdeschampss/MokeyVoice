import { create } from 'zustand';
import { services } from '@/services';
import { session } from '@/lib/storage';
import type { ProfilePatch, UserProfile } from '@/types';
import { startRealtime, stopRealtime } from '@/app/realtimeBridge';
import { useMembers } from './members';

/**
 * checking       → verificando o token salvo
 * anonymous      → precisa digitar a senha do bando
 * needs-profile  → senha ok, mas este navegador ainda não escolheu um nick
 * ready          → dentro
 */
export type AuthStatus = 'checking' | 'anonymous' | 'needs-profile' | 'ready';

interface AuthState {
  status: AuthStatus;
  me: UserProfile | null;
  bootstrap(): Promise<void>;
  login(password: string): Promise<void>;
  createProfile(nick: string): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<void>;
  logout(): Promise<void>;
  /** Chamado quando o servidor diz 401. */
  expire(): void;
}

export const useAuth = create<AuthState>((set, get) => {
  async function enter() {
    const me = await services.users.getMe();
    if (!me) return set({ status: 'needs-profile', me: null });
    set({ me, status: 'ready' });
    await startRealtime(session.getToken()!);
  }

  return {
    status: 'checking',
    me: null,

    async bootstrap() {
      const token = session.getToken();
      if (!token) return set({ status: 'anonymous' });
      try {
        const ok = await services.auth.validate(token);
        if (!ok) {
          session.clear();
          return set({ status: 'anonymous' });
        }
        await enter();
      } catch {
        // Servidor fora do ar: não apaga o token, só mostra a tela de senha.
        set({ status: 'anonymous' });
      }
    },

    async login(password) {
      const { token } = await services.auth.login(password);
      session.setToken(token);
      await enter();
    },

    async createProfile(nick) {
      await services.users.createMe(nick);
      await enter();
    },

    async updateProfile(patch) {
      const me = await services.users.updateMe(patch);
      set({ me });
      useMembers.getState().patchProfile(me);
    },

    async logout() {
      await stopRealtime();
      await services.auth.logout().catch(() => undefined);
      session.clear();
      set({ status: 'anonymous', me: null });
    },

    expire() {
      if (get().status === 'anonymous') return;
      void stopRealtime();
      set({ status: 'anonymous', me: null });
    },
  };
});
