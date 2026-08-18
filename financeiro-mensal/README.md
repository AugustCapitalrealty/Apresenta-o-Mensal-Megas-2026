# Apresentação Mensal — Financeiro

Projeto **em construção**, para ajudar a Ester (financeiro) a montar a
apresentação mensal de resultados do grupo Capital Realty, no mesmo padrão
visual das outras apresentações do repositório.

Hoje aqui há o esqueleto (design system, configuração, pipeline), a **capa**
e o **Resumo do Resultado** (quadro de EBITDA por empresa + Pré-Premiação).
Os demais slides entram conforme forem especificados.

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
02_Dados.gs                  leitura de dados (mês de referência + Quadro EBITDA)
Slide_CapasComuns.gs         helpers visuais da capa (gradiente simulado, fundo
                              premium, wordmark, rodapé — portado de megas-mensal)
Slide00_Capa.gs               a capa
Slide01_ResumoResultado.gs     Resumo do Resultado (EBITDA + Pré-Premiação)
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
bruto. O slide nunca formata número por conta própria.

Os números que aparecem no print de referência da Ester podem sair
ligeiramente diferentes dos gerados pelo código: a planilha é viva, os
valores mudam entre uma leitura e outra (Ritmo é recalculado). O slide sempre
mostra o que a planilha tiver **no momento em que for gerado** — nunca um
valor congelado de um print.

## Como usar

1. Abra a apresentação (link acima) → **Extensões → Apps Script**.
2. Copie o conteúdo dos arquivos `.gs` desta pasta para o editor (um arquivo
   `.gs` por arquivo daqui — não há `clasp`, `git push` não publica nada, ver
   o `CLAUDE.md` da raiz).
3. Rode `diagnosticarFinanceiro()` para conferir se o deck e a planilha abrem.
4. Rode `gerarApresentacaoFinanceiro()` (ou só `gerarSlideCapa()` para testar
   a capa isolada).

## Próximos passos

Aguardando a especificação dos demais slides.
