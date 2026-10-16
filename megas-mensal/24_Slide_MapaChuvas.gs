/**
 * ARQUIVO: 24_Slide_MapaChuvas.gs
 * SEÇÃO:   SLIDES — Mapa de Chuvas (Curitiba, Itajaí e Esteio)
 * DESCRIÇÃO: Um slide por Mega com quatro leituras da chuva:
 *   ▸ faixa de KPIs: chuva do mês × média de 10 anos, dias com chuva, pico
 *     de intensidade (mm/h) e chamados ligados à chuva;
 *   ▸ anel do mês: um ponto por dia × turno (manhã, tarde, noite) na cor da
 *     MAIOR intensidade horária daquele turno, com ✕ onde abriu chamado de
 *     chuva;
 *   ▸ previsão dos próximos 14 dias;
 *   ▸ chuva dos últimos 12 meses contra a média dos 10 anos anteriores.
 *
 * Fonte: Open-Meteo (pública, sem chave). O realizado e a média vêm do
 * arquivo histórico (archive-api, reanálise ERA5); a previsão, da API de
 * previsão. Anel, KPIs e barras saem do MESMO arquivo histórico — o total do
 * mês no KPI é a mesma barra do mês no painel da direita, não um número de
 * outra base (lição 2 do CLAUDE.md).
 *
 * Por que não o pluviômetro do Esteio: ele é lido a cada ida de campo
 * (volume acumulado desde a leitura anterior), então não dá intensidade por
 * hora nem por turno — e só o Esteio tem. O slide do pluviômetro continua
 * logo antes deste; aqui a divergência entre os dois vai para o Logger.
 *
 * Os impactos (✕) vêm da BD-CORRETIVAS: chamado do mês cuja descrição fala
 * de chuva, infiltração, goteira, alagamento… (CHUVA_TERMOS_IMPACTO), no dia
 * e turno da Data de reporte.
 *
 * Cada painel se desenha sozinho: se uma das consultas falhar, aquele painel
 * mostra o aviso e os outros saem normais.
 */

const CHUVA_URL_ARQUIVO  = 'https://archive-api.open-meteo.com/v1/archive';
const CHUVA_URL_PREVISAO = 'https://api.open-meteo.com/v1/forecast';

// Turnos do anel. A noite vai das 18h às 6h do dia SEGUINTE: a chuva das 3h
// da madrugada do dia 10 pinta a noite do dia 9 — é a noite que começou lá.
const CHUVA_TURNOS = [
  { sigla: 'M', nome: 'manhã' },   // 6h–12h
  { sigla: 'T', nome: 'tarde' },   // 12h–18h
  { sigla: 'N', nome: 'noite' }    // 18h–6h
];

// Faixas por intensidade horária (mm/h), da mais forte para a mais fraca: a
// primeira cujo `min` o valor alcança é a classe. Abaixo de 0,5 mm/h conta
// como seco (garoa que não molha o chão). Escala de azuis de propósito: o
// vermelho fica reservado para o ✕ de impacto, que é o que pede ação.
const CHUVA_FAIXAS = [
  { min: 10,  nome: 'Forte',    faixa: '> 10 mm/h',     cor: '#1E3A8A' },
  { min: 2.5, nome: 'Moderada', faixa: '2,5–10 mm/h',   cor: '#0284C7' },
  { min: 0.5, nome: 'Leve',     faixa: '0,5–2,5 mm/h',  cor: '#7DD3FC' }
];
const CHUVA_COR_SECO     = '#E6ECF3';
const CHUVA_COR_SEM_DADO = '#CBD5E1';

// "Dia com chuva" = 1 mm ou mais no dia (convenção do INMET).
const CHUVA_DIA_CHUVOSO_MM = 1;

// Média histórica: os 10 anos anteriores a cada mês. Com menos de 5 anos
// completos o número fica instável e o slide mostra "—".
const CHUVA_ANOS_MEDIA     = 10;
const CHUVA_ANOS_MEDIA_MIN = 5;

// Trechos procurados (sem acento, minúsculo) na descrição do chamado.
// "chuva" não pega "chuveiro" (chuve…), que é hidráulica e não clima.
const CHUVA_TERMOS_IMPACTO = ['chuva', 'infiltr', 'goteir', 'alag', 'inund', 'enchent',
                              'calha', 'temporal', 'vendaval', 'transbord'];

const CHUVA_DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function gerarSoMapaChuvasCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideMapaChuvas(); }
function gerarSoMapaChuvasItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideMapaChuvas(); }
function gerarSoMapaChuvasEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideMapaChuvas(); }
function gerarSoMapaChuvasTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => { setProjetoAtivo(c); gerarSlideMapaChuvas(); });
}


