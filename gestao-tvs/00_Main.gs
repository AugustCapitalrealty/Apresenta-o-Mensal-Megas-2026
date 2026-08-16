/**
 * ARQUIVO: 00_Main.gs
 * DESCRIÇÃO: Controlador principal e UI Global (Motor Multi-TV).
 */

const MESES_POR_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Atalho histórico — mantido porque é o que está no acionador.
function INICIAR_AQUI() { return gerarApresentacao(); }

// ==========================================
// CONFERE SE O PROJETO ESTÁ COMPLETO NO EDITOR
// ==========================================
// O código é copiado À MÃO para o editor do Apps Script (não há clasp), então
// é comum sobrar arquivo de uma versão e faltar de outra. Quando isso acontece
// com uma função cuja ASSINATURA mudou, o erro é ilegível: 00_Main chama com 3
// argumentos, o arquivo antigo espera 5, `unit` chega undefined e o Apps
// Script diz só "Cannot read properties of undefined (reading 'rows')" — sem
// apontar arquivo nenhum. Já aconteceu.
//
// `fn.length` devolve quantos parâmetros a função DECLARA, então dá para
// detectar o arquivo velho antes de rodar e dizer qual recopiar.
function _tvConferirProjeto_() {
  const esperado = [
    { fn: 'gerarSlideCorretivas',         args: 3, arquivo: '01_Slide_Corretivas.gs' },
    { fn: 'gerarSlideCorretivasDetalhe',  args: 3, arquivo: '02_Slide_Corretivas_Acao.gs' },
    { fn: 'gerarSlidePreventivas',        args: 3, arquivo: '03_Slide_Preventivas.gs' },
    { fn: 'gerarSlidePreventivasDetalhe', args: 3, arquivo: '04_Slide_Preventivas_Acao.gs' },
    { fn: 'obterMetaAuto',                args: 4, arquivo: 'Dados.gs' },
    { fn: 'obterCorretivasTV_',           args: 1, arquivo: 'Dados.gs' }
  ];

  const problemas = [];
  esperado.forEach(e => {
    // Declaração de função no topo de um .gs vira propriedade do objeto
    // global, então globalThis acha sem eval e sem quebrar quando não existe.
    const f = globalThis[e.fn];
    if (typeof f !== 'function') { problemas.push(e.arquivo + ' (falta a função ' + e.fn + ')'); return; }
    if (f.length !== e.args) {
      problemas.push(e.arquivo + ' (versão antiga: ' + e.fn + ' espera ' +
                     f.length + ' argumentos, o esperado são ' + e.args + ')');
    }
  });

  if (problemas.length) {
    throw new Error(
      'O projeto está com arquivos de versões diferentes. Copie do git para o ' +
      'editor:\n  · ' + problemas.join('\n  · ') +
      '\n(git push não publica nada — o código precisa ser colado no editor.)');
  }
}

// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// O menu "Selecionar função" do editor só lista funções SEM parâmetro (e
// esconde as que começam/terminam com "_"), então cada recorte que alguém
// vai querer rodar precisa da sua própria função sem argumento.
//
// Rodar UMA unidade é o caso comum: conferir um ajuste na TV do Esteio não
// deveria custar reprocessar Curitiba e Itajaí junto — são ~30s por unidade,
// e mexer nas três multiplica o risco de deixar as outras num estado
// intermediário se algo falhar no meio.
function gerarApresentacao() { return _tvGerar_(UNITS); }

function gerarCuritiba() { return _tvGerar_([_tvUnidade_('CURITIBA')]); }
function gerarItajai()   { return _tvGerar_([_tvUnidade_('ITAJA')]); }
function gerarEsteio()   { return _tvGerar_([_tvUnidade_('ESTEIO')]); }

// Acha a unidade em UNITS por um trecho do nome, sem acento e sem caixa
// ("ITAJA" casa com "MEGA ITAJAÍ"). Erro explícito se não achar — melhor que
// um `undefined` viajando até estourar lá dentro sem dizer o motivo.
function _tvUnidade_(trecho) {
  const alvo = _histNorm_(trecho);
  const u = UNITS.filter(x => _histNorm_(x.name).indexOf(alvo) >= 0)[0];
  if (!u) {
    throw new Error('Unidade "' + trecho + '" não está em UNITS (Config.gs). ' +
                    'Disponíveis: ' + UNITS.map(x => x.name).join(', ') + '.');
  }
  return u;
}


