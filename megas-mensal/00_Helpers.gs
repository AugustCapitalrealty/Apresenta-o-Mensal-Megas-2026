/**
 * ARQUIVO: 00_Helpers.gs
 * SEÇÃO:   NÚCLEO — Utilitários, Motor de Layout e Componentes Visuais
 * DESCRIÇÃO: Biblioteca central de componentes visuais, layout, formatação,
 *            medição de texto e renderização de gráficos.
 *            Consolidado a partir de Slide_GraficosHistorico, Slide_ReservaGraficos,
 *            helpers de 01_Config e medição de texto de Farol_Guilherme.
 */

// ==========================================
// COMPONENTES VISUAIS PADRÃO E FORMATAÇÃO
// ==========================================
function criarHeaderPadrao(slide, titulo, subtitulo) {
  const deck = getDeckAtivo();
  const W  = deck.getPageWidth();
  const DS = CR_DESIGN_SYSTEM;
  const mX = DS.layout.marginX;

  // Grafismo de fundo — elipse suave no canto superior direito (assinatura do boletim)
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 350, -80, 450, 450);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  // Barra de destaque à esquerda do título
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mX, 13, 5, 36);
  bar.getFill().setSolidFill(DS.colors.brandLight);
  bar.getBorder().setTransparent();

  // Título
  const txt1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 6, W - mX - 200, 30);
  txt1.getText().setText(titulo).getTextStyle()
    .setFontSize(19).setBold(true)
    .setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  // Subtítulo
  if (subtitulo) {
    const txt2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 34, W - mX - 200, 18);
    txt2.getText().setText(subtitulo).getTextStyle()
      .setFontSize(9.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }

  // Logo no canto superior direito (não quebra a geração se indisponível)
  try {
    const logoBlob = DriveApp.getFileById(DS.assets.logoId).getBlob();
    slide.insertImage(logoBlob, W - mX - DS.assets.logoW, 14, DS.assets.logoW, DS.assets.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
  }

  // Linha separadora de largura total + segmento de destaque
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 62, W, 62);
  sep.getLineFill().setSolidFill(DS.colors.lines);
  sep.setWeight(1);

  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mX, 62, mX + 110, 62);
  acc.getLineFill().setSolidFill(DS.colors.brandLight);
  acc.setWeight(3);
}

/**
 * Formata número no padrão brasileiro quando o valor for numérico
 * (66336 → "66.336"; 27.91 → "27,91"). Valores não numéricos passam direto.
 */
function formatarNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '' || valor === '-') return '-';
  const s = String(valor).trim();
  if (/[^\d.,\-\s]/.test(s)) return s;   // tem %, h, letras etc. → já formatado
  let n;
  if (s.includes(',')) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ''));  // "61.245" = milhar pt-BR
  else n = Number(s);
  if (isNaN(n)) return s;
  const temDecimal = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: temDecimal ? 2 : 0,
    maximumFractionDigits: 2
  });
}

/**
 * Padroniza o nome de uma rubrica contábil que vem "sujo" da planilha:
 * sentence-case (1ª letra maiúscula, resto minúsculo), corrige acentos de um
 * dicionário de termos contábeis comuns, mantém preposições em minúsculo e
 * siglas conhecidas em maiúsculo. Ex.: 'energia eletrica' → 'Energia elétrica';
 * 'SEGURO' → 'Seguro'; 'manutenção imóveis' → 'Manutenção imóveis';
 * 'iptu' → 'IPTU'.
 */
const RUBRICA_ACENTOS = {
  eletrica: 'elétrica', eletrico: 'elétrico', eletricas: 'elétricas',
  juridica: 'jurídica', juridico: 'jurídico', juridicos: 'jurídicos',
  informatica: 'informática', imoveis: 'imóveis', imovel: 'imóvel',
  moveis: 'móveis', movel: 'móvel', assistencia: 'assistência',
  agua: 'água', condominio: 'condomínio', condominios: 'condomínios',
  seguranca: 'segurança', vigilancia: 'vigilância', manutencao: 'manutenção',
  conservacao: 'conservação', servicos: 'serviços', servico: 'serviço',
  locacao: 'locação', depreciacao: 'depreciação', predios: 'prédios',
  predio: 'prédio', predial: 'predial', tributaria: 'tributária',
  tributarias: 'tributárias', tributos: 'tributos', telefonia: 'telefonia',
  administrativa: 'administrativa', administrativas: 'administrativas',
  utilidades: 'utilidades', combustivel: 'combustível', veiculos: 'veículos',
  refeicao: 'refeição', alimentacao: 'alimentação', comunicacao: 'comunicação',
  reparacao: 'reparação', operacao: 'operação', gestao: 'gestão',
  jardinagem: 'jardinagem', dedetizacao: 'dedetização', energia: 'energia'
};
const RUBRICA_PREPOSICOES = ['de','da','do','das','dos','e','com','sem','a','o','em','para','por','no','na'];
const RUBRICA_SIGLAS = ['IPTU','IPVA','GLP','TI','EPI','EPIS','CIPA','ART','CNPJ','ISS','PIS','COFINS','FGTS','INSS','CPFL','GNV'];

