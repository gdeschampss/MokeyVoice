import { create } from 'zustand';
import { services } from '@/services';
import { uid } from '@/lib/format';
import type { ChannelId, Message, UserId } from '@/types';
import { toast } from './ui';

interface ChannelState {
  messages: Message[];
  loading: boolean;
  loaded: boolean;
}

interface ChatState {
  channels: Record<ChannelId, ChannelState>;
  load(channelId: ChannelId): Promise<void>;
  send(channelId: ChannelId, authorId: UserId, content: string, files?: File[]): Promise<void>;
  receive(msg: Message): void;
  reset(): void;
}

const empty: ChannelState = { messages: [], loading: false, loaded: false };

export const useChat = create<ChatState>((set, get) => {
  const patch = (id: ChannelId, p: Partial<ChannelState>) =>
    set({ channels: { ...get().channels, [id]: { ...(get().channels[id] ?? empty), ...p } } });

  return {
    channels: {},

    async load(channelId) {
      const cur = get().channels[channelId];
      if (cur?.loading || cur?.loaded) return;
      patch(channelId, { loading: true });
      try {
        const messages = await services.chat.history(channelId);
        // Mescla com mensagens que chegaram por realtime enquanto carregava.
        const live = get().channels[channelId]?.messages ?? [];
        const ids = new Set(messages.map((m) => m.id));
        patch(channelId, { messages: [...messages, ...live.filter((m) => !ids.has(m.id))], loaded: true });
      } catch (e) {
        toast((e as Error).message || 'Não deu pra carregar as mensagens.', 'error');
      } finally {
        patch(channelId, { loading: false });
      }
    },

    async send(channelId, authorId, content, files = []) {
      // Envio otimista: aparece na hora, confirma quando o servidor responder.
      const clientId = uid();
      const optimistic: Message = {
        id: clientId,
        channelId,
        authorId,
        content,
        createdAt: new Date().toISOString(),
        pending: true,
        attachments: files.map((f) => ({ id: uid(), url: URL.createObjectURL(f), name: f.name, mime: f.type })),
      };
      get().receive(optimistic);
      try {
        const saved = await services.chat.send(channelId, content, files, clientId);
        get().receive(saved);
      } catch (e) {
        const list = get().channels[channelId]?.messages ?? [];
        patch(channelId, {
          messages: list.map((m) => (m.id === clientId ? { ...m, pending: false, failed: true } : m)),
        });
        toast((e as Error).message || 'Mensagem não foi enviada.', 'error');
      }
    },

    receive(msg) {
      const list = get().channels[msg.channelId]?.messages ?? [];
      const i = list.findIndex((m) => m.id === msg.id);
      const next = i === -1 ? [...list, msg] : list.map((m, j) => (j === i ? { ...msg, pending: false } : m));
      patch(msg.channelId, { messages: next });
    },

    reset: () => set({ channels: {} }),
  };
});
