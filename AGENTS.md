# Agenza — instruções para agentes

Ponto de entrada independente de ferramenta. Claude Code, Codex e Copilot leem este arquivo (ver
[Como cada ferramenta chega aqui](#como-cada-ferramenta-chega-aqui)).

> **Este arquivo aponta; não copia.** A [ADR 0016](docs/adr/0016-ai-agent-governance-framework.md)
> foi abandonada porque cópias divergiam da verdade e os checks validavam cópias, não semântica.
> Números de versão, inventários de arquivo, contagens de teste e status de feature **não moram aqui**
> — moram no código, nos lockfiles e nas ADRs. Se você sentir vontade de colar um trecho de código
> neste arquivo, coloque um link.

## O produto

Agenza é um SaaS multi-tenant para pequenos negócios de serviço no Brasil — clínicas odontológicas,
estética, massoterapia, salões. O núcleo é agendamento, gestão de clientes e uma recepcionista de IA
que marca horários e responde dúvidas. Persona v1: o dono-operador. Um usuário, um negócio.

**Textos visíveis são pt-BR. Identificadores de código são inglês.** Teclas (`Ctrl`, `Esc`, `Enter`)
não se traduzem.

## Estrutura

| Caminho | Stack | Leia primeiro |
| --- | --- | --- |
| `apps/admin-frontend` | Vite + React + TypeScript estrito | [AGENTS.md local](apps/admin-frontend/AGENTS.md) |
| `backend` | .NET / ASP.NET Core, Clean Architecture por serviço | [backend/README.md](backend/README.md) |
| `ai-services` | Python + FastAPI | [ai-services/assistant-service/README.md](ai-services/assistant-service/README.md) |
| `infra` | Scripts de init do PostgreSQL | — |
| `docs/adr` | 38+ decisões arquiteturais | [índice](docs/adr/README.md) |

Convenções do monorepo: [docs/MONOREPO.md](docs/MONOREPO.md).
Portões de qualidade: [docs/QUALITY.md](docs/QUALITY.md).
Direção do produto: [docs/VISION.md](docs/VISION.md).

## Regras que valem em todo o repositório

**Decisões viram ADR.** `docs/adr/NNNN-titulo-em-kebab.md`, numeração sequencial. Uma ADR registra
também o que foi **tentado e revertido**, para ninguém re-litigar. Ao substituir uma decisão, marque a
antiga como superseded e aponte para a nova — nunca edite a antiga como se nunca tivesse existido.

**Multi-tenancy é fronteira de servidor.** O tenant vem sempre da claim do token validado. O header
`X-Tenant-Id` é conveniência de roteamento, não fronteira de segurança; o backend recusa qualquer
requisição cuja claim não bata. Nunca aceite tenant de URL, query ou `localStorage`.
[ADR 0006](docs/adr/0006-tenant-header-base-entity-generic-repository.md).

**Erros são valores, não exceções.** O padrão `Result` atravessa backend e frontend. Uma falha de
validação é fluxo esperado e volta como valor; só o excepcional vira exceção.
[ADR 0005](docs/adr/0005-cqrs-vertical-slice-result-pattern.md),
[ADR 0014](docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md).

**Sem comentários de "o quê", sem JSDoc.** O código se documenta. Um comentário curto de "por quê" é
permitido apenas para uma corrida genuína ou uma restrição não óbvia.

**Abstração proporcional ao problema.** Encanamento enxuto, estrutura de domínio investida.

**Versões vêm dos pins do repositório**, nunca de documentação: `.nvmrc`, `packageManager`,
`backend/global.json`, `.python-version`, `uv.lock` e as actions de setup do CI são as fontes
executáveis. [ADR 0032](docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md).

**Aspire é o único orquestrador local.** Não adicione Docker ao frontend.
[ADR 0029](docs/adr/0029-aspire-only-local-orchestration.md).

## Fluxo de trabalho

Features começam pelo Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement`. As specs vivem em `apps/admin-frontend/specs/NNN-nome/`.

Trabalho por PR. Não faça commit na `main` diretamente.

## Skills

Fluxos de trabalho específicos deste repositório vivem em `.claude/skills/agenza-*/`. Elas usam
divulgação progressiva: o `SKILL.md` é curto e roteia para referências apenas quando a tarefa toca
aquele assunto.

**Não existe espelho de skills nem script de sincronização.** Foi exatamente o mecanismo que falhou na
ADR 0016. As skills moram num lugar só; este `AGENTS.md` carrega o que é independente de ferramenta.
[ADR 0041](docs/adr/0041-ai-instruction-files-reinstated.md).

## Como cada ferramenta chega aqui

| Ferramenta | Caminho |
| --- | --- |
| Codex | lê `AGENTS.md` nativamente |
| Claude Code | `CLAUDE.md` importa este arquivo; skills em `.claude/skills/` |
| GitHub Copilot | `.github/copilot-instructions.md` aponta para cá |
