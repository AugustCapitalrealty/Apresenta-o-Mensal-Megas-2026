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
// (11_Slide_IndicadoresGerais.gs, no estilo de megas-mensal/Slide01_
// Dashboard.gs) precisa — chamando obterIndicadoresPropriedades_/
// obterBacklogPorCC_ com (ano, mesIndex) diferentes. Nenhum dado novo: são
// as MESMAS funções que Preventivas/Backlog já usam pro mês corrente, já
// filtradas pra equipe Propriedades.
//
// Só Preventivas e Backlog entram — Corretivas e o corte Megas x Demais
// saíram do Dashboard por pedido do usuário (trabalhando por partes). O
// mapa fica só com as chaves que 11_Slide_IndicadoresGerais.gs lê hoje; se
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
// INDICADORES DE CORRETIVAS — 13_Slide_Corretivas.gs
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
// 14_Slide_Backlog.gs.
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
// CHAMADOS PENDENTES (BACKLOG) POR MOTIVO — 14_Slide_Backlog.gs
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
      const ssCR = _abrirPlanilha_(TORRE_MANUTENCAO_CR_ID, 'TORRE_MANUTENCAO_CR_ID');
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
      const ssDem = _abrirPlanilha_(TORRE_MANUTENCAO_DEMERCADO_ID, 'TORRE_MANUTENCAO_DEMERCADO_ID');
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


// ==========================================
// DRE / BRIDGE DE MANUTENÇÃO  (era 07_DadosDRE.gs)
// ==========================================

// Onde o mês vira "já aconteceu". Único lugar que decide isso — se a regra
// mudar, muda aqui e os três recortes acompanham juntos (mesmo motivo de
// _bdChamadoFechado_ existir: definição duplicada é definição que diverge).
function _dreMesOcorrido_(mesIndex, refIndex) {
  return mesIndex <= refIndex;
}

// Uma aba inteira → { codigo: [v0, v1, ...] } com as 24 colunas mensais.
// Ignora as duas colunas de Total da planilha de propósito: todo total daqui
// é recalculado, porque o Total da aba de ritmo soma os 12 meses da coluna e
// não é a projeção (ver o cabeçalho).
function _dreLerAba_(nomeAba) {
  const ss    = _abrirPlanilha_(DRE_MANUTENCAO_ID, 'DRE_MANUTENCAO_ID');
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    Logger.log('DRE Manutenção: aba "' + nomeAba + '" não existe. Abas: ' +
               ss.getSheets().map(s => s.getName()).join(' | '));
    return null;
  }

  const valores = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const mapa = {};
  let achou = 0;

  valores.forEach(linha => {
    const rot = String(linha[0] || '').trim();
    if (!rot) return;
    const cod = rot.split(' - ')[0].trim();
    if (!cod) return;
    mapa[cod] = linha.slice(1).map(_dreNum_);
    achou++;
  });

  if (!achou) {
    Logger.log('DRE Manutenção: aba "' + nomeAba + '" não devolveu nenhuma linha com código.');
    return null;
  }
  return mapa;
}


// Soma tratando null como "não tem": se NENHUMA parcela existir devolve null,
// e não zero. Sem isso um centro de custo ausente zeraria o subtotal do grupo.
function _dreSoma_(valores) {
  let s = null;
  valores.forEach(v => { if (v != null) s = (s == null ? 0 : s) + v; });
  return s;
}

/**
 * O dado dos slides. Devolve:
 *
 *   { ref, refIndex, meses, empresas: [ { nome, centros: [ {codigo, nome,
 *     mes:{plan,real}, acum:{plan,real}, ano:{plan,proj}} ], total } ],
 *     total, avisos }
 *
 * Todos os valores em MÓDULO (positivos): a planilha traz despesa negativa, e
 * o slide fala em "gasto", onde maior é pior. O sinal fica na variação.
 */
