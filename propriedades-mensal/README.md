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

## O que falta decidir

Estas quatro respostas mudam a estrutura do projeto, então valem antes do
primeiro slide:

1. **Escopo** — a apresentação cobre quais empreendimentos? Só os três Megas,
   ou o portfólio inteiro de propriedades?
2. **Recorte** — um deck por propriedade (como os Megas) ou um deck
   consolidado com todas?
3. **Indicadores** — o que a área acompanha? Vistorias realizadas, contratos,
   ocupação, inadimplência, backlog de chamados PROPERTY, garantias de obra?
4. **Fontes** — quais planilhas alimentam cada indicador?

Enquanto isso não está definido, `01_Config.gs` fica com os IDs em branco e
`00_Main.gs` com o pipeline vazio — rodar avisa o que falta em vez de gerar
slide com dado inventado.

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