function padronizarRubrica_(txt) {
  let s = String(txt || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return s;

  const semAcento = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const palavras = s.split(' ');

  const out = palavras.map((w, i) => {
    const bare = semAcento(w).toLowerCase();

    // Sigla conhecida → maiúsculo
    if (RUBRICA_SIGLAS.indexOf(bare.toUpperCase()) >= 0) return bare.toUpperCase();

    // Correção de acento pelo dicionário
    let base = RUBRICA_ACENTOS[bare] || w.toLowerCase();

    // Preposição (não sendo a primeira palavra) → minúsculo
    if (i > 0 && RUBRICA_PREPOSICOES.indexOf(bare) >= 0) return base.toLowerCase();

    // 1ª palavra recebe inicial maiúscula; demais ficam minúsculas
    if (i === 0) return base.charAt(0).toUpperCase() + base.slice(1);
    return base;
  });

  return out.join(' ');
}

/**
 * Formata um valor absoluto (R$) como custo por m²: "R$ 4,62/m²".
 * Retorna '' se a área não estiver disponível.
 */
function formatarReaisM2_(valor, area) {
  if (!area || area <= 0 || valor == null || isNaN(valor)) return '';
  const v = valor / area;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/m²';
}

/**
 * Formata um valor JÁ em R$/m² (ex.: 4,62 → "R$ 4,62/m²"). '' se inválido.
 * Com sinal opcional para variações (+/−).
 */
function formatarRsM2_(v, comSinal) {
  if (v == null || isNaN(v)) return '';
  const abs = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sinal = comSinal ? (v >= 0 ? '+' : '−') : '';
  return sinal + 'R$ ' + abs + '/m²';
}

/**
 * Texto e cor da tendência vs mês anterior a partir de um delta numérico.
 * menorMelhor=true → cair é bom (verde). Retorna { txt:'▲ +1,2', cor }.
 * Sem variação → '▬ 0' cinza. delta null → txt vazio.
 */
function tendenciaTexto_(delta, menorMelhor, neutro) {
  if (delta == null || isNaN(delta)) return { txt: '', cor: CORES.textGray };
  if (delta === 0) return { txt: '▬ 0', cor: CORES.textGray };
  const seta = delta > 0 ? '▲' : '▼';
  const txt  = seta + ' ' + (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
  if (neutro) return { txt: txt, cor: CORES.textGray };   // sem juízo de valor
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? CORES.cardGreen : CORES.cardRed };
}

/**
 * Cor semântica para percentuais de SLA (regra do boletim):
 * ≥95 verde, ≥90 âmbar, <90 vermelho. Sem número → cor padrão.
 */
function corPorSLA(valor, corPadrao) {
  const n = parseFloat(String(valor == null ? '' : valor).replace('%', '').replace(',', '.'));
  if (isNaN(n)) return corPadrao || CR_DESIGN_SYSTEM.colors.textMain;
  if (n < 90) return CR_DESIGN_SYSTEM.colors.accentRed;
  if (n < 95) return '#F59E0B';
  return CR_DESIGN_SYSTEM.colors.accentGreen;
}

/**
 * Card de KPI padrão (padrão do boletim): card branco com borda fina,
 * barra lateral colorida, label pequeno em cima e valor grande embaixo.
 *
 * opts = {
 *   label    : rótulo pequeno superior (obrigatório)
 *   valor    : valor em destaque (obrigatório)
 *   cor      : cor da barra lateral (default brandLight)
 *   corValor : cor do valor (default = cor da barra)
 *   tamValor : tamanho da fonte do valor (default 22)
 *   sub      : linha auxiliar sob o valor, ex.: '▲ 1,2 (+4%)' (opcional)
 *   corSub   : cor da linha auxiliar (default textBody)
 *   nota     : nota menor sob a linha auxiliar, ex.: 'vs mês anterior' (opcional)
 * }
 */
function criarCardKPI(slide, x, y, w, h, opts) {
  const DS = CR_DESIGN_SYSTEM;
  const corBarra = opts.cor || DS.colors.brandLight;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corBarra);
  side.getBorder().setTransparent();

  // +10pt de folga à direita: vence o recuo interno do TEXT_BOX pra rótulos
  // mais longos (ex.: "RESPONSABILIDADE LOCATÁRIO") não quebrarem em duas
  // linhas à toa — a caixa não tem borda própria, então a folga é invisível.
  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 6, w - 20 + 10, 13);
  lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  lbl.getText().setText(String(opts.label)).getTextStyle()
    .setFontSize(7.5).setBold(true)
    .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);

  // Área do valor ocupa o meio; sub/nota reservam o rodapé do card
  const footH = (opts.sub ? 13 : 0) + (opts.nota ? 11 : 0);
  const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 18, w - 20, h - 22 - footH);
  val.getText().setText(String(opts.valor)).getTextStyle()
    .setFontSize(opts.tamValor || 22).setBold(true)
    .setForegroundColor(opts.corValor || corBarra)
    .setFontFamily(DS.typography.titles);
  val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  let fy = y + h - footH - 4;
  if (opts.sub) {
    const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, fy, w - 20, 13);
    sub.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    sub.getText().setText(String(opts.sub)).getTextStyle()
      .setFontSize(8).setBold(true)
      .setForegroundColor(opts.corSub || DS.colors.textBody).setFontFamily(DS.typography.titles);
    fy += 13;
  }
  if (opts.nota) {
    const nota = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, fy, w - 20, 11);
    nota.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    nota.getText().setText(String(opts.nota)).getTextStyle()
      .setFontSize(6.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }
}

