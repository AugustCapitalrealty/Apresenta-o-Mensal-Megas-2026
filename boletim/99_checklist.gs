/**
 * ARQUIVO: 99_checklist.gs
 * Cria um slide de checklist de manutenção para o gestor.
 * Compara datas de modificação dos arquivos e verifica dados críticos.
 * DEVE SER O ÚLTIMO SLIDE GERADO — remover antes de apresentar!
 */
function gerarSlideChecklist() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();
  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  // Fundo levemente amarelado para destacar que é slide interno
  slide.getBackground().setSolidFill('#FFFBEB');

  // =========================================================
  // CABEÇALHO
  // =========================================================
  const headerBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, pageWidth, 50);
  headerBar.getFill().setSolidFill('#F59E0B');
  headerBar.getBorder().setTransparent();

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, 10, pageWidth - 100, 32)
    .getText().setText('⚠ SLIDE INTERNO — CHECKLIST DE MANUTENÇÃO — REMOVER ANTES DE APRESENTAR')
    .getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(11).setBold(true)
    .setForegroundColor('#FFFFFF');

  // Data de geração
  const now = new Date();
  const dataGeracao = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - 200, 14, 190, 24)
    .getText().setText('Gerado em: ' + dataGeracao)
    .getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8)
    .setForegroundColor('#FFFFFF');

  // =========================================================
  // VERIFICAR DADOS DAS PLANILHAS
  // =========================================================
  let checks = [];

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);

    // Verificar semana atual na planilha (célula que contém a semana)
    const semanaAtual = sheet.getRange('A1').getValue();

    // Última data nos dados de sustentabilidade
    const ultimaDataSust = sheet.getRange('C160').getValue();
    const ultimaDataSustStr = ultimaDataSust instanceof Date
      ? Utilities.formatDate(ultimaDataSust, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      : (ultimaDataSust || 'vazia');

    // Verificar se tem dados na última linha de corretivas (linha 26)
    const totalCorretivas = sheet.getRange('K26').getValue();
    const totalPreventivas = sheet.getRange('H14').getDisplayValue();

    checks.push({ label: 'Planilha QUADRO COMPARATIVO acessível', ok: true, detalhe: 'Conexão OK' });
    checks.push({ label: 'Última data Sustentabilidade (C160)', ok: !!ultimaDataSust, detalhe: ultimaDataSustStr });
    checks.push({ label: 'Total Corretivas preenchido (K26)', ok: !!totalCorretivas, detalhe: totalCorretivas ? totalCorretivas.toString() : 'vazio' });

  } catch(e) {
    checks.push({ label: 'Planilha QUADRO COMPARATIVO', ok: false, detalhe: 'ERRO: ' + e.message });
  }

  try {
    const ss2   = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetGraficosId);
    const sheet2 = ss2.getSheetByName('Cópia de PAINEL INDICADORES');
    const sheet3 = ss2.getSheetByName('2026 GRÁFICOS');

    const kpiAcesso = sheet2 ? sheet2.getRange('E40').getValue() : null;
    const ultimaColGraf = sheet3 ? sheet3.getLastColumn() : 0;

    checks.push({ label: 'Planilha KPI KA acessível', ok: true, detalhe: 'Conexão OK' });
    checks.push({ label: 'KPI Acesso (E40) preenchido', ok: !!kpiAcesso, detalhe: kpiAcesso ? kpiAcesso.toString() : 'vazio' });
    checks.push({ label: 'Colunas em 2026 GRÁFICOS', ok: ultimaColGraf > 5, detalhe: ultimaColGraf + ' colunas' });

  } catch(e) {
    checks.push({ label: 'Planilha KPI KA POR CLIENTE', ok: false, detalhe: 'ERRO: ' + e.message });
  }

  // =========================================================
  // RENDERIZAR CHECKS DE DADOS
  // =========================================================
  const col1X = marginX;
  const col2X = pageWidth / 2 + 10;
  const startY = 65;
  const rowH   = 22;

  // Título seção dados
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col1X, startY, pageWidth - marginX * 2, 16)
    .getText().setText('📊 VERIFICAÇÃO DE DADOS DAS PLANILHAS').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(9).setBold(true)
    .setForegroundColor('#B45309');

  checks.forEach((c, i) => {
    const col = i < Math.ceil(checks.length / 2) ? col1X : col2X;
    const row = i < Math.ceil(checks.length / 2) ? i : i - Math.ceil(checks.length / 2);
    const cy  = startY + 18 + (row * rowH);
    const icon = c.ok ? '✅' : '❌';
    const color = c.ok ? '#065F46' : '#991B1B';
    const bg = c.ok ? '#D1FAE5' : '#FEE2E2';

    const rowBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, col, cy, (pageWidth / 2) - marginX - 10, rowH - 2);
    rowBg.getFill().setSolidFill(bg);
    rowBg.getBorder().setTransparent();

    slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col + 4, cy + 1, (pageWidth / 2) - marginX - 18, rowH - 4)
      .getText().setText(icon + ' ' + c.label + ' — ' + c.detalhe).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7.5)
      .setForegroundColor(color);
  });

  // =========================================================
  // CHECKLIST MANUAL — itens que o gestor deve revisar
  // =========================================================
  const checklistY = startY + 18 + (Math.ceil(checks.length / 2) * rowH) + 15;

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col1X, checklistY, pageWidth - marginX * 2, 16)
    .getText().setText('📋 CHECKLIST MANUAL — REVISAR ANTES DE APRESENTAR').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(9).setBold(true)
    .setForegroundColor('#1E40AF');

  const itensChecklist = [
    { secao: 'GERAL',              item: 'Número da semana no título do Overview (ex: Semana 17)'                },
    { secao: 'GERAL',              item: 'Data de geração na capa principal está correta'                        },
    { secao: 'MANUTENÇÕES',        item: 'Planilha QUADRO COMPARATIVO atualizada com dados da semana atual'      },
    { secao: 'MANUTENÇÕES',        item: 'Aba BOLETIM-CORRETIVAS com dados novos (linhas 7-26)'                  },
    { secao: 'MANUTENÇÕES',        item: 'Aba BOLETIM-PREVENTIVAS com dados novos (linhas 6-14)'                 },
    { secao: 'CONTROLE DE ACESSO', item: 'Aba "Cópia de PAINEL INDICADORES" atualizada (linhas 40-48)'          },
    { secao: 'CONTROLE DE ACESSO', item: 'Aba "2026 GRÁFICOS" com nova coluna semanal adicionada'               },
    { secao: 'CONTROLE DE ACESSO', item: 'Fórmulas de COMP. SEMANA (▲▼=) calculadas nas colunas F, I, L, O'    },
    { secao: 'SUSTENTABILIDADE',   item: 'Células C154:C160, F154:F160, K154:K160 com dados da semana'          },
    { secao: 'APRESENTAÇÃO',       item: 'Remover este slide antes de apresentar'                               },
  ];

  const secaoColors = {
    'GERAL':              '#6366F1',
    'MANUTENÇÕES':        CR_DESIGN_SYSTEM.colors.brandDark,
    'CONTROLE DE ACESSO': CR_DESIGN_SYSTEM.colors.brandMed,
    'SUSTENTABILIDADE':   CR_DESIGN_SYSTEM.colors.accentGreen,
    'APRESENTAÇÃO':       '#DC2626',
  };

  const colW = (pageWidth - marginX * 2 - 10) / 2;
  const itemH2 = 20;
  let col1Count = 0, col2Count = 0;
  const half = Math.ceil(itensChecklist.length / 2);

  itensChecklist.forEach((item, i) => {
    const isCol2 = i >= half;
    const cx = isCol2 ? col2X : col1X;
    const cy = checklistY + 18 + ((isCol2 ? col2Count : col1Count) * itemH2);
    const acColor = secaoColors[item.secao] || '#374151';

    const bg2 = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, cy, colW, itemH2 - 2);
    bg2.getFill().setSolidFill('#EFF6FF');
    bg2.getBorder().getLineFill().setSolidFill('#BFDBFE');

    // Badge seção
    const badgeW = 110;
    const badge = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx + 2, cy + 3, badgeW, itemH2 - 8);
    badge.getFill().setSolidFill(acColor, 0.15);
    badge.getBorder().setTransparent();
    slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 2, cy + 2, badgeW, itemH2 - 6)
      .getText().setText(item.secao).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6).setBold(true)
      .setForegroundColor(acColor);

    // Texto do item
    slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + badgeW + 6, cy + 2, colW - badgeW - 10, itemH2 - 4)
      .getText().setText('☐  ' + item.item).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
      .setForegroundColor('#1F2937');

    if (isCol2) col2Count++; else col1Count++;
  });

  Logger.log("✅ Slide Checklist concluído!");
}