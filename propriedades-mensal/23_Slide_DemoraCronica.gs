/**
 * ARQUIVO: 23_Slide_DemoraCronica.gs
 * SLIDE — DEMORA CRÔNICA: chamados da equipe Propriedades abertos há mais de
 * DEMORA_CRONICA_DIAS dias, com ONDE cada um travou e POR QUÊ.
 *
 * Pedido da diretoria (Rodrigo, 31/10/2026): "precisamos identificar os casos
 * de demora crônica e avaliar os porquês para que não ocorram mais". O deck
 * de setembro tinha chamados com 1.771, 1.111 e 1.049 dias em aberto sem uma
 * palavra sobre o motivo.
 *
 * DUAS FONTES para o porquê, de propósito:
 *   · ONDE TRAVOU — automático, do BD-CORRETIVAS: sem aprovação, aprovado e não
 *     iniciado, pausado (com o motivo e desde quando) ou em execução. Diz em
 *     que etapa o chamado parou; não diz a causa.
 *   · A CAUSA E A AÇÃO — da equipe, na aba DEMORA CRÔNICA da PLANILHA
 *     PROPRIEDADES (Id · Causa · Ação · Responsável · Prazo). A geração cria a
 *     aba se faltar e acrescenta os chamados novos com Causa/Ação em branco;
 *     nunca apaga nem reescreve o que a equipe digitou. Sem análise, o slide
 *     diz "sem análise da equipe" e mostra o último status do BD — nunca
 *     inventa um motivo.
 *
 * Mesma população do Backlog de Clientes, sem o filtro de cliente: aberto no
 * fim do mês de referência, equipe PROPERTY, não é responsabilidade do
 * locatário. Vai logo depois do Backlog de Clientes.
 */

const DEMORA_CRONICA_DIAS   = 180;   // Guilherme, 10/11/2026
const DEMORA_ABA            = 'DEMORA CRÔNICA';
const DEMORA_CABECALHO      = ['Id chamado', 'Empreendimento', 'Onde', 'Descrição', 'Aberto em', 'Dias (1ª vez)',
                               'Causa (por que demorou)', 'Ação para destravar', 'Responsável', 'Prazo'];
const DEMORA_MAX_LINHAS     = 6;
const DEMORA_COLUNAS = [
  { nome: 'Empreendimento',          tipo: 'textoCentro', largura: 0.11, fonte: 7 },
  { nome: 'Chamado (onde — o quê)',  tipo: 'texto',       largura: 0.33, fonte: 6.5 },
  { nome: 'Aberto há',               tipo: 'numero',      largura: 0.07, fonte: 8 },
  { nome: 'Onde travou',             tipo: 'texto',       largura: 0.19, fonte: 6.5 },
  { nome: 'Por quê / ação',          tipo: 'texto',       largura: 0.30, fonte: 6.5 }
];
// Ordem e cor dos cartões do topo.
const DEMORA_ETAPAS = [
  { chave: 'SEM_APROVACAO', rotulo: 'Sem aprovação',          cor: CR_DESIGN_SYSTEM.colors.accentRed },
  { chave: 'NAO_INICIADO',  rotulo: 'Aprovado, não iniciado', cor: CR_DESIGN_SYSTEM.colors.accentOrange },
  { chave: 'PAUSADO',       rotulo: 'Pausado',                cor: CR_DESIGN_SYSTEM.colors.themeCorr },
  { chave: 'EM_EXECUCAO',   rotulo: 'Em execução',            cor: CR_DESIGN_SYSTEM.colors.accentGreen }
];


function gerarSlideDemoraCronica() {
  const deck = getDeckMensal_();
  _slideLimpar_(deck, TAG_DEMORA_CRONICA);

  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const titulo = 'DEMORA CRÔNICA — MAIS DE ' + DEMORA_CRONICA_DIAS + ' DIAS';
  const dados = obterDemoraCronica_();
  const novos = [];

  if (!dados.itens.length) {
    const slide = _slideNovo_(deck, TAG_DEMORA_CRONICA, titulo,
      'Chamados da equipe Propriedades em aberto · onde travaram e por quê');
    _sTxt(slide, 40, SH / 2 - 20, SW - 80, 40,
      'Nenhum chamado da equipe Propriedades em aberto há mais de ' + DEMORA_CRONICA_DIAS + ' dias.',
      14, true, DS.colors.accentGreen, 'center');
    novos.push(slide);
  } else {
    const linhas = dados.itens.map(it => [it.cc, it.chamado, it.dias + 'd', it.travou, it.porque]);
    const pgs = _tabPaginar_(linhas, DEMORA_MAX_LINHAS);
    pgs.forEach((pagina, i) => {
      const slide = _slideNovo_(deck, TAG_DEMORA_CRONICA, titulo,
        'Chamados da equipe Propriedades em aberto · onde travaram e por quê' +
        (pgs.length > 1 ? ' — página ' + (i + 1) + ' de ' + pgs.length : ''));
      try {
        const yCards = 72, hCards = 34;
        _demoraCartoes_(slide, SW, yCards, hCards, dados);
        _tabDesenharTabela_(slide, SW, SH, pagina, yCards + hCards + 8, SH - 20,
          { colunas: DEMORA_COLUNAS, maxLinhas: DEMORA_MAX_LINHAS });
      } catch (e) {
        _slideFalha_(slide, 30, 72, SW - 60, SH - 100, 'ESTE SLIDE NÃO FOI GERADO', e,
          'Rode gerarSoDemoraCronica() no editor e veja o Logger.');
        Logger.log('Demora crônica: página ' + (i + 1) + ' FALHOU ao desenhar: ' + e.message);
      }
      novos.push(slide);
    });
  }

  _demoraPosicionar_(deck, novos);
  Logger.log('✓ Demora crônica: ' + dados.itens.length + ' chamado(s) há mais de ' + DEMORA_CRONICA_DIAS +
             ' dias; ' + dados.comAnalise + ' com análise da equipe.');
}


