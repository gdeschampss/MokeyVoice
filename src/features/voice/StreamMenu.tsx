import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { STREAM_PRESETS } from '@/services/voice/localMedia';
import type { StreamQuality } from '@/types';
import s from './StreamMenu.module.css';

interface Props {
  onPick: (q: StreamQuality) => void;
  onClose: () => void;
  /** Para onde o menu abre a partir do botão. */
  placement?: 'up-left' | 'up-center';
  current?: StreamQuality;
}

/** Escolha de qualidade antes de transmitir — fluidez (jogo) vs nitidez (texto). */
export function StreamMenu({ onPick, onClose, placement = 'up-left', current }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    // adia um tick para não fechar com o próprio clique que abriu
    const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown));
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={s.menu} data-placement={placement} role="menu" aria-label="Qualidade da transmissão">
      <p className={s.title}>Qualidade da transmissão</p>
      {(Object.keys(STREAM_PRESETS) as StreamQuality[]).map((q) => (
        <button
          key={q}
          role="menuitem"
          className={s.item}
          onClick={() => {
            onPick(q);
            onClose();
          }}
        >
          <span>
            <strong>{STREAM_PRESETS[q].label}</strong>
            <small>{STREAM_PRESETS[q].detail}</small>
          </span>
          {current === q && <Check size={16} />}
        </button>
      ))}
    </div>
  );
}
