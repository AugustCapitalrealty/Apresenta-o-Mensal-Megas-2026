/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   DADOS — Apresentação Mensal de Propriedades
 *
 * Primeiro passo do projeto: DESCOBRIR o portfólio em vez de digitá-lo.
 * A BD-CORRETIVAS é multi-empreendimento — a coluna "Centro de Custos" já
 * contém todos os imóveis que abrem chamado, Megas e demais. Ler de lá é
 * mais confiável que uma lista mantida à mão, e é o mesmo princípio que
 * corrigiu o backlog dos Megas: preferir a base bruta à digitação.
 *
 * SOBRE OS NOMES DAS HELPERS
 * _histNorm_, _histParseDataHora_, _histAbertoNoMes_ e
 * _resolverEquipeResponsaveis_ repetem os nomes de megas-mensal/02_Dados.gs
 * DE PROPÓSITO. São projetos Apps Script separados (não colidem em
 * execução), e manter o mesmo nome faz com que copiar uma função de lá para
 * cá funcione sem reescrever as chamadas internas. Ver o CLAUDE.md da raiz.
 */

function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// BD-CORRETIVAS traz "Data de reporte"/"Fechado em" em ISO "AAAA-MM-DD HH:MM:SS".
function _histParseDataHora_(v) {
  const txt = String(v == null ? '' : v).trim();
  if (!txt) return null;
  const m = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}

// Mesma regra dos Megas: fechado é Estado "Fechado" E com data de fechamento.
// Vale repetir o comentário porque foi ela que descasou estoque e fluxo lá —
// um chamado com data mas outro estado contava como fechado e nunca saía do
// backlog.
function _bdChamadoFechado_(estado, dtFechado) {
  return _histNorm_(estado) === 'fechado' && !!dtFechado;
}

// Aberto no fim do mês de referência (refFim é o 1º dia do mês seguinte,
// exclusivo). Aberto E fechado dentro do próprio mês não é backlog do mês.
function _histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim) {
  const fechado = _histNorm_(estado) === 'fechado';
  if (dtReporte) {
    if (dtReporte >= refFim) return false;
    if (fechado && dtFechado && dtFechado < refFim) return false;
    return true;
  }
  return !fechado;
}

function _abaBdCorretivas_(ss) {
  return ss.getSheetByName('BD-CORRETIVAS') ||
         ss.getSheets().find(s => _histNorm_(s.getName()).replace(/\s+/g, '-').indexOf('bd-corretivas') >= 0) ||
         null;
}


// ==========================================
// LEITURA CRUA — TODO O PORTFÓLIO
// ==========================================
// Diferente de megas-mensal/_lerBdCorretivasCru_, que filtra por UM Centro de
// Custos: aqui a leitura é do portfólio inteiro, porque a apresentação de
// Propriedades cobre Megas e demais imóveis.
let _propBdCache = null;

function _propLerBdCru_() {
  if (_propBdCache) return _propBdCache;
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _abaBdCorretivas_(ss);
    if (!sheet) { Logger.log('BD-CORRETIVAS: aba não encontrada.'); return []; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr = data[0].map(_histNorm_);
    const col = trecho => hdr.findIndex(h => h.indexOf(trecho) >= 0);
    const cCC      = col('centro de custo');
    const cEstado  = col('estado');
    const cReporte = col('data de reporte');
    const cFechado = col('fechado em');
    const cResp    = col('responsaveis');
    const cCli     = col('cliente');
    if (cCC < 0) { Logger.log('BD-CORRETIVAS: sem coluna "Centro de Custos".'); return []; }

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const cc = String(data[r][cCC] || '').trim();
      if (!cc) continue;
      saida.push({
        cc        : cc,
        estado    : cEstado  >= 0 ? String(data[r][cEstado] || '').trim() : '',
        cliente   : cCli     >= 0 ? String(data[r][cCli]    || '').trim() : '',
        responsavel: cResp   >= 0 ? String(data[r][cResp]   || '').trim() : '',
        dtReporte : cReporte >= 0 ? _histParseDataHora_(data[r][cReporte]) : null,
        dtFechado : cFechado >= 0 ? _histParseDataHora_(data[r][cFechado]) : null
      });
    }
    if (saida.length) _propBdCache = saida;
    return saida;
  } catch (e) {
    Logger.log('_propLerBdCru_: ' + e.message);
    return [];
  }
}


