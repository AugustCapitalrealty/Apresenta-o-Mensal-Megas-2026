/**
 * ARQUIVO: 20_Slide_Metas.gs
 * SLIDE — FAROL DE METAS (scorecard por analista / papel)
 *
 * MÉTODO OFICIAL (igual ao Megas — megas-mensal/Slide_Metas.gs):
 * Puxa DIRETO da aba "METAS" da planilha do sistema irmão "Gestão à Vista TV"
 * (GESTAO_TV_METAS_SPREADSHEET_ID em 01_Config.gs), a mesma onde os gestores e
 * a equipe já preenchem mensalmente os painéis de TV — sem necessidade de
 * editar código todo mês para preencher SIM/NÃO.
 *
 * FONTE DOS DADOS: aba "METAS" da planilha da Gestão à Vista TV — 14 colunas:
 *   Mega | Papel | Título | Descrição | Pontos | Direcionador | Unidade |
 *   Sentido | Meta Mês | Real Mês | Status Mês | Meta Acum. | Real Acum. |
 *   Status Acum.
 * A coluna "Mega" (ex.: "Propriedades", "Property") é casada com a área de
 * Propriedades; "Papel" ou "Título" define cada scorecard (um slide por analista).
 *
 * STATUS: se a coluna Status Mês/Acum. estiver em branco, é calculado
 * automaticamente comparando Real x Meta pelo Sentido (<=, >=, =). SIM/NÃO
 * vira Verde/Amarelo. Metas compostas (duas medidas separadas por "/") só
 * ficam Verdes se AMBAS baterem. Se a coluna de Status já tiver um valor
 * (Verde/Amarelo/Vermelho), ele prevalece (override manual) — EXCETO nas
 * linhas cujo Real foi sobrescrito pelo valor calculado: aí o status manual
 * é descartado para recalcular em cima do dado real apurado.
 *
 * PONTUAÇÃO: soma os pontos das linhas com Status Acum. = Verde, mostrada
 * no rodapé do slide com selo de elegibilidade (>= METAS_PONTOS_ELEGIVEL).
 *
 * VALORES AUTOMÁTICOS: para os indicadores que a apresentação já calcula
 * (ex.: Check-list/SLA de Preventivas), o Real Mês/Real Acum. é SOBRESCRITO pelo
 * valor calculado via obterMetaAutoPropriedades_(), com comparativo ▲/▼ vs mês
 * anterior renderizado acima do valor.
 */

const METAS_COLS_FULL = [
  'Mega', 'Papel', 'Título', 'Descrição', 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
  'Meta Mês', 'Real Mês', 'Status Mês', 'Meta Acum.', 'Real Acum.', 'Status Acum.'
];

// Colunas exibidas na tabela (Descrição → Status Acum.) — 11 colunas
const METAS_COLS = METAS_COLS_FULL.slice(3);

// Larguras das colunas — a tabela usa praticamente o slide inteiro (margem de 6pt de cada lado).
// Dimensionadas para o conteúdo caber em UMA linha na fonte 7,5pt.
const METAS_PESOS_COL = [114, 54, 76, 62, 46, 68, 66, 44, 68, 66, 44];

