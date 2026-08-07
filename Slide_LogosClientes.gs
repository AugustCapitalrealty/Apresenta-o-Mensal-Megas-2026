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
  'HP Trade':       '1LB8AfjJnZFHTKIWGfk0sDoMmZ-Fz_7SI',
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
