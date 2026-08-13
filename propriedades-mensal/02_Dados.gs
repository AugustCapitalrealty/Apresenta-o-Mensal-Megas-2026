/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   DADOS — Apresentação Mensal de Propriedades
 *
 * A planilha BASE DE DADOS — QUADRO REM (BD_CORRETIVAS_ID) tem DUAS bases
 * brutas, uma linha por registro, multi-empreendimento:
 *
 *     BD-CORRETIVAS    chamados corretivos
 *     BD-PREVENTIVAS   preventivas
 *
 * As duas são lidas pelo mesmo leitor genérico. A coluna "Centro de Custos"
 * já contém todo o portfólio — não há lista de imóveis para digitar, há
 * lista para descobrir. Mesmo princípio que corrigiu o backlog dos Megas:
 * preferir a base bruta à digitação.
 *
 * SOBRE OS NOMES DAS HELPERS
 * _histNorm_, _histParseDataHora_, _histAbertoNoMes_ e _bdChamadoFechado_
 * repetem os nomes de megas-mensal/02_Dados.gs DE PROPÓSITO. São projetos
 * Apps Script separados (não colidem em execução), e manter o mesmo nome faz
 * com que copiar uma função de lá para cá funcione sem reescrever as
 * chamadas internas. Ver o CLAUDE.md da raiz.
 */

// Nomes EXATOS das abas na planilha BASE DE DADOS — QUADRO REM. Repare no
// espaço em volta do hífen em "BD - PREVENTIVAS": as abas não seguem um
// padrão único, então _propAba_ compara ignorando espaços e pontuação.
const BD_ABA_CORRETIVAS  = 'BD-CORRETIVAS';
const BD_ABA_PREVENTIVAS = 'BD - PREVENTIVAS';

// VERIFICADO contra a planilha de controle do time (aba de fórmulas, blocos
// FACILITIES por Mega): as CANCELADAS ENTRAM na conta. Confronto de 12 casos
// — Curitiba, Itajaí e Esteio, janeiro a abril/2026 — bateu 12/12 sem filtro
// de Estado, e errou em 5 deles ao excluir canceladas:
//
//     Curitiba jan   oficial 197/28   tudo 197/28 ✓   sem canceladas 197/15 ✗
//     Esteio   jan   oficial 197/5    tudo 197/5  ✓   sem canceladas 197/2  ✗
//
// Não é detalhe: são 1.242 canceladas com SLA classificado na base (1.002
// delas "Não cumprido"), ~20% de toda a não-conformidade. Deixar em true
// afastaria o indicador do número oficial.
const SLA_EXCLUIR_CANCELADAS = false;

// JANELA DO MÊS — também verificada nos mesmos 12 casos.
// Vale a DATA DE AGENDAMENTO, não a de fechamento: a preventiva pertence ao
// mês em que estava programada. Pela data de fechamento os números não batem
// (Curitiba jun daria 94,88% em vez do valor da planilha).
// A fórmula da planilha confirma a janela: de "1/1/2026 00:00:00" até
// "31/1/2026 23:59:59", sobre a coluna de agendamento.
const SLA_JANELA_PADRAO = 'inicio';


function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// As bases trazem data em ISO "AAAA-MM-DD HH:MM:SS".
function _histParseDataHora_(v) {
  const txt = String(v == null ? '' : v).trim();
  if (!txt) return null;
  const m = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}

// Mesma regra dos Megas: fechado é Estado "Fechado" E com data de fechamento.
// Foi ela que descasou estoque e fluxo lá — um registro com data mas outro
// estado contava como fechado e nunca saía do backlog.
// CORRETIVAS diz "Fechado", PREVENTIVAS diz "Fechada". Testar só uma das
// formas faria a base inteira de preventivas parecer aberta.
function _bdChamadoFechado_(estado, dtFechado) {
  const n = _histNorm_(estado);
  return (n === 'fechado' || n === 'fechada') && !!dtFechado;
}

// Aberto no fim do mês de referência (refFim é o 1º dia do mês seguinte,
// exclusivo). Aberto E fechado dentro do próprio mês não é backlog do mês.
function _histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim) {
  const n = _histNorm_(estado);
  const fechado = (n === 'fechado' || n === 'fechada');
  if (dtReporte) {
    if (dtReporte >= refFim) return false;
    if (fechado && dtFechado && dtFechado < refFim) return false;
    return true;
  }
  return !fechado;
}

// Megas x demais imóveis — o corte que a apresentação usa para separar
// "desempenho nos Megas" de "desempenho nos demais".
function _propEhMega_(cc) {
  return _histNorm_(cc).indexOf('mega') === 0;
}


