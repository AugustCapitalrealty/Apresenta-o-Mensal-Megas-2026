# Apresentação Mensal — Financeiro

Projeto **em construção**, para ajudar a Ester (financeiro) a montar a
apresentação mensal de resultados do grupo Capital Realty, no mesmo padrão
visual das outras apresentações do repositório.

Hoje aqui há o esqueleto (design system, configuração, pipeline), a **capa**,
o **Resumo do Resultado** (quadro de EBITDA por empresa + Pré-Premiação) e o
**Painel Executivo** (DRE completo, por enquanto só de Demercado). Os demais
slides entram conforme forem especificados.

## Por que uma pasta nova

Mesma regra do repositório: Apps Script compila todos os arquivos de um
projeto num namespace global único. Cada apresentação vive no seu próprio
projeto Apps Script — ver o [`CLAUDE.md`](../CLAUDE.md) da raiz.

## Fonte de dados

Planilha principal (`FINANCEIRO_SPREADSHEET_ID` em `01_Config.gs`):

```
https://docs.google.com/spreadsheets/d/1tBWt4JfBWE7LidnxnwBMXKlGewjZEvuBBE6Z3CP8ibM/edit
```

Pelo que já foi lido: é um DRE por empresa do grupo (Capital Realty,
Demercado, Garoto, Hangar Vip, Postos Curitiba/Esteio, DCL Shopping Center,
D-Espaço, Deminvest, CR Comb, CR Estacionamentos, CR Infra...), com colunas
Real / Orçado / Ritmo por mês e acumulado, mais uma aba de pauta da reunião
de resultados. O mapeamento exato de aba/coluna para cada slide ainda não foi
feito — entra em `02_Dados.gs` conforme os slides forem especificados.

## Deck de destino

`DECK_FINANCEIRO_ID` em `01_Config.gs`:

```
https://docs.google.com/presentation/d/10LL0oerPM_3KD0yQitt509HQV6k1h8VEK2OssMkOSwQ/edit
```

## Estrutura

```
00_Main.gs                 pontos de entrada e pipeline
01_Config.gs                design system, IDs de planilha e deck
02_Dados.gs                  leitura de dados (mês de referência, Quadro EBITDA, DRE por empresa)
Slide_CapasComuns.gs         helpers visuais da capa (gradiente simulado, fundo
                              premium, wordmark, rodapé — portado de megas-mensal)
Slide00_Capa.gs               a capa
Slide01_ResumoResultado.gs     Resumo do Resultado (EBITDA + Pré-Premiação)
Slide02_DREEmpresa.gs           Painel Executivo — DRE de uma empresa (hoje: Demercado)
```

## Slide 00 — Capa

Fundo escuro premium (sem foto — este projeto não tem asset de foto de fundo
ainda), wordmark Capital Realty, título "RESULTADOS FINANCEIROS", "Grupo
Capital Realty" como herói do co-branding, pill com o mês de referência e
rodapé com o slogan da marca. Mesma linguagem visual das capas de
`megas-mensal/`.

O **mês de referência** (`obterMesReferencia_` em `02_Dados.gs`) hoje é só
calendário: mês fechado anterior a hoje. É provisório — quando soubermos qual
aba/célula da planilha registra o mês de fato coberto pelos números (mesmo
padrão de `megas-mensal/02_Dados.gs`), troque pela leitura real, para a capa
nunca divergir do conteúdo dos outros slides.

## Slide 01 — Resumo do Resultado

Reproduz o print que a Ester mandou: quadro de EBITDA por empresa (Mês |
Acumulado do ano | Ritmo, cada um com Real/Orç/Real ou Ritmo + as duas
variações), Margem EBITDA/ROL logo abaixo de cada empresa, linha TOTAL em
destaque, e o quadro de Ebitda Pré-Premiação Anual embaixo.

Fonte: aba **"Quadro EBITDA"** da planilha principal. `obterResumoResultadoEBITDA_`
e `obterEbitdaPrePremiacao_` (`02_Dados.gs`) procuram sempre o **último**
bloco "EBITDA (Em R$/Mil)" / "Ebitda Pré-Premiação Anual" pela palavra-chave
na coluna B — a aba cresce por baixo a cada mês (blocos de meses anteriores
continuam lá em cima), então isso evita ter que mexer no código quando a
Ester acrescentar o próximo mês.

Os valores são lidos com `getDisplayValue()` — texto exatamente como a
planilha mostra (milhar, decimal, parênteses de negativo, casas percentuais
que variam célula a célula) — em vez de reconstruídos a partir do número
bruto. O slide nunca formata número por conta própria. Os rótulos das colunas
da Pré-Premiação também vêm da planilha, porque citam o ano.

### Todo texto é medido antes de ser desenhado

São 16 colunas num slide só: cada coluna de valor fica com ~38pt, e a
`TEXT_BOX` do Slides come ~7pt de cada lado em recuo interno que a API não
desliga. Levou três rodadas para fechar:

| Rodada | O que quebrou | Por quê |
|---|---|---|
| 1ª | `Ritmo` virou `Ritm`/`o`; `CR Estacionamentos` vazou; título coberto pela tabela | fonte e posições fixas em pt |
| 2ª | cabeçalhos de RITMO invadindo a coluna vizinha | média única de 0,58 por caractere subestima MAIÚSCULA e dígito, e a folga de 9pt deixava a largura útil passar da largura da célula |
| 3ª | — | medição por classe de caractere + folga amarrada ao recuo |

