/**
 * RATEIO DE ENERGIA — Mega Curitiba · apresentação de entrega do módulo no Hub dos Megas (reunião geral, 10/2026)
 * Deck: "RATEIO DE ENERGIA | MEGA CURITIBA" (Planejamento & Gestão)
 *
 * gerarApresentacaoRateioEnergia(): desenha os slides com o design system dos Megas (mesmo cabeçalho de
 * criarHeaderPadrao, mesmas capas de 10_Slide_Capas e 26_Slide_Encerramento do megas-mensal). Cada slide é
 * DESENHADO aqui, nada depende de slide que já esteja no deck.
 *
 * Só apaga os slides que ESTE script criou (marca TAG_ENERGIA na nota) — rodar de novo refaz sem duplicar.
 * Os slides feitos à mão (ex.: ANTES × DEPOIS da fatura) não são tocados e ficam no MEIO: a abertura entra no
 * começo do deck e o fechamento no fim, então eles caem logo depois de "Planilha × Hub".
 *
 * Números de setembro/2026 conferidos no Hub (Faturas por Cliente e Memória de Cálculo) em 20/10/2026.
 */
const RE_DECK_ID = '111F2_I1W8YyLStHhLNFWw_mxIdJr1wVVu3ueNnixgU8';
const RE_LOGO_POSITIVO = '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4';   // Capital Realty, fundo claro (cabeçalho)
const RE_LOGO_NEGATIVO = '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p';   // Capital Realty, fundo escuro (capas)

// Marca na nota dos slides deste script: rodar de novo apaga ESTES (e só estes) e refaz.
const TAG_ENERGIA = '【RATEIO_ENERGIA_HUB_2026】';

const RE_TITULO = 'RATEIO DE ENERGIA | MEGA CURITIBA';
const RE_SUBTITULO = 'Planejamento & Gestão';

// Design system dos Megas (= CR_DESIGN_SYSTEM de megas-mensal) + tons claros do farol.
const RE = {
  brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD', azulBrilho: '#60A5FA',
  bgSlide: '#F8FAFC', branco: '#FFFFFF', texto: '#16213E', corpo: '#46516B', cinza: '#8592AC', cinzaClaro: '#CBD5E4',
  linha: '#E2E8F0', azulClaro: '#E9F0FA', verde: '#1E9E62', verdeEsc: '#0B5C34', verdeClaro: '#DEF4E9',
  laranja: '#F97316', laranjaClaro: '#FFEDD5', laranjaEsc: '#9A3412', marginX: 30, logoW: 112, logoH: 32
};
const RE_TIT = 'Montserrat', RE_CORPO = 'Open Sans';
const RE_W = 720, RE_H = 405;

function gerarApresentacaoRateioEnergia() {
  const deck = SlidesApp.openById(RE_DECK_ID);
  if (Math.round(deck.getPageWidth()) !== RE_W || Math.round(deck.getPageHeight()) !== RE_H) {
    Logger.log('Atenção: o deck não é 16:9 (720×405 pt) — o desenho foi feito para esse tamanho.');
  }
  let apagados = 0;
  deck.getSlides().forEach(s => { if (_reNotas_(s).indexOf(TAG_ENERGIA) >= 0) { s.remove(); apagados++; } });
  if (apagados) Logger.log('Versão anterior apagada (' + apagados + ' slides gerados pelo script).');

  // Abertura no começo do deck; fechamento no fim. O que foi feito à mão fica entre os dois.
  let i = 0;
  const noComeco = () => _reMarcar_(deck.insertSlide(i++, SlidesApp.PredefinedLayout.BLANK));
  const noFim = () => _reMarcar_(deck.appendSlide(SlidesApp.PredefinedLayout.BLANK));

  const passos = [
    [noComeco, _reCapa_], [noComeco, _reDesafio_], [noComeco, _rePlanilhaHub_],
    [noFim, _reComoFunciona_], [noFim, _reValidacao_], [noFim, _reControle_], [noFim, _reResultado_], [noFim, _reEncerramento_]
  ];
  passos.forEach(p => {
    const s = p[0]();
    // Um slide que falha mostra o aviso nele mesmo e não derruba os outros.
    try { p[1](s); } catch (e) { _reFalha_(s, p[1].name, e); }
  });
  Logger.log('✓ ' + passos.length + ' slides gerados: 3 no começo do deck e 5 no fim.');
}

