/**
 * ARQUIVO: 03_Tabelas.gs
 * SEÇÃO:   MOTOR — tabelas de Recebimento de Obras e Gestão de Contratações
 *
 * Motor genérico de tabela em slide: cabeçalho, zebra, badges de status,
 * paginação e rodapé com KPIs. Quem descreve O QUE desenhar são os arquivos
 * Slide_RecebimentoObras.gs e Slide_Contratacoes.gs.
 *
 * DE ONDE VEIO
 * Port de tabelas/propriedades-semanal/ (recebimento-obras.gs +
 * gestao-contratacoes.gs), que gera os mesmos relatórios no deck SEMANAL.
 * Apps Script não tem import: compartilhar código entre projetos é COPIAR.
 * As duas cópias vão divergir se alguém mexer só numa — ao corrigir um bug de
 * desenho aqui, verifique lá, e vice-versa. Ver o CLAUDE.md da raiz.
 *
 * O QUE MUDOU NO PORT (e por quê)
 *   1. Prefixo `_tab` / `TAB_` em tudo. No semanal os nomes são genéricos
 *      (_desenharTabela, CORES, FONTE) porque aquele projeto só faz isso.
 *      Aqui os slides de Preventivas/Corretivas/Backlog ainda vão ser
 *      escritos e vão querer esses nomes — o namespace do Apps Script é
 *      único, então quem chega primeiro não pode ocupar o nome genérico.
 *   2. `CR_DESIGN_SYSTEM` NÃO é redeclarado — é o de 01_Config.gs. Os acentos
 *      que a tabela usa (lines/accentGreen/accentOrange/accentRed) foram
 *      acrescentados lá.
 *   3. Sem banner fixo. O deck semanal já tem faixa da Capital Realty em todo
 *      slide (BANNER_EXISTENTE = true); aqui os slides nascem do zero, então
 *      cada um desenha o próprio banner.
 *   4. Sem menu/painel HTML. A entrada é o pipeline de 00_Main.gs, não um
 *      sidebar — o deck mensal é gerado de uma vez, não relatório a relatório.
 */

// ==========================================
// CONFIGURAÇÃO
// ==========================================
const TAB_MAX_LINHAS = 9;    // linhas por slide antes de paginar

const TAB_FONTE = { colHeader: 9, item: 9, descricao: 8.5, celula: 8.5, badge: 7.5 };

const TAB_CORES = {
  rowAlt1: 'FFFFFF',
  rowAlt2: 'EAF1FB',
  status: {
    ok        : CR_DESIGN_SYSTEM.colors.accentGreen.slice(1),
    pendente  : CR_DESIGN_SYSTEM.colors.accentRed.slice(1),
    aguardando: CR_DESIGN_SYSTEM.colors.accentOrange.slice(1),
    na        : '8A94A6',
    default   : 'C9CFDB'
  }
};

// Atalhos locais, no padrão do projeto semanal (C = cores, TY = tipografia).
const TAB_C  = CR_DESIGN_SYSTEM.colors;
const TAB_TY = CR_DESIGN_SYSTEM.typography;


