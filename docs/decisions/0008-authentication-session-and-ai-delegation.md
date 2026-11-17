# ADR 0008 — Autenticação, sessão e delegação à IA

Status: aceita (2026-11-15).

## Decisão

- **`/login` é uma transição automática.** Espera a checagem de sessão, inicia um único
  redirecionamento OIDC e devolve o usuário autenticado ao caminho de retorno validado. O tema atual
  (`light` ou `dark`) vai ao `identity-service` como parâmetro, e ele só aceita esses dois valores.
- **Falhas de autenticação têm código estável** e mensagem acionável.
- **A sessão OIDC fica em `localStorage`**, para que uma segunda aba reutilize a sessão. O risco de um
  XSS na própria origem ler o token é aceito: `sessionStorage` não protege de forma relevante contra
  isso.
- **O núcleo da sessão fica em `shared/session/`**, como máquina pura sem React nem `oidc-client-ts`.
  O adaptador OIDC fica em `features/auth`.
- **Trocar de identidade exige login novo.** Se `sub` ou tenant mudam numa renovação, a sessão limpa
  credenciais, usuário e tenant, cancela as requisições da sessão e fica bloqueada até um login
  explícito; eventos tardios não a reautenticam.
- **Delegação à IA:** os serviços de IA recebem o token do usuário e o tenant do header validado
  contra a claim ([ADR 0004](0004-multi-tenancy.md)).

## Rejeitado

- **`sessionStorage`.** Cada aba refaria o redirecionamento, sem ganho real contra XSS.
- **Recarregar só a página atual quando a identidade muda.** Estado e mutações carregados com a
  identidade antiga continuariam vivos.
- **Trocar de tenant em cada página**, ou **só limpar o storage**: duplicaria um ciclo de segurança
  em cada feature, ou deixaria credenciais vivas até recarregar.
- **Um registro global de requisições ou cache por tenant.** Um único sinal de sessão basta.
