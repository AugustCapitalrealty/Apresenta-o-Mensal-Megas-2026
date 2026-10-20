# Rateio de Energia — apresentação de entrega

Gera os slides de entrega do módulo **Rateio de Energia** do Hub dos Megas
(Mega Curitiba), para a reunião geral de outubro/2026.

| | |
|---|---|
| Apresentação | [RATEIO DE ENERGIA \| MEGA CURITIBA](https://docs.google.com/presentation/d/111F2_I1W8YyLStHhLNFWw_mxIdJr1wVVu3ueNnixgU8/edit) |
| Projeto Apps Script | [`1B7xPuvu…`](https://script.google.com/home/projects/1B7xPuvugS4LA0L_UynCUmXCFdyeCCkiKoSK0XW5DiA5780SD-U_3VnwC/edit) (sobe com `clasp push` desta pasta) |
| Ponto de entrada | `gerarApresentacaoRateioEnergia()` |

## O que gera

Oito slides, no design system dos Megas (cabeçalho de `criarHeaderPadrao`,
capas de `megas-mensal/10_Slide_Capas.gs` e `26_Slide_Encerramento.gs`):

| Onde | Slide |
|---|---|
| Começo do deck | Capa · O desafio · Planilha × Hub |
| Fim do deck | Como funciona · Validação 09/2026 · Controle · Resultado · Encerramento |

Os slides feitos **à mão** (o ANTES × DEPOIS da fatura, com as imagens) não são
tocados e caem entre os dois blocos — logo depois de "Planilha × Hub".

Cada slide gerado leva a marca `【RATEIO_ENERGIA_HUB_2026】` na nota. Rodar de
novo apaga só os marcados e refaz, sem duplicar. Cada slide é desenhado dentro
de um `try/catch`: se um quebrar, o aviso aparece nele e os outros saem.

## Números

Todos de setembro/2026, conferidos no Hub em 20/10/2026, escritos direto no
código (`_reDesafio_`, `_reValidacao_`):

- Conta Copel R$ 384.514,03 + ultrapassagens R$ 12.277,31 = faturado R$ 396.791,34.
  As ultrapassagens são a diferença entre os dois totais: sem elas o rateio fecha
  exatamente com a Copel.
- 15 clientes; 63 testes automáticos da regra no Hub.
- A imagem da conta Copel mostra R$ 384.514,05 — 2 centavos de diferença de
  digitação ainda abertos no Hub.

## Testar

```sh
node rateio-energia/teste_rateio_energia.js
PREVIA=/tmp/energia node rateio-energia/teste_rateio_energia.js
node ferramentas/previa_slides.js /tmp/energia/formas_energia.json /tmp/energia
```

O teste dubla o `SlidesApp` com um slide "feito à mão" no deck e reprova se
alguma forma sair da página, se algum slide escrever o aviso de falha, ou se a
segunda execução duplicar slides ou tirar o slide feito à mão do lugar.
