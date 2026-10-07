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

## Este computador tem Deep Freeze — o que se perde

O disco **C: volta ao estado congelado a cada reinício**. Só sobrevive o que
está no **G:** (Drive compartilhado) e no **GitHub**. Na prática:

- **Fim de toda sessão: `git commit` + `git push`.** O repositório está no G:,
  mas commit que não subiu para o GitHub não tem cópia fora daquela pasta.
- **`clasp login` de novo depois de reiniciar** — a credencial fica em
  `C:\Users\<usuário>\.clasprc.json`. Sem ela, `clasp push` falha.
- **`pip install openpyxl`** de novo, se for rodar as `ferramentas/` em Python.
- A memória do Claude Code (`C:\Users\<usuário>\.claude\…`) também se
  perde: **o que importa sobre o projeto fica neste README**, não lá.
- Script ou planilha feita "de passagem" (scratchpad, Downloads, Área de
  Trabalho) some. Ferramenta que vale guardar vai para `ferramentas/`.

## Pasta no Drive (nomes padronizados em 07/10/2026)

`08.000 - Business Analysis/APRESENTAÇÃO ORÇAMENTO`. Padrão dos nomes:
**`MEGA <X> - <o que é> <ano>`** nos arquivos de cada Mega, **`MESTRA - …`**
nas consolidadas e **`PODE EXCLUIR - …`** no que já não serve (o conector
não exclui neste Drive compartilhado; quem exclui é o usuário).

| Pasta | O que tem |
|---|---|
| `00 - PLANILHAS MESTRAS` | **guardar**: `MESTRA - ORÇAMENTO 2026 ITEM A ITEM - TODOS OS MEGAS` (era "Modelos 2025 Megas"), `MESTRA - CONTRATOS 2026 - TODOS OS MEGAS` (era "2025 - Contratos"), `MESTRA - CONTRATOS 2027 - TODOS OS MEGAS` (era "CONTRATOS-2027-COMPLETO" — **fonte dos contratos de Itajaí e Esteio**), `MESTRA - TOTAIS 2026 POR CONTA - TODAS AS UNIDADES` (era "2026") |
| `01 - CONTROLE DA APRESENTAÇÃO` | `ORÇAMENTO 2027 - TEXTOS DAS TABELAS` e `ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - MEGA <X>` (uma por Mega; o gestor marca SIM/NÃO) |
| `02 - MEGA CURITIBA` / `03 - MEGA ITAJAÍ` / `04 - MEGA ESTEIO` | `MEGA <X> - APRESENTAÇÃO ORÇAMENTO 2027`, `- METRAGEM-COND 2027`, `- DESPESAS MENSAL 2026 x 2027`, `- 090 DESPESAS GERAIS 2027`, `- 070 SERVIÇOS DE TERCEIROS 2027`, `MEGA <X> - BASE DO ORÇAMENTO 2027.xlsx` (recorte do Mega tirado das mestras, aba LEIA-ME com cada arquivo) |
| `02 - MEGA CURITIBA/99 - ARQUIVO (não usado pela apresentação)` | lançamentos de jan–jul/26 (090, 070, manutenção de máquinas) e a cópia com os apontamentos do gestor de 29/09 (`exportarSlidesRevisao()` lê ela) |
| `PODE EXCLUIR - …` | cópias e testes: `_fixtures` e `_slides-exportados` (o código recria se precisar), `TESTE-2 - COMPLETO` e `CONTRATOS 2027` (substituídas pela mestra 2027), planilhas "SERVIÇOS" de Curitiba e "MODELOS" de Itajaí (repetem o 070/090) |
| `Apresenta-o-Mensal-Megas-2026` | este repositório (**não renomear**: é o caminho do git e do clasp) |

Mudar arquivo de pasta não quebra o gerador (ele usa o ID). O conector do
Drive do Claude não consegue mover arquivos neste Drive compartilhado; mover
pela pasta sincronizada (`G:\Drives compartilhados\…`) funciona.

Orç 2026 de Curitiba confere: modelo 2026 da manutenção (R$ 894,5 mil) +
contratos do cadastro (R$ 371,7 mil) = R$ 1.266.241, igual à METRAGEM.

## Planilhas lidas (por cidade, em `ORC_CIDADES`)