function obterDREManutencao_() {
  const planMapa  = _dreLerAba_(DRE_ABA_PLANEJAMENTO);
  const ritmoMapa = _dreLerAba_(DRE_ABA_RITMO);
  if (!planMapa && !ritmoMapa) return null;

  const ref      = obterMesReferencia_();
  const refIndex = ref.index;
  const avisos   = [];

  // O último mês com realizado deveria casar com o mês de referência. Quando
  // não casa, o slide sairia com um acumulado que não é o do mês anunciado —
  // registrar a divergência é o que faz isso aparecer antes da reunião.
  if (ritmoMapa && ritmoMapa[DRE_CONTA_RAIZ]) {
    const raiz = ritmoMapa[DRE_CONTA_RAIZ];
    let ultimo = -1;
    for (let m = 0; m < 12; m++) { const r = raiz[2 * m + 1]; if (r != null && r !== 0) ultimo = m; }
    if (ultimo >= 0 && ultimo !== refIndex) {
      const nomes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      avisos.push('Mês de referência é ' + nomes[refIndex] + ', mas o último mês com ' +
                  'realizado na aba de ritmo é ' + nomes[ultimo] + '.');
    }
  }

  const abs = v => (v == null ? null : Math.abs(v));

  const recorte = cod => {
    const p = planMapa ? planMapa[cod] : null;
    const r = ritmoMapa ? ritmoMapa[cod] : null;

    // Na aba PLANEJAMENTO a coluna PAR é "Realizado AA" — o ano ANTERIOR
    // (ritmo 2025), confirmado batendo com a Torre no Demercado. É a primeira
    // das cinco colunas do DRE dos Megas, e sem ela o slide não tem contra o
    // que comparar além do plano.
    const planMes = p ? abs(p[2 * refIndex + 1]) : null;   // ímpar = Planejado
    const aaMes   = p ? abs(p[2 * refIndex])     : null;   // par   = Realizado AA
    const realMes = r ? abs(r[2 * refIndex + 1]) : null;   // ímpar = Realizado

    const planAcum = [], aaAcum = [], realAcum = [], projAno = [];
    for (let m = 0; m < 12; m++) {
      if (p && m <= refIndex) { planAcum.push(abs(p[2 * m + 1])); aaAcum.push(abs(p[2 * m])); }
      if (r && m <= refIndex) realAcum.push(abs(r[2 * m + 1]));
      // O splice: realizado no que já aconteceu, ritmo no que falta.
      if (r) projAno.push(_dreMesOcorrido_(m, refIndex) ? abs(r[2 * m + 1]) : abs(r[2 * m]));
    }
    const planAno = [], aaAno = [];
    if (p) for (let m = 0; m < 12; m++) { planAno.push(abs(p[2 * m + 1])); aaAno.push(abs(p[2 * m])); }

    return {
      mes:  { aa: aaMes,               plan: planMes,             real: realMes },
      acum: { aa: _dreSoma_(aaAcum),   plan: _dreSoma_(planAcum), real: _dreSoma_(realAcum) },
      ano:  { aa: _dreSoma_(aaAno),    plan: _dreSoma_(planAno),  proj: _dreSoma_(projAno) }
    };
  };

  const somarLista = lista => ({
    mes:  { aa: _dreSoma_(lista.map(c => c.mes.aa)),   plan: _dreSoma_(lista.map(c => c.mes.plan)),  real: _dreSoma_(lista.map(c => c.mes.real)) },
    acum: { aa: _dreSoma_(lista.map(c => c.acum.aa)),  plan: _dreSoma_(lista.map(c => c.acum.plan)), real: _dreSoma_(lista.map(c => c.acum.real)) },
    ano:  { aa: _dreSoma_(lista.map(c => c.ano.aa)),   plan: _dreSoma_(lista.map(c => c.ano.plan)),  proj: _dreSoma_(lista.map(c => c.ano.proj)) }
  });

  const empresas = DRE_EMPRESAS.map(emp => {
    const centros = emp.centros.map(c => {
      const rec = recorte(c.codigo);
      return { codigo: c.codigo, nome: c.nome, so: c.so || null,
               mes: rec.mes, acum: rec.acum, ano: rec.ano };
    });
    return { codigo: emp.codigo, nome: emp.nome, centros: centros, total: somarLista(centros) };
  });

  const total = somarLista(empresas.map(e => e.total));

  // A soma das linhas tem que bater com a linha-raiz da planilha. É a mesma
  // ideia do check estoque × fluxo: número que aparece em dois lugares merece
  // conferência, e aqui ela é de graça.
  if (ritmoMapa && ritmoMapa[DRE_CONTA_RAIZ]) {
    const raizReal = _dreSoma_((function () {
      const a = []; for (let m = 0; m <= refIndex; m++) a.push(abs(ritmoMapa[DRE_CONTA_RAIZ][2 * m + 1])); return a;
    })());
    if (raizReal != null && total.acum.real != null && Math.abs(raizReal - total.acum.real) > 1) {
      avisos.push('Realizado acumulado: as linhas somam ' + total.acum.real.toFixed(0) +
                  ', a linha ' + DRE_CONTA_RAIZ + ' diz ' + raizReal.toFixed(0) +
                  ' — falta centro de custo em DRE_EMPRESAS.');
    }
  }

  // Série MENSAL do total — é o eixo do Bridge, que nos Megas é por MÊS e não
  // por rubrica. Mês até a referência é REAL; depois é RITMO (projeção), e o
  // slide marca a diferença: comparar plano com ritmo não é o mesmo que
  // comparar plano com o que aconteceu.
  const NOMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const meses = [];
  for (let m = 0; m < 12; m++) {
    const somaMes = chave => _dreSoma_(empresas.map(e =>
      _dreSoma_(e.centros.map(c => {
        const pp = planMapa ? planMapa[c.codigo] : null;
        const rr = ritmoMapa ? ritmoMapa[c.codigo] : null;
        if (chave === 'plan') return pp ? abs(pp[2 * m + 1]) : null;
        return rr ? abs(_dreMesOcorrido_(m, refIndex) ? rr[2 * m + 1] : rr[2 * m]) : null;
      }))));
    const plan = somaMes('plan'), real = somaMes('real');
    meses.push({
      index: m, label: NOMES[m],
      tipo: _dreMesOcorrido_(m, refIndex) ? 'REAL' : 'RITMO',
      plan: plan, real: real,
      // Positivo = gastou MENOS que o plano (bom). Mesmo sinal do Bridge dos Megas.
      variacao: (plan == null || real == null) ? null : plan - real
    });
  }

  avisos.forEach(a => Logger.log('DRE Manutenção: ⚠ ' + a));
  Logger.log('DRE Manutenção: ref ' + ref.nome + '/' + ref.ano +
             ' · plano ano ' + (total.ano.plan == null ? '—' : total.ano.plan.toFixed(0)) +
             ' · projeção ano ' + (total.ano.proj == null ? '—' : total.ano.proj.toFixed(0)) +
             ' · realizado acum ' + (total.acum.real == null ? '—' : total.acum.real.toFixed(0)));

  return { ref: ref, refIndex: refIndex, empresas: empresas, total: total, meses: meses, avisos: avisos };
}

