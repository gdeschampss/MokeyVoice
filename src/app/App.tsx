import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DEFAULT_CHANNEL_ID, SERVER } from '@/config/channels';
import { LoginPage } from '@/features/auth/LoginPage';
import { AppShell } from '@/features/layout/AppShell';
import { ChannelView } from '@/features/layout/ChannelView';
import { UNAUTHORIZED_EVENT } from '@/services/http/client';
import { useAuth } from '@/stores/auth';
import s from './App.module.css';

export function App() {
  const bootstrap = useAuth((st) => st.bootstrap);
  const expire = useAuth((st) => st.expire);

  useEffect(() => {
    void bootstrap();
    window.addEventListener(UNAUTHORIZED_EVENT, expire);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, expire);
  }, [bootstrap, expire]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to={`/canal/${DEFAULT_CHANNEL_ID}`} replace />} />
          <Route path="/canal/:channelId" element={<ChannelView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RequireAuth() {
  const status = useAuth((st) => st.status);
  if (status === 'checking') return <Splash />;
  if (status !== 'ready') return <Navigate to="/entrar" replace />;
  return <AppShell />;
}

function Splash() {
  return (
    <div className={s.splash} aria-busy>
      <img src={SERVER.logo} alt="" className={s.splashLogo} />
    </div>
  );
}
