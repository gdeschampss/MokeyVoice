import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, LogOut, Pipette, X } from 'lucide-react';
import { Button, Field, IconButton, Modal, inputClass } from '@/components/ui';
import { PROFILE_SWATCHES } from '@/config/channels';
import { IMAGE_LIMITS, resizeImage } from '@/lib/image';
import { isImageUrl } from '@/lib/format';
import { services } from '@/services';
import { useAuth } from '@/stores/auth';
import { toast, useUi } from '@/stores/ui';
import type { ProfilePatch, UploadKind, UserProfile } from '@/types';
import { ProfileCard } from './ProfileCard';
import s from './ProfileSettingsModal.module.css';

type Draft = Omit<UserProfile, 'id'>;
const HEX = /^#[0-9a-f]{6}$/i;

export function ProfileSettingsModal() {
  const me = useAuth((st) => st.me)!;
  const updateProfile = useAuth((st) => st.updateProfile);
  const logout = useAuth((st) => st.logout);
  const close = useUi((st) => st.closeSettings);

  const initial: Draft = useMemo(
    () => ({
      nick: me.nick,
      accentColor: me.accentColor,
      avatarUrl: me.avatarUrl,
      bannerUrl: me.bannerUrl,
      featuredGifUrl: me.featuredGifUrl,
    }),
    [me],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [hexInput, setHexInput] = useState(me.accentColor);
  const [gifInput, setGifInput] = useState(me.featuredGifUrl ?? '');
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [saving, setSaving] = useState(false);

  const patch: ProfilePatch = useMemo(() => {
    const p: ProfilePatch = {};
    (Object.keys(draft) as (keyof Draft)[]).forEach((k) => {
      if (draft[k] !== initial[k]) (p as Record<string, unknown>)[k] = draft[k];
    });
    return p;
  }, [draft, initial]);
  const dirty = Object.keys(patch).length > 0;
  const nickValid = draft.nick.trim().length >= 2;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function setColor(hex: string) {
    setHexInput(hex);
    if (HEX.test(hex)) set('accentColor', hex.toUpperCase());
  }

  async function pick(kind: 'avatar' | 'banner' | 'gif', e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Escolhe um arquivo de imagem.', 'error');
    if (kind === 'gif' && file.size > IMAGE_LIMITS.gifMaxBytes) return toast('GIF passou de 8 MB.', 'error');

    setUploading(kind);
    try {
      const blob =
        kind === 'avatar'
          ? await resizeImage(file, IMAGE_LIMITS.avatar.w, IMAGE_LIMITS.avatar.h)
          : kind === 'banner'
            ? await resizeImage(file, IMAGE_LIMITS.banner.w, IMAGE_LIMITS.banner.h)
            : file;
      const url = await services.users.upload(blob, kind, file.name);
      if (kind === 'avatar') set('avatarUrl', url);
      if (kind === 'banner') set('bannerUrl', url);
      if (kind === 'gif') {
        set('featuredGifUrl', url);
        setGifInput('');
      }
    } catch (err) {
      toast((err as Error).message || 'Falha no upload.', 'error');
    } finally {
      setUploading(null);
    }
  }

  function applyGifUrl() {
    const url = gifInput.trim();
    if (!url) return set('featuredGifUrl', null);
    if (!/^https?:\/\//.test(url) || !isImageUrl(url)) {
      return toast('Cola o link direto do GIF (terminando em .gif).', 'error');
    }
    set('featuredGifUrl', url);
  }

  function reset() {
    setDraft(initial);
    setHexInput(initial.accentColor);
    setGifInput(initial.featuredGifUrl ?? '');
  }

  async function save() {
    if (!nickValid) return toast('Nick precisa de pelo menos 2 letras.', 'error');
    setSaving(true);
    try {
      await updateProfile(patch);
      toast('Perfil salvo.');
    } catch (err) {
      toast((err as Error).message || 'Não deu pra salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (dirty && !window.confirm('Descartar as alterações não salvas?')) return;
    close();
  }

  return (
    <Modal onClose={requestClose} label="Configurações do perfil">
      <div className={s.panel}>
        <header className={s.header}>
          <h2>Perfil</h2>
          <IconButton label="Fechar" onClick={requestClose} tipSide="bottom">
            <X size={22} />
          </IconButton>
        </header>

        <div className={s.content}>
          <div className={s.form}>
            <Field label="Nick" htmlFor="pf-nick">
              <input
                id="pf-nick"
                className={inputClass}
                value={draft.nick}
                maxLength={32}
                onChange={(e) => set('nick', e.target.value)}
              />
              <p className={s.hint}>É a única coisa que os outros veem de você.</p>
            </Field>

            <hr className={s.rule} />

            <Field label="Cor do perfil">
              <div className={s.swatches}>
                {PROFILE_SWATCHES.map((c) => (
                  <button
                    key={c}
                    className={s.swatch}
                    style={{ background: c }}
                    data-selected={draft.accentColor.toLowerCase() === c.toLowerCase() || undefined}
                    onClick={() => setColor(c)}
                    aria-label={`Cor ${c}`}
                  />
                ))}
                <label className={s.custom} style={{ background: draft.accentColor }} aria-label="Cor personalizada">
                  <Pipette size={16} />
                  <input type="color" value={draft.accentColor} onChange={(e) => setColor(e.target.value)} />
                </label>
                <input
                  className={`${inputClass} ${s.hex}`}
                  value={hexInput}
                  onChange={(e) => setColor(e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  aria-label="Código hex da cor"
                />
              </div>
            </Field>

            <hr className={s.rule} />

            <ImageField
              label="Avatar"
              hint="Quadrado, mínimo 128×128. Redimensionado para 256 px."
              hasValue={!!draft.avatarUrl}
              loading={uploading === 'avatar'}
              accept="image/png,image/jpeg,image/webp,image/gif"
              onPick={(e) => void pick('avatar', e)}
              onRemove={() => set('avatarUrl', null)}
              pickLabel="Trocar avatar"
            />

            <ImageField
              label="Fundo do perfil"
              hint="Aparece no topo do seu cartão. Ideal 1200×480."
              hasValue={!!draft.bannerUrl}
              loading={uploading === 'banner'}
              accept="image/png,image/jpeg,image/webp"
              onPick={(e) => void pick('banner', e)}
              onRemove={() => set('bannerUrl', null)}
              pickLabel="Trocar fundo"
            />

            <hr className={s.rule} />

            <Field label="GIF em destaque" htmlFor="pf-gif">
              <div className={s.gifRow}>
                <input
                  id="pf-gif"
                  className={inputClass}
                  placeholder="https://media.tenor.com/....gif"
                  value={gifInput}
                  onChange={(e) => setGifInput(e.target.value)}
                  onBlur={applyGifUrl}
                  onKeyDown={(e) => e.key === 'Enter' && applyGifUrl()}
                />
                <FilePick
                  label="Enviar"
                  accept="image/gif"
                  loading={uploading === 'gif'}
                  onPick={(e) => void pick('gif', e)}
                />
              </div>
              <p className={s.hint}>
                Cola um link de GIF ou envia um arquivo (até 8 MB).
                {draft.featuredGifUrl && (
                  <>
                    {' '}
                    <button
                      className={s.linkBtn}
                      onClick={() => {
                        set('featuredGifUrl', null);
                        setGifInput('');
                      }}
                    >
                      Remover GIF
                    </button>
                  </>
                )}
              </p>
            </Field>

            <hr className={s.rule} />

            <button className={s.logout} onClick={() => void logout()}>
              <LogOut size={16} /> Sair deste navegador
            </button>
          </div>

          <aside className={s.preview}>
            <p className={s.previewLabel}>Prévia</p>
            <ProfileCard profile={{ id: me.id, ...draft, nick: draft.nick || me.nick }} status="online" />
          </aside>
        </div>

        {dirty && (
          <div className={s.saveBar} role="status">
            <span>Você tem alterações não salvas.</span>
            <div className={s.saveActions}>
              <Button variant="ghost" onClick={reset} disabled={saving}>
                Redefinir
              </Button>
              <Button onClick={() => void save()} loading={saving} disabled={!!uploading || !nickValid}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FilePick({
  label,
  accept,
  loading,
  onPick,
}: {
  label: string;
  accept: string;
  loading: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="secondary" loading={loading} onClick={() => ref.current?.click()}>
        <ImagePlus size={16} /> {label}
      </Button>
      <input ref={ref} type="file" accept={accept} hidden onChange={onPick} />
    </>
  );
}

function ImageField(props: {
  label: string;
  hint: string;
  hasValue: boolean;
  loading: boolean;
  accept: string;
  pickLabel: string;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <Field label={props.label}>
      <div className={s.imageRow}>
        <FilePick label={props.pickLabel} accept={props.accept} loading={props.loading} onPick={props.onPick} />
        {props.hasValue && (
          <Button variant="ghost" onClick={props.onRemove}>
            Remover
          </Button>
        )}
      </div>
      <p className={s.hint}>{props.hint}</p>
    </Field>
  );
}
