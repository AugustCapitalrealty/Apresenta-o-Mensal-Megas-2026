/**
 * ARQUIVO: 17_Slide_Solicitacoes.gs
 * SEÇÃO:   SLIDES — Kanban de Solicitações (Portal de Solicitações)
 * DESCRIÇÃO: As solicitações de Facilities EM ANDAMENTO do Mega, num kanban
 *            de quatro colunas — com quem cada uma está parada agora:
 *
 *   COM O SOLICITANTE  correção pendente, aguardando informações
 *   COM O BACKOFFICE   recebido, em análise, aprovado, em processamento
 *   EMITIDAS           OC/AC emitida, aguardando aceite (falta liberar)
 *   LIBERADAS          com o fornecedor até a NF/boleto
 *
 * FONTE: função `kanban-megas` do Portal de Solicitações (app Lovable, repo
 * AugustCapitalrealty/megas-adc1ba20), que já devolve os cards separados por
 * coluna, com a mesma regra das telas do portal (src/lib/etapas-compra.ts e
 * situacao-solicitacao.ts). O slide não reclassifica nada: só desenha. Assim
 * o número da reunião é o mesmo que o pessoal vê no portal.
 *
 * Endereço em PORTAL_KANBAN_URL (01_Config.gs); chave nas Propriedades do
 * script como PORTAL_API_KEY — nunca no código.
 *
 * É uma FOTO do momento da geração, não um recorte do mês: o subtítulo diz
 * de quando é a posição.
 *
 * Se a busca falhar, o slide é desenhado com o aviso do motivo (sem chave,
 * chave recusada, função fora do ar…) em vez de sair vazio. Para entender
 * uma falha sem gerar slide: diagnosticarSolicitacoes().
 */

// Colunas na ordem do kanban. `status` é o que o portal põe em cada uma —
// só serve para o diagnóstico conferir; quem decide a coluna é o portal.
const _SOL_COLUNAS_ = [
  { chave: 'solicitante', titulo: 'COM O SOLICITANTE', sub: 'Correção ou informação pendente',
    cor: '#F59E0B', status: ['pendente_correcao', 'aguardando_informacoes'] },
  { chave: 'backoffice',  titulo: 'COM O BACKOFFICE',  sub: 'Análise, lançamento e aprovação',
    cor: CR_DESIGN_SYSTEM.colors.brandLight, status: ['recebido', 'em_analise', 'aprovado', 'em_processamento'] },
  { chave: 'emitida',     titulo: 'EMITIDAS',          sub: 'OC emitida, aguardando liberação',
    cor: '#9333EA', status: ['oc_ac_emitida', 'aguardando_aceite'] },
  { chave: 'liberada',    titulo: 'LIBERADAS',         sub: 'Com o fornecedor até a NF',
    cor: CR_DESIGN_SYSTEM.colors.accentGreen,
    status: ['liberado_fornecedor', 'enviado_fornecedor', 'aguardando_execucao', 'aguardando_nf_boleto', 'nf_boleto_enviados'] }
];

// Prazo (dias) que o portal acorda para a etapa — mesmos números de
// responsavelDaSolicitacao() (src/lib/responsavel-solicitacao.ts). Sem prazo,
// vale a faixa genérica do portal (tomDoTempo): até 3 dias ok, até 5 atenção.
const _SOL_PRAZO_DIAS_ = { recebido: 5, em_analise: 5, aprovado: 3, em_processamento: 3 };


// ==========================================
// LEITURA — Portal de Solicitações
// ==========================================

/**
 * { geradoEm: Date|null, total, colunas: { solicitante: [card], ... } } do
 * Mega ativo. Lança erro com a causa legível quando não dá para ler — quem
 * chama decide se mostra no slide (gerarSlideSolicitacoes) ou no Logger
 * (diagnosticarSolicitacoes).
 */
