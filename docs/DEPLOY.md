> Documento de referência anterior. Para o estado atual, preços, integrações e bloqueios, siga ATUALIZACAO-CLY.md e ENTREGA-PUBLICACAO.md.

> Atualização 03/10/2026: use LEIA-ME-PRIMEIRO.md e docs/ENTREGA-PUBLICACAO.md como roteiro principal. Configure o envio de recuperação por Resend e publique /excluir-conta. Os comandos de Docker precisam incluir --env-file backend/.env. Assinaturas pagas não estão disponíveis.

# Como publicar o Clyvo

Guia completo para tirar o Clyvo do seu computador e colocar no ar: a API
em um servidor, o app na Play Store e a versao web em um endereco publico.

Leia na ordem. Cada parte depende da anterior.

- [Parte 0 - O que voce vai precisar](#parte-0---o-que-voce-vai-precisar)
- [Parte 1 - Colocar a API no ar](#parte-1---colocar-a-api-no-ar)
- [Parte 2 - Publicar a versao web](#parte-2---publicar-a-versao-web)
- [Parte 3 - Gerar o app Android](#parte-3---gerar-o-app-android)
- [Parte 4 - Enviar para a Play Store](#parte-4---enviar-para-a-play-store)
- [Parte 5 - Atualizar depois de publicado](#parte-5---atualizar-depois-de-publicado)
- [Se der errado](#se-der-errado)

---

## Parte 0 - O que voce vai precisar

Antes de comecar, separe:

| O que | Quanto custa | Por que |
|---|---|---|
| Um dominio (ex.: `clyvo.com.br`) | ~R$ 40/ano no registro.br | A Play Store exige um endereco publico da politica de privacidade |
| Uma hospedagem para a API + MySQL | R$ 0 a R$ 30/mes | E onde o backend vai rodar |
| Conta de desenvolvedor Google Play | US$ 25, pagamento unico | Obrigatoria para publicar |
| Conta no Expo (expo.dev) | Gratuita | Gera o arquivo do app na nuvem, sem precisar instalar Android Studio |

**Sobre a conta do Expo:** desta vez ela e obrigatoria. Para testar no
navegador voce conseguiu passar sem ela, mas o build do Android acontece
nos servidores do Expo e eles precisam saber de quem e o app. E gratuita
e leva um minuto.

### Antes de tudo: preencha seus dados

Abra o arquivo abaixo e troque os valores do bloco `COMPANY`:

```
frontend/src/features/legal/legal-content.ts
```

```ts
export const COMPANY = {
  name: 'Clyvo',                          // seu nome ou razao social
  document: 'CNPJ 00.000.000/0001-00',    // seu CNPJ de MEI
  city: 'Brasil',                         // sua cidade e estado
  email: 'contato@clyvo.com.br',          // um e-mail que voce leia
  site: 'https://clyvo.com.br',           // seu dominio
};
```

Isso alimenta ao mesmo tempo as telas do app, as paginas do site e os
arquivos `docs/POLITICA-DE-PRIVACIDADE.md` e `docs/TERMOS-DE-USO.md`.
Depois de editar, rode uma vez, na pasta raiz do projeto:

```
node scripts/make-legal-docs.mjs
```

---

## Parte 1 - Colocar a API no ar

Escolha **um** dos tres caminhos. O primeiro e o mais facil.

### Caminho A - Railway (mais facil, recomendado para comecar)

O Railway sobe a API e o MySQL juntos, sem voce mexer em servidor.
Tem um plano gratuito para testar e depois custa a partir de US$ 5/mes.

**1.** Coloque o projeto no GitHub. Se voce nunca usou Git, crie uma conta
em github.com, clique em **New repository**, nome `clyvo`, marque
**Private**, e siga a tela "push an existing repository".

**2.** Em railway.app, clique em **New Project** > **Deploy from GitHub repo**
e escolha o `clyvo`.

**3.** No mesmo projeto, clique em **New** > **Database** > **Add MySQL**.

**4.** Clique no servico da API, aba **Variables**, e cole as variaveis do
arquivo `backend/.env.production.example`, uma por linha. Os valores do
banco o Railway ja oferece prontos: clique em **Add a Reference** e escolha
`MYSQL_URL`... ou preencha na mao com o que aparece na aba do MySQL:

```
DB_HOST      = valor de MYSQLHOST
DB_PORT      = valor de MYSQLPORT
DB_USER      = valor de MYSQLUSER
DB_PASSWORD  = valor de MYSQLPASSWORD
DB_NAME      = valor de MYSQLDATABASE
DB_SSL       = true
```

**5.** Gere os dois segredos do JWT. No seu computador, no `cmd`:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Rode **duas vezes** e cole cada resultado em `JWT_ACCESS_SECRET` e
`JWT_REFRESH_SECRET`. Eles precisam ser diferentes entre si.

**6.** Em **Settings** > **Networking**, clique em **Generate Domain**.
Voce recebe um endereco tipo `clyvo-production.up.railway.app`.

**7.** Volte em **Variables** e ajuste:

```
CORS_ORIGIN = https://app.clyvo.com.br
```

(Se voce ainda nao tem dominio, use o endereco que o Railway gerou para o
site. Nunca deixe `*` - a API se recusa a subir assim em producao.)

**8.** Crie as tabelas. No Railway, aba do servico da API, clique nos tres
pontinhos e depois em **Shell** (ou use o terminal local do Railway CLI):

```
npm run db:migrate:prod
```

**Voce deve ver:** uma lista de tabelas criadas, terminando em
`Migration concluida`.

**9.** Teste. Abra no navegador:

```
https://SEU-ENDERECO.up.railway.app/health
```

**Voce deve ver:** um JSON com `"status":"ok"`.

---

### Caminho B - Render

Muito parecido com o Railway, mas o Render **nao oferece MySQL**. Voce
precisa de um banco em outro lugar (PlanetScale, Aiven ou Clever Cloud
tem planos gratuitos de MySQL).

1. Em render.com: **New** > **Web Service** > conecte o repositorio.
2. Em **Build Command**, coloque: `cd backend && npm ci && npm run build`
3. Em **Start Command**, coloque: `cd backend && node dist/server.js`
4. Em **Environment**, cole as variaveis do `.env.production.example`,
   com os dados do banco que voce criou a parte.
5. Rode a migration uma vez pelo **Shell** do Render.

---

### Caminho C - VPS proprio (Hostinger, Contabo, DigitalOcean)

Mais barato a longo prazo e mais trabalhoso. So vale a pena se voce ja
tem alguma familiaridade com Linux.

O projeto ja vem com tudo pronto na pasta `deploy/`:

| Arquivo | Para que serve |
|---|---|
| `deploy/docker-compose.yml` | Sobe API + MySQL com um comando |
| `deploy/ecosystem.config.js` | Mantem a API no ar com PM2 (sem Docker) |
| `deploy/nginx-clyvo.conf` | Coloca o HTTPS na frente e serve o site |
| `Dockerfile` | Receita da imagem da API |

**Com Docker (mais simples):**

```
git clone SEU-REPOSITORIO clyvo
cd clyvo
cp backend/.env.production.example backend/.env
nano backend/.env
```

Preencha o `.env` (principalmente `DB_PASSWORD`, os dois `JWT_*` e o
`CORS_ORIGIN`), salve com `Ctrl+O` e saia com `Ctrl+X`. Depois:

```
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml exec api npm run db:migrate:prod
```

**Sem Docker, com PM2:**

```
cd clyvo/backend
npm ci --omit=dev
npm run build
npm run db:migrate:prod
pm2 start ../deploy/ecosystem.config.js
pm2 save
pm2 startup
```

O `pm2 startup` imprime uma linha comecando com `sudo`. Copie essa linha e
rode - e ela que faz a API voltar sozinha se o servidor reiniciar.

**HTTPS:**

```
sudo cp deploy/nginx-clyvo.conf /etc/nginx/sites-available/clyvo
sudo ln -s /etc/nginx/sites-available/clyvo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.clyvo.com.br -d app.clyvo.com.br
```

Antes disso, no painel do seu dominio, aponte `api` e `app` para o IP do
servidor (registro do tipo `A`).

---

## Parte 2 - Publicar a versao web

A versao web e o mesmo app rodando no navegador. Ela serve para duas
coisas: seus clientes usarem no computador, e dar um endereco publico
para a politica de privacidade que a Play Store vai pedir.

**1.** No seu computador, entre na pasta `frontend`:

```
cd frontend
```

**2.** Crie o arquivo de producao:

```
copy .env.production.example .env.production
```

**3.** Abra o `.env.production` no Bloco de Notas e troque o endereco pelo
da sua API, **com `/api` no final**:

```
EXPO_PUBLIC_API_URL=https://clyvo-production.up.railway.app/api
```

**4.** Gere os arquivos do site:

```
npm run build:web
```

**Voce deve ver:** ao final, `Exported: dist`. Aparece uma pasta `dist`
dentro de `frontend`.

**5.** Suba a pasta `dist`. O jeito mais rapido e o Netlify:

- Entre em netlify.com e crie uma conta gratuita.
- Clique em **Add new site** > **Deploy manually**.
- Arraste a pasta `frontend/dist` para dentro da area indicada.

Em segundos voce recebe um endereco tipo `clyvo-app.netlify.app`.

**Alternativa - Vercel:**

```
npx vercel --prod dist
```

**6. Passo importante:** volte na configuracao da sua API e coloque o
endereco do site no `CORS_ORIGIN`. Sem isso, o site abre mas nao consegue
entrar - o navegador bloqueia a chamada.

```
CORS_ORIGIN=https://clyvo-app.netlify.app
```

**7.** Anote estes dois enderecos. Voce vai precisar deles na Play Store:

```
https://SEU-SITE/privacidade
https://SEU-SITE/termos
```

---

## Parte 3 - Gerar o app Android

O arquivo que a Play Store aceita chama-se **AAB** (Android App Bundle).
Ele e gerado nos servidores do Expo - voce nao precisa instalar Android
Studio nem nada pesado.

**1.** Crie sua conta gratuita em expo.dev.

**2.** No `cmd`, dentro da pasta `frontend`:

```
npm install -g eas-cli
```

**3.** Entre na sua conta:

```
eas login
```

**4.** Vincule o projeto a sua conta:

```
eas init
```

**Voce deve ver:** uma pergunta confirmando o nome `clyvo`. Responda `y`.
Isso escreve um `projectId` dentro do `app.json` automaticamente - e
normal o arquivo mudar.

**5.** Aponte o app para a sua API de producao. Abra o `eas.json` e troque
as duas linhas `EXPO_PUBLIC_API_URL` pelo endereco real:

```json
"production": {
  "env": {
    "APP_ENV": "production",
    "EXPO_PUBLIC_API_URL": "https://clyvo-production.up.railway.app/api"
  }
}
```

**6.** Antes do arquivo final, gere um APK de teste e instale no seu
celular para ver se tudo funciona de verdade:

```
npm run build:android:apk
```

O Expo pergunta se pode gerar uma chave de assinatura (**keystore**).
Responda **y** - ele guarda a chave com seguranca na conta de voces.

**Voce deve ver:** depois de uns 10 a 15 minutos, um link. Abra o link no
celular e instale o APK. O Android vai avisar que e de "fonte
desconhecida"; e normal em teste, aceite.

**Teste no celular antes de continuar:** criar conta, cadastrar cliente,
criar oportunidade, gerar proposta em PDF. Se algo nao carregar, quase
sempre e o `EXPO_PUBLIC_API_URL` errado ou o `CORS_ORIGIN` da API.

**7.** Com tudo funcionando, gere o arquivo de publicacao:

```
npm run build:android
```

**Voce deve ver:** ao final, um link para baixar um arquivo `.aab`.
Baixe e guarde.

---

## Parte 4 - Enviar para a Play Store

**1.** Em play.google.com/console, pague os US$ 25 e crie sua conta de
desenvolvedor. A verificacao de identidade leva de 1 a 3 dias.

**2.** Clique em **Criar app**:

| Campo | O que colocar |
|---|---|
| Nome do app | Clyvo |
| Idioma padrao | Portugues (Brasil) |
| App ou jogo | App |
| Gratuito ou pago | Gratuito |

> O app e gratuito mesmo tendo planos pagos: a cobranca e da assinatura
> dentro do app, nao do download.

**3.** Preencha o **Painel de conteudo**. A Play Store nao libera nada
antes disso. Os campos que pedem texto:

**Descricao curta (ate 80 caracteres):**

```
Transforme conversas em vendas. Clientes, propostas e follow-up no bolso.
```

**Descricao completa:** use o texto pronto em
[`docs/PLAY-STORE.md`](./PLAY-STORE.md).

**4.** **Politica de Privacidade:** cole o endereco que voce anotou na
Parte 2:

```
https://SEU-SITE/privacidade
```

**5.** **Seguranca dos dados** - este questionario e o que mais confunde.
As respostas certas para o Clyvo:

| Pergunta | Resposta |
|---|---|
| Seu app coleta ou compartilha dados? | Sim, coleta |
| Os dados sao criptografados em transito? | Sim |
| O usuario pode pedir a exclusao dos dados? | Sim |
| Tipos coletados | Nome, e-mail, telefone, informacoes do app |
| Finalidade | Funcionalidade do app, gerenciamento de conta |
| Os dados sao compartilhados com terceiros? | Nao |

**6.** **Classificacao de conteudo:** responda o questionario. O Clyvo se
enquadra em **Livre para todos** - nao tem violencia, conteudo sexual,
jogos de azar nem conteudo gerado por usuarios para o publico.

**7.** **Publico-alvo:** marque apenas **18 anos ou mais**.

**8.** Va em **Versoes** > **Testes internos** > **Criar nova versao**,
envie o arquivo `.aab` e adicione seu proprio e-mail como testador.
Instale pelo link que a Play Store envia e confira tudo mais uma vez.

**9.** Quando estiver satisfeito: **Producao** > **Criar nova versao** >
enviar o mesmo `.aab` > **Enviar para revisao**.

A primeira revisao costuma levar de 3 a 7 dias. Recusas mais comuns em
apps como o Clyvo: politica de privacidade fora do ar, ou o questionario
de Seguranca dos dados nao batendo com o que a politica diz.

---

## Parte 5 - Atualizar depois de publicado

### Mudanca so no visual ou em texto do app

Voce nao precisa passar pela revisao da Play Store de novo. Use
atualizacao pelo ar:

```
cd frontend
eas update --branch production --message "Ajuste na tela de clientes"
```

Quem ja tem o app instalado recebe a mudanca na proxima vez que abrir.

### Mudanca que exige novo build

Se voce mudar dependencias, permissoes ou o `app.json`, precisa gerar um
novo `.aab`. O `eas.json` esta com `autoIncrement: true`, entao o numero
da versao sobe sozinho - voce so precisa atualizar o `version` no
`app.json` quando quiser mudar o que aparece para o usuario:

```json
"version": "1.1.0"
```

Depois:

```
npm run build:android
```

E enviar o novo arquivo na Play Store.

### Mudanca no backend

Railway e Render: basta dar `git push`. Eles reconstroem sozinhos.

VPS com Docker:

```
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

VPS com PM2:

```
git pull
cd backend && npm ci --omit=dev && npm run build
pm2 restart clyvo-api
```

**Se voce mudou o `database/schema.sql`,** rode a migration depois:

```
npm run db:migrate:prod
```

> Atencao: `db:reset` apaga tudo. Nunca rode isso em producao.

---

## Se der errado

| O que aparece | O que e | Como resolver |
|---|---|---|
| `A API nao subiu porque a configuracao de producao esta insegura` | Uma trava de seguranca do proprio Clyvo | A mensagem lista exatamente o que falta. Normalmente e o `CORS_ORIGIN=*` ou um `JWT_*` ainda com o texto de exemplo |
| O app abre mas nao carrega nada | `EXPO_PUBLIC_API_URL` errado | Confira se tem `https://` no inicio e `/api` no fim |
| No navegador: `blocked by CORS policy` | O endereco do site nao esta liberado na API | Coloque o endereco exato do site em `CORS_ORIGIN`, sem barra no final |
| `ER_ACCESS_DENIED_ERROR` | Usuario ou senha do banco errados | Confira `DB_USER` e `DB_PASSWORD` |
| `ETIMEDOUT` ao conectar no banco | Banco gerenciado exigindo TLS | Coloque `DB_SSL=true` |
| `eas build` reclama de `projectId` | Faltou vincular o projeto | Rode `eas init` dentro de `frontend` |
| Abrir `/privacidade` direto da 404 no site | Servidor nao esta redirecionando para o `index.html` | No Netlify e automatico. No nginx, e a linha `try_files` do arquivo de exemplo |
| Login para de funcionar depois de uma atualizacao | Voce trocou os segredos do JWT | E esperado: todo mundo precisa entrar de novo |

### Antes de publicar, confira esta lista

- [ ] Bloco `COMPANY` preenchido com dados reais
- [ ] `/privacidade` e `/termos` abrindo no ar
- [ ] `CORS_ORIGIN` sem `*` e com o endereco certo
- [ ] Segredos JWT gerados, diferentes entre si, e fora do Git
- [ ] `backend/.env` **nao** foi enviado para o GitHub
- [ ] Testou criar conta, cliente, oportunidade e PDF no APK de teste
- [ ] Trocou a senha da conta de demonstracao (`SEED_USER_PASSWORD`)

### O que ainda falta implementar

O checkout dos planos pagos ainda nao existe. A estrutura de planos,
limites e preco de fundador esta toda pronta no banco e na tela de
planos, mas nao ha cobranca de verdade ate escolhermos o gateway
(Asaas ou Mercado Pago, provavelmente). Voce pode publicar assim: todo
mundo entra no plano Free e os planos pagos ficam visiveis como "em
breve". Isso e comum em lancamento e a Play Store aceita.
