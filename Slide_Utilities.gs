/**
 * ARQUIVO: Slide_Utilities.gs
 * COMPONENTE — GESTÃO DE UTILITIES (energia, água, pluviômetro, canal)
 * DESCRIÇÃO: Duas famílias de slides que reaproveitam o mesmo motor de
 * desenho (cards de KPI + gráfico de barras agrupadas por ano):
 *
 *   1) gerarSlidesUtilities_() — até 4 slides (Energia R$/kWh, Água R$/m³) a
 *      partir da aba "UTILITIES" da planilha da cidade ativa (ver
 *      obterDadosUtilities_ em 02_Dados.gs). Itajaí e Esteio — Curitiba tem
 *      o slide dedicado de Energia Solar (Slide10_EnergiaSolar.gs).
 *
 *   2) gerarSlidesMonitoramentoEsteio_() — 2 slides (Pluviômetro, Nível do
 *      Canal de Drenagem), só Mega Esteio, a partir de uma planilha EXTERNA
 *      de lançamentos brutos de campo (ver obterDadosMonitoramentoEsteio_
 *      em 02_Dados.gs, monitoramentoId em 01_Config.gs).
 *
 * Cada slide tem 3 cards de KPI (definidos pelo chamador — os rótulos e o
 * que cada um mede variam por família) — mais um 4º card só com a logo da
 * concessionária, quando configurada (logoEnergiaId/logoAguaId, só faz
 * sentido para energia/água) — seguidos do gráfico de barras agrupadas por
 * mês, uma barra por ano (no máximo os 3 mais recentes — a fonte de
 * monitoramento tem histórico desde 2012 e um gráfico com uma barra por ano
 * desde então ficaria ilegível). O ano mais recente entra na cor de
 * destaque, os anteriores em tons de cinza (mais antigo = mais escuro). O
 * mês de referência da apresentação (obterMesReferencia_) ganha uma faixa
 * vertical suave no gráfico, mais um comparativo com os valores dos outros
 * anos lado a lado.
 *
 * Sem fonte de dados (aba/planilha ausente ou vazia): a função não gera
 * nada e não quebra o resto da apresentação.
 */

function gerarSlidesUtilities_() {
  const dados = obterDadosUtilities_();
  if (!dados) {
    Logger.log('Utilities: sem dados (aba "UTILITIES" ausente ou vazia) — nenhum slide gerado.');
    return;
  }

  const ref     = obterMesReferencia_();
  const projeto = getProjetoAtivo();

  const paineis = [
    { chave: 'energia', metrica: 'valor',   titulo: 'ENERGIA (R$)',  fmt: _utilFmtMoeda_, cor: '#F59E0B',       logo: projeto.logoEnergiaId },
    { chave: 'energia', metrica: 'consumo', titulo: 'ENERGIA (kWh)', fmt: _utilFmtNum_,   cor: '#F59E0B',       logo: projeto.logoEnergiaId },
    { chave: 'agua',    metrica: 'valor',   titulo: 'ÁGUA (R$)',     fmt: _utilFmtMoeda_, cor: CORES.lightBlue, logo: projeto.logoAguaId },
    { chave: 'agua',    metrica: 'consumo', titulo: 'ÁGUA (m³)',     fmt: _utilFmtNum_,   cor: CORES.lightBlue, logo: projeto.logoAguaId }
  ];

  let gerados = 0;
  paineis.forEach(p => {
    const bloco = dados[p.chave];
    if (!bloco) return;
    const serie = bloco[p.metrica];
    if (!serie || serie.anos.length === 0) return;

    const mesAtual      = _utilValorMes_(serie, ref.ano,     ref.index);
    const mesAnterior   = _utilValorMes_(serie, ref.ano - 1, ref.index);
    const acAtual       = _utilAcumulado_(serie, ref.ano,     ref.index);
    const acAnterior    = _utilAcumulado_(serie, ref.ano - 1, ref.index);
    const mediaAtual    = _utilMediaMensal_(serie, ref.ano,     ref.index);
    const mediaAnterior = _utilMediaMensal_(serie, ref.ano - 1, ref.index);

    const cards = [
      { label: p.metrica === 'valor' ? 'GASTO DO MÊS' : 'CONSUMO DO MÊS',
        val: mesAtual, ant: mesAnterior, fmt: p.fmt },
      { label: 'ACUMULADO NO ANO',
        val: acAtual, ant: acAnterior, fmt: p.fmt },
      { label: p.metrica === 'valor' ? 'CUSTO MÉDIO MENSAL' : 'CONSUMO MÉDIO MENSAL',
        val: mediaAtual, ant: mediaAnterior, fmt: p.fmt }
    ];

    const subtitulo = p.titulo + ' · Comparativo mensal · Mês de referência: ' + ref.curto + '/' + ref.ano;
    _utilSlideGrafico_('GESTÃO DE UTILITIES', subtitulo, _utilUltimosAnos_(serie, 3),
      cards, p.fmt, p.cor, p.logo, ref, 'Sem cobrança');
    gerados++;
  });

  Logger.log('Utilities: ' + gerados + ' slide(s) gerado(s) a partir da aba UTILITIES.');
}

