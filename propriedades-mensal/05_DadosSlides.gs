/**
 * ARQUIVO: 05_DadosSlides.gs
 * DADOS — agregações que existem para UM slide
 *
 * Separado do 02_Dados.gs na onda D. Aquele arquivo tinha 2.001 linhas e 74
 * funções, e misturava duas coisas de natureza diferente:
 *
 *   02_Dados.gs      a BASE — ler as planilhas, normalizar chamado, decidir o
 *                    que é SLA cumprido, quem é Propriedades e quem é
 *                    Facilities, qual é o mês de referência. Regras do
 *                    negócio, que valem para qualquer slide.
 *
 *   05_DadosSlides.gs (aqui) a AGREGAÇÃO — pegar essas regras e montar o
 *                    número exato que um slide desenha. Cada função aqui
 *                    existe por causa de um slide específico, e o nome dele
 *                    está no comentário da seção.
 *
 * O corte importa porque as duas mudam por motivos diferentes: a base muda
 * quando a operação muda de regra; a agregação muda quando alguém pede outra
 * coluna no slide. Juntas, qualquer mexida obrigava a reler as duas.
 *
 * O que tem aqui: Dashboard Operacional, Indicadores de Corretivas, Chamados
 * Pendentes por motivo e Torre de Manutenção.
 */

// ==========================================
// DASHBOARD OPERACIONAL — 2 quadrantes comparativos
// ==========================================
// Monta os 3 pontos no tempo (mês atual / mês anterior / mesmo mês ano
// anterior) que o grid comparativo do Dashboard Operacional
// (Slide_IndicadoresGerais.gs, no estilo de megas-mensal/Slide01_
// Dashboard.gs) precisa — chamando obterIndicadoresPropriedades_/
// obterBacklogPorCC_ com (ano, mesIndex) diferentes. Nenhum dado novo: são
// as MESMAS funções que Preventivas/Backlog já usam pro mês corrente, já
// filtradas pra equipe Propriedades.
//
// Só Preventivas e Backlog entram — Corretivas e o corte Megas x Demais
// saíram do Dashboard por pedido do usuário (trabalhando por partes). O
// mapa fica só com as chaves que Slide_IndicadoresGerais.gs lê hoje; se
// Corretivas voltar ao grid, é só recalcular corr[] igual a prev[] abaixo.
//
// Recebimento de Obras fica FORA deste grid, de propósito: a planilha
// (REL_RECEBIMENTO) é uma LISTA VIVA de pendências, não um registro
// histórico por mês — não existe "quantos estavam concluídos em maio" pra
// reconstruir, a linha de uma pendência já concluída não guarda a data em
// que isso aconteceu. Forçar uma coluna "mês anterior" aqui seria inventar
// dado. Ele já aparece como card avulso (sem comparação histórica) no
// primeiro slide de KPIs — ver obterIndicadoresPortfolio_ acima.
/**
 * TEMPO MÉDIO DE APROVAÇÃO (horas) e % CONCLUSÃO HISTÓRICO, no mês pedido.
 *
 * Nos Megas os dois são células DIGITADAS na aba DADOS — ninguém os calcula.
 * Aqui saem da BD-CORRETIVAS, com estas definições:
 *
 * · TEMPO MÉDIO DE APROVAÇÃO = média da coluna "Tempo para aprovar
 *   (segundos)" (AG), em horas, dos chamados APROVADOS dentro do mês — a
 *   janela vem de "Aprovado em" (P).
 *
 *   O valor sai de AG, NÃO de (P − B). A base já calcula essa espera; refazer
 *   por subtração assumiria que ela é corrida, e se AG considerar horário
 *   útil ou calendário de SLA os dois números divergem sem que ninguém saiba
 *   qual está certo. A subtração fica de RESERVA, só para a linha que tiver
 *   data de aprovação e não tiver AG — e a divergência entre as duas é
 *   registrada no Logger, que é como se descobre a regra de AG sem perguntar.
 *
 *   A janela é a da aprovação, não a da abertura — mesma escolha que já vale
 *   para o tempo de atendimento, que usa a janela do fechamento: o indicador
 *   fala do que ACONTECEU no mês, não do que foi aberto nele. Chamado sem
 *   aprovação fica de fora (não é aprovação instantânea, é aprovação que não
 *   houve).
 *
 * · % CONCLUSÃO HISTÓRICO = de tudo que foi aberto ATÉ o fim do mês, quanto
 *   já estava fechado ali. É acumulado desde o começo da base, não do mês —
 *   é o que "histórico" quer dizer, e é o que faz o número ser comparável
 *   entre meses: um mês com poucos chamados não distorce a série.
 *   Equivale a  fechados(até D) ÷ criados(até D).
 *
 * Devolve { tempoAprovacaoH, conclusaoHistoricoPct, aprovadosNoMes,
 *           semDataAprovacao } — nulls quando não há base, nunca zero: "não
 * houve o que medir" é diferente de "o resultado foi zero" (lição 3).
 */