function _metasNormMega_(s)  { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function _metasNormPapel_(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function _ehMegaPropriedades_(megaStr) {
  const m = _metasNormMega_(megaStr);
  return m.indexOf('PROPRIEDAD') >= 0 || m.indexOf('PROPERTY') >= 0 || m.indexOf('PROPRIET') >= 0;
}

function _metasTrend_(auto) {
  if (!auto) return null;
  const t1 = _metasTendenciaTexto_(auto.delta, auto.menorMelhor);
  if (auto.delta2 == null || isNaN(auto.delta2)) {
    return t1.txt ? { segmentos: [t1] } : null;
  }
  const t2 = _metasTendenciaTexto_(auto.delta2, auto.menorMelhor2);
  const segmentos = [t1, t2].filter(s => s.txt);
  return segmentos.length ? { segmentos: segmentos } : null;
}

function _metasTendenciaTexto_(delta, menorMelhor, neutro) {
  const DS = CR_DESIGN_SYSTEM;
  if (delta == null || isNaN(delta)) return { txt: '', cor: DS.colors.textMuted || '#8592AC' };
  if (delta === 0) return { txt: '▬ 0', cor: DS.colors.textMuted || '#8592AC' };
  const seta = delta > 0 ? '▲' : '▼';
  const txt  = seta + ' ' + (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
  if (neutro) return { txt: txt, cor: DS.colors.textMuted || '#8592AC' };
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? DS.colors.accentGreen : DS.colors.accentRed };
}

function obterMetaAutoPropriedades_(descricao, metaStr, qual) {
  const d = _histNorm_(descricao);
  const ehMensal = qual === 'mes';
  try {
    const ref = obterMesReferencia_();

    // 1. CHECK-LIST / SLA (Preventivas de Propriedades)
    if ((d.includes('check') || d.includes('sla')) && !d.includes('terceiro') && !d.includes('acesso')) {
      let valNum = null, valAnt = null;
      if (ehMensal) {
        const indAtual = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
        if (indAtual && indAtual.total && indAtual.total.sla && indAtual.total.sla.pct != null) {
          valNum = indAtual.total.sla.pct;
        }
        const mesAnt = _propMesAnterior_(ref.ano, ref.index);
        try {
          const indAnt = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, mesAnt.ano, mesAnt.index);
          if (indAnt && indAnt.total && indAnt.total.sla && indAnt.total.sla.pct != null) {
            valAnt = indAnt.total.sla.pct;
          }
        } catch (e) {}
      } else {
        const acumAtual = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
        if (acumAtual && acumAtual.sla && acumAtual.sla.pct != null) {
          valNum = acumAtual.sla.pct;
        }
        if (ref.index > 0) {
          try {
            const acumAnt = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index - 1);
            if (acumAnt && acumAnt.sla && acumAnt.sla.pct != null) {
              valAnt = acumAnt.sla.pct;
            }
          } catch (e) {}
        }
      }

      if (valNum == null) return null;
      const valStr = valNum.toFixed(2).replace('.', ',');
      let delta = null;
      if (valAnt != null) {
        delta = Math.round((valNum - valAnt) * 100) / 100;
      }
      return { valor: valStr, delta: delta, menorMelhor: false };
    }

    // 2. EXECUÇÃO DE PREVENTIVAS (PLAN/REAL)
    if ((d.includes('plan') || d.includes('execu')) && (d.includes('prev') || d.includes('infraspeak'))) {
      let valNum = null, valAnt = null;
      if (ehMensal) {
        const indAtual = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
        if (indAtual && indAtual.total && indAtual.total.execucao && indAtual.total.execucao.pct != null) {
          valNum = indAtual.total.execucao.pct;
        }
        const mesAnt = _propMesAnterior_(ref.ano, ref.index);
        try {
          const indAnt = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, mesAnt.ano, mesAnt.index);
          if (indAnt && indAnt.total && indAnt.total.execucao && indAnt.total.execucao.pct != null) {
            valAnt = indAnt.total.execucao.pct;
          }
        } catch (e) {}
      } else {
        const acumAtual = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
        if (acumAtual && acumAtual.execucao && acumAtual.execucao.pct != null) {
          valNum = acumAtual.execucao.pct;
        }
        if (ref.index > 0) {
          try {
            const acumAnt = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index - 1);
            if (acumAnt && acumAnt.execucao && acumAnt.execucao.pct != null) {
              valAnt = acumAnt.execucao.pct;
            }
          } catch (e) {}
        }
      }

      if (valNum == null) return null;
      const valStr = valNum.toFixed(2).replace('.', ',');
      let delta = null;
      if (valAnt != null) {
        delta = Math.round((valNum - valAnt) * 100) / 100;
      }
      return { valor: valStr, delta: delta, menorMelhor: false };
    }

    // 3. PPC
    if (d.includes('ppc') || d.includes('planejamento')) {
      const ppc = typeof _metaPPC_ === 'function' ? _metaPPC_(ref) : null;
      if (!ppc) return null;
      const valNum = ehMensal ? ppc.mes : ppc.ano;
      if (valNum == null) return null;
      const valStr = valNum.toFixed(2).replace('.', ',');
      let delta = null;
      if (ref.index > 0 && typeof _metaPainelPPC_ === 'function') {
        try {
          const painel = _metaPainelPPC_();
          if (painel) {
            const serie = ehMensal ? painel.aderencia : painel.acumulado;
            const ant = serie && serie[ref.index - 1] != null ? serie[ref.index - 1] : null;
            if (ant != null) delta = Math.round((valNum - ant) * 100) / 100;
          }
        } catch (e) {}
      }
      return { valor: valStr, delta: delta, menorMelhor: false };
    }

    // 4. PISO
    if (d.includes('piso')) {
      const piso = typeof _metaPiso_ === 'function' ? _metaPiso_(ref) : null;
      if (!piso) return null;
      const valNum = ehMensal ? piso.mes : piso.ano;
      if (valNum == null) return null;
      const valStr = valNum.toFixed(2).replace('.', ',') + 'm';
      return { valor: valStr, delta: null, menorMelhor: false };
    }

    // 5. REABERTURA (menor = melhor)
    if (d.includes('reabertura')) {
      const reab = typeof _metaReabertura_ === 'function' ? _metaReabertura_(ref) : null;
      if (!reab) return null;
      const valNum = ehMensal ? reab.mes : reab.ano;
      if (valNum == null) return { valor: '—', delta: null, menorMelhor: true };
      const valStr = valNum.toFixed(2).replace('.', ',');
      return { valor: valStr, delta: null, menorMelhor: true };
    }
  } catch (e) {
    Logger.log('obterMetaAutoPropriedades_("' + descricao + '"): ' + e.message);
  }
  return null;
}


