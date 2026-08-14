/**
 * ARQUIVO: 08_Slide_Cheias.gs
 * DESCRIÇÃO: Slide de Monitoramento de Cheias (apenas TV Mega Esteio), com
 * atualização INDEPENDENTE — não interfere nos demais slides/TVs.
 *
 * COMO USAR:
 * 1. Execute CRIAR_GATILHO_CHEIAS() uma única vez para agendar a atualização
 *    automática de hora em hora.
 * 2. ATUALIZAR_MONITORAMENTO_CHEIAS() mexe APENAS no slide 8 da TV Mega Esteio.
 *
 * FONTE DOS DADOS: Planilha "AUTOMATICA - MONITORAMENTO DE CHEIAS EM ESTEIO/RS"
 * (gerada por equipamento de telemetria), aba gid=0.
 */

// ==========================================
// PONTO DE ENTRADA (usar no acionador de cheias)
// ==========================================
function ATUALIZAR_MONITORAMENTO_CHEIAS() {
  const unit = UNITS.find(u => u.cheiasSheetId);
  if (!unit) { Logger.log("⚠️ Nenhuma unidade com cheiasSheetId configurado."); return; }

  Logger.log(`🌊 Atualizando monitoramento de cheias: ${unit.name}`);
  try {
    const deck = SlidesApp.openById(unit.deckId);
    let slides = deck.getSlides();

    // Posição fixa: 6 slides base + 1 por papel em unit.metas (mesma regra do gerarApresentacao)
    const idxCheias = 6 + (unit.metas || []).length;

    while (slides.length < idxCheias + 1) {
      deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
      slides = deck.getSlides();
    }

    atualizarSlideCheias(slides[idxCheias], unit);
    Logger.log(`✅ Cheias atualizado: ${unit.name}`);
  } catch (erro) {
    Logger.log(`❌ Erro ao atualizar cheias de ${unit.name}: ${erro.message}\n${erro.stack || ''}`);
  }
}

// ==========================================
// CRIA O ACIONADOR AUTOMÁTICO (executar 1x)
// ==========================================
function CRIAR_GATILHO_CHEIAS() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'ATUALIZAR_MONITORAMENTO_CHEIAS') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ATUALIZAR_MONITORAMENTO_CHEIAS').timeBased().everyHours(1).create();
  Logger.log("✅ Gatilho criado: monitoramento de cheias será atualizado a cada 1 hora.");
}

