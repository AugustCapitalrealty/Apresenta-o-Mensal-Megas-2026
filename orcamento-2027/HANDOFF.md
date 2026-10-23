# Orçamento 2027 — contexto para uma nova sessão do Claude

Leia isto antes de mexer em `orcamento-2027/`. Foi escrito em 07/10/2026 para
uma sessão que **só tem o computador**: sem conector do Google Drive, sem as
memórias da sessão anterior (o C: tem Deep Freeze e apaga tudo a cada
reinício). O que importa sobre o projeto está aqui, no
[`README.md`](README.md) (referência técnica completa) e no
[`PASSO-A-PASSO.md`](PASSO-A-PASSO.md) (o que o usuário roda no editor).

## 0. COMECE AQUI — onde parou (22/10/2026 — V2 / v5 da apresentação de Facilities)

**>>> 23/10/2026, manhã (Claude) — RITMO NOVO E GALERIA COM R$ 1 <<<**
- **Ritmo 2026 de 23/10, 9h11** (RITMO-*.xlsx que o Guilherme baixou de novo): jan–set iguais aos de 12/10; **out–dez
  mudaram**. Itajaí, Manutenção de imóveis: out 159.523 → 108.928, nov 189.009 → 295.173, dez 176.610 → 241.710 (R$/m²
  mês com IPTU e seguro: out 3,89 → 3,42, nov 4,48 → 5,46, dez 4,37 → 4,97). Curitiba: manutenção nov/dez e limpeza
  out um pouco menores; Esteio: manutenção out −3,6k / nov +3,6k. O ano de cada conta já fecha com a METRAGEM de 22/10
  (o gerador espalhava a diferença pelo formato de 12/10 — ano certo, meses errados). **A nota de 22/10 dizendo
  que out–dez não tinham mudado estava errada para este arquivo.**
  - Arquivos em `ATUALIZAÇÃO 23-10-2026` (G:), regras em `ORC_NOMES_ATUALIZACAO` (30_Importar.gs, pasta trocada).
    `importarAtualizacao()` rodado 23/10 9h32; `ritmoId` e `mensalMetragemId` dos 3 Megas trocados em 01_Config.gs e
    `clasp push` feito. **Falta:** Guilherme gerar o começo e os 3 Megas. Fixtures `teste/fixture_ritmo_<c>_2310.json`.
- **"De 2026 o que já foi já foi, não mexa" (Guilherme, 23/10):** o realizado (jan–set) do ritmo nunca muda. A
  conciliação com a METRAGEM (`_orcAjustarSerie_`, travado no Ritmo) só mexe em out–dez; se não couber sem mês
  negativo, a conta fica sem fechar e vai para `rel.mensalNaoConciliado` + log (hoje: IPTU Curitiba e Seguro Itajaí,
  que no m² com IPTU seguem o ano da DRE). Antes ela espalhava a diferença pelo ano todo. A metragem mensal só troca o
  Orç 2027 das contas que o Despesas-Mensal já tem.
- **Metragem mensal 2026 × 2027** (`Mxxx-2026-x-Orcamento-2027.xlsx`, 23/10 9h25 → `relatorios.mensalMetragemId`,
  `_orcAplicarMensalMetragem_` em 04_DadosRelatorios.gs): mesmas contas da METRAGEM mês a mês **com a Despesa de
  pessoal** (antes o m² mês a mês punha 1/12 do ano; 2027 tem o degrau do dissídio em mai/jun, 2026 o pico de jan).
  Sem IPTU e Seguro (ficam do Despesas-Mensal). Orç 2027 das outras contas = mensal das 23h (diesel já corrigido).
  2026: out–dez = ritmo de 9h; **agosto diverge** do ritmo e da METRAGEM em Itajaí (área comum −8,9k: água −8k,
  limpeza +7,9k, consultoria +7,7k, locação −6k…) e Esteio (+8,5k: manutenção +13,7k, máquinas −6,7k…) — o 2026 segue
  do ritmo (fecha com a METRAGEM/DRE); perguntar à controladoria qual agosto vale. Linhas "R$ M² MÊS" não viram conta.
  Ritmo out–dez no m² com IPTU e seguro (teste): Itajaí 3,42 / 5,47 / 4,97, Curitiba 4,07 / 4,46 / 4,27, Esteio
  6,99 / 7,34 / 7,21 = planilhas. Teste: 5.152/5.152. Fixtures `teste/fixture_mensalmet_<c>_2310.json`.
- **Itens "RETIRADO DO ORÇAMENTO" voltam a aparecer, com R$ 1 cada** (Guilherme, 23/10): `_orcLinhasModelo_`
  (02_Dados.gs) zera os meses e põe R$ 1 no mês de maior valor. A galeria da comporta B2 no 090 de 23h já estava com
  R$ 0,01 em jan. Esteio V2 **R$ 3.839.292**, Facilities **R$ 17.564.277** (+R$ 3); impacto "Itens retirados" −1.464,57.
  Teste: 5.142/5.142.

**>>> 22/10/2026, noite (Claude) — IMPACTO V1 → V2 CALCULADO DOS DADOS <<<**
- Conferência item a item da base V1 × planilhas de 22/10: a lista de ajustes do Argon bate (cada Mega fecha no
  total). Esteio: a Assessoria de RH (−90.000) saiu do 090 sem mexer no total (já estava na Despesa de pessoal).
- Os slides de impacto tinham os valores digitados no código; agora `_orcImpactoMega_` (35_Versoes.gs) calcula cada
  linha pela diferença item a item (`ORC_AJUSTES_V2`), Pátio/R$/m²/% vêm do relatório; a linha "contratos e RH" é o
  resto que fecha no total. Valor diferente do de 22/10 → ⚠ na observação. Base V1 lida do Drive (`ORC_V1_BASE_ID`,
  reserva `1-O6ybc4RZfJeoEviENdGqc_yi14Mgxyu`); sem ela, valores de 22/10 e aviso no rodapé.
- Diferenças só de arredondamento: obras excluídas do Itajaí (677.605, não 677.604); subtotal Esteio antes do Pátio
  R$ 4.107.901.
- Teste: 4.920/4.920 (fixture nova `teste/fixture_base_v1.json` = a BASE V1). `clasp push --force` feito.
- Pedido do Guilherme: o "Custo por m² mês a mês com IPTU e seguro" (antes só na apresentação "para colar",
  `gerarSlidesM2ComIptu()`) agora sai também em cada Mega, logo depois do "Custo por m² mês a mês" (título próprio,
  com selo como o outro). `gerarSlidesM2ComIptu()` continua existindo. Teste: 5.143/5.143.
- Slide novo por Mega **"O que saiu e o que entrou — Mega X · V1 → V2"** (`gerarSlideEntrouSaiu_`, 35_Versoes.gs), logo
  depois do impacto: ponte do R$/m² (V1 → saiu/reduziu → entrou/aumentou → pessoal da METRAGEM → Pátio ML → efeito da
  área → V2, fecha exato) e as duas tabelas item a item (abaixo de R$ 5 mil vai para "Demais ajustes"; "AMZ 1…4" numa
  linha; item só renomeado fica de fora; conta "dentro" da METRAGEM vira nota "sem efeito no total").
  Só esse slide no deck já gerado: `incluirSlideEntrouSaiu()` (27_Atualizar.gs; rodar de novo troca, não duplica).
- **Expediente** logo após a capa de Facilities (`ORC_EXPEDIENTE`, 25_Facilities.gs): Orçamentos — Time de Facilities;
  Revisão — Laureane Bransin; Montagem — Guilherme August; Apresentação — Jonatas Augusto (sem cargo: ninguém passou).
- **Saiu dos Megas o slide "Resumo executivo — Orçamento 2027"** (a seção Resumo Executivo fica e abre no impacto /
  na ponte). `gerarSlideResumoExecutivo_` continua no código, sem uso. Teste: 5.123/5.123.
- **`completarSlidesFaltando()`** (27_Atualizar.gs): em cada Mega já gerado, inclui só os slides que faltam
  (`ORC_GRUPOS_COMPLETAR`: impacto, o que saiu/entrou, ponte, m² com IPTU), no lugar certo, e tira os que saíram da
  geração (`ORC_SLIDES_QUE_SAIRAM`: o resumo executivo), com o link do sumário refeito. Não refaz o que já está nem
  confere conteúdo. Slide novo na geração → grupo em ORC_GRUPOS_ATUALIZAVEIS + nome em ORC_GRUPOS_COMPLETAR.
  Teste: 5.126/5.126.
- **Conferência com a v4 apresentada** (`referencia/CONFERENCIA-v4-x-geracao-22-10-2026.md`, texto dos 180 slides em
  `referencia/v4_apresentada_13-10-2026.json`): perdas corrigidas — premissas próprias de cada Mega
  (`ORC_PREMISSAS_MEGA`, 10_Capa.gs) e os 2 slides do drone do Curitiba sem marca (`ORC_GESTOR_SEM_MARCA`,
  31_VersaoFinal.gs). Cartão "Despesa de pessoal" no entrou/saiu (vem da METRAGEM/RH). Teste: 5.133/5.133.
- **22/10, noite — comentários do Jonatas/Guilherme no deck, aplicados na geração:** Ranking só com a tabela (G3);
  rodapé padrão dos grupos de manutenção (`ORC_GRUPOS_MANUT_RODAPE`); "item a item" sem a legenda e a caixa "= Alta";
  "por que sobe" sem a nota das obras adiadas; "Substituição Segurança" hoje/proposto com tabela no lugar do print
  (33_GestorRedesenho.gs); situações dos contratos do Esteio gravadas (`ORC_CONTRATOS_SITUACAO_GESTOR`); 75 fontes da
  v4 no código (`ORC_FONTES_PRINTS`); "Projetos — do maior" com mais espaço para o item; "Saída Voigt" no mês a mês da
  Segurança do Esteio (`ORC_ANOTACOES_MES`). Teste: 5.132/5.132.
- **22/10, ~23h:** itens "RETIRADO DO ORÇAMENTO" saem da leitura do 090 (02_Dados.gs) → Esteio V2 R$ 3.839.289,
  Facilities R$ 17.564.274 (impacto com a linha "Itens retirados"). Curitiba: situações dos contratos gravadas;
  pares extras das lavagens (`ORC_PARES_EXTRA`, 24_PorQueSobe.gs, por cima de 23_DecisoesGestor.gs gerado); Roçada
  (Grasstecno), coletas do restaurante (Transresíduos, Suíno Vivo) e Sentax (Gibraltar) com o 2026 do ritmo item a
  item (`ORC_CONTRATOS_ANT_RITMO`). "Por que sobe" sem as notas embaixo; Projetos com fonte única por coluna.
  Teste: 5.134/5.134.
