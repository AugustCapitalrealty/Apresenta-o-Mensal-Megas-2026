/**
 * ARQUIVO: 15_Categorias.gs
 * SLIDES:  Uma página por categoria grande (≥ ORC_FATIA_SLIDE_PROPRIO do
 *          total) e as categorias pequenas juntas em "Demais categorias".
 *          Ficam no mesmo arquivo porque saem do mesmo agrupamento
 *          (_orcDividirCategorias_) e usam a mesma tabela.
 */

// Máximo de linhas da tabela "Demais" por página, sem contar o TOTAL da
// última (18 + TOTAL ainda dá linha de ~15pt, o mínimo legível).
const ORC_DEMAIS_POR_PAGINA = 18;

// ==========================================
// TABELA
// ==========================================
/**
 * colunas: [{ titulo, w (null = ocupa a sobra), align: 'L'|'C'|'R' }]
 * linhas:  [{ celulas: [{ texto, bold, cor, fs, fsMin, pill, span }], total: bool,
 *            faixa: 0|1, separador: bool }]
 *   span      → a célula ocupa esta linha e as span-1 seguintes (que trazem
 *               null nessa coluna); a pill fica centrada no bloco todo.
 *   faixa     → zebra por grupo em vez de por linha (1 = pintada).
 *   separador → linha fina acima, marcando o começo de um grupo.
 * Devolve o y do fim da tabela.
 */
function _orcTabela_(slide, x, y, w, colunas, linhas, rowH, op) {
  const DS = CR_DESIGN_SYSTEM;
  const o = op || {};
  const hCab = o.hCab || 20;
  const fs = o.fs || 8;
  const fixo = colunas.reduce((a, c) => a + (c.w || 0), 0);
  const nFlex = colunas.filter(c => !c.w).length || 1;
  const ws = colunas.map(c => c.w || (w - fixo) / nFlex);

  _orcRet_(slide, x, y, w, hCab, DS.colors.brandDark);
  let cx = x;
  colunas.forEach((c, i) => {
    _orcUmaLinha_(slide, cx, y, ws[i], hCab, c.titulo.toUpperCase(),
      { align: c.align || 'L', fs: 7, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6, fsMin: 5.5 });
    cx += ws[i];
  });

  // Duas passadas: todos os fundos antes de qualquer conteúdo. Numa passada
  // só, a zebra da linha seguinte cobriria a pill que ocupa várias linhas.
  let ry = y + hCab;
  linhas.forEach((ln, r) => {
    const pintada = ln.faixa === undefined ? r % 2 === 1 : ln.faixa === 1;
    if (ln.total) _orcRet_(slide, x, ry, w, rowH, '#DBEAFE');
    else if (pintada) _orcRet_(slide, x, ry, w, rowH, DS.colors.zebra);
    if (ln.separador) _orcLinha_(slide, x, ry, x + w, ry, DS.colors.lines, 0.75);
    ry += rowH;
  });

  ry = y + hCab;
  linhas.forEach(ln => {
    cx = x;
    ln.celulas.forEach((cel, i) => {
      const c = colunas[i];
      if (cel && cel.pill && cel.texto) {
        const bloco = rowH * (cel.span || 1);
        const ph = Math.min(14, rowH - 4);
        _orcRet_(slide, cx + 4, ry + (bloco - ph) / 2, ws[i] - 8, ph, DS.colors.brandSoft, { redondo: true, alpha: 0.35 });
        _orcUmaLinha_(slide, cx + 4, ry + (bloco - rowH) / 2, ws[i] - 8, rowH, cel.texto,
          { align: 'C', fs: 6.5, bold: true, cor: DS.colors.brandMed, fonte: DS.typography.titles, folga: 6, fsMin: 5, cortar: true });
      } else if (cel && cel.texto) {
        _orcUmaLinha_(slide, cx, ry, ws[i], rowH, cel.texto,
          { align: c.align || 'L', fs: cel.fs || fs, bold: !!(cel.bold || ln.total),
            cor: cel.cor || DS.colors.textMain, fonte: DS.typography.body, fsMin: cel.fsMin || 6, folga: 6, cortar: true });
      }
      cx += ws[i];
    });
    ry += rowH;
  });
  _orcLinha_(slide, x, ry, x + w, ry, DS.colors.lines, 1);
  return ry;
}

// Coluna FONTE ("Proposta XPTO"...): o gestor preenche à mão no Slides. Sai
// um "—" cinza em vez de vazio porque caixa sem texto não é criada e não
// haveria onde clicar. Uma nova geração do deck apaga o que foi digitado.
const ORC_FONTE_VAZIA = '—';
function _orcCelulaFonte_() {
  return { texto: ORC_FONTE_VAZIA, cor: CR_DESIGN_SYSTEM.colors.textMuted, fs: 7.5 };
}