/**
 * Painel padrão (contêiner de conteúdo): card branco com borda fina, barra
 * lateral e título opcional na cor do tema, com linha divisória.
 * Retorna o Y onde o conteúdo interno deve começar.
 */
function criarCardPainel(slide, x, y, w, h, titulo, cor) {
  const DS = CR_DESIGN_SYSTEM;
  const corTema = cor || DS.colors.brandLight;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corTema);
  side.getBorder().setTransparent();

  if (titulo) {
    // Marcador quadrado na cor do tema antes do título (substitui emojis)
    const marca = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 11, 7, 7);
    marca.getFill().setSolidFill(corTema);
    marca.getBorder().setTransparent();

    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 27, y + 6, w - 37, 18);
    t.getText().setText(String(titulo)).getTextStyle()
      .setFontSize(10).setBold(true)
      .setForegroundColor(corTema).setFontFamily(DS.typography.titles);

    const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 26, w - 28, 1);
    div.getFill().setSolidFill(DS.colors.lines);
    div.getBorder().setTransparent();
    return y + 32;
  }
  return y + 10;
}

// ==========================================
// MEDIÇÃO DE TEXTO E TEXTBOX SEM QUEBRA
// ==========================================
const _G_FATOR_FONTE = { 'Montserrat': 0.58, 'Open Sans': 0.52 };

// Recuo interno que toda TEXT_BOX tem e a API não deixa desligar (~7pt de
// cada lado). É ele que faz texto curto quebrar dentro de caixa estreita.
const _G_RECUO_TEXTBOX = 14;

function _gLarguraTexto_(texto, fs, fonte, bold) {
  const f = (_G_FATOR_FONTE[fonte] || 0.55) * (bold ? 1.04 : 1);
  return String(texto).length * fs * f;
}

function _gLinhasTexto_(texto, larguraCaixa, fs, fonte, bold) {
  const util = Math.max(12, larguraCaixa - _G_RECUO_TEXTBOX);
  return Math.max(1, Math.ceil(_gLarguraTexto_(texto, fs, fonte, bold) / util));
}

/**
 * Texto curto que TEM que caber numa linha só (valor de KPI, rótulo de
 * célula, pill de status, inicial de avatar). Duas defesas combinadas:
 *
 *   1) a caixa é desenhada mais larga que o espaço visível (folga simétrica
 *      quando centralizado, só à direita quando alinhado à esquerda). Como a
 *      TEXT_BOX não tem fundo nem borda — o retângulo/círculo visível é outra
 *      shape —, esticá-la não muda nada na aparência e devolve o recuo
 *      interno que o Slides tinha roubado;
 *   2) se ainda assim não couber, a fonte encolhe de 0,25 em 0,25 até caber
 *      (nunca abaixo de fsMin).
 *
 * Ver .claude/skills/slides-caixa-texto-sem-quebra.
 */
