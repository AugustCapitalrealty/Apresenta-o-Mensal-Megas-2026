/**
 * ARQUIVO: 04_quadro_manutencao.gs
 * Slide "Manutenção Corretiva" — os três escopos num arquivo só.
 *
 * Junta gerarSlide05_QuadroManutencao, _Facilities (que viviam aqui) e
 * _Hangar (que era 05_quadro_manutencao_hangar.gs).
 *
 * O QUE É IGUAL NOS TRÊS: o desenho inteiro — cartões de KPI, gráfico da fila,
 * legenda, painel de composição, rodapé. É por isso que dá para ser uma função
 * só, e é por isso que valia juntar: os últimos ajustes (folga do rótulo,
 * legenda do tamanho da palavra) foram feitos em duas variantes e esquecidos
 * na terceira.
 *
 * O QUE É DIFERENTE: só a AQUISIÇÃO dos dados, e não em detalhe — em
 * estratégia. Por isso há duas leitoras nomeadas, escolhidas pelo descritor:
 *
 *   · _bolLerUltimasColunas_ — pega as últimas N colunas preenchidas de uma
 *     linha (completo e Hangar). Uma linha por equipe.
 *   · _bolLerSomaLinhas_ — soma um bloco de linhas por coluna (Facilities:
 *     cada mês é a soma dos 3 Megas, e o número de pontos varia).
 *
 * A mesma separação vale para a seta dos cartões: 'PERIODO' compara com o
 * ponto anterior do próprio histórico; 'SEMANAL' lê a seção semanal da aba dos
 * Megas. Uma tentativa anterior de unificar tratou isso como "célula
 * diferente" e teria quebrado o boletim Facilities.
 */

