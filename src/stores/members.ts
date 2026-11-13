import { create } from 'zustand';
import type { Member, PresenceStatus, UserId, UserProfile } from '@/types';

interface MembersState {
  byId: Record<UserId, Member>;
  loaded: boolean;
  setAll(list: Member[]): void;
  upsert(m: Member): void;
  /** Atualiza só os campos de perfil, preservando o status. */
  patchProfile(p: UserProfile): void;
  setPresence(userId: UserId, status: PresenceStatus): void;
  reset(): void;
}

export const useMembers = create<MembersState>((set, get) => ({
  byId: {},
  loaded: false,
  setAll: (list) => set({ byId: Object.fromEntries(list.map((m) => [m.id, m])), loaded: true }),
  upsert: (m) => set({ byId: { ...get().byId, [m.id]: m } }),
  patchProfile(p) {
    const prev = get().byId[p.id];
    set({ byId: { ...get().byId, [p.id]: { ...p, status: prev?.status ?? 'online' } } });
  },
  setPresence(userId, status) {
    const prev = get().byId[userId];
    if (prev) set({ byId: { ...get().byId, [userId]: { ...prev, status } } });
  },
  reset: () => set({ byId: {}, loaded: false }),
}));

export const useMember = (id: UserId | null | undefined) => useMembers((s) => (id ? s.byId[id] : undefined));