function _reMarcar_(s) {
  s.getBackground().setSolidFill(RE.bgSlide);
  try { s.getNotesPage().getSpeakerNotesShape().getText().setText(TAG_ENERGIA); } catch (e) {}
  return s;
}

function _reNotas_(s) { try { return s.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { return ''; } }

// Aviso de falha desenhado só com insertShape: não pode depender das helpers que talvez tenham quebrado.
function _reFalha_(s, nome, e) {
  const r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, 32, 150, 656, 100);
  r.getFill().setSolidFill('#FEE2E2');
  r.getText().setText('⚠ Falha ao desenhar ' + nome + ': ' + (e && e.message));
  Logger.log('✗ ' + nome + ': ' + (e && e.stack));
}


// ==========================================
// 1 · CAPA
// ==========================================
function _reCapa_(s) {
  _reFundoEscuro_(s, true);
  _reLogo_(s, RE_LOGO_NEGATIVO, 42, 30, 34, 'CAPITAL REALTY');

  const y0 = RE_H * 0.30;
  _reT_(s, 44, y0, 520, 20, _reEspacado_('Planejamento & Gestão'), 9, true, RE.azulBrilho, 'L', RE_TIT);
  _reGradiente_(s, 46, y0 + 26, 66, 4, RE.brandLight, RE.azulBrilho, { steps: 12 });
  _reT_(s, 40, y0 + 36, 560, 112, 'RATEIO DE\nENERGIA', 44, true, RE.branco, 'L', RE_TIT, true);
  _reT_(s, 42, y0 + 152, 560, 36, 'Mega Curitiba · Hub dos Megas', 22, true, RE.azulBrilho, 'L', RE_TIT);

  const pillY = y0 + 196, pillW = 250, pillH = 30;
  _reGradiente_(s, 42, pillY, pillW, pillH, RE.brandMed, RE.brandLight, { steps: 24 });
  _reT_(s, 42, pillY, pillW, pillH, 'Entrega do módulo · Outubro 2026', 11, true, RE.branco, 'C', RE_TIT);

  _reRodapeCapa_(s, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');
}


// ==========================================
// 2 · O DESAFIO
// ==========================================
function _reDesafio_(s) {
  _reHeader_(s);
  _reChamada_(s, 'O desafio', 'Uma conta da Copel, 15 clientes para cobrar todo mês');

  [['1', 'conta Copel por mês', 'para todo o Mega Curitiba'],
   ['15', 'clientes no rateio', 'cada um com seu contrato de demanda'],
   ['R$ 384,5 mil', 'conta de setembro/26', 'dividida entre os clientes']].forEach((k, j) => {
    const x = 32 + j * 228;
    _reCartao_(s, x, 134, 200, 84, RE.branco, true);
    _reRet_(s, x, 142, 4, 68, RE.brandLight);
    _reT_(s, x + 16, 142, 180, 30, k[0], 22, true, RE.brandMed, 'L', RE_TIT);
    _reT_(s, x + 16, 172, 180, 16, k[1], 10, true, RE.texto, 'L', RE_TIT);
    _reT_(s, x + 16, 189, 180, 16, k[2], 8.6, false, RE.corpo);
    if (j < 2) _reT_(s, x + 196, 160, 36, 32, '›', 22, true, RE.cinzaClaro, 'C');
  });

  _reCartaoTitulado_(s, 32, 234, 656, 112, 'COMO ERA FEITO', RE.cinza);
  ['Planilha com fórmulas e ajustes digitados até a conta fechar',
   'Contratos de demanda em PDFs e e-mails soltos',
   'Fatura de cada cliente montada e impressa a partir da planilha'].forEach((t, k) => {
    _reBola_(s, 50, 271.5 + k * 22, 7, RE.laranja);
    _reT_(s, 62, 265 + k * 22, 610, 20, t, 10.5, false, RE.texto);
  });

  _reFaixa_(s, 'Muito trabalho manual — e cada ajuste à mão é um risco de erro na cobrança do cliente.', RE.laranja,
    RE.laranjaClaro, RE.laranjaEsc);
}


// ==========================================
// 3 · PLANILHA × HUB
// ==========================================
function _rePlanilhaHub_(s) {
  _reHeader_(s);
  _reChamada_(s, 'Antes × depois', 'Da planilha para o Hub dos Megas');

  const xL = 32, wL = 104, xP = 142, wP = 268, xS = 416, wS = 272;
  _reCartao_(s, xP, 130, wP, 26, RE.linha, false);
  _reT_(s, xP, 130, wP, 26, 'PLANILHA', 9, true, RE.corpo, 'C', RE_TIT);
  _reCartao_(s, xS, 130, wS, 26, RE.brandLight, false);
  _reT_(s, xS, 130, wS, 26, 'HUB DOS MEGAS', 9, true, RE.branco, 'C', RE_TIT);

  [['Cálculo', 'Fórmulas e ajustes digitados até a conta fechar', 'Calculado pelas regras do contrato e conferido com a Copel'],
   ['Contratos', 'PDFs soltos, sem controle do que falta', 'Cadastrados, com pendências sinalizadas para Facilities'],
   ['Fatura', 'Montada e impressa da planilha', 'PDF em 1 clique, no padrão da conta Copel'],
   ['Controle', 'Quem tem o arquivo edita', 'Acesso por papel e histórico de todos os meses']].forEach((l, k) => {
    const y = 162 + k * 46, h = 40;
    _reT_(s, xL, y, wL, h, l[0], 11, true, RE.brandDark, 'L', RE_TIT);
    _reCartao_(s, xP, y, wP, h, RE.branco, true);
    _reT_(s, xP + 8, y, 24, h, '✕', 11, true, RE.cinza, 'C');
    _reT_(s, xP + 30, y, wP - 36, h, l[1], 9.6, false, RE.corpo);
    _reCartao_(s, xS, y, wS, h, RE.azulClaro, false);
    _reT_(s, xS + 8, y, 24, h, '✓', 12, true, RE.verde, 'C');
    _reT_(s, xS + 30, y, wS - 36, h, l[2], 9.6, true, RE.texto);
  });

  _reFaixa_(s, 'Validado em setembro/2026: total igual ao da planilha e fechamento sem diferença com a conta Copel.');
}


// ==========================================
// 4 · COMO FUNCIONA
// ==========================================
function _reComoFunciona_(s) {
  _reHeader_(s);
  _reChamada_(s, 'Como funciona', 'Três passos por mês — o cálculo fica com o Hub');

  [['01', 'Lança a conta', 'Valores e leituras da fatura da Copel do mês.'],
   ['02', 'O Hub calcula', 'Consumo, demanda, bandeira e ultrapassagem de cada cliente, pelas regras do contrato.'],
   ['03', 'Fatura em 1 clique', 'PDF no padrão da conta Copel, com as logos do Mega, da Demercado e do cliente.']].forEach((p, k) => {
    const x = 32 + k * 224;
    _reCartao_(s, x, 132, 208, 124, RE.branco, true);
    _reRet_(s, x, 140, 4, 108, RE.brandLight);
    _reT_(s, x + 18, 142, 80, 34, p[0], 26, true, RE.brandLight, 'L', RE_TIT);
    _reT_(s, x + 18, 178, 184, 20, p[1], 12, true, RE.texto, 'L', RE_TIT);
    _reT_(s, x + 18, 200, 180, 52, p[2], 9.6, false, RE.corpo, 'L', null, true);
    if (k < 2) _reT_(s, x + 200, 180, 32, 28, '›', 20, true, RE.cinzaClaro, 'C');
  });

  _reCartao_(s, 32, 274, 656, 62, RE.branco, true);
  _reRet_(s, 32, 282, 4, 46, RE.verde);
  [['REGRA ÚNICA', 'Documentada no Hub'], ['TESTES AUTOMÁTICOS', '63 conferências da regra'],
   ['TRIBUTOS EXPLICADOS', 'ICMS, PIS e COFINS']].forEach((f, j) => {
    const x = 52 + j * 216;
    if (j) _reRet_(s, x - 16, 288, 1, 34, RE.linha);
    _reT_(s, x, 286, 196, 14, f[0], 7.5, true, RE.cinza, 'L', RE_TIT);
    _reT_(s, x, 302, 196, 24, f[1], 11.5, true, RE.verdeEsc, 'L', RE_TIT);
  });

  _reFaixa_(s, 'Todo mês a mesma regra: o que muda é só a conta da Copel.');
}


// ==========================================
// 5 · VALIDAÇÃO
// ==========================================
function _reValidacao_(s) {
  _reHeader_(s);
  _reChamada_(s, 'Validação · setembro/2026', 'Rodamos o mês inteiro lado a lado com a planilha');

  [['15', 'clientes conferidos', 'com a planilha de setembro'],
   ['R$ 396.791,34', 'total faturado', 'igual ao da planilha'],
   ['R$ 0,00', 'de diferença', 'no fechamento com a conta Copel']].forEach((k, j) => {
    const x = 32 + j * 224;
    _reCartao_(s, x, 132, 208, 92, RE.verdeClaro, false);
    _reRet_(s, x, 140, 4, 76, RE.verde);
    _reT_(s, x + 16, 142, 188, 32, k[0], j === 1 ? 19 : 24, true, RE.verdeEsc, 'L', RE_TIT);
    _reT_(s, x + 16, 176, 188, 18, k[1], 10.5, true, RE.verdeEsc, 'L', RE_TIT);
    _reT_(s, x + 16, 194, 188, 18, k[2], 9, false, RE.verdeEsc);
  });

  _reCartaoTitulado_(s, 32, 238, 656, 106, 'COMO O TOTAL FECHA', RE.brandMed);
  const blocos = [['Conta Copel', 'R$ 384.514,03', RE.azulClaro, RE.brandMed],
                  ['Ultrapassagens de demanda', 'R$ 12.277,31', RE.laranjaClaro, RE.laranjaEsc],
                  ['Total faturado aos clientes', 'R$ 396.791,34', RE.verdeClaro, RE.verdeEsc]];
  blocos.forEach((b, j) => {
    const x = 52 + j * 214;
    _reCartao_(s, x, 272, 186, 58, b[2], false);
    _reT_(s, x + 10, 278, 166, 16, b[0], 8.6, true, b[3], 'L', RE_TIT);
    _reT_(s, x + 10, 296, 166, 28, b[1], 16, true, b[3], 'L', RE_TIT);
    if (j < 2) _reT_(s, x + 186, 281, 28, 40, j === 0 ? '+' : '=', 18, true, RE.cinza, 'C', RE_TIT);
  });

  _reFaixa_(s, 'App pronto e validado: o fechamento mensal da energia passa a ser feito no Hub.');
}


// ==========================================
// 6 · CONTROLE
// ==========================================
function _reControle_(s) {
  _reHeader_(s);
  _reChamada_(s, 'Controle', 'O Hub avisa antes de o erro chegar ao cliente');

  [['Contrato genérico', 'Número provisório vira pendência para Facilities regularizar.', RE.laranja],
   ['Termo de demanda faltando', 'Contrato sem termo ou com demanda zero fica sinalizado no cadastro.', RE.laranja],
   ['Módulo sem contrato', 'Nenhum módulo entra no rateio sem alguém ver.', RE.laranja],
   ['Ultrapassagem de demanda', 'Calculada e destacada na fatura, com quanto passou do contratado.', RE.brandLight]]
    .forEach((c, k) => {
      const x = 32 + (k % 2) * 336, y = 132 + Math.floor(k / 2) * 106;
      _reCartao_(s, x, y, 320, 94, RE.branco, true);
      _reRet_(s, x, y + 8, 4, 78, c[2]);
      _reBola_(s, x + 18, y + 18, 26, c[2] === RE.laranja ? RE.laranjaClaro : RE.azulClaro);
      _reT_(s, x + 8, y + 18, 46, 26, c[2] === RE.laranja ? '!' : '↑', 13, true, c[2], 'C', RE_TIT);
      _reT_(s, x + 54, y + 16, 254, 30, c[0], 12.5, true, RE.texto, 'L', RE_TIT);
      _reT_(s, x + 54, y + 46, 254, 38, c[1], 9.6, false, RE.corpo, 'L', null, true);
    });

  _reFaixa_(s, 'As pendências de cadastro ficam à vista do time de Facilities, com o filtro “Só pendências”.');
}


// ==========================================
// 7 · RESULTADO E PRÓXIMOS PASSOS
// ==========================================
function _reResultado_(s) {
  _reHeader_(s);
  _reChamada_(s, 'Resultado', 'Mais controle, menos trabalho manual');

  _reCartaoTitulado_(s, 32, 132, 320, 214, 'GANHOS', RE.verdeEsc);
  ['Cálculo automático, sem ajuste digitado', 'Regra única, documentada e testada', 'Fatura profissional para o cliente',
   'Contratos e pendências num lugar só', 'Histórico de todos os meses no Hub'].forEach((t, k) => {
    _reBola_(s, 50, 173 + k * 33, 14, RE.verde);
    _reT_(s, 43, 173 + k * 33, 28, 14, '✓', 8, true, RE.branco, 'C');
    _reT_(s, 72, 166 + k * 33, 272, 28, t, 10.5, false, RE.texto);
  });

  _reCartaoTitulado_(s, 368, 132, 320, 214, 'PRÓXIMOS PASSOS', RE.brandLight);
  ['Regularizar os termos de demanda pendentes com o Comercial', 'Fechar os próximos meses direto no Hub',
   'Enviar a fatura em PDF para cada cliente'].forEach((t, k) => {
    _reT_(s, 384, 168 + k * 56, 44, 40, '0' + (k + 1), 20, true, RE.brandLight, 'L', RE_TIT);
    _reT_(s, 426, 168 + k * 56, 250, 40, t, 10.5, false, RE.texto);
  });

  _reFaixa_(s, 'Rateio de Energia no Hub dos Megas — Planejamento & Gestão.');
}


// ==========================================
// 8 · ENCERRAMENTO
// ==========================================
function _reEncerramento_(s) {
  _reFundoEscuro_(s, false);
  const y0 = RE_H * 0.20;
  _reT_(s, 40, y0, RE_W - 80, 18, _reEspacado_('Obrigado'), 9, true, RE.azulBrilho, 'C', RE_TIT);
  _reT_(s, 40, y0 + 26, RE_W - 80, 46, 'RATEIO DE ENERGIA', 34, true, RE.branco, 'C', RE_TIT);
  _reT_(s, 40, y0 + 70, RE_W - 80, 46, 'NO HUB DOS MEGAS', 34, true, RE.azulBrilho, 'C', RE_TIT);

  const sloganY = y0 + 132;
  _reT_(s, RE_W / 2 - 160, sloganY, 320, 22, 'EXPANDIR EFICIÊNCIA', 12, true, '#CBD5E1', 'C', RE_TIT);
  _reGradiente_(s, RE_W / 2 - 230, sloganY + 11, 55, 2, RE.brandDark, RE.azulBrilho, { steps: 16 });
  _reGradiente_(s, RE_W / 2 + 175, sloganY + 11, 55, 2, RE.azulBrilho, RE.brandDark, { steps: 16 });

  // Cartão de contato (vidro), como o do encerramento dos Megas.
  const cw = 270, ch = 58, cx = (RE_W - cw) / 2, cy = sloganY + 44;
  const bg = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, cy, cw, ch);
  bg.getFill().setSolidFill(RE.branco, 0.06);
  bg.getBorder().getLineFill().setSolidFill(RE.branco, 0.18); bg.getBorder().setWeight(1);
  _reBola_(s, cx + 14, cy + 11, 36, RE.brandLight);
  _reT_(s, cx + 4, cy + 11, 56, 36, 'GA', 13, true, RE.branco, 'C', RE_TIT);
  _reT_(s, cx + 62, cy + 10, cw - 70, 20, 'Guilherme August', 12, true, RE.branco, 'L', RE_TIT);
  _reT_(s, cx + 62, cy + 30, cw - 70, 16, 'Planejamento & Gestão', 8.5, false, '#CBD5E1');

  _reRet_(s, RE_W / 2 - 60, RE_H - 62, 120, 1, '#334155');
  _reLogo_(s, RE_LOGO_NEGATIVO, null, RE_H - 52, 34, 'CAPITAL REALTY');
}


