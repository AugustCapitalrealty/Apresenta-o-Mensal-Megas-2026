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
// Nada aqui lê CR_DESIGN_SYSTEM: o Apps Script carrega os arquivos em ordem
// alfabética, "09_…" vem antes de "Config.gs", e um `const` de topo que o
// lesse derrubaria o projeto inteiro (CLAUDE.md, lição 7). As cores saem do
// design system dentro das funções de desenho.
const _SOL_COLUNAS_ = [
  { chave: 'solicitante', titulo: 'COM O SOLICITANTE', sub: 'Correção ou informação pendente',
    status: ['pendente_correcao', 'aguardando_informacoes'] },
  { chave: 'backoffice',  titulo: 'COM O BACKOFFICE',  sub: 'Análise, lançamento e aprovação',
    status: ['recebido', 'em_analise', 'aprovado', 'em_processamento'] },
  { chave: 'emitida',     titulo: 'EMITIDAS',          sub: 'OC emitida, aguardando liberação',
    status: ['oc_ac_emitida', 'aguardando_aceite'] },
  { chave: 'liberada',    titulo: 'LIBERADAS',         sub: 'Com o fornecedor até a NF',
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
  return _solNormalizar_(_portalBuscar_(PORTAL_KANBAN_URL, unit));
}

/**
 * Chama uma função do Portal de Solicitações (kanban-megas, webdox-megas)
 * para a unidade e devolve o JSON. Lança erro com a causa legível: sem chave,
 * chave recusada, função não publicada, resposta que não é JSON.
 */
function _portalBuscar_(urlBase, unit) {
  const emp = unit.portalEmpreendimento;
  if (!emp) throw new Error(unit.name + ' sem portalEmpreendimento em UNITS (Config.gs).');

  const chave = PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY');
  if (!chave) {
    throw new Error('Falta a chave do portal: cadastre PORTAL_API_KEY em Configurações do projeto → ' +
                    'Propriedades do script (a mesma do secret RELATORIOS_API_KEY no portal).');
  }

  const funcao = urlBase.split('/').pop();
  const url = urlBase + '?empreendimento=' + encodeURIComponent(emp);
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
    throw new Error('Função ' + funcao + ' não encontrada (HTTP 404) — ela está publicada no portal? ' + url);
  }
  if (codigo !== 200) {
    throw new Error('O portal respondeu HTTP ' + codigo + ' (' + funcao + '): ' + String(corpo).slice(0, 200));
  }

  try { return JSON.parse(corpo); }
  catch (e) { throw new Error('Resposta do portal (' + funcao + ') não é JSON: ' + String(corpo).slice(0, 120)); }
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
// na das emitidas, QUEM tem que agir (o solicitante do Mega); no backoffice
// e nas liberadas, o passo que falta. O fornecedor tem linha própria.
function _solInfoCard_(card, coluna) {
  let info;
  if (coluna === 'backoffice' || coluna === 'liberada') info = card.proximo || card.quem;
  else                                                  info = card.solicitante || card.quem;
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

// Visual do Orçamento 2027 (Visual.gs): cabeçalho padrão, cada coluna com um
// cartão-título (rótulo, explicação e a contagem grande) e os cards brancos
// arredondados embaixo. Cor só com função: a faixa lateral e o selo de dias
// dizem o tempo na etapa (verde no prazo, laranja atenção, vermelho atrasado).
function _solDesenhar_(slide, unit, k) {
  const DS = CR_DESIGN_SYSTEM;
  const quando = k.geradoEm || new Date();
  const posicao = Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  applyBrandHeaderAndBackground(slide, 'Solicitações em andamento',
    k.total + ' de Facilities', posicao, unit, { dataLabel: 'Posição: ' + posicao });
  const c = DS.colors, fonteT = DS.typography.titles, fonteB = DS.typography.body;

  const mX = 30, gap = 10;
  const topo = 84, base = 378;
  const colW = (720 - 2 * mX - 3 * gap) / 4;
  const cabH = 40;
  const cardH = 54, cardGap = 6;
  const maisH = 12;
  const yCards = topo + cabH + 8;
  const cabem = Math.max(1, Math.floor((base - maisH - yCards + cardGap) / (cardH + cardGap)));

  _SOL_COLUNAS_.forEach((col, i) => {
    const x = mX + i * (colW + gap);
    const cards = k.colunas[col.chave];

    // Cartão-título da coluna
    _tvRet_(slide, x, topo, colW, cabH, c.cardBg, { redondo: true, borda: c.lines });
    _tvRet_(slide, x, topo + 8, 4, cabH - 16, c.brandLight);
    _tvTexto_(slide, x + 8, topo + 3, colW - 46, 16, col.titulo,
      { fs: 8.5, fsMin: 6.5, bold: true, cor: c.textBody, fonte: fonteT, cortar: true });
    _tvTexto_(slide, x + 8, topo + 19, colW - 46, 15, col.sub,
      { fs: 7, fsMin: 6, cor: c.textMuted, fonte: fonteB, cortar: true });
    _tvTexto_(slide, x + colW - 42, topo, 40, cabH, String(cards.length),
      { fs: 22, fsMin: 12, bold: true, cor: c.brandDark, fonte: fonteT, align: 'C' });

    if (!cards.length) {
      _tvTexto_(slide, x, yCards + 6, colW, 18, 'Nenhuma no momento',
        { fs: 8.5, fsMin: 7, italic: true, cor: c.textMuted, fonte: fonteB, align: 'C' });
      return;
    }

    cards.slice(0, cabem).forEach((card, j) => {
      _solDesenharCard_(slide, x, yCards + j * (cardH + cardGap), colW, cardH, card, col.chave);
    });

    const resto = cards.length - cabem;
    if (resto > 0) {
      _tvTexto_(slide, x, base - maisH, colW, maisH,
        '+ ' + resto + (resto === 1 ? ' mais recente' : ' mais recentes'),
        { fs: 7.5, fsMin: 6, bold: true, cor: c.textBody, fonte: fonteB, align: 'C' });
    }
  });

  _tvRodape_(slide, 'Fonte: Portal de Solicitações (Facilities) · selo = dias na etapa atual, ' +
                    'na cor do prazo da etapa · as mais paradas primeiro');
}

function _solDesenharCard_(slide, x, y, w, h, card, coluna) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;
  const corTom = _solCorTom_(_solTom_(card));

  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 6, 3, h - 12, corTom);   // faixa na cor do tempo na etapa

  // As caixas de texto começam 3pt depois da faixa; o recuo interno do Slides
  // (~7pt) põe o texto a ~13pt da borda do card.
  const xi = x + 3, wi = w - 6;

  // Linha 1: protocolo · EMERG. · selo de dias
  const seloW = 30, seloX = x + w - seloW - 6;
  const emergW = card.emergencial ? 38 : 0;
  _tvTexto_(slide, xi, y + 2, seloX - emergW - xi, 13, card.protocolo,
    { fs: 8, fsMin: 6, bold: true, cor: c.textMain, fonte: fonteT });
  if (card.emergencial) {
    // Caixa 12pt mais larga que o espaço (6 de cada lado): devolve o recuo
    // interno. Sem isso o "." de "EMERG." caía na linha de baixo.
    _tvTexto_(slide, seloX - emergW - 6, y + 2, emergW + 12, 13, 'EMERG.',
      { fs: 6.5, fsMin: 5.5, bold: true, cor: c.accentRed, fonte: fonteT, align: 'C' });
  }
  _tvRet_(slide, seloX, y + 4, seloW, 10, corTom, { redondo: true });
  const dias = card.dias === null ? '—' : (card.dias < 1 ? '<1d' : card.dias + 'd');
  _tvTexto_(slide, seloX - 6, y + 3, seloW + 12, 12, dias,
    { fs: 7, fsMin: 5.5, bold: true, cor: '#FFFFFF', fonte: fonteT, align: 'C' });

  // Linha 2: descrição, cortada com "…" numa linha só
  _tvTexto_(slide, xi, y + 15, wi, 13, card.descricao || '(sem descrição)',
    { fs: 7, fsMin: 7, cor: c.textMain, fonte: fonteB, cortar: true });

  // Linha 3: fornecedor · valor — andam juntos: é o "quem vai receber quanto".
  const valor = _solMoeda_(card.valor);
  const valorW = valor ? 52 : 0;
  _tvTexto_(slide, xi, y + 27, wi - valorW, 13, card.fornecedor || 'Fornecedor a definir',
    { fs: 6.5, fsMin: 6.5, bold: !!card.fornecedor, italic: !card.fornecedor,
      cor: card.fornecedor ? c.textMain : c.textMuted, fonte: fonteB, cortar: true });
  if (valor) {
    _tvTexto_(slide, x + w - valorW - 6, y + 27, valorW + 4, 13, valor,
      { fs: 7, fsMin: 5.5, bold: true, cor: c.brandDark, fonte: fonteT, align: 'R' });
  }

  // Linha 4: quem age / o passo que falta
  const info = _solInfoCard_(card, coluna);
  if (info) {
    _tvTexto_(slide, xi, y + 39, wi, 13, info,
      { fs: 6.5, fsMin: 6.5, cor: c.textBody, fonte: fonteB, cortar: true });
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

    // Webdox (10_Slide_Webdox.gs), mesma chave
    try {
      const w = obterWebdox_(unit);
      Logger.log('   WEBDOX (slide nº ' + (_webIndice_(unit) + 1) + ', importado em ' +
                 (w.importadoEm ? w.importadoEm.toISOString() : '?') + '): ' + w.kpis.andamento + ' em andamento, ' +
                 w.kpis.aguardandoMegas + ' aguardando os Megas, ' + w.kpis.atrasados + ' atrasados · ' +
                 _WEB_COLUNAS_.map(col => col.titulo + ' ' + w.colunas[col.chave].length).join(' · '));
    } catch (e) {
      Logger.log('   ✗ WEBDOX: ' + e.message);
    }

    // Fluig (12_Slide_Fluig.gs), mesma chave
    try {
      const f = obterFluig_(unit);
      Logger.log('   FLUIG (slide nº ' + (_fluigIndice_(unit) + 1) + ', importado em ' +
                 (f.importadoEm ? f.importadoEm.toISOString() : '?') + '): ' + f.kpis.emAprovacao + ' em aprovação · ' +
                 _FLU_COLUNAS_.map(col => col.titulo + ' ' + f.colunas[col.chave].length).join(' · '));
    } catch (e) {
      Logger.log('   ✗ FLUIG: ' + e.message);
    }
  });
}
