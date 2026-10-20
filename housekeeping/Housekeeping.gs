/**
 * HOUSEKEEPING — dois slides sobre o módulo no Hub dos Megas (reunião geral, 10/2026)
 * Mesmo desenho de rateio-energia/RateioEnergia.gs (cabeçalho de criarHeaderPadrao do megas-mensal).
 *
 * gerarApresentacaoHousekeeping() desenha:
 *   1. O que faz — biblioteca, Matriz do Mega, agenda e checklist, indicadores.
 *   2. Exemplo de cronograma — a semana ATUAL (calculada na hora de rodar) do Mega Curitiba, com atividades
 *      da biblioteca do Hub nas áreas reais do Infraspeak. É um exemplo montado aqui, não a agenda lida do Hub.
 *
 * Na primeira execução, sem HK_DECK_ID, cria a apresentação no Drive e guarda o ID nas propriedades do
 * script — as próximas abrem a mesma. O link sai no log.
 *
 * Só apaga os slides que ESTE script criou (marca TAG_HOUSEKEEPING na nota) e põe os novos no MESMO lugar:
 * dá para arrastar os dois para o meio de outro deck e rodar de novo sem que eles pulem para o fim.
 *
 * Números do Hub (repositório megas-adc1ba20, migrations de 20 e 21/10/2026): meta de 95%
 * (META_CUMPRIMENTO), 60 atividades na biblioteca de referência, 36 áreas do Mega Curitiba vindas do
 * Infraspeak. Matriz com Executa, Apoia e Gestão ("Propõe" e "Garante" saíram).
 */
const HK_DECK_ID = '';   // vazio = usa o que a primeira execução criou (propriedade HK_DECK_ID do script)
const HK_NOME_DECK = 'HOUSEKEEPING | HUB DOS MEGAS';
const HK_LOGO_POSITIVO = '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4';   // Capital Realty, fundo claro (cabeçalho)

// Marca na nota dos slides deste script: rodar de novo apaga ESTES (e só estes) e refaz.
const TAG_HOUSEKEEPING = '【HOUSEKEEPING_HUB_2026】';

const HK_TITULO = 'HOUSEKEEPING | HUB DOS MEGAS';
const HK_SUBTITULO = 'Planejamento & Gestão';

// Design system dos Megas (= CR_DESIGN_SYSTEM de megas-mensal) + tons claros do farol.
const HK = {
  brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD',
  bgSlide: '#F8FAFC', branco: '#FFFFFF', texto: '#16213E', corpo: '#46516B', cinza: '#8592AC', cinzaClaro: '#CBD5E4',
  linha: '#E2E8F0', azulClaro: '#E9F0FA', zebra: '#F4F7FB', verde: '#1E9E62', verdeEsc: '#0B5C34', verdeClaro: '#DEF4E9',
  marginX: 30, logoW: 112, logoH: 32
};
const HK_TIT = 'Montserrat', HK_CORPO = 'Open Sans';
const HK_W = 720, HK_H = 405;

function gerarApresentacaoHousekeeping() {
  const props = PropertiesService.getScriptProperties();
  const id = HK_DECK_ID || props.getProperty('HK_DECK_ID');
  const novo = !id;
  const deck = novo ? SlidesApp.create(HK_NOME_DECK) : SlidesApp.openById(id);
  if (novo) props.setProperty('HK_DECK_ID', deck.getId());
  // O deck novo nasce com um slide de título vazio; sai depois que os nossos entrarem.
  const iniciais = novo ? deck.getSlides() : [];

  if (Math.round(deck.getPageWidth()) !== HK_W || Math.round(deck.getPageHeight()) !== HK_H) {
    Logger.log('Atenção: o deck não é 16:9 (720×405 pt) — o desenho foi feito para esse tamanho.');
  }
  // Os novos entram onde estava o primeiro dos antigos (ou no fim, se ainda não há nenhum).
  let pos = -1, apagados = 0;
  deck.getSlides().forEach((s, k) => {
    if (_hkNotas_(s).indexOf(TAG_HOUSEKEEPING) < 0) return;
    if (pos < 0) pos = k - apagados;
    s.remove(); apagados++;
  });
  if (apagados) Logger.log('Versão anterior apagada (' + apagados + ' slides gerados pelo script).');
  if (pos < 0) pos = deck.getSlides().length;

  const passos = [_hkOQueFaz_, _hkCronograma_];
  passos.forEach(desenhar => {
    const s = _hkMarcar_(deck.insertSlide(pos++, SlidesApp.PredefinedLayout.BLANK));
    // Um slide que falha mostra o aviso nele mesmo e não derruba o outro.
    try { desenhar(s); } catch (e) { _hkFalha_(s, desenhar.name, e); }
  });
  iniciais.forEach(s => s.remove());
  Logger.log('✓ ' + passos.length + ' slides gerados.');
  Logger.log((novo ? 'Apresentação criada: ' : 'Apresentação: ') + deck.getUrl());
}

