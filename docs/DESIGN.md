# Clyvo — Design System

Extraído dos mockups aprovados das telas **Início** e **Meus clientes**.
As cores foram amostradas pixel a pixel nas imagens e no arquivo do logo —
não são aproximações.

Implementação: [`frontend/src/shared/theme/`](../frontend/src/shared/theme/).

> **Regra:** nenhuma tela escreve cor, tamanho ou espaçamento na mão.
> Tudo vem de `import { theme } from '@/shared/theme'`.

---

## 1. Cores

### Marca

| Token | Hex | Onde aparece |
|---|---|---|
| `primary` | `#FF7827` | Logo, botão "Nova oportunidade", card de vendas, chip ativo |
| `primaryPressed` | `#F26A15` | Estado pressionado |
| `primaryInk` | `#E8590C` | **Texto e ícone laranja sobre fundo claro**: "Ver todos", "Entrar em contato", "WhatsApp" |
| `primarySoft` | `#FFEADD` | Pill da aba ativa, borda de botão outline |
| `surfaceSoftStrong` | `#FFF0E8` | Chips inativos ("Recentes", "Recorrentes") |
| `surfaceSoft` | `#FFF5EF` | Cards "Clientes"/"Orçamentos", "Precisa da sua atenção", card de cliente em destaque |

`#FF7827` é o laranja do arquivo do logo — a mesma cor aparece nos dois mockups.

> **Contraste:** `#FF7827` sobre branco dá ~2,6:1, abaixo do mínimo de 4,5:1 para
> texto pequeno. Por isso o token `primaryInk` (`#E8590C`, ~4,6:1) existe: use-o
> em textos e ícones. Preenchimentos grandes (botão, card) continuam com `primary`.

### Texto

| Token | Hex | Uso |
|---|---|---|
| `text` | `#111318` | "Olá, Renan", valores, nomes de cliente |
| `textSecondary` | `#5A5B67` | "Vamos transformar conversas em vendas?", labels |
| `textMuted` | `#9799A5` | Placeholder da busca, "Total comprado" |
| `onPrimary` | `#FFFFFF` | Texto sobre laranja |
| `onPrimaryMuted` | `rgba(255,255,255,.86)` | "Vendas do mês" dentro do card |

### Superfícies e linhas

| Token | Hex |
|---|---|
| `background` / `surface` | `#FFFFFF` |
| `border` | `#EFEEF0` — borda dos cards brancos |
| `divider` | `#EAEAEC` — divisor vertical do card de estatísticas |

### Semânticas

| Token | Fundo | Texto | Onde |
|---|---|---|---|
| `danger` | `#FFECEC` | `#CE0000` | "Aguardando resposta há 3 dias" |
| `warning` | `#FFF0CB` | `#BF5900` | Badge "Sem resposta" |
| `success` | `#DCF7E3` | `#0E7830` | Badge "Recorrente" |
| `info` | `#E5F0FE` | `#0038A9` | Badge "Novo cliente" |
| (roxo) | `#F0E4FE` | `#48079E` | Avatar, badge "Alto valor" |
| (pêssego) | `#FFE5D6` | `#DA430B` | Avatar padrão |

Avatares usam `avatarColorFor(nome)` — o mesmo cliente recebe sempre a mesma cor.

---

## 2. Tipografia

Uma família só (System no iOS, Roboto no Android). Escala curta e consistente:

| Token | Tamanho | Peso | Onde |
|---|---:|---|---|
| `display` | 34 | 700 | `R$ 8.450` |
| `h1` | 30 | 700 | "Olá, Renan 👋" |
| `h2` | 28 | 700 | `R$ 14.200` |
| `h3` | 20 | 700 | "Resumo do mês", "Meus clientes", "Precisa da sua atenção" |
| `title` | 17 | 600 | Nome do cliente, texto de botão, "Clientes"/"Orçamentos" |
| `body` | 15 | 400 | Texto corrido, "Em oportunidades", "Negociações" |
| `caption` | 13 | 400 | "Último contato há 3 dias", badges |
| `tab` | 11 | 500 | Labels da tab bar |

Títulos e números têm `letterSpacing` levemente negativo — é o que dá o ar
compacto e moderno do mockup.

---

## 3. Espaçamento, raios e tamanhos

Grade de **4pt**.

```
xxs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · xxl 32 · xxxl 40
```

Margem lateral das telas: **20**. Espaço entre cards: **12**. Entre seções: **24**.

| Raio | Valor | Onde |
|---|---:|---|
| `lg` | 16 | Botões, campo de busca |
| `xl` | 20 | Cards em geral |
| `xxl` | 24 | Card de vendas do mês |
| `pill` | 999 | Chips, badges, avatares |