// ==========================================
// LEITURA / FILTRO (planilha da Gestão à Vista TV)
// ==========================================

/**
 * Carrega todos os scorecards da aba METAS da TV para Propriedades.
 * Se a planilha da TV ainda não tiver linhas de Propriedades, utiliza
 * os dados de referência (METAS_PROPRIEDADES) como fallback para continuidade.
 */
function obterScorecardsMetas_() {
  try {
    const ss = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
    const aba = ss.getSheetByName('METAS');
    if (aba && aba.getLastRow() >= 2) {
      const dados = aba.getRange(2, 1, aba.getLastRow() - 1, METAS_COLS_FULL.length).getDisplayValues();
      const filtradas = dados.filter(l => _ehMegaPropriedades_(l[0]) && String(l[3] || '').trim() !== '');

      if (filtradas.length > 0) {
        const scorecardsMap = {};
        const chaves = [];

        filtradas.forEach(l => {
          const papel = l[1] || 'ANALISTA DE PROPRIEDADES';
          const titulo = String(l[2] || '').trim() || ('METAS ' + papel + ' - PROPERTY ' + new Date().getFullYear());
          const chave = _metasNormPapel_(papel) + '|||' + titulo;

          if (!scorecardsMap[chave]) {
            scorecardsMap[chave] = { titulo, papel, linhas: [] };
            chaves.push(chave);
          }

          const linha = l.slice(3, 3 + METAS_COLS.length);
          const autoMes = obterMetaAutoPropriedades_(linha[0], linha[5], 'mes');
          if (autoMes) {
            if (autoMes.metaValor != null) linha[5] = autoMes.metaValor;
            linha[6] = autoMes.valor;
            linha[7] = '';
            linha._trendMes = _metasTrend_(autoMes);
          }
          const autoAcum = obterMetaAutoPropriedades_(linha[0], linha[8], 'acum');
          if (autoAcum) {
            if (autoAcum.metaValor != null) linha[8] = autoAcum.metaValor;
            linha[9] = autoAcum.valor;
            linha[10] = '';
            linha._trendAcum = _metasTrend_(autoAcum);
          }
          scorecardsMap[chave].linhas.push(linha);
        });

        return chaves.map(k => scorecardsMap[k]);
      }
    }
  } catch (e) {
    Logger.log('Metas Propriedades: leitura da planilha da TV falhou (' + e.message + ') — usando reserva.');
  }

  // Fallback gracioso com dados de referência
  return _obterDadosMetasFallback_();
}

/**
 * Fallback a partir de METAS_PROPRIEDADES (01_Config.gs) quando a planilha
 * da TV ainda não tiver sido populada com o SEED_METAS_PROPRIEDADES().
 */
