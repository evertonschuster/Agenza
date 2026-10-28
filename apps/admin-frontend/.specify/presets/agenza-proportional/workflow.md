# Fluxo proporcional do Agenza

Esta é a política comum dos comandos deste preset. Execute no projeto que contém .specify,
em apps/admin-frontend, ou informe esse diretório por SPECIFY_INIT_DIR. Considere o pedido
e os argumentos da invocação; consulte somente as referências pertinentes à mudança.

Uma correção determinística de texto ou manutenção sem comportamento novo pode ser feita
diretamente, com diff e validação proporcional. Não inicialize uma feature nem produza
specs apenas para completar etapas. Mudanças de comportamento usam o mínimo suportado
pelos scripts instalados: spec.md, plan.md e tasks.md. Esses scripts ainda exigem plano
e tarefas separados; este preset não implementa execução de uma feature em um único arquivo.

## Artefatos e validação

- research.md: somente para incerteza material cuja resolução muda a abordagem.
- data-model.md: somente para mudança relevante de entidades, relações ou transições.
- contracts/: somente para fronteira insuficientemente descrita por OpenAPI, tipos ou contrato existente.
- quickstart.md: somente para preparação específica, reutilizável, que os guias existentes não cobrem.
- checklists/: somente por solicitação explícita ou risco específico cuja revisão acrescenta evidência.

Justifique pesquisa, modelo, contratos adicionais e quickstart no plano antes de criá-los.
Checklists podem anteceder o plano; justifique a revisão no campo Motivo do próprio checklist.
Ausência de um auxiliar opcional não é
incompletude; não gere arquivo vazio ou texto dizendo que ele não se aplica. Não crie
diretórios opcionais antecipadamente. Leia auxiliares existentes só quando relevantes e não
os apague automaticamente ao replanejar uma feature. Evidências de execução ficam no PR/CI.

Selecione novos testes pelo comportamento e risco, mesmo sem pedido literal de testes.
Sessão, autorização e tenant exigem cenários de falha e regressão concretos. Texto ou
manutenção sem mudança de comportamento podem exigir somente revisão e checks documentais.
Preserve os gates da constituição; não copie seus limiares e comandos para cada artefato.

## Contexto e extensões

Use a constituição e as seções técnicas relevantes. Encontre exemplos atuais no código;
fatos de implementação, versões e inventários não são inferidos de relatos históricos.
Se houver conflito com uma decisão vigente, explicite-o e resolva antes de implementar;
não reescreva o comportamento existente apenas para satisfazer documentação antiga.

Se .specify/extensions.yml existir, confira os hooks before_<etapa> e after_<etapa> da
etapa invocada, como before_plan e after_plan. Ignore hooks desabilitados. Não interprete
expressões condition; deixe sua avaliação com o executor de hooks. Execute de fato hooks
obrigatórios sem condição dentro do escopo autorizado, usando a invocação do host; informar
um comando não é executá-lo. Hooks opcionais são apresentados para escolha. Em configuração
inválida ou falha de hook obrigatório, relate o impedimento em vez de declarar a etapa concluída.

Checklists existentes continuam sendo evidência de revisão: não marque itens de revisão
como aprovados por ter implementado código. Resolva um item bloqueante real ou obtenha a
decisão de prosseguir antes da implementação. Não crie checklist para simular esse gate.

Ao terminar, relate os arquivos efetivamente produzidos, a validação executada e as
pendências. Não crie relatório de execução adicional nem alegue teste não executado.

## Manutenção do preset

Este diretório é a fonte editável. Os adapters em .agents/skills, .claude/skills e
.github/skills são derivados pelo engine do Spec Kit; não mantenha versões paralelas
da política nesses arquivos. Os templates são resolvidos pela prioridade nativa;
os comandos precisam ser materializados novamente após mudar sua fonte.

O fluxo público de ativação é specify integration use <host>, para cada integração
instalada, retornando a codex como padrão. Esse comando também pode atualizar scripts
core quando o CLI difere da instalação do projeto: examine o diff e trate upgrades
separadamente. O registro de presets do próprio engine permite materializar comandos
sem atualizar o core; registre no PR a ferramenta e o procedimento usados.

Para reinstalar com specify preset add --dev, use uma cópia de staging fora do destino
instalado: o instalador substitui o diretório de destino. Confira origem, composição
e atualização na [documentação de customização](https://github.github.com/spec-kit/guides/customization.html).
