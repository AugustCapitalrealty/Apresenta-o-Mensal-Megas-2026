/**
 * FAROL DE METAS — Guilherme August (Planejamento & Gestão) · 2026
 * Deck: "2026 - FAROL DE METAS | GUILHERME AUGUST | PLANEJAMENTO & GESTÃO"
 *
 * atualizarFarolSetembro(): põe o bloco de SETEMBRO/26 no começo do deck. NÃO depende de nenhum slide
 * que já esteja no deck (Guilherme, 16/10: "não quero que dependa disso"): cada slide é DESENHADO aqui.
 * O slide de metas e o cabeçalho seguem o layout dos Megas ("olha como é nos Megas": o mesmo
 * _renderizarSlideMetas_ / criarHeaderPadrao de megas-mensal e propriedades-mensal); os cartões dos
 * slides de cada meta, as medidas e cores do farol de maio (lidas do .pptx exportado em 16/10).
 *
 * Só apaga os slides que ESTE script criou (marca TAG_SETEMBRO na nota, ou os textos da 1ª versão) —
 * rodar de novo refaz o bloco sem duplicar. Nenhum outro slide do deck é tocado.
 * O conteúdo veio do Guilherme em 16/10/2026; pontos e texto das metas, da planilha de metas.
 */
const FAROL_DECK_ID   = '125XfdWiYis2J7nACFLxUVI5f0Tv6Zb85On74Nl2-LZI';
const FAROL_MODELO_ID = '1FmApkSWO_-0ppQ4qewsiarGnEHPmaOIm3aKUX3Y6NAo';   // farol do Wilson (padrão das áreas)
const LOGO_CR_ID      = '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4';              // Capital Realty, positivo

const COR = {
  fundo: '#F6F8FC', verde: '#1E9E62', verdeEsc: '#0B5C34', verdeClaro: '#DEF4E9',
  amarelo: '#E5A417', amareloEsc: '#7A5B00', amareloClaro: '#FDF1D2',
  azul: '#065CA9', azulEsc: '#003D7B', azulClaro: '#E9F0FA', linha: '#E4EAF3',
  texto: '#16213E', corpo: '#46516B', cinza: '#8592AC', cinzaClaro: '#CBD5E4', branco: '#FFFFFF'
};
const TIT = 'Montserrat', CORPO = 'Open Sans';

// Tabela padrão (copiada do Wilson): cores de status das áreas. O verde não aparece no modelo:
// #B6D7A8 é o verde da mesma paleta do #EA9999 ("claro 2" do Google).
const PADRAO_STATUS = { amarelo: '#FFFF00', vermelho: '#EA9999', verde: '#B6D7A8' };
// [nome (prazo), pontos, real mês, status mês, real ano, status ano]
const METAS_SETEMBRO = [
  ['PLATAFORMA DE UTILITIES MEGA CURITIBA\n(NOVEMBRO)', '30', 'NÃO', 'amarelo', 'NÃO', 'amarelo'],
  ['PROGRAMA DE EXCELÊNCIA 2026\n(SETEMBRO)', '25', 'SIM', 'verde', 'SIM', 'verde'],
  ['INTEGRAÇÃO DAS ÁREAS — FACILITIES, FINANCEIRO E JURÍDICO\n(NOVEMBRO)', '25', 'NÃO', 'amarelo', 'NÃO', 'amarelo'],
  ['MELHORIA NA SOLICITAÇÃO E CONTROLE DOS REEMBOLSOS\n(NOVEMBRO)', '20', 'NÃO', 'amarelo', 'NÃO', 'amarelo']
];
const PONTOS_SETEMBRO = '25 PONTOS';   // só a Meta 2 atingida


// Marca na nota dos slides deste bloco: rodar de novo apaga ESTES (e só estes) e refaz.
const TAG_SETEMBRO = '【FAROL_GUILHERME_SET_2026】';
// Textos que só existem nos slides que a 1ª versão do script criou (antes de existir a marca).
const MARCAS_1A_VERSAO = ['FAROL DE METAS - SETEMBRO', '2 visitas recebidas', 'META ATINGIDA', 'PERÍODO DE NÃO APLICABILIDADE',
  'POPs e manuais — pendentes', 'Entrevista com o Financeiro feita', 'Primeiro rascunho feito', 'DEMANDAS DE OUTRAS ÁREAS'];

