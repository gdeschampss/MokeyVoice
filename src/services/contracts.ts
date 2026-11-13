/**
 * CONTRATOS DOS SERVIÇOS
 * ----------------------
 * A UI só conversa com estas interfaces. Existem duas implementações:
 *   - services/mock  -> roda no navegador, sem back-end (padrão agora)
 *   - services/http  -> REST + WebSocket do back-end real
 * Trocar uma pela outra é só mudar VITE_USE_MOCK no .env.
 * O formato de cada endpoint/evento está em docs/API.md.
 */
import type {
  ChannelId,
  Member,
  Message,
  PresenceStatus,
  ProfilePatch,
  StreamQuality,
  UploadKind,
  UserId,
  UserProfile,
  VoiceRooms,
} from '@/types';

export interface AuthService {
  /** Senha única do bando. Retorna um token que fica salvo no navegador. */
  login(password: string): Promise<{ token: string }>;
  /** Confere se o token salvo ainda vale (ex.: senha foi trocada no servidor). */
  validate(token: string): Promise<boolean>;
  logout(): Promise<void>;
}

export interface UserService {
  /** Perfil ligado a este token, ou null se o navegador ainda não escolheu um nick. */
  getMe(): Promise<UserProfile | null>;
  createMe(nick: string): Promise<UserProfile>;
  updateMe(patch: ProfilePatch): Promise<UserProfile>;
  listMembers(): Promise<Member[]>;
  /** Sobe um arquivo e devolve a URL pública. */
  upload(file: Blob, kind: UploadKind, filename?: string): Promise<string>;
}

export interface ChatService {
  history(channelId: ChannelId, opts?: { before?: string; limit?: number }): Promise<Message[]>;
  send(channelId: ChannelId, content: string, files?: File[], clientId?: string): Promise<Message>;
}

/** Eventos empurrados pelo servidor (WebSocket). */
export interface RealtimeEvents {
  'message:new': Message;
  'member:update': Member;
  'presence:update': { userId: UserId; status: PresenceStatus };
  'voice:state': { channelId: ChannelId; participants: VoiceRooms[string] };
  'voice:speaking': { userId: UserId; speaking: boolean };
  'typing:start': { channelId: ChannelId; userId: UserId };
}

export type RealtimeEventName = keyof RealtimeEvents;
export type RealtimeHandler<E extends RealtimeEventName> = (payload: RealtimeEvents[E]) => void;
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RealtimeService {
  connect(token: string): void;
  disconnect(): void;
  on<E extends RealtimeEventName>(event: E, handler: RealtimeHandler<E>): () => void;
  onState(handler: (s: ConnectionState) => void): () => void;
  /** Eventos do cliente -> servidor (ex.: typing). */
  send(type: string, data: unknown): void;
}

/** Eventos de mídia local/remota que não passam pelo WebSocket. */
export type VoiceEvent =
  | { type: 'speaking'; userId: UserId; speaking: boolean }
  | { type: 'remote-stream'; userId: UserId; stream: MediaStream | null }
  | { type: 'screen-ended' }
  | { type: 'error'; message: string };

export interface VoiceService {
  /** Estado inicial de todas as salas (quem está em qual). Atualizações vêm por 'voice:state'. */
  getRooms(): Promise<VoiceRooms>;
  join(channelId: ChannelId, opts: { muted: boolean; deafened: boolean }): Promise<void>;
  leave(): Promise<void>;
  setMuted(muted: boolean): void;
  setDeafened(deafened: boolean): void;
  startScreenShare(quality: StreamQuality): Promise<MediaStream>;
  stopScreenShare(): void;
  on(listener: (e: VoiceEvent) => void): () => void;
}

export interface Services {
  auth: AuthService;
  users: UserService;
  chat: ChatService;
  realtime: RealtimeService;
  voice: VoiceService;
}
