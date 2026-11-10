# Clyvo Admin

Interface web independente, servida em `/admin/` pelo backend existente. Usa os mesmos usuários e dados do marketplace, com autorização administrativa separada. Não há senha fixa, cadastro público de administradores ou dados fictícios na interface.

## O que foi implementado

- Dashboard com contagens reais e crescimento mensal de cadastros.
- Pesquisa global limitada às permissões do operador, filtros e paginação.
- Consulta de usuários, suspensão e reativação com justificativa e revogação de sessões.
- Moderação de publicações e perfis: aprovação, reprovação, solicitação de correções e suspensão; decisões exigem justificativa e conferem a revisão do conteúdo para evitar sobrescritas concorrentes.
- Denúncias com consulta do conteúdo e encerramento registrado.
- Profissionais, avaliações, propostas do marketplace e assinaturas em modo de consulta.
- Administradores com funções e histórico de ações. Configurações mostram os parâmetros efetivamente implementados; não há botões simulados.

As propostas deste painel são as propostas do marketplace, não os orçamentos privados do CRM. A cobrança permanece no fluxo existente. O painel não coleta cartões. A Cly não é ativada por esta mudança.

## Preparar desenvolvimento

Instale as dependências existentes em `backend` com `npm ci`. O admin reutiliza o compilador TypeScript do backend e não acrescenta dependências de execução.

```sh
npm --prefix backend run typecheck
npm --prefix backend run test:admin
npm --prefix backend run build
npm --prefix admin run build
```

Use um MySQL local isolado, com banco terminado em `_admin_test`, e as migrações existentes do projeto para criar o esquema completo. Nunca copie credenciais de produção para esse ambiente. Configure também as variáveis obrigatórias descritas no backend.

```sh
cd backend
NODE_ENV=test DB_HOST=127.0.0.1 DB_NAME=clyvo_admin_test npm run test:admin:integration
```

O teste rejeita outros ambientes antes de abrir conexão. Cria contas temporárias, exercita decisões concorrentes, visibilidade pública, denúncias e revogação; remove suas próprias fixtures ao terminar.

## Instalar em um ambiente existente

Antes de habilitar, faça backup do banco e valide em homologação. Este código não foi aplicado ao banco de produção.

1. Compile backend e admin. O Dockerfile já inclui as duas compilações.
2. Execute **somente** a migração administrativa aditiva, no diretório do backend (ou `/app` no contêiner):

```sh
node dist/scripts/admin-migrate.js
```

Ela cria quatro tabelas administrativas. Não execute a migração geral como substituta: a migração geral também contém os seeds de planos existentes.

3. Escolha uma conta ativa existente do responsável. Confira seu ID e e-mail no banco. Autorize o primeiro proprietário pelo terminal protegido do servidor:

```sh
node dist/scripts/admin-bootstrap.js EMAIL_CONFIRMADO ID_CONFIRMADO
```

Substitua os dois argumentos. O comando exige correspondência exata e recusa a criação inicial se já houver proprietário ativo. Não use automaticamente a conta de teste da Google Play. A senha é a senha existente dessa conta.

4. Configure o ambiente:

```text
ADMIN_ENABLED=true
ADMIN_ORIGIN=https://SEU-DOMINIO-DA-API
ADMIN_STATIC_DIR=/app/admin
```

`ADMIN_ORIGIN` é a origem exata, sem `/admin` e sem barra final. Em desenvolvimento pode ser `http://localhost:3000`, usando a porta real. Fora do Docker, o diretório padrão é `../admin/dist`, relativo ao diretório de execução do backend. Mantenha API e painel na mesma origem.

5. Reinicie e abra `https://SEU-DOMINIO-DA-API/admin/`. Entre com a conta autorizada. Cadastre os demais administradores pelo painel, com o menor privilégio necessário.

## Segurança e funções

- Proprietário: administração completa; moderador: conteúdo, denúncias e propostas; suporte: consultas de usuários, conteúdo e propostas; financeiro: assinaturas; auditor: consultas e auditoria.
- Sessão própria com cookie HttpOnly, Secure em produção e SameSite Strict. Token aleatório armazenado apenas como hash no banco; não usa localStorage.
- Limite de oito horas e inatividade de trinta minutos; CSRF e validação de origem em alterações; permissões reavaliadas no servidor.
- Suspensão invalida sessões do usuário. Alteração de permissões revoga sessões administrativas.
- Não é permitido remover o último proprietário ativo nem alterar o próprio acesso pelo formulário.
- Ao habilitar o admin, a moderação usa as autorizações administrativas; revise os antigos `MARKET_MODERATOR_USER_IDS` e autorize os moderadores necessários antes da ativação.
- Defina operacionalmente retenção, acesso e backup do histórico administrativo; não foi inventado um prazo nem adicionada exclusão automática de registros.

## Verificação desta entrega

Typecheck e build do backend, build do admin e 97 verificações sem banco passaram. A integração com MySQL e a validação visual dos módulos autenticados em desktop/celular ainda precisam ser executadas em homologação: não havia MySQL disponível no ambiente de desenvolvimento desta entrega. Não considerar esta etapa como homologação de produção.
