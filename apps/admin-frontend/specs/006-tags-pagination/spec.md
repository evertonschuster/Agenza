# Feature Specification: Paginação de etiquetas no backend

**Feature Branch**: codex/tags-pagination
**Created**: 2026-10-20
**Status**: Backend implemented; validation and consumer impact in quickstart.md
**Input**: Adicionar paginação à listagem de tags seguindo a listagem de clientes.

## Clarifications

- 2026-10-20: O usuário escolheu paginar sempre, com página padrão quando os parâmetros forem omitidos.

## User Scenarios & Testing

### User Story 1 — Consultar etiquetas em páginas (Priority: P1)

O consumidor consulta uma página do catálogo sem carregar todas as etiquetas.

**Independent Test**: Cadastrar 25 etiquetas e consultar páginas de 20 e 5 itens.

**Acceptance Scenarios**:

1. Sem parâmetros, a resposta contém a primeira página, até 20 itens e o total.
2. Com página e tamanho explícitos, a resposta contém somente os itens pedidos e os metadados.
3. Uma página além da última retorna sucesso, itens vazios e o total real.
4. Percorrer páginas de um catálogo sem alterações não repete nem omite etiquetas.

### User Story 2 — Buscar dentro do catálogo paginado (Priority: P1)

O consumidor combina busca por nome e paginação, com o total dos resultados filtrados.

**Independent Test**: Buscar um trecho com correspondências em várias páginas.

**Acceptance Scenarios**:

1. A busca ignora diferenças de caixa e espaços nas extremidades.
2. O filtro é aplicado antes da contagem e do recorte da página.
3. Os caracteres % e _ são procurados literalmente.
4. Busca ausente ou em branco não restringe os resultados.

### Edge Cases

Página zero/negativa, tamanho zero/negativo/acima do limite e offset que excede o limite
são recusados como erros de validação. Busca acima do limite é recusada na entrada.
Etiquetas excluídas e de outro tenant não entram nos itens nem no total. Sem tenant, nenhuma
etiqueta é retornada.

## Requirements

### Functional Requirements

- **FR-001**: Paginar sempre GET /api/v1/tags, preservando autenticação e o envelope da API.
- **FR-002**: Aceitar page e pageSize; padrões 1 e 20, tamanho permitido de 1 a 100.
- **FR-003**: Retornar items, totalCount, page e pageSize dentro de data.
- **FR-004**: Ordenar por nome e desempatar por ID.
- **FR-005**: Aplicar busca por trecho do nome, normalizada, limitada a 254 caracteres.
- **FR-006**: Usar os códigos Paging.PageInvalid, Paging.PageSizeInvalid e Paging.PageTooLarge.
- **FR-007**: Manter isolamento de tenant e soft delete na contagem e nos itens.
- **FR-008**: A listagem não pode gravar dados.

### Key Entities

- Etiqueta: ID, nome e cor existentes; descrição opcional.
- Página de etiquetas: itens, total filtrado, página solicitada e tamanho solicitado.

## Success Criteria

- **SC-001**: Um catálogo estável pode ser percorrido sem repetição ou omissão.
- **SC-002**: Todas as respostas respeitam o tamanho solicitado e informam o total filtrado.
- **SC-003**: Nenhuma consulta inclui itens ou contagens de outro tenant ou de excluídos.
- **SC-004**: Entradas inválidas retornam 400 com códigos estáveis, em vez de erro de servidor.

## Assumptions

- A mudança cobre backend e tipos OpenAPI regenerados; a navegação paginada da tela exige
  integração em um PR de frontend separado, conforme AGENTS.md.
- O formato anterior data: Tag[] é substituído por data: PagedResult<TagResponse>.
- Não há mudança de esquema, de autenticação ou de escrita de etiquetas.

## CI integration correction — 2026-10-20

The requested pipeline repair adds the necessary consumer compatibility adapter documented in
ADR 0069. The existing screen continues receiving the complete filtered collection through
bounded API requests. Page navigation remains a separate frontend feature.
