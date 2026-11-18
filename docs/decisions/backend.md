# Decisões: backend

## Casos de uso, validação e resultados

### Decisão

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

### Por quê

Abstração proporcional: o dispatcher inteiro cabe em cerca de cem linhas, e o código lê como
orquestração explícita. O investimento fica no domínio (agregados, value objects, erros nomeados).

### Rejeitado

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

## Modelagem de domínio e contratos de API

### Decisão

**Agregados.**

- Construtor privado, `Create` que valida e constrói, comportamento que valida antes de atribuir.
  Filhos só são criados pela raiz, por fábricas `internal` que geram o próprio id.
- Agregados se referenciam por id. Um muitos-para-muitos é um filho da raiz dona, com FK composta
  para as duas pontas (`ClientTag`).
- Uma mudança de estado é um método com intenção (`Inactivate()`), que recusa transição inválida com
  erro nomeado. Um `Update` do registro inteiro só serve para dados livres, sem transição.

**Valores.**

- É value object o que tem formato, normalização ou regra; texto livre limitado só pelo tamanho pode
  ficar primitivo.
- Os value objects sem contexto ficam em `Admin.SharedKernel.ValueObjects` e se comportam como
  escalar no wire.
- Um value object de texto só é lido de query ou rota por opt-in; dado pessoal nunca, porque URL vai
  para log.
- Um conjunto fechado de opções é um enum simples, que viaja pelo nome em camelCase; de query ou
  rota, exatamente um nome.

**Ciclo de vida e unicidade.**

- Excluir é soft delete; um id excluído responde `404`.
- A unicidade é um índice único com `TenantId` e `"DeletedAt" IS NULL`. A pré-checagem do handler
  existe só para responder no campo.
- Uma edição (`PUT`) substitui o registro inteiro, filhos incluídos.

**Listas paginadas.** `PagedQuery` com `page` e `pageSize` (padrão 20, máximo 100) entra como
`PageRequest`, ou como o filtro da lista que o estende, e sai como `PagedResult`. Uma página além da
última responde `200` sem itens.

**Regras de produto de Pessoas e Etiquetas:**

- Excluir uma pessoa libera o CPF; inativar não libera. Contatos são excluídos junto. Um agendamento
  bloqueia a exclusão.
- Desativar e reativar não têm corpo e são idempotentes: respondem `200`, inclusive repetidos.
- A leitura por id devolve a mesma resposta do `POST` e do `PUT`, sem idade (o frontend a calcula),
  com o CPF inteiro e os contatos ordenados por nome.
- `tagIds` nulo no `PUT` limpa as etiquetas; etiqueta desconhecida responde `400` em `TagIds`;
  etiqueta em uso por pessoas não pode ser excluída.

Formas de código e configuração EF: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md)
§3, §5 e §6. Formas comuns do wire: [docs/API.md](../API.md).

### Rejeitado

- **Um status `Deleted` ao lado do soft delete.** Duas fontes de verdade, e o status sozinho não
  escondia a linha.
- **Uma tabela de contatos com discriminador.** Colunas nulas que só valem para um tipo.
- **CPF reservado para sempre**, inclusive de pessoas excluídas. Decisão de produto: excluir libera.
- **Sincronizar filhos por id na edição.** Reconcilia identidade técnica quando a requisição já traz
  o estado desejado inteiro.
- **Value object para um conjunto de opções**, conversor registrado por enum, `[JsonConverter]` no
  domínio e enums com valores em bits. Esquecer um registro falhava em silêncio, e bits aceitavam
  combinações.
- **Validator de paginação compartilhado ou especificação genérica no repositório.** Cada lista tem
  seus filtros, e a porta recebe valores simples.
- **Modo não paginado de listas**, recusado pelo dono.
- **Idade no wire.** Prende a resposta ao dia em que foi calculada.
- **Mascarar o CPF**, decisão do dono.
- **`409` para ação repetida.** Um segundo clique viraria erro para o estado que o usuário queria.
- **Etiquetas como `uuid[]` na tabela de pessoas.** O PostgreSQL não tem FK em elemento de array, e a
  posse por tenant ficaria só na aplicação.
- **Navegação direta entre `Client` e `Tag`.** Carregaria outra raiz dentro do agregado.

## Datas e fusos

### Decisão

- **O backend trabalha só em UTC.** Instantes são `DateTimeOffset` do `TimeProvider` injetado;
  datas de calendário são `DateOnly`; "hoje" é o dia UTC, calculado no handler ou validator e
  passado ao domínio. Sem `DateTime.Now`, `DateTime.Today` nem `TimeZoneInfo`.
- **Uma data de calendário enviada como instante mantém o dia escrito.** Um value object de data
  aceita `2015-03-10T23:59:59-03:00` como 10 de março, ignorando hora e offset. O resto continua
  com o framework.
- **No frontend, a ordem e o formato de datas digitadas e exibidas seguem o idioma do navegador**;
  textos e números seguem pt-BR.

Uma regra que dependa do dia local do negócio exige uma ADR nova.

### Rejeitado

- **Converter a data no repositório do frontend** e manter o contrato estrito. O dono preferiu
  afrouxar o backend a mexer no gerador de tipos.
- **Usar o dia UTC do instante recebido.** O dono pediu a data como foi escrita.
- **Fixar a ordem de data em pt-BR.** Um usuário com o navegador em outro idioma lê e digita na
  ordem dele.

## Verificar vínculos locais na exclusão de etiquetas

### Decisão

O teste de persistência compara as chaves estrangeiras que apontam para `Tag` no modelo EF com um
inventário de cenários executáveis. Cada cenário cria a relação, invoca o handler de exclusão e
verifica que o tenant dono recebe `Tag.InUse` sem salvar. O inventário inclui a relação de pessoas
e a tabela de junção de serviços. Um teste negativo comprova a detecção de uma relação omitida.

O inventário é código de teste, não uma fonte de regras de domínio. Uma relação nova exige seu
cenário e a implementação da verificação de negócio correspondente. O handler e o contrato HTTP
existentes permanecem inalterados.

### Por quê

A verificação explícita de pessoas e serviços pode ser esquecida quando uma nova relação com
etiqueta entrar no modelo.

### Limites

A verificação cobre relações diretas do modelo EF; referências externas, dados em JSON e relações em
outros serviços precisam de proteção própria. EF InMemory não comprova restrições PostgreSQL nem
segurança sob concorrência. A corrida entre associação e exclusão lógica permanece fora desta decisão.

### Rejeitado

- **Somente um checklist:** não detecta automaticamente uma relação local esquecida.
- **Registro de provedores em produção:** o registro também pode ser esquecido; os dois vínculos
  atuais não justificam essa abstração.
- **Descoberta de regras por metadados em runtime:** o esquema não determina quais registros bloqueiam
  a exclusão nem quais nomes são apropriados para exibição.
