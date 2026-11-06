# Plano histórico — 002-ui-foundation

**Status**: entrega implementada; decisões da [spec.md](spec.md), sem roteiro de instalação atual.
A forma vigente está no [guia de arquitetura](../../docs/ARCHITECTURE.md); o plano original completo
permanece no
[Git](https://github.com/evertonschuster/Agenza/blob/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/002-ui-foundation/plan.md).

## Decisões da entrega

- **D1 — Base UI no lugar de Radix**: a troca aproveitava a reconstrução do shell, mantendo os
  primitivos como código de propriedade do app e a composição por `render`. Não era uma alegação
  de depreciação do Radix. Motivação e alternativas na
  [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md).
- **D2 — tema próprio em `shared/theme/`**: uma store com snapshot/assinatura e integração ao
  documento atendia a SPA sem adicionar dependência voltada a SSR. A semelhança com a store de sessão
  era de forma; o tema tem efeitos no documento deliberadamente. Chave, atributo e precedência do
  handoff estão na [ADR 0040](../../../../docs/adr/0040-admin-frontend-three-state-theme.md).
- **D3 — transições em CSS**: usar os estados dos primitivos, respeitando redução de movimento.
  Uma biblioteca de animação só seria reavaliada diante de necessidade concreta de layout.
- **D5 — cobertura pelo comportamento e consumidor**: o plano excluía scaffolds sem uso e alguns
  renderizadores. Essa era uma decisão da configuração daquele momento, não isenção permanente
  de `shared/ui/`. A revisão exigia testar comportamento novo mesmo fora do agregado. Para trabalhar
  hoje, conferir [vitest.config.ts](../../vitest.config.ts) e consumidores reais.
- **D6 — placeholders em `app/`**: telas sem domínio e acesso a dados não constituíam uma feature.
  Cada placeholder cedia lugar à capacidade real quando implementada, sem camadas antecipadas.

O shell era composto em `app/`, usando os recursos transversais de `shared/` e a integração existente
com auth. Dependências, versões, árvore de arquivos e comandos não são repetidos aqui: pertencem
ao lockfile, ao código e ao [README](../../README.md).

## Restrições confirmadas na revisão

- Tema é enviado ao iniciar o redirect, para refletir a escolha corrente. O script anterior ao React
  evita o primeiro quadro no tema errado; a preferência já armazenada na origem de login prevalece lá.
- Navegação e indicador de indisponibilidade precisam funcionar no trilho compacto, sem depender
  somente de tooltip ou texto oculto. A rolagem volta ao topo do `main`, que é o contêiner rolável,
  e não de uma janela que não está rolando.
- Um scrim preto estável nos dois temas não pode virar automaticamente `foreground`: no escuro,
  a cor de texto seria clara e inverteria o efeito de escurecer o fundo.
- O tratamento visual de tags precisava de contraste nos dois temas; um scaffold sem consumidor
  não justifica criar dados ou tela falsos para passar um checkbox.
- Não foi entregue uma garantia global de densidade touch por tokens: os tokens sem consumidor
  foram retirados. O tamanho efetivo deve ser conferido no controle/layout que o aplica.

## Evidência e evolução

[PR #117](https://github.com/evertonschuster/Agenza/pull/117) entrega tema, shell, rotas e testes.
[PR #143](https://github.com/evertonschuster/Agenza/pull/143) retira os atalhos personalizados;
a paleta mantém seu botão. O [PR #174](https://github.com/evertonschuster/Agenza/pull/174) introduz
a capacidade de cadastro em Pessoas. O
[PR #186](https://github.com/evertonschuster/Agenza/pull/186) remove `card` e `separator` sem consumidor.
Essas mudanças impedem usar inventários e perguntas de revisão da fundação como backlog atual.

As medições antigas feitas no servidor de desenvolvimento não estabelecem desempenho do build de
produção. As observações de uma sessão e os valores medidos permanecem no Git, sem virar SLO ou
resultado de validação deste checkout.
