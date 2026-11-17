# ADR 0005 — Modelagem de domínio e contratos de API

Status: aceita (2026-11-15).

## Decisão

**Agregados.**

- Construtor privado, `Create` que valida e constrói, comportamento que valida antes de atribuir.
  Filhos só são criados pela raiz, por fábricas `internal` que geram o próprio id.
- Agregados se referenciam por id. Um muitos-para-muitos é um filho da raiz dona, com FK composta
  para as duas pontas (`ClientTag`).
- Uma mudança de estado é um método com intenção (`Inactivate()`), que recusa transição inválida com
  erro nomeado. Um `Update` do registro inteiro só serve para dados livres, sem transição.

**Valores.**

- É value object o que tem formato, normalização ou regra; texto livre limitado só pelo tamanho pode
  ficar primitivo.
- Os value objects sem contexto ficam em `Admin.SharedKernel.ValueObjects` e se comportam como
  escalar no wire.
- Um value object de texto só é lido de query ou rota por opt-in; dado pessoal nunca, porque URL vai
  para log.
- Um conjunto fechado de opções é um enum simples, que viaja pelo nome em camelCase; de query ou
  rota, exatamente um nome.

**Ciclo de vida e unicidade.**

- Excluir é soft delete; um id excluído responde `404`.
- A unicidade é um índice único com `TenantId` e `"DeletedAt" IS NULL`. A pré-checagem do handler
  existe só para responder no campo.
- Uma edição (`PUT`) substitui o registro inteiro, filhos incluídos.

**Listas paginadas.** `PagedQuery` com `page` e `pageSize` (padrão 20, máximo 100) entra como
`PageRequest`, ou como o filtro da lista que o estende, e sai como `PagedResult`. Uma página além da
última responde `200` sem itens.

**Regras de produto de Pessoas e Etiquetas:**

- Excluir uma pessoa libera o CPF; inativar não libera. Contatos são excluídos junto. Um agendamento
  bloqueia a exclusão.
- Desativar e reativar não têm corpo e são idempotentes: respondem `200`, inclusive repetidos.
- A leitura por id devolve a mesma resposta do `POST` e do `PUT`, sem idade (o frontend a calcula),
  com o CPF inteiro e os contatos ordenados por nome.
- `tagIds` nulo no `PUT` limpa as etiquetas; etiqueta desconhecida responde `400` em `TagIds`;
  etiqueta em uso por pessoas não pode ser excluída.

Formas de código e configuração EF: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md)
§3, §5 e §6. Formas comuns do wire: [docs/API.md](../API.md).

## Rejeitado

- **Um status `Deleted` ao lado do soft delete.** Duas fontes de verdade, e o status sozinho não
  escondia a linha.
- **Uma tabela de contatos com discriminador.** Colunas nulas que só valem para um tipo.
- **CPF reservado para sempre**, inclusive de pessoas excluídas. Decisão de produto: excluir libera.
- **Sincronizar filhos por id na edição.** Reconcilia identidade técnica quando a requisição já traz
  o estado desejado inteiro.
- **Value object para um conjunto de opções**, conversor registrado por enum, `[JsonConverter]` no
  domínio e enums com valores em bits. Esquecer um registro falhava em silêncio, e bits aceitavam
  combinações.
- **Validator de paginação compartilhado ou especificação genérica no repositório.** Cada lista tem
  seus filtros, e a porta recebe valores simples.
- **Modo não paginado de listas**, recusado pelo dono.
- **Idade no wire.** Prende a resposta ao dia em que foi calculada.
- **Mascarar o CPF**, decisão do dono.
- **`409` para ação repetida.** Um segundo clique viraria erro para o estado que o usuário queria.
- **Etiquetas como `uuid[]` na tabela de pessoas.** O PostgreSQL não tem FK em elemento de array, e a
  posse por tenant ficaria só na aplicação.
- **Navegação direta entre `Client` e `Tag`.** Carregaria outra raiz dentro do agregado.