// Design system dos Megas (= CR_DESIGN_SYSTEM de megas-mensal / propriedades-mensal).
const DS = {
  brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9', bgSlide: '#F8FAFC', cardBg: '#FFFFFF',
  textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC', lines: '#E2E8F0',
  accentGreen: '#10B981', accentRed: '#EF4444', logoW: 112, logoH: 32, marginX: 30
};

function atualizarFarolSetembro() {
  const deck = SlidesApp.openById(FAROL_DECK_ID);
  let apagados = 0;
  deck.getSlides().forEach(s => {
    const t = _textoSlide_(s);
    if (_notas_(s).indexOf(TAG_SETEMBRO) >= 0 || MARCAS_1A_VERSAO.some(m => t.indexOf(m) >= 0)) { s.remove(); apagados++; }
  });
  if (apagados) Logger.log('Bloco de setembro anterior apagado (' + apagados + ' slides gerados pelo script).');

  let i = 0;
  const novo = () => {
    const s = deck.insertSlide(i++, SlidesApp.PredefinedLayout.BLANK);
    s.getBackground().setSolidFill(DS.bgSlide);
    try { s.getNotesPage().getSpeakerNotesShape().getText().setText(TAG_SETEMBRO); } catch (e) {}
    return s;
  };

  _slideMetas_(novo());
  _meta1_(novo());
  _meta2_(novo());
  _naoAplicabilidade_(novo());
  _meta3_(novo());
  _meta4_(novo());
  _projetos_(novo());
  _demandas_(novo());
  Logger.log('✓ Bloco de SETEMBRO criado: ' + i + ' slides no começo do deck.');
}

// ==========================================
// SLIDE DE METAS — layout oficial dos Megas
// ==========================================
// Mesmo desenho de _renderizarSlideMetas_ (megas-mensal/13_Slide_Metas e propriedades-mensal/20_Slide_Metas):
// cabeçalho "METAS", faixa com o nome, 11 colunas, status colorido, rodapé com a pontuação e o selo de elegível.
const METAS_PESOS_COL = [114, 54, 76, 62, 46, 68, 66, 44, 68, 66, 44];
const METAS_COR_STATUS = { verde: '#A7E8C0', amarelo: '#FCE49A', vermelho: '#F3A9A9' };
const METAS_PONTOS_ELEGIVEL = 50;

function _slideMetas_(s) {
  _headerMegas_(s, 'METAS', 'Objetivos e Resultados · ANALISTA DE NEGÓCIOS · SETEMBRO 2026');
  const W = 720, H = 405;
  const soma = METAS_PESOS_COL.reduce((a, b) => a + b, 0), totalW = W - 12;
  const larg = METAS_PESOS_COL.map(p => p / soma * totalW), x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0; larg.forEach(w => { xs.push(acc); acc += w; });
  let y = 66;

  _ret_(s, x0, y, totalW, 22, DS.brandMed);
  _t_(s, x0, y, totalW, 22, 'METAS GUILHERME AUGUST PADILHA MARQUES - PLANEJAMENTO & GESTÃO 2026', 11, true, '#FFFFFF', 'C', TIT);
  y += 22;
  ['ANALISTA DE NEGÓCIOS', 'Pontos', 'Direcionador', 'Unidade', 'Sentido', 'Meta Mês', 'Real Mês', 'Status', 'Meta Ac.',
   'Real Ac.', 'Status'].forEach((t, c) => {
    const bg = s.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], 28);
    bg.getFill().setSolidFill(DS.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill('#FFFFFF');
    _t_(s, xs[c] + 1, y, larg[c] - 2, 28, t, 7, true, '#FFFFFF', c === 0 ? 'L' : 'C', TIT);
  });
  y += 28;

  const resumoH = 26, resumoY = H - resumoH - 8;
  const n = METAS_SETEMBRO.length;
  const rowH = Math.max(20, Math.min(78, Math.floor((resumoY - 6 - y) / n)));
  let total = 0, acum = 0;
  METAS_SETEMBRO.forEach((m, i) => {
    const ry = y + i * rowH, fundo = i % 2 === 0 ? DS.cardBg : '#F8FAFC';
    const valores = [m[0].replace('\n', ' '), m[1], 'Projetos', 'SIM/NÃO', '=', 'SIM', m[2], null, 'SIM', m[4], null];
    const status = { 7: m[3], 10: m[5] };
    valores.forEach((v, c) => {
      const cell = s.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      cell.getFill().setSolidFill(status[c] ? METAS_COR_STATUS[status[c]] : fundo);
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS.lines);
      if (v == null) return;
      const folga = c === 0 ? 0 : 10;
      _t_(s, xs[c] + 3 - folga, ry, larg[c] - 6 + folga * 2, rowH, v, c === 0 ? 8 : 7.5, c === 0, DS.textMain, c === 0 ? 'L' : 'C');
    });
    total += +m[1];
    if (m[5] === 'verde') acum += +m[1];
  });

  const elegivel = acum >= METAS_PONTOS_ELEGIVEL;
  _ret_(s, x0, resumoY, totalW, resumoH, DS.brandMed);
  const badgeW = 130, badgeH = 18, badgeX = x0 + totalW - badgeW - 10, badgeY = resumoY + (resumoH - badgeH) / 2;
  _t_(s, x0 + 12, resumoY, totalW - badgeW - 36, resumoH, 'PONTUAÇÃO ACUMULADA  •  ' + acum + ' / ' + total +
    ' PONTOS  •  MÍN. ' + METAS_PONTOS_ELEGIVEL + ' P/ ELEGIBILIDADE', 9, true, '#FFFFFF', 'L', TIT);
  _cartao_(s, badgeX, badgeY, badgeW, badgeH, elegivel ? DS.accentGreen : DS.accentRed, false);
  _t_(s, badgeX - 10, badgeY, badgeW + 20, badgeH, elegivel ? '✓ ELEGÍVEL' : '✗ NÃO ELEGÍVEL', 8.5, true, '#FFFFFF', 'C', TIT);
}