function _hkMarcar_(s) {
  s.getBackground().setSolidFill(HK.bgSlide);
  try { s.getNotesPage().getSpeakerNotesShape().getText().setText(TAG_HOUSEKEEPING); } catch (e) {}
  return s;
}

function _hkNotas_(s) { try { return s.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { return ''; } }

// Aviso de falha desenhado só com insertShape: não pode depender das helpers que talvez tenham quebrado.
function _hkFalha_(s, nome, e) {
  const r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, 32, 150, 656, 100);
  r.getFill().setSolidFill('#FEE2E2');
  r.getText().setText('⚠ Falha ao desenhar ' + nome + ': ' + (e && e.message));
  Logger.log('✗ ' + nome + ': ' + (e && e.stack));
}


// ==========================================
// 1 · O QUE FAZ
// ==========================================
function _hkOQueFaz_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Housekeeping no Hub dos Megas', 'A rotina dos terceiros planejada, cumprida e medida');

  [['01', 'Biblioteca', '60 atividades de referência, com passo a passo, EPIs, materiais e criticidade.'],
   ['02', 'Matriz do Mega', 'O Gestor escolhe o que o Mega faz, a frequência, as áreas e quem executa, apoia e faz a gestão.'],
   ['03', 'Agenda e checklist', 'O Hub gera o cronograma. Na linha: concluir com foto, não feito com motivo ou replanejar.'],
   ['04', 'Indicadores', 'Cumprimento do mês contra a meta de 95%, por Mega, função e área, e as rondas da gestão.']]
    .forEach((p, k) => {
      const x = 32 + k * 166;
      _hkCartao_(s, x, 130, 154, 148, HK.branco, true);
      _hkRet_(s, x, 138, 4, 132, HK.brandLight);
      _hkT_(s, x + 14, 138, 70, 32, p[0], 22, true, HK.brandLight, 'L', HK_TIT);
      _hkT_(s, x + 14, 172, 136, 20, p[1], 11.5, true, HK.texto, 'L', HK_TIT);
      _hkT_(s, x + 14, 194, 134, 78, p[2], 10, false, HK.corpo, 'L', null, true);
      if (k < 3) _hkT_(s, x + 146, 190, 28, 28, '›', 18, true, HK.cinzaClaro, 'C');
    });

  _hkCartao_(s, 32, 290, 656, 56, HK.branco, true);
  _hkRet_(s, 32, 298, 4, 40, HK.verde);
  [['META 2026', '95% dos controles diários'], ['MEGA CURITIBA', '36 áreas do Infraspeak'],
   ['EQUIPE TERCEIRA', 'Quadro impresso da semana']].forEach((f, j) => {
    const x = 52 + j * 216;
    if (j) _hkRet_(s, x - 16, 302, 1, 32, HK.linha);
    _hkT_(s, x, 299, 196, 14, f[0], 7.5, true, HK.cinza, 'L', HK_TIT);
    _hkT_(s, x, 314, 196, 24, f[1], 11.5, true, HK.verdeEsc, 'L', HK_TIT);
  });

  _hkFaixa_(s, 'O Gestor monta a rotina uma vez; o Hub gera a agenda de todo dia e mede a meta.');
}


// ==========================================
// 2 · EXEMPLO DE CRONOGRAMA (semana atual)
// ==========================================
// Atividades da biblioteca do Hub (código, função e horários sugeridos) em áreas do Mega Curitiba.
// dias: null = diária (todo dia, como hk_datas_da_regra); senão ISO, 1 = segunda … 7 = domingo.
const HK_EXEMPLO = [
  ['Ronda de abertura', 'Portaria e acesso', 'Zeladoria', ['06:30'], null],
  ['Limpeza da portaria e do acesso', 'Portaria', 'Aux. de limpeza', ['06:30–07:30'], null],
  ['Limpeza de rotina dos sanitários', 'Banheiros (apoio)', 'Aux. de limpeza', ['07:00', '11:30', '15:00'], null],
  ['Limpeza do apoio ao caminhoneiro', 'Apoio ao caminhoneiro', 'Aux. de limpeza', ['07:00', '12:00', '17:00'], null],
  ['Varrição e catação de pátio e docas', 'Pátio interno', 'Aux. de limpeza', ['08:00'], null],
  ['Conformidade dos sanitários', 'Banheiros (apoio)', 'Zeladoria', ['08:00'], null],
  ['Desobstrução de grelhas e canaletas', 'Pátio interno', 'Multifuncional', ['08:00'], [1]],
  ['Iluminação das áreas comuns', 'Estacionamentos', 'Zeladoria', ['18:00'], [2]],
  ['Vidros e portas de vidro até 2 m', 'Portaria', 'Aux. de limpeza', ['09:00'], [3]],
  ['Limpeza pesada de sanitários', 'Banheiros (apoio)', 'Aux. de limpeza', ['08:00'], [6]]
];