- **A FAZER — imagens dos moldes (log do gerarMegaEsteio de 22/10, 23h16):**
  - **Molduras (dá sem Python):** faltam 4 na pasta IMAGENS - SLIDES — `MOLDURA - cc760defbc47.png` (Impacto das
    revisões), `6d0c8e6d56a3` (O que saiu e o que entrou), `ed99c6c51e90` (Defensores), `9925288b3201` (Projetos ×
    recorrente — itens 1/2). Specs em `MOLDURAS PENDENTES.json` → `node ferramentas/molduras_imagem.js <json>`, subir
    os PNG na pasta e gerar o Mega de novo. Itajaí e Curitiba vão pedir as suas ao serem gerados.
  - **Gráficos pelo motor (precisa de Python → só com liberação do Guilherme):** 21 slides do Esteio saem em formas
    (`GRAFICOS PENDENTES.json`, `ferramentas/graficos_imagem.py`). Em formas está certo, só menos bonito.
  - Planilha de textos: 197 textos, 10 cortados — conferir quais.
- **22/10, 23h — 090 e mês a mês novos carregados** (importarAtualizacao): 090 `16LPXeEkCwAwFOCuss4v5dYe11KM8JAfNWnSlljBb78I`;
  mensal Curitiba `1Un6j9AfAqiftiogUUDq3soieqEGf8ufOGf82ekdPMwU`, Itajaí `1S0jfhLXIRKTGynuOfoetkrjCkXx72NEGcNaSsmNxxjE`,
  Esteio `1LdGKll9z-edZIFhfCKlu0SaOYfm-CsI7xeYhvdZV2B0` (070 igual, segue o de 18h). Mudou: Curitiba troca de meses (linha de
  vida mar→jun, lavagem society jul→jun) e o diesel com um zero a mais em jun, corrigido na leitura
  (`ORC_CORRECOES_MODELO`, 02_Dados.gs, também no mês a mês). Totais V2 iguais. Fixtures `*_2300.json`.
- **Ritmo novo (RITMO-*.xlsx de 22/10, 22h06):** out–dez (projeção) igual ao que usamos nos 3 Megas; só mudam meses
  fechados (material de consumo fev/mar/ago) e o ano de IPTU Curitiba (+2.873) e Seguro Itajaí (−4.129). Não aplicado
  (Guilherme: meses fechados não deveriam mudar).
- **Dados para o gestor:** "LIMPEZA DA GALERIA… COMPORTA B2 – RETIRADO" ainda tem R$ 1.464,57 em jul no 090 (resolvido
  em 23/10: a linha sai com R$ 1); itens
  com R$ 1 (Esteio) e R$ 0,01 (Itajaí/Curitiba) são marcadores sem valor.
- **Próximo:** Guilherme rodar `gerarComeco()` e os 3 Megas para ver o deck; depois os apontamentos que faltam
  (G2, G3, C3, I8, I9 — ver CLAUDE.md da pasta).

**>>> 22/10/2026 — V2 (v5) CONCLUÍDA E SINCRONIZADA NO APPS SCRIPT <<<**
- **Novas Bases de 22/10/2026 Integradas:**
  - `METRAGEM-COND` revisada dos 3 Megas (Curitiba, Itajaí, Esteio).
  - `090` (Despesas Gerais) e `070` (Serviços Terceiros) com os itens novos e excluídos.
  - `Contratos-Ajustados.csv` (rev03) parseado em Latin1/Windows-1252.
  - **IDs Oficiais em `01_Config.gs` e `02_Dados.gs`:**
    - 090 Despesas Gerais: `1i1XFv1Xvmm5OumBykhTxO45Wr21462aA6rR1yBRwVFE`
    - 070 Serviços Terceiros: `1U8cUr3PrFaDvzE-ziEyFMtUWpArnI__ffbyMe2SE8BA`
    - Contratos rev03: `1Qg3V5YNC1q66YAncwloW_oE_1kNvHOIez_s_vq4N-0M`
    - Curitiba Metragem: `1tawzpoCAEF3ftXZPhCW1FcboxxFPARKsLheBabaszkk`
    - Curitiba Mensal: `1ZzmVcCmZTat8IGuqpq9IwtWEFyuWfeWDGxjL7xoAigI`
    - Itajaí Metragem: `14j2urNQdd5hkypJJ5RlVjyora7-Y14m0rDjnBIF1XtY`
    - Itajaí Mensal: `1A79qzCBlEvhvEc-W9pVTNVDI9PTPrGGmaZcwViUxcrA`
    - Esteio Metragem (Pátio ML): `1RvWqP_wxSk2eJVsojIMpu3tjfRPpHg1UZWjjiql5vCU`
    - Esteio Mensal: `1qkmBWvfikQ3wVLbcQkr0VQi8rRgBAVbkclF5bA1XxBk`
    - v5 do gestor (pasta VERSÕES): `1QJee0lt1nAIQiANR0X-OhegU_m3WuI3lZL3a2-zN2Wo`
- **Efeito Pátio Mercado Livre (Mega Esteio):**
  - Abatimento de `−R$ 267.144,28` (`−R$ 0,42/m²`) na Área Comum + IPTU.
  - Orçamento antes do Pátio: `R$ 4.107.901` (`R$ 6,40/m²`).
  - Orçamento líquido pós-Pátio: `R$ 3.840.756` (`R$ 5,98/m²`, redução líquida de `-4,5%` vs. V1).
  - Destaques implementados: Capa com valor antes/depois, Resumo Executivo com card dedicado, Ponte com degrau verde `Pátio ML`, DRE com dedução `(-) Pátio Mercado Livre` e M2 mensal líquido.
- **Slides de Impacto V1 → V2 (Modelo exato da foto do Guilherme):**
  - Tabelas elegantes: cabeçalho azul escuro, colunas `ITEM / MANUTENÇÃO` (165pt) | `EMPREENDIMENTO` (90pt) | `2027` (75pt, reduções em vermelho entre parênteses) | `Δ% ACUM.` (54pt) | `OBSERVAÇÃO` (280pt).
  - Abertura de Facilities: slide consolidado após o Sumário (`_orcLinhasImpactoFacilities_`).
  - Megas Individuais: slide de impacto entre o Resumo Executivo e a Ponte (`gerarSlideImpactoMega_`), com 4 cards de KPI no topo (`V1`, `Variação`, `Efeito Pátio ML`/`Redução por m²`, `V2 Final`).
- **Valores Oficiais Fechados V1 → V2:**
  - **TOTAL FACILITIES:** V1 `R$ 18.192.467` → V2 Antes Pátio `R$ 17.832.886` (`-2,0%`) → Pátio ML `(R$ 267.144)` → **V2 Final `R$ 17.565.742` (`-3,4%`)**.
  - **Mega Esteio:** V1 `R$ 4.020.587` (`R$ 6,27/m²`) → Antes Pátio `R$ 4.107.901` (`R$ 6,40/m²`) → Pátio ML `(R$ 267.144)` → **V2 Final `R$ 3.840.756` (`R$ 5,98/m²`, `-4,5%`)**.
  - **Mega Itajaí:** V1 `R$ 6.643.596` (`R$ 5,12/m²`) → **V2 Final `R$ 6.363.234` (`R$ 4,90/m²`, `-4,2%`)**.
  - **Mega Curitiba:** V1 `R$ 7.528.284` (`R$ 4,71/m²`) → **V2 Final `R$ 7.361.752` (`R$ 4,61/m²`, `-2,2%`)**.
- **Relatório Mensal e Slide "Custo por m² mês a mês" (Resolvido em 22/10 20h00):**
  - **Problema relatado:** Erro *"Relatório mensal indisponível — cabeçalho inesperado, faltam as colunas orcAnt jan, orcAnt fev... Esperava 'Orç Jan/26', 'Real Jan/26', 'Orça Jan/27'"* e ausência do slide *"Custo por m² mês a mês — Orçamento 2027"*.
  - **Causa raiz:** As novas planilhas mensais de 22/10 só possuíam `Real Jan/26`, `Orça Jan/27` e `Variação` (sem a coluna antiga `Orç Jan/26`). O parser `_orcLerMensal_` em `04_DadosRelatorios.gs` exigia `orcAnt` e lançava exceção, fazendo `visao.mensal` virar `null`. Em `00_Main.gs`, a geração de `Custo por m² mês a mês` depende de `visao && visao.mensal`.
  - **Solução implementada:** `col.orcAnt` foi tornado opcional em `04_DadosRelatorios.gs` (preenche 0 se ausente), com `_orcAplicarRitmo_` assumindo a conciliação completa com a METRAGEM e o Ritmo oficial. Slide reabilitado e funcionando com 100% dos dados.
- **Testes Locais (Node.js):**
  - `node teste/teste_orcamento.js`: **4.917/4.917 asserções ok (100% verde)**, zero textos cortados com `…`.
- **Apps Script:**
  - Publicado via `clasp push --force` (38 arquivos atualizados).
  - Para gerar a apresentação atualizada, rodar em `00_Gerar.gs`: `gerarComeco()`, `gerarMegaEsteio()`, `gerarMegaItajai()`, `gerarMegaCuritiba()` (ou `importarAtualizacao()` em `30_Importar.gs`).

## 1. HISTÓRICO — V1 FECHADA (13/10/2026, apresentação à diretoria)

