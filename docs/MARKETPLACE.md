# Marketplace do Clyvo

## Fluxo implementado

Perfil profissional → anúncio de necessidade → propostas privadas → aceite → trabalho e conversa → confirmação bilateral de conclusão → avaliações → recebimento informado pelo profissional → ganhos/metas.

O profissional publica suas habilidades no perfil e encontra pedidos de serviço. O contratante publica a necessidade e escolhe uma proposta. Ter empresa ou CNPJ não é obrigatório. A proposta central é “Transforme o que você sabe fazer em dinheiro”; o CRM e a recuperação de clientes continuam disponíveis.

O aceite cria um serviço em `market_works`. O profissional escolhe se quer importar o contato e uma oportunidade para seu CRM, respeitando os limites desse módulo. A conversa e o trabalho não dependem de ter espaço livre no CRM. Repetir uma importação não duplica o contato; novos trabalhos com o mesmo contratante reutilizam o cliente já vinculado.

## Recursos e limites

| Recurso | Free | Pro — R$ 14,99/mês | Pro Plus — R$ 30,99/mês |
|---|---|---|---|
| Perfil profissional e habilidades | Sim | Sim | Sim |
| Listagem de oportunidades | Sim | Sim | Sim |
| Oportunidades distintas abertas em detalhe/mês | 50 | Sem limite | Sem limite |
| Propostas no marketplace/mês | 5 | 50 | 150 |
| Publicações de oportunidades/mês | 5 | 30 | 60 |
| Conversas de trabalhos aceitos e avaliações | Sim | Sim | Sim |
| Histórico de ganhos | Sim | Sim | Sim |
| Criar/alterar metas de renda | Não | Sim | Sim |
| Clientes ativos no CRM | 5 | Sem limite | Sem limite |
| Orçamentos do CRM/mês | 5 | Sem limite | Sem limite |
| Cly | 3 por rodada; esperas 2/4/8 horas | 50/mês | 150/mês |

Os limites novos são uma implementação concreta da proposta Free/Pro, já que o pedido não fixava quantidades para o marketplace. São definidos no backend, nunca autorizados pelo cliente. Valores dos planos, identificadores de compra e benefícios existentes da Cly foram preservados. Catálogo e oportunidades do funil continuam com seus limites anteriores. “Orçamentos ilimitados” refere-se aos documentos do CRM, não às propostas do marketplace.

Meses usam UTC. Abrir o mesmo anúncio novamente no mesmo mês não consome outro detalhe. Retirar proposta ou encerrar anúncio não devolve a cota. Ao atingir limite, o backend recusa a operação específica; o restante do app permanece acessível. Uma meta já salva continua visível após voltar ao Free.

## Privacidade, consentimento e moderação

- Todas as rotas `/api/market/*` exigem autenticação.
- Publicar perfil/anúncio, propor, conversar e avaliar exige aceite da versão das regras.
- Nome profissional, foto, habilidades, cidade, preços e avaliações publicados são visíveis a usuários autenticados. E-mail e telefone da conta não são exibidos no marketplace.
- Coordenadas opcionais são arredondadas a 2 casas decimais. Distância é aproximada em linha reta, não rota, tempo de deslocamento ou geolocalização automática.
- Propostas são acessíveis ao contratante e ao seu autor. Conversas pertencem somente aos participantes. Moderadores podem consultar o conteúdo que foi denunciado.
- Perfil: uma foto. Anúncio: até duas. Suporte: uma. PNG/JPEG até 250 KB e até 4096 pixels por lado; metadados auxiliares são removidos no backend. Não há hospedagem arbitrária de arquivos/PDFs nesse módulo.
- Denúncias persistem em `market_reports`. O e-mail é uma notificação auxiliar e pode falhar sem perder o registro. Destino: skybreakersstudio@gmail.com.
- Bloqueio bilateral impede descoberta e novas interações, sem esconder o histórico do trabalho das partes. É possível desfazer seus bloqueios no Perfil.
- Apenas IDs configurados em `MARKET_MODERATOR_USER_IDS` acessam a moderação. Não há promoção automática baseada no nome ou e-mail.
- Ocultar mensagens substitui o conteúdo mostrado aos participantes; ocultar avaliações as remove do cálculo público. Suspensão impede novas publicações e novas conversas da conta.
- Exclusão de conta usa cascatas do banco para seus registros e trabalhos compartilhados. Dados já importados ao CRM de outra conta podem persistir como cadastro dessa outra pessoa. E-mails entregues não são apagados pela exclusão SQL.
- Exportação inclui os novos registros do titular, sem credenciais, senhas ou chaves.