function _hkCronograma_(s) {
  // Semana de segunda a domingo que contém hoje.
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - (hoje.getDay() + 6) % 7);
  const dias = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = new Date(seg); d.setDate(seg.getDate() + k); return d; });
  const dd = d => ('0' + d.getDate()).slice(-2);
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  _hkHeader_(s);
  _hkChamada_(s, 'Exemplo de cronograma · Mega Curitiba',
    'Semana de ' + dd(dias[0]) + '/' + MES[dias[0].getMonth()] + ' a ' + dd(dias[6]) + '/' + MES[dias[6].getMonth()]);

  // Colunas: atividade | área | quem executa | horários | 7 dias.
  const x0 = 32, wAt = 182, wAr = 112, wFn = 80, wHr = 114, wDia = 24;
  const xAr = x0 + wAt, xFn = xAr + wAr, xHr = xFn + wFn, xD = xHr + wHr, wTab = xD + 7 * wDia - x0;
  const yCab = 126, hCab = 26, yLin = yCab + hCab, hLin = 18, n = HK_EXEMPLO.length;

  _hkCartao_(s, x0, yCab, wTab, hCab + n * hLin + 4, HK.branco, true);
  _hkRet_(s, x0, yCab, wTab, hCab, HK.brandMed);
  // A coluna de hoje fica destacada de cima a baixo.
  const kHoje = (hoje.getDay() + 6) % 7;
  _hkRet_(s, xD + kHoje * wDia, yLin, wDia, n * hLin, HK.azulClaro);

  [['ATIVIDADE', x0, wAt], ['ÁREA', xAr, wAr], ['QUEM EXECUTA', xFn, wFn], ['HORÁRIOS', xHr, wHr]].forEach(c =>
    _hkT_(s, c[1] + 4, yCab, c[2] - 4, hCab, c[0], 7, true, HK.branco, 'L', HK_TIT));
  const NOME = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  dias.forEach((d, k) => {
    // Caixa mais larga que a coluna e centralizada: o recuo interno do Slides quebraria "Seg" em 24 pt.
    const cx = xD + k * wDia + wDia / 2;
    _hkT_(s, cx - 20, yCab + 2, 40, 11, NOME[k], 6.5, true, k === kHoje ? HK.branco : HK.brandSoft, 'C', HK_TIT);
    _hkT_(s, cx - 20, yCab + 12, 40, 13, dd(d), 8.5, true, HK.branco, 'C', HK_TIT);
  });

  HK_EXEMPLO.forEach((l, i) => {
    const y = yLin + i * hLin;
    if (i % 2) _hkRet_(s, x0 + 1, y, xD - x0 - 1, hLin, HK.zebra);
    const semanal = !!l[4];
    _hkT_(s, x0 + 4, y, wAt - 4, hLin, l[0], 8, true, HK.texto, 'L');
    _hkT_(s, xAr + 4, y, wAr - 4, hLin, l[1], 8, false, HK.corpo, 'L');
    _hkT_(s, xFn + 4, y, wFn - 4, hLin, l[2], 8, false, HK.corpo, 'L');
    _hkT_(s, xHr + 4, y, wHr - 4, hLin, (semanal ? NOME[l[4][0] - 1] + ' · ' : '') + l[3].join(' · '), 8, false, HK.corpo, 'L');
    // Uma bolinha por vez no dia: a diária com três janelas leva três.
    dias.forEach((d, k) => {
      if (semanal && l[4].indexOf(k + 1) < 0) return;
      const q = l[3].length, dBola = 4.5, passo = 6.5;
      const xi = xD + k * wDia + (wDia - (q - 1) * passo - dBola) / 2;
      for (let b = 0; b < q; b++) _hkBola_(s, xi + b * passo, y + (hLin - dBola) / 2, dBola, semanal ? HK.verde : HK.brandLight);
    });
  });
  _hkRet_(s, xD, yLin, 0.75, n * hLin, HK.linha);

  // Legenda.
  const yLeg = yLin + n * hLin + 6;
  _hkBola_(s, 36, yLeg + 4.5, 5, HK.brandLight);
  _hkT_(s, 44, yLeg, 90, 14, 'diária (1 por horário)', 7.5, false, HK.corpo, 'L');
  _hkBola_(s, 146, yLeg + 4.5, 5, HK.verde);
  _hkT_(s, 154, yLeg, 70, 14, 'semanal', 7.5, false, HK.corpo, 'L');
  _hkT_(s, 230, yLeg, 458, 14, 'Exemplo com atividades da biblioteca do Hub e áreas do Mega Curitiba', 7.5, false, HK.cinza, 'R');

  _hkFaixa_(s, 'Cada bolinha é um item do checklist do dia: concluído, não feito com motivo ou replanejado.');
}


