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
    { fn: 'obterCorretivasTV_',           args: 1, arquivo: 'Dados.gs' },
    { fn: 'atualizarSlideSolicitacoes',   args: 2, arquivo: '09_Slide_Solicitacoes.gs' },
    { fn: '_solIndice_',                  args: 1, arquivo: '09_Slide_Solicitacoes.gs' },
    { fn: '_portalBuscar_',               args: 2, arquivo: '09_Slide_Solicitacoes.gs' },
    { fn: 'atualizarSlideWebdox',         args: 2, arquivo: '10_Slide_Webdox.gs' },
    { fn: '_webIndice_',                  args: 1, arquivo: '10_Slide_Webdox.gs' },
    { fn: '_tvAplicarMarca_',             args: 1, arquivo: 'Visual.gs' },
    { fn: '_tvTexto_',                    args: 7, arquivo: 'Visual.gs' },
    { fn: '_tvKpi_',                      args: 6, arquivo: 'Visual.gs' },
    { fn: '_tvFotoEmBloco_',              args: 8, arquivo: 'Visual.gs' },
    { fn: '_tvVeu_',                      args: 9, arquivo: 'Visual.gs' },
    { fn: '_tvLogoChip_',                 args: 6, arquivo: 'Visual.gs' },
    { fn: 'atualizarSlideChuva',          args: 2, arquivo: '11_Slide_Chuva.gs' },
    { fn: '_chuvaIndice_',                args: 1, arquivo: '11_Slide_Chuva.gs' }
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
  // depois (apenas unidades com cheiasSheetId): monitoramento de cheias
  // por último (unidades com portalEmpreendimento): kanban de solicitações e
  // contratos no Webdox, nessa ordem
  // por último, em todas: chuva do mês (11_Slide_Chuva.gs)
  // Slide novo entra SEMPRE no fim: Tempo, Metas e Cheias são achados pela
  // posição, e um slide no meio empurraria todos eles. A ordem em que a TV
  // MOSTRA é outra coisa — é a do Painel_<Mega>.txt (gerarArquivosPainelTV).
  const numMetas = (unit.metas || []).length;
  const temCheias = !!unit.cheiasSheetId;
  const temKanban = !!unit.portalEmpreendimento;
  const totalSlides = 6 + numMetas + (temCheias ? 1 : 0) + (temKanban ? 2 : 0) + 1;

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

  // 7. KANBAN DE SOLICITAÇÕES (Portal de Solicitações). Se o portal falhar,
  // o slide atual é preservado — ver 09_Slide_Solicitacoes.gs.
  if (temKanban) {
    try { atualizarSlideSolicitacoes(slides[_solIndice_(unit)], unit); }
    catch (e) { Logger.log(`⚠️ Solicitações (${unit.name}): ${e.message}`); }
    // 8. CONTRATOS NO WEBDOX — mesmo portal, mesma regra de segurança.
    try { atualizarSlideWebdox(slides[_webIndice_(unit)], unit); }
    catch (e) { Logger.log(`⚠️ Webdox (${unit.name}): ${e.message}`); }
  }

  // 9. CHUVA DO MÊS: como Tempo e Cheias, só preenche se estiver vazio — quem
  // atualiza é ATUALIZAR_CHUVA_MES, no acionador dele (o anel tem ~150 formas
  // e redesenhar as três TVs aqui encostaria no limite de 6 min).
  const iChuva = _chuvaIndice_(unit);
  if (slides[iChuva].getPageElements().length === 0) {
    try { atualizarSlideChuva(slides[iChuva], unit); }
    catch (e) { Logger.log(`⚠️ Chuva do mês (${unit.name}): ${e.message}`); }
  }
}


