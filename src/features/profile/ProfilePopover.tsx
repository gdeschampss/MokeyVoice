import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { VOICE_CHANNELS } from '@/config/channels';
import { useAuth } from '@/stores/auth';
import { useMember } from '@/stores/members';
import { useUi } from '@/stores/ui';
import { findUserRoom, useVoice } from '@/stores/voice';
import { ProfileCard } from './ProfileCard';
import s from './ProfilePopover.module.css';

const GAP = 12;
const MARGIN = 8;

export function ProfilePopover() {
  const popover = useUi((st) => st.popover);
  const close = useUi((st) => st.closeProfile);
  const openSettings = useUi((st) => st.openSettings);
  const me = useAuth((st) => st.me);
  const member = useMember(popover?.userId);
  const roomId = useVoice((st) => (popover ? findUserRoom(st.rooms, popover.userId) : null));
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Posiciona ao lado do elemento clicado sem sair da tela.
  useLayoutEffect(() => {
    if (!popover || !ref.current) return setPos(null);
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const a = popover.anchor;
    let top: number;
    let left: number;
    if (vw < 520) {
      // mobile: centraliza
      left = (vw - width) / 2;
      top = Math.max(MARGIN, (vh - height) / 2);
    } else if (popover.side === 'top') {
      left = a.left;
      top = a.top - height - GAP;
    } else if (popover.side === 'left') {
      left = a.left - width - GAP;
      top = a.top;
    } else {
      left = a.right + GAP;
      top = a.top;
    }
    left = Math.min(Math.max(MARGIN, left), vw - width - MARGIN);
    top = Math.min(Math.max(MARGIN, top), vh - height - MARGIN);
    setPos({ top, left });
  }, [popover, member]);

  useEffect(() => {
    if (!popover) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown));
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [popover, close]);

  if (!popover || !member) return null;
  const isMe = me?.id === member.id;
  const profile = isMe && me ? { ...member, ...me } : member;
  const room = VOICE_CHANNELS.find((c) => c.id === roomId);

  return createPortal(
    <div
      ref={ref}
      className={s.pop}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
      role="dialog"
      aria-label={`Perfil de ${profile.nick}`}
    >
      <ProfileCard
        profile={profile}
        status={isMe ? 'online' : member.status}
        activity={
          room ? (
            <>
              <Volume2 size={14} /> Em {room.name}
            </>
          ) : undefined
        }
        footer={
          isMe ? (
            <Button variant="secondary" onClick={openSettings} style={{ width: '100%' }}>
              <Pencil size={16} /> Editar perfil
            </Button>
          ) : undefined
        }
      />
    </div>,
    document.body,
  );
}
