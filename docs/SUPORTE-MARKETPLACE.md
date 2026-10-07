# Ajuda, suporte e sugestões

Destino fixo: **skybreakersstudio@gmail.com**.

## O que aparece no aplicativo

Perfil → Ajuda e suporte. Também existe acesso no login para quem perdeu acesso à conta. Categorias: aplicativo, acesso, cadastro, orçamento, cliente, oportunidade, proposta, pagamento/assinatura, travamento, sugestão, denúncia, Cly, notificações e outro.

O usuário preenche assunto (3–120 caracteres), descrição (10–2000) e pode selecionar uma imagem PNG/JPEG até 250 KB. O atalho “Enviar sugestão” já fixa a categoria apropriada.

O formulário informa antes do envio os dados que acompanharão o relato: nome, e-mail e ID da conta para resposta, categoria, assunto, descrição, data/hora informada pelo dispositivo, versão e plataforma. Não coleta logs, clientes, conversas, tokens ou dados bancários automaticamente. A imagem só é incluída se selecionada pelo usuário.

## E-mail

A API autenticada usa Resend, com `EMAIL_API_KEY` e `EMAIL_FROM` configurados exclusivamente no backend. O remetente deve ser autorizado pelo provedor. O Gmail é o destinatário fixo; o campo de resposta usa o e-mail da conta autenticada.

| Categoria | Prefixo |
|---|---|
| Sugestão | `[SUGESTÃO CLYVO]` |
| Erro/travamento | `[BUG]` |
| Acesso/cadastro | `[CONTA]` |
| Demais | `[SUPORTE]` |

A referência `CLY-...` e uma chave de idempotência são derivadas do ID da conta e identificador do pedido. Uma tentativa repetida, sem editar o formulário, conserva o identificador para evitar duplicação no provedor. Alterar o texto gera um novo pedido.

A tela só confirma o encaminhamento após resposta de aceite do serviço. Isso não confirma entrega final ou leitura. Erros preservam o formulário para tentar novamente. O limite é 5 tentativas/hora por conta e 10 por IP; registros inválidos também contam. Em estruturas com múltiplos processos, o limitador atual é por processo, como os demais limites HTTP do projeto.

## Sem login ou sem serviço configurado

“Abrir meu e-mail” abre um `mailto:` com assunto e corpo preenchidos. A pessoa precisa revisar e enviar no aplicativo de e-mail. Essa opção não anexa a imagem automaticamente. Se não houver aplicativo associado, o endereço de suporte continua visível para contato manual.

## Denúncias

Denúncias de anúncio, perfil, mensagem ou avaliação são registradas na fila do banco e podem gerar um aviso por e-mail. A ausência de configuração de e-mail não apaga a denúncia. Analise-as na tela restrita de moderação, configurando os IDs responsáveis no backend. A caixa de e-mail não substitui essa fila.

## Teste real a fazer pelo responsável

1. Configure as duas variáveis do Resend e reinicie a API.
2. Entre com uma conta sua e mande um relato de teste, com assunto identificando o teste.
3. Confira a entrega no Gmail, inclusive spam, o anexo e o campo de resposta.
4. Teste também recuperação e redefinição de senha usando o e-mail dessa conta.
5. Não envie pedidos reais de clientes durante essa conferência.

Os testes automatizados incluídos usam um provedor simulado; nunca disparam mensagens reais. Execute `npm run test:support` somente com um banco separado cujo nome contenha `test` e `NODE_ENV=development`.