// Conclusão histórica acumulada das corretivas de PROPERTY nos pontos solicitados.
// Execução rápida e direta sem cálculos pesados de tempo de aprovação.
function obterConclusaoHistoricaPropriedades_(pontos) {
  const itens = _propLerCorretivas_()
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  return pontos.map(p => {
    const refFim = new Date(Date.UTC(p.ano, p.index + 1, 1));
    let criadosAte = 0, fechadosAte = 0;
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (it.dtReporte && it.dtReporte < refFim) {
        criadosAte++;
        if (_bdChamadoFechado_(it.estado, it.dtFechado) && it.dtFechado && it.dtFechado < refFim) {
          fechadosAte++;
        }
      }
    }
    return {
      conclusaoHistoricoPct: criadosAte > 0 ? (fechadosAte / criadosAte) * 100 : null,
      criadosAte: criadosAte,
      fechadosAte: fechadosAte
    };
  });
}

// DESATIVADA (não tem chamador). Saiu do dashboard no commit de performance:
// custava ~2min de leitura da BD-CORRETIVAS e as linhas que ela alimentava
// ("Tempo médio de aprovação", fluxo) não são desenhadas no slide. Fica aqui
// porque é a única implementação da conta de tempo de aprovação — se a linha
// voltar ao slide, é esta função que volta junto. A conferência estoque ×
// fluxo que dependia dela agora vive em Diagnostico_Identidade.gs.
function obterAprovacaoEConclusao_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));

  const itens = _propLerCorretivas_()
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  const esperas = [];              // em SEGUNDOS
  let semDataAprovacao = 0;        // aprovado no mês, mas sem espera utilizável
  let porSubtracao = 0;            // caiu na reserva (P − B)
  let divergentes = 0;             // AG e (P − B) discordam em mais de 1h
  let criadosAte = 0, fechadosAte = 0;

  itens.forEach(it => {
    // --- Tempo de aprovação: aprovados DENTRO do mês ---
    if (it.dtAprovado && it.dtAprovado >= refIni && it.dtAprovado < refFim) {
      const porSub = (it.dtReporte && it.dtAprovado >= it.dtReporte)
        ? (it.dtAprovado - it.dtReporte) / 1000
        : null;

      if (it.tempoAprovarSeg != null && it.tempoAprovarSeg >= 0) {
        esperas.push(it.tempoAprovarSeg);
        // Discordância grande entre a coluna e a subtração indica que AG não é
        // tempo corrido. Vale saber, não vale corrigir por conta própria.
        if (porSub != null && Math.abs(porSub - it.tempoAprovarSeg) > 3600) divergentes++;
      } else if (porSub != null) {
        esperas.push(porSub);
        porSubtracao++;
      } else {
        // Sem AG e com data de aprovação anterior ao reporte: data trocada,
        // não espera negativa. Uma média com número negativo é pior que uma
        // média com um caso a menos.
        semDataAprovacao++;
      }
    }

    // --- Conclusão histórica: acumulado até o fim do mês ---
    if (it.dtReporte && it.dtReporte < refFim) {
      criadosAte++;
      if (_bdChamadoFechado_(it.estado, it.dtFechado) && it.dtFechado && it.dtFechado < refFim) {
        fechadosAte++;
      }
    }
  });

  return {
    tempoAprovacaoH: esperas.length
      ? esperas.reduce((soma, seg) => soma + seg, 0) / esperas.length / 3600
      : null,
    conclusaoHistoricoPct: criadosAte > 0 ? (fechadosAte / criadosAte) * 100 : null,
    aprovadosNoMes: esperas.length,
    semDataAprovacao: semDataAprovacao,
    porSubtracao: porSubtracao,
    divergentes: divergentes,
    criadosAte: criadosAte,
    fechadosAte: fechadosAte
  };
}