// Cabeçalho padrão dos Megas (criarHeaderPadrao): elipse de fundo, barra, título 19 pt, subtítulo, logo e linhas.
function _headerMegas_(s, titulo, subtitulo) {
  const W = 720, mX = DS.marginX;
  const el = s.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 350, -80, 450, 450);
  el.getFill().setSolidFill(DS.brandLight, 0.03); el.getBorder().setTransparent();
  _ret_(s, mX, 13, 5, 36, DS.brandLight);
  _t_(s, mX + 14, 6, W - mX - 200, 30, titulo, 19, true, DS.textMain, 'L', TIT);
  if (subtitulo) _t_(s, mX + 14, 34, W - mX - 200, 18, subtitulo, 9.5, false, DS.textBody, 'L', CORPO);
  try { s.insertImage(DriveApp.getFileById(LOGO_CR_ID).getBlob(), W - mX - DS.logoW, 14, DS.logoW, DS.logoH); }
  catch (e) { Logger.log('Logo indisponível: ' + e.message); }
  _ret_(s, 0, 61.5, W, 1, DS.lines);
  _ret_(s, mX, 60.5, 110, 3, DS.brandLight);
}

function _notas_(s) { try { return s.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { return ''; } }


// ==========================================
// META 1 · Plataforma de Utilities — Mega Curitiba
// ==========================================
function _meta1_(s) {
  _cabecalho_(s, 'Plataforma de Utilities — Mega Curitiba', ['Meta 1', '30 pontos', 'Direcionador Projetos', 'Prazo 30/11/26']);
  [['EQUIPAMENTOS', 'Entregues', 'Monitorar bombas e quadros elétricos', 'verde'],
   ['CONTRATO', 'Assinado', 'Contrato assinado', 'verde'],
   ['ORÇAMENTOS', '2 de 3', '2 visitas recebidas · falta 1', 'amarelo']].forEach((c, k) => {
    const x = 32 + k * 223.35, verde = c[3] === 'verde';
    _cartao_(s, x, 72, 209.3, 80, verde ? COR.verdeClaro : COR.amareloClaro, false);
    _ret_(s, x, 80, 4, 64, verde ? COR.verde : COR.amarelo);
    _t_(s, x + 16, 82, 187.3, 13, c[0], 7.5, true, COR.cinza);
    _t_(s, x + 16, 97, 187.3, 26, c[1], 17, true, verde ? COR.verdeEsc : COR.amareloEsc, 'L', TIT);
    _t_(s, x + 16, 128, 187.3, 16, c[2], 7.6, false, COR.corpo);
  });
  _cartao_(s, 32, 164, 656, 46, COR.branco, true);
  _ret_(s, 32, 172, 4, 30, COR.azul);
  _t_(s, 52, 170, 616, 34, 'Equipamentos no Mega Curitiba para monitorar as bombas e os quadros elétricos, e contrato ' +
    'assinado. O que falta é fechar os orçamentos de instalação para subir a compra com três propostas:', 10.5, false, COR.corpo);
  [['01', 'Visitas para orçamento', '2 visitas recebidas — aguardando a 3ª.', 'amarelo'],
   ['02', 'Equalização das propostas', 'Com a 3ª proposta, equalizar e subir a compra.', 'amarelo'],
   ['03', 'Contrato assinado', 'Etapa concluída.', 'verde']].forEach((p, k) => {
    const x = 32 + k * 224, verde = p[3] === 'verde';
    _cartao_(s, x, 224, 208, 126, COR.branco, true);
    _ret_(s, x, 232, 4, 110, verde ? COR.verde : COR.amarelo);
    _t_(s, x + 18, 236, 68, 30, p[0], 24, true, verde ? COR.verde : COR.cinzaClaro, 'L', TIT);
    _t_(s, x + 18, 270, 184, 18, p[1], 10.5, true, COR.texto, 'L', TIT);
    _t_(s, x + 18, 292, 174, 46, p[2], 9.6, false, COR.corpo);
    if (k < 2) _t_(s, x + 200, 275, 32, 24, '›', 18, true, COR.cinzaClaro, 'C');
  });
  _proximo_(s, 'Próximo passo: receber o 3º orçamento, equalizar as três propostas e subir a compra da instalação.');
}


// ==========================================
// META 2 · Programa de Excelência 2026 — atingida
// ==========================================
function _meta2_(s) {
  _cabecalho_(s, 'Programa de Excelência 2026', ['Meta 2', '25 pontos', 'Direcionador Projetos', 'Prazo 30/09/26']);
  _cartaoTitulado_(s, 32, 72, 208, 112, 'STATUS GERAL', COR.azulEsc);
  _t_(s, 46, 104, 184, 70, 'Vencedor de 2025 divulgado, book 2026 aprovado, kick off feito e inspeção in loco realizada ' +
    'em setembro. Meta atingida.', 9.2, false, COR.corpo);
  _cartaoTitulado_(s, 256, 72, 208, 112, 'PRÓXIMA FASE', COR.azulEsc);
  _t_(s, 270, 104, 184, 70, 'Período de não aplicabilidade aberto até 30/11/2026.', 9.2, false, COR.corpo);
  _cartaoTitulado_(s, 480, 72, 208, 112, 'PRAZO — SETEMBRO/26', COR.azul);
  ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET'].forEach((m, k) => {
    const x = 494 + (k % 3) * 62, y = 104 + Math.floor(k / 3) * 20, set = m === 'SET';
    _pill_(s, x, y, 56, 15, m, set ? COR.verde : COR.azulClaro, set ? COR.branco : COR.azulEsc, 6.8);
  });
  _ret_(s, 98, 221, 524, 3, COR.verde);
  ['Vencedor 2025 divulgado', 'Book 2026 finalizado', 'Aprovação da Gerência', 'Kick off — envio + impressão', 'Inspeção in loco']
    .forEach((e, k) => {
      const cx = 98 + k * 131;
      _bola_(s, cx - 12, 210, 24, COR.verde);
      _t_(s, cx - 22, 210, 44, 24, '✓', 9.5, true, COR.branco, 'C');
      _t_(s, cx - 61.5, 240, 123, 30, e, 7.6, true, COR.texto, 'C');
    });
  _cartao_(s, 32, 286, 656, 52, COR.verdeClaro, false);
  _ret_(s, 32, 294, 4, 36, COR.verde);
  _t_(s, 52, 294, 624, 18, '✓  META ATINGIDA', 8, true, COR.verdeEsc, 'L', TIT);
  _t_(s, 52, 312, 624, 20, 'Todas as etapas concluídas no prazo — inspeção in loco contabilizada em setembro.', 10, false, COR.verdeEsc);
  _proximo_(s, 'Próximo passo: acompanhar o período de não aplicabilidade, aberto até 30/11/2026.');
}

