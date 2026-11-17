# ADR 0013 — Frontend: UI e interação

Status: aceita (2026-11-15).

## Decisão

- **Base UI é a camada de primitivos.** Os componentes são código próprio em `src/shared/ui/`,
  adicionados pela CLI do shadcn. Toast e Combobox vêm do Base UI, sem `sonner` nem `cmdk`.
- **Tema de três estados** (`light`, `dark`, `system`), guardado como escolha e resolvido na hora, num
  store próprio em `shared/theme/`. O tema resolvido vai ao `identity-service` no login.
- **Barras de filtro são formulários React Hook Form** com os campos de `shared/form/fields/`
  (`SearchField`, `SelectField`), nunca partes de `shared/ui` montadas à mão. Um botão Buscar aplica
  todos os filtros; digitar não busca.
- **Seleção múltipla de registros do backend usa um único `SearchSelect`** em `shared/ui/`. Ele recebe
  a chamada paginada da feature e itens `{ id, name }` como vêm, sem mapper; quem chama desenha o
  item por `renderItem`. No formulário, `SearchSelectField`.
- **Excluir é uma rota de diálogo sobre a lista**, aberta por uma lixeira na linha. A edição não tem
  botão de excluir.
- **Um conflito de CPF ou e-mail oferece abrir o cadastro existente numa nova aba**, por
  `NewTabLink`, com a rota construída pela feature a partir do código e de `meta.clientId`.
- **Interação só por clique e pelo teclado nativo dos primitivos.** Não há atalhos de teclado
  próprios.
- **Mensagens de erro do backend são texto pt-BR curado** e aparecem como vêm.

Convenções de componentes e formulários:
[apps/admin-frontend/docs/ARCHITECTURE.md](../../apps/admin-frontend/docs/ARCHITECTURE.md) e as skills
de UI e formulário.

## Rejeitado

- **Continuar no Radix.** Ficaria fora do caminho padrão da CLI do shadcn e manteria `sonner` e
  `cmdk`.
- **Bibliotecas fechadas de componentes** (Mantine, HeroUI, Chakra): o código dos primitivos deixa de
  ser nosso.
- **`next-themes`**, por trazer maquinário de SSR para o que o store próprio faz em cerca de sessenta
  linhas, e **`light-dark()` no CSS**, porque o seletor manual ainda precisa controlar `color-scheme`.
- **Botões segmentados, abas ou um popover de "Filtros"** para a situação da lista.
- **Um `SearchSelect` de lista fixa embrulhado por um remoto.** A base carregava os estados do remoto.
- **Excluir pela página de edição**, ou pelos dois caminhos.
- **Atalhos de teclado customizados.** Foram removidos; voltar com eles exige uma ADR nova.