// ==========================================
// LEITURA DA PLANILHA
// ==========================================
// Lê uma aba inteira e devolve as linhas já formatadas como texto.
//
// O cabeçalho NÃO está sempre na linha 1: as abas têm título, linha em branco
// e às vezes um rótulo mesclado antes. Por isso ele é localizado por
// palavra-chave (`cabecalhoContem`) em vez de posição fixa — assim inserir uma
// linha de título na planilha não quebra a leitura.
function _tabLerAba_(aba, cabecalhoContem) {
  const ss    = SpreadsheetApp.openById(PROPRIEDADES_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(aba);
  if (!sheet) throw new Error('Aba "' + aba + '" não encontrada na planilha de Propriedades.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba "' + aba + '" está vazia.');

  const valores = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const chaves  = (cabecalhoContem || []).map(s => String(s).toUpperCase());

  let hdrIdx = -1;
  for (let i = 0; i < valores.length; i++) {
    const bate = valores[i].some(c => {
      const u = String(c).toUpperCase();
      return chaves.some(k => u.indexOf(k) !== -1);
    });
    if (bate) { hdrIdx = i; break; }
  }
  if (hdrIdx === -1) throw new Error('Cabeçalho não encontrado na aba "' + aba + '".');

  // Só as colunas com nome entram — colunas auxiliares em branco na planilha
  // não viram coluna fantasma na tabela.
  const cabecalho = valores[hdrIdx];
  const colMap = [];
  for (let j = 0; j < cabecalho.length; j++) {
    if (String(cabecalho[j]).trim() !== '') colMap.push(j);
  }

  const linhas = [];
  for (let i = hdrIdx + 1; i < valores.length; i++) {
    const linha = valores[i];
    if (linha.every(c => String(c).trim() === '')) continue;
    const reg = colMap.map(idx => _tabFmt_(linha[idx]));
    if (reg.some(c => c !== '')) linhas.push(reg);
  }
  return { rows: linhas, headerIdx: hdrIdx, valores: valores };
}


// ==========================================
// DESENHO — BANNER
// ==========================================
function _tabDesenharBanner_(slide, SW, SH, titulo, subtitulo) {
  const M  = SW * 0.020;
  const Hh = SH * 0.135;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, Hh);
  bg.getFill().setSolidFill(TAB_C.brandDark);
  bg.getBorder().setTransparent();

  const tit = slide.insertTextBox(titulo, M, Hh * 0.10, SW * 0.70, Hh * 0.50);
  const ts1 = tit.getText().getTextStyle();
  ts1.setFontFamily(TAB_TY.titles); ts1.setFontSize(Math.round(SW * 0.026));
  ts1.setBold(true); ts1.setForegroundColor('#FFFFFF');
  tit.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _tabNoFill_(tit);

  const sub = slide.insertTextBox(subtitulo, M, Hh * 0.60, SW * 0.70, Hh * 0.36);
  const ts2 = sub.getText().getTextStyle();
  ts2.setFontFamily(TAB_TY.titles); ts2.setFontSize(Math.round(SW * 0.015));
  ts2.setForegroundColor(TAB_C.brandSoft);
  sub.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _tabNoFill_(sub);

  return Hh;
}

// Faixa fina de legenda (ex.: "HISTÓRICO · CONCLUÍDOS"), abaixo do banner.
function _tabDesenharLegenda_(slide, SW, y, h, texto) {
  const M = SW * 0.020;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, M, y, SW - M * 2, h);
  bar.getFill().setSolidFill(TAB_C.brandDark);
  bar.getBorder().setTransparent();

  const folga = 10;
  const tb = slide.insertTextBox(texto, M - folga, y, SW - M * 2 + folga * 2, h);
  const ts = tb.getText().getTextStyle();
  ts.setFontFamily(TAB_TY.titles); ts.setFontSize(9); ts.setBold(true);
  ts.setForegroundColor('#FFFFFF');
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(tb);
}


// ==========================================
// DESENHO — TABELA
// ==========================================
// `colunas` = [{ nome, tipo, largura, fonte?, maxPalavras?, calcular? }]
//   tipo: 'texto' (justificado) | 'textoCentro' | 'numero' | 'data' | 'status' | 'badge'
//   largura: fração da largura útil (as frações devem somar ~1)
function _tabDesenharTabela_(slide, SW, SH, linhas, topo, base, cfg) {
  const M      = SW * 0.020;
  const alturaT = base - topo;
  const largT   = SW - M * 2;

  const colunas   = cfg.colunas;
  const largCols  = colunas.map(c => c.largura * largT);

  // Altura calculada pelo MÁXIMO de linhas, não pelas linhas desta página:
  // assim a última página não estica as linhas para preencher o slide e a
  // troca de página não "pula".
  const maxL = cfg.maxLinhas || TAB_MAX_LINHAS;
  const rowH = alturaT / (maxL + 1);
  const hdrH = rowH * 1.25;

  // ── Cabeçalho ──
  let x = M;
  colunas.forEach((col, ci) => {
    const cw = largCols[ci];
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, topo, cw, hdrH);
    bg.getFill().setSolidFill(TAB_C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): o recuo interno
    // da TEXT_BOX (~7pt/lado, que a API não desliga) faz cabeçalho curto de
    // coluna estreita quebrar em 2 linhas. Alarga só a TEXT_BOX (invisível);
    // o retângulo de fundo não muda, então nada muda na aparência.
    const centrado = (col.tipo !== 'texto');
    const folga = centrado ? 10 : 0;
    const tb = slide.insertTextBox(col.nome, x + 3 - folga, topo, cw - 6 + folga * 2, hdrH);
    const ts = tb.getText().getTextStyle();
    ts.setFontFamily(TAB_TY.titles); ts.setFontSize(cfg.fonteHeader || TAB_FONTE.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(
      centrado ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _tabNoFill_(tb);
    x += cw;
  });

  // ── Linhas ──
  linhas.forEach((linha, ri) => {
    const y     = topo + hdrH + ri * rowH;
    const fundo = (ri % 2 === 0) ? TAB_CORES.rowAlt1 : TAB_CORES.rowAlt2;

    x = M;
    colunas.forEach((col, ci) => {
      const cw = largCols[ci];

      const cel = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, cw, rowH);
      cel.getFill().setSolidFill('#' + fundo);
      cel.getBorder().setWeight(0.75);
      cel.getBorder().getLineFill().setSolidFill(TAB_C.lines);

      const val = col.calcular ? col.calcular(linha) : _tabV_(linha, ci);
      const txt = (val === '-') ? '' : val;
      if (txt !== '' || col.tipo === 'data') {
        _tabDesenharCelula_(slide, x, y, cw, rowH, txt, col, cfg);
      }
      x += cw;
    });
  });
}

