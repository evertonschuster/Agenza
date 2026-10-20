# HTTP contract: GET /api/v1/tags

Autenticação e validação de X-Tenant-Id seguem o contrato vigente.

Query: Search opcional, Page opcional (padrão 1), PageSize opcional (padrão 20, máximo 100).

200: envelope ApiResponse com data contendo:
items: TagResponse[]
totalCount: inteiro com a quantidade após todos os filtros
page: página solicitada
pageSize: tamanho solicitado

TagResponse: id (UUID), name (string), color (string), description (string ou null).

400: ApiProblemDetails; Paging.PageInvalid, Paging.PageSizeInvalid ou Paging.PageTooLarge.
Busca inválida é recusada no binding pelo contrato compartilhado de SearchText.
Página além da última: 200, items vazio, totalCount preservado.

Mudança incompatível: data deixa de ser um array. O consumidor deve ler data.items
e usar os metadados para navegar. Nenhum modo de listagem completa permanece.
Busca % e _ passa a ser literal, e o limite de SearchText passa a valer.