function _gUmaLinha_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"

  const o = op || {};
  const fonte  = o.fonte || DS_G.typography.titles;
  const centro = o.align !== 'L';
  const folga  = o.folga === undefined ? 12 : o.folga;
  const fsMin  = o.fsMin || 6;
  let   fs     = o.fs === undefined ? 10 : o.fs;

  const bx = centro ? x - folga : x;
  const bw = centro ? w + folga * 2 : w + folga;

  const util = bw - _G_RECUO_TEXTBOX;
  while (fs > fsMin && _gLarguraTexto_(t, fs, fonte, o.bold) > util) fs -= 0.25;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_G.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    centro ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return box;
}

/**
 * Bloco de texto (frase, parágrafo). Pode ocupar várias linhas, mas encolhe
 * a fonte até o bloco caber na altura h — é isso que impede o texto de
 * transbordar o card quando o conteúdo cresce.
 */
function _gParagrafo_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte = o.fonte || DS_G.typography.body;
  const espac = o.espac || 122;
  const fsMin = o.fsMin || 6.5;
  let   fs    = o.fs === undefined ? 10 : o.fs;

  const alturaLinha = f => f * 1.2 * (espac / 100);
  while (fs > fsMin && _gLinhasTexto_(t, w, fs, fonte, o.bold) * alturaLinha(fs) > h) {
    fs -= 0.25;
  }

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  if (o.meio) box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_G.colors.textBody).setFontFamily(fonte);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(o.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
                                           : SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(espac);   // o Slides recusa espaçamento < 100
  return box;
}


// ==========================================
// HEADER E RODAPÉ PADRÃO
// ==========================================


// ==========================================
// COMPONENTE — GRÁFICO DE EVOLUÇÃO HISTÓRICA
// ==========================================
/**
 * ARQUIVO: Slide_GraficosHistorico.gs
 * COMPONENTE — GRÁFICO DE EVOLUÇÃO (série mensal)
 * Desenha um gráfico de barras verticais a partir de uma série vinda do
 * histórico validado (lerHistoricoValidado em 02_Dados.gs). Reutilizável:
 * hoje alimenta a Evolução dos Acessos; depois Backlog e Emergências.
 *
 * serie = [{ mes:'04/2026', valor:31572 }, ...] (ordenada por mês)
 * opts  = { titulo, cor, formatar(v)→string, destacarUltimo:true }
 *
 * Sem série suficiente (< 2 meses) desenha o espaço reservado tracejado —
 * assim o slide nunca fica quebrado enquanto a planilha não tem histórico.
 */
function desenharGraficoHistorico(slide, x, y, w, h, serie, opts) {
  opts = opts || {};
  const DS  = CR_DESIGN_SYSTEM;
  const cor = opts.cor || DS.colors.brandLight;
  const fmt = opts.formatar || (v => formatarNumeroBR(Math.round(v)));

  // Moldura padrão do design system
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  // Título
  if (opts.titulo) {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 20);
    t.getText().setText(opts.titulo).getTextStyle()
      .setFontSize(10).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.titles);
  }

  // Sem histórico suficiente → placeholder tracejado
  if (!serie || serie.length < 2) {
    const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 15, y + 38, w - 30, h - 52);
    ph.getFill().setSolidFill(DS.colors.bgSlide);
    ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2, w, 20);
    txt.getText().setText(serie && serie.length === 1
        ? 'Alimente mais meses no histórico validado para ver a evolução'
        : 'Sem histórico validado para este indicador ainda')
      .getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  // ── Área de plotagem ─────────────────────────────────────────────────────
  const mL = 44, mR = 16, mT = 40, mB = 22;
  const px = x + mL, py = y + mT, pw = w - mL - mR, ph = h - mT - mB;

  const vMax = Math.max(...serie.map(s => s.valor), 1);
  const esc  = vMax * 1.18;
  const vToY = v => py + ph - (v / esc) * ph;

  // Grade horizontal + rótulos do eixo Y
  for (let g = 0; g <= 3; g++) {
    const val = (esc * g) / 3;
    const gy  = vToY(val);
    const gl  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, px, gy, pw, g === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(g === 0 ? '#CBD5E1' : '#EEF2F7'); gl.getBorder().setTransparent();
    const yl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 2, gy - 7, mL - 6, 14);
    yl.getText().setText(fmt(val)).getTextStyle()
      .setFontSize(6).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
    yl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  }

  const n     = serie.length;
  const slotW = pw / n;
  const barW  = Math.min(slotW * 0.56, 46);
  const baseY = py + ph;

  serie.forEach((s, i) => {
    const bh    = Math.max((s.valor / esc) * ph, 2);
    const bx    = px + i * slotW + (slotW - barW) / 2;
    const ultimo = opts.destacarUltimo !== false && i === n - 1;
    const barCor = ultimo ? DS.colors.brandDark : cor;

    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, baseY - bh, barW, bh);
    bar.getFill().setSolidFill(barCor); bar.getBorder().setTransparent();

    // Valor no topo da barra (com respiro). Na última barra (mês atual),
    // 2ª linha com a tendência vs o mês anterior (▲ subiu · ▼ caiu).
    const temDelta = ultimo && i >= 1 && opts.deltaMesAnterior !== false;
    const boxH = temDelta ? 28 : 12;
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, px + i * slotW - slotW * 0.15, baseY - bh - boxH - 6, slotW * 1.3, boxH);
    const vt = vl.getText();
    let txt = fmt(s.valor);
    if (temDelta) {
      const delta = s.valor - serie[i - 1].valor;
      const seta  = delta > 0 ? '▲' : (delta < 0 ? '▼' : '■');
      txt += '\n' + seta + ' ' + (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmt(Math.abs(delta));
    }
    vt.setText(txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor(barCor).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const delta = s.valor - serie[i - 1].valor;
      // maior = melhor por padrão (mais fluxo); inverte se opts.deltaMenorMelhor
      const bom = opts.deltaMenorMelhor ? delta < 0 : delta > 0;
      const corDelta = delta === 0 ? CORES.textGray : (bom ? CORES.cardGreen : CORES.cardRed);
      vt.getRange(fmt(s.valor).length + 1, txt.length).getTextStyle()
        .setFontSize(8).setBold(true).setForegroundColor(corDelta);
    }
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do mês
    const ml = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, px + i * slotW - slotW * 0.15, baseY + 3, slotW * 1.3, 12);
    ml.getText().setText(s.mes).getTextStyle()
      .setFontSize(6).setBold(ultimo).setForegroundColor(ultimo ? DS.colors.textMain : CORES.textGray).setFontFamily(DS.typography.body);
    ml.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
}

