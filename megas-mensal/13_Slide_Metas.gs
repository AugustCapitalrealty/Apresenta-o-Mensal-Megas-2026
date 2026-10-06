/**
 * ARQUIVO: 13_Slide_Metas.gs
 * SEÇÃO:   SLIDES — Metas Operacionais, Estratégicas e Farol
 * DESCRIÇÃO: Painéis de metas da operação (scorecard operacional da TV),
 *            metas estratégicas executivas e Farol de Metas de Gestão.
 */

// ==========================================
// METAS OPERACIONAIS (SCORECARD DA TV)
// ==========================================
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
 * (Verde/Amarelo/Vermelho), ele prevalece (override manual) — EXCETO nas
 * linhas cujo Real foi sobrescrito pelo valor calculado (ver VALORES
 * AUTOMÁTICOS abaixo): aí o status manual é descartado, porque foi digitado
 * em cima do Real antigo da Gestão à Vista TV, não do Real recalculado que
 * a apresentação está de fato mostrando.
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
function _metasNormMega_(s)  { return _histEmpChave_(s); }
function _metasNormPapel_(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

// Distintos "Papel" com linhas preenchidas para a cidade ativa.
function obterPapeisMetas_() {
  const ss  = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
  const aba = ss.getSheetByName('METAS');
  if (!aba) return [];
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];

  const alvoMega = _histEmpChave_(getProjetoAtivo().nome);
  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();
  const papeis = [];
  dados.forEach(l => {
    const papel = _metasNormPapel_(l[1]);
    if (_histEmpChave_(l[0]) === alvoMega && papel && String(l[3] || '').trim() !== '' && papeis.indexOf(papel) < 0) {
      papeis.push(papel);
    }
  });
  Logger.log('Metas (' + getProjetoAtivo().nome + '): papéis encontrados → ' + JSON.stringify(papeis));
  return papeis;
}

// Tendência de uma célula: um único selo (indicador simples) ou dois selos
// concatenados com "/" quando o indicador é composto (ex.: Custo M² tem a
// tendência do R$ e a da % de manutenções planejadas juntas — delta2/
// menorMelhor2 vindos de obterMetaAuto_). Retorna os segmentos SEPARADOS
// (cada um com sua própria cor) em vez de já juntar num texto único: um
// indicador composto pode ter uma parte boa (verde) e outra ruim (vermelha)
// ao mesmo tempo — juntar tudo numa cor só escondia a parte ruim.
function _metasTrend_(auto) {
  const t1 = tendenciaTexto_(auto.delta, auto.menorMelhor);
  if (auto.delta2 == null || isNaN(auto.delta2)) {
    return t1.txt ? { segmentos: [t1] } : null;
  }
  const t2 = tendenciaTexto_(auto.delta2, auto.menorMelhor2);
  const segmentos = [t1, t2].filter(s => s.txt);
  return segmentos.length ? { segmentos: segmentos } : null;
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

  const alvoMega  = _histEmpChave_(getProjetoAtivo().nome);
  const alvoPapel = _metasNormPapel_(papel);
  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();

  const filtradas = dados.filter(l =>
    _histEmpChave_(l[0]) === alvoMega &&
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
    // [6]=Real Mês (meta em [5]) · [9]=Real Acum. (meta em [8]). Alguns
    // indicadores (Cumprir Orçamento) também calculam a própria Meta
    // (metaValor) — nesse caso sobrescrevemos [5]/[8] também, e o motor de
    // status (Real vs Meta pelo Sentido) já sai correto sem digitação manual.
    const autoMes = obterMetaAuto_(descricao, linha[5], 'mes');
    if (autoMes) {
      if (autoMes.metaValor != null) linha[5] = autoMes.metaValor;
      linha[6] = autoMes.valor;
      // O Status Mês manual (linha[7]) foi digitado na Gestão à Vista TV em
      // cima do Real DELA, que acabamos de substituir pelo nosso valor
      // calculado — se deixarmos o manual, ele pode ficar Verde com um Real
      // que já não é o mostrado (ex.: Check-list/SLA: TV tinha outro Real
      // quando marcou Verde, recalculamos e deu 89,13% < meta 90%, mas o
      // status ficava Verde do jeito antigo). Limpa pra forçar recálculo
      // (_metasStatusCelula_) a partir do Real que está de fato na tela.
      linha[7] = '';
      linha._trendMes = _metasTrend_(autoMes);
    }
    const autoAcum = obterMetaAuto_(descricao, linha[8], 'acum');
    if (autoAcum) {
      if (autoAcum.metaValor != null) linha[8] = autoAcum.metaValor;
      linha[9] = autoAcum.valor;
      linha[10] = '';   // mesmo motivo do Status Mês acima, só que pro acumulado
      linha._trendAcum = _metasTrend_(autoAcum);
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

  // Larguras das colunas — a tabela usa praticamente o slide inteiro
  // (margem de 6pt de cada lado). Dimensionadas para o conteúdo caber em
  // UMA linha (fonte 7,5pt nos dados), já contando o recuo interno (~7pt)
  // das caixas de texto do Slides: "Pontos" 54pt, "SIM/NÃO" 62pt,
  // "Procedimentos" 76pt, "R$ 4,21/80%" 68pt. Só a Descrição quebra
  // linha (é esperado). O comparativo ▲/▼ NÃO entra na largura: é uma
  // caixa sobreposta, centralizada ACIMA do valor (ver loop das linhas).
  const pesos  = [114, 54, 76, 62, 46, 68, 66, 44, 68, 66, 44];
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
  const rowH = Math.max(20, Math.min(78, Math.floor(dispH / Math.max(1, n))));

  metas.linhas.forEach((linha, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS.colors.cardBg : '#F8FAFC';

    // Identifica se é estritamente a linha composta de Custo M² + Manutenções Planejadas do SUPERVISOR
    const d0 = _histNorm_(linha[0]);
    const ehComposta = (metas.papel === 'SUPERVISOR') &&
                       d0.includes('custo') &&
                       (d0.includes('m2') || d0.includes('m²')) &&
                       String(linha[5] || '').includes('/');

    const subH = Math.floor(rowH / 2);
    const y1 = ry;
    const y2 = ry + subH;
    const h1 = subH;
    const h2 = rowH - subH;

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
          // Divisória horizontal sutil entre as 2 sublinhas
          const linhaDiv = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry + subH, larg[c], 1);
          linhaDiv.getFill().setSolidFill('#E2E8F0');
          linhaDiv.getBorder().setTransparent();

          let val1 = '', val2 = '';
          if (c === 0) {
            val1 = 'CUSTO M² MEGAS';
            val2 = '80% DAS MANUT PLANEJADAS';
          } else if (c === 3) {
            val1 = 'R$';
            val2 = '%';
          } else if (c === 4) {
            val1 = '<=';
            val2 = '>=';
          } else {
            const partes = valStr.split('/').map(s => s.trim());
            val1 = partes[0] || '-';
            val2 = partes[1] || (c === 5 || c === 8 ? '80%' : '0%');
          }

          if (c === 0) {
            // Sublinha 1 (Descrição: CUSTO M² MEGAS)
            const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 4, y1, larg[c] - 6, h1);
            t1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const tr1 = t1.getText();
            tr1.setText(val1);
            tr1.getTextStyle().setFontSize(7).setBold(true).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tr1.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);

            // Sublinha 2 (Descrição: 80% DAS MANUT PLANEJADAS - mesmo estilo e negrito)
            const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 4, y2, larg[c] - 6, h2);
            t2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const tr2 = t2.getText();
            tr2.setText(val2);
            tr2.getTextStyle().setFontSize(7).setBold(true).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tr2.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
          } else if (c === 6 || c === 9) {
            // Sublinhas de Real (com comparativos ▲/▼ independentes)
            const seg1 = trend && trend.segmentos ? trend.segmentos[0] : null;
            const seg2 = trend && trend.segmentos ? trend.segmentos[1] : null;

            // Sublinha 1 Real
            if (seg1 && seg1.txt) {
              const selo1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], y1 + 1, larg[c], 9);
              selo1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
              const ts1 = selo1.getText();
              ts1.setText(seg1.txt);
              ts1.getTextStyle().setFontSize(5.5).setBold(true).setForegroundColor(seg1.cor).setFontFamily(DS.typography.titles);
              ts1.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
            }
            const tb1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y1 + (seg1 && seg1.txt ? 6 : 0), larg[c] - 2, h1 - (seg1 && seg1.txt ? 6 : 0));
            tb1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const trb1 = tb1.getText();
            trb1.setText(val1);
            trb1.getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            trb1.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

            // Sublinha 2 Real
            if (seg2 && seg2.txt) {
              const selo2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], y2 + 1, larg[c], 9);
              selo2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
              const ts2 = selo2.getText();
              ts2.setText(seg2.txt);
              ts2.getTextStyle().setFontSize(5.5).setBold(true).setForegroundColor(seg2.cor).setFontFamily(DS.typography.titles);
              ts2.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
            }
            const tb2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y2 + (seg2 && seg2.txt ? 6 : 0), larg[c] - 2, h2 - (seg2 && seg2.txt ? 6 : 0));
            tb2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const trb2 = tb2.getText();
            trb2.setText(val2);
            trb2.getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            trb2.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
          } else {
            // Sublinha 1 (Unidade, Sentido, Meta)
            const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y1, larg[c] - 2, h1);
            t1.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const tr1 = t1.getText();
            tr1.setText(val1);
            tr1.getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tr1.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

            // Sublinha 2 (Unidade, Sentido, Meta)
            const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y2, larg[c] - 2, h2);
            t2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
            const tr2 = t2.getText();
            tr2.setText(val2);
            tr2.getTextStyle().setFontSize(7).setBold(false).setFontFamily(DS.typography.body).setForegroundColor(DS.colors.textMain);
            tr2.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
          }
        } else {
          // Indicador Simples (linha normal)
          if (!valStr || valStr === 'undefined' || valStr === 'null') valStr = (c === 0 ? '—' : '-');
          const temTrend = !!(trend && trend.segmentos && trend.segmentos.length && valStr !== '-' && valStr !== '—');

          const folga = c === 0 ? 0 : 10;
          const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 3 - folga, ry, larg[c] - 6 + folga * 2, rowH);
          t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
          const tr = t.getText();
          tr.setText(valStr);
          tr.getTextStyle().setFontSize(c === 0 ? 8 : 7.5).setBold(c === 0).setFontFamily(DS.typography.body)
            .setForegroundColor(DS.colors.textMain);
          tr.getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);

          if (temTrend) {
            const textoCompleto = trend.segmentos.map(s => (s && s.txt) || '').filter(Boolean).join(' / ');
            if (textoCompleto) {
              const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
                xs[c], ry + 2, larg[c], 11);
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
                  tsr.getRange(offset, offset + 3).getTextStyle().setForegroundColor(CORES.textGray);
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


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoMetasCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlidesMetas(); }
function gerarSoMetasItajai()   { setProjetoAtivo('ITAJAI');   gerarSlidesMetas(); }
function gerarSoMetasEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlidesMetas(); }

function gerarSoMetasSupervisorCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideMetas('SUPERVISOR'); }
function gerarSoMetasAnalistaCuritiba()   { setProjetoAtivo('CURITIBA'); gerarSlideMetas('ANALISTA'); }

function gerarSoMetasSupervisorItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideMetas('SUPERVISOR'); }
function gerarSoMetasAnalistaItajai()     { setProjetoAtivo('ITAJAI');   gerarSlideMetas('ANALISTA'); }

function gerarSoMetasSupervisorEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideMetas('SUPERVISOR'); }
function gerarSoMetasAnalistaEsteio()     { setProjetoAtivo('ESTEIO');   gerarSlideMetas('ANALISTA'); }

/**
 * Utilitário para listar no log todas as linhas da aba METAS da TV
 */
function listarLinhasMetasTV() {
  try {
    const ss  = SpreadsheetApp.openById(GESTAO_TV_METAS_SPREADSHEET_ID);
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

// ==========================================
// METAS ESTRATÉGICAS — MEGA CURITIBA
// ==========================================
/**
 * ARQUIVO: Slide_MetasGuilherme.gs
 * SLIDES — METAS GUILHERME
 * DESCRIÇÃO: Conjunto avulso de 4 slides com atualização das metas do
 * Guilherme para o Mega Curitiba, seguindo o design system Capital Realty.
 */

function gerarSlidesMetasGuilherme() {
  _mgGarantirProjetoCuritiba_();
  _gerarSlideUtilitiesMegaCuritiba_();
  _gerarSlideProgramaExcelencia2026_();
  _gerarSlideIntegracaoAreas_();
  _gerarSlideControleReembolsos_();
}

function _mgGarantirProjetoCuritiba_() {
  try {
    getProjetoAtivo();
  } catch (e) {
    setProjetoAtivo('CURITIBA');
  }
}

function _mgCriarSlide_(titulo, subtitulo) {
  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  criarHeaderPadrao(slide, titulo, subtitulo || 'Metas Guilherme · Mega Curitiba');
  return { deck: deck, slide: slide, W: deck.getPageWidth(), H: deck.getPageHeight(), DS: CR_DESIGN_SYSTEM };
}

function _mgText_(slide, txt, x, y, w, h, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  box.getText().setText(String(txt || '')).getTextStyle()
    .setFontSize(opts.size || 10)
    .setBold(!!opts.bold)
    .setForegroundColor(opts.color || DS.colors.textBody)
    .setFontFamily(opts.family || DS.typography.body);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(opts.align || SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(opts.lineSpacing || 118);
  if (opts.valign) box.setContentAlignment(opts.valign);
  return box;
}

function _mgPill_(slide, label, x, y, w, h, color) {
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  pill.getFill().setSolidFill(color);
  pill.getBorder().setTransparent();
  _mgText_(slide, label, x, y + 1, w, h - 2, {
    size: 7.5, bold: true, color: '#FFFFFF', family: CR_DESIGN_SYSTEM.typography.titles,
    align: SlidesApp.ParagraphAlignment.CENTER, valign: SlidesApp.ContentAlignment.MIDDLE
  });
}

function _mgCardTexto_(slide, x, y, w, h, titulo, corpo, cor) {
  const bodyY = criarCardPainel(slide, x, y, w, h, titulo, cor || CR_DESIGN_SYSTEM.colors.brandLight);
  _mgText_(slide, corpo, x + 18, bodyY, w - 34, h - (bodyY - y) - 10, {
    size: 9.2, color: CR_DESIGN_SYSTEM.colors.textBody, lineSpacing: 125
  });
}

function _mgChecklist_(slide, itens, x, y, w, gap, cor) {
  itens.forEach((item, i) => {
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + 1, 10, 10);
    dot.getFill().setSolidFill(cor || CR_DESIGN_SYSTEM.colors.brandLight);
    dot.getBorder().setTransparent();
    _mgText_(slide, item, x + 16, cy - 1, w - 16, 18, { size: 8.8, color: CR_DESIGN_SYSTEM.colors.textMain });
  });
}

function _mgTimeline_(slide, etapas, x, y, w, ativoAte) {
  const DS = CR_DESIGN_SYSTEM;
  const n = etapas.length;
  const step = w / (n - 1);
  const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, y + 16, x + w, y + 16);
  line.getLineFill().setSolidFill(DS.colors.lines);
  line.setWeight(3);

  etapas.forEach((etapa, i) => {
    const cx = x + step * i;
    const done = i <= ativoAte;
    const color = done ? DS.colors.accentGreen : (i === ativoAte + 1 ? DS.colors.brandLight : DS.colors.lines);
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 13, y + 3, 26, 26);
    dot.getFill().setSolidFill(color);
    dot.getBorder().setTransparent();
    _mgText_(slide, done ? '✓' : String(i + 1), cx - 13, y + 5, 26, 18, {
      size: 9, bold: true, color: done || i === ativoAte + 1 ? '#FFFFFF' : DS.colors.textBody,
      family: DS.typography.titles, align: SlidesApp.ParagraphAlignment.CENTER,
      valign: SlidesApp.ContentAlignment.MIDDLE
    });
    _mgText_(slide, etapa, cx - 45, y + 38, 90, 28, {
      size: 7.4, bold: i <= ativoAte + 1, color: DS.colors.textMain,
      family: DS.typography.body, align: SlidesApp.ParagraphAlignment.CENTER
    });
  });
}

function _gerarSlideUtilitiesMegaCuritiba_() {
  const ctx = _mgCriarSlide_('PLATAFORMA DE UTILITIES MEGA CURITIBA', 'Monitoramento de bombas, energia, geração e consumo');
  const slide = ctx.slide, DS = ctx.DS;

  criarCardKPI(slide, 30, 86, 165, 72, { label: 'STATUS', valor: 'Em trânsito', cor: DS.colors.brandLight, tamValor: 18, sub: 'Equipamentos a caminho', corSub: DS.colors.textBody });
  criarCardKPI(slide, 211, 86, 140, 72, { label: 'DOCUMENTAÇÃO', valor: 'NF emitida', cor: DS.colors.accentGreen, tamValor: 18 });
  _mgCardTexto_(slide, 367, 86, 323, 108, 'PRÓXIMOS PASSOS', '• Orçamento com João Lenon para instalação\n• Assinatura do contrato\n• Proposta para monitoramento dos pontos de energia, geração e consumo', DS.colors.brandMed);

  _mgCardTexto_(slide, 30, 214, 660, 94, 'LINHA DO TEMPO DO PROJETO', '', DS.colors.brandLight);
  _mgTimeline_(slide, ['NF emitida', 'Equipamentos a caminho', 'Orçamento instalação', 'Contrato', 'Monitoramento energia'], 82, 250, 556, 1);
}

function _gerarSlideProgramaExcelencia2026_() {
  const ctx = _mgCriarSlide_('PROGRAMA DE EXCELÊNCIA 2026', 'Book, divulgação, inspeção in loco e pontuação');
  const slide = ctx.slide, DS = ctx.DS;

  _mgCardTexto_(slide, 30, 86, 210, 105, 'STATUS GERAL', 'Vencedor de 2025 já divulgado.\n\nBook 2026 em finalização para envio aos Megas até o início do próximo mês.', DS.colors.accentGreen);
  _mgCardTexto_(slide, 255, 86, 205, 105, 'PRÓXIMA FASE', 'Inspeção in loco.\n\nAtenção para contabilizar os pontos do in loco até setembro.', DS.colors.accentOrange);

  const calX = 482, calY = 86, calW = 208, calH = 105;
  const contentY = criarCardPainel(slide, calX, calY, calW, calH, 'CALENDÁRIO ATÉ MÊS 09', DS.colors.brandLight);
  for (let i = 1; i <= 9; i++) {
    const col = (i - 1) % 3, row = Math.floor((i - 1) / 3);
    const x = calX + 22 + col * 54, y = contentY + 3 + row * 19;
    const active = i === 9;
    _mgPill_(slide, String(i).padStart(2, '0'), x, y, 34, 14, active ? DS.colors.accentOrange : DS.colors.brandLight);
  }

  _mgCardTexto_(slide, 30, 213, 660, 96, 'FLUXO 2026', '', DS.colors.brandMed);
  _mgTimeline_(slide, ['Book', 'Divulgação', 'Inspeção', 'Pontuação'], 120, 249, 480, 1);
}