// ==========================================
// SLIDE
// ==========================================
function gerarSlideMapaChuvas() {
  if (!_projetoAtivoChave) setProjetoAtivo('CURITIBA');
  const projeto = getProjetoAtivo();
  const dados   = obterMapaChuvas_();
  if (!dados) {
    Logger.log('Mapa de Chuvas: ' + projeto.nome + ' sem coordenadas em PROJETOS (01_Config.gs) — nenhum slide.');
    return;
  }

  const ref   = dados.ref;
  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'MAPA DE CHUVAS',
    projeto.nome + ' · ' + ref.curto + '/' + ref.ano + ' · Fonte: Open-Meteo (ERA5) e BD-CORRETIVAS');

  const mX = 30, gap = 10, topo = 72, kpiH = 50;
  const largura = W - mX * 2;
  const painelY = topo + kpiH + gap;
  const painelH = H - painelY - 10;
  const wAnel = 228, wMeses = 150;
  const wPrev = largura - wAnel - wMeses - gap * 2;

  const partes = [
    ['KPIs',      () => _chuvaKpis_(slide, mX, topo, largura, kpiH, dados),                         [mX, topo, largura, kpiH]],
    ['Anel',      () => _chuvaAnel_(slide, mX, painelY, wAnel, painelH, dados),                     [mX, painelY, wAnel, painelH]],
    ['Previsão',  () => _chuvaPrevisaoPainel_(slide, mX + wAnel + gap, painelY, wPrev, painelH, dados.previsao), [mX + wAnel + gap, painelY, wPrev, painelH]],
    ['12 meses',  () => _chuvaMesesPainel_(slide, W - mX - wMeses, painelY, wMeses, painelH, dados.meses, ref), [W - mX - wMeses, painelY, wMeses, painelH]]
  ];
  partes.forEach(p => {
    try {
      p[1]();
    } catch (e) {
      Logger.log('Mapa de Chuvas — falha no painel ' + p[0] + ': ' + e.message);
      const g = p[2];
      _chuvaAviso_(slide, g[0], g[1], g[2], g[3], 'Falha ao desenhar "' + p[0] + '": ' + e.message);
    }
  });

  Logger.log('Mapa de Chuvas gerado → ' + projeto.nome + ' ' + ref.siglaAno);
}


// ==========================================
// DADOS
// ==========================================
// Devolve null só quando o Mega não tem coordenadas. Cada bloco que falhar
// fica null e o painel dele mostra o aviso.
function obterMapaChuvas_() {
  const projeto = getProjetoAtivo();
  const c = projeto.coordenadas;
  if (!c) return null;

  const ref   = obterMesReferencia_();
  const nDias = new Date(Date.UTC(ref.ano, ref.index + 1, 0)).getUTCDate();
  const ontem = _chuvaIsoMais_(_chuvaHojeIso_(), -1);   // o arquivo histórico não tem "hoje"
  const local = '?latitude=' + c.lat + '&longitude=' + c.lon + '&timezone=America%2FSao_Paulo';

  const r = { ref: ref, nDias: nDias, mes: null, meses: null, turnos: null, previsao: null, impactos: [] };

  // 1) Diário — os 12 meses da janela e os 10 anos antes de cada um.
  const inicioDiario = _chuvaIso_(ref.ano - 1 - CHUVA_ANOS_MEDIA, 0, 1);
  const fimDiario    = _chuvaMin_(_chuvaIso_(ref.ano, ref.index, nDias), ontem);
  if (inicioDiario <= fimDiario) {
    const j = _chuvaBuscar_(CHUVA_URL_ARQUIVO + local + '&start_date=' + inicioDiario +
                            '&end_date=' + fimDiario + '&daily=precipitation_sum');
    if (j && j.daily && j.daily.time) {
      r.meses = _chuvaSerieMensal_(j.daily, ref);
      r.mes   = _chuvaResumoMes_(j.daily, ref, nDias);
    }
  }

  // 2) Horário do mês de referência, mais o dia 1º do mês seguinte — as
  //    primeiras horas dele são a noite do último dia.
  const inicioHora = _chuvaIso_(ref.ano, ref.index, 1);
  const fimHora    = _chuvaMin_(_chuvaIso_(ref.ano, ref.index, nDias + 1), ontem);
  if (inicioHora <= fimHora) {
    const j = _chuvaBuscar_(CHUVA_URL_ARQUIVO + local + '&start_date=' + inicioHora +
                            '&end_date=' + fimHora + '&hourly=precipitation');
    if (j && j.hourly && j.hourly.time) r.turnos = _chuvaTurnos_(j.hourly, ref, nDias);
  }

  // 3) Previsão dos próximos 14 dias.
  const p = _chuvaBuscar_(CHUVA_URL_PREVISAO + local +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max' +
    '&forecast_days=14');
  if (p && p.daily && p.daily.time) r.previsao = _chuvaPrevisao_(p.daily);

  // 4) Chamados ligados à chuva.
  r.impactos = _chuvaImpactos_(ref);

  // Esteio: confere com o pluviômetro de campo (lição 3 — divergência no
  // Logger, nunca escolhida em silêncio).
  if (projeto.monitoramentoId && r.mes && typeof obterDadosMonitoramentoEsteio_ === 'function') {
    try {
      const mon = obterDadosMonitoramentoEsteio_();
      const ano = mon && mon.chuva && mon.chuva.porAno[ref.ano];
      const pl  = ano ? ano[ref.index] : null;
      if (pl != null) {
        Logger.log('Mapa de Chuvas: ' + ref.siglaAno + ' — Open-Meteo ' + _chuvaMm_(r.mes.total) +
                   ' mm × pluviômetro de campo ' + _chuvaMm_(pl) + ' mm.');
      }
    } catch (e) {
      Logger.log('Mapa de Chuvas: conferência com o pluviômetro falhou (' + e.message + ').');
    }
  }

  return r;
}

