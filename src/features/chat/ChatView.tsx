import { useEffect } from 'react';
import { Hash } from 'lucide-react';
import { ChannelHeader } from '@/features/layout/ChannelHeader';
import { useChat } from '@/stores/chat';
import type { TextChannel } from '@/types';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import s from './Chat.module.css';

export function ChatView({ channel }: { channel: TextChannel }) {
  const load = useChat((st) => st.load);

  useEffect(() => {
    void load(channel.id);
  }, [channel.id, load]);

  return (
    <div className={s.view}>
      <ChannelHeader icon={<Hash size={22} />} title={channel.name} topic={channel.topic} />
      <MessageList channel={channel} />
      <Composer channel={channel} />
    </div>
  );
}
