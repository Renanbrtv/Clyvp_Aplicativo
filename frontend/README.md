> Atualizacao de 05/10/2026: siga LEIA-ME-PRIMEIRO.md e docs/ATUALIZACAO-CLY.md na raiz para precos, configuracao e estado atual. Este texto contem referencias historicas.

# Clyvo — App (Etapa 2)

Aplicativo mobile em **React Native + Expo + TypeScript**, no design aprovado
(`../docs/DESIGN.md`), conversando com a API da Etapa 1.

O que já funciona, ligado ao MySQL de verdade:

- Abertura com restauração automática da sessão
- Login, cadastro e recuperação de senha
- Onboarding em 2 perguntas (o que você vende / seu objetivo)
- Dashboard **Início** com vendas do mês, variação, oportunidades em aberto,
  negociações, aguardando resposta e a lista "Precisa da sua atenção"
- Botão **Entrar em contato** que abre o WhatsApp com a mensagem pronta
- Tab bar **Início · Oportunidades · Clientes · Resultados · Perfil**
- Perfil com dados da empresa, plano e sair da conta
- Renovação automática do token quando o access token vence

---

## Antes de começar

O backend precisa estar rodando:

```
cd ..\backend
npm run dev
```

O **celular e o computador precisam estar na mesma rede Wi-Fi**. O app descobre
sozinho o IP do computador (é o mesmo que aparece no QR Code do Expo) e monta o
endereço da API: `http://SEU_IP:3333/api`.

> Se precisar apontar para outro endereço, crie um arquivo `.env` aqui dentro com:
> `EXPO_PUBLIC_API_URL=http://192.168.0.10:3333/api`

---

## Instalação

```bash
cd frontend
npm install
npx expo install --fix
```

O projeto tem um `.npmrc` com `legacy-peer-deps=true`. Sem ele, o `npx expo
install` falha em conflito de peer dependency — ele chama o npm sem a flag.

Vários pacotes estão com `"*"` no `package.json` de propósito: o
`npx expo install --fix` grava a versão certa para o SDK que você tiver
instalado. Rode-o depois de todo `npm install`.

### Se o Expo Go reclamar de versão

O Expo Go da loja acompanha sempre o SDK mais recente e não dá para instalar
uma versão antiga no iPhone. Se aparecer "Project is incompatible with this
version of Expo Go", suba o projeto:

```bash
npx expo install expo@^<versão que o erro pedir>
npx expo install --fix
npx expo start --clear
```

## Rodando

```bash
npx expo start
```

Um QR Code aparece no terminal. Então:

- **No celular:** instale o **Expo Go** (Play Store / App Store) e escaneie o
  QR Code. No Android, use o próprio Expo Go para ler; no iPhone, a câmera.
- **No emulador Android:** aperte `a` no terminal.
- **No navegador:** aperte `w` (útil para ver o layout, mas o SecureStore usa
  `localStorage` nesse modo).

Para testar, entre com uma das contas do seed:

| E-mail | Senha |
|---|---|
| `renan@clyvo.app` | `Clyvo@2025` |
| `maria@clyvo.app` | `Clyvo@2025` |

A conta do Renan já vem com pipeline preenchido, então o dashboard aparece com
números. A da Maria mostra o cenário de quem está começando.

---

## Estrutura

```
frontend/
├── app/                        rotas (expo-router — arquivo = tela)
│   ├── _layout.tsx             AuthProvider + navegação raiz
│   ├── index.tsx               splash e redirecionamento
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── cadastro.tsx
│   │   └── esqueci-senha.tsx
│   ├── onboarding.tsx
│   └── (tabs)/
│       ├── _layout.tsx         tab bar desenhada à mão
│       ├── index.tsx           Início (dashboard)
│       ├── oportunidades.tsx   Etapa 5
│       ├── clientes.tsx        Etapa 3
│       ├── resultados.tsx      Etapa 12
│       └── perfil.tsx
└── src/
    ├── features/
    │   ├── auth/auth-context.tsx       sessão, login, logout, onboarding
    │   └── dashboard/components/       SalesCard, StatsCard, ActionCard,
    │                                   AttentionCard, Sparkline
    └── shared/
        ├── api/
        │   ├── config.ts       descobre o IP da API sozinho
        │   ├── client.ts       fetch + refresh automático de token
        │   ├── auth.api.ts     endpoints
        │   └── types.ts        tipos da API + ApiError
        ├── components/         Button, Input, Card, Badge, Avatar, Screen,
        │                       AppHeader, estados de loading/erro/vazio
        ├── storage/            tokens no Keychain / Keystore
        ├── theme/              design system (cores, tipografia, espaçamento)
        └── utils/format.ts     moeda, telefone, tempo relativo, link do WhatsApp
```

Regra que vale para toda tela nova: **nada de cor ou tamanho escrito à mão** —
tudo sai de `theme`.

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| "Não foi possível falar com o servidor" | Backend desligado | `cd ..\backend && npm run dev` |
| Mesma mensagem, backend ligado | Celular em outra rede | Conecte os dois no mesmo Wi-Fi |
| Mesma mensagem no Windows | Firewall bloqueando a porta 3333 | Libere o Node no Firewall do Windows quando ele perguntar |
| Emulador Android não conecta | `localhost` do emulador | O app já usa `10.0.2.2`; se persistir, use `EXPO_PUBLIC_API_URL` |
| Tela branca ao abrir | Cache do Metro | `npx expo start --clear` |
| Aviso de versão incompatível | SDK diferente do esperado | `npx expo install --fix` |
| `Unable to resolve module` | Dependência faltando | `npm install --legacy-peer-deps` de novo |
