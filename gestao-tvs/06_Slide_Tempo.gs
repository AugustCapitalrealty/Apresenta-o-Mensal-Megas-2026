/**
 * ARQUIVO: 06_Slide_Tempo.gs
 * DESCRIÇÃO: Slide de Previsão do Tempo (Slide 6) com atualização INDEPENDENTE.
 *
 * COMO USAR:
 * 1. Execute CRIAR_GATILHO_TEMPO() uma única vez para agendar a atualização
 *    automática de hora em hora (ou crie o acionador manualmente em
 *    "Acionadores" apontando para ATUALIZAR_PREVISAO_TEMPO).
 * 2. A função ATUALIZAR_PREVISAO_TEMPO() mexe APENAS no slide 6 de cada TV,
 *    sem tocar nos slides de dados (que continuam sendo atualizados pelo
 *    gerarApresentacao normalmente).
 *
 * FONTE DOS DADOS: API Open-Meteo (gratuita, sem necessidade de chave).
 */

// ==========================================
// PONTO DE ENTRADA (usar no acionador de tempo)
// ==========================================
function ATUALIZAR_PREVISAO_TEMPO() {
  UNITS.forEach((unit, idx) => {
    // Espaça as chamadas à API entre as TVs para não disparar 3 requisições
    // em rajada (que pode ser barrada por rate-limit no IP do Google).
    if (idx > 0) Utilities.sleep(2000);
    Logger.log(`🌤️ Atualizando previsão do tempo: ${unit.name}`);
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();

      // Garante que o slide 6 existe (sem mexer nos demais)
      while (slides.length < 6) {
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = deck.getSlides();
      }

      atualizarSlideTempo(slides[5], unit);
      Logger.log(`✅ Tempo atualizado: ${unit.name}`);
    } catch (erro) {
      Logger.log(`❌ Erro ao atualizar tempo de ${unit.name}: ${erro.message}`);
    }
  });
}

// ==========================================
// CRIA O ACIONADOR AUTOMÁTICO (executar 1x)
// ==========================================
function CRIAR_GATILHO_TEMPO() {
  // Remove gatilhos antigos da mesma função para não duplicar
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'ATUALIZAR_PREVISAO_TEMPO') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ATUALIZAR_PREVISAO_TEMPO').timeBased().everyHours(1).create();
  Logger.log("✅ Gatilho criado: previsão do tempo será atualizada a cada 1 hora.");
}

// ==========================================
// BUSCA OS DADOS DO CLIMA
// Estratégia: Open-Meteo (melhor qualidade) -> MET Norway (reserva, infra
// diferente, sem limite diário por IP compartilhado) -> cache salvo.
// ==========================================
function obterClima(lat, lon) {
  const propKey = `clima_${lat}_${lon}`;
  const props = PropertiesService.getScriptProperties();

  const salvar = (dados) => {
    try {
      props.setProperty(propKey, JSON.stringify({ ts: Date.now(), dados: _enxugarClima(dados) }));
    } catch (e) { Logger.log(`⚠️ Não consegui salvar cache de clima: ${e.message}`); }
  };

  // 1) Open-Meteo
  const omParams = `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
    `&timezone=America%2FSao_Paulo&forecast_days=5`;

  const tentativas = 2;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = UrlFetchApp.fetch(`https://api.open-meteo.com/v1/forecast?${omParams}`, { muteHttpExceptions: true });
      const code = resp.getResponseCode();
      if (code === 200) {
        const dados = JSON.parse(resp.getContentText());
        if (dados && dados.current && dados.daily) { salvar(dados); return dados; }
      }
      Logger.log(`⚠️ Open-Meteo respondeu ${code} (tentativa ${i + 1}/${tentativas}): ${resp.getContentText().substring(0, 160)}`);
      // 429 = limite (diário) do IP compartilhado: não adianta insistir hoje.
      if (code === 429) break;
    } catch (e) {
      Logger.log(`⚠️ Falha na chamada à Open-Meteo (tentativa ${i + 1}/${tentativas}): ${e.message}`);
    }
    if (i < tentativas - 1) Utilities.sleep(1500);
  }

  // 2) MET Norway (reserva) — dado FRESCO de outra fonte.
  try {
    const alt = obterClimaMetNo(lat, lon);
    if (alt && alt.current && alt.daily) {
      Logger.log("ℹ️ Open-Meteo indisponível; usando MET Norway (dado novo).");
      salvar(alt);
      return alt;
    }
  } catch (e) {
    Logger.log(`⚠️ Falha no provedor reserva MET Norway: ${e.message}`);
  }

  // 3) Cache salvo (último dado bom de qualquer fonte).
  try {
    const salvo = props.getProperty(propKey);
    if (salvo) {
      const { ts, dados } = JSON.parse(salvo);
      Logger.log(`ℹ️ Usando previsão salva (de ${new Date(ts).toISOString()}) após falha das APIs.`);
      dados.__fromCache = true;
      dados.__cacheTs = ts;
      return dados;
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler cache de clima: ${e.message}`);
  }

  return null;
}

// ------- Provedor reserva: MET Norway (api.met.no) -------
// Gratuito, sem chave; exige um User-Agent identificando a aplicação.
function obterClimaMetNo(lat, lon) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}`;
  const resp = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'CapitalRealtyTV/1.0 (https://capitalrealty.com.br)' }
  });
  if (resp.getResponseCode() !== 200) {
    Logger.log(`⚠️ MET Norway respondeu ${resp.getResponseCode()}: ${resp.getContentText().substring(0, 160)}`);
    return null;
  }
  const j = JSON.parse(resp.getContentText());
  const ts = j.properties && j.properties.timeseries;
  if (!ts || !ts.length) return null;
  return _converterMetNo(ts);
}

