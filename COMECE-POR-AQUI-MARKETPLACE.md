# Clyvo — atualização com marketplace e suporte

Esta atualização acrescenta perfil profissional, oportunidades, propostas, trabalhos com conversa, avaliações, ganhos, metas e suporte. Os clientes, orçamentos, funil, agenda, relatórios, Cly, planos, recuperação de senha e preferências de aparência continuam no projeto.

**O ZIP contém código-fonte. Não é um AAB assinado nem comprova aprovação na Google Play.** Leia `docs/VALIDACAO-MARKETPLACE.md` para distinguir o que foi testado do que depende das suas contas reais.

## 1. Abrir a versão atualizada

1. Guarde uma cópia da sua pasta atual e faça backup do banco MySQL antes da migração.
2. Extraia este ZIP em uma pasta nova. Abra a pasta `clyvo` no VS Code: Arquivo → Abrir Pasta.
3. Copie o seu `backend/.env` e o seu `frontend/.env` da instalação anterior para as mesmas pastas desta versão. Esses arquivos privados não vêm no ZIP. Não publique senhas, chaves, arquivos de assinatura ou `google-play-key.json`.
4. Se ainda não possui `.env`, use os exemplos e o guia original `LEIA-ME-PRIMEIRO.md`. No WAMP, o MySQL deve estar ligado; o Node roda separadamente no terminal.

## 2. Atualizar o backend e o banco

No VS Code, abra Terminal → Novo Terminal. Partindo da pasta `clyvo`, execute um comando por vez:

```powershell
cd backend
npm ci
npm run db:migrate
npm run build
npm run dev
```

A migração acrescenta as tabelas `market_*` e amplia os limites de clientes e orçamentos dos planos Pro e Pro Plus. Não use `db:reset`, `--force` ou `--drop` no seu banco existente. Não rode seeds no banco dos seus usuários: são dados de demonstração, não oportunidades reais.

O terminal deve continuar aberto. Com a porta padrão, a API local fica em `http://localhost:3333/api`. O WAMP fornece o MySQL; ele não substitui o processo Node da API.

## 3. Abrir o aplicativo no PC

Abra **outro** terminal do VS Code, novamente na pasta `clyvo`:

```powershell
cd frontend
npm ci
npm run web
```

Abra o endereço exibido pelo Expo. No teste local pelo PC, o arquivo `frontend/.env` pode conter:

```env
EXPO_PUBLIC_API_URL=http://localhost:3333/api
```

Esse endereço local não serve para usuários da Play Store. No celular, use o endereço da API acessível pelo aparelho; em produção, HTTPS público. Depois de mudar a URL, reinicie o Expo com o cache limpo, se necessário: `npm run start:clear` e pressione `w`.

## 4. Conferir as novidades

- Início → Encontrar oportunidades.
- Perfil → Meu perfil profissional → preencher e escolher “Publicado no marketplace”. Antes da publicação, aceite as regras em “Meu objetivo no Clyvo”.
- Encontrar oportunidades → Publicar oportunidade.
- Use uma segunda conta para enviar proposta: o dono não pode contratar a si mesmo.
- O dono aceita uma proposta; ambos acessam o trabalho e a conversa em “Minhas propostas e trabalhos”.
- Alterar preço ou data precisa da confirmação da outra pessoa. Ambos confirmam a conclusão; depois podem avaliar.
- O profissional pode salvar o contato no CRM e, depois de receber o pagamento por fora, registrar o recebimento.
- Perfil → Meus ganhos e metas. Metas novas exigem Pro ou Pro Plus.
- Perfil → Aparência. A primeira abertura usa claro; escolhas salvas de escuro ou sistema continuam valendo.
- Perfil → Ajuda e suporte / Enviar sugestão.

O marketplace começa sem anúncios. Não foram inseridas pessoas, avaliações ou oportunidades fictícias na versão entregue.

