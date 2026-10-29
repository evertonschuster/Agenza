# Spec 001 — shell administrativo autenticado por OIDC

**Identificador**: `001-oidc-shell-scaffold` · **Criada em**: 18/08/2026.
**Status**: implementada; registro histórico do scaffold, com evoluções posteriores identificadas abaixo.

A entrega e os refinamentos de autenticação estão em
[c3479635](https://github.com/evertonschuster/Agenza/commit/c34796354856a150dc805d65bfe125cf822f3859)
e [PR #108](https://github.com/evertonschuster/Agenza/pull/108).
Este documento preserva comportamento e aceite; [plan.md](plan.md) registra decisões e
[tasks.md](tasks.md) distingue entregas de verificações históricas sem comprovação própria.
Não é um roteiro para recriar o app nem uma descrição de todas as features atuais.

## Escopo e decisões de produto

Construir o frontend a partir de uma pasta sem código de aplicação, aproveitando backend e CI já
existentes. Entregar login, logout, renovação de sessão, tenant extraído do token e shell vazio,
com execução pelo Aspire. Funcionalidades de negócio e gestão de perfis/papéis não faziam parte
deste scaffold.

O planejamento fixou a organização por feature como requisito explícito, embora a escolha de
pastas normalmente fosse diferida ao plano. Também exigiu logs locais de autenticação, sem
contratar telemetria externa. OIDC, identity-service e tenant são parte do problema descrito;
nenhum identificador informado pelo cliente substitui a fronteira de segurança do servidor.

## Histórias e critérios de aceite

### US1 — impedir acesso sem sessão válida (P1)

- Sem sessão, uma rota protegida encaminha ao login do identity-service sem exibir antes seu conteúdo.
- Sessão expirada que não possa ser renovada não libera a área autenticada.
- Falha de conexão com o provedor apresenta recuperação, sem conteúdo protegido ou loop de redirects.

### US2 — abrir o shell no contexto do tenant autenticado (P1)

- Login real conclui o callback e abre o shell sem uma segunda ação do usuário.
- O tenant usado pelo cliente corresponde à claim do access token; URL, query e um valor avulso
  em storage não o substituem. A extração no navegador não verifica a assinatura: o backend valida
  token e escopo em cada requisição.
- Uma segunda aba reconhece a sessão persistida pela biblioteca OIDC.

### US3 — renovar a sessão e encerrar o acesso ao sair (P2)

- Renovação normal conserva a tela enquanto a identidade permanece a mesma.
- Falha de renovação deixa a pessoa sem acesso protegido; Sair encerra a sessão local e inicia
  o encerramento da sessão no identity-service.
- Após sair, voltar à área protegida exige autenticação.

### US4 — executar o scaffold e seus gates (P3)

- Com os pré-requisitos instalados, o Aspire inicia o frontend com a configuração necessária.
- Os comandos de lint, formato, tipos, testes e cobertura existem e verificam o scaffold;
  contrato OpenAPI e login real também pertencem à validação da entrega.

## Requisitos preservados

- **FR-001**: bloquear conteúdo autenticado enquanto não houver sessão válida emitida pelo identity-service.
- **FR-002**: encaminhar a tentativa de acesso sem sessão ao login OIDC.
- **FR-003**: concluir login e callback, retornando ao frontend.
- **FR-004**: renderizar o shell com layout e navegação básica após autenticar.
- **FR-005**: obter o contexto de tenant somente da claim do access token; a autorização é do servidor.
- **FR-006**: não aceitar tenant de query, rota, corpo ou valor independente no storage como autoridade.
- **FR-007**: renovar silenciosamente quando o identity-service permitir, sem interromper a tela.
- **FR-008**: oferecer logout local e encerramento da sessão OIDC.
- **FR-009**: negar acesso diante de token ausente, inválido, expirado ou renovação malsucedida.
- **FR-010**: iniciar o frontend pelo orquestrador local, sem configuração manual além dos pré-requisitos.
- **FR-011**: fornecer comandos executáveis de lint, formato, tipos e testes para o scaffold.
- **FR-012**: incluir gate automatizado de cobertura na validação; comandos e limiares são configuração.
- **FR-013**: entregar inicialmente um shell vazio, sem features de negócio. Este limite era desta entrega.
- **FR-014**: organizar capacidades por feature, shell em `app/` e código transversal em `shared/`,
  sem criar buckets globais de componentes/páginas fora dessas responsabilidades.
- **FR-015**: registrar resultado do login, falha de renovação e logout em logger local, sem tokens
  ou credenciais, sem dados pessoais de perfil e sem obrigar serviço externo de observabilidade.

## Critérios de sucesso preservados

- **SC-001**: o ambiente orquestrado disponibiliza o frontend após a preparação documentada.
- **SC-002**: acessos sem sessão não exibem conteúdo protegido antes do login.
- **SC-003**: login bem-sucedido abre o shell com tenant correspondente ao token.
- **SC-004**: expiração do access token, por si só, não força novo login quando a renovação é permitida.
- **SC-005**: os gates da entrega executam sem correções manuais no scaffold inalterado.
- **SC-006**: nenhum tenant avulso fornecido pelo cliente muda o contexto utilizado.

São critérios da entrega, não resultados de testes executados nesta manutenção documental. O índice
[quickstart.md](quickstart.md) conserva os números de cenário citados pelos testes de autenticação.

## Limites e evolução

- O protótipo inicial não tinha persistência de negócio, papéis/permissões ou gestão de perfil.
  Os tipos de Session, Tenant Context e Authenticated User descreviam somente o ciclo de autenticação.
- Tokens sem tenant falham fechados. Falhas de descoberta/conexão não autorizam fallback de identidade.
- O texto inicial permitia atualizar o contexto se o tenant mudasse na renovação. Essa regra foi
  **superada** pela [ADR 0083](../../../../docs/adr/0083-admin-frontend-reject-session-identity-changes.md)
  e pelo [PR #200](https://github.com/evertonschuster/Agenza/pull/200): troca de subject ou tenant
  bloqueia a sessão e exige login explícito, em vez de reutilizar o estado protegido de outra identidade.
- A fundação visual posterior é a [spec 002](../002-ui-foundation/spec.md); features de negócio
  posteriores não violam o antigo FR-013. O desenho atual está no
  [guia de arquitetura](../../docs/ARCHITECTURE.md#3-auth--tenancy).
