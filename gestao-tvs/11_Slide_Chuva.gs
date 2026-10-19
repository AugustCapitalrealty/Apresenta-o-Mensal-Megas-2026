/**
 * ARQUIVO: 11_Slide_Chuva.gs
 * DESCRIÇÃO: Chuva do mês — o anel da apresentação mensal dos Megas
 *            (megas-mensal/24_Slide_MapaChuvas.gs) trazido para a TV.
 *
 *   ▸ anel do mês: um ponto por dia × turno (manhã, tarde, noite) na cor da
 *     MAIOR intensidade horária daquele turno, ✕ vermelho onde abriu chamado
 *     ligado à chuva; os turnos que ainda não chegaram ficam vazados;
 *   ▸ quatro números: chuva no mês × média de 10 anos NO MESMO PERÍODO (dia 1
 *     até hoje — comparar 19 dias com o mês inteiro faria todo mês parecer
 *     seco), dias com chuva, pico de intensidade e chamados ligados à chuva;
 *   ▸ a lista desses chamados, os em aberto primeiro.
 *
 * Diferença para o slide mensal: lá o mês está fechado e tudo sai do arquivo
 * histórico (ERA5), que chega com ~5 dias de atraso. A TV mostra o mês
 * CORRENTE, então o anel, o total e o pico saem da API de previsão com
 * `past_days` (hora a hora até agora) — os três da MESMA série (lição 2 do
 * CLAUDE.md). Só a média de 10 anos vem do arquivo histórico.
 *
 * O slide fica no FIM do deck (posição = índice, como todo slide novo), mas o
 * gerarArquivosPainelTV() o põe logo depois da Previsão do tempo na ordem da
 * TV.
 *
 * Atualização: INICIAR_AQUI preenche só se o slide estiver vazio (como Tempo
 * e Cheias); quem atualiza é ATUALIZAR_CHUVA_MES, num acionador próprio
 * (CRIAR_GATILHO_CHUVA, a cada 3 horas). Se a Open-Meteo falhar, o slide
 * atual fica na TV.
 */

// Escrito aqui, e não lido de outro arquivo: este arquivo carrega antes de
// Config.gs (CLAUDE.md, lição 7).
const _CHV_FAIXAS_ = [   // da mais forte para a mais fraca; abaixo de 0,5 mm/h = seco
  { min: 10,  nome: 'Forte',    faixa: '> 10',     cor: '#1E3A8A' },
  { min: 2.5, nome: 'Moderada', faixa: '2,5–10',   cor: '#0284C7' },
  { min: 0.5, nome: 'Leve',     faixa: '0,5–2,5',  cor: '#7DD3FC' }
];
const _CHV_COR_SECO_     = '#E6ECF3';
const _CHV_COR_SEM_DADO_ = '#CBD5E1';
const _CHV_TURNOS_ = [
  { sigla: 'M', nome: 'manhã', inicio: 6 },    // 6h–12h
  { sigla: 'T', nome: 'tarde', inicio: 12 },   // 12h–18h
  { sigla: 'N', nome: 'noite', inicio: 18 }    // 18h–6h do dia seguinte
];
// Os mesmos trechos da apresentação mensal (CHUVA_TERMOS_IMPACTO), sem acento
// e minúsculos. "chuva" não pega "chuveiro" (hidráulica, não clima).
const _CHV_TERMOS_ = ['chuva', 'infiltr', 'goteir', 'alag', 'inund', 'enchent',
                      'calha', 'temporal', 'vendaval', 'transbord'];
const _CHV_DIA_CHUVOSO_MM_ = 1;   // convenção do INMET
const _CHV_ANOS_MEDIA_ = 10, _CHV_ANOS_MEDIA_MIN_ = 5;


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function ATUALIZAR_CHUVA_MES()          { return _tvChuva_(UNITS); }
function ATUALIZAR_CHUVA_MES_CURITIBA() { return _tvChuva_([_tvUnidade_('CURITIBA')]); }
function ATUALIZAR_CHUVA_MES_ITAJAI()   { return _tvChuva_([_tvUnidade_('ITAJA')]); }
function ATUALIZAR_CHUVA_MES_ESTEIO()   { return _tvChuva_([_tvUnidade_('ESTEIO')]); }