function _naoAplicabilidade_(s) {
  _cabecalho_(s, 'Excelência 2026 — Não aplicabilidade', ['Meta 2', '25 pontos', 'Aberto até 30/11/26']);
  _cartao_(s, 32, 72, 656, 150, COR.verdeClaro, false);
  _ret_(s, 32, 80, 4, 134, COR.verde);
  _t_(s, 52, 86, 616, 14, 'PERÍODO DE NÃO APLICABILIDADE', 8, true, COR.cinza);
  _t_(s, 52, 104, 616, 44, 'Aberto até 30/11/2026', 30, true, COR.verdeEsc, 'L', TIT);
  _t_(s, 52, 152, 616, 54, 'O período de não aplicabilidade do Programa de Excelência 2026 está aberto até o último dia ' +
    'de novembro.', 11, false, COR.corpo);
  [['SET', COR.verde, 'Inspeção in loco feita'], ['OUT', COR.amarelo, 'Período aberto'], ['NOV', COR.amarelo, 'Até 30/11']]
    .forEach((m, k) => {
      const x = 32 + k * 224;
      _cartao_(s, x, 238, 208, 104, COR.branco, true);
      _pill_(s, x + 16, 254, 56, 18, m[0], m[1], COR.branco, 7);
      _t_(s, x + 16, 284, 180, 40, m[2], 13, true, COR.texto, 'L', TIT);
    });
  _proximo_(s, 'Próximo passo: manter o período aberto até 30/11/2026 e acompanhar os registros.');
}


