# Apresentação Mensal — Financeiro

Projeto **em construção**, para ajudar a Ester (financeiro) a montar a
apresentação mensal de resultados do grupo Capital Realty, no mesmo padrão
visual das outras apresentações do repositório.

Hoje aqui há só o esqueleto (design system, configuração, pipeline) e a
**capa**. Os demais slides entram conforme forem especificados.

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

**Ainda não temos o ID.** `DECK_FINANCEIRO_ID` em `01_Config.gs` está vazio —
assim que a Ester mandar o link do Google Slides, preencha com o ID (trecho
entre `/d/` e `/edit` da URL). Sem ele, `getDeckMensal_()` lança um erro claro
em vez de gerar no lugar errado.

## Estrutura

```
00_Main.gs               pontos de entrada e pipeline (só a Capa por enquanto)
01_Config.gs              design system, IDs de planilha e deck
02_Dados.gs                leitura de dados (só mês de referência por enquanto)
Slide_CapasComuns.gs       helpers visuais da capa (gradiente simulado, fundo
                            premium, wordmark, rodapé — portado de megas-mensal)
Slide00_Capa.gs             a capa
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

## Como usar

1. Preencha `DECK_FINANCEIRO_ID` em `01_Config.gs`.
2. Copie os arquivos `.gs` para o editor do Apps Script do projeto (não há
   `clasp` — `git push` não publica nada, ver o `CLAUDE.md` da raiz).
3. Rode `diagnosticarFinanceiro()` para conferir se o deck e a planilha abrem.
4. Rode `gerarApresentacaoFinanceiro()` (ou só `gerarSlideCapa()` para testar
   a capa isolada).

## Próximos passos

Aguardando a especificação dos demais slides.
