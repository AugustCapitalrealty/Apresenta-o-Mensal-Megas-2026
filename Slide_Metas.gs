/**
 * ARQUIVO: Slide_Metas.gs
 * SLIDE — METAS (scorecard por papel: Supervisor / Analista)
 * DESCRIÇÃO: Puxa DIRETO da planilha do sistema irmão "Gestão à Vista TV"
 * (GESTAO_TV_METAS_SPREADSHEET_ID em 01_Config.gs), que já é alimentada
 * todo mês para os painéis de TV — nada novo para preencher aqui. Redesenha
 * a mesma informação no design system da apresentação mensal.
 *
 * FONTE DOS DADOS: aba "METAS" da planilha da Gestão à Vista TV — uma linha
 * por indicador, com colunas:
 *   Mega | Papel | Título | Descrição | Pontos | Direcionador | Unidade |
 *   Sentido | Meta Mês | Real Mês | Status Mês | Meta Acum. | Real Acum. |
 *   Status Acum.
 * A coluna "Mega" (ex.: "Curitiba", "MEGA CURITIBA") é casada com a cidade
 * ativa; "Papel" (Supervisor/Analista) define em qual slide a linha entra.
 *
 * STATUS: se a coluna Status Mês/Acum. estiver em branco, é calculado
 * automaticamente comparando Real x Meta pelo Sentido (<=, >=, =). SIM/NÃO
 * vira Verde/Amarelo. Metas compostas (duas medidas separadas por "/") só
 * ficam Verdes se AMBAS baterem. Se a coluna de Status já tiver um valor
 * (Verde/Amarelo/Vermelho), ele prevalece (override manual).
 *
 * PONTUAÇÃO: soma os pontos das linhas com Status Acum. = Verde, mostrada
 * no rodapé do slide com selo de elegibilidade (>= METAS_PONTOS_ELEGIVEL).
 *
 * VALORES AUTOMÁTICOS: para os indicadores que a apresentação já calcula
 * — Check-list/SLA (Preventivas), Índice de Disponibilidade (Corretivas) e
 * Custo M² (aba METRO QUADRADO; a parte "% manutenções planejadas" fica
 * fixa em 0% até termos fonte) — o Real Mês/Real Acum. é SOBRESCRITO pelo
 * valor calculado via obterMetaAuto_() (02_Dados.gs), com comparativo
 * ▲/▼ vs mês anterior renderizado abaixo do valor. Se o cálculo não
 * estiver disponível (aba faltando etc.), vale o que está na planilha da
 * TV — nada quebra.
 */

const METAS_PONTOS_ELEGIVEL = 50;

const METAS_COLS_FULL = [
  'Mega', 'Papel', 'Título', 'Descrição', 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
  'Meta Mês', 'Real Mês', 'Status Mês', 'Meta Acum.', 'Real Acum.', 'Status Acum.'
];

// Colunas exibidas na tabela (Descrição → Status Acum.) — 11 colunas
const METAS_COLS = METAS_COLS_FULL.slice(3);


// ==========================================
// LEITURA / FILTRO (planilha da Gestão à Vista TV)
// ==========================================
function _metasNormMega_(s)  { return String(s || '').toUpperCase().replace(/^MEGA\s+/, '').trim(); }
function _metasNormPapel_(s) { return String(s || '').toUpperCase().trim(); }

// Distintos "Papel" com linhas preenchidas para a cidade ativa.
function obterPapeisMetas_() {
  const ss  = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
  const aba = ss.getSheetByName('METAS');
  if (!aba) return [];
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];

  const alvoMega = _metasNormMega_(getProjetoAtivo().nome);
  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();
  const papeis = [];
  dados.forEach(l => {
    const papel = _metasNormPapel_(l[1]);
    if (_metasNormMega_(l[0]) === alvoMega && papel && String(l[3] || '').trim() !== '' && papeis.indexOf(papel) < 0) {
      papeis.push(papel);
    }
  });
  return papeis;
}