// ==========================================
// META 3 · Integração das Áreas
// ==========================================
function _meta3_(s) {
  _cabecalho_(s, 'Integração das Áreas', ['Meta 3', '25 pontos', 'Facilities · Financeiro · Jurídico', 'Prazo 30/11/26']);
  _cartaoTitulado_(s, 200, 72, 320, 58, 'FACILITIES · ÁREA INTEGRADORA', COR.azulEsc);
  _t_(s, 214, 102, 292, 22, 'Reúne os dados de Financeiro e Jurídico para consolidar a visão única de gestão.', 8, false, COR.corpo, 'C');
  const bloco = (x, verde, etiqueta, titulo, texto, itens) => {
    _cartao_(s, x, 154, 318, 196, verde ? COR.verdeClaro : COR.amareloClaro, false);
    _pill_(s, x + 20, 170, verde ? 63.6 : 75, 16, etiqueta, verde ? COR.verde : COR.amarelo, COR.branco, 7);
    _t_(s, x + 20, 192, 286, 26, titulo, 17, true, verde ? COR.verdeEsc : COR.amareloEsc, 'L', TIT);
    _t_(s, x + 20, 222, 278, 62, texto, 10, false, verde ? COR.verdeEsc : COR.amareloEsc);
    itens.forEach((it, k) => {
      _bola_(s, x + 20, 302.5 + k * 16, 7, it[1] ? COR.verde : COR.amarelo);
      _t_(s, x + 33, 298 + k * 16, 275, 16, it[0], 8.4, false, COR.texto);
    });
  };
  bloco(32, true, '✓ CONCLUÍDO', 'Financeiro', 'A integração já foi realizada através da plataforma financeira dos Megas.',
    [['Dados de facilities e financeiro já conversam', 1], ['Visão consolidada disponível na plataforma', 1], ['Sem pendências no fluxo', 1]]);
  bloco(370, false, '⏳ EM ANDAMENTO', 'Jurídico', 'Integração com o Jurídico feita. Faltam os POPs (manuais e procedimentos) ' +
    'para concluir a meta.', [['Formato da integração definido', 1], ['Integração com o Jurídico feita', 1], ['POPs e manuais — pendentes', 0]]);
  _proximo_(s, 'Próximo passo: elaborar os POPs e manuais da integração entre Facilities, Financeiro e Jurídico.');
}


// ==========================================
// META 4 · Solicitação e Controle de Reembolsos
// ==========================================
function _meta4_(s) {
  _cabecalho_(s, 'Solicitação e Controle de Reembolsos', ['Meta 4', '20 pontos', 'Direcionador Projetos', 'Prazo 30/11/26']);
  _cartao_(s, 32, 72, 656, 56, COR.branco, true);
  _ret_(s, 32, 80, 4, 40, COR.azul);
  _t_(s, 52, 82, 208, 14, 'ENTREVISTAS REALIZADAS', 7.5, true, COR.cinza);
  _t_(s, 52, 97, 128, 24, '4 de 4', 19, true, COR.azulEsc, 'L', TIT);
  _cartao_(s, 200, 94, 358, 12, COR.verde, false);
  _t_(s, 556, 72, 125, 56, '100% concluído', 9.5, true, COR.verdeEsc, 'C');
  [['W', 'Wilson'], ['C', 'Cadu'], ['J', 'Jonatas'], ['R', 'Ricardo']].forEach((p, k) => {
    const x = 98.6 + k * 133.2;
    _cartao_(s, x, 144, 123.2, 62, COR.branco, true);
    _ret_(s, x, 152, 4, 46, COR.verde);
    _bola_(s, x + 13, 159, 32, COR.azul);
    _t_(s, x + 1, 159, 56, 32, p[0], 13, true, COR.branco, 'C', TIT);
    _t_(s, x + 52, 157, 72.2, 17, p[1], 10.5, true, COR.texto, 'L', TIT);
    _pill_(s, x + 52, 177, 59.2, 15, '✓ ENTREVISTADO', COR.verde, COR.branco, 6.5);
  });
  const coluna = (x, titulo, faixa, bola, linhas) => {
    _cartaoTitulado_(s, x, 228, 208, 122, titulo, faixa);
    linhas.forEach((l, k) => {
      _bola_(s, x + 14, 268 + k * 19, 7, bola);
      _t_(s, x + 27, 262 + k * 19, 177, 19, l, 8.4, false, COR.texto);
    });
  };
  coluna(32, '✓ CONCLUÍDO (4)', COR.verdeEsc, COR.verde, ['Wilson entrevistado', 'Cadu entrevistado', 'Jonatas entrevistado', 'Ricardo entrevistado']);
  coluna(256, '✓ FINANCEIRO', COR.verdeEsc, COR.verde, ['Entrevista com o Financeiro feita', 'Entendido o lado do Financeiro']);
  coluna(480, 'PRÓXIMOS PASSOS', COR.azul, COR.azul, ['Juntar os dois lados', 'Montar a proposta de melhoria', 'Apresentar ainda em outubro']);
  _proximo_(s, 'Próximo passo: juntar a visão das áreas e a do Financeiro e montar a proposta de melhoria ainda em outubro.');
}