// ==========================================================================
// OS TRÊS ESCOPOS
// ==========================================================================
// As cores vão como NOME, não como valor: este `const` pode ser avaliado antes
// do Config.gs, e ler `CR_DESIGN_SYSTEM.colors.x` aqui em cima estouraria
// ReferenceError. Mesmo motivo pelo qual o `tema` em 00_Main.gs é texto.
//
// `barW`/`offset`/`lblCaixa` ficam escritos e não calculados: são os valores
// que cada variante já usava, medidos no deck real. Derivá-los mudaria a
// posição das barras sem ninguém ter pedido. 'auto' só onde o número de
// pontos varia (Facilities), que é onde não dá para fixar.
const BOL_CORRETIVAS = {
  COMPLETO: {
    aba: null,                       // null = a aba padrão do design system
    subtitulo: 'Visão Executiva',
    escopoCC: null,                  // carteira inteira
    leitura: 'ULTIMAS_COLUNAS',
    seta: 'PERIODO',
    grafico: {
      linhaRotulos: 180,
      rotuloEhData: false,           // linha 180 traz nome de mês, não data
      pontos: 4,
      linhas: { FACILITIES: 182, PROPERTY: 183, OPERACAO: 185 }
    },
    // Tabela EQUIPE. Estes endereços JÁ mudaram uma vez: a linha "Resp.
    // Locatário" entrou e empurrou o TOTAL de C40 para C41.
    kpis: { FACILITIES: 'C37', PROPERTY: 'C38', OPERACAO: 'C39', LOCATARIO: 'C40', TOTAL: 'C41' },
    cards: [
      { titulo: 'Backlog Total',   fonte: 'TOTAL',      cor: 'brandDark',    principal: true },
      { titulo: 'Facilities',      fonte: 'FACILITIES', cor: 'brandSoft'    },
      { titulo: 'Property',        fonte: 'PROPERTY',   cor: 'brandMed'     },
      { titulo: 'Locatários',      fonte: 'LOCATARIO',  cor: 'accentOrange' },
      { titulo: 'Operação Hangar', fonte: 'OPERACAO',   cor: 'brandLight'   }
    ],
    series: [
      { equipe: 'FACILITIES', label: 'FACILITIES',      cor: 'brandSoft',  offset: -24 },
      { equipe: 'PROPERTY',   label: 'PROPERTY',        cor: 'brandDark',  offset:  -6 },
      { equipe: 'OPERACAO',   label: 'OPERAÇÃO HANGAR', cor: 'brandLight', offset:  12 }
    ],
    barW: 12,
    lblCaixa: 26,
    // Tabela ACUMULADO, linha TOTAL (41). D41 é Melhorias e E41 é Projetos —
    // as duas fórmulas CONT.SES da planilha ("*Melhoria*" e "*Consulta*").
    composicao: [
      { label: 'CORRETIVAS', celula: 'G41' },
      { label: 'MELHORIAS',  celula: 'D41' },
      { label: 'PROJETOS',   celula: 'E41' },
      { label: 'LOCATÁRIOS', celula: 'F41' }
    ]
  },

  FACILITIES: {
    aba: 'megas QUADRO COMPARATIVO',
    subtitulo: 'Visão Executiva',
    escopoCC: ['MEGA CURITIBA', 'MEGA ITAJAI', 'MEGA ESTEIO'],
    leitura: 'SOMA_LINHAS',
    seta: 'SEMANAL',
    grafico: {
      linhaRotulos: 111,
      rotuloAbreviado: true,         // "ABRIL" vira "ABR"
      // Cada mês é a soma dos 3 Megas. IGNORA a linha 124 (Mega Canoas).
      blocos: { FACILITIES: [117, 3], PROPERTY: [121, 3] },
      colInicio: 2                   // primeira coluna de dado (0-based)
    },
    // Seção POR MEGA SEMANAL: 3 linhas por categoria, uma por Mega.
    semanal: { FACILITIES: [66, 3], PROPERTY: [70, 3], LOCATARIO: [62, 3] },
    kpis: { FACILITIES: 'C26', PROPERTY: 'C27', LOCATARIO: 'C28', TOTAL: 'C29' },
    cards: [
      { titulo: 'Backlog Total', fonte: 'TOTAL',      cor: 'brandDark',    principal: true },
      { titulo: 'Facilities',    fonte: 'FACILITIES', cor: 'brandSoft'    },
      { titulo: 'Property',      fonte: 'PROPERTY',   cor: 'brandMed'     },
      { titulo: 'Locatários',    fonte: 'LOCATARIO',  cor: 'accentOrange' }
    ],
    series: [
      { equipe: 'FACILITIES', label: 'FACILITIES', cor: 'brandSoft' },
      { equipe: 'PROPERTY',   label: 'PROPERTY',   cor: 'brandDark' }
    ],
    barW: 'auto',                    // o nº de meses varia; a barra acompanha
    lblCaixa: 'auto',
    composicao: [
      { label: 'CORRETIVAS', celula: 'F29' },
      { label: 'MELHORIAS',  celula: 'D29' },
      { label: 'PROJETOS',   celula: 'E29' }
    ]
  },

  HANGAR: {
    aba: 'hangar QUADRO COMPARATIVO',
    subtitulo: 'Visão Executiva — Hangar VIP',
    escopoCC: ['HANGAR VIP'],
    leitura: 'ULTIMAS_COLUNAS',
    seta: 'PERIODO',
    grafico: {
      linhaRotulos: 40,
      rotuloEhData: true,            // linha 40 traz data; vira DD/MM
      pontos: 4,
      linhas: { PROPERTY: 42, OPERACAO: 43 }
    },
    kpis: { PROPERTY: 'C11', OPERACAO: 'C12', TOTAL: 'C13' },
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
    lblCaixa: 34,
    composicao: [
      { label: 'CORRETIVAS', celula: 'F13' },
      { label: 'MELHORIAS',  celula: 'D13' },
      { label: 'PROJETOS',   celula: 'E13' }
    ]
  }
};