// ==========================================
// LÊ OS DADOS NA PLANILHA DE TELEMETRIA
// ==========================================
function lerDadosCheias(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);

  // IMPORTANTE: usamos a aba de gid=0 (a do relatório), e NÃO getSheets()[0]
  // (índice 0), porque a ordem das abas pode diferir do gid — o índice 0 pode
  // ser a aba de log bruto, o que faria todas as leituras virem vazias.
  const aba = ss.getSheets().filter(s => s.getSheetId() === 0)[0] || ss.getSheets()[0];

  // Lê a grade inteira de uma vez (valores exibidos, já formatados).
  const grid = aba.getDataRange().getDisplayValues();
  const nRows = grid.length;

  // cell(r,c): 1-based, com proteção contra fora-de-limites.
  const cell = (r, c) => {
    const row = grid[r - 1];
    const val = row ? row[c - 1] : null;
    return val == null ? '' : String(val).trim();
  };

  // Procura a 1ª linha (1-based) cuja coluna `c` CONTENHA o texto (case-insensitive).
  const acharLinhaNaColuna = (c, texto) => {
    const alvo = texto.toUpperCase();
    for (let r = 0; r < nRows; r++) {
      const val = grid[r][c - 1];
      if (val && String(val).toUpperCase().indexOf(alvo) >= 0) return r + 1;
    }
    return -1;
  };

  // ----- Cabeçalho (data / última medição) -----
  const linhaData = acharLinhaNaColuna(3, 'DATA');
  const linhaMedicao = acharLinhaNaColuna(3, 'ÚLTIMA MEDI');
  const dataRef = linhaData > 0 ? cell(linhaData, 4) : '';
  const ultimaMedicao = linhaMedicao > 0 ? cell(linhaMedicao, 4) : '';

  // ----- Bloco dos rios (ancorado na linha de NOMES dos rios) -----
  // ATENÇÃO: a âncora precisa ser específica ("RIO DOS SINOS"), senão
  // "CAMPO BOM" também casa com a linha de temperatura ("Temperatura Atual
  // em Campo Bom"), que fica acima e jogaria todas as leituras para cima.
  // Layout relativo (confirmado na planilha):
  //   nível atual: linhaNomes-5 | ano passado: linhaNomes-1
  //   tendências : linhaNomes+2 | oscilações : linhaNomes+4
  const linhaNomes = acharLinhaNaColuna(3, 'RIO DOS SINOS - CAMPO BOM');
  const base = linhaNomes > 0 ? linhaNomes : 12; // fallback p/ layout conhecido
  const rNivel = base - 5, rAno = base - 1, rTend = base + 2, rOsc = base + 4;

  // Por rio: colunas {nivel, t7h30, t3h, oscUltima, oscDiaAnterior}
  const rio = (nomeFixo, col) => ({
    nome: nomeFixo,
    nivelAtual: cell(rNivel, col.nivel),
    anoPassado: cell(rAno, col.nivel),
    tendencia7h30: cell(rTend, col.t7),
    tendencia3h: cell(rTend, col.t3),
    oscUltima: cell(rOsc, col.oscU),
    oscDiaAnterior: cell(rOsc, col.oscD)
  });

  const rios = [
    rio("RIO DOS SINOS - CAMPO BOM",        { nivel: 3,  t7: 3,  t3: 6,  oscU: 3,  oscD: 5  }),
    rio("RIO DOS SINOS - SÃO LEOPOLDO",     { nivel: 9,  t7: 9,  t3: 12, oscU: 9,  oscD: 12 }),
    rio("RIO GUAÍBA GASÔMETRO - PORTO ALEGRE", { nivel: 15, t7: 15, t3: 18, oscU: 15, oscD: 18 })
  ];

  // ----- Canal de Drenagem (aba "BASE - PLUVIOMETRO": col U = data, col V = valor) -----
  // Os dados vêm ordenados por data decrescente, então a linha 2 é a leitura
  // mais recente. Lê-se de uma aba SEPARADA do mesmo arquivo.
  let canalDrenagem = '', canalData = '';
  try {
    const abaPluv = ss.getSheets().filter(s => s.getName() === 'BASE - PLUVIOMETRO')[0];
    if (abaPluv && abaPluv.getLastRow() >= 2) {
      const u = abaPluv.getRange(2, 21).getValue();        // coluna U (data)
      const v = abaPluv.getRange(2, 22).getDisplayValue(); // coluna V (valor)
      const nivel = parseNivelM(v);
      canalDrenagem = (nivel != null) ? fmtMetros(nivel) : String(v || '').trim();
      if (u instanceof Date) {
        canalData = Utilities.formatDate(u, 'America/Sao_Paulo', 'dd/MM/yyyy');
      } else if (typeof u === 'number' && u > 40000) {
        // fallback: serial de planilha -> data
        const d = new Date(Math.round((u - 25569) * 86400000));
        canalData = Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
      } else {
        canalData = String(u || '').trim();
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler canal de drenagem (BASE - PLUVIOMETRO): ${e.message}`);
  }

  return { dataRef, ultimaMedicao, canalDrenagem, canalData, rios };
}

// Converte um nível tipo "2,13 m" em número (2.13). Retorna null se não houver.
function parseNivelM(texto) {
  if (!texto) return null;
  const m = String(texto).match(/(-?\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

// Formata metros em pt-BR com 2 casas: 7.2 -> "7,20 m"
function fmtMetros(n) {
  return (n == null) ? "N/D" : `${n.toFixed(2).replace('.', ',')} m`;
}

// Cor de risco conforme proporção nível/cota de inundação.
function corRiscoCheia(ratio, ds) {
  if (ratio == null) return ds.colors.textBody;
  if (ratio >= 0.90) return ds.colors.accentRed;
  if (ratio >= 0.70) return ds.colors.accentOrange;
  return ds.colors.accentGreen;
}

// Extrai direção + velocidade de um texto de tendência, ex.:
// "O nível do rio está descendo a uma velocidade de 0,80 cm por hora" -> "⬇️ 0,80 cm/h"
function condensarTendencia(texto) {
  if (!texto) return "—";
  let icone = "➡️";
  if (texto.indexOf("subindo") >= 0) icone = "⬆️";
  else if (texto.indexOf("descendo") >= 0) icone = "⬇️";
  else if (texto.indexOf("estável") >= 0) icone = "➡️";
  const m = texto.match(/([\d,]+)\s*cm por hora/);
  return m ? `${icone} ${m[1]} cm/h` : icone;
}

// Extrai o valor numérico (em cm) de um texto de oscilação, ex.:
// "Oscilação da última marcação: 0 cm" -> "0 cm"
function condensarOscilacao(texto) {
  if (!texto) return "—";
  const m = texto.match(/(-?\d+)\s*cm/);
  return m ? `${m[1]} cm` : "—";
}

// ==========================================
// DESENHA O SLIDE (limpa e redesenha só o slide 8)
// ==========================================
function atualizarSlideCheias(slide, unit) {
  const ds = CR_DESIGN_SYSTEM;
  const dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

  slide.getPageElements().forEach(el => el.remove());

  let dados;
  try {
    dados = lerDadosCheias(unit.cheiasSheetId);
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler planilha de cheias: ${e.message}`);
    dados = null;
  }

  applyBrandHeaderAndBackground(slide, "Monitoramento de Cheias", unit.weather.cidade, dataHora, unit,
    { dataLabel: dados ? `🕒 Última medição: ${dados.ultimaMedicao}` : `🕒 Atualizado: ${dataHora}` });

  if (!dados) {
    const txtErro = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 180, 620, 50);
    txtErro.getText().setText("⚠️ Dados de monitoramento de cheias indisponíveis no momento.")
      .getTextStyle().setFontSize(16).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    txtErro.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  const cX = ds.layout.marginX;
  const fullW = 720 - (ds.layout.marginX * 2);

  // Helper: cria uma caixa de texto já com alinhamento MIDDLE, com log do
  // nome do campo em caso de falha (facilita localizar problemas pontuais
  // de dados sem derrubar o slide inteiro).
  const txt = (campo, x, y, w, h, valor, fontSize, family, color, bold, center) => {
    try {
      const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, Math.max(w, 1), Math.max(h, 1));
      t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      // Texto vazio faz a API descartar o corpo de texto da forma, e a
      // chamada a getTextStyle() em seguida falha com "has no text".
      const texto = String(valor == null ? "" : valor).trim() || "—";
      const style = t.getText().setText(texto).getTextStyle()
        .setFontSize(fontSize).setFontFamily(family).setForegroundColor(color);
      if (bold) style.setBold(true);
      if (center) t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      return t;
    } catch (e) {
      Logger.log(`⚠️ Falha ao criar texto "${campo}" (valor="${valor}"): ${e.message}`);
      return null;
    }
  };

  // ==================================================
  // 1) NÍVEIS DOS RIOS (3 cards) — nível atual vs. cota de inundação
  // ==================================================
  const startY = 96, cardGap = 13, cardW = (fullW - cardGap * 2) / 3, cardH = 232;
  const cotas = unit.cheiasCotas || [];

  dados.rios.forEach((r, i) => {
    const x = cX + i * (cardW + cardGap);
    const nivel = parseNivelM(r.nivelAtual);
    const cota = (cotas[i] != null) ? cotas[i] : null;
    const ratio = (nivel != null && cota) ? (nivel / cota) : null;
    const cor = corRiscoCheia(ratio, ds);

    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, cardW, cardH);
    bg.getFill().setSolidFill(ds.colors.cardBg); bg.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
    const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, 5, cardH);
    acc.getFill().setSolidFill(cor); acc.getBorder().setTransparent();

    const ix = x + 16, iw = cardW - 30;

    txt(`rio[${i}].nome`, ix, startY + 10, iw, 28, r.nome, 10, ds.typography.titles, ds.colors.textMain, true);
    txt(`rio[${i}].nivelAtual`, ix, startY + 38, iw, 38, r.nivelAtual || "N/D", 30, ds.typography.titles, cor, true);
    txt(`rio[${i}].cota`, ix, startY + 78, iw, 16, `Cota de inundação: ${fmtMetros(cota)}`, 9, ds.typography.body, ds.colors.textBody, true);

    // Barra de risco: preenchimento proporcional ao nível / cota.
    const barY = startY + 98, barW = iw, barH = 9;
    const trilho = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ix, barY, barW, barH);
    trilho.getFill().setSolidFill(ds.colors.lines); trilho.getBorder().setTransparent();
    if (ratio != null) {
      const fillW = Math.max(2, Math.min(1, ratio) * barW);
      const preench = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ix, barY, fillW, barH);
      preench.getFill().setSolidFill(cor); preench.getBorder().setTransparent();
    }
    txt(`rio[${i}].ratio`, ix, barY + 11, iw, 14,
      ratio != null ? `${Math.round(ratio * 100)}% da cota` : "% da cota indisponível", 8, ds.typography.body, cor, true);

    txt(`rio[${i}].anoPassado`, ix, startY + 138, iw, 16, `📅 Há 1 ano: ${r.anoPassado || "N/D"}`, 9, ds.typography.body, ds.colors.textBody, false);
    txt(`rio[${i}].tend7`, ix, startY + 158, iw, 16, `Tend. 7h30: ${condensarTendencia(r.tendencia7h30)}`, 9, ds.typography.body, ds.colors.brandMed, true);
    txt(`rio[${i}].tend3`, ix, startY + 176, iw, 16, `Tend. 3h: ${condensarTendencia(r.tendencia3h)}`, 9, ds.typography.body, ds.colors.brandMed, true);
    txt(`rio[${i}].osc`, ix, startY + 196, iw, 28,
      `Osc. última: ${condensarOscilacao(r.oscUltima)}\nDia anterior: ${condensarOscilacao(r.oscDiaAnterior)}`, 8, ds.typography.body, ds.colors.textBody, false);
  });

  // ==================================================
  // 2) CANAL DE DRENAGEM (Mega Esteio)
  // ==================================================
  const canalY = startY + cardH + 14, canalH = 40;
  const bgCanal = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, canalY, fullW, canalH);
  bgCanal.getFill().setSolidFill('#EFF6FF'); bgCanal.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.brandLight);

  const canalTxt = `🚰 CANAL DE DRENAGEM — MEGA ESTEIO:  ${dados.canalDrenagem || "N/D"}` +
    (dados.canalData ? `     •     medição: ${dados.canalData}` : '');
  txt('canalDrenagem', cX + 14, canalY, fullW - 28, canalH,
    canalTxt, 13, ds.typography.titles, ds.colors.brandLight, true);
}
