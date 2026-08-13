/**
 * GERADOR DE SLIDES — PREVISÃO DO TEMPO · Capital Realty
 * ───────────────────────────────────────────────────────
 * Gera 1 slide por cidade (Curitiba/PR, Itajaí/SC, Esteio/RS) com:
 *   • Condição atual (temperatura, descrição, umidade, vento, chuva)
 *   • Previsão de hoje até o Domingo desta semana
 *
 * Dados: API pública Open-Meteo (https://open-meteo.com) — sem chave.
 * Os slides gerados são marcados via nota (TAG_CLIMA) e substituídos
 * a cada atualização, preservando os demais slides da apresentação.
 *
 * Vincule este script à apresentação (Extensões → Apps Script) e use
 * o menu "🌤️ Previsão do Tempo" → "🔄 Atualizar previsão".
 */

// ─────────────────────────────────────────
// ► CONFIGURAÇÃO
// ─────────────────────────────────────────
const SLIDES_ID = '1isdNKs4liaXiDMtXX1Ket-mfwudznGL7EJaKTewWKos';
const TAG_CLIMA = '【CLIMA_AUTO】';

// A apresentação já possui banner fixo no layout? (mesmo padrão dos outros geradores)
const BANNER_EXISTENTE = true;
const ALTURA_BANNER    = 0.255; // fração da altura do slide ocupada pelo banner fixo

const CIDADES = [
  { nome: 'Curitiba', uf: 'PR', lat: -25.4284, lon: -49.2733 },
  { nome: 'Itajaí',   uf: 'SC', lat: -26.9078, lon: -48.6619 },
  { nome: 'Esteio',   uf: 'RS', lat: -29.8519, lon: -51.1842 },
];

// ─────────────────────────────────────────
// ► DESIGN SYSTEM · Capital Realty
// ─────────────────────────────────────────
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark:   '#151E49', brandMed:  '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD',
    bgSlide:     '#F8FAFC',  cardBg:    '#FFFFFF', textMain:   '#151E49', textBody:  '#475569',
    lines:       '#E2E8F0',  accentGreen:'#10B981', accentOrange:'#F97316', accentRed:'#EF4444',
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
};
const C  = CR_DESIGN_SYSTEM.colors;
const TY = CR_DESIGN_SYSTEM.typography;

// Códigos de tempo WMO → descrição PT-BR + ícone
const WMO = {
  0:  { d: 'Céu limpo',            i: '☀️' },
  1:  { d: 'Predominante limpo',   i: '🌤️' },
  2:  { d: 'Parcialmente nublado', i: '⛅' },
  3:  { d: 'Nublado',              i: '☁️' },
  45: { d: 'Neblina',              i: '🌫️' },
  48: { d: 'Neblina com geada',    i: '🌫️' },
  51: { d: 'Garoa leve',           i: '🌦️' },
  53: { d: 'Garoa',                i: '🌦️' },
  55: { d: 'Garoa intensa',        i: '🌧️' },
  61: { d: 'Chuva fraca',          i: '🌧️' },
  63: { d: 'Chuva',                i: '🌧️' },
  65: { d: 'Chuva forte',          i: '🌧️' },
  66: { d: 'Chuva congelante',     i: '🌧️' },
  67: { d: 'Chuva congelante',     i: '🌧️' },
  71: { d: 'Neve fraca',           i: '🌨️' },
  73: { d: 'Neve',                 i: '🌨️' },
  75: { d: 'Neve forte',           i: '❄️' },
  77: { d: 'Granizo fino',         i: '🌨️' },
  80: { d: 'Pancadas de chuva',    i: '🌦️' },
  81: { d: 'Pancadas de chuva',    i: '🌧️' },
  82: { d: 'Pancadas fortes',      i: '⛈️' },
  85: { d: 'Pancadas de neve',     i: '🌨️' },
  86: { d: 'Pancadas de neve',     i: '❄️' },
  95: { d: 'Trovoadas',            i: '⛈️' },
  96: { d: 'Trovoadas c/ granizo', i: '⛈️' },
  99: { d: 'Trovoadas c/ granizo', i: '⛈️' },
};
const DIAS_SEMANA_ABR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Quantos dias mostrar: de hoje até o Domingo desta semana (inclusive)
// Dom(0)=1, Seg(1)=7, Ter(2)=6, Qua(3)=5, Qui(4)=4, Sex(5)=3, Sáb(6)=2
function _diasAteDomingo() {
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var dow = hoje.getDay();
  return (dow === 0) ? 1 : (8 - dow);
}