/**
 * DRE de Despesas Operacionais de Propriedades.
 * Lê as abas:
 *   - PLANEJAMENTO 2026 - PROPRIEDADES (Meta e Realizado AA)
 *   - RITMO 2026 - PROPRIEDADES (Realizado e Ritmo de projeção)
 *
 * Estrutura:
 *   06 - DESPESAS OPERACIONAIS
 *     06.01 - DESPESA DE PESSOAL
 *     06.02 - SERVIÇOS DE TERCEIROS
 *     06.03 - DESPESAS FISCAIS
 *     06.04 - DESPESAS GERAIS
 *       (estratificação apenas dos subitens de 06.04 que têm valor)
 */
function obterDREPropriedades_() {
  const planMapa  = _dreLerAba_(DRE_PROP_ABA_PLANEJAMENTO);
  const ritmoMapa = _dreLerAba_(DRE_PROP_ABA_RITMO);
  if (!planMapa && !ritmoMapa) return null;

  const ref      = obterMesReferencia_();
  const refIndex = ref.index;
  const avisos   = [];

  const abs = v => (v == null ? null : Math.abs(v));

  // Helper para buscar código tolerando variações de formatação ('06' ou '6', etc.)
  const buscarLinha = (mapa, cod) => {
    if (!mapa) return null;
    if (mapa[cod]) return mapa[cod];
    const semZero = cod.replace(/^0+([1-9])/, '$1');
    if (mapa[semZero]) return mapa[semZero];
    const chaves = Object.keys(mapa);
    for (let i = 0; i < chaves.length; i++) {
      const k = chaves[i];
      if (k === cod || k.startsWith(cod + ' ') || k.startsWith(cod + '-')) {
        return mapa[k];
      }
    }
    return null;
  };

  const recorte = cod => {
    const p = buscarLinha(planMapa, cod);
    const r = buscarLinha(ritmoMapa, cod);

    const planMes = p ? abs(p[2 * refIndex + 1]) : null;   // ímpar = Planejado
    const aaMes   = p ? abs(p[2 * refIndex])     : null;   // par   = Realizado AA
    const realMes = r ? abs(r[2 * refIndex + 1]) : null;   // ímpar = Realizado

    const planAcum = [], aaAcum = [], realAcum = [], projAno = [];
    for (let m = 0; m < 12; m++) {
      if (p && m <= refIndex) { planAcum.push(abs(p[2 * m + 1])); aaAcum.push(abs(p[2 * m])); }
      if (r && m <= refIndex) realAcum.push(abs(r[2 * m + 1]));
      if (r) projAno.push(_dreMesOcorrido_(m, refIndex) ? abs(r[2 * m + 1]) : abs(r[2 * m]));
    }
    const planAno = [], aaAno = [];
    if (p) for (let m = 0; m < 12; m++) { planAno.push(abs(p[2 * m + 1])); aaAno.push(abs(p[2 * m])); }

    return {
      mes:  { aa: aaMes,               plan: planMes,             real: realMes },
      acum: { aa: _dreSoma_(aaAcum),   plan: _dreSoma_(planAcum), real: _dreSoma_(realAcum) },
      ano:  { aa: _dreSoma_(aaAno),    plan: _dreSoma_(planAno),  proj: _dreSoma_(projAno) }
    };
  };

  // Verifica se o bloco de dados tem algum valor não-zero
  const temValor = rec => {
    if (!rec) return false;
    const v = [
      rec.mes.aa, rec.mes.plan, rec.mes.real,
      rec.acum.aa, rec.acum.plan, rec.acum.real,
      rec.ano.aa, rec.ano.plan, rec.ano.proj
    ];
    return v.some(val => val != null && Math.abs(val) > 0.005);
  };

  // Helper para somar dois blocos de DRE { mes, acum, ano }
  const somarBlocos = (b1, b2) => {
    if (!b1 && !b2) return null;
    if (!b1) return b2;
    if (!b2) return b1;
    const s = (v1, v2) => {
      if (v1 == null && v2 == null) return null;
      return (v1 || 0) + (v2 || 0);
    };
    return {
      mes:  { aa: s(b1.mes.aa, b2.mes.aa),   plan: s(b1.mes.plan, b2.mes.plan),  real: s(b1.mes.real, b2.mes.real) },
      acum: { aa: s(b1.acum.aa, b2.acum.aa), plan: s(b1.acum.plan, b2.acum.plan), real: s(b1.acum.real, b2.acum.real) },
      ano:  { aa: s(b1.ano.aa, b2.ano.aa),   plan: s(b1.ano.plan, b2.ano.plan),  proj: s(b1.ano.proj, b2.ano.proj) }
    };
  };

  // Obtém o DRE de Manutenção para preencher 06.04.15 · MANUTENÇÃO IMÓVEIS (o pai da estratificação)
  let recManut = null;
  try {
    const dadosManut = obterDREManutencao_();
    if (dadosManut && dadosManut.total) recManut = dadosManut.total;
  } catch (e) {
    Logger.log('DRE Propriedades: aviso ao obter DRE Manutenção — ' + e.message);
  }

  const est = DRE_PROP_ESTRUTURA;
  const linhas = [];

  // 1. Processa todos os subitens de 06.04 (DESPESAS GERAIS)
  const itens0604 = [];
  est.contasGerais.forEach(sub => {
    let recSub;
    if (sub.cod === '06.04.15') {
      // MANUTENÇÃO IMÓVEIS: recebe os valores do DRE de Manutenção (pai da estratificação)
      recSub = recManut || recorte(sub.cod);
    } else {
      recSub = recorte(sub.cod);
    }
    if (temValor(recSub)) {
      itens0604.push({
        tipo: 'item',
        codigo: sub.cod,
        nome: sub.nome.toUpperCase(),
        b: recSub
      });
    }
  });

  // 2. Soma todos os subitens de 06.04 para formar o total do grupo DESPESAS GERAIS
  const somaItens0604 = {
    mes:  { aa: _dreSoma_(itens0604.map(i => i.b.mes.aa)),   plan: _dreSoma_(itens0604.map(i => i.b.mes.plan)),  real: _dreSoma_(itens0604.map(i => i.b.mes.real)) },
    acum: { aa: _dreSoma_(itens0604.map(i => i.b.acum.aa)),  plan: _dreSoma_(itens0604.map(i => i.b.acum.plan)), real: _dreSoma_(itens0604.map(i => i.b.acum.real)) },
    ano:  { aa: _dreSoma_(itens0604.map(i => i.b.ano.aa)),   plan: _dreSoma_(itens0604.map(i => i.b.ano.plan)),  proj: _dreSoma_(itens0604.map(i => i.b.ano.proj)) }
  };

  // 3. Grupos 06.01, 06.02, 06.03, 06.04 (somente nomes, sem código)
  const gruposRec = est.grupos.map(g => {
    let bGrp;
    if (g.cod === '06.04') {
      // O grupo DESPESAS GERAIS é exatamente a soma dos seus subitens exibidos
      bGrp = somaItens0604;
    } else {
      bGrp = recorte(g.cod);
    }
    return {
      tipo: 'grupo',
      codigo: g.cod,
      nome: g.nome,
      b: bGrp
    };
  });

  // 4. Raiz DESPESAS OPERACIONAIS: soma os 4 grupos (06.01 + 06.02 + 06.03 + 06.04)
  let recRaiz = {
    mes:  { aa: _dreSoma_(gruposRec.map(g => g.b.mes.aa)),   plan: _dreSoma_(gruposRec.map(g => g.b.mes.plan)),  real: _dreSoma_(gruposRec.map(g => g.b.mes.real)) },
    acum: { aa: _dreSoma_(gruposRec.map(g => g.b.acum.aa)),  plan: _dreSoma_(gruposRec.map(g => g.b.acum.plan)), real: _dreSoma_(gruposRec.map(g => g.b.acum.real)) },
    ano:  { aa: _dreSoma_(gruposRec.map(g => g.b.ano.aa)),   plan: _dreSoma_(gruposRec.map(g => g.b.ano.plan)),  proj: _dreSoma_(gruposRec.map(g => g.b.ano.proj)) }
  };

  linhas.push({
    tipo: 'total',
    codigo: est.raiz.cod,
    nome: est.raiz.nome,
    b: recRaiz
  });

  gruposRec.forEach(grp => {
    linhas.push(grp);
    if (grp.codigo === '06.04') {
      itens0604.forEach(item => linhas.push(item));
    }
  });

  Logger.log('DRE Propriedades: ref ' + ref.nome + '/' + ref.ano +
             ' · plano ano ' + (recRaiz.ano.plan == null ? '—' : recRaiz.ano.plan.toFixed(0)) +
             ' · projeção ano ' + (recRaiz.ano.proj == null ? '—' : recRaiz.ano.proj.toFixed(0)) +
             ' · realizado acum ' + (recRaiz.acum.real == null ? '—' : recRaiz.acum.real.toFixed(0)) +
             ' · ' + linhas.length + ' linhas no slide');

  return {
    ref: ref,
    refIndex: refIndex,
    total: recRaiz,
    linhas: linhas,
    avisos: avisos
  };
}