function _obterDadosMetasFallback_() {
  if (typeof METAS_PROPRIEDADES === 'undefined' || !METAS_PROPRIEDADES.length) return [];
  return METAS_PROPRIEDADES.map(pessoa => {
    const papel = pessoa.papel || 'ANALISTA DE PROPRIEDADES';
    const titulo = 'METAS ' + pessoa.nome + ' - PROPERTY ' + new Date().getFullYear();
    const linhas = pessoa.linhas.map(l => {
      const linha = [
        l.descricao,
        String(l.pontos),
        l.direcionador,
        l.unidade,
        l.sentido,
        String(l.metaMes == null ? '' : l.metaMes),
        String(l.realMes == null ? '' : l.realMes),
        '',
        String(l.metaAno == null ? '' : l.metaAno),
        String(l.realAno == null ? '' : l.realAno),
        ''
      ];

      const autoMes = obterMetaAutoPropriedades_(l.descricao, linha[5], 'mes');
      if (autoMes) {
        if (autoMes.metaValor != null) linha[5] = autoMes.metaValor;
        linha[6] = autoMes.valor;
        linha[7] = '';
        linha._trendMes = _metasTrend_(autoMes);
      }
      const autoAcum = obterMetaAutoPropriedades_(l.descricao, linha[8], 'acum');
      if (autoAcum) {
        if (autoAcum.metaValor != null) linha[8] = autoAcum.metaValor;
        linha[9] = autoAcum.valor;
        linha[10] = '';
        linha._trendAcum = _metasTrend_(autoAcum);
      }
      return linha;
    });
    return { titulo, papel, linhas };
  });
}


// ==========================================
// MOTOR DE STATUS OFICIAL (idêntico ao Megas)
// ==========================================

function _metasParseNum_(s) {
  let t = String(s || '').trim().replace(/[^0-9,.\-]/g, '');
  t = t.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  return parseFloat(t);
}

function _metasSplitBarra_(s) {
  return String(s || '').split('/').map(x => x.trim());
}

