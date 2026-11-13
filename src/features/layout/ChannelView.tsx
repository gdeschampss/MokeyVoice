import { Navigate, useParams } from 'react-router-dom';
import { DEFAULT_CHANNEL_ID, findChannel } from '@/config/channels';
import { ChatView } from '@/features/chat/ChatView';
import { VoiceRoomView } from '@/features/voice/VoiceRoomView';

export function ChannelView() {
  const { channelId } = useParams();
  const channel = findChannel(channelId);
  if (!channel) return <Navigate to={`/canal/${DEFAULT_CHANNEL_ID}`} replace />;
  return channel.kind === 'text' ? <ChatView channel={channel} /> : <VoiceRoomView channel={channel} />;
}
