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

function atualizarSlideTempo(slide, unit) {
  const ds = CR_DESIGN_SYSTEM;
  const hora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "HH:mm");
  const dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

  slide.getPageElements().forEach(el => el.remove());

  const clima = obterClima(unit.weather.lat, unit.weather.lon);

  const dataLabel = clima && clima.__fromCache
    ? `🕒 Última atualização: ${Utilities.formatDate(new Date(clima.__cacheTs), "America/Sao_Paulo", "HH:mm")} (cache)`
    : `🕒 Última atualização: ${hora}`;
  applyBrandHeaderAndBackground(slide, "Previsão do Tempo", unit.weather.cidade, dataHora, unit,
    { dataLabel });

  if (!clima || !clima.current || !clima.daily) {
    const txtErro = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 180, 620, 50);
    txtErro.getText().setText("⚠️ Previsão do tempo indisponível no momento.")
      .getTextStyle().setFontSize(16).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    txtErro.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  const cX = ds.layout.marginX;
  const fullW = 720 - (ds.layout.marginX * 2);
  const atual = clima.current;
  const infoAtual = descricaoTempo(atual.weather_code);
  const nomesDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

  // ==================================================
  // 1) CONDIÇÃO ATUAL: AGORA + CHUVA HOJE + VENTO + UMIDADE
  // ==================================================
  const startY = 96, cH = 96, cW = 300;
  const bgAtual = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, cW, cH);
  bgAtual.getFill().setSolidFill(ds.colors.cardBg); bgAtual.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const accAtual = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, 5, cH);
  accAtual.getFill().setSolidFill(ds.colors.brandLight); accAtual.getBorder().setTransparent();

  const lblAgora = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+8, cW-20, 18);
  lblAgora.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  lblAgora.getText().setText("AGORA").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const valTemp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+22, 170, 48);
  valTemp.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  valTemp.getText().setText(`${Math.round(atual.temperature_2m)}°C`)
    .getTextStyle().setFontSize(38).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandDark).setBold(true);

  const valIcone = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+185, startY+22, 100, 48);
  valIcone.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  valIcone.getText().setText(infoAtual.emoji).getTextStyle().setFontSize(34);
  valIcone.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const valDesc = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+72, cW-25, 18);
  valDesc.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  valDesc.getText().setText(`${infoAtual.desc} • Sensação: ${Math.round(atual.apparent_temperature)}°C`)
    .getTextStyle().setFontSize(11).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody).setBold(true);

  // Cards menores. O de Chuva Hoje fica em destaque (fundo azul claro).
  const renderInfoCard = (x, w, lbl, val, destaque) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, w, cH);
    bg.getFill().setSolidFill(destaque ? '#EFF6FF' : ds.colors.cardBg);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill(destaque ? ds.colors.brandLight : ds.colors.lines);
    const tLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x+10, startY+10, w-15, 18);
    tLbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tLbl.getText().setText(lbl).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    const tVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x+10, startY+36, w-15, 45);
    tVal.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tVal.getText().setText(val).getTextStyle().setFontSize(22).setFontFamily(ds.typography.titles).setForegroundColor(destaque ? ds.colors.brandLight : ds.colors.textMain).setBold(true);
  };

  const probHoje = clima.daily.precipitation_probability_max[0];
  renderInfoCard(360, 110, "🌧️ CHUVA HOJE", `${probHoje != null ? probHoje : 0}%`, true);
  renderInfoCard(479, 110, "💨 VENTO", `${Math.round(atual.wind_speed_10m)} km/h`, false);
  renderInfoCard(598, 110, "💧 UMIDADE", `${Math.round(atual.relative_humidity_2m)}%`, false);

  // ==================================================
  // 2) PRÓXIMOS DIAS (compacto: máx/mín + % + mm)
  // ==================================================
  const diasY = 198;
  const lblDias = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX, diasY, 300, 16);
  lblDias.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  lblDias.getText().setText("PRÓXIMOS DIAS").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const nDias = Math.min(5, clima.daily.time.length);
  const cardW = 115; const cardGap = (fullW - (nDias * cardW)) / Math.max(1, nDias - 1);
  const cardY = diasY + 17; const cardH = 82;

  for (let i = 0; i < nDias; i++) {
    const x = cX + i * (cardW + cardGap);
    const infoDia = descricaoTempo(clima.daily.weather_code[i]);
    const p = clima.daily.time[i].split('-');
    const nomeDia = i === 0 ? "HOJE" : nomesDias[new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay()];
    const prob = clima.daily.precipitation_probability_max[i];
    const mm = clima.daily.precipitation_sum[i];

    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, cardY, cardW, cardH);
    bg.getFill().setSolidFill(i === 0 ? '#EFF6FF' : ds.colors.cardBg);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill(i === 0 ? ds.colors.brandLight : ds.colors.lines);

    const tDia = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+3, cardW, 14);
    tDia.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tDia.getText().setText(nomeDia).getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(i === 0 ? ds.colors.brandLight : ds.colors.textBody).setBold(true);
    tDia.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tIco = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+16, cardW, 24);
    tIco.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tIco.getText().setText(infoDia.emoji).getTextStyle().setFontSize(18);
    tIco.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tMaxMin = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+40, cardW, 16);
    tMaxMin.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tMaxMin.getText().setText(`${Math.round(clima.daily.temperature_2m_max[i])}° / ${Math.round(clima.daily.temperature_2m_min[i])}°`)
      .getTextStyle().setFontSize(12).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
    tMaxMin.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tProb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+55, cardW, 14);
    tProb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tProb.getText().setText(`🌧️ ${prob != null ? prob : 0}%`)
      .getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandMed).setBold(true);
    tProb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tMm = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+67, cardW, 14);
    tMm.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tMm.getText().setText(`${fmtMm(mm)} mm`)
      .getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
    tMm.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ==================================================
  // 3) PRÓXIMAS HORAS (faixa horária)
  // ==================================================
  if (clima.hourly && clima.hourly.time && clima.hourly.time.length) {
    const horaAtualStr = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd'T'HH:00");
    let idx = clima.hourly.time.findIndex(t => t >= horaAtualStr);
    if (idx < 0) idx = 0;

    const horasY = 300;
    const lblHoras = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX, horasY, 300, 16);
    lblHoras.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lblHoras.getText().setText("PRÓXIMAS HORAS").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

    const nCols = 7, passo = 2;
    const colW = fullW / nCols;
    const colY = horasY + 18, colH = 48;

    for (let c = 0; c < nCols; c++) {
      const hi = idx + c * passo;
      if (hi >= clima.hourly.time.length) break;
      const x = cX + c * colW;
      const tstr = clima.hourly.time[hi]; // "YYYY-MM-DDTHH:00"
      const horaLbl = tstr.substring(11, 13) + "h";
      const infoH = descricaoTempo(clima.hourly.weather_code[hi]);
      const temp = Math.round(clima.hourly.temperature_2m[hi]);

      const box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, colY, colW - 6, colH);
      box.getFill().setSolidFill(c === 0 ? '#EFF6FF' : ds.colors.cardBg);
      box.getBorder().setWeight(1).getLineFill().setSolidFill(c === 0 ? ds.colors.brandLight : ds.colors.lines);

      const th = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, colY+3, colW-6, 13);
      th.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      th.getText().setText(horaLbl).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
      th.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      const ti = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, colY+14, colW-6, 20);
      ti.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      ti.getText().setText(infoH.emoji).getTextStyle().setFontSize(15);
      ti.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, colY+34, colW-6, 14);
      tt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      tt.getText().setText(`${temp}°`).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
      tt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  }
}
