# Plano histórico — 001-oidc-shell-scaffold

**Status**: implementação encerrada; decisões e limites da entrega de [spec.md](spec.md).
As fontes do desenho atual são o [guia de arquitetura](../../docs/ARCHITECTURE.md), o código e as
ADRs indicadas abaixo. Os caminhos antigos e as saídas de uma execução permanecem no Git.

## Decisões que explicam a entrega

| Escolha                                                          | Razão e alternativa descartada                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `oidc-client-ts`, Authorization Code + PKCE                      | Reutilizar o protocolo e a biblioteca previstos na [ADR 0003](../../../../docs/adr/0003-openiddict-identity-service.md); não implementar PKCE manualmente nem acrescentar um wrapper React sem necessidade.                                                                    |
| Contexto React sobre store e reducer                             | Separar transições de sessão da renderização e adaptar eventos externos; um container de DI ou uma interface de provedor adicional não se justificavam para uma integração OIDC. O custo aceito era usar mocks de módulo nos testes.                                           |
| React Router                                                     | Prover navegação, callback e proteção de rotas sem implementar history/redirects manualmente. A versão pertence aos pins, não a este plano.                                                                                                                                    |
| Sessão OIDC compartilhada entre abas                             | A biblioteca persiste seu usuário em localStorage; sessionStorage isolaria as abas. O risco de XSS e alternativas estão na [ADR 0036](../../../../docs/adr/0036-admin-frontend-oidc-session-in-localstorage.md). Isso não autoriza obter tenant de um valor avulso no storage. |
| Tipos OpenAPI com `openapi-typescript` e runtime `openapi-fetch` | A geração de tipos não gera a fachada de aplicação. Evitar DTOs de transporte duplicados e concentrar headers, versão, envelope e falhas fora das features. O contrato vigente está em [docs/API.md](../../../../docs/API.md).                                                 |
| Primitivos como código de propriedade do frontend                | Configurar a geração em `shared/ui/`, sem criar o `src/components/` padrão. A escolha inicial sobre Radix foi sucedida pela [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md).                                                                        |
| Sem biblioteca de server state ou telemetria externa             | O shell não fazia chamadas de negócio nem tinha necessidade operacional que justificasse essas dependências. Evolução na [ADR 0035](../../../../docs/adr/0035-admin-frontend-no-server-state-library.md).                                                                      |

## Fronteiras e corridas relevantes

`/login` e `/callback` são públicos: protegê-los com a mesma guarda causaria um loop antes de
concluir o protocolo. O shell e o catch-all protegido passam pela guarda; tenant não faz parte da URL.
O AppHost fornece a configuração descrita no [contrato de ambiente](contracts/env-contract.md).
O cliente usa discovery OIDC; não é necessário gerar cliente REST do identity-service.

Na inicialização, aguardar a leitura da sessão evita enviar ao login uma pessoa que já estava
conectada. No logout, o evento que remove o usuário local pode chegar antes do redirect de saída;
a guarda não deve iniciar um login concorrente. Esses estados transitórios e as proteções contra
eventos tardios são parte do motivo para separar store, reducer e adaptador. O modelo antigo de
estados/tipos não deve ser copiado: consulte
[sessionMachine.ts](../../src/shared/session/sessionMachine.ts),
[sessionDriver.ts](../../src/features/auth/model/sessionDriver.ts) e a evolução da
[ADR 0083](../../../../docs/adr/0083-admin-frontend-reject-session-identity-changes.md).

Credenciais são lidas a cada chamada HTTP, em vez de capturadas na criação do cliente. A interface
estreita de credenciais evita importar tipos de `features/auth` em `shared/`. O tenant só é extraído
no navegador para encaminhamento; validação criptográfica e isolamento continuam no backend.

## Validação planejada e limites do registro

Unidade/componente cobrem transições e proteção de rotas; Playwright usa login real contra o stack
Aspire. O tenant do seed é obtido do token, sem fixar um GUID de demonstração. A preparação e os
comandos reutilizáveis estão no [README](../../README.md) e os gates em
[QUALITY](../../../../docs/QUALITY.md), sem versões ou resultados duplicados aqui.

A pesquisa original citava MSW como opção para mocks HTTP; isso não era um requisito de produto.
Os testes atuais usam as técnicas indicadas no guia e não exigem instalar uma dependência citada
naquele planejamento. O backend já permitia a origem local no CORS; unificar a forma das duas
configurações não fazia parte do scaffold.

## Evolução comprovada

- [c3479635](https://github.com/evertonschuster/Agenza/commit/c34796354856a150dc805d65bfe125cf822f3859)
  refinou a checagem inicial, as corridas de StrictMode/logout e uma falha preexistente da página de
  login. Essa correção incidental não ampliou o escopo de autenticação do frontend.
- [PR #108](https://github.com/evertonschuster/Agenza/pull/108) consolidou os segmentos FSD, barril
  público e cliente de serviços. Uma tela de Categorias usada para exercitar o contrato foi removida
  depois, conforme a [ADR 0038](../../../../docs/adr/0038-admin-frontend-remove-categories-harness.md).
- O núcleo de sessão passou a `shared/session/` pela
  [ADR 0037](../../../../docs/adr/0037-admin-frontend-session-core-in-shared.md); a identidade deixou
  de poder mudar silenciosamente pela ADR 0083. Esses são refinamentos posteriores, não tarefas
  restantes para reproduzir a árvore de pastas do plano inicial.