function _gerarSlideIntegracaoAreas_() {
  const ctx = _mgCriarSlide_('INTEGRAÇÃO DAS ÁREAS: FACILITIES, FINANCEIRO E JURÍDICO', 'Dados integrados para criação de visualização gerencial');
  const slide = ctx.slide, DS = ctx.DS;

  const areas = [
    { nome: 'Facilities', status: 'Área integradora', cor: DS.colors.brandLight, x: 270, y: 105 },
    { nome: 'Financeiro', status: 'Concluído via plataforma financeira dos Megas', cor: DS.colors.accentGreen, x: 55, y: 210 },
    { nome: 'Jurídico', status: 'Pendente: liberação de dados sem definição clara', cor: DS.colors.accentOrange, x: 485, y: 210 }
  ];

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 230, 237, 270, 153).getLineFill().setSolidFill(DS.colors.lines);
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 485, 237, 450, 153).getLineFill().setSolidFill(DS.colors.lines);

  areas.forEach(a => {
    const cardY = criarCardPainel(slide, a.x, a.y, 180, 74, a.nome.toUpperCase(), a.cor);
    _mgText_(slide, a.status, a.x + 18, cardY + 2, 144, 34, { size: 8.4, color: DS.colors.textBody, align: SlidesApp.ParagraphAlignment.CENTER });
  });

  _mgCardTexto_(slide, 30, 323, 660, 70, 'PRÓXIMO PASSO', 'Alinhar o formato dos dados necessários para criar uma visualização integrada entre Facilities, Financeiro e Jurídico.', DS.colors.brandMed);
}

function _gerarSlideControleReembolsos_() {
  const ctx = _mgCriarSlide_('MELHORIA NA SOLICITAÇÃO E CONTROLE DOS REEMBOLSOS', 'Entrevistas, pendências e apoio para mapear o fluxo financeiro');
  const slide = ctx.slide, DS = ctx.DS;

  _mgCardTexto_(slide, 30, 86, 205, 220, 'CONCLUÍDO', '', DS.colors.accentGreen);
  _mgChecklist_(slide, ['Wilson entrevistado', 'Cadu entrevistado', 'Jonatas entrevistado'], 55, 132, 150, 31, DS.colors.accentGreen);

  _mgCardTexto_(slide, 258, 86, 205, 220, 'PENDENTE', '', DS.colors.accentOrange);
  _mgChecklist_(slide, ['Ernani', 'Ricardo'], 283, 132, 150, 34, DS.colors.accentOrange);

  _mgCardTexto_(slide, 485, 86, 205, 220, 'APOIO RH', '', DS.colors.brandLight);
  _mgChecklist_(slide, ['Envolver RH', 'Apoiar entrevistas com o time financeiro', 'Consolidar aprendizados para o novo fluxo'], 510, 132, 150, 31, DS.colors.brandLight);

  _mgCardTexto_(slide, 30, 325, 660, 64, 'OBJETIVO DO FUNIL', 'Separar entrevistas concluídas, pendentes e apoios necessários para redesenhar a solicitação e o controle dos reembolsos.', DS.colors.brandMed);
}


// ==========================================
// PONTO DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoMetasGuilherme() { setProjetoAtivo('CURITIBA'); gerarSlidesMetasGuilherme(); }

// ==========================================
// FAROL DE METAS DE GESTÃO (GUILHERME)
// ==========================================
/**
 * Farol de Metas de Planejamento & Gestão (Guilherme August Padilha
 * Marques): a tabela do farol, 4 slides de detalhe (um por meta) e o slide
 * de Projetos em Andamento — para apresentar ao gestor. Vai para uma
 * apresentação própria, fixa por ID (FAROL_DECK_ID), não para o deck das
 * cidades.
 *
 * Existe também uma versão AUTÔNOMA deste código (Farol_Guilherme.gs), feita
 * para colar sozinha num projeto vazio. Ela NÃO pode ser colada neste
 * projeto: declara de novo DS_G, FAROL_DECK_ID e as helpers de medição que
 * já estão aqui e em 00_Helpers.gs, e o "SyntaxError: Identifier 'DS_G' has
 * already been declared" para o projeto inteiro antes de qualquer linha
 * rodar. Atualizou o Farol? Traga as mudanças para ESTA seção.
 *
 * PODE RODAR QUANTAS VEZES QUISER: cada slide é marcado nas anotações do
 * apresentador com uma etiqueta (FAROL_TAG) e, antes de desenhar, os
 * slides com a mesma etiqueta são removidos. Slides criados à mão não têm
 * etiqueta e nunca são tocados.
 *
 * Todo texto passa por _gUmaLinha_ / _gParagrafo_ (em 00_Helpers.gs), que
 * medem o texto antes de desenhar — nenhuma caixa estoura quando o
 * conteúdo muda. Ver a skill .claude/skills/slides-caixa-texto-sem-quebra.
 */

const DS_G = {
  colors: {
    brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
    brandSoft: '#E9F0FA',
    bgSlide: '#F6F8FC', white: '#FFFFFF',
    textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC',
    line: '#E4EAF3', lineStrong: '#CBD5E4',
    // *Bg = tom suave (fundo de card); *Solid = tom cheio (pill, bolinha,
    // farol). O par existe pra que fundo e sinal nunca briguem por atenção.
    amberBg: '#FDF1D2', amberInk: '#7A5B00', amberSolid: '#E5A417',
    greenBg: '#DEF4E9', greenInk: '#0B5C34', greenSolid: '#1E9E62',
    redBg: '#FCE8E8', redInk: '#8C1D1D', redSolid: '#D64545'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  // Logo Capital Realty (mesmo ID usado nas apresentações mensais dos Megas)
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32
};

// Apresentação "Farol de Metas" — fixa por ID (não depende de o script
// estar vinculado ao arquivo nem de haver uma apresentação "ativa").
const FAROL_DECK_ID = '125XfdWiYis2J7nACFLxUVI5f0Tv6Zb85On74Nl2-LZI';

// Etiqueta gravada nas anotações do apresentador de todo slide que este
// script desenha. É o que permite rodar de novo sem duplicar: antes de
// desenhar, quem tem a etiqueta sai. Fica nas ANOTAÇÕES (e não numa shape
// escondida) porque ali ninguém esbarra por acidente e não aparece na
// projeção.
//
// Cada slide leva a etiqueta geral + um sufixo próprio, então dá para
// regerar um slide só sem mexer nos outros — é como
// gerarProjetosPlanejamentoGestao() substitui apenas o seu.
const FAROL_TAG = '[FAROL-PEG]';
const FAROL_TAGS = {
  tabela:   FAROL_TAG + ' TABELA',
  meta1:    FAROL_TAG + ' META1',
  meta2:    FAROL_TAG + ' META2',
  meta3:    FAROL_TAG + ' META3',
  meta4:    FAROL_TAG + ' META4',
  projetos: FAROL_TAG + ' PROJETOS'
};

// Mês de referência do Farol. Fica num lugar só: o título do slide 1 e o
// calendário da Meta 2 (meses já decorridos) saem daqui.
const FAROL_MES_NOME = 'MAIO';
const FAROL_MES_NUM  = 5;

// Pontuação oficial — Painel de Metas CR 2026, Planejamento & Gestão, aba
// GUILHERME MARQUES (coluna PONTOS, linhas 7 a 10). Soma 100.
// A tabela do slide 1 e a pastilha de pontos do header de cada meta leem
// daqui, então os dois nunca divergem.
const FAROL_PONTOS = { meta1: 30, meta2: 25, meta3: 25, meta4: 20 };

// Mínimo para elegibilidade, igual ao Farol dos Megas (Slide_Metas.gs).
const FAROL_PONTOS_ELEGIVEL = 50;

// Grade de layout — todos os slides respeitam as mesmas margens, então os
// blocos se alinham de um slide pro outro.
const G_MX  = 32;   // margem lateral
const G_TOP = 72;   // topo do conteúdo (logo abaixo do header)

// Fim da área de conteúdo e topo da faixa de rodapé, a partir da altura da
// página (funciona em 16:9 e 4:3).
function _gFimConteudo_(H) { return H - 55; }
function _gTopoRodape_(H)  { return H - 47; }

function gerarFarolGuilherme() {
  const deck = SlidesApp.openById(FAROL_DECK_ID);

  // Cada slide já remove a própria versão anterior dentro de _gNovoSlide, pela
  // sua etiqueta. Esta chamada aqui é para o caso de um sufixo ter deixado de
  // existir (um slide removido do roteiro): a etiqueta GERAL casa com todos,
  // então nada antigo fica órfão no meio do deck.
  const removidos = _gLimparEtiquetados_(deck, FAROL_TAG);

  _gFarolSlideTabela(deck);
  _gFarolSlideMeta1(deck);
  _gFarolSlideMeta2(deck);
  _gFarolSlideMeta3(deck);
  _gFarolSlideMeta4(deck);
  _gSlideProjetosPeG(deck);

  Logger.log('Farol de Metas — Guilherme: 6 slides gerados' +
    (removidos ? ' (' + removidos + ' da execução anterior foram substituídos).' : '.'));
}

// Só o slide de Projetos em Andamento, para atualizar o status dos projetos
// sem regerar o Farol inteiro. Sem argumento de propósito: é assim que ele
// aparece no menu "Selecionar função" do editor.
function gerarProjetosPlanejamentoGestao() {
  const deck = SlidesApp.openById(FAROL_DECK_ID);
  _gSlideProjetosPeG(deck);
  Logger.log('Projetos em Andamento — Planejamento & Gestão: slide atualizado.');
}


// ==========================================
// DIAGNÓSTICO — RODE ISTO PRIMEIRO
// ==========================================
// Mesmo espírito do diagnosticarBacklog() dos Megas: antes de desenhar
// qualquer coisa, dizer se a configuração está de pé e o que vai sair.
// Não escreve nada na apresentação — dá para rodar sem medo.
//
// Sem sufixo `_` de propósito: função cujo nome começa ou termina com `_`
// não aparece no menu "Selecionar função" do editor, e diagnóstico que não
// dá para rodar não serve de nada.
function diagnosticarFarol() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — Farol de Metas · Planejamento & Gestão');
  Logger.log('======================================================');

  const pend = [];
  let deck = null;

  Logger.log('\nApresentação de destino:');
  try {
    deck = SlidesApp.openById(FAROL_DECK_ID);
    Logger.log('  ✓ "' + deck.getName() + '" — ' + deck.getSlides().length + ' slides, ' +
               Math.round(deck.getPageWidth()) + '×' + Math.round(deck.getPageHeight()) + 'pt');
  } catch (e) {
    Logger.log('  ✗ não abriu: ' + e.message);
    Logger.log('    Confira FAROL_DECK_ID e se a conta que roda o script tem acesso.');
    pend.push('apresentação inacessível');
  }

  if (deck) {
    Logger.log('\nSlides já etiquetados por este script (serão SUBSTITUÍDOS):');
    let achou = 0;
    Object.keys(FAROL_TAGS).forEach(k => {
      const n = _gContarEtiquetados_(deck, FAROL_TAGS[k]);
      achou += n;
      Logger.log('  · ' + k + ': ' + (n === 0 ? 'nenhum (será criado)'
                 : n + (n > 1 ? ' — DUPLICADO, os ' + n + ' saem e volta 1' : '')));
    });
    // Slides sem etiqueta nenhuma: ou são seus, ou sobraram de uma execução
    // anterior à etiqueta existir. O script não mexe neles — e é exatamente
    // por isso que precisam aparecer aqui.
    const semTag = deck.getSlides().length - achou;
    Logger.log('  Outros ' + semTag + ' slide(s) sem etiqueta — este script NÃO toca neles.');
    if (achou === 0 && semTag > 0) {
      Logger.log('    ⚠ Se esses slides forem Farol de uma execução antiga, apague-os à');
      Logger.log('      mão UMA vez: eles são anteriores à etiqueta e ficariam repetidos.');
    }
  }

  Logger.log('\nLogo Capital Realty:');
  try {
    const nome = DriveApp.getFileById(DS_G.logoId).getName();
    Logger.log('  ✓ "' + nome + '"');
  } catch (e) {
    Logger.log('  · não acessível — os slides saem sem logo, o resto funciona. ' + e.message);
  }

  Logger.log('\nConteúdo configurado:');
  const totalPontos = FAROL_PONTOS.meta1 + FAROL_PONTOS.meta2 +
                      FAROL_PONTOS.meta3 + FAROL_PONTOS.meta4;
  Logger.log('  · Mês do Farol: ' + FAROL_MES_NOME + ' (nº ' + FAROL_MES_NUM + ')');
  Logger.log('  · Metas: 4, somando ' + totalPontos + ' pontos' +
             (totalPontos === 100 ? '' : ' — ⚠ deveria somar 100'));
  if (totalPontos !== 100) pend.push('pontuação das metas soma ' + totalPontos + ', não 100');

  const frentes = PEG_PROJETOS.reduce((a, p) => a.concat(p.frentes), []);
  Logger.log('  · Projetos: ' + PEG_PROJETOS.length + ' (' + PEG_REFERENCIA + '), ' +
             frentes.length + ' frentes');
  PEG_PROJETOS.forEach((p, i) => {
    Logger.log('      ' + (i + 1) + '. ' + p.nome + ' — ' + _pegCor_(_pegEstadoProjeto_(p)).rotulo);
    p.frentes.forEach(f => {
      Logger.log('         · ' + f.nome + ' [' + f.estado + ']' +
                 (f.aguardando ? ' aguardando ' + f.aguardando : '') +
                 ((f.marcos || []).length ? ' · ' + f.marcos.map(m => m.data).join(', ') : ''));
    });
  });

  Logger.log('\n' + (pend.length
    ? 'PENDÊNCIAS (' + pend.length + '):\n    ' + pend.join('\n    ')
    : 'Tudo certo. Rode gerarFarolGuilherme().'));
}


