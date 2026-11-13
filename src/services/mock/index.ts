/**
 * Implementação mock de todos os serviços. Simula latência de rede e eventos
 * em tempo real para a UI ser desenvolvida sem back-end.
 */
import { config } from '@/config/env';
import { VOICE_CHANNELS, isRoomFull } from '@/config/channels';
import { Emitter } from '@/lib/emitter';
import { blobToDataUrl } from '@/lib/image';
import { session } from '@/lib/storage';
import { uid } from '@/lib/format';
import type {
  ChatService,
  ConnectionState,
  RealtimeEvents,
  RealtimeService,
  Services,
  UserService,
  AuthService,
  VoiceEvent,
  VoiceService,
} from '../contracts';
import type { Member, Message, VoiceParticipant } from '@/types';
import { commit, getDb, publicProfile } from './db';
import { captureScreen, createSpeakingDetector, getMicrophone, stopStream } from '../voice/localMedia';

const delay = (ms = 180 + Math.random() * 220) => new Promise((r) => setTimeout(r, ms));

const bus = new Emitter<RealtimeEvents>();

function currentUserId(): string | null {
  const token = session.getToken();
  if (!token) return null;
  return getDb().sessions[token] ?? null;
}

function requireUser(): Member {
  const id = currentUserId();
  const user = id ? getDb().users[id] : undefined;
  if (!user) throw new Error('Sessão sem perfil');
  return user;
}

const QUOTA_ERROR = 'Arquivo grande demais para o modo mock (limite do navegador). No back-end real isso some.';

/* ---------------- auth ---------------- */

const auth: AuthService = {
  async login(password) {
    await delay();
    if (password.trim() !== config.mockPassword) throw new Error('Senha errada. Pede pro bando.');
    const token = `mock_${uid()}`;
    commit((d) => {
      d.sessions[token] = null;
    });
    return { token };
  },
  async validate(token) {
    await delay(80);
    return token in getDb().sessions;
  },
  async logout() {
    const token = session.getToken();
    const userId = currentUserId();
    commit((d) => {
      if (token) delete d.sessions[token];
      if (userId && d.users[userId]) d.users[userId].status = 'offline';
    });
    if (userId) bus.emit('presence:update', { userId, status: 'offline' });
  },
};

/* ---------------- users ---------------- */

const users: UserService = {
  async getMe() {
    await delay(100);
    const id = currentUserId();
    const user = id ? getDb().users[id] : undefined;
    return user ? publicProfile(user) : null;
  },
  async createMe(nick) {
    await delay();
    const token = session.getToken();
    if (!token) throw new Error('Sem sessão');
    const clean = nick.trim().slice(0, 32);
    if (clean.length < 2) throw new Error('Nick precisa de pelo menos 2 letras.');
    const taken = Object.values(getDb().users).some((u) => u.nick.toLowerCase() === clean.toLowerCase());
    if (taken) throw new Error('Esse nick já é de outro macaco.');
    const me: Member = {
      id: `u-${uid()}`,
      nick: clean,
      accentColor: '#5E5C97',
      avatarUrl: null,
      bannerUrl: null,
      featuredGifUrl: null,
      status: 'online',
    };
    commit((d) => {
      d.users[me.id] = me;
      d.sessions[token] = me.id;
    });
    bus.emit('member:update', me);
    return publicProfile(me);
  },
  async updateMe(patch) {
    await delay();
    const me = requireUser();
    if (patch.nick !== undefined) {
      const clean = patch.nick.trim().slice(0, 32);
      if (clean.length < 2) throw new Error('Nick precisa de pelo menos 2 letras.');
      const taken = Object.values(getDb().users).some(
        (u) => u.id !== me.id && u.nick.toLowerCase() === clean.toLowerCase(),
      );
      if (taken) throw new Error('Esse nick já é de outro macaco.');
      patch = { ...patch, nick: clean };
    }
    const next: Member = { ...me, ...patch, id: me.id };
    const ok = commit((d) => {
      d.users[me.id] = next;
    });
    if (!ok) throw new Error(QUOTA_ERROR);
    bus.emit('member:update', next);
    return publicProfile(next);
  },
  async listMembers() {
    await delay(120);
    const me = currentUserId();
    return Object.values(getDb().users).map((u) => (u.id === me ? { ...u, status: 'online' as const } : u));
  },
  async upload(file) {
    await delay(300);
    if (file.size > 3 * 1024 * 1024) throw new Error(QUOTA_ERROR);
    return blobToDataUrl(file);
  },
};

/* ---------------- chat ---------------- */

