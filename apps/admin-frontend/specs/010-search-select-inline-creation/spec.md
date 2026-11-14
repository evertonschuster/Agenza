# Especificação: criar etiqueta sem sair do cadastro de pessoa

**Branch**: `claude/search-select-inline-creation-ba42bb` | **Criada em**: 2026-11-14 | **Status**: Aprovada pelo dono nesta conversa
**Pedido**: criar rapidamente um item que não existe, sem trocar de tela nem abrir outra aba, a partir do
seletor; o mecanismo é do `SearchSelect`, reutilizável em outras telas, e o primeiro uso são as etiquetas do
cadastro de pessoa.

## Objetivo e escopo

Ao marcar etiquetas numa pessoa ([spec 009](../009-client-tags-search-select/spec.md)), o dono-operador que
não encontra a etiqueta precisa sair do cadastro, criá-la na tela de etiquetas e voltar. Esta entrega permite
criá-la dali mesmo, num diálogo curto, e a etiqueta criada já entra selecionada.

O `SearchSelect` ganha uma capacidade opcional de criação e continua sem conhecer etiquetas: quem o usa dá
os rótulos da ação e desenha a criação; o componente oferece as entradas, passa o texto que houver e coloca
na seleção o item devolvido. Sem essa capacidade, o seletor se comporta como hoje.

O formulário de etiqueta é um só. O diálogo da tela de etiquetas e o diálogo rápido do seletor usam a mesma
validação, os mesmos campos e o mesmo caso de uso de criação; o que muda é quem abre o diálogo e o que
acontece ao fechar.

Fora do escopo: editar ou excluir uma etiqueta a partir do seletor, criar pelo teclado com uma opção dentro da
lista, prévia da etiqueta no formulário, qualquer mudança no backend e outros usos do `SearchSelect`.

Protótipo aprovado (v3): https://claude.ai/artifact/WFXAaFtDj7BDCnSHXiT7jB

## Esclarecimentos

### Sessão 2026-11-14

- Revê a exclusão da 009 e da [ADR 0091](../../../../docs/adr/0091-admin-frontend-search-select-and-client-tags.md),
  que deixavam fora "qualquer criação de etiqueta a partir do seletor". O pedido agora é do dono.
- Protótipo v1: três formas de criar a partir de uma busca sem resultado — criar direto com cor automática,
  painel dentro do popup e diálogo rápido. Ficou o diálogo rápido: dois Enter, cor escolhida ali e
  reaproveitamento do formulário de etiqueta. O painel no popup foi descartado porque tira o foco do campo
  para botões que hoje não entram no Tab.
- Protótipo v2, a pedido do dono: criar não pode depender de buscar e não achar. Foram comparadas quatro
  entradas: botão no campo, linha no rodapé da lista, opção dentro da lista e link sob o campo.
- Protótipo v3: o dono escolheu o botão no campo e a linha no rodapé. A opção dentro da lista e o link saíram;
  a linha do rodapé assume o texto buscado ("Criar etiqueta «texto»").
- Formulário, explicado e aprovado pelo dono: o mesmo da tela de etiquetas. O diálogo da tela de etiquetas
  depende da rota (abre por endereço, carrega na edição, fecha navegando), por isso não pode ser aberto de
  dentro do cadastro sem desmontar o formulário da pessoa. A validação, os campos, o título e a casca do
  diálogo passam a ser compartilhados pelos dois diálogos, cada um com o seu comportamento de abrir e fechar.
- Botão no campo com ícone e texto "Nova etiqueta", escolha do dono; o texto visível não muda com a busca.
- Pelo teclado, sair do campo com Tab continua fechando a lista e limpando a busca (regra da 009), então o
  diálogo aberto pelo botão vem sem nome. Aceito pelo dono.
- Depois de criar, a lista fica fechada, a busca limpa e o foco volta ao campo, como ao escolher um resultado
  de busca.
