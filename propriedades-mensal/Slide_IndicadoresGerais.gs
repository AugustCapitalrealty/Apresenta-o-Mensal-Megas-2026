/**
 * ARQUIVO: Slide_IndicadoresGerais.gs
 * SLIDE — DASHBOARD OPERACIONAL
 *
 * Grid flexível de painéis (criarCardPainel) com suporte a 2, 3 ou 4 quadrantes
 * via motor _dashGrade_ (mesmo padrão refinado de megas-mensal/Slide01_Dashboard.gs).
 *
 * QUADRANTES DO PORTFÓLIO DE PROPRIEDADES:
 *   1. MANUTENÇÃO PREVENTIVA (Série mensal: SLA, Em dia, Rotinas Agendadas, Realizadas)
 *   2. MANUTENÇÃO CORRETIVA: CHAMADOS (Série mensal: Backlog, % Conclusão histórico, Tempo de aprovação, Criados)
 *   3. RECEBIMENTO DE OBRAS & PROJETOS (Posição atual: Concluídas %, Pendências, Total de obras, Projetos em análise)
 *   4. GESTÃO DE CONTRATAÇÕES (Posição atual: Em andamento, Em edital, Em atraso, Concluídas histórico)
 *
 * RECURSOS IMPLEMENTADOS:
 *   - Gerenciamento por Tag (TAG_DASHBOARD): substituição limpa sem duplicar slides.
 *   - Layout _dashGrade_: ajusta proporções e centralização vertical automaticamente.
 *   - Anti-Text-Break (Skill slides-caixa-texto-sem-quebra): folga simétrica para evitar quebra indevida da API do Slides.
 *   - Comparativo temporal ▲/▼ com coloração semântica (verde melhorou / vermelho piorou).
 *   - Régua de coloração por natureza do indicador (SLA, Inverso, Orçamento, Padrão).
 */