A correção segue o padrão de `../megas-mensal/Farol_Guilherme.gs`:
`_rrUmaLinha_` (texto curto — mede e encolhe até caber numa linha) e
`_rrBloco_` (cabeçalho — encolhe até o texto quebrado caber na altura, e nunca
deixa a maior palavra ficar mais larga que a caixa). Duas constantes carregam
a garantia:

- **`_RR_FOLGA`** = `(recuo − respiro) / 2`. Não é chute: com esse valor a
  largura útil da caixa fica igual à da célula menos o respiro, então a linha
  **não tem como** render mais larga que a célula.
- **`_RR_RESPIRO`** = 4pt que ficam garantidamente livres, para o texto não
  encostar na borda.

As alturas das linhas saem de pesos e as posições são frações de `W`/`H`,
então o slide continua fechando se a Ester acrescentar uma empresa na planilha
e funciona tanto num deck 720×405 quanto 960×540.

#### Conferir isso com a própria estimativa do código não prova nada

Foi o erro da 2ª rodada: o teste media o texto com a mesma função otimista que
o código usava, concordava com o erro e passava — enquanto o slide de verdade
saía com o cabeçalho vazando.

A conferência que vale mede com a métrica **real** do Montserrat (canvas do
Chromium carregando a fonte do Google Fonts) e compara com a largura da
célula. Rodada contra a 2ª versão, ela acusa exatamente os dois cabeçalhos de
RITMO que apareciam errados no slide. Se for mexer nas larguras ou nas fontes
deste slide, confira assim — não pela estimativa interna.

Os números que aparecem no print de referência da Ester podem sair
ligeiramente diferentes dos gerados pelo código: a planilha é viva, os
valores mudam entre uma leitura e outra (Ritmo é recalculado). O slide sempre
mostra o que a planilha tiver **no momento em que for gerado** — nunca um
valor congelado de um print.

## Slide 02 — Painel Executivo (DRE por empresa)

Reproduz o segundo print da Ester: o DRE completo de uma empresa — a cascata
`1 - FATURAMENTO BRUTO` até `13 - LUCRO LÍQUIDO` (com os sub-itens `10.1` /
`10.2 - RECEITAS/DESPESAS FINANCEIRAS` indentados), a linha `7 - EBITDA` com
um realce cinza, e a `Margem EBITDA/ROL` como faixa de destaque no rodapé.
Mesmas 3 colunas de grupo (Mês | Acumulado do ano | Ritmo) do Resumo do
Resultado.

Fonte: aba **"Quadro DRE Apresentação"**, um bloco por empresa. A função
genérica é `gerarSlideDREEmpresa_(chave)` (`Slide02_DREEmpresa.gs`) — hoje só
tem um ponto de entrada ligado no pipeline, `gerarSlideDREDemercado()`. Para
acrescentar outra empresa (Capital Realty, Garoto, Hangar Vip, Postos, BMFD,
DCL...), duas linhas: uma entrada em `DRE_EMPRESAS` (chave → título de
exibição) e um passo no `00_Main.gs` chamando `gerarSlideDREEmpresa_('CHAVE')`.

### Empresa com dois blocos no DRE (equivalência patrimonial)

A Demercado tem **dois** blocos "DRE DEMERCADO" na planilha: um "Sem
Equivalência Patrimonial" e um "Com Equivalência Patrimonial" (por causa da
participação na DCL). O Painel Executivo usa o **Sem** — é a versão que bate
com o print da Ester. `obterDREEmpresa_` (`02_Dados.gs`) decide pela nota que
fica logo abaixo da Margem EBITDA/ROL de cada bloco; sem nota reconhecida em
nenhum candidato, fica com o primeiro bloco encontrado. Se uma empresa nova
tiver a mesma situação, confira se a nota bate com esse padrão antes de gerar.

### Conferido contra a planilha de verdade, não só a olho

A leitura (`obterDREEmpresa_`) foi testada com os valores reais exportados da
aba (não digitados à mão) — confirma que escolhe o bloco "Sem Equivalência",
que a linha 1 e a linha 10 batem exatamente com os números do print, que `7 -
EBITDA` fica marcada para o realce e que `10.1`/`10.2` ficam marcadas como
indentadas. O desenho passou pelo mesmo oráculo de medição real (Montserrat
via Chromium) do Resumo do Resultado: sem quebra no meio de palavra, sem
vazamento de coluna, sem estouro de altura, menor fonte 7,06pt (720×405).

## Como usar

1. Abra a apresentação (link acima) → **Extensões → Apps Script**.
2. Copie o conteúdo dos arquivos `.gs` desta pasta para o editor (um arquivo
   `.gs` por arquivo daqui — não há `clasp`, `git push` não publica nada, ver
   o `CLAUDE.md` da raiz).
3. Rode `diagnosticarFinanceiro()` para conferir se o deck e a planilha abrem.
4. Rode **`regerarApresentacaoFinanceiro()`**.

### Qual função rodar

| Função | O que faz |
|---|---|
| **`regerarApresentacaoFinanceiro()`** | **Limpa o deck e gera tudo de novo.** É a do dia a dia — pode rodar quantas vezes quiser que o resultado é sempre o mesmo deck limpo |
| `gerarApresentacaoFinanceiro()` | ACRESCENTA os slides ao que já existe. Rodar duas vezes deixa tudo repetido |
| `diagnosticarFinanceiro()` | Só confere se o deck e a planilha abrem, antes de qualquer conta |

O Slides não aceita um deck sem nenhum slide, então `regerar...` preserva o
primeiro slide durante a limpeza e só o remove no fim, depois que a capa nova
já tomou o lugar dele.

## Próximos passos

Aguardando a especificação dos demais slides.