function _chuvaBuscar_(url) {
  for (let t = 0; t < 2; t++) {
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) return JSON.parse(resp.getContentText());
      Logger.log('Mapa de Chuvas: Open-Meteo respondeu HTTP ' + resp.getResponseCode() + ' (' + url + ')');
    } catch (e) {
      Logger.log('Mapa de Chuvas: ' + e.message);
    }
    if (t === 0) Utilities.sleep(1500);
  }
  return null;
}

// Série dos 12 meses que terminam no mês de referência, cada um com o
// realizado e a média dos 10 anos anteriores àquele mesmo mês.
function _chuvaSerieMensal_(daily, ref) {
  const tot = _chuvaTotaisMensais_(daily);
  const saida = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(Date.UTC(ref.ano, ref.index - k, 1));
    const ano = d.getUTCFullYear(), mes = d.getUTCMonth();
    const t = tot[ano * 12 + mes];

    let soma = 0, n = 0;
    for (let a = ano - CHUVA_ANOS_MEDIA; a < ano; a++) {
      const h = tot[a * 12 + mes];
      if (h && h.completo) { soma += h.soma; n++; }
    }
    saida.push({
      ano: ano, mes: mes,
      real: t && t.n > 0 ? t.soma : null,
      parcial: !!(t && t.n > 0 && !t.completo),
      media: n >= CHUVA_ANOS_MEDIA_MIN ? soma / n : null
    });
  }
  return saida;
}

// { ano*12+mes: { soma, n (dias com valor), completo } }
function _chuvaTotaisMensais_(daily) {
  const tot = {};
  for (let i = 0; i < daily.time.length; i++) {
    const t = String(daily.time[i]);
    const ano = +t.substr(0, 4), mes = +t.substr(5, 2) - 1;
    const k = ano * 12 + mes;
    if (!tot[k]) tot[k] = { soma: 0, n: 0, completo: false };
    const v = daily.precipitation_sum[i];
    if (v === null || v === undefined || isNaN(v)) continue;
    tot[k].soma += Number(v);
    tot[k].n++;
  }
  Object.keys(tot).forEach(k => {
    const ano = Math.floor(k / 12), mes = k % 12;
    tot[k].completo = tot[k].n === new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  });
  return tot;
}

function _chuvaResumoMes_(daily, ref, nDias) {
  let total = 0, n = 0, chuvosos = 0, ultimo = 0;
  for (let i = 0; i < daily.time.length; i++) {
    const t = String(daily.time[i]);
    if (+t.substr(0, 4) !== ref.ano || +t.substr(5, 2) - 1 !== ref.index) continue;
    const v = daily.precipitation_sum[i];
    if (v === null || v === undefined || isNaN(v)) continue;
    total += Number(v);
    n++;
    if (v >= CHUVA_DIA_CHUVOSO_MM) chuvosos++;
    ultimo = Math.max(ultimo, +t.substr(8, 2));
  }
  if (!n) return null;
  return { total: total, diasChuva: chuvosos, diasComDado: n, ultimoDia: ultimo, completo: n === nDias };
}

// celulas[dia-1][turno] = maior mm/h do turno (0 = seco; null = sem dado).
function _chuvaTurnos_(hourly, ref, nDias) {
  const celulas = [];
  for (let d = 0; d < nDias; d++) celulas.push([null, null, null]);
  let pico = null;

  for (let i = 0; i < hourly.time.length; i++) {
    const v = hourly.precipitation[i];
    if (v === null || v === undefined || isNaN(v)) continue;
    const t = String(hourly.time[i]);
    const ano = +t.substr(0, 4), mes = +t.substr(5, 2) - 1, dia = +t.substr(8, 2), hora = +t.substr(11, 2);
    const noMes = ano === ref.ano && mes === ref.index;

    let d, turno;
    if (hora < 6) {
      turno = 2;
      if (noMes && dia > 1) d = dia - 1;          // madrugada → noite do dia anterior
      else if (!noMes && dia === 1) d = nDias;    // 1º do mês seguinte → noite do último dia
      else continue;                              // madrugada do dia 1º é do mês anterior
    } else {
      if (!noMes) continue;
      d = dia;
      turno = hora < 12 ? 0 : (hora < 18 ? 1 : 2);
    }

    const atual = celulas[d - 1][turno];
    celulas[d - 1][turno] = atual === null ? Number(v) : Math.max(atual, Number(v));
    if (!pico || v > pico.valor) pico = { valor: Number(v), dia: d, turno: turno };
  }
  return { celulas: celulas, pico: pico && pico.valor > 0 ? pico : null };
}