// ==========================================
// PROJETOS EM ANDAMENTO
// ==========================================
function _projetos_(s) {
  _cabecalho_(s, 'PROJETOS EM ANDAMENTO', ['Planejamento & Gestão', 'Guilherme August Padilha Marques', 'Setembro/26']);
  _cartao_(s, 32, 72, 656, 52, COR.branco, true);
  _ret_(s, 32, 80, 4, 36, COR.azul);
  [['PROJETOS', '2', COR.azulEsc], ['PROJETOS CONCLUÍDOS', '1 de 2', COR.verdeEsc], ['FRENTES CONCLUÍDAS', '2 de 4', COR.verdeEsc],
   ['AGUARDANDO TERCEIROS', '1', COR.amareloEsc]].forEach((k, j) => {
    const x = 50 + j * 164;
    if (j) _ret_(s, x - 18, 84, 1, 28, COR.linha);
    _t_(s, x, 80, 138, 12, k[0], 7.2, true, COR.cinza);
    _t_(s, x, 96, 138, 21, k[1], 15, true, k[2], 'L', TIT);
  });
  const projeto = (x, faixa, etiqueta, corEt, larg, titulo, desc, frentes) => {
    _cartao_(s, x, 140, 318, 210, COR.branco, true);
    _ret_(s, x, 148, 4, 194, faixa);
    _pill_(s, x + 318 - 20 - larg, 153, larg, 16, etiqueta, corEt, COR.branco, 7);
    _t_(s, x + 20, 151, 318 - 40 - larg, 20, titulo, 12.25, true, COR.texto, 'L', TIT);
    _t_(s, x + 20, 174, 278, 30, desc, 9, false, COR.corpo);
    _ret_(s, x + 20, 206, 278, 0.75, COR.linha);
    _t_(s, x + 20, 210, 286, 13, 'FRENTES DE TRABALHO', 6.8, true, COR.cinza);
    frentes.forEach((f, k) => {
      const y = 228 + k * 55;
      _bola_(s, x + 20, y + 4, 9, f.bola);
      _t_(s, x + 36, y, 270, 14, f.nome, 9.6, true, COR.texto, 'L', TIT);
      _t_(s, x + 36, y + 16, 262, 20, f.texto, 8.2, false, COR.corpo);
      let px = x + 36;
      (f.marcos || []).forEach(m => { const w = m.length * 4.1 + 14; _pill_(s, px, y + 38, w, 14, m, COR.amareloClaro, COR.amareloEsc, 6.6); px += w + 6; });
    });
  };
  projeto(32, COR.verde, '✓ CONCLUÍDO', COR.verde, 63.6, '1. Pesquisa do RH', 'Criar a plataforma da pesquisa e aplicá-la entre as áreas.', [
    { nome: 'Plataforma da pesquisa', texto: 'Plataforma criada e disponibilizada para o RH.', bola: COR.verde },
    { nome: 'Pesquisa entre as áreas', texto: 'Aplicada e encerrada — projeto entregue.', bola: COR.verde }]);
  projeto(370, COR.amarelo, '⏳ EM ANDAMENTO', COR.amarelo, 75, '2. Automações no Jurídico',
    'Automatizar a criação do Kronnos e organizar as pastas do Jurídico.', [
    { nome: 'Criação do Kronnos', texto: 'Primeiro rascunho feito — retorno ainda em outubro.', bola: COR.amarelo,
      marcos: ['19/ago · iniciado', '11/set · feedbacks recebidos'] },
    { nome: 'Organização de Pastas', texto: 'Não iniciado — depende do Jurídico para começar.', bola: COR.cinzaClaro,
      marcos: ['⏸ aguardando Jurídico'] }]);
  _proximo_(s, 'Próximo passo: retomar a automação do Kronnos em outubro a partir do primeiro rascunho e acionar o ' +
    'Jurídico para a Organização de Pastas.');
}


