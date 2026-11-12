/**
 * ARQUIVO: 00_Main.gs
 * PONTOS DE ENTRADA — escolher no seletor do editor e clicar em Executar
 * (projeto standalone: não há menu). Resultado e link do deck no log.
 *
 *   criarPlanilhaPG()        1ª vez: cria a planilha de metas e projetos na pasta de P&G
 *   gerarApresentacaoPG()    gera/atualiza o deck do mês inteiro
 *   gerarSoFinanceiroPG()    só Dashboard + DRE + Bridges
 *   gerarSoMetasPG()         só Dashboard + Farol + slides de cada meta
 *   gerarSoProjetosPG()      só Dashboard + Portfólio + Cronograma + Entregas
 *   diagnosticarPG()         confere export, planilha e deck sem mexer em nada
 *
 * MÊS DO DECK = mês do nome do export mais recente na pasta
 * (Planejamento-<Mês>-<Ano>.csv). Rotina mensal: salvar o export da
 * controladoria com esse nome na pasta de P&G, atualizar METAS/PROJETOS e
 * CONFIG!B1 da planilha, rodar gerarApresentacaoPG().
 */

function gerarApresentacaoPG() { _pgGerar_({ fin: true, metas: true, projetos: true, capas: true }); }
function gerarSoFinanceiroPG() { _pgGerar_({ fin: true }); }
function gerarSoMetasPG()      { _pgGerar_({ metas: true }); }
function gerarSoProjetosPG()   { _pgGerar_({ projetos: true }); }

function _pgContexto_() {
  const fin = obterFinanceiroPG_();
  const ctx = { fin: fin, mes: fin.mes, ano: fin.ano, agg: agregarFinanceiroPG_(fin) };
  fin.avisos.forEach(a => Logger.log('⚠ ' + a));
  try { ctx.metas = obterMetasPG_(); } catch (e) { Logger.log('⚠ Metas: ' + e.message); ctx.metas = null; }
  try { ctx.projetos = obterProjetosPG_(); } catch (e) { Logger.log('⚠ Projetos: ' + e.message); ctx.projetos = null; }
  if (!ctx.metas) Logger.log('⚠ Planilha/aba METAS não encontrada — rode criarPlanilhaPG().');
  if (!ctx.projetos) Logger.log('⚠ Planilha/aba PROJETOS não encontrada — rode criarPlanilhaPG().');
  return ctx;
}

function _pgGerar_(o) {
  const ctx = _pgContexto_();
  const aberto = _pgAbrirDeck_(ctx.mes, ctx.ano);
  _pgDeckAtual_ = aberto.deck;
  const T = PG_TAG, P = _pgPasso_;
  try {
    if (o.capas) {
      P('Capa', T.CAPA, novo => slideCapaPG_(novo(), ctx));
      if (criarModeloDestaquesPG_(aberto.deck, ctx)) Logger.log('✓ Modelo de Destaques criado (preencher à mão; não é regerado).');
    }
    P('Dashboard', T.DASHBOARD, novo => slideDashboardPG_(novo(), ctx));
    if (o.fin) {
      if (o.capas) P('Divisória 01 Financeiro', T.SEC1, novo => slideSecaoPG_(novo(), ctx, 1));
      P('DRE', T.DRE, novo => slideDREPG_(novo(), ctx));
      P('Bridge (tabela)', T.BRIDGE_TAB, novo => slideBridgeTabelaPG_(novo(), ctx));
      P('Bridge (gráfico)', T.BRIDGE_GRAF, novo => slideBridgeGraficoPG_(novo(), ctx));
    }
    if (o.metas) {
      if (o.capas) P('Divisória 02 Metas', T.SEC2, novo => slideSecaoPG_(novo(), ctx, 2));
      if (ctx.metas) {
        P('Farol de metas', T.FAROL, novo => slideFarolPG_(novo(), ctx));
        P('Metas — detalhe', T.META, novo => ctx.metas.metas.forEach(mt => slideMetaDetalhePG_(novo(), ctx, mt)));
      }
    }
    if (o.projetos) {
      if (o.capas) P('Divisória 03 Projetos', T.SEC3, novo => slideSecaoPG_(novo(), ctx, 3));
      if (ctx.projetos) {
        P('Portfólio', T.PORTFOLIO, novo => slidesPortfolioPG_(novo, ctx));
        P('Cronograma', T.CRONOGRAMA, novo => slideCronogramaPG_(novo(), ctx));
        P('Entregas e próximos passos', T.ENTREGAS, novo => slideEntregasPG_(novo(), ctx));
      }
    }
    if (o.capas) P('Encerramento', T.FIM, novo => slideEncerramentoPG_(novo(), ctx));

    // Deck recém-criado: tira o slide em branco que o SlidesApp.create põe.
    (aberto.brancos || []).forEach(s => { try { s.remove(); } catch (e) {} });
    _pgOrdenar_();
    aberto.deck.saveAndClose();
  } finally {
    _pgDeckAtual_ = null;
  }
  Logger.log('✓ Deck: ' + aberto.url);
}

function diagnosticarPG() {
  const ctx = _pgContexto_();
  const k = _pgSomas_(ctx.agg.total, ctx.mes);
  Logger.log('Mês de referência: ' + PG_MESES[ctx.mes] + ' ' + ctx.ano + ' (' + ctx.fin.arquivo + ')');
  Logger.log('Financeiro (R$ mil): mês real ' + _pgMil_(k.mesR) + ' × ritmo ' + _pgMil_(k.mesP) +
    ' · acum. ' + _pgMil_(k.acumR) + ' × ' + _pgMil_(k.acumP) + ' · projeção ' + _pgMil_(k.proj) + ' × ritmo ano ' + _pgMil_(k.anoP));
  ctx.agg.grupos.forEach(g => { const s = _pgSomas_(g, ctx.mes); Logger.log('  ' + g.nome + ': acum. ' + _pgMil_(s.acumR) + ' × ' + _pgMil_(s.acumP)); });
  if (ctx.metas) Logger.log('Metas: ' + ctx.metas.metas.length + ' · ' + ctx.metas.atingidos + '/' + ctx.metas.total + ' pontos · situação ' + (ctx.metas.situacao || '—'));
  if (ctx.projetos) Logger.log('Projetos: ' + ctx.projetos.length + ' (' + ctx.projetos.filter(p => !p.statusKey).length + ' sem status)');
  const ss = _pgPlanilha_();
  Logger.log('Planilha: ' + (ss ? ss.getUrl() : 'NÃO ENCONTRADA — rode criarPlanilhaPG()'));
}
