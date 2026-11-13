/**
 * Implementação real (REST). Os endpoints estão descritos em docs/API.md.
 * Se o back-end mudar uma rota, é só ajustar aqui — a UI não muda.
 */
import type { AuthService, ChatService, Services, UserService } from '../contracts';
import type { Member, Message, UserProfile } from '@/types';
import { api, ApiError } from './client';
import { createWsRealtime } from '../realtime/ws';
import { createWebRtcVoice } from '../voice/webrtc';

const auth: AuthService = {
  login: (password) => api<{ token: string }>('/auth/login', { method: 'POST', json: { password } }),
  async validate() {
    try {
      await api('/auth/session');
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return false;
      throw e;
    }
  },
  logout: () => api('/auth/logout', { method: 'POST' }),
};

const users: UserService = {
  async getMe() {
    try {
      return await api<UserProfile>('/me');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  createMe: (nick) => api<UserProfile>('/me', { method: 'POST', json: { nick } }),
  updateMe: (patch) => api<UserProfile>('/me', { method: 'PATCH', json: patch }),
  listMembers: () => api<Member[]>('/members'),
  async upload(file, kind, filename = 'upload') {
    const form = new FormData();
    form.append('file', file, filename);
    form.append('kind', kind);
    const { url } = await api<{ url: string }>('/uploads', { method: 'POST', body: form });
    return url;
  },
};

const chat: ChatService = {
  history(channelId, opts = {}) {
    const q = new URLSearchParams();
    if (opts.before) q.set('before', opts.before);
    q.set('limit', String(opts.limit ?? 50));
    return api<Message[]>(`/channels/${channelId}/messages?${q}`);
  },
  async send(channelId, content, files = [], clientId) {
    const attachments = await Promise.all(
      files.map(async (f) => ({ url: await users.upload(f, 'attachment', f.name), name: f.name, mime: f.type })),
    );
    return api<Message>(`/channels/${channelId}/messages`, {
      method: 'POST',
      json: { content, attachments, clientId },
    });
  },
};

export function createHttpServices(): Services {
  const realtime = createWsRealtime();
  return { auth, users, chat, realtime, voice: createWebRtcVoice(realtime) };
}