function obterDashboardPropriedades_() {
  const ref    = obterMesReferencia_();
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);
  const anoAnt = { ano: ref.ano - 1, index: ref.index };
  const pontos = [
    { ano: ref.ano,    index: ref.index },
    { ano: mesAnt.ano, index: mesAnt.index },
    { ano: anoAnt.ano, index: anoAnt.index }
  ];

  // Só a equipe PROPRIEDADES — Facilities e Terceiros não aparecem nesta
  // apresentação (pedido do usuário).
  const prev = pontos.map(p => obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, p.ano, p.index));
  const backlog = pontos.map(p =>
    obterBacklogPorCC_(p.ano, p.index).reduce((s, b) => s + b.total, 0));

  const nomesCurto = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const headers = pontos.map(p => nomesCurto[p.index] + "'" + String(p.ano).slice(-2));

  // Conclusão histórica das corretivas (PROPERTY) nos 3 pontos.
  // Tempo de aprovação e fluxo de chamados foram removidos do dashboard
  // para acelerar a geração (economiza ~2 minutos em BD-CORRETIVAS).
  //
  // Sair daqui levou junto a conferência da identidade estoque × fluxo, e o
  // slide continua mostrando "Backlog em aberto". Ela não sumiu: roda sob
  // demanda em conferirIdentidadeBacklog() (Diagnostico_Identidade.gs). Se um
  // backlog parecer estranho, é lá que se confere.
  const conclusoes = obterConclusaoHistoricaPropriedades_(pontos);

  const recebimento = obterRecebimentoObrasResumo_();
  const contratacoes = obterContratacoesResumo_();

  const linha3 = (a, b, c) => ({ atual: a, mesAnt: b, anoAnt: c });
  const map = new Map();

  // Quadrante 1 & 2: Manutenção (Preventiva + Corretiva)
  map.set('SLA Preventivas',        linha3(prev[0].total.sla.pct,      prev[1].total.sla.pct,      prev[2].total.sla.pct));
  map.set('Execução Preventivas',   linha3(prev[0].total.execucao.pct, prev[1].total.execucao.pct, prev[2].total.execucao.pct));
  map.set('Preventivas previstas',  linha3(prev[0].total.execucao.previstas,  prev[1].total.execucao.previstas,  prev[2].total.execucao.previstas));
  map.set('Preventivas realizadas', linha3(prev[0].total.execucao.realizadas, prev[1].total.execucao.realizadas, prev[2].total.execucao.realizadas));

  map.set('Backlog em aberto',      linha3(backlog[0], backlog[1], backlog[2]));
  map.set('Percentual de conclusão histórico',
    linha3(conclusoes[0].conclusaoHistoricoPct, conclusoes[1].conclusaoHistoricoPct, conclusoes[2].conclusaoHistoricoPct));
  map.set('Tempo médio de aprovação',   linha3(null, null, null));
  map.set('Chamados abertos',            linha3(null, null, null));
  map.set('Chamados fechados',           linha3(null, null, null));
  map.set('Tempo médio de atendimento',  linha3(null, null, null));

  // Quadrante 2: Gestão Financeira · Orçamento (Torre de Manutenção)
  let dadosTorre = null;
  try {
    dadosTorre = obterDadosTorreManutencao_();
  } catch (e) {
    Logger.log('Aviso (Dashboard): Torre de Manutenção indisponível: ' + e.message);
  }

  const fmtK = v => (v == null || isNaN(v)) ? '—' : 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR');
  const fmtVar = (nom, pct) => {
    if (nom == null || isNaN(nom)) return '—';
    const sinal = nom >= 0 ? '+' : '−';
    const pctStr = (pct != null && !isNaN(pct)) ? ' (' + (pct >= 0 ? '+' : '') + (pct * 100).toFixed(1).replace('.', ',') + '%)' : '';
    return sinal + fmtK(Math.abs(nom)) + pctStr;
  };

  const orcCR = dadosTorre ? dadosTorre.cr.total.orc26 : 421028;
  const orcDem = dadosTorre ? dadosTorre.demercado.total.orc26 : 183515;
  const ritmoCR = dadosTorre ? dadosTorre.cr.total.ritmo25 : 455412;
  const ritmoDem = dadosTorre ? dadosTorre.demercado.total.ritmo25 : 161957.30;
  
  const orcAbs = Math.abs(orcCR) + Math.abs(orcDem);
  const ritmoAbs = Math.abs(ritmoCR) + Math.abs(ritmoDem);
  const econNom = ritmoAbs - orcAbs; // >0 = economia (gasta menos que o ritmo)
  const varPct = ritmoAbs !== 0 ? (orcAbs - ritmoAbs) / ritmoAbs : 0; // <0 = redução percentual de custo

  map.set('Orçamento 2026 (Total)',     linha3(fmtK(orcAbs), null, null));
  map.set('Ritmo 2025 (Base)',          linha3(fmtK(ritmoAbs), null, null));
  map.set('Orçamento Capital Realty',   linha3(fmtK(Math.abs(orcCR)), null, null));
  map.set('Orçamento Demercado',        linha3(fmtK(Math.abs(orcDem)), null, null));
  map.set('Economia Projetada (26/25)', linha3(fmtVar(econNom, varPct), null, null));
  map.set('CAPEX',                      linha3('—', null, null));

  // Quadrante 3: Vistorias & Análises de Projetos (subgrupos)
  map.set('Vistorias - Entrada/saída',     linha3('—', null, null));
  map.set('Vistorias - Recebimento obras', linha3('—', null, null));
  map.set('Vistorias - Monitoramento',     linha3('—', null, null));
  map.set('Vistorias - Documentação',      linha3('—', null, null));
  map.set('Adequações - Quantidade',       linha3('—', null, null));
  map.set('Adequações - Prazo médio',      linha3('—', null, null));
  map.set('Adequações - Conclusão (%)',    linha3('—', null, null));
  // Mantidos para retrocompatibilidade
  map.set('Obras concluídas (%)',          linha3(recebimento.pct, null, null));
  map.set('Pendências de obras (Qtd)',     linha3(recebimento.pendentes, null, null));
  map.set('Total de obras (Qtd)',          linha3(recebimento.total, null, null));
  map.set('Projetos em análise (Qtd)',     linha3(recebimento.emAnalise, null, null));

  // Quadrante 4: Gestão de Contratações
  map.set('Contratações em andamento',  linha3(contratacoes.emAndamento, null, null));
  map.set('Em fase de edital',          linha3(contratacoes.emEdital, null, null));
  map.set('Contratações em atraso',     linha3(contratacoes.emAtraso, null, null));
  map.set('Contratações concluídas',    linha3(contratacoes.fechadas, null, null));
  map.set('Contratações conclusão (%)', linha3('4', null, null));
  map.set('Contratações prazo médio',   linha3('15', null, null));

  Logger.log('Dashboard: conclusão histórica — ' + conclusoes[0].fechadosAte + ' fechados de ' +
             conclusoes[0].criadosAte + ' abertos até o fim do mês' +
             (conclusoes[0].conclusaoHistoricoPct == null ? '' :
              ' = ' + conclusoes[0].conclusaoHistoricoPct.toFixed(1) + '%'));

  return { headers: headers, map: map, parcial: prev[0].parcial };
}