// ==========================================
// FAROL DE METAS  (era 08_DadosMetas.gs)
// ==========================================

// Real de cada linha calculada → { mes, ano } já como texto no formato do farol.
function obterMetasCalculadas_() {
  const ref = obterMesReferencia_();
  return {
    slaPreventivas: _metaSlaPreventivas_(ref),
    ppc:            _metaPPC_(ref),
    piso:           _metaPiso_(ref),
    reabertura:     _metaReabertura_(ref)
  };
}

/**
 * SLA das preventivas de PROPRIEDADES — todas, não só as do analista.
 *
 * POR QUE TODAS: o farol do Wilson contava só as preventivas dele e chegou a
 * 84,55% no ano; o deck conta todas e dá 81,9%. Números diferentes porque a
 * população é diferente, não porque um esteja errado. O deck manda, e é o
 * mesmo `obterIndicadoresPropriedades_` que o slide de Preventivas usa — um
 * número só de fonte.
 */
function _metaSlaPreventivas_(ref) {
  try {
    const mes  = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
    const acum = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
    return {
      mes: mes  && mes.total.sla.pct  != null ? mes.total.sla.pct  : null,
      ano: acum && acum.sla && acum.sla.pct != null ? acum.sla.pct : null
    };
  } catch (e) {
    Logger.log('Metas: SLA de preventivas falhou — ' + e.message);
    return { mes: null, ano: null };
  }
}