- Cor inicial no diálogo rápido: uma cor da paleta sugerida a partir do nome, que acompanha a digitação até a
  pessoa escolher outra. Na tela de etiquetas continua sem cor marcada. Revisto depois da implementação
  (sessão abaixo).

### Sessão 2026-11-14, plano

- Cancelar o diálogo rápido só devolve o foco ao campo, com a busca limpa, como Esc e Tab já fazem. Escolha do
  dono no planejamento: devolver o texto exigiria que o seletor controlasse o texto do campo, que o Base UI
  limpa ao fechar a lista.
- O diálogo rápido usa o rodapé dos diálogos existente, "Cancelar" e "Salvar", escolha do dono.
- A confirmação da criação é o aviso que a tela de etiquetas já mostra, com o texto de que a etiqueta também
  foi selecionada; o seletor não ganha um anúncio próprio.

### Sessão 2026-11-14, depois da implementação

- O dono testou o diálogo rápido e achou sem sentido a cor trocando a cada letra do nome, além de diferente da
  tela de etiquetas. A sugestão de cor saiu: o diálogo rápido abre sem cor marcada, como a tela de etiquetas, e
  a pessoa escolhe a cor antes de salvar.

## Jornadas e critérios de aceite

### US1 — Criar uma etiqueta que não encontrei (P1)

1. Dado o cadastro de uma pessoa, quando busco "Pós-operatório" e não há resultado, então a linha
   "Criar etiqueta «Pós-operatório»" aparece em destaque no rodapé da lista; ao escolhê-la, a lista fecha e
   abre o diálogo "Nova etiqueta" com o nome preenchido e nenhuma cor marcada, como na tela de etiquetas.
2. Dado o diálogo aberto, quando salvo, então a etiqueta é criada, entra selecionada no campo, a busca fica
   limpa, o foco volta ao campo e o aviso "Etiqueta criada" diz que "Pós-operatório" foi criada e selecionada.
3. Dado que busco "vip" e existe "VIP", então a linha mostra "Nova etiqueta" e abre o diálogo sem nome.
4. Dado que o servidor recusa o nome por já existir, então a mensagem do servidor aparece no diálogo, que
   continua aberto com o que digitei.
5. Dado que cancelo ou pressiono Esc no diálogo, então só o diálogo fecha, o foco volta ao campo com a busca
   limpa e o restante do cadastro da pessoa fica como estava.
6. Dado que salvo a pessoa, então ela fica com a etiqueta criada entre as marcadas; ao editar de novo, ela já
   aparece selecionada.

### US2 — Criar uma etiqueta sem buscar (P1)

1. Dado o campo de etiquetas com a lista fechada, quando clico no botão "Nova etiqueta" do campo, então abre o
   diálogo sem abrir a lista antes.
2. Dado que estou no campo, quando pressiono Tab, então o foco vai para o botão "Nova etiqueta", e Enter abre
   o diálogo.
3. Dado a lista aberta sem busca, então a linha "Nova etiqueta" fica no rodapé, visível em qualquer rolagem.
4. Dado um negócio sem etiquetas, quando abro a lista, então vejo "Nenhuma etiqueta cadastrada." e a linha
   "Nova etiqueta" em destaque.
5. Dado 20 etiquetas marcadas, então o botão e a linha ficam indisponíveis e o botão informa o aviso de limite
   do seletor ("Limite de 20 seleções atingido.").
6. Dado que a lista não carrega, então a linha de criação continua disponível.

### US3 — Reutilizar a criação em outro seletor (P2)

1. Dado um `SearchSelect` com a capacidade de criação, quando uma tela informa os rótulos e a criação, então
   obtém o botão, a linha do rodapé, o texto da busca e a seleção do item criado sem código próprio.
2. Dado um `SearchSelect` sem a capacidade, então nada muda em relação à 009.

## Requisitos