function _tabDesenharCelula_(slide, x, y, w, h, texto, col, cfg) {
  const fCel = col.fonte || cfg.fonte || TAB_FONTE.celula;
  const fTxt = col.fonte || cfg.fonte || TAB_FONTE.descricao;
  const fNum = col.fonte || cfg.fonte || TAB_FONTE.item;

  if (col.maxPalavras && texto) {
    const p = texto.split(/\s+/);
    if (p.length > col.maxPalavras) texto = p.slice(0, col.maxPalavras).join(' ');
  }

  switch (col.tipo) {
    case 'numero':
      if (texto !== '') _tabTexto_(slide, x, y, w, h, texto, fNum, SlidesApp.ParagraphAlignment.CENTER, true);
      break;

    case 'texto':
      // Justificado: alinha as duas margens em colunas longas (Obra, Objetivo).
      if (texto !== '') _tabTexto_(slide, x, y, w, h, texto, fTxt, SlidesApp.ParagraphAlignment.JUSTIFIED, false);
      break;

    case 'textoCentro':
      if (texto !== '') _tabTexto_(slide, x, y, w, h, texto, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
      break;

    case 'badge': {
      if (texto === '') break;
      const mapa = cfg.coresBadge || {};
      const cor  = mapa[texto.toUpperCase()] || TAB_C.brandLight.slice(1);
      _tabPill_(slide, x, y, w, h, texto.toUpperCase(), cor, 'FFFFFF');
      break;
    }

    case 'data':
      // Só desenha se for data mesmo — texto solto numa coluna de data é ruído.
      if (_tabEhData_(texto)) {
        _tabTexto_(slide, x, y, w, h, texto, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
      }
      break;

    case 'status':
      if (texto !== '') _tabPill_(slide, x, y, w, h, _tabStatusLabel_(texto), _tabStatusCor_(texto), 'FFFFFF');
      break;

    default:
      if (texto !== '') _tabTexto_(slide, x, y, w, h, texto, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
  }
}


// ==========================================
// DESENHO — RODAPÉ E KPIs
// ==========================================
/**
 * O rótulo do rodapé das tabelas.
 *
 * POR QUE NÃO É A DATA DE HOJE: estas duas tabelas — Recebimento de Obras e
 * Gestão de Contratações — foram portadas dos geradores SEMANAIS em
 * `tabelas/propriedades-semanal/`. No semanal, "Atualizado em 02/09" é a
 * informação principal do rodapé: o deck é uma foto do dia e o leitor precisa
 * saber de quando é a foto.
 *
 * Num deck MENSAL a leitura é outra. Entende-se que tudo ali é o reflexo do
 * mês de referência, e carimbar o dia da geração sugere o contrário — que o
 * recorte é "agora" e não "julho fechado". Pior quando o deck é gerado ou
 * regerado semanas depois: o rodapé diz setembro e os números são de julho.
 *
 * Então o rodapé diz o MÊS, e o mês vem da mesma fonte que a capa
 * (`obterMesReferencia_`), para os dois nunca divergirem.
 */
function _tabRotuloReferencia_() {
  const ref = obterMesReferencia_();
  return 'Referência: ' + ref.nome + ' ' + ref.ano;
}

function _tabDesenharRodape_(slide, SW, kpis, pctStr, y, h, referencia, pagina, totalPaginas) {
  const M = SW * 0.020;

  let info = referencia;
  if (totalPaginas > 1) info += '   ·   Pág. ' + pagina + '/' + totalPaginas;
  const cx = slide.insertTextBox(info, M, y, SW * 0.40, h);
  const tsi = cx.getText().getTextStyle();
  tsi.setFontFamily(TAB_TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(TAB_C.textBody);
  cx.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  cx.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(cx);

  if (!kpis || !kpis.length) return;

  const n      = kpis.length;
  const cardW  = SW * 0.168;
  const gap    = SW * 0.012;
  const pctW   = pctStr ? SW * 0.105 : 0;
  const grupoW = cardW * n + gap * (n - 1) + (pctStr ? gap + pctW : 0);
  let x = SW - M - grupoW;

  kpis.forEach(k => {
    const cor = (String(k.cor).charAt(0) === '#') ? k.cor.slice(1) : k.cor;
    _tabKpiCard_(slide, x, y, cardW, h, k.label, String(k.valor), cor);
    x += cardW + gap;
  });

  if (pctStr) {
    const pb = slide.insertTextBox(pctStr, x, y, pctW, h);
    const tsp = pb.getText().getTextStyle();
    tsp.setFontFamily(TAB_TY.titles); tsp.setFontSize(Math.round(SW * 0.014));
    tsp.setForegroundColor(TAB_C.textBody); tsp.setBold(true);
    pb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    pb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _tabNoFill_(pb);
  }
}

// Cartão de KPI: número à esquerda, rótulo à direita.
function _tabKpiCard_(slide, x, y, w, h, label, valor, corHex, fracNum) {
  const fn = fracNum || 0.38;

  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill('#' + corHex);
  card.getBorder().setTransparent();

  // Folga "sem quebra": ver a nota em _tabDesenharTabela_. O card visível é o
  // ROUND_RECTANGLE acima; só a TEXT_BOX transparente é alargada.
  const num = slide.insertTextBox(valor, x + w * 0.02 - 8, y, w * fn + 16, h);
  const tsN = num.getText().getTextStyle();
  tsN.setFontFamily(TAB_TY.titles); tsN.setFontSize(Math.max(14, Math.round(h * 0.46)));
  tsN.setBold(true); tsN.setForegroundColor('#FFFFFF');
  num.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  num.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(num);

  const lab = slide.insertTextBox(label, x + w * (fn + 0.02), y, w * (0.96 - fn), h);
  const tsL = lab.getText().getTextStyle();
  tsL.setFontFamily(TAB_TY.titles); tsL.setFontSize(Math.max(7, Math.round(h * 0.16)));
  tsL.setBold(true); tsL.setForegroundColor('#FFFFFF');
  lab.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(lab);
}


// ==========================================
// HELPERS DE DESENHO
// ==========================================
function _tabPill_(slide, x, y, w, h, label, corHex, txtHex) {
  const padX = w * 0.06, padY = h * 0.20;
  const bw = w - padX * 2, bh = h - padY * 2;

  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + padX, y + padY, bw, bh);
  pill.getFill().setSolidFill('#' + corHex);
  pill.getBorder().setTransparent();

  // Folga "sem quebra": sem ela "AG. ENGENHARIA" quebra dentro do pill.
  const folga = 10;
  const tb = slide.insertTextBox(label, x + padX - folga, y + padY, bw + folga * 2, bh);
  const ts = tb.getText().getTextStyle();
  ts.setFontFamily(TAB_TY.body); ts.setFontSize(TAB_FONTE.badge); ts.setBold(true);
  ts.setForegroundColor('#' + txtHex);
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(tb);
}

function _tabTexto_(slide, x, y, w, h, texto, fs, align, bold) {
  // "chip" = valor curto centralizado (data, nº, sigla) — é quem precisa da
  // folga. START e JUSTIFIED são parágrafos que quebram em várias linhas de
  // propósito; alargar a caixa deles só faria o texto invadir a célula vizinha.
  const chip  = (align === SlidesApp.ParagraphAlignment.CENTER);
  const padX  = chip ? 3 : 6;
  const padY  = 4;
  const folga = chip ? 10 : 0;

  const tb = slide.insertTextBox(texto, x + padX - folga, y + padY, w - padX * 2 + folga * 2, h - padY * 2);
  const ts = tb.getText().getTextStyle();
  ts.setFontFamily(bold ? TAB_TY.titles : TAB_TY.body);
  ts.setFontSize(fs); ts.setBold(!!bold);
  ts.setForegroundColor(TAB_C.textMain);
  const ps = tb.getText().getParagraphStyle();
  ps.setParagraphAlignment(align);
  // setLineSpacing abaixo de 100 lança "Invalid argument: spacing".
  if (!chip) ps.setLineSpacing(120);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(tb);
}

function _tabNoFill_(shape) {
  try { shape.getFill().setTransparent(); } catch (e) {}
}


// ==========================================
// HELPERS GERAIS
// ==========================================
function _tabPaginar_(linhas, porPagina) {
  const pgs = [];
  for (let i = 0; i < linhas.length; i += porPagina) pgs.push(linhas.slice(i, i + porPagina));
  if (!pgs.length) pgs.push([]);
  return pgs;
}

// Cada relatório marca seus slides com uma tag na nota do apresentador, para
// regerar só os próprios slides e não apagar o trabalho dos outros.
function _tabRemoverPorTag_(deck, tag) {
  deck.getSlides().forEach(s => {
    try {
      const notas = s.getNotesPage().getSpeakerNotesShape().getText().asString();
      if (notas.indexOf(tag) !== -1) s.remove();
    } catch (e) {}
  });
}

function _tabMarcarSlide_(slide, tag) {
  slide.getNotesPage().getSpeakerNotesShape().getText()
    .setText(tag + '\nGerado em ' + new Date().toLocaleString('pt-BR'));
}

function _tabV_(linha, idx) {
  if (!linha || linha[idx] === undefined) return '';
  return String(linha[idx]).trim();
}

function _tabFmt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
  const s = String(v).trim();
  const d = new Date(s);
  // Só converte o que claramente É um timestamp — senão texto comum com número
  // viraria data.
  if (s.length > 15 && !isNaN(d.getTime()) && /\d{4}/.test(s) && /GMT|:/.test(s)) {
    return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  return s;
}

function _tabEhData_(s) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(s).trim());
}

function _tabData_(s) {
  if (!_tabEhData_(s)) return null;
  const p = String(s).trim().split('/');
  return new Date(+p[2], +p[1] - 1, +p[0]);
}

function _tabHoje_() {
  const h = new Date(); h.setHours(0, 0, 0, 0); return h;
}

function _tabStatusCor_(val) {
  const v = String(val).toLowerCase();
  if (v === 'ok')                     return TAB_CORES.status.ok;
  if (v === 'n/a' || v === 'na')      return TAB_CORES.status.na;
  if (v.indexOf('conclu') !== -1)     return TAB_CORES.status.ok;
  if (v.indexOf('pendente') !== -1)   return TAB_CORES.status.pendente;
  if (v.indexOf('aguardando') !== -1) return TAB_CORES.status.aguardando;
  if (v.indexOf('andamento') !== -1)  return TAB_CORES.status.aguardando;
  return TAB_CORES.status.default;
}

function _tabStatusLabel_(val) {
  const v = String(val).toLowerCase();
  if (v === 'ok')                                                      return 'OK';
  if (v === 'n/a' || v === 'na')                                       return 'N/A';
  if (v.indexOf('conclu') !== -1)                                      return 'CONCLUÍDO';
  if (v.indexOf('andamento') !== -1)                                   return 'ANDAMENTO';
  if (v.indexOf('pendente') !== -1)                                    return 'PENDENTE';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('interno') !== -1)    return 'AG. INTERNO';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('engenharia') !== -1) return 'AG. ENGENHARIA';
  if (v.indexOf('aguardando') !== -1)                                   return 'AGUARDANDO';
  return String(val).toUpperCase();
}