// ==========================================
// DEMANDAS DE OUTRAS ÁREAS
// ==========================================
function _demandas_(s) {
  _cabecalho_(s, 'DEMANDAS DE OUTRAS ÁREAS', ['Planejamento & Gestão', 'Guilherme August Padilha Marques', 'Setembro/26']);
  [{ area: 'COMERCIAL', titulo: 'Reunião de Inteligência de Mercado', pill: 'SOLICITADO', cor: COR.azul, larg: 70,
     texto: 'O Comercial procurou o Planejamento para montar uma agenda que libera os convites para a reunião de ' +
            'inteligência de mercado deles, no fim do mês.' },
   { area: 'MELHOR IDEIA', titulo: 'Geração de escopos', pill: 'ENVIADO AO COMITÊ', cor: COR.amarelo, larg: 96,
     texto: 'Ideia para a geração de escopos enviada para o comitê.' }].forEach((it, k) => {
    const x = 32 + k * 338;
    _cartao_(s, x, 72, 318, 278, COR.branco, true);
    _ret_(s, x, 80, 4, 262, it.cor);
    _t_(s, x + 20, 86, 180, 14, it.area, 8, true, COR.cinza);
    _pill_(s, x + 318 - 20 - it.larg, 84, it.larg, 16, it.pill, it.cor, COR.branco, 7);
    _t_(s, x + 20, 108, 286, 44, it.titulo, 15, true, COR.texto, 'L', TIT);
    _t_(s, x + 20, 156, 278, 120, it.texto, 10.5, false, COR.corpo);
  });
  _proximo_(s, 'Outras áreas procurando o Planejamento & Gestão para apoiar projetos e eventos.');
}


// ==========================================
// DESENHO (medidas do farol de maio)
// ==========================================
// Cabeçalho dos slides de detalhe = o dos Megas; os "chips" viram a linha de subtítulo.
function _cabecalho_(s, titulo, chips) {
  _headerMegas_(s, titulo, chips.join(' · '));
}

function _proximo_(s, txt) {
  _cartao_(s, 32, 358, 656, 24, COR.azulClaro, false);
  _ret_(s, 38, 363, 3, 14, COR.azul);
  _t_(s, 50, 358, 632, 24, txt, 8.6, false, COR.azulEsc);
}

function _cartaoTitulado_(s, x, y, w, h, titulo, faixa) {
  _cartao_(s, x, y, w, h, COR.branco, true);
  _ret_(s, x, y, w, 22, faixa);
  _t_(s, x + 12, y, w - 16, 22, titulo, 8, true, COR.branco, 'L', TIT);
}

function _ret_(s, x, y, w, h, cor) {
  const r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor); r.getBorder().setTransparent();
  return r;
}

function _cartao_(s, x, y, w, h, cor, borda) {
  const r = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor);
  if (borda) { r.getBorder().getLineFill().setSolidFill(COR.linha); r.getBorder().setWeight(0.75); }
  else r.getBorder().setTransparent();
  return r;
}

function _bola_(s, x, y, d, cor) {
  const e = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
  e.getFill().setSolidFill(cor); e.getBorder().setTransparent();
  return e;
}

function _t_(s, x, y, w, h, txt, fs, bold, cor, alin, fonte) {
  const t = s.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  t.getText().setText(txt).getTextStyle().setFontSize(fs).setBold(!!bold).setForegroundColor(cor).setFontFamily(fonte || CORPO);
  t.getText().getParagraphStyle().setParagraphAlignment(alin === 'C' ? SlidesApp.ParagraphAlignment.CENTER :
    alin === 'R' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START);
  return t;
}

// Pill com texto centrado (caixa de texto 10 pt mais larga de cada lado, para não quebrar a linha).
function _pill_(s, x, y, w, h, txt, fundo, cor, fs) {
  _cartao_(s, x, y, w, h, fundo, false);
  _t_(s, x - 10, y, w + 20, h, txt, fs || 7, true, cor, 'C', TIT);
}


