# Apresentação Mensal — Propriedades

Automação em **Google Apps Script** que gera a apresentação mensal da área de
**Propriedades** (August Capital Realty) para todo o portfólio (Megas e Demais
Imóveis). Os dados são lidos das bases brutas (`BD-CORRETIVAS`, `BD - PREVENTIVAS`)
e da planilha de Propriedades, e os slides são gerados diretamente na
apresentação Google Slides correspondente.

## Como usar

No Google Slides ou no editor do Apps Script, use o menu **🏢 Propriedades 2026**
ou execute uma das funções de `00_Main.gs`:

| Função | O que faz |
|---|---|
| `gerarApresentacaoPropriedades()` | Gera a apresentação completa (10 passos oficiais) |
| `gerarSoDashboard()` | Gera/atualiza apenas o **Dashboard Operacional** (4 quadrantes) |
| `gerarTabelasPropriedades()` | Gera/atualiza apenas as tabelas (**Recebimento de Obras** e **Gestão de Contratações**) |
| `gerarSoPreventivas()` / `gerarSoCorretivas()` | Gera apenas o slide correspondente |
| `gerarSoBacklog()` / `gerarSoBacklogEmergencial()` | Gera o gráfico de backlog ou a tabela detalhada |
| `gerarSoChamadosPendentes()` / `gerarSoBacklogClientes()` | Gera os slides de motivos de pausa ou chamados de clientes |
| `diagnosticarPropriedades()` | Valida acesso a planilhas, bases brutas e deck de destino |

## Gerenciamento por Tags

Todos os slides automáticos possuem tags na nota do apresentador (ex:
`【PROP_DASHBOARD_AUTO】`, `【PROP_PREV_AUTO】`, `【RECEBIMENTO_AUTO】`). Ao regerar
um slide individual ou o deck completo, apenas os slides daquela tag são
substituídos, preservando os demais slides e anotações manuais.

**`descobrirPortfolio()`** (02_Dados.gs) varre a base e lista, separando Megas
dos demais: cada Centro de Custos, o volume de chamados, quantos seguem
abertos e o período coberto. Não serve para cadastrar nada — serve para
conferir se o corte Megas × demais está classificando todo mundo do lado
certo. Numa amostra já aparecem, além de MEGA CURITIBA e MEGA ESTEIO: AR 3000,
BRADO CUBATÃO, GAROTO, POSTO CURITIBA e POSTO ESTEIO.

### Não há cadastro de imóveis

Houve, e foi erro: copiei de `megas-mensal/` um registro com um
`presentationId` por empreendimento. Lá faz sentido — são **três decks**, um
por cidade. Aqui é **um deck do portfólio inteiro**, e o registro só
conseguia uma coisa: barrar a geração com *"nenhuma propriedade cadastrada"*.

A lista de imóveis não é digitada, é descoberta na coluna Centro de Custos. O
único recorte de que a apresentação precisa sai do prefixo, em `_propEhMega_`.

## O que falta decidir

1. **Indicadores gerais** — o que entra na seção 1 além de chamados?
   Vistorias, contratos, ocupação, inadimplência, garantias de obra?
2. **Fontes desses indicadores** — quais planilhas alimentam o que a
   seção 1 for acompanhar.

O SLA das preventivas, a execução, a atribuição por equipe, a planilha de
Propriedades e o deck de destino já estão resolvidos — ver as seções abaixo.

## Deck de destino

