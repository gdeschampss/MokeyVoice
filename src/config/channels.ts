import type { Channel, TextChannel, VoiceChannel } from '@/types';

/** Servidor único. Se um dia o back-end servir isso, troque por uma chamada de API. */
export const SERVER = {
  name: 'Chat dos Macacos',
  logo: '/brand/monkey.png',
  wordmark: '/brand/wordmark.png',
} as const;

export const TEXT_CHANNELS: TextChannel[] = [
  { id: 'geral', kind: 'text', name: 'chat-geral', topic: 'Conversa geral do bando' },
];

export const VOICE_CHANNELS: VoiceChannel[] = [
  { id: 'arvore', kind: 'voice', name: 'Árvore do bando', capacity: null },
  { id: 'bando-1', kind: 'voice', name: 'Bando #1', capacity: 4 },
  { id: 'bando-2', kind: 'voice', name: 'Bando #2', capacity: 4 },
  { id: 'dupla-1', kind: 'voice', name: 'Dupla #1', capacity: 2 },
  { id: 'dupla-2', kind: 'voice', name: 'Dupla #2', capacity: 2 },
];

/** Sala cheia? Canal sem limite (`capacity: null`) nunca enche. */
export function isRoomFull(channel: VoiceChannel | undefined, count: number): boolean {
  return channel?.capacity != null && count >= channel.capacity;
}

export const DEFAULT_CHANNEL_ID = TEXT_CHANNELS[0].id;

const ALL: Channel[] = [...TEXT_CHANNELS, ...VOICE_CHANNELS];

export function findChannel(id: string | undefined): Channel | undefined {
  return ALL.find((c) => c.id === id);
}

/** Cores sugeridas no editor de perfil (derivadas da paleta da marca). */
export const PROFILE_SWATCHES = [
  '#5E5C97',
  '#924E4E',
  '#5A3232',
  '#99AAB5',
  '#3E7C6B',
  '#B08B4F',
  '#4F7FA8',
  '#8A5A8C',
];
