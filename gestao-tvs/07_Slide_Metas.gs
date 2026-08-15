/**
 * ARQUIVO: 07_Slide_Metas.gs
 * DESCRIÇÃO: Slides de Metas montados a partir de UMA ÚNICA aba "METAS".
 *
 * COMO USAR:
 * 1. Execute CRIAR_ABA_METAS() uma vez. Cria a aba "METAS" com os cabeçalhos.
 * 2. Preencha uma linha por meta. As colunas "Mega" e "Papel" dizem em qual
 *    slide a linha aparece (ex.: Mega = Curitiba, Papel = Supervisor).
 *    Na coluna "Título" escreva o título da tabela (ex.: METAS MAURO COELHO...).
 *    Nas colunas de Status escreva: Verde, Amarelo ou Vermelho.
 * 3. Rode gerarApresentacao(). A tabela é desenhada NATIVAMENTE no slide,
 *    sempre no mesmo slide (mesmo ID => o link da TV não muda).
 *
 * SEGURANÇA: o slide só é redesenhado quando há linhas para aquela Mega/Papel.
 * Sem dados, o slide atual é preservado (não apaga o que já está na TV).
 */

const METAS_ABA = "METAS";

// Cabeçalho completo da aba única
const METAS_COLS_FULL = [
  "Mega", "Papel", "Título",
  "Descrição", "Pontos", "Direcionador", "Unidade", "Sentido",
  "Meta Mês", "Real Mês", "Status Mês",
  "Meta Acum.", "Real Acum.", "Status Acum."
];

// Colunas exibidas na tabela do slide (Descrição -> Status Acum.)
const METAS_COLS = [
  "Descrição", "Pontos", "Direcionador", "Unidade", "Sentido",
  "Meta Mês", "Real Mês", "Status Mês",
  "Meta Acum.", "Real Acum.", "Status Acum."
];

// ==========================================
// ATUALIZA SÓ OS SLIDES DE METAS (use no acionador / botão)
// Redesenha apenas os slides de Metas das 3 TVs, sem tocar nos demais.
// Sempre no mesmo slide (mesmo ID), então o link da TV não muda.
// ==========================================
function ATUALIZAR_METAS() {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);

  UNITS.forEach(unit => {
    Logger.log(`🎯 Atualizando metas: ${unit.name}`);
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const totalSlides = 6 + (unit.metas || []).length;

      // Garante que os slides de metas existem (só acrescenta no fim; não deleta nada)
      while (slides.length < totalSlides) {
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        slides = deck.getSlides();
      }

      (unit.metas || []).forEach((cfg, i) => {
        const metas = lerMetas(planilha, unit, cfg.papel);
        if (metas) renderSlideMetas(slides[6 + i], unit, metas);
      });

      Logger.log(`✅ Metas atualizadas: ${unit.name}`);
    } catch (erro) {
      Logger.log(`❌ Erro ao atualizar metas de ${unit.name}: ${erro.message}`);
    }
  });

  Logger.log("🎉 Metas atualizadas em todas as TVs.");
}

// ==========================================
// GERADOR DA ABA ÚNICA DE METAS (executar 1x)
// ==========================================
function CRIAR_ABA_METAS() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA);
  const ds = CR_DESIGN_SYSTEM;

  let aba = ss.getSheetByName(METAS_ABA);
  if (!aba) aba = ss.insertSheet(METAS_ABA);

  const temCabecalho = aba.getRange(1, 1).getValue() === "Mega";
  if (!temCabecalho) {
    aba.getRange(1, 1, 1, METAS_COLS_FULL.length).setValues([METAS_COLS_FULL]);
  }

  aba.getRange(1, 1, 1, METAS_COLS_FULL.length)
    .setBackground(ds.colors.brandDark).setFontColor("#FFFFFF")
    .setFontWeight("bold").setFontFamily(ds.typography.titles)
    .setHorizontalAlignment("center").setWrap(true);
  aba.setFrozenRows(1);
  aba.setColumnWidth(1, 90);   // Mega
  aba.setColumnWidth(2, 90);   // Papel
  aba.setColumnWidth(3, 240);  // Título
  aba.setColumnWidth(4, 260);  // Descrição
  for (let c = 5; c <= METAS_COLS_FULL.length; c++) aba.setColumnWidth(c, 80);

  Logger.log("✅ Aba 'METAS' pronta. Preencha Mega/Papel/Título/... e rode gerarApresentacao().");
}

