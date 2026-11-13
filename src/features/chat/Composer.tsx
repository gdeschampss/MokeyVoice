import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Plus, SendHorizontal, X } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useChat } from '@/stores/chat';
import { toast } from '@/stores/ui';
import type { TextChannel } from '@/types';
import s from './Chat.module.css';

const MAX_FILES = 5;
const MAX_LEN = 2000;

export function Composer({ channel }: { channel: TextChannel }) {
  const me = useAuth((st) => st.me);
  const send = useChat((st) => st.send);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // textarea cresce com o conteúdo (até ~50% da tela, depois rola)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.5)}px`;
  }, [text]);

  const previews = useFilePreviews(files);

  function addFiles(list: FileList | File[]) {
    const next = [...files, ...Array.from(list)].slice(0, MAX_FILES);
    if (files.length + Array.from(list).length > MAX_FILES) toast(`Máximo de ${MAX_FILES} arquivos por mensagem.`);
    setFiles(next);
  }

  function submit() {
    const content = text.trim();
    if ((!content && files.length === 0) || !me) return;
    if (content.length > MAX_LEN) return toast(`Mensagem passou de ${MAX_LEN} caracteres.`, 'error');
    void send(channel.id, me.id, content, files);
    setText('');
    setFiles([]);
    areaRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra linha. No celular o Enter quebra linha (tem botão de enviar).
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function onPaste(e: ClipboardEvent) {
    const pasted = Array.from(e.clipboardData.files);
    if (pasted.length) {
      e.preventDefault();
      addFiles(pasted);
    }
  }

  const canSend = text.trim().length > 0 || files.length > 0;

  return (
    <div className={s.composerWrap}>
      <div className={s.composer}>
        {files.length > 0 && (
          <ul className={s.attachments}>
            {files.map((f, i) => (
              <li key={i} className={s.attachment}>
                {previews[i] ? <img src={previews[i]} alt="" /> : <span className={s.fileName}>{f.name}</span>}
                <button
                  className={s.removeFile}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  aria-label={`Remover ${f.name}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={s.inputRow}>
          <button className={s.attach} onClick={() => fileRef.current?.click()} aria-label="Anexar arquivo">
            <Plus size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <textarea
            ref={areaRef}
            className={s.textarea}
            rows={1}
            value={text}
            placeholder={`Conversar em #${channel.name}`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            aria-label={`Mensagem para #${channel.name}`}
          />
          <button className={s.send} onClick={submit} disabled={!canSend} aria-label="Enviar">
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function useFilePreviews(files: File[]) {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    const next = files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null));
    setUrls(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}
