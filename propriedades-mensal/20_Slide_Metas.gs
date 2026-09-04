/**
 * ARQUIVO: 20_Slide_Metas.gs
 * SLIDE — FAROL DE METAS (um por pessoa)
 *
 * Mesmo formato do farol que o Wilson e o Ricardo já usam, e a mesma lógica de
 * status do 20_Slide_Metas.gs dos Megas — portada, não reinventada, para os dois
 * decks pintarem igual o mesmo dado.
 *
 *   Descrição | Pontos | Direcionador | Unidade | Sentido |
 *   Mês (Meta | Real) | Status | Ano (Meta | Real) | Status
 *
 * DUAS COISAS QUE O FAROL FEITO À MÃO ERRAVA e aqui saem calculadas:
 *
 * · Os PONTOS. No farol do Ricardo estava "15 PONTOS", que não bate com a
 *   soma das linhas verdes (35). Aqui é sempre a soma dos `pontos` das linhas
 *   com status do ANO verde — a meta é anual, o placar acompanha.
 *
 * · A COR do SIM/NÃO. A mesma situação (meta SIM, real NÃO) estava amarela no
 *   farol do Wilson e vermelha no do Ricardo. Pela regra dos Megas,
 *   SIM/NÃO não cumprido é AMARELO; vermelho fica para meta numérica furada.
 *
 * Real "—" (não medido) é diferente de real zero: pinta cinza, não verde nem
 * vermelho. É o caso da reabertura num mês sem nenhum chamado fechado.
 */

function gerarSlidesMetas() {
  const deck = getDeckMensal_();
  _slideLimpar_(deck, TAG_METAS);

  const calc = obterMetasCalculadas_();
  const ref  = obterMesReferencia_();
  let n = 0;
  METAS_PROPRIEDADES.forEach(pessoa => { _metaSlidePessoa_(deck, pessoa, calc, ref); n++; });
  Logger.log('Farol de Metas: ' + n + ' slide(s).');
  return n;
}

function _metaSlidePessoa_(deck, pessoa, calc, ref) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _slideNovo_(deck, TAG_METAS);

  // Título e subtítulo do farol de Facilities. O mês de referência entra no
  // fim porque neste deck ele é convenção — todo slide diz de que mês fala
  // (as colunas "Meta Mês"/"Real Mês" sozinhas não dizem QUAL mês).
  criarHeaderPadrao(slide, 'METAS',
    'Objetivos e Resultados · ' + pessoa.papel + ' · ' + ref.nome + ' ' + ref.ano);

  try {
    _metaTabela_(slide, W, H, pessoa, calc);
  } catch (e) {
    _metaFalha_(slide, 20, 74, W - 40, H - 88, e);
    Logger.log('Farol de Metas (' + pessoa.nome + '): falhou ao desenhar — ' + e.message);
  }
}


// ==========================================
// DESENHO — mesma grade de megas-mensal/Slide_Metas.gs
// ==========================================

/**
 * As 11 colunas do farol de Facilities, na mesma ordem e nas mesmas larguras.
 *
 * OS PESOS SÃO PONTOS, NÃO PROPORÇÕES: somam 708, que é exatamente a largura
 * útil de um slide de 720pt com 6pt de margem de cada lado. Foram
 * dimensionados lá para o conteúdo caber em UMA linha na fonte 7,5pt, já
 * descontando o recuo interno (~7pt) das caixas de texto do Slides — por isso
 * "Pontos" tem 54 e não 40. Mexer neles é mexer no layout do farol inteiro.
 */
const METAS_PESOS_COL = [114, 54, 76, 62, 46, 68, 66, 44, 68, 66, 44];

/**
 * Texto do "cromo" da tabela — faixa de título, cabeçalho de coluna, rodapé e
 * selo. Existe porque essas quatro peças usam a fonte de TÍTULOS (Montserrat),
 * enquanto _sTxt desenha na de corpo (Open Sans). No farol de Facilities essa
 * distinção é visível: o cabeçalho é Montserrat, os dados são Open Sans.
 */
function _metaTxtCromo_(slide, x, y, w, h, txt, size, cor, align, folga) {
  const f = folga || 0;
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - f, y, w + f * 2, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt == null ? '' : txt));
  ts.getTextStyle().setFontSize(size).setBold(true).setForegroundColor(cor)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles);
  ts.getParagraphStyle().setParagraphAlignment(align === 'center'
    ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
  return tb;
}

