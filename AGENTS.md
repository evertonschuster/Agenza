# Agenza — instruções para agentes

Ponto de entrada compartilhado. Guarda invariantes e roteamento; o resto mora no código, nos guias
de cada área e nas [decisões](docs/decisions/). Se der vontade de colar código ou uma lista
de arquivos aqui, coloque um link.

## O produto

SaaS multi-tenant para pequenos negócios de serviço no Brasil (clínicas, estética, massoterapia,
salões): agendamento, gestão de clientes e uma recepcionista de IA. Persona v1: o dono-operador.

**Textos visíveis são pt-BR. Identificadores de código são inglês.** Nomes de teclas não se traduzem.

## Onde está cada coisa

| Caminho               | Stack                                | Leia primeiro                                                                                                                                                    |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin-frontend` | Vite + React + TypeScript estrito    | [AGENTS.md local](apps/admin-frontend/AGENTS.md)                                                                                                                 |
| `backend`             | .NET, Clean Architecture por serviço | [AGENTS.md local](backend/AGENTS.md)                                                                                                                             |
| `ai-services`         | Python + FastAPI                     | [ai-services/assistant-service/README.md](ai-services/assistant-service/README.md)                                                                               |
| `infra`               | Scripts de init do PostgreSQL        | —                                                                                                                                                                |
| `docs/decisions`      | Porquê e alternativas rejeitadas     | [processo](docs/decisions/processo.md), [plataforma](docs/decisions/plataforma.md), [backend](docs/decisions/backend.md), [frontend](docs/decisions/frontend.md) |

Ambiente local e gates de qualidade: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Direção do produto:
[docs/VISION.md](docs/VISION.md).

## Regras que valem em todo o repositório

**Multi-tenancy é fronteira de servidor.** O tenant vem só da claim do token validado; o header
`X-Tenant-Id` é roteamento e o backend recusa o que não bate. Nunca aceite tenant de URL, query ou
`localStorage`. [decisions/plataforma.md](docs/decisions/plataforma.md).

**Erros são valores, não exceções.** Falha esperada volta como `Result`; só o excepcional lança.
[decisions/backend.md](docs/decisions/backend.md).

**Sem comentários de "o quê", sem JSDoc.** Um comentário curto de "por quê" só para uma corrida
genuína ou uma restrição não óbvia.

**Abstração proporcional ao problema.** Encanamento enxuto, estrutura de domínio investida.

**Versões vêm dos pins**, nunca de documentação: `.nvmrc`, `packageManager`, `backend/global.json`,
`.python-version`, `uv.lock` e as actions de setup do CI.

**Aspire é o único orquestrador local.** Não adicione Docker ao frontend.
[decisions/plataforma.md](docs/decisions/plataforma.md).

## Documentação

Só se escreve o que o código não mostra, e cada informação tem uma casa:
[decisions/processo.md](docs/decisions/processo.md). Não crie arquivos em `docs/decisions/` nem ADRs
numerados; uma decisão aprovada vira seção no arquivo do tema.

## Fluxo de trabalho

Antes de codar comportamento novo, esclareça as dúvidas materiais com o dono numa única rodada de
perguntas em lote, cada uma com a opção recomendada; um protótipo aprovado é a referência visual.
Critérios de aceite viram testes nomeados em pt-BR no mesmo PR, e uma correção de protótipo vira
teste ou código. Plano e tarefas ficam na sessão; a conversa fica no PR.

Trabalho por PR, em branch curta cortada da `main`; nunca commit direto na `main`. Uma feature que
atravessa backend e frontend vira dois PRs: o do backend primeiro, com os tipos OpenAPI regenerados.
[decisions/processo.md](docs/decisions/processo.md).

Commit de refactor durante o review não altera Markdown; se o comportamento mudou, muda o teste.
Decisões e guias tocados pelo PR são fechados no último commit antes do merge.

## Skills

Skills Agenza têm fonte única em `.claude/skills/agenza-*/`; os AGENTS de cada área apontam para a da
tarefa. Se o host não as descobrir, abra o arquivo pelo caminho. Não crie cópias por host nem
sincronização.

## Como cada ferramenta chega aqui

| Ferramenta     | Caminho                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| Codex          | Descobre AGENTS pela hierarquia do diretório; abra o da área quando necessário |
| Claude Code    | `CLAUDE.md` importa este arquivo                                               |
| GitHub Copilot | A ponte em `.github/copilot-instructions.md` pede a leitura da raiz e da área  |

## Validação e entrega

Escolha testes pelo comportamento e risco alterados, mantendo os gates de
[DEVELOPMENT](docs/DEVELOPMENT.md). Em mudança só de documentação, confira referências, formatação e diff;
não crie testes de aplicação para validar redação. Registre execuções e limitações no PR.
