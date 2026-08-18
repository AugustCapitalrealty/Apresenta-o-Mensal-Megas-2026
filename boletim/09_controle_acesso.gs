/**
 * ARQUIVO: 09_controle_acesso.gs
 * Cria o slide "Controle de Acesso — KPIs por Empreendimento".
 * Fonte: spreadsheetGraficosId — Aba "Cópia de PAINEL INDICADORES"
 *   - Linha 38: cabeçalho nível 1 (grupos)
 *   - Linha 39: cabeçalho nível 2 (Sem. Ant., KPI, Comp.)
 *   - Linhas 40 a 48: dados dos KPIs
 *   - C=KPI, D=CWB Sem.Ant., E=CWB KPI, F=CWB Comp.
 *   - G=ITJ Sem.Ant., H=ITJ KPI, I=ITJ Comp.
 *   - J=EST Sem.Ant., K=EST KPI, L=EST Comp.
 *   - M=TOT Sem.Ant., N=TOT KPI, O=TOT Comp.
 */

function gerarSlide09_ControleAcesso() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados para Controle de Acesso...");

  let kpiLabels = [];
  let rows = [];

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetGraficosId);
    const sheet = ss.getSheetByName('Cópia de PAINEL INDICADORES');
    if (!sheet) throw new Error("Aba não encontrada.");

    // Linhas 40 a 48 — dados
    for (let i = 40; i <= 48; i++) {
      const r = sheet.getRange(i, 1, 1, 15).getDisplayValues()[0];
      const label = r[2] || ""; // coluna C
      if (!label || label.trim() === "") continue;
      rows.push({
        label: label.trim(),
        cwbAnt: r[3]  || "-", cwbKpi: r[4]  || "-", cwbComp: r[5]  || "-",
        itjAnt: r[6]  || "-", itjKpi: r[7]  || "-", itjComp: r[8]  || "-",
        estAnt: r[9]  || "-", estKpi: r[10] || "-", estComp: r[11] || "-",
        totAnt: r[12] || "-", totKpi: r[13] || "-", totComp: r[14] || "-",
      });
    }

  } catch(e) {
    Logger.log("Erro ao extrair dados: " + e.message);
  }

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO PADRONIZADO ---
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
  titleBox.getText().setText('Controle de Acesso').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30);
  subtitleBox.getText().setText('KPIs 2026 • Comparativo por Empreendimento').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 2. TABELA ---
  // =========================================================
  const tableX = 20;
  const tableY = marginY + 75;
  const tableW = pageWidth - 40;
  const footerH = 25;
  const tableH = pageHeight - tableY - footerH - 5;

  const header1H = 18;
  const header2H = 24;
  const headerH  = header1H + header2H;
  const dataH    = (tableH - headerH) / rows.length;

  // Colunas — soma = 1.0
  const cols = [
    { label: 'KPI 2026',       key: 'label',   w: 0.24,  align: 'LEFT',   group: ''              },
    { label: 'SEM.\nANT.',     key: 'cwbAnt',  w: 0.065, align: 'CENTER', group: 'MEGA CURITIBA' },
    { label: 'KPI',            key: 'cwbKpi',  w: 0.065, align: 'CENTER', group: 'MEGA CURITIBA' },
    { label: 'COMP.\nSEM.',    key: 'cwbComp', w: 0.055, align: 'CENTER', group: 'MEGA CURITIBA' },
    { label: 'SEM.\nANT.',     key: 'itjAnt',  w: 0.065, align: 'CENTER', group: 'MEGA ITAJAÍ'   },
    { label: 'KPI',            key: 'itjKpi',  w: 0.065, align: 'CENTER', group: 'MEGA ITAJAÍ'   },
    { label: 'COMP.\nSEM.',    key: 'itjComp', w: 0.055, align: 'CENTER', group: 'MEGA ITAJAÍ'   },
    { label: 'SEM.\nANT.',     key: 'estAnt',  w: 0.065, align: 'CENTER', group: 'MEGA ESTEIO'   },
    { label: 'KPI',            key: 'estKpi',  w: 0.065, align: 'CENTER', group: 'MEGA ESTEIO'   },
    { label: 'COMP.\nSEM.',    key: 'estComp', w: 0.055, align: 'CENTER', group: 'MEGA ESTEIO'   },
    { label: 'SEM.\nANT.',     key: 'totAnt',  w: 0.065, align: 'CENTER', group: 'TOTAL'         },
    { label: 'KPI',            key: 'totKpi',  w: 0.065, align: 'CENTER', group: 'TOTAL'         },
    { label: 'COMP.\nSEM.',    key: 'totComp', w: 0.055, align: 'CENTER', group: 'TOTAL'         },
  ];

  // Calcular posições X
  let colPositions = [];
  let curX = tableX;
  cols.forEach(col => {
    colPositions.push(curX);
    curX += tableW * col.w;
  });

  // Grupos nível 1
  const groups = [
    { label: '',               startCol: 0,  endCol: 0  },
    { label: 'MEGA CURITIBA',  startCol: 1,  endCol: 3  },
    { label: 'MEGA ITAJAÍ',    startCol: 4,  endCol: 6  },
    { label: 'MEGA ESTEIO',    startCol: 7,  endCol: 9  },
    { label: 'TOTAL',          startCol: 10, endCol: 12 },
  ];

  // Helper: cor da seta
  function getSetaColor(val) {
    if (!val) return CR_DESIGN_SYSTEM.colors.textBody;
    if (val.includes('▲')) return CR_DESIGN_SYSTEM.colors.accentGreen;
    if (val.includes('▼')) return CR_DESIGN_SYSTEM.colors.accentRed;
    return CR_DESIGN_SYSTEM.colors.textBody;
  }

  // Cabeçalho nível 1
  groups.forEach(g => {
    const x1 = colPositions[g.startCol];
    const x2 = colPositions[g.endCol] + (tableW * cols[g.endCol].w);
    const gw = x2 - x1;
    const isTotal = g.label === 'TOTAL';
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x1, tableY, gw, header1H);
    cell.getFill().setSolidFill(g.label ? (isTotal ? CR_DESIGN_SYSTEM.colors.brandDark : CR_DESIGN_SYSTEM.colors.brandMed) : CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    if (g.label) {
      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x1, tableY, gw, header1H);
      txt.getText().setText(g.label).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
        .setForegroundColor('#FFFFFF');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    }
  });

  // Cabeçalho nível 2
  cols.forEach((col, ci) => {
    const cx = colPositions[ci];
    const cw = tableW * col.w;
    const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, tableY + header1H, cw, header2H);
    cell.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    cell.getBorder().getLineFill().setSolidFill('#FFFFFF');
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx, tableY + header1H, cw, header2H);
    txt.getText().setText(col.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6).setBold(true)
      .setForegroundColor('#FFFFFF');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Linhas de dados
  const compKeys = ['cwbComp','itjComp','estComp','totComp'];

  rows.forEach((row, ri) => {
    const y = tableY + headerH + (ri * dataH);
    const isAlt = ri % 2 === 0;

    cols.forEach((col, ci) => {
      const cx = colPositions[ci];
      const cw = tableW * col.w;
      const isComp = compKeys.includes(col.key);
      const isLabel = col.key === 'label';
      const isTotGroup = ['totAnt','totKpi','totComp'].includes(col.key);

      // Fundo
      let bgColor = isTotGroup
        ? (isAlt ? '#EFF6FF' : '#DBEAFE')
        : (isAlt ? '#F8FAFC' : CR_DESIGN_SYSTEM.colors.cardBg);

      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y, cw, dataH);
      cell.getFill().setSolidFill(bgColor);
      cell.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

      // Texto
      const rawVal = row[col.key] || "-";
      let safeVal = (!rawVal || rawVal.toString().trim() === "" || rawVal.toString().includes("#DIV") || rawVal.toString().includes("#ERR")) ? "-" : rawVal.toString().trim();

      // Formatar tempo: 10:49 → 10m49s | 0:09:19 → 09m19s
      if (!isLabel && !isComp && safeVal.includes(":")) {
        const parts = safeVal.split(":");
        if (parts.length === 2) {
          safeVal = parts[0] + "m" + parts[1].padStart(2,'0') + "s";
        } else if (parts.length === 3) {
          safeVal = parts[1].padStart(2,'0') + "m" + parts[2].padStart(2,'0') + "s";
        }
      }

      const txtX = isLabel ? cx + 4 : cx;
      const txtW = isLabel ? cw - 8 : cw;
      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, txtX, y, txtW, dataH);
      txt.getText().setText(safeVal);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      const style = txt.getText().getTextStyle();
      style.setFontFamily(isLabel ? CR_DESIGN_SYSTEM.typography.titles : CR_DESIGN_SYSTEM.typography.body);
      style.setFontSize(isLabel ? 6.5 : 7);
      style.setBold(isLabel || isTotGroup);

      let textColor = CR_DESIGN_SYSTEM.colors.textMain;
      if (isComp) textColor = getSetaColor(safeVal);
      if (isTotGroup && !isComp) textColor = CR_DESIGN_SYSTEM.colors.brandDark;
      style.setForegroundColor(textColor);

      txt.getText().getParagraphStyle().setParagraphAlignment(
        col.align === 'LEFT' ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER
      );
    });
  });

  // =========================================================
  // --- 3. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 09').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 09 (Controle de Acesso) concluído!");
}

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só o Controle de Acesso, no escopo pedido. Serve para
// conferir um ajuste sem reprocessar o boletim inteiro. Sem parâmetro, para
// aparecer no menu "Selecionar função" do editor.
function verControleAcesso() { return _bolVerSlide_('COMPLETO', 'Controle de Acesso'); }