function _metasOperadorPara_(sentido, unidade) {
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

function _metasComparaNum_(real, meta, op) {
  const a = _metasParseNum_(real), b = _metasParseNum_(meta);
  if (isNaN(a) || isNaN(b)) return false;
  if (op === '<=') return a <= b;
  if (op === '=')  return a === b;
  return a >= b;
}

// SIM/NÃO → Verde/Amarelo; meta composta ("A / B") exige as duas partes;
// numérica simples compara pelo Sentido.
function _metasCalcularStatus_(meta, real, sentido, unidade) {
  const r = String(real || '').trim().toUpperCase();
  if (r === 'SIM') return 'Verde';
  if (r === 'NAO' || r === 'NÃO' || r === 'N/A' || r === '-' || r === '—' || r === '') return 'Amarelo';

  const temBarra = String(meta || '').indexOf('/') >= 0 || String(real || '').indexOf('/') >= 0;
  if (temBarra) {
    const ms = _metasSplitBarra_(meta), rs = _metasSplitBarra_(real);
    const ss = _metasSplitBarra_(sentido), us = _metasSplitBarra_(unidade);
    const n = Math.max(ms.length, rs.length);
    for (let i = 0; i < n; i++) {
      const op = (ss.length === n && ss[i]) ? _metasOperadorPara_(ss[i], us[i] || us[0]) : _metasOperadorPara_('', us[i] || us[0]);
      if (!_metasComparaNum_(rs[i], ms[i], op)) return 'Vermelho';
    }
    return 'Verde';
  }

  const op = _metasOperadorPara_(sentido, unidade);
  return _metasComparaNum_(real, meta, op) ? 'Verde' : 'Vermelho';
}

// Status de uma célula (mês ou acumulado), com override manual da coluna de status
function _metasStatusCelula_(linha, qual) {
  const unidade = linha[3], sentido = linha[4];
  const meta = qual === 'mes' ? linha[5] : linha[8];
  const real = qual === 'mes' ? linha[6] : linha[9];
  const manual = qual === 'mes' ? linha[7] : linha[10];
  const m = String(manual || '').trim();
  if (m !== '') return m;
  return _metasCalcularStatus_(meta, real, sentido, unidade);
}

function _metasEhVerde_(linha, qual) {
  const st = String(_metasStatusCelula_(linha, qual) || '').toLowerCase();
  return st.indexOf('verde') >= 0;
}

function _metasCorStatus_(txt) {
  const t = String(txt || '').toLowerCase();
  if (t.indexOf('verde') >= 0)    return '#A7E8C0';
  if (t.indexOf('amarelo') >= 0)  return '#FCE49A';
  if (t.indexOf('vermelho') >= 0) return '#F3A9A9';
  return CR_DESIGN_SYSTEM.colors.lines || '#E2E8F0';
}

function _metaFmt_(v, unidade) {
  if (v == null || isNaN(v)) return '—';
  const u = String(unidade || '').toUpperCase();
  if (u.indexOf('%') >= 0) return v.toFixed(2).replace('.', ',');
  if (u.indexOf('M') >= 0) return v.toFixed(2).replace('.', ',') + 'm';
  return String(Math.round(v));
}

/**
 * Adaptador de compatibilidade para resolver metas em testes e scripts auxiliares.
 */
function _metaResolver_(linha, calc) {
  const o = {
    descricao: linha.descricao,
    pontos: _metasParseNum_(linha.pontos) || 0,
    direcionador: linha.direcionador,
    unidade: linha.unidade,
    sentido: linha.sentido,
    metaMes: String(linha.metaMes == null ? '' : linha.metaMes),
    metaAno: String(linha.metaAno == null ? '' : linha.metaAno),
    realMes: String(linha.realMes == null ? '' : linha.realMes),
    realAno: String(linha.realAno == null ? '' : linha.realAno)
  };
  if (linha.calc && calc && calc[linha.calc]) {
    const v = calc[linha.calc];
    o.realMes = _metaFmt_(v.mes, linha.unidade);
    o.realAno = _metaFmt_(v.ano, linha.unidade);
  }
  const lArray = [o.descricao, String(o.pontos), o.direcionador, o.unidade, o.sentido, o.metaMes, o.realMes, '', o.metaAno, o.realAno, ''];
  o.statusMes = _metasCalcularStatus_(o.metaMes, o.realMes, o.sentido, o.unidade);
  o.statusAno = _metasCalcularStatus_(o.metaAno, o.realAno, o.sentido, o.unidade);
  o.verdeAno = _metasEhVerde_(lArray, 'acum');
  return o;
}


// ==========================================
// ORQUESTRADOR — GERAÇÃO DOS SLIDES
// ==========================================

function gerarSlidesMetas() {
  const deck = getDeckMensal_();
  _slideLimpar_(deck, TAG_METAS);

  const scorecards = obterScorecardsMetas_();
  if (!scorecards || !scorecards.length) {
    _gerarSlideMetasSemDados_();
    return 1;
  }

  scorecards.forEach(sc => _renderizarSlideMetas_(deck, sc));
  Logger.log('Farol de Metas: ' + scorecards.length + ' slide(s) gerado(s).');
  return scorecards.length;
}

function _gerarSlideMetasSemDados_() {
  const deck = getDeckMensal_();
  const slide = _slideNovo_(deck, TAG_METAS);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  const W = deck.getPageWidth();

  criarHeaderPadrao(slide, 'METAS', 'Sem linhas para Propriedades na planilha da Gestão à Vista TV');

  const marginX = 30, topY = 90;
  const y = criarCardPainel(slide, marginX, topY, W - 2 * marginX, 130, 'DE ONDE VÊM OS DADOS', CR_DESIGN_SYSTEM.colors.brandLight);
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 14, y, W - 2 * marginX - 28, 90);
  txt.getText().setText(
    'Este slide lê a aba METAS da planilha da Gestão à Vista TV (a mesma que já ' +
    'alimenta os painéis de TV — nada novo para preencher). Não encontrei nenhuma ' +
    'linha com Mega = "Propriedades" nessa aba.\n\n' +
    'Para popular as metas automaticamente a partir do modelo padrão, execute a função ' +
    'SEED_METAS_PROPRIEDADES() no editor do Apps Script e rode a geração de novo.'
  ).getTextStyle().setFontSize(10).setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setLineSpacing(130);

  Logger.log('Slide Metas: nenhuma linha para Propriedades na planilha da TV — slide de instruções gerado.');
}


// ==========================================
// DESENHO VISUAL DO SCORECARD (layout oficial dos Megas)
// ==========================================