// ==========================================
// LEITURA / FILTRO
// ==========================================
function normMega(s)  { return (s || "").toString().toUpperCase().replace(/^MEGA\s+/, "").trim(); }
function normPapel(s) { return (s || "").toString().toUpperCase().trim(); }

function lerMetas(planilha, unit, papel) {
  const aba = planilha.getSheetByName(METAS_ABA);
  if (!aba) return null;
  const ultima = aba.getLastRow();
  if (ultima < 2) return null;

  const dados = aba.getRange(2, 1, ultima - 1, METAS_COLS_FULL.length).getDisplayValues();
  const alvoMega = normMega(unit.name);
  const alvoPapel = normPapel(papel);

  const filtradas = dados.filter(l =>
    normMega(l[0]) === alvoMega &&
    normPapel(l[1]) === alvoPapel &&
    (l[3] || "").toString().trim() !== ""
  );
  if (filtradas.length === 0) return null;

  const titulo = (filtradas[0][2] || "").toString().trim() || `METAS ${alvoPapel} - ${unit.name} 2026`;
  const linhas = filtradas.map(l => {
    const linha = l.slice(3, 3 + METAS_COLS.length); // 11 colunas exibidas
    const descricao = linha[0];

    // Indicadores automáticos (ver Dados.gs): sobrescreve o Real (e,
    // para Custo M², também a Meta) com o valor calculado ao vivo, e guarda
    // a tendência vs período anterior (linha._trendMes/_trendAcum) para
    // desenhar como selo ▲/▼. Sem match/erro, a linha digitada não muda.
    try {
      const autoMes = obterMetaAuto(unit, descricao, linha[5], 'mes');
      if (autoMes) {
        if (autoMes.metaValor != null) linha[5] = autoMes.metaValor;
        linha[6] = autoMes.valor;
        linha._trendMes = autoMes.trend;
      }
      const autoAcum = obterMetaAuto(unit, descricao, linha[8], 'acum');
      if (autoAcum) {
        if (autoAcum.metaValor != null) linha[8] = autoAcum.metaValor;
        linha[9] = autoAcum.valor;
        linha._trendAcum = autoAcum.trend;
      }
    } catch (e) {
      Logger.log(`⚠️ Metas auto (${unit.name}/${descricao}): ${e.message}`);
    }

    return linha;
  });
  return { titulo: titulo, papel: papel, linhas: linhas };
}

// Converte texto de status em cor
function corStatus(txt) {
  const ds = CR_DESIGN_SYSTEM;
  const t = (txt || "").toString().trim().toLowerCase();
  // Tons mais suaves (pastel) para o Status
  if (t.indexOf("verde") >= 0 || t === "v" || t.indexOf("🟢") >= 0) return '#A7E8C0';
  if (t.indexOf("amarelo") >= 0 || t === "a" || t.indexOf("🟡") >= 0) return '#FCE49A';
  if (t.indexOf("vermelho") >= 0 || t === "r" || t.indexOf("🔴") >= 0) return '#F3A9A9';
  return ds.colors.lines; // sem status
}

// ==========================================
// MOTOR DE STATUS AUTOMÁTICO
// Regras:
//  - SIM/NÃO (projetos, housekeeping): SIM = Verde | NÃO = Amarelo
//    (em andamento). Para virar Vermelho "após o prazo", basta escrever
//    "Vermelho" na coluna de Status (override manual).
//  - Meta composta (duas medidas separadas por "/"): Verde só se TODAS as
//    medidas baterem; senão Vermelho. A direção de cada medida vem do
//    "Sentido" (ex.: "<=/>=") ou, se não informado, é deduzida da Unidade
//    (R$ = quanto menor melhor / % = quanto maior melhor).
//  - Numérica simples: compara Real x Meta pelo Sentido (>=, <=, =).
// Override: se a coluna de Status estiver preenchida, esse valor prevalece.
// ==========================================
function splitBarra(s) { return (s || "").toString().split("/").map(x => x.trim()); }

