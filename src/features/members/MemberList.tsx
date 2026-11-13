import { useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { VOICE_CHANNELS } from '@/config/channels';
import { useMembers } from '@/stores/members';
import { useUi } from '@/stores/ui';
import { findUserRoom, useVoice } from '@/stores/voice';
import type { Member } from '@/types';
import s from './MemberList.module.css';

const byNick = (a: Member, b: Member) => a.nick.localeCompare(b.nick, 'pt-BR');

export function MemberList() {
  const byId = useMembers((st) => st.byId);
  const loaded = useMembers((st) => st.loaded);

  const { online, offline } = useMemo(() => {
    const all = Object.values(byId);
    return {
      online: all.filter((m) => m.status === 'online').sort(byNick),
      offline: all.filter((m) => m.status !== 'online').sort(byNick),
    };
  }, [byId]);

  return (
    <div className={s.wrap}>
      {!loaded ? (
        <SkeletonList />
      ) : (
        <>
          <Group title="Macacos online" members={online} />
          <Group title="Macacos offline" members={offline} />
        </>
      )}
    </div>
  );
}

function Group({ title, members }: { title: string; members: Member[] }) {
  if (members.length === 0) return null;
  return (
    <section className={s.group}>
      <h2 className={s.title}>
        {title} — {members.length}
      </h2>
      <ul className={s.list}>
        {members.map((m) => (
          <MemberRow key={m.id} member={m} />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({ member }: { member: Member }) {
  const openProfile = useUi((st) => st.openProfile);
  const roomId = useVoice((st) => findUserRoom(st.rooms, member.id));
  const streaming = useVoice((st) => (roomId ? st.rooms[roomId]?.find((p) => p.userId === member.id)?.streaming : false));
  const room = VOICE_CHANNELS.find((c) => c.id === roomId);
  const offline = member.status !== 'online';

  return (
    <li>
      <button
        className={s.row}
        data-offline={offline || undefined}
        onClick={(e) => openProfile(member.id, e.currentTarget, 'left')}
      >
        <Avatar user={member} size={32} status={member.status} />
        <span className={s.text}>
          <span className={s.nick} style={{ color: offline ? undefined : member.accentColor }}>
            {member.nick}
          </span>
          {room && (
            <span className={s.activity}>
              <Volume2 size={12} />
              {streaming ? 'Transmitindo em ' : 'Em '}
              {room.name}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className={s.group} aria-busy>
      <div className={s.skelTitle} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={s.skelRow}>
          <span className={s.skelAvatar} />
          <span className={s.skelLine} style={{ width: `${45 + ((i * 17) % 40)}%` }} />
        </div>
      ))}
    </div>
  );
}
