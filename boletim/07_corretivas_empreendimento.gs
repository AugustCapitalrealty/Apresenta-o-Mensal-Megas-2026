/**
 * ARQUIVO: 07_corretivas_empreendimento.gs
 * Cria o slide "Manutenções Corretivas por Empreendimento".
 * Fonte: Planilha QUADRO DE INDICADORES — Aba BOLETIM - CORRETIVAS
 *   - Linhas 7 a 25: empreendimentos
 *   - Linha 26: TOTAL
 * Layout adaptativo: apenasMegas=false usa layout compacto (muitas linhas),
 *                    apenasMegas=true usa layout espaçado para apresentação Facilities (3 Megas).
 */

function gerarSlide07_CorretivasEmpreendimento(apenasMegas = false, filtroNome = null) {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados para Corretivas por Empreendimento...");

  let rows = [];
  let totalRow = null;

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName('BOLETIM - CORRETIVAS');
    if (!sheet) throw new Error("Aba BOLETIM - CORRETIVAS não encontrada.");

    const colMap = { emp: 4, uf: 6, abSem: 8, abTod: 11, feSem: 12, feTod: 15, back: 16, p28: 20, p7: 21, hoje: 22, seta: 23 };

    const readRow = (rowNum) => {
      const r = sheet.getRange(rowNum, 1, 1, 25).getDisplayValues()[0];
      return {
        emp:   r[colMap.emp  - 1] || "",
        uf:    r[colMap.uf   - 1] || "",
        abSem: r[colMap.abSem - 1] || "",
        abTod: r[colMap.abTod - 1] || "",
        feSem: r[colMap.feSem - 1] || "",
        feTod: r[colMap.feTod - 1] || "",
        back:  r[colMap.back - 1] || "",
        p28:   r[colMap.p28  - 1] || "",
        p7:    r[colMap.p7   - 1] || "",
        hoje:  r[colMap.hoje - 1] || "",
        seta:  r[colMap.seta - 1] || ""
      };
    };

    const MEGAS_3   = ['MEGA CURITIBA', 'MEGA ITAJAI', 'MEGA ESTEIO'];
    const filtroNorm = filtroNome ? filtroNome.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : null;
    for (let i = 7; i <= 25; i++) {
      const row = readRow(i);
      if (row.emp && row.emp.toString().trim() !== "") {
        const empNorm = row.emp.toString().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if      (filtroNorm)  { if (empNorm.includes(filtroNorm))           rows.push(row); }
        else if (apenasMegas) { if (MEGAS_3.some(m => empNorm.includes(m))) rows.push(row); }
        else                  { rows.push(row); }
      }
    }

    totalRow = readRow(26);

  } catch(e) {
    Logger.log("Erro ao extrair dados: " + e.message);
  }

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO ---
  // =========================================================
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -100, -100, 300, 300);
  ellipse.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40);
  titleBox.getText().setText('Corretivas por Empreendimento').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30);
  subtitleBox.getText().setText('Visão Consolidada • % de Conclusão e Backlog por Ativo').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 2. TABELA — layout adaptativo por modo ---
  // =========================================================
  const tableX = marginX;
  const tableY = marginY + 75;
  const tableW = pageWidth - (marginX * 2);
  const footerH = 25;
  const tableH  = pageHeight - tableY - footerH - 10;

  // layoutEsp: true = poucas linhas (Facilities 3 Megas ou Hangar VIP), false = boletim completo
  const layoutEsp = apenasMegas || !!filtroNome;
  const isSingle  = layoutEsp && rows.length <= 1; // Hangar: apenas 1 linha

  const header1H = isSingle ? 20  : layoutEsp ? 15  : 13;
  const header2H = isSingle ? 30  : layoutEsp ? 22  : 19;
  const headerH  = header1H + header2H;

  const rawDataH = (tableH - headerH) / (rows.length + 1);
  const dataH    = layoutEsp ? Math.min(rawDataH, isSingle ? 70 : 34) : rawDataH;
  const totalH   = isSingle ? 40 : dataH; // TOTAL mais compacto no layout Hangar
  const contentH = headerH + (rows.length * dataH) + totalH;
  const vOffset  = layoutEsp ? Math.min(Math.floor((tableH - contentH) / 2), isSingle ? 80 : 12) : 0;
  const drawY    = tableY + vOffset;

  const cols = layoutEsp ? [
    // Facilities/Hangar: colunas espaçadas, UF com folga para não quebrar "PR"
    { label: 'EMPREENDIMENTO', key: 'emp',   w: 0.170, align: 'LEFT'   },
    { label: 'UF',             key: 'uf',    w: 0.055, align: 'CENTER' },
    { label: 'SEMANA',         key: 'abSem', w: 0.095, align: 'CENTER' },
    { label: 'TODOS',          key: 'abTod', w: 0.070, align: 'CENTER' },
    { label: 'SEMANA',         key: 'feSem', w: 0.095, align: 'CENTER' },
    { label: 'TODOS',          key: 'feTod', w: 0.070, align: 'CENTER' },
    { label: 'TODOS',          key: 'back',  w: 0.090, align: 'CENTER' },
    { label: '28 DIAS\nATRÁS', key: 'p28',   w: 0.095, align: 'CENTER' },
    { label: '7 DIAS\nATRÁS',  key: 'p7',    w: 0.095, align: 'CENTER' },
    { label: 'HOJE',           key: 'hoje',  w: 0.095, align: 'CENTER' },
    { label: 'COMP.\nSEM.',    key: 'seta',  w: 0.070, align: 'CENTER' },
  ] : [
    // Completo: colunas originais para até 18 linhas
    { label: 'EMPREENDIMENTO', key: 'emp',   w: 0.19,  align: 'LEFT'   },
    { label: 'UF',             key: 'uf',    w: 0.05,  align: 'CENTER' },
    { label: 'SEMANA',         key: 'abSem', w: 0.075, align: 'CENTER' },
    { label: 'TODOS',          key: 'abTod', w: 0.07,  align: 'CENTER' },
    { label: 'SEMANA',         key: 'feSem', w: 0.075, align: 'CENTER' },
    { label: 'TODOS',          key: 'feTod', w: 0.07,  align: 'CENTER' },
    { label: 'TODOS',          key: 'back',  w: 0.09,  align: 'CENTER' },
    { label: '28 DIAS\nATRÁS', key: 'p28',   w: 0.10,  align: 'CENTER' },
    { label: '7 DIAS\nATRÁS',  key: 'p7',    w: 0.10,  align: 'CENTER' },
    { label: 'HOJE',           key: 'hoje',  w: 0.10,  align: 'CENTER' },
    { label: 'COMP.\nSEM.',    key: 'seta',  w: 0.08,  align: 'CENTER' },
  ];

  let colPositions = [];
  let curX = tableX;
  cols.forEach(col => { colPositions.push(curX); curX += tableW * col.w; });

  const groups = [
    { label: '',               startCol: 0, endCol: 1  },
    { label: 'ABERTOS',        startCol: 2, endCol: 3  },
    { label: 'FECHADOS',       startCol: 4, endCol: 5  },
    { label: 'BACKLOG',        startCol: 6, endCol: 6  },
    { label: '% DE CONCLUSÃO', startCol: 7, endCol: 9  },
    { label: '',               startCol: 10,endCol: 10 },
  ];

  // Cabeçalho nível 1
  const hFont1 = 7; // mesmo tamanho nos dois layouts
  groups.forEach(g => {
    const x1 = colPositions[g.startCol];
    const x2 = colPositions[g.endCol] + (tableW * cols[g.endCol].w);
    const gw = x2 - x1;
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x1, drawY, gw, header1H);
    cell.getFill().setSolidFill(g.label ? CR_DESIGN_SYSTEM.colors.brandMed : CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    if (g.label) {
      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x1 + 2, drawY, gw - 4, header1H);
      txt.getText().setText(g.label).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(hFont1).setBold(true)
        .setForegroundColor('#FFFFFF');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    }
  });

  // Cabeçalho nível 2
  const hFont2 = apenasMegas ? 6 : 6;
  cols.forEach((col, ci) => {
    const cx = colPositions[ci];
    const cw = tableW * col.w;
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, drawY + header1H, cw, header2H);
    cell.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    const safeLabel = (col.label && col.label.trim() !== "") ? col.label : "-";
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 2, drawY + header1H, cw - 4, header2H);
    txt.getText().setText(safeLabel).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(hFont2).setBold(true)
      .setForegroundColor('#FFFFFF');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Helpers
  const numericKeys = new Set(['abTod', 'feTod', 'back']);
  function formatNum(val) {
    if (!val || val === "-") return val;
    const s = val.toString().trim();
    if (s.includes('%')) return s;
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return (!isNaN(n) && Number.isFinite(n)) ? Math.round(n).toLocaleString('pt-BR') : s;
  }
  function getPctColor(val) {
    if (!val || val === "" || val === "N/D") return null;
    const num = parseFloat(val.replace('%','').replace(',','.'));
    if (isNaN(num)) return null;
    if (num >= 90) return '#16A34A';
    if (num >= 75) return '#EA580C';
    return '#DC2626';
  }
  function getPctBgColor(val) {
    if (!val || val === "" || val === "N/D") return null;
    const num = parseFloat(val.replace('%','').replace(',','.'));
    if (isNaN(num)) return null;
    if (num >= 90) return '#DCFCE7';
    if (num >= 75) return '#FFEDD5';
    return '#FEE2E2';
  }
  function getSetaColor(val) {
    if (!val) return CR_DESIGN_SYSTEM.colors.textBody;
    if (val.includes('▲')) return '#16A34A';
    if (val.includes('▼')) return '#DC2626';
    return CR_DESIGN_SYSTEM.colors.textBody;
  }

  // Tamanhos de fonte adaptativos
  const dataFontEmp  = layoutEsp ? 8.5 : 6;
  const dataFontBody = layoutEsp ? 7.5 : 7;

  function drawRow(rowData, y, h, isTotal = false) {
    cols.forEach((col, ci) => {
      const cx = colPositions[ci];
      const cw = tableW * col.w;
      const isPct  = ['p28','p7','hoje'].includes(col.key);
      const isSeta = col.key === 'seta';

      let bgColor = isTotal ? CR_DESIGN_SYSTEM.colors.brandDark : CR_DESIGN_SYSTEM.colors.cardBg;
      if (!isTotal && isPct) { const bg = getPctBgColor(rowData[col.key]); if (bg) bgColor = bg; }
      if (!isTotal && !isPct && rowData._index % 2 === 0) bgColor = '#F8FAFC';

      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y, cw, h);
      cell.getFill().setSolidFill(bgColor);
      cell.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

      const rawVal = rowData[col.key] || "-";
      let safeVal = (!rawVal || rawVal.toString().trim() === "" || rawVal.toString().includes("#DIV") || rawVal.toString().includes("#ERR"))
        ? "-" : rawVal.toString().replace(/[\r\n]+/g, ' ').trim();
      if (numericKeys.has(col.key)) safeVal = formatNum(safeVal);

      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 3, y + 1, cw - 6, h - 2);
      txt.getText().setText(safeVal);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      const style = txt.getText().getTextStyle();
      style.setFontFamily(col.key === 'emp' ? CR_DESIGN_SYSTEM.typography.titles : CR_DESIGN_SYSTEM.typography.body);
      style.setFontSize(col.key === 'emp' ? dataFontEmp : dataFontBody);
      style.setBold(isTotal || col.key === 'emp');

      let textColor = isTotal ? '#FFFFFF' : CR_DESIGN_SYSTEM.colors.textMain;
      if (!isTotal && isPct)  { const pc = getPctColor(rowData[col.key]);  if (pc) textColor = pc; }
      if (!isTotal && isSeta) textColor = getSetaColor(rowData[col.key]);
      style.setForegroundColor(textColor);

      txt.getText().getParagraphStyle().setParagraphAlignment(
        col.align === 'LEFT' ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER
      );
    });
  }

  rows.forEach((row, i) => { row._index = i; drawRow(row, drawY + headerH + (i * dataH), dataH, false); });
  if (totalRow) { totalRow._index = 0; drawRow(totalRow, drawY + headerH + (rows.length * dataH), totalH, true); }

  // =========================================================
  // --- 3. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 07').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 07 (Corretivas por Empreendimento) concluído!");
}

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só as Corretivas por Empreendimento, no escopo pedido. Serve para
// conferir um ajuste sem reprocessar o boletim inteiro. Sem parâmetro, para
// aparecer no menu "Selecionar função" do editor.
function verCorretivasEmpreendimento()            { return _bolVerSlide_('COMPLETO',   'Corretivas / Empreend.'); }
function verCorretivasEmpreendimentoFacilities()  { return _bolVerSlide_('FACILITIES', 'Corretivas / Empreend.'); }
function verCorretivasEmpreendimentoHangar()      { return _bolVerSlide_('HANGAR',     'Corretivas / Empreend.'); }