// ==========================================
// DADOS
// ==========================================
function obterDemoraCronica_() {
  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo

  const brutos = _propLerCorretivas_().filter(it => {
    if (!_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) return false;
    if (_chamadoResponsabilidadeLocatario_(it.responsaveis)) return false;
    if (_propEquipeCorretiva_(it.responsaveis) !== 'PROPERTY') return false;
    const dias = _histDiasAberto_(it.dtReporte, refFim);
    return dias != null && dias >= DEMORA_CRONICA_DIAS;
  });

  const analise = _demoraAnalise_(brutos, refFim);
  const porEtapa = {};
  let comAnalise = 0;

  const itens = brutos.map(it => {
    const etapa = _demoraEtapa_(it, refFim);
    porEtapa[etapa.chave] = (porEtapa[etapa.chave] || 0) + 1;
    const a = analise[_demoraChave_(it.id)];
    if (a && (a.causa || a.acao)) comAnalise++;   // linha na aba ainda em branco não conta
    return {
      id:      it.id,
      cc:      it.cc,
      dias:    _histDiasAberto_(it.dtReporte, refFim),
      chamado: _truncar_(it.id + ' · ' + _propDescricaoComOnde_(it), 150),
      travou:  etapa.texto,
      porque:  _demoraPorque_(a, it)
    };
  }).sort((x, y) => y.dias - x.dias);

  return { itens: itens, porEtapa: porEtapa, comAnalise: comAnalise,
           maisAntigo: itens.length ? itens[0].dias : null };
}

// Em que etapa o chamado parou, pelos carimbos de data do BD.
function _demoraEtapa_(it, refFim) {
  const n = _histNorm_(it.estado);
  const data = d => _histFormatarDataCurta_(d);
  const ha = d => _histDiasAberto_(d, refFim);
  if (n.indexOf('pausad') >= 0) {
    const motivo = it.motivoPausa || 'sem motivo informado';
    return { chave: 'PAUSADO', texto: 'Pausado — ' + motivo +
             (it.dtPausado ? ' (desde ' + data(it.dtPausado) + ', ' + ha(it.dtPausado) + 'd)' : '') };
  }
  if (!it.dtAprovado) {
    return { chave: 'SEM_APROVACAO', texto: 'Aguardando aprovação desde a abertura' };
  }
  if (!it.dtIniciado) {
    return { chave: 'NAO_INICIADO', texto: 'Aprovado em ' + data(it.dtAprovado) +
             ', não iniciado (' + ha(it.dtAprovado) + 'd)' };
  }
  return { chave: 'EM_EXECUCAO', texto: 'Iniciado em ' + data(it.dtIniciado) +
           ', sem conclusão (' + ha(it.dtIniciado) + 'd)' };
}

// A análise da equipe; sem ela, o último status do BD — nunca um motivo inventado.
function _demoraPorque_(a, it) {
  if (a && (a.causa || a.acao)) {
    const partes = [];
    if (a.causa) partes.push('Causa: ' + a.causa);
    if (a.acao)  partes.push('Ação: ' + a.acao + (a.resp || a.prazo ?
      ' (' + [a.resp, a.prazo ? 'até ' + a.prazo : ''].filter(Boolean).join(', ') + ')' : ''));
    return _truncar_(partes.join(' · '), 170);
  }
  const ultimo = String(it.descEstado || it.observacoes || '').replace(/\s+/g, ' ').trim();
  return _truncar_('Sem análise da equipe' + (ultimo ? '. Último status: "' + ultimo + '"' : '.'), 170);
}

/**
 * Lê a aba DEMORA CRÔNICA (Id → causa, ação, responsável, prazo) e acrescenta
 * os chamados crônicos que ainda não estão nela. Cria a aba se faltar. Nunca
 * apaga nem reescreve linha existente. Falha aqui não derruba o slide: sem a
 * aba, todos saem "sem análise".
 */