// ── Monitoramento — Pluviômetro e Canal de Drenagem (só Mega Esteio) ──────
function gerarSlidesMonitoramentoEsteio_() {
  const dados = obterDadosMonitoramentoEsteio_();
  if (!dados) {
    Logger.log('Monitoramento (Esteio): sem dados — nenhum slide gerado.');
    return;
  }

  const ref = obterMesReferencia_();
  let gerados = 0;

  if (dados.chuva && dados.chuva.anos.length > 0) {
    const serie = dados.chuva;
    const mesAtual      = _utilValorMes_(serie, ref.ano,     ref.index);
    const mesAnterior   = _utilValorMes_(serie, ref.ano - 1, ref.index);
    const acAtual       = _utilAcumulado_(serie, ref.ano,     ref.index);
    const acAnterior    = _utilAcumulado_(serie, ref.ano - 1, ref.index);
    const mediaAtual    = _utilMediaMensal_(serie, ref.ano,     ref.index);
    const mediaAnterior = _utilMediaMensal_(serie, ref.ano - 1, ref.index);

    const cards = [
      { label: 'CHUVA DO MÊS',      val: mesAtual, ant: mesAnterior, fmt: _utilFmtChuva_ },
      { label: 'ACUMULADO NO ANO',  val: acAtual,  ant: acAnterior,  fmt: _utilFmtChuva_ },
      { label: 'MÉDIA MENSAL',      val: mediaAtual, ant: mediaAnterior, fmt: _utilFmtChuva_ }
    ];
    const subtitulo = 'PLUVIÔMETRO (mm) · Comparativo mensal · Mês de referência: ' + ref.curto + '/' + ref.ano;
    _utilSlideGrafico_('MONITORAMENTO PLUVIOMÉTRICO', subtitulo, _utilUltimosAnos_(serie, 3),
      cards, _utilFmtChuva_, CORES.lightBlue, null, ref, null);
    gerados++;
  }

  if (dados.nivel && dados.nivel.anos.length > 0) {
    const serie = dados.nivel;
    const mesAtual      = _utilValorMes_(serie, ref.ano,     ref.index);
    const mesAnterior   = _utilValorMes_(serie, ref.ano - 1, ref.index);
    const maxAtual       = _utilMaximoAno_(dados.nivelMax, ref.ano,     ref.index);
    const maxAnterior    = _utilMaximoAno_(dados.nivelMax, ref.ano - 1, ref.index);
    const mediaAtual    = _utilMediaMensal_(serie, ref.ano,     ref.index);
    const mediaAnterior = _utilMediaMensal_(serie, ref.ano - 1, ref.index);

    const cards = [
      { label: 'NÍVEL DO MÊS',          val: mesAtual, ant: mesAnterior, fmt: _utilFmtNivel_ },
      { label: 'NÍVEL MÁXIMO NO ANO',   val: maxAtual, ant: maxAnterior, fmt: _utilFmtNivel_ },
      { label: 'NÍVEL MÉDIO MENSAL',    val: mediaAtual, ant: mediaAnterior, fmt: _utilFmtNivel_ }
    ];
    const subtitulo = 'CANAL DE DRENAGEM — NÍVEL (m) · Comparativo mensal · Mês de referência: ' + ref.curto + '/' + ref.ano;
    _utilSlideGrafico_('MONITORAMENTO PLUVIOMÉTRICO', subtitulo, _utilUltimosAnos_(serie, 3),
      cards, _utilFmtNivel_, '#0EA5E9', null, ref, null);
    gerados++;
  }

  Logger.log('Monitoramento (Esteio): ' + gerados + ' slide(s) gerado(s).');
}