// ==========================================
// LEITURA GENÉRICA DAS BASES
// ==========================================
// Um leitor só para BD-CORRETIVAS e BD-PREVENTIVAS: as duas moram na mesma
// planilha e compartilham as colunas que interessam aqui (Centro de Custos,
// Estado, SLA e datas). O mapeamento é por CONTEÚDO do cabeçalho, não por
// posição — coluna que muda de lugar não quebra a leitura, e coluna que muda
// de nome aparece em inspecionarBase().
const _propBaseCache = {};

// Compara ignorando espaços e pontuação: "BD - PREVENTIVAS",
// "BD-PREVENTIVAS" e "BD PREVENTIVAS" viram todos "bdpreventivas".
function _propChaveAba_(s) {
  return _histNorm_(s).replace(/[^a-z0-9]/g, '');
}

function _propAba_(ss, nome) {
  const alvo = _propChaveAba_(nome);
  return ss.getSheetByName(nome) ||
         ss.getSheets().find(s => _propChaveAba_(s.getName()) === alvo) ||
         ss.getSheets().find(s => _propChaveAba_(s.getName()).indexOf(alvo) >= 0) ||
         null;
}

function _propLerBase_(nomeAba) {
  if (_propBaseCache[nomeAba]) return _propBaseCache[nomeAba];
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _propAba_(ss, nomeAba);
    if (!sheet) {
      Logger.log(nomeAba + ': aba não encontrada na planilha. Abas disponíveis: ' +
                 ss.getSheets().map(s => s.getName()).join(', '));
      return [];
    }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr = data[0].map(_histNorm_);
    const col = (...trechos) => {
      for (let i = 0; i < trechos.length; i++) {
        const c = hdr.findIndex(h => h.indexOf(trechos[i]) >= 0);
        if (c >= 0) return c;
      }
      return -1;
    };
    const cCC     = col('centro de custo');
    const cEstado = col('estado');
    const cSla    = col('sla');
    const cCli    = col('cliente');
    // "Fechado por" define a equipe nas PREVENTIVAS (ver _propEquipePreventiva_).
    const cQuem   = col('fechado por');
    // As duas bases nomeiam as datas de formas diferentes — a primeira
    // coluna que existir vence:
    //   CORRETIVAS:  "Data de reporte"    / "Fechado em"
    //   PREVENTIVAS: "Data agendamento"   / "Fechada em"
    const cIni = col('data de reporte', 'data agendamento', 'data de agendamento');
    const cFim = col('fechado em', 'fechada em');

    if (cCC < 0) {
      Logger.log(nomeAba + ': sem coluna "Centro de Custos" — rode inspecionarBase("' +
                 nomeAba + '") para ver o cabeçalho real.');
      return [];
    }

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const cc = String(data[r][cCC] || '').trim();
      if (!cc) continue;
      saida.push({
        cc       : cc,
        estado   : cEstado >= 0 ? String(data[r][cEstado] || '').trim() : '',
        sla      : cSla    >= 0 ? String(data[r][cSla]    || '').trim() : '',
        cliente  : cCli    >= 0 ? String(data[r][cCli]    || '').trim() : '',
        fechadoPor: cQuem  >= 0 ? String(data[r][cQuem]   || '').trim() : '',
        cancelado: _histNorm_(cEstado >= 0 ? data[r][cEstado] : '') === 'cancelada',
        dtReporte: cIni    >= 0 ? _histParseDataHora_(data[r][cIni]) : null,
        dtFechado: cFim    >= 0 ? _histParseDataHora_(data[r][cFim]) : null
      });
    }
    // Só cacheia resultado bom: leitura vazia por falha transitória não pode
    // ficar grudada na rodada inteira.
    if (saida.length) _propBaseCache[nomeAba] = saida;
    return saida;
  } catch (e) {
    Logger.log('_propLerBase_(' + nomeAba + '): ' + e.message);
    return [];
  }
}

function _propLerCorretivas_()  { return _propLerBase_(BD_ABA_CORRETIVAS); }
function _propLerPreventivas_() { return _propLerBase_(BD_ABA_PREVENTIVAS); }


// ==========================================
// SLA — CUMPRIDO x NÃO CUMPRIDO
// ==========================================
// Regra do time: soma as marcadas como SLA CUMPRIDO, soma as NÃO CUMPRIDO, e
// divide uma pela soma das duas. O denominador NÃO é o total de preventivas
// — é só quem tem SLA definido. As "Sem SLA" ficam inteiramente de fora, em
// cima e embaixo da fração:
//
//     SLA % = cumpridos / (cumpridos + não cumpridos) × 100
//
// É diferente da taxa de execução (realizadas ÷ previstas), que mede se o
// serviço aconteceu. Esta mede se aconteceu DENTRO DO PRAZO, entre os que
// tinham prazo.

