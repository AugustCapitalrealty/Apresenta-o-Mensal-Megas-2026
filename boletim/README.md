# Boletim 2026

Projeto Apps Script que gera os três boletins (Propriedades & Facilities,
MEGAS Centros Logísticos, Hangar VIP) na mesma apresentação.

## O que rodar

O menu "Selecionar função" do editor só lista função **sem parâmetro** e
esconde as que começam ou terminam com `_` — por isso cada recorte tem a sua
própria entrada.

### Boletim inteiro

| Função | O que faz |
|---|---|
| `gerarTodasApresentacoes()` | Os três boletins em sequência, no mesmo arquivo |
| `gerarApresentacaoCompleta()` | Só o boletim Propriedades & Facilities (17 slides) |
| `gerarApresentacaoFacilities()` | Só o boletim MEGAS (16 slides, tema MEGA) |
| `gerarApresentacaoHangar()` | Só o boletim Hangar VIP (8 slides, tema HANGAR) |

### Um slide só

Para conferir um ajuste sem reprocessar o boletim inteiro. Limpam a
apresentação, aplicam o tema do escopo e restauram o da Capital no fim.

| Slide | Geral | Só Facilities | Só Hangar |
|---|---|---|---|
| Overview Executivo | `verOverview()` | `verOverviewFacilities()` | — |
| Estratificação | `verEstratificacao()` | `verEstratificacaoFacilities()` | — |
| Manutenção Corretiva | `verManutencaoCorretiva()` | `verManutencaoCorretivaFacilities()` | `verManutencaoCorretivaHangar()` |
| Manutenção Preventiva | `verManutencaoPreventiva()` | `verManutencaoPreventivaFacilities()` | `verManutencaoPreventivaHangar()` |
| Corretivas / Empreend. | `verCorretivasEmpreendimento()` | `verCorretivasEmpreendimentoFacilities()` | `verCorretivasEmpreendimentoHangar()` |
| Preventivas / Empreend. | `verPreventivasEmpreendimento()` | `verPreventivasEmpreendimentoFacilities()` | `verPreventivasEmpreendimentoHangar()` |
| Controle de Acesso | `verControleAcesso()` | — | — |
| Sustentabilidade | `verSustentabilidade()` | — | — |

Traço = aquele boletim não tem esse slide. Pedir um que não existe não falha
em silêncio: `_bolVerSlide_` lista os slides que o escopo tem de verdade.

### Diagnóstico

`diagnosticarBoletim()` mostra o dado bruto da BD-CORRETIVAS — cabeçalho
real, quantas linhas casam com o filtro, que valores a coluna de Estado
traz. **Rode antes de discutir número.**

## Arquivos do projeto

Esta é a lista **completa** do que deve existir no editor do Apps Script.
Não há `clasp`: o código é copiado à mão (ver o CLAUDE.md da raiz).

| Arquivo | Papel |
|---|---|
| `Config.gs` | IDs das planilhas, design system e os temas MEGA/HANGAR |
| `Dados.gs` | **Tudo que lê base bruta.** BD-CORRETIVAS: backlog, quadro do slide 05, composição |
| `00_Main.gs` | `BOLETINS` (a sequência de slides de cada escopo) e o motor que a executa |
| `01_menu.gs` | Menu "📊 Boletim 2026" na barra do Slides (`onOpen`) — roda sem abrir o editor |
| `00_capa.gs` | Slide 01 — capa |
| `Capas.gs` | Capas de seção (Manutenções, Controle de Acesso, Sustentabilidade, Final) |
| `03_indice.gs` | Slide 02 — índice |
| `02_overview.gs` | Slide 03 — overview executivo |
| `03_manutencoes.gs` | Slide 04 — estratificação |
| `04_quadro_manutencao.gs` | Slide 05 — manutenção corretiva, **os três escopos** (`BOL_CORRETIVAS`) |
| `06_preventivas.gs` | Slide 06 — manutenção preventiva, **os três escopos** (`BOL_PREVENTIVAS`) |
| `07_corretivas_empreendimento.gs` | Slide 07 — corretivas por empreendimento |
| `08_preventivas_empreendimento.gs` | Slide 08 — preventivas por empreendimento |
| `09_controle_acesso.gs` | Slide 09 — controle de acesso |
| `10_graficos_acesso.gs` | Slides 10A e 10B — gráficos de acesso |
| `11_sustentabilidade.gs` | Slide 11 — sustentabilidade |
| `12_capa_final.gs` | Encerramento |
| `99_checklist.gs` | Checklist final |