// Cor por RÓTULO e não por posição: a fatia Melhorias sai laranja esteja ela
// em que linha estiver. Por posição, a mesma cor mudaria de significado entre
// um escopo de 3 fatias e outro de 4.
const BOL_COR_COMPOSICAO = {
  'CORRETIVAS': 'brandDark', 'MELHORIAS': 'accentOrange',
  'PROJETOS':   'brandMed',  'LOCATÁRIOS': 'brandLight'
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
// LEITORAS — a única coisa que diverge entre os escopos
// ==========================================================================

/**
 * Últimas N colunas preenchidas, uma linha por equipe (completo e Hangar).
 * Devolve { hist: {equipe: [n]}, timeline: [n] }.
 */
function _bolLerUltimasColunas_(sheet, cfg, equipes) {
  const g = cfg.grafico;
  const n = g.pontos;
  const lastCol = sheet.getLastColumn();
  const rotulos = sheet.getRange(g.linhaRotulos, 1, 1, lastCol).getValues()[0];

  const cols = [], timeline = [];
  for (let i = rotulos.length - 1; i >= 1 && cols.length < n; i--) {
    if (rotulos[i] && rotulos[i].toString().trim() !== '') {
      cols.unshift(i + 1);
      timeline.unshift(_bolRotuloPeriodo_(rotulos[i], g.rotuloEhData));
    }
  }
  while (timeline.length < n) timeline.unshift('-');

  const hist = {};
  equipes.forEach(function (eq) {
    const vals = [];
    cols.forEach(function (c) {
      vals.push(Number(sheet.getRange(g.linhas[eq], c).getValue()) || 0);
    });
    while (vals.length < n) vals.unshift(0);
    hist[eq] = vals;
  });
  return { hist: hist, timeline: timeline };
}

/**
 * Um bloco de linhas somado por coluna (Facilities: cada mês é a soma dos 3
 * Megas). O número de pontos NÃO é fixo — sai de quantas colunas têm dado.
 */
function _bolLerSomaLinhas_(sheet, cfg, equipes) {
  const g = cfg.grafico;
  const lastCol = sheet.getLastColumn();
  const rotulos = sheet.getRange(g.linhaRotulos, 1, 1, lastCol).getValues()[0];

  const blocos = {};
  equipes.forEach(function (eq) {
    const b = g.blocos[eq];
    blocos[eq] = sheet.getRange(b[0], 1, b[1], lastCol).getValues();
  });

  const hist = {}, timeline = [];
  equipes.forEach(function (eq) { hist[eq] = []; });
  const ref = blocos[equipes[0]];

  for (let i = g.colInicio; i < lastCol; i++) {
    const temDado = ref.some(function (r) {
      return r[i] !== '' && r[i] !== null && !isNaN(Number(r[i])) && Number(r[i]) !== 0;
    });
    if (!temDado) continue;
    equipes.forEach(function (eq) { hist[eq].push(_bolSomaColuna_(blocos[eq], i)); });
    const raw = rotulos[i];
    timeline.push(raw
      ? (g.rotuloAbreviado ? raw.toString().trim().substring(0, 3).toUpperCase()
                           : raw.toString().trim().toUpperCase())
      : '');
  }

  // Gráfico vazio quebraria a escala; uma barra de zero é honesta e não quebra.
  if (!timeline.length) {
    equipes.forEach(function (eq) { hist[eq] = [0]; });
    timeline.push('-');
  }
  return { hist: hist, timeline: timeline };
}

function _bolSomaColuna_(linhas, i) {
  return linhas.reduce(function (s, r) { return s + (Number(r[i]) || 0); }, 0);
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

  const equipes = cfg.series.map(function (s) { return s.equipe; });

  // =========================================================
  // --- 0. DADOS: primeiro a planilha (reserva), depois a base bruta ---
  // =========================================================
  const nomeAba = cfg.aba || CR_DESIGN_SYSTEM.assets.sheetName;
  Logger.log('Extraindo Corretivas (' + chave + ') da aba "' + nomeAba + '"...');

  const kpi = { FACILITIES: 0, PROPERTY: 0, OPERACAO: 0, LOCATARIO: 0, TOTAL: 0 };
  const compVals = cfg.composicao.map(function () { return 0; });
  let hist = {}, timeline = ['-'];
  let deltaSemanal = null;   // só no escopo com seta SEMANAL
  equipes.forEach(function (eq) { hist[eq] = [0]; });

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) throw new Error('Aba "' + nomeAba + '" não encontrada.');

    const lido = (cfg.leitura === 'SOMA_LINHAS')
      ? _bolLerSomaLinhas_(sheet, cfg, equipes)
      : _bolLerUltimasColunas_(sheet, cfg, equipes);
    hist     = lido.hist;
    timeline = lido.timeline;

    const lerCel = function (cel) {
      return cel ? (Number(sheet.getRange(cel).getValue()) || 0) : 0;
    };
    Object.keys(cfg.kpis).forEach(function (k) { kpi[k] = lerCel(cfg.kpis[k]); });
    cfg.composicao.forEach(function (c, i) { compVals[i] = lerCel(c.celula); });

    if (cfg.seta === 'SEMANAL') deltaSemanal = _bolDeltasSemanais_(sheet, cfg);

  } catch (e) {
    Logger.log('Erro Corretivas ' + chave + ': ' + e.message);
  }

  // --- FONTE PREFERENCIAL: BASE BRUTA (Dados.gs) ---------------------------
  // Os cartões, o gráfico e a composição saem da BD-CORRETIVAS, contados com a
  // mesma regra de "aberto" e recortados pelo Centro de Custos do escopo. Com
  // isso a soma FECHA por construção — cada chamado cai em exatamente uma
  // equipe e em exatamente uma fatia — em vez de depender de células digitadas
  // em lugares diferentes concordarem entre si.
  const q = (typeof obterQuadroCorretivasBoletim_ === 'function')
    ? obterQuadroCorretivasBoletim_(4, cfg.escopoCC) : null;
  if (q) {
    kpi.FACILITIES = q.kpis.facilities;
    kpi.PROPERTY   = q.kpis.property;
    kpi.OPERACAO   = q.kpis.operacao;
    kpi.LOCATARIO  = q.kpis.locatarios;
    kpi.TOTAL      = q.kpis.total;

    equipes.forEach(function (eq) {
      hist[eq] = q.historico.map(function (h) { return h[eq]; });
    });
    timeline = q.meses;

    Logger.log('Slide 05 (' + chave + '): fonte = BD-CORRETIVAS. Fila hoje ' + kpi.TOTAL +
               ' (Fac ' + kpi.FACILITIES + ' / Prop ' + kpi.PROPERTY +
               ' / Loc ' + kpi.LOCATARIO + ' / Oper ' + kpi.OPERACAO + ').');

    const somaComp = (q.composicao || []).reduce(function (a, c) { return a + c.val; }, 0);
    if (somaComp && somaComp !== kpi.TOTAL) {
      Logger.log('⚠️ Slide 05: composição soma ' + somaComp + ' mas o backlog é ' + kpi.TOTAL + '.');
    }
  } else {
    Logger.log('Slide 05 (' + chave + '): base bruta indisponível — usando os valores digitados na planilha.');
  }

  // --- SETA DE CADA CARTÃO ---
  // Vindo da base, a seta usa o ponto anterior do MESMO histórico: os dois
  // lados da comparação saem da mesma contagem. A seção semanal da planilha só
  // entra quando a base não respondeu — misturar as duas faria o cartão dizer
  // um número e a seta comparar outro.
  const anterior = q ? {
    TOTAL: q.anterior.total, FACILITIES: q.anterior.facilities,
    PROPERTY: q.anterior.property, LOCATARIO: q.anterior.locatarios,
    OPERACAO: q.anterior.operacao
  } : null;
  const usaSemanal = !q && cfg.seta === 'SEMANAL' && deltaSemanal;
  const sufixo = usaSemanal ? ' vs sem. ant.' : ' vs per. ant.';

  const delta = function (fonte) {
    if (anterior) return kpi[fonte] - (anterior[fonte] || 0);
    if (usaSemanal) {
      if (fonte === 'TOTAL') {
        return Object.keys(deltaSemanal).reduce(function (a, k) { return a + deltaSemanal[k]; }, 0);
      }
      return deltaSemanal[fonte] || 0;
    }
    // Sem base e sem seção semanal: compara com o ponto anterior do histórico
    // da própria planilha.
    const somaPonto = function (i) {
      return equipes.reduce(function (a, eq) {
        const v = hist[eq]; return a + (v[i] === undefined ? 0 : v[i]);
      }, 0);
    };
    if (fonte !== 'TOTAL') return null;   // sem comparativo por equipe: mostra %
    const n = timeline.length;
    return kpi.TOTAL - (n >= 2 ? somaPonto(n - 2) : kpi.TOTAL);
  };

  const setaTexto = function (d) {
    return (d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '=') + sufixo;
  };
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
    const d     = delta(m.fonte);
    const sub   = (d === null) ? getPct(value) : setaTexto(d);
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
    // Backlog subindo é ruim (vermelho), caindo é bom (verde). Antes o ▼ ficava
    // cinza no escopo completo e verde no Facilities — mesma seta, duas
    // leituras, no mesmo slide.
    txt.getRange(m.titulo.length + 1 + value.toString().length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(sub.indexOf('▲') >= 0 ? cor('accentRed')
                        : sub.indexOf('▼') >= 0 ? cor('accentGreen') : cor('textBody'));
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
  // caracteres numa string só. A caixa tem o tamanho da PALAVRA — com largura
  // fixa, "OPERAÇÃO HANGAR" quebrava no Montserrat do tema Mega.
  const legendY = mainAreaY + 40;
  let legendCursorX = marginX + 20;
  cfg.series.forEach(function (s) {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legendCursorX, legendY, 10, 10);
    sq.getFill().setSolidFill(cor(s.cor));
    sq.getBorder().setTransparent();
    const textW = s.label.length * 6.2 + 8;
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + 14, legendY - 2, textW, 14);
    lbl.getText().setText(s.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(cor('textBody'));
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legendCursorX += 14 + textW + 18;
  });

  const pMarginX = 50, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = mainAreaY + pMarginY;
  const plotW = chartWidth - (pMarginX * 2);
  const plotH = mainAreaH - (pMarginY + 35);

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(cor('lines'));

  // Eixo adaptativo: o Facilities pode ter 8 meses onde os outros têm 4.
  const nPts  = Math.max(timeline.length, 1);
  const stepX = plotW / (nPts > 1 ? nPts - 1 : 1);
  const xFont = nPts > 5 ? 6 : 8;
  const xLblW = nPts > 5 ? 56 : 100;

  timeline.forEach(function (m, i) {
    const x  = plotX + (i * stepX);
    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, plotY, x, plotY + plotH);
    vl.getLineFill().setSolidFill(cor('lines'));
    vl.setDashStyle(SlidesApp.DashStyle.DASH);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - xLblW / 2, plotY + plotH + 5, xLblW, 20);
    lbl.getText().setText(m).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(xFont).setBold(true)
      .setForegroundColor(cor('textBody'));
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // Barras: largura fixa onde o nº de pontos é fixo; proporcional ao vão onde
  // ele varia (Facilities). Os deslocamentos seguem a mesma regra.
  const nSer = cfg.series.length;
  const barW = (cfg.barW === 'auto')
    ? Math.max(5, Math.min(14, Math.floor(stepX * 0.30)))
    : cfg.barW;
  const offsets = cfg.series.map(function (s, i) {
    return (s.offset !== undefined) ? s.offset : (i - nSer / 2) * (barW + 1) + 1;
  });

  let todos = [10];
  equipes.forEach(function (eq) { todos = todos.concat(hist[eq]); });
  const scaleYLine = plotH / (Math.max.apply(null, todos) * 1.62);

  // Caixa do rótulo, centrada na barra. Nunca abaixo de 26pt: a TEXT_BOX tem
  // ~7pt de recuo interno de CADA lado que a API não deixa desligar, e abaixo
  // disso um valor de 3 dígitos é cortado — foi o bug em que 331 aparecia 33.
  const lblCaixa = (cfg.lblCaixa === 'auto') ? Math.max(26, barW + 12) : cfg.lblCaixa;
  const lblFont  = nPts > 5 ? 5.5 : 6.5;

  cfg.series.forEach(function (s, si) {
    const valores = hist[s.equipe] || [];
    const c = cor(s.cor);
    for (let i = 0; i < valores.length; i++) {
      const val = valores[i];
      const h   = Math.max(val * scaleYLine, 1);
      const bX  = plotX + (i * stepX) + offsets[si];
      const bY  = (plotY + plotH) - h;

      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, h);
      rect.getFill().setSolidFill(c);
      rect.getBorder().setTransparent();

      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
        bX + (barW / 2) - (lblCaixa / 2), bY - 16, lblCaixa, 14);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(lblFont).setBold(true)
        .setForegroundColor(c);
      // setLineSpacing(100) impede que uma quebra residual empurre o número
      // para longe da barra. Abaixo de 100 a API lança "Invalid argument".
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

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rankCardX + 15, mainAreaY + 12, sideWidth - 30, 25).getText()
    .setText('COMPOSIÇÃO POR TIPO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(cor('brandMed'));

  // Da base quando ela responde, senão as células. Os dois caminhos mostram a
  // mesma coisa; a diferença é que pela base as fatias FECHAM com o backlog,
  // porque cada chamado em aberto cai em exatamente uma.
  let rankData;
  if (q && q.composicao && q.composicao.length) {
    const totalComp = q.composicao.reduce(function (a, c) { return a + c.val; }, 0);
    rankData = q.composicao.map(function (c) {
      const lbl = c.label.toUpperCase();
      return {
        label : lbl,
        val   : c.val,
        pct   : c.pct + '%',
        color : cor(BOL_COR_COMPOSICAO[lbl] || 'brandSoft'),
        // A barra é a fatia do backlog — o mesmo número do "%" ao lado.
        factor: totalComp > 0 ? c.val / totalComp : 0
      };
    });
  } else {
    const rankTot = compVals.reduce(function (a, v) { return a + v; }, 0);
    rankData = cfg.composicao.map(function (c, i) {
      return {
        label : c.label,
        val   : compVals[i],
        pct   : (rankTot > 0 ? Math.round((compVals[i] / rankTot) * 100) : 0) + '%',
        color : cor(BOL_COR_COMPOSICAO[c.label] || 'brandSoft'),
        factor: rankTot > 0 ? compVals[i] / rankTot : 0
      };
    });
  }

  // rowH calculado para caber todos os itens: a lista muda de tamanho conforme
  // o escopo (3 ou 4 fatias) e conforme a fonte.
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
 * Variação da última semana vs a penúltima, por categoria, lida da seção
 * POR MEGA SEMANAL da aba dos Megas. Cada categoria são 3 linhas (uma por
 * Mega) que se somam.
 *
 * Só serve de RESERVA: quando a base bruta responde, a seta sai dela, porque
 * cartão e seta precisam vir da mesma contagem.
 */
function _bolDeltasSemanais_(sheet, cfg) {
  if (!cfg.semanal) return null;
  const lastCol = sheet.getLastColumn();
  const blocos = {};
  Object.keys(cfg.semanal).forEach(function (k) {
    const b = cfg.semanal[k];
    blocos[k] = sheet.getRange(b[0], 1, b[1], lastCol).getValues();
  });

  const ref = blocos[Object.keys(cfg.semanal)[0]];
  const cols = [];
  for (let i = 2; i < lastCol; i++) {
    if (ref.some(function (r) {
      return r[i] !== '' && r[i] !== null && !isNaN(Number(r[i])) && Number(r[i]) !== 0;
    })) cols.push(i);
  }
  if (cols.length < 2) return null;

  const u = cols[cols.length - 1], p = cols[cols.length - 2];
  const out = {};
  Object.keys(blocos).forEach(function (k) {
    out[k] = _bolSomaColuna_(blocos[k], u) - _bolSomaColuna_(blocos[k], p);
  });
  return out;
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
