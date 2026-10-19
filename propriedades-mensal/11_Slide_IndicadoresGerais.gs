/**
 * ARQUIVO: 11_Slide_IndicadoresGerais.gs
 * SLIDE — DASHBOARD OPERACIONAL
 *
 * Visual do Orçamento 2027 (06_Visual.gs), rebrand de 20/10/2026. Os números
 * são os mesmos de antes, de obterDashboardPropriedades_ (05_DadosSlides.gs);
 * só o desenho mudou:
 *
 *   - cabeçalho com o SLA de preventivas e a variação no subtítulo;
 *   - faixa de KPIs: SLA de preventivas (o cartão cheio), backlog em aberto,
 *     % de conclusão histórico e orçamento 2026 com a economia projetada;
 *   - painéis: Manutenção nos três meses (mês, mês anterior, mesmo mês do ano
 *     anterior), Gestão de contratações, Orçamento 2026 e Vistorias e
 *     adequações — os mesmos quatro quadrantes do slide anterior.
 *
 * Cor só para variação (▲/▼ no cartão e a economia projetada); os valores das
 * tabelas ficam na cor do texto.
 */

function gerarSlideIndicadoresGerais() {
  const dados = obterDashboardPropriedades_();
  const deck = getDeckMensal_();

  _slideLimpar_(deck, TAG_DASHBOARD);
  const slide = _slideNovo_(deck, TAG_DASHBOARD);

  _pvComMarca_('CAPITAL', () => _dashDesenhar_(slide, dados));

  Logger.log('✓ Dashboard Operacional gerado com sucesso');
}