function gerarSlideIndicadoresGerais() {
  const dados = obterDashboardPropriedades_();
  const valoresMap = dados.map;
  const dynamicHeaders = dados.headers;

  const deck = getDeckMensal_();
  
  // Limpeza de slide anterior com a mesma tag
  if (typeof _tabRemoverPorTag_ === 'function' && typeof TAG_DASHBOARD !== 'undefined') {
    _tabRemoverPorTag_(deck, TAG_DASHBOARD);
  }

  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  // Marcação do slide para substituição segura
  if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_DASHBOARD !== 'undefined') {
    _tabMarcarSlide_(slide, TAG_DASHBOARD);
  }

  criarHeaderPadrao(
    slide,
    'DASHBOARD OPERACIONAL',
    'Indicadores do Portfólio de Propriedades · Performance: ' + dynamicHeaders[0] + (dados.parcial ? ' (mês em andamento)' : '')
  );

  // Configuração dos quadrantes
  const structure = [
    { title: 'MANUTENÇÃO', color: DS.colors.themePrev, rows: [
      { label: 'SLA Preventivas (%)',         lookup: 'SLA Preventivas',                   sentido: 'maior', sla: true },
      { label: 'Backlog em aberto (Qtd)',     lookup: 'Backlog em aberto',                 sentido: 'menor' },
      { label: '% Conclusão histórico',       lookup: 'Percentual de conclusão histórico', sentido: 'maior', sla: true }
    ] },
    { title: 'GESTÃO FINANCEIRA · ORÇAMENTO', color: DS.colors.themeCorr, semComparativo: true, headerTexto: 'ORÇAMENTO 2026', rows: [
      { label: 'Orçamento Total 2026',        lookup: 'Orçamento 2026 (Total)' },
      { label: 'Ritmo 2025 (Base)',           lookup: 'Ritmo 2025 (Base)' },
      { label: 'Capital Realty (CR)',         lookup: 'Orçamento Capital Realty' },
      { label: 'Demercado',                   lookup: 'Orçamento Demercado' },
      { label: 'Economia Projetada (26/25)',  lookup: 'Economia Projetada (26/25)',        regua: 'economia' },
      { label: 'CAPEX',                       lookup: 'CAPEX' }
    ] },
    { title: 'VISTORIAS & ANÁLISES DE PROJETOS', color: DS.colors.themeAtivos, semComparativo: true, headerTexto: 'TOTAL', colNameW: 0.72, rows: [
      { label: 'VISTORIAS', isGrupo: true },
      { label: 'entrada/saida de clientes',        lookup: 'Vistorias - Entrada/saída' },
      { label: 'recebimento de obras',             lookup: 'Vistorias - Recebimento obras' },
      { label: 'monitoramento',                    lookup: 'Vistorias - Monitoramento' },
      { label: 'Documentação',                     lookup: 'Vistorias - Documentação' },
      { label: 'ADEQUAÇÕES CLIENTES', isGrupo: true },
      { label: 'Quantidade',                       lookup: 'Adequações - Quantidade' },
      { label: 'Prazo medio de atendimento (dias)',lookup: 'Adequações - Prazo médio' },
      { label: 'Percentual de conclusão',          lookup: 'Adequações - Conclusão (%)' }
    ] },
    { title: 'GESTÃO DE CONTRATAÇÕES', color: DS.colors.brandLight, semComparativo: true, headerTexto: 'TOTAL', rows: [
      { label: 'Processos em andamento',     lookup: 'Contratações em andamento' },
      { label: 'Percentual de conclusão',    lookup: 'Contratações conclusão (%)' },
      { label: 'Prazo médio de contratação', lookup: 'Contratações prazo médio' }
    ] }
  ];

  const headerH = DS.layout.headerH || 64;
  const marginX = DS.layout.marginX || 30;
  const marginY = headerH + 14;
  const gap = 16;
  const footerMargin = 15;
  const areaW = W - (2 * marginX);
  const areaH = H - marginY - footerMargin;
  const caixas = _dashGrade_(structure.length, marginX, marginY, areaW, areaH, gap);

  structure.forEach((cat, i) => {
    const { x, y, w: cardW, h: cardH } = caixas[i];

    const tableY = criarCardPainel(slide, x, y, cardW, cardH, cat.title, cat.color) + 2;

    const colNameW = cat.colNameW ? (cardW * cat.colNameW) : (cardW * 0.46);
    const seloW = cat.semComparativo ? 0 : 14;
    const dataX0 = x + 10 + colNameW + seloW;
    const colDataW = cat.semComparativo ? (cardW - 20 - colNameW) : ((cardW - 20 - colNameW - seloW) / 3);

    if (cat.semComparativo) {
      if (cat.headerTexto) {
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0, tableY, colDataW, 18);
        t.getText().setText(cat.headerTexto).getTextStyle()
          .setFontSize(8).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.titles);
        t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      }
    } else {
      dynamicHeaders.forEach((h, idx) => {
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (idx * colDataW) - 6, tableY, colDataW + 12, 18);
        t.getText().setText(h).getTextStyle()
          .setFontSize(8).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.titles);
        t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    }

    const ROW_H_MAX = 24;
    const headerOffset = cat.headerTexto || !cat.semComparativo ? 18 : 6;
    const areaDados = (y + cardH - (tableY + headerOffset) - 6);
    const rowH = Math.min(areaDados / cat.rows.length, ROW_H_MAX);
    const startDataY = tableY + headerOffset + (areaDados - rowH * cat.rows.length) / 2;

    cat.rows.forEach((r, rIdx) => {
      const ry = startDataY + (rIdx * rowH);

      // Tratamento especial para subgrupos (faixa/divisor de seção)
      if (r.isGrupo) {
        const bgGrupo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 6, ry + 1, cardW - 12, rowH - 1);
        bgGrupo.getFill().setSolidFill('#F1F5F9');
        bgGrupo.getBorder().setTransparent();

        const gBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, ry - 1, cardW - 20, rowH + 2);
        gBox.getText().setText(r.label).getTextStyle()
          .setFontSize(6.8).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily(DS.typography.titles);
        gBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        return;
      }

      if (rIdx < cat.rows.length - 1 && !cat.rows[rIdx + 1].isGrupo) {
        const line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, ry + rowH - 1, cardW - 20, 1);
        line.getFill().setSolidFill('#F1F5F9');
        line.getBorder().setTransparent();
      }

      const temGrupos = cat.rows.some(row => row.isGrupo);
      const labelX = temGrupos ? (x + 18) : (x + 10);
      const labelW = temGrupos ? (colNameW - 8) : colNameW;

      // Rótulo com folga simétrica para não quebrar texto
      const nBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, labelX, ry - 1, labelW, rowH + 2);
      nBox.getText().setText((temGrupos ? '• ' : '') + r.label).getTextStyle()
        .setFontSize(temGrupos ? 6.5 : 7.5)
        .setBold(!temGrupos)
        .setForegroundColor(temGrupos ? DS.colors.textBody : DS.colors.textMain)
        .setFontFamily(DS.typography.titles);
      nBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      const vals = valoresMap.get(r.lookup) || { atual: null, mesAnt: null, anoAnt: null };
      const nAtual = _dashNum_(vals.atual);
      const nAnt = _dashNum_(vals.mesAnt);

      // Comparativo vs mês anterior: seta ▲/▼
      if (!cat.semComparativo && nAtual != null && nAnt != null && nAtual !== nAnt) {
        const subiu = nAtual > nAnt;
        const melhorou = (r.sentido === 'menor') ? !subiu : subiu;
        const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10 + colNameW, ry, seloW + 8, rowH);
        selo.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        selo.getText().setText(subiu ? '▲' : '▼').getTextStyle()
          .setFontSize(11).setBold(true)
          .setForegroundColor(melhorou ? DS.colors.accentGreen : DS.colors.accentRed)
          .setFontFamily(DS.typography.titles);
        selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      }

      const corDoValor = (valStr, isAtual) => isAtual ? _dashCor_(valStr, r, cat.color) : DS.colors.textBody;

      if (cat.semComparativo) {
        const vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0, ry - 1, colDataW, rowH + 2);
        const valStr = formatarNumeroBR(vals.atual);
        const vText = vBox.getText();
        vText.setText(valStr);
        vText.getTextStyle()
          .setFontSize(temGrupos ? 7.5 : 8.5).setBold(true).setFontFamily(DS.typography.titles)
          .setForegroundColor(corDoValor(valStr, true));
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        return;
      }

      [vals.atual, vals.mesAnt, vals.anoAnt].forEach((val, vIdx) => {
        const vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (vIdx * colDataW) - 8, ry, colDataW + 16, rowH);
        const valStr = formatarNumeroBR(val);
        const vText = vBox.getText();
        vText.setText(valStr);
        vText.getTextStyle()
          .setFontSize(8.5).setBold(true).setFontFamily(DS.typography.titles)
          .setForegroundColor(corDoValor(valStr, vIdx === 0));
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    });
  });

  Logger.log('✓ Dashboard Operacional gerado com sucesso (' + structure.length + ' quadrantes)');
}

