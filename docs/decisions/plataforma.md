# Decisões: plataforma

## Topologia de serviços e dados

### Decisão

- **Serviços agregados por contexto.** Cada serviço é um pequeno monólito de um contexto de
  negócio: `identity-service` cuida de autenticação, tenants e usuários; `services-service` é o
  modelo de contexto de negócio com dados por tenant; `assistant-service` (Python) é a IA. Uma
  capacidade nova que cabe num contexto existente é uma pasta nesse serviço. Separar um contexto
  exige divergência real de escala, dono ou release, e é uma ADR.
- **Um PostgreSQL, um schema por serviço.** Cada serviço tem seu schema, seu histórico de
  migrations dentro dele e sua role sem privilégio de superusuário; `PUBLIC` não cria nem usa
  esses schemas. Serviços conversam por HTTP com token, nunca pelas tabelas uns dos outros.
- **Código compartilhado é infraestrutura.** `backend/shared/` não guarda regra de negócio. A
  exceção é `Admin.SharedKernel.ValueObjects`: formatos iguais em todo serviço (CPF, nome, telefone,
  e-mail, data de nascimento), sem contexto de negócio.
- **Provedor OIDC próprio.** `identity-service` é a autoridade, com OpenIddict e ASP.NET Identity:
  Authorization Code + PKCE para o SPA e client credentials com escopos por audiência para M2M. O
  access token é um JWT assinado e não criptografado, para que qualquer stack o valide pelo JWKS.
- **Aspire é o único orquestrador**, local e no job de contrato do CI. Não há Docker no frontend nem
  um segundo grafo de orquestração.

Detalhes de forma: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §1.

### Por quê

Um dono solo não sustenta a operação de microserviços finos. Schemas e roles por serviço mantêm a
posse dos dados verificável pelo banco sem multiplicar instâncias.

### Rejeitado

- **Microserviços finos por capacidade.** Custo de operação e de contrato sem ganho de escala.
- **Uma cópia por serviço dos value objects sem contexto.** Repetiria o algoritmo de dígito
  verificador e a integração com o wire em cada serviço.
- **Um pacote NuGet para esses value objects.** Uma solução só, sem feed: uma `ProjectReference`
  muda junto com quem a consome.
- **Mover `DomainResult` para o projeto compartilhado.** O Domain passaria a depender de mais do que
  formatos; ele continua duplicado por serviço.

## Multi-tenancy

### Decisão

- **O tenant vem só da claim do token validado.** O header `X-Tenant-Id` é conveniência de
  roteamento: o `TenantHeaderFilter` recusa header ausente, malformado ou diferente da claim antes
  da action. `[IgnoreTenant]` exige justificativa explícita e não é política de acesso anônimo.
  Nenhum command, query, DTO ou repositório de negócio aceita tenant escolhido pelo cliente.
- **Atribuição no save.** Entidades `TenantOwnedEntity` recebem o tenant atual pelo interceptor ao
  serem adicionadas; sem tenant disponível o save falha. Um tenant já atribuído não é trocado.
- **Dois filtros nomeados em toda consulta:** `SoftDelete` e `Tenant`, aplicados pela convenção do
  `DbContext`. Nenhum repositório os ignora; ler linhas excluídas exige um helper próprio que
  preserve o tenant.
- **O banco garante as relações.** Toda raiz tenant-owned expõe a chave candidata `(TenantId, Id)`,
  e relações entre entidades tenant-owned usam FK composta com o tenant. Uma FK só por `Id` entre
  elas é um defeito.
- **As claims mantêm o nome do token** (`MapInboundClaims = false`): `tenant_id` é o tenant e `sub`
  é quem fica nas colunas de auditoria.
- **Frontend:** o header vem do token da sessão, nunca de URL, query ou valor avulso em
  `localStorage`. O cliente HTTP falha fechado sem token ou tenant.
- **Serviços de IA:** um endpoint tenant-owned exige JWT com `tenant_id` e o mesmo valor no header,
  validados por uma única dependência `TenantContext`.

Prova automatizada: testes de persistência para filtros e atribuição, e smokes reais no Aspire
([processo.md](processo.md), "Testes e verificação"). Checklist de revisão: skill
[agenza-tenant-isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md).

### Por quê

O tenant é a fronteira de segurança de um SaaS multi-tenant; ela precisa valer no servidor e no
banco, não depender de cada handler lembrar.

### Rejeitado

- **Garantir relações só na aplicação, com FKs por `Id`.** Bastava enquanto toda escrita passava
  pelo EF; foi substituído por FKs compostas para que nenhum caminho de escrita crie uma relação
  entre tenants.
- **Um filtro único combinando exclusão e tenant.** Ignorar o soft delete desligaria o tenant junto.
- **O accessor ler dois nomes de claim**, ou manter o mapeamento e remover só `sub`: cada claim
  nova seria renomeada sem aviso.
- **Tenant em rota ou query.**

## Autenticação, sessão e delegação à IA

### Decisão

- **A sessão OIDC fica em `localStorage`**, para que uma segunda aba reutilize a sessão. O risco de um
  XSS na própria origem ler o token é aceito: `sessionStorage` não protege de forma relevante contra
  isso.
- **Trocar de identidade exige login novo.** Se `sub` ou tenant mudam numa renovação, a sessão é
  limpa inteira e fica bloqueada até um login explícito.
- **Delegação à IA:** os serviços de IA recebem o token do usuário e o tenant do header validado
  contra a claim, como em Multi-tenancy.

### Rejeitado

- **`sessionStorage`.** Cada aba refaria o redirecionamento, sem ganho real contra XSS.
- **Recarregar só a página atual quando a identidade muda.** Estado e mutações carregados com a
  identidade antiga continuariam vivos.
- **Trocar de tenant em cada página**, ou **só limpar o storage**: duplicaria um ciclo de segurança
  em cada feature, ou deixaria credenciais vivas até recarregar.
- **Um registro global de requisições ou cache por tenant.** Um único sinal de sessão basta.

## Banco: bootstrap e migrations

### Decisão

- **Migrations e seed automáticos são opt-in.** Ficam desligados na configuração base e ligados só
  em `appsettings.Development.json` ou por override explícito
  (`DatabaseBootstrap:RunOnStartup`). Com o bootstrap ligado, cada serviço aplica suas migrations e o
  `identity-service` roda seu seed idempotente de desenvolvimento.
- **No máximo uma instância com bootstrap por serviço.** Bootstraps concorrentes não são suportados,
  e não há lock.
- **Migrations são aditivas e nunca editadas depois de commitadas**; uma migration que apaga ou
  reescreve dados é revisada sozinha. Convenções e comandos:
  [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §5.

### Rejeitado

- **Um advisory lock do PostgreSQL serializando o bootstrap.** Foi criado e removido: a topologia
  suportada já tem um único bootstrap por serviço.
- **Um histórico de migrations comum no schema `public`.** Misturaria a posse dos schemas.

## Logging

### Decisão

- **Serilog é o pipeline de todo host .NET**, dono de `backend/shared/Admin.Logging`. Os serviços o
  recebem por `AddServiceDefaults()`, e o AppHost o referencia direto; nenhum outro projeto. Domain e
  Application escrevem contra `ILogger<T>` e não referenciam Serilog. Uso e configuração:
  [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §8.

### Por quê

O provedor padrão escrevia duas linhas por evento, blocos de SQL em `Information` e nada para uma
requisição normal, e o AppHost logava diferente dos serviços.
