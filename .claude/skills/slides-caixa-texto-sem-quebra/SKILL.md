---
name: slides-caixa-texto-sem-quebra
description: >-
  Técnica para impedir que texto curto quebre em duas linhas dentro de
  caixas de texto (TEXT_BOX) do Google Slides via Apps Script (SlidesApp).
  Use SEMPRE que estiver escrevendo/editando código Apps Script deste projeto
  (ou qualquer geração de slides com SlidesApp) que coloca texto centralizado
  dentro de uma célula, pill, badge, chip ou avatar estreito — ex.: valores
  como "R$ 6,46/100%", "99,41%", iniciais como "MC"/"FE", rótulos curtos.
  O sintoma é o texto aparecer quebrado ("M" em cima, "C" embaixo; "R$" numa
  linha e o número noutra) mesmo cabendo de sobra no espaço visual. Aplique
  esta técnica ao criar esse tipo de caixa, e sobretudo quando o usuário
  relatar que algo "quebrou", "pulou linha", "ficou em duas linhas" ou pedir
  para "aumentar a caixa de texto".
---

# Caixa de texto do Slides sem quebra de linha indevida

## O problema

Toda `TEXT_BOX` do Google Slides tem um **recuo interno padrão** (~7pt de cada
lado) que **não dá pra desligar** pela API do Apps Script. Quando a caixa é
estreita (uma célula de tabela, um pill, o círculo de um avatar), esse recuo
"come" a largura útil: o Slides acha que o texto não cabe e quebra em duas
linhas — mesmo que visualmente sobre espaço de sobra na célula.

Exemplos reais que já morderam neste projeto:
- Metas: `R$ 6,46/100%` virava `R$` / `6,46/100%` (duas linhas).
- Encerramento: as iniciais `MC` viravam `M` / `C`.

## A solução

**Alargar a própria caixa de texto além do espaço visível**, com uma folga
simétrica, mantendo o texto centralizado. A caixa de texto **não tem fundo
nem borda própria** (o retângulo/célula/círculo visível é uma OUTRA shape,
desenhada separadamente), então esticá-la **não muda absolutamente nada na
aparência** — só devolve a largura que o recuo interno tinha roubado, e o
texto volta a caber numa linha.

Ou seja: o elemento visível (o `RECTANGLE`, `ROUND_RECTANGLE` ou `ELLIPSE`)
fica no tamanho certo; só a `TEXT_BOX` transparente por cima é que fica mais
larga.

## Padrão

```js
// x, y, w, h = a caixa "lógica" onde o texto deveria caber (a célula/pill/avatar)
const folga = 10;  // ~8–12pt costuma bastar; é o recuo interno que estamos vencendo
const t = slide.insertShape(
  SlidesApp.ShapeType.TEXT_BOX,
  x - folga, y, w + folga * 2, h   // estende folga p/ cada lado, centrado no mesmo eixo
);
t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
t.getText().setText(valor).getTextStyle()
  .setFontSize(fs).setForegroundColor(cor).setFontFamily(fonte);
t.getText().getParagraphStyle()
  .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER); // centralizado = a folga fica invisível
```

Como o texto é **centralizado** e a folga é **simétrica**, o texto continua
visualmente no centro da célula/avatar — a largura extra sobra igual dos dois
lados e ninguém percebe.

## Quando usar (e quando não)

- **Use** para texto curto que deve ficar numa linha só dentro de um espaço
  estreito e centralizado: valores de célula, pills de período, chips,
  iniciais de avatar, rótulos.
- **Mantenha a folga modesta** (~10pt). Só precisa vencer o recuo (~7pt), não
  virar uma caixa gigante. Folga exagerada em células vizinhas com texto longo
  pode fazer os textos invisíveis se cruzarem visualmente.
- **Não precisa** quando o texto já é curto o bastante pra caber com o recuo,
  nem quando a caixa é larga (título, subtítulo, parágrafo). Aí é só custo sem
  benefício.
- Se o texto é alinhado à esquerda (não centralizado), estenda a folga só para
  a direita (`x, y, w + folga, h`), senão o texto "anda" pra esquerda.

## Gotcha relacionado (não confundir)

Se o problema for **espaçamento entre linhas** (e não largura), lembre que o
Slides **não aceita `setLineSpacing` abaixo de 100** — usar `< 100` lança
`Invalid argument: spacing`. Isso é outra coisa; a técnica desta skill é só
para a quebra causada pelo recuo interno horizontal.
