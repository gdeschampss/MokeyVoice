# Contrato da API (para o back-end)

O front-end já consome exatamente isto em `src/services/http/` e `src/services/realtime/ws.ts`.
Tipos em `src/types/index.ts`. Se precisar mudar algo, combinem e ajustem só a camada `services/http`.

Base: `VITE_API_URL` (ex.: `http://localhost:3333`). Todas as rotas (menos login) exigem
`Authorization: Bearer <token>`. Erros: status HTTP + `{ "message": "texto em pt-BR" }` — a mensagem aparece direto para o usuário.

## Auth — senha única

| Método | Rota            | Corpo                  | Resposta              |
| ------ | --------------- | ---------------------- | --------------------- |
| POST   | `/auth/login`   | `{ password }`         | `{ token }` · 401 se errada |
| GET    | `/auth/session` | —                      | 204 se válido · 401   |
| POST   | `/auth/logout`  | —                      | 204                   |

- A senha fica numa variável de ambiente do servidor. Comparar com tempo constante.
- Token sem expiração curta (o navegador lembra). Guardar hash do token no banco.
- Rate limit no login (ex.: 5 tentativas/min por IP).
- Cada token aponta para **um** perfil (ou nenhum, até o nick ser escolhido).

## Perfil

| Método | Rota       | Corpo                  | Resposta                          |
| ------ | ---------- | ---------------------- | --------------------------------- |
| GET    | `/me`      | —                      | `UserProfile` · **404** se o token ainda não tem nick |
| POST   | `/me`      | `{ nick }`             | `UserProfile` · 409 se nick em uso |
| PATCH  | `/me`      | `Partial<UserProfile>` | `UserProfile`                     |
| GET    | `/members` | —                      | `Member[]` (perfil + `status`)    |

```ts
UserProfile = { id, nick, accentColor: '#RRGGBB', avatarUrl|null, bannerUrl|null, featuredGifUrl|null }
Member      = UserProfile & { status: 'online' | 'offline' }
```

Nick: 2–32 caracteres, único sem diferenciar maiúsculas. `PATCH /me` deve emitir `member:update` no WS.

## Uploads

`POST /uploads` — `multipart/form-data` com `file` e `kind` (`avatar` | `banner` | `gif` | `attachment`) → `{ url }`.

O front já redimensiona avatar (256 px) e banner (1200×480) em WebP antes de subir. GIF vai cru (até 8 MB). Validar MIME no servidor.

## Mensagens

| Método | Rota                                   | Corpo / Query                                  | Resposta    |
| ------ | -------------------------------------- | ---------------------------------------------- | ----------- |
| GET    | `/channels/:id/messages?limit=50&before=<ISO>` | —                                      | `Message[]` em ordem cronológica |
| POST   | `/channels/:id/messages`               | `{ content, attachments: [{url,name,mime}], clientId }` | `Message` |

```ts
Message = { id, channelId, authorId, content, createdAt: ISO, attachments?: [{ id, url, name, mime, width?, height? }] }
```

**Importante:** use o `clientId` enviado como `id` da mensagem (ou devolva-o) — é assim que o front troca a mensagem otimista pela confirmada sem duplicar. Depois de salvar, emitir `message:new` para todos (inclusive o autor).

Canal de texto hoje: `geral`.

## Voz

| Método | Rota                    | Corpo                   | Resposta                       |
| ------ | ----------------------- | ----------------------- | ------------------------------ |
| GET    | `/voice/rooms`          | —                       | `{ [channelId]: VoiceParticipant[] }` |
| POST   | `/voice/:id/join`       | `{ muted, deafened }`   | `{ sfuUrl, sfuToken }` · 409 se cheia |
| POST   | `/voice/:id/leave`      | —                       | 204                            |

```ts
VoiceParticipant = { userId, muted, deafened, streaming }
```

Salas e capacidade (fonte da verdade no front: `src/config/channels.ts`):
`arvore` / Árvore do bando (sem limite — `capacity: null`), `bando-1` (4), `bando-2` (4), `dupla-1` (2), `dupla-2` (2).

O servidor deve: validar capacidade, tirar o usuário de outra sala ao entrar numa nova, remover quem desconectou do WS, e emitir `voice:state` a cada mudança.

## WebSocket

URL: `VITE_WS_URL?token=<token>`. Mensagens nos dois sentidos: `{ "type": string, "data": any }`.
Fechar com código **4001** quando o token for inválido (o front volta pra tela de senha).
O front reconecta sozinho com backoff exponencial.

### Servidor → cliente

| type              | data                                            |
| ----------------- | ----------------------------------------------- |
| `message:new`     | `Message`                                       |
| `member:update`   | `Member`                                        |
| `presence:update` | `{ userId, status }` (online ao conectar o WS, offline ao cair) |
| `voice:state`     | `{ channelId, participants: VoiceParticipant[] }` |
| `voice:speaking`  | `{ userId, speaking }`                          |
| `typing:start`    | `{ channelId, userId }`                         |

### Cliente → servidor

| type             | data                                        |
| ---------------- | ------------------------------------------- |
| `voice:update`   | `{ muted? , deafened?, streaming? }`        |
| `voice:speaking` | `{ speaking }` (repassar aos outros como `voice:speaking` com `userId`) |
| `typing:start`   | `{ channelId }` (ainda não usado pela UI)   |

## Mídia (SFU)

Recomendação: **LiveKit** self-hosted. O back-end gera o `sfuToken` (JWT do LiveKit) no `POST /voice/:id/join`
com o nome da sala = `channelId` e a identidade = `userId`. O front faz o resto (`src/services/voice/webrtc.ts`, `TODO[SFU]`).
