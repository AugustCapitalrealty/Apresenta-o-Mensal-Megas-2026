# Apresentação Mensal — Planejamento & Gestão

Gerador (Google Apps Script) do deck mensal da Gerência de Planejamento e
Gestão (P&G), o 5º deck do ciclo mensal ao lado dos 3 Megas e de
Propriedades. Mesmo design system (`CR_DESIGN_SYSTEM`) e mesma lógica de
"ordem fixa do deck" do `propriedades-mensal`, que é o molde.

- **Projeto Apps Script:** `1COtn7RbupNLoBZZnGzMMSvYjLyhjCziPsAZY-KUGxq-W2ngj9R5P5Jg_`
  (https://script.google.com/home/projects/1COtn7RbupNLoBZZnGzMMSvYjLyhjCziPsAZY-KUGxq-W2ngj9R5P5Jg_/edit),
  na pasta do Drive `29 - Template Apresentações/03 - APRESENTAÇÃO MENSAL - GERENCIAL/PLANEJAMENTO & GESTÃO/`
  (`1LEc7_dZzkX9HueP0T2_5Oi8NAF34ERZj`). Criado pelo Guilherme em 12/11/2026.
- **Publicação:** `clasp push` de dentro desta pasta (o `.claspignore` só
  sobe `*.gs` e `appsscript.json`; testes `.js` ficam fora). Antes do push,
  `clasp clone` numa pasta temporária e comparar (o editor pode ter mudanças).
  Toda mudança termina com `git commit` + `git push`.

## Estrutura do deck (proposta, rascunho v1 de 12/11/2026)

Capa · Destaques (manual) · Dashboard · **01 Financeiro** (DRE, Bridge
tabela, Bridge gráfico) · **02 Metas** (Farol 2026, 1 slide por meta) ·
**03 Projetos** (Portfólio, Cronograma, Entregas do mês e próximos passos) ·
Encerramento. Rascunho: `PLANEJAMENTO & GESTÃO/RASCUNHO/PG - rascunho do deck v1.png`.

## Fontes

| Seção | Fonte | Situação |
|---|---|---|
| Financeiro | Export da controladoria do CC **1.01.01.008 GERÊNCIA DE PLANEJAMENTO E GESTÃO** (empresas 11 e 61), mesmo formato do de Propriedades. Salvo como `Planejamento-<Mês>-<Ano>.csv` na pasta do deck | Out/26 recebido |
| Metas | As 4 metas do Farol do Guilherme (hoje fixas em `farol-guilherme/Farol.gs`) → passar para uma planilha | A criar |
| Projetos | Planilha de portfólio nova (carga inicial: projetos da pasta `27 - Projetos`) | A criar |

## Regras do financeiro (decisões do Guilherme, 12/11/2026)

- A coluna **"Planejado" do export é o RITMO**, nunca orçamento. No deck
  aparece sempre como "Ritmo".
- **P&G não tem meta financeira:** DRE = Real × Ritmo (mês e acumulado) +
  projeção do ano (real até o mês de referência + ritmo dos meses seguintes).
  Sem coluna Meta/Orçamento.
- Categorias = `DRE_PROP_CATEGORIAS` de `propriedades-mensal` (todas as 32
  contas de out/26 se encaixam). Depreciação (08) fica fora do total 06.
- Out/26 (R$ mil, despesas 06): mês real 15,9 × ritmo 9,9; acum. jan–out
  196,9 × 220,8; projeção 2026 = 216,8. A explicar: créditos de bônus
  +22,2 mil (fev) e provisão de férias +18,6 mil (mai, mês fica negativo);
  salários de ~19 mil → ~4 mil/mês a partir de maio.

## Como usar (código publicado em 12/11/2026)

Projeto standalone: escolher a função no seletor do editor e clicar em
**Executar**; o resultado e o link do deck saem no log. Na 1ª execução o
Google pede autorização (Drive, Slides, Planilhas).

| Função | O que faz |
|---|---|
| `criarPlanilhaPG()` | (O `gerarApresentacaoPG` já chama sozinho se faltar.) Cria `PLANILHA PLANEJAMENTO & GESTÃO` na pasta de P&G (abas CONFIG, METAS, PROJETOS) com a carga inicial. Se já existir, só mostra o link |
| `gerarApresentacaoPG()` | Gera/atualiza o deck do mês inteiro (19 slides com 4 metas e até 11 projetos) |
| `gerarSoFinanceiroPG()` / `gerarSoMetasPG()` / `gerarSoProjetosPG()` | Só a seção (e o Dashboard) |
| `diagnosticarPG()` | Mostra no log mês, totais, metas, projetos e o link da planilha, sem mexer em nada |

**Mês do deck = mês do nome do export mais recente** na pasta
(`Planejamento-<Mês>-<Ano>.csv`). Não é detectado pelo dado: o export de out/26
já traz R$ 11,53 realizado em novembro.

**Deck:** `PLANEJAMENTO & GESTÃO - RESULTADOS MM/AAAA`, criado na pasta de P&G
na 1ª execução do mês. Rodar de novo troca cada slide gerado **no mesmo
lugar** (tag na nota + `slide-id`); slides feitos à mão ficam e andam colados
no slide anterior. **Destaques do período** é criado como modelo vazio só se
não existir; depois é manual e nunca é regerado.

### Rotina mensal
1. Salvar o export da controladoria (CC 1.01.01.008, empresas 11 e 61) como
   `Planejamento-<Mês>-<Ano>.csv` na pasta de P&G.
2. Atualizar na planilha: METAS (real e status), PROJETOS (avanço, status,
   prazo, entregue em, próximo passo) e `CONFIG!B1` (mês da situação). Se
   `CONFIG!B1` for diferente do mês do export, os slides de metas e projetos
   avisam no rodapé.
3. Rodar `gerarApresentacaoPG()` e escrever os Destaques à mão.

### Estrutura do código
`00_Main` entradas · `01_Config` IDs, cores, **mapa conta → rubrica**
(`PG_RUBRICAS`; conta 06 fora do mapa vai para "Outras (fora do mapa)" e para a
nota do DRE) · `02_Dados` leitura do CSV e da planilha · `03_Desenho`
primitivas, cabeçalho, card, tabela em formas · `04_Deck` deck do mês, troca
no lugar, **ordem fixa** (`_pgEstrutura_`) · `05_Planilha` cria a planilha ·
`10`–`14` slides (capas, dashboard, financeiro, metas, projetos).

### Teste local
`node teste_pg.js "<caminho do Planejamento-Outubro-2026.csv>"` dubla
Slides/Drive/Planilhas, gera o deck duas vezes (a 2ª tem que trocar no lugar)
e confere ordem, Destaques único, NaN/undefined, formas dentro da página e
o TOTAL do DRE contra o export (9,9/15,9 · 220,8/196,9 · 240,7/216,8).
`PREVIA=<pasta>` grava `formas.json` para `../ferramentas/previa_slides.js`
(PNG por slide); `CHEIO=1` usa uma planilha toda preenchida de **exemplo**
(não é dado real) para ver portfólio e cronograma cheios.

### Mudança de 12/11/2026 (depois do 1º deck gerado)
- O 1º deck saiu **sem Metas e sem Projetos** porque a planilha não existia
  (o `criarPlanilhaPG` não tinha sido rodado). Agora o `gerarApresentacaoPG`
  **cria a planilha sozinho** quando ela falta.
- **Seção 03 = só a lista dos projetos feitos no ano** (pedido do Guilherme):
  saíram portfólio com prazo/avanço, cronograma e entregas/próximos marcos.
  Aba PROJETOS: `Projeto · Área cliente · Situação (Concluído/Em andamento/Pausado)
  · Concluído em · O que foi feito`. Até 12 por slide (pagina sozinho).
  Carga com 11 projetos (3 concluídos: Pesquisa de Satisfação 28/08, Papo com RH
  06/11, Agendamento Inteligência de Mercado sem data registrada). Aba no formato
  antigo também é lida. Slides antigos com tag PORTFOLIO/CRONOGRAMA/ENTREGAS são
  removidos na regeração. Deck = 16 slides.
- **Pessoal nunca abre** (Guilherme, 12/11/2026: "o DRE não entra em detalhes do
  custo com pessoal"): `detalhar: false` no grupo PESSOAL de `PG_RUBRICAS` → uma
  linha só no DRE, no mês a mês, na cascata e nas notas (variações e créditos
  saem como "Pessoal", nunca bônus/provisão/INSS). **Viagens não abre no mês a
  mês** ("mês a mês de viagens não precisa"): `mesAMes: false`; no DRE abre.
  O teste reprova se qualquer slide citar salário, bônus, encargos, provisão,
  benefício etc.
