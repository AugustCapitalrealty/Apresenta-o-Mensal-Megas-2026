/**
 * ARQUIVO: 00_Main.gs
 * DESCRIÇÃO: Controlador principal e UI Global (Motor Multi-TV).
 */

const MESES_POR_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function INICIAR_AQUI() {
  gerarApresentacao();
}

function gerarApresentacao() {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);

  const abaChamados = planilha.getSheetByName("CHAMADOS");
  if (!abaChamados) throw new Error("Aba 'CHAMADOS' não encontrada.");

  const dataSincronizacao = abaChamados.getRange("C5").getDisplayValue();

  const valChamados = abaChamados.getRange(39, 1, 1, abaChamados.getLastColumn()).getValues()[0];
  let colAlvoChamados = -1;
  for (let i = valChamados.length - 1; i >= 2; i--) {
    if (valChamados[i] !== "" && valChamados[i] !== null) { colAlvoChamados = i + 1; break; }
  }

  const abaPreventivas = planilha.getSheetByName("PREVENTIVA");
  if (!abaPreventivas) throw new Error("Aba 'PREVENTIVA' não encontrada.");
  const valPrev = abaPreventivas.getRange(23, 1, 1, abaPreventivas.getLastColumn()).getValues()[0];
  let colAlvoPrev = -1;
  // A linha 23 inteira virou um cabeçalho MENSAL (um nome de mês por extenso
  // por coluna — "janeiro", "fevereiro"... "agosto"), não mais semanal.
  // Acha a ÚLTIMA coluna cujo cabeçalho é um nome de mês — essa é a coluna
  // do mês corrente.
  const ehNomeDeMes = v => MESES_POR_EXTENSO.indexOf(String(v).trim().toLowerCase()) >= 0;
  for (let i = valPrev.length - 1; i >= 3; i--) {
    if (ehNomeDeMes(valPrev[i])) { colAlvoPrev = i + 1; break; }
  }
  // Rede de segurança: se não achar nenhum nome de mês (ex.: layout mudou
  // de novo), volta para a última coluna não vazia, sem o filtro — nunca
  // pior do que travar o slide inteiro (colAlvoPrev = -1).
  if (colAlvoPrev < 0) {
    for (let i = valPrev.length - 1; i >= 3; i--) {
      if (valPrev[i] !== "" && valPrev[i] !== null) { colAlvoPrev = i + 1; break; }
    }
  }
  Logger.log(`ℹ️ PREVENTIVA: colAlvoPrev=${colAlvoPrev} (valor na linha 23: "${colAlvoPrev > 0 ? valPrev[colAlvoPrev - 1] : '-'}")`);

  UNITS.forEach(unit => {
    Logger.log(`🚀 Iniciando atualização: ${unit.name}`);
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();

      // Estrutura por unidade:
      // 0: capa | 1-4: corretivas/preventivas | 5: previsão do tempo
      // 6...: slides de Metas (1 por papel em unit.metas)
      // último slide (apenas unidades com cheiasSheetId): monitoramento de cheias
      const numMetas = (unit.metas || []).length;
      const temCheias = !!unit.cheiasSheetId;
      const totalSlides = 6 + numMetas + (temCheias ? 1 : 0);

      // 1. GARANTE A QUANTIDADE DE SLIDES (sem deletar a apresentação inteira).
      // Os novos slides são SEMPRE acrescentados no fim, então os slides já
      // existentes (e seus IDs/links na TV) são preservados.
      while (slides.length < totalSlides) {
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = deck.getSlides();
      }
      while (slides.length > totalSlides) {
        slides[slides.length - 1].remove();
        slides = deck.getSlides();
      }

      // 2. LIMPA APENAS OS ELEMENTOS DOS 5 PRIMEIROS SLIDES (dados)
      // (Mantém o ID do Slide intacto; NÃO mexe no slide do tempo nem nos de Metas)
      slides.forEach((slide, idx) => {
        if (idx < 5) slide.getPageElements().forEach(el => el.remove());
      });

      // 3. DESENHA OS DADOS NOS SLIDES EXISTENTES
      gerarSlideCapa(slides[0], dataSincronizacao, unit);
      gerarSlideCorretivas(slides[1], abaChamados, dataSincronizacao, colAlvoChamados, unit);
      gerarSlideCorretivasDetalhe(slides[2], planilha, dataSincronizacao, unit);
      gerarSlidePreventivas(slides[3], abaPreventivas, dataSincronizacao, colAlvoPrev, unit);
      gerarSlidePreventivasDetalhe(slides[4], planilha, dataSincronizacao, unit);

      // 4. SE O SLIDE DO TEMPO AINDA ESTIVER VAZIO (primeira execução), preenche
      if (slides[5].getPageElements().length === 0) {
        try { atualizarSlideTempo(slides[5], unit); } catch(e) {}
      }

      // 5. SLIDES DE METAS: só redesenha se a aba correspondente tiver dados.
      // Sempre no mesmo slide (mesmo ID), então o link da TV não muda. Enquanto
      // a aba estiver vazia, o slide atual é preservado (não apaga o que está na TV).
      (unit.metas || []).forEach((cfg, i) => {
        try {
          const metas = lerMetas(planilha, unit, cfg.papel);
          if (metas) renderSlideMetas(slides[6 + i], unit, metas);
        } catch(e) { Logger.log(`⚠️ Metas (${unit.name}/${cfg.papel}): ${e.message}\n${e.stack || '(sem stack)'}`); }
      });

      // 6. SLIDE DE CHEIAS: só na(s) unidade(s) com cheiasSheetId configurado.
      // Se já estiver vazio (primeira execução), preenche. Atualizações
      // recorrentes ficam a cargo de ATUALIZAR_MONITORAMENTO_CHEIAS().
      if (temCheias && slides[6 + numMetas].getPageElements().length === 0) {
        try { atualizarSlideCheias(slides[6 + numMetas], unit); } catch(e) {}
      }

      Logger.log(`✅ Concluído: ${unit.name}`);
    } catch (erro) {
      Logger.log(`❌ Erro ao atualizar ${unit.name}: ${erro.message}\n${erro.stack || '(sem stack)'}`);
    }
  });

  Logger.log("🎉 Todas as 3 TVs foram atualizadas com sucesso!");
}