// ==========================================
// DESENHO
// ==========================================
// Cabeçalho padrão dos Megas (criarHeaderPadrao): elipse de fundo, barra, título 19 pt, subtítulo, logo e linhas.
function _hkHeader_(s) {
  const mX = HK.marginX;
  const el = s.insertShape(SlidesApp.ShapeType.ELLIPSE, HK_W - 350, -80, 450, 450);
  el.getFill().setSolidFill(HK.brandLight, 0.03); el.getBorder().setTransparent();
  _hkRet_(s, mX, 13, 5, 36, HK.brandLight);
  _hkT_(s, mX + 14, 6, HK_W - mX - 200, 30, HK_TITULO, 19, true, HK.texto, 'L', HK_TIT);
  _hkT_(s, mX + 14, 34, HK_W - mX - 200, 18, HK_SUBTITULO, 9.5, false, HK.corpo);
  try { s.insertImage(DriveApp.getFileById(HK_LOGO_POSITIVO).getBlob(), HK_W - mX - HK.logoW, 14, HK.logoW, HK.logoH); }
  catch (e) { Logger.log('Logo indisponível: ' + e.message); }
  _hkRet_(s, 0, 61.5, HK_W, 1, HK.linha);
  _hkRet_(s, mX, 60.5, 110, 3, HK.brandLight);
}

// Assunto do slide (sobretítulo) + a frase que a plateia deve levar.
function _hkChamada_(s, sobre, frase) {
  _hkT_(s, 32, 72, 600, 16, sobre.toUpperCase(), 8, true, HK.brandLight, 'L', HK_TIT);
  _hkT_(s, 32, 88, 656, 32, frase, 18, true, HK.brandDark, 'L', HK_TIT);
}

// Faixa de rodapé com a mensagem do slide (o "próximo passo" do farol).
function _hkFaixa_(s, txt, barra, fundo, cor) {
  _hkCartao_(s, 32, 358, 656, 26, fundo || HK.azulClaro, false);
  _hkRet_(s, 38, 364, 3, 14, barra || HK.brandLight);
  _hkT_(s, 50, 358, 632, 26, txt, 9, true, cor || HK.brandMed);
}


function _hkRet_(s, x, y, w, h, cor) {
  const r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor); r.getBorder().setTransparent();
  return r;
}

function _hkCartao_(s, x, y, w, h, cor, borda) {
  const r = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(cor);
  if (borda) { r.getBorder().getLineFill().setSolidFill(HK.linha); r.getBorder().setWeight(0.75); }
  else r.getBorder().setTransparent();
  return r;
}

function _hkBola_(s, x, y, d, cor) {
  const e = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
  e.getFill().setSolidFill(cor); e.getBorder().setTransparent();
  return e;
}

// Caixa de texto. topo=true alinha o texto em cima (parágrafos que podem ter 2 ou 3 linhas).
// Texto curto e centralizado em caixa estreita leva folga de 10 pt de cada lado em quem chama (recuo interno do Slides).
function _hkT_(s, x, y, w, h, txt, fs, bold, cor, alin, fonte, topo) {
  const t = s.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  t.setContentAlignment(topo ? SlidesApp.ContentAlignment.TOP : SlidesApp.ContentAlignment.MIDDLE);
  t.getText().setText(txt).getTextStyle().setFontSize(fs).setBold(!!bold).setForegroundColor(cor).setFontFamily(fonte || HK_CORPO);
  t.getText().getParagraphStyle().setParagraphAlignment(alin === 'C' ? SlidesApp.ParagraphAlignment.CENTER :
    alin === 'R' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START);
  return t;
}
