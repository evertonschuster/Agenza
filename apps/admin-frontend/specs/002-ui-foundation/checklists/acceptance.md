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
- [ ] 768–1023 px: trilho de ícones com rótulos acessíveis preservados
- [ ] ≥1024 px: barra lateral persistente
- [ ] 320 px (o mínimo real): nada quebra nem vaza
- [ ] Alvos de toque da navegação com ≥44 px na menor dimensão
- [ ] Lista de serviços vira cartões abaixo de 768 px, com todos os campos legíveis
- [ ] Safe area respeitada num aparelho com notch — padding real, não `0px` presumido

## Acessibilidade (US3 · SC-001 · SC-004)

- [ ] Tab a partir do topo: o primeiro focável é "Pular para o conteúdo", e ele funciona
- [ ] Percurso completo login → painel → todos os seis destinos → diálogo → logout **só com teclado**
- [ ] Foco sempre visível, sobre qualquer superfície, nos **dois** temas
- [ ] `Esc` fecha diálogo/folha/paleta **e devolve o foco** a quem abriu
- [ ] Troca de rota é anunciada por região viva e o foco vai para `<main>`
- [ ] Nenhum controle sem nome acessível; ícones decorativos com `aria-hidden`
- [ ] Nome acessível do CTA primário **igual** ao rótulo visível — o keycap não pode entrar nele
      (verificável por teste; adicionar um)
- [ ] Cabeçalho fixo e barra inferior não encobrem o elemento focado (SC 2.4.11)
- [ ] Tooltips: aparecem no **foco**, não só no hover; dispensáveis com `Esc`; o ponteiro pode
      entrar nelas (SC 1.4.13)
- [ ] Contraste verificado nos dois temas, incluindo os chips de etiqueta das 8 cores do backend
- [ ] Auditoria axe sem violações em todas as rotas, nos dois temas *(automatizado)*
- [ ] Leitor de tela em pt-BR: rótulos, números, moeda e datas anunciados corretamente

## Atalhos (US4 · SC-005)

- [ ] Sem instrução prévia, olhando a tela de Serviços no desktop, dá para identificar que criar
      serviço tem atalho
- [ ] `Ctrl/⌘+K`, `/`, `?`, `n`, `Esc` funcionam conforme a folha de ajuda
- [ ] Digitando num campo, `n` insere o caractere e **não** dispara a ação
- [ ] Desligar a preferência silencia `/`, `?` e `n` **e** remove todas as dicas visuais;
      `Ctrl/⌘+K` e `Esc` continuam
- [ ] Num dispositivo só de toque, nenhuma dica de atalho aparece
- [ ] Num tablet com teclado acoplado, as dicas **aparecem** após a primeira tecla
- [ ] O modificador exibido corresponde à plataforma (`⌘` no macOS, `Ctrl` no resto)
- [ ] Nenhum keycap em ação destrutiva, item de lista ou item de navegação

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

## Risco visual específico

- [ ] O chip de atalho sobre o violeta revisado a **100% de zoom em hardware Windows 1366×768 real**,
      não no monitor onde foi desenhado. A borda de 32% de branco pode sumir ou franjar. Se não
      sobreviver, enviar **sem** chip — nível B mais a linha na paleta ainda supera o estado atual
