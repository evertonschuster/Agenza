# Especificação: paginação de etiquetas no backend

**Criada em**: 2026-10-20.
**Status**: implementada no [PR #180, commit fcfe2210](https://github.com/evertonschuster/Agenza/pull/180).
Registro histórico do contrato e de seu rollout; a tela e a integração frontend evoluíram depois.
**Pedido**: paginar a listagem de etiquetas seguindo a paginação de clientes.

O usuário escolheu paginação obrigatória, com página padrão quando os parâmetros forem omitidos.
O [plano](plan.md) distingue o contrato backend preservado do adaptador temporário já retirado.
As [tarefas](tasks.md) estão encerradas.

## Histórias e aceite

### US1 — Consultar etiquetas em páginas (prioridade original P1)

1. Sem parâmetros, retornar a primeira página, até 20 itens e o total filtrado.
2. Com página e tamanho explícitos, retornar somente os itens pedidos e os metadados da página.
3. Além da última página, retornar sucesso, itens vazios e o total real.
4. Percorrer um catálogo estável sem repetição ou omissão.

### US2 — Buscar no catálogo paginado (prioridade original P1)

1. Ignorar diferenças de caixa e espaços nas extremidades da busca.
2. Aplicar o filtro antes da contagem e do recorte.
3. Tratar `%` e `_` como caracteres literais.
4. Tratar busca ausente ou em branco como ausência de filtro.

### Casos de borda

Página zero/negativa, tamanho zero/negativo/acima do limite e offset além do limite são erros de
validação; busca acima do limite é recusada na entrada. Itens excluídos ou de outro tenant não
entram na lista nem no total; falta de contexto de tenant não pode expor etiquetas.
A travessia por offset não cria snapshot entre requisições: ausência de repetição/omissão pressupõe
um catálogo sem alterações durante o percurso.

## Requisitos originais

- **FR-001**: Paginar sempre `GET /api/v1/tags`, preservando autenticação e envelope.
- **FR-002**: Aceitar página e tamanho; padrões 1 e 20, tamanho permitido de 1 a 100.
- **FR-003**: Retornar `items`, `totalCount`, `page` e `pageSize` em `data`.
- **FR-004**: Ordenar por nome e desempatar por ID.
- **FR-005**: Buscar por trecho do nome normalizado, limitado a 254 caracteres.
- **FR-006**: Usar `Paging.PageInvalid`, `Paging.PageSizeInvalid` e `Paging.PageTooLarge`.
- **FR-007**: Preservar isolamento de tenant e soft delete nos itens e na contagem.
- **FR-008**: Não gravar dados durante a listagem.

## Critérios de sucesso

- **SC-001**: Um catálogo estável pode ser percorrido sem repetição ou omissão.
- **SC-002**: As respostas respeitam o tamanho solicitado e informam o total filtrado.
- **SC-003**: Itens e contagens não incluem outro tenant ou registros excluídos.
- **SC-004**: Entradas inválidas retornam 400 com códigos estáveis, em vez de falha de servidor.

## Contrato registrado e limite da entrega

O endpoint substituiu `data: TagResponse[]` por uma página com itens e metadados. Cada etiqueta
preserva ID, nome, cor e descrição opcional. Não houve nova entidade, migração, índice, mudança de
autenticação ou de escrita. Busca inválida segue o binding compartilhado de `SearchText`.
O [OpenAPI/tipo gerado](../../src/shared/api/generated/services-api.d.ts) e o
[controller](../../../../backend/services/services-service/ServicesService.Api/Controllers/TagsController.cs)
são as fontes para a forma atual da resposta.

A integração precisou preservar a tela antiga com um adaptador de coleção, conforme
[ADR 0069](../../../../docs/adr/0069-tags-collection-compatibility-adapter.md). Essa exceção de rollout
não restaurava um modo sem paginação na API. A navegação paginada frontend posterior retirou o
adaptador; consulte a [evolução](plan.md#evolução-do-consumidor) antes de mudar a lista.