`teste_dados.js` e `teste_slides.js` **não vão para o editor** — são testes de
Node:

```sh
node boletim/teste_dados.js    # as contas da BD-CORRETIVAS
node boletim/teste_slides.js   # o desenho dos slides, nos três escopos
```

## De onde veio este código

Do repositório `AugustCapitalrealty/Boletim-2026`, branch
**`claude/bulletin-design-system-xP63m`** — **não** da `main`.

Isso não é detalhe. A primeira importação pegou a `main`, que estava **21
commits atrás**, e o monorepo passou semanas com uma versão que não era a que
rodava. O que se perdeu, entre outras coisas: o slide de Controle de Acesso
procurava a aba pelo nome ANTIGO (`Cópia de PAINEL INDICADORES`) depois de ela
ter sido renomeada para `BOLETIM`, então a tabela vinha **vazia**; e a tabela
EQUIPE do QUADRO COMPARATIVO tinha ganhado uma linha, movendo o TOTAL de `C40`
para `C41` — ler `C40` mostrava o número dos locatários no cartão de Backlog
Total, sem erro nenhum.

É o mesmo erro que já tinha acontecido com o `gestao-tvs`. **Antes de importar
qualquer coisa, liste as branches por data**, não confie na `main`:

```sh
git ls-remote --heads <repo>
# ou, no clone:
git fetch origin '+refs/heads/*:refs/remotes/origin/*'
git for-each-ref --sort=-committerdate \
  --format='%(committerdate:short)  %(refname:short)' refs/remotes/origin
```

## Se o editor não tiver exatamente esses arquivos

**Arquivo a mais quebra tudo.** Apps Script compila o projeto num namespace
global único, então uma versão antiga esquecida no editor derruba o projeto
inteiro com um erro que não diz de onde vem:

```
SyntaxError: Identifier 'CR_DESIGN_SYSTEM' has already been declared
```

Isso é sempre a mesma coisa: **dois arquivos declarando o mesmo nome**. Como
o erro é de sintaxe, ele acontece antes de qualquer código rodar — nenhuma
verificação interna consegue pegá-lo. Confira a lista acima e apague o que
sobrar.

Nomes que já existiram e **não** devem estar no editor:

| Apague | Virou |
|---|---|
| `config.gs`, `config_mega.gs`, `config_hangar.gs` | `Config.gs` |
| `99_main.gs`, `99_main_facilities.gs`, `99_main_hangar.gs`, `99_main_todas.gs` | `00_Main.gs` |
| `06_preventivas_facilities.gs`, `06_preventivas_hangar.gs` | `06_preventivas.gs` |
| `05_quadro_manutencao_hangar.gs` | `04_quadro_manutencao.gs` |

## Por que os mains viraram um só

Os quatro `99_main*` repetiam a mesma estrutura (limpa → aplica tema →
desenha slide por slide → restaura tema) e divergiam só na **lista** de
slides e no tema. Em `00_Main.gs` a lista virou dado (`BOLETINS`) e o motor
virou um só. Além de tirar três arquivos, isso consertou três coisas:

- **um slide que falhava derrubava o boletim inteiro**, porque o `try/catch`
  era um só em volta de tudo. Agora cada passo é isolado — boletim com um
  slide faltando é melhor que boletim que não saiu;
- **o log dizia "gerado com sucesso"** mesmo depois de estourar no meio.
  Agora o relatório diz quantos de quantos saíram e nomeia os que falharam;
- **o tema volta no `finally`**, então erro no meio do Hangar não deixa o
  próximo boletim saindo com a paleta errada.

## Um arquivo por slide, três escopos como dado

Manutenção Corretiva e Preventiva tinham três cópias cada. Agora cada uma é um
arquivo, com os escopos num descritor no topo (`BOL_CORRETIVAS`,
`BOL_PREVENTIVAS`).

**O desenho é idêntico nos três** — cartões, gráfico, legenda, painel de
composição, rodapé. Era isso que a duplicação escondia: os últimos ajustes das
Preventivas (tirar o selo de semana, teto do gráfico em 1.42, vão de 10pt
entre as barras, rótulo 1pt abaixo) tiveram que ser feitos **três vezes**,
iguais; e a legenda do tamanho da palavra e a folga do rótulo chegaram a duas
variantes da Corretiva e não à terceira.

