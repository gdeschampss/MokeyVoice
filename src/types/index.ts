/**
 * Tipos de domínio compartilhados entre UI, stores e serviços.
 * Este arquivo é o "contrato" de dados com o back-end — ver docs/API.md.
 */

export type UserId = string;
export type ChannelId = string;

/** Perfil público. Só o nick aparece para os outros (sem e-mail, sem nome real). */
export interface UserProfile {
  id: UserId;
  nick: string;
  /** Cor do perfil (hex). Pinta o nick, o fundo do cartão e o avatar sem imagem. */
  accentColor: string;
  avatarUrl: string | null;
  /** Imagem de fundo do cartão de perfil (banner). */
  bannerUrl: string | null;
  /** GIF em destaque no cartão de perfil. */
  featuredGifUrl: string | null;
}

export type ProfilePatch = Partial<Omit<UserProfile, 'id'>>;

export type PresenceStatus = 'online' | 'offline';

export interface Member extends UserProfile {
  status: PresenceStatus;
}

export interface TextChannel {
  id: ChannelId;
  kind: 'text';
  name: string;
  topic?: string;
}

export interface VoiceChannel {
  id: ChannelId;
  kind: 'voice';
  name: string;
  /** Máximo de macacos na sala. `null` = sem limite. */
  capacity: number | null;
}

export type Channel = TextChannel | VoiceChannel;

export interface Attachment {
  id: string;
  url: string;
  name: string;
  mime: string;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  channelId: ChannelId;
  authorId: UserId;
  content: string;
  /** ISO 8601 */
  createdAt: string;
  attachments?: Attachment[];
  /** Só no cliente: mensagem otimista ainda não confirmada pelo servidor. */
  pending?: boolean;
  /** Só no cliente: envio falhou. */
  failed?: boolean;
}

export interface VoiceParticipant {
  userId: UserId;
  muted: boolean;
  deafened: boolean;
  streaming: boolean;
}

/** Estado de todas as salas de voz: channelId -> participantes. */
export type VoiceRooms = Record<ChannelId, VoiceParticipant[]>;

export type StreamQuality = 'smooth' | 'sharp' | 'max';

export type UploadKind = 'avatar' | 'banner' | 'gif' | 'attachment';