function CRIAR_GATILHO_CHUVA() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'ATUALIZAR_CHUVA_MES') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ATUALIZAR_CHUVA_MES').timeBased().everyHours(3).create();
  Logger.log('✅ Gatilho criado: chuva do mês atualizada a cada 3 horas.');
}

// Último slide do deck (depois do Webdox, quando há portal).
function _chuvaIndice_(unit) {
  return 6 + (unit.metas || []).length + (unit.cheiasSheetId ? 1 : 0) + (unit.portalEmpreendimento ? 2 : 0);
}

function _tvChuva_(unidades) {
  unidades.forEach((unit, i) => {
    if (i > 0) Utilities.sleep(1500);   // não dispara as consultas em rajada
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const idx = _chuvaIndice_(unit);
      // Slide que falta é acrescentado no fim — nunca no meio, que empurraria
      // os outros (o gerarApresentacao acerta a contagem do resto).
      while (slides.length <= idx) { deck.appendSlide(SlidesApp.PredefinedLayout.BLANK); slides = deck.getSlides(); }
      atualizarSlideChuva(slides[idx], unit);
    } catch (e) {
      Logger.log('❌ Chuva do mês (' + unit.name + '): ' + e.message);
    }
  });
}


// ==========================================
// SLIDE
// ==========================================
function atualizarSlideChuva(slide, unit) {
  const d = obterChuvaMes_(unit);
  if (!d.celulas) {
    Logger.log('✗ Chuva do mês (' + unit.name + '): a Open-Meteo não respondeu.');
    if (slide.getPageElements().length) { Logger.log('  · slide atual preservado na TV.'); return; }
  }
  slide.getPageElements().forEach(el => el.remove());
  try {
    _chvDesenhar_(slide, unit, d);
    Logger.log('✅ Chuva do mês (' + unit.name + '): ' + (d.total == null ? '—' : _chvMm_(d.total) + ' mm') +
               ', ' + d.impactos.length + ' chamado(s) ligado(s) à chuva');
  } catch (e) {
    Logger.log('✗ Chuva do mês — desenho (' + unit.name + '): ' + e.message + '\n' + (e.stack || ''));
    slide.getPageElements().forEach(el => el.remove());
    applyBrandHeaderAndBackground(slide, 'Chuva do mês', 'falha ao desenhar', '', unit, { dataLabel: ' ' });
    _tvTexto_(slide, 30, 180, 660, 30, 'Falha ao desenhar o slide de chuva: ' + e.message,
      { fs: 11, fsMin: 7, cor: CR_DESIGN_SYSTEM.colors.accentRed, align: 'C', cortar: true });
  }
}


// ==========================================
// DADOS
// ==========================================
function obterChuvaMes_(unit) {
  const tz = 'America/Sao_Paulo', agora = new Date();
  const hojeIso = Utilities.formatDate(agora, tz, 'yyyy-MM-dd');
  const agoraHora = Utilities.formatDate(agora, tz, "yyyy-MM-dd'T'HH:00");
  const ano = +hojeIso.substr(0, 4), mes = +hojeIso.substr(5, 2) - 1, hoje = +hojeIso.substr(8, 2);
  const nDias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const local = '?latitude=' + unit.weather.lat + '&longitude=' + unit.weather.lon + '&timezone=America%2FSao_Paulo';

  const r = { ano: ano, mes: mes, hoje: hoje, nDias: nDias, horaAgora: +agoraHora.substr(11, 2),
              nomeMes: MESES_POR_EXTENSO[mes], celulas: null, total: null, diasChuva: null, pico: null,
              media: null, impactos: [] };

  // 1) Hora a hora desde o dia 1º até agora (o dia anterior entra junto: a
  //    madrugada do dia 1º é a noite do mês passado e é descartada).
  const h = _chvBuscar_('https://api.open-meteo.com/v1/forecast' + local +
                        '&hourly=precipitation&past_days=' + hoje + '&forecast_days=1');
  if (h && h.hourly && h.hourly.time) Object.assign(r, _chvSerieHoraria_(h.hourly, ano, mes, nDias, agoraHora));

  // 2) Média dos 10 anos anteriores no MESMO período (dia 1 até hoje).
  const a = _chvBuscar_('https://archive-api.open-meteo.com/v1/archive' + local +
                        '&start_date=' + _chvIso_(ano - _CHV_ANOS_MEDIA_, mes, 1) +
                        '&end_date=' + _chvIso_(ano - 1, mes, new Date(Date.UTC(ano - 1, mes + 1, 0)).getUTCDate()) +
                        '&daily=precipitation_sum');
  if (a && a.daily && a.daily.time) r.media = _chvMediaPeriodo_(a.daily, mes, hoje);

  // 3) Chamados do mês ligados à chuva (BD-CORRETIVAS).
  r.impactos = _chvImpactos_(unit, ano, mes);
  return r;
}