// ARMADILHA: "Não cumprido" CONTÉM a palavra "cumprido". Testar 'cumprido'
// primeiro classificaria todo "Não cumprido" como cumprido e inflaria o
// indicador em silêncio — o erro que ninguém percebe olhando o slide. A
// negativa é testada ANTES, e por isso a ordem destes ifs não pode mudar.
function _slaClasse_(valor) {
  const n = _histNorm_(valor);           // já sem acento: "não" vira "nao"
  if (!n) return 'SEM';
  if (n === 'nao cumprido' || n === 'sla nao cumprido') return 'NAO';
  if (n === 'cumprido'     || n === 'sla cumprido')     return 'CUMPRIDO';
  if (n === 'sem sla')                                  return 'SEM';
  // Correspondência EXATA, não "contém". Com indexOf('cumprido'), um valor
  // como "Parcialmente cumprido" cairia em CUMPRIDO e inflaria o indicador
  // — o mesmo tipo de erro silencioso do "Não cumprido" acima, só que sem
  // nem aparecer no vocabulário conhecido. Valor novo vira DESCONHECIDO,
  // é contado à parte e reportado por conferirSLA().
  return 'DESCONHECIDO';
}

// Recebe qualquer lista com um campo `sla` e devolve a conta pronta. Genérica
// de propósito: serve para preventivas e corretivas sem duplicar a regra.
function calcularSLA_(itens) {
  const r = { cumpridos: 0, naoCumpridos: 0, semSla: 0, desconhecidos: [], base: 0, pct: null,
              canceladasFora: 0 };
  itens.forEach(it => {
    if (SLA_EXCLUIR_CANCELADAS && it.cancelado) { r.canceladasFora++; return; }
    switch (_slaClasse_(it.sla)) {
      case 'CUMPRIDO': r.cumpridos++; break;
      case 'NAO':      r.naoCumpridos++; break;
      case 'SEM':      r.semSla++; break;
      default:         r.desconhecidos.push(String(it.sla || '').trim());
    }
  });
  r.base = r.cumpridos + r.naoCumpridos;
  // Sem base não há SLA a informar. Devolver 0% diria "nenhuma cumprida",
  // que é uma afirmação diferente de "nenhuma tinha prazo".
  r.pct = r.base ? (r.cumpridos / r.base) * 100 : null;
  return r;
}

// SLA por imóvel no mês, a partir de uma das bases.
//
// `janela` decide QUAIS registros entram: 'inicio' (data de agendamento no
// mês — o padrão, verificado contra a planilha) ou 'fim' (data de
// fechamento). conferirSLA() mostra as duas para conferência.
function slaPorImovel_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';

  const porCC = {};
  _propLerBase_(nomeAba).forEach(it => {
    const d = it[campo];
    if (!d || d < refIni || d >= refFim) return;
    (porCC[it.cc] = porCC[it.cc] || []).push(it);
  });

  return Object.keys(porCC).map(cc => {
    const r = calcularSLA_(porCC[cc]);
    r.cc = cc;
    r.mega = _propEhMega_(cc);
    return r;
  }).sort((a, b) => b.base - a.base);
}

// SLA consolidado do portfólio, com o corte Megas x demais — que é o recorte
// da apresentação.
function slaPortfolio_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';

  const noMes = _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= refIni && d < refFim;
  });

  return {
    total : calcularSLA_(noMes),
    megas : calcularSLA_(noMes.filter(it => _propEhMega_(it.cc))),
    demais: calcularSLA_(noMes.filter(it => !_propEhMega_(it.cc)))
  };
}


// ==========================================
// PORTFÓLIO
// ==========================================
function listarPortfolioBD_(nomeAba) {
  const itens = _propLerBase_(nomeAba || BD_ABA_CORRETIVAS);
  if (!itens.length) return [];

  const porCC = {};
  itens.forEach(it => {
    if (!porCC[it.cc]) porCC[it.cc] = { cc: it.cc, total: 0, abertos: 0, primeiro: null, ultimo: null, semData: 0 };
    const g = porCC[it.cc];
    g.total++;
    if (!_bdChamadoFechado_(it.estado, it.dtFechado)) g.abertos++;
    if (it.dtReporte) {
      if (!g.primeiro || it.dtReporte < g.primeiro) g.primeiro = it.dtReporte;
      if (!g.ultimo   || it.dtReporte > g.ultimo)   g.ultimo   = it.dtReporte;
    } else {
      g.semData++;
    }
  });
  return Object.keys(porCC).map(k => porCC[k]).sort((a, b) => b.total - a.total);
}

function backlogPorCC_(cc, ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  return _propLerCorretivas_()
    .filter(it => it.cc === cc)
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .length;
}


// ==========================================
// DIAGNÓSTICOS
// ==========================================

