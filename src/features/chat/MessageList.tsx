import { Fragment, memo, useLayoutEffect, useRef } from 'react';
import { Hash } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { formatDay, formatStamp, formatTime, isImageUrl, isSameDay, splitLinks } from '@/lib/format';
import { useChat } from '@/stores/chat';
import { useMember } from '@/stores/members';
import { useUi } from '@/stores/ui';
import type { Message, TextChannel } from '@/types';
import s from './Chat.module.css';

/** Mensagens do mesmo autor em até 7 min viram um grupo (sem repetir avatar/nome). */
const GROUP_WINDOW = 7 * 60_000;

export function MessageList({ channel }: { channel: TextChannel }) {
  const state = useChat((st) => st.channels[channel.id]);
  const messages = state?.messages ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Gruda no fim quando chega mensagem — a não ser que a pessoa tenha rolado pra cima.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, channel.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  return (
    <div className={s.scroller} ref={scrollRef} onScroll={onScroll}>
      <div className={s.messages}>
        <div className={s.welcome}>
          <span className={s.welcomeIcon}>
            <Hash size={40} />
          </span>
          <h2>Bem-vindo a #{channel.name}</h2>
          <p>Início do canal. Tudo que o bando mandar aparece aqui.</p>
        </div>

        {state?.loading && messages.length === 0 && <MessagesSkeleton />}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const date = new Date(m.createdAt);
          const prevDate = prev ? new Date(prev.createdAt) : null;
          const newDay = !prevDate || !isSameDay(prevDate, date);
          const grouped =
            !newDay && prev && prev.authorId === m.authorId && date.getTime() - prevDate!.getTime() < GROUP_WINDOW;
          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className={s.dayDivider} role="separator">
                  <span>{formatDay(date)}</span>
                </div>
              )}
              <MessageItem message={m} grouped={!!grouped} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

const MessageItem = memo(function MessageItem({ message, grouped }: { message: Message; grouped: boolean }) {
  const author = useMember(message.authorId);
  const openProfile = useUi((st) => st.openProfile);
  const date = new Date(message.createdAt);
  const open = (el: Element) => openProfile(message.authorId, el, 'right');

  return (
    <article
      className={s.message}
      data-grouped={grouped || undefined}
      data-pending={message.pending || undefined}
      data-failed={message.failed || undefined}
    >
      {grouped ? (
        <time className={s.hoverTime} dateTime={message.createdAt}>
          {formatTime(date)}
        </time>
      ) : (
        <button className={s.avatarBtn} onClick={(e) => open(e.currentTarget)} aria-label={`Perfil de ${author?.nick}`}>
          <Avatar user={author} size={40} />
        </button>
      )}

      <div className={s.messageBody}>
        {!grouped && (
          <header className={s.messageHeader}>
            <button className={s.author} style={{ color: author?.accentColor }} onClick={(e) => open(e.currentTarget)}>
              {author?.nick ?? 'Macaco sumido'}
            </button>
            <time className={s.stamp} dateTime={message.createdAt}>
              {formatStamp(date)}
            </time>
          </header>
        )}
        {message.content && <MessageContent text={message.content} />}
        {message.attachments?.map((a) =>
          a.mime.startsWith('image/') ? (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={s.media}>
              <img src={a.url} alt={a.name} loading="lazy" />
            </a>
          ) : (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={s.file}>
              {a.name}
            </a>
          ),
        )}
        {message.failed && <p className={s.failed}>Não enviada.</p>}
      </div>
    </article>
  );
});

function MessageContent({ text }: { text: string }) {
  const parts = splitLinks(text);
  // Mensagem que é só um link de GIF/imagem vira a própria imagem (como colar um GIF no Discord).
  const onlyImage = parts.length === 1 && parts[0].type === 'link' && isImageUrl(parts[0].value);
  if (onlyImage) {
    return (
      <a href={parts[0].value} target="_blank" rel="noreferrer" className={s.media}>
        <img src={parts[0].value} alt="" loading="lazy" />
      </a>
    );
  }
  return (
    <p className={s.text}>
      {parts.map((p, i) =>
        p.type === 'link' ? (
          <a key={i} href={p.value} target="_blank" rel="noreferrer">
            {p.value}
          </a>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        ),
      )}
    </p>
  );
}

function MessagesSkeleton() {
  return (
    <div aria-busy className={s.skeleton}>
      {[62, 40, 75, 30].map((w, i) => (
        <div key={i} className={s.skelRow}>
          <span className={s.skelAvatar} />
          <span className={s.skelLines}>
            <span style={{ width: '18%' }} />
            <span style={{ width: `${w}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