function _chvBuscar_(url) {
  for (let t = 0; t < 2; t++) {
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) return JSON.parse(resp.getContentText());
      Logger.log('Chuva do mês: Open-Meteo HTTP ' + resp.getResponseCode() + ' (' + url + ')');
    } catch (e) {
      Logger.log('Chuva do mês: ' + e.message);
    }
    if (t === 0) Utilities.sleep(1500);
  }
  return null;
}

// celulas[dia-1][turno] = maior mm/h do turno (0 = seco; null = sem dado ou
// ainda não chegou). O total do mês e os dias com chuva são do calendário
// (meia-noite a meia-noite); o turno da noite vai das 18h às 6h do dia
// seguinte, como no slide mensal.
function _chvSerieHoraria_(hourly, ano, mes, nDias, agoraHora) {
  const celulas = [], porDia = [];
  for (let d = 0; d < nDias; d++) { celulas.push([null, null, null]); porDia.push(null); }
  let total = null, pico = null;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = String(hourly.time[i]);
    if (t > agoraHora) break;   // o resto é previsão, não chuva que caiu
    const v = hourly.precipitation[i];
    if (v === null || v === undefined || isNaN(v)) continue;
    if (+t.substr(0, 4) !== ano || +t.substr(5, 2) - 1 !== mes) continue;
    const dia = +t.substr(8, 2), hora = +t.substr(11, 2), mm = Number(v);

    total = (total || 0) + mm;
    porDia[dia - 1] = (porDia[dia - 1] || 0) + mm;

    let d = dia, turno;
    if (hora < 6) { if (dia === 1) continue; d = dia - 1; turno = 2; }
    else turno = hora < 12 ? 0 : (hora < 18 ? 1 : 2);
    const atual = celulas[d - 1][turno];
    celulas[d - 1][turno] = atual === null ? mm : Math.max(atual, mm);
    if (!pico || mm > pico.valor) pico = { valor: mm, dia: d, turno: turno };
  }
  if (total === null) return {};   // nenhuma hora do mês: trata como falha
  return {
    celulas: celulas, total: total, pico: pico && pico.valor > 0 ? pico : null,
    diasChuva: porDia.filter(x => x !== null && x >= _CHV_DIA_CHUVOSO_MM_).length
  };
}

// Média, nos anos com os dias 1..hoje completos, da chuva do dia 1 até hoje
// no mesmo mês. null com menos de 5 anos (número instável).
function _chvMediaPeriodo_(daily, mes, hoje) {
  const anos = {};
  for (let i = 0; i < daily.time.length; i++) {
    const t = String(daily.time[i]);
    if (+t.substr(5, 2) - 1 !== mes || +t.substr(8, 2) > hoje) continue;
    const v = daily.precipitation_sum[i];
    if (v === null || v === undefined || isNaN(v)) continue;
    const a = t.substr(0, 4);
    if (!anos[a]) anos[a] = { soma: 0, n: 0 };
    anos[a].soma += Number(v);
    anos[a].n++;
  }
  const completos = Object.keys(anos).filter(a => anos[a].n === hoje);
  if (completos.length < _CHV_ANOS_MEDIA_MIN_) return null;
  return completos.reduce((s, a) => s + anos[a].soma, 0) / completos.length;
}