const chat: ChatService = {
  async history(channelId, opts) {
    await delay(150);
    const limit = opts?.limit ?? 50;
    let list = getDb().messages.filter((m) => m.channelId === channelId);
    if (opts?.before) list = list.filter((m) => m.createdAt < opts.before!);
    return list.slice(-limit);
  },
  async send(channelId, content, files = [], clientId) {
    await delay(120);
    const me = requireUser();
    const attachments = await Promise.all(
      files.map(async (f) => ({
        id: uid(),
        url: await users.upload(f, 'attachment', f.name),
        name: f.name,
        mime: f.type,
      })),
    );
    const msg: Message = {
      id: clientId ?? uid(),
      channelId,
      authorId: me.id,
      content,
      createdAt: new Date().toISOString(),
      attachments: attachments.length ? attachments : undefined,
    };
    const ok = commit((d) => {
      d.messages.push(msg);
      if (d.messages.length > 500) d.messages = d.messages.slice(-500);
    });
    if (!ok) throw new Error(QUOTA_ERROR);
    bus.emit('message:new', msg);
    return msg;
  },
};

/* ---------------- realtime ---------------- */

const stateEmitter = new Emitter<{ state: ConnectionState }>();

const realtime: RealtimeService = {
  connect() {
    stateEmitter.emit('state', 'open');
  },
  disconnect() {
    stateEmitter.emit('state', 'closed');
  },
  on(event, handler) {
    return bus.on(event, handler);
  },
  onState(handler) {
    return stateEmitter.on('state', handler);
  },
  send() {
    /* mock: nada a fazer */
  },
};

/* ---------------- voz ---------------- */

const voiceEvents = new Emitter<{ event: VoiceEvent }>();
let mic: MediaStream | null = null;
let stopDetector: (() => void) | null = null;
let screen: MediaStream | null = null;
let currentRoom: string | null = null;

function updateSelf(patch: Partial<VoiceParticipant>) {
  const me = currentUserId();
  if (!me || !currentRoom) return;
  const room = currentRoom;
  commit((d) => {
    d.rooms[room] = d.rooms[room].map((p) => (p.userId === me ? { ...p, ...patch } : p));
  });
  bus.emit('voice:state', { channelId: room, participants: getDb().rooms[room] });
}

const voice: VoiceService = {
  async getRooms() {
    await delay(100);
    return structuredClone(getDb().rooms);
  },
  async join(channelId, { muted, deafened }) {
    const me = requireUser();
    if (currentRoom) await voice.leave();
    const room = getDb().rooms[channelId] ?? [];
    if (isRoomFull(VOICE_CHANNELS.find((c) => c.id === channelId), room.length)) throw new Error('Sala cheia.');

    mic = await getMicrophone();
    if (!mic) voiceEvents.emit('event', { type: 'error', message: 'Sem acesso ao microfone — entrando mutado.' });
    mic?.getAudioTracks().forEach((t) => (t.enabled = !muted && !deafened));
    if (mic) {
      stopDetector = createSpeakingDetector(mic, (speaking) => {
        bus.emit('voice:speaking', { userId: me.id, speaking });
      });
    }

    currentRoom = channelId;
    const self: VoiceParticipant = { userId: me.id, muted: muted || !mic, deafened, streaming: false };
    commit((d) => {
      d.rooms[channelId] = [...(d.rooms[channelId] ?? []), self];
    });
    bus.emit('voice:state', { channelId, participants: getDb().rooms[channelId] });
  },
  async leave() {
    const me = currentUserId();
    voice.stopScreenShare();
    stopDetector?.();
    stopDetector = null;
    stopStream(mic);
    mic = null;
    if (me) bus.emit('voice:speaking', { userId: me, speaking: false });
    if (currentRoom && me) {
      const room = currentRoom;
      commit((d) => {
        d.rooms[room] = d.rooms[room].filter((p) => p.userId !== me);
      });
      bus.emit('voice:state', { channelId: room, participants: getDb().rooms[room] });
    }
    currentRoom = null;
  },
  setMuted(muted) {
    mic?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    updateSelf({ muted });
  },
  setDeafened(deafened) {
    // No real: também silenciar todos os <audio> remotos.
    updateSelf({ deafened });
  },
  async startScreenShare(quality) {
    stopStream(screen);
    screen = await captureScreen(quality);
    screen.getVideoTracks()[0]?.addEventListener('ended', () => {
      voice.stopScreenShare();
      voiceEvents.emit('event', { type: 'screen-ended' });
    });
    updateSelf({ streaming: true });
    return screen;
  },
  stopScreenShare() {
    if (!screen) return;
    stopStream(screen);
    screen = null;
    updateSelf({ streaming: false });
  },
  on(listener) {
    return voiceEvents.on('event', listener);
  },
};

export function createMockServices(): Services {
  return { auth, users, chat, realtime, voice };
}