/**
 * PPC — lido DAS CÉLULAS do painel, igual ao Facilities.
 *
 * O Facilities (gestao-tvs/Dados.gs, obterDadosPPC) abre a planilha de PPC e
 * pega o que já está calculado nas linhas ADERENCIA % / META / ACUMULADO. Aqui
 * é o mesmo: a planilha é dona do número, o código só lê. Decisão do usuário
 * — "siga o que está aparecendo na célula".
 *
 *   mês → ADERENCIA % na coluna do mês de referência
 *   ano → ACUMULADO   na mesma coluna (é a série acumulada, não o ano inteiro)
 *
 * UMA DIFERENÇA DELIBERADA para o Facilities: lá as linhas são pegas por
 * POSIÇÃO (data[6], data[7], data[8]). Aqui são achadas pelo RÓTULO da coluna
 * A. É o caso do boletim no CLAUDE.md — uma linha a mais na aba moveu o TOTAL
 * de C40 para C41 e o slide passou a mostrar outro número, sem erro nenhum.
 * Rótulo sobrevive a linha inserida; posição não.
 *
 * A contagem de SIM continua sendo feita, mas só como CONFERÊNCIA: se a
 * célula e a contagem divergirem, o Logger avisa. Foi assim que apareceu que
 * o painel tinha ficado defasado depois de o usuário editar as abas.
 */