function _metaTabela_(slide, W, H, pessoa, calc) {
  const DS = CR_DESIGN_SYSTEM;
  const linhas = pessoa.linhas.map(l => _metaResolver_(l, calc));

  const somaPesos = METAS_PESOS_COL.reduce((a, b) => a + b, 0);
  const totalW = W - 12;
  const larg = METAS_PESOS_COL.map(p => p / somaPesos * totalW);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = 66;

  // --- Faixa de título ---
  const TIT_H = 22;
  _sRet_(slide, x0, y, totalW, TIT_H, DS.colors.brandMed);
  _metaTxtCromo_(slide, x0, y, totalW, TIT_H,
        'METAS ' + pessoa.nome + ' - PROPERTY ' + new Date().getFullYear(),
        11, '#FFFFFF', 'center');
  y += TIT_H;

  // --- Cabeçalho das colunas: UMA linha, como em Facilities ---
  // Mês e Ano não ganham faixa agrupadora: o rótulo já diz ("Meta Mês",
  // "Meta Ac."), e a faixa dupla era a principal diferença visual em relação
  // ao farol que o time usa.
  const CAB_H = 28;
  const titulosCab = [pessoa.papel, 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
    'Meta Mês', 'Real Mês', 'Status', 'Meta Ac.', 'Real Ac.', 'Status'];
  titulosCab.forEach((t, c) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], CAB_H);
    bg.getFill().setSolidFill(DS.colors.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill('#FFFFFF');
    _metaTxtCromo_(slide, xs[c] + 1, y, larg[c] - 2, CAB_H, t, 7, '#FFFFFF',
          c === 0 ? 'left' : 'center', c === 0 ? 0 : 6);
  });
  y += CAB_H;

  // --- Rodapé de pontuação: reserva o espaço ANTES de dividir as linhas ---
  const RES_H = 26, resumoY = H - RES_H - 8;

  const n = linhas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(78, Math.floor(dispH / Math.max(1, n))));

  linhas.forEach((l, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS.colors.cardBg : '#F8FAFC';

    // As 11 colunas na ordem do cabeçalho.
    const valores = [l.descricao, String(l.pontos), l.direcionador, l.unidade, l.sentido,
                     l.metaMes, l.realMes, null, l.metaAno, l.realAno, null];

    valores.forEach((valor, c) => {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      cell.getFill().setSolidFill(ehStatus
        ? _metaCorStatus_(c === 7 ? l.statusMes : l.statusAno)
        : fundo);
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.lines);
      if (ehStatus) return;

      let txt = String(valor == null ? '' : valor).trim();
      if (!txt || txt === 'undefined' || txt === 'null') txt = (c === 0 ? '—' : '-');

      // FOLGA: a caixa de texto do Slides tem ~7pt de recuo interno de cada
      // lado que a API não desliga, e em coluna estreita ele quebra a linha
      // com espaço visual sobrando ("R$ 6,46" virando duas linhas). Alargar a
      // caixa simetricamente para fora da célula devolve o espaço sem mover o
      // texto de lugar. A Descrição não precisa: ela pode quebrar mesmo.
      _sTxt(slide, xs[c] + 3, ry, larg[c] - 6, rowH, txt,
            c === 0 ? 8 : 7.5, c === 0, DS.colors.textMain,
            c === 0 ? 'left' : 'center', c === 0 ? 0 : 10);
    });
  });

  // --- Barra de pontuação, com selo de elegibilidade ---
  // Os pontos vêm do status do ANO: a meta é anual, o placar acompanha.
  let totalPontos = 0, pontosAno = 0;
  linhas.forEach(l => { totalPontos += l.pontos; if (l.verdeAno) pontosAno += l.pontos; });
  const elegivel = pontosAno >= METAS_PONTOS_ELEGIVEL;

  _sRet_(slide, x0, resumoY, totalW, RES_H, DS.colors.brandMed);

  const badgeW = 130, badgeH = 18;
  const badgeX = x0 + totalW - badgeW - 10;
  const badgeY = resumoY + (RES_H - badgeH) / 2;

  _metaTxtCromo_(slide, x0 + 12, resumoY, totalW - badgeW - 36, RES_H,
        'PONTUAÇÃO ACUMULADA  •  ' + pontosAno + ' / ' + totalPontos + ' PONTOS  •  MÍN. ' +
        METAS_PONTOS_ELEGIVEL + ' P/ ELEGIBILIDADE',
        9, '#FFFFFF', 'left');

  const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, badgeX, badgeY, badgeW, badgeH);
  badge.getFill().setSolidFill(elegivel ? DS.colors.accentGreen : DS.colors.accentRed);
  badge.getBorder().setTransparent();
  _metaTxtCromo_(slide, badgeX, badgeY, badgeW, badgeH,
        elegivel ? '✓ ELEGÍVEL' : '✗ NÃO ELEGÍVEL', 8.5, '#FFFFFF', 'center', 10);

  Logger.log('Farol de Metas — ' + pessoa.nome + ': ' + n + ' indicador(es), ' +
             pontosAno + '/' + totalPontos + ' pontos' + (elegivel ? ' (elegível).' : '.'));
}


