# admin-frontend — instruções para agentes

Complementa o [AGENTS da raiz](../../AGENTS.md). Versões vêm dos pins e do lockfile;
implementação e gates vêm do código e da configuração.

## Consulta por tarefa

Abra somente o que a mudança exigir:

| Mudança                                     | Referência                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Limites entre camadas, páginas ou listas    | [Arquitetura §1](docs/ARCHITECTURE.md#1-shape)                                                    |
| Consumo HTTP, erros ou tipos gerados        | [Arquitetura §2](docs/ARCHITECTURE.md#2-talking-to-the-backend) e código de contrato indicado ali |
| Autenticação e tenant                       | [Arquitetura §3](docs/ARCHITECTURE.md#3-auth--tenancy)                                            |
| Planejamento de feature                     | [Fluxo da raiz](../../AGENTS.md#fluxo-de-trabalho)                                                |
| Por que algo é assim, o que já foi recusado | [decisions/frontend.md](../../docs/decisions/frontend.md)                                         |
| Ambiente, comandos ou dependências          | [README](README.md), inclusive [lockfile](README.md#lockfile)                                     |

## Invariantes do frontend

- TypeScript estrito: não enfraqueça o [tsconfig](tsconfig.json) nem introduza `any` implícito.
- `app → features → widgets → shared`; consumidores externos acessam uma feature pelo barril.
  O [ESLint](eslint.config.js) verifica direção entre camadas e esse limite público.
- Páginas compõem e renderizam a UI; estado, efeitos e handlers ficam no hook da página.
  Reutilização genérica fica em shared/widgets conforme a responsabilidade.
- Listas usam estado controlado: Pessoas e Etiquetas o fornecem por `useSearchParamsState`.
  O formulário de filtros não dispara busca ao digitar; ações aplicam a consulta.
- `servicesApi` devolve `ApiResult`; token, tenant, versão e envelope pertencem à camada HTTP.
  Mutação mantém falhas esperadas como valores; `unwrapOrThrow` existe na fronteira do framework.
  Tipos de wire vêm do contrato gerado; não escreva `fetch` à mão nem duplique DTOs de wire.
- Ramifique por código/status, nunca interpretando texto de erro.
- Use controles existentes, tokens semânticos e o comportamento de teclado/foco do primitivo.
  Todo controle precisa de nome acessível; conteúdo visível segue pt-BR.
- Assinatura TypeScript numa linha: se passar de 100 colunas, receba o objeto inteiro e desestruture
  no corpo.

## Skills

As fontes estão em `.claude/skills/` na raiz. Se o host não as descobrir, abra o arquivo pelo
caminho abaixo; esta é leitura explícita, não promessa de descoberta nativa. Leia referências
adicionais apenas quando a tarefa tocar no assunto.

| Tarefa                                   | Skill                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Tela, página, lista, rota                | [agenza-frontend-slice](../../.claude/skills/agenza-frontend-slice/SKILL.md)     |
| Componente, tema, cor, foco              | [agenza-ui-primitive](../../.claude/skills/agenza-ui-primitive/SKILL.md)         |
| Formulário, validação, erro no campo     | [agenza-form-field](../../.claude/skills/agenza-form-field/SKILL.md)             |
| Tipos gerados, repositório, falha da API | [agenza-api-contract](../../.claude/skills/agenza-api-contract/SKILL.md)         |
| Testes, cobertura, e2e                   | [agenza-testing](../../.claude/skills/agenza-testing/SKILL.md)                   |
| Texto, mensagens, datas e números        | [agenza-ptbr-copy](../../.claude/skills/agenza-ptbr-copy/SKILL.md)               |
| Tenant, login, sessão                    | [agenza-tenant-isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md) |

## Validação

Use os [comandos do app](README.md#commands) e confira os
[gates aplicáveis](../../.github/workflows/frontend-ci.yml). Limiares e exclusões de cobertura
estão no [Vitest](vitest.config.ts); uma pasta de UI não é isenta por definição. Não rebaixe
limiares nem dispense gates para a mudança passar.
`exactOptionalPropertyTypes` exige atenção a props opcionais repassadas por spread.
Alterou contrato? Regenere os tipos no PR backend correspondente e execute a checagem com o serviço.

Para alteração exclusivamente documental, confira referências, formatação e diff. Não crie testes
de aplicação para validar redação nem execute a suíte inteira por esse motivo.
