import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Hash,
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Settings,
  Volume2,
} from 'lucide-react';
import { SERVER, TEXT_CHANNELS, VOICE_CHANNELS, isRoomFull } from '@/config/channels';
import { Avatar, IconButton } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { useMembers } from '@/stores/members';
import { useUi } from '@/stores/ui';
import { NO_PARTICIPANTS, useVoice } from '@/stores/voice';
import type { VoiceChannel } from '@/types';
import { StreamMenu } from '@/features/voice/StreamMenu';
import s from './ChannelSidebar.module.css';

export function ChannelSidebar() {
  return (
    <>
      <header className={s.header}>
        <img src={SERVER.logo} alt="" className={s.logo} />
        <span className={s.serverName}>{SERVER.name}</span>
      </header>

      <nav className={s.scroll}>
        <Section title="Canais de texto">
          {TEXT_CHANNELS.map((c) => (
            <NavLink key={c.id} to={`/canal/${c.id}`} className={s.channel}>
              <Hash size={20} className={s.channelIcon} />
              <span className={s.channelName}>{c.name}</span>
            </NavLink>
          ))}
        </Section>

        <Section title="Canais de voz">
          {VOICE_CHANNELS.map((c) => (
            <VoiceChannelItem key={c.id} channel={c} />
          ))}
        </Section>
      </nav>

      <VoiceConnectionPanel />
      <UserPanel />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <div className={s.list}>{children}</div>
    </section>
  );
}

/* ---------- Canal de voz + quem está nele ---------- */

function VoiceChannelItem({ channel }: { channel: VoiceChannel }) {
  const navigate = useNavigate();
  const participants = useVoice((st) => st.rooms[channel.id] ?? NO_PARTICIPANTS);
  const current = useVoice((st) => st.current);
  const joining = useVoice((st) => st.joining);
  const speaking = useVoice((st) => st.speaking);
  const join = useVoice((st) => st.join);
  const members = useMembers((st) => st.byId);
  const openProfile = useUi((st) => st.openProfile);

  const full = isRoomFull(channel, participants.length);
  const inside = current === channel.id;

  async function enter() {
    if (inside) return navigate(`/canal/${channel.id}`);
    // Sala cheia: ainda dá pra espiar quem está lá.
    if (full) return navigate(`/canal/${channel.id}`);
    if (await join(channel.id)) navigate(`/canal/${channel.id}`);
  }

  return (
    <div>
      <NavLink
        to={`/canal/${channel.id}`}
        className={s.channel}
        data-connected={inside || undefined}
        onClick={(e) => {
          e.preventDefault();
          void enter();
        }}
        aria-label={`${channel.name}, ${participants.length}${channel.capacity != null ? ` de ${channel.capacity}` : ' na sala'}${full ? ', cheia' : ''}`}
      >
        <Volume2 size={20} className={s.channelIcon} />
        <span className={s.channelName}>{channel.name}</span>
        {joining === channel.id ? (
          <span className={s.joining} aria-label="Conectando" />
        ) : channel.capacity != null ? (
          <span className={s.capacity} data-full={full || undefined} aria-hidden>
            <span>{String(participants.length).padStart(2, '0')}</span>
            <span>{String(channel.capacity).padStart(2, '0')}</span>
          </span>
        ) : null}
      </NavLink>

      {participants.length > 0 && (
        <ul className={s.participants}>
          {participants.map((p) => {
            const m = members[p.userId];
            return (
              <li key={p.userId}>
                <button className={s.participant} onClick={(e) => openProfile(p.userId, e.currentTarget)}>
                  <Avatar user={m} size={24} speaking={speaking[p.userId] && !p.muted} />
                  <span className={s.participantName} data-speaking={speaking[p.userId] && !p.muted}>
                    {m?.nick ?? '...'}
                  </span>
                  {p.streaming && <span className={s.live}>Ao vivo</span>}
                  {p.deafened ? (
                    <HeadphoneOff size={14} className={s.stateIcon} aria-label="Ensurdecido" />
                  ) : p.muted ? (
                    <MicOff size={14} className={s.stateIcon} aria-label="Mutado" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- "Voz conectada" ---------- */

function VoiceConnectionPanel() {
  const navigate = useNavigate();
  const current = useVoice((st) => st.current);
  const localScreen = useVoice((st) => st.localScreen);
  const leave = useVoice((st) => st.leave);
  const startShare = useVoice((st) => st.startShare);
  const stopShare = useVoice((st) => st.stopShare);
  const [menu, setMenu] = useState(false);

  const channel = VOICE_CHANNELS.find((c) => c.id === current);
  if (!channel) return null;

  return (
    <div className={s.connection}>
      <div className={s.connectionInfo}>
        <span className={s.connectedLabel}>{localScreen ? 'Transmitindo' : 'Voz conectada'}</span>
        <button className={s.connectedRoom} onClick={() => navigate(`/canal/${channel.id}`)}>
          {channel.name} / {SERVER.name}
        </button>
      </div>
      <div className={s.connectionActions}>
        {localScreen ? (
          <IconButton label="Parar transmissão" onClick={stopShare} active>
            <MonitorOff size={18} />
          </IconButton>
        ) : (
          <IconButton label="Transmitir tela" onClick={() => setMenu((v) => !v)}>
            <MonitorUp size={18} />
          </IconButton>
        )}
        <IconButton label="Desconectar" danger onClick={() => void leave()}>
          <PhoneOff size={18} />
        </IconButton>
        {menu && <StreamMenu onPick={(q) => void startShare(q)} onClose={() => setMenu(false)} />}
      </div>
    </div>
  );
}

/* ---------- Perfil no canto ---------- */

function UserPanel() {
  const me = useAuth((st) => st.me);
  const muted = useVoice((st) => st.muted);
  const deafened = useVoice((st) => st.deafened);
  const toggleMute = useVoice((st) => st.toggleMute);
  const toggleDeafen = useVoice((st) => st.toggleDeafen);
  const speaking = useVoice((st) => (me ? st.speaking[me.id] : false));
  const openProfile = useUi((st) => st.openProfile);
  const openSettings = useUi((st) => st.openSettings);

  if (!me) return null;

  return (
    <div className={s.userPanel}>
      <button className={s.userButton} onClick={(e) => openProfile(me.id, e.currentTarget, 'top')}>
        <Avatar user={me} size={32} status="online" cut="var(--bg-deep)" speaking={speaking && !muted} />
        <span className={s.userText}>
          <span className={s.userNick}>{me.nick}</span>
          <span className={s.userStatus}>Online</span>
        </span>
      </button>
      <IconButton label={muted ? 'Desmutar' : 'Mutar'} onClick={toggleMute} danger={muted}>
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
      </IconButton>
      <IconButton label={deafened ? 'Reativar áudio' : 'Ensurdecer'} onClick={toggleDeafen} danger={deafened}>
        {deafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
      </IconButton>
      <IconButton label="Configurações do perfil" onClick={openSettings}>
        <Settings size={18} />
      </IconButton>
    </div>
  );
}