function parseNum(s) {
  let t = (s || "").toString().trim().replace(/[^0-9,.\-]/g, "");
  t = t.replace(/\./g, "").replace(",", ".");
  return parseFloat(t);
}

function operadorPara(sentido, unidade) {
  let s = (sentido || "").toString().replace(/\s/g, "").replace("=>", ">=").replace("=<", "<=");
  if (s.indexOf(">=") >= 0) return ">=";
  if (s.indexOf("<=") >= 0) return "<=";
  if (s.indexOf(">") >= 0) return ">=";
  if (s.indexOf("<") >= 0) return "<=";
  if (s === "=") return "=";
  const u = (unidade || "").toString().toUpperCase();
  if (u.indexOf("R$") >= 0) return "<=";
  if (u.indexOf("%") >= 0) return ">=";
  return ">=";
}

function comparaNum(real, meta, op) {
  const a = parseNum(real), b = parseNum(meta);
  if (isNaN(a) || isNaN(b)) return false;
  if (op === "<=") return a <= b;
  if (op === "=") return a === b;
  return a >= b;
}

function calcularStatus(meta, real, sentido, unidade) {
  const r = (real || "").toString().trim().toUpperCase();
  if (r === "SIM") return "Verde";
  if (r === "NAO" || r === "NÃO" || r === "N/A" || r === "-" || r === "") return "Amarelo";

  const temBarra = ((meta || "").toString().indexOf("/") >= 0) || ((real || "").toString().indexOf("/") >= 0);
  if (temBarra) {
    const ms = splitBarra(meta), rs = splitBarra(real), ss = splitBarra(sentido), us = splitBarra(unidade);
    const n = Math.max(ms.length, rs.length);
    for (let i = 0; i < n; i++) {
      const op = (ss.length === n && ss[i]) ? operadorPara(ss[i], us[i] || us[0]) : operadorPara("", us[i] || us[0]);
      if (!comparaNum(rs[i], ms[i], op)) return "Vermelho";
    }
    return "Verde";
  }

  const op = operadorPara(sentido, unidade);
  return comparaNum(real, meta, op) ? "Verde" : "Vermelho";
}

// Status de uma célula (mês ou acumulado), com override manual.
// linha = 11 colunas exibidas: [0]Descrição [1]Pontos [2]Direcionador
// [3]Unidade [4]Sentido [5]MetaMês [6]RealMês [7]StatusMês
// [8]MetaAcum [9]RealAcum [10]StatusAcum
function statusMeta(linha, qual) {
  const unidade = linha[3], sentido = linha[4];
  let meta, real, manual;
  if (qual === 'mes') { meta = linha[5]; real = linha[6]; manual = linha[7]; }
  else               { meta = linha[8]; real = linha[9]; manual = linha[10]; }
  const m = (manual || "").toString().trim();
  if (m !== "") return m; // override manual
  return calcularStatus(meta, real, sentido, unidade);
}

// A meta está verde? (garante a pontuação)
function metaEhVerde(linha, qual) {
  const st = (statusMeta(linha, qual) || "").toString().trim().toLowerCase();
  return st.indexOf("verde") >= 0 || st === "v" || st.indexOf("🟢") >= 0;
}

