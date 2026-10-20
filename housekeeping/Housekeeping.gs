/**
 * HOUSEKEEPING — apresentação de entrega do módulo no Hub dos Megas (reunião geral, 10/2026)
 * Irmã de rateio-energia/RateioEnergia.gs: mesmo desenho, mesma regra de rodar de novo.
 *
 * gerarApresentacaoHousekeeping(): desenha os slides com o design system dos Megas (mesmo cabeçalho de
 * criarHeaderPadrao, mesmas capas de 10_Slide_Capas e 26_Slide_Encerramento do megas-mensal). Cada slide é
 * DESENHADO aqui, nada depende de slide que já esteja no deck.
 *
 * Na primeira execução, sem HK_DECK_ID, cria a apresentação no Drive e guarda o ID nas propriedades do
 * script — as próximas abrem a mesma. O link sai no log.
 *
 * Só apaga os slides que ESTE script criou (marca TAG_HOUSEKEEPING na nota) — rodar de novo refaz sem duplicar.
 * Slides feitos à mão (ex.: prints das telas do Hub) não são tocados e ficam no MEIO: a abertura entra no
 * começo do deck e o fechamento no fim, então eles caem logo depois de "Como funciona".
 *
 * Números tirados do Hub (repositório megas-adc1ba20, migrations de 20 e 21/10/2026): meta de 95%
 * (META_CUMPRIMENTO), 60 atividades na biblioteca de referência, 36 áreas do Mega Curitiba vindas do
 * Infraspeak, ronda a cada 30 dias (PRAZO_RONDA_DIAS).
 */
const HK_DECK_ID = '';   // vazio = usa o que a primeira execução criou (propriedade HK_DECK_ID do script)
const HK_NOME_DECK = 'HOUSEKEEPING | HUB DOS MEGAS';
const HK_LOGO_POSITIVO = '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4';   // Capital Realty, fundo claro (cabeçalho)
const HK_LOGO_NEGATIVO = '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p';   // Capital Realty, fundo escuro (capas)

// Marca na nota dos slides deste script: rodar de novo apaga ESTES (e só estes) e refaz.
const TAG_HOUSEKEEPING = '【HOUSEKEEPING_HUB_2026】';

const HK_TITULO = 'HOUSEKEEPING | HUB DOS MEGAS';
const HK_SUBTITULO = 'Planejamento & Gestão';

