# Feature Specification: Service Tags CRUD

**Feature Branch**: `003-tags-crud`

**Created**: 2026-09-13

**Status**: Draft — User Story 1 (list & search) is implemented; User Stories 2–4 (create, edit,
delete) were built, then pulled back out of the app on an explicit scope decision. User Story 4
(delete) was later reintroduced on its own; User Stories 2–3 (create, edit) stay out.
`docs/ARCHITECTURE.md` §5 has the full history and current reality; this file is kept as the
original requirements record, not updated to match.

**Input**: User description: "Creating CRUD for maintainer tags in my frontend app. The CRUD needs to
have, following the backend contract: `string Name, string Color, string? Description`."

## Clarifications

### Session 2026-09-13

- Q: Como a pessoa chega até a tela de gestão de Etiquetas a partir do resto do painel? → A: Pela
  paleta de comandos do painel (menu de ações do sistema), numa rota própria em `/tags` — não
  aninhada em `/servicos`, sem link na tela de Serviços, sem novo ícone na navegação principal fixa.
- Q: Revisando o protótipo clicável, alguma correção? → A: Sim, uma. O cabeçalho da tela não deve
  exibir a rota (`/tags`) nem um subtítulo descritivo — só o título "Etiquetas" e a ação "Nova
  etiqueta". O protótipo corrigido é a referência visual desta feature.

### Session 2026-09-14

- Q: A tela de Etiquetas deve continuar acessível somente pela paleta de comandos, como decidido na
  sessão anterior? → A: Não, essa decisão foi revertida. A tela **DEVE** também aparecer como destino
  fixo na navegação principal (barra lateral em telas largas, item "Mais" na navegação inferior em
  telas estreitas), com ícone próprio, para um acesso mais direto e intuitivo; a paleta de comandos
  continua funcionando como via adicional.
- Q: A busca por nome (US1, FR-002) deve continuar filtrando a lista já carregada no frontend a cada
  tecla digitada? → A: Não. Com um catálogo que pode crescer bastante, filtrar no frontend obriga a
  carregar e reprocessar a lista inteira no navegador a cada tecla. A busca **DEVE** ser executada no
  backend, disparada apenas quando a pessoa confirma explicitamente (tecla Enter ou um botão de
  busca) — nunca a cada tecla digitada.

### Session 2026-09-24

- Q: Os botões principais do fluxo de criar/editar etiqueta devem ter atalho de teclado? → A: Sim.
  A ordem de salvar **DEVE** poder ser dada tanto pelo mouse quanto pelo teclado, e os demais botões
  principais também **DEVEM** ter um caminho de teclado. Salvar usa `Ctrl+S` (`⌘S` no macOS), o
  mnemônico que a W3C APG recomenda; `Ctrl+Enter` foi descartado porque a APG desaconselha
  modificador + Enter (conflito com o sistema operacional).

### Session 2026-09-25

- Q: A exclusão também deve ter atalho de teclado? → A: Sim. `Delete` com o foco numa linha da
  lista **DEVE** abrir a confirmação de exclusão daquela etiqueta — nunca excluir direto. Por ser
  destrutivo, o atalho não ganha keycap nem tooltip (fica só na folha `?`), e a confirmação abre com
  o foco em Cancelar: excluir continua exigindo uma escolha explícita.
- Q: Enquanto o backend processa o salvamento, a pessoa pode clicar em Cancelar — mas a operação
  termina do mesmo jeito. Cancelar deve continuar disponível? → A: Não. Um Cancelar que não cancela
  engana; durante o salvamento (e, pelo mesmo motivo, durante a exclusão) nenhuma saída do diálogo
  fica disponível — Cancelar desabilitado, ✕ oculto, `Esc` e clique fora ignorados — até a
  resposta chegar.
- Q: A confirmação de exclusão deve apresentar um atalho para excluir? → A: Sim. O botão Excluir da
  confirmação mostra `Ctrl+Delete` (`⌘Delete` no macOS), que confirma a exclusão. `Delete` sozinho
  **não** confirma: ele já é a tecla que abre a confirmação, e repeti-lo (ou segurá-lo) não pode
  virar uma exclusão de um gesto só. A confirmação continua abrindo com o foco em Cancelar.

### Session 2026-09-26

- Q: O atalho `Delete` com o foco numa linha da lista deve continuar? → A: Não. Foi implementado
  por engano e foi removido (FR-017 reescrita): a exclusão começa pelo botão da linha, com clique ou
  `Tab` + `Enter`. O `Ctrl+Delete` da confirmação (FR-019) permanece; `Delete` sozinho continua sem
  confirmar, agora porque uma tecla sem modificador numa confirmação destrutiva é fácil demais de
  disparar por engano.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A pessoa vê e localiza as etiquetas existentes (Priority: P1)