// ==========================================
// DESENHA A TABELA DE METAS EM UM SLIDE
// ==========================================
function renderSlideMetas(slide, unit, metas) {
  const ds = CR_DESIGN_SYSTEM;
  const dataGlobal = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy");
  const W = 720, H = 405;

  slide.getPageElements().forEach(el => el.remove());
  applyBrandHeaderAndBackground(slide, "Metas", `Objetivos e Resultados • ${metas.papel}`, dataGlobal, unit);

  // Layout IDÊNTICO ao slide de Metas da Apresentação Mensal dos Megas
  // (AugustCapitalrealty/Apresenta-o-Mensal-Megas-2026, Slide_Metas.gs):
  // mesmos pesos de coluna, mesmas cores (brandMed/brandDark), mesmos
  // tamanhos de fonte e o selo de tendência no TOPO da célula do valor.
  const pesos = [114, 54, 76, 62, 46, 68, 66, 44, 68, 66, 44]; // 11 colunas
  const totalW = W - 12;
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const larg = pesos.map(p => p / somaPesos * totalW);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  // Tabela começa logo abaixo do cabeçalho desta planilha (a Apresentação
  // Mensal usa um cabeçalho mais baixo — aqui mantemos o nosso, y=96).
  let y = 96;

  // --- Barra de título ---
  const tituloH = 22;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, y, totalW, tituloH);
  barra.getFill().setSolidFill(ds.colors.brandMed); barra.getBorder().setTransparent();
  const tBar = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0, y, totalW, tituloH);
  tBar.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBar.getText().setText(metas.titulo || `METAS ${metas.papel} - ${unit.name} 2026`)
    .getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor("#FFFFFF").setBold(true);
  tBar.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  y += tituloH;

  // --- Cabeçalho das colunas ---
  const cabH = 28;
  const titulosCab = [metas.papel, "Pontos", "Direcionador", "Unidade", "Sentido",
    "Meta Mês", "Real Mês", "Status", "Meta Ac.", "Real Ac.", "Status"];
  for (let c = 0; c < titulosCab.length; c++) {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], cabH);
    bg.getFill().setSolidFill(ds.colors.brandDark); bg.getBorder().setWeight(1).getLineFill().setSolidFill("#FFFFFF");
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 1, y, larg[c] - 2, cabH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(titulosCab[c]).getTextStyle().setFontSize(7).setFontFamily(ds.typography.titles).setForegroundColor("#FFFFFF").setBold(true);
    t.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
  }
  y += cabH;

  // --- Rodapé de pontuação (reserva espaço antes de calcular a altura das linhas) ---
  const resumoH = 26, resumoY = H - resumoH - 8;

  // --- Linhas de dados ---
  const n = metas.linhas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(78, Math.floor(dispH / Math.max(1, n))));

  metas.linhas.forEach((linha, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? ds.colors.cardBg : '#F8FAFC';

    for (let c = 0; c < METAS_COLS.length; c++) {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      if (ehStatus) {
        const st = (c === 7) ? statusMeta(linha, 'mes') : statusMeta(linha, 'acum');
        cell.getFill().setSolidFill(corStatus(st));
      } else {
        cell.getFill().setSolidFill(fundo);
      }
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);

      if (!ehStatus) {
        // Metas/valores compostos ("R$ 4,21 / 80%") compactados para não
        // quebrar linha nas colunas de Meta/Real.
        let valStr = (linha[c] || "").toString();
        if (c === 5 || c === 6 || c === 8 || c === 9) valStr = valStr.replace(/\s*\/\s*/g, '/');

        // Valor na caixa padrão da célula (célula inteira, centralizado) —
        // o comparativo de tendência NÃO entra junto, para nunca quebrar o valor.
        // Nas colunas centralizadas a caixa de texto é alargada além da
        // célula (folga simétrica, sem alterar o retângulo visível nem a
        // largura da coluna) só para vencer o recuo interno padrão do
        // Slides, que faz valores como "R$ 6,46/100%" quebrarem linha
        // mesmo cabendo de sobra no espaço visual da célula.
        const folga = c === 0 ? 0 : 10;
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 3 - folga, ry, larg[c] - 6 + folga * 2, rowH);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        t.getText().setText(valStr)
          .getTextStyle().setFontSize(c === 0 ? 7 : 7.5).setBold(c === 0).setFontFamily(ds.typography.body)
          .setForegroundColor(ds.colors.textMain);
        t.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);

        // Selo de tendência (▲/▼ vs período anterior) para Real Mês [6] /
        // Real Acum. [9] — vindo de indicadores automáticos (Dados.gs).
        // Caixa própria sobreposta, centralizada no TOPO da célula.
        const trend = c === 6 ? linha._trendMes : (c === 9 ? linha._trendAcum : null);
        if (trend && trend.txt) {
          const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c], ry + 2, larg[c], 11);
          selo.getText().setText(trend.txt).getTextStyle()
            .setFontSize(6.5).setBold(true).setForegroundColor(trend.cor).setFontFamily(ds.typography.titles);
          selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        }
      }
    }
  });

  // --- Barra de pontuação (metas Verdes no acumulado garantem os pontos) ---
  let totalPontos = 0, pontosAcum = 0;
  metas.linhas.forEach(linha => {
    const p = parseNum(linha[1]) || 0;
    totalPontos += p;
    if (metaEhVerde(linha, 'acum')) pontosAcum += p;
  });
  totalPontos = Math.round(totalPontos);

  const PONTOS_ELEGIBILIDADE = 50;
  const elegivel = Math.round(pontosAcum) >= PONTOS_ELEGIBILIDADE;

  const barRes = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, resumoY, totalW, resumoH);
  barRes.getFill().setSolidFill(ds.colors.brandMed); barRes.getBorder().setTransparent();

  const badgeW = 130, badgeH = 18;
  const badgeX = x0 + totalW - badgeW - 10;
  const badgeY = resumoY + (resumoH - badgeH) / 2;

  const tRes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 12, resumoY, totalW - badgeW - 36, resumoH);
  tRes.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tRes.getText().setText(`PONTUAÇÃO ACUMULADA  •  ${Math.round(pontosAcum)} / ${totalPontos} PONTOS  •  MÍN. ${PONTOS_ELEGIBILIDADE} P/ ELEGIBILIDADE`)
    .getTextStyle().setFontSize(9).setBold(true).setForegroundColor("#FFFFFF").setFontFamily(ds.typography.titles);

  const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, badgeX, badgeY, badgeW, badgeH);
  badge.getFill().setSolidFill(elegivel ? ds.colors.accentGreen : ds.colors.accentRed); badge.getBorder().setTransparent();
  const tBadge = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, badgeX, badgeY, badgeW, badgeH);
  tBadge.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBadge.getText().setText(elegivel ? "✓ ELEGÍVEL" : "✗ NÃO ELEGÍVEL")
    .getTextStyle().setFontSize(8.5).setBold(true).setForegroundColor("#FFFFFF").setFontFamily(ds.typography.titles);
  tBadge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

