/**
 * ARQUIVO: Slide_Metas.gs
 * SLIDE — METAS (scorecard por papel: Supervisor / Analista)
 * DESCRIÇÃO: Portado do sistema "Gestão à Vista TV" (mesmo grupo, mesmas
 * planilhas e pessoas), adaptado para a apresentação mensal.
 *
 * FONTE DOS DADOS: aba "METAS" na planilha da cidade ativa — uma linha por
 * indicador. Colunas:
 *   Papel | Título | Descrição | Pontos | Direcionador | Unidade | Sentido |
 *   Meta Mês | Real Mês | Status Mês | Meta Acum. | Real Acum. | Status Acum.
 *
 * AUTO-PREENCHIMENTO: escreva "AUTO" em Real Mês / Real Acum. para os
 * indicadores que já calculamos em outros slides — SLA (Preventivas), Custo
 * M² (Realizado) e Índice de Disponibilidade (Corretivas). Ver
 * obterAutoMetaValor_() em 02_Dados.gs. Os demais (Projeto Sim/Não,
 * Orçamento, Documentos, Taxa de Reabertura...) são preenchidos à mão todo mês.
 *
 * STATUS: se a coluna Status Mês/Acum. estiver em branco, é calculado
 * automaticamente comparando Real x Meta pelo Sentido (<=, >=, =). SIM/NÃO
 * vira Verde/Amarelo. Metas compostas (duas medidas separadas por "/") só
 * ficam Verdes se AMBAS baterem. Para forçar (ex.: Vermelho após o prazo),
 * escreva Verde/Amarelo/Vermelho direto na coluna de Status.
 *
 * PONTUAÇÃO: soma os pontos das linhas com Status Acum. = Verde, mostrada
 * no rodapé do slide com selo de elegibilidade (>= METAS_PONTOS_ELEGIVEL).
 */

const ABA_METAS = 'METAS';
const METAS_PONTOS_ELEGIVEL = 50;

const METAS_COLS_FULL = [
  'Papel', 'Título', 'Descrição', 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
  'Meta Mês', 'Real Mês', 'Status Mês', 'Meta Acum.', 'Real Acum.', 'Status Acum.'
];

// Colunas exibidas na tabela (Descrição → Status Acum.) — 11 colunas
const METAS_COLS = METAS_COLS_FULL.slice(2);


// ==========================================
// CRIAÇÃO DA ABA (rodar 1x por cidade)
// ==========================================
function CRIAR_ABA_METAS() {
  const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const DS = CR_DESIGN_SYSTEM;

  let aba = ss.getSheetByName(ABA_METAS);
  if (!aba) aba = ss.insertSheet(ABA_METAS);

  const temCabecalho = aba.getRange(1, 1).getValue() === 'Papel';
  if (!temCabecalho) {
    aba.getRange(1, 1, 1, METAS_COLS_FULL.length).setValues([METAS_COLS_FULL]);
  }
  aba.getRange(1, 1, 1, METAS_COLS_FULL.length)
    .setBackground(DS.colors.brandDark).setFontColor('#FFFFFF')
    .setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  aba.setFrozenRows(1);
  aba.setColumnWidth(1, 90);   // Papel
  aba.setColumnWidth(2, 240);  // Título
  aba.setColumnWidth(3, 280);  // Descrição
  for (let c = 4; c <= METAS_COLS_FULL.length; c++) aba.setColumnWidth(c, 85);

  Logger.log('✅ Aba METAS pronta em ' + getProjetoAtivo().nome +
             '. Preencha Papel/Título/Descrição/Pontos/... e rode regerar' + getProjetoAtivo().nome.replace(/\s/g, '') + '().');
}

function criarAbaMetasCuritiba() { setProjetoAtivo('CURITIBA'); CRIAR_ABA_METAS(); }
function criarAbaMetasItajai()   { setProjetoAtivo('ITAJAI');   CRIAR_ABA_METAS(); }
function criarAbaMetasEsteio()   { setProjetoAtivo('ESTEIO');   CRIAR_ABA_METAS(); }


