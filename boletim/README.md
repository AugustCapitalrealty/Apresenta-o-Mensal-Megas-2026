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
| `05_quadro_manutencao_hangar.gs` | `04_quadro_manutencao.gs` |
| `06_preventivas_facilities.gs`, `06_preventivas_hangar.gs` | `06_preventivas.gs` |

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

## Por que os slides viraram um arquivo cada

Manutenção Corretiva tinha três cópias (geral, Facilities, Hangar) e
Preventiva também. As seis desenhavam o **mesmo** slide e divergiam só em:
qual aba ler, em que linha/célula está cada número, e quais cartões aparecem.

Agora isso é dado — `BOL_CORRETIVAS` e `BOL_PREVENTIVAS`, no topo de cada
arquivo — e o desenho é um só. Para mexer num escopo, mexa no descritor; para
mexer no slide, mexa no desenho, uma vez.

**Isso não é arrumação: as cópias já tinham divergido.** A variante Hangar
estava sem a folga "sem quebra" do rótulo de barra, então quebrava valor de 3
dígitos em duas linhas em cima da barra — defeito já corrigido no escopo geral
que nunca chegou lá. A variante Facilities tinha a folga mas não o
`setLineSpacing(100)` que a acompanha. `teste_slides.js` agora confere a
largura exata da caixa nos três.

O que **não** mudou: cada escopo continua lendo exatamente as células que lia,
e o gráfico continua com a largura de barra e os deslocamentos que já tinha —
esses ficam escritos no descritor em vez de calculados, para a barra não sair
do lugar sem ninguém ter pedido.

Um escopo ainda difere de propósito: **só o COMPLETO usa a base bruta**
(`usaBaseBruta: true`). `obterQuadroCorretivasBoletim_` conta a carteira
inteira e ainda não sabe recortar por Megas ou por Hangar — ligar os outros
dois mudaria o número na tela. Quando souber filtrar, é virar a chave no
descritor.

As antigas `testarSlide05_Hangar`, `testarSlide06_Preventivas_Facilities`,
`testarSlide06_Preventivas_Hangar`, `testarSlide07_Corretivas` e
`testarSlide08_Preventivas` saíram: os atalhos `ver*` fazem a mesma coisa e
passam pelo motor, que aplica o tema. As `testar*` desenhavam **sem tema** —
a prévia do Hangar saía com a cor da Capital e não parecia erro.

## De onde vêm os números

O slide 05 (Manutenção Corretiva) conta da planilha **BASE DE DADOS —
QUADRO REM**, aba `BD-CORRETIVAS`, uma linha por chamado — a mesma fonte da
apresentação mensal dos Megas, da de Propriedades e das TVs. A aba do
boletim continua servindo de **reserva**: se a base não responder, o slide
cai nela e o `Logger` registra a divergência (lição 3 do CLAUDE.md).

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
- **Recorte por escopo no slide 05** — `obterQuadroCorretivasBoletim_` conta a
  carteira inteira, então só o boletim COMPLETO usa a base bruta. Facilities e
  Hangar continuam nas células até a função aprender a filtrar por Centro de
  Custos (é o que a fórmula da planilha faz com `$AY:$AY`).
