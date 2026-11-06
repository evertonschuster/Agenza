# Especificação: etiquetas no cadastro de pessoa com SearchSelect

**Branch**: `claude/multi-select-component-d9018b` | **Criada em**: 2026-10-29 | **Status**: Aprovada pelo dono nesta conversa
**Pedido**: componente de seleção reutilizável que recebe a chamada que lista os itens do backend com busca e
paginação; primeiro uso na seleção de etiquetas do cadastro de pessoa.

## Objetivo e escopo

O dono-operador marca etiquetas numa pessoa ao criá-la ou editá-la. O backend já guarda e devolve as
etiquetas da pessoa ([ADR 0089](../../../../docs/adr/0089-clients-tags.md)); o formulário ainda envia uma
lista vazia, apagando as etiquetas a cada edição.

A seleção é um componente compartilhado, `SearchSelect`, que não conhece etiquetas e aceita qualquer item
com `id` e `name`, em várias seleções. Ele recebe a função que lista os itens no backend, com busca e
página, e funciona sozinho, controlado por valor e callback. `SearchSelectField` só o liga ao formulário.

Fora do escopo: coluna ou filtro de etiquetas na listagem de pessoas (o backend ainda não filtra), qualquer
criação de etiqueta a partir do seletor, inclusive um link para a tela de etiquetas, uma seleção sobre uma
lista fixa do front-end e o modo de uma seleção. Esta entrega só seleciona.

Protótipo aprovado: https://claude.ai/artifact/4Vpz6PReZSpWi37nEaW3RP

## Esclarecimentos

### Sessão 2026-10-29

- Nome: `SearchSelect` (e `SearchSelectField` no formulário), escolhido pelo dono entre RemoteSelect,
  LookupSelect e EntityPicker. No redesenho de 2026-11-06 o nome passou ao seletor que busca no backend.
- Duas camadas, pedidas pelo dono depois da primeira versão: `SearchSelect` sobre uma lista fixa e
  `RemoteSearchSelect` em volta dele, carregando do backend. Substituído no redesenho de 2026-11-06.
- Contrato do item: qualquer objeto com `id` e `name`; não há tipo de opção nem conversão por feature. Uma
  `color` presente no item colore a etiqueta selecionada e a opção.
- O campo fica em "Dados da pessoa", em largura total, entre CPF e Observações administrativas.
- A busca consulta o backend ao digitar, 300 ms depois da última tecla. É uma exceção de seletor à regra
  das listagens ([ADR 0074](../../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md)),
  que continua valendo para páginas de listagem.
- As próximas páginas vinham pelo botão "Carregar mais"; substituído pela rolagem na sessão de 2026-11-06.
- A lista é carregada de novo cada vez que é aberta, para mostrar etiquetas criadas ou renomeadas em outro
  lugar desde a última abertura.
- Somente seleção: o link "Criar etiqueta" da lista vazia, desenhado no protótipo, foi removido pelo dono.
- Escolher um resultado de busca fecha a lista e limpa a busca; sem texto digitado, a lista continua
  aberta. É a convenção do Combobox do Base UI, mantida sem customização.
- A decisão está na [ADR 0090](../../../../docs/adr/0090-admin-frontend-search-select-and-client-tags.md).

### Sessão 2026-11-06

- Rolagem infinita, pedida pelo dono no lugar do botão "Carregar mais": a próxima página é pedida quando a
  rolagem chega a 40 px do fim da lista, ou logo depois de uma página quando a lista ainda não ocupa a sua
  altura. Com teclado, descer até o último item rola a lista e carrega a próxima página.
- Uma página por vez: nada é pedido enquanto uma página ou uma busca digitada estiver pendente.
- Depois de uma falha, a rolagem não pede de novo; só "Tentar novamente".
- Abaixo da lista, "Mostrando X de Y" enquanto houver mais e "Carregando mais…" durante o pedido.
- Enter dentro do campo não envia o formulário enquanto a lista estiver aberta; digitar abre a lista, e
  fechá-la limpa o texto. Com uma opção destacada, marca ou desmarca; com a lista fechada, envia o
  formulário.
- Sem destaque automático, escolha do dono: o resultado não vem com a primeira opção destacada, e
  escolher pede seta ou clique.

### Sessão 2026-11-06, redesenho

- O dono pediu o componente reescrito do zero, mais simples: a versão em duas camadas deixava a lista fixa
  carregando os estados da remota (carregando, falha, página, rolagem) e trocando de modo pela presença de
  um callback.
- Só o seletor dinâmico: a seleção sobre uma lista fixa do front-end sai e volta, se for preciso, como um
  componente próprio, sem ser a base do remoto.
- Nome: primeiro `RemoteSelect` e `RemoteSelectField`; no mesmo dia o dono os renomeou para
  `SearchSelect` e `SearchSelectField`, porque o nome deve dizer o que o campo faz, e não de onde vêm os
  dados. Sem o seletor de lista fixa, o nome não se confunde com mais nenhum componente.
- Só várias seleções: o modo de uma seleção não tinha tela e entra com a primeira que o pedir.
- Lugar: `shared/ui/search-select/` e `shared/form/fields/`, como os demais controles de formulário; a
  chamada ao backend continua sendo da feature, que passa a função de listagem.