// ==========================================
// STATUS — portado de megas-mensal/Slide_Metas.gs
// ==========================================

// Junta a linha do config com o valor calculado e resolve os dois status.
function _metaResolver_(linha, calc) {
  const o = {
    descricao: linha.descricao, pontos: linha.pontos,
    direcionador: linha.direcionador, unidade: linha.unidade, sentido: linha.sentido,
    metaMes: String(linha.metaMes == null ? '' : linha.metaMes),
    metaAno: String(linha.metaAno == null ? '' : linha.metaAno),
    realMes: String(linha.realMes == null ? '' : linha.realMes),
    realAno: String(linha.realAno == null ? '' : linha.realAno)
  };
  if (linha.calc) {
    const v = (calc && calc[linha.calc]) || { mes: null, ano: null };
    o.realMes = _metaFmt_(v.mes, linha.unidade);
    o.realAno = _metaFmt_(v.ano, linha.unidade);
  }
  o.statusMes = _metaStatus_(o.metaMes, o.realMes, o.sentido, o.unidade);
  o.statusAno = _metaStatus_(o.metaAno, o.realAno, o.sentido, o.unidade);
  o.verdeAno  = o.statusAno === 'Verde';
  return o;
}

// null → "—" (não medido). Nunca "0", que é medição de resultado zero.
function _metaFmt_(v, unidade) {
  if (v == null || isNaN(v)) return '—';
  const u = String(unidade || '').toUpperCase();
  if (u.indexOf('%') >= 0) return v.toFixed(2).replace('.', ',');
  if (u.indexOf('M') >= 0) return v.toFixed(2).replace('.', ',') + 'm';
  return String(Math.round(v));
}


function _metaOperador_(sentido, unidade) {
  const s = String(sentido || '').replace(/\s/g, '').replace('=>', '>=').replace('=<', '<=');
  if (s.indexOf('>=') >= 0) return '>=';
  if (s.indexOf('<=') >= 0) return '<=';
  if (s.indexOf('>') >= 0)  return '>=';
  if (s.indexOf('<') >= 0)  return '<=';
  if (s === '=') return '=';
  const u = String(unidade || '').toUpperCase();
  if (u.indexOf('R$') >= 0) return '<=';
  if (u.indexOf('%') >= 0)  return '>=';
  return '>=';
}

/**
 * SIM → Verde. NÃO/vazio → Amarelo. Numérico → compara pelo Sentido.
 *
 * "—" é o caso NOVO em relação aos Megas: lá um real ausente vira Amarelo
 * junto com o NÃO. Aqui não medir tem cor própria (cinza), senão a reabertura
 * de um mês sem chamados fecharia como se tivesse sido avaliada.
 */
function _metaStatus_(meta, real, sentido, unidade) {
  const r = String(real || '').trim().toUpperCase();
  if (r === '—' || r === '-' || r === '') return 'Cinza';
  if (r === 'SIM') return 'Verde';
  if (r === 'NAO' || r === 'NÃO' || r === 'N/A') return 'Amarelo';
  const op = _metaOperador_(sentido, unidade);
  const a = _metaNum_(real), b = _metaNum_(meta);
  if (isNaN(a) || isNaN(b)) return 'Cinza';
  const bate = op === '<=' ? a <= b : (op === '=' ? a === b : a >= b);
  return bate ? 'Verde' : 'Vermelho';
}

// Mesmos tons dos Megas.
function _metaCorStatus_(txt) {
  const t = String(txt || '').toLowerCase();
  if (t.indexOf('verde') >= 0)    return '#A7E8C0';
  if (t.indexOf('amarelo') >= 0)  return '#FCE49A';
  if (t.indexOf('vermelho') >= 0) return '#F3A9A9';
  return '#E2E8F0';
}

// Aviso de falha só com insertShape e CR_DESIGN_SYSTEM (lição 6).
function _metaFalha_(slide, x, y, w, h, erro) {
  _slideFalha_(slide, x, y, w, h, 'FAROL DE METAS NÃO FOI GERADO', erro,
    'Rode diagnosticarArquivos() no editor: ele diz qual arquivo recopiar.');
}

// O ponto de entrada avulso (gerarSoMetas) mora em 00_Main.gs, junto com os
// outros — no Apps Script o namespace é único e declarar aqui também
// sobrescreveria a versão que passa por _rodarPassos_, sem avisar.