// Design system dos Megas (= CR_DESIGN_SYSTEM de megas-mensal) + tons claros do farol.
const HK = {
  brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD', azulBrilho: '#60A5FA',
  bgSlide: '#F8FAFC', branco: '#FFFFFF', texto: '#16213E', corpo: '#46516B', cinza: '#8592AC', cinzaClaro: '#CBD5E4',
  linha: '#E2E8F0', azulClaro: '#E9F0FA', verde: '#1E9E62', verdeEsc: '#0B5C34', verdeClaro: '#DEF4E9',
  laranja: '#F97316', laranjaClaro: '#FFEDD5', laranjaEsc: '#9A3412', marginX: 30, logoW: 112, logoH: 32
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
  let apagados = 0;
  deck.getSlides().forEach(s => { if (_hkNotas_(s).indexOf(TAG_HOUSEKEEPING) >= 0) { s.remove(); apagados++; } });
  if (apagados) Logger.log('Versão anterior apagada (' + apagados + ' slides gerados pelo script).');

  // Abertura no começo do deck; fechamento no fim. O que foi feito à mão fica entre os dois.
  let i = 0;
  const noComeco = () => _hkMarcar_(deck.insertSlide(i++, SlidesApp.PredefinedLayout.BLANK));
  const noFim = () => _hkMarcar_(deck.appendSlide(SlidesApp.PredefinedLayout.BLANK));

  const passos = [
    [noComeco, _hkCapa_], [noComeco, _hkDesafio_], [noComeco, _hkComoFunciona_],
    [noFim, _hkMatriz_], [noFim, _hkMeta_], [noFim, _hkControle_], [noFim, _hkResultado_], [noFim, _hkEncerramento_]
  ];
  passos.forEach(p => {
    const s = p[0]();
    // Um slide que falha mostra o aviso nele mesmo e não derruba os outros.
    try { p[1](s); } catch (e) { _hkFalha_(s, p[1].name, e); }
  });
  iniciais.forEach(s => s.remove());
  Logger.log('✓ ' + passos.length + ' slides gerados: 3 no começo do deck e 5 no fim.');
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
// 1 · CAPA
// ==========================================
function _hkCapa_(s) {
  _hkFundoEscuro_(s, true);
  _hkLogo_(s, HK_LOGO_NEGATIVO, 42, 30, 34, 'CAPITAL REALTY');

  const y0 = HK_H * 0.32;
  _hkT_(s, 44, y0, 520, 20, _hkEspacado_('Planejamento & Gestão'), 9, true, HK.azulBrilho, 'L', HK_TIT);
  _hkGradiente_(s, 46, y0 + 26, 66, 4, HK.brandLight, HK.azulBrilho, { steps: 12 });
  _hkT_(s, 40, y0 + 36, 600, 66, 'HOUSEKEEPING', 50, true, HK.branco, 'L', HK_TIT);
  _hkT_(s, 42, y0 + 104, 560, 36, 'Gestão de terceiros · Hub dos Megas', 22, true, HK.azulBrilho, 'L', HK_TIT);

  const pillY = y0 + 150, pillW = 250, pillH = 30;
  _hkGradiente_(s, 42, pillY, pillW, pillH, HK.brandMed, HK.brandLight, { steps: 24 });
  _hkT_(s, 42, pillY, pillW, pillH, 'Entrega do módulo · Outubro 2026', 11, true, HK.branco, 'C', HK_TIT);

  _hkRodapeCapa_(s, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');
}


// ==========================================
// 2 · O DESAFIO
// ==========================================
function _hkDesafio_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'A meta 2026', '95% dos controles diários feitos — e comprovados');

  [['95%', 'dos controles diários', 'pelas equipes terceiras nas áreas comuns'],
   ['1 ronda', 'da gestão por mês', 'no mínimo, em cada Mega'],
   ['Fotos', 'como evidência', 'do que foi feito e do que foi visto']].forEach((k, j) => {
    const x = 32 + j * 228;
    _hkCartao_(s, x, 134, 200, 84, HK.branco, true);
    _hkRet_(s, x, 142, 4, 68, HK.brandLight);
    _hkT_(s, x + 16, 142, 180, 30, k[0], 22, true, HK.brandMed, 'L', HK_TIT);
    _hkT_(s, x + 16, 172, 180, 16, k[1], 10, true, HK.texto, 'L', HK_TIT);
    _hkT_(s, x + 16, 189, 180, 16, k[2], 8.6, false, HK.corpo);
    if (j < 2) _hkT_(s, x + 196, 160, 36, 32, '›', 22, true, HK.cinzaClaro, 'C');
  });

  _hkCartaoTitulado_(s, 32, 234, 656, 112, 'O QUE FALTAVA PARA MEDIR', HK.cinza);
  ['Uma agenda única: o que cada terceiro faz, em que área e em que horário',
   'Registro do que não foi feito — e por quê',
   'Um percentual que feche: quantos controles eram devidos e quantos foram feitos'].forEach((t, k) => {
    _hkBola_(s, 50, 271.5 + k * 22, 7, HK.laranja);
    _hkT_(s, 62, 265 + k * 22, 610, 20, t, 10.5, false, HK.texto);
  });

  _hkFaixa_(s, 'Sem agenda e sem registro, não dá para provar os 95% — nem saber onde a rotina falhou.', HK.laranja,
    HK.laranjaClaro, HK.laranjaEsc);
}