// ==========================================
// DIAGNÓSTICO DO MODELO (só leitura)
// ==========================================
function diagnosticarModeloPadrao() {
  const deck = SlidesApp.openById(FAROL_MODELO_ID);
  const cands = deck.getSlides().filter(s => /METAS WILSON/.test(_textoSlide_(s) + _textoTabelas_(s)));
  if (!cands.length) { Logger.log('Nenhum slide "METAS WILSON" no modelo.'); return; }
  const s = cands[cands.length - 1];
  s.getPageElements().forEach((e, i) => {
    const t = e.getPageElementType();
    const pos = Math.round(e.getLeft()) + ',' + Math.round(e.getTop()) + ' ' + Math.round(e.getWidth()) + '×' + Math.round(e.getHeight());
    if (t === SlidesApp.PageElementType.TABLE) {
      const tb = e.asTable();
      Logger.log(i + ' TABLE ' + pos + ' · ' + tb.getNumRows() + '×' + tb.getNumColumns());
      for (let r = 0; r < tb.getNumRows(); r++) {
        const cel = [];
        for (let c = 0; c < tb.getNumColumns(); c++) {
          let txt = '', cor = '';
          try { txt = tb.getCell(r, c).getText().asString().replace(/\n/g, ' / ').trim(); } catch (err) { txt = '(mesclada)'; }
          try { const f = tb.getCell(r, c).getFill().getSolidFill(); cor = f ? f.getColor().asRgbColor().asHexString() : ''; } catch (err) {}
          cel.push('[' + c + '] ' + txt.slice(0, 40) + (cor ? ' {' + cor + '}' : ''));
        }
        Logger.log('   linha ' + r + ': ' + cel.join(' | '));
      }
    } else {
      let txt = '';
      try { txt = e.asShape().getText().asString().replace(/\n/g, ' / ').trim(); } catch (err) {}
      Logger.log(i + ' ' + t + ' ' + pos + (txt ? ' "' + txt.slice(0, 60) + '"' : ''));
    }
  });
}


// ==========================================
// HELPERS
// ==========================================
// Todas as formas do slide, INCLUSIVE as de dentro de grupos (getShapes() só devolve as soltas).
function _formas_(s) {
  const out = [];
  const visitar = els => els.forEach(e => {
    try {
      const tipo = e.getPageElementType();
      if (tipo === SlidesApp.PageElementType.SHAPE) out.push(e.asShape());
      else if (tipo === SlidesApp.PageElementType.GROUP) visitar(e.asGroup().getChildren());
    } catch (err) {}
  });
  visitar(s.getPageElements());
  return out;
}

function _textoForma_(f) { try { return f.getText().asString().replace(/\n$/, ''); } catch (e) { return ''; } }
function _textoSlide_(s) { return _formas_(s).map(_textoForma_).join('\n'); }

function _textoTabelas_(s) {
  let t = '';
  s.getPageElements().forEach(e => {
    if (e.getPageElementType() !== SlidesApp.PageElementType.TABLE) return;
    const tb = e.asTable();
    for (let r = 0; r < tb.getNumRows(); r++) for (let c = 0; c < tb.getNumColumns(); c++) {
      try { t += tb.getCell(r, c).getText().asString() + '\n'; } catch (err) {}
    }
  });
  return t;
}

// Troca o texto da célula mantendo a fonte, o tamanho, o negrito, a cor e o alinhamento do 1º caractere.
function _celula_(cell, novo) {
  const tr = cell.getText();
  const velho = tr.asString().replace(/\n$/, '');
  if (velho === novo) return;
  let st = null, alin = null;
  if (velho.length) {
    const e = tr.getRange(0, 1).getTextStyle();
    st = { fam: e.getFontFamily(), tam: e.getFontSize(), neg: e.isBold(), cor: e.getForegroundColor() };
    try { alin = tr.getParagraphs()[0].getRange().getParagraphStyle().getParagraphAlignment(); } catch (err) {}
  }
  tr.setText(novo);
  if (!st) return;
  const n = tr.getTextStyle();
  if (st.fam) n.setFontFamily(st.fam);
  if (st.tam) n.setFontSize(st.tam);
  n.setBold(!!st.neg);
  if (st.cor) { try { n.setForegroundColor(st.cor.asRgbColor().asHexString()); } catch (err) {} }
  if (alin) { try { tr.getParagraphStyle().setParagraphAlignment(alin); } catch (err) {} }
}
