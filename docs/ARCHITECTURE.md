# Arquitetura do front-end

## Camadas

```
UI (features/*)  ──lê/chama──▶  stores (zustand)  ──chama──▶  services (contratos)
       ▲                              ▲                              │
       └──────── re-render ───────────┘◀── app/realtimeBridge ◀──────┘ eventos (WS / mock)
```

1. **`services/`** — único lugar que fala com o mundo externo.
   - `contracts.ts` define as interfaces (`AuthService`, `UserService`, `ChatService`, `RealtimeService`, `VoiceService`).
   - `mock/` implementa tudo no navegador (localStorage + eventos simulados).
   - `http/` + `realtime/ws.ts` + `voice/webrtc.ts` são a implementação real.
   - `services/index.ts` escolhe uma ou outra por `VITE_USE_MOCK`.
2. **`stores/`** — estado global (zustand). Componentes nunca chamam `services` direto, exceto upload no editor de perfil.
3. **`app/realtimeBridge.ts`** — assina os eventos em tempo real e joga nas stores. É ligado após o login e desligado no logout.
4. **`features/`** — telas e componentes, separados por domínio.

## Estrutura

```
src/
  app/            App, rotas, ponte realtime → stores
  config/         env, canais (servidor único, salas e capacidades), paleta de perfil
  components/ui/  Avatar, Button, IconButton (com tooltip), Modal, Field, Toasts
  features/
    auth/         tela de senha + escolha de nick
    layout/       AppShell (3 colunas / gavetas), ChannelHeader, ChannelView
    channels/     sidebar esquerda: logo, canais, salas de voz, "Voz conectada", painel do usuário
    chat/         lista de mensagens + composer
    members/      lista "Macacos online / offline"
    profile/      cartão de perfil, popover, modal de configurações
    voice/        sala de voz (palco com tiles), menu de qualidade de stream
  lib/            storage/sessão, formatação pt-BR, imagem, emitter, media query
  services/       contratos + mock + real
  stores/         auth, chat, members, voice, ui
  styles/         tokens e reset
  types/          tipos de domínio (contrato de dados)
```

## Autenticação (senha única)

```
[sem token] → /entrar → POST /auth/login {password} → token salvo no localStorage
           → GET /me → 404? pede nick → POST /me {nick}
           → pronto: conecta WebSocket, carrega membros e salas
[com token] → GET /auth/session → ok? entra direto, sem pedir senha
```

Qualquer `401` (ou WS fechado com código `4001`) dispara `mv:unauthorized` e volta para a tela de senha. Trocar a senha no servidor e invalidar os tokens expulsa todo mundo — é o "reset" do bando.

## Voz e stream (sem input lag)

**Recomendação: WebRTC com SFU, LiveKit self-hosted.**

- WebRTC é o único caminho de baixa latência no navegador (~100–200 ms ponta a ponta). HLS/RTMP têm segundos de atraso — descartados.
- SFU (servidor que repassa as tracks) em vez de mesh: quem transmite sobe **uma** cópia; com 4 pessoas no mesh você subiria 3.
- LiveKit tem servidor open-source, SDK JS pronto e tokens de sala emitidos pelo nosso back-end.

O que o front já faz em `services/voice/`:

| Peça                              | Onde                          |
| --------------------------------- | ----------------------------- |
| Microfone com eco/ruído/ganho     | `localMedia.getMicrophone`    |
| Detector de fala (anel verde)     | `localMedia.createSpeakingDetector` |
| Captura de tela + presets         | `localMedia.captureScreen` / `STREAM_PRESETS` |
| `contentHint` motion/detail       | aplicado na track de vídeo    |
| Fluxo entrar/sair/mutar/stream    | `voice/webrtc.ts`             |

Falta (marcado `TODO[SFU]`): conectar no SFU, publicar mic/tela, tocar áudio remoto, emitir `remote-stream` para a UI. Para jogos, publicar a tela com `degradationPreference: 'maintain-framerate'` (o encoder baixa resolução antes de baixar FPS).

## Responsividade

| Largura      | Layout                                                            |
| ------------ | ----------------------------------------------------------------- |
| ≥ 1200 px    | canais · chat · membros (membros pode ser escondido)              |
| 768–1199 px  | canais · chat; membros abre como gaveta pela direita              |
| < 768 px     | só o chat; canais (☰) e membros abrem como gavetas                |

Detalhes de mobile: `100dvh`, `safe-area-inset-*`, textarea com 16 px (sem zoom no iOS), no toque o Enter quebra linha e aparece o botão de enviar.

## Design system

Tokens em `src/styles/global.css`.

| Token            | Valor     | Uso                                   |
| ---------------- | --------- | ------------------------------------- |
| `--bg-main`      | `#2C2F33` | área de conversa                      |
| `--bg-side`      | `#23272A` | sidebars                              |
| `--text-muted`   | `#99AAB5` | texto secundário, ícones              |
| `--bg-deep`      | `#1E2124` | painel do usuário, inputs             |
| `--accent`       | `#5E5C97` | botões primários, foco                |
| `--danger`       | `#924E4E` | desconectar, AO VIVO, mutado          |
| `--danger-deep`  | `#5A3232` | sala cheia, hover de perigo           |
| `--online`       | `#3BA55C` | status online, falando                |

Fonte: Noto Sans (empacotada via `@fontsource`, funciona offline).

## Próximos passos sugeridos

1. Back-end implementar `docs/API.md` (auth, me, members, messages, uploads, WS).
2. Subir LiveKit e completar os `TODO[SFU]`.
3. Indicador "fulano está digitando…" (o evento `typing:start` já está no contrato).
4. Paginação do histórico ao rolar pra cima (`history({ before })` já existe).
5. Seleção de microfone/saída de áudio e volume por pessoa.
6. Notificação/som de entrada e saída da sala.