**O que diverge é a aquisição dos dados**, e não em detalhe — em estratégia.
Por isso há duas leitoras nomeadas, escolhidas pelo descritor:

| Leitora | Quem usa | O que faz |
|---|---|---|
| `_bolLerUltimasColunas_` | completo, Hangar | últimas N colunas preenchidas; uma linha por equipe |
| `_bolLerSomaLinhas_` | Facilities | soma um bloco de linhas por coluna (cada mês = os 3 Megas), com N pontos variável |

O mesmo vale para a seta dos cartões: `PERIODO` compara com o ponto anterior
do próprio histórico; `SEMANAL` lê a seção POR MEGA SEMANAL. Uma tentativa
anterior de unificar tratou essa diferença como "outra célula" e teria
quebrado o boletim Facilities — o descritor precisa expressar a estratégia,
não só o endereço.

`barW`, `offset` e `lblCaixa` ficam **escritos** no descritor, não calculados:
são valores medidos no deck real. `'auto'` só no Facilities, onde o número de
meses varia e não dá para fixar.

## Os atalhos `testarSlide*` saíram

As antigas `testarSlide05_Hangar`, `testarSlide06_Preventivas_Facilities`,
`testarSlide06_Preventivas_Hangar`, `testarSlide07_Corretivas` e
`testarSlide08_Preventivas` saíram: os atalhos `ver*` fazem a mesma coisa e
passam pelo motor, que aplica o tema. As `testar*` desenhavam **sem tema** —
a prévia do Hangar saía com a cor da Capital e não parecia erro.

## De onde vêm os números

O slide 05 (Manutenção Corretiva) conta da planilha **BASE DE DADOS —
QUADRO REM**, aba `BD-CORRETIVAS`, uma linha por chamado — a mesma fonte da
apresentação mensal dos Megas, da de Propriedades e das TVs. **Os três
escopos**, cada um com o seu recorte de Centro de Custos:

| Escopo | Recorte (`escopoCC`) |
|---|---|
| Propriedades & Facilities | nenhum — a carteira inteira |
| MEGAS | `MEGA CURITIBA`, `MEGA ITAJAI`, `MEGA ESTEIO` |
| Hangar VIP | `HANGAR VIP` |

É o equivalente ao `CONT.SES(...;'BD-CORRETIVAS'!$AY:$AY; <empreendimento>;...)`
das fórmulas da planilha. A comparação é por **trecho** e sem acento, porque
na base o Centro de Custos vem com sufixos (`MEGA ITAJAÍ - GALPÃO 2`) —
igualdade exata deixaria linhas de fora em silêncio.

**Filtro que não casa com nada devolve `null`, não zero.** Quase nunca é
backlog zerado; é nome escrito diferente. O slide cai na célula digitada e o
`Logger` lista os Centros de Custo que existem de verdade na base.

A aba do boletim continua servindo de **reserva** em todos os escopos: se a
base não responder, o slide cai nela e o `Logger` registra (lição 3 do
CLAUDE.md).

Vindo da base, **a seta de cada cartão sai do mesmo histórico que o número do
cartão**. A seção semanal da aba dos Megas só entra quando a base não
respondeu — misturar as duas faria o cartão dizer um número e a seta comparar
outro, que é a lição 2 do CLAUDE.md.

### Slide 06 — Manutenção Preventiva

Sai da aba **`BD - PREVENTIVAS`** da mesma planilha, com o mesmo recorte por
Centro de Custos.

| No slide | Como é calculado |
|---|---|
| Cartões de SLA | `cumpridos ÷ (cumpridos + não cumpridos)`. **"Sem SLA" fica fora das duas pontas** — no denominador só entra quem tinha prazo a cumprir |
| Agendadas na semana | rotinas com data de agendamento dentro dela |
| Realizadas na semana | rotinas **fechadas** dentro dela, tenham sido agendadas quando for |

Agendadas e realizadas são **entrada e saída**, não a mesma coisa contada duas
vezes — por isso realizadas pode passar agendadas numa semana de recuperar
atraso, como o slide já mostrava.

O eixo são as **8 últimas semanas ISO completas**, rotuladas pelo domingo.
Completas de propósito: a semana corrente ainda está enchendo, e meia barra de
"realizadas" ao lado de sete inteiras parece queda de produtividade quando é
só terça-feira.

**O SLA usa a mesma janela do gráfico** (as rotinas fechadas nessas 8 semanas).
Um indicador só é comparável se a janela dele for a mesma que está desenhada
ao lado — antes o SLA vinha de uma célula acumulada sabe-se lá desde quando. O
`Logger` mostra o mesmo cálculo no mês e no ano a cada execução, para conferir
qual janela a planilha usava.

