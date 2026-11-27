# Estrutura do servidor de produção

Este guia registra onde ficam as publicações, as configurações e os arquivos persistentes da VM.
Os conteúdos dos segredos e as chaves privadas ficam fora do repositório.

## Aplicações publicadas

```text
/srv/agenza/
├── frontend/
│   ├── releases/<versao>/
│   └── current -> releases/<versao>
└── backend/
    ├── identity/
    │   ├── releases/<versao>/
    │   └── current -> releases/<versao>
    ├── api/
    │   ├── releases/<versao>/
    │   └── current -> releases/<versao>
    └── mcp/
        ├── releases/<versao>/
        └── current -> releases/<versao>
```

`releases` guarda os pacotes de cada publicação. `current` é o link simbólico para a versão em uso:
o Nginx lê o frontend por esse link, e as unidades systemd executam os backends pelos respectivos
links. O usuário de publicação é `ubuntu`; os três backends executam com o usuário `agenza-app`.
O frontend é estático e é servido pelo Nginx, com worker `www-data`.

Após confirmar uma publicação, os publicadores mantêm a versão atual e até duas anteriores. Em caso
de falha, restauram a publicação anterior quando ela existe. Esse rollback abrange os arquivos da
aplicação; alterações no banco precisam de recuperação própria.

## Configurações e segredos

```text
/etc/agenza/
├── identity.env
├── api.env
├── mcp.env
└── identity/
    ├── signing.pfx
    └── encryption.pfx
```

Cada backend tem seu próprio arquivo `.env`, referenciado por `EnvironmentFile` na unidade systemd.
O systemd lê o arquivo ao iniciar o processo e entrega as variáveis à aplicação. Os arquivos
pertencem a `root:root`, com permissão `600`; a edição exige `sudo`.

As conexões ficam em `ConnectionStrings__Default`. Identity usa a role PostgreSQL `identity_app`;
API e MCP usam `services_app`, com a mesma conexão em arquivos separados. Outras configurações
hierárquicas do .NET também usam `__` entre os níveis. Alterações nesses arquivos entram em vigor
no próximo início do serviço correspondente.

Os PFX são as credenciais de assinatura e criptografia do Identity. A pasta pertence a
`root:agenza-app`, com permissão `750`, e os certificados têm permissão `640`. As senhas dos PFX
permanecem no arquivo de ambiente do Identity. Esses certificados são preservados entre releases.

Os valores públicos são versionados nos arquivos de produção do
[Identity](../backend/services/identity-service/IdentityService.Api/appsettings.Production.json), da
[API](../backend/services/services-service/ServicesService.Api/appsettings.Production.json) e do
[MCP](../backend/services/services-service/ServicesService.Mcp/appsettings.Production.json).
Configurações editadas dentro de uma release podem ser substituídas na próxima publicação.

## Dados persistentes

As pastas `/var/lib/agenza/app`, `/var/lib/agenza/identity`, `/var/lib/agenza/api` e
`/var/lib/agenza/mcp` foram preparadas para dados persistentes das aplicações, fora das releases.
Pertencem a `agenza-app:agenza-app`, com permissão `700`. O uso dessas áreas depende da configuração
de cada aplicação; criar a pasta, por si só, não configura armazenamento.

O diretório do cluster PostgreSQL instalado é `/var/lib/postgresql/18/main`. Ele é independente
dessas pastas e não faz parte dos pacotes publicados. As regras de schema, roles e bootstrap ficam
nas [decisões de plataforma](decisions/platform.md).

## Nginx e serviços

| Local | Finalidade |
| --- | --- |
| `/etc/nginx/sites-available/agenza` | Configuração dos sites e encaminhamento aos backends locais. |
| `/etc/nginx/sites-enabled/agenza` | Link que habilita a configuração do site. |
| `/etc/nginx/conf.d/cloudflare-realip.conf` | Recuperação global do IP real da Cloudflare para os sites do Nginx. |
| `/etc/nginx/tls/agenza.crt` | Certificado TLS usado pelo Nginx. |
| `/etc/nginx/tls/agenza.key` | Chave privada TLS, pertencente ao root e com permissão `600`. |
| `/etc/systemd/system/agenza-identity.service` | Unidade do Identity. |
| `/etc/systemd/system/agenza-api.service` | Unidade da API. |
| `/etc/systemd/system/agenza-mcp.service` | Unidade do MCP. |

O Nginx termina o HTTPS e encaminha as requisições aos backends em loopback. Seus certificados TLS
são distintos dos certificados de tokens do Identity. Os logs dos backends ficam no journal do
systemd.

## Publicador no computador de publicação

A pasta operacional `oracle/` fica fora do repositório e mantém scripts e chaves separados:

```text
oracle/
├── publicador/
│   ├── publicar-frontend.ps1 + publicar-frontend.local.json
│   ├── publicar-identity.ps1 + publicar-identity.local.json
│   ├── publicar-api.ps1 + publicar-api.local.json
│   └── publicar-mcp.ps1 + publicar-mcp.local.json
├── chaves/
├── acessar VM.ps1
├── tunnel.ps1
└── tunnel.local.json
```

Os JSON dos publicadores guardam caminhos e endereços públicos. `tunnel.local.json` centraliza os
dados de conexão SSH e referencia a chave em `chaves/`. Os publicadores geram os pacotes no
computador de publicação e os enviam por SSH; os segredos da aplicação permanecem na VM.

## Consultas rápidas na VM

```bash
readlink -f /srv/agenza/backend/mcp/current
sudo systemctl status agenza-identity.service agenza-api.service agenza-mcp.service --no-pager
sudo journalctl -u agenza-mcp.service --since "10 min ago" -f
```

Para consultar outro backend, troque o nome da unidade. No acompanhamento de logs, `Ctrl+C` encerra
apenas a consulta. Ao compartilhar logs, remova tokens, senhas e outros dados sensíveis.
