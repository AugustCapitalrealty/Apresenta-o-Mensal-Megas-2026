# Orçamento 2027 — Megas

Gera a apresentação do orçamento 2027 no Google Slides para cada Mega:
visão geral de todas as contas (DRE e ofensores), o detalhe linha a linha
das três contas em foco e a conta Manutenção de Imóveis aberta por
categoria, com os contratos distribuídos nas categorias.

| | |
|---|---|
| Apresentação | [`1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI`](https://docs.google.com/presentation/d/1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI/edit) |
| Projeto Apps Script | [`13j2b0md…Cup3`](https://script.google.com/home/projects/13j2b0mdjYO2wbag2d5qOQwyBMDEKrIhd-_H7ZQqHUoEBEVfYJLx7Cup3/edit) |

## Planilhas lidas (por cidade, em `ORC_CIDADES`)

| Chave | Planilha | Para quê |
|---|---|---|
| `despesasGeraisId` | `090-Despesas-Gerais - MEGA <CIDADE> - 2027`, aba `Valores do Modelo` | itens avulsos da manutenção |
| `servicosTerceirosId` | `070-Servicos-de-Terceiros - MEGA <CIDADE> - 2027`, aba `Valores do Modelo` | itens de segurança e limpeza |
| `contratos[<conta>]` | `MEGA <CIDADE> - <CONTA> - CONTRATOS` (manutenção, segurança; limpeza pendente) | contratos recorrentes que os modelos não listam |
| `relatorios.metragemId` | `METRAGEM-COND-MEGA-<CIDADE>` | DRE, ofensores, totais por conta |
| `relatorios.mensalId` | `Despesas-Mensal-2026-x-2027` | mês a mês da análise linha a linha |

**Modelo 090 + contratos = total da manutenção na METRAGEM** (Curitiba:
1.417.219 + 343.189 = 1.760.408). O teste confere essa identidade.

A `Mega-Curitiba-Mensal-2027` **não** é usada: a coluna Variação do ano
repete a variação de janeiro.

Contrato novo precisa de categoria em `ORC_CONTRATOS_CATEGORIA`
(`01_Config.gs`); sem ela ele vai para "CONTRATOS SEM CATEGORIA" e o log
avisa. As contas detalhadas linha a linha estão em `ORC_CONTAS_DETALHE`
(`12_LinhaALinha.gs`).

## Publicação: este projeto usa `clasp`

Diferente das outras pastas, aqui o código sobe com `clasp` — não se cola à
mão. De dentro desta pasta:

```sh
node teste/teste_orcamento.js   # antes de subir
clasp push
```

O `.claspignore` só deixa subir `*.gs` e `appsscript.json`; a pasta `teste/`
fica fora. Por isso, **não edite no editor do Apps Script**: o próximo
`clasp push` apaga o que foi feito lá. Se editar, rode `clasp pull` antes.

## Como rodar

No editor do Apps Script, escolha a função e clique em Executar:

- `gerarCuritiba()` — substitui o conteúdo da apresentação pelo de Curitiba
- `gerarItajai()` / `gerarEsteio()` — idem (hoje escrevem o aviso de
  planilha não configurada)
- `gerarTodas()` — as três em sequência
- `gerarSugestoes()` — só a seção de sugestões de Curitiba (8 slides), para
  revisá-las sem gerar o deck inteiro; `gerarCuritiba()` volta o deck completo
- `diagnosticarOrcamento()` — só lê e mostra no log contas, categorias e a
  conferência das somas
- `exportarSlidesGerados()` — salva cada slide gerado como PNG em
  `_slides-gerados` (pasta APRESENTAÇÃO ORÇAMENTO), para revisar fora do Slides
- `exportarFixtures()` — salva as planilhas como JSON em `_fixtures`; copie
  para `teste/` quando os dados mudarem

Os slides novos são criados primeiro e os antigos só são apagados no fim.

## Os slides (por cidade)

| Arquivo | Slide |
|---|---|
| `10_Capa.gs` | Capa com o nome do Mega |
| `11_DREOfensores.gs` | DRE (padrão da mensal dos Megas) e Ofensores/Defensores (padrão do financeiro) |
| `12_LinhaALinha.gs` | Manutenção, Segurança e Limpeza: total × anos anteriores, mês a mês e composição |
| `13_Resumo.gs` | Manutenção: KPIs, ranking por categoria em barra combinada (contratos + avulsos), maiores itens |
| `14_Mensal.gs` | Previsão de entrega mês a mês e o item que puxa os 3 meses mais pesados |
| `15_Categorias.gs` | Um slide por categoria com ≥ 5% do total (com coluna FONTE em branco); as menores em "Demais categorias" |
| `16_Sugestoes.gs` | Seção **Sugestões para discussão** (faixa laranja + selo SUGESTÃO): resumo executivo, ponte Ritmo → Orç, manutenção investimento × recorrente, cenários do que adiar, contratos (concentração e reajustes), fluxo mensal, R$/m² por conta. Cálculos em `05_DadosSugestoes.gs` |

As sugestões ficam no fim do deck para o gestor escolher quais entram. Para
promover uma, mova a chamada dela em `_orcGerarSugestoes_` (`00_Main.gs`)
para o ponto do pipeline onde deve aparecer e tire `_orcMarcarSugestao_`.

## Para incluir Itajaí e Esteio

Preencha `despesasGeraisId` da cidade em `ORC_CIDADES` (`01_Config.gs`) com o
ID da planilha `090-Despesas-Gerais - MEGA <CIDADE> - 2027`. A planilha tem
que ter a mesma aba e as mesmas colunas — o cabeçalho é conferido na leitura.

## Armadilhas da planilha, já tratadas

- A conta vem gravada com espaço não-quebrável (`manutenção imóveis`):
  toda comparação passa por `_orcNorm_`.
- Um item tem o colchete não fechado (`[MONITORAMENTO - KIT SONDA ...`); a
  leitura aceita.
- A despesa vem com sinal negativo; a leitura inverte.
- A linha `RATEIO` vem zerada nos doze meses e é ignorada.
- Conta não encontrada ou coluna deslocada **param a geração** com o aviso no
  slide, em vez de desenhar R$ 0.