// ==========================================
// 3 · COMO FUNCIONA
// ==========================================
function _hkComoFunciona_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Como funciona', 'Três passos — a agenda sai da Matriz do Mega');

  [['01', 'Biblioteca', '60 atividades de referência, com passo a passo, EPIs, materiais e criticidade.'],
   ['02', 'Matriz do Mega', 'O Gestor decide o que o Mega faz, com que frequência, em que áreas e quem executa.'],
   ['03', 'Checklist do dia', 'Concluir (com foto), não feito com motivo ou replanejar — direto na linha.']].forEach((p, k) => {
    const x = 32 + k * 224;
    _hkCartao_(s, x, 132, 208, 124, HK.branco, true);
    _hkRet_(s, x, 140, 4, 108, HK.brandLight);
    _hkT_(s, x + 18, 142, 80, 34, p[0], 26, true, HK.brandLight, 'L', HK_TIT);
    _hkT_(s, x + 18, 178, 184, 20, p[1], 12, true, HK.texto, 'L', HK_TIT);
    _hkT_(s, x + 18, 200, 180, 52, p[2], 9.6, false, HK.corpo, 'L', null, true);
    if (k < 2) _hkT_(s, x + 200, 180, 32, 28, '›', 20, true, HK.cinzaClaro, 'C');
  });

  _hkCartao_(s, 32, 274, 656, 62, HK.branco, true);
  _hkRet_(s, 32, 282, 4, 46, HK.verde);
  [['CRONOGRAMA', 'Dia, semana e mês'], ['QUADRO IMPRESSO', 'Para a equipe terceira'],
   ['INDICADORES', 'Por Mega, função e área']].forEach((f, j) => {
    const x = 52 + j * 216;
    if (j) _hkRet_(s, x - 16, 288, 1, 34, HK.linha);
    _hkT_(s, x, 286, 196, 14, f[0], 7.5, true, HK.cinza, 'L', HK_TIT);
    _hkT_(s, x, 302, 196, 24, f[1], 11.5, true, HK.verdeEsc, 'L', HK_TIT);
  });

  _hkFaixa_(s, 'O Gestor monta a rotina uma vez; o Hub gera a agenda de todos os dias.');
}


// ==========================================
// 4 · MATRIZ DE RESPONSABILIDADE
// ==========================================
function _hkMatriz_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Matriz de responsabilidade', 'Cada atividade tem um dono, quem apoia e quem cobra');

  // Os papéis, na ordem da planilha de Facilities (PAPEIS_MATRIZ no Hub). "Propõe / Questiona" e "Garante" saíram.
  [['Executa', 'Faz a atividade e é o dono dela — um só por atividade.', HK.brandLight],
   ['Apoia', 'Ajuda na execução.', HK.brandSoft],
   ['Gestão', 'Liderança: cobra, decide e revisa.', HK.brandDark]].forEach((p, k) => {
    const x = 32 + k * 224;
    _hkCartao_(s, x, 132, 208, 76, HK.branco, true);
    _hkRet_(s, x, 132, 208, 5, p[2]);
    _hkT_(s, x + 14, 144, 186, 24, p[0], 14, true, HK.texto, 'L', HK_TIT);
    _hkT_(s, x + 14, 168, 186, 36, p[1], 9.6, false, HK.corpo, 'L', null, true);
  });

  _hkCartaoTitulado_(s, 32, 222, 656, 124, 'O GESTOR DO MEGA DEFINE, PARA CADA ATIVIDADE', HK.brandMed);
  [['SE FAZ', 'O Mega escolhe o que entra na rotina'], ['FREQUÊNCIA', 'Da diária à semestral, em uma ou mais janelas por dia'],
   ['ÁREAS', 'As 36 do Mega Curitiba já vieram do Infraspeak'], ['QUEM EXECUTA', 'Função do terceiro ou equipe interna']]
    .forEach((f, j) => {
      const x = 48 + j * 160;
      if (j) _hkRet_(s, x - 10, 262, 1, 72, HK.linha);
      _hkT_(s, x, 262, 146, 16, f[0], 7.5, true, HK.brandMed, 'L', HK_TIT);
      _hkT_(s, x, 282, 146, 52, f[1], 10, false, HK.texto, 'L', null, true);
    });

  _hkFaixa_(s, 'A Matriz vira o plano: o Hub gera e mantém a agenda sozinho, ninguém digita data.');
}