// { titulo, papel, linhas } para o papel informado (cidade ativa), ou null.
// Real Mês/Real Acum. dos indicadores conhecidos (SLA, Disponibilidade,
// Custo M²) são sobrescritos pelo valor calculado (obterMetaAuto_) e ganham
// tendência vs mês anterior (linha._trendMes / linha._trendAcum).
function obterDadosMetas_(papel) {
  const ss  = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
  const aba = ss.getSheetByName('METAS');
  if (!aba) return null;
  const ultima = aba.getLastRow();
  if (ultima < 2) return null;

  const alvoMega  = _metasNormMega_(getProjetoAtivo().nome);
  const alvoPapel = _metasNormPapel_(papel);
  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();

  const filtradas = dados.filter(l =>
    _metasNormMega_(l[0]) === alvoMega &&
    _metasNormPapel_(l[1]) === alvoPapel &&
    String(l[3] || '').trim() !== ''
  );
  if (!filtradas.length) return null;

  const titulo = String(filtradas[0][2] || '').trim() || ('METAS ' + alvoPapel + ' — ' + getProjetoAtivo().nome);

  const linhas = filtradas.map(l => {
    const linha = l.slice(3, 3 + METAS_COLS.length);  // 11 colunas exibidas
    const descricao = linha[0];

    // Indicadores que já calculamos: sobrescreve o Real com o valor da
    // apresentação e guarda a tendência vs mês anterior para renderizar.
    // [6]=Real Mês (meta em [5]) · [9]=Real Acum. (meta em [8])
    const autoMes = obterMetaAuto_(descricao, linha[5], 'mes');
    if (autoMes) {
      linha[6] = autoMes.valor;
      linha._trendMes = tendenciaTexto_(autoMes.delta, autoMes.menorMelhor);
    }
    const autoAcum = obterMetaAuto_(descricao, linha[8], 'acum');
    if (autoAcum) {
      linha[9] = autoAcum.valor;
      linha._trendAcum = tendenciaTexto_(autoAcum.delta, autoAcum.menorMelhor);
    }
    return linha;
  });

  return { titulo, papel: alvoPapel, linhas };
}


// ==========================================
// MOTOR DE STATUS (Meta vs Real, pelo Sentido)
// ==========================================
function _metasParseNum_(s) {
  let t = String(s || '').trim().replace(/[^0-9,.\-]/g, '');
  t = t.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  return parseFloat(t);
}

function _metasSplitBarra_(s) { return String(s || '').split('/').map(x => x.trim()); }

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
  if (r === 'NAO' || r === 'NÃO' || r === 'N/A' || r === '-' || r === '') return 'Amarelo';

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

// Status de uma célula (mês ou acumulado), com override manual da própria coluna.
// linha (11 colunas): [0]Descrição [1]Pontos [2]Direcionador [3]Unidade [4]Sentido
// [5]MetaMês [6]RealMês [7]StatusMês [8]MetaAcum [9]RealAcum [10]StatusAcum
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
  return CORES.lineSeparator;
}


// ==========================================
// ORQUESTRADOR — gera um slide por papel encontrado na aba METAS
// ==========================================
function gerarSlidesMetas() {
  const papeis = obterPapeisMetas_();
  if (!papeis.length) {
    _gerarSlideMetasSemDados_();
    return;
  }
  papeis.forEach(papel => gerarSlideMetas(papel));
}

function _gerarSlideMetasSemDados_() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth();

  criarHeaderPadrao(slide, 'METAS', 'Sem linhas para ' + getProjetoAtivo().nome + ' na planilha da Gestão à Vista TV');

  const marginX = 30, topY = 90;
  const y = criarCardPainel(slide, marginX, topY, W - 2 * marginX, 120, 'DE ONDE VÊM OS DADOS', CORES.lightBlue);
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 14, y, W - 2 * marginX - 28, 80);
  txt.getText().setText(
    'Este slide lê a aba METAS da planilha da Gestão à Vista TV (a mesma que já ' +
    'alimenta os painéis de TV — nada novo para preencher). Não encontrei nenhuma ' +
    'linha com Mega = "' + getProjetoAtivo().nome + '" nessa aba. Confira lá se o ' +
    'papel (Supervisor/Analista) desta cidade está preenchido e rode a geração de novo.'
  ).getTextStyle().setFontSize(10).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setLineSpacing(130);

  Logger.log('Slide Metas: nenhuma linha para ' + getProjetoAtivo().nome + ' na planilha da Gestão à Vista TV — slide de instruções gerado.');
}