// Mini gráfico de 12 colunas (sem rótulo de valor), usado no painel lateral.
function _orcMiniMeses_(slide, x, y, w, h, meses) {
  const DS = CR_DESIGN_SYSTEM;
  const base = y + h - 14, ph = h - 18;
  const max = Math.max.apply(null, meses) || 1;
  const colW = w / 12, barW = colW * 0.62;
  let iPico = 0;
  meses.forEach((v, i) => { if (v > meses[iPico]) iPico = i; });
  _orcLinha_(slide, x, base, x + w, base, DS.colors.lines, 0.75);
  meses.forEach((v, i) => {
    const bx = x + i * colW;
    if (v > 0.005) {
      const bh = Math.max(1.5, ph * v / max);
      _orcRet_(slide, bx + (colW - barW) / 2, base - bh, barW, bh, i === iPico ? DS.colors.brandDark : DS.colors.brandLight);
    }
    _orcUmaLinha_(slide, bx, base + 1, colW, 12, ORC_MESES[i].charAt(0),
      { align: 'C', fs: 6.5, bold: i === iPico, cor: DS.colors.textBody, folga: 6 });
  });
}

// ==========================================
// SLIDE DE UMA CATEGORIA
// ==========================================
function gerarSlideCategoria_(slide, W, H, cid, dados, cat) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const n = cat.itens.length;

  _orcHeader_(slide, W, cat.nome,
    _orcMoeda_(cat.total) + ' · ' + _orcPct_(cat.pct) + ' do orçamento de manutenção · ' +
    n + (n === 1 ? ' item' : ' itens') + ' · ' + cid.nome);

  // ---- Tabela de itens ----
  const pw = 168, gap = 12;                                    // painel estreito: sobra lugar para FONTE
  const tx = MX, ty = 76, tw = W - MX * 2 - pw - gap;
  const disp = H - 28 - ty - 20;
  const maxLinhas = Math.floor(disp / 15);                     // 15pt = menor linha legível
  let itens = cat.itens.slice();
  let resto = null;
  if (itens.length + 1 > maxLinhas) {                          // +1 = linha de TOTAL
    const cabem = maxLinhas - 2;                               // reserva a linha "+ k itens"
    const fora = itens.slice(cabem);
    resto = { n: fora.length, total: fora.reduce((a, it) => a + it.total, 0) };
    itens = itens.slice(0, cabem);
  }
  const nLin = itens.length + (resto ? 1 : 0) + 1;
  const rowH = Math.min(24, disp / nLin);

  const linhas = itens.map(it => ({ celulas: [
    { texto: it.descricao },
    { texto: _orcQuando_(it.meses), cor: DS.colors.textBody, fs: 7.5 },
    { texto: _orcMoeda_(it.total), bold: true },
    { texto: _orcPct_(cat.total ? it.total / cat.total : 0), cor: DS.colors.textBody, fs: 7.5 },
    _orcCelulaFonte_()
  ] }));
  if (resto) {
    linhas.push({ celulas: [
      { texto: '+ ' + resto.n + ' itens menores', cor: DS.colors.textBody },
      null,
      { texto: _orcMoeda_(resto.total), bold: true },
      { texto: _orcPct_(cat.total ? resto.total / cat.total : 0), cor: DS.colors.textBody, fs: 7.5 },
      null
    ] });
  }
  linhas.push({ total: true, celulas: [
    { texto: 'TOTAL ' + cat.nome }, { texto: _orcQuando_(cat.meses), fs: 7.5 },
    { texto: _orcMoeda_(cat.total) }, { texto: '100%', fs: 7.5 }, null
  ] });

  _orcTabela_(slide, tx, ty, tw, [
    { titulo: 'Item', w: null, align: 'L' },
    { titulo: 'Entrega', w: 54, align: 'C' },
    { titulo: 'Valor', w: 72, align: 'R' },
    { titulo: '% cat.', w: 40, align: 'R' },
    { titulo: 'Fonte', w: 78, align: 'L' }
  ], linhas, rowH);

  // ---- Painel lateral ----
  const px = W - MX - pw;
  const c1h = 150;
  _orcCard_(slide, px, ty, pw, c1h, 'Previsão de entrega');
  _orcMiniMeses_(slide, px + 12, ty + 26, pw - 24, c1h - 34, cat.meses);

  const c2y = ty + c1h + 10, c2h = H - 28 - c2y;
  _orcCard_(slide, px, c2y, pw, c2h, 'Peso no orçamento');
  _orcUmaLinha_(slide, px + 12, c2y + 20, pw - 24, 32, _orcPct_(cat.pct),
    { align: 'L', fs: 24, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, px + 12, c2y + 50, pw - 24, 14, 'da manutenção de ' + _orcCompacto_(dados.total),
    { align: 'L', fs: 7.5, cor: DS.colors.textBody, fonte: DS.typography.body, cortar: true });
  _orcRet_(slide, px + 12, c2y + 68, pw - 24, 6, DS.colors.lines, { redondo: true });
  _orcRet_(slide, px + 12, c2y + 68, Math.max(3, (pw - 24) * cat.pct), 6, DS.colors.brandLight, { redondo: true });
  let yTxt = c2y + 80;
  if (cat.totalContratos > 0.5) {
    _orcUmaLinha_(slide, px + 12, yTxt, pw - 24, 14,
      'Contratos ' + _orcCompacto_(cat.totalContratos) + ' + avulsos ' + _orcCompacto_(cat.totalAvulsos),
      { align: 'L', fs: 7.5, bold: true, cor: DS.colors.brandMed, fonte: DS.typography.body, fsMin: 6, cortar: true });
    yTxt += 16;
  }
  if (n > 1) {
    const maior = cat.itens[0];
    _orcParagrafo_(slide, px + 12, yTxt, pw - 20, c2y + c2h - 6 - yTxt,
      'Maior item: ' + maior.descricao + ' — ' + _orcPct_(maior.total / cat.total) + ' da categoria',
      { fs: 7.5, fsMin: 6, cor: DS.colors.textBody });
  }

  _orcRodape_(slide, W, H, 'Orçamento ' + ORC_ANO + ' · ' + cid.nome + ' · Manutenção de Imóveis · categoria ' + cat.nome);
}

