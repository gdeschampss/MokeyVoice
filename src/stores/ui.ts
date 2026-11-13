import { create } from 'zustand';
import type { UserId } from '@/types';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

interface ProfilePopover {
  userId: UserId;
  /** Retângulo do elemento clicado, para posicionar o cartão ao lado. */
  anchor: { top: number; left: number; right: number; bottom: number };
  side: 'left' | 'right' | 'top';
}

interface UiState {
  /** Gaveta de canais (só mobile). */
  sidebarOpen: boolean;
  /** Lista de membros (desktop: coluna; tablet/mobile: gaveta). */
  membersOpen: boolean;
  settingsOpen: boolean;
  popover: ProfilePopover | null;
  toasts: Toast[];
  setSidebar(open: boolean): void;
  setMembers(open: boolean): void;
  toggleMembers(): void;
  openSettings(): void;
  closeSettings(): void;
  openProfile(userId: UserId, el: Element, side?: ProfilePopover['side']): void;
  closeProfile(): void;
  toast(text: string, tone?: Toast['tone']): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;
const WIDE = 1200;

export const useUi = create<UiState>((set, get) => ({
  sidebarOpen: false,
  membersOpen: typeof window !== 'undefined' ? window.innerWidth >= WIDE : true,
  settingsOpen: false,
  popover: null,
  toasts: [],
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),
  setMembers: (membersOpen) => set({ membersOpen }),
  toggleMembers: () => set({ membersOpen: !get().membersOpen }),
  openSettings: () => set({ settingsOpen: true, popover: null, sidebarOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
  openProfile(userId, el, side = 'right') {
    const r = el.getBoundingClientRect();
    set({ popover: { userId, side, anchor: { top: r.top, left: r.left, right: r.right, bottom: r.bottom } } });
  },
  closeProfile: () => set({ popover: null }),
  toast(text, tone = 'info') {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    window.setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone?: Toast['tone']) => useUi.getState().toast(text, tone);