function _chuvaPrevisao_(daily) {
  return daily.time.map((t, i) => ({
    iso:  String(t),
    wmo:  daily.weather_code ? daily.weather_code[i] : null,
    tmax: daily.temperature_2m_max ? daily.temperature_2m_max[i] : null,
    tmin: daily.temperature_2m_min ? daily.temperature_2m_min[i] : null,
    mm:   daily.precipitation_sum ? daily.precipitation_sum[i] : null,
    prob: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null
  }));
}

// Chamados do mês de referência cuja descrição fala de chuva. O turno segue
// a mesma regra do anel (madrugada = noite do dia anterior). Data sem hora
// (00:00:00 exato) não tem turno — vai para a manhã do próprio dia.
function _chuvaImpactos_(ref) {
  let itens = [];
  try {
    itens = _lerBdCorretivasCru_();
  } catch (e) {
    Logger.log('Mapa de Chuvas: BD-CORRETIVAS indisponível (' + e.message + ').');
    return [];
  }

  const saida = [];
  itens.forEach(it => {
    let dt = it.dtReporte;
    if (!dt) return;
    const txt = _histNorm_(it.descricao);
    if (!CHUVA_TERMOS_IMPACTO.some(p => txt.indexOf(p) >= 0)) return;

    // As datas da BD vêm como hora de parede em UTC (_histParseDataHora_).
    const h = dt.getUTCHours();
    const semHora = h === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0;
    let turno;
    if (semHora)    turno = 0;
    else if (h < 6) { turno = 2; dt = new Date(dt.getTime() - 86400000); }
    else            turno = h < 12 ? 0 : (h < 18 ? 1 : 2);

    if (dt.getUTCFullYear() !== ref.ano || dt.getUTCMonth() !== ref.index) return;
    saida.push({ dia: dt.getUTCDate(), turno: turno, id: it.id, descricao: it.descricao });
  });
  if (saida.length) {
    Logger.log('Mapa de Chuvas: ' + saida.length + ' chamado(s) ligado(s) à chuva — ' +
               saida.map(s => s.id + ' (' + s.dia + '/' + CHUVA_TURNOS[s.turno].sigla + ')').join(', '));
  }
  return saida;
}

function _chuvaClasse_(mmh) {
  if (mmh === null || mmh === undefined) return null;
  for (let i = 0; i < CHUVA_FAIXAS.length; i++) {
    if (mmh >= CHUVA_FAIXAS[i].min) return CHUVA_FAIXAS[i];
  }
  return null;
}

function _chuvaIso_(ano, mes, dia) {
  const d = new Date(Date.UTC(ano, mes, dia));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
         String(d.getUTCDate()).padStart(2, '0');
}

function _chuvaIsoMais_(iso, dias) {
  return _chuvaIso_(+iso.substr(0, 4), +iso.substr(5, 2) - 1, +iso.substr(8, 2) + dias);
}

function _chuvaHojeIso_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
}

// Datas ISO comparam como texto.
function _chuvaMin_(a, b) { return a < b ? a : b; }

// 142 → "142"; 6,46 → "6,5"; abaixo de 10 mm a casa decimal ainda diz algo.
function _chuvaMm_(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (Math.abs(v) < 10) return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  return formatarNumeroBR(Math.round(v));
}

// Intensidade sempre com uma casa: as faixas cortam em 2,5 e 10, e 9,96 mm/h
// (moderada) arredondado para "10" pareceria forte.
function _chuvaMmh_(v) {
  return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
}

function _chuvaIcone_(c) {
  if (c === 0) return '☀️';
  if (c === 1) return '🌤️';
  if (c === 2) return '⛅';
  if (c === 3) return '☁️';
  if (c === 45 || c === 48) return '🌫️';
  if (c >= 51 && c <= 57) return '🌦️';
  if ((c >= 61 && c <= 67) || c === 80 || c === 81) return '🌧️';
  if (c === 82 || c >= 95) return '⛈️';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return '🌨️';
  return '🌡️';
}


