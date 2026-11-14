# ADR 0094 — Remoção do Spec Kit

Status: proposta (2026-11-14); passa a aceita no merge. Substitui a
[ADR 0087](0087-speckit-proportional-preset.md) e, na
[ADR 0088](0088-ai-instruction-sources-and-proportional-documentation.md), a linha "Specs" da tabela
de fontes e o parágrafo que define o fluxo do frontend pelo Spec Kit.

## Contexto

O Spec Kit foi instalado só no admin-frontend, com o preset local da 0087. Desde setembro, ele
produziu 9 specs em cerca de 6 PRs, enquanto a maior parte das mudanças do frontend seguiu sem ele.
O backend e os serviços de IA nunca o usaram. A instalação somava 67 arquivos: preset, templates,
scripts, constituição e as skills `speckit-*` geradas para três hosts. Mudar um comando exigia
rematerializar essas cópias pela CLI, que também podia atualizar scripts do core.

O custo apareceu no review. O template de plano listava arquivos e dependências, e o plano da
feature 009 mudou em quase todo refactor. A spec acumulou seis sessões datadas de esclarecimentos,
em que correções superadas continuavam com cara de requisito. Uma spec desatualizada é obedecida
por um agente como se fosse vigente. Na pesquisa externa, Böckeler descreve os artefatos do Spec Kit
como verbosos e repetitivos, e observa que a spec vive por uma mudança, não pela vida da feature.

O valor real estava na etapa de esclarecer o comportamento com o dono antes de codar. Essa etapa já
acontece sem a ferramenta, numa rodada de perguntas em lote.

## Decisão

1. Remover `apps/admin-frontend/.specify` (preset, templates, scripts e constituição) e as skills
   `speckit-*` das pastas de host do frontend.
2. **Esclarecimento:** antes de codar comportamento novo, uma única rodada de perguntas em lote ao
   dono, cada uma com a opção recomendada. Um protótipo aprovado é a referência visual.
3. **Comportamento e aceite:** critérios de aceite viram testes nomeados em pt-BR no mesmo PR. Uma
   correção de protótipo vira teste ou código. Uma convenção que vale para várias telas vai para o
   guia que já trata dela (AGENTS, ARCHITECTURE ou a skill de texto pt-BR).
4. **Plano e tarefas** ficam na sessão do agente; a conversa fica registrada no PR. Não há arquivo
   de spec por feature.
5. **Specs existentes:** `apps/admin-frontend/specs` fica como histórico, sem edição além da linha
   de status, para que os links de ADRs e do código continuem válidos.
6. **Constituição:** tenant e orquestração pelo Aspire já estão no AGENTS raiz; OIDC e cliente
   gerado, no ARCHITECTURE do frontend. TypeScript estrito, tipos de wire gerados sem `fetch` à mão
   e gates de CI que não se rebaixam passam para as invariantes do AGENTS do frontend.

## Consequências

- Some a manutenção do tooling e da rematerialização de adapters.
- Comportamento que não vira teste fica só no código; o registro do PR não é lido por agentes depois
  do merge. A perda é aceita para os detalhes de uma única tela.
- Uma feature grande perde o roteiro estruturado; o plano passa a ser da sessão.

## Alternativas consideradas

- **Manter o Spec Kit com o preset mais leve:** reduziria o plano, mas manteria 67 arquivos, a
  rematerialização pela CLI e o acompanhamento do upstream para uma ferramenta pouco usada.
- **Arquivo de comportamento vivo por feature** (`behavior.md`, `docs/features`): repetiria o mesmo
  problema em escala menor, com um arquivo que todo review precisaria sincronizar.
- **Uma skill nova de esclarecimento:** duplicaria um hábito que os agentes já seguem.

## Critério de reversão

Se, em duas features novas, um agente repetir uma ambiguidade já resolvida por falta de registro,
reintroduzir um template de spec de arquivo único, com comportamento e aceite, sem tooling.

## Validação

`npm run check:docs`, os testes do verificador e o Prettier nos guias alterados.
