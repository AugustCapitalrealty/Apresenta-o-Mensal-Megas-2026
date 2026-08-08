/**
 * ARQUIVO: Slide_LogosClientes.gs
 * LOGOS DE CLIENTES — Google Drive
 * DESCRIÇÃO: Mesma técnica e mesmos arquivos já usados no projeto irmão
 * "Controle de Acessos Megas" (apps-script/Config.gs + Helpers.gs) — os
 * logos ficam hospedados no Google Drive da Capital Realty, um PNG por
 * cliente, casados por trecho do nome (normalizado via _histEmpChave_,
 * 02_Dados.gs). Usado nas listas de chamados agrupadas por cliente
 * (Slide_ChamadosClientes.gs, Slide_BacklogClientesDetalhes.gs) — o logo
 * substitui o nome em texto quando disponível, deixando o slide mais
 * parecido com o boletim manual "ATENDIMENTO AO CLIENTE" (que já usava as
 * mesmas logos por linha).
 *
 * Se a conta que roda o script não tiver acesso a algum arquivo do Drive
 * (arquivo pertence ao outro projeto), _getClienteLogoBlob_ captura o erro
 * e devolve null — o chamador cai de volta pro nome em texto, sem quebrar
 * a geração. Se os logos não aparecerem, confira o compartilhamento desses
 * arquivos no Drive.
 */

const LOGOS_CLIENTES = {
  'Shopee':         '1_5vQjNBWGR8j-e5M94tGobglBTBN1ewH',
  'Mercado Livre':  '1rtesWo8XV5-CMeyLgc6lLaHXgQRWtuz9',
  'Sodexo':         '1391EvxTNYW3q9RCArhoc2earckFLGNSt',
  'Suzano':         '1E4laN6uhI3dgzTDnP9d63OQ3PkLlm36S',
  'NTN':            '12Oxh8itF46nWBefjv6bOUEi7_aYnSO5H',
  'Magnum':         '1StAJIlbMM2S523iuIZlAjuo3oGnPdEqF',
  'Boticario':      '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Calamo':         '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Ativa':          '10-uTna_fhwqozMi8dvn-tzEJ6BhnfUo2',
  'Tornado':        '1Jxwe1oSRlDIR4-Qw0g5fOM_6zo1KHwUZ',
  'Bosch':          '1lh7-yq4HOFHWu6BI_we35khXldFATHg3',
  'HP':             '1LB8AfjJnZFHTKIWGfk0sDoMmZ-Fz_7SI',
  'Damasio':        '1bDprE9vS940Pf04bGqb9OMqhJIypNveU',
  'Magalu':         '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Magazine Luiza': '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Rio Branco':     '1PXQvjnPymFWJhMGFY8JjLOoZaPRYVNxp',
  'Triunfante':     '1UxXcR0T39OMrRzpyaPq7ca-OSWUSTrzD',
  'Daybrasil':      '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'Day Brasil':     '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'JBT':            '1ZoUcwT6-Iv9BknWqoGKgJsyjSq4G1uLc',
  'Domazzi':        '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Flexmodal':      '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Stella':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Orizon':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'STH':            '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Vm Vinhos':      '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Wine':           '1aoj0mr1Jcut4oXk0tvD5TaZiaK79dF-D',
  'Sigma':          '1eqv7IxU-utU7TkYjOzlM4hQ5QDtoQacu',
  'Pacific':        '1l7G3-cq9viXEMJi8bc0lBUejPJoU6W7i',
  'Domus':          '1VhxvlmFQ27aYiIjdsOJd2VU0s-A6Mg-C',
  'Veloz':          '1-i3nKyGyVWQIFbCO96Ih-5fiV9ZgtDZ2',
  'Demercado':      '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',
  'DHL':            '1MtKYh79eDwOXw52reQ4WLDEXLGv-cm9z'
  // TornadoLog e outros apelidos sem logo cadastrado aqui caem no fallback
  // de texto (_getClienteLogoBlob_ retorna null) — não fabricamos ID de
  // arquivo pra cliente que não estava no mapa de origem.
};

// Cache do blob de cada logo (evita baixar o mesmo arquivo do Drive várias
// vezes na mesma execução — chave é o ID do arquivo, não o nome do cliente,
// então clientes diferentes que casam no mesmo logo reaproveitam o download).
const _clienteLogoCache_ = {};

