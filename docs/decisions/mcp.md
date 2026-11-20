# Autoridade OAuth e recurso MCP

## Decisão

O IdentityService conhece protocolos de autenticação e autorização, usuários, clientes, recursos
e escopos. Identificadores como `mcp:connect` são dados de cadastro; não determinam ramos especiais
no fluxo OAuth. O host MCP conhece o transporte, publica seus metadados de recurso protegido e
autoriza ferramentas. A autoridade não referencia o SDK MCP nem interpreta operações de negócio.

A primeira entrega suporta Authorization Code com PKCE S256 para clientes públicos interativos e
Client Credentials para serviços confidenciais. Renovação é uma permissão explícita do cliente.
Autorização automática é restrita aos clientes interativos que tenham essa política declarada;
não há tela nem trilha adicional de consentimento. M2M representa um serviço e não recebe tenant.

O cadastro persistido do OpenIddict é a fonte operacional de permissões. O manifesto `OAuth`
provisiona clientes e escopos no bootstrap opt-in existente; ele não é uma segunda allowlist
consultada a cada requisição. Alterar o manifesto exige reaplicar o provisionamento. Registros
omitidos do manifesto não são apagados implicitamente; desativação é uma operação explícita.

A emissão usa os escopos permitidos ao cliente e os recursos associados a esses escopos. Troca de
código e renovação também respeitam a concessão original: uma nova permissão ou audiência no
cadastro não amplia uma autorização antiga. Permissões retiradas deixam de ser concedidas na
renovação. Mudança de tenant exige um novo login. OpenIddict mantém validação de clientes, grants,
callbacks, PKCE e tokens; a política local limita a concessão usando o cadastro vigente.

O recurso MCP usa audiência própria. O host exige usuário, tenant e escopo adequados; tokens da
API REST e tokens M2M sem identidade de usuário não autorizam ferramentas desse host. O bootstrap
trata o recurso da mesma maneira que qualquer outra audiência cadastrada.

Clientes locais usam callbacks explícitos por padrão, com porta variável para clientes nativos.
Uma exceção opt-in permite qualquer caminho HTTP em `127.0.0.1` para clientes públicos nativos
com PKCE. A propriedade `allow_any_loopback_redirect_path` fica no cadastro persistido; o manifesto
provisiona `AllowAnyLoopbackRedirectPath`, inicialmente apenas para `agenza-mcp` em desenvolvimento.
Isso é uma exceção deliberada à correspondência de caminho exigida pela RFC 8252, seção 8.4.
O mecanismo não depende do ambiente do servidor: um cliente local pode usar uma autoridade remota.

A exceção não admite queries, fragmentos, credenciais na URI, `localhost`, IPv6 ou representações
alternativas do IPv4. O gerenciador derivado do OpenIddict altera apenas a validação do destino
contra o cadastro. O callback completo continua vinculado ao código e deve ser idêntico na troca por
token. Desativar a propriedade e reaplicar o bootstrap restaura os callbacks cadastrados.
Um `client_id` público não autentica o aplicativo; PKCE também não comprova a identidade do harness.
MCP e Identity usam HTTPS confiável e são orquestrados pelo Aspire.

Não há cadastro dinâmico anônimo nem resolução CIMD nesta entrega. Distribuição de uma integração
pré-configurada e identificação automática de plataformas são etapas separadas. Elas devem usar
as permissões da autoridade, sem inserir conhecimento de MCP no mecanismo OAuth. A conexão real
com aplicativos na nuvem depende de URLs HTTPS públicas e do cadastro aceito pela plataforma.

## Estado anterior da prova

O projeto ainda não tem produção. O novo provisionamento deve ser validado em base descartável
nova, sem transportar aplicações geradas pelo antigo cadastro anônimo. Desativar clientes impede
novas emissões; JWTs já emitidos podem continuar válidos até expirar nos recursos que os validam
localmente. Recriar o banco sozinho não os invalida.

## Alternativas rejeitadas

- Condicionar a política da autoridade a `mcp:connect` ou a nomes de plataformas. Recursos são
  consumidores configurados do mesmo protocolo.
- Resolver metadados de cliente e conceder permissões MCP fixas na mesma operação.
- Fazer o frontend ou uma ferramenta MCP escolher o tenant que será autorizado.
- Reabrir cadastro anônimo com autorização automática para eliminar configuração de `client_id`.
- Fazer um novo framework ou serviço de identidade: OpenIddict já administra os contratos OAuth.
