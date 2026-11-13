/**
 * "Banco" do modo mock: tudo em localStorage para sobreviver a um F5.
 * Começa vazio: só aparece quem fez login de verdade.
 */
import { storage } from '@/lib/storage';
import type { Member, Message, UserProfile, VoiceRooms } from '@/types';
import { VOICE_CHANNELS } from '@/config/channels';

// v2: a v1 tinha macacos e mensagens de exemplo — trocar a chave descarta tudo isso.
const KEY = 'mv.mock.db.v2';

export interface MockDb {
  /** token -> userId (null = token válido mas ainda sem nick) */
  sessions: Record<string, string | null>;
  users: Record<string, Member>;
  messages: Message[];
  rooms: VoiceRooms;
}

/** Salas sempre vazias: só gente de verdade entra. Inclui canais novos do config. */
function emptyRooms(): VoiceRooms {
  return Object.fromEntries(VOICE_CHANNELS.map((c) => [c.id, []]));
}

/** Banco começa vazio — nada de macaco fictício nem mensagem de exemplo. */
function seed(): MockDb {
  return { sessions: {}, users: {}, messages: [], rooms: emptyRooms() };
}

const stored = storage.get<MockDb | null>(KEY, null);
let db: MockDb = stored ? { ...stored, rooms: emptyRooms() } : seed();

export function getDb() {
  return db;
}

/** Salva; devolve false se o localStorage estourou a cota (imagem grande demais). */
export function commit(mutate: (d: MockDb) => void): boolean {
  const draft = structuredClone(db);
  mutate(draft);
  // Salas de voz não persistem: ninguém "fica" na call depois de um F5.
  const ok = storage.set(KEY, { ...draft, rooms: emptyRooms() });
  if (ok) db = draft;
  return ok;
}

export function publicProfile(m: Member): UserProfile {
  const { status: _status, ...profile } = m;
  return profile;
}

export function resetMockDb() {
  storage.remove(KEY);
  db = seed();
}
