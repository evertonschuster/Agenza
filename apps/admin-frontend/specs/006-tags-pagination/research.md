# Research: Paginação de etiquetas

## Decision: Reusar a paginação de clientes

Rationale: ADR 0064 e ARCHITECTURE §§5–6 já definem PagedQuery, PageRequest, PagedResult
e RepositoryBase.ListPagedAsync. Basta uma nova aplicação do padrão.
Alternatives considered: offset manual, tupla de itens/total e paginação opcional; descartados
por divergirem do padrão ou da escolha explícita do usuário.

## Decision: Atualizar a busca tocada para SearchText

Rationale: ARCHITECTURE §10 exige converter a parte antiga tocada; Tags já possui NameNormalized.
Contains sobre essa coluna usa busca literal, sem wildcard implícito de ILike.
Alternatives considered: manter string/ILike; descartado pela regra atual e pela surpresa de %/_.

## Decision: Preservar a ordem de nomes e acrescentar ID

Rationale: manter a ordem Name do endpoint e usar um desempate único impede páginas instáveis
em empates de ordenação. Não adicionar um índice ou mecanismo de desempenho sem evidência.
Alternatives considered: mudar a ordem para NameNormalized; não é necessário para paginação.

## Decision: Backend e tipos gerados primeiro

Rationale: AGENTS.md exige separação de PRs entre backend e frontend.
Alternatives considered: adaptar a tela neste PR ou carregar todas as páginas silenciosamente;
ambos aumentariam o escopo e o segundo esconderia a mudança de contrato.
