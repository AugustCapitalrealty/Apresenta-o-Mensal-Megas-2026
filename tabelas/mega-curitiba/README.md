# Mega Curitiba — Apresentação Semanal

Gerador do Apps Script vinculado à apresentação do **Mega Curitiba**,
espelhado no modelo de `mega-itajai/pendencias-obra.gs` — **2 abas**:
`PENDENCIAS OBRA` e `ACOMPANHAMENTO DE DEMANDAS`.

- Planilha fonte: `1N05LzpdSZXrAtPItwgkwFL2nOuuMmC1s`
- Apresentação: `1Kzf0be1GxaA2MUm-vSMQkjOlAevykzJxD9rdjI13B80`

## Arquivo

| Arquivo | O que faz |
|---|---|
| `pendencias-obra.gs` | Os dois relatórios (**Pendências da Obra** e **Acompanhamento de Demandas**) + o **menu/painel único** de atualização. |

## Relatórios

- **Pendências da Obra** (aba `PENDENCIAS OBRA`) — tabela `Nº · Descrição ·
  Garantia · Visita · Atend. · Concl. · Empresa`, com badges de status
  (Pendente/OK/Aguardando) e KPIs TOTAL/RESOLVIDOS/PENDENTES/% concluído.
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
   slide: `【PENDENCIAS_AUTO】`, `【DEMANDAS_AUTO】`).

Atalho: menu **⚡ Atualizar TUDO (1 clique)** roda tudo sem abrir o painel.

## Observação

Se os nomes das abas na planilha real divergirem de `PENDENCIAS OBRA` /
`ACOMPANHAMENTO DE DEMANDAS`, ajuste as constantes `SHEET_NAME` e
`SHEET_NAME_DEMANDAS` no topo de `pendencias-obra.gs`.