// ═════════════════════════════════════════
// ► MENU
// ═════════════════════════════════════════
function onOpen() {
  try {
    SlidesApp.getUi()
      .createMenu('🌤️ Previsão do Tempo')
      .addItem('🔄 Atualizar previsão', 'atualizarPrevisao')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.message);
  }
}

// ═════════════════════════════════════════
// ► GERAÇÃO
// ═════════════════════════════════════════
function atualizarPrevisao() {
  try {
    var prs = SlidesApp.openById(SLIDES_ID);
    _removerSlidesPorTag(prs, TAG_CLIMA);

    // Busca todos os dados primeiro
    var dadosCidades = CIDADES.map(function(cidade) {
      return { cidade: cidade, clima: _buscarClima(cidade) };
    });

    // Slide resumo primeiro, depois um por cidade
    _gerarSlideResumo(prs, dadosCidades);
    dadosCidades.forEach(function(item) {
      _gerarSlideCidade(prs, item.cidade, item.clima);
    });

    _alert('✅ Previsão do tempo atualizada!\n\n' +
           '• Slide resumo (3 cidades)\n' +
           CIDADES.map(function(c) { return '• ' + c.nome + '/' + c.uf; }).join('\n'));
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO: ' + e.message);
  }
}

// Consulta a Open-Meteo: dados atuais + 8 dias (suficiente para cobrir a semana corrente)
function _buscarClima(cidade) {
  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude='  + cidade.lat
    + '&longitude=' + cidade.lon
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum'
    + '&timezone=America%2FSao_Paulo'
    + '&forecast_days=8';

  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Open-Meteo retornou HTTP ' + resp.getResponseCode() + ' para ' + cidade.nome);
  }
  return JSON.parse(resp.getContentText());
}

