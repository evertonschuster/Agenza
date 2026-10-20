# Data Model

Nenhuma entidade, tabela, índice ou migração nova.

- TagListFilter: Page, PageSize, Text; herda as guardas de PageRequest.
- PagedResult<TagResponse>: Items, TotalCount, Page, PageSize.
- TagResponse preserva Id, Name, Color e Description.
- SearchText normaliza trim/lowercase e limita a busca a 254 caracteres.
- Tenant e soft delete continuam em filtros globais do contexto.
