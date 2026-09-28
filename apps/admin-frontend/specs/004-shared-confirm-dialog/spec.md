# Feature Specification: Diálogo de Confirmação Reutilizável

**Feature Branch**: `004-shared-confirm-dialog`

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "quero refatorar o componente responsável pela confirmação da deleção
(apps/admin-frontend/src/features/tags/ui/pages/TagsPage/DeleteTagDialog.tsx) para ser um componente
comum e reutilizável na aplicação, um componente configurável para demais rotinas do sistema"

## Clarifications

### Session 2026-09-14

- Q: Hoje só a exclusão de etiquetas usa confirmação. Esta feature deve também aplicar o componente a
  uma segunda rotina real, para comprovar a reutilização, ou basta entregá-lo pronto para adoção
  futura? → A: **Só trocar o de Etiquetas.** Nenhuma segunda rotina é construída nesta feature; a
  reutilização é comprovada por configuração/teste isolado, não por um segundo consumidor real.
- Q: O componente deve cobrir apenas confirmações de ações destrutivas/irreversíveis, ou qualquer
  confirmação do painel (incluindo ações neutras)? → A: **Só ações destrutivas.** O tom de alerta
  (ícone e botão de destaque vermelho) e o estado "bloqueado por regra de negócio" continuam sendo
  parte central e fixa do componente; confirmações neutras ficam fora de escopo.
- Q: O ícone do botão de confirmar (hoje uma lixeira) deve ser configurável por rotina, dado que o
  componente também cobre "remover" e "desativar", ou fica sempre o mesmo ícone fixo? → A:
  **Configurável por rotina.** Cada rotina escolhe o ícone do botão de confirmar; o ícone de alerta
  usado nos estados de bloqueio/falha passageira continua fixo, por ser um aviso genérico, não uma
  ação específica.
- Q: O componente compartilhado deve continuar exigindo cobertura de teste real, ou pode entrar na
  lista de primitivas de `shared/ui` isentas do limiar de cobertura? → A: **Cobertura real
  obrigatória.** Segue o mesmo precedente do seletor de cor fixo (também nascido de Etiquetas): fica
  fora da lista de isenção, porque tem lógica de verdade e um consumidor real desde o dia 1 — ao
  contrário de `toast`/`combobox`/`sheet`/`dropdown-menu`, isentos por terem partes do shadcn ainda
  sem consumidor, razão que não se aplica aqui.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A exclusão de etiquetas continua igual, agora sobre uma base reutilizável (Priority: P1)

Quem gerencia etiquetas pede para excluir uma e vive a mesma experiência de hoje: um diálogo de
confirmação, um aviso claro quando a etiqueta está em uso e não pode ser excluída, uma nova tentativa
quando a falha foi passageira (rede, sessão ou servidor), e uma confirmação de sucesso ao concluir —
mas por baixo, o diálogo passa a ser uma instância configurada de um componente comum, não mais um
componente exclusivo da tela de Etiquetas.

**Why this priority**: É a única rotina real que existe hoje; qualquer regressão aqui é visível
imediatamente para quem usa o painel. Sem preservar este comportamento, a generalização não tem
valor — é a base sobre a qual a reutilização (US2) se apoia.

**Independent Test**: Repetir os quatro fluxos já cobertos pela tela de Etiquetas — confirmar a
exclusão de uma etiqueta livre, cancelar antes de confirmar, tentar excluir uma etiqueta em uso, e
tentar excluir durante uma falha passageira — e verificar que o resultado observado (textos, botões,
estados) é idêntico ao comportamento atual.

**Acceptance Scenarios**:

1. **Given** uma etiqueta sem uso, **When** a pessoa pede a exclusão e confirma, **Then** a etiqueta é
   removida, um aviso de sucesso aparece e o diálogo fecha.
2. **Given** o diálogo de confirmação aberto, **When** a pessoa cancela ou fecha sem confirmar,
   **Then** nada é excluído e a etiqueta permanece intacta.
