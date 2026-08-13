# Propriedades — Apresentação Semanal

Geradores do Apps Script vinculados à apresentação **"TEMPLATE PROPRIEDADES
TABELAS - SEMANAL"** (Slides ID `1Te_E9SuMVNG6mfLzLU8wybOEoa1q5CtuYICwHZxyMGg`).
Projeto **separado** dos geradores do Mega Itajaí (`mega-itajai/`,
`previsao-tempo/`).

## Arquivos (mesmo projeto Apps Script)

| Arquivo | O que faz |
|---|---|
| `recebimento-obras.gs` | Relatórios **Esteio · Ctba · Análise de Projetos** + o **menu/painel único** (`onOpen`, `abrirPainel`, `executarAtualizacao`). |
| `gestao-contratacoes.gs` | Relatório **Gestão de Contratações** (`_gerarContratacoes`). Reutiliza os símbolos globais declarados em `recebimento-obras.gs` — não os redeclara. |

> Os dois arquivos convivem no **mesmo** projeto Apps Script (o Slides só permite
> um projeto vinculado por apresentação). Por isso um só declara os globais
> compartilhados (`SHEET_ID`, `SLIDES_ID`, `C`, `TY`, `CORES`, helpers `_v`,
> `_fmt`, `_noFill`, `_alert`, `_paginar`, `_removerSlidesPorTag`) e o outro os reusa.

## Como usar (as duas pessoas do time)

1. Abrir a apresentação → menu **🔄 Atualizar Apresentação**.
2. **📋 Abrir painel de atualização** → painel lateral com botões:
   - ⚡ **Atualizar TUDO** (Recebimento + Contratações de uma vez)
   - Recebimento: **Esteio · Curitiba · Análise de Projetos** (ou os 3 juntos)
   - **Contratações**
3. Cada botão substitui **apenas os próprios slides** (identificados por tags nas
   notas do slide: `【ESTEIO_AUTO】`, `【CTBA_AUTO】`, `【ANALISE_AUTO】`,
   `【CONTRATACOES_AUTO】`), então dá pra rodar em qualquer ordem sem apagar o
   trabalho do outro relatório.

Atalho: menu **⚡ Atualizar TUDO (1 clique)** roda tudo sem abrir o painel.

## Fonte dos dados

Planilha `1in5xwPsPBAQCRyuCZNdEmT_u4jOYADdGs0ABKeeovF4`, abas:
`Recebimento de Obras - Esteio`, `Recebimento de Obras - Ctba`,
`Análise de Projetos`, `GESTÃO DE CONTRATAÇÕES`.