// ==========================================
// PORTFÓLIO
// ==========================================
// Agrupa a BD por Centro de Custos e devolve, para cada imóvel: volume
// total, quantos seguem abertos, e a janela de datas coberta. É o retrato do
// que a base sabe — a partir dele decidimos quem entra na apresentação.
function listarPortfolioBD_() {
  const itens = _propLerBdCru_();
  if (!itens.length) return [];

  const porCC = {};
  itens.forEach(it => {
    const k = it.cc;
    if (!porCC[k]) porCC[k] = { cc: k, total: 0, abertos: 0, primeiro: null, ultimo: null, semData: 0 };
    const g = porCC[k];
    g.total++;
    if (!_bdChamadoFechado_(it.estado, it.dtFechado)) g.abertos++;
    if (it.dtReporte) {
      if (!g.primeiro || it.dtReporte < g.primeiro) g.primeiro = it.dtReporte;
      if (!g.ultimo   || it.dtReporte > g.ultimo)   g.ultimo   = it.dtReporte;
    } else {
      g.semData++;
    }
  });

  return Object.keys(porCC)
    .map(k => porCC[k])
    .sort((a, b) => b.total - a.total);
}

// Megas x demais imóveis — é o corte que a apresentação vai usar para
// separar "desempenho nos Megas" de "desempenho nos demais".
function _propEhMega_(cc) {
  return _histNorm_(cc).indexOf('mega') === 0;
}

// Backlog de um Centro de Custos no mês de referência, pela mesma regra dos
// Megas. `equipe` opcional filtra por PROPERTY / FACILITIES / LOCATARIO.
function backlogPorCC_(cc, ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  return _propLerBdCru_()
    .filter(it => it.cc === cc)
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .length;
}


// ==========================================
// DESCOBERTA — RODE ISTO PRIMEIRO
// ==========================================
// Lista o portfólio inteiro que a BD conhece, separando Megas dos demais.
// A saída é o que preenche PROPRIEDADES em 01_Config.gs: o valor da coluna
// "cc" tem que ser copiado EXATAMENTE para o campo ccBD (o filtro compara
// string a string).
function descobrirPortfolio() {
  Logger.log('======================================================');
  Logger.log('PORTFÓLIO CONHECIDO PELA BD-CORRETIVAS');
  Logger.log('======================================================');

  const lista = listarPortfolioBD_();
  if (!lista.length) {
    Logger.log('Nenhuma linha lida. Confira BD_CORRETIVAS_ID em 01_Config.gs ' +
               'e se a conta que roda o script tem acesso à planilha.');
    return;
  }

  const fmt = d => d ? (String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear()) : '—';
  const bloco = (titulo, itens) => {
    if (!itens.length) return;
    Logger.log('\n' + titulo + ' (' + itens.length + ')');
    Logger.log('  ' + 'CENTRO DE CUSTOS'.padEnd(30) + 'CHAMADOS'.padStart(9) +
               'ABERTOS'.padStart(9) + '   PERÍODO');
    itens.forEach(g => {
      Logger.log('  ' + g.cc.padEnd(30) + String(g.total).padStart(9) +
                 String(g.abertos).padStart(9) +
                 '   ' + fmt(g.primeiro) + ' a ' + fmt(g.ultimo) +
                 (g.semData ? '   (' + g.semData + ' sem data)' : ''));
    });
  };

  const megas  = lista.filter(g => _propEhMega_(g.cc));
  const demais = lista.filter(g => !_propEhMega_(g.cc));
  bloco('MEGAS', megas);
  bloco('DEMAIS IMÓVEIS', demais);

  const soma = c => c.reduce((s, g) => s + g.total, 0);
  Logger.log('\nTotal: ' + lista.length + ' imóveis, ' + soma(lista) + ' chamados' +
             ' (Megas: ' + megas.length + ' imóveis / ' + soma(megas) + ' chamados' +
             ' · demais: ' + demais.length + ' / ' + soma(demais) + ').');
  Logger.log('\nPara entrar na apresentação, copie o valor da coluna CENTRO DE CUSTOS ' +
             'para o campo ccBD de PROPRIEDADES (01_Config.gs) — tem que bater exatamente.');
}