// ==========================================
// IDEMPOTÊNCIA — ETIQUETA NAS ANOTAÇÕES
// ==========================================

// Slides cuja anotação do apresentador contém `tag`.
//
// O try/catch não é decoração: slide sem anotação nenhuma faz
// getSpeakerNotesShape() devolver null em vez de shape vazia, e um layout
// sem notas chega a lançar. Nos dois casos a resposta certa é "não é nosso",
// nunca abortar — senão um slide alheio no meio do deck impediria o Farol
// de rodar.
function _gSlidesComTag_(deck, tag) {
  return deck.getSlides().filter(s => {
    try {
      const shape = s.getNotesPage().getSpeakerNotesShape();
      return !!shape && shape.getText().asString().indexOf(tag) >= 0;
    } catch (e) {
      return false;
    }
  });
}

function _gContarEtiquetados_(deck, tag) {
  return _gSlidesComTag_(deck, tag).length;
}

// Remove os slides etiquetados e devolve quantos saíram. getSlides() devolve
// uma cópia da lista, então dá para remover enquanto percorre.
function _gLimparEtiquetados_(deck, tag) {
  const alvos = _gSlidesComTag_(deck, tag);
  alvos.forEach(s => s.remove());
  return alvos.length;
}

// Grava a etiqueta. Se falhar (permissão, layout sem notas), o slide sai
// certo do mesmo jeito — só não será substituído na próxima execução, o que
// é bem menos grave que abortar o desenho por causa de uma anotação.
function _gEtiquetar_(slide, tag) {
  try {
    const shape = slide.getNotesPage().getSpeakerNotesShape();
    if (shape) {
      shape.getText().setText(tag +
        '\nGerado por Farol_Guilherme.gs — esta linha marca o slide para ser ' +
        'substituído na próxima execução. Apagar a linha faz o slide virar ' +
        'permanente (e a próxima execução criar outro ao lado).');
    }
  } catch (e) {
    Logger.log('Aviso: não consegui etiquetar o slide ' + tag + '. ' + e.message);
  }
}


// ==========================================
// MEDIÇÃO DE TEXTO — em 00_Helpers.gs
// ==========================================
// _G_FATOR_FONTE, _G_RECUO_TEXTBOX, _gLarguraTexto_, _gLinhasTexto_,
// _gUmaLinha_ e _gParagrafo_ ficam em 00_Helpers.gs (o resto do projeto
// também usa). Não declare de novo aqui.


// ==========================================
// HEADER E RODAPÉ PADRÃO
// ==========================================
// Remove a versão anterior DESTE slide (pela etiqueta) e devolve uma página
// nova, em branco, já etiquetada. É o único lugar que cria slide, então a
// regra de "não duplicar" vale para os seis sem ninguém precisar lembrar.
function _gNovoSlide(deck, tag) {
  if (tag) _gLimparEtiquetados_(deck, tag);
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_G.colors.bgSlide);
  if (tag) _gEtiquetar_(slide, tag);
  return slide;
}

// Título + "chips" de contexto (meta, pontos, direcionador, prazo). Os chips
// substituem a antiga linha de subtítulo corrida: cada informação vira uma
// pastilha do tamanho exato do seu texto.
function _gHeader(slide, W, titulo, chips) {
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, 11, 5, 34);
  bar.getFill().setSolidFill(DS_G.colors.brandLight); bar.getBorder().setTransparent();

  // Largura do título limitada pela área do logo, pra nunca invadi-la.
  const tituloX = G_MX + 15;
  const tituloW = (W - G_MX - DS_G.logoW - 24) - tituloX;
  _gUmaLinha_(slide, tituloX, 8, tituloW, 26, titulo,
    { fs: 17, fsMin: 11, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });

  let cx = tituloX;
  (chips || []).forEach(txt => {
    const w = _gLarguraTexto_(txt, 7.5, DS_G.typography.body, true) + 18;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, 37, w, 15);
    pill.getFill().setSolidFill(DS_G.colors.brandSoft); pill.getBorder().setTransparent();
    _gUmaLinha_(slide, cx, 37, w, 15, txt,
      { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.brandMed,
        fonte: DS_G.typography.body, folga: 10 });
    cx += w + 6;
  });

  try {
    const logoBlob = DriveApp.getFileById(DS_G.logoId).getBlob();
    slide.insertImage(logoBlob, W - G_MX - DS_G.logoW, 14, DS_G.logoW, DS_G.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
  }

  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 60, W, 60);
  sep.getLineFill().setSolidFill(DS_G.colors.line); sep.setWeight(1);
  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, G_MX, 60, G_MX + 110, 60);
  acc.getLineFill().setSolidFill(DS_G.colors.brandLight); acc.setWeight(3);
}

// Faixa de "próximo passo" no pé do slide — presente nos 4 slides de meta,
// é o que fecha a leitura e dá o mesmo ritmo visual a todos eles.
function _gRodapeNota(slide, W, H, texto) {
  const y = _gTopoRodape_(H), h = 24;
  const faixa = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, G_MX, y, W - 2 * G_MX, h);
  faixa.getFill().setSolidFill(DS_G.colors.brandSoft); faixa.getBorder().setTransparent();
  const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX + 6, y + 5, 3, h - 10);
  acc.getFill().setSolidFill(DS_G.colors.brandLight); acc.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + 18, y, W - 2 * G_MX - 32, h, texto,
    { fs: 8.6, fsMin: 6.5, italic: true, cor: DS_G.colors.brandMed,
      fonte: DS_G.typography.body, align: 'L', folga: 8 });
}


// ==========================================
// COMPONENTES REUTILIZÁVEIS
// ==========================================

// Card branco com borda fina e barra de acento à esquerda (base de quase
// tudo). Devolve o Y onde o conteúdo interno pode começar.
function _gCartao_(slide, x, y, w, h, corAcento, corFundo) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(corFundo || DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);
  if (corAcento) {
    const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 8, 4, h - 16);
    acc.getFill().setSolidFill(corAcento); acc.getBorder().setTransparent();
  }
  return y;
}