function _demoraAnalise_(itens, refFim) {
  const mapa = {};
  try {
    const ss = _abrirPlanilha_(DRE_MANUTENCAO_ID, 'DRE_MANUTENCAO_ID');
    let aba = ss.getSheetByName(DEMORA_ABA);
    if (!aba) {
      aba = ss.insertSheet(DEMORA_ABA);
      aba.getRange(1, 1, 1, DEMORA_CABECALHO.length).setValues([DEMORA_CABECALHO]);
      Logger.log('Demora crônica: aba "' + DEMORA_ABA + '" criada na PLANILHA PROPRIEDADES.');
    }
    const v = aba.getDataRange().getDisplayValues();
    const hdr = (v[0] || []).map(_histNorm_);
    const c = trecho => hdr.findIndex(h => h.indexOf(trecho) >= 0);
    const cId = c('id'), cCausa = c('causa'), cAcao = c('acao'), cResp = c('respons'), cPrazo = c('prazo');
    for (let r = 1; r < v.length; r++) {
      const id = _demoraChave_(v[r][cId]);
      if (!id) continue;
      mapa[id] = {
        causa: cCausa >= 0 ? String(v[r][cCausa] || '').trim() : '',
        acao:  cAcao  >= 0 ? String(v[r][cAcao]  || '').trim() : '',
        resp:  cResp  >= 0 ? String(v[r][cResp]  || '').trim() : '',
        prazo: cPrazo >= 0 ? String(v[r][cPrazo] || '').trim() : ''
      };
    }
    const novos = itens.filter(it => !mapa[_demoraChave_(it.id)]).map(it => [
      String(it.id), it.cc, _propOndeChamado_(it.local, it.area), it.descricao,
      _histFormatarDataCurta_(it.dtReporte), _histDiasAberto_(it.dtReporte, refFim), '', '', '', ''
    ]);
    if (novos.length) {
      aba.getRange(Math.max(v.length, 1) + 1, 1, novos.length, DEMORA_CABECALHO.length).setValues(novos);
      Logger.log('Demora crônica: ' + novos.length + ' chamado(s) novo(s) acrescentado(s) à aba "' + DEMORA_ABA +
                 '" para a equipe preencher Causa e Ação.');
    }
  } catch (e) {
    Logger.log('Demora crônica: aba "' + DEMORA_ABA + '" indisponível (' + e.message + ') — todos saem "sem análise".');
  }
  return mapa;
}


// Id só com dígitos: a planilha pode mostrar "18.190.018" ou "18190018".
function _demoraChave_(id) { return String(id == null ? '' : id).replace(/\D/g, ''); }


// ==========================================
// DESENHO
// ==========================================
// Cartões do topo: total, mais antigo e quantos travaram em cada etapa.
function _demoraCartoes_(slide, SW, y, h, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const M = SW * 0.020, gap = 6;
  const cartoes = [
    { rotulo: 'Chamados > ' + DEMORA_CRONICA_DIAS + ' dias', valor: String(dados.itens.length), cor: DS.colors.brandDark },
    { rotulo: 'Mais antigo', valor: dados.maisAntigo + 'd', cor: DS.colors.brandDark }
  ].concat(DEMORA_ETAPAS.map(e => ({ rotulo: e.rotulo, valor: String(dados.porEtapa[e.chave] || 0), cor: e.cor })))
   .concat([{ rotulo: 'Com análise da equipe', valor: dados.comAnalise + ' de ' + dados.itens.length,
              cor: dados.comAnalise < dados.itens.length ? DS.colors.accentRed : DS.colors.accentGreen }]);
  const w = (SW - 2 * M - gap * (cartoes.length - 1)) / cartoes.length;
  cartoes.forEach((c, i) => {
    const x = M + i * (w + gap);
    _sRet_(slide, x, y, w, h, c.cor, 0.08);
    _sRet_(slide, x, y, 3, h, c.cor);
    _sTxt(slide, x + 4, y + 1, w - 6, 16, c.valor, 12, true, c.cor, 'center');
    _sTxt(slide, x + 4, y + 17, w - 6, h - 18, c.rotulo, 6.5, false, DS.colors.textMuted, 'center');
  });
}

// Logo depois do último slide do Backlog de Clientes. Nunca lança.
function _demoraPosicionar_(deck, novos) {
  try {
    const slides = deck.getSlides();
    let ultimo = -1;
    slides.forEach((s, i) => {
      try {
        if (s.getNotesPage().getSpeakerNotesShape().getText().asString().indexOf(TAG_BACKLOG_CLIENTES) >= 0) ultimo = i;
      } catch (e) {}
    });
    if (ultimo < 0) {
      Logger.log('Demora crônica: Backlog de Clientes não encontrado; slide(s) no fim do deck.');
      return;
    }
    // Slide.move(i) conta na ordem ANTES de mover; os novos estão depois de ultimo + 1 + k.
    novos.forEach((s, k) => s.move(ultimo + 1 + k));
  } catch (e) {
    Logger.log('Demora crônica: não consegui posicionar (' + e.message + '); fica no fim.');
  }
}

function gerarSoDemoraCronica() {
  return _rodarPassos_([{ nome: 'Demora Crônica', fn: gerarSlideDemoraCronica }]);
}
