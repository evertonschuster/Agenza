# backend — instruções para agentes

Complementa o [AGENTS da raiz](../AGENTS.md). Os pins estão em [global.json](global.json),
[Directory.Packages.props](Directory.Packages.props) e [.config/dotnet-tools.json](.config/dotnet-tools.json).

## Consulta por tarefa

Leia somente as regras e os exemplos ligados à mudança:

| Mudança                                   | Referência                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Serviço, camada ou dependência            | [Arquitetura §1](docs/ARCHITECTURE.md#1-shape)                                                                   |
| Request, handler, validator ou mapeamento | [§2](docs/ARCHITECTURE.md#2-anatomy-of-a-feature) e [§4](docs/ARCHITECTURE.md#4-errors--one-pipeline-five-gates) |
| Agregado, filho ou value object           | [§3](docs/ARCHITECTURE.md#3-domain)                                                                              |
| Tenant, repositório, EF ou migração       | [§5](docs/ARCHITECTURE.md#5-tenancy-and-persistence)                                                             |
| Fronteira HTTP                            | [§6](docs/ARCHITECTURE.md#6-http-surface), controller e OpenAPI atuais                                           |
| Tempo, estilo ou logging                  | [§7](docs/ARCHITECTURE.md#7-time) e [§8](docs/ARCHITECTURE.md#8-code-style)                                      |
| Validação e garantias                     | [§9](docs/ARCHITECTURE.md#9-tests) e [§11](docs/ARCHITECTURE.md#11-what-enforces-what)                           |

O [§10](docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation) aponta exemplos da forma
atual. Compare-os com o código afetado; uma divergência não autoriza refatorar áreas independentes.
O [índice de ADRs](../docs/adr/README.md) encaminha para decisões relevantes e suas substituições.

## Invariantes

- Cada serviço pertence a um contexto; uma operação que cabe nele não exige outro serviço.
- Domain permanece sem infraestrutura e pacotes, podendo referenciar os value objects compartilhados.
  O handler orquestra a operação através de portas; o domínio preserva suas invariantes.
- Falhas esperadas usam Result. Validação de entrada, domínio, estado atual e persistência têm
  responsabilidades distintas; nomes ou sintaxe isolados não provam um defeito.
- O tenant de servidor vem da claim validada. Um header ou tenant enviado pelo cliente não autoriza
  acesso; filtros, atribuição no save, relacionamentos e roles têm limites próprios descritos no §5.

## Skills

As fontes canônicas estão na raiz. Quando o host não as descobrir, abra o caminho da tarefa;
essa leitura explícita não pressupõe descoberta nativa.

| Tarefa                             | Procedimento                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Construir ou alterar uma fatia     | [agenza-backend-slice](../.claude/skills/agenza-backend-slice/SKILL.md)       |
| Revisar um diff                    | [agenza-backend-review](../.claude/skills/agenza-backend-review/SKILL.md)     |
| Alterar uma fronteira de tenant    | [agenza-tenant-isolation](../.claude/skills/agenza-tenant-isolation/SKILL.md) |
| Regenerar contrato para o frontend | [agenza-api-contract](../.claude/skills/agenza-api-contract/SKILL.md)         |

## Validação e entrega

Use os [comandos do README](README.md#commands) e os [gates aplicáveis](../docs/QUALITY.md).
Escolha testes pelo comportamento e risco alterados; propriedades exclusivas do PostgreSQL
seguem a verificação descartável do §9. Em Markdown, confira fontes, links, formatação e diff.

Uma mudança de contrato leva os tipos OpenAPI regenerados no PR backend; o trabalho de frontend
segue o fluxo separado da raiz. Registre o que realmente executou e o que continua sem prova.
Decisões arquiteturais seguem o processo da raiz. Atualize a regra ou o exemplo que a alteração
invalida, sem criar inventários de features, contagens ou relatórios adicionais de execução.