// Backlog por Centro de Custos, em aberto NO FIM do mês (ano/mesIndex —
// default o mês de referência). Usa _histAbertoNoMes_, a MESMA definição de
// "aberto no mês" do resto do deck — não "aberto agora" — para que esta
// tabela e o KPI de Indicadores Gerais (que soma este mesmo resultado)
// nunca divirjam. Lição do backlog dos Megas (CLAUDE.md): estoque e KPI têm
// que sair da mesma fonte, senão o mês não fecha.
//
// Filtrado pra equipe PROPRIEDADES via "Responsáveis" (_propEquipeCorretiva_)
// — mesmo corte do resto do deck, e mesmo padrão que
// megas-mensal/Slide_BacklogClientesProperties.gs já usa pra separar
// backlog aberto por equipe responsável a partir da mesma coluna.
function obterBacklogPorCC_(ano, mesIndex) {
  const ref     = obterMesReferencia_();
  const anoRef  = ano != null ? ano : ref.ano;
  const mesRef  = mesIndex != null ? mesIndex : ref.index;
  const refIni  = new Date(Date.UTC(anoRef, mesRef, 1));
  const refFim  = new Date(Date.UTC(anoRef, mesRef + 1, 1));

  const abertos = _propLerCorretivas_()
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');
  const porCC = {};
  abertos.forEach(it => {
    const cc = it.cc || 'Sem Centro de Custos';
    porCC[cc] = (porCC[cc] || 0) + 1;
  });
  return Object.keys(porCC).map(cc => ({ cc, total: porCC[cc] })).sort((a, b) => b.total - a.total);
}