Quem administra o catálogo de serviços abre a área de Etiquetas e vê todas as etiquetas já
cadastradas, com nome, cor e descrição visíveis de relance. Digitando parte de um nome e confirmando
a busca (Enter ou botão de busca), a lista passa a mostrar apenas as etiquetas correspondentes,
buscadas no backend.

**Why this priority**: Sem enxergar o que já existe, a pessoa não sabe se uma etiqueta já foi
criada, arrisca duplicar nomes e não consegue decidir o que editar ou excluir. É a base sobre a qual
as outras histórias se apoiam.

**Independent Test**: Com etiquetas já cadastradas (via seed/API), abrir a tela e conferir que todas
aparecem corretamente; digitar um trecho de nome, confirmar a busca (Enter ou botão) e conferir que a
lista passa a mostrar apenas as etiquetas correspondentes, buscadas no backend.

**Acceptance Scenarios**:

1. **Given** existem etiquetas cadastradas, **When** a pessoa abre a tela de Etiquetas, **Then**
   cada etiqueta aparece com nome, cor e descrição (quando houver).
2. **Given** a lista de etiquetas, **When** a pessoa digita parte de um nome na busca e confirma
   (tecla Enter ou botão de busca), **Then** o sistema busca no backend e somente as etiquetas cujo
   nome contém o texto buscado permanecem visíveis.
3. **Given** nenhuma etiqueta foi cadastrada ainda, **When** a pessoa abre a tela, **Then** vê uma
   indicação clara de que o catálogo está vazio, não uma lista quebrada ou um erro.
4. **Given** o painel autenticado em qualquer tela, **When** a pessoa abre a paleta de comandos e
   seleciona "Etiquetas" — ou acessa `/tags` diretamente —, **Then** a tela de gestão de Etiquetas é
   exibida.

---

### User Story 2 — A pessoa cria uma nova etiqueta (Priority: P1)

Quem administra o catálogo cria uma etiqueta informando um nome, escolhendo uma cor entre as opções
disponíveis e, opcionalmente, descrevendo seu uso. A etiqueta criada passa a existir no catálogo e
pode futuramente ser aplicada a serviços.

**Why this priority**: É o motivo de a tela existir — sem conseguir criar etiquetas, o catálogo
nunca cresce e as demais histórias (editar, excluir) não têm sobre o que atuar.

**Independent Test**: Preencher nome e cor válidos (sem descrição), confirmar, e ver a etiqueta
aparecer na lista imediatamente.

**Acceptance Scenarios**:

1. **Given** a tela de criação de etiqueta, **When** a pessoa informa um nome novo, escolhe uma cor
   e confirma, **Then** a etiqueta passa a aparecer na listagem.
2. **Given** a tela de criação, **When** a pessoa tenta confirmar sem informar nome ou sem escolher
   cor, **Then** a criação é bloqueada e o campo pendente é indicado.
3. **Given** já existe uma etiqueta chamada "Promoção", **When** a pessoa tenta criar outra com o
   mesmo nome (ignorando maiúsculas/minúsculas e espaços), **Then** a criação é bloqueada com uma
   mensagem de nome já em uso.
4. **Given** a tela de criação, **When** a pessoa informa uma descrição, **Then** a descrição fica
   associada à etiqueta e aparece na listagem.

---

### User Story 3 — A pessoa corrige uma etiqueta existente (Priority: P2)

Quem administra o catálogo percebe um nome errado, uma cor mal escolhida ou uma descrição
desatualizada e a corrige, sem precisar excluir e recriar a etiqueta.

**Why this priority**: Importante para manter o catálogo correto ao longo do tempo, mas o catálogo
já é útil apenas com criação e listagem (US1/US2); editar é uma melhoria, não um bloqueio inicial.

**Independent Test**: Abrir uma etiqueta existente, alterar o nome e a cor, salvar, e conferir que a
listagem reflete os novos valores.

**Acceptance Scenarios**:

1. **Given** uma etiqueta existente, **When** a pessoa altera seu nome para um valor não usado por
   nenhuma outra etiqueta e salva, **Then** a listagem passa a mostrar o novo nome.
2. **Given** uma etiqueta existente, **When** a pessoa tenta salvar com o nome de outra etiqueta já
   cadastrada, **Then** a alteração é bloqueada com uma mensagem de nome já em uso.
3. **Given** uma etiqueta existente, **When** a pessoa troca apenas a cor, **Then** a nova cor
   aparece imediatamente na listagem.

---

### User Story 4 — A pessoa remove uma etiqueta que não usa mais (Priority: P2)

Quem administra o catálogo exclui uma etiqueta obsoleta. Se a etiqueta ainda estiver aplicada a
algum serviço, a exclusão é impedida e a pessoa entende o motivo.