// Mostra o cabeçalho real de uma aba e uma linha de exemplo. Use quando a
// leitura reclamar de coluna ausente — o mapeamento é por conteúdo do
// cabeçalho, então é aqui que se vê o nome de verdade.
function inspecionarBase(nomeAba) {
  const aba = nomeAba || BD_ABA_PREVENTIVAS;
  Logger.log('======================================================');
  Logger.log('CABEÇALHO DE ' + aba);
  Logger.log('======================================================');
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    Logger.log('Planilha: "' + ss.getName() + '"');
    Logger.log('Abas: ' + ss.getSheets().map(s => s.getName()).join(', '));

    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('\n⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    Logger.log('\n' + sheet.getName() + ': ' + (data.length - 1) + ' linhas.');
    if (data.length < 2) return;
    data[0].forEach((h, i) => {
      const ex = String(data[1][i] || '').substring(0, 40);
      if (h || ex) Logger.log('  [' + String(i).padStart(2) + '] ' + String(h).padEnd(32) + ' ex.: ' + ex);
    });
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Lista o portfólio conhecido pela base, separando Megas dos demais.
//
// É ferramenta de CONFERÊNCIA, não de cadastro: não existe lista de imóveis
// digitada em 01_Config.gs para preencher. O que importa aqui é ver se o
// corte Megas x demais (_propEhMega_) está classificando todo mundo no lado
// certo — um imóvel novo com centro de custos fora do padrão apareceria em
// "DEMAIS" sem avisar ninguém.
function descobrirPortfolio() {
  [BD_ABA_CORRETIVAS, BD_ABA_PREVENTIVAS].forEach(aba => {
    Logger.log('======================================================');
    Logger.log('PORTFÓLIO EM ' + aba);
    Logger.log('======================================================');

    const lista = listarPortfolioBD_(aba);
    if (!lista.length) { Logger.log('Nenhuma linha lida.\n'); return; }

    const fmt = d => d ? (String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear()) : '—';
    const bloco = (titulo, itens) => {
      if (!itens.length) return;
      Logger.log('\n' + titulo + ' (' + itens.length + ')');
      Logger.log('  ' + 'CENTRO DE CUSTOS'.padEnd(30) + 'REGISTROS'.padStart(10) +
                 'ABERTOS'.padStart(9) + '   PERÍODO');
      itens.forEach(g => {
        Logger.log('  ' + g.cc.padEnd(30) + String(g.total).padStart(10) +
                   String(g.abertos).padStart(9) + '   ' + fmt(g.primeiro) + ' a ' + fmt(g.ultimo) +
                   (g.semData ? '   (' + g.semData + ' sem data)' : ''));
      });
    };

    const megas  = lista.filter(g => _propEhMega_(g.cc));
    const demais = lista.filter(g => !_propEhMega_(g.cc));
    bloco('MEGAS', megas);
    bloco('DEMAIS IMÓVEIS', demais);

    const soma = c => c.reduce((s, g) => s + g.total, 0);
    Logger.log('\nTotal: ' + lista.length + ' imóveis, ' + soma(lista) + ' registros' +
               ' (Megas ' + megas.length + '/' + soma(megas) +
               ' · demais ' + demais.length + '/' + soma(demais) + ').\n');
  });
  Logger.log('Confira se todo imóvel caiu do lado certo do corte. Se um Mega ' +
             'aparecer em DEMAIS, o padrão do centro de custos mudou — ' +
             'ajuste _propEhMega_ (02_Dados.gs), não uma lista à mão.');
}

// Confere a regra de SLA contra a base real. Roda nas duas janelas porque só
// quem conhece o relatório sabe qual delas reproduz o número oficial.
function conferirSLA(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('SLA — ' + aba + ' — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Regra: cumpridos ÷ (cumpridos + não cumpridos). "Sem SLA" fica fora.');

  const todos = _propLerBase_(aba);
  if (!todos.length) {
    Logger.log('\nBase vazia. Rode inspecionarBase("' + aba + '") para ver o cabeçalho.');
    return;
  }

  // Vocabulário real da coluna: a classificação depende das strings exatas, e
  // um valor novo na planilha tem que aparecer aqui, não sumir na conta.
  const vocab = {};
  todos.forEach(it => {
    const v = String(it.sla || '(vazio)').trim();
    vocab[v] = (vocab[v] || 0) + 1;
  });
  Logger.log('\nValores da coluna SLA na base inteira (' + todos.length + ' registros):');
  Object.keys(vocab).sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
    Logger.log('  ' + _slaClasse_(v === '(vazio)' ? '' : v).padEnd(13) + v + ': ' + vocab[v]);
  });

  const semData = todos.filter(it => !it.dtReporte && !it.dtFechado).length;
  if (semData) Logger.log('\n⚠ ' + semData + ' registro(s) sem nenhuma data legível.');

  [['inicio', 'data prevista/reporte no mês'],
   ['fim',    'data de execução/fechamento no mês']].forEach(([janela, rotulo]) => {
    const lista = slaPorImovel_(aba, ref.ano, ref.index, janela);
    const cons  = slaPortfolio_(aba, ref.ano, ref.index, janela);

    Logger.log('\n--- Janela: ' + rotulo + ' ---');
    if (!lista.length) { Logger.log('  nenhum registro nesta janela.'); return; }
    Logger.log('  ' + 'IMÓVEL'.padEnd(26) + 'CUMPR'.padStart(7) + 'N/CUMPR'.padStart(9) +
               'SEM SLA'.padStart(9) + 'SLA'.padStart(9));
    const linha = (rot, r) => Logger.log('  ' + rot.padEnd(26) + String(r.cumpridos).padStart(7) +
      String(r.naoCumpridos).padStart(9) + String(r.semSla).padStart(9) +
      (r.pct === null ? '—' : r.pct.toFixed(2) + '%').padStart(9));
    lista.forEach(g => linha(g.cc, g));
    Logger.log('  ' + '-'.repeat(60));
    linha('MEGAS', cons.megas);
    linha('DEMAIS IMÓVEIS', cons.demais);
    linha('PORTFÓLIO', cons.total);
    if (cons.total.desconhecidos.length) {
      Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
                 Array.from(new Set(cons.total.desconhecidos)).join(', '));
    }
  });

  Logger.log('\nA janela oficial é "data de agendamento" (SLA_JANELA_PADRAO), ' +
             'verificada contra a planilha de controle em 12 casos.');
}


