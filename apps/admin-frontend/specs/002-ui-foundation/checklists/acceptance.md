# Checklist de aceite — 002-ui-foundation

Passa por inteiro antes de considerar a feature entregue. Cada item mapeia um critério do
[spec.md](../spec.md). O que é verificável por máquina está marcado como tal; o resto exige olho
humano e não pode ser delegado a um teste verde.

## Tema (US1 · SC-003)

- [ ] Alternar claro → escuro → automático funciona e a escolha persiste ao recarregar
- [ ] Com "automático" ativo, mudar o tema do sistema operacional muda o painel **sem recarregar**
- [ ] Recarregar com tema escuro salvo não produz **nenhum quadro** em tema claro — verificar em
      throttle de CPU, onde o lampejo aparece; numa máquina rápida ele se esconde
- [ ] Sem preferência salva, o tema resolvido segue o sistema operacional
- [ ] Ir de `/` para `/login`: a página de credenciais abre no mesmo tema do painel
- [ ] Uma escolha feita na página de credenciais persiste naquela origem e prevalece lá depois
      (comportamento previsto pela ADR 0020, não é bug)
- [ ] `<html lang="pt-BR">` (era `en`) e a meta `theme-color` acompanha o tema

## Responsivo (US2 · SC-002)

- [ ] 375 px: barra inferior, folha "Mais", nenhuma rolagem horizontal
- [ ] 375 px: focar um campo de texto **não** provoca zoom automático no iOS
- [ ] 375 px: o teclado do sistema não encobre o campo em foco
- [ ] 768–1023 px: trilho de ícones com rótulos preservados
- [ ] ≥1024 px: barra lateral persistente
- [ ] 320 px (o mínimo real): nada quebra nem vaza
- [ ] Alvos de toque da navegação com ≥44 px na menor dimensão
- [ ] Safe area respeitada num aparelho com notch — padding real, não `0px` presumido

## Paleta de comandos (US4)

- [ ] Clicar em Buscar no cabeçalho abre a paleta em desktop e celular
- [ ] Selecionar um destino na paleta abre a tela correspondente

## "Em breve" (US5)

- [ ] Cada um dos quatro destinos sem backend explica **o próprio escopo** — sem texto genérico
      repetido entre eles
- [ ] Os destinos indisponíveis são identificáveis na navegação **antes** do clique
- [ ] Existe caminho de volta a partir de cada um

## Portões e higiene (SC-006 · NFR)

- [ ] `npm run format:check` *(automatizado)*
- [ ] `npm run lint` *(automatizado)*
- [ ] `npm run build` *(automatizado)*
- [ ] `npm run test:coverage` dentro dos limiares *(automatizado)*
- [ ] `npm run generate:api-types:check` *(automatizado, exige o stack de pé)*
- [ ] `npm run test:e2e` *(automatizado, exige o stack de pé)*
- [ ] `npm ci` funciona a partir do lockfile regerado em Linux
- [ ] `AppLayout.tsx` e `HomePage.tsx` **removidos**, não estendidos (FR-017)
- [ ] Nenhuma classe de paleta crua no código — só tokens semânticos
- [ ] `docs/ARCHITECTURE.md` §1, §5 e §6 refletem o estado real
- [ ] ADR 0039 e 0040 escritas; constitution marca "UI component library" como resolvido