// ==========================================
// MOTOR
// ==========================================
// Roda as unidades pedidas. Cada uma é isolada: a que falha registra o erro e
// não impede as outras — um deck desatualizado é melhor que três.
// Devolve a lista de erros (vazia = tudo certo).
function _tvGerar_(unidades) {
  _tvConferirProjeto_();

  const planilha = SpreadsheetApp.openById(ID_PLANILHA);

  // A aba CHAMADOS deixou de ser fonte de número (os 4 slides operacionais
  // contam da BD-CORRETIVAS/BD-PREVENTIVAS — ver Dados.gs). Continua sendo
  // lida só para a data de sincronização mostrada no cabeçalho dos slides.
  const abaChamados = planilha.getSheetByName("CHAMADOS");
  if (!abaChamados) throw new Error("Aba 'CHAMADOS' não encontrada.");
  const dataSincronizacao = abaChamados.getRange("C5").getDisplayValue();

  const erros = [];
  unidades.forEach(unit => {
    Logger.log(`🚀 Iniciando atualização: ${unit.name}`);
    try {
      _tvAtualizarUnidade_(unit, planilha, dataSincronizacao);
      Logger.log(`✅ Concluído: ${unit.name}`);
    } catch (erro) {
      erros.push(`${unit.name}: ${erro.message}`);
      Logger.log(`❌ Erro ao atualizar ${unit.name}: ${erro.message}\n${erro.stack || '(sem stack)'}`);
    }
  });

  // Relatório honesto: a mensagem antiga era "Todas as 3 TVs foram
  // atualizadas com sucesso!" impressa SEMPRE, mesmo depois de três erros
  // seguidos logo acima.
  const ok = unidades.length - erros.length;
  if (erros.length) {
    Logger.log(`⚠️ ${ok} de ${unidades.length} atualizada(s). Com erro:\n  · ${erros.join('\n  · ')}`);
  } else {
    Logger.log(`🎉 ${ok} de ${unidades.length} TV(s) atualizada(s).`);
  }
  return erros;
}


// Atualiza UMA unidade. Sem try/catch aqui de propósito: quem chama decide o
// que fazer com a falha (_tvGerar_ isola por unidade).
function _tvAtualizarUnidade_(unit, planilha, dataSincronizacao) {
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

  // 2. A limpeza dos elementos acontece DENTRO de cada gerador, e só depois
  // que ele já tem os dados em mãos. Antes era um laço aqui que esvaziava os
  // 5 primeiros slides antes de qualquer leitura: bastava a fonte falhar para
  // a TV ficar com a parede em branco.

  // 3. DESENHA OS DADOS NOS SLIDES EXISTENTES. Os quatro slides operacionais
  // contam da base bruta (Dados.gs) e não recebem mais aba/coluna da planilha
  // da TV.
  gerarSlideCapa(slides[0], dataSincronizacao, unit);
  gerarSlideCorretivas(slides[1], dataSincronizacao, unit);
  gerarSlideCorretivasDetalhe(slides[2], dataSincronizacao, unit);
  gerarSlidePreventivas(slides[3], dataSincronizacao, unit);
  gerarSlidePreventivasDetalhe(slides[4], dataSincronizacao, unit);

  // 4. SE O SLIDE DO TEMPO AINDA ESTIVER VAZIO (primeira execução), preenche
  if (slides[5].getPageElements().length === 0) {
    try { atualizarSlideTempo(slides[5], unit); } catch (e) {}
  }

  // 5. SLIDES DE METAS: só redesenha se a aba correspondente tiver dados.
  // Sempre no mesmo slide (mesmo ID), então o link da TV não muda. Enquanto a
  // aba estiver vazia, o slide atual é preservado.
  (unit.metas || []).forEach((cfg, i) => {
    try {
      const metas = lerMetas(planilha, unit, cfg.papel);
      if (metas) renderSlideMetas(slides[6 + i], unit, metas);
    } catch (e) { Logger.log(`⚠️ Metas (${unit.name}/${cfg.papel}): ${e.message}\n${e.stack || '(sem stack)'}`); }
  });

  // 6. SLIDE DE CHEIAS: só na(s) unidade(s) com cheiasSheetId configurado.
  // Se já estiver vazio (primeira execução), preenche. Atualizações
  // recorrentes ficam a cargo de ATUALIZAR_MONITORAMENTO_CHEIAS().
  if (temCheias && slides[6 + numMetas].getPageElements().length === 0) {
    try { atualizarSlideCheias(slides[6 + numMetas], unit); } catch (e) {}
  }
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