| Chave | Planilha | Para quê |
|---|---|---|
| `despesasGeraisId` | `MEGA <X> - 090 DESPESAS GERAIS 2027`, aba `Valores do Modelo` | itens avulsos da manutenção |
| `servicosTerceirosId` | `MEGA <X> - 070 SERVIÇOS DE TERCEIROS 2027`, aba `Valores do Modelo` | itens de segurança e limpeza |
| `contratosDoCadastro: true` | `MESTRA - CONTRATOS 2027 - TODOS OS MEGAS` (`ORC_CONTRATOS_ANO_IDS`, 02_Dados.gs — vale o primeiro da lista com valor para o Mega) | contratos recorrentes que os modelos não listam, tirados do cadastro do ano, todas as contas da unidade — **os três Megas** desde 07/10/2026 (padronizado nas planilhas mestras). Cabeçalho do mês como data ou como texto "jan./27" |
| `contratos[<conta>]` | uma planilha de contratos por conta | formato antigo de Curitiba (até 07/10/2026); fica vazio (`{}`). O leitor continua no código |
| `relatorios.metragemId` | `MEGA <X> - METRAGEM-COND 2027` | DRE, ofensores, totais por conta |
| `relatorios.mensalId` | `MEGA <X> - DESPESAS MENSAL 2026 x 2027` | mês a mês da análise linha a linha |
| `relatorios.financeiroMegasId` | planilha da apresentação mensal dos Megas, aba `Financeiro <ano retrasado>` | Real 2025 mês a mês (slide de custo por m² mês a mês) |
| `relatorios.valeMetragem` | — | contas em que o mensal não fecha com a METRAGEM e a contabilidade mandou usar a METRAGEM (Curitiba: IPTU e Seguro, 06/10/2026) |
| `fotoFundoId`, `unitLogoId` | foto e logo do Mega (os mesmos da capa dos Megas) | capa |
| `ORC_CONTRATOS_ANO_ANTERIOR_ID` (21_ContratosComparados.gs) | `MESTRA - CONTRATOS 2026 - TODOS OS MEGAS` | contratos do ano anterior, para comparar com os do ano |

Cabeçalho de mês "jan./26" vindo de CSV vira a data 26/01/<ano corrente> no
Sheets: **o ano está no dia**. Os leitores dos cadastros tratam isso.

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

Roteiro completo da primeira checagem: [`PASSO-A-PASSO.md`](PASSO-A-PASSO.md).

- `gerarCuritiba()` / `gerarItajai()` / `gerarEsteio()` — substitui o
  conteúdo da apresentação **da cidade** (`deckId` em `ORC_CIDADES`)
- `gerarTodas()` — as três em sequência, cada uma na sua apresentação. Chega
  perto do limite de 6 min do Apps Script: prefira uma cidade por vez
- `aplicarPropostasTextos()` — copia as propostas de texto curto para a
  planilha de textos (ver "Textos das tabelas")
- `diagnosticarOrcamento()` — só lê e mostra no log contas, categorias e a
  conferência das somas
- `exportarSlidesCuritiba()` / `exportarSlidesItajai()` /
  `exportarSlidesEsteio()` — salva cada slide gerado como PNG em
  `_slides-gerados - MEGA <X>` (pasta APRESENTAÇÃO ORÇAMENTO), para revisar
  fora do Slides — inclusive numa sessão do Claude sem acesso ao Drive
- `exportarFixtures()` — salva **todas** as planilhas que o gerador lê, dos
  três Megas, como JSON em `_fixtures`; copie por cima de `teste/` quando os
  dados mudarem (ver [`HANDOFF.md`](HANDOFF.md))

Os slides novos são criados primeiro e os antigos só são apagados no fim.

## Os slides (por cidade)

O deck é dividido em seções, cada uma aberta por uma sub capa numerada
(ordem definida na revisão do gestor de 30/09/2026):

