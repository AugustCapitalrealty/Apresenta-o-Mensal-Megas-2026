/**
 * ARQUIVO: 33_GestorRedesenho.gs
 * SLIDES:  Slides do gestor com TABELA EM PRINT (proposta escaneada, planilha colada) ou tabela simples do Slides:
 *          a tabela vira a do padrão do deck — como nos slides da Moked (12/10/2026: "nem melhorou igual na moked
 *          alguns slides que fazia sentido e tinha oportunidade").
 *          Regra do Guilherme (12/10, 22h45): "não altere texto, apenas melhore as organizações; não altere números
 *          nem acrescente nada; apenas altere erros". Então: o texto e os números são os do print/da tabela, letra por
 *          letra — só os erros de português corrigidos (reservatorio → reservatório…).
 *
 * Roda dentro da revisão de cada slide (29_GestorRevisado.gs), na cópia — a v3 só é lida: tira o print (ou a tabela
 * do Slides) e desenha a tabela no mesmo espaço, na marca do Mega. Fotos, logos e o texto do gestor ficam.
 * Se o print não estiver mais onde estava (o gestor mexeu no slide), não mexe (o log diz).
 *
 * Por slide: titulo (trecho do título sem acento, minúsculo) + mega; tirar = elementos a tirar ({ tipo, x, y, w, h }
 * com tolerância, ou { tipo: 'TABLE' } = a tabela do lado esquerdo); desenhar(slide, W, H, tirados) = o novo; o = log.
 */

const ORC_GESTOR_REDESENHOS = [
  // CVISH (Itajaí e Curitiba): a tabela do Slides (azul) no padrão do deck, com as células dela como estão.
  { titulo: 'comunicacao horizontal', mega: 'Mega Itajaí', o: 'tabela no padrão do deck (mesmo texto e valores)',
    tirar: [{ tipo: 'TABLE' }], desenhar: (s, W, H, t) => _orcRedesenhoTabelaSlides_(s, t[0]) },
  { titulo: 'comunicacao horizontal', mega: 'Mega Curitiba', o: 'tabela no padrão do deck (mesmo texto e valores)',
    tirar: [{ tipo: 'TABLE' }], desenhar: (s, W, H, t) => _orcRedesenhoTabelaSlides_(s, t[0]) },
  // SPK: o print da proposta da Platner.
  { titulo: 'reforma reservatorio spk', mega: 'Mega Itajaí', o: 'print da proposta da Platner em tabela (mesmo texto e valores)',
    tirar: [{ tipo: 'IMAGE', x: 44, y: 199.8, w: 401.8, h: 118.2 }],
    desenhar: (s, W, H, t) => _orcTabelaQuebrada_(s, t[0].x, t[0].y, ORC_GESTOR_ESQ.w,
      [{ titulo: '', w: null }, { titulo: 'Un', w: 26, align: 'C' }, { titulo: 'Qtd', w: 44, align: 'R' }, { titulo: 'Valor', w: 76, align: 'R' }],
      [['MDO - Lavagem interna e externa de reservatório metálico;', 'm²', '640,00', 'R$ 34.800,00'],
       ['MDO - Lixamento e tratamento de pontos de ferrugem de reservatório metálico;', 'vb', '1,00', 'R$ 10.663,19'],
       ['MAT/MDO - Pintura interna de reservatório metálico com tinta epóxi, especial para água potável - Cor branco RAL 9003;', 'm²', '347,50', 'R$ 66.845,49'],
       ['MAT/MDO - Pintura externa de reservatório metálico com tinta PU - Cor cinza RAL 7038;', 'm²', '292,50', 'R$ 67.234,38']],
      ['VALOR PARCIAL', '', '', 'R$ 179.543,06'], 7.5) },
  // Substituição da segurança: o print da tabela do comparativo (a proposta escaneada fica como está).
  { titulo: 'substituicao seguranca | comparativo megas', mega: 'Mega Esteio', o: 'print do comparativo dos Megas em tabela (mesmo texto e valores)',
    tirar: [{ tipo: 'IMAGE', x: 48.9, y: 231.3, w: 379.8, h: 105.4 }],
    desenhar: (s, W, H, t) => _orcRedesenhoComparativo_(s, t[0]) },
  // A Sense: o print da análise validada da AlphaSense.
  { titulo: 'implantacao a sense', mega: 'Mega Itajaí', o: 'print da análise da AlphaSense em tabela (mesmo texto e valores)',
    tirar: [{ tipo: 'IMAGE', x: 46.4, y: 204.9, w: 391.6, h: 150.4 }],
    desenhar: (s, W, H, t) => _orcRedesenhoAlphaSense_(s, t[0]) }
];

