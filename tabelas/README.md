# Tabelas — Apresentações Semanais

Cinco geradores de Apps Script, **cada um vinculado à sua própria
apresentação** de Google Slides — mesma regra do resto do repositório:
pasta organiza o código no git, não junta os projetos. Aqui a organização
já vinha assim no repositório de origem (`tabelas-Mega-Itajai`), então a
estrutura foi trazida como estava.

| Pasta | Apresentação | Arquivos |
|---|---|---|
| `mega-curitiba/` | Mega Curitiba — Pendências da Obra + Acompanhamento de Demandas | 1 `.gs` |
| `mega-itajai/` | Mega Itajaí — Pendências da Obra + Acompanhamento de Demandas (modelo original) | 1 `.gs` |
| `previsao-tempo/` | Previsão do tempo — Curitiba/Itajaí/Esteio numa apresentação só | 1 `.gs` |
| `propriedades-semanal/` | Propriedades — Recebimento de Obras + Gestão de Contratações | 2 `.gs` (mesmo projeto Apps Script) |
| `template/` | — (não vinculado) | 1 `.gs`, base para novos relatórios |

Ver o [`CLAUDE.md`](../CLAUDE.md) da raiz para a regra do namespace único do
Apps Script e as lições que valem para todos os projetos do repositório.

## O que cada um faz

- **`mega-curitiba/`** e **`mega-itajai/`** — mesmo formato de relatório
  (Pendências da Obra + Acompanhamento de Demandas), cada um na sua
  apresentação. Itajaí foi o modelo original; Curitiba é a adaptação. Em
  Itajaí a aba de pendências pode vir dividida em seções
  (PENDENTE/AGENDADO/REALIZADO), com o `REALIZADO` virando slide de
  histórico.
- **`previsao-tempo/`** — único projeto que cobre as três cidades numa
  apresentação só; busca dados na API pública Open-Meteo (sem chave).
- **`propriedades-semanal/`** — dois arquivos no **mesmo** projeto Apps
  Script (o Slides só permite um projeto vinculado por apresentação):
  `recebimento-obras.gs` declara os globais compartilhados (`SHEET_ID`,
  `SLIDES_ID`, `C`, `TY`, `CORES`, helpers `_v`/`_fmt`/`_noFill`/`_alert`/
  `_paginar`/`_removerSlidesPorTag`) e `gestao-contratacoes.gs` reusa —
  não redeclara.
- **`template/`** — clone configurável do gerador de pendências, para
  começar um relatório novo preenchendo só o bloco `CONFIG`, sem reescrever
  o visual.

## Padrão comum aos relatórios

- **Painel/menu único de atualização** em cada apresentação: botão
  "⚡ Atualizar TUDO" roda tudo de um clique; botões individuais atualizam
  só a seção correspondente.
- **Slides marcados por tag na nota** (ex. `【PENDENCIAS_AUTO】`,
  `【DEMANDAS_AUTO】`, `【CLIMA_AUTO】`) — cada atualização substitui só os
  slides com a própria tag, preservando o resto da apresentação.
- **Publicação manual**, como no resto do repositório: não há `clasp`, o
  código é colado à mão no editor do Apps Script de cada apresentação.