// Chamados do mês cuja descrição fala de chuva, no dia e turno da Data de
// reporte (madrugada = noite do dia anterior; sem hora = manhã do dia).
function _chvImpactos_(unit, ano, mes) {
  let itens = [];
  try { itens = _tvItensUnidade_(BD_ABA_CORRETIVAS, unit); }
  catch (e) { Logger.log('Chuva do mês: BD-CORRETIVAS indisponível (' + e.message + ').'); return []; }

  const saida = [];
  itens.forEach(it => {
    let dt = it.dtReporte;
    if (!dt) return;
    const txt = _histNorm_(it.descricao);
    const termo = _CHV_TERMOS_.find(p => txt.indexOf(p) >= 0);
    if (!termo) return;
    // As datas da BD vêm como hora de parede em UTC (_histParseDataHora_).
    const hh = dt.getUTCHours();
    const semHora = hh === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0;
    let turno;
    if (semHora) turno = 0;
    else if (hh < 6) { turno = 2; dt = new Date(dt.getTime() - 86400000); }
    else turno = hh < 12 ? 0 : (hh < 18 ? 1 : 2);
    if (dt.getUTCFullYear() !== ano || dt.getUTCMonth() !== mes) return;
    saida.push({ dia: dt.getUTCDate(), turno: turno, id: it.id, descricao: it.descricao, termo: termo,
                 prioridade: it.prioridade || '', dtReporte: it.dtReporte, dtFechado: it.dtFechado,
                 fechado: _bdChamadoFechado_(it.estado, it.dtFechado) });
  });
  // Em aberto primeiro; dentro de cada grupo, o mais recente primeiro.
  saida.sort((a, b) => (a.fechado - b.fechado) || (b.dtReporte - a.dtReporte));
  return saida;
}

function _chvClasse_(mmh) {
  if (mmh === null || mmh === undefined) return null;
  return _CHV_FAIXAS_.find(f => mmh >= f.min) || null;
}

