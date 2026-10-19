/**
 * ARQUIVO: 09_Slide_Solicitacoes.gs
 * DESCRIÇÃO: Kanban das solicitações de Facilities EM ANDAMENTO do Mega, no
 *            ÚLTIMO slide de cada TV — com quem cada uma está parada agora:
 *
 *   COM O SOLICITANTE  correção pendente, aguardando informações
 *   COM O BACKOFFICE   recebido, em análise, aprovado, em processamento
 *   EMITIDAS           OC/AC emitida, aguardando aceite (falta liberar)
 *   LIBERADAS          com o fornecedor até a NF/boleto
 *
 * FONTE: função `kanban-megas` do Portal de Solicitações (app Lovable, repo
 * AugustCapitalrealty/megas-adc1ba20), que já devolve os cards separados por
 * coluna com a mesma regra das telas do portal (src/lib/etapas-compra.ts e
 * situacao-solicitacao.ts). Este arquivo não reclassifica nada: só desenha.
 *
 * Endereço em PORTAL_KANBAN_URL (Config.gs); o Mega vai em
 * UNITS[].portalEmpreendimento; a chave nas Propriedades do script como
 * PORTAL_API_KEY — nunca no código.
 *
 * POSIÇÃO: o último slide da TV (depois das Metas e, no Esteio, das Cheias).
 * Entrou por último de propósito: Tempo (5), Metas (6+) e Cheias são achados
 * pela POSIÇÃO, e um slide no meio empurraria todos eles.
 *
 * SEGURANÇA (mesma regra das Metas): se o portal não responder, o slide atual
 * é PRESERVADO — a TV não troca o kanban de ontem por uma tela de erro. Só
 * quando o slide ainda está vazio (primeira vez) ele recebe o aviso do motivo.
 * Para entender uma falha: diagnosticarSolicitacoes().
 */

// Colunas na ordem do kanban. `status` só serve para o diagnóstico conferir;
// quem decide a coluna é o portal.
//
// As cores são escritas aqui, e não lidas de CR_DESIGN_SYSTEM, DE PROPÓSITO:
// o Apps Script carrega os arquivos em ordem alfabética, "09_…" vem antes de
// "Config.gs", e um `const` de topo que lê CR_DESIGN_SYSTEM daria
// "Cannot access 'CR_DESIGN_SYSTEM' before initialization" — e derrubaria o
// projeto inteiro, não só este slide. (Dentro de função pode usar à vontade:
// ela só roda depois que tudo carregou.) brandLight = #065CA9,
// accentGreen = #10B981.
const _SOL_COLUNAS_ = [
  { chave: 'solicitante', titulo: 'COM O SOLICITANTE', sub: 'Correção ou informação pendente',
    cor: '#F59E0B', status: ['pendente_correcao', 'aguardando_informacoes'] },
  { chave: 'backoffice',  titulo: 'COM O BACKOFFICE',  sub: 'Análise, lançamento e aprovação',
    cor: '#065CA9', status: ['recebido', 'em_analise', 'aprovado', 'em_processamento'] },
  { chave: 'emitida',     titulo: 'EMITIDAS',          sub: 'OC emitida, aguardando liberação',
    cor: '#9333EA', status: ['oc_ac_emitida', 'aguardando_aceite'] },
  { chave: 'liberada',    titulo: 'LIBERADAS',         sub: 'Com o fornecedor até a NF',
    cor: '#10B981',
    status: ['liberado_fornecedor', 'enviado_fornecedor', 'aguardando_execucao', 'aguardando_nf_boleto', 'nf_boleto_enviados'] }
];

// Prazo (dias) que o portal acorda para a etapa — mesmos números de
// responsavelDaSolicitacao() (src/lib/responsavel-solicitacao.ts). Sem prazo,
// vale a faixa genérica do portal (tomDoTempo): até 3 dias ok, até 5 atenção.
const _SOL_PRAZO_DIAS_ = { recebido: 5, em_analise: 5, aprovado: 3, em_processamento: 3 };


