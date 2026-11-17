# Especificação: etiqueta em uso

**Branch**: `codex/tag-usage-guard` | **Criada em**: 2026-11-14 | **Status**: Aprovada

## Objetivo e escopo

Ao bloquear a exclusão de uma etiqueta em uso, apresentar os vínculos recebidos para que o dono
possa agir e tentar novamente. O backend e a regra de bloqueio permanecem inalterados.

## Jornadas e critérios de aceite

### US1 — Resolver vínculos e tentar novamente

1. Ao receber `Tag.InUse`, a pessoa vê a mensagem com os totais e os nomes válidos recebidos.
2. Cada pessoa com ID válido tem link para edição em outra aba, preservando o diálogo original.
3. Serviços aparecem sem link, com informação de que seu gerenciamento não está disponível.
4. Os totais permanecem na mensagem do backend; o frontend não cria aviso de limite de lista nem
   interpreta a mensagem para calcular quantos registros faltam.
5. Tentar excluir novamente executa nova exclusão explícita: um novo bloqueio substitui os dados;
   o sucesso segue o fluxo existente. O retorno de outra aba não atualiza os dados automaticamente.
6. Dados ausentes, incompletos ou inválidos não quebram o diálogo e não criam links inválidos.
7. O diálogo e as listas longas permanecem utilizáveis em telas pequenas e por teclado, com foco
   e nomes acessíveis. Mensagens e classificação de outros erros permanecem preservadas.
8. Grupos desconhecidos com entradas de `Tag.InUse` e nome válido aparecem em “Outros vínculos”,
   sem rotas inventadas.

### US2 — Apresentar vínculos em confirmações de outros módulos

1. Ao receber um erro com registros relacionados no formato padronizado, o diálogo mostra os
   registros válidos sem que a tela consumidora configure o conteúdo ou selecione um código específico.
2. A apresentação vale tanto para falhas transitórias quanto para bloqueios. Quando não há nomes
   válidos, o diálogo não acrescenta espaço ou conteúdo vazio.
3. A presença de registros não altera a mensagem, a classificação da falha ou o comportamento de
   sucesso. Códigos incompatíveis e dados inválidos continuam
   sendo filtrados pelas regras do leitor de registros.

### US3 — Tentar novamente após qualquer bloqueio

1. Todo bloqueio oferece uma nova tentativa explícita, mesmo sem registros relacionados.
2. O texto padrão é “Tentar novamente”; a tela pode personalizá-lo, como na exclusão de etiquetas.
   Um texto vazio usa o padrão para manter o botão identificável.
3. Durante a tentativa, o diálogo conserva o bloqueio e impede ações duplicadas; o resultado
   substitui a falha ou conclui a operação seguindo o fluxo já existente.
4. O botão usa a mesma variante visual da ação confirmada; erros transitórios mantêm seu fluxo.

### US4 — Manter apenas os totais informados pelo backend

1. A mensagem do backend e os nomes recebidos continuam visíveis, inclusive quando há dez registros.
2. O frontend não exibe avisos adicionais sobre o limite de registros ou outras vinculações possíveis.

## Requisitos

- **FR-001**: Usar somente os metadados recebidos no erro `Tag.InUse`, sem interpretar mensagem.
- **FR-002**: Não remover vínculos nem excluir etiqueta sem ação explícita.
- **FR-003**: Não criar rota especulativa de serviço nem dependência circular entre features.
- **FR-004**: O diálogo compartilhado apresenta os registros padronizados de qualquer erro sem
  exigir que a tela consumidora configure um conteúdo específico de vínculos.
- **FR-005**: Todo erro bloqueante permite nova tentativa somente por ação explícita.

## Critério de sucesso

- **SC-001**: Testes demonstram os fluxos aprovados, incluindo estados incompletos e regressões.
