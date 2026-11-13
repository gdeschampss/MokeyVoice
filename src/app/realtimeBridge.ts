/**
 * Liga os eventos em tempo real (WebSocket ou mock) às stores.
 * É o único lugar que conhece os dois lados — UI e serviços continuam desacoplados.
 */
import { services } from '@/services';
import { useChat } from '@/stores/chat';
import { useMembers } from '@/stores/members';
import { useVoice } from '@/stores/voice';
import { toast } from '@/stores/ui';

let unsubs: Array<() => void> = [];

export async function startRealtime(token: string) {
  await stopRealtime();
  const { realtime, voice, users } = services;

  unsubs = [
    realtime.on('message:new', (m) => useChat.getState().receive(m)),
    realtime.on('member:update', (m) => useMembers.getState().upsert(m)),
    realtime.on('presence:update', ({ userId, status }) => useMembers.getState().setPresence(userId, status)),
    realtime.on('voice:state', ({ channelId, participants }) => useVoice.getState().setRoom(channelId, participants)),
    realtime.on('voice:speaking', ({ userId, speaking }) => useVoice.getState().setSpeaking(userId, speaking)),
    voice.on((e) => {
      const v = useVoice.getState();
      if (e.type === 'speaking') v.setSpeaking(e.userId, e.speaking);
      if (e.type === 'remote-stream') v.setRemoteStream(e.userId, e.stream);
      if (e.type === 'screen-ended') useVoice.setState({ localScreen: null });
      if (e.type === 'error') toast(e.message, 'error');
    }),
  ];

  realtime.connect(token);

  const [members, rooms] = await Promise.all([users.listMembers(), voice.getRooms()]);
  useMembers.getState().setAll(members);
  useVoice.getState().setRooms(rooms);
}

export async function stopRealtime() {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (useVoice.getState().current) await useVoice.getState().leave().catch(() => undefined);
  services.realtime.disconnect();
  useVoice.getState().reset();
  useChat.getState().reset();
  useMembers.getState().reset();
}