- Enter sem destaque não faz mais a busca na hora: a busca espera os 300 ms, e Enter só não envia o
  formulário. Enter com Shift, Ctrl, Alt ou Meta sobre uma opção destacada também não envia nem marca.
- Revisão crítica do redesenho: Esc com a lista fechada apagava todas as escolhas (comportamento padrão do
  Base UI); agora não apaga e a tecla segue adiante, para fechar um diálogo, por exemplo.
- Carregando, carregando mais e o limite são anunciados por uma região de status no popup, com o conteúdo
  nomeado ("Carregando opções…"); o rodapé e o aviso de limite são texto comum. A mensagem de lista vazia
  fica sempre montada, só com o texto trocado. A falha da próxima página aparece abaixo da lista, onde a
  rolagem parou.
- Segunda revisão crítica: Esc com a lista aberta fecha só a lista, também dentro de um diálogo; uma etiqueta
  já escolhida aparece marcada mesmo quando a lista traz outra cópia dela; escolher um resultado de busca não
  dispara outra busca; a busca do cadastro de pessoa respeita o limite de tamanho da busca de etiquetas.

## Jornadas e critérios de aceite

### US1 — Marcar etiquetas numa pessoa (P1)

1. Dado o cadastro de uma pessoa, quando abro "Etiquetas", então vejo as etiquetas do negócio em ordem de
   nome, cada uma com sua cor, e posso marcar várias sem a lista fechar enquanto não houver busca digitada.
2. Dado que digito parte de um nome, quando paro de digitar, então a lista mostra somente as etiquetas
   encontradas pelo backend; sem resultado, "Nenhum resultado para «texto»."
3. Dado que há mais etiquetas do que as mostradas, quando rolo até o fim da lista, então as próximas
   aparecem abaixo das atuais.
4. Dado que salvo, então a pessoa fica com exatamente as etiquetas marcadas; ao editar de novo, elas já
   aparecem selecionadas, sem esperar a lista.
5. Dado 20 etiquetas marcadas, quando abro a lista, então as não marcadas ficam indisponíveis e um aviso
   diz que o limite foi atingido.
6. Dado que a lista não carrega, então vejo "Não foi possível carregar as etiquetas." e posso tentar de novo.
7. Dado um negócio sem etiquetas, então a lista diz que não há etiquetas cadastradas, sem oferecer criação.
8. Dado que o servidor recusa as etiquetas (uma excluída nesse meio-tempo, por exemplo), então a mensagem
   do servidor aparece sob o campo e o restante do formulário permanece preenchido.

### US2 — Reutilizar a seleção em outra tela (P2)

1. Dado um endpoint paginado com busca cujos itens têm `id` e `name`, quando uma feature passa sua função de
   listagem ao `SearchSelectField`, então obtém busca, paginação, estados e teclado sem código próprio.
2. Dado uma tela sem formulário, quando ela usa o `SearchSelect` com valor e callback, então ele funciona
   igual, nomeado por `aria-label` ou por um rótulo ligado ao seu `id`.

## Requisitos

- **FR-001**: `SearchSelect` recebe a função de listagem, que recebe busca, página, tamanho da página e um
  sinal de cancelamento e devolve o resultado da fachada HTTP. Funciona controlado por valor e callback, sem
  formulário; `SearchSelectField` o liga ao React Hook Form sem acrescentar comportamento.
- **FR-002**: Várias seleções (valor: lista de itens), com limite opcional de quantidade.
- **FR-003**: O valor guarda os itens inteiros, de modo que os selecionados aparecem sem que estejam na
  página carregada.
- **FR-004**: Uma nova busca, o fechamento da lista ou a saída da tela cancelam a requisição pendente; uma
  resposta antiga nunca substitui a mais recente.
- **FR-005**: Carregando, falha com nova tentativa, sem resultado da busca e sem nenhum item são estados
  distintos; o placeholder e os textos de lista vazia e de falha podem ser trocados por quem usa.
- **FR-006**: Teclado: setas navegam, Enter marca ou desmarca, Esc fecha a lista e, com ela fechada, não
  apaga as escolhas; Backspace com a busca vazia remove a última seleção; cada etiqueta selecionada tem um
  botão de remover com nome acessível. Com a lista aberta, Enter sem opção destacada ou com modificador
  nunca envia o formulário.
- **FR-007**: O cadastro de pessoa envia os ids das etiquetas marcadas na criação e na edição, e valida o
  limite de 20 antes de enviar.
- **FR-008**: Erros do servidor sobre as etiquetas são mostrados sob o campo com a mensagem recebida.

## Critério de sucesso

- **SC-001**: Criar e editar uma pessoa preserva as etiquetas escolhidas, conferido contra o backend real.
- **SC-002**: O componente e o seu Field não importam nada de features e são cobertos no carregamento, na
  interação e no formulário.

## Riscos, limites e dúvidas

- A busca ao digitar faz uma requisição por pausa de digitação; o atraso de 300 ms e o cancelamento limitam
  o volume. O limite de requisições do backend responde com a mensagem existente de excesso, sem nova
  tentativa automática.
- Uma etiqueta excluída depois de carregada só é recusada ao salvar (FR-008).
