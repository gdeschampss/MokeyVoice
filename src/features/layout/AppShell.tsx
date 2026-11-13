import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChannelSidebar } from '@/features/channels/ChannelSidebar';
import { MemberList } from '@/features/members/MemberList';
import { ProfilePopover } from '@/features/profile/ProfilePopover';
import { ProfileSettingsModal } from '@/features/profile/ProfileSettingsModal';
import { Toasts } from '@/components/ui';
import { MOBILE, WIDE, useMediaQuery } from '@/lib/useMediaQuery';
import { useUi } from '@/stores/ui';
import s from './AppShell.module.css';

export function AppShell() {
  const { sidebarOpen, membersOpen, settingsOpen, setSidebar, setMembers } = useUi();
  const isMobile = useMediaQuery(MOBILE);
  const isWide = useMediaQuery(WIDE);
  const location = useLocation();

  // Trocar de canal fecha as gavetas no mobile.
  useEffect(() => {
    setSidebar(false);
    if (!isWide) setMembers(false);
  }, [location.pathname]);

  // Ao passar para tela larga, a lista de membros volta a ser coluna fixa.
  useEffect(() => {
    setMembers(isWide);
  }, [isWide, setMembers]);

  const drawerOpen = (isMobile && sidebarOpen) || (!isWide && membersOpen);

  return (
    <div className={s.shell} data-members={membersOpen}>
      <aside className={s.sidebar} data-open={sidebarOpen} aria-label="Canais">
        <ChannelSidebar />
      </aside>

      <main className={s.main}>
        <Outlet />
      </main>

      <aside className={s.members} aria-label="Membros" aria-hidden={!membersOpen}>
        <MemberList />
      </aside>

      {drawerOpen && (
        <div
          className={s.scrim}
          onClick={() => {
            setSidebar(false);
            if (!isWide) setMembers(false);
          }}
        />
      )}

      <ProfilePopover />
      {settingsOpen && <ProfileSettingsModal />}
      <Toasts />
    </div>
  );
}