function obterKanbanSolicitacoes_() {
  const projeto = getProjetoAtivo();
  const emp = projeto.portalEmpreendimento;
  if (!emp) throw new Error(projeto.nome + ' sem portalEmpreendimento em PROJETOS (01_Config.gs).');

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
    throw new Error('Função kanban-megas não encontrada (HTTP 404) — ela já foi publicada no portal? ' + url);
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
// slide sem ninguém perceber (lição 3 do CLAUDE.md — zero falso).
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

// Corta o texto com "…" até caber numa linha de largura `w` — a descrição
// pode ter qualquer tamanho, e encolher a fonte até caber deixaria ilegível.
function _solCortar_(texto, w, fs, fonte, bold) {
  const t = String(texto || '');
  const util = w - _G_RECUO_TEXTBOX;
  if (_gLarguraTexto_(t, fs, fonte, bold) <= util) return t;
  let n = t.length;
  while (n > 1 && _gLarguraTexto_(t.slice(0, n) + '…', fs, fonte, bold) > util) n--;
  return t.slice(0, n).replace(/\s+$/, '') + '…';
}


// ==========================================
// DESENHO
// ==========================================

function gerarSlideSolicitacoes() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  let k;
  try {
    k = obterKanbanSolicitacoes_();
  } catch (e) {
    Logger.log('✗ Solicitações (' + getProjetoAtivo().nome + '): ' + e.message);
    _solFalha_(slide, deck, 'Não foi possível ler o portal: ' + e.message);
    return;
  }

  try {
    _solDesenhar_(slide, deck, k);
    Logger.log('Slide Solicitações: ' + _SOL_COLUNAS_.map(c => c.chave + ' ' + k.colunas[c.chave].length).join(' · '));
  } catch (e) {
    Logger.log('✗ Solicitações — desenho: ' + e.message + '\n' + (e.stack || ''));
    _solFalha_(slide, deck, 'Falha ao desenhar o kanban: ' + e.message);
  }
}

function _solDesenhar_(slide, deck, k) {
  const DS = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;

  const quando = k.geradoEm || new Date();
  const posicao = Utilities.formatDate(quando, 'America/Sao_Paulo', "dd/MM 'às' HH:mm");
  criarHeaderPadrao(slide, 'SOLICITAÇÕES EM ANDAMENTO',
    'Facilities · ' + k.total + ' em andamento · posição de ' + posicao + ' · selo = dias na etapa atual');

  const mX = DS.layout.marginX, gap = 8;
  const topo = 72, base = H - 12;
  const colW = (W - 2 * mX - 3 * gap) / 4;
  const cabH = 24, subH = 15;
  const cardH = 40, cardGap = 5;
  const maisH = 13;
  const yCards = topo + cabH + subH + 2;
  const cabem = Math.max(1, Math.floor((base - maisH - yCards + cardGap) / (cardH + cardGap)));

  _SOL_COLUNAS_.forEach((col, i) => {
    const x = mX + i * (colW + gap);
    const cards = k.colunas[col.chave];

    // Fundo da coluna
    const fundo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, topo, colW, base - topo);
    fundo.getFill().setSolidFill('#EEF2F7');
    fundo.getBorder().setTransparent();

    // Cabeçalho: título à esquerda, contagem à direita
    const cab = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, topo, colW, cabH);
    cab.getFill().setSolidFill(col.cor);
    cab.getBorder().setTransparent();
    _gUmaLinha_(slide, x + 4, topo, colW - 40, cabH, col.titulo,
      { align: 'L', fs: 7.5, fsMin: 6, bold: true, cor: '#FFFFFF', fonte: fonteT, folga: 0 });
    _gUmaLinha_(slide, x + colW - 34, topo, 30, cabH, String(cards.length),
      { fs: 12, fsMin: 8, bold: true, cor: '#FFFFFF', fonte: fonteT, folga: 4 });
    _gUmaLinha_(slide, x + 4, topo + cabH, colW - 8, subH, col.sub,
      { align: 'L', fs: 6.5, fsMin: 5.5, cor: DS.colors.textBody, fonte: fonteB, folga: 0 });

    if (!cards.length) {
      _gUmaLinha_(slide, x + 6, yCards + 6, colW - 12, 14, 'Nenhuma no momento',
        { fs: 7, fsMin: 6, italic: true, cor: DS.colors.textBody, fonte: fonteB, folga: 0 });
      return;
    }

    cards.slice(0, cabem).forEach((card, j) => {
      _solDesenharCard_(slide, x + 5, yCards + j * (cardH + cardGap), colW - 10, cardH, card, col.chave);
    });

    const resto = cards.length - cabem;
    if (resto > 0) {
      _gUmaLinha_(slide, x + 4, base - maisH, colW - 8, maisH,
        '+ ' + resto + (resto === 1 ? ' mais recente' : ' mais recentes'),
        { fs: 6.5, fsMin: 5.5, bold: true, cor: DS.colors.textBody, fonte: fonteB, folga: 0 });
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

  const xi = x + 5, wi = w - 8;

  // Linha 1: protocolo · EMERG. · selo de dias
  const seloW = 24, seloX = x + w - seloW - 3;
  const emergW = card.emergencial ? 34 : 0;
  _gUmaLinha_(slide, xi, y + 2, wi - seloW - emergW - 2, 12, card.protocolo,
    { align: 'L', fs: 7, fsMin: 5.5, bold: true, cor: DS.colors.textMain, fonte: fonteT, folga: 0 });
  if (card.emergencial) {
    _gUmaLinha_(slide, seloX - emergW, y + 2, emergW, 12, 'EMERG.',
      { fs: 5.5, fsMin: 5, bold: true, cor: DS.colors.accentRed, fonte: fonteT, folga: 3 });
  }
  const selo = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, seloX, y + 4, seloW, 9);
  selo.getFill().setSolidFill(corTom);
  selo.getBorder().setTransparent();
  const dias = card.dias === null ? '—' : (card.dias < 1 ? '<1d' : card.dias + 'd');
  _gUmaLinha_(slide, seloX, y + 3, seloW, 11, dias,
    { fs: 6, fsMin: 5, bold: true, cor: '#FFFFFF', fonte: fonteT, folga: 4 });

  // Linha 2: descrição, cortada com "…" numa linha só
  const descFs = 6.5;
  const desc = card.descricao ? _solCortar_(card.descricao, wi, descFs, fonteB, false) : '(sem descrição)';
  _gUmaLinha_(slide, xi, y + 14, wi, 12, desc,
    { align: 'L', fs: descFs, fsMin: descFs, cor: DS.colors.textMain, fonte: fonteB, folga: 0 });

  // Linha 3: quem/o quê (esquerda) · valor (direita)
  const valor = _solMoeda_(card.valor);
  const valorW = valor ? 44 : 0;
  const info = _solInfoCard_(card, coluna);
  if (info) {
    _gUmaLinha_(slide, xi, y + 26, wi - valorW, 12,
      _solCortar_(info, wi - valorW, 6, fonteB, false),
      { align: 'L', fs: 6, fsMin: 6, cor: DS.colors.textBody, fonte: fonteB, folga: 0 });
  }
  if (valor) {
    _gUmaLinha_(slide, x + w - valorW - 2, y + 26, valorW, 12, valor,
      { fs: 6.5, fsMin: 5, bold: true, cor: DS.colors.textMain, fonte: fonteT, folga: 2 });
  }
}

