# Apresentação Mensal — Propriedades

Projeto **em construção**. A pasta existe para montarmos a apresentação
mensal da área de Propriedades, no mesmo padrão da dos Megas.

Hoje aqui há apenas o esqueleto: configuração, design system e o pipeline
vazio. Nenhum slide foi implementado ainda.

## Por que uma pasta nova e não um slide dentro de `megas-mensal/`

A apresentação dos Megas é por **empreendimento** (Curitiba, Itajaí, Esteio) e
gira em torno de manutenção — preventivas, corretivas, backlog, custo por m².
Propriedades é outra área, com outro recorte e outro público.

Além disso vale a regra do repositório: Apps Script compila todos os arquivos
de um projeto num namespace global único. Misturar as duas apresentações no
mesmo projeto significaria disputar nomes com os 541 símbolos globais que
`megas-mensal/` já tem. Como projeto separado, não há disputa nenhuma.

Ver o [`CLAUDE.md`](../CLAUDE.md) da raiz.

## O que já existe no repositório sobre Propriedades

A equipe PROPERTY já aparece na apresentação dos Megas, e a lógica pode ser
aproveitada:

| Onde | O que faz |
|---|---|
| `../megas-mensal/Slide_BacklogClientesProperties.gs` | Backlog de chamados de cliente cuja equipe resolvida é PROPERTY |
| `../megas-mensal/02_Dados.gs` → `_resolverEquipeResponsaveis_` | Classifica o chamado em PROPERTY / FACILITIES / LOCATARIO pela coluna "Responsáveis" |
| `../megas-mensal/02_Dados.gs` → `obterDadosBacklogPorMesBD_` | Já devolve a série mensal de `property` por empreendimento |
| Aba `BD-CORRETIVAS` (planilha BASE DE DADOS — QUADRO REM) | Base bruta, uma linha por chamado, histórico desde 2021 |

Ou seja: a parte de **chamados de Propriedades** tem fonte pronta e já
conciliada. É o caminho mais curto para o primeiro slide com dado real.

## Decidido

- **Escopo: o portfólio inteiro.** Megas e demais imóveis.
- **Recorte:** a apresentação fala do desempenho nos Megas e nos demais, o
  que pede um corte "Megas x demais" em cada indicador. `_propEhMega_`
  (02_Dados.gs) faz essa separação pelo prefixo do Centro de Custos.
- **Ponto de partida:** o que a base já tem. A BD-CORRETIVAS é
  multi-empreendimento e a coluna "Centro de Custos" já lista todo o
  portfólio — não há lista para digitar, há lista para descobrir.

## Comece por aqui

Rode **`descobrirPortfolio()`** (02_Dados.gs). Ela varre a BD-CORRETIVAS e
lista, separando Megas dos demais: cada Centro de Custos, o volume de
chamados, quantos seguem abertos e o período coberto.

A saída é o que preenche `PROPRIEDADES` em `01_Config.gs` — o valor da coluna
CENTRO DE CUSTOS tem que ser copiado **exatamente** para o campo `ccBD`, que
compara string a string.

Numa amostra da BD já aparecem, além de MEGA CURITIBA e MEGA ESTEIO: AR 3000,
BRADO CUBATÃO, GAROTO, POSTO CURITIBA e POSTO ESTEIO. A lista completa sai da
função.

## O que falta decidir

1. **Indicadores gerais** — o que entra na seção 1 além de chamados?
   Vistorias, contratos, ocupação, inadimplência, garantias de obra?
2. **Fontes** — quais planilhas alimentam esses indicadores.
3. **`presentationId`** — falta o ID de um deck (mesmo de teste) para os
   slides começarem a ser desenhados.

O SLA das preventivas, a execução e a atribuição por equipe já estão
resolvidos e implementados — ver as seções abaixo.

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

| # | Seção | Dados |
|---|---|---|
| 1 | **Indicadores gerais** | consolidado do portfólio |
| 2 | **Preventivas** | previstas, realizadas e SLA — mês e acumulado do ano |
| 3 | **Corretivas** | abertas no mês, fechadas no mês |
| 4 | **Backlog** | quantos chamados, com detalhe |
| 5 | **Fotos de serviços** | espaço para registro |

Todas com o corte **Megas × demais imóveis**. As preventivas têm também o
corte **Propriedades × Facilities**.

Os dados de 2, 3 e 4 já estão implementados em `02_Dados.gs` — falta o
desenho dos slides.

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
