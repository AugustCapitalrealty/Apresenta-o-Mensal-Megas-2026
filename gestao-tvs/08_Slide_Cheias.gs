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
// DESENHA O SLIDE
// ==========================================
// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): um cartão por
// rio com a barra lateral na cor do risco (nível ÷ cota de inundação) e o
// canal de drenagem numa faixa embaixo. A cor aqui É a informação: verde
// abaixo de 70% da cota, laranja até 90%, vermelho acima.
function atualizarSlideCheias(slide, unit) {
  const dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");

  slide.getPageElements().forEach(el => el.remove());

  let dados;
  try {
    dados = lerDadosCheias(unit.cheiasSheetId);
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler planilha de cheias: ${e.message}`);
    dados = null;
  }

  const cotas = unit.cheiasCotas || [];
  const leituras = dados ? dados.rios.map((r, i) => {
    const nivel = parseNivelM(r.nivelAtual);
    const cota = cotas[i] != null ? cotas[i] : null;
    return { r, nivel, cota, ratio: (nivel != null && cota) ? nivel / cota : null };
  }) : [];
  const pior = leituras.filter(l => l.ratio != null).sort((a, b) => b.ratio - a.ratio)[0];
  const nomeCurto = n => String(n || '').replace(/^RIO\s+/i, '').toLowerCase().replace(/(^|\s|-)(\S)/g, (m, e, l) => e + l.toUpperCase());

  applyBrandHeaderAndBackground(slide, 'Monitoramento de cheias',
    pior ? `${unit.weather.cidade} · maior nível: ${Math.round(pior.ratio * 100)}% da cota (${nomeCurto(pior.r.nome)})`
         : unit.weather.cidade,
    dataHora, unit, { dataLabel: dados ? `Última medição: ${dados.ultimaMedicao || '—'}` : `Atualizado: ${dataHora}` });
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;

  if (!dados) {
    _tvTexto_(slide, 30, 180, 660, 30, 'Dados de monitoramento de cheias indisponíveis no momento.',
      { fs: 16, fsMin: 11, bold: true, cor: c.textBody, fonte: DS.typography.titles, align: 'C' });
    return;
  }

  const t = (x, y, w, h, valor, op) => _tvTexto_(slide, x, y, w, h, (String(valor == null ? '' : valor).trim() || '—'),
    Object.assign({ cortar: true, fonte: DS.typography.body, cor: c.textBody }, op));

  // Um cartão por rio
  const startY = 84, gap = 10, cardW = (660 - 2 * gap) / 3, cardH = 236;
  leituras.forEach((l, i) => {
    const x = 30 + i * (cardW + gap);
    const cor = corRiscoCheia(l.ratio, DS);
    _tvRet_(slide, x, startY, cardW, cardH, c.cardBg, { redondo: true, borda: c.lines });
    _tvRet_(slide, x, startY + 8, 4, cardH - 16, cor);
    const ix = x + 10, iw = cardW - 18;

    t(ix, startY + 6, iw, 30, l.r.nome, { fs: 9, fsMin: 7, bold: true, cor: c.textMain, fonte: DS.typography.titles });
    t(ix, startY + 34, iw, 40, l.r.nivelAtual || 'N/D', { fs: 30, fsMin: 18, bold: true, cor: cor, fonte: DS.typography.titles });
    t(ix, startY + 74, iw, 16, `Cota de inundação: ${fmtMetros(l.cota)}`, { fs: 9, fsMin: 7.5, bold: true });

    const barY = startY + 94, barX = ix + 7, barW = iw - 14, barH = 10;
    _tvRet_(slide, barX, barY, barW, barH, c.zebra, { redondo: true });
    if (l.ratio != null) _tvRet_(slide, barX, barY, Math.max(4, Math.min(1, l.ratio) * barW), barH, cor, { redondo: true });
    t(ix, barY + 12, iw, 15, l.ratio != null ? `${Math.round(l.ratio * 100)}% da cota` : '% da cota indisponível',
      { fs: 8.5, fsMin: 7, bold: true, cor: cor });

    const div = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, barX, startY + 132, barX + barW, startY + 132);
    div.getLineFill().setSolidFill(c.lines);
    div.setWeight(1);
    t(ix, startY + 138, iw, 16, `Há 1 ano: ${l.r.anoPassado || 'N/D'}`, { fs: 9, fsMin: 7.5 });
    t(ix, startY + 156, iw, 16, `Tendência 7h30: ${condensarTendencia(l.r.tendencia7h30)}`, { fs: 9, fsMin: 7.5, bold: true, cor: c.brandDark });
    t(ix, startY + 174, iw, 16, `Tendência 3h: ${condensarTendencia(l.r.tendencia3h)}`, { fs: 9, fsMin: 7.5, bold: true, cor: c.brandDark });
    t(ix, startY + 194, iw, 15, `Oscilação última: ${condensarOscilacao(l.r.oscUltima)}`, { fs: 8.5, fsMin: 7 });
    t(ix, startY + 210, iw, 15, `Dia anterior: ${condensarOscilacao(l.r.oscDiaAnterior)}`, { fs: 8.5, fsMin: 7 });
  });

  // Canal de drenagem
  const canalY = startY + cardH + 10, canalH = 44;
  _tvRet_(slide, 30, canalY, 660, canalH, c.brandTint, { redondo: true });
  _tvRet_(slide, 30, canalY + 8, 4, canalH - 16, c.brandLight);
  t(40, canalY, 260, canalH, 'CANAL DE DRENAGEM — MEGA ESTEIO',
    { fs: 9.5, fsMin: 7.5, bold: true, cor: c.textBody, fonte: DS.typography.titles });
  t(300, canalY, 160, canalH, dados.canalDrenagem || 'N/D',
    { fs: 20, fsMin: 12, bold: true, cor: c.brandDark, fonte: DS.typography.titles, align: 'C' });
  t(460, canalY, 225, canalH, dados.canalData ? `medição de ${dados.canalData}` : '',
    { fs: 9.5, fsMin: 7.5, cor: c.textBody, align: 'R' });

  _tvRodape_(slide, 'Fonte: planilha de monitoramento de cheias (rios e canal) · cor = nível ÷ cota de inundação: ' +
                    'verde < 70%, laranja < 90%, vermelho ≥ 90%');
}
