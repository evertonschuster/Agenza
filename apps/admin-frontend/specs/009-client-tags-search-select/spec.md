# Especificação: etiquetas no cadastro de pessoa com SearchSelect

**Branch**: `claude/multi-select-component-d9018b` | **Criada em**: 2026-10-29 | **Status**: Aprovada pelo dono nesta conversa
**Pedido**: componente de seleção reutilizável, de uma ou várias opções, que recebe a chamada que lista os itens
do backend com busca e paginação; primeiro uso na seleção de etiquetas do cadastro de pessoa.

## Objetivo e escopo

O dono-operador marca etiquetas numa pessoa ao criá-la ou editá-la. O backend já guarda e devolve as
etiquetas da pessoa ([ADR 0089](../../../../docs/adr/0089-clients-tags.md)); o formulário ainda envia uma
lista vazia, apagando as etiquetas a cada edição.

A seleção é feita em duas camadas compartilhadas, que não conhecem etiquetas e aceitam qualquer item com
`id` e `name`, numa seleção ou em várias, por configuração. `SearchSelect` trabalha sobre uma lista fixa,
sem backend. `RemoteSearchSelect` o envolve e recebe a função que lista os itens no backend, com busca e
página.

Fora do escopo: coluna ou filtro de etiquetas na listagem de pessoas (o backend ainda não filtra), qualquer
criação de etiqueta a partir do seletor, inclusive um link para a tela de etiquetas, e uso do modo de uma
seleção em alguma tela. Esta entrega só seleciona.

Protótipo aprovado: https://claude.ai/artifact/4Vpz6PReZSpWi37nEaW3RP

## Esclarecimentos

### Sessão 2026-10-29

- Nome: `SearchSelect` (e `SearchSelectField` no formulário), escolhido pelo dono entre RemoteSelect,
  LookupSelect e EntityPicker.
- Duas camadas, pedidas pelo dono depois da primeira versão: `SearchSelect` funciona com uma lista fixa e
  um estado simples, para seleções estáticas de outras telas; `RemoteSearchSelect` (e
  `RemoteSearchSelectField`) o envolve e carrega do backend.
- Contrato do item: qualquer objeto com `id` e `name`; não há tipo de opção nem conversão por feature. Uma
  `color` presente no item colore a etiqueta selecionada e a opção.
- O campo fica em "Dados da pessoa", em largura total, entre CPF e Observações administrativas.
- A busca consulta o backend ao digitar, 300 ms depois da última tecla. É uma exceção de seletor à regra
  das listagens ([ADR 0074](../../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md)),
  que continua valendo para páginas de listagem.
- As próximas páginas vêm pelo botão "Carregar mais", sem rolagem infinita.
- A lista é carregada de novo cada vez que é aberta, para mostrar etiquetas criadas ou renomeadas em outro
  lugar desde a última abertura.
- Somente seleção: o link "Criar etiqueta" da lista vazia, desenhado no protótipo, foi removido pelo dono.
- Com várias seleções, escolher um resultado de busca fecha a lista e limpa a busca; sem texto digitado,
  a lista continua aberta. É a convenção do Combobox do Base UI, mantida sem customização.
- A decisão está na [ADR 0090](../../../../docs/adr/0090-admin-frontend-search-select-and-client-tags.md).

## Jornadas e critérios de aceite

### US1 — Marcar etiquetas numa pessoa (P1)

1. Dado o cadastro de uma pessoa, quando abro "Etiquetas", então vejo as etiquetas do negócio em ordem de
   nome, cada uma com sua cor, e posso marcar várias sem a lista fechar enquanto não houver busca digitada.
2. Dado que digito parte de um nome, quando paro de digitar, então a lista mostra somente as etiquetas
   encontradas pelo backend; sem resultado, "Nenhum resultado para “texto”."
3. Dado que há mais etiquetas do que as mostradas, quando clico em "Carregar mais", então as próximas
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
   listagem ao `RemoteSearchSelectField`, então obtém busca, paginação, estados e teclado sem código próprio.
2. Dado o modo de uma seleção, quando escolho um item, então ele aparece no campo, a lista fecha e posso
   limpar a escolha.
3. Dado uma lista fixa de opções, quando uma tela a passa ao `SearchSelectField`, então a busca filtra a
   lista localmente, sem acento, e nada é pedido ao backend.

## Requisitos

- **FR-001**: `SearchSelect` recebe a lista de itens e filtra pelo texto digitado; não faz requisições.
  `RemoteSearchSelect` recebe a função de listagem, que recebe busca, página, tamanho da página e um sinal
  de cancelamento e devolve o resultado da fachada HTTP.
- **FR-002**: O modo é configurável: uma seleção (valor: um item ou nenhum) ou várias (valor: lista de
  itens), com limite opcional de quantidade somente no modo de várias.
- **FR-003**: O valor guarda os itens inteiros, de modo que os selecionados aparecem sem que estejam na
  página carregada.
- **FR-004**: Uma nova busca, o fechamento da lista ou a saída da tela cancelam a requisição pendente; uma
  resposta antiga nunca substitui a mais recente.
- **FR-005**: Carregando, falha com nova tentativa, sem resultado da busca e sem nenhum item são estados
  distintos; textos padrão em pt-BR podem ser trocados por quem usa.
- **FR-006**: Teclado: setas navegam, Enter marca ou desmarca, Esc fecha, Backspace com a busca vazia remove
  a última seleção; cada etiqueta selecionada tem um botão de remover com nome acessível.
- **FR-007**: O cadastro de pessoa envia os ids das etiquetas marcadas na criação e na edição, e valida o
  limite de 20 antes de enviar.
- **FR-008**: Erros do servidor sobre as etiquetas são mostrados sob o campo com a mensagem recebida.

## Critério de sucesso

- **SC-001**: Criar e editar uma pessoa preserva as etiquetas escolhidas, conferido contra o backend real.
- **SC-002**: As duas camadas não importam nada de features e são cobertas nos dois modos.

## Riscos, limites e dúvidas

- A busca ao digitar faz uma requisição por pausa de digitação; o atraso de 300 ms e o cancelamento limitam
  o volume. O limite de requisições do backend responde com a mensagem existente de excesso, sem nova
  tentativa automática.
- Uma etiqueta excluída depois de carregada só é recusada ao salvar (FR-008).
