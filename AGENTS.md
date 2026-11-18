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
[decisions/processo.md](docs/decisions/processo.md). Não crie ADRs numerados; uma decisão aprovada
vira seção no arquivo do tema. Um arquivo novo em `docs/decisions/` só nasce da divisão de um tema
acima de 150 linhas, como o `processo.md` descreve. Uma correção do dono que vale além da sessão
entra neste AGENTS ou no guia da área, no mesmo PR; a memória privada de um host guarda só fatos da
máquina ou do PR em curso.

## Fluxo de trabalho

A rodada única de perguntas antes de codar, os critérios de aceite como testes em pt-BR e os commits
de review seguem o [processo](docs/decisions/processo.md). Uma feature que atravessa backend e
frontend vira dois PRs, o do backend primeiro, com os tipos OpenAPI regenerados.

Trabalho por PR, em branch curta cortada da `main`. Nunca commit direto na `main`, nem merge, push,
auto-merge ou revert nela sem o OK explícito do dono naquele PR.

Na máquina do dono, o checkout principal é compartilhado entre sessões: confira a branch antes de
qualquer escrita no git e trabalhe numa worktree própria.

Uma pergunta pede resposta, não mudança. O escopo é o pedido; um achado fora dele vira uma linha no
relatório.

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

Na máquina do dono, não pare processo nem container que você não iniciou: as portas fixas do
[DEVELOPMENT](docs/DEVELOPMENT.md) costumam ser do Aspire que ele está usando.