// ==========================================
// DESENHO
// ==========================================
// Cabeçalho padrão dos Megas (criarHeaderPadrao): elipse de fundo, barra, título 19 pt, subtítulo, logo e linhas.
function _reHeader_(s) {
  const mX = RE.marginX;
  const el = s.insertShape(SlidesApp.ShapeType.ELLIPSE, RE_W - 350, -80, 450, 450);
  el.getFill().setSolidFill(RE.brandLight, 0.03); el.getBorder().setTransparent();
  _reRet_(s, mX, 13, 5, 36, RE.brandLight);
  _reT_(s, mX + 14, 6, RE_W - mX - 200, 30, RE_TITULO, 19, true, RE.texto, 'L', RE_TIT);
  _reT_(s, mX + 14, 34, RE_W - mX - 200, 18, RE_SUBTITULO, 9.5, false, RE.corpo);
  try { s.insertImage(DriveApp.getFileById(RE_LOGO_POSITIVO).getBlob(), RE_W - mX - RE.logoW, 14, RE.logoW, RE.logoH); }
  catch (e) { Logger.log('Logo indisponível: ' + e.message); }
  _reRet_(s, 0, 61.5, RE_W, 1, RE.linha);
  _reRet_(s, mX, 60.5, 110, 3, RE.brandLight);
}