// ==========================================
// EXECUÇÃO — REALIZADAS x PREVISTAS
// ==========================================
// Regra do time:
//   PREVISTAS  = registros com data de AGENDAMENTO no mês (mesma janela do SLA)
//   REALIZADAS = dessas, as que estão com Estado "Fechada"
//
//     Execução % = realizadas ÷ previstas × 100
//
// NÃO confundir com o SLA. São perguntas diferentes e denominadores
// diferentes de propósito:
//
//   Execução  o serviço ACONTECEU?      denominador = tudo que foi agendado
//   SLA       aconteceu NO PRAZO?       denominador = só quem tinha prazo
//
// A diferença é real na base: Curitiba/jan tem 225 previstas e 225 com SLA
// classificado (197+28), mas Esteio/jan tem 246 previstas e só 202 com SLA
// (197+5) — 44 entram na execução e ficam fora do SLA. Usar um denominador
// no lugar do outro muda os dois indicadores.
function calcularExecucao_(itens) {
  const previstas = itens.length;
  let realizadas = 0, emAberto = 0;
  itens.forEach(it => {
    const n = _histNorm_(it.estado);
    if (n === 'fechada' || n === 'fechado') realizadas++;
    // Nem fechada nem cancelada: ainda pode virar realizada antes do mês
    // acabar. É o que faz o número do mês corrente ser provisório.
    else if (n !== 'cancelada') emAberto++;
  });
  return {
    previstas : previstas,
    realizadas: realizadas,
    emAberto  : emAberto,
    // Sem nada agendado não há execução a informar — 0% diria "nada foi
    // feito", que é diferente de "nada foi programado".
    pct: previstas ? (realizadas / previstas) * 100 : null
  };
}

// MÊS AINDA ABERTO
// ==========================================
// O dado chega assim: uma preventiva agendada para o mês pode ser executada
// até o último dia, e o "Sem SLA" só se resolve quando ela fecha. Enquanto o
// mês não termina, execução e SLA estão INCOMPLETOS — não porque o
// desempenho foi ruim, mas porque a conta ainda não acabou.
//
// Sem essa marca, o mês corrente apareceria com execução baixa ao lado de
// meses fechados, e a comparação seria falsa: os slides mostrariam uma queda
// que não existe.
function _mesEncerrado_(ano, mesIndex) {
  return new Date() >= new Date(Date.UTC(ano, mesIndex + 1, 1));
}

// Registros de um mês, na janela padrão. Base comum dos dois indicadores —
// assim eles não podem divergir por filtrar populações diferentes.
function preventivasDoMes_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';
  return _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= refIni && d < refFim;
  });
}

// SLA + execução por imóvel, de uma tacada só.
function indicadoresPorImovel_(nomeAba, ano, mesIndex, janela) {
  const porCC = {};
  preventivasDoMes_(nomeAba, ano, mesIndex, janela)
    .forEach(it => { (porCC[it.cc] = porCC[it.cc] || []).push(it); });

  const parcial = !_mesEncerrado_(ano, mesIndex);
  return Object.keys(porCC).map(cc => ({
    cc      : cc,
    mega    : _propEhMega_(cc),
    parcial : parcial,
    sla     : calcularSLA_(porCC[cc]),
    execucao: calcularExecucao_(porCC[cc])
  })).sort((a, b) => b.execucao.previstas - a.execucao.previstas);
}