// Área da esquerda do molde de fotos (até a linha vertical do texto do gestor).
const ORC_GESTOR_ESQ = { x: 44, w: 396, fim: 368 };

function _orcRedesenharGestor_(slide, W, H, r, feito, avisos) {
  const els = slide.getPageElements(), tipo = el => String(el.getPageElementType());
  const perto = (el, q) => Math.abs(el.getLeft() - q.x) <= 25 && Math.abs(el.getTop() - q.y) <= 25 &&
                           Math.abs(el.getWidth() - q.w) <= 40 && Math.abs(el.getHeight() - q.h) <= 40;
  const alvos = [];
  for (let i = 0; i < r.tirar.length; i++) {
    const q = r.tirar[i];
    const el = els.filter(e => alvos.indexOf(e) < 0 && tipo(e) === q.tipo &&
                              (q.x === undefined ? e.getLeft() < W / 2 : perto(e, q)))[0];
    if (!el) { avisos.push('tabela não redesenhada: ' + (q.tipo === 'TABLE' ? 'a tabela' : 'o print') + ' não está mais onde estava'); return; }
    alvos.push(el);
  }
  // O que o desenho precisa do que sai: posição e, da tabela do Slides, as células.
  const tirados = alvos.map(el => {
    const d = { x: el.getLeft(), y: el.getTop(), w: el.getWidth(), h: el.getHeight() };
    if (tipo(el) === 'TABLE') {
      const tb = el.asTable(), cel = [];
      for (let i = 0; i < tb.getNumRows(); i++) {
        const l = [];
        for (let j = 0; j < tb.getNumColumns(); j++) l.push(tb.getCell(i, j).getText().asString().replace(/\n$/, '').trim());
        cel.push(l);
      }
      d.celulas = cel;
    }
    return d;
  });
  if (tirados.some(t => t.celulas && t.celulas.length < 2)) { avisos.push('tabela não redesenhada: tabela vazia'); return; }
  alvos.forEach(el => el.remove());
  r.desenhar(slide, W, H, tirados);
  feito.push('redesenhado: ' + r.o);
}

