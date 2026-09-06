# Admin Panel — Monorepo

SaaS multi-tenant para pequenos negócios de saúde/bem-estar. Monorepo poliglota:
frontend em React, microsserviços de backend em .NET, serviços de IA em Python.

## Estrutura

| Caminho               | Stack                                  | Propósito                                  |
| --------------------- | -------------------------------------- | ------------------------------------------ |
| `apps/admin-frontend` | Vite + React + TypeScript estrito      | A UI do painel administrativo              |
| `backend`             | ASP.NET Core                           | Serviços de negócio agregados por contexto |
| `ai-services`         | Python + FastAPI                       | Serviços de IA/ML                          |
| `infra`               | Scripts de inicialização do PostgreSQL | Roles e grants de schema do banco local    |

Ver [docs/MONOREPO.md](docs/MONOREPO.md) para convenções, e o `README.md` de cada
stack para orientação específica. A preparação de ambiente do frontend —
pré-requisitos, o caminho de execução só-via-Aspire, login de demonstração
semeado e as duas pegadinhas de build — está em
[apps/admin-frontend/README.md](apps/admin-frontend/README.md).

## Início rápido

```bash
# Frontend — repare que precisa do orquestrador Aspire para as seis variáveis
# VITE_*; veja apps/admin-frontend/README.md antes de rodar isolado.
npm install
npm run dev:frontend

# Backend (.NET)
dotnet tool restore --tool-manifest backend/.config/dotnet-tools.json
dotnet build backend/AdminBackend.slnx
dotnet run --project backend/services/services-service/ServicesService.Api

# Serviços de IA (Python)
cd ai-services/assistant-service
pip install uv
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001

# Tudo junto (frontend, backend, PostgreSQL e o serviço de IA)
dotnet run --project backend/AppHost --launch-profile http
```

## Versões das ferramentas

Use os pins do repositório em vez de copiar versões da documentação:
`.nvmrc`/`packageManager`, `backend/global.json`, `.python-version`/`uv.lock`
e as actions de setup do CI são as fontes executáveis. Exceções de
compatibilidade e condições de upgrade estão registradas na
[ADR 0032](docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md).

## Agentes de IA

[`AGENTS.md`](AGENTS.md) é o ponto de entrada independente de ferramenta; o Codex
o lê nativamente, `CLAUDE.md` o importa, e `.github/copilot-instructions.md` faz a
ponte para o Copilot. Fluxos de trabalho específicos deste repositório moram em
`.claude/skills/agenza-*/`.

Esses arquivos **apontam** para as fontes de verdade em vez de repeti-las — versões,
inventário de arquivos e status de feature ficam em lockfiles, código e ADRs. Essa
restrição é a lição da [ADR 0016](docs/adr/0016-ai-agent-governance-framework.md),
abandonada e registrada na
[ADR 0041](docs/adr/0041-ai-instruction-files-reinstated.md).

[`.mcp.json`](.mcp.json) declara quatro servidores MCP opcionais (GitHub, shadcn,
Playwright, Chrome DevTools). Nenhum é obrigatório para desenvolver; autorize-os
com `claude mcp list` numa sessão interativa.
