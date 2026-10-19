/**
 * ARQUIVO: 10_Slide_Webdox.gs
 * DESCRIÇÃO: Contratos em andamento no Webdox do Mega — depois do kanban de
 *            solicitações, é o ÚLTIMO slide da TV.
 *
 *   Faixa de KPIs: em andamento · aguardando os Megas · atrasados no passo ·
 *   tempo médio em aberto (as mesmas contas dos cartões do painel Webdox do
 *   portal). Embaixo, os contratos por ÁREA com o passo atual nas mãos:
 *   JURÍDICO · FACILITIES · BACKOFFICE · OUTRA PARTE (normalmente o
 *   fornecedor assinando, ou alguém de fora das listas do portal).
 *
 * FONTE: função `webdox-megas` do Portal de Solicitações (PORTAL_WEBDOX_URL em
 * Config.gs), mesma chave PORTAL_API_KEY do kanban. O portal decide a área
 * (src/lib/webdox-areas.ts) e a fase do passo; o slide só desenha.
 *
 * O WEBDOX NÃO É AO VIVO: o portal importa uma planilha exportada do Webdox.
 * Por isso o canto do cabeçalho diz de quando é a importação, e não a hora
 * da geração — um contrato "parado há 60 dias" pode já ter andado se a
 * importação for antiga.
 *
 * SEGURANÇA: igual ao kanban — portal fora do ar, o slide atual fica na TV.
 */

const _WEB_COLUNAS_ = [
  { chave: 'juridico',   titulo: 'JURÍDICO' },
  { chave: 'facilities', titulo: 'FACILITIES' },
  { chave: 'backoffice', titulo: 'BACKOFFICE' },
  { chave: 'outros',     titulo: 'OUTRA PARTE' }
];


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function ATUALIZAR_WEBDOX()          { return _tvWebdox_(UNITS); }
function ATUALIZAR_WEBDOX_CURITIBA() { return _tvWebdox_([_tvUnidade_('CURITIBA')]); }
function ATUALIZAR_WEBDOX_ITAJAI()   { return _tvWebdox_([_tvUnidade_('ITAJA')]); }
function ATUALIZAR_WEBDOX_ESTEIO()   { return _tvWebdox_([_tvUnidade_('ESTEIO')]); }

// Logo depois do kanban de solicitações.
function _webIndice_(unit) { return _solIndice_(unit) + 1; }

function _tvWebdox_(unidades) {
  const erros = [];
  unidades.forEach(unit => {
    if (!unit.portalEmpreendimento) return;
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const idx = _webIndice_(unit);
      while (slides.length < idx + 1) {
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = deck.getSlides();
      }
      atualizarSlideWebdox(slides[idx], unit);
    } catch (e) {
      erros.push(unit.name + ': ' + e.message);
      Logger.log('❌ Webdox (' + unit.name + '): ' + e.message);
    }
  });
  return erros;
}