// ==========================================
// DESENHO — KPIs
// ==========================================
function _chuvaKpis_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM.colors;
  const ref = d.ref;
  const mesSerie = d.meses ? d.meses[d.meses.length - 1] : null;
  const total = d.mes ? d.mes.total : null;
  const media = mesSerie ? mesSerie.media : null;

  let subTotal = 'sem média histórica';
  if (total !== null && media) {
    const pct = Math.sign(total - media) * Math.round(Math.abs(total / media - 1) * 100);
    subTotal = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% ' + (pct >= 0 ? 'acima' : 'abaixo') +
               ' da média de 10 anos (' + _chuvaMm_(media) + ' mm)';
  }
  if (d.mes && !d.mes.completo) {
    subTotal = 'parcial: dados até ' + String(d.mes.ultimoDia).padStart(2, '0') + '/' + ref.mes;
  }

  const pico = d.turnos ? d.turnos.pico : null;
  const classePico = pico ? _chuvaClasse_(pico.valor) : null;
  const nImp = d.impactos.length;

  const cards = [
    { label: 'CHUVA NO MÊS', valor: total === null ? '—' : _chuvaMm_(total) + ' mm',
      sub: total === null ? 'histórico indisponível' : subTotal, cor: DS.brandLight },
    { label: 'DIAS COM CHUVA', valor: d.mes ? d.mes.diasChuva + ' de ' + d.nDias : '—',
      sub: 'dias com ' + CHUVA_DIA_CHUVOSO_MM + ' mm ou mais', cor: DS.brandMed },
    { label: 'PICO DE INTENSIDADE', valor: pico ? _chuvaMmh_(pico.valor) + ' mm/h' : '—',
      sub: pico ? String(pico.dia).padStart(2, '0') + '/' + ref.mes + ' · ' + CHUVA_TURNOS[pico.turno].nome +
                  (classePico ? ' · chuva ' + classePico.nome.toLowerCase() : '')
                : 'sem chuva registrada', cor: classePico ? classePico.cor : DS.textBody },
    { label: 'CHAMADOS LIGADOS À CHUVA', valor: String(nImp),
      sub: nImp ? 'infiltração, goteira, alagamento (✕ no anel)' : 'nenhum chamado no mês',
      cor: nImp ? DS.accentRed : DS.accentGreen }
  ];

  const gap = 10, cw = (w - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => _chuvaCardKpi_(slide, x + i * (cw + gap), y, cw, h, c));
}

// Card compacto: rótulo, valor e uma linha de apoio, todos medidos para
// caber numa linha (o criarCardKPI quebra o texto de apoio em card baixo).
function _chuvaCardKpi_(slide, x, y, w, h, c) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(c.cor);
  side.getBorder().setTransparent();

  const ix = x + 12, iw = w - 20;
  _gUmaLinha_(slide, ix, y + 5, iw, 11, c.label,
    { align: 'L', fs: 7, bold: true, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 4 });
  _gUmaLinha_(slide, ix, y + 15, iw, 21, c.valor,
    { align: 'L', fs: 16, bold: true, cor: c.cor, fonte: DS.typography.titles, folga: 4 });
  _gUmaLinha_(slide, ix, y + h - 15, iw, 11, c.sub,
    { align: 'L', fs: 6.8, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 4, fsMin: 5.5 });
}


