> Documento de referência anterior. Para o estado atual, preços, integrações e bloqueios, siga ATUALIZACAO-CLY.md e ENTREGA-PUBLICACAO.md.

# Textos prontos para a Play Store

Copie e cole nos campos do Google Play Console. Os limites de caracteres
sao os da propria loja - os textos abaixo ja cabem.

---

## Nome do app (ate 30 caracteres)

```
Clyvo
```

## Descricao curta (ate 80 caracteres)

```
Transforme conversas em vendas. Clientes, propostas e follow-up no bolso.
```

Alternativas, caso queira testar qual converte melhor:

```
CRM simples para autonomos. Organize clientes e feche mais vendas.
```

```
Clientes e orcamentos organizados no celular.
```

## Descricao completa (ate 4000 caracteres)

```
Voce anota cliente no papel, no bloco de notas ou deixa perdido na
conversa do WhatsApp. Ai esquece de responder, some o orcamento e a venda
vai embora sem voce perceber.

O Clyvo resolve isso. E o seu caderno de vendas, so que ele te lembra.

ORGANIZE SEUS CLIENTES
Nome, telefone, o que a pessoa pediu e quanto ela ja comprou de voce.
Tudo em um lugar so, com busca rapida. Sem planilha, sem complicacao.

ACOMPANHE SUAS NEGOCIACOES
Cada conversa vira uma oportunidade com valor e situacao. Voce ve na hora
quem esta esperando resposta, quem sumiu e quanto dinheiro esta parado
esperando um retorno seu.

MONTE SUA PROPOSTA PELO CELULAR
Monte o orcamento escolhendo do seu catalogo, com desconto e observacoes.
O Clyvo gera um PDF com os dados do seu negocio e voce manda direto no
WhatsApp. Confira os dados e compartilhe o documento com seu cliente.

MENSAGEM PRONTA PARA MANDAR
O Clyvo escreve a mensagem de retomada com o nome do cliente e o que ele
pediu. Voce le, ajusta se quiser e envia. Sem aquela travada de "o que eu
escrevo agora".

SAIBA COMO VOCE ESTA INDO
Quanto vendeu no mes, quantos orcamentos viraram venda, quais clientes
sumiram. Numeros de verdade, sem enrolacao, para voce decidir onde
insistir.

FEITO PARA QUEM VENDE SOZINHO
Vendedor, autonomo, prestador de servico, pequeno comerciante. Se voce
vende conversando com as pessoas, o Clyvo foi feito para voce.

- Funciona no celular, do jeito que voce ja trabalha
- Comeca de graca, sem cartao de credito
- Seus dados sao seus: nao vendemos nem compartilhamos sua base
- Cada conta enxerga so os proprios dados

COMECE DE GRACA
O plano Free ja da conta do dia a dia de quem esta comecando. Esta versao oferece 20 clientes, 20 oportunidades por mes, 5 propostas
por mes e 20 itens de catalogo. Assinaturas pagas ainda nao estao disponiveis.

Baixe, cadastre os tres clientes que voce atendeu essa semana e veja a
diferenca no proximo mes.
```

## Categoria

```
Negocios
```

Alternativa aceitavel: **Produtividade**.

## Tags / palavras-chave sugeridas

```
CRM, vendas, clientes, orcamento, proposta, autonomo, MEI, WhatsApp
```

## E-mail de contato

Use o mesmo que voce colocou no bloco `COMPANY` do arquivo
`frontend/src/features/legal/legal-content.ts`.

## Exclusao de conta

Publique a pagina /excluir-conta e informe seu endereco HTTPS no Console.
Ela funciona no navegador sem exigir instalar o aplicativo.

## Politica de privacidade

```
https://SEU-SITE/privacidade
```

---

## Imagens que a loja exige

| Item | Tamanho | Onde esta |
|---|---|---|
| Icone do app | 512 x 512 PNG | Pronto: `docs/play-store/icone-512.png` |
| Imagem de destaque | 1024 x 500 PNG | Pronta: `docs/play-store/destaque-1024x500.png` |
| Capturas de tela do celular | no minimo 2, entre 320 e 3840 px | Voce precisa tirar - ver abaixo |

As duas primeiras ja estao geradas na pasta `docs/play-store/`. E so
subir. Se quiser refazer depois de mudar a logo, rode na raiz do projeto:

```
node scripts/make-assets.mjs
```

**Como tirar as capturas de tela:** instale o APK de teste no seu celular,
abra as telas abaixo e tire print (normalmente `Power` + `Volume para
baixo`):

1. Inicio, com o card laranja de vendas do mes
2. Meus clientes, com alguns clientes cadastrados
3. Uma oportunidade aberta
4. A proposta em PDF
5. Resultados

Cadastre uns cinco clientes com nomes e valores realistas antes de tirar
os prints - tela vazia nao vende o app.

**Imagem de destaque:** ja esta pronta em
`docs/play-store/destaque-1024x500.png` - fundo laranja da marca, o nome
Clyvo em branco e a frase "Transforme conversas em vendas".

---

## Respostas do questionario "Seguranca dos dados"

Este e o ponto onde mais gente trava. As respostas do Clyvo:

**O app coleta ou compartilha algum dos tipos de dados obrigatorios?**
Sim.

**Todos os dados sao criptografados em transito?** Sim (HTTPS).

**Voce fornece uma forma de o usuario solicitar a exclusao dos dados?**
Sim.

| Categoria | Coletado | Compartilhado | Obrigatorio | Finalidade |
|---|---|---|---|---|
| Nome | Sim | Nao | Sim | Funcionalidade do app, gerenciamento de conta |
| E-mail | Sim | Nao | Sim | Funcionalidade do app, gerenciamento de conta |
| Telefone | Sim | Nao | Nao | Funcionalidade do app |
| Outras informacoes do usuario (dados dos clientes cadastrados) | Sim | Nao | Sim | Funcionalidade do app |
| Registros de falhas / diagnostico | Sim | Nao | Nao | Analise, funcionalidade do app |

**Nao marque:** localizacao, contatos do aparelho, fotos, arquivos,
informacoes financeiras ou mensagens. O Clyvo nao acessa nada disso - ele
abre o WhatsApp com um texto pronto, mas nao le a agenda nem as conversas.

---

## Classificacao de conteudo

Responda **nao** para todas as perguntas sobre violencia, conteudo
sexual, linguagem impropria, drogas, jogos de azar e conteudo gerado por
usuarios compartilhado publicamente.

Resultado esperado: **Livre para todos** (L).

## Publico-alvo

Marque apenas **18 anos ou mais**. O Clyvo e ferramenta de trabalho e a
Politica de Privacidade diz isso explicitamente - as duas respostas
precisam bater.