// Assunto do slide (sobretítulo) + a frase que a plateia deve levar.
function _reChamada_(s, sobre, frase) {
  _reT_(s, 32, 72, 600, 16, sobre.toUpperCase(), 8, true, RE.brandLight, 'L', RE_TIT);
  _reT_(s, 32, 88, 656, 32, frase, 18, true, RE.brandDark, 'L', RE_TIT);
}

// Faixa de rodapé com a mensagem do slide (o "próximo passo" do farol).
function _reFaixa_(s, txt, barra, fundo, cor) {
  _reCartao_(s, 32, 358, 656, 26, fundo || RE.azulClaro, false);
  _reRet_(s, 38, 364, 3, 14, barra || RE.brandLight);
  _reT_(s, 50, 358, 632, 26, txt, 9, true, cor || RE.brandMed);
}

function _reCartaoTitulado_(s, x, y, w, h, titulo, faixa) {
  _reCartao_(s, x, y, w, h, RE.branco, true);
  _reRet_(s, x, y, w, 24, faixa);
  _reT_(s, x + 12, y, w - 16, 24, titulo, 8.5, true, RE.branco, 'L', RE_TIT);
}

// Fundo escuro das capas (_capaFundo_ do megas-mensal): halo, massa, anéis, triângulo e espinha lateral.
function _reFundoEscuro_(s, espinha) {
  s.getBackground().setSolidFill(RE.brandDark);
  const elipse = (x, y, d, cor, a) => { const e = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    e.getFill().setSolidFill(cor, a); e.getBorder().setTransparent(); };
  elipse(RE_W - 300, -220, 560, RE.brandLight, 0.12);
  elipse(-220, RE_H - 240, 500, RE.brandMed, 0.22);
  elipse(RE_W - 150, -60, 150, RE.brandSoft, 0.10);
  const anel = (x, y, d, cor, peso, a) => { const c = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    c.getFill().setTransparent(); c.getBorder().getLineFill().setSolidFill(cor, a); c.getBorder().setWeight(peso); };
  anel(RE_W - 250, -130, 420, RE.brandLight, 1.25, 0.16);
  anel(RE_W - 210, -95, 330, RE.brandSoft, 1, 0.10);
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, RE_W - 130, RE_H - 190, 90, 81);
  tri.getFill().setSolidFill(RE.brandLight, 0.08); tri.getBorder().setTransparent();
  if (espinha) _reGradiente_(s, 0, 0, 6, RE_H, RE.brandLight, RE.brandSoft, { vertical: true, steps: 30 });
}

