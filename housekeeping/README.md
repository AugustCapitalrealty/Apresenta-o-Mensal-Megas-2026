# Housekeeping — apresentação de entrega

Gera os slides de entrega do módulo **Housekeeping** do Hub dos Megas (gestão de
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

Oito slides, no design system dos Megas (cabeçalho de `criarHeaderPadrao`,
capas de `megas-mensal/10_Slide_Capas.gs` e `26_Slide_Encerramento.gs`):

| Onde | Slide |
|---|---|
| Começo do deck | Capa · A meta 2026 · Como funciona |
| Fim do deck | Matriz de responsabilidade · Indicadores (95%) · Controle · Resultado · Encerramento |

Slides feitos **à mão** (prints das telas do Hub, por exemplo) não são tocados e
caem entre os dois blocos — logo depois de "Como funciona".

Cada slide gerado leva a marca `【HOUSEKEEPING_HUB_2026】` na nota. Rodar de novo
apaga só os marcados e refaz, sem duplicar. Cada slide é desenhado dentro de um
`try/catch`: se um quebrar, o aviso aparece nele e os outros saem.

## De onde vêm os números

Do código do Hub (repositório `megas-adc1ba20`, migrations de 20 e 21/10/2026),
escritos direto nos slides:

- Meta 2026: 95% dos controles diários pelas equipes terceiras nas áreas comuns
  (`META_CUMPRIMENTO`), com fotos como evidência e ao menos uma ronda da gestão
  por mês. Cumprimento = concluídas ÷ devidas no mês (`hk_indicadores`).
- 60 atividades na biblioteca de referência, em 8 categorias.
- 36 áreas do Mega Curitiba, da árvore de ativos do Infraspeak. Itajaí e Esteio
  ainda sem áreas.
- Ronda: alerta depois de 30 dias sem ronda (`PRAZO_RONDA_DIAS`).
- Matriz com **Executa, Apoia e Gestão**. "Propõe / Questiona" saiu em 20/10 e
  "Garante" saiu depois (confirmado pelo usuário em 20/10/2026; a cópia local
  do Hub ainda tinha o Garante). O teste reprova se "Garante" voltar a um slide.

## Testar

```sh
node housekeeping/teste_housekeeping.js
PREVIA=/tmp/hk node housekeeping/teste_housekeeping.js
node ferramentas/previa_slides.js /tmp/hk/formas_housekeeping.json /tmp/hk
```

O teste dubla `SlidesApp` e `PropertiesService`: a primeira execução tem que
criar a apresentação (e tirar o slide vazio que ela traz), a segunda tem que
reabrir a mesma com um slide feito à mão no meio sem duplicar nem tirá-lo do
lugar. Reprova também se alguma forma sair da página ou algum slide escrever o
aviso de falha.