// Slide resumo com as 3 cidades lado a lado
function _gerarSlideResumo(prs, dadosCidades) {
  var SW = prs.getPageWidth();
  var SH = prs.getPageHeight();

  var numDias = _diasAteDomingo();
  var hoje    = new Date();
  hoje.setHours(0, 0, 0, 0);
  var dom     = new Date(hoje);
  dom.setDate(hoje.getDate() + numDias - 1);
  var periodoStr = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd')
    + ' a ' + Utilities.formatDate(dom, 'America/Sao_Paulo', 'dd/MM');

  var slide = prs.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getNotesPage().getSpeakerNotesShape().getText().setText(
    TAG_CLIMA + ' Resumo previsão do tempo (3 cidades) — gerado automaticamente.');

  // Fundo branco
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, SH);
  bg.getFill().setSolidFill('#FFFFFF');
  bg.getBorder().setTransparent();
  bg.sendToBack();

  // Banner
  var topo = _desenharBannerResumo(slide, SW, SH, periodoStr);
  var M    = SW * 0.018; // margem lateral enxuta para aproveitar toda a largura

  var gap   = SW * 0.014;
  var colW  = (SW - M * 2 - gap * 2) / 3;
  var cardY = topo + SH * 0.015;
  // Espaço disponível: do cardY até o rodapé (SH*0.92), com pequena margem
  var cardH = SH * 0.92 - cardY - SH * 0.01;

  // Cores de destaque por cidade — paleta de azuis do brandbook Capital Realty
  // Curitiba=brandDark, Itajaí=brandMed, Esteio=brandLight
  var CORES_CIDADE = [C.brandDark, C.brandMed, C.brandLight];

  dadosCidades.forEach(function(item, ci) {
    var cidade = item.cidade;
    var clima  = item.clima;
    var daily  = clima.daily || {};
    var atual  = clima.current || {};
    var wmoAt  = WMO[atual.weather_code] || { d: '—', i: '🌡️' };
    var corAcc = CORES_CIDADE[ci];
    var cx     = M + ci * (colW + gap);

    // Card principal da cidade
    _card(slide, cx, cardY, colW, cardH);

    // Faixa de cor no topo do card (cabeçalho colorido)
    var faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, cardY, colW, cardH * 0.22);
    faixa.getFill().setSolidFill(corAcc);
    faixa.getBorder().setTransparent();

    // Nome da cidade
    var nomeTb = slide.insertTextBox(cidade.nome.toUpperCase(),
      cx, cardY + cardH * 0.025, colW, cardH * 0.10);
    var tsNome = nomeTb.getText().getTextStyle();
    tsNome.setFontFamily(TY.titles); tsNome.setFontSize(17); tsNome.setBold(true);
    tsNome.setForegroundColor('#FFFFFF');
    nomeTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    nomeTb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(nomeTb);

    // UF
    var ufTb = slide.insertTextBox(cidade.uf, cx, cardY + cardH * 0.12, colW, cardH * 0.07);
    var tsUf = ufTb.getText().getTextStyle();
    tsUf.setFontFamily(TY.body); tsUf.setFontSize(12);
    tsUf.setForegroundColor('#FFFFFF');
    ufTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    _noFill(ufTb);

    // Ícone grande
    var ic = slide.insertTextBox(wmoAt.i, cx, cardY + cardH * 0.20, colW, cardH * 0.16);
    ic.getText().getTextStyle().setFontSize(32);
    ic.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    ic.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(ic);

    // Temperatura atual (grande)
    var tempTb = slide.insertTextBox(Math.round(atual.temperature_2m) + '°C',
      cx, cardY + cardH * 0.35, colW, cardH * 0.15);
    var tsTemp = tempTb.getText().getTextStyle();
    tsTemp.setFontFamily(TY.titles); tsTemp.setFontSize(30); tsTemp.setBold(true);
    tsTemp.setForegroundColor(C.brandDark);
    tempTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tempTb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tempTb);

    // Descrição do tempo
    var descTb = slide.insertTextBox(wmoAt.d, cx, cardY + cardH * 0.49, colW, cardH * 0.06);
    var tsDesc = descTb.getText().getTextStyle();
    tsDesc.setFontFamily(TY.body); tsDesc.setFontSize(10);
    tsDesc.setForegroundColor(C.textBody);
    descTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    _noFill(descTb);

    // Linha divisória
    var div = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
      cx + colW * 0.08, cardY + cardH * 0.57,
      cx + colW * 0.92, cardY + cardH * 0.57);
    div.getLineFill().setSolidFill(C.lines);
    div.setWeight(0.75);

    // Máx / mín do dia
    var tmax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : '--';
    var tmin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : '--';
    var mmTb = slide.insertTextBox(tmax + '° máx  /  ' + tmin + '° mín',
      cx, cardY + cardH * 0.585, colW, cardH * 0.06);
    var tsMm = mmTb.getText().getTextStyle();
    tsMm.setFontFamily(TY.body); tsMm.setFontSize(11);
    tsMm.setForegroundColor(C.textBody);
    mmTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    mmTb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(mmTb);

    // Mini linha da semana (hoje → domingo): dia (3 letras) + ícone + chuva
    var miniGap  = colW * 0.006;
    var miniW    = (colW - miniGap * (numDias - 1)) / numDias;
    var miniX0   = cx;
    var miniY    = cardY + cardH * 0.66;
    var miniH    = cardH * 0.32;

    var times = daily.time || [];
    for (var d = 0; d < numDias; d++) {
      var mx     = miniX0 + d * (miniW + miniGap);
      var partes = times[d] ? times[d].split('-') : [];
      var dt2    = partes.length === 3 ? new Date(+partes[0], +partes[1] - 1, +partes[2]) : new Date();
      var wmoD   = WMO[daily.weather_code ? daily.weather_code[d] : -1] || { i: '?' };
      var pp     = daily.precipitation_probability_max ? daily.precipitation_probability_max[d] : null;
      var ps     = daily.precipitation_sum ? daily.precipitation_sum[d] : null;
      var psTxt  = (ps != null) ? (Math.round(ps * 10) / 10).toString().replace('.', ',') + ' mm' : '— mm';
      var isHj   = (d === 0);

      // Mini fundo do dia
      var miniBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, mx, miniY, miniW, miniH);
      miniBg.getFill().setSolidFill(isHj ? corAcc : '#F1F5F9');
      miniBg.getBorder().setTransparent();

      // Dia (3 letras) — topo (hoje destacado pela cor do card)
      var diaNm  = DIAS_SEMANA_ABR[dt2.getDay()];
      var miniLb = slide.insertTextBox(diaNm, mx, miniY + miniH * 0.02, miniW, miniH * 0.22);
      var tsMnLb = miniLb.getText().getTextStyle();
      tsMnLb.setFontFamily(TY.titles); tsMnLb.setFontSize(7.5); tsMnLb.setBold(true);
      tsMnLb.setForegroundColor(isHj ? '#FFFFFF' : C.brandDark);
      miniLb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      miniLb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      _noFill(miniLb);

      // Ícone mini — meio
      var miniIc = slide.insertTextBox(wmoD.i, mx, miniY + miniH * 0.24, miniW, miniH * 0.30);
      miniIc.getText().getTextStyle().setFontSize(10);
      miniIc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      miniIc.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      _noFill(miniIc);

      // Probabilidade (%)
      var miniPp = slide.insertTextBox((pp != null ? pp : '—') + '%',
        mx, miniY + miniH * 0.54, miniW, miniH * 0.22);
      var tsPp = miniPp.getText().getTextStyle();
      tsPp.setFontFamily(TY.body); tsPp.setFontSize(7); tsPp.setBold(true);
      tsPp.setForegroundColor(isHj ? '#FFFFFF' : C.brandLight);
      miniPp.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      miniPp.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      _noFill(miniPp);

      // Precipitação acumulada (mm) — base
      var miniMm = slide.insertTextBox(psTxt, mx, miniY + miniH * 0.76, miniW, miniH * 0.22);
      var tsMm = miniMm.getText().getTextStyle();
      tsMm.setFontFamily(TY.titles); tsMm.setFontSize(6.5); tsMm.setBold(true);
      tsMm.setForegroundColor(isHj ? '#FFFFFF' : C.brandMed);
      miniMm.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      miniMm.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      _noFill(miniMm);
    }
  });

  // Rodapé
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var rod = slide.insertTextBox('Atualizado em ' + agora + '  ·  Fonte: Open-Meteo',
    M, SH * 0.93, SW * 0.5, SH * 0.05);
  var tsR = rod.getText().getTextStyle();
  tsR.setFontFamily(TY.body); tsR.setFontSize(9);
  tsR.setForegroundColor(C.textBody);
  _noFill(rod);
}

