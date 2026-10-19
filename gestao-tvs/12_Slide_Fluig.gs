/**
 * ARQUIVO: 12_Slide_Fluig.gs
 * DESCRIÇÃO: Aprovações no Fluig — os chamados de Facilities do Mega que
 *            estão no Fluig, por etapa: CORREÇÃO (devolvido ao início) ·
 *            GERÊNCIA DE FACILITIES · GERÊNCIA FINANCEIRA · DIRETORIA (acima
 *            da alçada) · APROVADOS (ainda em execução ou avaliação final).
 *
 * FONTE: função `fluig-megas` do Portal de Solicitações (PORTAL_FLUIG_URL em
 * Config.gs), mesma chave PORTAL_API_KEY do kanban e do Webdox. Só entram
 * chamados ligados a uma solicitação de Facilities do Mega (a regra do Painel
 * Fluig do portal); o portal decide a etapa (src/lib/fluig-utils.ts).
 *
 * O FLUIG NÃO É AO VIVO: o portal importa um relatório exportado dele. O canto
 * do cabeçalho diz de quando é a importação. E "dias na etapa" conta da última
 * movimentação REGISTRADA numa importação — no dia em que a planilha sobe, os
 * chamados que mudaram qualquer campo zeram (visto em 19/10/2026: todos em 0).
 * Por isso o selo das colunas de aprovação mostra os dias desde o lançamento
 * no Fluig, que não zeram; nos aprovados, os dias em execução.
 *
 * Posição: último slide do deck (slide novo vai sempre para o fim), mas na TV
 * vem logo depois do kanban — gerarArquivosPainelTV() reordena.
 *
 * SEGURANÇA: igual ao kanban — portal fora do ar, o slide atual fica na TV.
 */

const _FLU_COLUNAS_ = [
  { chave: 'correcao',   titulo: 'CORREÇÃO' },
  { chave: 'facilities', titulo: 'GER. FACILITIES' },
  { chave: 'financeiro', titulo: 'GER. FINANCEIRA' },
  { chave: 'diretoria',  titulo: 'DIRETORIA' },
  { chave: 'aprovado',   titulo: 'APROVADOS' }
];
// Régua do selo nas colunas de aprovação (dias desde o lançamento no Fluig):
// até 5 verde, até 10 laranja, acima vermelho. Proposta de 19/10/2026 — o
// portal não tem prazo cadastrado para as aprovações do Fluig.
const _FLU_DIAS_OK_ = 5, _FLU_DIAS_ATENCAO_ = 10;


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function ATUALIZAR_FLUIG()          { return _tvFluig_(UNITS); }
function ATUALIZAR_FLUIG_CURITIBA() { return _tvFluig_([_tvUnidade_('CURITIBA')]); }
function ATUALIZAR_FLUIG_ITAJAI()   { return _tvFluig_([_tvUnidade_('ITAJA')]); }
function ATUALIZAR_FLUIG_ESTEIO()   { return _tvFluig_([_tvUnidade_('ESTEIO')]); }

// Depois da Chuva do mês (o último até 19/10/2026).
function _fluigIndice_(unit) { return _chuvaIndice_(unit) + 1; }

function _tvFluig_(unidades) {
  const erros = [];
  unidades.forEach(unit => {
    if (!unit.portalEmpreendimento) return;
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const idx = _fluigIndice_(unit);
      while (slides.length < idx + 1) { deck.appendSlide(SlidesApp.PredefinedLayout.BLANK); slides = deck.getSlides(); }
      atualizarSlideFluig(slides[idx], unit);
    } catch (e) {
      erros.push(unit.name + ': ' + e.message);
      Logger.log('❌ Fluig (' + unit.name + '): ' + e.message);
    }
  });
  return erros;
}


