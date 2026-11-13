import { create } from 'zustand';
import { services } from '@/services';
import { VOICE_CHANNELS, isRoomFull } from '@/config/channels';
import type { ChannelId, StreamQuality, UserId, VoiceParticipant, VoiceRooms } from '@/types';
import { toast } from './ui';

/** Referência estável — selectors do zustand não podem devolver um [] novo a cada render. */
export const NO_PARTICIPANTS: VoiceParticipant[] = [];

interface VoiceState {
  rooms: VoiceRooms;
  /** Sala em que EU estou. */
  current: ChannelId | null;
  joining: ChannelId | null;
  muted: boolean;
  deafened: boolean;
  speaking: Record<UserId, boolean>;
  /** Minha tela sendo transmitida (preview local). */
  localScreen: MediaStream | null;
  /** Streams de tela dos outros, vindas do SFU. */
  remoteStreams: Record<UserId, MediaStream>;
  /** Stream em destaque na sala (userId de quem transmite). */
  focused: UserId | null;

  setRooms(r: VoiceRooms): void;
  setRoom(channelId: ChannelId, participants: VoiceParticipant[]): void;
  setSpeaking(userId: UserId, speaking: boolean): void;
  setRemoteStream(userId: UserId, stream: MediaStream | null): void;
  join(channelId: ChannelId): Promise<boolean>;
  leave(): Promise<void>;
  toggleMute(): void;
  toggleDeafen(): void;
  startShare(q: StreamQuality): Promise<void>;
  stopShare(): void;
  focus(userId: UserId | null): void;
  reset(): void;
}

export const useVoice = create<VoiceState>((set, get) => ({
  rooms: {},
  current: null,
  joining: null,
  muted: false,
  deafened: false,
  speaking: {},
  localScreen: null,
  remoteStreams: {},
  focused: null,

  setRooms: (rooms) => set({ rooms }),
  setRoom: (channelId, participants) => set({ rooms: { ...get().rooms, [channelId]: participants } }),
  setSpeaking: (userId, speaking) => {
    if (!!get().speaking[userId] === speaking) return;
    set({ speaking: { ...get().speaking, [userId]: speaking } });
  },
  setRemoteStream(userId, stream) {
    const next = { ...get().remoteStreams };
    if (stream) next[userId] = stream;
    else delete next[userId];
    set({ remoteStreams: next, focused: !stream && get().focused === userId ? null : get().focused });
  },

  async join(channelId) {
    const { current, joining, muted, deafened, rooms } = get();
    if (current === channelId || joining) return current === channelId;
    const channel = VOICE_CHANNELS.find((c) => c.id === channelId);
    if (isRoomFull(channel, rooms[channelId]?.length ?? 0)) {
      toast('Sala cheia. Espera alguém sair.', 'error');
      return false;
    }
    set({ joining: channelId });
    try {
      if (current) get().stopShare();
      await services.voice.join(channelId, { muted, deafened });
      set({ current: channelId, focused: null });
      return true;
    } catch (e) {
      toast((e as Error).message || 'Não deu pra entrar na sala.', 'error');
      return false;
    } finally {
      set({ joining: null });
    }
  },

  async leave() {
    await services.voice.leave();
    set({ current: null, localScreen: null, focused: null, remoteStreams: {} });
  },

  toggleMute() {
    const { muted, deafened } = get();
    // Desmutar enquanto ensurdecido também tira o ensurdecer (igual Discord).
    if (deafened && muted) {
      set({ muted: false, deafened: false });
      services.voice.setDeafened(false);
      services.voice.setMuted(false);
      return;
    }
    set({ muted: !muted });
    services.voice.setMuted(!muted);
  },

  toggleDeafen() {
    const deafened = !get().deafened;
    set({ deafened, muted: deafened ? true : get().muted });
    services.voice.setDeafened(deafened);
    services.voice.setMuted(deafened ? true : get().muted);
  },

  async startShare(q) {
    try {
      const stream = await services.voice.startScreenShare(q);
      set({ localScreen: stream });
    } catch (e) {
      const err = e as DOMException;
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        toast(err.message || 'Não deu pra transmitir a tela.', 'error');
      }
    }
  },

  stopShare() {
    services.voice.stopScreenShare();
    set({ localScreen: null });
  },

  focus: (focused) => set({ focused }),

  reset: () =>
    set({ rooms: {}, current: null, joining: null, speaking: {}, localScreen: null, remoteStreams: {}, focused: null }),
}));

/** Em qual sala um usuário está (para "Em voz · Bando #1" na lista de membros). */
export function findUserRoom(rooms: VoiceRooms, userId: UserId): ChannelId | null {
  for (const [id, list] of Object.entries(rooms)) if (list.some((p) => p.userId === userId)) return id;
  return null;
}
