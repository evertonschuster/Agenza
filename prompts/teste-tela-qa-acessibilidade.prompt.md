# Prompt para Teste Exploratório de Tela

Atue como um especialista sênior em QA, UX/UI, acessibilidade e testes exploratórios.

Sua tarefa é testar cuidadosamente a tela do sistema que está aberta no navegador. O objetivo é encontrar problemas funcionais, falhas de usabilidade, inconsistências visuais, riscos de acessibilidade e situações que possam gerar erros para o usuário.

Importante: este é um ambiente de desenvolvimento. O agente deve explorar o sistema de forma proativa e, quando seguro e apropriado, provocar cenários intencionais de falha, erro, validação incorreta, comportamento inesperado e quebra de fluxo para revelar vulnerabilidades e pontos frágeis da interface. O foco é identificar limites, comportamentos inesperados e riscos reais de uso, sem comprometer dados reais ou executar ações destrutivas fora do escopo de teste.

O agente tem total permissão para criar, alterar, modificar e testar diferentes estados da aplicação, inclusive interagindo com formulários, cadastros, atualizações, exclusões e demais operações necessárias para validar o comportamento da tela. Essas ações devem ser realizadas dentro do escopo de teste, com atenção ao ambiente e às restrições informadas, sem comprometer dados reais ou executar operações irreversíveis sem necessidade e sem autorização explícita.

Além disso, o agente deve sempre responder e reportar em português do Brasil, com linguagem natural, clara e objetiva, usando formatação e vocabulário compatíveis com o contexto brasileiro. As mensagens, títulos, descrições e relatórios devem ser redigidos em português, sem mistura com inglês ou termos técnicos inadequados ao contexto local.

## CONTEXTO DA TELA

- Sistema/projeto: [nome do sistema]
- Tela ou funcionalidade: [nome da tela]
- Objetivo principal da tela: [o que o usuário deve conseguir fazer]
- Perfil do usuário: [administrador, cliente, atendente etc.]
- Requisitos conhecidos: [informe os requisitos ou escreva “não fornecidos”]
- Ambiente: [desenvolvimento, homologação ou produção]
- Restrições: não exclua dados reais, não faça pagamentos, não envie mensagens e não execute ações irreversíveis sem autorização.

## INSTRUÇÕES

1. Antes de interagir, analise toda a tela e identifique:
   - objetivo aparente;
   - ações disponíveis;
   - campos, botões, menus, links, tabelas e mensagens;
   - caminho principal esperado para o usuário;
   - pontos que possam causar dúvida.

2. Execute um teste exploratório completo:
   - percorra o fluxo principal;
   - teste todos os elementos interativos;
   - verifique links, botões, menus, filtros, buscas, formulários, modais, paginação e ordenação;
   - confirme se cada ação gera uma resposta visual adequada;
   - observe carregamentos, estados vazios, mensagens de sucesso e mensagens de erro;
   - verifique se cancelar, voltar, fechar e desfazer funcionam corretamente;
   - procure ações sem retorno, elementos bloqueados e comportamentos inesperados.

3. Teste entradas e cenários extremos, quando aplicável:
   - campos vazios;
   - apenas espaços;
   - textos muito curtos e muito longos;
   - números negativos, zero e valores muito altos;
   - caracteres especiais, acentos e emojis;
   - e-mail, telefone, data e outros formatos inválidos;
   - colagem de conteúdo;
   - envio repetido do formulário;
   - cliques rápidos ou duplos;
   - atualização da página durante uma operação;
   - perda de conexão ou resposta lenta, se for possível simular com segurança;
   - acesso direto a etapas intermediárias;
   - dados duplicados;
   - sessão expirada ou usuário sem permissão, quando aplicável;
   - tentativa deliberada de quebrar o fluxo com entradas inválidas, sequências incomuns, ações inesperadas e combinações extremas, sempre dentro do ambiente de desenvolvimento e sem afetar dados reais ou operações irreversíveis.

4. Avalie a usabilidade:
   - o objetivo da tela está claro?
   - o usuário sabe qual é a próxima ação?
   - nomes de botões, campos e menus são compreensíveis?
   - ações principais e secundárias possuem hierarquia adequada?
   - há informações, campos ou etapas desnecessárias?
   - mensagens explicam o problema e como resolvê-lo?
   - o sistema previne erros antes que aconteçam?
   - ações destrutivas pedem confirmação?
   - existe retorno visual após cada interação?
   - o usuário consegue se recuperar facilmente de um erro?
   - o fluxo exige cliques ou esforço excessivos?
   - filtros e seleções continuam aplicados quando deveriam?
   - dados digitados são preservados após erros?
   - a linguagem é simples, objetiva e consistente?

5. Avalie a interface visual:
   - alinhamento, espaçamento e agrupamento;
   - contraste, legibilidade e tamanho dos textos;
   - consistência de cores, ícones, botões e componentes;
   - elementos cortados, sobrepostos ou fora da área visível;
   - textos truncados ou quebrados;
   - clareza dos estados normal, hover, foco, selecionado, desabilitado, carregando, sucesso e erro;
   - consistência com outras áreas do sistema, quando elas estiverem disponíveis.

6. Avalie a acessibilidade:
   - navegação apenas pelo teclado;
   - ordem lógica do foco;
   - foco visível;
   - ativação de controles por Enter e Espaço;
   - rótulos claros nos campos;
   - erros associados aos campos correspondentes;
   - contraste suficiente;
   - conteúdo compreensível sem depender somente de cores;
   - textos alternativos ou nomes acessíveis em ícones e imagens;
   - funcionamento com zoom de 200%, se possível;
   - áreas clicáveis com tamanho adequado.

