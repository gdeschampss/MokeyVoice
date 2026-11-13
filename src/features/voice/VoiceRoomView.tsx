import { useEffect, useRef, useState } from 'react';
import {
  HeadphoneOff,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Volume2,
} from 'lucide-react';
import { Avatar, Button, IconButton } from '@/components/ui';
import { isRoomFull } from '@/config/channels';
import { ChannelHeader } from '@/features/layout/ChannelHeader';
import { useAuth } from '@/stores/auth';
import { useMembers } from '@/stores/members';
import { useUi } from '@/stores/ui';
import { NO_PARTICIPANTS, useVoice } from '@/stores/voice';
import type { Member, UserId, VoiceChannel, VoiceParticipant } from '@/types';
import { StreamMenu } from './StreamMenu';
import s from './VoiceRoom.module.css';

const listFmt = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

export function VoiceRoomView({ channel }: { channel: VoiceChannel }) {
  const participants = useVoice((st) => st.rooms[channel.id] ?? NO_PARTICIPANTS);
  const current = useVoice((st) => st.current);
  const inside = current === channel.id;

  return (
    <div className={s.view}>
      <ChannelHeader
        icon={<Volume2 size={22} />}
        title={channel.name}
        topic={
          channel.capacity != null
            ? `${participants.length} de ${channel.capacity} macacos`
            : `${participants.length} ${participants.length === 1 ? 'macaco' : 'macacos'} · sem limite`
        }
      />
      {inside ? <Stage channel={channel} participants={participants} /> : <Lobby channel={channel} participants={participants} />}
    </div>
  );
}

/* ---------- Antes de entrar ---------- */

function Lobby({ channel, participants }: { channel: VoiceChannel; participants: VoiceParticipant[] }) {
  const members = useMembers((st) => st.byId);
  const join = useVoice((st) => st.join);
  const joining = useVoice((st) => st.joining);
  const full = isRoomFull(channel, participants.length);

  return (
    <div className={s.lobby}>
      <div className={s.lobbyFaces}>
        {participants.length === 0 ? (
          <span className={s.emptyRoom}>
            <Volume2 size={28} />
          </span>
        ) : (
          participants.map((p) => <Avatar key={p.userId} user={members[p.userId]} size={64} />)
        )}
      </div>
      <h2 className={s.lobbyTitle}>{channel.name}</h2>
      <p className={s.lobbyText}>
        {participants.length === 0
          ? 'Ninguém aqui ainda.'
          : listFmt.format(participants.map((p) => members[p.userId]?.nick ?? '...')) +
            (participants.length === 1 ? ' está na sala.' : ' estão na sala.')}
      </p>
      <Button size="l" onClick={() => void join(channel.id)} disabled={full} loading={joining === channel.id}>
        {full ? 'Sala cheia' : 'Entrar na sala'}
      </Button>
    </div>
  );
}

/* ---------- Dentro da sala ---------- */

type TileModel =
  | { kind: 'user'; key: string; participant: VoiceParticipant; member: Member | undefined }
  | { kind: 'stream'; key: string; userId: UserId; member: Member | undefined; stream: MediaStream | null; local: boolean };

function Stage({ channel, participants }: { channel: VoiceChannel; participants: VoiceParticipant[] }) {
  const me = useAuth((st) => st.me);
  const members = useMembers((st) => st.byId);
  const localScreen = useVoice((st) => st.localScreen);
  const remoteStreams = useVoice((st) => st.remoteStreams);
  const focused = useVoice((st) => st.focused);
  const focus = useVoice((st) => st.focus);

  // Transmissões primeiro, depois as pessoas (como no Discord).
  const streams: TileModel[] = [];
  const people: TileModel[] = [];
  for (const p of participants) {
    const member = members[p.userId];
    if (p.streaming) {
      const local = p.userId === me?.id;
      streams.push({
        kind: 'stream',
        key: `stream-${p.userId}`,
        userId: p.userId,
        member,
        local,
        stream: local ? localScreen : (remoteStreams[p.userId] ?? null),
      });
    }
    people.push({ kind: 'user', key: p.userId, participant: p, member });
  }
  const tiles = [...streams, ...people];

  const focusedTile = focused ? tiles.find((t) => t.kind === 'stream' && t.userId === focused) : undefined;
  const rest = focusedTile ? tiles.filter((t) => t !== focusedTile) : tiles;
  const cols = tiles.length <= 1 ? 1 : tiles.length <= 4 ? 2 : 3;

  const render = (t: TileModel) =>
    t.kind === 'stream' ? (
      <StreamTile
        key={t.key}
        tile={t}
        focused={focused === t.userId}
        onToggleFocus={() => focus(focused === t.userId ? null : t.userId)}
      />
    ) : (
      <UserTile key={t.key} participant={t.participant} member={t.member} />
    );

  return (
    <div className={s.stageWrap}>
      {focusedTile ? (
        <div className={s.focusLayout}>
          <div className={s.focusMain}>{render(focusedTile)}</div>
          {rest.length > 0 && <div className={s.strip}>{rest.map(render)}</div>}
        </div>
      ) : (
        <div className={s.grid} style={{ ['--cols' as string]: cols }} data-count={tiles.length}>
          {tiles.map((t) => (
            <div key={t.key} className={s.cell}>
              {render(t)}
            </div>
          ))}
        </div>
      )}
      <Controls channel={channel} />
    </div>
  );
}

