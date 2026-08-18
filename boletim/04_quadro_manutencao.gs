/**
 * ARQUIVO: 04_quadro_manutencao.gs
 * Slide "Manutenção Corretiva" — os três escopos num arquivo só.
 *
 * Junta gerarSlide05_QuadroManutencao, gerarSlide05_QuadroManutencao_Facilities
 * (que viviam aqui) e gerarSlide05_QuadroManutencao_Hangar (que era o arquivo
 * 05_quadro_manutencao_hangar.gs). Os três desenhavam o MESMO slide — cartões
 * de KPI, gráfico da fila acumulada, painel de composição, rodapé — e
 * divergiam só em:
 *
 *   · qual aba ler e em que linha/célula está cada número;
 *   · quais equipes viram cartão e série do gráfico;
 *   · quais fatias entram na composição.
 *
 * Isso agora é DADO (BOL_CORRETIVAS) e o desenho é um só.
 *
 * DOIS BUGS QUE A DUPLICAÇÃO ESCONDIA, corrigidos de graça ao juntar:
 *   · a variante Hangar não tinha a folga "sem quebra" do rótulo de barra, e
 *     por isso quebrava valor de 3 dígitos em duas linhas — o mesmo defeito
 *     que já tinha sido corrigido aqui e nunca chegou lá;
 *   · a variante Facilities tinha a folga mas não o setLineSpacing(100) que a
 *     acompanha.
 */

// ==========================================================================
// OS TRÊS ESCOPOS
// ==========================================================================
// `aba: null` = a aba padrão do design system. As cores vão como NOME, não
// como valor: este `const` pode ser avaliado antes do Config.gs, e ler
// `CR_DESIGN_SYSTEM.colors.x` aqui em cima estouraria ReferenceError.
//
// `kpis.TOTAL: null` = não há célula de total; soma as equipes lidas. É o caso
// do escopo Facilities, cujo total é "sem Hangar" por definição.
//
// `barW`/`offset` ficam escritos e não calculados de propósito: são os valores
// que cada variante já usava, e derivá-los mudaria a posição das barras na
// tela sem ninguém ter pedido.
const BOL_CORRETIVAS = {
  COMPLETO: {
    aba: null,
    subtitulo: 'Visão Executiva',
    linhaCabecalho: 180,
    cabecalhoEhData: false,          // linha 180 traz nome de mês, não data
    linhasHist: { FACILITIES: 182, PROPERTY: 183, OPERACAO: 185 },
    kpis: { FACILITIES: 'C37', PROPERTY: 'C38', OPERACAO: 'C39', TOTAL: 'C40' },
    celulaLocatarios: 'F40',
    usaBaseBruta: true,              // BD-CORRETIVAS manda; a planilha é reserva
    cards: [
      { titulo: 'Backlog Total',   fonte: 'TOTAL',      cor: 'brandDark',    principal: true },
      { titulo: 'Facilities',      fonte: 'FACILITIES', cor: 'brandSoft'    },
      { titulo: 'Property',        fonte: 'PROPERTY',   cor: 'brandMed'     },
      { titulo: 'Locatários',      fonte: 'LOCATARIO',  cor: 'accentOrange' },
      { titulo: 'Operação Hangar', fonte: 'OPERACAO',   cor: 'brandLight'   }
    ],
    series: [
      { equipe: 'FACILITIES', label: 'FACILITIES',       cor: 'brandSoft',  offset: -20 },
      { equipe: 'PROPERTY',   label: 'PROPERTY',         cor: 'brandDark',  offset:  -6 },
      { equipe: 'OPERACAO',   label: 'OPERAÇÃO HANGAR',  cor: 'brandLight', offset:   8 }
    ],
    barW: 12,
    composicao: [
      { label: 'CORRETIVAS',            celula: 'G40', cor: 'brandDark'    },
      { label: 'MELHORIAS /\nPROJETOS', celula: 'D40', cor: 'accentOrange' },
      { label: 'PROJETOS',              celula: 'E40', cor: 'brandMed'     },
      { label: 'LOCATÁRIOS',            celula: 'F40', cor: 'brandLight'   }
    ]
  },

  FACILITIES: {
    aba: null,
    subtitulo: 'Visão Executiva',
    linhaCabecalho: 180,
    cabecalhoEhData: false,
    linhasHist: { FACILITIES: 182, PROPERTY: 183 },
    kpis: { FACILITIES: 'C37', PROPERTY: 'C38', TOTAL: null },
    celulaLocatarios: 'F40',
    usaBaseBruta: false,
    cards: [
      { titulo: 'Backlog Total', fonte: 'TOTAL',      cor: 'brandDark',    principal: true },
      { titulo: 'Facilities',    fonte: 'FACILITIES', cor: 'brandSoft'    },
      { titulo: 'Property',      fonte: 'PROPERTY',   cor: 'brandMed'     },
      { titulo: 'Locatários',    fonte: 'LOCATARIO',  cor: 'accentOrange' }
    ],
    series: [
      { equipe: 'FACILITIES', label: 'FACILITIES', cor: 'brandSoft', offset: -10 },
      { equipe: 'PROPERTY',   label: 'PROPERTY',   cor: 'brandDark', offset:   4 }
    ],
    barW: 14,
    composicao: [
      { label: 'CORRETIVAS',            celula: 'G40', cor: 'brandDark'    },
      { label: 'MELHORIAS /\nPROJETOS', celula: 'D40', cor: 'accentOrange' },
      { label: 'PROJETOS',              celula: 'E40', cor: 'brandMed'     },
      { label: 'LOCATÁRIOS',            celula: 'F40', cor: 'brandLight'   }
    ]
  },

  HANGAR: {
    aba: 'hangar QUADRO COMPARATIVO',
    subtitulo: 'Visão Executiva — Hangar VIP',
    linhaCabecalho: 40,
    cabecalhoEhData: true,           // linha 40 traz data; vira DD/MM
    linhasHist: { FACILITIES: 41, PROPERTY: 42, OPERACAO: 43 },
    kpis: { PROPERTY: 'C11', OPERACAO: 'C12', TOTAL: 'C13' },
    celulaLocatarios: null,          // Hangar não separa Locatários
    usaBaseBruta: false,
    cards: [
      { titulo: 'Backlog Total',   fonte: 'TOTAL',    cor: 'brandDark',  principal: true },
      { titulo: 'Property',        fonte: 'PROPERTY', cor: 'brandMed'   },
      { titulo: 'Operação Hangar', fonte: 'OPERACAO', cor: 'brandLight' }
    ],
    series: [
      { equipe: 'PROPERTY', label: 'PROPERTY',   cor: 'brandDark',  offset: -10 },
      { equipe: 'OPERACAO', label: 'OP. HANGAR', cor: 'brandLight', offset:   4 }
    ],
    barW: 14,
    composicao: [
      { label: 'CORRETIVAS', celula: 'F13', cor: 'brandDark'    },
      { label: 'MELHORIAS',  celula: 'D13', cor: 'accentOrange' },
      { label: 'PROJETOS',   celula: 'E13', cor: 'brandMed'     }
    ]
  }
};