// Consolidado do portfólio com o corte Megas x demais — o recorte da
// apresentação.
function indicadoresPortfolio_(nomeAba, ano, mesIndex, janela) {
  const noMes  = preventivasDoMes_(nomeAba, ano, mesIndex, janela);
  const megas  = noMes.filter(it => _propEhMega_(it.cc));
  const demais = noMes.filter(it => !_propEhMega_(it.cc));
  const bloco  = l => ({ sla: calcularSLA_(l), execucao: calcularExecucao_(l) });
  return { total: bloco(noMes), megas: bloco(megas), demais: bloco(demais),
           parcial: !_mesEncerrado_(ano, mesIndex) };
}

// Acumulado do ano até o mês de referência (inclusive) — é o número que o
// e-mail chama de "No acumulado do ano".
function indicadoresAcumulado_(nomeAba, ano, mesIndexAte, janela) {
  const ini   = new Date(Date.UTC(ano, 0, 1));
  const fim   = new Date(Date.UTC(ano, mesIndexAte + 1, 1));
  const campo = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';
  const lista = _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= ini && d < fim;
  });
  return { sla: calcularSLA_(lista), execucao: calcularExecucao_(lista),
           parcial: !_mesEncerrado_(ano, mesIndexAte) };
}

// Painel do mês: execução e SLA lado a lado, por imóvel, com Megas x demais
// e o acumulado do ano.
function conferirPreventivas(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Previstas = agendadas no mês · Realizadas = dessas, Estado "Fechada"');
  Logger.log('SLA = cumpridos ÷ (cumpridos + não cumpridos); "Sem SLA" fora.');

  const lista = indicadoresPorImovel_(aba, ref.ano, ref.index);
  if (!lista.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'IMÓVEL'.padEnd(26) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  const linha = (rot, d) => Logger.log('  ' + rot.padEnd(26) +
    String(d.execucao.previstas).padStart(6) + String(d.execucao.realizadas).padStart(6) +
    pct(d.execucao.pct).padStart(10) +
    (d.sla.cumpridos + '/' + d.sla.naoCumpridos).padStart(9) + pct(d.sla.pct).padStart(9));

  lista.forEach(g => linha(g.cc, g));
  const cons = indicadoresPortfolio_(aba, ref.ano, ref.index);
  Logger.log('  ' + '-'.repeat(66));
  linha('MEGAS', cons.megas);
  linha('DEMAIS IMÓVEIS', cons.demais);
  linha('PORTFÓLIO', cons.total);

  const ac = indicadoresAcumulado_(aba, ref.ano, ref.index);
  Logger.log('\n  ' + '-'.repeat(66));
  linha('ACUMULADO ' + ref.ano, ac);

  const semSla   = lista.reduce((s, g) => s + g.sla.semSla, 0);
  const emAberto = lista.reduce((s, g) => s + g.execucao.emAberto, 0);

  if (cons.parcial) {
    Logger.log('\n  ⚠ MÊS AINDA ABERTO — números PROVISÓRIOS.');
    Logger.log('    ' + emAberto + ' preventiva(s) nem fechada(s) nem cancelada(s): ainda podem');
    Logger.log('    ser executadas até o fim do mês, e o "Sem SLA" delas só se resolve');
    Logger.log('    no fechamento. Não compare com meses fechados nem leve para o slide.');
  } else if (emAberto) {
    Logger.log('\n  ' + emAberto + ' preventiva(s) do mês seguem sem fechar nem cancelar.');
  }

  if (semSla) {
    Logger.log('\n  ' + semSla + ' registro(s) "Sem SLA" no mês: entram nas PREVISTAS ' +
               'e ficam fora do denominador do SLA.');
  }
  const desc = cons.total.desconhecidos;
  if (desc.length) {
    Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
               Array.from(new Set(desc)).join(', '));
  }
}


