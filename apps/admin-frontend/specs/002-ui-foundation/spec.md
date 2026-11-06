# Spec 002 — fundação visual do painel administrativo

**Identificador**: `002-ui-foundation` · **Criada em**: 04/09/2026.
**Status**: implementada; registro histórico de comportamento e aceite, com limites de verificação.

A documentação foi integrada no [PR #116](https://github.com/evertonschuster/Agenza/pull/116), e o
código no [PR #117](https://github.com/evertonschuster/Agenza/pull/117).
[plan.md](plan.md) registra escolhas; [tasks.md](tasks.md) identifica entregas, revisões e lacunas
históricas. Critérios visuais abaixo não representam testes executados nesta limpeza documental.

## Escopo e evolução

Substituir o shell provisório da [spec 001](../001-oidc-shell-scaffold/spec.md) por uma interface
com identidade própria, tema claro/escuro/automático, navegação responsiva e paleta de comandos.
O protótipo aprovado definiu a direção violeta e uma experiência simples para o dono-operador;
não autorizou construir telas de negócio falsas para preencher os destinos.

Na entrega, os destinos eram Início, Agenda, Clientes, Conversas, Serviços e Ajustes. A mudança
posterior para Pessoas e `/pessoas`, seguida de cadastro, está no
[PR #174](https://github.com/evertonschuster/Agenza/pull/174). Destinos atuais são dados de
[navigation.ts](../../src/app/shell/navigation.ts), não um inventário a manter nesta spec.

O sistema de atalhos personalizados e suas dicas foi **removido** no
[PR #143](https://github.com/evertonschuster/Agenza/pull/143). A paleta continua acessível pelo botão
Buscar. IDs antigos não são renumerados nem justificam reintroduzir atalhos; a navegação padrão
por teclado e o foco acessível dos controles permanecem necessários.

## Histórias e aceite

### US1 — escolher como o painel se apresenta (P1)

- Oferecer claro, escuro e automático; sem preferência salva, seguir o sistema operacional.
- Aplicar a preferência antes da primeira pintura e persistir a escolha após recarregar.
- No automático, reagir à mudança do sistema sem reload.
- Enviar o tema resolvido ao login do identity-service no momento do redirect. Preferência já
  salva na origem do identity-service prevalece ali, conforme a ADR 0040.
- Manter `lang="pt-BR"` e metadados visuais coerentes com o tema.

### US2 — usar o painel no celular (P1)

- Em 375 px, exibir barra inferior e acesso a Mais, sem overflow horizontal; funcionar desde 320 px.
- Entre 768 e 1023 px, usar trilho de ícones com nomes acessíveis; a partir de 1024 px, barra lateral.
- Preservar indicação do destino ativo, nomes dos controles e alvos de toque da navegação de pelo
  menos 44 px. Indisponibilidade deve ser perceptível também no trilho compacto.
- Respeitar safe area e manter o campo em foco visível quando o teclado móvel abre, sem zoom
  indevido. Layout, contraste e teclado móvel exigem verificação real; jsdom não prova esses efeitos.

### US4 — encontrar comandos do painel (P2)

- O botão Buscar abre a paleta em desktop e celular.
- Selecionar um destino abre a rota correspondente; o acesso não depende de atalho personalizado.

### US5 — entender o que ainda não está disponível (P3)

- Um destino indisponível explica seu próprio escopo em pt-BR e oferece um caminho funcional de volta.
- A navegação identifica a indisponibilidade antes do clique; não simula funcionamento com dados falsos.
- A existência de backend para uma capacidade não transforma, por si só, um placeholder em tela funcional.

## Requisitos preservados

- **FR-001**: oferecer claro, escuro e automático, com automático como padrão sem preferência.
- **FR-002**: aplicar o tema resolvido antes da primeira pintura, sem lampejo do tema oposto.
- **FR-003**: acompanhar mudanças do sistema enquanto a escolha for automática.
- **FR-004**: transmitir a preferência resolvida ao identity-service para continuidade visual no login.
- **FR-005**: expor os seis destinos definidos para a entrega inicial. A evolução dos nomes e rotas
  está registrada acima; este requisito histórico não congela a navegação do produto.
- **FR-006**: explicar destinos indisponíveis sem apresentá-los como funcionais.
- **FR-007**: adaptar navegação entre telas largas e estreitas, sem overflow horizontal desde 320 px.
- **FR-011**: abrir a paleta pelo botão Buscar. Substitui a versão antiga que exigia atalhos próprios.
- **FR-015**: manter textos e nomes acessíveis em pt-BR, com identificadores de código em inglês.
- **FR-016**: exibir cores de etiqueta legíveis nos dois temas, sem alterar o valor recebido da API.
  Não exige fabricar um consumidor na fundação para demonstrar dados de negócio.
- **FR-017**: substituir o `AppLayout`/`HomePage` provisório, em vez de estendê-lo.

**Referências legadas**: US3 e os requisitos de atalhos FR-012/FR-013/FR-014 não integram este
recorte. SC-005 foi retirado com os atalhos no PR #143. O teste `SidebarNav.test.tsx` ainda cita
“spec FR-009 area”, embora esse requisito não conste do documento de base: sua asserção de
`aria-current="page"` está preservada no aceite de US2, sem inventar um novo requisito numerado.

## Requisitos não funcionais e sucesso

- **NFR-001**: manter os gates de tipos, lint, formato, cobertura, contrato e e2e. Limiares,
  exclusões e comandos são os da configuração e de [QUALITY](../../../../docs/QUALITY.md).
- **NFR-002**: permanecer utilizável em hardware modesto, sem biblioteca de animação no runtime da fundação.
- **NFR-003**: registrar a biblioteca de primitivos em ADR; a decisão está na ADR 0039.
- **SC-002**: em 375 px, não haver overflow e os alvos de navegação terem a dimensão mínima indicada.
- **SC-003**: recarregar com tema escuro salvo sem um quadro intermediário claro.
- **SC-006**: executar os gates aplicáveis da entrega.

## Fora do escopo da entrega

CRUD e backend de negócio, gestão de papéis/permissões, internacionalização além de pt-BR e
Storybook/regressão visual automatizada. A biblioteca de formulários ficava para a primeira tela
real, e server state seguia a ADR 0035. Mudanças no identity-service eram limitadas à continuidade
visual e ao tratamento do parâmetro de tema. A existência posterior dessas capacidades não altera
o escopo histórico desta fundação.