function _reRodapeCapa_(s, esquerda, direita) {
  _reRet_(s, 42, RE_H - 40, RE_W - 84, 1, '#334155');
  _reT_(s, 42, RE_H - 34, RE_W - 260, 18, esquerda, 7, true, '#94A3B8');
  _reBola_(s, RE_W - 205, RE_H - 28, 6, RE.azulBrilho);
  _reT_(s, RE_W - 192, RE_H - 34, 150, 18, direita, 9, true, RE.branco, 'L', RE_TIT);
}

// Logo na altura pedida, sem distorcer (x null = centralizado). Sem acesso à imagem, cai no nome em texto.
function _reLogo_(s, id, x, y, h, reserva) {
  try {
    const img = s.insertImage(DriveApp.getFileById(id).getBlob());
    const ar = img.getWidth() / img.getHeight();
    img.setHeight(h).setWidth(h * ar);
    img.setLeft(x == null ? (RE_W - h * ar) / 2 : x).setTop(y);
  } catch (e) {
    Logger.log('Logo indisponível (' + id + '), usando o nome em texto. ' + e.message);
    _reT_(s, x == null ? 40 : x, y, x == null ? RE_W - 80 : 300, h, reserva, 16, true, RE.branco, x == null ? 'C' : 'L', RE_TIT);
  }
}

