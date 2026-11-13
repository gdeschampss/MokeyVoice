# MonkeyVoice — Chat dos Macacos

Chat de voz, texto e transmissão de tela para o bando. Um servidor só, uma senha só.

> Projeto privado entre amigos. Não é pra distribuir.

## Rodando

```bash
npm install
cp .env.example .env     # já vem com VITE_USE_MOCK=true
npm run dev              # http://localhost:5173
```

Senha no modo mock: **`macaco`** (muda em `VITE_MOCK_ACCESS_PASSWORD`).

| Script              | O que faz                          |
| ------------------- | ---------------------------------- |
| `npm run dev`       | servidor de desenvolvimento (Vite) |
| `npm run build`     | checa tipos + build de produção    |
| `npm run preview`   | serve o build localmente           |
| `npm run typecheck` | só a checagem de tipos             |

## O que já funciona (front-end)

- **Entrada com senha única** → o token fica salvo no navegador, não pede de novo.
- **Primeiro acesso** pede só o nick (não existe cadastro).
- **Chat geral** (`#chat-geral`): grupos por autor, divisória por dia, links, imagem/GIF colado vira imagem, anexos, envio otimista, Enter envia / Shift+Enter quebra linha.
- **Salas de voz**: 2 × Bando (4 pessoas) e 2 × Dupla (2 pessoas), contador `02 | 04`, sala cheia bloqueia entrada, anel verde de quem fala.
- **Transmissão de tela** com escolha de qualidade (Suave 720p60 · Nítido 1080p30 · Máximo 1080p60), destaque e tela cheia.
- **Membros** à direita: *Macacos online* / *Macacos offline*, com "Em Bando #1" quando estão em call.
- **Perfil**: cor do perfil, avatar, fundo (banner) e GIF em destaque — com prévia ao vivo. Só o nick aparece para os outros.
- **Responsivo**: 3 colunas no desktop, membros em gaveta no tablet, canais e membros em gaveta no celular.

Tudo roda em modo **mock** (dados no `localStorage`) até o back-end existir.

## Divisão do time

| Quem             | Parte                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Gabriel          | front-end, UI/UX                                                               |
| Back-end         | implementar o contrato em [`docs/API.md`](docs/API.md)                         |
| Voz/stream (SFU) | ligar as tracks no SFU — pontos `TODO[SFU]` em `src/services/voice/webrtc.ts` |

Para plugar o back-end: implementar a API, trocar `VITE_USE_MOCK=false` e apontar `VITE_API_URL` / `VITE_WS_URL`. A UI não muda.

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — camadas, fluxo de estado, voz/stream, design system
- [`docs/API.md`](docs/API.md) — contrato REST + WebSocket para o back-end

## Stack

React 18 · TypeScript · Vite · React Router · Zustand · CSS Modules · lucide-react · Noto Sans