// Pastilha de status (texto curto, cor cheia, nunca quebra).
function _gPill_(slide, x, y, w, h, texto, corFundo, corTexto, fs) {
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  pill.getFill().setSolidFill(corFundo); pill.getBorder().setTransparent();
  _gUmaLinha_(slide, x, y, w, h, texto,
    { fs: fs || 6.8, fsMin: 5.5, bold: true, cor: corTexto || DS_G.colors.white,
      fonte: DS_G.typography.body, folga: 12 });
}

// Cartão de KPI: rótulo + valor em destaque + nota. O valor usa _gUmaLinha_,
// então "Em assinatura" (que antes quebrava em duas linhas) cabe inteiro.
function _gKPI(slide, x, y, w, h, label, valor, corInk, sub, corFundo, corAcento) {
  _gCartao_(slide, x, y, w, h, corAcento || corInk, corFundo);
  const px = x + 16, pw = w - 30;
  _gUmaLinha_(slide, px, y + 10, pw, 13, label,
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  _gUmaLinha_(slide, px, y + 25, pw, 26, valor,
    { fs: 17, fsMin: 10, bold: true, cor: corInk, align: 'L', folga: 8 });
  if (sub) {
    _gUmaLinha_(slide, px, y + h - 24, pw, 16, sub,
      { fs: 7.6, fsMin: 6, cor: DS_G.colors.textBody, fonte: DS_G.typography.body,
        align: 'L', folga: 8 });
  }
}

// Painel com barra de título colorida; devolve o Y onde o conteúdo começa.
function _gPainel(slide, x, y, w, h, titulo, cor) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

  const barH = 22;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, barH);
  bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
  _gUmaLinha_(slide, x + 12, y, w - 24, barH, titulo,
    { fs: 8, fsMin: 6, bold: true, cor: DS_G.colors.white, align: 'L', folga: 8 });

  return y + barH + 10;
}

// Lista de itens com bolinha colorida. Cada item é uma linha só (encolhe se
// precisar), então nenhum texto vaza para fora do painel.
function _gChecklist(slide, itens, x, y, w, gap, cor) {
  itens.forEach((item, i) => {
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + (gap - 7) / 2, 7, 7);
    dot.getFill().setSolidFill(cor || DS_G.colors.brandLight); dot.getBorder().setTransparent();
    _gUmaLinha_(slide, x + 13, cy, w - 13, gap, item,
      { fs: 8.4, fsMin: 6.2, cor: DS_G.colors.textMain, fonte: DS_G.typography.body,
        align: 'L', folga: 10 });
  });
}

// Linha do tempo: etapas concluídas em verde com ✓, a próxima em âmbar
// vazado, as demais em cinza claro.
// `limites` = {min, max} em X: os rótulos da primeira e da última etapa são
// centralizados na bolinha e, nas pontas, escapariam da margem do slide —
// aqui eles são encostados no limite em vez de vazar.
function _gTimelineCheck(slide, etapas, x, y, w, doneUntil, limites) {
  const n = etapas.length;
  const step = n > 1 ? w / (n - 1) : 0;
  const lim = limites || { min: G_MX, max: x + w + (x - G_MX) };
  const rail = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 11, w, 3);
  rail.getFill().setSolidFill(DS_G.colors.line); rail.getBorder().setTransparent();

  if (doneUntil >= 0 && n > 1) {
    const feito = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 11,
      Math.min(w, step * doneUntil), 3);
    feito.getFill().setSolidFill(DS_G.colors.greenSolid); feito.getBorder().setTransparent();
  }

  etapas.forEach((txt, i) => {
    const cx = x + step * i;
    const done = i <= doneUntil;
    const proximo = i === doneUntil + 1;
    const fundo = done ? DS_G.colors.greenSolid
                       : (proximo ? DS_G.colors.amberBg : DS_G.colors.white);

    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 12, y, 24, 24);
    dot.getFill().setSolidFill(fundo);
    if (done) {
      dot.getBorder().setTransparent();
    } else {
      dot.getBorder().setWeight(2).getLineFill()
        .setSolidFill(proximo ? DS_G.colors.amberSolid : DS_G.colors.lineStrong);
    }
    _gUmaLinha_(slide, cx - 12, y, 24, 24, done ? '✓' : String(i + 1),
      { fs: 9.5, fsMin: 7, bold: true,
        cor: done ? DS_G.colors.white : (proximo ? DS_G.colors.amberInk : DS_G.colors.textMuted),
        folga: 10 });

    const lw = Math.max(step - 8, 74);
    const lx = Math.min(Math.max(cx - lw / 2, lim.min), lim.max - lw);
    _gParagrafo_(slide, lx, y + 30, lw, 30, txt,
      { fs: 7.6, fsMin: 6.2, bold: done || proximo, align: 'C', espac: 108,
        cor: done || proximo ? DS_G.colors.textMain : DS_G.colors.textMuted });
  });
}


// ==========================================
// SLIDE 1 — FAROL DE METAS (TABELA)
// ==========================================
function _gFarolSlideTabela(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.tabela);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'FAROL DE METAS · ' + FAROL_MES_NOME,
    ['Planejamento & Gestão', 'Guilherme August Padilha Marques', 'Ciclo 2026']);

  // Pontos, direcionador, unidade e sentido saem do Painel de Metas CR 2026
  // (aba GUILHERME MARQUES, linhas 7–10) — somam 100.
  const metas = [
    { desc: 'Plataforma de Utilities Mega Curitiba', pontos: FAROL_PONTOS.meta1, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Programa de Excelência 2026', pontos: FAROL_PONTOS.meta2, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Integração das Áreas — Facilities, Financeiro e Jurídico', pontos: FAROL_PONTOS.meta3, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Melhoria na Solicitação e Controle dos Reembolsos', pontos: FAROL_PONTOS.meta4, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' }
  ];

  // Larguras em fração da tabela (somam 1), pra tabela acompanhar a página.
  const totalW = W - 2 * G_MX;
  const fr = [0.262, 0.061, 0.104, 0.073, 0.061, 0.070, 0.070, 0.079, 0.070, 0.070, 0.080];
  const larg = fr.map(f => f * totalW);
  const xs = []; let acc = G_MX;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = G_TOP;

  // --- Barra de título ---
  const tituloH = 26;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, y, totalW, tituloH);
  barra.getFill().setSolidFill(DS_G.colors.brandMed); barra.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX, y, totalW, tituloH,
    'METAS GUILHERME AUGUST PADILHA MARQUES · PLANEJAMENTO & GESTÃO 2026',
    { fs: 11, fsMin: 8, bold: true, cor: DS_G.colors.white, folga: 12 });
  y += tituloH;

  // --- Cabeçalho das colunas ---
  const cabH = 28;
  const titulosCab = ['ANALISTA DE NEGÓCIOS', 'PONTOS', 'DIRECIONADOR', 'UNIDADE', 'SENTIDO',
    'META MÊS', 'REAL MÊS', 'STATUS', 'META ANO', 'REAL ANO', 'STATUS'];
  titulosCab.forEach((t, c) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], cabH);
    bg.getFill().setSolidFill(DS_G.colors.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.white);
    // Antes "META MÊS"/"REAL ANO" quebravam em duas linhas nesta largura.
    _gUmaLinha_(slide, xs[c] + (c === 0 ? 12 : 2), y, larg[c] - (c === 0 ? 16 : 4), cabH, t,
      { fs: 7.5, fsMin: 5.8, bold: true, cor: DS_G.colors.white,
        align: c === 0 ? 'L' : 'C', folga: c === 0 ? 8 : 11 });
  });
  y += cabH;

  // --- Rodapé (legenda + pontuação) reserva o espaço antes das linhas ---
  const rodH = 30, rodY = H - 19 - rodH;
  const rowH = Math.max(22, Math.min(60, (rodY - 10 - y) / metas.length));

  metas.forEach((m, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS_G.colors.white : '#FAFCFF';
    const linha = [null, String(m.pontos), m.direc, m.unid, m.sent,
                   m.metaMes, m.realMes, null, m.metaAno, m.realAno, null];

    linha.forEach((val, c) => {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      cell.getFill().setSolidFill(ehStatus ? DS_G.colors.amberBg : fundo);
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.line);

      if (ehStatus) {
        // Farol: pastilha de cor cheia, sem texto — a legenda do rodapé
        // explica o código de cores.
        const pw = larg[c] * 0.56, ph = 15;
        const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
          xs[c] + (larg[c] - pw) / 2, ry + (rowH - ph) / 2, pw, ph);
        pill.getFill().setSolidFill(DS_G.colors.amberSolid); pill.getBorder().setTransparent();
      } else if (c > 0) {
        _gUmaLinha_(slide, xs[c] + 2, ry, larg[c] - 4, rowH, val,
          { fs: 8, fsMin: 6.2, cor: DS_G.colors.textMain,
            fonte: DS_G.typography.body, folga: 11 });
      }
    });

    // Coluna da descrição: número da meta em badge + texto em até 2 linhas.
    const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      xs[0] + 10, ry + (rowH - 18) / 2, 18, 18);
    badge.getFill().setSolidFill(DS_G.colors.brandLight); badge.getBorder().setTransparent();
    _gUmaLinha_(slide, xs[0] + 10, ry + (rowH - 18) / 2, 18, 18, String(i + 1),
      { fs: 9, fsMin: 7, bold: true, cor: DS_G.colors.white, folga: 10 });
    _gParagrafo_(slide, xs[0] + 34, ry, larg[0] - 40, rowH, m.desc,
      { fs: 8.4, fsMin: 6.4, bold: true, cor: DS_G.colors.textMain, espac: 112, meio: true });
  });

  // --- Rodapé: legenda do farol à esquerda, pontuação à direita ---
  _gCartao_(slide, G_MX, rodY, totalW, rodH, null);
  const legenda = [
    { cor: DS_G.colors.greenSolid, txt: 'Atingido' },
    { cor: DS_G.colors.amberSolid, txt: 'Em andamento' },
    { cor: DS_G.colors.redSolid,   txt: 'Não atingido' }
  ];
  let lx = G_MX + 16;
  _gUmaLinha_(slide, lx, rodY, 42, rodH, 'FAROL',
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  lx += 46;
  legenda.forEach(l => {
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, lx, rodY + (rodH - 9) / 2, 9, 9);
    dot.getFill().setSolidFill(l.cor); dot.getBorder().setTransparent();
    const tw = _gLarguraTexto_(l.txt, 8, DS_G.typography.body, false) + 6;
    _gUmaLinha_(slide, lx + 14, rodY, tw, rodH, l.txt,
      { fs: 8, fsMin: 6.5, cor: DS_G.colors.textBody, fonte: DS_G.typography.body,
        align: 'L', folga: 8 });
    lx += 14 + tw + 16;
  });

  const totalPontos = metas.reduce((s, m) => s + m.pontos, 0);
  const resumo = totalPontos + ' PONTOS POTENCIAIS · MÍN. ' + FAROL_PONTOS_ELEGIVEL +
                 ' P/ ELEGIBILIDADE';
  const rw = _gLarguraTexto_(resumo, 8.5, DS_G.typography.titles, true) + 28;
  _gPill_(slide, G_MX + totalW - rw - 10, rodY + (rodH - 20) / 2, rw, 20, resumo,
    DS_G.colors.brandMed, DS_G.colors.white, 8.5);

  Logger.log('Farol (tabela) gerado — ' + metas.length + ' metas, ' + totalPontos + ' pontos.');
}


