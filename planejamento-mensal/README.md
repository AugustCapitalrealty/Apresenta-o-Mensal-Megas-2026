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