function _utilSlideGrafico_(tituloSecao, subtitulo, serie, cards, fmt, corDestaque, logoId, ref, notaZeroLabel) {
  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, tituloSecao, subtitulo);

  const marginX = 28, topY = 74, cardH = 72, cardGap = 10;
  _utilCardsKPI_(slide, marginX, topY, W - marginX * 2, cardH, cards, corDestaque, logoId);

  const chartY = topY + cardH + cardGap;
  const chartH = H - chartY - 16;
  _utilGrafico_(slide, marginX, chartY, W - marginX * 2, chartH, serie, fmt, corDestaque, ref, notaZeroLabel);

  Logger.log('Slide Utilities gerado → ' + tituloSecao + ' — ' + subtitulo);
}

// ── Cards de KPI — o chamador decide os 3 (rótulo/valor/comparativo fazem
// sentido diferente por métrica: soma-no-ano p/ R$/consumo/chuva, pico-no-
// -ano p/ nível de canal) — e, quando houver logo configurada, um 4º card
// só com ela.
function _utilCardsKPI_(slide, x, y, w, h, cards, corDestaque, logoId) {
  const gap    = 10;
  const nCards = logoId ? 4 : 3;
  const cardW  = (w - gap * (nCards - 1)) / nCards;

  cards.forEach((c, i) => {
    const cx = x + i * (cardW + gap);
    _utilCard_(slide, cx, y, cardW, h, c, corDestaque);
  });

  if (logoId) {
    const cx = x + 3 * (cardW + gap);
    _utilCardLogo_(slide, cx, y, cardW, h, logoId, corDestaque);
  }
}

// Card só com a logo da concessionária, mesmo container visual dos cards de
// KPI (fundo branco, borda, faixa lateral). As logos entram numa moldura
// QUADRADA de lado fixo — a mesma para energia e água — para as duas saírem
// do mesmo tamanho na página independente da proporção natural de cada
// imagem (uma pode ser bem mais larga que alta, ou quase quadrada); dentro
// da moldura, contain-fit preserva a proporção própria, sem distorcer.
function _utilCardLogo_(slide, x, y, w, h, logoId, corDestaque) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corDestaque);
  side.getBorder().setTransparent();

  try {
    const blob = DriveApp.getFileById(logoId).getBlob();
    const img  = slide.insertImage(blob);
    const ar   = img.getWidth() / img.getHeight();
    const lado = Math.min(60, w - 8, h - 8);   // moldura quadrada, com folga mínima de 4pt
    let wImg = lado, hImg = lado;
    if (ar >= 1) hImg = lado / ar; else wImg = lado * ar;
    img.setLeft(x + (w - wImg) / 2).setTop(y + (h - hImg) / 2).setWidth(wImg).setHeight(hImg);
  } catch (e) {
    Logger.log('Aviso (Utilities): logo da concessionária não carregado. ' + e.message);
  }
}

function _utilCard_(slide, x, y, w, h, kpi, corDestaque) {
  const opts = { label: kpi.label, valor: kpi.val != null ? kpi.fmt(kpi.val) : '—', cor: corDestaque, corValor: CORES.textDark, tamValor: 20 };

  if (kpi.val != null && kpi.ant != null) {
    const diff   = kpi.val - kpi.ant;
    const pct    = kpi.ant !== 0 ? (diff / Math.abs(kpi.ant)) * 100 : null;
    const seta   = diff === 0 ? '▬' : (diff > 0 ? '▲' : '▼');
    const pctStr = pct != null ? ' (' + (diff > 0 ? '+' : '') + pct.toFixed(1) + '%)' : '';
    opts.sub    = seta + pctStr;
    // Cost/consumo/chuva/nível: menor é melhor — cair é bom (verde), subir é ruim (vermelho).
    opts.corSub = diff > 0 ? CORES.cardRed : (diff < 0 ? CORES.cardGreen : CORES.textGray);
    opts.nota   = 'vs mesmo mês ano anterior';
  } else {
    opts.sub    = 'sem comparativo';
    opts.corSub = CORES.textGray;
  }

  criarCardKPI(slide, x, y, w, h, opts);
}

function _utilValorMes_(serie, ano, mes) {
  if (!serie || !serie.porAno[ano]) return null;
  return serie.porAno[ano][mes];
}

function _utilAcumulado_(serie, ano, ateMes) {
  const arr = serie.porAno[ano];
  if (!arr) return null;
  let soma = 0, tem = false;
  for (let m = 0; m <= ateMes; m++) {
    if (arr[m] != null) { soma += arr[m]; tem = true; }
  }
  return tem ? soma : null;
}

