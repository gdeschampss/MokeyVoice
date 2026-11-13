/**
 * Adaptador de voz/stream para o back-end real.
 *
 * Arquitetura recomendada (ver docs/ARCHITECTURE.md → "Voz e stream"):
 *   - Sinalização e estado das salas: REST + WebSocket do nosso back-end
 *   - Mídia (áudio, tela): WebRTC via SFU (LiveKit self-hosted é o caminho mais curto)
 *     → latência típica < 200 ms, ninguém sobe N cópias do próprio stream.
 *
 * O que já está pronto aqui: microfone, detector de fala, captura de tela,
 * mute/deafen e o fluxo de entrar/sair. Falta só ligar as tracks no SFU
 * (pontos marcados com TODO[SFU]).
 */
import type { RealtimeService, VoiceEvent, VoiceService } from '../contracts';
import { Emitter } from '@/lib/emitter';
import { api } from '../http/client';
import type { VoiceRooms } from '@/types';
import { captureScreen, createSpeakingDetector, getMicrophone, stopStream } from './localMedia';

interface JoinResponse {
  /** URL do SFU (ex.: wss://voz.seudominio.com) */
  sfuUrl: string;
  /** Token de acesso à sala no SFU, emitido pelo nosso back-end */
  sfuToken: string;
}

export function createWebRtcVoice(realtime: RealtimeService): VoiceService {
  const events = new Emitter<{ event: VoiceEvent }>();
  let mic: MediaStream | null = null;
  let screen: MediaStream | null = null;
  let stopDetector: (() => void) | null = null;
  let channel: string | null = null;

  const emit = (e: VoiceEvent) => events.emit('event', e);

  const service: VoiceService = {
    getRooms: () => api<VoiceRooms>('/voice/rooms'),

    async join(channelId, { muted, deafened }) {
      if (channel) await service.leave();
      const join = await api<JoinResponse>(`/voice/${channelId}/join`, {
        method: 'POST',
        json: { muted, deafened },
      });
      channel = channelId;

      mic = await getMicrophone();
      if (!mic) emit({ type: 'error', message: 'Sem acesso ao microfone — entrando mutado.' });
      mic?.getAudioTracks().forEach((t) => (t.enabled = !muted && !deafened));
      if (mic) {
        stopDetector = createSpeakingDetector(mic, (speaking) => realtime.send('voice:speaking', { speaking }));
      }

      // TODO[SFU]: conectar em join.sfuUrl com join.sfuToken, publicar a track do mic
      // e, para cada track remota recebida:
      //   - áudio  → tocar num <audio autoplay> (respeitando deafen)
      //   - vídeo  → emit({ type: 'remote-stream', userId, stream })
      void join;
    },

    async leave() {
      service.stopScreenShare();
      stopDetector?.();
      stopDetector = null;
      stopStream(mic);
      mic = null;
      // TODO[SFU]: desconectar da sala
      if (channel) await api(`/voice/${channel}/leave`, { method: 'POST' }).catch(() => undefined);
      channel = null;
    },

    setMuted(muted) {
      mic?.getAudioTracks().forEach((t) => (t.enabled = !muted));
      realtime.send('voice:update', { muted });
    },

    setDeafened(deafened) {
      // TODO[SFU]: silenciar/reativar os <audio> remotos
      realtime.send('voice:update', { deafened });
    },

    async startScreenShare(quality) {
      stopStream(screen);
      screen = await captureScreen(quality);
      screen.getVideoTracks()[0]?.addEventListener('ended', () => {
        service.stopScreenShare();
        emit({ type: 'screen-ended' });
      });
      // TODO[SFU]: publicar as tracks de `screen` (vídeo com simulcast desligado
      // e degradationPreference 'maintain-framerate' para jogos)
      realtime.send('voice:update', { streaming: true });
      return screen;
    },

    stopScreenShare() {
      if (!screen) return;
      // TODO[SFU]: despublicar as tracks
      stopStream(screen);
      screen = null;
      realtime.send('voice:update', { streaming: false });
    },

    on: (listener) => events.on('event', listener),
  };

  return service;
}
