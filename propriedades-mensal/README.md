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

1. **Indicadores** — o que a área acompanha além de chamados? Vistorias,
   contratos, ocupação, inadimplência, garantias de obra?
2. **Fontes** — quais planilhas alimentam cada indicador.
3. **SLA de preventivas** — ver a seção abaixo.

## SLA de preventivas: nenhum projeto do repositório calcula

Procurei nos quatro. **Todos leem um percentual já pronto da planilha**,
nenhum faz a conta:

| Projeto | De onde vem |
|---|---|
| `megas-mensal/` | aba PREVENTIVAS, linha cujo indicador contém "sla" ou "atend" |
| `boletim/` | células fixas BM9 (Facilities), BM10 (Property), BM11 (Operação), BM12 (Geral) |
| `gestao-tvs/` | célula de percentual da linha de preventiva de cada unidade |

Ou seja: a regra de cálculo mora na planilha, não no código — e por isso não
dá para aprendê-la lendo o repositório.

Há ainda indício de **duas definições diferentes** em uso:

- `megas-mensal` trabalha com **previstas x realizadas** (execução);
- `gestao-tvs` trabalha com **conforme x não conforme** (cumprimento de
  prazo), com meta de 90%.

São coisas distintas: uma preventiva pode ter sido realizada (entra em
"realizadas") e ainda assim fora do prazo (entra em "não conforme").

E há um número que não fecha no e-mail modelo: *"SLA atendido de 94,74% no
mês (189 realizadas de 190 previstas)"*. 189/190 dá **99,47%**, não 94,74%.
O valor 94,74% corresponde a 180/190. Antes de replicar a conta aqui, vale
esclarecer qual é o numerador e o denominador de verdade.

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
