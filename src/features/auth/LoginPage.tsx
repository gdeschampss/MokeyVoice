import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { SERVER } from '@/config/channels';
import { useAuth } from '@/stores/auth';
import { Avatar, Button, Field, inputClass } from '@/components/ui';
import s from './LoginPage.module.css';

export function LoginPage() {
  const status = useAuth((st) => st.status);
  if (status === 'ready') return <Navigate to="/" replace />;
  if (status === 'checking') return null;

  return (
    <main className={s.page}>
      <div className={s.card}>
        <header className={s.brand}>
          <img src={SERVER.logo} alt="" className={s.logo} width={88} height={86} />
          <img src={SERVER.wordmark} alt="MonkeyVoice" className={s.wordmark} />
        </header>
        {status === 'needs-profile' ? <NickStep /> : <PasswordStep />}
      </div>
    </main>
  );
}

function PasswordStep() {
  const login = useAuth((st) => st.login);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
    } catch (err) {
      setError((err as Error).message || 'Não deu pra entrar.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <div className={s.heading}>
        <h1>{SERVER.name}</h1>
        <p>Digite a senha do bando para entrar.</p>
      </div>
      <Field label="Senha de acesso" htmlFor="password">
        <div className={s.passwordWrap}>
          <input
            id="password"
            className={inputClass}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <button
            type="button"
            className={s.reveal}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      {error && (
        <p id="login-error" className={s.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="l" loading={loading} disabled={!password}>
        Entrar
      </Button>
      <p className={s.hint}>Depois de entrar, este navegador lembra de você.</p>
    </form>
  );
}

function NickStep() {
  const createProfile = useAuth((st) => st.createProfile);
  const logout = useAuth((st) => st.logout);
  const [nick, setNick] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const valid = nick.trim().length >= 2;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      await createProfile(nick);
    } catch (err) {
      setError((err as Error).message || 'Não deu pra salvar o nick.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <div className={s.heading}>
        <h1>Como o bando te chama?</h1>
        <p>Só o seu nick aparece para os outros. Dá pra mudar depois.</p>
      </div>
      <div className={s.nickRow}>
        <Avatar user={{ nick: nick || '?', avatarUrl: null, accentColor: '#5E5C97' }} size={48} />
        <div className={s.grow}>
          <Field label="Nick" htmlFor="nick">
            <input
              id="nick"
              className={inputClass}
              maxLength={32}
              autoFocus
              autoComplete="nickname"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
          </Field>
        </div>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="l" loading={loading} disabled={!valid}>
        Entrar no chat
      </Button>
      <button type="button" className={s.back} onClick={() => void logout()}>
        Voltar
      </button>
    </form>
  );
}