function _metaPPC_(ref) {
  const painel = _metaPainelPPC_();
  if (!painel) return { mes: null, ano: null, mesAnt: null, anoAnt: null };

  const mes = painel.aderencia[ref.index];
  const ano = painel.acumulado[ref.index];
  const mesAnt = (ref && ref.index > 0 && painel.aderencia[ref.index - 1] != null) ? painel.aderencia[ref.index - 1] : null;
  const anoAnt = (ref && ref.index > 0 && painel.acumulado[ref.index - 1] != null) ? painel.acumulado[ref.index - 1] : null;

  // Conferência: recontar os SIM tem que dar o mesmo que a célula diz.
  const prev = _metaContarSim_(METAS_PPC_ABA_PREVISTAS);
  const real = _metaContarSim_(METAS_PPC_ABA_REALIZADAS);
  if (prev && real) {
    let p = 0, r = 0;
    for (let m = 0; m <= ref.index; m++) { p += prev[m]; r += real[m]; }
    const contado = p > 0 ? (r / p) * 100 : null;
    if (contado != null && ano != null && Math.abs(contado - ano) > 0.5) {
      Logger.log('Metas PPC: ⚠ o painel diz ' + ano.toFixed(2) + '% acumulado, mas contar os ' +
                 'SIM das abas dá ' + contado.toFixed(2) + '% (' + r + '/' + p + '). ' +
                 'As linhas ESPERADO/REALIZADO do painel podem estar como número fixo ' +
                 'em vez de fórmula — o slide mostra o que a célula diz.');
    }
  }

  if (painel.meta[ref.index] != null) {
    Logger.log('Metas PPC: mês ' + (mes == null ? '—' : mes.toFixed(2) + '%') +
               ' · acumulado ' + (ano == null ? '—' : ano.toFixed(2) + '%') +
               ' · meta da planilha ' + painel.meta[ref.index].toFixed(2) + '%');
  }
  return { mes: mes, ano: ano, mesAnt: mesAnt, anoAnt: anoAnt };
}

/**
 * Acha o painel do PPC e devolve as três séries por mês.
 *
 * Não pede o nome da aba: procura em todas a que tem uma linha começando por
 * ADERENCIA. O usuário montou esse painel à mão e o nome pode mudar; o rótulo
 * da linha é o que identifica.
 */