// ==========================================
// INDICADORES DE CORRETIVAS — Slide_Corretivas.gs
// ==========================================
// Chamados criados/fechados e tempo médio entre criado e fechado, mensal e
// acumulado do ano — os três direto da BD-CORRETIVAS (mesma base e mesma
// regra de "fechado" — _bdChamadoFechado_ — do resto do deck), filtrados
// pra equipe PROPRIEDADES via "Responsáveis". "Índice de disponibilidade"
// (que o slide equivalente dos Megas mostra) NÃO entra: lá vem de uma aba
// digitada à mão por Mega, sem fórmula na base bruta — não existe fonte
// equivalente pro portfólio de Propriedades, e inventar a conta violaria a
// mesma regra que já tirou Recebimento de Obras do Dashboard (nada de dado
// reconstruído/inventado). Ver decisão do usuário no histórico do projeto.
function obterFluxoCorretivasPropriedades_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const anoIni = new Date(Date.UTC(ano, 0, 1));

  const itens = _propLerCorretivas_().filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  let mCriados = 0, mFechados = 0, aCriados = 0, aFechados = 0;
  const temposMes = [], temposAno = [];

  itens.forEach(it => {
    if (it.dtReporte && it.dtReporte >= refIni && it.dtReporte < refFim) mCriados++;
    if (it.dtReporte && it.dtReporte >= anoIni && it.dtReporte < refFim) aCriados++;

    const fechado = _bdChamadoFechado_(it.estado, it.dtFechado);
    if (fechado && it.dtReporte && it.dtFechado >= refIni && it.dtFechado < refFim) {
      mFechados++;
      temposMes.push(it.dtFechado - it.dtReporte);
    }
    if (fechado && it.dtReporte && it.dtFechado >= anoIni && it.dtFechado < refFim) {
      aFechados++;
      temposAno.push(it.dtFechado - it.dtReporte);
    }
  });

  // Média em horas, só de quem fechou DENTRO da janela e tem as duas datas —
  // não dá pra medir "tempo até fechar" de quem ainda está aberto.
  const mediaHoras = arr => arr.length
    ? arr.reduce((soma, ms) => soma + ms, 0) / arr.length / 3600000
    : null;

  return {
    mensal:    { criados: mCriados, fechados: mFechados, tempoMedioH: mediaHoras(temposMes) },
    acumulado: { criados: aCriados, fechados: aFechados, tempoMedioH: mediaHoras(temposAno) }
  };
}

// Últimos `n` meses até o mês de referência (inclusive), mais antigo
// primeiro — janela do gráfico de Backlog Emergencial.
function _propUltimosMeses_(ref, n) {
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    let idx = ref.index - i, ano = ref.ano;
    while (idx < 0) { idx += 12; ano--; }
    lista.push({ ano: ano, index: idx });
  }
  return lista;
}

// Backlog de chamados EMERGENCIAIS (coluna "Prioridade"), mês a mês, dos
// últimos `n` meses — mesma regra de "aberto no mês" (_histAbertoNoMes_) e
// mesmo filtro de equipe (PROPERTY) do resto do deck. Diferente do
// equivalente dos Megas (que conta emergencial de QUALQUER equipe, decisão
// explícita de lá): aqui entra só Propriedades, pelo mesmo motivo que tirou
// Facilities/Terceiros do resto da apresentação.
function obterBacklogEmergencialPorMes_(n) {
  const ref   = obterMesReferencia_();
  const meses = _propUltimosMeses_(ref, n || 13);
  const base  = _propLerCorretivas_();

  return meses.map(m => {
    const refIni = new Date(Date.UTC(m.ano, m.index, 1));
    const refFim = new Date(Date.UTC(m.ano, m.index + 1, 1));
    const qtd = base.filter(it =>
      it.prioridade === 'Emergencial' &&
      _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY' &&
      _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)
    ).length;
    return { ano: m.ano, index: m.index, qtd: qtd };
  });
}