- **FR-001**: O `SearchSelect` aceita uma capacidade opcional de criação com o rótulo da ação, o rótulo da
  ação com o texto buscado e a criação desenhada por quem usa. A criação recebe o texto a usar e duas
  respostas: concluir com o item criado ou cancelar. Os rótulos vêm de quem usa, porque o português flexiona
  ("Nova etiqueta", "Novo serviço"). O `SearchSelectField` a repassa sem acrescentar comportamento.
- **FR-002**: O botão de criação fica dentro do campo, antes do botão de mostrar opções, com ícone e o rótulo
  da ação visível, que é também o seu nome acessível. Entra no Tab logo depois do campo e funciona com a lista
  aberta ou fechada.
- **FR-003**: A linha de criação fica no popup, entre a lista e o rodapé de seleção, visível em qualquer
  rolagem e também carregando, com falha ou sem resultado. Fica fora do Tab, como os demais botões do popup.
  Sem resultado para a busca, ou sem nenhum item, ela ganha destaque.
- **FR-004**: Com texto digitado e nenhum resultado de nome igual ao texto, sem diferenciar maiúsculas nem
  acentos, a linha mostra o rótulo com o texto e a criação recebe o texto aparado. Sem texto, ou com um nome
  igual entre os resultados, a linha mostra o rótulo da ação e a criação recebe texto vazio. O botão segue a
  mesma regra para o texto que passa, sem mudar o que mostra.
- **FR-005**: Abrir a criação fecha a lista e limpa a busca. Concluir acrescenta o item à seleção e devolve o
  foco ao campo; cancelar só devolve o foco ao campo. A confirmação da criação é de quem a desenha.
- **FR-006**: Com o limite de seleção atingido, botão e linha ficam indisponíveis; o botão continua focável e
  informa o limite.
- **FR-007**: O diálogo da tela de etiquetas e o diálogo rápido usam a mesma validação, os mesmos campos (nome,
  cor e descrição opcional), o mesmo título "Nova etiqueta" e o mesmo caso de uso de criação, que já anuncia a
  etiqueta criada às demais telas. A tela de etiquetas não muda de comportamento.
- **FR-008**: O diálogo rápido abre com o nome recebido e os demais valores iniciais da tela de etiquetas:
  nenhuma cor marcada e descrição vazia. A cor é obrigatória antes de salvar, com a mesma validação.
- **FR-009**: Erros do servidor aparecem no diálogo rápido como na tela de etiquetas: ligados ao nome, sob o
  campo; os demais, no aviso do formulário, com a mensagem recebida e sem nova tentativa automática.
- **FR-010**: Fechar o diálogo rápido, por cancelar, Esc ou fora dele, não altera o cadastro da pessoa nem o
  envia; salvar o diálogo também não envia o cadastro da pessoa.
- **FR-011**: Ao salvar pelo diálogo rápido, o aviso tem o título "Etiqueta criada" e diz que a etiqueta foi
  criada e selecionada.

## Critério de sucesso

- **SC-001**: Criar uma etiqueta pelo botão e outra pela busca, salvar a pessoa e reabri-la mostra as duas
  marcadas, conferido contra o backend real.
- **SC-002**: O `SearchSelect` e o seu Field continuam sem importar nada de features; a criação é coberta no
  componente, no diálogo de etiqueta e no formulário de pessoa, e o comportamento da 009 segue coberto sem a
  capacidade.

## Riscos, limites e dúvidas

- A conferência de nome igual só vê os resultados carregados; um nome que exista fora deles é recusado pelo
  servidor ao criar (FR-009).
- O Combobox do Base UI não tem padrão pronto de criação. O botão fica dentro da área de chips, onde um clique
  pode focar a busca ou abrir a lista; o plano precisa garantir que o clique só abra a criação.
- A etiqueta criada aparece na lista na próxima abertura, que já recarrega a cada vez (009).
- Com a lista aberta, o Base UI esconde o botão do campo das tecnologias assistivas; ali a linha do rodapé é
  a entrada de criação, e Tab fecha a lista e chega ao botão.