| Tamanho | Valor |
|---|---:|
| Botão principal / campo de busca | 56 |
| Botão dentro de card ("WhatsApp") | 46 |
| Chip de filtro | 44 |
| Avatar do cliente | 52 |
| Avatar do header | 44 |
| Tab bar | 64 |

Sombras são discretas: o design se apoia em superfícies e bordas, não em
profundidade. `shadow.card` é quase imperceptível; `shadow.raised` só no botão
primário.

---

## 4. Componentes

### Header (todas as telas)

Logo **Clyvo** em `primary` à esquerda; sino com ponto laranja e avatar
circular `primarySoft` com a inicial à direita. Altura do avatar: 44.

### Saudação

`h1` + subtítulo em `textSecondary`. Uma linha cada, sempre com uma frase que
lembra a proposta do produto ("Vamos transformar conversas em vendas?",
"Cada contato, uma nova oportunidade.").

### Card de destaque (vendas do mês)

Fundo `primary`, raio 24, padding 20. Label em `onPrimaryMuted` (15), valor em
`display` branco, badge de variação com fundo `onPrimaryOverlay` e raio pill.
Gráfico de linha branco, traço 3, à direita.

### Card de estatísticas

Fundo branco, borda `border`, raio 20. Colunas separadas por linha vertical de
1px em `divider`. Valor em `h2`/`title`, label em `body`/`caption` `textSecondary`.

### Card de ação (Clientes, Orçamentos)

Fundo `surfaceSoft`, raio 20, altura ~84. Ícone laranja à esquerda, título em
`title`, chevron em `primaryInk` à direita. Sempre em pares, lado a lado.

### Botão primário

Fundo `primary`, raio 16, altura 56, texto branco `title`, ícone opcional à
esquerda. Pressionado: `primaryPressed` + `opacity 0.9`.

### Botão secundário (outline)

Fundo transparente ou branco, borda 1px `primarySoft`, raio 16, altura 46,
texto `primaryInk` `title`. É o padrão de "WhatsApp" e "Entrar em contato".

### Campo de busca

Altura 56, raio 16, borda `border`, ícone de lupa `textMuted` à esquerda,
placeholder em `textMuted`.

### Chips de filtro

Altura 44, raio pill, padding horizontal 20.
Ativo: fundo `primary`, texto branco. Inativo: fundo `surfaceSoftStrong`,
texto `text`. Lista horizontal com scroll e gap 8.

### Card de cliente

Fundo branco com borda `border`; quando precisa de atenção, fundo `surfaceSoft`
sem borda. Raio 20, padding 16.
Linha 1: avatar (52) + nome (`title`) + badge de status; à direita, "Total
comprado" (`caption` `textMuted`) sobre o valor (`title`).
Linha 2: telefone com ícone e "Último contato…" em `caption` `textSecondary`.
Linha 3: dois botões outline lado a lado — "WhatsApp" e "Ver histórico".

### Card "Precisa da sua atenção"

Fundo `surfaceSoft`, raio 20. Avatar + nome + valor do orçamento; alerta em
`danger` com ícone de relógio; botão outline "Entrar em contato" ocupando a
largura toda.

### Badges

Raio pill, padding 4/10, `caption` peso 600, ícone opcional de 14px.
Pares fundo/texto na tabela de cores semânticas.

### Tab bar

5 itens — **Início · Oportunidades · Clientes · Resultados · Perfil**.
Altura 64 + safe area. Item ativo: ícone e label em `primary` dentro de um pill
`primarySoft`. Inativo: `textSecondary`.

---

## 5. Estados obrigatórios

Toda lista e todo formulário precisa dos quatro:

- **Loading** — skeleton com a forma do card real, nunca spinner solto no meio da tela.
- **Vazio** — ilustração simples, uma frase e um botão de ação
  ("Nenhum cliente ainda. Cadastre o primeiro e comece a vender.").
- **Erro** — mensagem curta em `danger` e botão "Tentar novamente".
- **Sucesso** — feedback discreto (toast), sem bloquear a tela.

Ações destrutivas (excluir cliente, cancelar proposta) sempre pedem confirmação.

---

## 6. Escrita

- Português direto, sem jargão de CRM. "Oportunidades", não "leads"; "Orçamento",
  não "cotação".
- Valores sempre `R$ 8.450` (sem centavos quando redondo).
- Tempo relativo: "há 3 dias", "ontem", "hoje".
- Cada tela tem um subtítulo curto que reforça o propósito.