// Data curta dd/mm/aa — cópia de megas-mensal/02_Dados.gs.
function _histFormatarDataCurta_(d) {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return dd + '/' + mm + '/' + yy;
}

// Dias em aberto NÃO é "até hoje" — é até o ÚLTIMO DIA do mês de referência
// (refFim): a apresentação é gerada dias depois do mês já ter fechado, e o
// número tem que refletir o estado NO FIM do mês, não no dia em que o
// slide foi gerado. Cópia de megas-mensal/02_Dados.gs.
function _histDiasAberto_(dtReporte, refFim) {
  if (!dtReporte) return null;
  return Math.max(0, Math.floor((refFim - dtReporte) / 86400000));
}

// Detalhe dos chamados EMERGENCIAIS (equipe Propriedades) em aberto no mês
// de referência — um item por chamado, com Empreendimento (Centro de
// Custos), descrição, data de abertura e dias em aberto (até o fim do mês
// de referência).
// Ordenado do mais antigo pro mais novo (dias desc) — os que mais
// precisam de atenção aparecem primeiro. Usado por
// Slide_BacklogEmergencialDetalhe.gs.
function obterBacklogEmergencialDetalhe_() {
  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));

  const itens = _propLerCorretivas_()
    .filter(it => it.prioridade === 'Emergencial')
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY')
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .map(it => ({
      cc          : it.cc,
      descricao   : it.descricao || '(sem descrição)',
      dataAbertura: _histFormatarDataCurta_(it.dtReporte),
      dias        : _histDiasAberto_(it.dtReporte, refFim)
    }));

  return itens.sort((a, b) => (b.dias || 0) - (a.dias || 0));
}


// ==========================================
// CHAMADOS PENDENTES (BACKLOG) POR MOTIVO — Slide_ChamadosPendentes.gs
// ==========================================
// Equivalente honesto do slide "Chamados Pendentes (Backlog)" dos Megas —
// lá vem de uma aba digitada à mão (MÊS/ESTADO/QUANTIDADE); aqui é 100%
// derivado da BD-CORRETIVAS, coluna "Motivo de pausa" (só existe nessa
// base — confirmado com diagnosticarMotivoPausa). Regra confirmada com o
// usuário: chamado aberto com "Motivo de pausa" preenchido → essa é a
// categoria ("direcionado"); vazio → "Em resolução", não importa o que a
// coluna Estado diga especificamente. Só equipe PROPRIEDADES, mesmo corte
// do resto do deck.
function obterBacklogPorMotivo_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));

  const abertos = _propLerCorretivas_()
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  let emResolucao = 0;
  const porMotivo = {};
  abertos.forEach(it => {
    const motivo = String(it.motivoPausa || '').trim();
    if (motivo) porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;
    else emResolucao++;
  });

  return {
    total: abertos.length,
    emResolucao: emResolucao,
    direcionados: Object.keys(porMotivo)
      .sort((a, b) => porMotivo[b] - porMotivo[a])
      .map(m => ({ estado: m, qtd: porMotivo[m] }))
  };
}

// Mês de referência + mês anterior, prontos pro gráfico de barras (▲/▼ vs
// mês anterior em cada categoria, igual ao slide dos Megas).
function obterDadosChamadosPendentes_() {
  const ref    = obterMesReferencia_();
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);

  const atual    = obterBacklogPorMotivo_(ref.ano, ref.index);
  const anterior = obterBacklogPorMotivo_(mesAnt.ano, mesAnt.index);

  const mapaAnterior = {};
  anterior.direcionados.forEach(d => { mapaAnterior[d.estado] = d.qtd; });

  const direcionados = atual.direcionados.map(d => ({
    estado: d.estado,
    qtd: d.qtd,
    anterior: mapaAnterior[d.estado] != null ? mapaAnterior[d.estado] : null
  }));

  return {
    mesLabel: (ref.curto || ref.nome) + '/' + ref.ano,
    total: atual.total,
    totalAnterior: anterior.total,
    emResolucao: atual.emResolucao,
    emResolucaoAnterior: anterior.emResolucao,
    direcionados: direcionados
  };
}