function _metaPainelPPC_() {
  const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  try {
    const ss = _abrirPlanilha_(METAS_PPC_ID, 'METAS_PPC_ID');
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      const data = abas[i].getDataRange().getDisplayValues();
      const acha = pref => {
        for (let r = 0; r < data.length; r++) {
          if (_histNorm_(data[r][0]).indexOf(pref) === 0) return data[r];
        }
        return null;
      };
      const lAder = acha('aderencia');
      if (!lAder) continue;
      const lMeta = acha('meta'), lAcum = acha('acumulado'), lMes = acha('mes');
      if (!lMes) continue;

      // Coluna de cada mês, pelo nome no cabeçalho. A aba tem colunas extras
      // (ANO, ACUMULADO) depois dos 12 meses — casar pelo nome as ignora.
      const aderencia = [], meta = [], acumulado = [];
      lMes.forEach((cel, c) => {
        const idx = MESES.indexOf(_histNorm_(cel));
        if (idx < 0) return;
        aderencia[idx] = _metaPct_(lAder[c]);
        meta[idx]      = lMeta ? _metaPct_(lMeta[c]) : null;
        acumulado[idx] = lAcum ? _metaPct_(lAcum[c]) : null;
      });
      if (aderencia.length) {
        Logger.log('Metas PPC: painel lido da aba "' + abas[i].getName() + '".');
        return { aderencia: aderencia, meta: meta, acumulado: acumulado };
      }
    }
    Logger.log('Metas PPC: nenhuma aba com linha ADERENCIA. Abas: ' +
               abas.map(a => a.getName()).join(' | '));
    return null;
  } catch (e) {
    Logger.log('Metas PPC: falha lendo o painel — ' + e.message);
    return null;
  }
}

// Conta "SIM" por mês numa das abas do PPC — usado só como CONFERÊNCIA
// contra o que a célula do painel diz. As 12 colunas de mês vêm depois de
// Empresa|Empreendimento|Categoria|Manutenção|Responsavel|META.
function _metaContarSim_(nomeAba) {
  try {
    const ss  = _abrirPlanilha_(METAS_PPC_ID, 'METAS_PPC_ID');
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) return null;
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();
    const cab = v[0].map(c => String(c || '').trim().toUpperCase());
    const c0 = cab.indexOf('JAN');
    if (c0 < 0) return null;

    const cont = [];
    for (let m = 0; m < 12; m++) cont.push(0);
    for (let r = 1; r < v.length; r++) {
      // A linha de total (ESPERADO/REALIZADO) não é serviço — não conta.
      const rot = String(v[r][0] || '').trim().toUpperCase();
      if (rot === 'ESPERADO' || rot === 'REALIZADO') continue;
      for (let m = 0; m < 12; m++) {
        if (String(v[r][c0 + m] || '').trim().toUpperCase() === 'SIM') cont[m]++;
      }
    }
    return cont;
  } catch (e) {
    Logger.log('Metas PPC: conferência não pôde ler "' + nomeAba + '" — ' + e.message);
    return null;
  }
}


/**
 * Metros de piso — CONTROLE PISO 2026, linha TOTAL REALIZADO.
 *
 * O ano é o ACUMULADO até o mês de referência, não a coluna TOTAL da
 * planilha: aquela soma os 12 meses e inclui setembro em diante.
 */