3. **Given** uma etiqueta em uso por um ou mais serviços, **When** a pessoa tenta excluí-la, **Then**
   o diálogo substitui a confirmação por uma explicação do bloqueio, sem opção de repetir a mesma
   ação.
4. **Given** uma falha passageira (rede, sessão ou servidor) ao confirmar, **When** a pessoa vê o
   resultado, **Then** o diálogo permanece na etapa de confirmação, mostra o motivo da falha e
   oferece tentar novamente.

---

### User Story 2 — Uma nova rotina ganha confirmação sem reconstruir o diálogo do zero (Priority: P1)

Quem constrói uma nova rotina que precisa de confirmação usa o mesmo componente, informando apenas o
que muda — título, texto de confirmação, nome do item afetado, rótulo do botão e mensagem de sucesso
— sem reimplementar a lógica de estados (confirmando, enviando, bloqueado, falha passageira).

**Why this priority**: É o motivo declarado do pedido — sem isso, a US1 sozinha seria apenas mover um
arquivo de lugar, não uma generalização.

**Independent Test**: Configurar o componente com um título, uma descrição e uma ação de confirmação
diferentes dos usados em Etiquetas, e confirmar que ele se comporta corretamente sem alterar nenhum
código específico de Etiquetas — sem exigir uma segunda tela real no sistema para isso.

**Acceptance Scenarios**:

1. **Given** uma configuração nova (título, descrição, rótulos e ação de confirmação próprios),
   **When** o componente é usado fora do contexto de Etiquetas, **Then** ele exibe o texto configurado
   e não menciona nada específico de etiquetas.
2. **Given** duas instâncias configuradas de forma diferente, **When** cada uma trata uma falha ao
   confirmar, **Then** cada uma usa sua própria mensagem de bloqueio e de sucesso, sem vazamento de
   texto entre elas.

### Edge Cases

- O que acontece se a pessoa fechar o diálogo (Esc, clique fora, botão fechar) enquanto o envio está
  em andamento? Mesmo comportamento de hoje: o diálogo pode ser fechado, e o pedido em andamento não
  é cancelado por isso.
- O que acontece se a pessoa clicar em confirmar mais de uma vez rapidamente? Apenas o primeiro clique
  gera um envio; os demais são ignorados até o envio em andamento terminar.
- O que acontece se a mensagem de erro devolvida pelo backend for longa ou incomum? É exibida como
  veio, sem truncar nem reescrever — mesma regra já usada hoje.
- O que acontece se duas instâncias do componente estiverem relevantes ao mesmo tempo (ex.: navegação
  rápida entre telas)? Cada instância mantém seu próprio estado; não há estado compartilhado entre
  rotinas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema **DEVE** oferecer um único componente de diálogo de confirmação, usado por
  qualquer rotina que precise confirmar uma ação antes de executá-la.
- **FR-002**: O componente **DEVE** aceitar, por configuração de cada rotina, no mínimo: título, texto
  de confirmação, rótulo do botão de confirmação, ícone do botão de confirmação e a ação a executar ao
  confirmar; nenhum desses **DEVE** ficar fixo no componente comum.
- **FR-003**: O componente **DEVE** oferecer três estados observáveis — aguardando confirmação,
  bloqueado por uma regra de negócio (com explicação e sem opção de repetir a mesma ação), e falha
  passageira (com o motivo e uma ação de repetir sem fechar o diálogo) — reproduzindo o comportamento
  hoje exclusivo da exclusão de etiquetas.
- **FR-004**: A classificação de uma falha como passageira ou bloqueante **DEVE** seguir a mesma regra
  já usada pela exclusão de etiquetas hoje (falhas de rede, sessão expirada ou servidor são
  passageiras; qualquer outra falha reportada pelo backend é bloqueante), sem que cada rotina precise
  redefinir essa distinção.
- **FR-005**: O sistema **DEVE** impedir um novo envio da ação de confirmação enquanto uma tentativa
  anterior ainda está em andamento.
- **FR-006**: A migração da exclusão de etiquetas para o componente comum **NÃO DEVE** alterar nenhum
  texto, ordem de botão ou comportamento hoje visível na tela de Etiquetas.
