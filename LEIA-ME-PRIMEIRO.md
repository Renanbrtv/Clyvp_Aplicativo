# Clyvo — comece aqui

O código foi corrigido. O envio para a loja ainda depende de hospedagem, contas Expo/Google, assinatura do app e teste em celular. Esta atualização inclui Cly, cotas, planos, integração de assinaturas, tema e lembretes locais. Os serviços externos precisam de configuração e teste real. Leia docs/ATUALIZACAO-CLY.md primeiro e docs/ENTREGA-PUBLICACAO.md para os bloqueios restantes.

## 1. Testar no computador

Extraia o ZIP. Abra a pasta clyvo. No Explorador, abra backend, clique na barra de endereço, digite cmd e pressione Enter.

Na janela do backend:

```bat
npm ci
```

Para uma instalação NOVA, copie a configuração de exemplo. Se já tem .env configurado, preserve seu arquivo e ajuste os novos campos conforme necessário.

```bat
copy .env.example .env
```

Ligue o WAMP. Configure as credenciais MySQL em .env. Depois:

```bat
npm run db:migrate
```

```bat
npm run dev
```

Não execute db:reset no banco com seus dados. db:migrate aplica o schema inicial; se já existe banco, faça backup e confira os resultados antes de trocar a versão.

Em outra janela, aberta na pasta frontend:

```bat
npm ci
```

```bat
npx expo start
```

O IP local continua sendo descoberto durante o desenvolvimento. Em aparelho, permita acesso ao backend na rede local.

Para dados fictícios de demonstração, somente num banco de teste:

```bat
npm run db:seed
```

## 2. Hospedar API e banco

O projeto inclui Dockerfile e deploy/docker-compose.yml. Use uma hospedagem que execute Node/Docker e ofereça MySQL persistente. Configure backup, domínio e HTTPS. Se utilizar um servidor com Docker e Nginx, copie backend/.env.production.example para backend/.env e preencha os valores reais.

Gere dois segredos diferentes e guarde-os no ambiente do servidor:

```bat
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Preencha JWT_ACCESS_SECRET e JWT_REFRESH_SECRET. Configure também banco, senha do banco, CORS_ORIGIN, SEED_USER_PASSWORD, EMAIL_API_KEY e EMAIL_FROM. Se usar Docker, inclua DB_ROOT_PASSWORD com outra senha forte.

Na raiz clyvo, no servidor:

```sh
docker compose --env-file backend/.env -f deploy/docker-compose.yml up -d --build
```

```sh
docker compose --env-file backend/.env -f deploy/docker-compose.yml exec api npm run db:migrate:prod
```

Não rode seeds de demonstração em produção. Certifique-se de que PORT=3333 quando usar este Compose. Configure o Nginx e os certificados HTTPS para seus domínios reais. Teste https://SEU-DOMINIO-DA-API/health: deve responder com banco acessível.

No Resend, verifique seu domínio e escolha remetente real. Configure EMAIL_API_KEY e EMAIL_FROM **somente no servidor**, nunca em EXPO_PUBLIC_*. Valide envio e redefinição antes dos testes da loja.

## 3. Configurar a publicação

Na raiz clyvo, dê duplo clique em preparar-publicacao.cmd. Também pode executar:

```bat
node scripts/configurar-publicacao.mjs
```

```bat
node scripts/make-legal-docs.mjs
```

```bat
node scripts/check-release.mjs
```

O assistente pede nome, documento ou Pessoa física, cidade, e-mail, site e API HTTPS. Não exige postar CPF publicamente. Use os dados reais do responsável. Configure também os domínios reais no Nginx e CORS.

Publique a web, após configurar a API:

Na pasta frontend:

```bat
npm run build:web
```

Hospede frontend/dist e confirme que /privacidade, /termos e /excluir-conta abrem sem login. A página de exclusão precisa acessar a API HTTPS real. Revise retenção de backups e texto de privacidade conforme a hospedagem utilizada.

## 4. Gerar APK e AAB pela Expo

Na pasta frontend:

```bat
npx eas login
```

```bat
npx eas init
```

O comando associa seu projeto e escreve o projectId. O código não inclui conta ou credencial de assinatura de outra pessoa.

APK para instalar e testar:

```bat
npm run build:android:apk
```

Depois de validar o APK em celular, gerar o arquivo da loja:

```bat
npm run build:android
```

A Expo pode pedir para criar a chave Android. Preserve a chave e o acesso à conta; eles são necessários para atualizações. Baixe o .aab quando a compilação terminar. Nenhum AAB está incluído neste ZIP.

## 5. Google Play Console

Crie/verifique a conta e crie o app Clyvo. Envie o AAB para a faixa de testes. Use os textos de docs/PLAY-STORE.md. Forneça conta de revisão criada na API de produção, com credenciais reais e dados fictícios. Não reutilize a senha de seed do projeto.

Confirme dados coletados: perfil/e-mail/telefone, dados comerciais/clientes e informações de diagnóstico realmente utilizadas; não copie respostas de Segurança dos dados sem conferir os serviços e a compilação final. Sem anúncios e sem compras nesta versão inicial.

Capture pelo menos duas screenshots do Android real. Ícone e destaque existentes ficam em docs/play-store. Os previews web, se presentes em docs/previews, são referências visuais com dados fictícios; não comprovam funcionamento nativo.

Se sua conta é pessoal nova, organize 12 testadores inscritos por 14 dias consecutivos no teste fechado. Depois solicite acesso à produção. Verificação, revisão e aprovação são controladas pelo Google.