// ==========================================
// SLIDE 2 — PLATAFORMA DE UTILITIES
// ==========================================
function _gFarolSlideMeta1(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.meta1);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Plataforma de Utilities — Mega Curitiba',
    ['Meta 1', FAROL_PONTOS.meta1 + ' pontos', 'Direcionador Projetos', 'Prazo 30/11/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  // --- Linha 1: três cartões de status ---
  const gapK = 14, kpiW = (contW - 2 * gapK) / 3, kpiH = 80;
  _gKPI(slide, G_MX, G_TOP, kpiW, kpiH, 'EQUIPAMENTOS', 'Entregues',
    DS_G.colors.greenInk, 'Já chegaram no Mega Curitiba', DS_G.colors.greenBg, DS_G.colors.greenSolid);
  _gKPI(slide, G_MX + kpiW + gapK, G_TOP, kpiW, kpiH, 'CONTRATO', 'Em assinatura',
    DS_G.colors.amberInk, 'Enviado — aguardando retorno', DS_G.colors.amberBg, DS_G.colors.amberSolid);
  _gKPI(slide, G_MX + 2 * (kpiW + gapK), G_TOP, kpiW, kpiH, 'ORÇAMENTOS', '2 de 3',
    DS_G.colors.amberInk, 'Golden Phone e Eletrobarras', DS_G.colors.amberBg, DS_G.colors.amberSolid);

  // --- Linha 2: resumo da situação ---
  const resY = G_TOP + kpiH + 12, resH = 46;
  _gCartao_(slide, G_MX, resY, contW, resH, DS_G.colors.brandLight);
  _gParagrafo_(slide, G_MX + 20, resY + 6, contW - 40, resH - 12,
    'Equipamentos entregues e contrato já enviado para assinatura. O que corre agora é a ' +
    'equalização dos orçamentos de instalação, para subir a compra com três propostas:',
    { fs: 10.5, fsMin: 8, cor: DS_G.colors.textBody, espac: 124, meio: true });

  // --- Linha 3: os três passos ---
  const steps = [
    { t: 'Orçamentos recebidos', d: 'Golden Phone e Eletrobarras já responderam com proposta.', cor: DS_G.colors.greenSolid },
    { t: 'Equalização em andamento', d: 'Levantando o 3º orçamento para subir a compra com as três propostas.', cor: DS_G.colors.amberSolid },
    { t: 'Assinatura do contrato', d: 'Contrato de instalação enviado — aguardando o retorno assinado.', cor: DS_G.colors.amberSolid }
  ];
  const gap = 16, stepY = resY + resH + 14, stepH = fim - stepY;
  const stepW = (contW - 2 * gap) / 3;

  steps.forEach((s, i) => {
    const x = G_MX + i * (stepW + gap);
    _gCartao_(slide, x, stepY, stepW, stepH, s.cor);
    _gUmaLinha_(slide, x + 18, stepY + 12, 60, 30, '0' + (i + 1),
      { fs: 24, fsMin: 16, bold: true, cor: DS_G.colors.lineStrong, align: 'L', folga: 8 });
    _gUmaLinha_(slide, x + 18, stepY + 46, stepW - 32, 18, s.t,
      { fs: 10.5, fsMin: 8, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });
    _gParagrafo_(slide, x + 18, stepY + 68, stepW - 34, stepH - 80, s.d,
      { fs: 9.6, fsMin: 7.5, cor: DS_G.colors.textBody, espac: 124 });

    if (i < steps.length - 1) {
      _gUmaLinha_(slide, x + stepW, stepY + stepH / 2 - 12, gap, 24, '›',
        { fs: 18, fsMin: 12, bold: true, cor: DS_G.colors.lineStrong, folga: 8 });
    }
  });

  _gRodapeNota(slide, W, H,
    'Próximo passo: fechar o 3º orçamento, equalizar as propostas e destravar a instalação com o contrato assinado.');
  Logger.log('Farol — Meta 1 (Plataforma de Utilities) gerado.');
}


// ==========================================
// SLIDE 3 — PROGRAMA DE EXCELÊNCIA 2026
// ==========================================
function _gFarolSlideMeta2(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.meta2);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Programa de Excelência 2026',
    ['Meta 2', FAROL_PONTOS.meta2 + ' pontos', 'Direcionador Projetos', 'Prazo 30/09/26']);

  const contW = W - 2 * G_MX;
  const gap = 16, colW = (contW - 2 * gap) / 3, rowH = 112;

  // Painel 1 — status geral
  let py = _gPainel(slide, G_MX, G_TOP, colW, rowH, 'STATUS GERAL', DS_G.colors.brandMed);
  _gParagrafo_(slide, G_MX + 14, py, colW - 28, G_TOP + rowH - py - 10,
    'Vencedor de 2025 divulgado. Book 2026 finalizado e submetido à aprovação da Gerência.',
    { fs: 9.2, fsMin: 7.4, cor: DS_G.colors.textBody, espac: 126 });

  // Painel 2 — próxima fase
  const x2 = G_MX + colW + gap;
  py = _gPainel(slide, x2, G_TOP, colW, rowH, 'PRÓXIMA FASE', DS_G.colors.brandMed);
  _gParagrafo_(slide, x2 + 14, py, colW - 28, G_TOP + rowH - py - 10,
    'Com o ok da Gerência: kick off do programa — envio digital e impressão física do book.',
    { fs: 9.2, fsMin: 7.4, cor: DS_G.colors.textBody, espac: 126 });

  // Painel 3 — calendário até o prazo (mês 09). Antes eram pastilhas "01..09";
  // com a sigla do mês a leitura é imediata e o bloco cabe no painel.
  const x3 = x2 + colW + gap;
  py = _gPainel(slide, x3, G_TOP, colW, rowH, 'PRAZO — SETEMBRO/26', DS_G.colors.brandLight);
  const siglas = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET'];
  const cellGap = 6, cellW = (colW - 28 - 2 * cellGap) / 3, cellH = 15;
  siglas.forEach((sig, i) => {
    const mes = i + 1;
    const col = i % 3, lin = Math.floor(i / 3);
    const cx = x3 + 14 + col * (cellW + cellGap), cy = py + lin * (cellH + 5);
    const prazo = mes === 9;
    const passado = mes <= FAROL_MES_NUM;
    const fundo = prazo ? DS_G.colors.amberSolid : (passado ? DS_G.colors.brandSoft : '#EEF2F9');
    const tinta = prazo ? DS_G.colors.white : (passado ? DS_G.colors.brandMed : DS_G.colors.textMuted);
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, cy, cellW, cellH);
    pill.getFill().setSolidFill(fundo); pill.getBorder().setTransparent();
    _gUmaLinha_(slide, cx, cy, cellW, cellH, sig,
      { fs: 6.8, fsMin: 5.5, bold: prazo || passado, cor: tinta, folga: 11 });
  });

  // Linha do tempo. A aprovação da Gerência ainda NÃO saiu (o alerta abaixo
  // diz isso), então as concluídas param no book finalizado — índice 1.
  const tlY = G_TOP + rowH + 26;
  _gTimelineCheck(slide,
    ['Vencedor 2025 divulgado', 'Book 2026 finalizado', 'Aprovação da Gerência',
     'Kick off — envio + impressão', 'Inspeção in loco'],
    G_MX + 66, tlY, contW - 132, 1, { min: G_MX, max: W - G_MX });

  const alertY = tlY + 76, alertH = 52;
  const alert = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, G_MX, alertY, contW, alertH);
  alert.getFill().setSolidFill(DS_G.colors.amberBg); alert.getBorder().setTransparent();
  const accA = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, alertY + 8, 4, alertH - 16);
  accA.getFill().setSolidFill(DS_G.colors.amberSolid); accA.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + 20, alertY + 8, contW - 40, 18, '⏱  DEPENDÊNCIA CRÍTICA',
    { fs: 8, fsMin: 6.5, bold: true, cor: DS_G.colors.amberInk, align: 'L', folga: 8 });
  _gUmaLinha_(slide, G_MX + 20, alertY + 26, contW - 40, 20,
    'O kick off depende do ok da Gerência — e a inspeção in loco precisa estar contabilizada até o MÊS 09.',
    { fs: 10, fsMin: 7.5, bold: true, cor: DS_G.colors.amberInk,
      fonte: DS_G.typography.body, align: 'L', folga: 8 });

  _gRodapeNota(slide, W, H,
    'Próximo passo: obter a aprovação da Gerência para liberar o kick off — envio digital e impressão do book.');
  Logger.log('Farol — Meta 2 (Programa de Excelência) gerado.');
}


