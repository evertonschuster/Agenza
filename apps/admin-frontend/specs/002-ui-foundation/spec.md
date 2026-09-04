# Feature Specification: Admin Panel UI Foundation

**Feature Branch**: `002-ui-foundation`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description (pt-BR, transcrito de voz): montar o plano de instalação e configuração do
layout da aplicação. Tema claro/escuro **e** automático conforme o sistema operacional. Compatível com
acessibilidade. Atalhos de teclado para as operações do sistema. Visual moderno, suave, muito clean —
sem excesso de opções ou usabilidade complicada; interface fluida como Mercado Livre e Nubank,
totalmente intuitiva. Responsivo para mobile. Respeitar a arquitetura existente sem pedir demais dela.
A interface atual pode ser inteiramente descartada, mantendo apenas o esqueleto do projeto.

## Clarifications

### Session 2026-09-04

- Q: A tela de login do identity-service já tem identidade visual (Inter, neutro `#1b1d22`, foco
  `#5b68df`, dark via `data-theme`). O painel segue essa linguagem ou ganha marca própria? →
  A: **Marca própria**, com personalidade mais quente (registro Nubank / Mercado Livre). Implica
  atualizar `login.css` do identity-service para não haver quebra visual no redirect OIDC.
- Q: Qual o hue de marca? → A: **Violeta.** `oklch(0.525 0.155 288)` no claro; `oklch(0.72 0.145 288)`
  no escuro. Decidido a partir do protótipo clicável da Fase 0, com três candidatas alternáveis ao vivo.
- Q: Só Serviços/Categorias/Tags têm backend. O que a navegação mostra no dia 1? →
  A: **Navegação completa** com os 6 destinos desde o início; os 4 sem backend abrem uma tela
  "Em breve" honesta.
- Q: Qual a profundidade do sistema de atalhos, dado que a persona é dona de salão e não usuária
  avançada? → A: **Essenciais + paleta de comandos.** `Ctrl/⌘+K`, `/`, `?`, `Esc`, `n`.
- Q: Aprovar o visual antes de escrever código? → A: **Sim**, protótipo clicável primeiro.
  Concluído; ver `research.md`.
- Q: Após revisar o protótipo, alguma correção? → A: **Uma.** A dica de atalho precisa ser mais
  evidente nas ações que possuem atalho. O chip `Ctrl K` dentro do campo de busca funcionou; o botão
  "Novo serviço" não tinha equivalente e o atalho foi difícil de descobrir.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A pessoa escolhe como o painel se apresenta, e o painel obedece (Priority: P1)

A dona do negócio escolhe entre tema claro, escuro ou automático. Em automático, o painel segue a
preferência do sistema operacional e reage quando ela muda, sem recarregar. A escolha sobrevive ao
recarregamento sem nenhum lampejo do tema errado, e atravessa o redirect de login sem que a tela de
credenciais apareça no tema oposto.

**Why this priority**: É o requisito explicitamente pedido, é pré-requisito de toda decisão visual
subsequente (nenhum componente pode ser construído antes dos tokens existirem nos dois temas), e é o
único que atravessa a fronteira entre duas aplicações.

**Independent Test**: Alternar os três estados; mudar o tema do sistema operacional com "automático"
ativo; recarregar; ir para `/login` e conferir que a página de credenciais abre no mesmo tema.

**Acceptance Scenarios**:

1. **Given** a preferência salva é "escuro", **When** a pessoa recarrega a página, **Then** o painel
   pinta em escuro no primeiro quadro, sem lampejo claro.
2. **Given** a preferência é "automático" e o sistema está em claro, **When** o sistema operacional
   muda para escuro, **Then** o painel acompanha imediatamente, sem recarregar.
3. **Given** a preferência é "escuro", **When** a sessão expira e a pessoa é redirecionada ao
   identity-service, **Then** a página de credenciais abre em escuro.
4. **Given** nenhuma preferência foi salva, **When** a pessoa abre o painel pela primeira vez,
   **Then** o tema resolvido segue o sistema operacional.

---

### User Story 2 — O painel é utilizável no celular, entre um atendimento e outro (Priority: P1)

A dona do negócio abre o painel no celular. A navegação fica ao alcance do polegar, os alvos de toque
são confortáveis, nada escapa horizontalmente, o teclado do sistema não encobre o campo em foco, e a
lista de serviços vira cartões legíveis em vez de uma tabela espremida.

**Why this priority**: A persona é majoritariamente móvel. Um shell que só funciona no desktop falha
para a maior parte dos usos reais, e refazer o shell depois é a refatoração mais cara desta feature.

**Independent Test**: Abrir a 375 px de largura; percorrer os destinos pela barra inferior; abrir a
folha "Mais"; focar um campo de formulário e confirmar que não há zoom automático nem que o campo fica
encoberto.

