# Spec 003 — CRUD de Etiquetas

**Estado:** implementada; registro histórico dos requisitos e das revisões desta entrega.
**Criada em:** 13/09/2026. **Identificador:** `003-tags-crud`.

O CRUD entrou em `84a54da3` (PR #125); a paginação e a busca por ação evoluíram em
`a3c1f47e` (PR #184). A presença de `TagListPage`, `TagFormPage`, `TagDeletePage` e dos respectivos
hooks e testes confirma essas capacidades na base `38d2dbd9`. Este saneamento não executou os testes.
O [plano](plan.md) distingue decisões superadas da implementação consultada; as
[tarefas](tasks.md) são um registro encerrado, não uma fila a retomar.

## Escopo e revisões históricas

O pedido foi gerenciar nome, cor e descrição de etiquetas já suportadas pelo backend, sem criar o
CRUD de Serviços ou Categorias, atribuir etiquetas a serviços ou introduzir papéis/permissões.
Qualquer pessoa autenticada do tenant podia gerenciar seu catálogo.

- **13/09:** rota própria `/tags`, inicialmente só pela paleta de comandos; cabeçalho apenas com
  título e ação, sem rota ou subtítulo. O acesso foi revisto no dia seguinte.
- **14/09:** destino também na navegação principal; busca no backend após Enter ou Buscar, em lugar
  de filtrar a lista carregada a cada tecla.
- **25/09:** fechar o diálogo durante uma mutação foi bloqueado, pois Cancelar não cancelava a operação.
- **20/10:** paginação passou a fazer parte do escopo. A busca, página e tamanho ficaram fora da URL,
  conforme a etapa registrada na ADR 0074. Essa escolha de armazenamento foi posteriormente superada:
  a forma controlada com URL aparece no código e no PR #190, sem tornar esta spec um manual desse hook.

## Histórias e cenários de aceite

### US1 — Ver e localizar etiquetas (P1)

1. Havendo etiquetas, abrir a tela mostra nome, cor e descrição quando houver.
2. Digitar parte do nome e confirmar com Enter ou Buscar consulta o backend e restringe os resultados;
   digitar sem confirmar não busca.
3. Catálogo vazio mostra um estado explicativo, sem parecer uma falha.
4. A paleta de comandos ou o acesso direto a `/tags` abre a gestão de Etiquetas.
5. Havendo mais registros do que cabem na página, abrir mostra a primeira página, o total e os
   controles; trocar página ou tamanho mantém a busca aplicada.

### US2 — Criar etiqueta (P1)

1. Nome novo e cor válida permitem salvar; a etiqueta passa a integrar o catálogo mostrado.
2. Nome ou cor ausentes bloqueiam a criação e identificam o campo pendente.
3. Nome já utilizado, ignorando caixa e espaços nas pontas, produz conflito sem criar duplicata.
4. Descrição informada fica associada à etiqueta e aparece na listagem.

### US3 — Corrigir etiqueta (P2)

1. Alterar o nome para outro disponível e salvar atualiza a listagem.
2. Alterar para o nome de outra etiqueta produz conflito sem substituir o registro existente.
3. Alterar apenas a cor atualiza sua apresentação sem excluir e recriar a etiqueta.

### US4 — Excluir etiqueta (P2)

1. Etiqueta sem uso desaparece da listagem após pedido e confirmação de exclusão.
2. Etiqueta associada a serviços permanece intacta; o bloqueio explica quantos serviços a utilizam.
3. Antes da confirmação, inclusive ao cancelar, a etiqueta permanece intacta.

## Requisitos registrados

Os identificadores foram preservados para os consumidores e testes existentes. A numeração original
não contém FR-016.

- **FR-001:** listar etiquetas do tenant, página a página, com nome, cor e descrição.
- **FR-002:** buscar por nome no backend somente após confirmação explícita, sem filtro local por tecla.
- **FR-003:** criar com nome e cor obrigatórios, paleta fixa de oito cores e descrição opcional.
- **FR-004:** impedir nome duplicado no tenant, sem distinguir caixa ou espaços nas pontas, com conflito claro.
- **FR-005:** recusar nome vazio ou acima de 40 caracteres e descrição acima de 200 caracteres.
- **FR-006:** editar nome, cor e descrição com as mesmas regras de criação.
- **FR-007:** excluir somente etiqueta sem uso por serviços.
- **FR-008:** impedir exclusão em uso e informar a quantidade de serviços relacionados.
- **FR-009:** exigir confirmação antes de excluir.
- **FR-010:** apresentar a cor legivelmente nos dois temas, preservando o valor recebido da API.
- **FR-011:** restringir escolha à paleta validada pelo backend, sem seletor de cor livre.
- **FR-012:** exibir mensagens gerais ou por campo do backend sem reescrita; decidir sua posição pela
  estrutura do erro, nunca pela interpretação de seu texto. A política vigente de normalização e
  mensagens utilizáveis está no [guia HTTP](../../../../docs/API.md).
- **FR-013:** manter os textos visíveis em pt-BR.
- **FR-014:** disponibilizar `/tags` pela paleta e navegação principal com ícone próprio: barra lateral
  em tela larga e Mais na navegação inferior em tela estreita, sem passagem obrigatória por Serviços.
- **FR-015:** cabeçalho com Etiquetas e Nova etiqueta, sem exibir rota ou subtítulo.
- **FR-017:** iniciar exclusão na linha e abrir confirmação com foco em Cancelar.
- **FR-018:** durante salvar ou excluir, desabilitar Cancelar, ocultar o fechamento e ignorar Esc e
  clique fora; após resposta, fechar no sucesso ou reabilitar saídas no erro.
- **FR-019:** usar resumo, paginador e Itens por página, com opções 10, 20, 50 e 100 e padrão 20.
  Buscar ou trocar tamanho volta à página 1; a busca mantém o tamanho, e a troca de tamanho mantém a
  busca. Salvar/excluir atualiza a página exibida; uma página que deixou de existir cede lugar à
  última existente, sem falso catálogo vazio.

### Casos de fronteira

- Descrição só com espaços equivale à ausência de descrição.
- Concorrência com o mesmo nome não pode sobrescrever nem criar uma segunda etiqueta.
- Registro removido entre abrir e confirmar produz a mensagem de não encontrado.
- Falha de conexão ao criar/editar preserva o preenchimento e permite nova tentativa.
- Bloqueio de negócio na exclusão difere de falha transitória com recuperação; ambos mantêm a etiqueta.

## Critérios de sucesso históricos

São metas do aceite original, sem medição nova neste saneamento:

- **SC-001:** criar uma etiqueta válida em menos de 30 segundos a partir da listagem.
- **SC-002:** bloquear todas as tentativas de criação/edição com nome duplicado no tenant.
- **SC-003:** bloquear todas as exclusões de etiquetas em uso.
- **SC-004:** localizar pelo nome uma etiqueta entre 50 em menos de cinco segundos.
- **SC-005:** após criar, editar, excluir e recarregar, refletir o estado esperado sem perda ou duplicação.

## Modelo e limites da entrega

Etiqueta é um rótulo reutilizável do tenant: id atribuído pelo servidor, nome, cor e descrição
opcional. O vínculo com Serviços aparece nesta gestão apenas como impedimento de exclusão; não se
modelou uma lista de serviços associados na tela. Não foram incluídos ícone, ordenação manual,
arquivamento ou cores personalizadas.