| # | Seção | Slides |
|---|---|---|
| | Capa | foto do Mega com véu, logo do Mega, total do orçamento em R$ e em R$/m² |
| | Revisar antes da versão final | **só quando os relatórios divergem ou falta dado** — ver "Divergências entre relatórios" e "Pendências de dados" |
| 01 | Premissas | três blocos para o gestor preencher: Premissas, O que foi analisado, Como ler o relatório |
| 02 | Resumo Executivo | resumo de 30 segundos e ponte Ritmo → Orç |
| 03 | DRE | DRE, Ofensores, Defensores, Contratos de todas as contas (ano anterior × ano) |
| 04 | Manutenção | linha a linha (1/2 e 2/2 com os itens menores), contratos Ritmo × Orç item a item, resumo por categoria, distribuição mensal, categorias, Demais |
| 05 | Segurança | linha a linha |
| 06 | Limpeza e Conservação | linha a linha |
| 07 | Projetos × Recorrente | manutenção: projetos × custo para manter o Mega rodando, com legenda de cada grupo |
| 08 | Custo por m² | R$/m² das 10 maiores contas; mês a mês (Real 2025, Ritmo 2026, Orç 2027) com custo do condomínio e área |

**O diretor lê tudo em dinheiro e em R$/m² ao mês** (área implícita da
METRAGEM = total ÷ R$/m² ÷ 12): todo slide de valores traz os dois. DRE,
Ofensores e Defensores seguem o padrão da DRE dos Megas — um total
(Despesas Operacionais), IPTU e Seguro em Utilities, R$/m² por grupo, todas
as contas com valor visível (sem "Demais contas").

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
| `17_Investimento.gs` | Manutenção: projetos × custo recorrente, com a legenda de cada grupo |
| `18_CustoM2.gs` | Custo por m² ao mês, top 10 contas |
| `20_M2Mensal.gs` | Custo por m² mês a mês, custo do condomínio e área |
| `22_ContratosTodos.gs` | Contratos de todas as contas, ano anterior × ano, agrupados por conta (depois dos Defensores, em quantas páginas precisar) |
| `21_ContratosComparados.gs` | Contratos do ano anterior × do ano, fornecedor a fornecedor (`MESTRA - CONTRATOS 2026` × contratos e itens [CONTRATO] do ano) |
| `19_Revisar.gs` | Slide "Revisar antes da versão final", selo ⚠ REVISAR (divergência entre relatórios) e ⚠ PENDENTE (pendência de dados) |
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

### Pendências de dados (alerta sempre ligado)

Pedido do gestor (07/10/2026): **o que falta nas fontes aparece no deck até
ser resolvido**. `_orcPendencias_` (19_Revisar.gs) confere, nas contas
detalhadas (manutenção, segurança, limpeza):

- **Contratos <ano> não informados** — a conta tem parte do total em "Não
  detalhado" e nenhum contrato (nem planilha, nem cadastro do ano);
- **Modelos acima da METRAGEM** — modelos + contratos somam mais que o
  relatório, com os meses (pelo relatório mensal).

Cada pendência entra no slide **Revisar antes da versão final** (subtítulo
"dados pendentes") e põe o selo **⚠ PENDENTE · <conta>** nos slides da conta
— não nos do total geral. Some sozinha quando a fonte for preenchida.

Em 07/10/2026:

- Com o `MESTRA - CONTRATOS 2027`, segurança, limpeza, telefone,
  informática e cursos de Itajaí e Esteio fecham exato com o que os modelos
  não abrem — nenhum "Não detalhado".
- **Itajaí** — o 090 tem R$ 29.313 que a METRAGEM não tem: manutenção e
  pintura do totem (jan, R$ 11.500) e iluminação dos AMZ 4 e 5 e do bolsão
  (fev, R$ 11.875 + R$ 5.938).
- **Esteio** — o 090 tem R$ 15.268 que a METRAGEM não tem: as duas linhas
  de vida vertical das escadas marinheiro (AMZ A e B2, out, R$ 7.635 cada).
- Nos dois: confirmar com a controladoria se o item fica (METRAGEM sobe) ou
  sai do 090.

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

## Ferramentas (`ferramentas/`)

Scripts que montam planilhas de apoio no Drive a partir das cópias em
`teste/` (rodar de dentro de `orcamento-2027`; a saída vai para
`ferramentas/saida/`, fora do git):

- `python ferramentas/planilha_mega.py` — `MEGA <X> - BASE DO ORÇAMENTO 2027`
  de cada cidade.