- **FR-007**: O sistema **DEVE** disponibilizar o componente configurável para uso por outras rotinas
  no futuro, mas esta feature **NÃO DEVE** construir nenhuma segunda rotina real para consumi-lo — a
  exclusão de etiquetas é o único consumidor real entregue por esta feature.
- **FR-008**: O componente **DEVE** cobrir confirmações de ações destrutivas/irreversíveis (excluir,
  remover, desativar e equivalentes), mantendo o botão de destaque vermelho e, nos estados de
  bloqueio/falha passageira, um ícone de alerta genérico como parte central e fixa do componente — esse
  ícone de alerta **NÃO** representa a ação específica e **NÃO** é configurável por rotina (ver
  FR-002 para o ícone do botão, que é o único configurável). Confirmações neutras/não destrutivas (ex.
  "sair sem salvar", "publicar agora") **NÃO DEVEM** ser suportadas por esta feature.
- **FR-009**: O texto de sucesso exibido após a confirmação **DEVE** ser configurável por rotina,
  incluindo o nome do item afetado.
- **FR-010**: Os textos visíveis do componente **DEVEM** estar em pt-BR, incluindo qualquer texto
  padrão (ex. "Cancelar") que uma rotina não sobrescreva.

### Non-Functional Requirements

- **NFR-001**: Nenhuma regressão nos portões de CI existentes (`tsc`, ESLint, Prettier, cobertura,
  Playwright).
- **NFR-002**: O componente comum **NÃO DEVE** depender de nenhum dado, tipo ou regra exclusiva de
  Etiquetas — ou de qualquer outra rotina específica; qualquer necessidade desse tipo **DEVE** chegar
  a ele por configuração.
- **NFR-003**: O componente comum **DEVE** ser coberto por testes automatizados reais e contar para o
  limiar de cobertura — **NÃO DEVE** entrar na lista de primitivas de `shared/ui` isentas desse
  limiar, já que (ao contrário delas) tem lógica de verdade e um consumidor real desde o dia 1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois da migração, as quatro cenas de exclusão de etiqueta (sucesso, cancelamento,
  bloqueio por uso, falha passageira com nova tentativa) continuam produzindo exatamente o mesmo
  resultado observável de antes da mudança.
- **SC-002**: Adicionar uma nova rotina de confirmação exige apenas informar texto e a ação a
  executar — nenhuma rotina nova precisa reimplementar tratamento de bloqueio, falha passageira ou
  proteção contra envio duplicado.
- **SC-003**: A mesma falha (ex. falha de rede) produz o mesmo comportamento de confirmação —
  passageira com nova tentativa, ou bloqueante — em qualquer rotina que use o componente, sem
  exceção.

## Assumptions

- A distinção entre falha passageira e falha bloqueante usada hoje pela exclusão de etiquetas já é
  genérica (baseada em códigos de erro compartilhados — rede, sessão, servidor), não específica de
  etiquetas, e por isso pode virar o comportamento padrão do componente comum sem uma decisão de
  produto adicional.
- Textos auxiliares padrão (ex. "Cancelar") têm um valor pt-BR de fábrica, sobrescrevível por rotina
  quando necessário; nenhuma rotina é obrigada a redefini-los.
- Refatorar aqui significa preservar o comportamento externo da exclusão de etiquetas; qualquer ajuste
  visual ou de texto nessa tela durante esta feature é regressão, não melhoria, e deve ser evitado.
- Nenhuma regra de negócio de exclusão de etiquetas (quando é permitida, quais mensagens o backend
  retorna) muda nesta feature.

## Out of Scope

- Alterar as regras de negócio de exclusão de etiquetas ou as mensagens que o backend retorna para
  ela.
- Construir CRUD de Categorias, Serviços ou qualquer outra entidade nova.
- Aplicar o componente a qualquer segunda rotina real (nenhuma é construída nesta feature).
- Suportar confirmações neutras/não destrutivas — o componente cobre apenas ações
  destrutivas/irreversíveis.
- Redesenhar visualmente o diálogo além do necessário para torná-lo configurável.