// ==========================================
// DESENHO — ANEL DO MÊS (dia × turno)
// ==========================================
function _chuvaAnel_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  const y0 = criarCardPainel(slide, x, y, w, h, 'CHUVA POR TURNO', CORES.lightBlue);

  const legendaH = 30;
  const base = y + h - legendaH;
  const cx = x + 2 + w / 2;                       // +2: metade da barra lateral do card
  const cy = (y0 + base) / 2;
  const raio = Math.min((base - y0) / 2, (w - 16) / 2);
  const rRotulo = raio - 7;
  const raios = [rRotulo - 15, rRotulo - 27, rRotulo - 39];   // M (fora), T, N (dentro)
  const slots = d.nDias + 1;                      // o slot 0, no topo, leva as letras M/T/N
  const ang = s => -Math.PI / 2 + 2 * Math.PI * s / slots;
  const passo = 2 * Math.PI * raios[2] / slots;
  const diam = Math.max(4, Math.min(7.5, passo - 2.5));

  // Trilhos finos de cada turno, por trás dos pontos.
  raios.forEach(r => {
    const trilho = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - r, cy - r, r * 2, r * 2);
    trilho.getFill().setTransparent();
    trilho.getBorder().getLineFill().setSolidFill(DS.colors.lines);
    trilho.getBorder().setWeight(0.75);
  });

  const cel = d.turnos ? d.turnos.celulas : null;
  for (let dia = 1; dia <= d.nDias; dia++) {
    const a = ang(dia), cos = Math.cos(a), sin = Math.sin(a);
    for (let t = 0; t < 3; t++) {
      const px = cx + raios[t] * cos, py = cy + raios[t] * sin;
      const v = cel ? cel[dia - 1][t] : null;
      const ponto = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, px - diam / 2, py - diam / 2, diam, diam);
      if (v === null) {
        ponto.getFill().setSolidFill(DS.colors.cardBg);
        ponto.getBorder().getLineFill().setSolidFill(CHUVA_COR_SEM_DADO);
        ponto.getBorder().setWeight(0.75);
      } else {
        const cls = _chuvaClasse_(v);
        ponto.getFill().setSolidFill(cls ? cls.cor : CHUVA_COR_SECO);
        ponto.getBorder().setTransparent();
      }
    }
    const lx = cx + rRotulo * cos, ly = cy + rRotulo * sin;
    _gUmaLinha_(slide, lx - 8, ly - 5, 16, 10, String(dia),
      { fs: 6.3, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 4 });
  }

  // Letras dos turnos no slot 0.
  CHUVA_TURNOS.forEach((tu, t) => {
    _gUmaLinha_(slide, cx - 6, cy - raios[t] - 5, 12, 10, tu.sigla,
      { fs: 6, bold: true, cor: DS.colors.brandMed, fonte: DS.typography.titles, folga: 3 });
  });

  // ✕ dos chamados ligados à chuva (um por célula, mesmo com vários chamados).
  const marcados = {};
  d.impactos.forEach(im => {
    const k = im.dia + '|' + im.turno;
    if (marcados[k] || im.dia < 1 || im.dia > d.nDias) return;
    marcados[k] = true;
    const a = ang(im.dia);
    const px = cx + raios[im.turno] * Math.cos(a), py = cy + raios[im.turno] * Math.sin(a);
    const s = diam / 2 + 1;
    [[px - s, py - s, px + s, py + s], [px - s, py + s, px + s, py - s]].forEach(q => {
      const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, q[0], q[1], q[2], q[3]);
      l.getLineFill().setSolidFill(DS.colors.accentRed);
      l.setWeight(1.75);
    });
  });

  // Centro: mês e ano.
  const rMiolo = raios[2] - diam;
  _gUmaLinha_(slide, cx - rMiolo, cy - 13, rMiolo * 2, 15, d.ref.nome,
    { fs: 10, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.titles, folga: 0, fsMin: 6 });
  _gUmaLinha_(slide, cx - rMiolo, cy + 1, rMiolo * 2, 11, String(d.ref.ano),
    { fs: 7.5, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 0 });
  if (!cel) {
    _gUmaLinha_(slide, cx - rMiolo, cy + 12, rMiolo * 2, 10, 'sem dado horário',
      { fs: 6, italic: true, cor: DS.colors.accentRed, fonte: DS.typography.body, folga: 0 });
  }

  _chuvaLegendaAnel_(slide, x + 14, base + 2, w - 24);
}

function _chuvaLegendaAnel_(slide, x, y, w) {
  const DS = CR_DESIGN_SYSTEM;
  const linhaH = 12, bola = 6;
  const item = (ix, iy, iw, desenhar, texto) => {
    desenhar(ix, iy + (linhaH - bola) / 2);
    _gUmaLinha_(slide, ix + bola + 3, iy, iw - bola - 3, linhaH, texto,
      { align: 'L', fs: 6, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 2, fsMin: 5 });
  };
  const bolinha = cor => (bx, by) => {
    const b = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, bx, by, bola, bola);
    b.getFill().setSolidFill(cor);
    b.getBorder().setTransparent();
  };

  // Linha 1: as três faixas, da mais fraca para a mais forte. "mm/h" só no
  // último item e cada coluna do tamanho do seu texto — em terços iguais o
  // "Moderada 2,5–10 mm/h" encostava no ponto seguinte.
  const faixas = CHUVA_FAIXAS.slice().reverse();
  const textos = faixas.map((f, i) => f.nome + ' ' + f.faixa.replace(' mm/h', '') + (i === faixas.length - 1 ? ' mm/h' : ''));
  const pesos = textos.map(s => s.length + 4);
  const soma = pesos.reduce((a, b) => a + b, 0);
  let cx1 = x;
  faixas.forEach((f, i) => {
    const cw = w * pesos[i] / soma;
    item(cx1, y, cw, bolinha(f.cor), textos[i]);
    cx1 += cw;
  });

  // Linha 2: impacto e horário dos turnos.
  const y2 = y + linhaH;
  item(x, y2, w * 0.42, (bx, by) => {
    [[bx, by, bx + bola, by + bola], [bx, by + bola, bx + bola, by]].forEach(q => {
      const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, q[0], q[1], q[2], q[3]);
      l.getLineFill().setSolidFill(DS.colors.accentRed);
      l.setWeight(1.5);
    });
  }, 'chamado ligado à chuva');
  _gUmaLinha_(slide, x + w * 0.42, y2, w * 0.58, linhaH, 'M 6–12h · T 12–18h · N 18–6h',
    { align: 'L', fs: 6, bold: true, cor: DS.colors.brandMed, fonte: DS.typography.body, folga: 2, fsMin: 5 });
}