## 5. Fazer o suporte chegar ao seu Gmail

O destinatário está fixo no código: **skybreakersstudio@gmail.com**. Os usuários não podem alterá-lo.

No arquivo **`clyvo/backend/.env`**, configure as variáveis que já existem para o Resend:

```env
EMAIL_API_KEY=sua_chave_privada_do_resend
EMAIL_FROM=Clyvo <suporte@seu-dominio-verificado>
```

Use o remetente autorizado na sua conta Resend; o endereço Gmail de destino não é automaticamente um remetente autorizado. Reinicie o backend. A mesma configuração é usada pela recuperação de senha.

Com o servidor configurado, uma pessoa autenticada seleciona categoria, preenche assunto/descrição, escolhe imagem opcional e toca em Enviar solicitação. O servidor envia ao seu Gmail, com resposta direcionada ao e-mail da conta do usuário. O protocolo confirma que o provedor aceitou o envio, não que chegou à caixa de entrada.

Se a pessoa não consegue entrar ou o envio direto está indisponível, “Abrir meu e-mail” prepara a mensagem no aplicativo de e-mail dela. **Ela ainda precisa tocar em Enviar.** Anexos nessa alternativa precisam ser adicionados manualmente.

Antes de lançar, envie uma solicitação e uma recuperação de senha usando uma conta sua real, confirme o recebimento e teste a troca de senha. Nesta entrega, o provedor foi simulado: nenhum e-mail real foi enviado.

## 6. Habilitar sua moderação

Publicações, avaliações e conversas têm denúncia; contas podem ser bloqueadas. As denúncias ficam no banco mesmo se o e-mail falhar.

1. Cadastre sua conta administrativa e confirme que ela está sob seu controle.
2. Obtenha o ID dessa conta na tabela `users` do seu banco. Confira nome e e-mail para não selecionar outra pessoa.
3. No **backend/.env**, acrescente `MARKET_MODERATOR_USER_IDS=` e, depois do sinal de igual, coloque somente os IDs dos responsáveis autorizados, separados por vírgula.
4. Reinicie a API. No início da conta autorizada aparecerá “Analisar denúncias”.

A tela permite examinar o conteúdo denunciado, ocultar conteúdo, suspender publicação de uma conta, arquivar uma denúncia com justificativa e restaurar contas. Ter o e-mail da empresa não concede esse acesso automaticamente. Defina quem atenderá as denúncias antes de abrir o marketplace ao público.

## 7. Preparar o lançamento

Os arquivos de identificação, assinatura, EAS, Docker, configuração de publicação e os documentos legais existentes foram preservados. A nova funcionalidade exige atualizar o backend e gerar uma nova compilação do aplicativo.

Antes do AAB, configure e teste na sua infraestrutura: API HTTPS/MySQL, remetente de e-mail, assinaturas Google Play/RevenueCat, chave da IA no servidor e responsáveis pela moderação. Revise o complemento `regras-mercado` e as declarações de dados para contemplar perfis, fotos, mensagens, localização aproximada, denúncias e suporte. As páginas originais não foram reescritas automaticamente porque você pediu preservação dos arquivos já preparados para publicação.

No terminal da pasta `frontend`, com suas configurações reais prontas:

```powershell
npm run check:release
npm run build:android:apk
```

Instale e teste o APK no seu Android. Para compras, use também a distribuição de teste e os produtos configurados na sua conta Google Play. Depois:

```powershell
npm run build:android
```

Esse comando depende da sua conta Expo/EAS e gera o AAB no serviço de build. Nada foi enviado à loja por esta entrega. O envio, testes exigidos pela sua conta e análise continuam no Play Console. Se o verificador apontar configuração faltante, preencha o dado real; não desative o verificador.

Mais detalhes: `docs/MARKETPLACE.md`, `docs/SUPORTE-MARKETPLACE.md` e `docs/VALIDACAO-MARKETPLACE.md`.
