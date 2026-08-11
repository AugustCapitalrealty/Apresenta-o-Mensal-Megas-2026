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
  UNITS.forEach(unit => {
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
// BUSCA OS DADOS NA API OPEN-METEO
// ==========================================
function obterClima(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
    `&timezone=America%2FSao_Paulo&forecast_days=5`;

  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) return null;
  return JSON.parse(resp.getContentText());
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
  applyBrandHeaderAndBackground(slide, "Previsão do Tempo", unit.weather.cidade, dataHora, unit,
    { dataLabel: `🕒 Última atualização: ${hora}` });

  const clima = obterClima(unit.weather.lat, unit.weather.lon);

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
  const nomesDiasFull = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  // ==================================================
  // 1) FAIXA DE ALERTA OPERACIONAL (baseada no volume de chuva previsto)
  // ==================================================
  let maxMm = 0, maxIdx = 0;
  for (let i = 0; i < clima.daily.time.length; i++) {
    const mm = clima.daily.precipitation_sum[i] || 0;
    if (mm > maxMm) { maxMm = mm; maxIdx = i; }
  }
  let diaAlerta;
  if (maxIdx === 0) diaAlerta = "hoje";
  else {
    const p = clima.daily.time[maxIdx].split('-');
    diaAlerta = nomesDiasFull[new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay()];
  }

  let alertaTxt, alertaBg, alertaBorda, alertaCor;
  if (maxMm > 20) {
    alertaTxt = `🔴 ALERTA OPERACIONAL: previsão de ${fmtMm(maxMm)} mm de chuva para ${diaAlerta}.`;
    alertaBg = '#FFF5F5'; alertaBorda = ds.colors.accentRed; alertaCor = ds.colors.accentRed;
  } else if (maxMm >= 5) {
    alertaTxt = `🟡 ATENÇÃO: chuva moderada prevista (${fmtMm(maxMm)} mm em ${diaAlerta}).`;
    alertaBg = '#FFFBEB'; alertaBorda = ds.colors.accentOrange; alertaCor = '#B45309';
  } else {
    alertaTxt = `🟢 SEM IMPACTO OPERACIONAL: sem chuva forte prevista nos próximos dias.`;
    alertaBg = '#ECFDF5'; alertaBorda = ds.colors.accentGreen; alertaCor = '#047857';
  }

  const alertaY = 96, alertaH = 24;
  const alertaBox = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, alertaY, fullW, alertaH);
  alertaBox.getFill().setSolidFill(alertaBg);
  alertaBox.getBorder().setWeight(1).getLineFill().setSolidFill(alertaBorda);
  const alertaT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX, alertaY, fullW, alertaH);
  alertaT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  alertaT.getText().setText(alertaTxt)
    .getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(alertaCor).setBold(true);
  alertaT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // ==================================================
  // 2) CONDIÇÃO ATUAL: AGORA + CHUVA HOJE + VENTO + UMIDADE
  // ==================================================
  const startY = 128, cH = 96, cW = 300;
  const bgAtual = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, cW, cH);
  bgAtual.getFill().setSolidFill(ds.colors.cardBg); bgAtual.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const accAtual = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, 5, cH);
  accAtual.getFill().setSolidFill(ds.colors.brandLight); accAtual.getBorder().setTransparent();

  const lblAgora = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+8, cW-20, 18);
  lblAgora.getText().setText("AGORA").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const valTemp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+22, 170, 48);
  valTemp.getText().setText(`${Math.round(atual.temperature_2m)}°C`)
    .getTextStyle().setFontSize(38).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandDark).setBold(true);

  const valIcone = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+185, startY+22, 100, 48);
  valIcone.getText().setText(infoAtual.emoji).getTextStyle().setFontSize(34);
  valIcone.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const valDesc = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+72, cW-25, 18);
  valDesc.getText().setText(`${infoAtual.desc} • Sensação: ${Math.round(atual.apparent_temperature)}°C`)
    .getTextStyle().setFontSize(11).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody).setBold(true);

  // Cards menores. O de Chuva Hoje fica em destaque (fundo azul claro).
  const renderInfoCard = (x, w, lbl, val, destaque) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, w, cH);
    bg.getFill().setSolidFill(destaque ? '#EFF6FF' : ds.colors.cardBg);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill(destaque ? ds.colors.brandLight : ds.colors.lines);
    const tLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x+10, startY+10, w-15, 18);
    tLbl.getText().setText(lbl).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    const tVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x+10, startY+36, w-15, 45);
    tVal.getText().setText(val).getTextStyle().setFontSize(22).setFontFamily(ds.typography.titles).setForegroundColor(destaque ? ds.colors.brandLight : ds.colors.textMain).setBold(true);
  };

  const probHoje = clima.daily.precipitation_probability_max[0];
  renderInfoCard(360, 110, "🌧️ CHUVA HOJE", `${probHoje != null ? probHoje : 0}%`, true);
  renderInfoCard(479, 110, "💨 VENTO", `${Math.round(atual.wind_speed_10m)} km/h`, false);
  renderInfoCard(598, 110, "💧 UMIDADE", `${Math.round(atual.relative_humidity_2m)}%`, false);

  // ==================================================
  // 3) PRÓXIMOS DIAS (compacto: máx/mín + % + mm)
  // ==================================================
  const diasY = 230;
  const lblDias = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX, diasY, 300, 16);
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
    tDia.getText().setText(nomeDia).getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(i === 0 ? ds.colors.brandLight : ds.colors.textBody).setBold(true);
    tDia.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tIco = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+16, cardW, 24);
    tIco.getText().setText(infoDia.emoji).getTextStyle().setFontSize(18);
    tIco.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tMaxMin = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+40, cardW, 16);
    tMaxMin.getText().setText(`${Math.round(clima.daily.temperature_2m_max[i])}° / ${Math.round(clima.daily.temperature_2m_min[i])}°`)
      .getTextStyle().setFontSize(12).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
    tMaxMin.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tProb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+55, cardW, 14);
    tProb.getText().setText(`🌧️ ${prob != null ? prob : 0}%`)
      .getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandMed).setBold(true);
    tProb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const tMm = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, cardY+67, cardW, 14);
    tMm.getText().setText(`${fmtMm(mm)} mm`)
      .getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
    tMm.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ==================================================
  // 4) PRÓXIMAS HORAS (faixa horária)
  // ==================================================
  if (clima.hourly && clima.hourly.time && clima.hourly.time.length) {
    const horaAtualStr = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd'T'HH:00");
    let idx = clima.hourly.time.findIndex(t => t >= horaAtualStr);
    if (idx < 0) idx = 0;

    const horasY = 332;
    const lblHoras = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX, horasY, 300, 16);
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
      th.getText().setText(horaLbl).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
      th.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      const ti = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, colY+14, colW-6, 20);
      ti.getText().setText(infoH.emoji).getTextStyle().setFontSize(15);
      ti.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, colY+34, colW-6, 14);
      tt.getText().setText(`${temp}°`).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
      tt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  }
}