// ==========================================
// EXEMPLO: adiciona na aba METAS as linhas da tabela
// "Mauro Coelho - Facilities" (Curitiba / Supervisor).
// Não apaga nada; só acrescenta se ainda não existir.
// ==========================================
function SEED_METAS_EXEMPLO() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA);
  let aba = ss.getSheetByName(METAS_ABA);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(METAS_ABA); }

  const ultima = aba.getLastRow();
  if (ultima >= 2) {
    const existentes = aba.getRange(2, 1, ultima - 1, 2).getDisplayValues();
    const jaTem = existentes.some(l => normMega(l[0]) === "CURITIBA" && normPapel(l[1]) === "SUPERVISOR");
    if (jaTem) { Logger.log("Já existe exemplo de Curitiba/Supervisor na aba METAS. Nada a fazer."); return; }
  }

  // Status (colunas 11 e 14) ficam em branco: a cor é calculada automaticamente.
  const t = "METAS MAURO COELHO - FACILITIES 2026";
  const linhas = [
    ["Curitiba", "Supervisor", t, "CUSTO M² MEGAS E 80% DAS MANUT PLANEJADAS", 25, "Performance", "R$ / %", "<=/>=", "R$ 4,21 / 80%", "R$ 3,86 / 0%", "", "R$ 4,05 / 80%", "R$ 3,66 / 0%", ""],
    ["Curitiba", "Supervisor", t, "IMPLEMENTAR PROJETO DE ADEQUAÇÃO E MODERNIZAÇÃO DA SEGURANÇA", 20, "Projetos", "SIM/NÃO", "=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
    ["Curitiba", "Supervisor", t, "CONTROLES DIÁRIOS DA APLICAÇÃO DO \"HOUSEKEEPING\"", 20, "Performance", "%", ">=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
    ["Curitiba", "Supervisor", t, "CHECK-LIST/SLA", 20, "Performance", "%", ">=", "90", "98", "", "90", "92", ""],
    ["Curitiba", "Supervisor", t, "ÍNDICE DE DISPONIBILIDADE ATIVOS CRÍTICOS", 15, "Performance", "%", ">=", "90", "87,55", "", "90", "88,03", ""]
  ];

  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, METAS_COLS_FULL.length).setValues(linhas);
  Logger.log("✅ Exemplo adicionado na aba METAS (Curitiba / Supervisor). Rode gerarApresentacao().");
}

