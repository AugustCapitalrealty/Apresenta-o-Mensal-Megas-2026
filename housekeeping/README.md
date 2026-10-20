# Housekeeping — dois slides do módulo do Hub

Gera dois slides sobre o módulo **Housekeeping** do Hub dos Megas (gestão de
terceiros: rotina de limpeza e zeladoria), para a reunião geral de outubro/2026.
É a irmã de [`rateio-energia/`](../rateio-energia/): mesmo desenho, mesma regra
de rodar de novo.

| | |
|---|---|
| Apresentação | criada pela primeira execução — o link sai no log; o ID fica na propriedade `HK_DECK_ID` do script |
| Projeto Apps Script | [`1C5Dz1hk…`](https://script.google.com/d/1C5Dz1hkaT7TfgMbjAinlf8rKqQkvfGG3-rlBsPoYZrLIkgf1EXqZMP2I/edit) (sobe com `clasp push` desta pasta) |
| Ponto de entrada | `gerarApresentacaoHousekeeping()` |

Para gerar numa apresentação que já existe, ponha o ID dela em `HK_DECK_ID`
(topo do `Housekeeping.gs`) — a constante vale mais que a propriedade.

## O que gera

Dois slides, com o cabeçalho padrão dos Megas (`criarHeaderPadrao`):

1. **O que faz** — Biblioteca → Matriz do Mega → Agenda e checklist →
   Indicadores, com a meta de 95%, as 36 áreas de Curitiba e o quadro impresso.
2. **Exemplo de cronograma** — a semana atual (segunda a domingo, calculada na
   hora de rodar, com a coluna de hoje destacada) do Mega Curitiba: atividades
   da biblioteca do Hub com os horários sugeridos, nas áreas do Infraspeak, uma
   bolinha por horário no dia. É um **exemplo montado no script**
   (`HK_EXEMPLO`), não a agenda lida do Hub — o próprio slide diz isso.

Cada slide gerado leva a marca `【HOUSEKEEPING_HUB_2026】` na nota. Rodar de novo
apaga só os marcados e põe os novos **no lugar do primeiro antigo**: dá para
mover os dois para o meio de outro deck e regenerar sem que pulem para o fim.
Cada slide é desenhado dentro de um `try/catch`: se um quebrar, o aviso aparece
nele e o outro sai.

## De onde vêm os números

Do código do Hub (repositório `megas-adc1ba20`, migrations de 20 e 21/10/2026),
escritos direto nos slides:

- Meta 2026: 95% dos controles diários pelas equipes terceiras nas áreas comuns
  (`META_CUMPRIMENTO`), com fotos como evidência e ao menos uma ronda da gestão
  por mês. Cumprimento = concluídas ÷ devidas no mês (`hk_indicadores`).
- 60 atividades na biblioteca de referência, em 8 categorias.
- 36 áreas do Mega Curitiba, da árvore de ativos do Infraspeak. Itajaí e Esteio
  ainda sem áreas.
- Matriz com **Executa, Apoia e Gestão**. "Propõe / Questiona" saiu em 20/10 e
  "Garante" saiu depois (confirmado pelo usuário em 20/10/2026; a cópia local
  do Hub ainda tinha o Garante). O teste reprova se "Garante" aparecer num slide.

## Testar

```sh
node housekeeping/teste_housekeeping.js
PREVIA=/tmp/hk node housekeeping/teste_housekeeping.js
node ferramentas/previa_slides.js /tmp/hk/formas_housekeeping.json /tmp/hk
```

O teste dubla `SlidesApp` e `PropertiesService`: a primeira execução tem que
criar a apresentação (e tirar o slide vazio que ela traz); na segunda, com um
slide feito à mão antes e outro depois dos dois gerados, eles têm que voltar no
mesmo lugar, sem duplicar. Reprova também se alguma forma sair da página, se
algum slide escrever o aviso de falha ou se "Garante" aparecer.
