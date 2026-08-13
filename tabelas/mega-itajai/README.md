# Mega Itajaí — Apresentação Semanal

Gerador do Apps Script vinculado à apresentação do **Mega Itajaí** — **2 abas**:
`PENDENCIAS OBRA` e `ACOMPANHAMENTO DE DEMANDAS`. Foi o modelo original a
partir do qual `mega-curitiba/pendencias-obra.gs` foi adaptado.

- Planilha fonte: `1wQCwfSCBdH8OZOBmh6BsMutPwA5W5fwbEIT9LWt8fiM`
- Apresentação: `14SxB0k1WqZatfAn2kSjHgrm8Jyb-mTLCdH5s5gb0wkI`

## Arquivo

| Arquivo | O que faz |
|---|---|
| `pendencias-obra.gs` | Os dois relatórios (**Pendências da Obra** e **Acompanhamento de Demandas**) + o **menu/painel único** de atualização. |

## Relatórios

- **Pendências da Obra** (aba `PENDENCIAS OBRA`) — tabela `Nº · Descrição ·
  Garantia · Visita · Atend. · Concl. · Empresa`, com badges de status
  (texto completo, ex. PENDENTE/OK/AGUARDANDO INTERNO — a fonte reduz
  sozinha para caber sem abreviar) e KPIs TOTAL/RESOLVIDOS/PENDENTES/%
  concluído.
  - A aba pode vir dividida em **seções** (cabeçalho repetido + linha-rótulo
    `PENDENTE` / `AGENDADO` / `REALIZADO`): cada seção em aberto vira um
    bloco de slides próprio, com legenda e KPI só dela; `REALIZADO` vira
    slide de **histórico** (linhas verdes, tag `【PENDENCIAS_HIST_AUTO】`).
- **Acompanhamento de Demandas** (aba `ACOMPANHAMENTO DE DEMANDAS`) — tabela
  `Nº · Descrição · Setor · Solicitação · Tempo Decorrido · Previsão de
  Entrega · Status`, com badge de urgência por tempo decorrido e KPIs
  TOTAL/COM DATA/% com data.

## Como usar

1. Abrir a apresentação → menu **🔄 Atualizar Apresentação**.
2. **📋 Abrir painel de atualização** → painel lateral com botões:
   - ⚡ **Atualizar TUDO**
   - 🔄 **Pendências da Obra**
   - 📋 **Acompanhamento de Demandas**
3. Cada botão substitui **apenas os próprios slides** (tags nas notas do
   slide: `【PENDENCIAS_AUTO】`, `【PENDENCIAS_HIST_AUTO】`, `【DEMANDAS_AUTO】`).

Atalho: menu **⚡ Atualizar TUDO (1 clique)** roda tudo sem abrir o painel.

## Observação

Se os nomes das abas na planilha real divergirem de `PENDENCIAS OBRA` /
`ACOMPANHAMENTO DE DEMANDAS`, ajuste as constantes `SHEET_NAME` e
`SHEET_NAME_DEMANDAS` no topo de `pendencias-obra.gs`.