- Comparação item a item da manutenção, **Ritmo 2026** × Orç 2027, por Mega
  (`<cidade>` = `curitiba`, `itajai` ou `esteio`; itens em
  `comparacao_base.js`; `BASE26=orcado` volta à base do orçado 2026):
  - `python ferramentas/ritmo2026_fixtures.py` — converte o ritmo 2026
    exportado do sistema (`ferramentas/bases_2026/`: 090 item a item e cadastro
    de contratos) em `teste/fixture_ritmo2026_090.json` e
    `teste/fixture_contratos_2026_cadastro.json`;
  - `node ferramentas/parear.js . <cidade> <saida.json>` — sugestão
    automática de pares;
  - `node ferramentas/curadoria.js . <cidade> ferramentas/saida/ritmo_linhas_<cidade>.json`
    — pares revisados à mão (`PARES`, escritos sobre o orçado 2026), com a
    leitura Compara / Não compara / Dúvida e o porquê. Cada item do orçado é
    casado com o do ritmo (`APELIDOS_RITMO`, mesmo fornecedor, mesmo chamado
    ou nome parecido); item só do ritmo entra por `PARES_RITMO` ou como "Só
    2026"; orçado sem gasto no ritmo e sem par vira "Não executado";
  - `python ferramentas/planilha_comparacao.py <cidade>` — planilha de
    decisão do gestor (`ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS RITMO 2026 x ORÇ
    2027 - MEGA <X>`, pasta `01 - CONTROLE DA APRESENTAÇÃO`). Traz o SIM/NÃO e
    os comentários da versão anterior (`ferramentas/base2026_orcado_2026-10-07/`),
    o orçado 2026 nas colunas M e N e a coluna P "Olhar de novo?" com o que o
    ritmo mudou (essas linhas vêm primeiro).
  Em 07/10/2026 (ritmo): olhar de novo Curitiba 12, Itajaí 21, Esteio 12.

Suba o .xlsx gerado pela pasta sincronizada do Drive (ou pelo navegador).

Imagens e revisão visual (`python -m pip install pillow numpy`):

- `python ferramentas/capas_imagem.py` — desenha a capa (K2b) e as 8 sub capas
  (C1) de cada Mega como imagem de slide inteiro, com as fontes do deck (`ferramentas/fontes/`,
  Montserrat e Open Sans, licença OFL), em `APRESENTAÇÃO ORÇAMENTO\IMAGENS -
  SLIDES\CAPA - MEGA <X>.jpg`. O gerador usa a imagem como fundo e escreve por
  cima só os logos e os números da METRAGEM (na sub capa, os números da seção
  e áreas clicáveis sobre a trilha); sem a imagem, desenha com formas. Sub capa
  em imagem só no deck com as 8 seções (o número está desenhado nela). Fotos de `_fotos-subcapas` (`zipFotosSubcapas()` no editor). Rodar de
  novo se mudar foto, ano ou nome; `--previa` desenha uma com números.
- `python ferramentas/decisoes_gestor.py` — lê as planilhas de comparação
  que o gestor preencheu ("… RITMO 2026 x ORÇ 2027 - MEGA <X>.xlsx" na pasta
  `01 - CONTROLE DA APRESENTAÇÃO`; se ele editar como Planilha Google, baixar
  como .xlsx para Downloads, que vence) e grava `23_DecisoesGestor.gs` (obras
  adiadas de 2026, com o orçado e o ritmo, e pares SIM). Rodar de novo sempre que ele mudar uma planilha; depois teste, commit e
  `clasp push`. Alimenta o slide "Por que a manutenção sobe" (`24_PorQueSobe.gs`).
- `python ferramentas/previa_slides.py ferramentas/saida/formas_<cidade>.json <índices>` —
  prévia aproximada dos slides, a partir das formas que o teste grava com
  `PREVIA=ferramentas/saida node teste/teste_orcamento.js` (conferir layout
  sem abrir o Slides).
- `python ferramentas/efeitos_imagem.py foto|carimbo|folha|miniatura …` —
  foto em retícula na cor da marca (com borda rasgada e sombra), carimbo
  PENDENTE, folha de contato dos PNG exportados e teste de miniatura. O que
  o Slides não faz sozinho; as ideias de uso estão em
  [`IDEIAS-DESIGN.md`](IDEIAS-DESIGN.md).

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
