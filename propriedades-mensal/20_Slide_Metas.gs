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
  const DS = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _slideNovo_(deck, TAG_METAS);

  criarHeaderPadrao(slide, 'FAROL DE METAS',
    'PROPERTY — ' + ref.nome + ' ' + ref.ano);

  try {
    _metaTabela_(slide, 20, 74, W - 40, H - 88, pessoa, calc);
  } catch (e) {
    _metaFalha_(slide, 20, 74, W - 40, H - 88, e);
    Logger.log('Farol de Metas (' + pessoa.nome + '): falhou ao desenhar — ' + e.message);
  }
}


// ==========================================
// DESENHO
// ==========================================

function _metaTabela_(slide, x, y, w, h, pessoa, calc) {
  const DS = CR_DESIGN_SYSTEM;
  const linhas = pessoa.linhas.map(l => _metaResolver_(l, calc));
  const pontos = linhas.reduce((s, l) => s + (l.verdeAno ? l.pontos : 0), 0);

  // Faixa de título com o nome, no azul da marca.
  const TIT_H = 20;
  _sRet_(slide, x, y, w, TIT_H, DS.colors.brandMed);
  _sTxt(slide, x, y, w, TIT_H, 'METAS ' + pessoa.nome + ' - PROPERTY ' + new Date().getFullYear(),
        8, true, '#FFFFFF', 'center');

  // Grade: rótulo largo + 4 colunas estreitas + 2 blocos de (Meta|Real|Status).
  const ROT_W = w * 0.30, PTS_W = w * 0.055, DIR_W = w * 0.105,
        UNI_W = w * 0.075, SEN_W = w * 0.055;
  const restante = w - ROT_W - PTS_W - DIR_W - UNI_W - SEN_W;
  const celW = restante / 6;                       // Meta,Real,Status × 2 blocos
  const cx = [];
  let acc = x;
  [ROT_W, PTS_W, DIR_W, UNI_W, SEN_W].forEach(cw => { cx.push({ x: acc, w: cw }); acc += cw; });
  for (let i = 0; i < 6; i++) { cx.push({ x: acc, w: celW }); acc += celW; }

  // Cabeçalho em duas alturas: MÊS e ANO agrupam suas três colunas.
  const H1 = 15, H2 = 13;
  const y1 = y + TIT_H, y2 = y1 + H1;
  const cabBg = (bx, bw, by, bh, cor) => {
    const s = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, by, bw, bh);
    s.getFill().setSolidFill(cor); s.getBorder().setTransparent();
  };
  cabBg(x, ROT_W + PTS_W + DIR_W + UNI_W + SEN_W, y1, H1 + H2, DS.colors.brandDark);
  _sTxt(slide, cx[0].x, y1, ROT_W, H1 + H2, pessoa.papel, 7, true, '#FFFFFF', 'center');
  ['Pontos', 'Direcionador', 'Unidade', 'Sentido'].forEach((t, i) => {
    _sTxt(slide, cx[i + 1].x, y1, cx[i + 1].w, H1 + H2, t, 6, true, '#FFFFFF', 'center');
  });

  // O bloco do ANO ganha cor própria: é o que decide os pontos.
  [['MÊS', 5, DS.colors.brandMed], ['ANO', 8, DS.colors.brandLight]].forEach(([rot, c0, cor]) => {
    cabBg(cx[c0].x, celW * 3 - 1, y1, H1, cor);
    _sTxt(slide, cx[c0].x, y1, celW * 3 - 1, H1, rot, 7, true, '#FFFFFF', 'center');
    ['Meta', 'Real', 'Status'].forEach((t, i) => {
      cabBg(cx[c0 + i].x, celW - 1, y2, H2, DS.colors.brandDark);
      _sTxt(slide, cx[c0 + i].x - 6, y2, celW + 11, H2, t, 6, true, '#FFFFFF', 'center');
    });
  });

  // Linha de pontos, logo abaixo do papel — é o placar, some se ninguém olhar.
  const yPts = y2 + H2;
  const PTS_H = 14;
  cabBg(x, ROT_W, yPts, PTS_H, '#E2E8F0');
  _sTxt(slide, x, yPts, ROT_W, PTS_H, pontos + ' PONTOS', 8, true, DS.colors.brandDark, 'center');

  const tY = yPts + PTS_H;
  const rowH = Math.min(46, (y + h) - tY - 4) / linhas.length > 0
    ? Math.min(46, ((y + h) - tY - 4) / linhas.length) : 20;
  const fs = rowH >= 34 ? 7 : (rowH >= 26 ? 6.4 : 5.8);

  linhas.forEach((l, i) => {
    const ry = tY + i * rowH;
    const fundo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, ry, w, rowH - 1);
    fundo.getFill().setSolidFill(i % 2 ? '#F8FAFC' : '#FFFFFF');
    fundo.getBorder().getLineFill().setSolidFill(DS.colors.lines);
    fundo.getBorder().setWeight(0.5);

    _sTxt(slide, cx[0].x + 4, ry, ROT_W - 8, rowH - 1, l.descricao, fs, false, DS.colors.textMain, 'left');
    _sTxt(slide, cx[1].x, ry, cx[1].w, rowH - 1, String(l.pontos), fs, true, DS.colors.textMain, 'center');
    _sTxt(slide, cx[2].x, ry, cx[2].w, rowH - 1, l.direcionador, fs, false, DS.colors.textBody, 'center');
    _sTxt(slide, cx[3].x, ry, cx[3].w, rowH - 1, l.unidade, fs, false, DS.colors.textBody, 'center');
    _sTxt(slide, cx[4].x, ry, cx[4].w, rowH - 1, l.sentido, fs, false, DS.colors.textBody, 'center');

    [[5, l.metaMes, l.realMes, l.statusMes], [8, l.metaAno, l.realAno, l.statusAno]]
      .forEach(([c0, meta, real, status]) => {
        _sTxt(slide, cx[c0].x, ry, celW, rowH - 1, meta, fs, false, DS.colors.textBody, 'center');
        _sTxt(slide, cx[c0 + 1].x, ry, celW, rowH - 1, real, fs, true, DS.colors.textMain, 'center');
        _sRet_(slide, cx[c0 + 2].x, ry, celW - 1, rowH - 1, _metaCorStatus_(status));
      });
  });
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