// ==========================================================================
// PONTOS DE ENTRADA
// ==========================================================================
// Sem parâmetro: o menu "Selecionar função" do editor não lista função que
// declara argumento. São estes nomes que o BOLETINS de 00_Main.gs chama.
function gerarSlide05_QuadroManutencao()            { return _bolCorretivas_('COMPLETO');   }
function gerarSlide05_QuadroManutencao_Facilities() { return _bolCorretivas_('FACILITIES'); }
function gerarSlide05_QuadroManutencao_Hangar()     { return _bolCorretivas_('HANGAR');     }


// ==========================================================================
// DESENHO — um só, para os três
// ==========================================================================
function _bolCorretivas_(chave) {
  const cfg = BOL_CORRETIVAS[chave];
  if (!cfg) {
    throw new Error('Escopo "' + chave + '" não existe em BOL_CORRETIVAS. Tem: ' +
                    Object.keys(BOL_CORRETIVAS).join(', ') + '.');
  }
  const cor = function (nome) { return CR_DESIGN_SYSTEM.colors[nome]; };

  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide        = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth    = presentation.getPageWidth();
  const pageHeight   = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  const nomeAba = cfg.aba || CR_DESIGN_SYSTEM.assets.sheetName;
  Logger.log('Extraindo Corretivas (' + chave + ') da aba "' + nomeAba + '"...');

  const NPT = 4;                          // pontos do gráfico da fila
  const zeros = function () { const a = []; for (let i = 0; i < NPT; i++) a.push(0); return a; };

  const hist = {};                        // equipe -> [4 valores]
  cfg.series.forEach(function (s) { hist[s.equipe] = zeros(); });
  let timeline = ['-', '-', '-', '-'];

  const kpi = { FACILITIES: 0, PROPERTY: 0, OPERACAO: 0, LOCATARIO: 0, TOTAL: 0 };
  const compVals = cfg.composicao.map(function () { return 0; });

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) throw new Error('Aba "' + nomeAba + '" não encontrada.');

    // --- Últimas 4 colunas com cabeçalho preenchido ---
    const lastCol   = sheet.getLastColumn();
    const headerRow = sheet.getRange(cfg.linhaCabecalho, 1, 1, lastCol).getValues()[0];

    let targetCols = [], tempTimeline = [];
    for (let i = headerRow.length - 1; i >= 1 && targetCols.length < NPT; i--) {
      if (headerRow[i] && headerRow[i].toString().trim() !== '') {
        targetCols.unshift(i + 1);
        tempTimeline.unshift(_bolRotuloPeriodo_(headerRow[i], cfg.cabecalhoEhData));
      }
    }
    while (tempTimeline.length < NPT) tempTimeline.unshift('-');
    timeline = tempTimeline;

    const lerLinha = function (rowNum) {
      const vals = [];
      targetCols.forEach(function (col) {
        vals.push(Number(sheet.getRange(rowNum, col).getValue()) || 0);
      });
      while (vals.length < NPT) vals.unshift(0);
      return vals;
    };
    cfg.series.forEach(function (s) {
      hist[s.equipe] = lerLinha(cfg.linhasHist[s.equipe]);
    });

    // --- Backlog atual, da tabela resumo ---
    // RESERVA quando o escopo usa base bruta: os valores abaixo são
    // substituídos logo adiante. Ficam aqui para o slide não quebrar se a
    // base estiver fora do ar.
    const lerCel = function (cel) {
      return cel ? (Number(sheet.getRange(cel).getValue()) || 0) : 0;
    };
    ['FACILITIES', 'PROPERTY', 'OPERACAO'].forEach(function (eq) {
      if (cfg.kpis[eq]) kpi[eq] = lerCel(cfg.kpis[eq]);
    });
    kpi.LOCATARIO = lerCel(cfg.celulaLocatarios);
    // Sem célula de total, o total É a soma das equipes lidas — é assim que o
    // escopo Facilities chega ao "total sem Hangar".
    kpi.TOTAL = cfg.kpis.TOTAL
      ? lerCel(cfg.kpis.TOTAL)
      : (kpi.FACILITIES + kpi.PROPERTY + kpi.OPERACAO);

    // --- Composição: uma célula por fatia ---
    cfg.composicao.forEach(function (c, i) { compVals[i] = lerCel(c.celula); });

  } catch (e) {
    Logger.log('Erro Corretivas ' + chave + ': ' + e.message);
  }

  // --- FONTE PREFERENCIAL: BASE BRUTA (Dados.gs) ---------------------------
  // Só o escopo COMPLETO por enquanto: obterQuadroCorretivasBoletim_ conta a
  // carteira inteira, e ainda não sabe recortar por Megas ou por Hangar.
  // Ligar os outros dois aqui mudaria o número na tela — quando a função
  // souber filtrar, é só virar `usaBaseBruta` no descritor acima.
  let q = null;
  if (cfg.usaBaseBruta && typeof obterQuadroCorretivasBoletim_ === 'function') {
    q = obterQuadroCorretivasBoletim_(NPT);
  }
  if (q) {
    kpi.FACILITIES = q.kpis.facilities;
    kpi.PROPERTY   = q.kpis.property;
    kpi.OPERACAO   = q.kpis.operacao;
    kpi.LOCATARIO  = q.kpis.locatarios;
    kpi.TOTAL      = q.kpis.total;

    cfg.series.forEach(function (s) {
      hist[s.equipe] = q.historico.map(function (h) { return h[s.equipe]; });
    });
    timeline = q.meses;

    Logger.log('Slide 05 (' + chave + '): fonte = BD-CORRETIVAS. Fila hoje ' + kpi.TOTAL +
               ' (Fac ' + kpi.FACILITIES + ' / Prop ' + kpi.PROPERTY +
               ' / Loc ' + kpi.LOCATARIO + ' / Oper ' + kpi.OPERACAO + ').');

    // A composição também sai da base (por disciplina), então FECHA com o
    // total por construção. Confere mesmo assim: se um dia não fechar, é
    // porque a regra de "aberto" divergiu entre as duas contas.
    const somaComp = (q.composicao || []).reduce(function (a, c) { return a + c.val; }, 0);
    if (somaComp && somaComp !== kpi.TOTAL) {
      Logger.log('⚠️ Slide 05: composição soma ' + somaComp + ' mas o backlog é ' + kpi.TOTAL + '.');
    }
  } else if (cfg.usaBaseBruta) {
    Logger.log('Slide 05 (' + chave + '): base bruta indisponível — usando os valores digitados na planilha.');
  }

  // --- Variação vs período anterior ---
  // Mesma conta em dois instantes, na MESMA fonte. Antes era o cartão (tabela
  // resumo) contra o histórico (linha 182) — duas fontes, então a seta podia
  // mostrar movimento que não houve.
  const totPrev = q ? q.kpis.totalAnterior
                    : cfg.series.reduce(function (a, s) { return a + hist[s.equipe][NPT - 2]; }, 0);
  const diffTot = kpi.TOTAL - totPrev;

  const formatTrend = function (d) { return d > 0 ? '↑ +' + d : d < 0 ? '↓ ' + d : '= 0'; };
  const getPct = function (v) {
    return kpi.TOTAL > 0 ? Math.round((v / kpi.TOTAL) * 100) + '% do total' : '0% do total';
  };

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO ---
  // =========================================================
  slide.getBackground().setSolidFill(cor('bgSlide'));

  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 400, -100, 500, 500);
  ellipse.getFill().setSolidFill(cor('brandLight'), 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY,
                      CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch (e) {}

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40)
    .getText().setText('Manutenção Corretiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(cor('textMain')).setBold(true);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30)
    .getText().setText(cfg.subtitulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(cor('textBody'));

  // =========================================================
  // --- 2. CARTÕES DE KPI ---
  // =========================================================
  // A largura sai da QUANTIDADE de cartões do escopo: 5 no completo, 4 no
  // Facilities, 3 no Hangar. Antes cada cópia tinha o divisor escrito na mão.
  const nCards   = cfg.cards.length;
  const kpiY     = marginY + 75;
  const kpiH     = 65;
  const kpiGap   = 10;
  const kpiWidth = (pageWidth - (marginX * 2) - (kpiGap * (nCards - 1))) / nCards;

  cfg.cards.forEach(function (m, i) {
    const x     = marginX + (i * (kpiWidth + kpiGap));
    const value = kpi[m.fonte];
    const sub   = (m.fonte === 'TOTAL') ? formatTrend(diffTot) + ' vs per. ant.' : getPct(value);
    const c     = cor(m.cor);

    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiWidth, kpiH);
    card.getFill().setSolidFill(cor('cardBg'));
    card.getBorder().getLineFill().setSolidFill(cor('lines'));

    const sideBorder = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    sideBorder.getFill().setSolidFill(c);
    sideBorder.getBorder().setTransparent();

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiWidth - 15, kpiH - 10);
    box.getText().setText(m.titulo.toUpperCase() + '\n' + value + '\n' + sub);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(105);

    txt.getRange(0, m.titulo.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(cor('textBody'));
    txt.getRange(m.titulo.length + 1, m.titulo.length + 1 + value.toString().length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(18).setBold(true)
      .setForegroundColor(m.principal ? c : cor('textMain'));
    txt.getRange(m.titulo.length + 1 + value.toString().length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(sub.indexOf('↑') >= 0 ? cor('accentRed') : cor('textBody'));
  });

  // =========================================================
  // --- 3. GRÁFICO DA FILA ACUMULADA ---
  // =========================================================
  const mainAreaY  = kpiY + kpiH + 15;
  const mainAreaH  = pageHeight - mainAreaY - marginY - 20;
  const sideWidth  = 290;
  const chartWidth = (pageWidth - (marginX * 2)) - sideWidth - 15;

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, mainAreaY, chartWidth, mainAreaH);
  chartFrame.getFill().setSolidFill(cor('cardBg'));
  chartFrame.getBorder().getLineFill().setSolidFill(cor('lines'));

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, mainAreaY + 12, 300, 25).getText()
    .setText('COMPORTAMENTO DA FILA ACUMULADA').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(cor('brandMed'));

  // Legenda: shapes independentes (quadrado + texto), não indexação de
  // caracteres numa string só — que era frágil e já tinha quebrado.
  const legendY = mainAreaY + 40;
  let legendCursorX = marginX + 20;
  cfg.series.forEach(function (s) {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legendCursorX, legendY, 10, 10);
    sq.getFill().setSolidFill(cor(s.cor));
    sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + 14, legendY - 2, 70, 14);
    lbl.getText().setText(s.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(cor('textBody'));
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legendCursorX += 90;
  });

  const pMarginX = 50, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = mainAreaY + pMarginY;
  const plotW = chartWidth - (pMarginX * 2);
  const plotH = mainAreaH - (pMarginY + 35);

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(cor('lines'));

  const stepX = plotW / (timeline.length - 1);
  timeline.forEach(function (m, i) {
    const x  = plotX + (i * stepX);
    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, plotY, x, plotY + plotH);
    vl.getLineFill().setSolidFill(cor('lines'));
    vl.setDashStyle(SlidesApp.DashStyle.DASH);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - 50, plotY + plotH + 5, 100, 20);
    lbl.getText().setText(m).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true)
      .setForegroundColor(cor('textBody'));
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  const barW = cfg.barW;
  let todos = [10];
  cfg.series.forEach(function (s) { todos = todos.concat(hist[s.equipe]); });
  const scaleYLine = plotH / (Math.max.apply(null, todos) * 1.4);

  // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra do CLAUDE.md): a
  // TEXT_BOX tem ~7pt de recuo interno de CADA lado que a API não deixa
  // desligar. Numa caixa de 32pt sobram ~18pt úteis, e um valor de 3 dígitos
  // quebrava a linha — a tela chegou a mostrar "29" em cima de uma barra de
  // 329, com o "3" empurrado para fora. A caixa é invisível: alargá-la
  // simetricamente não muda a barra nem o espaçamento. O setLineSpacing(100)
  // impede que uma quebra residual empurre o número para longe da barra.
  //
  // Isto valia só para o escopo COMPLETO enquanto eram três arquivos; a
  // variante Hangar quebrava e ninguém tinha levado a correção para lá.
  const folga = 16;

  cfg.series.forEach(function (s) {
    const valores = hist[s.equipe];
    const c = cor(s.cor);
    for (let i = 0; i < valores.length; i++) {
      const val = valores[i];
      const h   = Math.max(val * scaleYLine, 1);
      const bX  = plotX + (i * stepX) + s.offset;
      const bY  = (plotY + plotH) - h;

      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, h);
      rect.getFill().setSolidFill(c);
      rect.getBorder().setTransparent();

      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
        bX - 10 - folga, bY - 14, barW + 20 + folga * 2, 15);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
        .setForegroundColor(c);
      txtBox.getText().getParagraphStyle()
        .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
    }
  });

  // =========================================================
  // --- 4. PAINEL DE COMPOSIÇÃO (direita) ---
  // =========================================================
  const rankCardX = marginX + chartWidth + 15;
  const rankFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rankCardX, mainAreaY, sideWidth, mainAreaH);
  rankFrame.getFill().setSolidFill(cor('cardBg'));
  rankFrame.getBorder().getLineFill().setSolidFill(cor('lines'));

  // Da base quando ela responde (por DISCIPLINA), senão as células por TIPO.
  // Ver obterComposicaoBacklogBoletim_ em Dados.gs para o porquê: a
  // BD-CORRETIVAS não tem coluna que separe Corretivas/Melhorias/Projetos, e
  // as células digitadas vieram vazias, deixando o painel com zeros na tela.
  const compBase = (q && q.composicao && q.composicao.length) ? q.composicao : null;

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rankCardX + 15, mainAreaY + 12, sideWidth - 30, 25).getText()
    .setText(compBase ? 'COMPOSIÇÃO POR DISCIPLINA' : 'COMPOSIÇÃO POR TIPO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(cor('brandMed'));

  const PALETA_COMP = ['brandDark', 'accentOrange', 'brandMed', 'brandLight', 'brandSoft'];

  let rankData;
  if (compBase) {
    // A maior fatia define a escala da barra — assim a leitura é comparativa
    // entre as disciplinas, que é a pergunta ("onde está concentrada a fila?").
    const maiorComp = Math.max.apply(null, compBase.map(function (c) { return c.val; }));
    rankData = compBase.map(function (c, i) {
      return {
        label : c.label.toUpperCase(),
        val   : c.val,
        pct   : c.pct + '%',
        color : cor(PALETA_COMP[i % PALETA_COMP.length]),
        factor: maiorComp > 0 ? c.val / maiorComp : 0
      };
    });
  } else {
    const rankTot = compVals.reduce(function (a, v) { return a + v; }, 0);
    rankData = cfg.composicao.map(function (c, i) {
      return {
        label : c.label,
        val   : compVals[i],
        pct   : (rankTot > 0 ? Math.round((compVals[i] / rankTot) * 100) : 0) + '%',
        color : cor(c.cor),
        factor: rankTot > 0 ? compVals[i] / rankTot : 0
      };
    });
  }

  // rowH calculado para caber todos os itens dentro do painel — a lista muda
  // de tamanho conforme o escopo e conforme a fonte (disciplina x tipo).
  const rankHeaderH = 45, rankGap = 6;
  const rowH = Math.floor((mainAreaH - rankHeaderH - (rankGap * (rankData.length - 1))) / rankData.length);
  let currentRankY  = mainAreaY + rankHeaderH;
  const labelX = rankCardX + 10, dataX = rankCardX + 95, barX = rankCardX + 155;
  const maxBarWidth = sideWidth - (barX - rankCardX) - 15;

  rankData.forEach(function (d) {
    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, labelX, currentRankY, 80, rowH);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lblBox.getText().setText(d.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(6.5).setBold(true)
      .setForegroundColor(cor('textMain'));

    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX, currentRankY, 55, rowH);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    valBox.getText().setText(d.val + ' (' + d.pct + ')').getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7.5).setBold(true)
      .setForegroundColor(d.color);

    const barHeight  = (d.label === 'CORRETIVAS') ? 12 : 8;
    const barYOffset = (rowH / 2) - (barHeight / 2);

    const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOffset, maxBarWidth, barHeight);
    bgBar.getFill().setSolidFill(cor('lines'), 0.4);
    bgBar.getBorder().setTransparent();

    const progressW = maxBarWidth * d.factor;
    if (progressW > 0.5) {
      const progressBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOffset, progressW, barHeight);
      progressBar.getFill().setSolidFill(d.color);
      progressBar.getBorder().setTransparent();
    }

    currentRankY += rowH + rankGap;
  });

  // =========================================================
  // --- 5. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(cor('textBody'));

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 05').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(cor('textBody'));
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log('✅ Slide 05 (Corretivas — ' + chave + ') concluído!');
}


