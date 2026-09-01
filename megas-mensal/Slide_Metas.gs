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