**Acceptance Scenarios**:

1. **Given** uma largura de 375 px, **When** a pessoa abre qualquer rota, **Then** a navegação
   principal aparece como barra inferior e a página não rola horizontalmente.
2. **Given** uma largura de 375 px, **When** a pessoa toca um campo de texto, **Then** o navegador não
   aplica zoom e o campo permanece visível.
3. **Given** uma largura ≥ 1024 px, **When** a pessoa abre qualquer rota, **Then** a navegação aparece
   como barra lateral persistente.
4. **Given** a lista de serviços, **When** a largura é menor que 768 px, **Then** cada serviço é
   apresentado como cartão, com nome, código, categoria, duração, preço e etiquetas legíveis.

---

### User Story 3 — Quem usa teclado ou leitor de tela consegue operar o painel inteiro (Priority: P1)

Uma pessoa que não usa mouse percorre o painel inteiro pelo teclado. O foco é sempre visível, a troca
de rota é anunciada, existe um atalho para pular a navegação repetida, e nenhum controle é alcançável
sem nome acessível.

**Why this priority**: Foi pedido explicitamente. Acessibilidade adicionada depois vira retrabalho em
cada componente já escrito; adicionada na fundação, é praticamente gratuita.

**Independent Test**: Desconectar o mouse. Ir do login ao logout usando apenas o teclado, com um
leitor de tela ativo em pt-BR.

**Acceptance Scenarios**:

1. **Given** o foco no início do documento, **When** a pessoa pressiona Tab, **Then** o primeiro
   elemento focável é um link "Pular para o conteúdo" que move o foco para a região principal.
2. **Given** qualquer navegação entre rotas, **When** a rota muda, **Then** o novo título é anunciado
   por região viva e o foco vai para a região principal.
3. **Given** qualquer controle interativo, **When** ele recebe foco pelo teclado, **Then** há um
   indicador de foco visível que atende o critério 2.4.13 sobre qualquer superfície dos dois temas.
4. **Given** qualquer diálogo aberto, **When** a pessoa pressiona `Esc`, **Then** o diálogo fecha e o
   foco retorna ao elemento que o abriu.

---

### User Story 4 — A pessoa descobre que existe um caminho mais rápido (Priority: P2)

Quem trabalha no desktop percebe, olhando para a tela, que as ações principais têm atalho. Uma paleta
de comandos concentra navegação e ações num só lugar, e existe uma folha de ajuda listando tudo. Quem
não quer atalhos de tecla única pode desligá-los.

**Why this priority**: Pedido explicitamente, mas é acelerador — o painel precisa ser inteiramente
operável sem nenhum atalho. Depende de US2 e US3 estarem prontas.

**Independent Test**: Sem ler documentação, olhar a tela de Serviços no desktop e identificar que
criar um serviço tem atalho. Depois desligar os atalhos e confirmar que teclas de caractere único
param de agir.

**Acceptance Scenarios**:

1. **Given** a tela de Serviços num dispositivo com teclado, **When** a pessoa olha a ação primária,
   **Then** o atalho está visível em repouso, sem exigir hover.
2. **Given** um dispositivo somente de toque, **When** a pessoa abre qualquer tela, **Then** nenhuma
   dica de atalho é exibida.
3. **Given** o foco num campo de texto, **When** a pessoa digita `n`, **Then** o caractere é inserido
   e nenhuma ação de atalho dispara.
4. **Given** os atalhos desligados na preferência, **When** a pessoa pressiona `/`, `?` ou `n`,
   **Then** nada acontece e nenhuma dica é exibida; `Ctrl/⌘+K` e `Esc` continuam funcionando.

---

### User Story 5 — A pessoa entende o que ainda não existe, sem se sentir enganada (Priority: P3)

Os destinos sem backend aparecem na navegação e, ao serem abertos, explicam em português claro o que
virá e por que ainda não está lá, com um caminho de volta.

**Why this priority**: Torna a estrutura de navegação real e validável desde já, mas não bloqueia
nenhuma outra história.

**Independent Test**: Abrir Agenda, Clientes, Conversas e Ajustes e confirmar que cada uma explica seu
próprio escopo, sem texto genérico repetido.

**Acceptance Scenarios**:

1. **Given** um destino sem backend, **When** a pessoa o abre, **Then** vê uma explicação específica
   daquele destino e uma ação de retorno.
2. **Given** a navegação, **When** a pessoa a percorre, **Then** os destinos indisponíveis são
   identificáveis antes do clique.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel **DEVE** oferecer três estados de tema — claro, escuro e automático — sendo
  automático o padrão quando nenhuma preferência existir.