O complemento público está na rota `/regras-mercado`. O responsável deve integrar essas informações às declarações de dados e à política publicada antes do lançamento; os documentos anteriores foram preservados por solicitação expressa.

## Trabalhos, pagamentos e ganhos

Mudanças de preço/data criam termos pendentes; só a outra parte pode aceitá-los. A conclusão exige duas confirmações e bloqueia mudanças posteriores do combinado. Não há avaliação sem trabalho concluído e cada participante avalia uma vez.

O Clyvo **não processa o pagamento do serviço contratado**. “Registrar valor recebido” é uma declaração do profissional, disponível após a conclusão. Não cobra o cliente e não confirma movimentação bancária.

Ganhos unem vendas já registradas no CRM e recebimentos declarados no marketplace. Uma venda ativa vinculada à oportunidade importada tem prioridade para evitar contar o mesmo serviço duas vezes. No fluxo antigo, fechar uma oportunidade cria uma venda; essa semântica foi preservada. Assim, os totais são registros do usuário, não extratos financeiros conciliados.

Métricas: total registrado, mês selecionado, semana atual a partir de segunda em UTC, ticket médio do mês, trabalhos concluídos, clientes recorrentes e barras de recebimento por dia. Histórico e listas de atividade mostram até 100 itens recentes; totais incluem todos os registros. A busca pública pagina 20 resultados por vez. Conversas carregam lotes de 100 e atualizam a cada 8 segundos enquanto a tela está aberta.

## Organização do código

- `database/marketplace.sql`: tabelas novas e ampliação dos limites pagos.
- `backend/src/modules/marketplace`: validação, imagens, regras de negócio e rotas autenticadas.
- `backend/src/services/support.service.ts` e `routes/support.routes.ts`: envio ao suporte.
- `frontend/src/features/marketplace`: componentes compartilhados e cartão do início.
- `frontend/app/mercado`: busca, perfil, publicação, detalhe, propostas/trabalhos, ganhos, bloqueios, denúncia e moderação.
- `frontend/app/suporte.tsx`, `sugestoes.tsx`, `regras-mercado.tsx`: suporte e regras.
- Inserções pontuais no início, perfil, funil e onboarding; nenhuma aba antiga removida.
- `Button` e `ScreenHeader` receberam opções de quebra de linha para telas novas, mantendo o comportamento padrão das existentes.
- Primeira abertura clara; o armazenamento da preferência anterior foi preservado.

## Operação e escala

O backend precisa executar a migração antes da nova versão. Faça backup antes. O banco deve usar UTC, como já configurado pelo projeto. A migração é aditiva; reexecutá-la não duplica tabelas nem apaga registros. Não rode `db:reset` em produção.

Fotos pequenas são armazenadas no MySQL nesta versão, sem bucket externo. A seleção manual da imagem não solicita acesso amplo à galeria. Reavalie armazenamento, limites, índices e paginação antes de operação em grande escala. Há limites de frequência para as escritas e para envio de suporte. O trabalho de revisão de denúncias continua humano.

As notificações locais existentes foram mantidas. **Não foi adicionado push remoto para mensagens ou novas propostas**: a conversa atualiza enquanto aberta. Não há garantia de oportunidades disponíveis, contratação, renda, verificação de antecedentes ou garantia de serviços. Nenhum dado de demonstração novo é publicado automaticamente.