// ==========================================
// LEITURA
// ==========================================
function obterFluig_(unit) {
  const d = _portalBuscar_(PORTAL_FLUIG_URL, unit);
  if (!d || !d.colunas || typeof d.colunas !== 'object' || !d.kpis) {
    throw new Error('Resposta do fluig-megas sem "colunas"/"kpis" — o formato da função mudou?');
  }
  const colunas = {};
  _FLU_COLUNAS_.forEach(c => {
    const lista = d.colunas[c.chave];
    // Coluna faltando é erro, não coluna vazia (zero falso, lição 3).
    if (!Array.isArray(lista)) throw new Error('Resposta do fluig-megas sem a coluna "' + c.chave + '".');
    const aprovado = c.chave === 'aprovado';
    colunas[c.chave] = lista.map(_fluCard_).sort((a, b) =>
      aprovado ? (b.diasEtapa || 0) - (a.diasEtapa || 0) : (b.diasTotal || 0) - (a.diasTotal || 0));
  });
  const quando = s => { const x = s ? new Date(s) : null; return x && !isNaN(x) ? x : null; };
  const n = v => (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  return {
    importadoEm: quando(d.importado_em),
    kpis: { emAprovacao: n(d.kpis.em_aprovacao), valor: n(d.kpis.valor_em_aprovacao),
            parados: n(d.kpis.parados_mais_5_dias), tempoMedio: n(d.kpis.tempo_medio_dias),
            aprovados7d: n(d.kpis.aprovados_7d) },
    colunas: colunas
  };
}

function _fluCard_(c) {
  c = c || {};
  const n = v => (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  return {
    numero:     c.numero_fluig ? String(c.numero_fluig) : '—',
    protocolo:  c.protocolo ? String(c.protocolo) : '',
    // "Referente a contratação de…" em todo chamado: o começo não diz nada.
    servico:    String(c.servico || '').replace(/\s+/g, ' ').trim()
                  .replace(/^referente\s+(a|à|ao|aos|às|as)\s+/i, '').replace(/^./, m => m.toUpperCase()),
    fornecedor: c.fornecedor ? String(c.fornecedor).trim() : '',
    valor:      n(c.valor),
    etapa:      c.etapa ? String(c.etapa) : '',
    diasEtapa:  n(c.dias_na_etapa) === null ? null : Math.floor(n(c.dias_na_etapa)),
    diasTotal:  n(c.dias_total) === null ? null : Math.floor(n(c.dias_total)),
    devolvido:  n(c.vezes_devolvido) || 0
  };
}

function _fluCorDias_(dias) {
  const c = CR_DESIGN_SYSTEM.colors;
  if (dias === null) return c.textMuted;
  if (dias <= _FLU_DIAS_OK_) return c.accentGreen;
  if (dias <= _FLU_DIAS_ATENCAO_) return c.accentOrange;
  return c.accentRed;
}


// ==========================================
// DESENHO
// ==========================================
function atualizarSlideFluig(slide, unit) {
  let f;
  try {
    f = obterFluig_(unit);
  } catch (e) {
    Logger.log('✗ Fluig (' + unit.name + '): ' + e.message);
    if (slide.getPageElements().length === 0) _fluFalha_(slide, unit, e.message);
    else Logger.log('  · slide atual preservado na TV.');
    return;
  }

  slide.getPageElements().forEach(el => el.remove());
  try {
    _fluDesenhar_(slide, unit, f);
    Logger.log('✅ Fluig (' + unit.name + '): ' +
               _FLU_COLUNAS_.map(c => c.chave + ' ' + f.colunas[c.chave].length).join(' · '));
  } catch (e) {
    Logger.log('✗ Fluig — desenho (' + unit.name + '): ' + e.message + '\n' + (e.stack || ''));
    slide.getPageElements().forEach(el => el.remove());
    _fluFalha_(slide, unit, 'Falha ao desenhar o slide do Fluig: ' + e.message);
  }
}

function _fluDesenhar_(slide, unit, f) {
  const DS = CR_DESIGN_SYSTEM;
  const importado = f.importadoEm ? Utilities.formatDate(f.importadoEm, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') : '—';
  const k = f.kpis;
  const emAprov = k.emAprovacao != null ? k.emAprovacao
    : ['correcao', 'facilities', 'financeiro', 'diretoria'].reduce((s, ch) => s + f.colunas[ch].length, 0);
  applyBrandHeaderAndBackground(slide, 'Aprovações no Fluig',
    emAprov + ' em aprovação' + (k.valor ? ' · ' + _solMoeda_(k.valor) : '') +
    (k.aprovados7d != null ? ' · ' + k.aprovados7d + (k.aprovados7d === 1 ? ' aprovado' : ' aprovados') + ' em 7 dias' : ''),
    importado, unit, { dataLabel: 'Fluig: importado em ' + importado });
  const c = DS.colors, fonteT = DS.typography.titles, fonteB = DS.typography.body;

  // Faixa de KPIs (o primeiro cheio: é o número do slide)
  const kx = 30, ky = 84, kh = 62, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'Em aprovação', valor: emAprov, destaque: true, fsValor: 22,
    sub: k.valor ? _solMoeda_(k.valor) + ' aguardando aprovação' : 'chamados de Facilities' });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, { rotulo: 'Parados há mais de 5 dias', valor: k.parados || 0, fsValor: 22,
    sub: k.parados ? 'sem andar na etapa' : 'nenhum parado na etapa', corSub: k.parados ? c.accentRed : c.accentGreen });
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, { rotulo: 'Tempo médio', fsValor: 22,
    valor: k.tempoMedio != null ? Math.round(k.tempoMedio) + (Math.round(k.tempoMedio) === 1 ? ' dia' : ' dias') : '—',
    sub: 'desde o lançamento no Fluig' });
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Aprovados em 7 dias', valor: k.aprovados7d != null ? k.aprovados7d : '—',
    fsValor: 22, sub: 'chegaram à execução' });

  // Colunas por etapa
  const mX = 30, gap = 8, colW = (720 - 2 * mX - 4 * gap) / 5;
  const topo = 156, cabH = 22, base = 378;
  // 42 + 4: cabem 4 cards E a linha do "+N" (com 44 + 5, eram só 3).
  const cardH = 42, cardGap = 4, maisH = 12;
  const yCards = topo + cabH + 6;
  const cabemTodos = n => n * (cardH + cardGap) - cardGap <= base - yCards;
  const cabemComMais = Math.max(1, Math.floor((base - maisH - yCards + cardGap) / (cardH + cardGap)));

  _FLU_COLUNAS_.forEach((col, i) => {
    const x = mX + i * (colW + gap);
    const cards = f.colunas[col.chave];
    const aprovado = col.chave === 'aprovado';
    _tvRet_(slide, x, topo, colW, cabH, aprovado ? c.brandTint : c.cardBg, { redondo: true, borda: c.lines });
    _tvRet_(slide, x, topo + 6, 4, cabH - 12, aprovado ? c.accentGreen : c.brandLight);
    _tvTexto_(slide, x + 6, topo, colW - 34, cabH, col.titulo,
      { fs: 8, fsMin: 6, bold: true, cor: c.textBody, fonte: fonteT, cortar: true });
    _tvTexto_(slide, x + colW - 32, topo, 30, cabH, String(cards.length),
      { fs: 14, fsMin: 10, bold: true, cor: c.brandDark, fonte: fonteT, align: 'C' });

    if (!cards.length) {
      _tvTexto_(slide, x, yCards + 6, colW, 18, 'Nenhum chamado aqui',
        { fs: 8, fsMin: 6.5, italic: true, cor: c.textMuted, fonte: fonteB, align: 'C' });
      return;
    }
    const cabem = cabemTodos(cards.length) ? cards.length : cabemComMais;
    cards.slice(0, cabem).forEach((card, j) => {
      _fluDesenharCard_(slide, x, yCards + j * (cardH + cardGap), colW, cardH, card, aprovado);
    });
    const resto = cards.length - cabem;
    if (resto > 0) {
      _tvTexto_(slide, x, base - maisH, colW, maisH, '+ ' + resto + (resto === 1 ? ' chamado' : ' chamados'),
        { fs: 7.5, fsMin: 6, bold: true, cor: c.textBody, fonte: fonteB, align: 'C' });
    }
  });

  _tvRodape_(slide, 'Fonte: Fluig, importado no Portal de Solicitações em ' + importado +
                    ' · selo = dias desde o lançamento (verde até ' + _FLU_DIAS_OK_ + ', laranja até ' + _FLU_DIAS_ATENCAO_ +
                    '); nos aprovados, dias em execução');
}