// Banner do slide resumo
function _desenharBannerResumo(slide, SW, SH, periodoStr) {
  var titulo = 'PREVISÃO DO TEMPO  ·  ' + periodoStr;

  if (BANNER_EXISTENTE) {
    var topo = SH * ALTURA_BANNER;
    var tb = slide.insertTextBox(titulo, SW * 0.045, topo + SH * 0.005, SW * 0.75, SH * 0.06);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(15); ts.setBold(true);
    ts.setForegroundColor(C.brandDark);
    _noFill(tb);
    return topo + SH * 0.07;
  }

  var bannerH = SH * 0.14;
  var banner  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, bannerH);
  banner.getFill().setSolidFill(C.brandDark);
  banner.getBorder().setTransparent();

  var tb2 = slide.insertTextBox(titulo, SW * 0.045, 0, SW * 0.8, bannerH);
  var ts2 = tb2.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(18); ts2.setBold(true);
  ts2.setForegroundColor('#FFFFFF');
  tb2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb2);
  return bannerH + SH * 0.01;
}

// Monta o slide de uma cidade
function _gerarSlideCidade(prs, cidade, clima) {
  var SW = prs.getPageWidth();
  var SH = prs.getPageHeight();

  var numDias = _diasAteDomingo(); // de hoje até domingo desta semana
  var daily   = clima.daily || {};
  var times   = daily.time || [];

  // Calcula o período exibido no banner
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var dom = new Date(hoje);
  dom.setDate(hoje.getDate() + numDias - 1);
  var periodoStr = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd')
    + ' a ' + Utilities.formatDate(dom, 'America/Sao_Paulo', 'dd/MM');

  var slide = prs.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getNotesPage().getSpeakerNotesShape().getText().setText(
    TAG_CLIMA + ' Previsão do tempo · ' + cidade.nome + '/' + cidade.uf + ' — gerado automaticamente.');

  // Fundo branco (sem cor)
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, SH);
  bg.getFill().setSolidFill('#FFFFFF');
  bg.getBorder().setTransparent();
  bg.sendToBack();

  var topo = _desenharBanner(slide, SW, SH, cidade, periodoStr);
  var M    = SW * 0.040;

  // ── Card "AGORA" (condição atual) — esquerda
  var atual  = clima.current || {};
  var wmoAt  = WMO[atual.weather_code] || { d: '—', i: '🌡️' };
  var cardX  = M;
  var cardY  = topo + SH * 0.025;
  var cardW  = SW * 0.22;
  var cardH  = SH * 0.55;

  _card(slide, cardX, cardY, cardW, cardH);

  // Rótulo "AGORA"
  var rotulo = slide.insertTextBox('AGORA', cardX, cardY + cardH * 0.04, cardW, cardH * 0.08);
  var tsRot  = rotulo.getText().getTextStyle();
  tsRot.setFontFamily(TY.titles); tsRot.setFontSize(9); tsRot.setBold(true);
  tsRot.setForegroundColor(C.brandMed);
  rotulo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  _noFill(rotulo);

  // Ícone + temperatura atual
  var icone = slide.insertTextBox(wmoAt.i, cardX, cardY + cardH * 0.13, cardW, cardH * 0.26);
  icone.getText().getTextStyle().setFontSize(36);
  icone.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  icone.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(icone);

  var temp = slide.insertTextBox(Math.round(atual.temperature_2m) + '°C',
    cardX, cardY + cardH * 0.38, cardW, cardH * 0.22);
  var tsT  = temp.getText().getTextStyle();
  tsT.setFontFamily(TY.titles); tsT.setFontSize(34); tsT.setBold(true);
  tsT.setForegroundColor(C.brandDark);
  temp.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  temp.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(temp);

  var desc = slide.insertTextBox(wmoAt.d, cardX, cardY + cardH * 0.59, cardW, cardH * 0.10);
  var tsD  = desc.getText().getTextStyle();
  tsD.setFontFamily(TY.body); tsD.setFontSize(10);
  tsD.setForegroundColor(C.textBody);
  desc.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  _noFill(desc);

  // Linha divisória
  var linha = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    cardX + cardW * 0.1, cardY + cardH * 0.71,
    cardX + cardW * 0.9, cardY + cardH * 0.71);
  linha.getLineFill().setSolidFill(C.lines);
  linha.setWeight(0.75);

  // Mini-estatísticas: umidade · vento · precipitação
  var stats = [
    { i: '💧', v: Math.round(atual.relative_humidity_2m) + '%', l: 'Umidade' },
    { i: '💨', v: Math.round(atual.wind_speed_10m) + ' km/h',   l: 'Vento' },
    { i: '🌧️', v: (atual.precipitation != null ? atual.precipitation : 0) + ' mm', l: 'Chuva' },
  ];
  var statW = cardW / 3;
  var statY = cardY + cardH * 0.73;
  stats.forEach(function(s, si) {
    var sx = cardX + si * statW;
    var tb = slide.insertTextBox(s.i + ' ' + s.v + '\n' + s.l, sx, statY, statW, cardH * 0.23);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.body); ts.setFontSize(8);
    ts.setForegroundColor(C.textBody);
    tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tb);
  });

  // ── Cards dos dias (hoje → domingo desta semana)
  var gridX  = cardX + cardW + SW * 0.022;
  var gridW  = SW - gridX - M;
  var gap    = gridW * 0.018;
  var diaW   = (gridW - gap * (numDias - 1)) / numDias;

  var labelSemana = 'ESTA SEMANA · ' + periodoStr.toUpperCase();
  var tituloDias  = slide.insertTextBox(labelSemana, gridX, cardY, gridW, SH * 0.045);
  var tsP = tituloDias.getText().getTextStyle();
  tsP.setFontFamily(TY.titles); tsP.setFontSize(10); tsP.setBold(true);
  tsP.setForegroundColor(C.brandMed);
  _noFill(tituloDias);

  var diaY = cardY + SH * 0.055;
  var diaH = cardH - SH * 0.055;

  for (var d = 0; d < numDias; d++) {
    var dx     = gridX + d * (diaW + gap);
    var partes = times[d] ? times[d].split('-') : [];
    var dt     = partes.length === 3 ? new Date(+partes[0], +partes[1] - 1, +partes[2]) : new Date();
    var wmoDia = WMO[daily.weather_code ? daily.weather_code[d] : -1] || { d: '—', i: '🌡️' };
    var isHoje = (d === 0);

    // Hoje recebe fundo suave
    _card(slide, dx, diaY, diaW, diaH, isHoje ? C.brandSoft : null);

    // Dia da semana + data
    var diaNome = isHoje ? 'HOJE' : DIAS_SEMANA_ABR[dt.getDay()];
    var cab = slide.insertTextBox(
      diaNome + '\n' + Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM'),
      dx, diaY + diaH * 0.03, diaW, diaH * 0.20);
    var tsC = cab.getText().getTextStyle();
    tsC.setFontFamily(TY.titles); tsC.setFontSize(9); tsC.setBold(true);
    tsC.setForegroundColor(C.brandDark);
    cab.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    cab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(cab);

    // Ícone
    var ic = slide.insertTextBox(wmoDia.i, dx, diaY + diaH * 0.24, diaW, diaH * 0.24);
    ic.getText().getTextStyle().setFontSize(18);
    ic.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    ic.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(ic);

    // Máx / mín
    var tmax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[d]) : '--';
    var tmin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[d]) : '--';

    var tMx  = slide.insertTextBox(tmax + '°', dx, diaY + diaH * 0.49, diaW, diaH * 0.14);
    var tsMx = tMx.getText().getTextStyle();
    tsMx.setFontFamily(TY.titles); tsMx.setFontSize(13); tsMx.setBold(true);
    tsMx.setForegroundColor(C.accentOrange);
    tMx.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tMx.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tMx);

    var tMn  = slide.insertTextBox(tmin + '°', dx, diaY + diaH * 0.63, diaW, diaH * 0.13);
    var tsMn = tMn.getText().getTextStyle();
    tsMn.setFontFamily(TY.titles); tsMn.setFontSize(11);
    tsMn.setForegroundColor(C.brandLight);
    tMn.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tMn.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tMn);

    // Probabilidade de chuva (%)
    var pp    = daily.precipitation_probability_max ? daily.precipitation_probability_max[d] : null;
    var chuva = slide.insertTextBox('💧 ' + (pp != null ? pp : '—') + '%',
      dx, diaY + diaH * 0.76, diaW, diaH * 0.12);
    var tsCh  = chuva.getText().getTextStyle();
    tsCh.setFontFamily(TY.body); tsCh.setFontSize(8.5);
    tsCh.setForegroundColor(C.textBody);
    chuva.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    chuva.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(chuva);

    // Precipitação acumulada (mm) — abaixo da probabilidade
    var ps    = daily.precipitation_sum ? daily.precipitation_sum[d] : null;
    var psTxt = (ps != null) ? (Math.round(ps * 10) / 10).toString().replace('.', ',') + ' mm' : '— mm';
    var prec  = slide.insertTextBox(psTxt, dx, diaY + diaH * 0.88, diaW, diaH * 0.12);
    var tsPr  = prec.getText().getTextStyle();
    tsPr.setFontFamily(TY.titles); tsPr.setFontSize(8.5); tsPr.setBold(true);
    tsPr.setForegroundColor(C.brandMed);
    prec.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    prec.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(prec);
  }

  // ── Rodapé
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var rod = slide.insertTextBox('Atualizado em ' + agora + '  ·  Fonte: Open-Meteo',
    M, SH * 0.93, SW * 0.6, SH * 0.05);
  var tsR = rod.getText().getTextStyle();
  tsR.setFontFamily(TY.body); tsR.setFontSize(9);
  tsR.setForegroundColor(C.textBody);
  _noFill(rod);
}