// ==========================================
// DADOS: Analista de Facilities - Mega Curitiba (Felipe Eduardo Campos)
// Não apaga nada; só acrescenta se ainda não existir.
// ==========================================
function SEED_METAS_CWB_ANALISTA() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA);
  let aba = ss.getSheetByName(METAS_ABA);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(METAS_ABA); }

  const ultima = aba.getLastRow();
  if (ultima >= 2) {
    const existentes = aba.getRange(2, 1, ultima - 1, 2).getDisplayValues();
    const jaTem = existentes.some(l => normMega(l[0]) === "CURITIBA" && normPapel(l[1]) === "ANALISTA");
    if (jaTem) { Logger.log("Já existe Curitiba/Analista na aba METAS. Nada a fazer."); return; }
  }

  // Status em branco: a cor é calculada automaticamente.
  const t = "METAS FELIPE EDUARDO CAMPOS - FACILITIES 2026";
  const linhas = [
    ["Curitiba", "Analista", t, "CUMPRIR ORÇAMENTO", 30, "Planejamento", "R$", "<=", "R$ 46.931", "R$ 43.534", "", "R$ 302.613", "R$ 217.980", ""],
    ["Curitiba", "Analista", t, "PLANO DE AÇÃO PAISAGISMO", 25, "Procedimentos", "SIM/NÃO", "=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
    ["Curitiba", "Analista", t, "CHECK-LIST/SLA - TERCEIROS", 20, "Performance", "%", ">=", "95", "100", "", "95", "98,86", ""],
    ["Curitiba", "Analista", t, "DOCUMENTOS DE CLIENTES E CONDOMÍNIO", 15, "Padronização", "SIM/NÃO", "=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
    ["Curitiba", "Analista", t, "TAXA DE REABERTURA", 10, "Performance", "%", "<=", "2", "0", "", "2", "3,15", ""]
  ];

  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, METAS_COLS_FULL.length).setValues(linhas);
  Logger.log("✅ Curitiba/Analista adicionado na aba METAS. Rode ATUALIZAR_METAS().");
}

// ==========================================
// DADOS: Mega Itajaí — Supervisor (Dionatan Rek) e Analista (Amanda de Campos Alexandre)
// Não apaga nada; só acrescenta os papéis que ainda não existirem.
// ==========================================
function SEED_METAS_ITJ() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA);
  let aba = ss.getSheetByName(METAS_ABA);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(METAS_ABA); }

  const ultima = aba.getLastRow();
  const existentes = ultima >= 2 ? aba.getRange(2, 1, ultima - 1, 2).getDisplayValues() : [];
  const temItjPapel = (papel) => existentes.some(l => normMega(l[0]) === "ITAJAÍ" && normPapel(l[1]) === papel);

  const tSup = "METAS DIONATAN REK - FACILITIES 2026";
  const tAna = "METAS AMANDA DE CAMPOS ALEXANDRE - FACILITIES 2026";
  let novas = [];

  if (!temItjPapel("SUPERVISOR")) {
    novas = novas.concat([
      ["Itajaí", "Supervisor", tSup, "CUSTO M² MEGAS E 80% DAS MANUTENÇÕES PLANEJADAS", 25, "Performance", "R$ / %", "<=/>=", "R$ 4,41 / 80%", "R$ 3,39 / 2,56%", "", "R$ 4,70 / 80%", "R$ 4,15 / 2,56%", ""],
      ["Itajaí", "Supervisor", tSup, "IMPLEMENTAR PROJETO DE ADEQUAÇÃO E MODERNIZAÇÃO DA SEGURANÇA", 20, "Projetos", "SIM/NÃO", "=", "NÃO", "NÃO", "", "NÃO", "NÃO", ""],
      ["Itajaí", "Supervisor", tSup, "CONTROLES DIÁRIOS DA APLICAÇÃO DO \"HOUSEKEEPING\"", 20, "Projetos", "SIM/NÃO", "=", "NÃO", "NÃO", "", "NÃO", "NÃO", ""],
      ["Itajaí", "Supervisor", tSup, "CHECK-LIST/SLA", 20, "Performance", "%", ">=", "90", "94", "", "90", "98,00", ""],
      ["Itajaí", "Supervisor", tSup, "DISPONIBILIDADE DE ATIVOS CRÍTICOS", 15, "Performance", "%", ">=", "90", "95,00", "", "80", "93,00", ""]
    ]);
  }

  if (!temItjPapel("ANALISTA")) {
    novas = novas.concat([
      ["Itajaí", "Analista", tAna, "CUMPRIR ORÇAMENTO", 30, "Planejamento", "R$", "<=", "R$ 36.724", "R$ 50.119", "", "R$ 297.010", "R$ 260.992", ""],
      ["Itajaí", "Analista", tAna, "IMPLEMENTAR CONTRATO DE PREÇO ÚNICO", 25, "Procedimentos", "SIM/NÃO", "=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
      ["Itajaí", "Analista", tAna, "CHECK-LIST/SLA TERCEIROS", 20, "Performance", "%", ">=", "95", "100", "", "95", "99", ""],
      ["Itajaí", "Analista", tAna, "DOCUMENTOS DE CLIENTES E CONDOMÍNIO", 15, "Padronização", "SIM/NÃO", "=", "SIM", "SIM", "", "SIM", "SIM", ""],
      ["Itajaí", "Analista", tAna, "TAXA DE REABERTURA", 10, "Performance", "%", "<=", "2", "0", "", "2", "0", ""]
    ]);
  }

  if (novas.length === 0) { Logger.log("Itajaí (Supervisor e Analista) já estão na aba METAS. Nada a fazer."); return; }
  aba.getRange(aba.getLastRow() + 1, 1, novas.length, METAS_COLS_FULL.length).setValues(novas);
  Logger.log(`✅ Itajaí adicionado na aba METAS (${novas.length} linhas). Rode ATUALIZAR_METAS().`);
}

