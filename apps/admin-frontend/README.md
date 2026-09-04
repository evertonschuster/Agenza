# admin-frontend

Painel administrativo do Agenza. Vite + React + TypeScript estrito, servido em `http://localhost:5173`.

Este README é a **preparação de ambiente**. Para entender como o app é construído e por quê, leia
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Pré-requisitos

Instale as versões dos **pins do repositório**, não as que estiverem em qualquer documentação — os
pins são a fonte executável e o CI usa exatamente eles.

| O quê | Pin | Por quê |
| --- | --- | --- |
| Node | [`.nvmrc`](../../.nvmrc) na raiz | `nvm use` na raiz do monorepo resolve |
| npm | campo `packageManager` do [`package.json`](../../package.json) da raiz | workspaces do npm |
| .NET SDK | [`backend/global.json`](../../backend/global.json) | necessário para o Aspire, que é quem sobe o frontend |
| Docker | qualquer versão recente | o Aspire sobe o PostgreSQL num contêiner |

Detalhes e exceções de compatibilidade estão na
[ADR 0032](../../docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md).

---

## Subindo o ambiente

> **O frontend não roda sozinho.** `src/shared/env.ts` falha rápido, de propósito, se qualquer uma das
> seis variáveis `VITE_*` estiver ausente — e quem as injeta é o Aspire. `npm run dev` isolado só serve
> quando você mesmo exportou as seis, o que não é o caminho recomendado.

Na raiz do monorepo:

```bash
nvm use
npm install
dotnet run --project backend/AppHost --launch-profile http
```

Isso sobe, de uma vez: PostgreSQL, identity-service (`5081`), services-service (`5080`),
assistant-service (`8001`) e este frontend (`5173`). O painel do Aspire abre no navegador com o
endereço de cada recurso.

### Login de demonstração

O seeder cria um tenant `Demo Business` com um usuário dono:

```
owner@demo.local
Passw0rd!
```

### As seis variáveis

Injetadas por `builder.AddViteApp("admin-frontend", ...)` em
[`backend/AppHost/AppHost.cs`](../../backend/AppHost/AppHost.cs). O
[`.env.example`](.env.example) as documenta **para referência** — não crie um `.env` com elas nem
adicione valores padrão no código da aplicação. O contrato está em
[`specs/001-oidc-shell-scaffold/contracts/env-contract.md`](specs/001-oidc-shell-scaffold/contracts/env-contract.md).

| Variável | Papel |
| --- | --- |
| `VITE_API_BASE_URL` | services-service |
| `VITE_OIDC_AUTHORITY` | identity-service |
| `VITE_OIDC_CLIENT_ID` | `admin-panel` |
| `VITE_OIDC_REDIRECT_URI` | callback do fluxo de código |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | destino após o logout |
| `VITE_OIDC_SCOPE` | escopos solicitados |

As portas `5081` e `5173` são **fixas** e não são negociáveis — o cliente OIDC `admin-panel` está
semeado com essas URIs de redirect. Trocá-las quebra o login.
Ver [constitution](.specify/memory/constitution.md), princípio III.

---

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Vite isolado (só com as seis `VITE_*` exportadas) |
| `npm run build` | `tsc --noEmit` seguido do build de produção |
| `npm run lint` | ESLint com checagem de tipos |
| `npm run format` / `format:check` | Prettier |
| `npm run test` | Vitest |
| `npm run test:coverage` | Vitest com os limiares de cobertura — **é o que o CI roda** |
| `npm run test:e2e` | Playwright contra o stack real; precisa do Aspire de pé |
| `npm run generate:api-types` | Regenera os tipos do OpenAPI a partir do services-service em execução |
| `npm run generate:api-types:check` | Falha se os tipos gerados divergirem do backend |

Da raiz, use os atalhos de workspace: `npm run dev:frontend`, `build:frontend`, `test:frontend`,
`lint:frontend`.

### Reproduzindo o CI localmente

```bash
npm run format:check && npm run lint && npm run build && npm run test:coverage
```

O `generate:api-types:check` e o Playwright exigem o stack Aspire rodando.

---

## Duas armadilhas que vão te pegar

**1. Lockfile regerado no Windows quebra o CI.**
Ao adicionar ou atualizar qualquer dependência, regere o `package-lock.json` dentro de um contêiner
Linux, ou o `npm ci` do CI falha por não encontrar os bindings nativos do `@tailwindcss/oxide` para
Linux:

```bash
docker run --rm -v "$PWD":/w -w /w node:22 npm install --package-lock-only --ignore-scripts
```

**2. `exactOptionalPropertyTypes` está ligado.**
Componentes gerados por CLI costumam repassar props por spread e exigem `X | undefined` explícito na
tipagem. É atrito esperado a cada componente novo, não um caso raro.

---

## Fluxo de trabalho

Features passam pelo **Spec Kit**, que está instalado neste app:

```
/speckit-specify  ->  /speckit-plan  ->  /speckit-tasks  ->  /speckit-implement
```

As specs ficam em [`specs/`](specs/). A feature em andamento é
[`002-ui-foundation`](specs/002-ui-foundation/) — o `tasks.md` dela é a lista de atividades e também o
estado de retomada.

Trabalho por PR; nada direto na `main`.

---

## Ferramentas de IA

Este repositório tem instruções versionadas para agentes de código. Elas **apontam** para as fontes de
verdade em vez de copiá-las — a [ADR 0016](../../docs/adr/0016-ai-agent-governance-framework.md)
foi abandonada justamente porque cópias divergiam.

| Arquivo | Para quem |
| --- | --- |
| [`AGENTS.md`](../../AGENTS.md) na raiz | fonte independente de ferramenta; o Codex lê nativamente |
| [`AGENTS.md`](AGENTS.md) deste app | regras específicas do frontend |
| `CLAUDE.md` | import fino que aponta para os dois acima |
| `.github/copilot-instructions.md` | ponte para o Copilot |
| `.claude/skills/agenza-*/` | fluxos de trabalho deste repositório |

### MCP

O [`.mcp.json`](../../.mcp.json) na raiz declara quatro servidores. **Nenhum é obrigatório** para
desenvolver — são aceleradores.

| Servidor | Precisa de | Para quê |
| --- | --- | --- |
| `github` | OAuth na primeira vez | PRs, issues, review, status de CI |
| `shadcn` | nada | navegar e instalar primitivos lendo o `components.json` deste app |
| `playwright` | `npx playwright install` | dirigir o navegador nos e2e |
| `chrome-devtools` | Chrome estável instalado | Lighthouse, trace de performance com LCP/CLS/FCP, emulação de CPU e rede lentas |

Autorize numa sessão interativa:

```bash
claude mcp list
```

O `chrome-devtools` é o que mais rende aqui: a persona do produto usa Android intermediário em conexão
instável, e ele permite medir a página com CPU estrangulada em vez de confiar na impressão de quem
desenvolve numa máquina rápida.
