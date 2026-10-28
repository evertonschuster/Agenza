# Agenza — instruções para agentes

Ponto de entrada compartilhado. O carregamento depende da ferramenta e da superfície usada (ver
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

## Consulta por tarefa

Leia o guia da área afetada e somente as referências ligadas à mudança.

| Caminho               | Stack                                               | Leia primeiro                                                                      |
| --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/admin-frontend` | Vite + React + TypeScript estrito                   | [AGENTS.md local](apps/admin-frontend/AGENTS.md)                                   |
| `backend`             | .NET / ASP.NET Core, Clean Architecture por serviço | [AGENTS.md local](backend/AGENTS.md)                                               |
| `ai-services`         | Python + FastAPI                                    | [ai-services/assistant-service/README.md](ai-services/assistant-service/README.md) |
| `infra`               | Scripts de init do PostgreSQL                       | —                                                                                  |
| `docs/adr`            | Decisões e sua evolução                             | [índice](docs/adr/README.md)                                                       |

Convenções do monorepo: [docs/MONOREPO.md](docs/MONOREPO.md).
Portões de qualidade: [docs/QUALITY.md](docs/QUALITY.md).
Direção do produto: [docs/VISION.md](docs/VISION.md).

## Fontes de orientação

Código, configuração, pins e checks demonstram a implementação e as garantias executadas.
Guias de arquitetura descrevem a forma vigente e identificam padrões antigos ainda presentes;
ADRs registram decisões e sua evolução. Uma divergência exige investigação, sem mudar código correto
apenas para satisfazer uma passagem histórica.

Este arquivo e os AGENTS locais guardam invariantes e roteamento; skills descrevem procedimentos;
specs definem comportamento e aceite. A política está na
[ADR 0088](docs/adr/0088-ai-instruction-sources-and-proportional-documentation.md).

## Regras que valem em todo o repositório

**Decisões duradouras viram ADR.** Use `docs/adr/NNNN-titulo-em-kebab.md`, com a próxima numeração
livre, para mudanças de fronteira, segurança, contrato compartilhado, persistência, operação,
dependência relevante ou custo significativo de reversão. Ajustes locais reversíveis e iterações de
review ficam no PR. Registre alternativas relevantes, inclusive tentadas e revertidas; ao substituir
uma decisão, identifique as partes superadas e ligue à evolução, preservando o histórico.

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

O Spec Kit está instalado no frontend. Para planejar suas features, execute o fluxo
`speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-implement` a partir de
`apps/admin-frontend`, usando a sintaxe da integração instalada.
Confira a [instalação](apps/admin-frontend/.specify/integration.json),
o [workflow do preset](apps/admin-frontend/.specify/presets/agenza-proportional/workflow.md),
decidido na [ADR 0087](docs/adr/0087-speckit-proportional-preset.md), e os
[pré-requisitos](apps/admin-frontend/.specify/scripts/powershell/check-prerequisites.ps1).
Correções determinísticas de texto ou manutenção sem comportamento novo podem seguir diretamente.
Mudanças de comportamento mantêm spec, plan e tasks separados; auxiliares precisam de uma razão.
Não omita um arquivo exigido pelo tooling sem adaptar seus consumidores. A instalação no frontend
não estabelece um fluxo automático para backend ou serviços de IA.

Trabalho por PR. Não faça commit na `main` diretamente.

Uma feature que atravessa backend e frontend vira dois PRs, ambos cortados da `main`: o do backend
primeiro, levando os tipos do OpenAPI regenerados; o do frontend depois. Cada um passa sozinho nos
seus portões.

## Skills

Skills Agenza têm uma fonte canônica em `.claude/skills/agenza-*/`. Os AGENTS de cada área apontam
para o arquivo da tarefa. Quando o host não o descobrir, abra esse caminho explicitamente e somente
as referências necessárias; leitura por caminho não é descoberta nativa.

Não crie espelhos editáveis ou sincronização caseira dessas skills. As distribuições do Spec Kit
seguem sua instalação e upstream; sua presença não prova que todas as integrações estejam ativas.

## Como cada ferramenta chega aqui

| Ferramenta     | Caminho                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Codex          | Descobre AGENTS pela hierarquia do diretório da sessão; abra o da área quando necessário                            |
| Claude Code    | `CLAUDE.md` importa este arquivo; o carregamento adicional depende da configuração                                  |
| GitHub Copilot | A ponte em `.github/copilot-instructions.md` pede leitura da raiz e da área afetada; o suporte varia por superfície |

Links de consulta não são imports nativos. Registre a superfície realmente verificada antes de
declarar compatibilidade de um fluxo.

## Validação e entrega

Escolha testes pelo comportamento e risco alterados, mantendo os gates aplicáveis em
[QUALITY](docs/QUALITY.md). Em alteração exclusivamente documental, confira fontes, referências,
âncoras, formatação e diff; não crie testes de aplicação para validar redação.
Registre execuções e limitações no PR, sem acrescentar um relatório permanente por tarefa.