// Aviso de falha desenhado NO slide. Usa só insertShape e CR_DESIGN_SYSTEM —
// nada de criarHeaderPadrao/_gUmaLinha_ —, para não depender de helper que
// possa estar faltando e quebrar junto (lição 6 do CLAUDE.md).
function _solFalha_(slide, deck, mensagem) {
  const DS = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth();
  const tit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 30, 14, W - 60, 30);
  tit.getText().setText('SOLICITAÇÕES EM ANDAMENTO').getTextStyle()
    .setFontSize(19).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  const caixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 30, 90, W - 60, 150);
  caixa.getFill().setSolidFill('#FEF2F2');
  caixa.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.accentRed);

  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 46, 100, W - 92, 130);
  txt.getText().setText('⚠ Kanban não gerado\n\n' + mensagem +
    '\n\nRode diagnosticarSolicitacoes() no editor para ver o detalhe. Apague este slide antes de apresentar.')
    .getTextStyle().setFontSize(10).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
}


// ==========================================
// DIAGNÓSTICO (ponto de entrada — sem "_" para aparecer no menu do editor)
// ==========================================

/**
 * Responde "por que o kanban não veio?" sem gerar slide: confere a chave,
 * chama o portal para os três Megas e mostra as contagens, um card de
 * exemplo por coluna e qualquer status fora da coluna esperada.
 */
function diagnosticarSolicitacoes() {
  Logger.log('=== Kanban de Solicitações — diagnóstico ===');
  Logger.log('URL: ' + PORTAL_KANBAN_URL);
  const chave = PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY');
  Logger.log(chave ? 'PORTAL_API_KEY: ' + chave.length + ' caracteres, termina em …' + chave.slice(-4)
                   : '✗ PORTAL_API_KEY não cadastrada nas Propriedades do script.');

  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => {
    setProjetoAtivo(c);
    try {
      const k = obterKanbanSolicitacoes_();
      Logger.log('✓ ' + getProjetoAtivo().nome + ' — ' + k.total + ' em andamento (posição ' +
                 (k.geradoEm ? k.geradoEm.toISOString() : 'sem gerado_em') + ')');
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
      Logger.log('✗ ' + getProjetoAtivo().nome + ': ' + e.message);
    }
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoSolicitacoesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideSolicitacoes(); }
function gerarSoSolicitacoesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideSolicitacoes(); }
function gerarSoSolicitacoesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideSolicitacoes(); }