function _getClienteLogoBlob_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  let idAchado = null;
  const chaves = Object.keys(LOGOS_CLIENTES);
  for (let k = 0; k < chaves.length; k++) {
    if (alvo.indexOf(_histEmpChave_(chaves[k])) >= 0) { idAchado = LOGOS_CLIENTES[chaves[k]]; break; }
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

// ── Legenda embaixo do logo (marcas que dividem o mesmo arquivo) ─────────
// Alguns clientes aparecem sob o logo de OUTRA marca porque compartilham o
// mesmo arquivo no mapa acima — herança do projeto "Controle de Acessos
// Megas", que já mostra a logo do Boticário para o Cálamo. Sem nada escrito
// embaixo, o slide exibe duas empresas diferentes com exatamente a mesma
// imagem e ninguém sabe qual é qual. Nesses casos (e só nesses) o nome curto
// da empresa vai numa legenda logo abaixo do logo.
//
// O casamento é por TRECHO normalizado, igual ao de LOGOS_CLIENTES: o nome
// que chega aqui pode ser o apelido ("Cálamo") ou a razão social inteira
// ("ORIZON COMERCIO DE ALIMENTOS LTDA"), e a legenda tem que mostrar sempre
// o nome curto.
const _LOGOS_LEGENDA_ = [
  { trecho: 'boticario', rotulo: 'Boticário' },   // BPB / O Boticário
  { trecho: 'calamo',    rotulo: 'Cálamo'    },   // usa a logo do Boticário
  { trecho: 'domazzi',   rotulo: 'Domazzi'   },   // divide arquivo com Flexmodal
  { trecho: 'flexmodal', rotulo: 'Flexmodal' },
  { trecho: 'stella',    rotulo: 'Stella'    },   // Stella/Orizon/STH/Vm Vinhos
  { trecho: 'orizon',    rotulo: 'Orizon'    },   // dividem o mesmo arquivo
  { trecho: 'sth',       rotulo: 'STH'       },
  { trecho: 'vm vinhos', rotulo: 'Vm Vinhos' }
];

const _LOGO_LEGENDA_H_        = 9;    // faixa reservada pra legenda (pt)
const _LOGO_LEGENDA_FS_       = 6;    // fonte da legenda (pt)
const _LOGO_LEGENDA_FOLGA_    = 10;   // folga lateral da caixa de texto (ver abaixo)
const _LOGO_LEGENDA_MIN_BOX_  = 22;   // altura mínima pra caber logo + legenda

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
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Igual a _insertLogoFit_, mas escreve o nome curto embaixo quando o logo é
// compartilhado por mais de uma marca. Devolve a imagem inserida, ou null
// quando a caixa é baixa demais pra comportar logo + legenda legíveis — aí o
// chamador cai no fallback de texto, que diferencia melhor do que um logo
// minúsculo com uma legenda ilegível embaixo.
function _insertLogoFitLegenda_(slide, blob, nomeCliente, x, y, boxW, boxH) {
  const rotulo = _logoLegendaRotulo_(nomeCliente);
  if (!rotulo) return _insertLogoFit_(slide, blob, x, y, boxW, boxH);
  if (boxH < _LOGO_LEGENDA_MIN_BOX_) return null;

  const img = _insertLogoFit_(slide, blob, x, y, boxW, boxH - _LOGO_LEGENDA_H_);
  _logoLegendaTexto_(slide, x, y + boxH - _LOGO_LEGENDA_H_, boxW, _LOGO_LEGENDA_H_, rotulo);
  return img;
}

// Insere uma imagem centralizada dentro de uma caixa x,y,boxW,boxH, ocupando
// o máximo de área possível sem distorcer a proporção original ("contain") —
// necessário porque os arquivos de logo têm proporções bem diferentes entre
// si (quadrados, bem largos, etc.) e o slide precisa de um tamanho visual
// padronizado entre eles.
function _insertLogoFit_(slide, blob, x, y, boxW, boxH) {
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();
  const wByH = boxH * ratio;
  const fit = wByH <= boxW ? { w: wByH, h: boxH } : { w: boxW, h: boxW / ratio };
  img.setWidth(Math.round(fit.w)).setHeight(Math.round(fit.h))
     .setLeft(x + (boxW - fit.w) / 2)
     .setTop(y + (boxH - fit.h) / 2);
  return img;
}