function _dashDesenhar_(slide, dados) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const meses = dados.headers;   // [mês, mês anterior, mesmo mês do ano anterior]
  const val = k => dados.map.get(k) || { atual: null, mesAnt: null, anoAnt: null };
  const pct = v => (_dashNum_(v) == null ? '—' : formatarNumeroBR(v) + '%');
  const qtd = v => (v == null || v === '' ? '—' : formatarNumeroBR(v));
  // Variação contra o mês anterior, ou null se faltar um dos dois.
  const variacao = (linha, maiorRuim, op) => {
    const a = _dashNum_(linha.atual), b = _dashNum_(linha.mesAnt);
    return (a == null || b == null) ? null : _pvVariacao_(a - b, maiorRuim, op);
  };

  const sla = val('SLA Preventivas');
  const backlog = val('Backlog em aberto');
  const conclusao = val('Percentual de conclusão histórico');
  const varSla = variacao(sla, false, { casas: 1, unidade: 'p.p.' });
  const varBacklog = variacao(backlog, true);
  const varConclusao = variacao(conclusao, false, { casas: 1, unidade: 'p.p.' });

  // ── Cabeçalho: o número que importa é o SLA de preventivas ──
  const subtitulo = _dashNum_(sla.atual) == null
    ? 'Indicadores do portfólio de Propriedades'
    : 'SLA de preventivas ' + pct(sla.atual) + (varSla ? ' · ' + varSla.txt + ' vs ' + meses[1] : '');
  _pvCabecalho_(slide, 'Dashboard Operacional', subtitulo,
    { canto: 'Performance: ' + meses[0] + (dados.parcial ? ' · mês em andamento' : '') });

  // ── Faixa de KPIs ──
  const economia = String(val('Economia Projetada (26/25)').atual || '—');
  const kpis = [
    { rotulo: 'SLA preventivas', valor: pct(sla.atual), destaque: true,
      sub: varSla ? varSla.txt + ' vs ' + meses[1] : null, corSub: varSla && varSla.cor },
    { rotulo: 'Backlog em aberto', valor: qtd(backlog.atual),
      sub: varBacklog ? varBacklog.txt + ' vs ' + meses[1] : null, corSub: varBacklog && varBacklog.cor },
    { rotulo: '% conclusão histórico', valor: pct(conclusao.atual),
      sub: varConclusao ? varConclusao.txt + ' vs ' + meses[1] : null, corSub: varConclusao && varConclusao.cor },
    { rotulo: 'Orçamento 2026', valor: String(val('Orçamento 2026 (Total)').atual || '—'),
      sub: economia === '—' ? null : 'economia ' + economia, corSub: _dashCorVariacao_(economia) }
  ];
  // 72 de altura: com a linha de variação embaixo, sobram 34 para o número de
  // 26 pt (com 62 sobravam 24 e o número invadia a variação).
  const kx = 30, ky = 82, kh = 72, kgap = 10, kw = (660 - kgap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => _pvKpi_(slide, kx + i * (kw + kgap), ky, kw, kh, k));

  // ── Painéis ──
  const topo = ky + kh + 10, base = 378;

  // Esquerda: Manutenção nos três meses, e Gestão de contratações embaixo.
  const xEsq = 30, wEsq = 236, hManut = 106;
  let y = _pvCard_(slide, xEsq, topo, wEsq, hManut, 'Manutenção · três meses');
  _pvTabela_(slide, xEsq + 10, y, wEsq - 18,
    [{ rotulo: 'Indicador', peso: 2.1 }, { rotulo: meses[0], align: 'C' },
     { rotulo: meses[1], align: 'C' }, { rotulo: meses[2], align: 'C' }],
    [['SLA preventivas', pct(sla.atual), pct(sla.mesAnt), pct(sla.anoAnt)],
     ['Backlog em aberto', qtd(backlog.atual), qtd(backlog.mesAnt), qtd(backlog.anoAnt)],
     ['% conclusão histórico', pct(conclusao.atual), pct(conclusao.mesAnt), pct(conclusao.anoAnt)]]
      .map(l => ({ celulas: l.map((t, i) => (i === 1 ? { texto: t, bold: true } : { texto: t, cor: i ? c.textBody : c.textMain })) })),
    { altLinha: 19 });

  const yContr = topo + hManut + 10;
  y = _pvCard_(slide, xEsq, yContr, wEsq, base - yContr, 'Gestão de contratações');
  _pvTabela_(slide, xEsq + 10, y, wEsq - 18,
    [{ rotulo: 'Indicador', peso: 2.4 }, { rotulo: 'Total', align: 'C' }],
    _dashLinhas_(val, [['Processos em andamento', 'Contratações em andamento'],
                       ['Percentual de conclusão', 'Contratações conclusão (%)'],
                       ['Prazo médio de contratação', 'Contratações prazo médio']]),
    { altLinha: 17 });

  // Meio: Orçamento 2026 (Torre de Manutenção).
  const xMeio = 278, wMeio = 200;
  y = _pvCard_(slide, xMeio, topo, wMeio, base - topo, 'Orçamento 2026');
  const linhasOrc = _dashLinhas_(val, [['Orçamento total 2026', 'Orçamento 2026 (Total)'],
                                       ['Ritmo 2025 (base)', 'Ritmo 2025 (Base)'],
                                       ['Capital Realty (CR)', 'Orçamento Capital Realty'],
                                       ['Demercado', 'Orçamento Demercado'],
                                       ['Economia projetada 26/25', 'Economia Projetada (26/25)'],
                                       ['CAPEX', 'CAPEX']]);
  // A economia é variação (2026 contra o ritmo de 2025): verde ou vermelho.
  const celEconomia = linhasOrc[4].celulas[1];
  celEconomia.cor = _dashCorVariacao_(celEconomia.texto) || celEconomia.cor;
  _pvTabela_(slide, xMeio + 10, y, wMeio - 18,
    [{ rotulo: 'Item', peso: 1.25 }, { rotulo: 'Valor', align: 'R' }], linhasOrc, { altLinha: 25, fs: 8.5 });

  // Direita: Vistorias e adequações de clientes.
  const xDir = 490, wDir = 200;
  y = _pvCard_(slide, xDir, topo, wDir, base - topo, 'Vistorias e adequações');
  _pvTabela_(slide, xDir + 10, y, wDir - 18,
    [{ rotulo: 'Indicador', peso: 2.2 }, { rotulo: 'Total', align: 'C' }],
    [{ grupo: 'Vistorias' }]
      .concat(_dashLinhas_(val, [['Entrada/saída de clientes', 'Vistorias - Entrada/saída'],
                                 ['Recebimento de obras', 'Vistorias - Recebimento obras'],
                                 ['Monitoramento', 'Vistorias - Monitoramento'],
                                 ['Documentação', 'Vistorias - Documentação']]))
      .concat([{ grupo: 'Adequações de clientes' }])
      .concat(_dashLinhas_(val, [['Quantidade', 'Adequações - Quantidade'],
                                 ['Prazo médio de atendimento (dias)', 'Adequações - Prazo médio'],
                                 ['Percentual de conclusão', 'Adequações - Conclusão (%)']])),
    { altLinha: 18, fs: 8 });

  _pvRodape_(slide, 'Fonte: BD - PREVENTIVAS e BD-CORRETIVAS (equipe Propriedades) · Torre de Manutenção (orçamento) · ' +
                    'planilha PROPRIEDADES (contratações)');
}

// Linhas rótulo | valor atual, a partir de pares [rótulo, chave do mapa].
// Valor que falta sai como "—", na cor apagada.
function _dashLinhas_(val, pares) {
  const c = CR_DESIGN_SYSTEM.colors;
  return pares.map(([rotulo, chave]) => {
    const v = val(chave).atual;
    const texto = (v == null || v === '' || v === '-') ? '—' : formatarNumeroBR(v);
    return { celulas: [{ texto: rotulo, cor: c.textMain },
                       { texto: texto, bold: texto !== '—', cor: texto === '—' ? c.textMuted : c.brandDark }] };
  });
}

// Cor de um texto de variação já formatado ("+R$ 12.826 (−2,1%)"): verde se
// positivo, vermelho se negativo, null se não der para dizer.
function _dashCorVariacao_(texto) {
  const c = CR_DESIGN_SYSTEM.colors, s = String(texto || '').trim();
  if (/^\+/.test(s)) return c.accentGreen;
  if (/^[−-]/.test(s)) return c.accentRed;
  return null;
}
