# Clyvo — atualização de 5 de outubro de 2026

Este ZIP contém código para continuar os testes e preparar o lançamento. Não contém um AAB assinado nem uma publicação aprovada. Preserve sua configuração e seus dados ao atualizar.

## Atualizar no seu computador Windows

Use Node.js 22.13 ou superior dentro da série 22, ou 24.3 ou superior dentro da série 24. Confira com `node -v`.

1. Pare o backend e o Expo com Ctrl+C em cada terminal. Faça backup do banco `clyvo` no phpMyAdmin: selecione o banco, Exportar, formato SQL, Executar. Guarde o arquivo fora da pasta do projeto.
2. Extraia este ZIP numa pasta nova. Guarde a pasta anterior até confirmar os testes. Dentro da pasta extraída `clyvo`, devem aparecer `backend` e `frontend`.
3. Copie o seu arquivo `backend/.env` antigo para a pasta `backend` nova. Não envie esse arquivo a outras pessoas e não copie `node_modules`. Preserve também a configuração própria de API/Expo caso já exista. Acrescente as variáveis indicadas abaixo.
4. Ligue o WAMP. No VS Code, Arquivo → Abrir pasta → selecione a pasta `clyvo` nova. Abra Terminal → Novo terminal.
5. Execute cada comando separadamente:

```powershell
cd backend
npm ci
npm run db:migrate
npm run dev
```

`db:migrate` acrescenta as tabelas da Cly e atualiza preços e limites dos planos. Não apaga seus clientes. Não execute `db:reset` nem seeds em banco com dados reais. Usuários acima de um novo limite mantêm seus registros e não podem criar além do limite.

6. Deixe esse terminal aberto. Abra outro pelo botão + do terminal do VS Code:

```powershell
cd frontend
npm ci
npx expo start --web --clear
```

Se esse segundo terminal já abrir em `backend`, execute `cd ../frontend` no lugar de `cd frontend`.

7. Entre na sua conta. Em Perfil, abra Perguntar a Cly, Planos e assinatura, Aparência e Lembretes no celular. Compras e notificações do aparelho não funcionam no navegador do PC; as telas explicam isso.

## Ligar a Cly

No arquivo `backend/.env` (abra no VS Code), preencha somente no servidor:

```env
AI_PROVIDER=openai
AI_API_KEY=SUA_CHAVE_REAL
AI_MODEL=gpt-4.1-mini
```

Use uma conta do provedor com acesso à API e faturamento ativo. O uso tem custo para você, separado da assinatura ChatGPT. Não coloque essa chave em variáveis `EXPO_PUBLIC_`, no APK ou no Git. Reinicie o backend depois de mudar o `.env`.

A Cly pede autorização antes do primeiro envio. Só o texto digitado e instruções do assistente são enviados; a lista de clientes não é anexada automaticamente. Sugestões precisam de revisão. Não há histórico de conversas salvo pelo Clyvo. O provedor pode manter registros conforme suas políticas. Sem chave, mensagens prontas continuam disponíveis, e a geração fica indisponível de forma explícita.

## Planos desta versão

| Recurso | Free | Pro — R$ 14,99/mês | Pro Plus — R$ 30,99/mês |
|---|---|---|---|
| Clientes ativos | 5 | 100 | 500 |
| Orçamentos por mês | 5 | 100 | 300 |
| Itens de catálogo | 10 | 100 | 500 |
| Oportunidades por mês | 20 | 200 | 600 |
| Cly | 3 por rodada | 50 por mês | 150 por mês |
| Espera da Cly | 2h, depois 4h, depois 8h; máximo 8h | Até o próximo mês se esgotar | Até o próximo mês se esgotar |
| PDF | Marca Clyvo | Logo da empresa | Logo da empresa |
| Exportar dados, tema e lembretes | Sim | Sim | Sim |

As cotas mensais usam o mês civil UTC, sem acúmulo. Troca de plano não zera consumo. Depois de 7 dias sem esgotar uma rodada, a progressão Free volta a 2h. Falha do provedor não consome geração. Tentativa bloqueada não estende a espera. Contas demonstrativas antigas podem ter preços históricos; não use seed para configurar assinaturas reais. `pro_max` permanece apenas como código interno do Pro Plus.

## Ativar assinaturas reais