function _metaPiso_(ref) {
  try {
    const ss  = _abrirPlanilha_(METAS_PISO_ID, 'METAS_PISO_ID');
    const aba = ss.getSheets()[0];
    const v   = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();

    let linha = -1, cabIdx = -1;
    for (let r = 0; r < v.length; r++) {
      if (_histNorm_(v[r][0]).indexOf('total realizado') >= 0 ||
          _histNorm_(v[r][8]).indexOf('total realizado') >= 0) { linha = r; break; }
    }
    for (let r = 0; r < v.length; r++) {
      if (v[r].some(c => _histNorm_(c) === 'janeiro')) { cabIdx = r; break; }
    }
    if (linha < 0 || cabIdx < 0) {
      Logger.log('Metas piso: TOTAL REALIZADO ou cabeçalho de meses não encontrado.');
      return { mes: null, ano: null, mesAnt: null, anoAnt: null };
    }

    const c0 = v[cabIdx].findIndex(c => _histNorm_(c) === 'janeiro');
    const num = s => {
      const t = String(s || '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(t);
      return isNaN(n) ? 0 : n;
    };
    let acum = 0;
    let acumAnt = 0;
    for (let m = 0; m <= ref.index; m++) {
      const vMes = num(v[linha][c0 + m]);
      acum += vMes;
      if (m < ref.index) acumAnt += vMes;
    }
    const mes = num(v[linha][c0 + ref.index]);
    const mesAnt = (ref && ref.index > 0) ? num(v[linha][c0 + ref.index - 1]) : null;
    Logger.log('Metas piso: mês ' + mes.toFixed(2) + 'm · acumulado ' + acum.toFixed(2) + 'm');
    return {
      mes: mes,
      ano: acum,
      mesAnt: mesAnt,
      anoAnt: (ref && ref.index > 0) ? acumAnt : null
    };
  } catch (e) {
    Logger.log('Metas piso: falha — ' + e.message);
    return { mes: null, ano: null, mesAnt: null, anoAnt: null };
  }
}

/**
 * Taxa de reabertura — reabertos ÷ fechados.
 *
 * Lê a BASE BRUTA (aba CHAMADOS FECHADOS, uma linha por chamado, coluna
 * REABERTURA SIM/NÃO), que é preferível à tabela agregada da mesma planilha
 * (lição 3). Ambas conferidas: as 19 linhas batem mês a mês com a agregada.
 *
 * MÊS SEM FECHAMENTO devolve null, não 0%. Agosto teve zero chamados
 * fechados: dizer "0% de reabertura" daria crédito por um resultado que não
 * existiu. O acumulado do ano segue definido (0/19 = 0%).
 */
function _metaReabertura_(ref) {
  try {
    const ss = _abrirPlanilha_(METAS_REABERTURA_ID, 'METAS_REABERTURA_ID');
    const aba = ss.getSheetByName('CHAMADOS FECHADOS') || ss.getSheets()[0];
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();

    const cab = v[0].map(c => _histNorm_(c));
    const cFech = cab.indexOf('fechado em');
    const cReab = cab.indexOf('reabertura');
    if (cFech < 0 || cReab < 0) {
      Logger.log('Metas reabertura: colunas "Fechado em"/"REABERTURA" não encontradas. Cabeçalho: ' +
                 v[0].filter(String).join(' | '));
      return { mes: null, ano: null, mesAnt: null, anoAnt: null };
    }

    let fMes = 0, rMes = 0, fAno = 0, rAno = 0, semData = 0;
    let fMesAnt = 0, rMesAnt = 0, fAnoAnt = 0, rAnoAnt = 0;
    for (let r = 1; r < v.length; r++) {
      const d = _histParseDataHora_(v[r][cFech]);
      if (!d) { if (String(v[r][0] || '').trim()) semData++; continue; }
      if (d.getUTCFullYear() !== ref.ano) continue;
      const m = d.getUTCMonth();
      if (m > ref.index) continue;                       // depois do mês de referência não conta
      const reaberto = _histNorm_(v[r][cReab]) === 'sim';
      fAno++; if (reaberto) rAno++;
      if (m === ref.index) { fMes++; if (reaberto) rMes++; }
      if (m < ref.index) {
        fAnoAnt++; if (reaberto) rAnoAnt++;
        if (m === ref.index - 1) { fMesAnt++; if (reaberto) rMesAnt++; }
      }
    }
    // Zero falso: linhas existem mas nenhuma data legível → null, não 0%.
    if (!fAno && semData) {
      Logger.log('Metas reabertura: ' + semData + ' linha(s) sem data de fechamento legível.');
      return { mes: null, ano: null, mesAnt: null, anoAnt: null };
    }
    Logger.log('Metas reabertura: mês ' + rMes + '/' + fMes + ' · ano ' + rAno + '/' + fAno);
    const mes = fMes > 0 ? (rMes / fMes) * 100 : null;
    const ano = fAno > 0 ? (rAno / fAno) * 100 : null;
    const mesAnt = fMesAnt > 0 ? (rMesAnt / fMesAnt) * 100 : null;
    const anoAnt = fAnoAnt > 0 ? (rAnoAnt / fAnoAnt) * 100 : null;
    return {
      mes: mes,
      ano: ano,
      mesAnt: mesAnt,
      anoAnt: anoAnt
    };
  } catch (e) {
    Logger.log('Metas reabertura: falha — ' + e.message);
    return { mes: null, ano: null, mesAnt: null, anoAnt: null };
  }
}