/**
 * Grade flexível para 1, 2, 3, 4 ou N painéis.
 */
function _dashGrade_(n, x0, y0, areaW, areaH, gap) {
  const caixa = (x, y, w, h) => ({ x: x, y: y, w: w, h: h });

  if (n <= 1) return [caixa(x0, y0, areaW, areaH)];

  if (n === 2) {
    const w = (areaW - gap) / 2;
    return [caixa(x0, y0, w, areaH), caixa(x0 + w + gap, y0, w, areaH)];
  }

  const linhas = Math.ceil(n / 2);
  const h = (areaH - gap * (linhas - 1)) / linhas;
  const w = (areaW - gap) / 2;

  const out = [];
  for (let i = 0; i < n; i++) {
    const linha = Math.floor(i / 2);
    const y = y0 + linha * (h + gap);
    const sozinhoNaLinha = (i === n - 1) && (n % 2 === 1);
    out.push(sozinhoNaLinha ? caixa(x0, y, areaW, h)
                            : caixa(x0 + (i % 2) * (w + gap), y, w, h));
  }
  return out;
}

/**
 * Cor semântica por natureza do indicador.
 */
function _dashCor_(valStr, rowDef, corPadrao) {
  const DS = CR_DESIGN_SYSTEM;
  if (!valStr || valStr === '-' || valStr === '—') return DS.colors.textMuted;
  
  if (rowDef.regua === 'economia') {
    const s = String(valStr);
    if (s.includes('+')) return DS.colors.accentGreen;
    if (s.includes('−') || s.includes('-')) return DS.colors.accentRed;
    return DS.colors.textMain;
  }

  const num = parseFloat(String(valStr).replace('%', '').replace(',', '.'));
  if (isNaN(num)) return corPadrao || DS.colors.textMain;

  if (rowDef.sla) {
    return corPorSLA(num, corPadrao);
  }

  if (rowDef.regua === 'inverso') {
    // Menor é melhor (ex: pendências, atrasos)
    if (num === 0) return DS.colors.accentGreen;
    if (num <= 2) return DS.colors.accentOrange;
    return DS.colors.accentRed;
  }

  if (rowDef.regua === 'orcamento') {
    return num <= 100 ? DS.colors.accentGreen : DS.colors.accentRed;
  }

  return corPadrao || DS.colors.textMain;
}

function _dashNum_(v) {
  return (v == null || isNaN(v)) ? null : v;
}
