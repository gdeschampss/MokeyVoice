import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui';
import type { PresenceStatus, UserProfile } from '@/types';
import s from './ProfileCard.module.css';

interface Props {
  profile: UserProfile;
  status?: PresenceStatus;
  /** Linha extra (ex.: "Em Bando #1"). */
  activity?: ReactNode;
  footer?: ReactNode;
}

/**
 * Cartão de perfil — usado no popover e na prévia das configurações.
 * Só o nick aparece; a cor do perfil tinge o cartão inteiro.
 */
export function ProfileCard({ profile, status, activity, footer }: Props) {
  return (
    <article className={s.card} style={{ ['--accent-user' as string]: profile.accentColor }}>
      <div className={s.banner}>
        {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className={s.bannerImg} />}
      </div>

      <div className={s.avatarWrap}>
        <Avatar user={profile} size={84} status={status} cut="var(--card-bg)" />
      </div>

      <div className={s.body}>
        <h3 className={s.nick}>{profile.nick}</h3>
        {activity && <p className={s.activity}>{activity}</p>}

        {profile.featuredGifUrl && (
          <section className={s.featured}>
            <h4 className={s.featuredTitle}>Em destaque</h4>
            <img src={profile.featuredGifUrl} alt={`GIF em destaque de ${profile.nick}`} className={s.gif} />
          </section>
        )}

        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </article>
  );
}
