# Validação desta atualização — 7 de outubro de 2026

## Resultado

Código compilado e fluxos principais exercitados com API Node e banco MariaDB locais isolados. Não houve publicação, compra, chamada real de IA ou envio real de e-mail.

| Verificação | Resultado |
|---|---|
| TypeScript do backend e frontend | Aprovado |
| Exportação Expo para web | Aprovada |
| Exportação do bundle Android/Hermes | Aprovada; não equivale a APK/AAB nativo assinado |
| Testes existentes de API | 106 aprovados |
| Regressões existentes: isolamento, concorrência, recuperação de senha e exclusão | 36 aprovadas |
| Cly/assinaturas com provedores simulados | 36 aprovadas |
| Contratos/falhas dos provedores existentes | Aprovados com simulação |
| Marketplace novo | 45 verificações aprovadas |
| Suporte novo | 20 verificações aprovadas, e-mail simulado |
| Conversão de valores monetários | 12 casos aprovados, incluindo vírgula, ponto e agrupamento brasileiro |
| Interface no Chromium | 17 verificações aprovadas |
| Arquivos de publicação protegidos | Conteúdo idêntico ao ZIP recebido |
| Arquivos originais removidos | Nenhum |
| Dependências originais removidas | Nenhuma |

## Testes do marketplace

- Aceite de regras antes de publicar; localização arredondada; perfil não expõe e-mail.
- Distância e filtro por categoria; lista não revela detalhes além da cota.
- Propostas privadas; titular só vê a própria e contratante vê as recebidas.
- Dono não propõe no próprio anúncio; terceiros não aceitam nem abrem conversas alheias.
- Aceites concorrentes não criam dois trabalhos; não se escolhem dois profissionais.
- Mensagens restritas às partes; denúncia não abre conversa de terceiros.
- Mudança de valor exige confirmação da outra parte; conclusão aguarda resolver termos pendentes.
- Conclusão bilateral; avaliação única por participante e vinculada a serviço concluído.
- Importação idempotente ao CRM; segundo trabalho reutiliza cliente; recorrência reconhecida.
- Recebimento sem duplicação, inclusive quando há venda no CRM para a oportunidade importada.
- Bloqueio bilateral, denúncias persistentes sem e-mail, autorização de moderadores, ocultação e suspensão/restauração.
- Quotas de publicações e visualizações resistem a concorrência; sexta proposta Free recusada; upgrade libera mais detalhes.
- Metas bloqueadas para Free e salvas no Pro; Pro/Plus com clientes e orçamentos ilimitados.
- Exportação sem segredos; imagem inválida rejeitada; campos extras não permitem escolher dono do anúncio.
- Exclusão da conta remove trabalhos compartilhados e registros dependentes no banco de teste.

## Telas verificadas

Com duas contas distintas no navegador: aceite de regras, perfil profissional, publicação de oportunidade, envio/aceite de proposta, conversa, importação de cliente, conclusão pelas duas partes, avaliação e registro de recebimento.

O teste também conferiu: tema inicial claro mesmo com sistema escuro; persistência da escolha escura; totais reais vindos da API; suporte preservando relato após falha; retentativa sem trocar identificador; sugestão usando categoria correta; ausência de erro JavaScript e de extravasamento horizontal nas telas principais em 320 px. Capturas revisadas em `docs/previews-marketplace/` mostram dados fictícios criados exclusivamente pelo teste, que foram apagados ao terminar.

A API e o banco desses fluxos eram reais no ambiente local. Só o envio de suporte foi simulado no teste de interface.

## Preservação

Foram comparados os 251 arquivos do ZIP original. Nenhum foi eliminado. Permanecem iguais: `frontend/app.json`, `frontend/eas.json`, identificadores Android, configuração de assinatura existente, Dockerfile, arquivos `deploy`, scripts de preparação/verificação de publicação, configuração Babel/TypeScript e conteúdo legal anterior.

Adição de dependência: `expo-document-picker`, para seleção opcional de imagens. Não foi retirada nenhuma dependência existente. `Button`/`ScreenHeader` receberam parâmetros opcionais para quebra de linha, conservando o padrão usado pelas telas antigas.

## Pendências concretas para a Play Store

O comando original `npm run check:release` **ainda bloqueia a publicação** com os dados recebidos. Ele aponta:

1. URL HTTPS real da API ainda não configurada.
2. Dados reais do responsável pela privacidade ainda não preenchidos.
3. Prazos reais de retenção de logs/backups ainda não informados.
4. `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` ainda ausente.

Esses valores não foram inventados, e os verificadores não foram contornados. Além disso, o lançamento exige testar entrega de e-mail, recuperação de senha, compras/reembolsos e IA com suas contas reais; configurar moderadores; revisar as declarações de dados para as funções novas; gerar e testar APK/AAB assinado e realizar o processo da sua conta Play Console.

Não foram verificados em aparelho físico: compras, push remoto, seletor nativo de imagens, teclado Android, permissões e instalação do AAB. As notificações locais antigas continuam no projeto, mas este módulo não adiciona push remoto de conversa.

## Reproduzir os testes

Use somente um banco isolado com `test` no nome, `NODE_ENV=development` e API apontada para esse mesmo banco. Na pasta backend, após migração e com a API de teste rodando:

```powershell
npm run build
npm run test:api
npm run test:release
npm run test:cly
npm run test:providers
npm run test:market
npm run test:support
```

Os scripts criam contas de teste e tentam apagá-las ao final. Nunca execute seeds/reset ou esses testes no ambiente dos seus usuários. O guia de uso normal está em `COMECE-POR-AQUI-MARKETPLACE.md`.
