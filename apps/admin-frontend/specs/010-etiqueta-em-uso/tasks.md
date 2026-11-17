# Tarefas: etiqueta em uso

**Entradas**: [spec.md](spec.md) e [plan.md](plan.md).

## US1 — Resolver vínculos e tentar novamente

- [x] T001 [US1] Compartilhar a rota de edição sem criar ciclo em `src/shared` e `src/features/clients`.
- [x] T002 [US1] Permitir repetição e apresentar registros relacionados no bloqueio em `src/widgets/confirm-dialog`.
- [x] T003 [US1] Exibir os vínculos seguros de `Tag.InUse` em `src/features/tags/ui/pages/TagDeletePage`.
- [x] T004 [US1] Testar dados completos e incompletos, limites, links, repetição, acessibilidade e
  regressões nos testes da página e do diálogo.
- [x] T005 [US1] Atualizar a documentação aplicável e executar os gates do frontend.
- [x] T006 [US1] Apresentar tipos desconhecidos com nome válido sem links e testar limite e dados incompletos.

T001 e T002 precedem T003; T004 verifica o conjunto. Os resultados e limitações ficam no PR.

## US2 — Apresentar vínculos em confirmações de outros módulos

- [x] T007 [US2] Integrar os registros ao diálogo em `src/widgets/confirm-dialog` e remover a
  configuração de conteúdo da página em `src/features/tags/ui/pages/TagDeletePage`.
- [x] T008 [US2] Evitar conteúdo vazio em `src/widgets/confirm-dialog` e preservar filtragem,
  rotas e tratamento de respostas incompletas.
- [x] T009 [US2] Testar erros de outros códigos, falhas transitórias, dados incompletos e fluxos
  existentes em `src/widgets/confirm-dialog` e `src/features/tags/ui/pages/TagDeletePage`.
- [x] T010 [US2] Atualizar `docs/ARCHITECTURE.md` e executar formato, lint, build e cobertura.
- [ ] T011 [US2] Executar o E2E e a verificação do contrato com stack Aspire descartável e isolado.

T007 e T008 antecedem T009; T010 e T011 registram a validação em ambientes apropriados.

## US3 — Tentar novamente após qualquer bloqueio

- [x] T012 [US3] Tornar a nova tentativa padrão em `src/widgets/confirm-dialog`, mantendo texto
  personalizável e a variante visual da confirmação.
- [x] T013 [US3] Remover a condição por código em `src/features/tags/ui/pages/TagDeletePage`.
- [x] T014 [US3] Testar tentativa explícita, texto, variantes, estados pendentes e outros erros nos
  testes do diálogo e da página de etiquetas.
- [x] T015 [US3] Atualizar `docs/ARCHITECTURE.md` e executar formato, lint, build e cobertura.

T012 e T013 antecedem T014; T015 valida o conjunto. O E2E e contrato continuam em T011.

## US4 — Manter apenas os totais informados pelo backend

- [x] T016 [US4] Remover a geração e renderização de avisos em
  `src/widgets/confirm-dialog`.
- [x] T017 [US4] Verificar a mensagem e os nomes recebidos sem aviso adicional nos testes do leitor,
  do componente e de `src/features/tags/ui/pages/TagDeletePage`.
- [x] T018 [US4] Atualizar `docs/ARCHITECTURE.md` e executar formato, lint, build e cobertura.

T016 antecede T017; T018 valida o conjunto. O E2E e contrato continuam em T011.

## US5 — Preparar a navegação para serviços

- [x] T019 [US5] Manter a construção comum de links de edição e configurá-la para pessoas
  e serviços em `src/widgets/confirm-dialog`.
- [x] T020 [US5] Reverter a rota e a página provisórias de serviço em `src/app`.
- [x] T021 [US5] Verificar links seguros, IDs inválidos e fluxos existentes.
- [x] T022 [US5] Atualizar `docs/ARCHITECTURE.md` e executar formato, lint, build e cobertura.

T019 e T020 antecedem T021; T022 valida o conjunto. O E2E e contrato continuam em T011.

## US6 — Preservar resultado e foco em confirmações assíncronas

- [x] T023 [US6] Impedir reentrada em `src/widgets/confirm-dialog`.
- [x] T024 [US6] Isolar efeitos posteriores ao sucesso e evitar callbacks locais após desmontagem.
- [x] T025 [US6] Anunciar bloqueio atualizado e restaurar foco ao erro transitório no diálogo.
- [x] T026 [US6] Testar reentrada, conclusão tardia, efeitos
  posteriores, anúncios e regressões em `src/widgets/confirm-dialog`.
- [x] T027 [US6] Alinhar documentação do leitor e executar os gates locais do frontend.

T023–T025 antecedem T026 e T027. O E2E e contrato continuam em T011.