// A tabela do Slides no padrão do deck, no mesmo lugar e altura: 1ª linha = cabeçalho; linha que começa com "TOTAL"
// = total. A 1ª coluna (texto) fica com a sobra; as outras, do tamanho do maior texto delas.
function _orcRedesenhoTabelaSlides_(slide, t) {
  const DS = CR_DESIGN_SYSTEM, fs = 7.5, cab = t.celulas[0], corpo = t.celulas.slice(1), n = cab.length;
  const larg = j => Math.max.apply(null, t.celulas.map((l, i) =>
    _orcLarguraTexto_(i === 0 ? String(l[j]).toUpperCase() : l[j], i === 0 ? 7 : fs, i === 0 ? DS.typography.titles : DS.typography.body, i === 0)));
  const colunas = cab.map((c, j) => ({ titulo: c, w: j === 0 ? null : Math.ceil(larg(j) * 1.08 + 16), align: j === 0 ? 'L' : j === n - 1 ? 'R' : 'C' }));
  const linhas = corpo.map(l => {
    const total = /^total\b/i.test(l[0]);
    return { total: total, celulas: l.map((v, j) => v ? { texto: v, bold: j === n - 1, fs: fs } : null) };
  });
  const hCab = 18, rowH = Math.min(22, Math.max(14, (Math.min(t.h, ORC_GESTOR_ESQ.fim - t.y) - hCab) / linhas.length));
  const w = Math.min(t.w, ORC_GESTOR_ESQ.x + ORC_GESTOR_ESQ.w - t.x);
  // As colunas de número não podem tomar a largura toda (13/10/2026: no Curitiba, na fonte da Demercado, a 1ª coluna
  // ficava com largura zero e o Slides parava a geração): encolhem por igual; sem caber, todas do mesmo tamanho.
  const min1 = Math.max(60, w * 0.3), fixo = () => colunas.reduce((a, c) => a + (c.w || 0), 0);
  if (fixo() > w - min1) {
    const f = (w - min1) / fixo();
    colunas.forEach(c => { if (c.w) c.w = Math.max(24, Math.floor(c.w * f)); });
    if (fixo() > w - min1) colunas.forEach(c => { c.w = null; });
  }
  _orcTabela_(slide, t.x, t.y, w, colunas, linhas, rowH, { fs: fs, hCab: hCab });
}

// Tabela com a 1ª coluna em várias linhas (descrição longa de proposta): a altura da linha segue o texto.
// colunas: [{ titulo, w (null = sobra), align }]; linhas: textos; total: textos (ou null).
function _orcTabelaQuebrada_(slide, x, y, w, colunas, linhas, total, fs) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography;
  const fixo = colunas.reduce((a, c) => a + (c.w || 0), 0), ws = colunas.map(c => c.w || (w - fixo));
  const hCab = 16;
  _orcRet_(slide, x, y, w, hCab, C.brandDark);
  let cx = x;
  colunas.forEach((c, i) => {
    if (c.titulo) _orcUmaLinha_(slide, cx, y, ws[i], hCab, c.titulo.toUpperCase(),
      { align: c.align || 'L', fs: 7, bold: true, cor: '#FFFFFF', fonte: T.titles, folga: 6, fsMin: 7, cortar: true });
    cx += ws[i];
  });
  let ry = y + hCab;
  linhas.concat(total ? [total] : []).forEach((l, r) => {
    const eTotal = total && r === linhas.length;
    const h = Math.max(16, _orcMokedLinhas_(l[0], ws[0], fs, T.body, eTotal) * fs * 1.362 + 7);
    if (eTotal) _orcRet_(slide, x, ry, w, h, C.brandTint2);
    else if (r % 2 === 1) _orcRet_(slide, x, ry, w, h, C.zebra);
    cx = x;
    l.forEach((v, i) => {
      if (v && i === 0) _orcParagrafo_(slide, cx, ry, ws[i], h, v, { fs: fs, fsMin: fs - 1, cor: C.textMain, fonte: T.body, meio: true, bold: eTotal });
      else if (v) _orcUmaLinha_(slide, cx, ry, ws[i], h, v,
        { align: colunas[i].align || 'L', fs: fs, bold: eTotal || i === l.length - 1, cor: C.textMain, fonte: T.body, folga: 6, fsMin: fs - 1, cortar: true });
      cx += ws[i];
    });
    ry += h;
  });
  _orcLinha_(slide, x, ry, x + w, ry, C.lines, 1);
  return ry;
}