// ==========================================
// DESENHO — PREVISÃO (14 dias)
// ==========================================
function _chuvaPrevisaoPainel_(slide, x, y, w, h, prev) {
  const DS = CR_DESIGN_SYSTEM;
  const y0 = criarCardPainel(slide, x, y, w, h, 'PREVISÃO — PRÓXIMOS 14 DIAS', CORES.lightBlue);
  if (!prev || !prev.length) {
    _chuvaAviso_(slide, x + 4, y0, w - 4, y + h - y0, 'Previsão indisponível: a Open-Meteo não respondeu.');
    return;
  }

  const dias = prev.slice(0, 14);
  const cols = 7, rows = Math.ceil(dias.length / cols);
  const padX = 10, gap = 3, rodapeH = 16;
  const gx = x + 4 + padX;
  const cw = (w - 4 - padX * 2 - gap * (cols - 1)) / cols;
  const ch = (y + h - 6 - rodapeH - y0 - gap * (rows - 1)) / rows;

  dias.forEach((p, i) => {
    _chuvaCelulaPrevisao_(slide, gx + (i % cols) * (cw + gap), y0 + Math.floor(i / cols) * (ch + gap), cw, ch, p, i === 0);
  });

  // Rodapé: o resumo que se lê em voz alta na reunião.
  const comMm = dias.filter(p => p.mm !== null && p.mm !== undefined);
  const total = comMm.reduce((s, p) => s + Number(p.mm), 0);
  const chuvosos = comMm.filter(p => p.mm >= CHUVA_DIA_CHUVOSO_MM).length;
  const maior = comMm.reduce((m, p) => (!m || p.mm > m.mm) ? p : m, null);
  let txt = _chuvaMm_(total) + ' mm previstos · ' + chuvosos + ' dia' + (chuvosos === 1 ? '' : 's') + ' com chuva';
  if (maior && maior.mm >= CHUVA_DIA_CHUVOSO_MM) {
    txt += ' · maior volume: ' + _chuvaMm_(maior.mm) + ' mm em ' + maior.iso.substr(8, 2) + '/' + maior.iso.substr(5, 2);
  }
  _gUmaLinha_(slide, gx, y + h - 4 - rodapeH, w - 4 - padX * 2, rodapeH, txt,
    { fs: 7, bold: true, cor: DS.colors.brandMed, fonte: DS.typography.body, folga: 2, fsMin: 5.5 });
}

function _chuvaCelulaPrevisao_(slide, x, y, w, h, p, hoje) {
  const DS = CR_DESIGN_SYSTEM;
  const chove = p.mm !== null && p.mm !== undefined && p.mm >= CHUVA_DIA_CHUVOSO_MM;

  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(hoje ? '#EFF6FF' : DS.colors.bgSlide);
  if (hoje) {
    bg.getBorder().getLineFill().setSolidFill(DS.colors.brandLight);
    bg.getBorder().setWeight(1);
  } else {
    bg.getBorder().setTransparent();
  }

  const dt = new Date(Date.UTC(+p.iso.substr(0, 4), +p.iso.substr(5, 2) - 1, +p.iso.substr(8, 2)));
  const k = h / 100;   // posições pensadas para 100pt de altura, escaladas
  const op = (fs, extra) => Object.assign({ fs: fs, folga: 6, fonte: DS.typography.body, cor: DS.colors.textBody }, extra || {});

  _gUmaLinha_(slide, x, y + 4 * k, w, 9 * k, hoje ? 'HOJE' : CHUVA_DIAS_SEMANA[dt.getUTCDay()],
    op(6, { bold: true, cor: hoje ? DS.colors.brandLight : DS.colors.textBody }));
  _gUmaLinha_(slide, x, y + 13 * k, w, 10 * k, p.iso.substr(8, 2) + '/' + p.iso.substr(5, 2),
    op(6.5, { cor: DS.colors.textMain }));
  _gUmaLinha_(slide, x, y + 25 * k, w, 20 * k, _chuvaIcone_(p.wmo), op(14));
  _gUmaLinha_(slide, x, y + 47 * k, w, 12 * k, p.tmax === null ? '—' : Math.round(p.tmax) + '°',
    op(9, { bold: true, cor: DS.colors.textMain, fonte: DS.typography.titles }));
  _gUmaLinha_(slide, x, y + 59 * k, w, 10 * k, p.tmin === null ? '—' : Math.round(p.tmin) + '°',
    op(7, { cor: DS.colors.textBody }));

  // Chuva: volume em destaque quando chove, e a probabilidade como barrinha.
  _gUmaLinha_(slide, x, y + 72 * k, w, 10 * k, chove ? _chuvaMm_(p.mm) + ' mm' : 'seco',
    op(6.3, { bold: chove, cor: chove ? '#0284C7' : DS.colors.textBody }));
  if (p.prob !== null && p.prob !== undefined) {
    const bw = w - 8, by = y + 85 * k;
    const trilho = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, by, bw, 2.5);
    trilho.getFill().setSolidFill(DS.colors.lines);
    trilho.getBorder().setTransparent();
    if (p.prob > 0) {
      const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, by, Math.max(1, bw * Math.min(100, p.prob) / 100), 2.5);
      barra.getFill().setSolidFill(p.prob >= 60 ? '#0284C7' : DS.colors.brandSoft);
      barra.getBorder().setTransparent();
    }
    _gUmaLinha_(slide, x, by + 3, w, 9 * k, Math.round(p.prob) + '%', op(5.5));
  }
}