**>>> 13/10/2026, fim do dia — V1 FECHADA (Guilherme: "fechamos a apresentação; tudo o que fizemos é a V1, já
apresentada à diretoria na 1ª rodada"). <<<**
- **V1 = git tag `v1`** (este commit) = o deck de Facilities gerado por `00_Gerar.gs` (gerarComeco + gerarMega*),
  com os slides do gestor (Esteio e Curitiba da v4, Itajaí da v3 — `ORC_GESTOR_FONTE`, 03_Exportar.gs), Premissas
  novas, sub capas, ORC_SECOES, IPTU em 1 mês e seguro em 8 no custo do condomínio, selo ⚠ REVISAR nos 3 do Curitiba,
  e à parte `gerarSlidesM2ComIptu()`.
- **Congelar:** o Guilherme roda `congelarV1()` (35_Versoes.gs) uma vez → cópia do deck na pasta VERSÕES
  ("FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)") + "ORÇAMENTO 2027 - BASE V1.json" na
  pasta do orçamento (METRAGEM e linhas dos modelos 070/090 + contratos, item a item, por Mega). Não refaz.
  **CONGELADA em 13/10/2026 18h52:** deck V1 `1f-0RpZCPiveXQw4UNRBp7c1IaAKUi5dNFB63Cv_CCLo` (pasta VERSÕES) · base
  `1-O6ybc4RZfJeoEviENdGqc_yi14Mgxyu` — Esteio R$ 4.020.587 (178 linhas), Itajaí R$ 6.643.596 (131), Curitiba
  R$ 7.528.284 (163). Itajaí dos slides do gestor: da v4 desde 18h23 (17 slides; sem Defensas, Linha de Vida, Mastro).
- **Apontamentos da diretoria** (28 linhas: G1–G4, E1–E5, C1–C8, I1–I9): planilha "ORÇAMENTO 2027 - AJUSTES PEDIDOS
  PELO DIRETOR (13-10-2026)" (`1kbDZfe0I_dNTDZ-oWijm-YG7q_5XhL2n-OnqyP377Hc`, pasta do orçamento). Simulado no chat:
  Curitiba posto noturno 6 meses (−234.103), paisagismo Sodexo 64 mil (−136.000), jardim vertical fora (−16.000) →
  total 4,71 → ~4,47/m²; Itajaí meta 4,80 (hoje 5,12, falta ~R$ 500 mil/ano). NADA disso está no código/planilhas.
- **V2 — só quando o Guilherme confirmar:** `ORC_VERSAO_ATUAL` (35_Versoes.gs) vira 'V2' e entra um slide "O que
  mudou desde a V1" por Mega (e no começo): compara a base V1 com a geração de agora — total e R$/m² antes/depois e as
  linhas dos modelos que mudaram (conta · item · V1 → V2 · Δ R$ · Δ R$/m²), ligando cada mudança ao apontamento da
  planilha. Ainda não feito.
- **Sem Python no trabalho** (CrowdStrike): só Node — `node teste/teste_orcamento.js`, `node ferramentas/molduras_imagem.js`.

**13/10/2026 (de casa, Python liberado pelo Guilherme):** reinstalados Python 3.12 (+ openpyxl, Pillow, numpy), Git,
Node e clasp. `python ferramentas/graficos_imagem.py` desenhou os **131 gráficos** do `GRAFICOS PENDENTES.json` de
12/10 22h48 (251 especificações). Teste 4851/4851; `main` = `origin/main` (`a316e20`). Falta o Guilherme gerar de
novo as quatro partes de Facilities (25_Facilities.gs) com as imagens no Drive e rodar `gerarVersaoFinal()`.

**13/10/2026, manhã — a ordem do gestor vira o padrão (v3 baixada em .pptx; ele organizou só o Esteio, Curitiba
começou):** `ORC_SECOES` (01_Config.gs) = 01 Premissas · 02 Resumo Executivo · 03 DRE · 04 Segurança · 05 Manutenção ·
06 Limpeza e Conservação · 07 Contratos (saiu da DRE) · 08 Análise de Custos (era "Custo por m²"); sem a seção
"Registro fotográfico" (as fotos do gestor ficam na seção do assunto; os moldes continuam no fim do Mega). Na
Manutenção, as categorias antes de "Demais". No deck de Facilities voltam as **sub capas** onde o gestor pôs "capa?"
(DRE em diante; Premissas e Resumo sem — `ORC_SECOES_SEM_SUBCAPA`). Trilha (trilha_imagem.py), sub capas
(capas_imagem.py) e molduras (`tv: 2` na especificação) redesenhadas com os nomes novos; Moked na trilha 04; slides do
gestor na 04 (Segurança: substituição e os que vêm depois de "Segurança e vigilância") ou 05. Capa do Mega com o R$/m²
do Ritmo 2026 embaixo do valor dele. "implícita" saiu dos textos (os rodapés ficam). **`gerarApresentacaoCompleta()`**
(34_ApresentacaoCompleta.gs): abertura → Esteio → Itajaí → Curitiba → Moked → versão final, um passo por execução,
encadeados por gatilho de 1 min (escopo `script.scriptapp` novo: pede autorização na 1ª vez). Teste 4855/4855.

**13/10/2026, 8h — O QUE RODAR AGORA: `00_Gerar.gs`** (pedido do Guilherme: "uma função para cada um; a Moked e os
outros já têm que estar dentro"): `gerarComeco()`, `gerarMegaEsteio()`, `gerarMegaItajai()`, `gerarMegaCuritiba()`,
uma por execução, tudo no deck de Facilities (`1w_di…`). Cada Mega gera a parte (sem "Revisar", sem moldes de fotos)
e copia da v3 os slides do gestor DESSE Mega (Moked, substituição, obras) logo depois do slide gerado que vem antes
deles lá (`_orcGestorNaParte_`, 31_VersaoFinal.gs), revisados (29_GestorRevisado.gs), na lista da parte — gerar de
novo troca também esses. Esteio rodou às 7h56–8h02 e coube nos 6 min (geração 192 s + 22 cópias). Perto dos 5,5 min
para e agenda `completarSlidesDoGestor()` (o gatilho de 1 min do Google NÃO disparou no horário hoje: rodar à mão).
Esperado no log: Esteio 22 do gestor (9 da Moked), Itajaí 20, Curitiba 17. A v3 do gestor (`1aIl-…`) só é lida.
`gerarVersaoFinal*()`, `gerarSlidesMoked()` e 34_ApresentacaoCompleta.gs ficaram, mas não são mais o caminho.
- **Slide novo do gestor:** ele faz na v3 duplicando um slide dele (Ctrl+D copia a 1ª linha das anotações,
  `[REGISTRO FOTOGRÁFICO · ESTEIO]` — ou ITAJAI/CURITIBA) e põe depois do slide gerado em que quer; aí é só rodar
  `gerarMega<X>()` de novo. Não precisa de Python: o slide do gestor é copiado como está (as molduras da trilha 04 e 05
  já estão na pasta).
- **No trabalho não tem Python** (antivírus): moldura nova → `node ferramentas/molduras_imagem.js`; gráfico novo (número
  mudou) só tem `graficos_imagem.py` — sem ele o slide sai "pelas formas" (certo, menos bonito). Se precisar, portar
  graficos_imagem.py para Node (o desenho é simples: retângulo, linha, elipse; ver molduras_imagem.js, que já grava PNG).
- GitHub: commits de 13/10 só no G: (`git push` pede login no navegador).

Tudo commitado/pushado (último código: `ac18e31`) e publicado (clasp 18:24). A próxima sessão
**não tem o conector do Drive**: leia os arquivos pelo G: (os `.gsheet/.gslides` são atalhos e
não abrem — peça ao Guilherme para rodar as funções de exportação, que gravam no G:).

**Slides da Moked — FEITO (12/10, ~19h30), aguardando o Guilherme rodar:** `gerarSlidesMoked()` (28_Moked.gs)
cria/refaz a apresentação SEPARADA "MOKED - SLIDES PARA A v3 (Implantação Moked · Mega Esteio)" na pasta do
orçamento (ID na propriedade `ORC_MOKED_DECK_ID`): 9 slides — os 22 a 30 da v3. 22–27: os prints do relatório,
nativos (registros, áreas, perfil, MokLog, atuação + caso da invasão, painel de sistemas); 28–29: CÓPIA do slide da
v3 (`appendSlide(slide da v3)`, as fotos/fichas com o recorte do gestor) sem textos/moldura/cabeçalho, com o texto
redesenhado; 30: "Contrato e Rateio" nativo (cláusula 3.4 em resumo + rateio corrigido pelo gestor, calculado pela
área). A v3 só é lida. Sem a v3, 28–29 saem com o lugar das fotos marcado. No molde do gestor, subtítulo
preenchido, trilha 05 Segurança, texto em português revisto ("por dia", não "por dia útil": 1,96 registro por Mega
por dia corrido). Notas de cada slide: marca `[REGISTRO FOTOGRÁFICO · ESTEIO]` + qual print substitui. Moldura
`MOLDURA - 4c4ed339ecdc.png` montada SEM Python (PowerShell/System.Drawing: a moldura 08 do molde de fotos com a
faixa da trilha trocada pela TRILHA 05) e já na pasta IMAGENS - SLIDES. Prévia local sem Python:
`node ferramentas/diagnostico/previa_moked.js teste <saída>` + Chrome headless (`--screenshot`, 1440×810).
`exportarSlidesMoked()` grava os PNG reais em `_slides-moked`. O painel (slide 6) veio do print do slide 27 (não
está no relatório); o print não diz o Mega — pelo Alpha Sense parece Curitiba, não escrito no slide.
**Rateio do contrato Moked:** o gestor CORRIGIU o slide 30 da v3 (export de 12/10 19h07): 18,14% / 36,71% /
45,15%, R$ 6.826,00 / 13.814,45 / 16.993,04 = R$ 37.633,50. Mas o ORÇAMENTO ainda carrega a divisão antiga
(Esteio 7.948,98 no modelo 070; Itajaí 16.971,92 e Curitiba 20.706,69 no cadastro rev01): só muda quando as
planilhas mudarem — perguntado ao Guilherme, não mexer sem decisão.
Export novo (12/10 19h07): 147 slides; Esteio ganhou o 044 "Subst. Chicote Elétrico do Trator 03" (título interno
copiado "PINTURA DA TUBULAÇÃO…"); Itajaí agora 78–95.

**Atualização de 12/10, 19h56 (NO DRIVE desde 21h12 — pasta "ATUALIZAÇÃO 12-10-2026", importarAtualizacao(), IDs em IDS.json; o gerador já aponta para elas, inclusive relatorios.ritmoId = RITMO 2026 dos 3 Megas):** METRAGEM dos 3 Megas
(Mega-*.xlsx), 090 (igual ao atual), 070 (Moked do Esteio 7.949 → 7.000/mês), Contratos-Atualizado.csv (Moked
Curitiba 20.706,69 → 17.781,40 e Itajaí 16.971,92 → 14.574,25/mês = rateio corrigido com o mesmo reajuste; o resto
igual) e "IPTU E SEGURO - MEGAS 2027" (racional: valor/m² 2026 × reajuste × área 2027 — seguro +5%, IPTU +5,5% em
Curitiba e Itajaí, Esteio +13,75%; a premissa ESCRITA diz 15% "conforme Selic" — perguntar). Fixtures:
`*_1956.json` e `fixture_contratos_2027_rev02.json`, seção "Atualização de 12/10/2026, 19h56" do teste. Com eles o
Orç 2027 = METRAGEM nos três: Esteio 4.020.587, Itajaí 6.643.596, Curitiba 7.528.284. **Assistente de facilities
(20h, decisão do Guilherme):** os R$ 90 mil ("Assessoria de RH" no 090) NÃO somam mais por cima — ficam DENTRO da
Despesa de pessoal da METRAGEM (ORC_CONTAS_DENTRO, 04_DadosRelatorios.gs; ORC_CONTAS_SOMAR ficou vazio): total e
R$/m² iguais aos da METRAGEM, a conta sai "Despesa de pessoal*" na DRE e nos ofensores, e a nota vai no RODAPÉ
("* Despesa de pessoal: inclui R$ 90.000 da assistente de facilities, como consultoria até o RH aprovar") — a
tabela não encolhe porque a altura dela entra na moldura (mais baixa = MOLDURA nova sem imagem = sem sombra).
"Outras taxas e impostos" em valeMetragem no Esteio e em Curitiba (METRAGEM nova R$ 1.200/R$ 2.455 × Despesas-
Mensal antigo R$ 0 → sem isso, 7 slides com ⚠ REVISAR por Mega). FEITO (21h15): IDs trocados; as planilhas antigas viram "PODE EXCLUIR - …" pelo Guilherme. ERA: o
Guilherme subir no Drive (Planilhas Google) e mandar os links → trocar ORC_MODELO_070_ID (01_Config),
ORC_CONTRATOS_ANO_IDS (02_Dados) e o metragemId dos 3 Megas; ou ele cola por cima das planilhas atuais e o código
não muda. O slide 30 da Moked lê a linha da Moked do Esteio no 070 (R$ 84.000 no ano com o 070 novo).

**Versão final num passo (12/10, 21h30, `31_VersaoFinal.gs`):** `gerarVersaoFinal()` copia o deck de Facilities
(gerado com os dados de agora) para "FACILITIES - ORÇAMENTO 2027 · VERSÃO FINAL (data hora)" e põe nele os slides do
gestor da v3 — revisados como em 29_GestorRevisado.gs — logo depois do slide gerado que vem antes deles na v3 (mesmo
título e Mega; sem o "(1/2)" se a paginação mudou; senão no fim do Mega). Os "Implantação Moked" da v3 viram os nove
da apresentação da Moked (rode gerarSlidesMoked() antes). Saem o "Revisar antes da versão final" e os moldes de
fotos; links do sumário/trilha para eles vão ao primeiro slide do gestor do Mega (ou saem). Rodar de novo cria outra
cópia e renomeia a anterior "PODE EXCLUIR - …". Edições do gestor em slides GERADOS da v3 não passam (são refeitos).

**Português (12/10, 19h18, `d857fa1`):** varredura `node ferramentas/diagnostico/ortografia.js teste` nos três
Megas — só dois erros nos slides gerados, corrigidos: "CHICOTE ELÉTRICA" → "ELÉTRICO" (proposta revista; o
Guilherme roda `aplicarPropostasTextos()` e gera o Esteio) e "eletronicos" (23_DecisoesGestor.gs). Os erros
dos slides DO GESTOR na v3 (28–44, 78–82: "aprimentos", "Eventos de Atípicos", "METEREOLÓGICA", "linha de
vertical", "Portário/Garam", "suscetíveis", títulos internos copiados de outro slide, LOCAL errado no Canal
BR 116…) foram passados ao Guilherme como lista para corrigir à mão — a v3 não é tocada.

**Missão anterior — slides da Moked (Esteio) e a ordem do gestor:**
1. O Guilherme vai rodar `exportarSlidesVersaoGestor()` (03_Exportar.gs, só leitura) na
   "FACILITIES - APRESENTAÇÃO ORÇAMENTO 2027 v3" (pasta VERSÕES, id `1aIl-vCtbiuSLJo0BVxfHejsjGYOodhIWMnxgPOiJj7s`
   — cópia de trabalho do gestor; o gerador escreve em outro deck, `1w_di…`, e NÃO mexe na v3).
   Resultado em `G:\…\APRESENTAÇÃO ORÇAMENTO\_slides-versao-gestor\`: `ordem.txt` (todos os slides,
   em ordem, "GESTOR"/"gerado") e `slide_NNN.png` dos slides do gestor. Leia com a ferramenta de imagem.
2. Aprender a **ordem** que o gestor propõe (pelo texto: no Esteio ele pôs o bloco Implantação
   Moked + Substituição Segurança logo depois de "Manutenção: projetos × custo recorrente", e as
   fotos de obras entre "itens de cada grupo (1/2)" e "(2/2)") e o **estilo** dos slides dele
   (molde de fotos de 26_Fotos.gs: título "Tema | Assunto", subtítulo "· Mega X", cartão, foto,
   título interno em maiúsculas, CONTA/LOCAL/VALOR, rodapé "Fotos e textos preenchidos pelo gestor").
3. Melhorar os slides **"Implantação Moked"** com o relatório da Moked (09/10/2026), salvo em
   `G:\…\APRESENTAÇÃO ORÇAMENTO\01 - CONTROLE DA APRESENTAÇÃO\MOKED - REFERÊNCIA\` (HTML legível +
   PDF). Proposta já mostrada ao Guilherme (5 slides, no estilo do gestor, numa apresentação
   SEPARADA para ele copiar para a v3 — não editar a v3): (a) o que a Moked registra — 3.643 registros,
   P311A Curitiba 2.891 desde mar/23, P311B Itajaí 752 desde abr/25, por área; (b) perfil das
   ocorrências (colisões ≥143/≥102, cancelas ≥106/≥79, saúde ≥121/≥18…) e evolução por ano;
   (c) controles MokLog mai–out/26 (sistemas 95–100%, ambulância 25/17, iluminação 90,9%/81,9%,
   bolsão, equipe 11/16, 34 treinamentos, Brigada não aplicada); (d) caso invasão perimetral
   27/02/2026; (e) frentes de atuação + custo no Esteio em 2027: R$ 7.948,98/mês (R$ 95.388/ano).
   Ele ainda não aprovou o formato — confirme antes de construir.

**Exportação da v3 lida (12/10, 18h36 — zip em Downloads, `_slides-versao-gestor/`):** 146 slides.
Os gerados seguem a ordem do gerador; o gestor INTERCALA os dele: Esteio — 22–33 (Implantação
Moked ×9, Substituição Segurança: Cenário Hoje / Proposto / Comparativo Megas) logo depois de
"Manutenção: projetos × custo recorrente" (21) e antes de "itens de cada grupo (1/2)" (34); 35–43
(fotos de obras) entre "itens (1/2)" e "(2/2)". Itajaí — 77–94 entre "itens (1/2)" e "(2/2)"
(notas com a marca `[REGISTRO FOTOGRÁFICO · ESTEIO]` copiada — o gerador os trataria como do Esteio).
Curitiba — só o molde no fim. ATENÇÃO: regenerar a parte no deck principal joga os slides do gestor
para depois do bloco gerado (perde a intercalação) — para seguir a ordem dele, ancorar cada slide do
gestor ao slide gerado anterior (não implementado). Estilo do gestor: molde de fotos com print/imagem
à esquerda (prints do relatório Moked, cláusula de contrato, mapa aéreo com marcadores, tabelas de
planilha) e texto à direita após linha vertical; subtítulo-molde nunca preenchido; trilha marca
"08 Fotos" mesmo em slide de segurança.
**ERRO no slide 30 (rateio do contrato Moked):** o total de área 253.038,48 é o de 2026 (Itajaí
108.165,91 + Curitiba 120.577,91 + Esteio 24.294,66), mas as linhas usam as áreas de 2027 (Esteio
53.447, Curitiba 133.054) → os % somam 116,45% e os valores somam R$ 43.824,75/mês para um contrato
de R$ 37.633,50. Rateio certo por área (294.666,91 m²): Esteio 18,14% R$ 6.826,00 · Itajaí 36,71%
R$ 13.814,45 · Curitiba 45,15% R$ 16.993,04. O orçamento 2027 carrega Esteio 7.948,98 (modelo 070),
Itajaí 16.971,92 e Curitiba 20.706,69 (cadastro rev01) = R$ 45.627,59/mês. Levado ao Guilherme
— não mexer nos números sem decisão dele.

**Achados na v3 (o gestor está construindo a narrativa — só avisar, não mexer):** na seção do
Itajaí, ~13 slides de fotos ainda com o texto-molde do Esteio ("Fachadas armazém A e B2",
R$ 50.000); Linha de Vida do Esteio diz R$ 15.270 mas o modelo tem R$ 1 por escada; a v3 é
anterior aos ajustes das 17h37–18h04 e tem textos cortados (faltou `aplicarPropostasTextos()`).

**Pendentes de resposta do Guilherme (não fazer sem o OK):** (1) tratar como retirado o item
com R$ 1 no ano (Esteio: gera "R$ 2 da manutenção são projetos pontuais"); (2) tirar do rodapé de
"Custo por m²" a frase "comparação com os outros Megas quando Itajaí e Esteio estiverem
configurados". Para conferir com o gestor: Itajaí "Defensas anti-evasão – estac. leves (36 m)"
R$ 59.497 = mesmo valor de "Elevação do piso da doca".

**Scripts de diagnóstico (Node, sem Python):** `ferramentas/diagnostico/*.js` — rodam o harness
do teste com as fixtures (`node ferramentas/diagnostico/geracao_final.js <caminho>/teste`):
geracao_final (totais/falhas/cortados), contratos_itau, textos_itens, linhas_conta, demais_var,
mede_detalhe (cabe na coluna?), compara_modelos + xlsx_matriz (exportação nova × fixture),
lista_asserts (diff de asserções). A 1ª linha de cada um diz o uso.

## 1. O que é

Projeto Apps Script que gera, no Google Slides, a apresentação do
**Orçamento 2027** de três condomínios logísticos: **Mega Curitiba, Mega
Itajaí e Mega Esteio**. Uma apresentação por Mega, recriada inteira a cada
geração (`gerarCuritiba()`, `gerarItajai()`, `gerarEsteio()`).

- Usuário: Guilherme (Business Analysis, Capital Realty). Escreve em
  português, muitas vezes em maiúsculas e sem pontuação; responda em
  português.
- Quem lê o deck: o **gestor** (revisa, marca dúvidas) e o **diretor** (lê
  tudo em dinheiro **e** em R$/m² ao mês).
- Repositório: `G:\Drives compartilhados\08.000 - Business Analysis\APRESENTAÇÃO ORÇAMENTO\Apresenta-o-Mensal-Megas-2026`
  (GitHub, branch `main`, commit direto na `main`). A pasta deste projeto é
  `orcamento-2027/`. As outras pastas são outros projetos — não mexa.
- Apps Script: scriptId `13j2b0mdjYO2wbag2d5qOQwyBMDEKrIhd-_H7ZQqHUoEBEVfYJLx7Cup3`,
  publicado com `clasp push --force` de dentro de `orcamento-2027/`. O git é
  a fonte; o editor espelha a `main`. **Nunca edite no editor** — o próximo
  push sobrescreve.

## 2. Estado em 07/10/2026

- As três apresentações geram completas: zero slides com falha, zero textos
  cortados, nenhum "Não detalhado" (todos os contratos casam com a
  METRAGEM). Teste: `node teste/teste_orcamento.js` → **4057/4057**.
- Código publicado (`clasp push`) e no GitHub. A **V1** está pronta para o
  usuário gerar (roteiro em `PASSO-A-PASSO.md`).
- Contratos: **os três Megas leem o cadastro mestre** `MESTRA - CONTRATOS
  2027 - TODOS OS MEGAS` (`contratosDoCadastro: true`, `ORC_CONTRATOS_ANO_IDS`
  em `02_Dados.gs`). Curitiba deixou as planilhas individuais "MEGA CURITIBA -
  CONTRATOS 2027 - <CONTA>" em 07/10/2026 (pedido do usuário: padronizar os
  três nas planilhas mestras). Os totais batiam centavo por centavo; agora
  Curitiba também traz os contratos das outras contas (informática, telefone,
  energia), como Itajaí e Esteio.
- Alerta de pendências ligado (`_orcPendencias_`, `19_Revisar.gs`): Itajaí e
  Esteio saem com o slide "Revisar antes da versão final" e o selo
  ⚠ PENDENTE na manutenção, porque o modelo 090 tem itens que a METRAGEM
  não tem (Itajaí R$ 29.313; Esteio R$ 15.268).
- Planilhas de comparação item a item 2026 × 2027 (manutenção) montadas para
  os três Megas; o gestor ainda vai marcar SIM/NÃO.

### Fim do dia 07/10/2026 (v2)

- **Deck único de Facilities** criado (ID `1w_diCsSIpuuryXliPRBcW4YWoMmM8RyuT7O7307DsqQ`, 74 slides): gerar por
  parte, cada uma numa execução — `gerarFacilitiesAbertura`, `gerarFacilitiesCuritiba`, `gerarFacilitiesItajai`,
  `gerarFacilitiesEsteio` (`25_Facilities.gs`). Os decks por Mega continuam (`gerarCuritiba` etc.).
- **Curitiba é Demercado** (verde #00594F, ouro #AF9800, títulos em EB Garamond, logo Demercado); Itajaí e Esteio são
  Capital Realty (`ORC_MARCAS`, `cid.marca`).
- **Motor de imagens** (README, "Molduras em imagem" e "Formas pelo motor"): moldura (`MOLDURA - <hash>.png`) no
  fundo + formas do conteúdo (`GRAFICO - <hash>.png`) logo acima + só textos no slide. Log de cada parte: "molduras:
  …" e "formas pelo motor: N slides em imagem, M em formas". M > 0 = número mudou: `python
  ferramentas/graficos_imagem.py` (lê o manifesto do teste e `GRAFICOS PENDENTES.json` da pasta), esperar o Drive
  subir (`python ferramentas/conta_drive.py --esperar 15` conta pela API) e gerar de novo.
- **Gráficos v2** aprovados e publicados (tabela em `IDEIAS-DESIGN.md`, "Aprovado e feito em 07/10/2026").
- **Ritmo 2026 fechado até setembro** (`ORC_RITMO_ULTIMO_MES_FECHADO = 9`, `01_Config.gs`) — suposição; o Guilherme
  não confirmou. Atualizar a cada fechamento.
- Teste: **4815/4815**. Último commit do dia na `main`; editor = `main`.
- **Próximo:** os 9 erros e as melhorias da analista 4 (`IDEIAS-DESIGN.md`, "Avaliação da analista 4"); o Guilherme
  aprovou corrigir os erros e ver rascunhos de "área × custo" e "por que sobe" de Segurança e Limpeza.

### 08/10/2026 — ajustes da V2

- Comentários do Jonatas no deck de Facilities anotados como V1–V45 em [`REVISAO-GESTOR.md`](REVISAO-GESTOR.md) ("Ajustes da V2"), com o status de cada um.
- Código feito na mesma tarde (o Guilherme: "pode rodar"): ordem Esteio → Itajaí → Curitiba, ▲ 100% no lugar de "novo", "=" abaixo de 0,5%, KPIs em /m², Ofensores sem Δ do m², resumo abre a Manutenção, sai "contratos e avulsos", "Por que sobe" com o Orç 2026, grupo da manutenção item a item (`ORC_GRUPO_MANUT_GESTOR`), contratos com renovações juntas, `ORC_CONTRATOS_UNIR`, mudou de conta, ano cheio e "2026 não identificado" no alerta. Teste 4506/4506.
- **Não publicado:** o clasp estava sem login. Falta também: rascunhos V16 e V19 (o do V4 está em "01 - CONTROLE DA APRESENTAÇÃO"), erros 4–7 da analista.

### 08/10/2026 (fim da tarde) — METRAGEM com o ritmo atualizado

- O Guilherme baixou as três METRAGEM de 08/10/2026 (`MEGA <X> METRAGEM-2027-08-10-2026.xlsx`). Só a coluna
  **Ritmo 2026** mudou (e a diferença Orç 27 / Ritmo 26); contas e ordem iguais. Fixtures `teste/fixture_metragem_*.json`
  atualizadas a partir delas; o teste mudou só os valores esperados: segurança e total de Curitiba, R$/m² de
  Curitiba +10% → **+9%** (limpeza +45% → +48%), e o lado 2026 da roçada do Esteio (avulso = ritmo da limpeza −
  contratos) caiu de ~R$ 35 mil para **R$ 20.946**, porque o ritmo da limpeza do Esteio caiu R$ 14 mil. Teste 4507/4507.
- Depois de reiniciar (Deep Freeze) é preciso reinstalar Python, Node e openpyxl; o que cada programa faz, para a TI,
  está em [`../PROGRAMAS-TI.md`](../PROGRAMAS-TI.md).

### 09/10/2026 — V16, V19 e a sombra como padrão

- Reinstalados Git, Node, Python (+ openpyxl, Pillow) e clasp; login do clasp e do GitHub (Git Credential Manager) feitos.
- **V16** (rascunho aprovado): slide "Por que a manutenção sobe: as demais variações" (`24_PorQueSobe.gs`,
  `_orcVariacoesItens_`), nos três Megas. `ferramentas/decisoes_gestor.py` passou a gravar `semPar` (gastos do ritmo
  2026 sem par) em `23_DecisoesGestor.gs`. Curitiba: novos +834 mil, pares +125 mil, não se repetem −620 mil, METRAGEM
  × itens −87 mil = +252 mil.
- **V19** (rascunho aprovado): itens de cada grupo em quadros (`17_Investimento.gs`, `_orcPaginasGrupos_`).
- **Sombra é o padrão** (Guilherme): todo slide com cabeçalho tem o conteúdo em card da moldura; tabela solta ganha o
  card do tamanho dela (`_orcSombraTabela_`). O teste reprova slide com cabeçalho sem card.
- Molduras e gráficos novos desenhados na pasta `IMAGENS - SLIDES`. Teste 4452/4452. Publicado (clasp push).
- Tarde: o V16 virou **ponte de colunas verticais** (Guilherme preferiu ao horizontal); a ponte do "por que sobe" fecha
  em "ORÇ 2027" (quebrava "ORÇAMENT / O"). **090 × METRAGEM investigado**: Itajaí R$ 29.313 = totem (JAN) + duas
  iluminações (FEV); Esteio R$ 15.268 = duas linhas de vida (OUT). O slide de revisão lista os itens e o que fazer
  (`_orcItensForaDaMetragem_`, `19_Revisar.gs`). **Falta a controladoria incluir esses itens na METRAGEM-COND** — aí
  baixar a METRAGEM nova, atualizar as fixtures e gerar: a pendência e o degrau somem. Teste 4457/4457, publicado.
- **Próximo (quando o Guilherme voltar):** ele gerar os decks (Facilities: `gerarFacilities*` em `25_Facilities.gs`) e
  `aplicarPropostasTextos()` → gerar de novo; conferir no log "molduras: … 0 com as formas de antes". Depois, a lista
  de pendências: erros 4–7 da analista, V40 (salto de set na Limpeza de Itajaí), G6/G7/G13 com gestor e controladoria.
- **Seção 08 · Registro fotográfico** (rascunho aprovado 09/10): 3 moldes (1, 2 e 3 fotos + descrição) no fim de cada Mega,
  `26_Fotos.gs`. São slides do GESTOR: marcados nas anotações (`[REGISTRO FOTOGRÁFICO · <CHAVE>]`), criados uma vez e
  nunca apagados nem recriados (decks por Mega e Facilities); cópia com Ctrl+D também fica. Espaço da foto = imagem
  `FOTO - MOLDE <m> - <n>.png` (`ferramentas/fotos_molde_imagem.py`) → botão direito → Substituir imagem. Trilha, sub capas
  e molduras redesenhadas para 8 seções.
- **Atualizar só alguns slides** (`27_Atualizar.gs`): `atualizarSlidesFacilities()` (ou `atualizarSlides<Mega>()`) refaz no
  deck de Facilities só os grupos de `ORC_ATUALIZAR_AGORA` (hoje: Ponte, Por que sobe, Demais variações), no mesmo lugar,
  e atualiza a lista da parte. Grupos possíveis em `ORC_GRUPOS_ATUALIZAVEIS`; nunca o 1º slide de uma seção (link do sumário).
- **Fotos dos Megas com IA (Nano Banana / Google Flow): testado e recusado** pelo Guilherme ("não gostei de nada,
  vamos deixar do jeito que está"). As fotos das capas e sub capas ficam as reais de hoje; não propor de novo sem ele
  pedir. Os arquivos do teste ficaram com o prefixo "PODE EXCLUIR - ".

### 12/10/2026 — Orç 2027 calculado pelos modelos (apresentação em 13/10)

- A controladoria não fecha a METRAGEM a tempo; o Guilherme está atualizando os modelos 070/090 e os contratos.
  **`relatorios.orcDosModelos: true`** nos três Megas (`01_Config.gs`): o Orç 2027 de cada conta = modelos +
  contratos, no anual e no mês a mês (`_orcOrcDosModelos_`, `04_DadosRelatorios.gs`). Real 2025, Orç e Ritmo 2026
  seguem da METRAGEM; a área também (R$/m² refeito com ela). Ficam com a METRAGEM: contas zeradas nos modelos
  (Representação e refeição) e `valeMetragem` (IPTU e Seguro de Curitiba). Sinônimos em `ORC_CONTAS_SINONIMOS`.
- Motivo do Guilherme: "não podemos ter slides que um número fala uma coisa e no outro fala outro". Com isso a
  manutenção da DRE/ponte = a dos slides de categoria, e some a pendência "Modelos acima da METRAGEM". Se a METRAGEM
  não bate, o slide de revisão lista "Orç 2027 ajustado" e o que mudou (METRAGEM → modelos). Ofensores não mostra item maior que a conta.
- Com as fixtures de 08/10: Itajaí R$ 6.605.554 (+29.313), Esteio R$ 4.222.639 (+15.268), Curitiba igual.
  Teste: seção "Orç 2027 calculado pelos modelos"; o resto do teste roda com a opção desligada (fluxo oficial).
- **Fica ligado para sempre** (Guilherme, 12/10: "não preciso avisar se chegar outra METRAGEM; calcule, se estiver
  batendo ok, se não ajusta"). METRAGEM que bate com os modelos não gera aviso; a que não bate vira "Orç 2027
  ajustado" no slide de revisão, conta a conta. Não desligar.
- Sem Python (antivírus, 12/10): imagens dos gráficos não são redesenhadas; slide com número novo sai "pelas formas".
- **Auditoria "DRE × estratificação" (12/10):** o Orç fechava em tudo; o **Ritmo 2026 do Despesas-Mensal não somava o
  da METRAGEM** (ex.: limpeza de Curitiba 563 mil × 542 mil — card e gráfico do linha a linha discordavam) e o Real
  2025 de Curitiba (Financeiro) ficava R$ 8,9 mil abaixo. `_orcConciliarMensal_` (04_DadosRelatorios.gs, chamada em
  `_orcLerVisaoGeral_` com orcDosModelos): a DRE manda; o ritmo só mexe na projeção out–dez, o Real 2025 na proporção.
  Uma linha "Mês a mês = DRE" no slide de revisão; o detalhe no log. A tabela do m² mês a mês usa a mesma área das
  linhas (o R$/m² da área comum escrito na METRAGEM dava 3,46 × 3,45). Teste 4692/4692.

### 12/10/2026 (tarde) — modelos de todas as unidades, Itaú/PMOC e assistente do Esteio

- **Modelos 070/090 = exportação completa do sistema** (todas as unidades): `ORC_MODELO_090_ID` ("MESTRA - 090 DESPESAS
  GERAIS 2027 - TODAS AS UNIDADES") e `ORC_MODELO_070_ID` ("MESTRA - 070 SERVIÇOS DE TERCEIROS 2027 - TODAS AS
  UNIDADES"), na pasta 00 - PLANILHAS MESTRAS; as seis por Mega viraram "PODE EXCLUIR - …". Cada Mega filtra pela
  `unidadeModelo` (coluna B: Curitiba 60, Itajaí 19, Esteio 18) — é o mesmo recorte das planilhas por Mega de antes,
  que o gerador não lê mais. Nova exportação: substituir o conteúdo dessas duas planilhas (o ID fica) ou trocar o ID
  em `01_Config.gs` (como às 16h); o .xlsx tem que vir **por item** (coluna F "Item"). Unidade sem
  linha = erro, nunca deck zerado. Fixtures: `teste/fixture_090_megas_2027.json` e `fixture_070_megas_2027.json`.
- Com essas exportações (fixtures de METRAGEM de 08/10): Curitiba R$ 7.497.667 (manutenção 1.990 mil), Itajaí
  R$ 6.616.939, Esteio R$ 4.175.921. Textos curtos dos itens novos em `07_PropostasTextos.gs`.
- **Esteio, "Assessoria de RH" R$ 90 mil** ("cadeira de assistente de facilities"): lançada para medir o efeito na
  despesa com pessoal; o RH só inclui quando aprovar. `ORC_CONTAS_SOMAR` soma na Despesa de pessoal da METRAGEM
  (331 → 421 mil). **Quando a METRAGEM trouxer a assistente na Despesa de pessoal, apagar a linha** (senão dobra).
- **Curitiba, 2026 achado** (razão do realizado "CAS_1" + ritmo 2026 item a item): Itaú/cerca elétrica = ritmo
  "[CONTRATO A SENSE] - Financiamento da Fibra Òptica" jul–dez R$ 86.601,84 (no razão, 5 parcelas pagas jun–out);
  PMOC = R$ 4.000 (CLIMATIZAR, 3 preventivas). Em `ORC_CONTRATOS_ANT_RITMO`; saíram de "2026 não identificado".
  Fica só o PMOC de Itajaí (sem razão de Itajaí).
- Teste 4736/4736.
- **"com IPTU e seguro"** (Guilherme: "sinalizar quando IPTU tiver incluso"): todo total/R$/m² que traz IPTU e Seguro
  avisa — `ORC_COM_IPTU` e `ORC_TOTAL_COM_IPTU` (04_DadosRelatorios.gs). DRE e tabela de Facilities: "DESPESAS
  OPERACIONAIS (COM IPTU E SEGURO)"; Custo por m²: "TOTAL GERAL (COM IPTU E SEGURO)"; capas, sub capas, Resumo
  Executivo, Ponte, sumário e cards de Facilities: "com IPTU e seguro"; painel Utilities do gráfico de Facilities:
  segunda linha "COM IPTU E SEGURO"; Ofensores/Defensores: no subtítulo (a coluna CONTA não cabe). Teste 4737/4737.
- **Revisão dos avisos dos três Megas** com a exportação de 12/10: o gestor do Itajaí pôs a provisão de 3% (R$ 4.506/mês)
  e tirou de 2027 iluminações do bolsão e do AMZ 4/5, quadro da portaria, totem, encanamento PPR do restaurante e
  bebedouro — **lançando R$ 0,01** (o sistema não aceita zero). Linha com todos os meses < R$ 0,50 = zerada
  (`_orcAgruparCategorias_`, `dados.zerados`); obra adiada com os itens de 2027 zerados sai das adiadas
  (`_orcAdiados2026_`). `ORC_PENDENCIAS_GESTOR['Mega Itajaí']` vazio. Resumo "Mês a mês = DRE" sem IPTU/Seguro.
  Ficam: Curitiba — pergunta da linha 4 (provisão de acesso × FM Security × 3%); Itajaí — PMOC e LPU Canaveral
  "2026 não identificado" (falta o razão de 2026 do Itajaí). Esteio limpo. Teste 4745/4745.
- Curitiba, linha 4 (provisão de acesso × FM Security): **vale o SIM, não entra nos 3%** — `ORC_PENDENCIAS_GESTOR`
  vazio nos três Megas. **Lovable** (Esteio e Itajaí) "começou em 2026" (o cadastro de 2027 diz 01/01/2025; mês
  não sabido): em `ORC_CONTRATOS_ANT_RITMO`, 2026 = **estimativa** de 12 × o mensal do cadastro (R$ 163 / R$ 726),
  situação "Começou em 2026". Teste 4748/4748.
- **PMOC do Itajaí (V28)** — "procure Perri, uns 700/mês": no ritmo 2026 (090) é "Contrato de condicionadores de ar",
  R$ 760 set–dez = R$ 3.040 → `ORC_CONTRATOS_ANT_RITMO`, "Ano cheio (começou em set/26)" (2027: R$ 760 jan–ago e
  R$ 940 set–dez = R$ 9.840). **Único aviso que sobra nos três Megas: LPU Canaveral do Itajaí (V34)** — separar 2026
  entre contrato e fora do contrato pede o razão de 2026 do Itajaí por nota fiscal (como o CAS_1 de Curitiba).
- **Área: vale a da METRAGEM da controladoria** (total ÷ R$/m² ÷ 12) em todos os anos — Guilherme, 12/10/2026: "dê
  preferência para a METRAGEM da controladoria; o que estiver batendo, perfeito; 2025 foi só por mandar". Chegou a ser
  travada no rateio e foi desfeita no mesmo dia. Rateios só como referência: 2026 "Com fase 6 CGS" — Curitiba
  120.577,91 · Itajaí 108.165,91 · Esteio 24.294,66 (bate com a METRAGEM a < 0,1%); 2025, e-mails "Novo Rateio Megas"
  (Kethli) — jan–abr fase 5B (Itajaí 63.960,39), mai–jun fase 4 parcial (Itajaí 100.061,58), jul–dez armazém 6 (Itajaí
  108.165,91; Esteio 24.294,66); Curitiba 102.937,17 o ano todo. Em 2025 a METRAGEM usa outra área (Curitiba ≈ 105,8
  mil m²): não trocar sem a controladoria.
- **Canaveral do Itajaí (V34) resolvida** com o razão de 2026 de Material de consumo (planilha "Teste_1", jan–out):
  contrato = notas da Canaveral R$ 21.183,39; fora do contrato = nota Canaveral "fora de contrato" R$ 999,79 + compras
  gerais R$ 10.581,04 (sem diesel R$ 19,3 mil, caminhão-pipa R$ 17,6 mil e placas R$ 8 mil — escolha do Guilherme).
  `ORC_CONTRATOS_ANT_RITMO`, situação "Realizado jan–out/26". `ORC_CONTRATOS_2026_NAO_ID` vazio.
- **Cadastro de contratos 2027 = exportação "rev01" (12/10)** — "MESTRA - CONTRATOS 2027 - TODOS OS MEGAS" (`1KGL-w8J…`,
  `ORC_CONTRATOS_ANO_IDS`); a de 07/10 virou "PODE EXCLUIR - …". Diferença: Moked Curitiba 150.534 → 248.480, Moked
  Itajaí 150.534 → 203.663 e o **empréstimo Itaú da cerca elétrica sai dos contratos** (fim 31/12/2026, 2027 zerado —
  o Guilherme: "foi para os modelos"). O Itaú não estava nos modelos das 12h (entrou no das 16h, abaixo). Com rev01 +
  modelos das 12h: Curitiba R$ 7.413.454, Itajaí R$ 6.670.068, Esteio R$ 4.175.921. Os arquivos
  "100-03-02-Servicos-de-Terceiros (1)" e "120-03-04-Despesas-Gerais" da pasta são os modelos de 2026 (ritmo), não de 2027.
- **Modelos 2027 = exportação "…-Atualizado" (12/10, 16h)**: o 070 e o 090 "v2" viraram as MESTRA (`1Msx1LjK…`,
  `1GsxlXr-…`); as das 12h viraram "PODE EXCLUIR - … (até 12-10-2026 16h)" e o primeiro 090 das 16h, que veio **sem a
  coluna Item** (por conta × centro de custo — o gerador recusa), "PODE EXCLUIR - … (sem a coluna Item)". Mudanças:
  **Itaú no 070 de Curitiba** — "[CONTRATO EMPRÉSTIMO ITAÚ] - PARCELAS MENSAIS DA FIBRA ÓPTICA A SENSE", Segurança,
  SAC R$ 13.866 → 12.234/mês = R$ 156.486,87; no slide de contratos "FINANCIAMENTO ITAÚ – FIBRA ÓPTICA", 2026 =
  R$ 86.602 do ritmo, "Ano cheio (começou em jun/26)" (texto curto em `07_PropostasTextos.gs`); Moked do Esteio
  12.545 → 7.948,98/mês (R$ 150.534 → 95.388); Curitiba sem as duas lavagens das estruturas metálicas de março (pórtico
  R$ 3.968, portaria R$ 5.040). Orç 2027: **Curitiba R$ 7.560.933** (Segurança 2.438.920), Itajaí R$ 6.670.068 (igual),
  **Esteio R$ 4.120.775**. Teste 4756/4756.
- **Planilha de textos não apaga mais o que o gestor escreve** (Guilherme, 17h: "quando eu gero está apagando o que ele
  coloca"). `_orcSalvarTextos_` limpava a aba e reescrevia só A–F: a coluna G que o gestor usava sumia. Agora grava só
  B, D, E, F das linhas que já existem e acrescenta as novas no fim; C, colunas depois da F e linhas criadas por ele
  ficam. `aplicarPropostasTextos` grava só as células de C que mudam (`_orcGravarCelulas_`).
- **Detalhamento por conta nos Ofensores/Defensores** ("tem linhas em branco que ele quer preencher, despesa com
  pessoal, e não tem na planilha"): toda conta do slide ganha a linha **"MEGA X · CONTA"** na aba Ofensores — em
  branco quando a conta não tem item nos modelos (Despesa de pessoal, IPTU, hospedagem…). O texto da coluna C vale no
  DETALHAMENTO, no lugar do maior item e sem o valor (`_orcChaveDetalheConta_`, 11_DREOfensores.gs); o rodapé passa a
  dizer "nota da gestão ou maior item". Os 8 textos que o gestor escreveu para o Esteio (linhas 47–54, conta na coluna G)
  viraram propostas dessas linhas; três encurtados para caber (Despesa de pessoal, Manutenção de imóveis, Limpeza). As
  linhas dele com a conta na G ficam na planilha, mas o gerador não as lê. Teste 4762/4762.
- **Detalhamento sem o valor do item** (Guilherme: "aparece o valor no final, tire isso"): o maior item sai só com a
  descrição, sem o " · R$ 214 mil" — a célula ganha ~8 letras ("CABE ATÉ" 34 → 42). Teste 4763/4763.
- **Itajaí: as seis coletas de lixo (AMZ 01 a 06)** numa linha do slide de contratos — "COLETA DE LIXO (AMZ 01 A 06)",
  R$ 40.259 → 40.259 (`ORC_CONTRATOS_UNIR`). Teste 4764/4764.
- **Lovable começou em mai/26** (nota "…PLATAFORMA DE FACILITIES… RATEIO ENTRE OS 3 MEGAS - MAIO/2026"; cada Mega tem a
  sua parte do rateio). No razão de Curitiba (CAS_1) vem sem o nome Lovable: 64,94 · 65,84 · 67,46 · 66,88 · 67,58
  (mai–set). Esteio e Itajaí sem o razão da conta: 2026 = 8 × o mensal do cadastro 2027 (R$ 109 e R$ 484), "Ano cheio
  (começou em mai/26)". **Curitiba paga a Lovable em 2026, mas o cadastro de 2027 não tem a linha** (~R$ 67/mês).
  Guilherme: "é um valor pequeno, se aparecer você troca" — fica assim; quando a Lovable de Curitiba aparecer num
  cadastro/modelo de 2027, ou o razão de Assistência em informática do Esteio/Itajaí, trocar sem perguntar.
- **"Demais variações" sem o degrau "METRAGEM × itens"** (Guilherme: "vai gerar muita pergunta que não vamos conseguir
  responder", nos três Megas). A diferença entre o Ritmo item a item e o da METRAGEM fica em "não se repetem" (Ritmo da
  conta − Ritmo dos pares; legenda "gastos do Ritmo 2026 sem item em 2027") e a do modelo × Orç, em "itens novos"; as
  duas vão para o log (`_orcVariacoesItens_`). Hoje: Curitiba −87 mil, Itajaí −78 mil, Esteio +117 mil. Teste 4761/4761
  (3 asserções a menos = as formas do degrau que saiu).

## 3. Sem acesso ao Drive: o que dá e o que não dá

| Precisa de | Como fazer |
|---|---|
| Ler uma planilha ou apresentação Google | **Não dá direto.** Os `.gsheet`/`.gslides` no G: são atalhos (ler dá "Função incorreta"). Peça ao usuário para rodar `exportarFixtures()` no editor: os JSON aparecem em `G:\…\APRESENTAÇÃO ORÇAMENTO\_fixtures\`, com o mesmo nome dos arquivos de `teste/` — copie por cima e rode o teste |
| Ver os slides gerados | Peça `exportarSlidesCuritiba()` / `exportarSlidesItajai()` / `exportarSlidesEsteio()`; os PNG aparecem em `G:\…\APRESENTAÇÃO ORÇAMENTO\_slides-gerados - MEGA <X>\` — abra com a ferramenta de leitura de imagem |
| Criar uma planilha nova | Gere um `.xlsx` (Python + openpyxl, ver `ferramentas/`) e copie para a pasta no G:. Sobe como .xlsx e abre no Planilhas. Fórmulas com intervalo fechado (`D6:D1000`); intervalo aberto deu `#NAME?` |
| Mover ou renomear arquivo do Drive | `Move-Item` / `Rename-Item` no G: (o ID não muda, o gerador continua achando) |
| Excluir arquivo do Drive | Não exclua. Renomeie com o prefixo `PODE EXCLUIR - ` e avise o usuário |
| Publicar o código | `clasp login` (o usuário autoriza no navegador; a credencial some no reinício) e `clasp push --force` em `orcamento-2027/` |
| Saber se o Drive já subiu as imagens | `python ferramentas/conta_drive.py [--esperar MIN]`: conta os `GRAFICO - *.png` no Drive pela API (só metadados), com o token do clasp |
| Ver um slide sem o Slides | `PREVIA=ferramentas/saida node teste/teste_orcamento.js` e `python ferramentas/previa_slides.py ferramentas/saida/formas_<cidade>.json <índices>` — desde 07/10/2026 desenha linhas inclinadas, tracejado, bordas e alinhamento do texto como o Slides |

`exportarFixtures()` e `exportarSlides*()` foram ampliadas em 07/10/2026 e
**ainda não foram rodadas** nessa versão: na primeira vez, confira o log
("Pronto: N de M arquivos") antes de confiar nos JSON.

## 4. Como trabalhar

1. Começo de sessão (Deep Freeze): `git pull`; `node teste/teste_orcamento.js`
   tem que dar tudo ok. Se for rodar `ferramentas/*.py`: `pip install openpyxl`.
2. Edite os `.gs` (Read/Edit). Cuidado com quebras de linha: há arquivos em
   LF e em CRLF; um `git stash` converte. Script Python de edição: normalize
   `\r\n` → `\n` antes de procurar o trecho.
3. `node teste/teste_orcamento.js` — o teste roda os `.gs` num vm com
   dublês de Slides/Sheets e as planilhas reais em `teste/fixture_*.json`.
   Ele acusa: slide com falha, forma fora da página, texto cortado com "…",
   divergência entre relatórios. Toda mudança de comportamento ganha
   asserção.
4. `git commit` direto na `main`, mensagem em português terminando com
   `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`;
   `git push`.
5. `clasp push --force` (de `orcamento-2027/`). O `.claspignore` só sobe
   `*.gs` e `appsscript.json`.
6. Diga ao usuário o que rodar no editor (normalmente: gerar a cidade →
   `aplicarPropostasTextos()` → gerar de novo).

**Fim de toda sessão: commit + push.** O que não foi para o GitHub ou para o
G: se perde.

## 5. Fontes de dados (nomes padronizados em 07/10/2026)

Pasta no Drive: `08.000 - Business Analysis/APRESENTAÇÃO ORÇAMENTO`
(id `13PO9xDvPG3wmoVLfv41fZZo0I3rvl_gw`). Padrão: `MEGA <X> - <o que é> <ano>`,
`MESTRA - …` nas consolidadas, `PODE EXCLUIR - …` no que já não serve.

| Pasta | Conteúdo |
|---|---|
| `00 - PLANILHAS MESTRAS` | `MESTRA - ORÇAMENTO 2026 ITEM A ITEM` (`1X39Bz…`), `MESTRA - CONTRATOS 2026` (`11bcQ0…`, `ORC_CONTRATOS_ANO_ANTERIOR_ID`), `MESTRA - CONTRATOS 2027` (`1KGL-w8J…`, rev01, `ORC_CONTRATOS_ANO_IDS[0]`), `MESTRA - TOTAIS 2026 POR CONTA`, `MESTRA - 090 DESPESAS GERAIS 2027 - TODAS AS UNIDADES` (`1GsxlXr-…`, `ORC_MODELO_090_ID`), `MESTRA - 070 SERVIÇOS DE TERCEIROS 2027 - TODAS AS UNIDADES` (`1Msx1LjK…`, `ORC_MODELO_070_ID`) — exportações de 12/10, 16h |
| `01 - CONTROLE DA APRESENTAÇÃO` | `ORÇAMENTO 2027 - TEXTOS DAS TABELAS` (`ORC_TEXTOS_ID`), `ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - MEGA <X>` (três; Curitiba é Google Planilha, Itajaí e Esteio são .xlsx) |
| `02 - MEGA CURITIBA`, `03 - MEGA ITAJAÍ`, `04 - MEGA ESTEIO` | apresentação, `METRAGEM-COND 2027`, `DESPESAS MENSAL 2026 x 2027`, `PODE EXCLUIR - … 090 / 070 …` (modelos por Mega de antes de 12/10/2026), `BASE DO ORÇAMENTO 2027.xlsx` (Curitiba ainda tem `CONTRATOS 2027 - <CONTA>`, que o gerador não lê mais) |

Todos os IDs que o gerador usa estão em `ORC_CIDADES` (`01_Config.gs`), com
o nome do arquivo em comentário. O mapa fonte → slide está no README
("Planilhas lidas").

## 6. Decisões já tomadas (não reabrir sem o usuário pedir)

- **Curitiba, IPTU e Seguro:** vale a METRAGEM, por orientação da
  contabilidade (06/10/2026) — `relatorios.valeMetragem`.
- **DRE, Ofensores e Defensores** iguais à DRE da apresentação mensal dos
  Megas: mesmos grupos e ordem, IPTU e Seguro em Utilities, **todas** as
  contas (sem "Demais contas"), conta com "–" em todas as colunas some.
- **R$ e R$/m² ao mês em todo slide de valores** (área implícita = total ÷
  R$/m² ÷ 12, da METRAGEM).
- Ponte sem a explicação "já roda em 2026".
- Manutenção: "Projetos" (não "investimento"); "Custo para manter o Mega
  rodando" com legenda de cada grupo; itens menores em página (1/2), (2/2).
- **Alerta de pendência sempre ligado:** dado faltando nas fontes vira item
  em `_orcPendencias_` (slide de revisão + selo), nunca só log.
- Esteio: a área implícita sobe de ~24 mil para ~53 mil m² — está certo, o
  Mega cresce.
- Premissas: o gestor escreve no slide; depois o texto vai para
  `premissas` em `01_Config.gs` (senão a geração seguinte apaga).
- Comparação item a item: só os pares marcados **SIM** pelo gestor entram
  no slide.
- Texto curto de tabela: o gestor escolhe na coluna C da planilha de
  textos; o código só propõe (`07_PropostasTextos.gs`).

- **Como o Guilherme gosta de trabalhar** (07/10/2026): quando ele diz "vai anotando", só anote; nada de código
  até "pode rodar". Visual novo: rascunho em PNG **aberto na tela dele** (`Start-Process`) antes de codar; ele
  costuma pedir "rode um analista" (um agente avalia e dá nota) antes de aprovar. Sempre dizer **em qual arquivo**
  está a função que ele tem que rodar. Ao entregar, um passo a passo curto do que rodar.
- **Sombra em todo slide** (09/10/2026): conteúdo em card (`_orcCard_`, ou tabela por `_orcTabela_`/`_orcTabelaNum_`, que
  ganham o card sozinhas); desenho solto sem card chama `_orcSombraTabela_` com a área dele.
- **Tudo pelo motor:** gráfico ou elemento visual novo usa `_orcRet_`/`_orcLinha_`/`_orcBolinha_` (viram imagem) e
  `_orcUmaLinha_`/`_orcParagrafo_` (texto); nunca `slide.insertShape` solto num slide com cabeçalho.
- **Comparação honesta** (analista, 07/10/2026): não tirar conclusão só de um recorte de meses; out–dez do ritmo é
  projeção e tem que dizer; quando a área muda, separar efeito área de efeito custo.

## 7. Próximos passos

1. **V1** — o usuário gera e confere (`PASSO-A-PASSO.md`). Se ele relatar
   problema num slide, peça o PNG (`exportarSlides…`) em vez de adivinhar.
2. **Slide de comparação item a item** (manutenção, Orç 2026 × Orç 2027).
   ⚠ **A base 2026 vai mudar (07/10/2026):** a comparação usou o ORÇADO 2026; o
   Guilherme vai trocar pelo RITMO 2026. Tudo o que existia antes da troca
   (planilhas preenchidas pelo gestor, base, decisões) e o roteiro do que
   conferir com a base nova: [`APRENDIZADOS-COMPARACAO-2026.md`](APRENDIZADOS-COMPARACAO-2026.md).
   **O gestor preencheu as três planilhas em 07/10/2026** (SIM/NÃO na coluna
   K e comentário na L). O que ele disse, além dos pares:
   - **Obras de 2026 que ficaram para 2027** ("não foi realizado, apenas
     deslocamos"): Itajaí 7 itens, R$ 611 mil no Orç 2027 (~62% da alta da
     manutenção: docas, torniquetes, impermeabilizações, iluminação do bolsão e
     do AMZ 4/5, quadro da portaria); Curitiba 2 itens, R$ 233 mil (~48%:
     guard-rail, 4º torniquete). A pendência de R$ 29.313 de Itajaí são itens
     reais de 2027 (iluminações adiadas; totem é estrutura, a lona foi em 2026).
   - **Provisões por disciplina de 2026 viraram a provisão de 3%** de
     manutenções não previstas em 2027 (Curitiba R$ 39 mil, Esteio R$ 20,8 mil;
     **Itajaí não tem a linha** — pergunta em aberto). Explica "Esteio sem
     acesso/CFTV".
   - **Mudou de conta:** tratores e bombas → Manutenção de Bens Móveis;
     paisagismo de Curitiba → LPU na Conservação; potabilidade e limpeza de
     caixa d'água viraram contrato.
   - **Contratos com o ano cheio em 2027** (PMOC, Equilíbrio em Curitiba) e
     **Esteio cresce com os Armazéns B1 e B2** (subestação, gerador,
     elevatórias semestrais, 5 linhas de vida, juntas).
   - Par certo em Itajaí: Orbital (PPCI, rescindido) → Firecam; FM Security é
     contrato novo.
   - Pedido dele: **comparar também por disciplina** ("em 2026 gastamos X com
     pintura, em 2027 projetamos X").
   Perguntas em aberto estão em `ORC_PENDENCIAS_GESTOR` (01_Config.gs) e saem
   no slide de revisão. As decisões dele viram código por
   `ferramentas/decisoes_gestor.py` → `23_DecisoesGestor.gs`.
   **Feito (07/10/2026):** slide "Por que a manutenção sobe"
   (`24_PorQueSobe.gs`, abre a seção Manutenção de Curitiba e Itajaí): ponte
   Ritmo → obras adiadas de 2026 → demais variações → Orç, em R$ e R$/m², e a
   tabela das obras (valor de 2027 vindo do modelo 090 pelo nome). Itajaí:
   +77,1% → +29,4% sem as adiadas. **Falta:** comparação por disciplina e a
   item a item só com os pares SIM (os pares já estão em `ORC_DECISOES_GESTOR`). As planilhas são do
   Drive: peça ao usuário para baixá-las como .xlsx para uma pasta do G: (ou
   rodar uma exportação). As linhas de origem estão em
   `ferramentas/comparacao_linhas_<cidade>.json` (gerado por
   `ferramentas/curadoria.js`); a decisão do gestor vem da coluna K
   (COMPARA?). **Desde 07/10/2026 a base de 2026 é o ritmo**
   (`ferramentas/saida/ritmo_linhas_<cidade>.json` e as planilhas "… RITMO 2026
   x ORÇ 2027 - MEGA <X>"; ver APRENDIZADOS-COMPARACAO-2026.md, seção 6). Siga o visual do slide `21_ContratosComparados.gs` (cards +
   tabela com R$ e R$/m²), entre na seção Manutenção.
3. Pendências com a controladoria (aparecem sozinhas no slide de revisão):
   Itajaí R$ 29.313 (totem, iluminação do AMZ 4/5 e do bolsão — todos com par
   em 2026, provavelmente já feitos); Esteio R$ 15.268 (linhas de vida).
4. Achados para o gestor (estão nas planilhas de comparação): a linha
   "SEGURO MEGA ESTEIO - ÁRMAZEM A" (R$ 13.376,81, nov) na manutenção de
   Itajaí do Orç 2026 item a item foi **erro de digitação** (confirmado pelo
   Guilherme em 07/10/2026) — fica fora da comparação; o seguro do próprio
   Itajaí na manutenção (R$ 66.780) segue como "Não compara"; Esteio sem
   verba de acesso/CFTV em 2027 e tratores do Esteio fora da manutenção — os
   dois explicados pelo gestor (3% e Bens Móveis, item 2); Orç 2026 item a
   item do Esteio R$ 4.500 acima da METRAGEM.
5. **Melhorias visuais (capas, subcapas, infográficos):** propostas em
   [`IDEIAS-DESIGN.md`](IDEIAS-DESIGN.md), com o que foi aprendido na produção
   de capas de vídeo do Guilherme (07/10/2026). **Nada aprovado ainda**:
   propor, mostrar o PNG e esperar o "sim" do gestor antes de mexer.

## 8. Armadilhas já encontradas

- **Cabeçalho de mês dos cadastros:** "jan./27" vindo de CSV vira, no
  Sheets, a data 27/01/<ano corrente> — o ano está no **dia**. Pode vir
  também como texto "jan./27". `_orcDataCabecalho_` trata os dois.
- **Chave de conta:** `_orcChaveConta_` tira acento, conectivos ("de", "e",
  "em"…) e plural, para "Assistência em informática" (METRAGEM) casar com
  "ASSISTÊNCIA INFORMÁTICA" (cadastro).
- **Texto cortado:** a tabela usa uma fonte só e corta com "…". O teste
  falha. Corrija com uma proposta em `07_PropostasTextos.gs` — o mesmo texto
  pode precisar de linha nas abas `Composição`, `Ofensores`, `Categorias` e
  `Maiores itens`.
- **Pareamento de contratos** (`21_…` e `22_…`): só item de contrato casa;
  número conta ("ARMAZÉM 01" ≠ "ARMAZÉM 02"); palavras genéricas
  ("preventiva", "corretiva", "das") não identificam fornecedor.
- **Limite de 6 min do Apps Script:** gere uma cidade por vez;
  `gerarTodas()` chega perto do limite.
- **Nunca reconstrua arquivo a partir de texto colado no chat** (ver o
  `CLAUDE.md` da raiz): pegue da fonte.
- Heredoc de Bash com Python quebra com aspas e `\b`; escreva o script com a
  ferramenta de escrita e rode o arquivo. (Voltou a quebrar em 07/10/2026 com
  heredocs grandes: "unexpected EOF while looking for matching `''".)
- **Caixa de texto do Slides quebra antes do que a estimativa acha**
  (`_orcLarguraTexto_` subestima): número curto em caixa estreita ("4,50" em
  24 pt com folga 0) e nome no fim de linha ("Ritmo 2026" em 40 pt) quebraram
  em duas linhas. Dê folga (a caixa não tem fundo, esticar não aparece).
- **Motor e camadas:** a imagem das formas vai com `sendToBack` e a moldura
  fecha depois (fica mais atrás). Sem a imagem, as formas são recriadas e
  mandadas para trás na ordem inversa — ficam atrás de todos os textos.
  Capa, sumário e sub capas não têm cabeçalho e não entram no motor (lá há
  forma por cima de foto e áreas de link).
- **Assinatura igual no teste e no Apps Script:** a especificação é JSON com
  uma casa decimal; o teste usa as mesmas planilhas (fixtures), por isso as
  imagens desenhadas a partir do teste servem para a geração real. Se a
  planilha real mudar, a assinatura muda e cai em "formas" + pendentes.