A apresentação mensal é **uma só, do portfólio inteiro** (o corte "Megas ×
demais" acontece dentro dela). `DECK_PROPRIEDADES_ID` em `01_Config.gs`:

```
1hU2a_7dms3fQV6bLBcVWIrNgmoE_ePg2aq-oUf9MNLY
```

Não confundir com o deck **semanal** (`1Te_E9Su…`), que é outra apresentação
e segue sendo alimentada por `../tabelas/propriedades-semanal/`.

Se o ID for apagado, as funções param com mensagem em vez de gerar — escrever
no deck errado é pior que não gerar.

## SLA de preventivas — regra confirmada e implementada

```
SLA % = cumpridos ÷ (cumpridos + não cumpridos) × 100
```

A base é a aba **`BD - PREVENTIVAS`** (repare no espaço em volta do hífen),
na mesma planilha das corretivas. A coluna `SLA` tem exatamente três valores:
`SLA Cumprido`, `Não cumprido` e `Sem SLA`. As "Sem SLA" saem da conta
inteira — de cima e de baixo da fração.

Três pontos foram **verificados contra a planilha de controle** do time
(blocos FACILITIES por Mega), confrontando 12 casos — Curitiba, Itajaí e
Esteio, de janeiro a abril/2026:

| | Resultado |
|---|---|
| Janela do mês | **data de agendamento**, não a de fechamento |
| Canceladas | **entram** na conta |
| Filtro por tipo/descrição | **nenhum** |

Bateu 12 de 12. Excluir canceladas erra em 5 dos 12 (Curitiba jan: oficial
197/28, sem canceladas 197/15). Pela data de fechamento também não bate.

### Três armadilhas que o código trata

- **"Não cumprido" contém "cumprido".** Um `indexOf('cumprido')` classifica
  toda não-conformidade como cumprida e infla o indicador em silêncio. A
  classificação usa correspondência **exata** — e por isso um valor novo na
  planilha vira `DESCONHECIDO` e é reportado, em vez de ser adivinhado.
- **Preventiva diz "Fechada", corretiva diz "Fechado".** Testar só a forma
  masculina faria a base inteira de preventivas parecer aberta.
- **Sem base não é 0%.** Se nenhuma preventiva do mês tiver SLA, o resultado
  é `null`, não zero: "nenhuma cumprida" é uma afirmação diferente de
  "nenhuma tinha prazo".

### Sobre o 94,74% do e-mail modelo

Não vem desta conta. Nos dados, Curitiba em junho/26 dá 96,03% pela regra
oficial. O e-mail também cita "189 realizadas de 190 previstas", enquanto a
base tem ~254 preventivas/mês em Curitiba. São de outra fonte ou de outro
recorte — não tentei reproduzir o número por engenharia reversa, porque
acertá-lo por coincidência seria pior do que não acertá-lo.

## Execução: realizadas ÷ previstas

Indicador diferente do SLA, com denominador diferente:

```
PREVISTAS  = registros com data de agendamento no mês (mesma janela do SLA)
REALIZADAS = dessas, as que estão com Estado "Fechada"
Execução % = realizadas ÷ previstas × 100
```

| | Pergunta | Denominador |
|---|---|---|
| **Execução** | o serviço aconteceu? | tudo que foi agendado |
| **SLA** | aconteceu no prazo? | só quem tinha prazo |

A diferença é concreta na base: Curitiba/jan tem 225 previstas e 225 com SLA
classificado (197+28), mas Esteio/jan tem 246 previstas e só 202 com SLA
(197+5) — 44 registros entram na execução e ficam fora do SLA. Trocar um
denominador pelo outro muda os dois números.

Os dois saem da mesma lista filtrada (`preventivasDoMes_`), então não podem
divergir por recortar populações diferentes.

### O mês corrente é provisório, não ruim

O dado chega assim: uma preventiva agendada para o mês pode ser executada até
o último dia, e o "Sem SLA" só se resolve quando ela fecha. Enquanto o mês
não termina, execução e SLA estão **incompletos** — a conta ainda não acabou.

Sem tratar isso, o mês corrente apareceria com execução baixa ao lado de
meses fechados e a comparação seria falsa: o slide mostraria uma queda que
não existe. Agosto/26 é o exemplo — 70,33% em Curitiba porque o mês estava
correndo, não porque o desempenho caiu.

Por isso `indicadoresPorImovel_`, `indicadoresPortfolio_` e
`indicadoresAcumulado_` devolvem `parcial: true` quando o mês ainda não
fechou, e `calcularExecucao_` conta separado o `emAberto` — o que nem fechou
nem foi cancelado, ou seja, o que ainda pode virar realizada. É o teto até
onde a execução daquele mês ainda pode subir.

`conferirPreventivas()` avisa em destaque quando o mês está aberto. **Mês
parcial não vai para o slide.**

### Números de 2026 (Megas, janela de agendamento)

| | previstas | realizadas | execução |
|---|---|---|---|
| Curitiba | 1.765 | 1.702 | 96,43% |
| Itajaí | 1.459 | 1.447 | 99,18% |
| Esteio | 1.854 | 1.816 | 97,95% |

Inclui agosto, que estava aberto na extração — o acumulado sobe quando ele
fechar.

### Como usar

- `conferirPreventivas(2026, 6)` — execução e SLA lado a lado, por imóvel,
  com Megas × demais e o acumulado do ano
- `conferirSLA(2026, 6)` — só o SLA, com o vocabulário real da coluna
- `conferirSLA(2026, 6, BD_ABA_CORRETIVAS)` — a mesma regra nas corretivas
- `indicadoresPortfolio_(aba, ano, mesIndex)` — o consolidado, para os slides
- `indicadoresAcumulado_(aba, ano, mesIndexAte)` — o acumulado do ano

## Estrutura da apresentação

Definida com o time:

| # | Seção | Dados | Estado |
|---|---|---|---|
| 1 | **Indicadores gerais** | consolidado do portfólio | a definir |
| 2 | **Preventivas** | previstas, realizadas e SLA — mês e acumulado do ano | dados prontos |
| 3 | **Corretivas** | abertas no mês, fechadas no mês | dados prontos |
| 4 | **Backlog** | quantos chamados, com detalhe | dados prontos |
| 5 | **Recebimento de Obras** | Esteio, Curitiba e Análise de Projetos | **implementado** |
| 6 | **Gestão de Contratações** | pipeline de contratações + histórico | **implementado** |
| 7 | **Fotos de serviços** | espaço para registro | a fazer |

Todas com o corte **Megas × demais imóveis**. As preventivas têm também o
corte **Propriedades × Facilities**.

Os dados de 2, 3 e 4 já estão implementados em `02_Dados.gs` — falta o
desenho dos slides. As seções 5 e 6 estão completas (dados + desenho).

## Tabelas: Recebimento de Obras e Gestão de Contratações

Vieram da apresentação **semanal** (`../tabelas/propriedades-semanal/`), que
já gerava esses dois relatórios. Fonte: a planilha da área
(`PROPRIEDADES_SPREADSHEET_ID`), abas `Recebimento de Obras - Esteio`,
`Recebimento de Obras - Ctba`, `Análise de Projetos` e
`GESTÃO DE CONTRATAÇÕES`.

| Arquivo | O que faz |
|---|---|
| `03_Tabelas.gs` | Motor: cabeçalho, zebra, badges de status, paginação, rodapé com KPIs |
| `Slide_RecebimentoObras.gs` | As três fichas de recebimento + o cálculo de prazo |
| `Slide_Contratacoes.gs` | Leitura e desenho da tabela densa de contratações |

Já estão no pipeline de **`gerarApresentacaoPropriedades()`**. Para
reprocessar só elas sem tocar no resto do deck: `gerarTabelasPropriedades()`.

### Três decisões que o port carrega

- **Prefixo `_tab` / `TAB_` em todo o motor.** No projeto semanal os nomes são
  genéricos (`_desenharTabela`, `CORES`, `FONTE`) porque lá só existe isso.
  Aqui os slides de Preventivas/Corretivas/Backlog ainda vão ser escritos e vão
  querer esses nomes — no namespace único do Apps Script, quem chega primeiro
  não pode ocupar o nome genérico.
- **A paleta ganhou os acentos, não perdeu os antigos.** As tabelas usam
  `accentGreen #10B981` (verde de status); os slides de indicadores usam
  `verde #00B050` (institucional). Os dois convivem em `CR_DESIGN_SYSTEM` —
  trocar um pelo outro mudaria decks já aprovados.
- **Cada bloco tem tag própria na nota do slide.** Principal e histórico usam
  tags diferentes (`【RECEBIMENTO_AUTO】` / `【RECEBIMENTO_HIST_AUTO】`), senão
  regerar um apagaria o outro.

### É cópia, não import

O código vive em dois lugares: aqui e em `../tabelas/propriedades-semanal/`.
Apps Script não tem import — as duas cópias divergem se alguém mexer só numa.
**Ao corrigir um bug de desenho aqui, verifique lá, e vice-versa.**

### Pendências e histórico saem separados

Cada relatório vira dois blocos: o principal só com o que está em aberto, e um
histórico com o concluído. Misturar faz a reunião discutir linha já resolvida.

Os KPIs mudam junto: no bloco principal só a contagem em aberto — um
"% concluído" ao lado de uma lista de pendências confunde, porque o número
fala do total e a lista não. O total geral e o % ficam no histórico.

## Equipe: Propriedades × Facilities

A lógica é quase a mesma das corretivas, com uma diferença na coluna:

| | Coluna que define a equipe |
|---|---|
| Corretivas | `Responsáveis` (quem está atribuído) |
| **Preventivas** | **`Fechado por`** (quem executou) |

Regra do time: *"se foi fechado por propriedades é de propriedades, e foi
fechado por facilities é de facilities"*.

O mapa nome→equipe é cópia do `_RESPONSAVEL_EQUIPE_` de `megas-mensal`. Apps
Script não tem import — ao acrescentar alguém lá, acrescente aqui também.

### A ronda é terceiro — categoria própria

Em 2026, das 5.462 preventivas agendadas:

| Quem fechou | Registros | |
|---|---|---|
| `Ronda e Portaria (CTBA/ESTEIO/ITAJAÍ)` | **3.265** | 60% |
| Nomes de Facilities | 1.719 | 31% |
| Nomes de Operação | 184 | 3% |
| Nomes de Propriedades | 142 | 3% |

Regra do time: *"Ronda e Portaria (CTBA/ESTEIO/ITAJAÍ) são os terceiros de
cada empreendimento"*. Não é uma pessoa do mapa nem equipe própria da Capital
Realty — é execução contratada.

Por isso `_propEquipePreventiva_` devolve **`TERCEIROS`**, uma terceira
categoria ao lado de PROPRIEDADES e FACILITIES, e não o fallback "sem
responsável reconhecido conta como FACILITIES" que as corretivas usam. Jogá-la
em Facilities quadruplicaria a equipe interna no slide — de 1.719 para 4.984 —
atribuindo a ela um volume que é de contratado.

O vocabulário já existe no time: `CHECKLIST - TERCEIROS` aparece na coluna
Descrição da própria base.

`conferirEquipes()` mostra as três lado a lado, com o volume de terceiros
destacado.

## Estrutura planejada

Espelha `megas-mensal/`, porque é o formato que o time já conhece e é onde as
lições do repositório estão:

```
00_Main.gs      pontos de entrada e pipeline
01_Config.gs    design system, empreendimentos, IDs de planilha e deck
02_Dados.gs     leitura das planilhas (a criar)
Slide_*.gs      um arquivo por slide (a criar)
```

## Lembretes que já custaram retrabalho nos Megas

Estão detalhados no [`CLAUDE.md`](../CLAUDE.md) da raiz, mas os dois que mais
pesam ao começar um deck novo:

- **Meça o texto antes de desenhar.** Caixa estreita do Slides quebra linha
  sozinha por causa do recuo interno. Use o padrão de
  `../megas-mensal/Farol_Guilherme.gs` (`_gUmaLinha_` / `_gParagrafo_`).
- **Estoque e fluxo saem da mesma fonte.** Se um slide mostrar backlog e
  outro mostrar entradas/saídas, os dois precisam ser contados na mesma base,
  senão o mês não fecha. Foi o que aconteceu nos Megas.