// Converte o símbolo textual do MET Norway (ex.: "lightrain_day") no código
// WMO usado por descricaoTempo().
function _symbolParaWMO(sym) {
  if (!sym) return 3;
  const s = String(sym).replace(/_(day|night|polartwilight)$/, '');
  if (s.indexOf('thunder') >= 0) return 95;
  if (s.indexOf('snow') >= 0) return 73;
  if (s.indexOf('sleet') >= 0) return 66;
  if (s.indexOf('rainshowers') >= 0) return 80;
  if (s.indexOf('rain') >= 0) return 63;
  if (s.indexOf('fog') >= 0) return 45;
  if (s === 'cloudy' || s.indexOf('cloud') >= 0) return 3;
  if (s.indexOf('partlycloudy') >= 0) return 2;
  if (s.indexOf('fair') >= 0) return 1;
  if (s.indexOf('clearsky') >= 0 || s.indexOf('clear') >= 0) return 0;
  return 3;
}

// Monta a estrutura {current, hourly, daily} (mesmo formato da Open-Meteo)
// a partir da série temporal do MET Norway, no fuso de São Paulo.
function _converterMetNo(ts) {
  const tz = 'America/Sao_Paulo';
  const fmtH = d => Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:00");
  const fmtD = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');

  const first = ts[0];
  const inst0 = (first.data.instant && first.data.instant.details) || {};
  const n1_0 = first.data.next_1_hours || {};
  const sym0 = (n1_0.summary && n1_0.summary.symbol_code) ||
               (((first.data.next_6_hours || {}).summary || {}).symbol_code);

  const current = {
    temperature_2m: inst0.air_temperature,
    relative_humidity_2m: inst0.relative_humidity,
    apparent_temperature: inst0.air_temperature, // MET Norway não fornece sensação
    weather_code: _symbolParaWMO(sym0),
    wind_speed_10m: inst0.wind_speed != null ? inst0.wind_speed * 3.6 : 0, // m/s -> km/h
    precipitation: (n1_0.details || {}).precipitation_amount || 0
  };

  const hourly = { time: [], temperature_2m: [], weather_code: [], precipitation_probability: [] };
  const dias = {};

  ts.forEach(e => {
    const d = new Date(e.time);
    const inst = (e.data.instant && e.data.instant.details) || {};
    const n1 = e.data.next_1_hours;
    const n6 = e.data.next_6_hours;

    if (n1) {
      hourly.time.push(fmtH(d));
      hourly.temperature_2m.push(inst.air_temperature);
      hourly.weather_code.push(_symbolParaWMO(n1.summary && n1.summary.symbol_code));
      const p = (n1.details || {}).probability_of_precipitation;
      hourly.precipitation_probability.push(p != null ? p : null);
    }

    const ds = fmtD(d);
    if (!dias[ds]) dias[ds] = { max: -Infinity, min: Infinity, precip: 0, prob: null, symMid: null, symAny: null };
    const dd = dias[ds];
    if (inst.air_temperature != null) {
      dd.max = Math.max(dd.max, inst.air_temperature);
      dd.min = Math.min(dd.min, inst.air_temperature);
    }
    let precip = null, prob = null, sym = null;
    if (n1) { precip = (n1.details || {}).precipitation_amount; prob = (n1.details || {}).probability_of_precipitation; sym = n1.summary && n1.summary.symbol_code; }
    else if (n6) { precip = (n6.details || {}).precipitation_amount; prob = (n6.details || {}).probability_of_precipitation; sym = n6.summary && n6.summary.symbol_code; }
    if (precip != null) dd.precip += precip;
    if (prob != null) dd.prob = (dd.prob == null) ? prob : Math.max(dd.prob, prob);
    if (sym) {
      dd.symAny = dd.symAny || sym;
      const hh = Number(Utilities.formatDate(d, tz, 'HH'));
      if (hh >= 11 && hh <= 14) dd.symMid = sym;
    }
  });

  const chaves = Object.keys(dias).sort().slice(0, 5);
  const daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], precipitation_sum: [] };
  chaves.forEach(k => {
    const dd = dias[k];
    daily.time.push(k);
    daily.weather_code.push(_symbolParaWMO(dd.symMid || dd.symAny));
    daily.temperature_2m_max.push(dd.max === -Infinity ? null : dd.max);
    daily.temperature_2m_min.push(dd.min === Infinity ? null : dd.min);
    daily.precipitation_probability_max.push(dd.prob);
    daily.precipitation_sum.push(Math.round(dd.precip * 10) / 10);
  });

  return { current, hourly, daily, __fonte: 'metno' };
}