function _chvIso_(ano, mes, dia) {
  const d = new Date(Date.UTC(ano, mes, dia));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

// 142 → "142"; 6,46 → "6,5" (abaixo de 10 mm a casa decimal ainda diz algo).
function _chvMm_(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (Math.abs(v) < 10) return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  return formatarNumeroBR(Math.round(v));
}

// Intensidade sempre com uma casa: 9,96 mm/h arredondado para "10" pareceria forte.
function _chvMmh_(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }

// Turno que ainda não começou (fica vazado no anel).
function _chvFuturo_(d, dia, turno) {
  if (dia !== d.hoje) return dia > d.hoje;
  return d.horaAgora < _CHV_TURNOS_[turno].inicio;
}

// Chuva do período contra a média: "▲ 23% acima da média" etc.
function _chvComparacao_(d) {
  if (d.total == null || !d.media) return null;
  const pct = Math.round((d.total / d.media - 1) * 100);
  if (Math.abs(pct) < 5) return 'na média de 10 anos';
  return (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% ' + (pct > 0 ? 'acima' : 'abaixo') + ' da média de 10 anos';
}


// ==========================================
// DESENHO
// ==========================================
function _chvDesenhar_(slide, unit, d) {
  const DS = CR_DESIGN_SYSTEM;
  const hora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM HH:mm');
  const comp = _chvComparacao_(d);
  applyBrandHeaderAndBackground(slide, 'Chuva do mês',
    d.total == null ? 'sem dado de chuva no momento'
                    : _chvMm_(d.total) + ' mm em ' + d.nomeMes + (comp ? ' · ' + comp : ''),
    hora, unit, { dataLabel: 'Atualizado: ' + hora });
  const c = DS.colors, fT = DS.typography.titles;

  _chvAnel_(slide, 30, 84, 290, 294, d);

  // Quatro números, 2 × 2
  const kx = 330, kw = 175, kh = 58, kg = 10;
  const pico = d.pico, cls = pico ? _chvClasse_(pico.valor) : null;
  const ddmm = dia => String(dia).padStart(2, '0') + '/' + String(d.mes + 1).padStart(2, '0');
  const abertos = d.impactos.filter(i => !i.fechado).length;
  _tvKpi_(slide, kx, 84, kw, kh, { rotulo: 'Chuva no mês', destaque: true, fsValor: 20,
    valor: d.total == null ? '—' : _chvMm_(d.total) + ' mm',
    sub: d.media ? 'média 1 a ' + d.hoje + ': ' + _chvMm_(d.media) + ' mm' : 'sem média histórica' });
  _tvKpi_(slide, kx + kw + kg, 84, kw, kh, { rotulo: 'Dias com chuva', fsValor: 20,
    valor: d.diasChuva == null ? '—' : d.diasChuva + ' de ' + d.hoje, sub: 'dias com 1 mm ou mais' });
  _tvKpi_(slide, kx, 150, kw, kh, { rotulo: 'Pico de intensidade', fsValor: 20,
    valor: pico ? _chvMmh_(pico.valor) + ' mm/h' : '—',
    sub: pico ? ddmm(pico.dia) + ' · ' + _CHV_TURNOS_[pico.turno].nome + (cls ? ' · ' + cls.nome.toLowerCase() : '')
              : 'sem chuva no mês' });
  _tvKpi_(slide, kx + kw + kg, 150, kw, kh, { rotulo: 'Chamados ligados à chuva', fsValor: 20,
    valor: d.impactos.length,
    sub: !d.impactos.length ? 'nenhum no mês' : (abertos ? abertos + ' em aberto' : 'todos fechados'),
    corSub: abertos ? c.accentOrange : c.accentGreen });

  _chvChamados_(slide, kx, 216, 360, 162, d);

  _tvRodape_(slide, 'Fonte: Open-Meteo (chuva hora a hora até agora; média de 10 anos: arquivo ERA5) · ' +
                    'chamados: BD-CORRETIVAS, descrição com chuva, infiltração, goteira, alagamento…');
}

function _chvBola_(slide, x, y, diam, cor, borda) {
  const b = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x - diam / 2, y - diam / 2, diam, diam);
  if (cor) b.getFill().setSolidFill(cor); else b.getFill().setTransparent();
  if (borda) b.getBorder().setWeight(0.75).getLineFill().setSolidFill(borda);
  else b.getBorder().setTransparent();
  return b;
}

// Anel: slot 0 (no topo) leva as letras M/T/N; dia 1 começa logo à direita.
function _chvAnel_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors, fT = DS.typography.titles, fB = DS.typography.body;
  const y0 = _tvCard_(slide, x, y, w, h, 'Chuva por turno · ' + d.nomeMes);
  const legendaY = y + h - 34;
  const cx = x + 2 + w / 2, cy = (y0 + legendaY) / 2;
  const raio = Math.min((legendaY - y0) / 2, (w - 16) / 2);
  const rRotulo = raio - 7;
  const raios = [rRotulo - 16, rRotulo - 29, rRotulo - 42];   // manhã (fora), tarde, noite (dentro)
  const slots = d.nDias + 1;
  const ang = s => -Math.PI / 2 + 2 * Math.PI * s / slots;
  const diam = Math.max(5, Math.min(9.5, 2 * Math.PI * raios[2] / slots - 3));

  raios.forEach(r => _chvBola_(slide, cx, cy, r * 2, null, c.lines));

  const cel = d.celulas;
  for (let dia = 1; dia <= d.nDias; dia++) {
    const a = ang(dia), cos = Math.cos(a), sin = Math.sin(a);
    for (let t = 0; t < 3; t++) {
      const px = cx + raios[t] * cos, py = cy + raios[t] * sin;
      if (_chvFuturo_(d, dia, t)) { _chvBola_(slide, px, py, diam * 0.7, c.cardBg, c.lines); continue; }
      const v = cel ? cel[dia - 1][t] : null;
      if (v === null) { _chvBola_(slide, px, py, diam, c.cardBg, _CHV_COR_SEM_DADO_); continue; }
      const k = _chvClasse_(v);
      _chvBola_(slide, px, py, diam, k ? k.cor : _CHV_COR_SECO_, null);
    }
    // Rótulo a cada 5 dias e no dia de hoje (31 números na TV viram ruído).
    if (dia === 1 || dia % 5 === 0 || dia === d.hoje) {
      const lx = cx + rRotulo * cos, ly = cy + rRotulo * sin, eHoje = dia === d.hoje;
      _tvTexto_(slide, lx - 14, ly - 6, 28, 12, String(dia),
        { fs: eHoje ? 8 : 7, bold: eHoje, cor: eHoje ? c.brandDark : c.textMuted, fonte: eHoje ? fT : fB, align: 'C' });
    }
  }
  _CHV_TURNOS_.forEach((tu, t) => {
    _tvTexto_(slide, cx - 12, cy - raios[t] - 6, 24, 12, tu.sigla,
      { fs: 7, bold: true, cor: c.brandMed, fonte: fT, align: 'C' });
  });

  // ✕ dos chamados ligados à chuva (um por ponto, mesmo com vários chamados).
  const marcados = {};
  d.impactos.forEach(im => {
    const k = im.dia + '|' + im.turno;
    if (marcados[k] || im.dia < 1 || im.dia > d.nDias) return;
    marcados[k] = true;
    const a = ang(im.dia), px = cx + raios[im.turno] * Math.cos(a), py = cy + raios[im.turno] * Math.sin(a);
    const s = diam / 2 + 1.5;
    [[px - s, py - s, px + s, py + s], [px - s, py + s, px + s, py - s]].forEach(q => {
      const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, q[0], q[1], q[2], q[3]);
      l.getLineFill().setSolidFill(c.accentRed);
      l.setWeight(2);
    });
  });

  // Miolo: o mês e até onde ele foi.
  const rm = raios[2] - diam;
  _tvTexto_(slide, cx - rm, cy - 16, rm * 2, 20, d.nomeMes,
    { fs: 15, fsMin: 9, bold: true, cor: c.brandDark, fonte: DS.typography.heading, align: 'C' });
  _tvTexto_(slide, cx - rm, cy + 3, rm * 2, 14, d.celulas ? 'dia ' + d.hoje + ' de ' + d.nDias : 'sem dado horário',
    { fs: 8, fsMin: 6.5, cor: d.celulas ? c.textBody : c.accentRed, fonte: fB, align: 'C' });

  _chvLegenda_(slide, x + 12, legendaY + 4, w - 20);
}