**Why this priority**: Mantém o catálogo enxuto, mas não bloqueia o valor central (criar e listar);
depende de já existir ao menos uma etiqueta (US2).

**Independent Test**: Excluir uma etiqueta sem uso e confirmar que ela some da lista; tentar excluir
uma etiqueta em uso (associada a um serviço) e confirmar que a exclusão é impedida com uma
explicação.

**Acceptance Scenarios**:

1. **Given** uma etiqueta que não está associada a nenhum serviço, **When** a pessoa pede para
   excluí-la e confirma, **Then** ela desaparece da listagem.
2. **Given** uma etiqueta associada a um ou mais serviços, **When** a pessoa tenta excluí-la,
   **Then** a exclusão é impedida e a pessoa vê quantos serviços a utilizam.
3. **Given** o pedido de exclusão, **When** a pessoa ainda não confirmou, **Then** a etiqueta
   permanece intacta até a confirmação explícita.

### Edge Cases

- O que acontece se a pessoa tentar salvar uma etiqueta com nome de 41+ caracteres ou descrição de
  201+ caracteres? Bloqueado antes de concluir, com o limite indicado.
- O que acontece se duas pessoas tentarem criar/editar etiquetas com o mesmo nome ao mesmo tempo?
  Apenas a primeira confirmação é aceita; a segunda recebe o erro de nome duplicado, sem sobrescrever
  a primeira.
- O que acontece se a etiqueta que a pessoa está editando ou excluindo for removida por outra pessoa
  entre abrir a tela e confirmar a ação? A ação falha com uma mensagem de "não encontrada", sem
  quebrar a tela.
- O que acontece se a conexão falhar durante a criação/edição? O formulário preenchido pela pessoa
  não é perdido; ela pode tentar novamente.
- O que acontece com uma descrição preenchida só com espaços? É tratada como se estivesse vazia.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema **DEVE** listar todas as etiquetas do tenant atual, mostrando nome, cor e
  descrição de cada uma.
- **FR-002**: O sistema **DEVE** permitir localizar etiquetas por nome através de um campo de busca
  que filtra no backend, disparando a busca apenas quando a pessoa confirma explicitamente (tecla
  Enter ou botão de busca); **NÃO DEVE** filtrar a listagem já carregada no frontend a cada tecla
  digitada.
- **FR-003**: O sistema **DEVE** permitir criar uma nova etiqueta informando nome (obrigatório), cor
  (obrigatória, escolhida entre uma paleta fixa de 8 cores) e descrição (opcional).
- **FR-004**: O sistema **DEVE** impedir a criação de uma etiqueta com nome já usado por outra
  etiqueta do mesmo tenant (comparação sem diferenciar maiúsculas/minúsculas ou espaços nas pontas),
  exibindo uma mensagem de conflito clara.
- **FR-005**: O sistema **DEVE** rejeitar nome vazio ou com mais de 40 caracteres, e descrição com
  mais de 200 caracteres, antes de considerar a operação concluída.
- **FR-006**: O sistema **DEVE** permitir editar nome, cor e descrição de uma etiqueta existente,
  aplicando as mesmas regras de validação e unicidade da criação.
- **FR-007**: O sistema **DEVE** permitir excluir uma etiqueta que não esteja em uso por nenhum
  serviço.
- **FR-008**: O sistema **DEVE** impedir a exclusão de uma etiqueta em uso por um ou mais serviços,
  informando quantos serviços a utilizam.
- **FR-009**: O sistema **DEVE** pedir confirmação da pessoa antes de excluir uma etiqueta.
- **FR-010**: O sistema **DEVE** exibir a cor de cada etiqueta de forma legível nos temas claro e
  escuro, sem alterar o valor recebido da API.
- **FR-011**: O sistema **NÃO DEVE** oferecer um seletor de cor livre; a escolha **DEVE** ficar
  restrita à paleta fixa validada pelo backend.
- **FR-012**: O sistema **DEVE** exibir à pessoa usuária a mensagem devolvida pelo backend para cada
  erro — geral ou por campo (campo obrigatório ou inválido, nome duplicado, etiqueta em uso, etiqueta
  não encontrada) — sem reescrevê-la. A escolha de **onde** exibir cada mensagem (junto a um campo
  específico do formulário ou como aviso geral) **DEVE** se basear na estrutura do erro devolvido (o
  campo indicado, ou a ausência de um), nunca em interpretar o texto da mensagem.
- **FR-013**: Os textos visíveis **DEVEM** estar em pt-BR.
- **FR-014**: A tela de gestão de Etiquetas **DEVE** estar disponível na URL `/tags` e **DEVE** ser
  alcançável tanto pela paleta de comandos do painel quanto por um destino próprio, com ícone
  dedicado, na navegação principal fixa (barra lateral em telas largas, item "Mais" da navegação
  inferior em telas estreitas); **NÃO DEVE** exigir passar pela tela de Serviços.