// ==========================================
// SLIDE 4 — INTEGRAÇÃO DAS ÁREAS
// ==========================================
function _gFarolSlideMeta3(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.meta3);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Integração das Áreas',
    ['Meta 3', FAROL_PONTOS.meta3 + ' pontos', 'Facilities · Financeiro · Jurídico', 'Prazo 30/11/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  // Facilities é a área integradora: fica no topo, ligando-se às outras duas.
  const hubW = 320, hubH = 58, hubX = (W - hubW) / 2;
  const hpy = _gPainel(slide, hubX, G_TOP, hubW, hubH, 'FACILITIES · ÁREA INTEGRADORA', DS_G.colors.brandLight);
  _gParagrafo_(slide, hubX + 14, hpy, hubW - 28, G_TOP + hubH - hpy - 6,
    'Reúne os dados de Financeiro e Jurídico para consolidar a visão única de gestão.',
    { fs: 8.6, fsMin: 7, cor: DS_G.colors.textBody, espac: 120 });

  const gap = 20, colW = (contW - gap) / 2;
  const colY = G_TOP + hubH + 24, colH = fim - colY;

  // Linhas ligando o hub às duas colunas
  const lEsq = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    hubX + hubW * 0.28, G_TOP + hubH, G_MX + colW * 0.5, colY);
  lEsq.getLineFill().setSolidFill(DS_G.colors.lineStrong); lEsq.setWeight(1.5);
  const lDir = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    hubX + hubW * 0.72, G_TOP + hubH, G_MX + colW + gap + colW * 0.5, colY);
  lDir.getLineFill().setSolidFill(DS_G.colors.lineStrong); lDir.setWeight(1.5);

  const _col = (x, corBg, corInk, corSolid, status, titulo, corpo, itens) => {
    _gCartao_(slide, x, colY, colW, colH, corSolid, corBg);

    const chipW = _gLarguraTexto_(status, 7, DS_G.typography.body, true) + 22;
    _gPill_(slide, x + 20, colY + 16, chipW, 16, status, corSolid, DS_G.colors.white, 7);
    _gUmaLinha_(slide, x + 20, colY + 38, colW - 40, 26, titulo,
      { fs: 17, fsMin: 12, bold: true, cor: corInk, align: 'L', folga: 8 });
    _gParagrafo_(slide, x + 20, colY + 68, colW - 40, 62, corpo,
      { fs: 10, fsMin: 8, cor: corInk, espac: 128 });

    const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
      x + 20, colY + 136, x + colW - 20, colY + 136);
    sep.getLineFill().setSolidFill(corSolid); sep.setWeight(1);
    _gChecklist(slide, itens, x + 20, colY + 144, colW - 40, 16, corSolid);
  };

  _col(G_MX, DS_G.colors.greenBg, DS_G.colors.greenInk, DS_G.colors.greenSolid,
    '✓ CONCLUÍDO', 'Financeiro',
    'A integração já foi realizada através da plataforma financeira dos Megas.',
    ['Dados de facilities e financeiro já conversam', 'Visão consolidada disponível na plataforma',
     'Sem pendências no fluxo']);

  _col(G_MX + colW + gap, DS_G.colors.amberBg, DS_G.colors.amberInk, DS_G.colors.amberSolid,
    '⏳ EM ANDAMENTO', 'Jurídico',
    'Formato de integração definido e rascunho montado — deixou de ser bloqueio.',
    ['Formato da integração definido', 'Rascunho da estrutura montado',
     'Primeira versão no ar até o fim do mês']);

  _gRodapeNota(slide, W, H,
    'Próximo passo: subir a primeira versão da integração com o Jurídico até o fim do mês e validar os dados com as três áreas.');
  Logger.log('Farol — Meta 3 (Integração das Áreas) gerado.');
}


// ==========================================
// SLIDE 5 — REEMBOLSOS
// ==========================================
function _gFarolSlideMeta4(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.meta4);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Solicitação e Controle de Reembolsos',
    ['Meta 4', FAROL_PONTOS.meta4 + ' pontos', 'Direcionador Projetos', 'Prazo 30/11/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  const pessoas = [
    { nome: 'Wilson', feito: true }, { nome: 'Cadu', feito: true }, { nome: 'Jonatas', feito: true },
    { nome: 'Ricardo', feito: true }, { nome: 'Ernani', feito: false }
  ];
  const feitos = pessoas.filter(p => p.feito).length;
  const pct = feitos / pessoas.length;

  // --- Faixa de progresso ---
  const bandH = 56;
  _gCartao_(slide, G_MX, G_TOP, contW, bandH, DS_G.colors.brandLight);
  _gUmaLinha_(slide, G_MX + 20, G_TOP + 10, 200, 14, 'ENTREVISTAS REALIZADAS',
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  // Altura ≥ corpo × 1,2, senão a linha única não cabe na vertical.
  _gUmaLinha_(slide, G_MX + 20, G_TOP + 25, 120, 24, feitos + ' de ' + pessoas.length,
    { fs: 19, fsMin: 13, bold: true, cor: DS_G.colors.brandMed, align: 'L', folga: 8 });

  const barX = G_MX + 168, barW = contW - 168 - 130, barY = G_TOP + (bandH - 12) / 2;
  const trilho = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barX, barY, barW, 12);
  trilho.getFill().setSolidFill(DS_G.colors.line); trilho.getBorder().setTransparent();
  const prog = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barX, barY,
    Math.max(16, barW * pct), 12);
  prog.getFill().setSolidFill(DS_G.colors.greenSolid); prog.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + contW - 122, G_TOP, 105, bandH,
    Math.round(pct * 100) + '% concluído',
    { fs: 9.5, fsMin: 7.5, bold: true, cor: DS_G.colors.greenInk,
      fonte: DS_G.typography.body, folga: 10 });

  // --- Cartões das pessoas ---
  const cardY = G_TOP + bandH + 16, cardH = 62, gapP = 10;
  const cardW = (contW - (pessoas.length - 1) * gapP) / pessoas.length;

  pessoas.forEach((p, i) => {
    const x = G_MX + i * (cardW + gapP);
    const corSolid = p.feito ? DS_G.colors.greenSolid : DS_G.colors.textMuted;
    _gCartao_(slide, x, cardY, cardW, cardH, corSolid);

    const av = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 13, cardY + 15, 32, 32);
    av.getFill().setSolidFill(p.feito ? DS_G.colors.brandLight : DS_G.colors.textMuted);
    av.getBorder().setTransparent();
    _gUmaLinha_(slide, x + 13, cardY + 15, 32, 32, p.nome.charAt(0),
      { fs: 13, fsMin: 9, bold: true, cor: DS_G.colors.white, folga: 12 });

    _gUmaLinha_(slide, x + 52, cardY + 13, cardW - 60, 17, p.nome,
      { fs: 10.5, fsMin: 7.5, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 9 });
    // "✓ ENTREVISTADO" não cabia nesta largura e quebrava em duas linhas
    // (a 2ª ficava cortada) — a pastilha resolve com folga + auto-encolhe.
    _gPill_(slide, x + 52, cardY + 33, cardW - 64, 15,
      p.feito ? '✓ ENTREVISTADO' : 'PENDENTE',
      p.feito ? DS_G.colors.greenSolid : DS_G.colors.lineStrong,
      p.feito ? DS_G.colors.white : DS_G.colors.textBody, 6.5);
  });

  // --- Funil: concluído / pendente / apoio do RH ---
  const y2 = cardY + cardH + 22, gap2 = 16;
  const colW2 = (contW - 2 * gap2) / 3, panelH = fim - y2;

  let py = _gPainel(slide, G_MX, y2, colW2, panelH,
    '✓ CONCLUÍDO (' + feitos + ')', DS_G.colors.greenInk);
  _gChecklist(slide, pessoas.filter(p => p.feito).map(p => p.nome + ' entrevistado'),
    G_MX + 14, py + 2, colW2 - 28, 19, DS_G.colors.greenSolid);

  const x2b = G_MX + colW2 + gap2;
  py = _gPainel(slide, x2b, y2, colW2, panelH,
    '⏳ PENDENTE (' + (pessoas.length - feitos) + ')', DS_G.colors.amberInk);
  _gChecklist(slide, ['Ernani — única entrevista que falta', 'Agendamento com apoio do RH'],
    x2b + 14, py + 2, colW2 - 28, 19, DS_G.colors.amberSolid);

  const x3b = x2b + colW2 + gap2;
  py = _gPainel(slide, x3b, y2, colW2, panelH, 'PRÓXIMOS PASSOS', DS_G.colors.brandLight);
  _gChecklist(slide, ['Acionar o RH na próxima semana', 'RH faz a ponte com o Financeiro',
    'Consolidar aprendizados no novo fluxo'], x3b + 14, py + 2, colW2 - 28, 19, DS_G.colors.brandLight);

  _gRodapeNota(slide, W, H,
    'Próximo passo: acionar o RH na próxima semana para fechar a entrevista do Ernani e desenhar o novo fluxo de reembolsos.');
  Logger.log('Farol — Meta 4 (Reembolsos) gerado.');
}