// Média mensal de Jan até ateMes (só considera meses com dado lançado —
// zero explícito conta como mês, mês ainda vazio não conta).
function _utilMediaMensal_(serie, ano, ateMes) {
  const arr = serie.porAno[ano];
  if (!arr) return null;
  let soma = 0, n = 0;
  for (let m = 0; m <= ateMes; m++) {
    if (arr[m] != null) { soma += arr[m]; n++; }
  }
  return n > 0 ? soma / n : null;
}

// Maior valor de Jan até ateMes — usado no pico de nível do canal (a média
// mensal dilui um pico de cheia de um único dia; o máximo não).
function _utilMaximoAno_(serie, ano, ateMes) {
  const arr = serie.porAno[ano];
  if (!arr) return null;
  let max = null;
  for (let m = 0; m <= ateMes; m++) {
    if (arr[m] != null && (max == null || arr[m] > max)) max = arr[m];
  }
  return max;
}

// Mantém só os N anos mais recentes de uma série (evita gráfico poluído
// quando a fonte tem histórico muito longo — o monitoramento predial
// remonta a 2012; um bar por ano desde então seria ilegível).
function _utilUltimosAnos_(serie, n) {
  const anos = serie.anos.slice(-n);
  const porAno = {};
  anos.forEach(a => { porAno[a] = serie.porAno[a]; });
  return { anos: anos, porAno: porAno };
}

// ── Gráfico de barras agrupadas por ano ────────────────────────────────────
// notaZeroLabel: rótulo da nota de rodapé quando o ano mais recente tem
// zero explícito lançado num mês (ex.: "Sem cobrança"). null desativa a
// nota — zero é um valor normal em chuva/nível, não um evento a destacar.
function _utilGrafico_(slide, x, y, w, h, serie, fmt, corDestaque, ref, notaZeroLabel) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const anos = serie.anos;   // ascendente: [2024, 2025, 2026...]
  const n    = anos.length;

  const mL = 56, mR = 14, mT = 34, mB = 32;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;
  const slotW = plotW / 12;

  // Realce do mês de referência — faixa vertical suave atrás do grupo de barras.
  if (ref.index >= 0 && ref.index <= 11) {
    const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + ref.index * slotW, plotY, slotW, plotH);
    hl.getFill().setSolidFill(corDestaque, 0.08);
    hl.getBorder().setTransparent();
  }

  const todosValores = anos.flatMap(a => serie.porAno[a].filter(v => v != null));
  const vMax   = todosValores.length ? Math.max(...todosValores) : 0;
  const escMax = _utilEscalaTeto_(vMax);

  // Grade + rótulos do eixo Y
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, gi === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    _sTxt(slide, x, gy - 7, mL - 6, 14, fmt(gVal), 7, false, CORES.textGray, 'right');
  }

  // Barras — uma por ano, agrupadas dentro do slot do mês. Rótulo de valor
  // só no ano mais recente (senão os 12x3 números lotam o gráfico) — o
  // comparativo entre anos completo fica no cabeçalho do mês de referência
  // logo abaixo, sem risco de sobrepor barra ou rótulo vizinho.
  const barPad = slotW * 0.14;
  const barW   = (slotW - barPad * (n + 1)) / n;
  const bBase  = plotY + plotH;
  const anoRecente = anos[n - 1];
  const zerados = [];   // meses do ano mais recente com zero explícito lançado

  for (let mes = 0; mes < 12; mes++) {
    const slotX = plotX + mes * slotW;
    anos.forEach((ano, i) => {
      const val = serie.porAno[ano][mes];
      if (val == null) return;
      const bh = escMax > 0 ? (val / escMax) * plotH : 0;
      const cor = _utilCorSerie_(i, n, corDestaque);

      if (bh > 0.5) {
        const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, _utilBarX_(slotX, barPad, barW, i), bBase - bh, barW, bh);
        bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
      }

      if (i === n - 1) {   // ano mais recente — valor acima da própria barra
        if (val === 0 && notaZeroLabel) { zerados.push(mes); }
        // Caixa alargada com folga simétrica: o recuo interno da TEXT_BOX
        // (~7pt de cada lado) quebra o texto em duas linhas se a caixa for
        // só do tamanho do texto. Como a caixa não tem fundo/borda própria,
        // alargar não muda nada visualmente — só devolve a largura útil.
        const lw = 42, folga = 10;
        const cxBar = _utilBarX_(slotX, barPad, barW, i) + barW / 2;
        _sTxt(slide, cxBar - lw / 2 - folga, bBase - bh - 13, lw + folga * 2, 11,
          fmt(val), 6.5, true, (val === 0 && notaZeroLabel) ? CORES.textGray : cor, 'center');
      }
    });

    const destaque = mes === ref.index;
    _sTxt(slide, slotX, bBase + 4, slotW, 12, MESES_3_REF[mes], destaque ? 7.5 : 6.5,
      destaque, destaque ? corDestaque : CORES.textDark, 'center');
  }

  // Nota de rodapé — meses do ano corrente com zero explícito lançado.
  if (notaZeroLabel && zerados.length > 0) {
    const meses = zerados.map(m => MESES_3_REF[m]).join(', ');
    const txt = notaZeroLabel + ' em ' + anoRecente + ': ' + meses;
    _sTxt(slide, plotX, bBase + 17, plotW, 11, txt, 6.5, false, CORES.textGray, 'left');
  }

  // Legenda — um chip por ano, alinhada à direita no topo do painel
  const legY = y + 10;
  let legX = x + w - 14;
  for (let i = n - 1; i >= 0; i--) {
    const rotulo = String(anos[i]);
    const lw = 12 + rotulo.length * 5.5 + 16;
    legX -= lw;
    _solarRect(slide, legX, legY, 10, 8, _utilCorSerie_(i, n, corDestaque));
    _sTxt(slide, legX + 13, legY - 1, lw - 13, 11, rotulo, 7.5, false, CORES.textDark, 'left');
  }

  // Comparativo do mês de referência — os anos lado a lado, no topo esquerdo.
  if (ref.index >= 0 && ref.index <= 11) {
    _utilComparativoMes_(slide, plotX, y + 9, serie, fmt, ref, anos, corDestaque);
  }
}

