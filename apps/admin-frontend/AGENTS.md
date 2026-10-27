# admin-frontend — instruções para agentes

Complementa o [AGENTS da raiz](../../AGENTS.md). Versões vêm dos pins e do lockfile;
implementação e gates vêm do código e da configuração.

## Consulta por tarefa

Abra somente o que a mudança exigir:

| Mudança                                  | Referência                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Limites entre camadas, páginas ou listas | [Arquitetura §1](docs/ARCHITECTURE.md#1-shape)                                                    |
| Consumo HTTP, erros ou tipos gerados     | [Arquitetura §2](docs/ARCHITECTURE.md#2-talking-to-the-backend) e código de contrato indicado ali |
| Autenticação e tenant                    | [Arquitetura §3](docs/ARCHITECTURE.md#3-auth--tenancy)                                            |
| Planejamento de feature                  | [Constituição](.specify/memory/constitution.md) e somente as ADRs da preocupação afetada          |
| Ambiente, comandos ou dependências       | [README](README.md), inclusive [lockfile](README.md#lockfile)                                     |

Histórico fica nas ADRs e no Git, acessível pelo
[guia](docs/ARCHITECTURE.md#5-decisions-log); não precisa ser lido antes de uma correção pequena.

## Invariantes do frontend

- `app → features → widgets → shared`; consumidores externos acessam uma feature pelo barril.
  O [ESLint](eslint.config.js) verifica direção entre camadas e esse limite público.
- Páginas são apresentação; estado e efeitos ficam no hook da página. Reutilização genérica fica
  em shared/widgets conforme a responsabilidade.
- Listas usam estado controlado: Pessoas e Etiquetas o fornecem por `useSearchParamsState`.
  O formulário de filtros não dispara busca ao digitar; ações aplicam a consulta.
- `servicesApi` devolve `ApiResult`; token, tenant, versão e envelope pertencem à camada HTTP.
  Mutação mantém falhas esperadas como valores; `unwrapOrThrow` existe na fronteira do framework.
- Ramifique por código/status, nunca interpretando texto de erro.
- Use controles existentes, tokens semânticos e o comportamento de teclado/foco do primitivo.
  Todo controle precisa de nome acessível; conteúdo visível segue pt-BR.

## Skills

As fontes estão em `.claude/skills/` na raiz. Se o host não as descobrir, abra o arquivo pelo
caminho abaixo; esta é leitura explícita, não promessa de descoberta nativa. Leia referências
adicionais apenas quando a tarefa tocar no assunto.

| Tarefa                | Skill                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Fatia frontend        | [agenza-frontend-slice](../../.claude/skills/agenza-frontend-slice/SKILL.md)     |
| Primitivo de UI       | [agenza-ui-primitive](../../.claude/skills/agenza-ui-primitive/SKILL.md)         |
| Formulário            | [agenza-form-field](../../.claude/skills/agenza-form-field/SKILL.md)             |
| Tipos e contrato HTTP | [agenza-api-contract](../../.claude/skills/agenza-api-contract/SKILL.md)         |
| Testes e cobertura    | [agenza-testing](../../.claude/skills/agenza-testing/SKILL.md)                   |
| Texto e formatação    | [agenza-ptbr-copy](../../.claude/skills/agenza-ptbr-copy/SKILL.md)               |
| Isolamento de tenant  | [agenza-tenant-isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md) |

## Validação

Use os [comandos do app](README.md#comandos) e confira os
[gates aplicáveis](../../.github/workflows/frontend-ci.yml). Limiares e exclusões de cobertura
estão no [Vitest](vitest.config.ts); uma pasta de UI não é isenta por definição.
`exactOptionalPropertyTypes` exige atenção a props opcionais repassadas por spread.
Alterou contrato? Regenere os tipos no PR backend correspondente e execute a checagem com o serviço.

Para alteração exclusivamente documental, confira referências, formatação e diff. Não crie testes
de aplicação para validar redação nem execute a suíte inteira por esse motivo.