1. Crie o app Android no Play Console com o mesmo pacote de `frontend/app.json`. Confirme o pacote antes do primeiro envio: ele identifica seu app permanentemente na loja.
2. Configure o perfil de pagamentos. Crie duas assinaturas com IDs exatos `clyvo_pro_monthly` e `clyvo_pro_plus_monthly`. Em cada uma, crie e ative um plano básico mensal renovável. Configure no Brasil R$ 14,99 e R$ 30,99, respectivamente; revise os outros países. Não configure ofertas de teste grátis nesta primeira integração.
3. Crie um projeto no RevenueCat, adicione o app Google Play e siga a configuração oficial das credenciais da Google Play. Importe os dois produtos com seus planos básicos mensais.
4. Crie os entitlements `clyvo_pro` e `clyvo_pro_plus`, associados respectivamente aos produtos acima. Crie uma offering atual com os dois pacotes mensais. Configure a restauração para manter as compras com o App User ID original, evitando transferir benefícios para outra conta Clyvo. O servidor cria um ID aleatório por usuário; não use e-mail nem ID numérico como substituto.
5. Coloque a chave pública Android `goog_...` em `frontend/.env` como `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` e no ambiente de build correspondente no EAS. Ela é pública; não é a chave secreta.
6. No `backend/.env`, configure `REVENUECAT_SECRET_KEY` com uma chave secreta do projeto que permita consultar assinantes. Em produção, `BILLING_ALLOW_SANDBOX=false`. Somente no backend separado de testes use `true` para validar compras de licença de teste. Nunca use o backend de produção para essas simulações.
7. Reinicie o servidor e gere uma nova build Android. Compras reais exigem instalação adequada da Google Play e produtos disponíveis para o testador; não são verificadas no Expo Go nem no navegador.
8. Em uma faixa de testes da Google Play, valide compra, pendência, cancelamento pelo usuário, restauração, renovação, expiração e reembolso. Verifique no servidor que o plano muda apenas após confirmação do RevenueCat. Teste duas contas Clyvo para conferir isolamento.

A tela mostra o preço devolvido pela loja quando há uma oferta. Os valores do banco são referências, não configuram o preço cobrado pela Google. As compras são verificadas pelo backend, nunca por um botão que atribui plano diretamente. A sincronização ocorre nas chamadas autenticadas, com cache de até 1 minuto, e no botão Atualizar assinatura. Sem webhook nesta versão: cancelamentos e reembolsos aparecem na próxima sincronização; expiração conhecida cai para Free. Falhas da verificação preservam leitura, mas bloqueiam ações que precisam confirmar a cota.

Troca direta de um plano pago para outro ainda não está implementada. O app encaminha para gerenciar a assinatura existente; para trocar, cancele a renovação, aguarde expirar e assine o novo plano. Não compre duas assinaturas sobrepostas. Excluir a conta não cancela a assinatura Google Play. Não prometa benefícios de voz, equipes ou automações não implementados.

Referências: https://www.revenuecat.com/docs/getting-started/installation/expo e https://www.revenuecat.com/docs/getting-started/restoring-purchases

## Recuperação de senha por e-mail

Configure `EMAIL_API_KEY` e `EMAIL_FROM` no backend usando Resend e um remetente autorizado. O remetente de testes do fornecedor não serve para enviar a todos os usuários. Com remetente e domínio verificados, teste com um e-mail seu: Esqueci minha senha → receba o código → Redefinir senha → entre com a nova senha. Código é temporário e de uso único. As sessões antigas são invalidadas.

Sem e-mail configurado, o ambiente de desenvolvimento oferece um token de teste na resposta; ele não é um e-mail enviado. Produção precisa do serviço configurado. Testes automatizados de e-mail verificam o contrato com respostas simuladas; não comprovam entrega em caixas reais.

## Notificações no celular

Perfil → Lembretes no celular → ative → escolha o horário HH:MM → Salvar lembrete → autorize no sistema. Use Testar em 5 segundos. É uma notificação local diária, genérica, sem expor nome de cliente ou valores. Funciona pelo agendamento do sistema; não precisa de FCM, chave de push nem servidor para disparar esse lembrete. Ao sair da conta neste aparelho, o lembrete é cancelado. Desative na tela ou nas permissões do Android.

Valide numa build instalada em aparelho real, com o app aberto, fechado, após reiniciar o telefone e com economia de bateria. O horário pode sofrer atraso por restrições do sistema. Esta versão não tem push remoto de novas vendas nem lembretes individuais de cada compromisso; os avisos detalhados continuam na caixa de notificações dentro do app. Não promete alarmes exatos.

## O que falta para publicar

Hospede backend e MySQL, configure HTTPS, e-mail e provedores, execute `preparar-publicacao.cmd` para preencher responsável, retenção real de logs/backups, URL da API, URL das páginas públicas e chave pública do RevenueCat, publique as páginas públicas de privacidade e exclusão, configure Expo/EAS e Google Play, valide compra/e-mail/notificação no Android e gere o AAB assinado. O verificador de release bloqueia placeholders, falta de chave pública de cobrança e retenção não preenchida. Você não precisa criar um site comercial: pode hospedar somente essas páginas.

Leia `ENTREGA-PUBLICACAO.md`. Aprovação e eventual teste fechado obrigatório dependem da Google Play e da sua conta; terminar o código hoje não garante disponibilização pública hoje.

Para contas pessoais da Play Console criadas depois de 13/11/2023, a documentação consultada em 05/10/2026 exige teste fechado com pelo menos 12 testadores por 14 dias consecutivos antes de solicitar produção: https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR . A aprovação continua sujeita à análise do Google.