function _chvLegenda_(slide, x, y, w) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors, fB = DS.typography.body;
  const lh = 13, bola = 7;
  const item = (ix, iy, iw, texto) => _tvTexto_(slide, ix + bola + 1, iy, iw - bola - 1, lh, texto,
    { fs: 7, fsMin: 5.5, cor: c.textBody, fonte: fB });

  // Linha 1: as três faixas, da mais fraca para a mais forte.
  const faixas = _CHV_FAIXAS_.slice().reverse();
  const textos = faixas.map((f, i) => f.nome + ' ' + f.faixa + (i === faixas.length - 1 ? ' mm/h' : ''));
  const pesos = textos.map(s => s.length + 6), soma = pesos.reduce((a, b) => a + b, 0);
  let ix = x;
  faixas.forEach((f, i) => {
    const iw = w * pesos[i] / soma;
    _chvBola_(slide, ix + bola / 2, y + lh / 2, bola, f.cor, null);
    item(ix, y, iw, textos[i]);
    ix += iw;
  });

  // Linha 2: ✕ = chamado, vazado = ainda vem, e o horário dos turnos.
  const y2 = y + lh + 1, s = bola / 2;
  [[x, y2 + lh / 2 - s, x + bola, y2 + lh / 2 + s], [x, y2 + lh / 2 + s, x + bola, y2 + lh / 2 - s]].forEach(q => {
    const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, q[0], q[1], q[2], q[3]);
    l.getLineFill().setSolidFill(c.accentRed);
    l.setWeight(1.5);
  });
  item(x, y2, w * 0.36, 'chamado');
  _chvBola_(slide, x + w * 0.36 + bola / 2, y2 + lh / 2, bola * 0.8, c.cardBg, c.lines);
  item(x + w * 0.36, y2, w * 0.27, 'ainda vem');
  _tvTexto_(slide, x + w * 0.63, y2, w * 0.37, lh, 'M 6–12h · T 12–18h · N 18–6h',
    { fs: 7, fsMin: 5.5, bold: true, cor: c.brandMed, fonte: fB, align: 'R' });
}

