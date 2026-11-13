const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const formatTime = (d: Date) => timeFmt.format(d);

/** "Hoje às 20:19", "Ontem às 22:01", "10/11/2026 18:00" — como no Discord. */
export function formatStamp(d: Date, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return `Hoje às ${formatTime(d)}`;
  if (isSameDay(d, yesterday)) return `Ontem às ${formatTime(d)}`;
  return `${dateFmt.format(d)} ${formatTime(d)}`;
}

export const formatDay = (d: Date) => dayFmt.format(d);

export function initials(nick: string) {
  const parts = nick.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Texto claro ou escuro sobre uma cor de fundo. */
export function readableOn(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#1E2124' : '#FFFFFF';
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

export function splitLinks(text: string): Array<{ type: 'text' | 'link'; value: string }> {
  const out: Array<{ type: 'text' | 'link'; value: string }> = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: 'text', value: text.slice(last, i) });
    out.push({ type: 'link', value: m[0] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

export const isImageUrl = (url: string) => /\.(gif|png|jpe?g|webp|avif)(\?.*)?$/i.test(url) || /media\d?\.giphy\.com|tenor\.com\/.*\.gif/i.test(url);
