# Abordagem entregue: acesso ao cadastro em conflito

**Status**: implementada; registro histórico do [PR #200](https://github.com/evertonschuster/Agenza/pull/200).
O comportamento e o aceite estão em [spec.md](spec.md). A solução inicialmente considerada consta da
[ADR 0084](../../../../docs/adr/0084-admin-frontend-open-existing-cpf-conflict.md); o estado da página
foi substituído pelo erro do campo na
[ADR 0085](../../../../docs/adr/0085-admin-frontend-cpf-link-from-field-error.md), com apresentação
compartilhada e conflito de e-mail na
[ADR 0086](../../../../docs/adr/0086-admin-frontend-reusable-new-tab-link.md).

## Estado e navegação

O mapeamento genérico preserva mensagem, código e metadados opcionais do erro de campo. A ponte com
React Hook Form conserva esses dados sem interpretar clientId. ClientPersonSection observa os erros
de CPF e e-mail por useFormState e oferece o acesso apenas quando o código corresponde ao conflito
do campo e meta.clientId identifica o cadastro existente. Validação, substituição e limpeza do erro
controlam a duração do link; não há cópia do valor submetido, estado de conflito no hook ou props
atravessando a página.

NewTabLink concentra apresentação, ícone decorativo, target=_blank e rel=noopener noreferrer. O texto
é “Abrir cadastro existente”. A seção monta a rota interna /pessoas/{id}/editar com o identificador
codificado; metadados não fornecem uma URL arbitrária. A aba original conserva o rascunho. A entrega
não cria tela de detalhes nem altera entidades, contatos, sessão, dependências ou OpenAPI.

## Fontes da implementação e verificação

- [Mapeamento de erros](../../src/shared/api/formErrors.ts) e
  [ponte do formulário](../../src/shared/form/applyApiProblem.ts): preservação genérica de código e metadados.
- [Seção da pessoa](../../src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx)
  e [primitivo de nova aba](../../src/shared/ui/new-tab-link/index.tsx): interpretação do conflito e apresentação.
- [Testes do formulário](../../src/features/clients/ui/pages/ClientFormPage/ClientFormPage.test.tsx):
  criação/edição, erro ausente ou não relacionado, revalidação e retirada de links antigos.
- [Cenários de navegador](../../e2e/clients.spec.ts): cadastro pré-existente por CPF ou e-mail,
  consulta em outra aba e preservação do rascunho; o e-mail em maiúsculas exercita a normalização.

Os links identificam evidência no código, sem declarar uma nova execução da suíte. Preparação,
comandos e gates pertencem ao [README](../../README.md) e à [QUALITY](../../../../docs/QUALITY.md).
