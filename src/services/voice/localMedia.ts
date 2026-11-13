/**
 * Mídia local: microfone, detector de fala e captura de tela.
 * Usado pelo mock e pelo adaptador real (o SFU só recebe as tracks prontas).
 */
import type { StreamQuality } from '@/types';

export const STREAM_PRESETS: Record<
  StreamQuality,
  { label: string; detail: string; height: number; frameRate: number; hint: 'motion' | 'detail' }
> = {
  smooth: { label: 'Suave', detail: '720p · 60 fps — jogos', height: 720, frameRate: 60, hint: 'motion' },
  sharp: { label: 'Nítido', detail: '1080p · 30 fps — texto e código', height: 1080, frameRate: 30, hint: 'detail' },
  max: { label: 'Máximo', detail: '1080p · 60 fps — exige boa internet', height: 1080, frameRate: 60, hint: 'motion' },
};

export async function getMicrophone(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  } catch {
    return null;
  }
}

/**
 * Captura de tela com foco em baixa latência:
 * - frameRate alto + contentHint 'motion' para jogos (o encoder prioriza fluidez)
 * - contentHint 'detail' para texto (prioriza nitidez)
 * - áudio do sistema quando o navegador permitir
 */
export async function captureScreen(quality: StreamQuality): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Seu navegador não suporta transmissão de tela.');
  }
  const preset = STREAM_PRESETS[quality];
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { height: { ideal: preset.height }, frameRate: { ideal: preset.frameRate, max: preset.frameRate } },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  stream.getVideoTracks().forEach((t) => {
    t.contentHint = preset.hint;
  });
  return stream;
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Detector de fala por volume (RMS). Chama onChange só quando o estado muda,
 * com um "hold" pra não piscar entre sílabas.
 */
export function createSpeakingDetector(
  stream: MediaStream,
  onChange: (speaking: boolean) => void,
  { threshold = 0.035, holdMs = 280 } = {},
): () => void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  let speaking = false;
  let lastLoud = 0;

  // setInterval (e não rAF) para continuar funcionando com a aba em segundo plano.
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    const now = performance.now();
    if (rms > threshold) lastLoud = now;
    const next = now - lastLoud < holdMs;
    if (next !== speaking) {
      speaking = next;
      onChange(speaking);
    }
  }, 60);

  return () => {
    window.clearInterval(timer);
    source.disconnect();
    void ctx.close();
  };
}