// ==========================================
// DESENHA A TABELA DE METAS DE UM PAPEL
// ==========================================
function gerarSlideMetas(papel) {
  const metas = obterDadosMetas_(papel);
  if (!metas) return;

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'METAS', 'Objetivos e Resultados · ' + metas.papel);

  // Larguras das colunas — a tabela ocupa o slide inteiro (margem de 10pt).
  // Dimensionadas para o conteúdo caber em UMA linha, já contando o recuo
  // interno (~7pt) das caixas de texto do Slides: "Direcionador"/
  // "Procedimentos" pedem ~74pt, "SIM/NÃO" ~50pt, "Pontos"/"Status" ~40pt,
  // "R$ 302.613" ~66pt. Só a Descrição quebra linha (é esperado).
  // O comparativo ▲/▼ NÃO entra na largura: é uma caixa sobreposta no
  // canto da célula (ver loop das linhas).
  const pesos  = [126, 40, 74, 50, 46, 66, 70, 46, 66, 70, 46];
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const totalW = W - 20;
  const larg = pesos.map(p => p / somaPesos * totalW);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = 66;

  // --- Barra de título ---
  const tituloH = 22;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, y, totalW, tituloH);
  barra.getFill().setSolidFill(DS.colors.brandMed); barra.getBorder().setTransparent();
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

  // --- Rodapé de pontuação (reserva espaço antes de calcular a altura das linhas) ---
  const resumoH = 26, resumoY = H - resumoH - 8;

  // --- Linhas de dados ---
  const n = metas.linhas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(58, Math.floor(dispH / Math.max(1, n))));

  metas.linhas.forEach((linha, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS.colors.cardBg : '#F8FAFC';

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
        // Metas/valores compostos ("R$ 4,21 / 80%") compactados para não
        // quebrar linha nas colunas de Meta/Real.
        let valStr = String(linha[c] || '');
        if (c === 5 || c === 6 || c === 8 || c === 9) valStr = valStr.replace(/\s*\/\s*/g, '/');

        const trend = c === 6 ? linha._trendMes : (c === 9 ? linha._trendAcum : null);
        const temTrend = !!(trend && trend.txt && valStr !== '');

        // Valor centralizado na célula (sem o comparativo junto — ele vai
        // numa caixa própria sobreposta, para nunca quebrar o valor). Com
        // selo, o valor desce um pouco para não colidir com ele.
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
          xs[c] + 3, temTrend ? ry + 9 : ry, larg[c] - 6, temTrend ? rowH - 9 : rowH);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        const tr = t.getText();
        tr.setText(valStr);
        tr.getTextStyle().setFontSize(8).setBold(c === 0).setFontFamily(DS.typography.body)
          .setForegroundColor(DS.colors.textMain);
        tr.getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);

        // Comparativo ▲/▼ vs mês anterior: caixinha sobreposta no canto
        // superior direito da célula de Real Mês (6) / Real Acum. (9) —
        // um selo pequeno sobre o indicador principal.
        if (temTrend) {
          const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
            xs[c] + larg[c] - 46, ry, 44, 12);
          selo.getText().setText(trend.txt).getTextStyle()
            .setFontSize(6.5).setBold(true).setForegroundColor(trend.cor)
            .setFontFamily(DS.typography.titles);
          selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
        }
      }
    });
  });

  // --- Barra de pontuação (metas Verdes no acumulado garantem os pontos) ---
  let totalPontos = 0, pontosAcum = 0;
  metas.linhas.forEach(linha => {
    const p = _metasParseNum_(linha[1]) || 0;
    totalPontos += p;
    if (_metasEhVerde_(linha, 'acum')) pontosAcum += p;
  });
  totalPontos = Math.round(totalPontos);
  const elegivel = Math.round(pontosAcum) >= METAS_PONTOS_ELEGIVEL;

  const barRes = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, resumoY, totalW, resumoH);
  barRes.getFill().setSolidFill(DS.colors.brandMed); barRes.getBorder().setTransparent();

  const badgeW = 130, badgeH = 18;
  const badgeX = x0 + totalW - badgeW - 10;
  const badgeY = resumoY + (resumoH - badgeH) / 2;

  const tRes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 12, resumoY, totalW - badgeW - 36, resumoH);
  tRes.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tRes.getText().setText('PONTUAÇÃO ACUMULADA  •  ' + Math.round(pontosAcum) + ' / ' + totalPontos + ' PONTOS  •  MÍN. ' + METAS_PONTOS_ELEGIVEL + ' P/ ELEGIBILIDADE')
    .getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, badgeX, badgeY, badgeW, badgeH);
  badge.getFill().setSolidFill(elegivel ? DS.colors.accentGreen : DS.colors.accentRed); badge.getBorder().setTransparent();
  const tBadge = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, badgeX, badgeY, badgeW, badgeH);
  tBadge.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBadge.getText().setText(elegivel ? '✓ ELEGÍVEL' : '✗ NÃO ELEGÍVEL')
    .getTextStyle().setFontSize(8.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  tBadge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  Logger.log('Slide Metas gerado: ' + metas.titulo + ' (' + n + ' indicador(es), ' +
             Math.round(pontosAcum) + '/' + totalPontos + ' pontos).');
}
