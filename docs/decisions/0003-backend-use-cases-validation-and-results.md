# ADR 0003 — Backend: casos de uso, validação e resultados

Status: aceita (2026-11-15).

## Decisão

- **CQRS com dispatcher próprio**, em `Admin.SharedKernel`: resolve o handler do command ou query e
  roda o validator antes. Fatias verticais organizam a Application, dentro das camadas
  Domain → Application → Infrastructure → Api.
- **O controller liga o próprio command ou query**, sem record de corpo separado. O mapeamento para
  o domínio é um método de extensão ao lado do command; uma raiz com muitos membros recebe um
  `<Entity>Data`, e o handler chama `Create`/`Update`.
- **Um handler por operação.** Sem handler base e sem classe que orquestre entre handlers. O que dois
  handlers compartilham tem casa: regra no domínio, leitura no repositório, mapeamento em
  `<Entity>Response.From<Entity>`. Repetir poucas linhas entre create e edit é aceito.
- **O validator é síncrono e só checa a forma da entrada**, sem repositório. Cada regra leva o código
  do domínio e a própria mensagem pt-BR; uma regra que dois validators usam é escrita nos dois.
- **Regras que dependem do estado atual** (existência, unicidade, em uso, outro agregado) ficam no
  handler e respondem `404` ou `409`, um conflito por resposta, numa ordem fixa.
- **Falhas esperadas são valores.** O domínio retorna `DomainResult`; a Application, `Result`. Uma
  falha que o banco reporta chega ao usuário como `409 <Entity>.SaveFailed` genérico, e o
  `UnitOfWork` registra o tipo e a constraint em `Warning`. Só o inesperado lança exceção.
- **Chaves de erro no wire são o caminho camelCase do campo**, convertidas num único ponto da
  fronteira HTTP. Dentro do backend continuam os nomes C#.
- **Leituras sem tracking por padrão** no `services-service`. Um command carrega por `GetByIdAsync`,
  aplica o comportamento e chama `UpdateAsync`, e a porta não expõe tracking do EF.
- **Kernel em duas partes:** `Admin.SharedKernel`, sem ASP.NET, e `Admin.SharedKernel.AspNetCore`,
  usado só pela Api.

Convenções completas: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §2–4.

## Por quê

Abstração proporcional: o dispatcher inteiro cabe em cerca de cem linhas, e o código lê como
orquestração explícita. O investimento fica no domínio (agregados, value objects, erros nomeados).

## Rejeitado

- **MediatR.** A partir da versão 13 exige licença comercial acima de um faturamento; o necessário
  cabe num dispatcher próprio.
- **Validators com repositório para regras entre agregados**, com domínio anêmico. Foi tentado e
  revertido: escondia I/O na validação e tirava as invariantes do domínio.
- **Um loader compartilhado entre handlers** (`ServiceRelationshipLoader`). Vira uma camada de
  orquestração que cada feature tende a engordar; o repositório já é essa fronteira.
- **Exceções de negócio e helpers monádicos sobre `Result`.**
- **Mensagens derivadas do nome da constraint do banco.** A resposta específica vem das pré-checagens
  do handler; uma nova tentativa passa por elas.
- **`<Feature>RuleBuilderExtensions` para regras compartilhadas.** Exigia decidir caso a caso o que
  extrair; constantes e códigos do domínio já alinham as cópias.
- **`GetForUpdateAsync` na porta.** Amarra a Application à estratégia de carga do EF.
- **Navegações entre agregados** para facilitar respostas: acoplam duas fronteiras de consistência.