// ==========================================
// DESENHO — 12 MESES × MÉDIA HISTÓRICA
// ==========================================
function _chuvaMesesPainel_(slide, x, y, w, h, meses, ref) {
  const DS = CR_DESIGN_SYSTEM;
  const y0 = criarCardPainel(slide, x, y, w, h, 'CHUVA × MÉDIA', CORES.lightBlue);
  if (!meses || !meses.length) {
    _chuvaAviso_(slide, x + 4, y0, w - 4, y + h - y0, 'Histórico indisponível: a Open-Meteo não respondeu.');
    return;
  }

  const ix = x + 14, iw = w - 22;
  // Legenda: barra = realizado, traço = média de 10 anos.
  const leg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ix, y0 + 3, 9, 5);
  leg.getFill().setSolidFill(DS.colors.brandLight);
  leg.getBorder().setTransparent();
  _gUmaLinha_(slide, ix + 12, y0 - 1, 44, 12, 'realizado',
    { align: 'L', fs: 6, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 2 });
  const tick = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, ix + 62, y0 + 1, ix + 62, y0 + 10);
  tick.getLineFill().setSolidFill(DS.colors.textMain);
  tick.setWeight(1.5);
  _gUmaLinha_(slide, ix + 66, y0 - 1, iw - 66, 12, 'média 10 anos',
    { align: 'L', fs: 6, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 2 });

  const topo = y0 + 16;
  const rowH = (y + h - 8 - topo) / meses.length;
  const lblW = 30, valW = 26;
  const barX = ix + lblW + 2, barW = iw - lblW - valW - 4;
  const escala = meses.reduce((m, r) => Math.max(m, r.real || 0, r.media || 0), 0) || 1;

  meses.forEach((r, i) => {
    const ry = topo + i * rowH;
    const atual = r.ano === ref.ano && r.mes === ref.index;
    const corBarra = atual ? DS.colors.brandLight : DS.colors.brandSoft;
    const rotulo = MESES_3_REF[r.mes] + '/' + String(r.ano).slice(-2) + (r.parcial ? '*' : '');

    _gUmaLinha_(slide, ix, ry, lblW, rowH, rotulo,
      { align: 'L', fs: 6.3, bold: atual, cor: atual ? DS.colors.brandDark : DS.colors.textBody,
        fonte: DS.typography.body, folga: 2 });

    const bh = Math.min(7, rowH * 0.45);
    const by = ry + (rowH - bh) / 2;
    const fundo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, by, barW, bh);
    fundo.getFill().setSolidFill(DS.colors.bgSlide);
    fundo.getBorder().setTransparent();
    if (r.real) {
      const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, by, Math.max(1, barW * r.real / escala), bh);
      barra.getFill().setSolidFill(corBarra);
      barra.getBorder().setTransparent();
    }
    if (r.media) {
      const mx = barX + barW * r.media / escala;
      const m = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mx, by - 2.5, mx, by + bh + 2.5);
      m.getLineFill().setSolidFill(DS.colors.textMain);
      m.setWeight(1.5);
    }
    _gUmaLinha_(slide, barX + barW + 2, ry, valW, rowH, r.real === null ? '—' : _chuvaMm_(r.real),
      { align: 'L', fs: 6.3, bold: true, cor: atual ? DS.colors.brandDark : DS.colors.textMain,
        fonte: DS.typography.body, folga: 2 });
  });
}


// ==========================================
// AVISO DE PAINEL SEM DADO / COM FALHA
// ==========================================
// Só insertShape e CR_DESIGN_SYSTEM: o aviso não pode depender das helpers
// que talvez sejam a causa da falha (lição 6 do CLAUDE.md).
function _chuvaAviso_(slide, x, y, w, h, msg) {
  const DS = CR_DESIGN_SYSTEM;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 8, y + 8, Math.max(20, w - 16), Math.max(20, h - 16));
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(String(msg)).getTextStyle()
    .setFontSize(8).setItalic(true)
    .setForegroundColor(DS.colors.accentRed).setFontFamily(DS.typography.body);
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