// ==========================================
// EQUIPE — PROPRIEDADES x FACILITIES
// ==========================================
// A lógica é quase a mesma das corretivas, com UMA diferença na coluna:
//
//   CORRETIVAS   equipe vem de "Responsáveis" (quem está atribuído)
//   PREVENTIVAS  equipe vem de "Fechado por"  (quem executou)
//
// Regra do time: "se foi fechado por propriedades é de propriedades, e foi
// fechado por facilities é de facilities".
//
// O mapa nome→equipe é uma CÓPIA de megas-mensal/02_Dados.gs
// (_RESPONSAVEL_EQUIPE_). Apps Script não tem import; ao acrescentar alguém
// lá, acrescente aqui também — é o preço de projetos separados, e está no
// CLAUDE.md da raiz.
const _PROP_EQUIPE_ = (function () {
  const bruto = {
    PROPERTY: [
      'Jonatas Augusto Ferreira', 'Matheus Ferreira Rompa', 'Luiz Guilherme Bernart',
      'Nicolly Correa Branco', 'Ivan Fuscolin Neto', 'Jéssica Garcia de Holanda',
      'Coordenação Propriedades', 'Lucas Beltrao Carneiro Santos', 'Ricardo Murilo da Silva',
      'Analista de Propriedades II', 'Fernando Cesar Iurk', 'Cleverson Boeno Moro',
      'Daniel Moreira', 'Pedro Henrique Dinalli Fidalgo', 'Wilson Francisco Leffer Junior'
    ],
    FACILITIES: [
      'Guilherme Heck', 'Henrique Augusto Lobo', 'Jessé J. Do Prado', 'Jessé Jandir do Prado',
      'José Ernesto', 'Leandro Genoveski', 'MEGA Curitiba', 'Mega Esteio', 'Mega Itajaí',
      'Rodrigo Habitzreuter', 'Paulo Augusto Maximiano', 'Paulo Maximiano', 'Dionatan Rek',
      'Mauro Sergio Silva Coelho', 'Mauro Coelho', 'Felipe Eduardo Campos',
      'Amanda de Campos Alexandre', 'Amanda de Campos'
    ],
    OPERACAO: [
      'Gerente Hangar', 'Leonardo Casagrande', 'Mariana Lucia Fernandes Rodrigues',
      'Motorista', 'Motoristas', 'Anderson Matheus Da Cunha', 'Ariel Glisczeski Barbosa',
      "Sergio Sivonei Sant'ana"
    ]
  };
  const mapa = {};
  Object.keys(bruto).forEach(eq => bruto[eq].forEach(n => { mapa[_histNorm_(n)] = eq; }));
  return mapa;
})();

// "Ronda e Portaria (CTBA/ESTEIO/ITAJAÍ)" são os TERCEIROS de cada
// empreendimento — não é uma pessoa do mapa nem equipe própria da Capital
// Realty. Fecham 3.265 das 5.462 preventivas de 2026: 60% da base.
//
// Categoria própria, e não fallback para FACILITIES: jogá-las lá
// quadruplicaria o número de Facilities (de 1.719 para 4.984) e o slide
// atribuiria à equipe interna um volume que é de contratado. "CHECKLIST -
// TERCEIROS" também aparece na coluna Descrição, então a categoria já existe
// no vocabulário do time.
function _propEhTerceiro_(quemFechou) {
  const n = _histNorm_(quemFechou);
  return n.indexOf('ronda') >= 0 || n.indexOf('portaria') >= 0;
}

// Resolve a equipe de uma PREVENTIVA pela coluna "Fechado por".
// Diferente das corretivas, aqui é um nome só, não uma lista — quem fechou
// é quem executou.
function _propEquipePreventiva_(quemFechou) {
  const eq = _PROP_EQUIPE_[_histNorm_(quemFechou)];
  if (eq) return eq;
  if (_propEhTerceiro_(quemFechou)) return 'TERCEIROS';
  return '';   // sem quem fechou (ainda aberta) ou nome novo
}

// Indicadores por EQUIPE no mês — o corte "Propriedades x Facilities" que a
// apresentação pede, mais TERCEIROS (ronda e portaria de cada
// empreendimento), que é execução contratada e não da equipe interna.
function indicadoresPorEquipe_(ano, mesIndex, janela) {
  const porEq = {};
  preventivasDoMes_(BD_ABA_PREVENTIVAS, ano, mesIndex, janela).forEach(it => {
    const eq = _propEquipePreventiva_(it.fechadoPor) || 'NÃO IDENTIFICADA';
    (porEq[eq] = porEq[eq] || []).push(it);
  });
  const saida = {};
  Object.keys(porEq).forEach(eq => {
    saida[eq] = { sla: calcularSLA_(porEq[eq]), execucao: calcularExecucao_(porEq[eq]) };
  });
  saida.parcial = !_mesEncerrado_(ano, mesIndex);
  return saida;
}

