# Plano histórico — spec 003

**Estado:** encerrado, com abordagem inicial parcialmente substituída.
Este plano conserva escolhas e alternativas; o comportamento aceito está na [spec](spec.md), e o
fechamento do trabalho está em [tasks](tasks.md).

## Decisões da entrega

- O contrato de Etiquetas já existia no backend. A entrega inicial foi frontend, com repository fino
  sobre o cliente gerado e um tipo de domínio próprio estruturalmente compatível; não se justificava
  regenerar tipos sem mudança de contrato nem acrescentar mapper sem transformação real.
- Nome obrigatório, limite de nome e descrição foram antecipados no formulário para evitar uma
  requisição inútil. Unicidade e proteção de etiqueta em uso continuaram no servidor. A paleta e os
  rótulos pt-BR estavam no domínio da feature, separados do seletor genérico de cores.
- O seletor de amostras era genérico, com opções rotuladas e sem conhecimento de Etiquetas. A
  apresentação de uma etiqueta reutilizou a classe `.tag`, com hex em propriedade CSS, preservando
  o valor do backend e adaptando contraste às superfícies dos temas.
- A referência visual aprovada foi o
  [protótipo histórico](https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f).
  A revisão do cabeçalho foi incorporada a FR-015; o protótipo não é tratado como implementação atual.
- O cenário real de exclusão bloqueada precisava criar etiqueta e serviço relacionado pela API,
  pois não havia tela de criação de Serviços nessa entrega. Essa preparação de dados era complemento
  ao teste do diálogo, não motivo para introduzir o CRUD de Serviços no escopo.

## Alternativas e evolução preservadas

| Etapa                          | Escolha ou tentativa                                                                   | Resultado histórico                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planejamento inicial           | Carregar catálogo inteiro e filtrar localmente; usar `loader`, `action` e `useFetcher` | Filtro local rejeitado por carregar/reprocessar todo o catálogo; busca explícita no backend evitava debounce por tecla. A implementação posterior deixou os loaders/actions propostos. |
| Acesso à tela                  | Entrada exclusiva na paleta, separada da navegação principal                           | Revisto para destino compartilhado pela paleta, barra lateral e Mais, pela descoberta mais direta.                                                                                     |
| Iterações do CRUD              | Criar/editar/excluir foram implementados, retirados por escopo e reintroduzidos        | O PR #125 (`84a54da3`) registra o CRUD integrado; o histórico disponível não individualiza cada retirada anterior.                                                                     |
| Leitura de registro no diálogo | Resolver `:id` na lista via outlet, sem leitura própria                                | Substituído por leitura por id ao abrir edição/exclusão, evitando tratar a página carregada como retrato completo ou atualizado.                                                       |
| Atualização da lista           | Callbacks de outlet entre diálogos e listagem                                          | Sinais `tagSaved`/`tagDeleted` passaram a desacoplar a mutação da lista. Falha não publica sucesso nem dispara atualização como se a operação tivesse concluído.                       |
| Paginação                      | Adaptador percorrendo todas as páginas; depois paginação visível                       | ADR 0069 documenta o adaptador; a etapa com páginas foi revertida em `dd89940a` (PR #183) e reintegrada em `a3c1f47e` (PR #184), conforme ADR 0074.                                    |
| Estado da busca                | URL no início; estado só na tela na etapa da ADR 0074                                  | O estado controlado retornou à URL em `fa07d965` (PR #190). A decisão intermediária permanece histórica.                                                                               |

## Fontes consultadas na base `38d2dbd9`

- [Rotas](../../src/app/routes.tsx), [repository](../../src/features/tags/api/tagsRepository.ts) e
  [casos de uso](../../src/features/tags/application/tagUseCases.ts): lista e diálogos por rota, com
  resultados esperados como valores e eventos após sucesso.
- [Hook da lista](../../src/features/tags/ui/pages/TagListPage/useTagListPage.ts),
  [filtros](../../src/features/tags/model/tagListFilters.ts) e
  [spec de paginação](../006-tags-pagination/spec.md): evidência da evolução da consulta.
- [Formulário](../../src/features/tags/ui/pages/TagFormPage/useTagFormPage.ts) e
  [exclusão](../../src/features/tags/ui/pages/TagDeletePage/useTagDeletePage.ts): leitura por id,
  abortamento no fechamento, preenchimento/erro e retorno após a operação.
- [Paleta](../../src/features/tags/model/tagColor.ts) e [estilos](../../src/app/globals.css): valores
  executáveis em lugar de uma tabela copiada neste pacote.

Não se introduziu regra nova para sessão, tenant, envelopes ou organização de camadas. Para mudança
nova, consulte o [guia vigente](../../docs/ARCHITECTURE.md), o [contrato HTTP](../../../../docs/API.md)
e a [spec de autenticação](../001-oidc-shell-scaffold/spec.md). Comandos e preparação de ambiente
estão no [README](../../README.md), sem procedimento específico a reproduzir neste pacote histórico.
