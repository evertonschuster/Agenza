# admin-frontend

Painel administrativo do Agenza. Este README cobre ambiente e operação do frontend.
O [guia de arquitetura](docs/ARCHITECTURE.md) descreve o desenho atual.

## Pré-requisitos

Use as fontes executáveis de versão: [Node](../../.nvmrc), `packageManager` no
[package.json da raiz](../../package.json) e [.NET SDK](../../backend/global.json).
Docker é necessário para o PostgreSQL gerenciado pelo Aspire.
Exceções de compatibilidade estão na [ADR 0032](../../docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md).

## Subindo o ambiente

Da raiz do monorepo, instale as dependências do lockfile e inicie o AppHost:

```powershell
nvm use
npm ci
dotnet run --project backend/AppHost --launch-profile http
```

O painel do Aspire mostra os recursos e seus endereços. O frontend usa `http://localhost:5173`;
o identity-service usa `http://localhost:5081`. Essas portas estão alinhadas aos redirects OIDC
registrados pelo ambiente local; mudá-las exige alinhar o AppHost e o cliente registrado.

O login de demonstração é `owner@demo.local` / `Passw0rd!`, criado pelo seed local.

### Variáveis de ambiente

O [AppHost](../../backend/AppHost/AppHost.cs) injeta as variáveis exigidas por
[shared/env.ts](src/shared/env.ts). A [.env.example](.env.example) serve de referência.
O caminho normal é o Aspire; um Vite iniciado isoladamente exige fornecer o mesmo ambiente.

| Variável                             | Papel                       |
| ------------------------------------ | --------------------------- |
| `VITE_API_BASE_URL`                  | services-service            |
| `VITE_OIDC_AUTHORITY`                | identity-service            |
| `VITE_OIDC_CLIENT_ID`                | cliente OIDC                |
| `VITE_OIDC_REDIRECT_URI`             | callback do fluxo de código |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | destino após logout         |
| `VITE_OIDC_SCOPE`                    | escopos solicitados         |

Não acrescente defaults que escondam uma configuração ausente.

## Comandos

Execute na pasta deste app; a lista executável é o [package.json](package.json).

| Comando                            | Finalidade                                    |
| ---------------------------------- | --------------------------------------------- |
| `npm run dev`                      | Vite, com o ambiente injetado                 |
| `npm run build`                    | TypeScript e build de produção                |
| `npm run lint`                     | ESLint                                        |
| `npm run format` / `format:check`  | Prettier                                      |
| `npm run test`                     | Vitest                                        |
| `npm run test:coverage`            | Vitest com os gates de cobertura              |
| `npm run test:e2e`                 | Playwright contra o stack real                |
| `npm run generate:api-types`       | Tipos OpenAPI do services-service em execução |
| `npm run generate:api-types:check` | Regeneração temporária e comparação dos tipos |

Para reproduzir a validação estática e de componentes:

```powershell
npm run format:check
npm run lint
npm run build
npm run test:coverage
```

Playwright e a checagem de tipos exigem o ambiente Aspire. O
[workflow](../../.github/workflows/frontend-ci.yml) define o que roda no CI;
[QUALITY](../../docs/QUALITY.md) explica o alcance de cada gate.
Para uma mudança apenas em Markdown, valide os arquivos alterados e seus links.

## Lockfile

Ao adicionar ou atualizar dependências, preserve o `package-lock.json` da raiz com as variantes
nativas opcionais exigidas pelo CI Linux. O procedimento de manutenção existente usa uma imagem
Linux com digest fixo e npm explícito. Execute da raiz do monorepo:

```powershell
docker run --rm -v "${PWD}:/w" -w /w node:22.23.2@sha256:8a34c4ab3ea2c5cd194f07e317b2a8f09461d3c8b05c4e34c8ccd56d56024c4d sh -c "npm install -g npm@12.0.2 && npm install --package-lock-only --ignore-scripts --allow-remote=all"
```

O npm explícito evita a falha de resolução desse grafo pelo npm incluído na imagem; a flag de
fetch permite registrar as variantes de outras plataformas. A imagem é uma ferramenta de
regeneração; a versão de runtime continua definida em `.nvmrc`.
O digest requer atualização deliberada, pois não recebe patches automaticamente.
Revise o diff do lockfile e confira o `npm ci` no CI antes de integrar a mudança.
Este contêiner de manutenção não altera a orquestração local pelo Aspire.

## Fluxo de trabalho

O Spec Kit está instalado neste app. Seus arquivos de integração e templates ficam em
[.specify](.specify/); as especificações ficam em [specs](specs/).
Confira a integração configurada e o diretório de execução antes de invocar os comandos;
não use este README como indicação de qual feature está em andamento.

As [instruções da raiz](../../AGENTS.md) definem o fluxo de PRs.
[AGENTS do app](AGENTS.md) encaminha para a skill e a seção técnica necessárias à tarefa.
[CLAUDE.md](CLAUDE.md) mantém os imports compartilhados. As integrações MCP opcionais estão em
[.mcp.json](../../.mcp.json).