// Banner: usa o fixo do layout ou desenha o próprio; retorna o Y onde o conteúdo começa
function _desenharBanner(slide, SW, SH, cidade, periodoStr) {
  var titulo = cidade.nome.toUpperCase() + '/' + cidade.uf
    + '  ·  ' + periodoStr;

  if (BANNER_EXISTENTE) {
    var topo = SH * ALTURA_BANNER;
    var tb = slide.insertTextBox(titulo, SW * 0.045, topo + SH * 0.005, SW * 0.7, SH * 0.06);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(15); ts.setBold(true);
    ts.setForegroundColor(C.brandDark);
    _noFill(tb);
    return topo + SH * 0.07;
  }

  var bannerH = SH * 0.14;
  var banner  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, bannerH);
  banner.getFill().setSolidFill(C.brandDark);
  banner.getBorder().setTransparent();

  var tb2 = slide.insertTextBox(titulo, SW * 0.045, 0, SW * 0.8, bannerH);
  var ts2 = tb2.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(18); ts2.setBold(true);
  ts2.setForegroundColor('#FFFFFF');
  tb2.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb2);
  return bannerH + SH * 0.01;
}

// ─────────────────────────────────────────
// ► HELPERS
// ─────────────────────────────────────────
function _card(slide, x, y, w, h, bgHex) {
  var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(bgHex || C.cardBg);
  card.getBorder().setWeight(0.75);
  card.getBorder().getLineFill().setSolidFill(C.lines);
  return card;
}

function _removerSlidesPorTag(prs, tag) {
  prs.getSlides().forEach(function(s) {
    try {
      var notas = s.getNotesPage().getSpeakerNotesShape().getText().asString();
      if (notas.indexOf(tag) !== -1) s.remove();
    } catch (e) { /* slide sem notas */ }
  });
}

function _noFill(tb) {
  tb.getFill().setTransparent();
  tb.getBorder().setTransparent();
}

function _alert(msg) {
  try {
    SlidesApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
}