// Reduz o payload da API ao essencial p/ caber no limite de 9KB por
// propriedade do ScriptProperties (mantém ~48h de dados horários).
function _enxugarClima(d) {
  const out = { current: d.current, daily: d.daily };
  if (d.hourly && d.hourly.time) {
    const n = Math.min(48, d.hourly.time.length);
    const corta = a => Array.isArray(a) ? a.slice(0, n) : a;
    out.hourly = {
      time: d.hourly.time.slice(0, n),
      temperature_2m: corta(d.hourly.temperature_2m),
      weather_code: corta(d.hourly.weather_code),
      precipitation_probability: corta(d.hourly.precipitation_probability)
    };
  }
  return out;
}

// Tradução dos códigos WMO da Open-Meteo para PT-BR + ícone
function descricaoTempo(code) {
  if (code === 0) return { emoji: "☀️", desc: "Céu limpo" };
  if (code === 1) return { emoji: "🌤️", desc: "Predomínio de sol" };
  if (code === 2) return { emoji: "⛅", desc: "Parcialmente nublado" };
  if (code === 3) return { emoji: "☁️", desc: "Nublado" };
  if (code === 45 || code === 48) return { emoji: "🌫️", desc: "Neblina" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", desc: "Garoa" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", desc: "Chuva" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", desc: "Neve" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", desc: "Pancadas de chuva" };
  if (code === 85 || code === 86) return { emoji: "🌨️", desc: "Pancadas de neve" };
  if (code === 95) return { emoji: "⛈️", desc: "Tempestade" };
  if (code === 96 || code === 99) return { emoji: "⛈️", desc: "Tempestade c/ granizo" };
  return { emoji: "🌡️", desc: "Indefinido" };
}

// ==========================================
// DESENHA O SLIDE (limpa e redesenha só o slide 6)
// ==========================================
// Formata volume de chuva (mm) em pt-BR, compacto
function fmtMm(v) {
  const n = (v == null) ? 0 : v;
  if (n < 0.05) return "0";
  if (n % 1 === 0) return n.toString();
  return n.toFixed(1).replace('.', ',');
}

// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): a condição de
// agora no cartão cheio; chuva hoje, vento e umidade ao lado; embaixo os
// próximos dias e as próximas horas, cada um num painel.
function atualizarSlideTempo(slide, unit) {
  const hora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "HH:mm");
  const dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

  slide.getPageElements().forEach(el => el.remove());

  const clima = obterClima(unit.weather.lat, unit.weather.lon);
  const dataLabel = clima && clima.__fromCache
    ? `Última atualização: ${Utilities.formatDate(new Date(clima.__cacheTs), "America/Sao_Paulo", "HH:mm")} (cache)`
    : `Última atualização: ${hora}`;

  const ok = !!(clima && clima.current && clima.daily);
  const atual = ok ? clima.current : null;
  const infoAtual = ok ? descricaoTempo(atual.weather_code) : null;
  applyBrandHeaderAndBackground(slide, 'Previsão do tempo',
    ok ? `${unit.weather.cidade} · ${infoAtual.desc.toLowerCase()} · ${Math.round(atual.temperature_2m)}°C agora`
       : unit.weather.cidade,
    dataHora, unit, { dataLabel });
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;

  if (!ok) {
    _tvTexto_(slide, 30, 180, 660, 30, 'Previsão do tempo indisponível no momento.',
      { fs: 16, fsMin: 11, bold: true, cor: c.textBody, fonte: DS.typography.titles, align: 'C' });
    return;
  }

  const nomesDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const probHoje = clima.daily.precipitation_probability_max[0];
  const mmHoje = clima.daily.precipitation_sum ? clima.daily.precipitation_sum[0] : null;

  // Faixa de KPIs
  const kx = 30, ky = 84, kh = 64, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'Agora ' + infoAtual.emoji, valor: `${Math.round(atual.temperature_2m)}°C`,
    destaque: true, fsValor: 28, sub: `sensação de ${Math.round(atual.apparent_temperature)}°C` });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, { rotulo: 'Chuva hoje', valor: `${probHoje != null ? probHoje : 0}%`,
    fsValor: 28, sub: mmHoje != null ? `${fmtMm(mmHoje)} mm previstos` : 'chance de chuva' });
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, { rotulo: 'Vento', valor: `${Math.round(atual.wind_speed_10m)} km/h`,
    fsValor: 24, sub: 'a 10 m do chão' });
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Umidade', valor: `${Math.round(atual.relative_humidity_2m)}%`,
    fsValor: 28, sub: 'umidade relativa do ar' });

  // Próximos dias
  const dx = 30, dy = 158, dw = 660, dh = 116;
  const dcy = _tvCard_(slide, dx, dy, dw, dh, 'Próximos dias');
  const nDias = Math.min(5, clima.daily.time.length);
  const passoD = (dw - 28) / nDias;
  for (let i = 0; i < nDias; i++) {
    const x = dx + 14 + i * passoD;
    const info = descricaoTempo(clima.daily.weather_code[i]);
    const p = clima.daily.time[i].split('-');
    const nome = i === 0 ? 'HOJE' : nomesDias[new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay()];
    const prob = clima.daily.precipitation_probability_max[i];
    const mm = clima.daily.precipitation_sum[i];
    if (i === 0) _tvRet_(slide, x + 2, dcy - 2, passoD - 4, dy + dh - dcy - 6, c.brandTint, { redondo: true });
    _tvTexto_(slide, x, dcy, passoD, 16, nome,
      { fs: 10, fsMin: 8, bold: true, cor: i === 0 ? c.brandDark : c.textBody, fonte: DS.typography.titles, align: 'C' });
    const ico = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, dcy + 15, passoD, 24);
    ico.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    ico.getText().setText(info.emoji).getTextStyle().setFontSize(17);
    ico.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    _tvTexto_(slide, x, dcy + 39, passoD, 18, `${Math.round(clima.daily.temperature_2m_max[i])}° / ${Math.round(clima.daily.temperature_2m_min[i])}°`,
      { fs: 12.5, fsMin: 9, bold: true, cor: c.textMain, fonte: DS.typography.titles, align: 'C' });
    _tvTexto_(slide, x, dcy + 57, passoD, 15, `chuva ${prob != null ? prob : 0}% · ${fmtMm(mm)} mm`,
      { fs: 8.5, fsMin: 7, cor: c.textBody, fonte: DS.typography.body, align: 'C' });
  }

  // Próximas horas
  const hx = 30, hy = 282, hw = 660, hh = 94;
  const hcy = _tvCard_(slide, hx, hy, hw, hh, 'Próximas horas');
  if (clima.hourly && clima.hourly.time && clima.hourly.time.length) {
    const horaAtualStr = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd'T'HH:00");
    let idx = clima.hourly.time.findIndex(t => t >= horaAtualStr);
    if (idx < 0) idx = 0;
    const nCols = 7, passoH = 2, colW = (hw - 28) / nCols;
    for (let k = 0; k < nCols; k++) {
      const hi = idx + k * passoH;
      if (hi >= clima.hourly.time.length) break;
      const x = hx + 14 + k * colW;
      const info = descricaoTempo(clima.hourly.weather_code[hi]);
      _tvTexto_(slide, x, hcy - 2, colW, 15, clima.hourly.time[hi].substring(11, 13) + 'h',
        { fs: 9, fsMin: 7, bold: true, cor: k === 0 ? c.brandDark : c.textBody, fonte: DS.typography.titles, align: 'C' });
      const ico = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, hcy + 12, colW, 22);
      ico.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      ico.getText().setText(info.emoji).getTextStyle().setFontSize(14);
      ico.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      _tvTexto_(slide, x, hcy + 34, colW, 16, `${Math.round(clima.hourly.temperature_2m[hi])}°`,
        { fs: 11, fsMin: 8, bold: true, cor: c.textMain, fonte: DS.typography.titles, align: 'C' });
    }
  }

  _tvRodape_(slide, `Fonte: ${clima.__fonte === 'metno' ? 'MET Norway' : 'Open-Meteo'} · previsão para ${unit.weather.cidade}`);
}