// ==========================================
// LEITURA / FILTRO
// ==========================================
function _metasNormPapel_(s) { return String(s || '').toUpperCase().trim(); }

// Distintos "Papel" com linhas preenchidas na aba METAS da cidade ativa.
function obterPapeisMetas_() {
  const ss  = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const aba = ss.getSheetByName(ABA_METAS);
  if (!aba) return [];
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];

  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();
  const papeis = [];
  dados.forEach(l => {
    const papel = _metasNormPapel_(l[0]);
    if (papel && String(l[2] || '').trim() !== '' && papeis.indexOf(papel) < 0) papeis.push(papel);
  });
  return papeis;
}

// { titulo, papel, linhas } para o papel informado, ou null se não houver dados.
// Resolve "AUTO" em Real Mês/Real Acum. usando obterAutoMetaValor_ (02_Dados.gs).
function obterDadosMetas_(papel) {
  const ss  = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const aba = ss.getSheetByName(ABA_METAS);
  if (!aba) return null;
  const ultima = aba.getLastRow();
  if (ultima < 2) return null;

  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();
  const alvoPapel = _metasNormPapel_(papel);

  const filtradas = dados.filter(l =>
    _metasNormPapel_(l[0]) === alvoPapel && String(l[2] || '').trim() !== ''
  );
  if (!filtradas.length) return null;

  const titulo = String(filtradas[0][1] || '').trim() || ('METAS ' + alvoPapel + ' — ' + getProjetoAtivo().nome);

  const linhas = filtradas.map(l => {
    const linha = l.slice(2, 2 + METAS_COLS.length);  // 11 colunas exibidas
    const descricao = linha[0];
    [6, 9].forEach((idx, i) => {  // índices de Real Mês (6) e Real Acum (9) dentro de `linha`
      if (String(linha[idx] || '').trim().toUpperCase() === 'AUTO') {
        const auto = obterAutoMetaValor_(descricao, i === 0 ? 'mes' : 'acum');
        linha[idx] = auto != null ? auto : '';
      }
    });
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

  criarHeaderPadrao(slide, 'METAS', 'Configure a aba METAS para habilitar este slide');

  const marginX = 30, topY = 90;
  const y = criarCardPainel(slide, marginX, topY, W - 2 * marginX, 140, 'COMO CONFIGURAR', CORES.lightBlue);
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 14, y, W - 2 * marginX - 28, 100);
  txt.getText().setText(
    '1. No editor do Apps Script, rode criarAbaMetasCuritiba() / criarAbaMetasItajai() / criarAbaMetasEsteio() — cria a aba METAS nesta planilha.\n' +
    '2. Preencha uma linha por indicador (Papel, Título, Descrição, Pontos, Direcionador, Unidade, Sentido, Meta Mês, Real Mês, Meta Acum., Real Acum.).\n' +
    '3. Em Real Mês/Real Acum., escreva "AUTO" para SLA, Custo M² e Disponibilidade — os demais são manuais.\n' +
    '4. Rode a geração novamente.'
  ).getTextStyle().setFontSize(10).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setLineSpacing(130);

  Logger.log('Slide Metas: aba METAS ainda não configurada — slide de instruções gerado.');
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

  // Larguras das colunas (Descrição mais larga; cabeçalhos curtos largos o bastante)
  const larg = [166, 46, 78, 56, 54, 44, 44, 50, 44, 44, 50];
  const totalW = larg.reduce((a, b) => a + b, 0);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = 72;

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
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 2, y, larg[c] - 4, cabH);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tb.getText().setText(t).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    tb.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
  });
  y += cabH;

  // --- Rodapé de pontuação (reserva espaço antes de calcular a altura das linhas) ---
  const resumoH = 26, resumoY = H - resumoH - 8;

  // --- Linhas de dados ---
  const n = metas.linhas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(48, Math.floor(dispH / Math.max(1, n))));

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
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 3, ry, larg[c] - 6, rowH);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        t.getText().setText(String(linha[c] || ''))
          .getTextStyle().setFontSize(7.5).setBold(c === 0).setFontFamily(DS.typography.body)
          .setForegroundColor(DS.colors.textMain);
        t.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
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