// ==========================================
// ARQUIVOS DO PAINEL DA TV (para a TI)
// ==========================================
// Cada TV roda um painel que abre os slides UM A UM pelo ID
// (…/present?slide=id.<ID>). Slide que não está no arquivo não aparece na TV —
// foi assim que as Metas do Analista (Itajaí) e as Cheias (Esteio) ficaram de
// fora. Esta função lê os decks e grava no Drive um Painel_<Unidade>.txt por
// TV, com TODOS os slides na ordem, pronto para mandar para a TI.
//
// Rode DEPOIS de gerarApresentacao(): slide que ainda não existe não tem ID.
function gerarArquivosPainelTV() {
  const nomes = ['Capa', 'Visão Geral Corretiva', 'Backlog Corretivo', 'Visão Geral Preventiva',
                 'Backlog Preventivo', 'Previsão do Tempo'];
  const pasta = DriveApp.getRootFolder();
  UNITS.forEach(unit => {
    const slides = SlidesApp.openById(unit.deckId).getSlides();
    const rotulos = nomes.slice();
    (unit.metas || []).forEach(m => rotulos.push('Metas ' + m.papel));
    if (unit.cheiasSheetId) rotulos.push('Monitoramento de Cheias');
    if (unit.portalEmpreendimento) rotulos.push('Kanban de Solicitações', 'Contratos no Webdox');
    rotulos.push('Chuva do Mês');

    // Ordem da TV ≠ ordem do deck: a Chuva do mês é o último slide do deck
    // (slide novo vai sempre para o fim), mas na TV ela vem logo depois da
    // Previsão do tempo (posição 5).
    const ordem = slides.map((s, i) => i);
    const iChuva = _chuvaIndice_(unit);
    if (iChuva < slides.length) { ordem.splice(ordem.indexOf(iChuva), 1); ordem.splice(6, 0, iChuva); }

    // Mesmos parâmetros dos arquivos que a TI já usa (19/10/2026): capa 20 s,
    // demais 30 s, cada aba recarrega a cada 10 min.
    const sites = ordem.map(i => ({
      url: 'https://docs.google.com/presentation/d/' + unit.deckId + '/present?slide=id.' + slides[i].getObjectId(),
      duration: i === 0 ? 20 : 30,
      tabReloadIntervalSeconds: 600
    }));
    (unit.painelExtras || []).forEach(url => sites.push({ url: url, duration: 30, tabReloadIntervalSeconds: 600 }));

    const json = JSON.stringify({
      settingsReloadIntervalMinutes: 60, fullscreen: true, autoStart: true, lazyLoadTabs: true,
      websites: sites
    }, null, 2);

    const cidade = _histNorm_(unit.name).replace(/^mega\s+/, '').replace(/\s+/g, '_');
    const nome = 'Painel_' + cidade.charAt(0).toUpperCase() + cidade.slice(1) + '.txt';
    const antigos = pasta.getFilesByName(nome);
    while (antigos.hasNext()) antigos.next().setTrashed(true);
    const arq = pasta.createFile(nome, json, MimeType.PLAIN_TEXT);

    Logger.log(`📺 ${unit.name}: ${slides.length} slide(s) → ${nome}  ${arq.getUrl()}`);
    ordem.forEach((i, n) => Logger.log(`   ${n + 1}. ${rotulos[i] || '(slide extra — confira)'}  id.${slides[i].getObjectId()}`));
    if (slides.length !== rotulos.length) {
      Logger.log(`   ⚠️ O deck tem ${slides.length} slides e o esperado são ${rotulos.length}. ` +
                 'Rode gerarApresentacao() antes, para acertar a contagem.');
    }
    (unit.painelExtras || []).forEach(url => Logger.log('   + página extra: ' + url));
  });
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

// Cabeçalho de todo slide de conteúdo — padrão do Orçamento 2027 (ver
// Visual.gs): barra de destaque, título na fonte da marca, subtítulo com o
// número que importa e o nome do Mega, logos à direita e uma linha fina
// embaixo (y = 72). O conteúdo começa em y = 84. Aplica a marca da unidade
// (Curitiba = Demercado) antes de desenhar qualquer coisa.
function applyBrandHeaderAndBackground(slide, titleText, subtitleText, dataGlobal, unit, opts) {
  _tvAplicarMarca_(unit);
  const ds = CR_DESIGN_SYSTEM, c = ds.colors;
  opts = opts || {};
  slide.getBackground().setSolidFill(c.bgSlide);

  _tvRet_(slide, 30, 16, 5, 46, c.brandLight);
  const serifa = ds.typography.heading !== ds.typography.titles;   // Garamond é menor no mesmo corpo
  _tvTexto_(slide, 40, 10, 420, 34, titleText,
    { fs: serifa ? 28 : 24, fsMin: 14, bold: true, cor: c.brandDark, fonte: ds.typography.heading, cortar: true });
  _tvTexto_(slide, 40, 42, 420, 20, `${subtitleText} · ${_tvNomeUnidade_(unit)}`,
    { fs: 11.5, fsMin: 8, cor: c.textBody, fonte: ds.typography.body, cortar: true });

  try {
    insertLogoProportional(slide, DriveApp.getFileById(unit.unitLogoId).getBlob(), 470, 12, 95, 34);
  } catch (e) {}
  try {
    insertLogoProportional(slide, DriveApp.getFileById(unit.brandLogoId).getBlob(), 575, 14, 115, 30);
  } catch (e) {}
  _tvTexto_(slide, 470, 50, 220, 16, opts.dataLabel || `Atualizado: ${dataGlobal}`,
    { fs: 8.5, fsMin: 7, bold: true, cor: c.textMuted, fonte: ds.typography.body, align: 'R' });

  const linha = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 30, 72, 690, 72);
  linha.getLineFill().setSolidFill(c.lines);
  linha.setWeight(1);
}
