/**
 * ARQUIVO: 03_Slide_Preventivas.gs
 * DESCRIÇÃO: Volume e SLA Preventivas (Multi-TV).
 */

function gerarSlidePreventivas(slide, aba, dataGlobal, colAlvo, unit) { // Recebe slide direto
  // Limpa o próprio slide: o laço que esvaziava os 5 primeiros de uma vez
  // saiu de 00_Main.gs (ver o comentário lá). Este slide ainda lê a aba
  // PREVENTIVA, que está sempre presente, então limpar aqui no topo equivale
  // ao comportamento anterior.
  slide.getPageElements().forEach(el => el.remove());

  // colAlvo inválido (nenhuma coluna semanal encontrada na linha 23) — não
  // deixa quebrar a atualização inteira da unidade; desenha um aviso e sai.
  if (!colAlvo || colAlvo < 4) {
    Logger.log(`⚠️ Preventivas (${unit.name}): coluna de dado semanal não encontrada (colAlvo=${colAlvo}).`);
    const ds = CR_DESIGN_SYSTEM;
    applyBrandHeaderAndBackground(slide, "Visão Geral Preventiva", "Volume e Cumprimento de SLA", dataGlobal, unit);
    const txtErro = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 180, 620, 50);
    txtErro.getText().setText("⚠️ Dados de Preventivas indisponíveis no momento.")
      .getTextStyle().setFontSize(16).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    txtErro.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  const historico = [];
  const colInicial = Math.max(4, colAlvo - 4);

  for (let c = colInicial; c <= colAlvo; c++) {
    const valC = Number(aba.getRange(unit.rows.preventiva.conf, c).getValue()) || 0;
    const valNC = Number(aba.getRange(unit.rows.preventiva.nConf, c).getValue()) || 0;

    historico.push({
      dataCurta: aba.getRange(23, c).getDisplayValue(),
      conforme: valC,
      naoConforme: valNC,
      total: valC + valNC,
      slaPerc: aba.getRange(unit.rows.preventiva.perc, c).getDisplayValue()
    });
  }

  const atual = historico[historico.length - 1];
  const anterior = historico.length > 1 ? historico[historico.length - 2] : { conforme: 0, naoConforme: 0, total: 0 };

  Logger.log(`ℹ️ Preventivas (${unit.name}): colAlvo=${colAlvo}, linhas conf/nConf/perc=${unit.rows.preventiva.conf}/${unit.rows.preventiva.nConf}/${unit.rows.preventiva.perc}, historico=${JSON.stringify(historico)}`);

  const compMensal = obterComparativoSlaMensal(aba, unit);
  Logger.log(`ℹ️ Preventivas (${unit.name}): compMensal=${JSON.stringify(compMensal)}`);

  criarDashboardPreventivas(slide, atual, anterior, historico, dataGlobal, unit, compMensal);
}