- **FR-002**: O tema resolvido **DEVE** ser aplicado antes da primeira pintura, sem lampejo.
- **FR-003**: Com o tema em automático, uma mudança na preferência do sistema operacional **DEVE**
  alterar o painel sem recarregamento.
- **FR-004**: A preferência de tema **DEVE** ser compartilhada com o identity-service, de modo que a
  página de credenciais abra no mesmo tema (fecha a lacuna da ADR 0020).
- **FR-005**: A navegação **DEVE** expor seis destinos — Início, Agenda, Clientes, Conversas,
  Serviços, Ajustes — desde a primeira entrega.
- **FR-006**: Destinos sem backend **DEVEM** renderizar uma explicação específica do destino, e
  **NÃO DEVEM** ser apresentados como funcionais.
- **FR-007**: O shell **DEVE** apresentar barra lateral em telas largas e barra inferior em telas
  estreitas, sem rolagem horizontal em nenhuma largura a partir de 320 px.
- **FR-008**: Todo controle interativo **DEVE** ter nome acessível e indicador de foco visível.
- **FR-009**: A mudança de rota **DEVE** ser anunciada a tecnologia assistiva e mover o foco para a
  região principal.
- **FR-010**: O painel **DEVE** oferecer um link de pulo para o conteúdo como primeiro elemento focável.
- **FR-011**: O painel **DEVE** oferecer os atalhos `Ctrl/⌘+K`, `/`, `?`, `Esc` e `n`.
- **FR-012**: Atalhos de caractere único **DEVEM** poder ser desligados por preferência do usuário
  (WCAG 2.1.4), e **NÃO DEVEM** disparar enquanto o foco estiver em campo de texto.
- **FR-013**: Ações com atalho **DEVEM** expor a tecla visivelmente em repouso quando forem a ação
  primária única da tela; demais ações com atalho expõem por tooltip em hover **e** foco, ou apenas
  na paleta e na folha de ajuda.
- **FR-014**: Nenhuma dica de atalho **DEVE** ser exibida em dispositivos sem teclado plausível.
- **FR-015**: Os textos visíveis **DEVEM** estar em pt-BR; identificadores de código permanecem em inglês.
- **FR-016**: As cores de etiqueta vindas do backend **DEVEM** ser renderizadas de forma legível nos
  dois temas, sem alterar o valor recebido da API.
- **FR-017**: A interface anterior (`AppLayout`, `HomePage`) **DEVE** ser removida, não estendida.

### Non-Functional Requirements

- **NFR-001**: Nenhuma regressão nos portões de CI existentes: `tsc`, ESLint, Prettier, cobertura
  (85% linhas/funções/statements, 80% branches), `generate:api-types:check`, Playwright.
- **NFR-002**: O painel **DEVE** permanecer utilizável em hardware modesto; a fundação não introduz
  bibliotecas de animação em tempo de execução.
- **NFR-003**: A escolha de biblioteca de componentes **DEVE** ser registrada em ADR, encerrando o
  item correspondente em "Explicitly Deferred Decisions" da constitution.

## Success Criteria *(mandatory)*

- **SC-001**: Uma pessoa consegue ir do login ao logout, passando por todos os seis destinos e abrindo
  um diálogo, usando exclusivamente o teclado.
- **SC-002**: Em 375 px, nenhuma rota apresenta rolagem horizontal e todos os alvos de toque da
  navegação têm ao menos 44 px na menor dimensão.
- **SC-003**: Recarregar com tema escuro salvo não produz nenhum quadro em tema claro.
- **SC-004**: Uma auditoria automatizada de acessibilidade passa sem violações em todas as rotas, nos
  dois temas.
- **SC-005**: Olhando a tela de Serviços no desktop, sem instrução prévia, é possível identificar que
  a criação de serviço tem atalho.
- **SC-006**: Todos os portões de CI passam.

## Assumptions

- O protótipo aprovado na Fase 0 é a referência visual; divergências dele são intencionais e
  registradas.
- Nenhum modelo de papéis ou permissões existe; toda pessoa autenticada de um tenant vê o mesmo painel.
- Apenas Serviços, Categorias e Etiquetas possuem backend; nenhuma tela nova consome API nesta feature.
- O identity-service pode ser alterado nesta feature, restrito ao CSS e ao tratamento do parâmetro de
  tema já previsto pela ADR 0020.

## Out of Scope

- Qualquer tela de negócio funcional: o CRUD de Serviços, a Agenda real, Clientes, Conversas, Ajustes.
- Backend para Agenda, Clientes, Conversas e Ajustes.
- Biblioteca de formulários e de validação — entram com a primeira tela de formulário real.
- Biblioteca de estado de servidor: a ADR 0035 segue valendo.
- Internacionalização além de pt-BR.
- Storybook ou regressão visual automatizada.
