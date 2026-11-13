# MonkeyVoice — notas para o Claude Code

Front-end do "Chat dos Macacos" (voz + texto + stream para um grupo de amigos). Gabriel cuida do front e UI/UX; o back-end é de outro colaborador.

## Regras do projeto

- Idioma da UI e dos comentários: **português (pt-BR)**, tom informal do grupo ("macacos", "bando").
- Referência visual: **Discord**. Nada de gradiente decorativo, glassmorphism, emoji como ícone ou texto genérico de IA.
- Cores só via tokens de `src/styles/global.css` (núcleo `#2C2F33`, `#23272A`, `#99AAB5`; acentos `#5E5C97`, `#924E4E`, `#5A3232`).
- Estilo: CSS Modules por componente. Sem Tailwind.
- Componentes **nunca** importam de `services/http` ou `services/mock` — só de `@/services` (interfaces) e das stores.
- Mudou um formato de dado? Atualize `src/types`, `services/contracts.ts`, as duas implementações (mock + http) e `docs/API.md`.
- Selectors do zustand não podem retornar objeto/array novo a cada chamada (use constantes como `NO_PARTICIPANTS`) — senão loop infinito de render.
- Checar sempre com `npm run build` (tsc + vite).

## Comandos

- `npm run dev` — senha do mock: `macaco`
- `npm run build`
- Resetar dados do mock: apagar a chave `mv.mock.db.v2` do localStorage.