function UserTile({ participant, member }: { participant: VoiceParticipant; member: Member | undefined }) {
  const speaking = useVoice((st) => st.speaking[participant.userId] && !participant.muted);
  const openProfile = useUi((st) => st.openProfile);
  const color = member?.accentColor ?? '#4a4f55';

  return (
    <button
      className={s.tile}
      data-speaking={speaking || undefined}
      style={{ ['--tile-color' as string]: color }}
      onClick={(e) => openProfile(participant.userId, e.currentTarget, 'right')}
    >
      {member?.bannerUrl && <img className={s.tileBanner} src={member.bannerUrl} alt="" />}
      <span className={s.tileAvatar}>
        <Avatar user={member} size={80} />
      </span>
      <span className={s.tileLabel}>
        {participant.deafened ? (
          <HeadphoneOff size={14} />
        ) : participant.muted ? (
          <MicOff size={14} />
        ) : null}
        {member?.nick ?? '...'}
      </span>
    </button>
  );
}

function StreamTile({
  tile,
  focused,
  onToggleFocus,
}: {
  tile: Extract<TileModel, { kind: 'stream' }>;
  focused: boolean;
  onToggleFocus: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v && v.srcObject !== tile.stream) v.srcObject = tile.stream;
  }, [tile.stream]);

  return (
    <div ref={boxRef} className={s.tile} data-stream data-focused={focused || undefined} onDoubleClick={() => void boxRef.current?.requestFullscreen()}>
      {tile.stream ? (
        <video
          ref={videoRef}
          className={s.video}
          autoPlay
          playsInline
          // a própria tela sempre muda (evita eco do áudio do sistema)
          muted={tile.local}
          disablePictureInPicture={false}
        />
      ) : (
        <span className={s.streamPending}>Conectando à transmissão…</span>
      )}
      <span className={s.liveBadge}>Ao vivo</span>
      <span className={s.tileLabel}>
        <MonitorUp size={14} />
        {tile.local ? 'Sua tela' : (tile.member?.nick ?? '...')}
      </span>
      <div className={s.streamActions}>
        <IconButton label={focused ? 'Sair do destaque' : 'Destacar'} onClick={onToggleFocus} tipSide="bottom">
          <MonitorUp size={18} />
        </IconButton>
        <IconButton label="Tela cheia" onClick={() => void boxRef.current?.requestFullscreen()} tipSide="bottom">
          <Maximize2 size={18} />
        </IconButton>
      </div>
    </div>
  );
}

function Controls({ channel }: { channel: VoiceChannel }) {
  const { muted, deafened, localScreen, toggleMute, toggleDeafen, startShare, stopShare, leave } = useVoice();
  const [menu, setMenu] = useState(false);
  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className={s.controls} role="toolbar" aria-label={`Controles de ${channel.name}`}>
      <button className={s.ctrl} data-off={muted || undefined} onClick={toggleMute} aria-label={muted ? 'Desmutar' : 'Mutar'} data-tip={muted ? 'Desmutar' : 'Mutar'}>
        {muted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
      <button
        className={s.ctrl}
        data-off={deafened || undefined}
        onClick={toggleDeafen}
        aria-label={deafened ? 'Reativar áudio' : 'Ensurdecer'}
        data-tip={deafened ? 'Reativar áudio' : 'Ensurdecer'}
      >
        {deafened ? <HeadphoneOff size={22} /> : <Headphones size={22} />}
      </button>
      {canShare && (
        <div className={s.shareWrap}>
          {localScreen ? (
            <button className={s.ctrl} data-on onClick={stopShare} aria-label="Parar transmissão" data-tip="Parar transmissão">
              <MonitorOff size={22} />
            </button>
          ) : (
            <button className={s.ctrl} onClick={() => setMenu((v) => !v)} aria-label="Transmitir tela" data-tip="Transmitir tela">
              <MonitorUp size={22} />
            </button>
          )}
          {menu && <StreamMenu placement="up-center" onPick={(q) => void startShare(q)} onClose={() => setMenu(false)} />}
        </div>
      )}
      <button className={`${s.ctrl} ${s.hangup}`} onClick={() => void leave()} aria-label="Desconectar" data-tip="Desconectar">
        <PhoneOff size={22} />
      </button>
    </div>
  );
}