Equipe sem nenhuma rotina fechada na janela mostra **`N/D`, não `0%`** — 0%
diria "não cumpriu nada", quando o certo é "não houve o que cumprir".

#### Como a equipe da preventiva é decidida

A `BD - PREVENTIVAS` não tem coluna de Responsáveis nem de Equipe — mas tem
**"Fechado por"** (coluna K), e é essa a informação boa: o SLA só existe para
rotina **fechada**, então "Fechado por" está preenchido exatamente nas linhas
que entram na conta. A ordem:

1. **Quem fechou** — mesmo mapa nome → equipe usado nos chamados (`_RESPONSAVEL_EQUIPE_`);
2. **Responsáveis**, se a base ganhar essa coluna um dia;
3. **Centro de Custos `HANGAR VIP`** → Operação Hangar;
4. **Nome da rotina**: contém "propriedades" → Property; "ronda" ou "portaria" → Facilities; o resto é Facilities por padrão.

A primeira versão usava só o passo 4, com a comparação apenas contra
"propriedades" — e por isso classificou **95% das rotinas fechadas como
Facilities por omissão**, não por dado (`diagnosticarEquipePreventiva()` no
diagnóstico real: 1077 de 1136 caindo no default, Property calculado sobre só
14 rotinas). O prefixo mais comum de verdade era `RONDA` (479 rotinas), que
não tinha regra nenhuma.

A palavra do passo 4 é procurada na descrição **bruta**, porque costuma estar
no prefixo do checklist (`CHECKLIST - PROPRIEDADES | ...`) que a limpeza
remove antes da tela. Acrescentar um prefixo novo é mudar `BOL_PREV_EQUIPE_NOME`
em `Dados.gs` — a lista existe justamente para isso.

`diagnosticarEquipePreventiva()` (também na seção 3c de `diagnosticarBoletim()`)
mostra por que cada rotina caiu onde caiu, os valores de "Fechado por" que não
bateram com o mapa de equipes, e os prefixos `CHECKLIST - <X> |` que existem
na base — rode antes de mexer na regra.

### O resto

Os demais slides ainda saem das abas com o número já somado à mão. Migrá-los
é o resto do plano.

## Como a composição por tipo é decidida

O painel do slide 05 mostra **Corretivas / Melhorias / Projetos / Locatários**.
A regra é a mesma que a planilha já usava nos `CONT.SES`, agora calculada na
base:

| Fatia | Como é reconhecida |
|---|---|
| **Locatários** | `Responsabilidade Locatário` na coluna Responsáveis |
| **Melhorias** | a coluna de tipo (coluna C) contém "Melhoria" |
| **Projetos** | a coluna de tipo contém "Consulta" |
| **Corretivas** | tudo o que sobra |

A ordem importa e é uma decisão: um chamado pode ser Melhoria **e** de
responsabilidade do locatário. Locatário vem primeiro, para o número do cartão
de KPI e o do painel serem o mesmo. O `Logger` diz a cada execução quantos
chamados são os dois ao mesmo tempo — se esse número crescer, a ordem passa a
mudar o slide e vale rediscutir.

**Calculado, as quatro fatias fecham com o backlog** — cada chamado em aberto
cai em exatamente uma. Lendo as células não fechava: o slide saía com
`348 + 83 + 2 + 46 = 479` embaixo de um backlog de `525`, porque as quatro
contagens da planilha eram independentes e ninguém via os 46 que sumiam.

A coluna de tipo é achada pelo **cabeçalho** (ignorando "Tipo de reporte", que
é OPERATOR/CONTACT — outra coluna). Não achando, tenta a posição C, mas **só
aceita se a coluna realmente trouxer "Melhoria" ou "Consulta"** em alguma
linha. Sem essa conferência, um layout diferente faria a reserva cair numa
coluna qualquer e o painel mostraria 100% Corretivas sem erro nenhum.

`diagnosticarBoletim()` mostra os valores reais dessa coluna e compara a
composição calculada com as células `G40/D40/E40/F40`.

## O que a base não sustenta

- **Índice de Disponibilidade** e **MTBF** — continuam digitados à mão.
- **MTTR / MTBF** — ainda não calculados; `diagnosticarBoletim()` mostra se os
  campos necessários estão preenchidos o bastante.