function _renderizarSlideMetas_(deck, metas) {
  const slide = _slideNovo_(deck, TAG_METAS);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const ref = typeof obterMesReferencia_ === 'function' ? obterMesReferencia_() : null;
  const subtitulo = 'Objetivos e Resultados · ' + metas.papel + (ref ? ' · ' + (ref.nome || '') + ' ' + (ref.ano || '') : '');
  criarHeaderPadrao(slide, 'METAS', subtitulo.trim());

  const pesos = METAS_PESOS_COL;
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const totalW = W - 12;
  const larg = pesos.map(p => p / somaPesos * totalW);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = 66;

  // --- Barra de título ---
  const tituloH = 22;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, y, totalW, tituloH);
  barra.getFill().setSolidFill(DS.colors.brandMed);
  barra.getBorder().setTransparent();
  const tBar = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0, y, totalW, tituloH);
  tBar.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBar.getText().setText(metas.titulo).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  tBar.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  y += tituloH;

  // --- Cabeçalho das colunas ---
  const cabH = 28;
  const titulosCab = [metas.papel, 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
    'Meta Mês', 'Real Mês', 'Status', 'Meta Ac.', 'Real Ac.', 'Status'];
  titulosCab.forEach((t, c) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], cabH);
    bg.getFill().setSolidFill(DS.colors.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill('#FFFFFF');
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y, larg[c] - 2, cabH);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tb.getText().setText(t).getTextStyle()
      .setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    tb.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
  });
  y += cabH;

  // --- Rodapé de pontuação ---
  const resumoH = 26, resumoY = H - resumoH - 8;

  // --- Linhas de dados ---
  const n = metas.linhas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(78, Math.floor(dispH / Math.max(1, n))));

  metas.linhas.forEach((linha, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS.colors.cardBg : '#F8FAFC';

    const ehComposta = String(linha[5] || '').includes('/') || String(linha[6] || '').includes('/');
    const subH = Math.floor(rowH / 2);
    const y1 = ry, y2 = ry + subH;
    const h1 = subH, h2 = rowH - subH;

    METAS_COLS.forEach((_, c) => {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      if (ehStatus) {
        const st = c === 7 ? _metasStatusCelula_(linha, 'mes') : _metasStatusCelula_(linha, 'acum');
        cell.getFill().setSolidFill(_metasCorStatus_(st));
      } else {
        cell.getFill().setSolidFill(fundo);
      }
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.lines);

      if (!ehStatus) {
        let valStr = String(linha[c] == null ? '' : linha[c]).trim();
        const trend = c === 6 ? linha._trendMes : (c === 9 ? linha._trendAcum : null);

        if (ehComposta && (c === 0 || c === 3 || c === 4 || c === 5 || c === 6 || c === 8 || c === 9)) {
          const linhaDiv = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry + subH, larg[c], 1);
          linhaDiv.getFill().setSolidFill('#E2E8F0');
          linhaDiv.getBorder().setTransparent();

          const partes = valStr.split('/').map(s => s.trim());
          const val1 = partes[0] || '-';
          const val2 = partes[1] || '-';

          if (c === 0) {
            const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 4, y1, larg[c] - 6, h1);
            t1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            t1.getText().setText(val1).getTextStyle().setFontSize(7).setBold(true).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            t1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);

            const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 4, y2, larg[c] - 6, h2);
            t2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            t2.getText().setText(val2).getTextStyle().setFontSize(7).setBold(true).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            t2.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
          } else if (c === 6 || c === 9) {
            const seg1 = trend && trend.segmentos ? trend.segmentos[0] : null;
            const seg2 = trend && trend.segmentos ? trend.segmentos[1] : null;

            if (seg1 && seg1.txt) {
              const selo1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], y1 + 1, larg[c], 9);
              selo1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
              selo1.getText().setText(seg1.txt).getTextStyle().setFontSize(5.5).setBold(true).setForegroundColor(seg1.cor).setFontFamily(DS.typography.titles);
              selo1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
            }
            const tb1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y1 + (seg1 && seg1.txt ? 6 : 0), larg[c] - 2, h1 - (seg1 && seg1.txt ? 6 : 0));
            tb1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            tb1.getText().setText(val1).getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tb1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

            if (seg2 && seg2.txt) {
              const selo2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], y2 + 1, larg[c], 9);
              selo2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
              selo2.getText().setText(seg2.txt).getTextStyle().setFontSize(5.5).setBold(true).setForegroundColor(seg2.cor).setFontFamily(DS.typography.titles);
              selo2.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
            }
            const tb2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y2 + (seg2 && seg2.txt ? 6 : 0), larg[c] - 2, h2 - (seg2 && seg2.txt ? 6 : 0));
            tb2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            tb2.getText().setText(val2).getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tb2.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
          } else {
            const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y1, larg[c] - 2, h1);
            t1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            t1.getText().setText(val1).getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            t1.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

            const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y2, larg[c] - 2, h2);
            t2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            t2.getText().setText(val2).getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            t2.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
          }
        } else {
          if (!valStr || valStr === 'undefined' || valStr === 'null') valStr = (c === 0 ? '—' : '-');
          const temTrend = !!(trend && trend.segmentos && trend.segmentos.length && valStr !== '-' && valStr !== '—');

          const folga = c === 0 ? 0 : 10;
          const yTexto = temTrend ? ry + 5 : ry;
          const hTexto = temTrend ? rowH - 5 : rowH;
          const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 3 - folga, yTexto, larg[c] - 6 + folga * 2, hTexto);
          t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
          const tr = t.getText();
          tr.setText(valStr);
          tr.getTextStyle().setFontSize(c === 0 ? 8 : 7.5).setBold(c === 0).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
          tr.getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);

          if (temTrend) {
            const textoCompleto = trend.segmentos.map(s => (s && s.txt) || '').filter(Boolean).join(' / ');
            if (textoCompleto) {
              const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], ry + 2, larg[c], 11);
              const tsr = selo.getText();
              tsr.setText(textoCompleto);
              tsr.getTextStyle().setFontSize(6.5).setBold(true).setFontFamily(DS.typography.titles);

              let offset = 0;
              trend.segmentos.forEach((seg, si) => {
                if (seg.txt && offset + seg.txt.length <= textoCompleto.length) {
                  tsr.getRange(offset, offset + seg.txt.length).getTextStyle().setForegroundColor(seg.cor);
                  offset += seg.txt.length;
                }
                if (si < trend.segmentos.length - 1 && offset + 3 <= textoCompleto.length) {
                  tsr.getRange(offset, offset + 3).getTextStyle().setForegroundColor(DS.colors.textMuted || '#8592AC');
                  offset += 3;
                }
              });
              tsr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
            }
          }
        }
      }
    });
  });

  // --- Barra de pontuação ---
  let totalPontos = 0, pontosAcum = 0;
  metas.linhas.forEach(linha => {
    const p = _metasParseNum_(linha[1]) || 0;
    totalPontos += p;
    if (_metasEhVerde_(linha, 'acum')) pontosAcum += p;
  });
  totalPontos = Math.round(totalPontos);
  const elegivel = Math.round(pontosAcum) >= METAS_PONTOS_ELEGIVEL;

  const barRes = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, resumoY, totalW, resumoH);
  barRes.getFill().setSolidFill(DS.colors.brandMed);
  barRes.getBorder().setTransparent();

  const badgeW = 130, badgeH = 18;
  const badgeX = x0 + totalW - badgeW - 10;
  const badgeY = resumoY + (resumoH - badgeH) / 2;

  const tRes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 12, resumoY, totalW - badgeW - 36, resumoH);
  tRes.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tRes.getText().setText('PONTUAÇÃO ACUMULADA  •  ' + Math.round(pontosAcum) + ' / ' + totalPontos + ' PONTOS  •  MÍN. ' + METAS_PONTOS_ELEGIVEL + ' P/ ELEGIBILIDADE')
    .getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, badgeX, badgeY, badgeW, badgeH);
  badge.getFill().setSolidFill(elegivel ? DS.colors.accentGreen : DS.colors.accentRed);
  badge.getBorder().setTransparent();
  const tBadge = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, badgeX, badgeY, badgeW, badgeH);
  tBadge.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBadge.getText().setText(elegivel ? '✓ ELEGÍVEL' : '✗ NÃO ELEGÍVEL')
    .getTextStyle().setFontSize(8.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  tBadge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  Logger.log('Slide Metas gerado: ' + metas.titulo + ' (' + n + ' indicador(es), ' +
             Math.round(pontosAcum) + '/' + totalPontos + ' pontos).');
}