// Lista dos chamados ligados à chuva (em aberto primeiro).
function _chvChamados_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors, fT = DS.typography.titles, fB = DS.typography.body;
  const y0 = _tvCard_(slide, x, y, w, h, 'Chamados ligados à chuva');
  const lista = d.impactos;
  if (!lista.length) {
    _tvTexto_(slide, x + 10, y0 + 30, w - 20, 22, 'Nenhum chamado ligado à chuva neste mês',
      { fs: 11, fsMin: 8, bold: true, cor: c.textBody, fonte: fT, align: 'C' });
    _tvTexto_(slide, x + 10, y0 + 52, w - 20, 16, 'procura chuva, infiltração, goteira, alagamento… na descrição',
      { fs: 8, fsMin: 6.5, italic: true, cor: c.textMuted, fonte: fB, align: 'C', cortar: true });
    return;
  }

  const rowH = 25, maisH = 12, base = y + h - 6;
  const cabem = lista.length * rowH <= base - y0 ? lista.length
              : Math.max(1, Math.floor((base - maisH - y0) / rowH));
  const ix = x + 10, iw = w - 18, pw = 76;
  const ddmm = dt => String(dt.getUTCDate()).padStart(2, '0') + '/' + String(dt.getUTCMonth() + 1).padStart(2, '0');

  lista.slice(0, cabem).forEach((im, i) => {
    const ry = y0 + i * rowH;
    if (i % 2 === 1) _tvRet_(slide, ix, ry, iw, rowH, c.zebra);
    _tvTexto_(slide, ix, ry, iw - pw - 4, 14, String(im.descricao || '').replace(/\s+/g, ' ').trim() || '(sem descrição)',
      { fs: 8.5, fsMin: 7, cor: c.textMain, fonte: fB, cortar: true });
    const quando = String(im.dia).padStart(2, '0') + '/' + String(d.mes + 1).padStart(2, '0') + ' · ' +
                   _CHV_TURNOS_[im.turno].nome;
    _tvTexto_(slide, ix, ry + 12, iw - pw - 4, 12,
      quando + (im.id ? ' · nº ' + im.id : '') + (im.prioridade ? ' · ' + im.prioridade : ''),
      { fs: 7, fsMin: 6, cor: c.textBody, fonte: fB, cortar: true });
    const py = ry + (rowH - 15) / 2;
    _tvRet_(slide, ix + iw - pw, py, pw, 15, im.fechado ? '#D1FAE5' : '#FFEDD5', { redondo: true });
    _tvTexto_(slide, ix + iw - pw, py, pw, 15, im.fechado ? 'Fechado ' + ddmm(im.dtFechado) : 'Em aberto',
      { fs: 7, fsMin: 6, bold: true, cor: im.fechado ? '#047857' : '#C2410C', fonte: fB, align: 'C' });
  });
  const resto = lista.length - cabem;
  if (resto > 0) {
    _tvTexto_(slide, x, base - maisH, w, maisH, '+ ' + resto + (resto === 1 ? ' chamado' : ' chamados'),
      { fs: 7.5, fsMin: 6, bold: true, cor: c.textBody, fonte: fB, align: 'C' });
  }
}