// ==========================================
// PONTOS DE ENTRADA (use no acionador / botão)
// ==========================================
// Redesenha só o kanban, sem tocar nos outros slides. O kanban muda ao longo
// do dia — vale um acionador próprio, mais frequente que o da apresentação.
function ATUALIZAR_SOLICITACOES()          { return _tvSolicitacoes_(UNITS); }
function ATUALIZAR_SOLICITACOES_CURITIBA() { return _tvSolicitacoes_([_tvUnidade_('CURITIBA')]); }
function ATUALIZAR_SOLICITACOES_ITAJAI()   { return _tvSolicitacoes_([_tvUnidade_('ITAJA')]); }
function ATUALIZAR_SOLICITACOES_ESTEIO()   { return _tvSolicitacoes_([_tvUnidade_('ESTEIO')]); }

// Posição do kanban: depois dos 6 slides base, das Metas e das Cheias.
function _solIndice_(unit) {
  return 6 + (unit.metas || []).length + (unit.cheiasSheetId ? 1 : 0);
}

function _tvSolicitacoes_(unidades) {
  const erros = [];
  unidades.forEach(unit => {
    if (!unit.portalEmpreendimento) return;
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const idx = _solIndice_(unit);
      // Só acrescenta no fim; quem acerta a contagem total é _tvAtualizarUnidade_.
      while (slides.length < idx + 1) {
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = deck.getSlides();
      }
      atualizarSlideSolicitacoes(slides[idx], unit);
    } catch (e) {
      erros.push(unit.name + ': ' + e.message);
      Logger.log('❌ Solicitações (' + unit.name + '): ' + e.message);
    }
  });
  if (erros.length) Logger.log('⚠️ Solicitações com erro:\n  · ' + erros.join('\n  · '));
  return erros;
}


// ==========================================
// LEITURA — Portal de Solicitações
// ==========================================

/**
 * { geradoEm: Date|null, total, colunas: { solicitante: [card], ... } } da
 * unidade. Lança erro com a causa legível quando não dá para ler.
 */
function obterKanbanSolicitacoes_(unit) {
  const emp = unit.portalEmpreendimento;
  if (!emp) throw new Error(unit.name + ' sem portalEmpreendimento em UNITS (Config.gs).');

  const chave = PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY');
  if (!chave) {
    throw new Error('Falta a chave do portal: cadastre PORTAL_API_KEY em Configurações do projeto → ' +
                    'Propriedades do script (a mesma do secret RELATORIOS_API_KEY no portal).');
  }

  const url = PORTAL_KANBAN_URL + '?empreendimento=' + encodeURIComponent(emp);
  const resp = UrlFetchApp.fetch(url, {
    method: 'get', headers: { 'x-api-key': chave }, muteHttpExceptions: true
  });
  const codigo = resp.getResponseCode();
  const corpo = resp.getContentText();
  if (codigo === 401 || codigo === 403) {
    throw new Error('O portal recusou a chave (HTTP ' + codigo + '): a PORTAL_API_KEY do script ' +
                    'não é a mesma do secret RELATORIOS_API_KEY do portal.');
  }
  if (codigo === 404) {
    throw new Error('Função kanban-megas não encontrada (HTTP 404) — ela está publicada no portal? ' + url);
  }
  if (codigo !== 200) {
    throw new Error('O portal respondeu HTTP ' + codigo + ': ' + String(corpo).slice(0, 200));
  }

  let dados;
  try { dados = JSON.parse(corpo); }
  catch (e) { throw new Error('Resposta do portal não é JSON: ' + String(corpo).slice(0, 120)); }
  return _solNormalizar_(dados);
}

