# Plano: etiqueta em uso

## Abordagem

- O diálogo compartilhado apresenta `RelatedRecords` sempre que recebe uma falha, sem exigir
  configuração de conteúdo pela feature. O leitor existente valida os metadados; nomes sem ID
  permanecem visíveis sem link. O frontend exibe a mensagem do backend sem interpretá-la e não
  gera avisos adicionais sobre limite ou registros ausentes.
- Grupos ainda desconhecidos são apresentados como outros vínculos quando suas entradas têm código
  `Tag.InUse` e nome válido. Nenhuma chave ou URL recebida se transforma em rota ou rótulo.
- O caminho de edição de pessoa passa a ser compartilhado sem depender de `features/clients`,
  que já consome `features/tags`. Os links usam o primitivo existente de nova aba.
- Pessoas e serviços usam um construtor comum de links no próprio diálogo e o mesmo tratamento
  de IDs. A tela e a rota de edição de serviços não são implementadas nesta mudança.
- O diálogo oferece nova tentativa em qualquer bloqueio, com rótulo personalizável e mesma variante
  visual da confirmação. Conserva a resposta bloqueada visível durante o envio, limita altura e
  permite rolagem. Erros transitórios conservam seu alerta e botão de nova tentativa. Base UI continua
  responsável pelo foco e fechamento.
- A repetição explícita usa a mesma mutação, substitui o erro e preserva sucesso, falhas temporárias,
  navegação e os eventos de atualização existentes.

## Validação

Testar a página e o widget para dados parciais, ambos os tipos, limites, URLs codificadas, teclado,
foco, rolagem, repetição e regressões. Executar formato, lint, build, cobertura e gates pertinentes.
E2E e contrato requerem stack descartável, sem reutilizar o Aspire do dono. Não há mudança de contrato
nem necessidade de modelo, contrato ou pesquisa adicionais.