// ==========================================
// 5 · A META DE 95%
// ==========================================
function _hkMeta_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Indicadores · meta de 95%', 'Um percentual só, calculado pelo Hub');

  // Cumprimento = concluídas ÷ devidas no mês (hk_indicadores + cumprimento() no Hub).
  _hkCartaoTitulado_(s, 32, 132, 656, 96, 'COMO O PERCENTUAL FECHA', HK.brandMed);
  [['Concluídas', 'feitas e com baixa', HK.verdeClaro, HK.verdeEsc],
   ['Devidas no mês', 'tudo que a agenda pedia', HK.azulClaro, HK.brandMed],
   ['Cumprimento', 'meta: 95% ou mais', HK.verdeClaro, HK.verdeEsc]].forEach((b, j) => {
    const x = 52 + j * 214;
    _hkCartao_(s, x, 164, 186, 52, b[2], false);
    _hkT_(s, x + 10, 168, 166, 24, b[0], 14, true, b[3], 'L', HK_TIT);
    _hkT_(s, x + 10, 192, 166, 18, b[1], 8.8, false, b[3]);
    if (j < 2) _hkT_(s, x + 186, 170, 28, 40, j === 0 ? '÷' : '=', 18, true, HK.cinza, 'C', HK_TIT);
  });

  _hkCartaoTitulado_(s, 32, 240, 320, 106, 'CONTA CONTRA A META', HK.laranjaEsc);
  ['Não executada (com o motivo)', 'Em atraso', 'Expirou sem baixa'].forEach((t, k) => {
    _hkBola_(s, 50, 277.5 + k * 22, 7, HK.laranja);
    _hkT_(s, 62, 271 + k * 22, 280, 20, t, 10.5, false, HK.texto);
  });

  _hkCartaoTitulado_(s, 368, 240, 320, 106, 'ABERTO POR', HK.brandLight);
  [['Mega', 'Função'], ['Área', 'Motivo']].forEach((par, lin) => par.forEach((t, col) => {
    const x = 384 + col * 148, y = 274 + lin * 34;
    _hkCartao_(s, x, y, 136, 26, HK.azulClaro, false);
    _hkT_(s, x, y, 136, 26, t, 10.5, true, HK.brandMed, 'C', HK_TIT);
  }));

  _hkFaixa_(s, 'O mesmo número para todos: o Hub calcula no banco e mostra o mês contra a meta.', HK.verde,
    HK.verdeClaro, HK.verdeEsc);
}


// ==========================================
// 6 · CONTROLE
// ==========================================
function _hkControle_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Controle', 'O Hub não deixa o percentual enganar');

  [['Baixa adiantada bloqueada', 'Atividade de dia futuro só pode ser concluída no próprio dia.', HK.laranja, '!'],
   ['Não feito pede motivo', 'Falta de efetivo, de material, área interditada, clima ou impedido pelo cliente.', HK.laranja, '!'],
   ['Pendência expira', 'A vencida vira "não executada" quando chega a próxima — o atraso não se acumula.', HK.laranja, '!'],
   ['Ronda com prazo', 'Mega sem ronda da gestão há 30 dias fica em alerta. Ronda registra áreas conformes e fora.',
    HK.brandLight, '30']]
    .forEach((c, k) => {
      const x = 32 + (k % 2) * 336, y = 132 + Math.floor(k / 2) * 106;
      _hkCartao_(s, x, y, 320, 94, HK.branco, true);
      _hkRet_(s, x, y + 8, 4, 78, c[2]);
      _hkBola_(s, x + 18, y + 18, 26, c[2] === HK.laranja ? HK.laranjaClaro : HK.azulClaro);
      _hkT_(s, x + 8, y + 18, 46, 26, c[3], c[3].length > 1 ? 10 : 13, true, c[2], 'C', HK_TIT);
      _hkT_(s, x + 54, y + 16, 254, 30, c[0], 12.5, true, HK.texto, 'L', HK_TIT);
      _hkT_(s, x + 54, y + 46, 254, 38, c[1], 9.6, false, HK.corpo, 'L', null, true);
    });

  _hkFaixa_(s, 'As fotos da baixa e da ronda ficam como evidência, num arquivo privado de cada Mega.');
}


