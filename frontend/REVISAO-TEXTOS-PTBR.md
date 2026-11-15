# Clyvo — revisão dos textos em português (Brasil)

Este pacote contém a revisão dos textos das telas principais do Clyvo, mantendo a navegação, os componentes, os nomes de rotas e a lógica do aplicativo.

## Arquivos atualizados

- `app/(tabs)/index.tsx` — tela inicial: saudação, contagem de clientes, orçamentos pendentes e mensagens de estado vazio.
- `app/(tabs)/resultados.tsx` — resultados: acentuação, concordância, textos do resumo, métricas, propostas, funil e clientes.
- `app/(tabs)/perfil.tsx` — perfil: acentuação, nomes de seções, plano gratuito e textos de conta/empresa.
- `app/(tabs)/clientes.tsx` — mensagens auxiliares e textos de carregamento/negociação.
- `app/(tabs)/_layout.tsx` — rótulo da aba `Início`.
- `src/shared/components/AppHeader.tsx` — rótulo de acessibilidade `Notificações`.
- `src/shared/utils/format.ts` — expressões de tempo, como `há 3 dias`.
- `src/features/dashboard/components/AttentionCard.tsx` — mensagens de contato e avisos com acentuação e redação revisadas.
- `src/features/dashboard/components/ClientCard.tsx` — saudação, último contato e histórico.
- Componentes auxiliares do painel — comentários e expressões relacionadas à tela inicial.

## Como aplicar no Code Space

1. Faça uma cópia de segurança do projeto atual.
2. Extraia este ZIP.
3. Copie as pastas `app/` e `src/` extraídas para a raiz do seu projeto no Code Space.
4. Quando o editor perguntar, permita substituir os arquivos existentes.
5. Revise as alterações e execute o projeto normalmente.

O arquivo ZIP preserva a estrutura de pastas do material que você enviou.

## Observações importantes

- O nome exibido em `Olá, ...` e no perfil vem dos dados da conta conectada. Ele não foi fixado como “Renan”, porque isso faria todos os usuários verem o mesmo nome. Para corrigir “Rwnan”, atualize o nome cadastrado nessa conta.
- O rótulo do período e os nomes/estados vindos da API continuam dinâmicos. Se algum texto desses dados vier sem acento do servidor, será necessário corrigir também a resposta da API.
- O ZIP enviado não continha `package.json`, `tsconfig.json` ou configuração de dependências; por isso, não foi possível executar o build completo. Os arquivos TypeScript/TSX modificados passaram por verificação de transpilação sintática.