- **FR-015**: O cabeçalho da tela **NÃO DEVE** exibir a rota nem um subtítulo descritivo; **DEVE**
  mostrar apenas o título "Etiquetas" e a ação primária "Nova etiqueta".
- **FR-016**: O formulário de criação/edição **DEVE** permitir salvar com `Ctrl+S` (`⌘S` no macOS) a
  partir de qualquer campo, com o mesmo efeito e as mesmas restrições do botão Salvar — sem efeito
  enquanto o botão estiver desabilitado (carregando ou salvando). O atalho **DEVE** aparecer no
  próprio botão e ser exposto a tecnologias assistivas. `Esc` **DEVE** fechar o formulário sem
  salvar, como Cancelar.
- **FR-017**: *Removida em 2026-09-26 (ver Clarifications).* A lista **NÃO DEVE** ter atalho de
  teclado para excluir a linha em foco; a exclusão começa pelo botão da linha (clique, ou `Tab` +
  `Enter`). A confirmação **DEVE** abrir com o foco em Cancelar.
- **FR-018**: Enquanto um salvamento (criação/edição) ou uma exclusão estiver em andamento, o
  diálogo **NÃO DEVE** poder ser fechado: Cancelar **DEVE** ficar desabilitado, o ✕ **DEVE** ficar
  oculto e `Esc` e o clique fora **DEVEM** ser ignorados. Quando a resposta chegar, com sucesso o diálogo fecha sozinho;
  com erro, as saídas voltam a funcionar.
- **FR-019**: Na confirmação de exclusão, `Ctrl+Delete` (`⌘Delete` no macOS) **DEVE** confirmar a
  exclusão, com o mesmo efeito e as mesmas restrições do botão Excluir (sem efeito durante a
  exclusão ou depois de um bloqueio), e **DEVE** aparecer no próprio botão e ser exposto a
  tecnologias assistivas. `Delete` sem modificador **NÃO DEVE** confirmar.

### Key Entities

- **Etiqueta (Tag)**: representa um rótulo reutilizável aplicável a Serviços, usado para
  categorizá-los. Atributos: nome (texto curto, único por tenant), cor (uma entre 8 opções fixas),
  descrição (texto opcional, mais longo que o nome). Pertence a exatamente um tenant; pode estar
  associada a zero ou mais Serviços.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa cria uma etiqueta válida (nome + cor) em menos de 30 segundos a partir da
  tela de listagem.
- **SC-002**: 100% das tentativas de criar ou editar uma etiqueta com nome duplicado são bloqueadas,
  sem nunca resultar em duas etiquetas com o mesmo nome no mesmo tenant.
- **SC-003**: 100% das tentativas de excluir uma etiqueta em uso são bloqueadas, sem exceção.
- **SC-004**: Entre 50 etiquetas cadastradas, a pessoa localiza uma etiqueta específica pelo nome em
  menos de 5 segundos usando a busca.
- **SC-005**: Após criar, editar ou excluir uma etiqueta e recarregar a página, a listagem reflete
  exatamente o estado esperado — nenhuma etiqueta perdida, duplicada ou desatualizada.

## Assumptions

- Sem modelo de papéis ou permissões: qualquer pessoa autenticada do tenant pode gerenciar etiquetas
  (mesma premissa da Fundação de UI).
- O catálogo de etiquetas é pequeno (dezenas a poucas centenas) — a listagem não precisa de
  paginação, alinhado ao endpoint existente do backend.
- A tela tem rota própria (`/tags`), fora da área de Serviços, alcançável tanto pela paleta de
  comandos quanto por um destino próprio na navegação principal fixa — a navegação passa a ter sete
  destinos.
- Os únicos atributos de etiqueta são nome, cor e descrição — sem ícone, ordenação manual ou
  arquivamento.
- A paleta de 8 cores é fixa e definida pelo backend; o frontend não introduz cores adicionais.
- O protótipo clicável revisado e corrigido nesta sessão
  (https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f) é a referência visual desta
  feature — mesmo princípio adotado em `specs/002-ui-foundation`. Qualquer divergência dele durante o
  `/speckit-plan` ou a implementação deve ser intencional e registrada aqui.

## Out of Scope

- CRUD de Serviços e de Categorias.
- Atribuir ou remover etiquetas de um Serviço específico (pertence à tela de Serviço).
- Paginação da listagem de etiquetas.
- Qualquer modelo de papéis/permissões para restringir quem gerencia etiquetas.
- Cores personalizadas além da paleta fixa.