// ==========================================
// DADOS: Mega Esteio — Supervisor (José Ernesto da Rosa). Só supervisor.
// Não apaga nada; só acrescenta se ainda não existir.
// ==========================================
function SEED_METAS_EST() {
  const ss = SpreadsheetApp.openById(ID_PLANILHA);
  let aba = ss.getSheetByName(METAS_ABA);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(METAS_ABA); }

  const ultima = aba.getLastRow();
  if (ultima >= 2) {
    const existentes = aba.getRange(2, 1, ultima - 1, 2).getDisplayValues();
    const jaTem = existentes.some(l => normMega(l[0]) === "ESTEIO" && normPapel(l[1]) === "SUPERVISOR");
    if (jaTem) { Logger.log("Já existe Esteio/Supervisor na aba METAS. Nada a fazer."); return; }
  }

  const t = "METAS JOSÉ ERNESTO DA ROSA - FACILITIES 2026";
  const linhas = [
    ["Esteio", "Supervisor", t, "CUSTO M² MEGAS E 80% DAS MANUT PLANEJADAS", 25, "Performance", "R$ / %", "<=/>=", "R$ 6,87 / 80%", "R$ 8,45 / 200%", "", "R$ 8,16 / 80%", "R$ 8,27 / 75%", ""],
    ["Esteio", "Supervisor", t, "IMPLEMENTAR CONTRATO DE PREÇO ÚNICO", 25, "Performance", "SIM/NÃO", "=", "SIM", "NÃO", "", "SIM", "NÃO", ""],
    ["Esteio", "Supervisor", t, "CHECK-LIST/SLA", 20, "Performance", "%", ">=", "90", "98", "", "90", "98", ""],
    ["Esteio", "Supervisor", t, "DISPONIBILIDADE DE ATIVOS CRÍTICOS", 20, "Performance", "%", ">=", "90", "83,31", "", "90", "83,59", ""],
    ["Esteio", "Supervisor", t, "TAXA DE REABERTURA", 10, "Performance", "%", "<=", "2", "0,00", "", "2", "4,76", ""]
  ];

  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, METAS_COLS_FULL.length).setValues(linhas);
  Logger.log("✅ Esteio/Supervisor adicionado na aba METAS. Rode ATUALIZAR_METAS().");
}
