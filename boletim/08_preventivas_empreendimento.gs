/**
 * ARQUIVO: 08_preventivas_empreendimento.gs
 * Cria o slide "Manutenções Preventivas por Empreendimento".
 * Layout adaptativo: apenasMegas=false usa layout compacto original,
 *                    apenasMegas=true usa layout espaçado para Facilities (3 Megas).
 */

function gerarSlide08_PreventivasEmpreendimento(apenasMegas = false, filtroNome = null) {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados para Preventivas por Empreendimento...");

  let rows = [];
  let totalRow = null;

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName('BOLETIM - PREVENTIVAS');
    if (!sheet) throw new Error("Aba BOLETIM - PREVENTIVAS não encontrada.");

    const readRow = (rowNum) => {
      const r = sheet.getRange(rowNum, 1, 1, 18).getDisplayValues()[0];
      return {
        emp:   r[2]  || "",
        uf:    r[3]  || "",
        canc:  r[4]  || "",
        atr:   r[5]  || "",
        sem:   r[6]  || "",
        ano:   r[7]  || "",
        plan:  r[8]  || "",
        emDia: r[9]  || "",
        sla:   r[10] || "",
        est:   r[11] || "",
        pend:  r[12] || "",
        p4sem: r[14] || "",
        p1sem: r[15] || "",
        hoje:  r[16] || "",
        seta:  r[17] || ""
      };
    };

    const MEGAS_3    = ['MEGA CURITIBA', 'MEGA ITAJAI', 'MEGA ESTEIO'];
    const filtroNorm = filtroNome ? filtroNome.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : null;
    for (let i = 6; i <= 13; i++) {
      const row = readRow(i);
      if (row.emp && row.emp.toString().trim() !== "") {
        const empNorm = row.emp.toString().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if      (filtroNorm)  { if (empNorm.includes(filtroNorm))           rows.push(row); }
        else if (apenasMegas) { if (MEGAS_3.some(m => empNorm.includes(m))) rows.push(row); }
        else                  { rows.push(row); }
      }
    }

    totalRow = readRow(14);

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

  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 200, 40);
  titleBox.getText().setText('Preventivas por Empreendimento').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 200, 30);
  subtitleBox.getText().setText('Visão Consolidada • % de Conformidade e Performance PMP por Ativo').getTextStyle()
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

  const layoutEsp = apenasMegas || !!filtroNome;
  const isSingle  = layoutEsp && rows.length <= 1; // Hangar: apenas 1 linha

  const header1H  = isSingle ? 22  : layoutEsp ? 18  : 16;
  const header2H  = isSingle ? 32  : layoutEsp ? 28  : 26;
  const headerH   = header1H + header2H;

  const rawDataH = (tableH - headerH) / (rows.length + 1);
  const dataH    = layoutEsp ? Math.min(rawDataH, isSingle ? 70 : 34) : rawDataH;
  const totalH   = isSingle ? 40 : dataH; // TOTAL mais compacto no layout Hangar
  const contentH = headerH + (rows.length * dataH) + totalH;
  const vOffset  = layoutEsp ? Math.min(Math.floor((tableH - contentH) / 2), isSingle ? 80 : 12) : 0;
  const drawY    = tableY + vOffset;

  const cols = layoutEsp ? [
    // Facilities/Hangar: EMPREENDIMENTO mais largo p/ não quebrar; UF com folga p/ "PR"
    { label: 'EMPREENDIMENTO', key: 'emp',   w: 0.170, align: 'LEFT'   },
    { label: 'UF',             key: 'uf',    w: 0.045, align: 'CENTER' },
    { label: 'CANC',           key: 'canc',  w: 0.058, align: 'CENTER' },
    { label: 'ATR',            key: 'atr',   w: 0.045, align: 'CENTER' },
    { label: 'SEM',            key: 'sem',   w: 0.048, align: 'CENTER' },
    { label: 'ANO',            key: 'ano',   w: 0.055, align: 'CENTER' },
    { label: 'PLAN',           key: 'plan',  w: 0.055, align: 'CENTER' },
    { label: 'EM DIA',         key: 'emDia', w: 0.065, align: 'CENTER' },
    { label: 'SLA\nATEND.',    key: 'sla',   w: 0.065, align: 'CENTER' },
    { label: 'ESTADO',         key: 'est',   w: 0.065, align: 'CENTER' },
    { label: '% NÃO\nFEITO',   key: 'pend',  w: 0.062, align: 'CENTER' },
    { label: '4 SEM.\nATRÁS',  key: 'p4sem', w: 0.066, align: 'CENTER' },
    { label: '1 SEM.\nATRÁS',  key: 'p1sem', w: 0.066, align: 'CENTER' },
    { label: 'HOJE',           key: 'hoje',  w: 0.066, align: 'CENTER' },
    { label: 'COMP.\nSEM.',    key: 'seta',  w: 0.069, align: 'CENTER' },
  ] : [
    // Completo: colunas originais para 8+ linhas
    { label: 'EMPREENDIMENTO', key: 'emp',   w: 0.14,  align: 'LEFT'   },
    { label: 'UF',             key: 'uf',    w: 0.05,  align: 'CENTER' },
    { label: 'CANC.',          key: 'canc',  w: 0.04,  align: 'CENTER' },
    { label: 'ATR.',           key: 'atr',   w: 0.05,  align: 'CENTER' },
    { label: 'SEM.',           key: 'sem',   w: 0.05,  align: 'CENTER' },
    { label: 'ANO',            key: 'ano',   w: 0.07,  align: 'CENTER' },
    { label: 'PLAN.',          key: 'plan',  w: 0.06,  align: 'CENTER' },
    { label: 'EM DIA',         key: 'emDia', w: 0.075, align: 'CENTER' },
    { label: 'SLA\nATEND.',    key: 'sla',   w: 0.065, align: 'CENTER' },
    { label: 'ESTADO',         key: 'est',   w: 0.065, align: 'CENTER' },
    { label: '% NÃO\nFEITO',   key: 'pend',  w: 0.065, align: 'CENTER' },
    { label: '4 SEM.\nATRÁS',  key: 'p4sem', w: 0.07,  align: 'CENTER' },
    { label: '1 SEM.\nATRÁS',  key: 'p1sem', w: 0.07,  align: 'CENTER' },
    { label: 'HOJE',           key: 'hoje',  w: 0.07,  align: 'CENTER' },
    { label: 'COMP.\nSEM.',    key: 'seta',  w: 0.065, align: 'CENTER' },
  ];

  let colPositions = [];
  let curX = tableX;
  cols.forEach(col => { colPositions.push(curX); curX += tableW * col.w; });

  const groups = [
    { label: '',                    startCol: 0,  endCol: 1  },
    { label: 'PROGRAMADAS',         startCol: 2,  endCol: 6  },
    { label: 'PERFORMANCE PMP',     startCol: 7,  endCol: 9  },
    { label: '',                    startCol: 10, endCol: 10 },
    { label: '% CONFORMIDADE 2026', startCol: 11, endCol: 13 },
    { label: '',                    startCol: 14, endCol: 14 },
  ];

  // Cabeçalho nível 1
  groups.forEach(g => {
    const x1 = colPositions[g.startCol];
    const x2 = colPositions[g.endCol] + (tableW * cols[g.endCol].w);
    const gw = x2 - x1;
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x1, drawY, gw, header1H);
    cell.getFill().setSolidFill(g.label ? CR_DESIGN_SYSTEM.colors.brandMed : CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    if (g.label) {
      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x1, drawY, gw, header1H);
      txt.getText().setText(g.label).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
        .setForegroundColor('#FFFFFF');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    }
  });

  // Cabeçalho nível 2
  const hFont2 = layoutEsp ? 6.5 : 5.5;
  cols.forEach((col, ci) => {
    const cx = colPositions[ci];
    const cw = tableW * col.w;
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, drawY + header1H, cw, header2H);
    cell.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    const safeLabel = (col.label && col.label.trim() !== "") ? col.label : "-";
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx, drawY + header1H, cw, header2H);
    txt.getText().setText(safeLabel).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(hFont2).setBold(true)
      .setForegroundColor('#FFFFFF');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Helpers
  const numericKeys = new Set(['ano', 'plan']);
  function formatNum(val) {
    if (!val || val === "-") return val;
    const s = val.toString().trim();
    if (s.includes('%')) return s;
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return (!isNaN(n) && Number.isFinite(n)) ? Math.round(n).toLocaleString('pt-BR') : s;
  }
  function getPctBgColor(val) {
    if (!val || val === "" || val === "-") return null;
    const num = parseFloat(val.replace('%','').replace(',','.'));
    if (isNaN(num)) return null;
    if (num >= 90) return '#DCFCE7';
    if (num >= 75) return '#FFEDD5';
    return '#FEE2E2';
  }
  function getPctColor(val) {
    if (!val || val === "" || val === "-") return null;
    const num = parseFloat(val.replace('%','').replace(',','.'));
    if (isNaN(num)) return null;
    if (num >= 90) return '#16A34A';
    if (num >= 75) return '#EA580C';
    return '#DC2626';
  }
  function getSetaColor(val) {
    if (!val) return CR_DESIGN_SYSTEM.colors.textBody;
    if (val.includes('▲')) return '#16A34A';
    if (val.includes('▼')) return '#DC2626';
    return CR_DESIGN_SYSTEM.colors.textBody;
  }

  const dataFontEmp  = layoutEsp ? 8.5 : 6.5;
  const dataFontBody = layoutEsp ? 7.5 : 6.5;

  const isPct  = ['p4sem','p1sem','hoje'];
  const isSeta = 'seta';

  const drawDataRow = (rowData, y, h, isTotal = false) => {
    cols.forEach((col, ci) => {
      const cx = colPositions[ci];
      const cw = tableW * col.w;
      const isP = isPct.includes(col.key);
      const isS = col.key === isSeta;

      let bgColor = isTotal ? CR_DESIGN_SYSTEM.colors.brandDark : CR_DESIGN_SYSTEM.colors.cardBg;
      if (!isTotal && isP) { const bg = getPctBgColor(rowData[col.key]); if (bg) bgColor = bg; }
      if (!isTotal && !isP && rowData._index % 2 === 0) bgColor = '#F8FAFC';

      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y, cw, h);
      cell.getFill().setSolidFill(bgColor);
      cell.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

      const rawVal = rowData[col.key] || "-";
      let safeVal = (!rawVal || rawVal.toString().trim() === "" || rawVal.toString().includes("#DIV") || rawVal.toString().includes("#ERR"))
        ? "-" : rawVal.toString().replace(/[\r\n]+/g, ' ').replace(/\s+%/g, '%').trim();
      if (numericKeys.has(col.key)) safeVal = formatNum(safeVal);

      const txtX = col.key === 'emp' ? cx + 2 : cx;
      const txtW = col.key === 'emp' ? cw - 4 : cw;
      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, txtX, y, txtW, h);
      txt.getText().setText(safeVal);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      const style = txt.getText().getTextStyle();
      style.setFontFamily(col.key === 'emp' ? CR_DESIGN_SYSTEM.typography.titles : CR_DESIGN_SYSTEM.typography.body);
      style.setFontSize(col.key === 'emp' ? dataFontEmp : dataFontBody);
      style.setBold(isTotal || col.key === 'emp');

      let textColor = isTotal ? '#FFFFFF' : CR_DESIGN_SYSTEM.colors.textMain;
      if (!isTotal && isP) { const pc = getPctColor(rowData[col.key]); if (pc) textColor = pc; }
      if (!isTotal && isS) textColor = getSetaColor(rowData[col.key]);
      style.setForegroundColor(textColor);

      txt.getText().getParagraphStyle().setParagraphAlignment(
        col.align === 'LEFT' ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER
      );
    });
  };

  rows.forEach((row, i) => { row._index = i; drawDataRow(row, drawY + headerH + (i * dataH), dataH, false); });
  if (totalRow) { totalRow._index = 0; drawDataRow(totalRow, drawY + headerH + (rows.length * dataH), totalH, true); }

  // =========================================================
  // --- 3. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 08').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 08 (Preventivas por Empreendimento) concluído!");
}

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só as Preventivas por Empreendimento, no escopo pedido. Serve para
// conferir um ajuste sem reprocessar o boletim inteiro. Sem parâmetro, para
// aparecer no menu "Selecionar função" do editor.
function verPreventivasEmpreendimento()            { return _bolVerSlide_('COMPLETO',   'Preventivas / Empreend.'); }
function verPreventivasEmpreendimentoFacilities()  { return _bolVerSlide_('FACILITIES', 'Preventivas / Empreend.'); }
function verPreventivasEmpreendimentoHangar()      { return _bolVerSlide_('HANGAR',     'Preventivas / Empreend.'); }
