import type { ReactNode } from 'react';
import { Menu, Users } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { useUi } from '@/stores/ui';
import s from './ChannelHeader.module.css';

interface Props {
  icon: ReactNode;
  title: string;
  topic?: string;
  actions?: ReactNode;
  /** Mostrar o botão de membros (escondido dentro da call no mobile, por exemplo). */
  showMembersToggle?: boolean;
}

export function ChannelHeader({ icon, title, topic, actions, showMembersToggle = true }: Props) {
  const setSidebar = useUi((st) => st.setSidebar);
  const membersOpen = useUi((st) => st.membersOpen);
  const toggleMembers = useUi((st) => st.toggleMembers);

  return (
    <header className={s.header}>
      <button className={s.menu} onClick={() => setSidebar(true)} aria-label="Abrir canais">
        <Menu size={22} />
      </button>
      <span className={s.icon}>{icon}</span>
      <h1 className={s.title}>{title}</h1>
      {topic && (
        <>
          <span className={s.divider} aria-hidden />
          <p className={s.topic}>{topic}</p>
        </>
      )}
      <div className={s.actions}>
        {actions}
        {showMembersToggle && (
          <IconButton
            label={membersOpen ? 'Esconder macacos' : 'Mostrar macacos'}
            tipSide="bottom"
            active={membersOpen}
            onClick={toggleMembers}
          >
            <Users size={20} />
          </IconButton>
        )}
      </div>
    </header>
  );
}