// ==========================================
// DEMAIS CATEGORIAS (várias páginas se precisar)
// ==========================================
// Itens das categorias pequenas, agrupados, já divididos em páginas.
function _orcPaginasDemais_(demais) {
  const linhas = [];
  demais.forEach(c => c.itens.forEach((it, k) => linhas.push({ cat: c, it: it, primeiro: k === 0 })));
  // Divide por igual entre as páginas necessárias: 19 itens viram 10 + 9, e
  // não 18 + 1 (uma página quase vazia só com a linha de TOTAL).
  const nPag = Math.ceil(linhas.length / ORC_DEMAIS_POR_PAGINA);
  const porPag = nPag ? Math.ceil(linhas.length / nPag) : 0;
  const paginas = [];
  for (let i = 0; i < linhas.length; i += porPag) paginas.push(linhas.slice(i, i + porPag));
  return paginas;
}

function gerarSlideDemais_(slide, W, H, cid, dados, demais, pagina, iPag, nPag) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const total = demais.reduce((a, c) => a + c.total, 0);
  const ultima = iPag === nPag - 1;

  _orcHeader_(slide, W, 'Demais categorias' + (nPag > 1 ? ' (' + (iPag + 1) + '/' + nPag + ')' : ''),
    demais.length + ' categorias com menos de ' + Math.round(ORC_FATIA_SLIDE_PROPRIO * 100) + '% cada · ' +
    _orcMoeda_(total) + ' · ' + _orcPct_(dados.total ? total / dados.total : 0) + ' do orçamento de manutenção');

  // Cada categoria vira um bloco: a pill fica centrada na altura do grupo, a
  // faixa de fundo alterna por grupo e uma linha separa um grupo do outro.
  // Com a pill só na primeira linha e zebra por linha, os itens seguintes
  // pareciam não ter categoria (apontamento do gestor sobre ELÉTRICA).
  const blocos = [];
  pagina.forEach((l, k) => {
    const b = blocos[blocos.length - 1];
    if (b && b.cat === l.cat) b.n++;
    else blocos.push({ cat: l.cat, ini: k, n: 1 });
  });
  const blocoDe = k => blocos.filter(b => k >= b.ini && k < b.ini + b.n)[0];

  const linhas = pagina.map((l, k) => {
    const b = blocoDe(k), ib = blocos.indexOf(b);
    return {
      faixa: ib % 2,
      separador: k === b.ini && ib > 0,
      celulas: [
        k === b.ini ? { texto: l.cat.nome, pill: true, span: b.n } : null,
        { texto: l.it.descricao },
        { texto: _orcQuando_(l.it.meses), cor: DS.colors.textBody, fs: 7.5 },
        { texto: _orcMoeda_(l.it.total), bold: true },
        _orcCelulaFonte_()
      ]
    };
  });
  if (ultima) {
    linhas.push({ total: true, celulas: [
      { texto: 'TOTAL' }, { texto: demais.length + ' categorias' }, null, { texto: _orcMoeda_(total) }, null
    ] });
  }

  const ty = 76;
  const rowH = Math.min(22, (H - 28 - ty - 20) / Math.max(1, linhas.length));
  _orcTabela_(slide, MX, ty, W - MX * 2, [
    { titulo: 'Categoria', w: 128, align: 'C' },
    { titulo: 'Item', w: null, align: 'L' },
    { titulo: 'Entrega', w: 70, align: 'C' },
    { titulo: 'Valor', w: 90, align: 'R' },
    { titulo: 'Fonte', w: 96, align: 'L' }
  ], linhas, rowH);

  _orcRodape_(slide, W, H, 'Orçamento ' + ORC_ANO + ' · ' + cid.nome + ' · Manutenção de Imóveis · categorias abaixo de ' +
    Math.round(ORC_FATIA_SLIDE_PROPRIO * 100) + '% do total');
}