function _utilBarX_(slotX, barPad, barW, i) {
  return slotX + barPad + i * (barW + barPad);
}

function _utilComparativoMes_(slide, x, y, serie, fmt, ref, anos, corDestaque) {
  let cx = x;
  const rotuloMes = MESES_3_REF[ref.index] + '/' + ref.ano + ':';
  const wMes = 16 + rotuloMes.length * 5;
  _sTxt(slide, cx, y, wMes, 12, rotuloMes, 7.5, true, CORES.textDark, 'left');
  cx += wMes;

  // Largura fixa por ano (em vez de estimar pelo tamanho do texto): sem API
  // de medição real de glifos no Apps Script, a estimativa por caractere é
  // imprecisa e o erro se acumula item a item — um valor mais longo (ex.:
  // "R$ 5.268") deixava o próximo quadradinho visualmente desalinhado dos
  // demais. Com pitch fixo, o espaçamento entre os itens fica sempre igual.
  const wValor = 58;
  anos.forEach((ano, i) => {
    const val = serie.porAno[ano][ref.index];
    const txt = val != null ? fmt(val) : '—';
    const cor = _utilCorSerie_(i, anos.length, corDestaque);
    _solarRect(slide, cx, y + 3, 7, 7, cor);
    _sTxt(slide, cx + 10, y - 1, wValor, 12, txt, 7.5, i === anos.length - 1, cor, 'left');
    cx += 10 + wValor + 6;
  });
}

// Ano mais recente = cor de destaque da métrica; anteriores em cinza,
// do mais antigo (mais escuro) ao mais novo (mais claro).
function _utilCorSerie_(i, n, corDestaque) {
  if (i === n - 1) return corDestaque;
  const grays = ['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];
  return grays[Math.min(i, grays.length - 1)];
}

// Teto "arredondado" do eixo Y com ~15% de folga acima do maior valor.
function _utilEscalaTeto_(vMax) {
  if (vMax <= 0) return 10;
  const mag   = Math.pow(10, Math.floor(Math.log10(vMax)));
  const passo = mag / 4;
  return Math.ceil((vMax * 1.15) / passo) * passo;
}

function _utilFmtMoeda_(v) {
  if (v == null || isNaN(v)) return '';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

function _utilFmtNum_(v) {
  if (v == null || isNaN(v)) return '';
  return Math.round(v).toLocaleString('pt-BR');
}

function _utilFmtChuva_(v) {
  if (v == null || isNaN(v)) return '';
  return Math.round(v).toLocaleString('pt-BR') + ' mm';
}

function _utilFmtNivel_(v) {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
}