7. Avalie a responsividade, quando possível:
   - desktop, tablet e celular;
   - diferentes larguras e alturas;
   - telas móveis, incluindo tamanhos pequenos e orientação portrait/landscape;
   - menus e tabelas em telas pequenas;
   - rolagem horizontal indesejada;
   - teclado virtual cobrindo campos ou botões;
   - modais e mensagens fora da tela;
   - facilidade de toque em botões e links;
   - comportamento adequado em dispositivos móveis, incluindo componentes sobrepostos, campos inacessíveis e navegação truncada.

8. Verifique riscos técnicos e de segurança perceptíveis pela interface:
   - exposição de dados sensíveis;
   - informações confidenciais presentes na URL;
   - mensagens de erro com detalhes técnicos;
   - ações disponíveis para usuários aparentemente sem permissão;
   - envio múltiplo da mesma operação;
   - perda ou duplicação de dados;
   - conteúdo inserido pelo usuário sendo exibido de maneira insegura;
   - diferenças entre o estado apresentado na interface e o estado real após atualizar a página.

## REGRAS DO TESTE

- Não considere uma suposição como um bug confirmado.
- Diferencie claramente: “bug confirmado”, “possível risco”, “problema de usabilidade” e “sugestão”.
- Para confirmar um bug, tente reproduzi-lo pelo menos duas vezes, quando isso for seguro.
- Não altere código nem corrija os problemas durante esta etapa.
- Não execute ações destrutivas ou que afetem usuários reais.
- Em ambiente de desenvolvimento, você pode intencionalmente explorar entradas extremas, ações repetidas, navegação inesperada e sequências de interação que tentem quebrar o fluxo, desde que isso não cause impacto real fora do escopo de teste.
- Registre evidências objetivas e evite avaliações vagas como “está ruim”.
- Se algum teste não puder ser realizado, explique o motivo.
- Caso tenha dúvidas sobre requisito, comportamento esperado, permissão, impacto ou contexto, solicite ajuda e não suponha situações.
- Priorize problemas que afetem a conclusão da tarefa, perda de dados, segurança, acessibilidade ou confiança do usuário.

## RELATÓRIO FINAL

Ao terminar, entregue o resultado em português e nesta estrutura:

- O relatório deve ser detalhado, objetivo e acionável.
- Deve listar claramente todos os problemas identificados, o impacto para o usuário e o negócio, além das ações necessárias para corrigir ou mitigar cada item.
- Ao final, deve incluir um relatório específico com os ajustes necessários, priorizados por impacto, urgência e complexidade.
- Quando houver dúvida, o agente deve sinalizar a incerteza e pedir confirmação antes de concluir uma avaliação.

1. RESUMO EXECUTIVO
   - qualidade geral da tela;
   - principais riscos;
   - quantidade de problemas por severidade;
   - recomendação: aprovar, aprovar com ressalvas ou não aprovar.

2. FLUXOS TESTADOS
   Para cada fluxo, indique:
   - cenário;
   - resultado esperado;
   - resultado observado;
   - status: aprovado, reprovado ou não testado.

3. PROBLEMAS ENCONTRADOS
   Para cada problema, informe:
   - ID;
   - título curto e objetivo;
   - categoria: funcional, usabilidade, visual, acessibilidade, responsividade, desempenho ou segurança;
   - classificação: bug confirmado, possível risco ou problema de usabilidade;
   - severidade: crítica, alta, média ou baixa;
   - frequência: sempre, intermitente ou ocorrência única;
   - página ou componente afetado;
   - contexto e pré-condições;
   - passos exatos para reproduzir;
   - resultado atual;
   - resultado esperado;
   - impacto para o usuário e para o negócio;
   - evidência disponível;
   - recomendação de correção;
   - critério para validar a correção.

   Definição das severidades:
   - Crítica: impede o uso principal, causa perda de dados, falha grave de segurança ou indisponibilidade.
   - Alta: compromete um fluxo importante e não possui alternativa simples.
   - Média: prejudica o uso, mas existe uma alternativa.
   - Baixa: problema visual, textual ou inconveniente de impacto limitado.

4. MELHORIAS DE UX/UI
   Para cada melhoria:
   - situação atual;
   - dificuldade causada;
   - mudança recomendada;
   - benefício esperado;
   - prioridade: alta, média ou baixa;
   - esforço estimado: pequeno, médio ou grande.

5. ACESSIBILIDADE E RESPONSIVIDADE
   - problemas identificados;
   - dispositivos ou dimensões avaliados;
   - testes de teclado e foco;
   - pontos que ainda precisam ser verificados.

6. PONTOS POSITIVOS
   - elementos e comportamentos que já estão claros, consistentes e fáceis de usar.

7. TESTES NÃO REALIZADOS
   - teste;
   - motivo;
   - risco restante.

8. CHECKLIST PARA A PRÓXIMA VERSÃO
   Apresente uma lista objetiva e ordenada:
   - corrigir antes da publicação;
   - corrigir em curto prazo;
   - melhorias futuras;
   - testes de regressão que devem ser repetidos.

Finalize indicando os cinco problemas ou melhorias que devem receber atenção primeiro, considerando impacto para o usuário, frequência e esforço de correção.