// Confere o formato e deixa os cards prontos para desenhar. Coluna faltando
// é ERRO, não coluna vazia: sem isso, uma mudança de nome no portal zeraria o
// kanban sem ninguém perceber (lição 3 do CLAUDE.md — zero falso).
function _solNormalizar_(dados) {
  if (!dados || typeof dados !== 'object' || !dados.colunas || typeof dados.colunas !== 'object') {
    throw new Error('Resposta do portal sem "colunas" — o formato da função mudou?');
  }
  const colunas = {};
  let total = 0;
  _SOL_COLUNAS_.forEach(c => {
    const lista = dados.colunas[c.chave];
    if (!Array.isArray(lista)) {
      throw new Error('Resposta do portal sem a coluna "' + c.chave + '" — o formato da função mudou?');
    }
    const cards = lista.map(_solCard_);
    // A mais parada primeiro — o portal já manda assim; reordenar aqui só
    // garante que o corte de cards por coluna esconda as mais RECENTES.
    cards.sort((a, b) => (a.desde ? a.desde.getTime() : 0) - (b.desde ? b.desde.getTime() : 0));
    colunas[c.chave] = cards;
    total += cards.length;

    const declarado = dados.totais && dados.totais[c.chave];
    if (declarado != null && Number(declarado) !== cards.length) {
      Logger.log('⚠ Solicitações: o portal diz ' + declarado + ' em "' + c.chave + '", mas mandou ' +
                 cards.length + ' cards. O slide mostra os cards.');
    }
  });

  const geradoEm = dados.gerado_em ? new Date(dados.gerado_em) : null;
  return { geradoEm: geradoEm && !isNaN(geradoEm) ? geradoEm : null, total: total, colunas: colunas };
}

function _solCard_(c) {
  c = c || {};
  const desde = c.desde ? new Date(c.desde) : null;
  let dias = Number(c.dias_no_status);
  if (isNaN(dias) && desde && !isNaN(desde)) dias = Math.floor((Date.now() - desde.getTime()) / 86400000);
  const valor = (c.valor === null || c.valor === undefined || c.valor === '') ? null : Number(c.valor);
  return {
    protocolo:   String(c.protocolo || '—'),
    status:      String(c.status || ''),
    descricao:   String(c.descricao || '').replace(/\s+/g, ' ').trim(),
    fornecedor:  c.fornecedor ? String(c.fornecedor) : '',
    solicitante: c.solicitante ? String(c.solicitante) : '',
    quem:        c.quem ? String(c.quem) : '',
    proximo:     c.proximo ? String(c.proximo) : '',
    valor:       valor === null || isNaN(valor) ? null : valor,
    emergencial: c.emergencial === true,
    contrato:    c.contrato === true,
    desde:       desde && !isNaN(desde) ? desde : null,
    dias:        isNaN(dias) ? null : Math.max(0, Math.floor(dias))
  };
}


// ==========================================
// REGRAS DE EXIBIÇÃO
// ==========================================

// Mesma régua do portal (tomDoTempo): com prazo acordado, atrasado passou do
// prazo e atenção é o último dia; sem prazo, até 3 dias ok e até 5 atenção.
function _solTom_(card) {
  const d = card.dias;
  if (d === null) return 'ok';
  const prazo = _SOL_PRAZO_DIAS_[card.status];
  if (prazo) {
    if (d > prazo) return 'atrasado';
    if (d >= prazo - 1) return 'atencao';
    return 'ok';
  }
  if (d <= 3) return 'ok';
  if (d <= 5) return 'atencao';
  return 'atrasado';
}

function _solCorTom_(tom) {
  const c = CR_DESIGN_SYSTEM.colors;
  return tom === 'atrasado' ? c.accentRed : (tom === 'atencao' ? c.accentOrange : c.accentGreen);
}

// Linha de baixo do card: o que importa para a coluna. Na do solicitante e
// na das emitidas, QUEM tem que agir (o solicitante do Mega); no backoffice,
// o passo que falta; nas liberadas, o fornecedor.
function _solInfoCard_(card, coluna) {
  let info;
  if (coluna === 'backoffice')    info = card.proximo || card.quem;
  else if (coluna === 'liberada') info = card.fornecedor || card.proximo;
  else                            info = card.solicitante || card.quem;
  // "Contrato" vai NA FRENTE: a linha é cortada com "…" no fim, e no fim a
  // marca sumia justamente nos textos longos.
  if (card.contrato) info = info ? 'Contrato · ' + info : 'Contrato';
  return info || '';
}