// ==========================================
// TORRE DE MANUTENÇÃO (CAPITAL REALTY & DEMERCADO)
// ==========================================
/**
 * Retorna os dados consolidados da Torre de Manutenção (Capital Realty e Demercado).
 * Lê das planilhas online indicadas por TORRE_MANUTENCAO_CR_ID e TORRE_MANUTENCAO_DEMERCADO_ID;
 * caso contrário ou se inacessíveis, recorre aos dados de referência dos arquivos XLSX locais.
 */
function obterDadosTorreManutencao_() {
  let crLinhas = null;
  let demLinhas = null;

  // 1. Leitura online da Torre Capital Realty
  if (typeof TORRE_MANUTENCAO_CR_ID !== 'undefined' && TORRE_MANUTENCAO_CR_ID) {
    try {
      const ssCR = SpreadsheetApp.openById(TORRE_MANUTENCAO_CR_ID);
      const abaCR = ssCR.getSheets()[0];
      if (abaCR) {
        const dadosCR = abaCR.getDataRange().getValues();
        if (dadosCR.length > 1) crLinhas = _parseTorreRows_(dadosCR);
      }
    } catch (e) {
      Logger.log('Aviso Torre CR: falha ao ler planilha online (' + e.message + '). Usando base de referência.');
    }
  }

  // 2. Leitura online da Torre Demercado
  if (typeof TORRE_MANUTENCAO_DEMERCADO_ID !== 'undefined' && TORRE_MANUTENCAO_DEMERCADO_ID) {
    try {
      const ssDem = SpreadsheetApp.openById(TORRE_MANUTENCAO_DEMERCADO_ID);
      const abaDem = ssDem.getSheets()[0];
      if (abaDem) {
        const dadosDem = abaDem.getDataRange().getValues();
        if (dadosDem.length > 1) demLinhas = _parseTorreRows_(dadosDem);
      }
    } catch (e) {
      Logger.log('Aviso Torre Demercado: falha ao ler planilha online (' + e.message + '). Usando base de referência.');
    }
  }

  // Fallback para dados de referência aprendidos das planilhas locais
  if (!crLinhas) {
    crLinhas = _parseTorreRows_(TORRE_MANUTENCAO_CR_REF);
  }
  if (!demLinhas) {
    demLinhas = _parseTorreRows_(TORRE_MANUTENCAO_DEMERCADO_REF);
  }

  return {
    cr: crLinhas,
    demercado: demLinhas
  };
}

function _parseTorreRows_(matriz) {
  let startIdx = 0;
  if (matriz.length > 0 && typeof matriz[0][1] === 'string' && /Real|Orçamento/i.test(matriz[0][1])) {
    startIdx = 1;
  }

  const rows = [];
  let totalRow = null;

  for (let i = startIdx; i < matriz.length; i++) {
    const r = matriz[i];
    const nome = String(r[0] || '').replace(/\u00A0/g, ' ').trim();
    if (!nome) continue;

    const real24   = _toNum_(r[1]);
    const orc25    = _toNum_(r[2]);
    const ritmo25  = _toNum_(r[3]);
    const orc26    = _toNum_(r[4]);
    const varPct   = r[5] != null ? _toNum_(r[5]) : (ritmo25 !== 0 ? (orc26 - ritmo25) / Math.abs(ritmo25) : 0);
    const varNom   = r[6] != null ? _toNum_(r[6]) : (ritmo25 - orc26);

    const item = {
      imovel: nome,
      real24: real24,
      orc25: orc25,
      ritmo25: ritmo25,
      orc26: orc26,
      varPct: varPct,
      varNom: varNom,
      isTotal: /TOTAL/i.test(nome)
    };

    if (item.isTotal) {
      totalRow = item;
    } else {
      rows.push(item);
    }
  }

  return {
    rows: rows,
    total: totalRow || _calcularTotalTorre_(rows)
  };
}


function _calcularTotalTorre_(rows) {
  const tot = {
    imovel: 'TOTAL MANUTENÇÃO',
    real24: 0, orc25: 0, ritmo25: 0, orc26: 0, varPct: 0, varNom: 0, isTotal: true
  };
  rows.forEach(r => {
    tot.real24 += r.real24;
    tot.orc25 += r.orc25;
    tot.ritmo25 += r.ritmo25;
    tot.orc26 += r.orc26;
    tot.varNom += r.varNom;
  });
  tot.varPct = tot.ritmo25 !== 0 ? (tot.orc26 - tot.ritmo25) / Math.abs(tot.ritmo25) : 0;
  return tot;
}


