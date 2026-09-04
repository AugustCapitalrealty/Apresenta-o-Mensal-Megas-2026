/**
 * ARQUIVO: 06_Logos.gs
 * LOGOS DE CLIENTE — buscar no Drive e desenhar
 *
 * Era `Slide_LogosClientes.gs`, e o nome mentia: o arquivo NÃO gera slide
 * nenhum. É uma biblioteca que outros slides usam — o Backlog de Clientes
 * desenha um logo por grupo, e é só isso.
 *
 * O mapa cliente→ID do Drive (LOGOS_CLIENTES) e a tabela de apelidos da
 * legenda foram para o 01_Config.gs: mudam quando entra um cliente novo, não
 * quando o desenho muda — isso é configuração.
 *
 * Fica aqui o que é comportamento: resolver o ID pelo nome, buscar o blob no
 * Drive com cache, e as três formas de encaixar a imagem na caixa.
 */

// Cache do blob de cada logo (evita baixar o mesmo arquivo do Drive várias
// vezes na mesma execução — chave é o ID do arquivo, não o nome do cliente,
// então clientes diferentes que casam no mesmo logo reaproveitam o download).
const _clienteLogoCache_ = {};

// O próprio Mega aparece como "cliente" em várias listas (linhas de área
// comum/condomínio: "MEGA Curitiba - ÁREA COMUM", "CONDOMÍNIO MEGA
// CURITIBA"). Nesses casos o logo certo é o do empreendimento ATIVO
// (unitLogoId em 01_Config.gs) — não existe um "logo do Mega" genérico, cada
// cidade tem o seu, e a apresentação sempre roda com uma cidade ativa.
// `_histEmpChave_` devolve MAIÚSCULO sem acento, daí a comparação em caixa
// alta; e o casamento é por PALAVRA inteira (\bMEGA\b) pra não pegar razão
// social que só contenha as letras (ex.: "OMEGA ...").
function _logoDoMegaId_(nomeCliente) {
  // Nos Megas isto devolvia o logo da unidade ativa quando o "cliente" era o
  // próprio Mega. Aqui não existe unidade ativa — o deck é do portfólio
  // inteiro — e o condomínio já é filtrado antes de chegar na tabela
  // (_ehCondominio_), então não há caso a atender. Fica declarada para o
  // arquivo continuar sendo cópia fiel do dos Megas: quando alguém corrigir
  // um logo lá, o diff aqui mostra só esta função.
  return null;
}

function _getClienteLogoBlob_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  let idAchado = _logoDoMegaId_(nomeCliente);
  if (!idAchado) {
    const chaves = Object.keys(LOGOS_CLIENTES);
    for (let k = 0; k < chaves.length; k++) {
      if (alvo.indexOf(_histEmpChave_(chaves[k])) >= 0) { idAchado = LOGOS_CLIENTES[chaves[k]]; break; }
    }
  }
  if (!idAchado) return null;

  if (!(idAchado in _clienteLogoCache_)) {
    try {
      _clienteLogoCache_[idAchado] = DriveApp.getFileById(idAchado).getBlob();
    } catch (e) {
      Logger.log('Logo do cliente "' + nomeCliente + '" (arquivo ' + idAchado + ') não carregou: ' + e.message);
      _clienteLogoCache_[idAchado] = null;
    }
  }
  return _clienteLogoCache_[idAchado];
}



// Devolve o nome curto da marca quando o logo é ambíguo, senão null.
function _logoLegendaRotulo_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  for (let i = 0; i < _LOGOS_LEGENDA_.length; i++) {
    if (alvo.indexOf(_histEmpChave_(_LOGOS_LEGENDA_[i].trecho)) >= 0) return _LOGOS_LEGENDA_[i].rotulo;
  }
  return null;
}

// Escreve a legenda centralizada na faixa x,y,w,h.
//
// A caixa de texto é criada MAIS LARGA que a faixa (_LOGO_LEGENDA_FOLGA_ de
// cada lado): toda TEXT_BOX do Slides tem um recuo interno de ~7pt que não dá
// pra desligar pela API, e numa coluna estreita esse recuo faz um nome curto
// como "Flexmodal" quebrar em duas linhas mesmo sobrando espaço visível.
// Como o texto é centralizado e a folga é simétrica, a largura extra sobra
// igual dos dois lados e não muda nada na aparência — a caixa não tem fundo
// nem borda própria.
function _logoLegendaTexto_(slide, x, y, w, h, rotulo) {
  const caixaW = w + _LOGO_LEGENDA_FOLGA_ * 2;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - _LOGO_LEGENDA_FOLGA_, y, caixaW, h);
  const txt = box.getText();
  txt.setText(_truncarNome_(rotulo, _charsQueCabem_(caixaW, _LOGO_LEGENDA_FS_)))
    .getTextStyle().setFontSize(_LOGO_LEGENDA_FS_).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMuted).setFontFamily('Montserrat');
  txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Igual a _insertLogoPadrao_, mas escreve o nome curto embaixo quando o logo
// é compartilhado por mais de uma marca. Devolve a imagem inserida, ou null
// quando a caixa é baixa demais pra comportar logo + legenda legíveis — aí o
// chamador cai no fallback de texto, que diferencia melhor do que um logo
// minúsculo com uma legenda ilegível embaixo.
//
// Ponto único de entrada dos logos de cliente: todos os slides passam por
// aqui, então a altura padrão (e a homogeneidade) vale pro deck inteiro.
function _insertLogoFitLegenda_(slide, blob, nomeCliente, x, y, boxW, boxH, altura) {
  const rotulo = _logoLegendaRotulo_(nomeCliente);
  if (!rotulo) return _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura);
  if (boxH < _LOGO_LEGENDA_MIN_BOX_) return null;

  const img = _insertLogoPadrao_(slide, blob, x, y, boxW, boxH - _LOGO_LEGENDA_H_, altura);
  _logoLegendaTexto_(slide, x, y + boxH - _LOGO_LEGENDA_H_, boxW, _LOGO_LEGENDA_H_, rotulo);
  return img;
}


// Insere o logo com ALTURA FIXA (`altura`, default LOGO_ALT_PADRAO),
// centralizado na caixa x,y,boxW,boxH. Só reduz abaixo da altura padrão
// quando a caixa é baixa demais ou quando o logo é largo demais pra coluna
// — os dois casos ficam registrados no Logger, porque são exatamente os que
// quebram a homogeneidade e valem ajuste de layout.
function _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura) {
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();

  let h = Math.min(altura || LOGO_ALT_PADRAO, boxH);
  let w = h * ratio;
  if (w > boxW) {
    w = boxW;
    h = boxW / ratio;
    Logger.log('Logo mais largo que a coluna (' + ratio.toFixed(1) + ':1 em ' + Math.round(boxW) +
               'pt): saiu com ' + Math.round(h) + 'pt de altura em vez de ' + Math.round(altura || LOGO_ALT_PADRAO) + 'pt.');
  }

  img.setWidth(Math.round(w)).setHeight(Math.round(h))
     .setLeft(x + (boxW - w) / 2)
     .setTop(y + (boxH - h) / 2);
  return img;
}