// ==========================================
// UTILITÁRIOS / SEED
// ==========================================

/**
 * Adiciona na aba METAS da TV as linhas iniciais de Propriedades (Wilson e Ricardo).
 * Não apaga nada; só insere se ainda não existirem linhas para Propriedades.
 */
function SEED_METAS_PROPRIEDADES() {
  const ss = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
  let aba = ss.getSheetByName('METAS');
  if (!aba) {
    aba = ss.insertSheet('METAS');
    aba.getRange(1, 1, 1, METAS_COLS_FULL.length).setValues([METAS_COLS_FULL]);
    aba.getRange(1, 1, 1, METAS_COLS_FULL.length)
      .setBackground(CR_DESIGN_SYSTEM.colors.brandDark).setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontFamily(CR_DESIGN_SYSTEM.typography.titles)
      .setHorizontalAlignment('center').setWrap(true);
    aba.setFrozenRows(1);
  }

  const ultima = aba.getLastRow();
  if (ultima >= 2) {
    const existentes = aba.getRange(2, 1, ultima - 1, 2).getDisplayValues();
    const jaTem = existentes.some(l => _ehMegaPropriedades_(l[0]));
    if (jaTem) {
      Logger.log('Aba METAS já possui linhas para Propriedades. Nada a fazer.');
      return;
    }
  }

  const tWilson = 'METAS WILSON FRANCISCO LEFFER JUNIOR - PROPERTY 2026';
  const tRicardo = 'METAS RICARDO MURILO DA SILVA - PROPERTY 2026';

  const linhas = [
    // Wilson Leffer
    ['Propriedades', 'Wilson Leffer', tWilson, 'INSPEÇÕES PREDIAIS MONOUSUÁRIOS (DEZEMBRO)', 25, 'Projetos', 'SIM/NÃO', '=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    ['Propriedades', 'Wilson Leffer', tWilson, 'IMPLEMENTAÇÃO DA MEDIÇÃO DE QUALIDADE E PERFORMANCE (DEZEMBRO)', 20, 'Projetos', 'SIM/NÃO', '=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    ['Propriedades', 'Wilson Leffer', tWilson, 'DESENVOLVIMENTO DE MEMORIAIS DESCRITIVOS (NOVEMBRO)', 20, 'Padronização', 'SIM/NÃO', '=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    ['Propriedades', 'Wilson Leffer', tWilson, 'INFRASPEAK CHECK-LIST/SLA', 20, 'Performance', '%', '>=', '90', '', '', '90', '', ''],
    ['Propriedades', 'Wilson Leffer', tWilson, 'DESENVOLVIMENTO DE POPS DE VISTORIA DE ENTRADA E SAÍDA (NOVEMBRO)', 15, 'Padronização', 'SIM/NÃO', '>=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    // Ricardo Silva
    ['Propriedades', 'Ricardo Silva', tRicardo, 'Concluir no mínimo 80% do Planejamento (PPC) previsto em Manutenção', 25, 'Performance', '%', '>=', '80', '', '', '80', '', ''],
    ['Propriedades', 'Ricardo Silva', tRicardo, 'Realizar levantamento de projeto de retrofit de elétrica e hidráulica', 20, 'Projetos', 'SIM/NÃO', '=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    ['Propriedades', 'Ricardo Silva', tRicardo, 'Realizar manutenção de piso equivalente a pelo menos 1.000 metros', 20, 'Performance', 'M', '>=', '143', '', '', '1000', '', ''],
    ['Propriedades', 'Ricardo Silva', tRicardo, 'Desenvolver checklist de recebimento de serviços contratados', 20, 'Padronização', 'SIM/NÃO', '=', 'SIM', 'SIM', '', 'SIM', 'SIM', ''],
    ['Propriedades', 'Ricardo Silva', tRicardo, 'Obter taxa de reabertura de chamados inferior a 2%', 15, 'Performance', '%', '<=', '2', '', '', '2', '', '']
  ];

  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, METAS_COLS_FULL.length).setValues(linhas);
  Logger.log('✅ Metas de Propriedades adicionadas na aba METAS da TV (' + linhas.length + ' linhas).');
}

/**
 * Utilitário para listar no log as linhas da aba METAS da TV
 */
function listarLinhasMetasTV() {
  try {
    const ss = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
    const aba = ss.getSheetByName('METAS');
    if (!aba) { Logger.log('Aba METAS não encontrada na planilha da TV'); return; }
    const dados = aba.getDataRange().getDisplayValues();
    Logger.log('====================================================');
    Logger.log('LINHAS DA ABA METAS NA GESTÃO À VISTA TV (' + (dados.length - 1) + ' linhas):');
    dados.slice(1).forEach((l, i) => {
      Logger.log(`Linha ${i + 2}: Mega="${l[0]}", Papel="${l[1]}", Título="${l[2]}", Descrição="${l[3]}"`);
    });
    Logger.log('====================================================');
  } catch (e) {
    Logger.log('Erro ao listar metas TV: ' + e.message);
  }
}

function _metaFalha_(slide, x, y, w, h, erro) {
  _slideFalha_(slide, x, y, w, h, 'FAROL DE METAS NÃO FOI GERADO', erro,
    'Rode diagnosticarArquivos() no editor: ele diz qual arquivo recopiar.');
}