/**
 * Rótulo do eixo X a partir da célula de cabeçalho.
 *
 * `ehData` NÃO é decoração: a aba do Hangar traz data de verdade na linha 40
 * (vira DD/MM), enquanto a linha 180 da aba geral traz nome de mês. Tentar
 * `new Date()` no nome do mês pode dar uma data válida e trocar o rótulo por
 * algo que ninguém escreveu — por isso quem manda é o escopo, não a adivinhação.
 */
function _bolRotuloPeriodo_(bruto, ehData) {
  if (ehData) {
    let d = null;
    if (bruto instanceof Date) {
      d = bruto;
    } else {
      const p = new Date(bruto.toString());
      if (!isNaN(p.getTime())) d = p;
    }
    if (d) {
      return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    }
  }
  return bruto.toString().trim().toUpperCase();
}


// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só a Manutenção Corretiva, no escopo pedido.
// Passam pelo motor do 00_Main.gs, que aplica e restaura o tema. Sem
// parâmetro, para aparecer no menu "Selecionar função" do editor.
function verManutencaoCorretiva()            { return _bolVerSlide_('COMPLETO',   'Manutenção Corretiva'); }
function verManutencaoCorretivaFacilities()  { return _bolVerSlide_('FACILITIES', 'Manutenção Corretiva'); }
function verManutencaoCorretivaHangar()      { return _bolVerSlide_('HANGAR',     'Manutenção Corretiva'); }