// ==========================================
// LEITURA
// ==========================================
function obterWebdox_(unit) {
  const d = _portalBuscar_(PORTAL_WEBDOX_URL, unit);
  if (!d || !d.colunas || typeof d.colunas !== 'object' || !d.kpis) {
    throw new Error('Resposta do webdox-megas sem "colunas"/"kpis" — o formato da função mudou?');
  }
  const colunas = {};
  let total = 0;
  _WEB_COLUNAS_.forEach(c => {
    const lista = d.colunas[c.chave];
    // Coluna faltando é erro, não coluna vazia (zero falso, lição 3).
    if (!Array.isArray(lista)) throw new Error('Resposta do webdox-megas sem a coluna "' + c.chave + '".');
    colunas[c.chave] = lista.map(_webCard_).sort((a, b) => (b.diasPasso || 0) - (a.diasPasso || 0));
    total += lista.length;
  });
  const quando = s => { const x = s ? new Date(s) : null; return x && !isNaN(x) ? x : null; };
  const n = v => (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  return {
    importadoEm: quando(d.importado_em),
    geradoEm: quando(d.gerado_em),
    kpis: { andamento: n(d.kpis.andamento), aguardandoMegas: n(d.kpis.aguardando_megas),
            atrasados: n(d.kpis.atrasados), tempoMedio: n(d.kpis.tempo_medio_dias) },
    total: total,
    colunas: colunas
  };
}

function _webCard_(c) {
  c = c || {};
  const n = v => (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  return {
    numero:      c.numero ? String(c.numero) : '—',
    // O "objeto" do Webdox vem com o nome do arquivo ("DEMERCADO_MAFESA_
    // INSTALAÇÕES_MCTBA-F7"): troca "_" por espaço para ler na TV.
    objeto:      String(c.objeto || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
    fornecedor:  c.fornecedor ? String(c.fornecedor) : '',
    fase:        c.fase ? String(c.fase) : '',
    passo:       c.passo_atual ? String(c.passo_atual) : '',
    responsavel: c.responsavel ? String(c.responsavel) : '',
    diasPasso:   n(c.dias_no_passo) === null ? null : Math.floor(n(c.dias_no_passo)),
    slaPasso:    n(c.sla_passo_dias),
    sla:         String(c.sla_status || 'sem_sla'),
    diasAberto:  n(c.dias_em_aberto),
    retrabalhos: n(c.retrabalhos) || 0,
    aguardandoMegas: c.aguardando_megas === true,
    protocolo:   c.protocolo_solicitacao ? String(c.protocolo_solicitacao) : ''
  };
}

// Cor do prazo do passo — régua do portal (slaStatusDoPasso: atenção a partir
// de 80% do prazo). Sem prazo cadastrado, cinza: não dá para dizer.
function _webCorSla_(sla) {
  const c = CR_DESIGN_SYSTEM.colors;
  if (sla === 'atrasado') return c.accentRed;
  if (sla === 'atencao')  return c.accentOrange;
  if (sla === 'no_prazo') return c.accentGreen;
  return c.textMuted;
}


// ==========================================
// DESENHO
// ==========================================
function atualizarSlideWebdox(slide, unit) {
  let w;
  try {
    w = obterWebdox_(unit);
  } catch (e) {
    Logger.log('✗ Webdox (' + unit.name + '): ' + e.message);
    if (slide.getPageElements().length === 0) _webFalha_(slide, unit, e.message);
    else Logger.log('  · slide atual preservado na TV.');
    return;
  }

  slide.getPageElements().forEach(el => el.remove());
  try {
    _webDesenhar_(slide, unit, w);
    Logger.log('✅ Webdox (' + unit.name + '): ' +
               _WEB_COLUNAS_.map(c => c.chave + ' ' + w.colunas[c.chave].length).join(' · '));
  } catch (e) {
    Logger.log('✗ Webdox — desenho (' + unit.name + '): ' + e.message + '\n' + (e.stack || ''));
    slide.getPageElements().forEach(el => el.remove());
    _webFalha_(slide, unit, 'Falha ao desenhar o slide do Webdox: ' + e.message);
  }
}

function _webDesenhar_(slide, unit, w) {
  const DS = CR_DESIGN_SYSTEM;
  const fmt = d => Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  const importado = w.importadoEm ? fmt(w.importadoEm) : '—';
  const k = w.kpis;
  applyBrandHeaderAndBackground(slide, 'Contratos no Webdox',
    (k.andamento != null ? k.andamento : w.total) + ' em andamento · ' + (k.atrasados || 0) + ' atrasados no passo',
    importado, unit, { dataLabel: 'Webdox: importado em ' + importado });
  const c = DS.colors, fonteT = DS.typography.titles, fonteB = DS.typography.body;

  // Faixa de KPIs (o primeiro cheio: é o número do slide)
  const kx = 30, ky = 84, kh = 62, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'Em andamento', valor: k.andamento != null ? k.andamento : w.total,
    sub: 'contratos de Facilities', destaque: true, fsValor: 22 });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, { rotulo: 'Aguardando os Megas', valor: k.aguardandoMegas || 0,
    sub: 'passo com o Administrativo Megas', corSub: k.aguardandoMegas ? c.accentOrange : null, fsValor: 22 });
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, { rotulo: 'Atrasados no passo', valor: k.atrasados || 0,
    sub: k.atrasados ? 'passaram do prazo do passo' : 'nenhum fora do prazo',
    corSub: k.atrasados ? c.accentRed : c.accentGreen, fsValor: 22 });
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Tempo médio em aberto',
    valor: k.tempoMedio != null ? Math.round(k.tempoMedio) + ' dias' : '—', sub: 'desde a criação no Webdox', fsValor: 22 });

  // Colunas por área
  const mX = 30, gap = 10, colW = (720 - 2 * mX - 3 * gap) / 4;
  const topo = 156, cabH = 22, base = 378;
  const cardH = 44, cardGap = 5, maisH = 12;
  const yCards = topo + cabH + 6;
  // Cabem todos? Então não reserva a linha do "+N" (são poucos contratos por
  // Mega, e perder um card para avisar que falta um seria bobo).
  const cabemTodos = n => n * (cardH + cardGap) - cardGap <= base - yCards;
  const cabemComMais = Math.max(1, Math.floor((base - maisH - yCards + cardGap) / (cardH + cardGap)));

  _WEB_COLUNAS_.forEach((col, i) => {
    const x = mX + i * (colW + gap);
    const cards = w.colunas[col.chave];
    _tvRet_(slide, x, topo, colW, cabH, c.cardBg, { redondo: true, borda: c.lines });
    _tvRet_(slide, x, topo + 6, 4, cabH - 12, c.brandLight);
    _tvTexto_(slide, x + 8, topo, colW - 44, cabH, col.titulo,
      { fs: 8.5, fsMin: 6.5, bold: true, cor: c.textBody, fonte: fonteT, cortar: true });
    _tvTexto_(slide, x + colW - 42, topo, 40, cabH, String(cards.length),
      { fs: 15, fsMin: 10, bold: true, cor: c.brandDark, fonte: fonteT, align: 'C' });

    if (!cards.length) {
      _tvTexto_(slide, x, yCards + 6, colW, 18, 'Nenhum contrato aqui',
        { fs: 8.5, fsMin: 7, italic: true, cor: c.textMuted, fonte: fonteB, align: 'C' });
      return;
    }
    const cabem = cabemTodos(cards.length) ? cards.length : cabemComMais;
    cards.slice(0, cabem).forEach((card, j) => {
      _webDesenharCard_(slide, x, yCards + j * (cardH + cardGap), colW, cardH, card);
    });
    const resto = cards.length - cabem;
    if (resto > 0) {
      _tvTexto_(slide, x, base - maisH, colW, maisH, '+ ' + resto + (resto === 1 ? ' contrato' : ' contratos'),
        { fs: 7.5, fsMin: 6, bold: true, cor: c.textBody, fonte: fonteB, align: 'C' });
    }
  });

  _tvRodape_(slide, 'Fonte: Webdox, importado no Portal de Solicitações em ' + importado +
                    ' · selo = dias no passo atual, na cor do prazo do passo · os mais parados primeiro');
}