// "R$ 850", "R$ 12 mil", "R$ 1,2 mi" — cabe no canto do card.
function _solMoeda_(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  const a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + (Math.round(v / 1e5) / 10).toLocaleString('pt-BR') + ' mi';
  if (a >= 1e3) return 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}


// ==========================================
// MEDIÇÃO DE TEXTO (caixa estreita quebra sozinha — lição 1 do CLAUDE.md)
// ==========================================
// Mesmo método de megas-mensal/00_Helpers.gs (_gLarguraTexto_/_gUmaLinha_):
// mede o texto ANTES de desenhar. Toda TEXT_BOX tem ~7pt de recuo interno de
// cada lado que a API não deixa desligar.
const _SOL_FATOR_FONTE_ = { 'Montserrat': 0.58, 'Open Sans': 0.52 };
const _SOL_RECUO_ = 14;

function _solLargura_(texto, fs, fonte, bold) {
  return String(texto).length * fs * (_SOL_FATOR_FONTE_[fonte] || 0.55) * (bold ? 1.04 : 1);
}

// Corta com "…" até caber numa linha de largura `w` — descrição pode ter
// qualquer tamanho, e encolher a fonte até caber deixaria ilegível na TV.
function _solCortar_(texto, w, fs, fonte, bold) {
  const t = String(texto || '');
  const util = w - _SOL_RECUO_;
  if (_solLargura_(t, fs, fonte, bold) <= util) return t;
  let n = t.length;
  while (n > 1 && _solLargura_(t.slice(0, n) + '…', fs, fonte, bold) > util) n--;
  return t.slice(0, n).replace(/\s+$/, '') + '…';
}

// Texto de uma linha só: encolhe a fonte (até o mínimo) se não couber.
// op: { fs, fsMin, bold, italic, cor, fonte, align: 'L'|'C' }
function _solTexto_(slide, x, y, w, h, texto, op) {
  const t = String(texto == null ? '' : texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"
  const fonte = op.fonte || CR_DESIGN_SYSTEM.typography.body;
  let fs = op.fs;
  while (fs > (op.fsMin || fs) && _solLargura_(t, fs, fonte, op.bold) > w - _SOL_RECUO_) fs -= 0.25;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!op.bold).setItalic(!!op.italic)
    .setForegroundColor(op.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    op.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return box;
}


// ==========================================
// DESENHO
// ==========================================

/**
 * Redesenha o kanban no slide informado. Lê ANTES de limpar: se o portal
 * falhar, o slide fica como está (ou, se estiver vazio, recebe o aviso).
 */
function atualizarSlideSolicitacoes(slide, unit) {
  let k;
  try {
    k = obterKanbanSolicitacoes_(unit);
  } catch (e) {
    Logger.log('✗ Solicitações (' + unit.name + '): ' + e.message);
    if (slide.getPageElements().length === 0) _solFalha_(slide, unit, e.message);
    else Logger.log('  · slide atual preservado na TV.');
    return;
  }

  slide.getPageElements().forEach(el => el.remove());
  try {
    _solDesenhar_(slide, unit, k);
    Logger.log('✅ Solicitações (' + unit.name + '): ' +
               _SOL_COLUNAS_.map(c => c.chave + ' ' + k.colunas[c.chave].length).join(' · '));
  } catch (e) {
    Logger.log('✗ Solicitações — desenho (' + unit.name + '): ' + e.message + '\n' + (e.stack || ''));
    slide.getPageElements().forEach(el => el.remove());
    _solFalha_(slide, unit, 'Falha ao desenhar o kanban: ' + e.message);
  }
}

function _solDesenhar_(slide, unit, k) {
  const DS = CR_DESIGN_SYSTEM;
  const W = 720, H = 405;
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;

  const quando = k.geradoEm || new Date();
  const posicao = Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  applyBrandHeaderAndBackground(slide, 'Solicitações',
    'Em andamento • ' + k.total + ' de Facilities', posicao, unit,
    { dataLabel: 'Posição: ' + posicao });

  const mX = 16, gap = 8;
  const topo = 100, base = H - 8;
  const colW = (W - 2 * mX - 3 * gap) / 4;
  const cabH = 24, subH = 14;
  const cardH = 43, cardGap = 5;
  const maisH = 13;
  const yCards = topo + cabH + subH + 2;
  const cabem = Math.max(1, Math.floor((base - maisH - yCards + cardGap) / (cardH + cardGap)));

  _SOL_COLUNAS_.forEach((col, i) => {
    const x = mX + i * (colW + gap);
    const cards = k.colunas[col.chave];

    const fundo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, topo, colW, base - topo);
    fundo.getFill().setSolidFill('#EEF2F7');
    fundo.getBorder().setTransparent();

    const cab = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, topo, colW, cabH);
    cab.getFill().setSolidFill(col.cor);
    cab.getBorder().setTransparent();
    _solTexto_(slide, x + 2, topo, colW - 38, cabH, col.titulo,
      { fs: 8, fsMin: 6.5, bold: true, cor: '#FFFFFF', fonte: fonteT });
    _solTexto_(slide, x + colW - 40, topo, 40, cabH, String(cards.length),
      { fs: 13, fsMin: 9, bold: true, cor: '#FFFFFF', fonte: fonteT, align: 'C' });
    _solTexto_(slide, x + 2, topo + cabH, colW - 4, subH, col.sub,
      { fs: 7, fsMin: 6, cor: DS.colors.textBody, fonte: fonteB });

    if (!cards.length) {
      _solTexto_(slide, x + 4, yCards + 6, colW - 8, 16, 'Nenhuma no momento',
        { fs: 8, fsMin: 6.5, italic: true, cor: DS.colors.textBody, fonte: fonteB, align: 'C' });
      return;
    }

    cards.slice(0, cabem).forEach((card, j) => {
      _solDesenharCard_(slide, x + 4, yCards + j * (cardH + cardGap), colW - 8, cardH, card, col.chave);
    });

    const resto = cards.length - cabem;
    if (resto > 0) {
      _solTexto_(slide, x + 2, base - maisH, colW - 4, maisH,
        '+ ' + resto + (resto === 1 ? ' mais recente' : ' mais recentes'),
        { fs: 7, fsMin: 6, bold: true, cor: DS.colors.textBody, fonte: fonteB, align: 'C' });
    }
  });
}