// Substituição da segurança: o comparativo dos Megas (o print), mesmos textos e valores, nota com a aspa que faltava.
function _orcRedesenhoComparativo_(slide, t) {
  const DS = CR_DESIGN_SYSTEM, A = ORC_GESTOR_ESQ, fs = 7.5;
  const linhas = [['Mega Esteio', 'R$ 26.537,09', 'R$ 78.000,00', 'N/A', 'R$ 104.537,09'],
                  ['Mega Itajaí', 'R$ 37.034,59', 'R$ 74.069,18', 'N/A', 'R$ 111.103,77'],
                  ['Mega Curitiba', 'R$ 25.787,61', 'R$ 64.138,79', 'R$ 32.069,40', 'R$ 121.995,80']]
    .map(l => ({ celulas: l.map((v, j) => ({ texto: v, bold: j === 4, fs: fs })) }));
  linhas.push({ total: true, celulas: ['Total', 'R$ 89.359,29', 'R$ 216.207,97', 'R$ 32.069,40', 'R$ 337.636,66'].map(v => ({ texto: v, fs: fs })) });
  const fim = _orcTabela_(slide, A.x, t.y, A.w,
    [{ titulo: 'Condomínio', w: null }, { titulo: 'Portaria/CCO', w: 74, align: 'R' }, { titulo: 'Vigilante (2)', w: 74, align: 'R' },
     { titulo: 'Posto Apoio', w: 70, align: 'R' }, { titulo: 'Total', w: 76, align: 'R' }], linhas, 15, { fs: fs, hCab: 16 });
  _orcParagrafo_(slide, A.x, fim + 3, A.w, 22,
    '* Em Curitiba a Portaria/CCO é "Controlador de Acesso", em Esteio é "Porteiro" e em Itajaí é "Vigilante Desarmado"',
    { fs: 7, fsMin: 6, cor: DS.colors.textBody, fonte: DS.typography.body, italic: true });
}

// A Sense: a análise validada da AlphaSense (o print), mesmos textos e valores.
function _orcRedesenhoAlphaSense_(slide, t) {
  const DS = CR_DESIGN_SYSTEM, A = ORC_GESTOR_ESQ, C = DS.colors, T = DS.typography;
  let y = t.y;
  _orcMokedRotulo_(slide, A.x, y, A.w, '✓ ANÁLISE VALIDADA — EQUIPE ALPHASENSE · Quantitativo de cabo sensor revisado');
  y += 13;
  _orcUmaLinha_(slide, A.x, y, A.w, 12, 'O quantitativo anterior (~2.550 m) estava subdimensionado. Aplicando a regra oficial por trecho:',
    { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: T.body, folga: 4, fsMin: 6 });
  y += 13;
  const fs = 7.5;
  const linhas = [['Z1', 'Enterrado', '270 m', '×3', '810 m'], ['Z2', 'Alambrado', '343 m', '×2', '686 m'],
                  ['Z3', 'Alambrado', '450 m', '×2', '900 m'], ['Z4', 'Alambrado', '310 m', '×2', '620 m'],
                  ['Z5', 'Gradil', '320 m', '×2', '640 m'], ['Z6', 'Alambrado', '315 m', '×2', '630 m']]
    .map(l => ({ celulas: l.map((v, j) => ({ texto: v, bold: j === 4, fs: fs })) }));
  linhas.push({ total: true, celulas: ['TOTAL', '6 zonas', '2.008 m', '—', '4.286 m'].map(v => ({ texto: v, fs: fs })) });
  const fim = _orcTabela_(slide, A.x, y, A.w,
    [{ titulo: 'Zona', w: 44, align: 'C' }, { titulo: 'Aplicação', w: null }, { titulo: 'Linear', w: 66, align: 'R' },
     { titulo: 'Fator', w: 50, align: 'C' }, { titulo: 'Cabo sensor', w: 80, align: 'R' }], linhas, 12.5, { fs: fs, hCab: 14 });
  _orcParagrafo_(slide, A.x, fim + 2, A.w, Math.max(14, A.fim - fim - 2),
    'Quantitativo revisado do cabo sensor: 4.286 m (1.738 m de alambrado/gradil ×2 = 3.476 m + 270 m enterrado ×3 = 810 m). ' +
    'Acrescentar ainda margem de emenda/perda (+5% a +10%) e o cabo de descida até cada controladora. ' +
    'Fonte: Eng. José Aleixo — Equipe AlphaSense.',
    { fs: 6.5, fsMin: 5.5, cor: C.textBody, fonte: T.body });
}
