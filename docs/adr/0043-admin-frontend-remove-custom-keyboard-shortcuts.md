# ADR 0043 — Remove atalhos de teclado personalizados do painel administrativo

Status: accepted (2026-09)

## Contexto

A fundação de UI introduziu um registro global de `keydown`, dicas de teclas, uma folha de ajuda e atalhos para a paleta e ações de negócio. A implementação expandiu-se por `app/`, `features/`, `widgets/` e `shared/ui/`. As mesmas ações já possuem controles visíveis. O cabeçalho, porém, abre a paleta chamando o registro, tornando o clique dependente da infraestrutura de atalhos.

A decisão de produto é retirar os atalhos personalizados e manter os fluxos por clique. A especificação anterior e o log de `apps/admin-frontend/docs/ARCHITECTURE.md` registram o que foi construído, revisado e revertido; continuam como histórico.

## Decisão

- Não registrar atalhos globais para navegação, ajuda, criação, salvamento ou exclusão.
- Controlar a paleta no `AppShell` e abri-la diretamente pelo botão Buscar do cabeçalho.
- Manter a paleta, os controles de ação, as regras de formulário e os estados de confirmação.
- Remover a folha dedicada aos atalhos, seus keycaps e a infraestrutura compartilhada sem consumidores. O `LinkButton` de uso único é substituído por `Link` com `buttonVariants`.
- Preservar a operação nativa por teclado de HTML e Base UI, inclusive foco e fechamento de sobreposições. Nenhuma ação passa a exigir mouse exclusivamente.

## Consequências

O painel tem menos estado global, listeners, wrappers e caminhos indiretos entre componentes. A descoberta das operações passa pelos rótulos e controles visíveis. Os testes verificam os caminhos por clique e os estados de negócio. O material da fundação que descreve atalhos fica identificado como decisão substituída, sem reescrever os fatos históricos.

## Alternativas consideradas

- **Manter os atalhos e adicionar preferência para desligá-los**: preservaria infraestrutura que o produto decidiu retirar.
- **Trocar todos por combinações modificadas**: reduz acionamentos acidentais, mas não atende à retirada solicitada.
- **Desativar a operação nativa por teclado**: prejudicaria usuários de teclado e tecnologias assistivas sem melhorar os fluxos por mouse.
