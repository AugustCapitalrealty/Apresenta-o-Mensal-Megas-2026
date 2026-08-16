# Gestão à Vista — TVs

Projeto Apps Script que atualiza os três decks de TV (Mega Curitiba, Mega
Itajaí, Mega Esteio).

## O que rodar

O menu "Selecionar função" do editor só lista função **sem parâmetro** e
esconde as que começam ou terminam com `_` — por isso cada recorte tem a sua
própria entrada.

| Função | O que faz |
|---|---|
| `gerarApresentacao()` | Atualiza as **três** TVs (é o que o acionador chama, via `INICIAR_AQUI`) |
| `gerarCuritiba()` / `gerarItajai()` / `gerarEsteio()` | Atualiza **uma** TV só |
| `ATUALIZAR_METAS()` | Redesenha só os slides de Metas das três |
| `ATUALIZAR_METAS_CURITIBA()` / `_ITAJAI()` / `_ESTEIO()` | Só as Metas de uma |
| `ATUALIZAR_MONITORAMENTO_CHEIAS()` | Só o slide de cheias (Esteio) |
| `ATUALIZAR_PREVISAO_TEMPO()` | Só o slide do tempo |
| `diagnosticarBasesBrutas()` | Mostra o dado bruto das bases — rode antes de discutir número |

Prefira a entrada de **uma** unidade ao conferir um ajuste: são ~30s por TV,
e mexer nas três multiplica o risco de deixar as outras num estado
intermediário se algo falhar no meio.

## Arquivos do projeto

Esta é a lista **completa** do que deve existir no editor do Apps Script.
Não há `clasp`: o código é copiado à mão (ver o CLAUDE.md da raiz).

| Arquivo | Papel |
|---|---|
| `Config.gs` | IDs das planilhas, `UNITS` (uma entrada por TV) e o design system |
| `Dados.gs` | **Tudo que lê planilha.** Parte 1: bases brutas dos slides 1–4. Parte 2: valores automáticos das Metas |
| `00_Main.gs` | Orquestrador, cabeçalho padrão dos slides, `MESES_POR_EXTENSO` |
| `01_Slide_Corretivas.gs` | Slide 1 — Visão Geral Corretiva |
| `02_Slide_Corretivas_Acao.gs` | Slide 2 — Backlog Corretivo |
| `03_Slide_Preventivas.gs` | Slide 3 — Visão Geral Preventiva |
| `04_Slide_Preventivas_Acao.gs` | Slide 4 — Backlog Preventivo |
| `05_Slide_Capa.gs` | Slide 0 — capa |
| `06_Slide_Tempo.gs` | Slide 5 — previsão do tempo (acionador próprio) |
| `07_Slide_Metas.gs` | Slides 6+ — um por papel em `unit.metas` |
| `08_Slide_Cheias.gs` | Último slide, só Mega Esteio (acionador próprio) |

`teste_bases.js` **não vai para o editor** — é um teste de Node, roda com
`node gestao-tvs/teste_bases.js`.

## Se o editor não tiver exatamente esses arquivos

**Arquivo a mais quebra tudo.** Apps Script compila o projeto num namespace
global único, então uma versão antiga esquecida no editor derruba o projeto
inteiro com um erro que não diz de onde vem:

```
SyntaxError: Identifier 'BD_CORRETIVAS_ID' has already been declared
```

Isso é sempre a mesma coisa: **dois arquivos declarando o mesmo nome**. Como
o erro é de sintaxe, ele acontece antes de qualquer código rodar — nenhuma
verificação interna consegue pegá-lo. Confira a lista acima e apague o que
sobrar.

Nomes que já existiram e **não** devem estar no editor:
`08_Dados_MetasAuto.gs`, `09_Dados_BasesBrutas.gs`, `09_Metas_Auto.gs`,
`10_Dados_BasesBrutas.gs` (os dois últimos viraram `Dados.gs`).

**Arquivo a menos** é pego: `gerarApresentacao()` chama `_tvConferirProjeto_()`
na primeira linha, que confere a assinatura das funções que mudaram e nomeia
o arquivo a recopiar.

## De onde vêm os números

Os quatro slides operacionais contam da planilha **BASE DE DADOS — QUADRO
REM** (abas `BD-CORRETIVAS` e `BD-PREVENTIVAS`), uma linha por registro — a
mesma fonte da apresentação mensal dos Megas e da de Propriedades. A planilha
da TV (`ID_PLANILHA`) ficou só com a aba `METAS` e com a data de
sincronização do cabeçalho.

`diagnosticarBasesBrutas()` mostra o cabeçalho real das bases, quantas linhas
cada Mega tem e que valores as colunas de Estado e SLA trazem de verdade.
Rode antes de discutir número.

## O que ainda é digitado à mão

- **Metas** (aba `METAS` da planilha da TV) — exceto os indicadores que o
  `Dados.gs` sobrescreve com valor calculado.
- **Índice de Disponibilidade** — lido da aba `CHAMADOS` da planilha da
  cidade, onde é digitado.
- **`cheiasCotas`** em `Config.gs` — só a cota de Campo Bom (7,20 m) veio da
  planilha; as de São Leopoldo e Porto Alegre são referência da Defesa Civil
  e precisam de confirmação.

## Os dois slides de corretivas mostram o MESMO backlog

O slide 1 (**Visão Geral Corretiva**) e o slide 2 (**Backlog Corretivo**) são
duas fatias da mesma fila: o 1 recorta por equipe (Facilities x Property), o
2 por prioridade e disciplina. **Os totais têm que bater** — e batem por
construção, porque os dois usam `_tvAbertoEm_` em vez de duas definições
paralelas de "aberto". `teste_bases.js` trava isso.

Já quebrou: o slide 1 chegou a ser implementado como FLUXO (chamados criados
na semana) e mostrava `2` enquanto a fila real era outra ordem de grandeza.
Num painel de parede o número grande é a fila que existe agora, não quantos
entraram ontem.

## Decisões que valem revisar

- **`TV_BACKLOG_PREV_MESES = 12`** (`Dados.gs`) — rotina preventiva agendada
  há mais de 12 meses e nunca fechada fica FORA do backlog. Sem esse corte a
  TV mostrava 595 itens em aberto, com um de 1337 dias (2022): resíduo de
  base, não trabalho pendente. O `Logger` diz quantas ficaram de fora a cada
  execução. Se o time preferir outra janela, muda só esse número.
- **`TV_BACKLOG_DIAS_COMPARACAO = 7`** — contra quantos dias atrás a seta
  ▲/▼ dos backlogs compara. O backlog daquele dia é CALCULADO na base (item
  aberto até lá e ainda não fechado), não um retrato guardado entre
  execuções.

## Limitação conhecida

A coluna **RESPONSÁVEL** do Backlog Preventivo (slide 4) mostra `—`. A
`BD-PREVENTIVAS` não tem coluna de Responsáveis nem de Equipe, e numa rotina
ainda aberta o "Fechado por" está vazio por definição — não há de onde tirar
a equipe. Mostrar `—` é deliberado: antes o código caía num default e
carimbava todas as rotinas como Facilities, o que parecia dado apurado e não
era. `diagnosticarBasesBrutas()` mede as colunas candidatas para o caso de
alguma servir de substituta.
