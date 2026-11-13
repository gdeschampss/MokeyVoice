/**
 * WebSocket com reconexão exponencial.
 * Formato das mensagens (nos dois sentidos): { "type": string, "data": any }
 */
import { config } from '@/config/env';
import { Emitter } from '@/lib/emitter';
import type { ConnectionState, RealtimeEvents, RealtimeService } from '../contracts';

export function createWsRealtime(): RealtimeService {
  const bus = new Emitter<RealtimeEvents>();
  const stateBus = new Emitter<{ state: ConnectionState }>();
  let socket: WebSocket | null = null;
  let token: string | null = null;
  let attempt = 0;
  let retryTimer: number | null = null;
  let manualClose = false;
  const queue: string[] = [];

  const setState = (s: ConnectionState) => stateBus.emit('state', s);

  function open() {
    if (!token) return;
    setState(attempt === 0 ? 'connecting' : 'reconnecting');
    const url = new URL(config.wsUrl);
    url.searchParams.set('token', token);
    socket = new WebSocket(url);

    socket.onopen = () => {
      attempt = 0;
      setState('open');
      while (queue.length) socket?.send(queue.shift()!);
    };
    socket.onmessage = (ev) => {
      try {
        const { type, data } = JSON.parse(String(ev.data));
        bus.emit(type as keyof RealtimeEvents, data);
      } catch {
        /* ignora mensagem malformada */
      }
    };
    socket.onclose = (ev) => {
      socket = null;
      if (manualClose) return setState('closed');
      if (ev.code === 4001) {
        // 4001 = token inválido (convenção combinada com o back-end)
        window.dispatchEvent(new Event('mv:unauthorized'));
        return setState('closed');
      }
      const wait = Math.min(15_000, 500 * 2 ** attempt++) + Math.random() * 300;
      setState('reconnecting');
      retryTimer = window.setTimeout(open, wait);
    };
  }

  return {
    connect(t) {
      token = t;
      manualClose = false;
      if (!socket) open();
    },
    disconnect() {
      manualClose = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
      socket = null;
    },
    on: (event, handler) => bus.on(event, handler),
    onState: (handler) => stateBus.on('state', handler),
    send(type, data) {
      const payload = JSON.stringify({ type, data });
      if (socket?.readyState === WebSocket.OPEN) socket.send(payload);
      else queue.push(payload);
    },
  };
}