// Faixa de gradiente simulada por segmentos (a API do Slides não tem gradiente).
function _reGradiente_(s, x, y, w, h, c1, c2, op) {
  const passos = op.steps || 20, vertical = !!op.vertical;
  for (let i = 0; i < passos; i++) {
    const t = passos === 1 ? 0 : i / (passos - 1);
    const r = vertical ? s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + i * h / passos, w, h / passos + 0.8)
                       : s.insertShape(SlidesApp.ShapeType.RECTANGLE, x + i * w / passos, y, w / passos + 0.8, h);
    r.getFill().setSolidFill(_reMistura_(c1, c2, t)); r.getBorder().setTransparent();
  }
}

function _reMistura_(a, b, t) {
  const ca = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), cb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function _reEspacado_(txt) { return String(txt).toUpperCase().split('').join(' '); }

function _reRet_(s, x, y, w, h, cor) {
  const r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor); r.getBorder().setTransparent();
  return r;
}

function _reCartao_(s, x, y, w, h, cor, borda) {
  const r = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor);
  if (borda) { r.getBorder().getLineFill().setSolidFill(RE.linha); r.getBorder().setWeight(0.75); }
  else r.getBorder().setTransparent();
  return r;
}

function _reBola_(s, x, y, d, cor) {
  const e = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
  e.getFill().setSolidFill(cor); e.getBorder().setTransparent();
  return e;
}

// Caixa de texto. topo=true alinha o texto em cima (parágrafos que podem ter 2 ou 3 linhas).
// Texto curto e centralizado em caixa estreita leva folga de 10 pt de cada lado em quem chama (recuo interno do Slides).
function _reT_(s, x, y, w, h, txt, fs, bold, cor, alin, fonte, topo) {
  const t = s.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  t.setContentAlignment(topo ? SlidesApp.ContentAlignment.TOP : SlidesApp.ContentAlignment.MIDDLE);
  t.getText().setText(txt).getTextStyle().setFontSize(fs).setBold(!!bold).setForegroundColor(cor).setFontFamily(fonte || RE_CORPO);
  t.getText().getParagraphStyle().setParagraphAlignment(alin === 'C' ? SlidesApp.ParagraphAlignment.CENTER :
    alin === 'R' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START);
  return t;
}