function _solDesenharCard_(slide, x, y, w, h, card, coluna) {
  const DS = CR_DESIGN_SYSTEM;
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;
  const corTom = _solCorTom_(_solTom_(card));

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.lines);

  // Faixa lateral na cor do tempo na etapa
  const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 3, h);
  faixa.getFill().setSolidFill(corTom);
  faixa.getBorder().setTransparent();

  // As caixas de texto começam 2pt depois da faixa; o recuo interno do Slides
  // (~7pt) faz o texto aparecer a ~12pt da borda do card.
  const xi = x + 2, wi = w - 4;

  // Linha 1: protocolo · EMERG. · selo de dias
  const seloW = 28, seloX = x + w - seloW - 4;
  const emergW = card.emergencial ? 40 : 0;
  _solTexto_(slide, xi, y + 2, seloX - emergW - xi, 13, card.protocolo,
    { fs: 8, fsMin: 6, bold: true, cor: DS.colors.textMain, fonte: fonteT });
  if (card.emergencial) {
    _solTexto_(slide, seloX - emergW, y + 2, emergW, 13, 'EMERG.',
      { fs: 6.5, fsMin: 5.5, bold: true, cor: DS.colors.accentRed, fonte: fonteT, align: 'C' });
  }
  const selo = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, seloX, y + 4, seloW, 10);
  selo.getFill().setSolidFill(corTom);
  selo.getBorder().setTransparent();
  const dias = card.dias === null ? '—' : (card.dias < 1 ? '<1d' : card.dias + 'd');
  // Caixa do selo mais larga que a pílula (folga simétrica): devolve o recuo
  // interno e o "153d" não quebra.
  _solTexto_(slide, seloX - 6, y + 3, seloW + 12, 12, dias,
    { fs: 7, fsMin: 5.5, bold: true, cor: '#FFFFFF', fonte: fonteT, align: 'C' });

  // Linha 2: descrição, cortada com "…" numa linha só
  const descFs = 7;
  const desc = card.descricao ? _solCortar_(card.descricao, wi, descFs, fonteB, false) : '(sem descrição)';
  _solTexto_(slide, xi, y + 15, wi, 13, desc,
    { fs: descFs, fsMin: descFs, cor: DS.colors.textMain, fonte: fonteB });

  // Linha 3: quem/o quê (esquerda) · valor (direita)
  const valor = _solMoeda_(card.valor);
  const valorW = valor ? 50 : 0;
  const info = _solInfoCard_(card, coluna);
  if (info) {
    _solTexto_(slide, xi, y + 28, wi - valorW, 13, _solCortar_(info, wi - valorW, 6.5, fonteB, false),
      { fs: 6.5, fsMin: 6.5, cor: DS.colors.textBody, fonte: fonteB });
  }
  if (valor) {
    _solTexto_(slide, x + w - valorW - 2, y + 28, valorW + 2, 13, valor,
      { fs: 7, fsMin: 5.5, bold: true, cor: DS.colors.textMain, fonte: fonteT, align: 'C' });
  }
}