// ==========================================
// SLIDE 6 — PROJETOS EM ANDAMENTO (PLANEJAMENTO & GESTÃO)
// ==========================================
//
// Este slide NÃO é uma meta do Farol: é o retrato dos projetos tocados pela
// área, com o estado de cada FRENTE de trabalho. Por isso vive fora da
// numeração meta1..meta4 e tem ponto de entrada próprio
// (gerarProjetosPlanejamentoGestao).
//
// ────────────────────────────────────────────────────────────────────────
// É AQUI QUE SE EDITA TODO MÊS. Nada abaixo desta constante precisa mudar:
// os quatro números do topo, a pastilha de status de cada projeto e as cores
// saem todos DAQUI, por contagem — não há número digitado duas vezes, então
// o cabeçalho não tem como contradizer os cartões.
//
// estado da frente: 'feito' | 'andamento' | 'nao_iniciado'
// aguardando:       quem está segurando (vira a pastilha âmbar de bloqueio e
//                   entra na contagem "AGUARDANDO TERCEIROS"). Opcional.
// marcos:           datas do que já aconteceu, em ordem. Opcional.
// ────────────────────────────────────────────────────────────────────────
const PEG_REFERENCIA = 'Setembro/26';

const PEG_PROJETOS = [
  {
    nome: 'Pesquisa do RH',
    objetivo: 'Criar a plataforma da pesquisa e aplicá-la entre as áreas.',
    frentes: [
      { nome: 'Plataforma da pesquisa', estado: 'feito',
        detalhe: 'Plataforma criada e disponibilizada para o RH.' },
      { nome: 'Pesquisa entre as áreas', estado: 'feito',
        detalhe: 'Aplicada e encerrada — projeto entregue.' }
    ]
  },
  {
    nome: 'Automações no Jurídico',
    objetivo: 'Automatizar a criação do Kronnos e organizar as pastas do Jurídico.',
    frentes: [
      { nome: 'Criação do Kronnos', estado: 'andamento',
        detalhe: 'Automatizar a criação do Kronnos.',
        marcos: [
          { data: '19/ago', txt: 'iniciado' },
          { data: '11/set', txt: 'feedbacks recebidos' }
        ] },
      { nome: 'Organização de Pastas', estado: 'nao_iniciado',
        detalhe: 'Não iniciado — depende do Jurídico para começar.',
        aguardando: 'Jurídico' }
    ]
  }
];

const PEG_PROXIMO_PASSO =
  'Próximo passo: tratar os feedbacks de 11/set na automação do Kronnos e ' +
  'acionar o Jurídico para destravar a Organização de Pastas.';


// Paleta por estado. É função (e não const de topo) de propósito: const de
// topo em outro arquivo do projeto poderia ser avaliada antes de DS_G e vir
// undefined — aqui a leitura acontece só na hora de desenhar.
function _pegCor_(estado) {
  const c = DS_G.colors;
  if (estado === 'feito') {
    return { rotulo: '✓ CONCLUÍDO', solid: c.greenSolid, ink: c.greenInk, bg: c.greenBg };
  }
  if (estado === 'andamento') {
    return { rotulo: '⏳ EM ANDAMENTO', solid: c.amberSolid, ink: c.amberInk, bg: c.amberBg };
  }
  return { rotulo: 'NÃO INICIADO', solid: c.lineStrong, ink: c.textBody, bg: '#EEF2F9' };
}

// O status do PROJETO é derivado das frentes, nunca digitado: tudo feito =
// concluído; qualquer frente andando = em andamento; nenhuma começou = não
// iniciado. Assim a pastilha do cartão não tem como divergir das linhas que
// estão logo abaixo dela.
function _pegEstadoProjeto_(p) {
  const estados = p.frentes.map(f => f.estado);
  if (estados.every(e => e === 'feito')) return 'feito';
  if (estados.some(e => e === 'andamento')) return 'andamento';
  return 'nao_iniciado';
}

function _gSlideProjetosPeG(deck) {
  const slide = _gNovoSlide(deck, FAROL_TAGS.projetos);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'PROJETOS EM ANDAMENTO',
    ['Planejamento & Gestão', 'Guilherme August Padilha Marques', PEG_REFERENCIA]);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  // --- Faixa de contagem (tudo derivado de PEG_PROJETOS) ---
  const frentes = PEG_PROJETOS.reduce((acc, p) => acc.concat(p.frentes), []);
  const nFeitas    = frentes.filter(f => f.estado === 'feito').length;
  const nConcluidos = PEG_PROJETOS.filter(p => _pegEstadoProjeto_(p) === 'feito').length;
  const nAguardando = frentes.filter(f => f.aguardando).length;

  const blocos = [
    { label: 'PROJETOS',             valor: String(PEG_PROJETOS.length),        cor: DS_G.colors.brandMed },
    { label: 'PROJETOS CONCLUÍDOS',  valor: nConcluidos + ' de ' + PEG_PROJETOS.length,
      cor: nConcluidos ? DS_G.colors.greenInk : DS_G.colors.textMuted },
    { label: 'FRENTES CONCLUÍDAS',   valor: nFeitas + ' de ' + frentes.length,  cor: DS_G.colors.greenInk },
    { label: 'AGUARDANDO TERCEIROS', valor: String(nAguardando),
      cor: nAguardando ? DS_G.colors.amberInk : DS_G.colors.textMuted }
  ];

  const stripH = 52;
  _gCartao_(slide, G_MX, G_TOP, contW, stripH, DS_G.colors.brandLight);
  const bw = contW / blocos.length;
  blocos.forEach((b, i) => {
    const bx = G_MX + i * bw;
    if (i > 0) {
      const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, G_TOP + 12, 1, stripH - 24);
      div.getFill().setSolidFill(DS_G.colors.line); div.getBorder().setTransparent();
    }
    _gUmaLinha_(slide, bx + 18, G_TOP + 8, bw - 34, 12, b.label,
      { fs: 7.2, fsMin: 5.8, bold: true, cor: DS_G.colors.textMuted,
        fonte: DS_G.typography.body, align: 'L', folga: 8 });
    // Altura ≥ fonte × 1,2, senão a linha única não cabe na vertical.
    _gUmaLinha_(slide, bx + 18, G_TOP + 24, bw - 34, 21, b.valor,
      { fs: 15, fsMin: 9.5, bold: true, cor: b.cor, align: 'L', folga: 8 });
  });

  // --- Um cartão por projeto, lado a lado ---
  const gap = 20, cardY = G_TOP + stripH + 16, cardH = fim - cardY;
  const n = PEG_PROJETOS.length;
  const cardW = (contW - gap * (n - 1)) / n;

  PEG_PROJETOS.forEach((p, i) => {
    const x = G_MX + i * (cardW + gap);
    const cor = _pegCor_(_pegEstadoProjeto_(p));
    _gCartao_(slide, x, cardY, cardW, cardH, cor.solid);

    const px = x + 20, pw = cardW - 40;

    // Pastilha de status no canto superior direito; a largura sai do texto,
    // e o título é limitado pelo que sobra — nunca passa por baixo dela.
    const pillW = _gLarguraTexto_(cor.rotulo, 7, DS_G.typography.body, true) + 22;
    _gPill_(slide, x + cardW - 20 - pillW, cardY + 13, pillW, 16, cor.rotulo,
      cor.solid, DS_G.colors.white, 7);

    _gUmaLinha_(slide, px, cardY + 11, pw - pillW - 10, 20, (i + 1) + '. ' + p.nome,
      { fs: 13.5, fsMin: 9, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });
    _gParagrafo_(slide, px, cardY + 34, pw, 30, p.objetivo,
      { fs: 9, fsMin: 7.2, cor: DS_G.colors.textBody, espac: 122 });

    const sepY = cardY + 66;
    const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, px, sepY, x + cardW - 20, sepY);
    sep.getLineFill().setSolidFill(DS_G.colors.line); sep.setWeight(1);

    _gUmaLinha_(slide, px, sepY + 4, pw, 13, 'FRENTES DE TRABALHO',
      { fs: 6.8, fsMin: 5.8, bold: true, cor: DS_G.colors.textMuted,
        fonte: DS_G.typography.body, align: 'L', folga: 8 });

    // As frentes dividem por igual o que sobrou do cartão, então acrescentar
    // uma terceira frente não exige recalcular nada aqui.
    const fY = sepY + 22, fH = (cardY + cardH - 12 - fY) / p.frentes.length;

    p.frentes.forEach((f, k) => {
      const y = fY + k * fH;
      const cf = _pegCor_(f.estado);

      const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, px, y + 4, 9, 9);
      dot.getFill().setSolidFill(cf.solid); dot.getBorder().setTransparent();

      const tx = px + 16, tw = pw - 16;
      _gUmaLinha_(slide, tx, y, tw, 14, f.nome,
        { fs: 9.6, fsMin: 7.4, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });
      _gParagrafo_(slide, tx, y + 16, tw, 20, f.detalhe,
        { fs: 8.2, fsMin: 6.8, cor: DS_G.colors.textBody, espac: 116 });

      // Marcos e bloqueio viram pastilhas na mesma linha, na ordem em que
      // aconteceram. Sem marco nenhum a linha simplesmente não é desenhada.
      let cx = tx;
      const chipY = y + 38, chipH = 14;
      (f.marcos || []).forEach(m => {
        const txt = m.data + ' · ' + m.txt;
        const w = _gLarguraTexto_(txt, 6.6, DS_G.typography.body, true) + 18;
        if (cx + w > tx + tw) return;   // não cabe: melhor omitir que vazar
        _gPill_(slide, cx, chipY, w, chipH, txt, cf.bg, cf.ink, 6.6);
        cx += w + 6;
      });
      if (f.aguardando) {
        const txt = '⏸ aguardando ' + f.aguardando;
        const w = _gLarguraTexto_(txt, 6.6, DS_G.typography.body, true) + 18;
        if (cx + w <= tx + tw) {
          _gPill_(slide, cx, chipY, w, chipH, txt,
            DS_G.colors.amberBg, DS_G.colors.amberInk, 6.6);
        }
      }
    });
  });

  _gRodapeNota(slide, W, H, PEG_PROXIMO_PASSO);
  Logger.log('Projetos em Andamento — ' + PEG_PROJETOS.length + ' projetos, ' +
             frentes.length + ' frentes (' + nFeitas + ' concluídas, ' +
             nAguardando + ' aguardando terceiros).');
}