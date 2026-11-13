import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { initials, readableOn } from '@/lib/format';
import { useUi } from '@/stores/ui';
import type { PresenceStatus, UserProfile } from '@/types';
import s from './ui.module.css';

/* ---------- Avatar ---------- */

interface AvatarProps {
  user: Pick<UserProfile, 'nick' | 'avatarUrl' | 'accentColor'> | undefined;
  size?: number;
  status?: PresenceStatus;
  speaking?: boolean;
  /** Cor do fundo atrás do avatar, para o "recorte" do ponto de status. */
  cut?: string;
}

export function Avatar({ user, size = 32, status, speaking, cut }: AvatarProps) {
  const color = user?.accentColor ?? '#4a4f55';
  return (
    <span
      className={s.avatar}
      style={{ width: size, height: size, ['--cut' as string]: cut }}
      data-speaking={speaking ? 'true' : undefined}
    >
      {user?.avatarUrl ? (
        <img className={s.avatarImg} src={user.avatarUrl} alt="" draggable={false} />
      ) : (
        <span
          className={s.avatarFallback}
          style={{ background: color, color: readableOn(color), fontSize: Math.max(10, size * 0.36) }}
          aria-hidden
        >
          {initials(user?.nick ?? '?')}
        </span>
      )}
      {status && <span className={s.status} data-status={status} aria-label={status} />}
    </span>
  );
}

/* ---------- IconButton ---------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  danger?: boolean;
  tipSide?: 'top' | 'bottom';
  size?: number;
}

export function IconButton({ label, active, danger, tipSide, size, children, style, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={s.iconBtn}
      aria-label={label}
      data-tip={label}
      data-tip-side={tipSide}
      data-active={active || undefined}
      data-danger={danger || undefined}
      style={size ? { width: size, height: size, ...style } : style}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Button ---------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'm' | 'l';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'm', loading, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={s.btn}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={s.spinner} aria-label="Carregando" /> : children}
    </button>
  );
}

/* ---------- Field ---------- */

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label className={s.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass = s.input;

/* ---------- Modal (portal + Esc + clique fora) ---------- */

export function Modal({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Toasts ---------- */

export function Toasts() {
  const toasts = useUi((st) => st.toasts);
  const dismiss = useUi((st) => st.dismissToast);
  return createPortal(
    <div className={s.toasts} aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={s.toast} data-tone={t.tone} onClick={() => dismiss(t.id)}>
          {t.text}
        </button>
      ))}
    </div>,
    document.body,
  );
}