// ==========================================
// 7 · RESULTADO E PRÓXIMOS PASSOS
// ==========================================
function _hkResultado_(s) {
  _hkHeader_(s);
  _hkChamada_(s, 'Resultado', 'Rotina planejada, meta medida, evidência guardada');

  _hkCartaoTitulado_(s, 32, 132, 320, 214, 'GANHOS', HK.verdeEsc);
  ['Rotina do terceiro planejada e à vista', 'Percentual da meta calculado, não estimado',
   'Foto como evidência na baixa e na ronda', 'Não feito com motivo: dá para agir na causa',
   'Quadro impresso para a equipe terceira'].forEach((t, k) => {
    _hkBola_(s, 50, 173 + k * 33, 14, HK.verde);
    _hkT_(s, 43, 173 + k * 33, 28, 14, '✓', 8, true, HK.branco, 'C');
    _hkT_(s, 72, 166 + k * 33, 272, 28, t, 10.5, false, HK.texto);
  });

  _hkCartaoTitulado_(s, 368, 132, 320, 214, 'PRÓXIMOS PASSOS', HK.brandLight);
  ['Montar a Matriz do Mega Curitiba, com as 36 áreas já cadastradas', 'Cadastrar as áreas de Itajaí e Esteio',
   'Fechar o primeiro mês medido contra os 95%'].forEach((t, k) => {
    _hkT_(s, 384, 168 + k * 56, 44, 40, '0' + (k + 1), 20, true, HK.brandLight, 'L', HK_TIT);
    _hkT_(s, 426, 168 + k * 56, 250, 40, t, 10.5, false, HK.texto);
  });

  _hkFaixa_(s, 'Housekeeping no Hub dos Megas — Planejamento & Gestão.');
}


// ==========================================
// 8 · ENCERRAMENTO
// ==========================================
function _hkEncerramento_(s) {
  _hkFundoEscuro_(s, false);
  const y0 = HK_H * 0.20;
  _hkT_(s, 40, y0, HK_W - 80, 18, _hkEspacado_('Obrigado'), 9, true, HK.azulBrilho, 'C', HK_TIT);
  _hkT_(s, 40, y0 + 26, HK_W - 80, 46, 'HOUSEKEEPING', 34, true, HK.branco, 'C', HK_TIT);
  _hkT_(s, 40, y0 + 70, HK_W - 80, 46, 'NO HUB DOS MEGAS', 34, true, HK.azulBrilho, 'C', HK_TIT);

  const sloganY = y0 + 132;
  _hkT_(s, HK_W / 2 - 160, sloganY, 320, 22, 'EXPANDIR EFICIÊNCIA', 12, true, '#CBD5E1', 'C', HK_TIT);
  _hkGradiente_(s, HK_W / 2 - 230, sloganY + 11, 55, 2, HK.brandDark, HK.azulBrilho, { steps: 16 });
  _hkGradiente_(s, HK_W / 2 + 175, sloganY + 11, 55, 2, HK.azulBrilho, HK.brandDark, { steps: 16 });

  // Cartão de contato (vidro), como o do encerramento dos Megas.
  const cw = 270, ch = 58, cx = (HK_W - cw) / 2, cy = sloganY + 44;
  const bg = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, cy, cw, ch);
  bg.getFill().setSolidFill(HK.branco, 0.06);
  bg.getBorder().getLineFill().setSolidFill(HK.branco, 0.18); bg.getBorder().setWeight(1);
  _hkBola_(s, cx + 14, cy + 11, 36, HK.brandLight);
  _hkT_(s, cx + 4, cy + 11, 56, 36, 'GA', 13, true, HK.branco, 'C', HK_TIT);
  _hkT_(s, cx + 62, cy + 10, cw - 70, 20, 'Guilherme August', 12, true, HK.branco, 'L', HK_TIT);
  _hkT_(s, cx + 62, cy + 30, cw - 70, 16, 'Planejamento & Gestão', 8.5, false, '#CBD5E1');

  _hkRet_(s, HK_W / 2 - 60, HK_H - 62, 120, 1, '#334155');
  _hkLogo_(s, HK_LOGO_NEGATIVO, null, HK_H - 52, 34, 'CAPITAL REALTY');
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

