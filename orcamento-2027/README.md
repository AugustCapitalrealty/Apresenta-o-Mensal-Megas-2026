# Orçamento 2027 — Megas

Gera a apresentação do orçamento 2027 no Google Slides para cada Mega:
visão geral de todas as contas (DRE e ofensores), o detalhe linha a linha
das três contas em foco e a conta Manutenção de Imóveis aberta por
categoria, com os contratos distribuídos nas categorias.

| | |
|---|---|
| Apresentação — Curitiba | [`MEGA CURITIBA`](https://docs.google.com/presentation/d/1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI/edit) |
| Apresentação — Itajaí | [`MEGA ITAJAÍ`](https://docs.google.com/presentation/d/1IBhGpq4PPPHj4il-2zEYRX1a_7ftJN_1X0VRFb4kA_E/edit) |
| Apresentação — Esteio | [`MEGA ESTEIO`](https://docs.google.com/presentation/d/1hynGvAf4fCYFexCOi5jvf7dm50TFFwbmPV1jwLy1w_0/edit) |
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

- `gerarCuritiba()` / `gerarItajai()` / `gerarEsteio()` — substitui o
  conteúdo da apresentação **da cidade** (`deckId` em `ORC_CIDADES`). Itajaí e
  Esteio ainda sem as planilhas de CONTRATOS: a diferença aparece como "Não
  detalhado"
- `gerarTodas()` — as três em sequência, cada uma na sua apresentação. Chega
  perto do limite de 6 min do Apps Script: prefira uma cidade por vez
- `aplicarPropostasTextos()` — copia as propostas de texto curto para a
  planilha de textos (ver "Textos das tabelas")
- `diagnosticarOrcamento()` — só lê e mostra no log contas, categorias e a
  conferência das somas
- `exportarSlidesGerados()` — salva cada slide gerado como PNG em
  `_slides-gerados` (pasta APRESENTAÇÃO ORÇAMENTO), para revisar fora do Slides
- `exportarFixtures()` — salva as planilhas como JSON em `_fixtures`; copie
  para `teste/` quando os dados mudarem

Os slides novos são criados primeiro e os antigos só são apagados no fim.

## Os slides (por cidade)

O deck é dividido em seções, cada uma aberta por uma sub capa numerada
(ordem definida na revisão do gestor de 30/09/2026):

| # | Seção | Slides |
|---|---|---|
| | Capa | nome do Mega |
| | Revisar antes da versão final | **só quando os relatórios divergem** — ver "Divergências entre relatórios" |
| 01 | Premissas | três blocos para o gestor preencher: Premissas, O que foi analisado, Como ler o relatório |
| 02 | Resumo Executivo | resumo de 30 segundos e ponte Ritmo → Orç |
| 03 | DRE | DRE, Ofensores, Defensores |
| 04 | Manutenção | linha a linha, resumo por categoria, distribuição mensal, categorias, Demais |
| 05 | Segurança | linha a linha |
| 06 | Limpeza e Conservação | linha a linha |
| 07 | Investimento × Recorrente | manutenção: projetos pontuais × custo de manter |
| 08 | Custo por m² | R$/m² ao mês das 10 maiores contas e área implícita |

Seção sem dado (cidade sem planilha) não ganha sub capa, e a numeração das
seguintes não pula.

| Arquivo | Slide |
|---|---|
| `10_Capa.gs` | Capa, sub capa de seção e o slide de Premissas |
| `10_ResumoExecutivo.gs` | Resumo executivo e ponte Ritmo → Orç (promovidos das sugestões; cálculos em `05_DadosSugestoes.gs`) |
| `11_DREOfensores.gs` | DRE (padrão da mensal dos Megas) e Ofensores/Defensores (padrão do financeiro), um slide para cada bloco |
| `12_LinhaALinha.gs` | Manutenção, Segurança e Limpeza: total × anos anteriores, mês a mês e composição |
| `13_Resumo.gs` | Manutenção: KPIs, ranking por categoria em barra combinada (contratos + avulsos), maiores itens |
| `14_Mensal.gs` | Previsão de entrega mês a mês e o item que puxa os 3 meses mais pesados |
| `15_Categorias.gs` | Um slide por categoria com ≥ 5% do total (com coluna FONTE em branco); as menores em "Demais categorias" |
| `17_Investimento.gs` | Manutenção: investimento × custo recorrente (aprovado das sugestões) |
| `18_CustoM2.gs` | Custo por m² ao mês, top 10 contas (aprovado das sugestões) |
| `19_Revisar.gs` | Slide "Revisar antes da versão final" e o selo ⚠ REVISAR (só com divergência) |
| `90_Pendentes.gs` | **Não gerado.** Sugestões com pendência: Contratos (concentração e reajustes) e Contratos sem reajuste — custo de implantação lido como reajuste; Fluxo mensal — informações inconsistentes; Cenários — em revisão |

Os cálculos dos slides que nasceram como sugestão estão em
`05_DadosSugestoes.gs`. Para voltar com um pendente: corrija, chame no
pipeline (`_orcGerarCidade_`, `00_Main.gs`) e troque `_orcMarcarSugestao_`
por `_orcRodape_`.

### Divergências entre relatórios

A geração confere a METRAGEM-COND (soma das contas × totais) e a
Despesas-Mensal contra a METRAGEM (12 meses do Orç × Orç anual, conta a
conta). Se algo não fecha, o deck sai marcado para revisão, sem esconder
nada:

- slide **Revisar antes da versão final** logo depois da capa, com os dois
  valores de cada conta, a diferença e em que slides a conta aparece;
- selo laranja **⚠ REVISAR · <contas>** no canto dos slides cujos números
  passam pela conta (resumo, ponte, DRE, ofensores, defensores, custo por
  m²; linha a linha e investimento só se a conta for deles);
- a linha da conta em laranja com ⚠ nas tabelas e no degrau da ponte.

O deck usa a METRAGEM. Corrigida a planilha da controladoria, a geração
seguinte não acha divergência e o slide e os selos somem sozinhos. Em
05/10/2026 Curitiba diverge em IPTU (mensal R$ 497.079 × METRAGEM
R$ 494.048) e Seguro (R$ 614.427 × R$ 603.783); Itajaí e Esteio fecham.

### Textos das tabelas (fonte única)

Toda tabela usa uma fonte só: a descrição que não cabe é cortada com "…", em
vez de encolher a letra só naquela linha. O texto curto quem escolhe é o
gestor, na planilha
[`ORÇAMENTO 2027 - TEXTOS DAS TABELAS`](https://docs.google.com/spreadsheets/d/1whAdU26wkp6gV5RKtgX7jaBhhGIywZ3iV2CSiXdacGY/edit)
(`ORC_TEXTOS_ID`), uma aba por tipo de tabela (Composição, Maiores itens,
Categorias, Ofensores, Sugestões):

| Coluna | Quem preenche |
|---|---|
| A — Texto original | a geração |
| B — Como aparece hoje | a geração |
| **C — Texto na apresentação** | **o gestor** (vazio = original) |
| D — Cortado? / E — Cabe até (letras) / F — Onde aparece | a geração |

Cada `gerarCuritiba()` lê a coluna C antes de desenhar e no fim atualiza as
demais colunas, acrescentando textos novos — a coluna C nunca é
sobrescrita. Texto escolhido numa aba vale nas outras onde a mesma descrição
aparece, salvo se a outra aba tiver escolha própria. Ver `06_TextosTabelas.gs`.

Propostas prontas ficam em `07_PropostasTextos.gs` (`ORC_PROPOSTAS_TEXTOS`:
aba, texto original, proposta, proposta anterior), cobrindo as três cidades.
`aplicarPropostasTextos()` copia cada proposta para a coluna C **onde ela está
vazia ou ainda tem a proposta anterior intacta** — assim uma proposta revista
substitui a antiga, e o que o gestor escreveu à mão nunca é trocado. O teste
confere que nenhuma proposta sai cortada. A antiga planilha `ORÇAMENTO 2027 -
PROPOSTAS DE TEXTO` não é mais lida.

Estilo das propostas: AMZ no lugar de ARMAZÉM; sem a conta de preço
("R$ 39/M2 X 539,5"), mas com a área ou quantidade que importa; erros de
digitação da planilha corrigidos (TORNQUETE, IMPERMEANILIZAÇÃO,
DEMERCAÇÃO…); contrato com o assunto entre parênteses ("CONTRATO — LCW
(ELÉTRICA)"); "(RETIRADO)" mantido onde o modelo diz que o item saiu do
orçamento.

### Texto das Premissas

O gestor escreve direto no slide de Premissas. Como cada geração recria o
deck, **copie o texto dele para `premissas` da cidade em `ORC_CIDADES`**
(`01_Config.gs`) antes de gerar de novo — senão ele se perde. Com o texto
lá, o slide passa a sair preenchido.

## Para incluir outro Mega

Acrescente a cidade em `ORC_CIDADES` (`01_Config.gs`) com a apresentação
(`deckId`), os modelos 090 e 070, os relatórios METRAGEM-COND e
Despesas-Mensal e, quando houver, as planilhas de CONTRATOS. Os modelos têm
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