function _fluDesenharCard_(slide, x, y, w, h, card, aprovado) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;
  const dias = aprovado ? card.diasEtapa : card.diasTotal;
  const cor = aprovado ? c.brandMed : _fluCorDias_(dias);

  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 6, 3, h - 12, cor);
  const xi = x + 3, wi = w - 6;

  // Linha 1: nº do Fluig · selo de dias
  const seloW = 28, seloX = x + w - seloW - 5;
  _tvTexto_(slide, xi, y + 1, seloX - xi, 12, '#' + card.numero,
    { fs: 7.5, fsMin: 6, bold: true, cor: c.textMain, fonte: fonteT, cortar: true });
  _tvRet_(slide, seloX, y + 3, seloW, 9.5, cor, { redondo: true });
  _tvTexto_(slide, seloX - 6, y + 1.5, seloW + 12, 12, dias === null ? '—' : dias + 'd',
    { fs: 6.5, fsMin: 5.5, bold: true, cor: '#FFFFFF', fonte: fonteT, align: 'C' });

  // Linha 2: o serviço
  _tvTexto_(slide, xi, y + 11.5, wi, 11, card.servico || '(sem descrição)',
    { fs: 6.8, fsMin: 6.8, cor: c.textMain, fonte: fonteB, cortar: true });

  // Linha 3: fornecedor
  _tvTexto_(slide, xi, y + 21.5, wi, 10.5, card.fornecedor || 'Fornecedor a definir',
    { fs: 6.3, fsMin: 6, bold: true, cor: c.brandDark, fonte: fonteB, cortar: true });

  // Linha 4: valor · devoluções (laranja: voltou para correção) ou, nos
  // aprovados, em que ponto da execução está.
  const extra = aprovado ? _fluEtapaCurta_(card.etapa)
              : (card.devolvido ? 'devolvido ' + card.devolvido + '×' : '');
  const valor = _solMoeda_(card.valor) || '—';
  _tvTexto_(slide, xi, y + 31, wi, 10.5, valor + (extra ? '  ·  ' + extra : ''),
    { fs: 6.3, fsMin: 6, bold: !aprovado && !!card.devolvido, cor: !aprovado && card.devolvido ? c.accentOrange : c.textBody,
      fonte: fonteB, cortar: true });
}

// "Execução Serviço Contratado" não cabe num card de 125 pt.
function _fluEtapaCurta_(etapa) {
  const e = _histNorm_(etapa);
  if (e.indexOf('execu') >= 0) return 'em execução';
  if (e.indexOf('avalia') >= 0) return 'avaliação final';
  if (e.indexOf('emitir') >= 0) return 'emitir solicitação';
  return etapa ? String(etapa).toLowerCase() : '';
}

// Aviso de falha — só na primeira vez (slide vazio). Só insertShape e
// CR_DESIGN_SYSTEM (lição 6 do CLAUDE.md).
function _fluFalha_(slide, unit, mensagem) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  const tit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 14, 640, 35);
  tit.getText().setText('Aprovações no Fluig · ' + unit.name).getTextStyle()
    .setFontSize(22).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily(DS.typography.titles);
  const caixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 100, 620, 150);
  caixa.getFill().setSolidFill('#FEF2F2');
  caixa.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.accentRed);
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 66, 110, 588, 130);
  txt.getText().setText('⚠ Slide do Fluig ainda não disponível\n\n' + mensagem +
    '\n\nRode diagnosticarSolicitacoes() no editor para ver o detalhe.')
    .getTextStyle().setFontSize(11).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
}