// ==========================================
// COMPARATIVO "MÊS ATUAL x MÊS ANTERIOR NO MESMO DIA" (aba PREVENTIVA)
// Dois blocos, localizados por RÓTULO (não por linha fixa):
//   1) Histórico mensal — mesmas linhas de unit.rows.preventiva (conf/
//      nConf/perc), só que nas colunas mais à direita, uma por mês, com
//      cabeçalho na linha 23 escrito por extenso ("janeiro", "fevereiro"…).
//      A ÚLTIMA coluna preenchida é sempre o mês corrente (até hoje).
//   2) Comparativo de período — bloco à parte (colunas mais à direita
//      ainda), 3 linhas por unidade ("SLA CUMPRIDO"+nome / "SLA NÃO
//      CUMPRIDO"+nome / "SLA"), com o SLA do mês ANTERIOR restrito aos
//      mesmos dias do mês corrente até hoje (ex. "junho até 23").
// ==========================================
function obterComparativoSlaMensal(aba, unit) {
  try {
    const data = aba.getDataRange().getDisplayValues();

    // --- Mês corrente: última coluna com nome de mês na linha 23 ---
    const linha23 = data[22] || []; // 0-based
    let colMesAtual = -1;
    for (let c = linha23.length - 1; c >= 3; c--) {
      if (MESES_POR_EXTENSO.indexOf(String(linha23[c]).trim().toLowerCase()) >= 0) { colMesAtual = c; break; }
    }
    if (colMesAtual < 0) return null;

    const rowPerc = unit.rows.preventiva.perc - 1; // 0-based
    const slaMesAtual = data[rowPerc] ? data[rowPerc][colMesAtual] : null;
    if (!slaMesAtual) return null;

    // --- Mês anterior até o mesmo dia: bloco "SLA CUMPRIDO"+unidade ---
    // linhaCumprido = "SLA CUMPRIDO"+nome; +1 = "SLA NÃO CUMPRIDO"+nome; +2 = "SLA" (%).
    // ATENÇÃO: o histórico mensal (bloco 1) usa o MESMO rótulo "SLA
    // CUMPRIDO"+nome (uma coluna por mês); o comparativo de período (bloco
    // 2) tem só UMA coluna de valor. Para não confundir os dois, só aceita
    // a linha se, depois do nome da unidade, houver EXATAMENTE UM valor
    // preenchido na linha (não uma série de vários meses). O valor fica
    // sempre logo após o nome da unidade (coluna c+2) — sem precisar "achar
    // a última coluna", que é frágil se as 3 linhas do bloco não tiverem
    // exatamente a mesma largura de conteúdo.
    let linhaCumprido = -1, colValor = -1;
    for (let r = 0; r < data.length && linhaCumprido < 0; r++) {
      const row = data[r];
      for (let c = 0; c < row.length; c++) {
        if (_histNorm(row[c]).indexOf('sla cumprido') >= 0 &&
            _histNorm(row[c + 1] || '').indexOf(_histNorm(unit.name)) >= 0) {
          const preenchidos = row.slice(c + 2).filter(v => String(v || '').trim() !== '').length;
          if (preenchidos === 1) { linhaCumprido = r; colValor = c + 2; }
          break;
        }
      }
    }
    if (linhaCumprido < 0 || colValor < 0) return null;
    const slaMesAnterior = data[linhaCumprido + 2] ? data[linhaCumprido + 2][colValor] : null;
    if (!slaMesAnterior) return null;

    const numOuNull = v => {
      const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    return {
      mesLabel: linha23[colMesAtual],
      slaMesAtual: slaMesAtual,
      slaMesAnterior: slaMesAnterior,
      cumpridoAnterior: numOuNull(data[linhaCumprido][colValor]),
      naoCumpridoAnterior: numOuNull(data[linhaCumprido + 1][colValor])
    };
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler comparativo mensal de SLA (${unit.name}): ${e.message}`);
    return null;
  }
}

function criarDashboardPreventivas(slide, atual, anterior, historico, dataGlobal, unit, compMensal) {
  const ds = CR_DESIGN_SYSTEM;

  applyBrandHeaderAndBackground(slide, "Visão Geral Preventiva", "Volume e Cumprimento de SLA", dataGlobal, unit);

  const startY = ds.layout.contentY;

  const renderDeltaSLA = (x, y, w, valAt, valAn, tipo) => {
    const diff = valAt - valAn;
    if (valAn > 0 || diff !== 0) {
      const isUp = diff > 0;
      const arrow = isUp ? "▲" : (diff < 0 ? "▼" : "—");
      let dColor = ds.colors.textBody;
      if (tipo === 'CONFORME') dColor = isUp ? ds.colors.accentGreen : ds.colors.accentRed;
      if (tipo === 'NAO_CONFORME') dColor = isUp ? ds.colors.accentRed : ds.colors.accentGreen;

      const pText = valAn > 0 ? ` (${diff>0?'+':''}${(diff/valAn*100).toFixed(1)}%)` : "";
      const txtD = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 25);
      txtD.getText().setText(`${arrow} ${diff>0?'+':''}${diff}${pText}`)
        .getTextStyle().setFontSize(12).setFontFamily(ds.typography.titles).setForegroundColor(dColor).setBold(true);
    }
  };

  // Comparativo "mesmo período" (mês anterior até o mesmo dia de hoje) —
  // mais justo que o mês anterior completo quando o mês corrente ainda não
  // fechou. Usa compMensal quando disponível; senão cai no mês adjacente
  // completo (comportamento antigo), sem quebrar nada.
  const temPeriodo = !!(compMensal && compMensal.cumpridoAnterior != null && compMensal.naoCumpridoAnterior != null);
  const confAnteriorPeriodo = temPeriodo ? compMensal.cumpridoAnterior : anterior.conforme;
  const naoConfAnteriorPeriodo = temPeriodo ? compMensal.naoCumpridoAnterior : anterior.naoConforme;
  const totalAnteriorPeriodo = confAnteriorPeriodo + naoConfAnteriorPeriodo;

  const cX = ds.layout.marginX; const cW = 320;
  const bgTot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, cW, 130);
  bgTot.getFill().setSolidFill(ds.colors.cardBg); bgTot.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const accTot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, 5, 130);
  accTot.getFill().setSolidFill(ds.colors.brandDark); accTot.getBorder().setTransparent();

  const lblTot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+10, cW-20, 25);
  lblTot.getText().setText("VOLUME TOTAL DE ROTINAS").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  const valTot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+30, cW-20, 60);
  valTot.getText().setText(atual.total.toString()).getTextStyle().setFontSize(48).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandDark).setBold(true);
  renderDeltaSLA(cX+15, startY+90, cW-30, atual.total, totalAnteriorPeriodo, 'TOTAL');

  const cSW = 155; const cSY = startY + 145; const cSH = 100;
  const bgFac = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, cSY, cSW, cSH);
  bgFac.getFill().setSolidFill(ds.colors.cardBg); bgFac.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const lblFac = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+10, cSY+8, cSW-15, 20);
  lblFac.getText().setText("SLA CONFORME").getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.accentGreen).setBold(true);
  const valFac = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+10, cSY+25, cSW-15, 35);
  valFac.getText().setText(atual.conforme.toString()).getTextStyle().setFontSize(28).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  renderDeltaSLA(cX+10, cSY+65, cSW-20, atual.conforme, confAnteriorPeriodo, 'CONFORME');

  const cPX = cX + cSW + 10;
  const bgProp = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cPX, cSY, cSW, cSH);
  bgProp.getFill().setSolidFill(ds.colors.cardBg); bgProp.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const lblProp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cPX+10, cSY+8, cSW-15, 20);
  lblProp.getText().setText("NÃO CONFORME").getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.accentRed).setBold(true);
  const valProp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cPX+10, cSY+25, cSW-15, 35);
  valProp.getText().setText(atual.naoConforme.toString()).getTextStyle().setFontSize(28).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  renderDeltaSLA(cPX+10, cSY+65, cSW-20, atual.naoConforme, naoConfAnteriorPeriodo, 'NAO_CONFORME');

  const rX = 390; const rW = 280;
  const lblDist = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY, rW, 25);
  lblDist.getText().setText(`CUMPRIMENTO DO SLA (META: 90%)`).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  if (atual.total > 0) {
    const pC = atual.conforme / atual.total;
    const txtC = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY+20, 150, 20);
    txtC.getText().setText(`${Math.round(pC*100)}% DENTRO`).getTextStyle().setFontSize(10).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.accentGreen).setBold(true);
    const txtNC = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX+130, startY+20, 150, 20);
    txtNC.getText().setText(`${Math.round((1-pC)*100)}% FORA`).getTextStyle().setFontSize(10).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.accentRed).setBold(true);
    txtNC.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

    const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, startY+40, rW, 15);
    bgBar.getFill().setSolidFill(ds.colors.accentRed); bgBar.getBorder().setTransparent();
    if (pC > 0) {
      const actBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, startY+40, Math.max(rW*pC, 1), 15);
      actBar.getFill().setSolidFill(ds.colors.accentGreen); actBar.getBorder().setTransparent();
    }

    const markX = rX + (rW * 0.9);
    const markLine = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, markX, startY+38, 2, 19);
    markLine.getFill().setSolidFill(ds.colors.textMain);
    markLine.getBorder().setTransparent();
  }

  // Comparativo "mês atual x mês anterior no mesmo dia" (período do mesmo
  // tamanho — mais justo que comparar um mês incompleto com um mês fechado
  // inteiro). Só aparece se a aba PREVENTIVA tiver os blocos correspondentes.
  if (compMensal) {
    const atualN = parseFloat(String(compMensal.slaMesAtual).replace('%', '').replace(',', '.'));
    const anteriorN = parseFloat(String(compMensal.slaMesAnterior).replace('%', '').replace(',', '.'));
    if (!isNaN(atualN) && !isNaN(anteriorN)) {
      const diff = Math.round((atualN - anteriorN) * 100) / 100;
      const seta = diff > 0 ? '▲' : (diff < 0 ? '▼' : '—');
      const cor = diff > 0 ? ds.colors.accentGreen : (diff < 0 ? ds.colors.accentRed : ds.colors.textBody);
      const diffTxt = diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')}`;
      // Nome do mês ANTERIOR (não o mês corrente de novo): pega o mês antes
      // de compMensal.mesLabel na lista, com wrap de dezembro->janeiro.
      const idxMes = MESES_POR_EXTENSO.indexOf(String(compMensal.mesLabel).trim().toLowerCase());
      const mesAnteriorNome = idxMes >= 0 ? MESES_POR_EXTENSO[(idxMes + 11) % 12] : 'mês';
      const txtComp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY+58, rW, 20);
      txtComp.getText().setText(`${seta} ${diffTxt} p.p. vs ${mesAnteriorNome} (mesmo período)`)
        .getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(cor).setBold(true);
    }
  }

  const histY = startY + 85;
  const lblHist = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, histY, rW, 25);
  lblHist.getText().setText("EVOLUÇÃO (ÚLTIMOS 5)").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const maxVal = Math.max(...historico.map(h => h.total), 1);
  const hW = 35; const hGap = (rW - (historico.length*hW)) / Math.max(1, historico.length-1);
  historico.forEach((item, i) => {
    const bx = rX + (i * (hW + hGap));
    const bh = Math.max((item.total / maxVal) * 90, 1);
    const barY = 350 - bh;
    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, barY, hW, bh);
    bar.getFill().setSolidFill(i === historico.length-1 ? ds.colors.brandDark : ds.colors.lines);
    bar.getBorder().setTransparent();

    const bV = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx-5, barY-25, hW+10, 25);
    bV.getText().setText(item.total.toString()).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
    bV.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const bD = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx-25, 355, hW+50, 20);
    bD.getText().setText(item.dataCurta).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
    bD.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  const txtFooter = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 380, 600, 20);
  txtFooter.getText().setText("Fonte: Infraspeak")
    .getTextStyle().setFontSize(8).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
}