function _hkCartaoTitulado_(s, x, y, w, h, titulo, faixa) {
  _hkCartao_(s, x, y, w, h, HK.branco, true);
  _hkRet_(s, x, y, w, 24, faixa);
  _hkT_(s, x + 12, y, w - 16, 24, titulo, 8.5, true, HK.branco, 'L', HK_TIT);
}

// Fundo escuro das capas (_capaFundo_ do megas-mensal): halo, massa, anéis, triângulo e espinha lateral.
function _hkFundoEscuro_(s, espinha) {
  s.getBackground().setSolidFill(HK.brandDark);
  const elipse = (x, y, d, cor, a) => { const e = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    e.getFill().setSolidFill(cor, a); e.getBorder().setTransparent(); };
  elipse(HK_W - 300, -220, 560, HK.brandLight, 0.12);
  elipse(-220, HK_H - 240, 500, HK.brandMed, 0.22);
  elipse(HK_W - 150, -60, 150, HK.brandSoft, 0.10);
  const anel = (x, y, d, cor, peso, a) => { const c = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    c.getFill().setTransparent(); c.getBorder().getLineFill().setSolidFill(cor, a); c.getBorder().setWeight(peso); };
  anel(HK_W - 250, -130, 420, HK.brandLight, 1.25, 0.16);
  anel(HK_W - 210, -95, 330, HK.brandSoft, 1, 0.10);
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, HK_W - 130, HK_H - 190, 90, 81);
  tri.getFill().setSolidFill(HK.brandLight, 0.08); tri.getBorder().setTransparent();
  if (espinha) _hkGradiente_(s, 0, 0, 6, HK_H, HK.brandLight, HK.brandSoft, { vertical: true, steps: 30 });
}

function _hkRodapeCapa_(s, esquerda, direita) {
  _hkRet_(s, 42, HK_H - 40, HK_W - 84, 1, '#334155');
  _hkT_(s, 42, HK_H - 34, HK_W - 260, 18, esquerda, 7, true, '#94A3B8');
  _hkBola_(s, HK_W - 205, HK_H - 28, 6, HK.azulBrilho);
  _hkT_(s, HK_W - 192, HK_H - 34, 150, 18, direita, 9, true, HK.branco, 'L', HK_TIT);
}

// Logo na altura pedida, sem distorcer (x null = centralizado). Sem acesso à imagem, cai no nome em texto.
function _hkLogo_(s, id, x, y, h, reserva) {
  try {
    const img = s.insertImage(DriveApp.getFileById(id).getBlob());
    const ar = img.getWidth() / img.getHeight();
    img.setHeight(h).setWidth(h * ar);
    img.setLeft(x == null ? (HK_W - h * ar) / 2 : x).setTop(y);
  } catch (e) {
    Logger.log('Logo indisponível (' + id + '), usando o nome em texto. ' + e.message);
    _hkT_(s, x == null ? 40 : x, y, x == null ? HK_W - 80 : 300, h, reserva, 16, true, HK.branco, x == null ? 'C' : 'L', HK_TIT);
  }
}

// Faixa de gradiente simulada por segmentos (a API do Slides não tem gradiente).
function _hkGradiente_(s, x, y, w, h, c1, c2, op) {
  const passos = op.steps || 20, vertical = !!op.vertical;
  for (let i = 0; i < passos; i++) {
    const t = passos === 1 ? 0 : i / (passos - 1);
    const r = vertical ? s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + i * h / passos, w, h / passos + 0.8)
                       : s.insertShape(SlidesApp.ShapeType.RECTANGLE, x + i * w / passos, y, w / passos + 0.8, h);
    r.getFill().setSolidFill(_hkMistura_(c1, c2, t)); r.getBorder().setTransparent();
  }
}

function _hkMistura_(a, b, t) {
  const ca = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), cb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function _hkEspacado_(txt) { return String(txt).toUpperCase().split('').join(' '); }

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