function _webDesenharCard_(slide, x, y, w, h, card) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const fonteT = DS.typography.titles, fonteB = DS.typography.body;
  const cor = _webCorSla_(card.sla);

  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 6, 3, h - 12, cor);
  const xi = x + 3, wi = w - 6;

  // Linha 1: nº do workflow (+ solicitação) · selo de dias no passo
  const seloW = 30, seloX = x + w - seloW - 6;
  const titulo = '#' + card.numero + (card.protocolo ? '  ·  ' + card.protocolo : '');
  _tvTexto_(slide, xi, y + 1, seloX - xi, 12, titulo,
    { fs: 7.5, fsMin: 6, bold: true, cor: c.textMain, fonte: fonteT, cortar: true });
  _tvRet_(slide, seloX, y + 3, seloW, 9.5, cor, { redondo: true });
  _tvTexto_(slide, seloX - 6, y + 1.5, seloW + 12, 12, card.diasPasso === null ? '—' : card.diasPasso + 'd',
    { fs: 6.5, fsMin: 5.5, bold: true, cor: '#FFFFFF', fonte: fonteT, align: 'C' });

  // Linha 2: objeto
  _tvTexto_(slide, xi, y + 12, wi, 12, card.objeto || '(sem objeto)',
    { fs: 6.8, fsMin: 6.8, cor: c.textMain, fonte: fonteB, cortar: true });

  // Linha 3: fase · prazo do passo
  const prazo = card.slaPasso ? ' · prazo ' + card.slaPasso + 'd' : '';
  _tvTexto_(slide, xi, y + 23, wi, 11, (card.fase || card.passo || '—') + prazo,
    { fs: 6.3, fsMin: 6, bold: true, cor: c.brandDark, fonte: fonteB, cortar: true });

  // Linha 4: com quem está · retrabalhos. "Aguardando os Megas" em laranja:
  // é pendência nossa.
  const ret = card.retrabalhos ? '  ·  ' + card.retrabalhos + (card.retrabalhos === 1 ? ' retrabalho' : ' retrabalhos') : '';
  const quem = card.aguardandoMegas ? 'Aguardando os Megas' : (card.responsavel || card.fornecedor || '—');
  _tvTexto_(slide, xi, y + 33, wi, 11, quem + ret,
    { fs: 6.3, fsMin: 6, bold: card.aguardandoMegas, cor: card.aguardandoMegas ? c.accentOrange : c.textBody,
      fonte: fonteB, cortar: true });
}

// Aviso de falha — só na primeira vez (slide vazio). Só insertShape e
// CR_DESIGN_SYSTEM (lição 6 do CLAUDE.md).
function _webFalha_(slide, unit, mensagem) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  const tit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 14, 640, 35);
  tit.getText().setText('Contratos no Webdox · ' + unit.name).getTextStyle()
    .setFontSize(22).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily(DS.typography.titles);
  const caixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 100, 620, 150);
  caixa.getFill().setSolidFill('#FEF2F2');
  caixa.getBorder().setWeight(1).getLineFill().setSolidFill(DS.colors.accentRed);
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 66, 110, 588, 130);
  txt.getText().setText('⚠ Slide do Webdox ainda não disponível\n\n' + mensagem +
    '\n\nRode diagnosticarSolicitacoes() no editor para ver o detalhe.')
    .getTextStyle().setFontSize(11).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
}
