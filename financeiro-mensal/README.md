# Apresentação Mensal — Financeiro

Gerador Google Apps Script da apresentação mensal de resultados financeiros
da Capital Realty. O pipeline mantém a sequência de **55 páginas** da
referência institucional, mesmo quando algum painel ainda não possui fonte de
dados confirmada.

## Referência e política de dados

A referência geral desta edição é **Julho/2026**. Os quadros cuja própria
fonte ainda está identificada como Junho/2026 mantêm esse rótulo e recebem um
aviso visível de divergência. O gerador não renomeia o mês da fonte, não copia
valores do PDF e não inventa valores ausentes.

Planilha principal (`FINANCEIRO_SPREADSHEET_ID` em `01_Config.gs`):

```text
https://docs.google.com/spreadsheets/d/1tBWt4JfBWE7LidnxnwBMXKlGewjZEvuBBE6Z3CP8ibM/edit
```

Deck de destino (`DECK_FINANCEIRO_ID` em `01_Config.gs`):

```text
https://docs.google.com/presentation/d/10LL0oerPM_3KD0yQitt509HQV6k1h8VEK2OssMkOSwQ/edit
```

## Fontes confirmadas

O arquivo `03_DadosDeckCompleto.gs` usa um registro explícito. Nomes de abas
são comparados sem acentos e sem espaços excedentes, mas sempre por nome
completo — não há busca genérica entre todas as células.

| Página/painel | Fonte |
|---|---|
| Agenda | último bloco mensal completo da aba `AGENDA` |
| Resumo do Resultado | último bloco da aba `Quadro EBITDA` |
| DRE Demercado | `DRE DEMERCADO` em `Quadro DRE Apresentação` |
| DRE Capital Realty | `DRE CAPITAL REALTY` em `Quadro DRE Apresentação` |
| DRE Hangar Vip | `DRE HANGAR VIP` em `Quadro DRE Apresentação` |
| Receitas Demercado | aba `Receitas Demercado` |
| Despesas Demercado | aba `Despesas Demercado` |
| Receitas Capital Realty | aba `Receitas Matriz` (`Matriz → Capital Realty`) |
| Despesas Capital Realty | aba `Despesas Matriz` (`Matriz → Capital Realty`) |

Os cabeçalhos dos quadros EBITDA/DRE possuem 15 colunas em três grupos. Os
dois comparativos de cada grupo aceitam tanto `Real x Orç` / `Real x Real`
quanto a nomenclatura antiga com `Variação`.

## Páginas sem fonte

Há **34 páginas** sem origem confirmada no XLSX: metas, composição, vacância,
contratos, consolidado, indicadores, fluxos e ritmos. Elas são geradas como
placeholders institucionais com:

- nome do painel;
- `JULHO / 2026`;
- mensagem `Fonte de dados não disponível`.

A lista exata e numerada fica em `DC_PAGINAS_PLACEHOLDER`. Capas e página de
encerramento completam a estrutura sem depender de dados.

## Robustez da geração

Cada passo do pipeline deve acrescentar exatamente um slide. Se um gerador
falhar depois de criar um slide parcial, o orquestrador remove tudo que aquele
passo acrescentou, insere um placeholder na mesma posição e continua. Assim,
uma execução completa termina com **55 páginas e zero página omitida**.

As tabelas complementares são renderizadas com células vetoriais (retângulos
e caixas de texto). O código não usa `insertTable`, evitando a falha da API do
Slides `object has no text`.

## Estrutura

```text
00_Main.gs                   pipeline, geração completa e execução em 3 partes
01_Config.gs                 design system e IDs
02_Dados.gs                  referência, EBITDA e DRE
03_DadosDeckCompleto.gs      registro de fontes, agenda, comparativos e diagnóstico
Slide_CapasComuns.gs         helpers visuais das capas
Slide00_Capa.gs              capa
Slide01_ResumoResultado.gs   resumo EBITDA e pré-premiação
Slide02_DREEmpresa.gs        DRE por empresa
Slide08_DeckCompleto.gs      fontes complementares, placeholders, capas e encerramento
```

As funções públicas existentes foram preservadas, inclusive:

- `regerarApresentacaoFinanceiro()`;
- `regerarApresentacaoFinanceiroParte1()`;
- `continuarApresentacaoFinanceiroParte2()`;
- `finalizarApresentacaoFinanceiroParte3()`;
- `diagnosticarDeckCompleto()`.

## Como usar

1. Copie cada `.gs` desta pasta para o projeto Apps Script do deck.
2. Rode `diagnosticarFinanceiro()` para validar IDs e acesso.
3. Rode `diagnosticarDeckCompleto()` para listar fontes, meses divergentes e
   as 34 páginas de placeholder.
4. Rode `regerarApresentacaoFinanceiro()`.

Se o limite de execução do Apps Script for atingido, use as três funções de
geração em partes, na ordem indicada pelos próprios logs.

O PDF e o XLSX locais são somente referências e não devem ser publicados no
repositório.