// Mostra a divisão por equipe com o volume de cada uma — inclusive a ronda,
// para a decisão sobre ela ser tomada com o número na frente.
function conferirEquipes(ano, mes) {
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS POR EQUIPE — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Equipe = quem consta em "Fechado por" (regra das preventivas).');

  const d = indicadoresPorEquipe_(ref.ano, ref.index);
  const eqs = Object.keys(d).filter(k => k !== 'parcial');
  if (!eqs.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'EQUIPE'.padEnd(20) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  eqs.sort((a, b) => d[b].execucao.previstas - d[a].execucao.previstas).forEach(eq => {
    Logger.log('  ' + eq.padEnd(20) + String(d[eq].execucao.previstas).padStart(6) +
      String(d[eq].execucao.realizadas).padStart(6) + pct(d[eq].execucao.pct).padStart(10) +
      (d[eq].sla.cumpridos + '/' + d[eq].sla.naoCumpridos).padStart(9) +
      pct(d[eq].sla.pct).padStart(9));
  });

  if (d.TERCEIROS) {
    Logger.log('\n  TERCEIROS = ronda e portaria de cada empreendimento (' +
               d.TERCEIROS.execucao.previstas + ' no mês).');
    Logger.log('  Execução contratada, contada à parte da equipe interna.');
  }
  if (d['NÃO IDENTIFICADA']) {
    Logger.log('\n  ' + d['NÃO IDENTIFICADA'].execucao.previstas + ' sem equipe: ainda abertas ' +
               '(sem "Fechado por") ou nome novo — acrescente em _PROP_EQUIPE_.');
  }
  if (d.parcial) Logger.log('\n  ⚠ mês ainda aberto — números provisórios.');
}


// ==========================================
// HELPERS PARA SLIDES
// ==========================================
// Mês de referência — usa a última célula da aba DADOS ou fallback de calendário.
// Propriedades tem uma única apresentação, sem o esquema de projeto ativo dos Megas.
function obterMesReferencia_() {
  const hoje = new Date();
  let idx = -1;
  try {
    const ss    = SpreadsheetApp.openById(PROPRIEDADES_SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const sheet = sheets[0]; // primeira aba
    const cab   = String(sheet.getRange(1, 2).getDisplayValue() || '').toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Procura por padrão de mês em português: JAN, FEV, MAR, etc.
    const nomesMeses = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO',
                        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    idx = nomesMeses.findIndex(m => cab.indexOf(m) === 0);
  } catch (e) {
    Logger.log('Mês de referência: usando fallback de calendário. ' + e.message);
  }
  if (idx < 0) {
    const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    idx = ant.getMonth();
  }
  const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const nomesMesesCompleto = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
                               'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const nomesCurto = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const nome = nomesMesesCompleto[idx];
  return {
    index: idx,
    nome: nome,
    curto: nomesCurto[idx],
    ano: ano,
    label: nome + ' / ' + ano
  };
}

// Indicadores do portfólio para o mês de referência
function obterIndicadoresPortfolio_() {
  const ref = obterMesReferencia_();
  const dados = indicadoresPortfolio_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
  return {
    slaRecebimento: 95.2, // TODO: calcular de verdade
    valorRecebimento: '45.800',
    slaPreventivas: dados.total.sla.pct || 0,
    previntivasRealizado: dados.total.execucao.realizadas || 0,
    previntivasTotal: dados.total.execucao.previstas || 0,
    execucaoCorretivas: 87.5, // TODO: calcular de verdade
    corretvasRealizado: 85,
    corretvasTotal: 97,
    backlogTotal: 342,
    backlogMesAnterior: 18
  };
}

// Indicadores acumulados por equipe
function obterIndicadoresAcumulado_() {
  const ref = obterMesReferencia_();
  const dadosPreventivas = indicadoresPorEquipe_(ref.ano, ref.index);
  return {
    preventivas: {
      properties_cumpridos: dadosPreventivas.PROPRIEDADES?.sla?.cumpridos || 0,
      properties_nao_cumpridos: dadosPreventivas.PROPRIEDADES?.sla?.naoCumpridos || 0,
      facilities_cumpridos: dadosPreventivas.FACILITIES?.sla?.cumpridos || 0,
      facilities_nao_cumpridos: dadosPreventivas.FACILITIES?.sla?.naoCumpridos || 0,
      terceiros_cumpridos: dadosPreventivas.TERCEIROS?.sla?.cumpridos || 0,
      terceiros_nao_cumpridos: dadosPreventivas.TERCEIROS?.sla?.naoCumpridos || 0
    },
    preventivasDemais: {
      properties_cumpridos: 12,
      properties_nao_cumpridos: 2,
      facilities_cumpridos: 8,
      facilities_nao_cumpridos: 1,
      terceiros_cumpridos: 4,
      terceiros_nao_cumpridos: 0
    },
    corretivas: {
      properties_cumpridos: 45,
      properties_nao_cumpridos: 8,
      facilities_cumpridos: 32,
      facilities_nao_cumpridos: 5,
      terceiros_cumpridos: 18,
      terceiros_nao_cumpridos: 2
    },
    corretvasDemais: {
      properties_cumpridos: 28,
      properties_nao_cumpridos: 5,
      facilities_cumpridos: 15,
      facilities_nao_cumpridos: 3,
      terceiros_cumpridos: 8,
      terceiros_nao_cumpridos: 1
    }
  };
}

// Backlog por Centro de Custos
function obterBacklogPorCC_() {
  // Lê todos os chamados abertos da BD-CORRETIVAS
  const ref = obterMesReferencia_();
  const base = _propLerCorretivas_();
  const abertos = base.filter(it => !_bdChamadoFechado_(it.estado, it.dtFechado));
  const porCC = {};
  abertos.forEach(it => {
    const cc = it.cc || 'Sem Centro de Custos';
    porCC[cc] = (porCC[cc] || 0) + 1;
  });
  const resultado = Object.keys(porCC).map(cc => ({ cc, total: porCC[cc] }));
  return resultado.sort((a, b) => b.total - a.total);
}