// Aviso de falha desenhado NO slide — só na primeira vez (slide vazio). Usa
// só insertShape e CR_DESIGN_SYSTEM, para não depender de helper que possa
// estar faltando no editor e quebrar junto (lição 6 do CLAUDE.md).
function _solFalha_(slide, unit, mensagem) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  const tit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 50, 35, 620, 35);
  tit.getText().setText('Solicitações • ' + unit.name).getTextStyle()
    .setFontSize(22).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  const caixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 100, 620, 150);
  caixa.getFill().setSolidFill('#FEF2F2');
  caixa.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.accentRed);

  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 66, 110, 588, 130);
  txt.getText().setText('⚠ Kanban ainda não disponível\n\n' + mensagem +
    '\n\nRode diagnosticarSolicitacoes() no editor para ver o detalhe.')
    .getTextStyle().setFontSize(11).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
}


// ==========================================
// DIAGNÓSTICO (ponto de entrada — sem "_" para aparecer no menu do editor)
// ==========================================

/**
 * Responde "por que o kanban não veio?" sem mexer em TV nenhuma: confere a
 * chave, chama o portal para as três unidades e mostra as contagens, um card
 * de exemplo por coluna e qualquer status fora da coluna esperada.
 */
function diagnosticarSolicitacoes() {
  Logger.log('=== Kanban de Solicitações — diagnóstico ===');
  Logger.log('URL: ' + PORTAL_KANBAN_URL);
  const chave = PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY');
  Logger.log(chave ? 'PORTAL_API_KEY: ' + chave.length + ' caracteres, termina em …' + chave.slice(-4)
                   : '✗ PORTAL_API_KEY não cadastrada nas Propriedades do script.');

  UNITS.forEach(unit => {
    try {
      const k = obterKanbanSolicitacoes_(unit);
      Logger.log('✓ ' + unit.name + ' — ' + k.total + ' em andamento (posição ' +
                 (k.geradoEm ? k.geradoEm.toISOString() : 'sem gerado_em') + '), slide nº ' + (_solIndice_(unit) + 1));
      _SOL_COLUNAS_.forEach(col => {
        const cards = k.colunas[col.chave];
        const fora = cards.filter(cd => col.status.indexOf(cd.status) < 0);
        const ex = cards[0];
        Logger.log('   ' + col.titulo + ': ' + cards.length +
                   (ex ? '  · ex.: ' + ex.protocolo + ' [' + ex.status + '] ' + ex.dias + 'd' : ''));
        if (fora.length) {
          Logger.log('   ⚠ status fora do esperado nesta coluna: ' +
                     fora.map(cd => cd.protocolo + '=' + cd.status).join(', ') +
                     ' — a regra do portal mudou? Ajuste _SOL_COLUNAS_.');
        }
      });
    } catch (e) {
      Logger.log('✗ ' + unit.name + ': ' + e.message);
    }
  });
}