// ==========================================
// COMPONENTE — ESPAÇO RESERVADO PARA GRÁFICO
// ==========================================
/**
 * ARQUIVO: Slide_ReservaGraficos.gs
 * COMPONENTE — SLIDE COM ESPAÇO(S) RESERVADO(S) PARA GRÁFICO
 * Gera um slide com uma ou mais áreas tracejadas para o apresentador colar
 * gráficos que hoje são atualizados na mão (ex.: Chamados por Prioridade,
 * Backlog Facilities). No futuro, esses espaços viram gráficos automáticos —
 * é só trocar a chamada por um desenharGraficoHistorico(...).
 *
 *   gerarSlideReservaGraficos('CHAMADOS POR PRIORIDADE', 'Abertos x Fechados',
 *     [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]);
 *
 * areas: 1 → uma área grande; 2 → lado a lado; 3–4 → grade 2×2.
 */
function gerarSlideReservaGraficos(titulo, subtitulo, areas) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();

  criarHeaderPadrao(slide, titulo, subtitulo);

  areas = (areas && areas.length) ? areas : [{ titulo: '' }];
  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;

  let cols, linhas;
  if (areas.length === 1)      { cols = 1; linhas = 1; }
  else if (areas.length === 2) { cols = 2; linhas = 1; }
  else                          { cols = 2; linhas = Math.ceil(areas.length / 2); }

  const cellW = (W - 2 * marginX - gap * (cols - 1)) / cols;
  const cellH = (areaBottom - topY - gap * (linhas - 1)) / linhas;

  areas.forEach((a, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = marginX + col * (cellW + gap);
    const y = topY + row * (cellH + gap);
    _desenharAreaReservada(slide, x, y, cellW, cellH, a.titulo);
  });

  Logger.log('Slide reserva de gráficos gerado: ' + titulo + ' (' + areas.length + ' área[s]).');
}

// Uma área tracejada com título opcional e a marca de "espaço reservado".
function _desenharAreaReservada(slide, x, y, w, h, titulo) {
  const DS = CR_DESIGN_SYSTEM;

  const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  box.getFill().setSolidFill(DS.colors.cardBg);
  box.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1)
    .getLineFill().setSolidFill('#CBD5E1');

  if (titulo) {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 20);
    t.getText().setText(titulo).getTextStyle()
      .setFontSize(10).setBold(true).setForegroundColor(DS.colors.brandLight).setFontFamily(DS.typography.titles);
  }

  const ph = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2 - 8, w, 20);
  ph.getText().setText('[ ESPAÇO RESERVADO PARA COLAR O GRÁFICO ]').getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
  ph.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