function insertLogoProportional(slide, blob, targetX, targetY, maxW, maxH) {
  try {
    const img = slide.insertImage(blob);
    const w = img.getWidth();
    const h = img.getHeight();
    const ratio = w / h;
    let newW = maxW;
    let newH = maxW / ratio;
    if (newH > maxH) {
      newH = maxH;
      newW = maxH * ratio;
    }
    const offsetX = targetX + (maxW - newW) / 2;
    const offsetY = targetY + (maxH - newH) / 2;
    img.setLeft(offsetX);
    img.setTop(offsetY);
    img.setWidth(newW);
    img.setHeight(newH);
  } catch(e) {}
}

function applyBrandHeaderAndBackground(slide, titleText, subtitleText, dataGlobal, unit, opts) {
  const ds = CR_DESIGN_SYSTEM;
  opts = opts || {};
  slide.getBackground().setSolidFill(ds.colors.bgSlide);

  const circle1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 480, -150, 450, 450);
  circle1.getFill().setSolidFill('#F1F5F9');
  circle1.getBorder().setTransparent();

  const circle2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -100, 250, 300, 300);
  circle2.getFill().setSolidFill('#F1F5F9');
  circle2.getBorder().setTransparent();

  const txtTit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, ds.layout.marginY, 400, 35);
  txtTit.getText().setText(titleText)
    .getTextStyle().setFontSize(22).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const txtSub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, ds.layout.marginY + 30, 400, 25);
  txtSub.getText().setText(`${subtitleText} • ${unit.name}`)
    .getTextStyle().setFontSize(14).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);

  const startX = 720 - ds.layout.marginX - 230;

  try {
    const unitBlob = DriveApp.getFileById(unit.unitLogoId).getBlob();
    insertLogoProportional(slide, unitBlob, startX, ds.layout.marginY, 100, 40);
  } catch(e) {}

  try {
    const brandBlob = DriveApp.getFileById(unit.brandLogoId).getBlob();
    insertLogoProportional(slide, brandBlob, startX + 110, ds.layout.marginY, 120, 40);
  } catch(e) {}

  const txtData = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, startX, ds.layout.marginY + 40, 230, 20);
  txtData.getText().setText(opts.dataLabel || `Atualizado: ${dataGlobal}`)
    .getTextStyle().setFontSize(10).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody).setBold(true);
  txtData.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
}
