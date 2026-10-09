/**
 * ARQUIVO: 17_Investimento.gs
 * SLIDE:   Manutenção: projetos × custo recorrente — a alta da
 *          manutenção é custo de manter ou projeto pontual? Nasceu como
 *          sugestão e foi aprovado pelo gestor (05/10/2026); a
 *          classificação dos itens está em 05_DadosSugestoes.gs
 *          (_orcClassificarManutencao_).
 */

// O que entra em cada grupo, em palavras de quem lê o slide — vai na faixa de
// legenda embaixo dos cards (pedido do gestor, 06/10/2026: "vai gerar
// dúvidas"). Mesma ordem de classManut.grupos.
// Textos curtos, para caber em 2 linhas no card (gestor, 08/10/2026: os de
// Pontual e Projetos vazavam a borda na 3ª linha).
const ORC_GRUPOS_MANUT_LEGENDA = [
  'Serviço com contrato fechado com o fornecedor.',
  'Sem contrato, mas se repete ao longo do ano (ex.: provisões).',
  'Serviço em poucos meses para manter o que já existe (pintura, revisão, lavagem).',
  'Obra ou compra nova, que não existia (implantação, instalação, compra).'
];

// Cor de cada grupo (contrato, recorrente, pontual, projeto), a mesma nas
// barras, nas marcas da composição e na faixa dos quadros dos itens.
function _orcCoresGruposManut_() {
  const C = CR_DESIGN_SYSTEM.colors;
  return [C.brandDark, C.brandMed, C.brandLight, C.brandSoft];
}

// Grupo (0–3) de um item da composição, pela descrição e pelo valor; -1 se
// não achar.
function _orcGrupoDoItemManut_(cls) {
  const m = {};
  cls.grupos.forEach((g, i) => g.itens.forEach(it => { m[_orcNorm_(it.descricao) + '|' + Math.round(it.total)] = i; }));
  return it => { const k = _orcNorm_(it.descricao) + '|' + Math.round(it.total); return m[k] === undefined ? -1 : m[k]; };
}

function gerarSlideInvestimento_(slide, W, H, cid, rel, classManut) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const cls = classManut, proj = cls.projetos;
  const manut = rel.contas.filter(c => c.chave === _orcChaveConta_('Manutenção de imóveis'))[0];
  _orcHeader_(slide, W, 'Manutenção: projetos × custo recorrente',
    _orcCompacto_(cls.total) + ' · ' + _orcCompacto_(proj.total) + ' (' + _orcPct_(cls.total ? proj.total / cls.total : 0) +
    ') são projetos pontuais · ' + cid.nome);

  // Embaixo dos cards, a faixa que explica cada grupo (hLeg).
  const hLeg = 44;
  const ty = 72, gap = 10, lw = 250, rx = MX + lw + gap, rw = W - MX - rx, bh = H - 28 - ty - hLeg - 6;
  _orcCard_(slide, MX, ty, lw, bh, 'Composição do Orç ' + a.orc);
  const cores = _orcCoresGruposManut_();
  const maxG = Math.max.apply(null, cls.grupos.map(g => g.total)) || 1;
  cls.grupos.forEach((g, i) => {
    const y = ty + 26 + i * 34;
    _orcUmaLinha_(slide, MX + 12, y, lw - 24, 13, g.nome + ' · ' + g.itens.length + ' itens',
      { align: 'L', fs: 7.5, bold: true, cor: C.textMain, fonte: DS.typography.titles, cortar: true });
    _orcRet_(slide, MX + 12, y + 15, Math.max(2, (lw - 110) * g.total / maxG), 10, cores[i]);
    _orcUmaLinha_(slide, MX + lw - 12 - 84, y + 11, 84, 16, _orcCompacto_(g.total) + ' · ' + _orcPct_(cls.total ? g.total / cls.total : 0),
      { align: 'R', fs: 7.5, bold: true, cor: C.textBody, fonte: DS.typography.body, fsMin: 6 });
  });
  const by = ty + 26 + 4 * 34 + 6;
  _orcLinha_(slide, MX + 12, by, MX + lw - 12, by, C.lines, 0.75);
  const semProj = cls.total - proj.total;
  // Tudo menos os projetos: o que o Mega gasta para continuar funcionando.
  _orcUmaLinha_(slide, MX + 12, by + 6, lw - 24, 13, 'CUSTO PARA MANTER O MEGA RODANDO',
    { align: 'L', fs: 7, bold: true, cor: C.textBody, fonte: DS.typography.titles, fsMin: 6 });
  _orcUmaLinha_(slide, MX + 12, by + 19, lw - 24, 24, _orcMoeda_(semProj),
    { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10 });
  // O ritmo é a conta inteira de 2026 — com os projetos de 2026, que a
  // METRAGEM não separa. Dito no slide para a comparação não enganar.
  const txt = 'Contratos + recorrente + manutenção pontual (tudo menos os projetos).' + (manut
    ? ' Ritmo ' + a.ritmo + ' da conta inteira: ' + _orcMoeda_(manut.v.ritmo) + ' (' +
      _orcVariacao_(manut.v.ritmo, semProj).texto + ') — o ritmo inclui os projetos de ' + a.ritmo +
      ', que o relatório não separa.'
    : '');
  _orcParagrafo_(slide, MX + 12, by + 44, lw - 20, ty + bh - by - 48, txt, { fs: 7, fsMin: 6, cor: C.textBody });

  // Tabela dos projetos.
  _orcCard_(slide, rx, ty, rw, bh, 'Projetos — do maior para o menor');
  const disp = bh - 30 - 18, maxL = Math.floor(disp / 14) - 1;
  let itens = proj.itens.slice(), resto = null;
  if (itens.length > maxL) {
    const fora = itens.slice(maxL - 1);
    resto = { n: fora.length, total: fora.reduce((s, it) => s + it.total, 0) };
    itens = itens.slice(0, maxL - 1);
  }
  const linhas = itens.map(it => ({ celulas: [
    { texto: it.descricao, aba: 'Sugestões' }, { texto: it.categoria, cor: C.textBody, fs: 6.5 },
    { texto: _orcQuando_(it.meses), cor: C.textBody, fs: 7 }, { texto: _orcMoeda_(it.total), bold: true }] }));
  if (resto) linhas.push({ celulas: [{ texto: '+ ' + resto.n + ' itens menores', cor: C.textBody }, null, null,
                                     { texto: _orcMoeda_(resto.total), bold: true }] });
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL PROJETOS' }, null, null, { texto: _orcMoeda_(proj.total) }] });
  _orcTabela_(slide, rx + 8, ty + 22, rw - 16, [
    { titulo: 'Item', w: null, align: 'L' }, { titulo: 'Categoria', w: 92, align: 'L' },
    { titulo: 'Entrega', w: 52, align: 'C' }, { titulo: 'Valor', w: 70, align: 'C' }
  ], linhas, Math.min(16, disp / linhas.length), { hCab: 16 });

  // Legenda: o que é cada grupo, na cor da barra.
  const ly = ty + bh + 6, lgw = (W - MX * 2 - gap * 3) / 4;
  cls.grupos.forEach((g, i) => {
    const x = MX + i * (lgw + gap);
    _orcRet_(slide, x, ly, lgw, hLeg, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, x + 8, ly + 7, 8, 8, cores[i], { redondo: true });
    _orcUmaLinha_(slide, x + 20, ly + 4, lgw - 26, 14, g.nome,
      { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: DS.typography.titles, fsMin: 6, cortar: true });
    _orcParagrafo_(slide, x + 6, ly + 17, lgw - 10, hLeg - 19, ORC_GRUPOS_MANUT_LEGENDA[i] || '',
      { fs: 6.5, fsMin: 5.5, cor: C.textBody, espac: 100 });
  });

  _orcRodape_(slide, W, H, 'Cada item cai no primeiro grupo que servir: contrato → recorrente (6+ meses) → ' +
    'projeto (obra nova) → pontual; itens revistos pelo gestor seguem a decisão dele · ' + cid.nome);
}

// ==========================================
// OS ITENS DE CADA GRUPO (páginas depois do slide de projetos × recorrente)
// ==========================================
// Um quadro (card) por grupo — V19, aprovado em 09/10/2026 (Jonatas: "abrir um
// quadro por grupo ou deixar mais intuitivo que são sub categorias"). A faixa
// do topo leva a cor do grupo, a definição curta, o total e o nº de itens; sai
// a coluna GRUPO com o selo repetido em toda linha. Medidas em pt.
const ORC_QUADRO = { topo: 74, base: 30, cab: 31, pe: 5, linha: 10.5, gap: 8 };
const ORC_GRUPOS_MANUT_TITULO = ['CONTRATOS', 'RECORRENTE', 'MANUTENÇÃO PONTUAL', 'PROJETOS'];
const ORC_GRUPOS_MANUT_LEGENDA_CURTA = [
  'Serviço com contrato fechado com o fornecedor',
  'Se repete ao longo do ano (6+ meses, semestral ou anual)',
  'Serviço em poucos meses para manter o que já existe',
  'Obra ou compra nova, que não existia'
];

// Itens de um grupo, do maior para o menor. Três ou mais itens iguais que só
// mudam o armazém no fim do nome ("… ESCADA DE ACESSO - AMZ 1" … "AMZ 9", mesmo
// valor) viram uma linha: "LINHA DE VIDA … — AMZ 1 a 9 (9×)" — cortados, os nove
// pareciam o mesmo item repetido.
function _orcItensQuadro_(g) {
  const re = /^(.*?)[\s\-–]*\b(AMZ|ARMAZÉM|ARMAZEM)\s*0*(\d+)\s*$/i;
  const juntos = {};
  const lido = g.itens.map(it => {
    const m = String(it.descricao).match(re);
    const k = m ? _orcNorm_(m[1]) + '|' + m[2].toUpperCase() + '|' + Math.round(it.total) : null;
    if (k) (juntos[k] = juntos[k] || []).push({ it: it, n: Number(m[3]), base: m[1].trim(), pref: m[2].toUpperCase() });
    return { it: it, k: k };
  });
  const feitos = {}, saida = [];
  lido.forEach(l => {
    const lista = l.k ? juntos[l.k] : null;
    if (!lista || lista.length < 3) { saida.push({ descricao: l.it.descricao, total: l.it.total }); return; }
    if (feitos[l.k]) return;
    feitos[l.k] = true;
    const ns = lista.map(x => x.n).sort((a, b) => a - b);
    const seguidos = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
    // Sem o verbo do começo ("INSTALAÇÃO DE…"): a linha juntada cabe na letra das outras.
    const base = lista[0].base.replace(/^(INSTALA[ÇC][ÃA]O|IMPLANTA[ÇC][ÃA]O|COMPRA|FORNECIMENTO)( E \S+)? D[EOA]S? /i, '');
    saida.push({ descricao: base + ' — ' + lista[0].pref + ' ' + (seguidos ? ns[0] + ' a ' + ns[ns.length - 1] : ns.join(', ')) +
                   ' (' + lista.length + '×)',
                 total: lista.reduce((t, x) => t + x.it.total, 0), juntos: lista.length });
  });
  return saida.sort((a, b) => b.total - a.total);
}

// Páginas dos quadros: [{ quadros: [{ grupo, g, itens, col (0, 1 ou 'largo'),
// y, linha, nCol, cont }] }]. Grupo que cabe numa coluna vai empilhado nas
// colunas, na ordem; o que não cabe ganha a página inteira, com duas colunas
// dentro do quadro (e mais páginas, "(cont.)", se precisar).
function _orcPaginasGrupos_(cls, H) {
  const Q = ORC_QUADRO, alt = (H || 405) - Q.base - Q.topo;
  const cap = Math.floor((alt - Q.cab - Q.pe) / Q.linha);
  const pequenos = [], grandes = [];
  cls.grupos.forEach((g, i) => {
    if (!g.itens.length) return;
    const itens = _orcItensQuadro_(g);
    (itens.length <= cap ? pequenos : grandes).push({ grupo: i, g: g, itens: itens });
  });
  const paginas = [];
  let pag = null, col = 1, y = 0;
  pequenos.forEach(q => {
    const h = Q.cab + q.itens.length * Q.linha + Q.pe;
    if (!pag || y + Q.gap + h > alt) {
      col++; y = -Q.gap;
      if (col > 1) { pag = { quadros: [] }; paginas.push(pag); col = 0; }
    }
    pag.quadros.push({ grupo: q.grupo, g: q.g, itens: q.itens, col: col, y: y + Q.gap, linha: Q.linha, nCol: 1 });
    y += Q.gap + h;
  });
  grandes.forEach(q => {
    for (let i = 0; i < q.itens.length; i += cap * 2) {
      const parte = q.itens.slice(i, i + cap * 2), porCol = Math.ceil(parte.length / 2);
      paginas.push({ quadros: [{ grupo: q.grupo, g: q.g, itens: parte, col: 'largo', y: 0, nCol: 2, cont: i > 0,
                                 linha: Math.min(16, (alt - Q.cab - Q.pe) / porCol) }] });
    }
  });
  return paginas;
}

function gerarSlideGruposManut_(slide, W, H, cid, rel, cls, pagina, iPag, nPag) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX, Q = ORC_QUADRO;
  const nItens = cls.grupos.reduce((t, g) => t + g.itens.length, 0);
  _orcHeader_(slide, W, 'Manutenção: os itens de cada grupo' + (nPag > 1 ? ' (' + (iPag + 1) + '/' + nPag + ')' : ''),
    nItens + ' itens do Orç ' + rel.anos.orc + ' · ' + _orcMoeda_(cls.total) + ' · ' + cid.nome);
  const gap = 12, cw = (W - MX * 2 - gap) / 2;
  pagina.quadros.forEach(q => {
    const largo = q.col === 'largo';
    _orcQuadroGrupo_(slide, largo ? MX : MX + q.col * (cw + gap), Q.topo + q.y, largo ? W - MX * 2 : cw, q, cls);
  });
  _orcRodape_(slide, W, H, 'Contrato: cadastro de contratos · recorrente: 6+ meses, semestral ou anual · projeto: obra ou compra nova · ' +
    'pontual: o resto · itens revistos pelo gestor seguem a decisão dele · ' + cid.nome);
}

function _orcQuadroGrupo_(slide, x, y, w, q, cls) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, Q = ORC_QUADRO;
  const porCol = Math.ceil(q.itens.length / q.nCol), h = Q.cab + porCol * q.linha + Q.pe;
  // O card branco vai para a moldura (com a sombra); a faixa tem menos de 30 pt
  // de altura, então fica no conteúdo mesmo quando é o verde escuro da marca.
  _orcRet_(slide, x, y, w, h, C.cardBg, { redondo: true, borda: C.lines });
  const ct = q.grupo === 3 ? C.brandDark : '#FFFFFF';
  _orcRet_(slide, x + 3, y + 3, w - 6, 25, _orcCoresGruposManut_()[q.grupo], { redondo: true });
  const dir = 130;
  _orcUmaLinha_(slide, x + 11, y + 3, w - 22 - dir, 14, ORC_GRUPOS_MANUT_TITULO[q.grupo] + (q.cont ? ' (cont.)' : ''),
    { align: 'L', fs: 9, bold: true, cor: ct, fonte: T.titles, fsMin: 7, folga: 4 });
  _orcUmaLinha_(slide, x + 11, y + 16, w - 22 - dir, 11, ORC_GRUPOS_MANUT_LEGENDA_CURTA[q.grupo],
    { align: 'L', fs: 6.5, cor: ct, fonte: T.body, fsMin: 5, folga: 4 });
  _orcUmaLinha_(slide, x + w - 11 - dir, y + 3, dir, 14, _orcMoeda_(q.g.total),
    { align: 'R', fs: 10.5, bold: true, cor: ct, fonte: T.titles, fsMin: 8, folga: 4 });
  const n = q.g.itens.length;
  _orcUmaLinha_(slide, x + w - 11 - dir, y + 16, dir, 11,
    n + (n === 1 ? ' item' : ' itens') + ' · ' + _orcPct_(cls.total ? q.g.total / cls.total : 0) + ' da manutenção',
    { align: 'R', fs: 6.5, cor: ct, fonte: T.body, fsMin: 5.5, folga: 4 });
  const colW = (w - 10) / q.nCol, fs = q.linha >= 14 ? 7.5 : 7, valW = 58;
  q.itens.forEach((it, i) => {
    const c = Math.floor(i / porCol), r = i % porCol;
    const xa = x + 5 + c * colW, ry = y + Q.cab + r * q.linha, lw = colW - (q.nCol > 1 ? 4 : 0);
    if (r % 2) _orcRet_(slide, xa, ry, lw, q.linha, C.zebra);
    // A descrição passa pela planilha de textos (aba Composição), como na
    // composição; a linha dos itens juntados é montada aqui e encolhe se precisar.
    _orcUmaLinha_(slide, xa + 2, ry, lw - valW - 6, q.linha, it.descricao, it.juntos
      ? { align: 'L', fs: fs, cor: C.textMain, fonte: T.body, fsMin: 5, folga: 4 }
      : { align: 'L', fs: fs, cor: C.textMain, fonte: T.body, fsMin: fs, folga: 4, cortar: true, aba: 'Composição' });
    _orcUmaLinha_(slide, xa + lw - valW - 4, ry, valW, q.linha, _orcMoeda_(it.total),
      { align: 'R', fs: fs, bold: true, cor: C.textMain, fonte: T.body, fsMin: fs - 1, folga: 4 });
  });
}

// Composição da manutenção: coluna estreita na frente com a marca do grupo de
// cada item (o selo inteiro não cabe ao lado dos textos curtos). Linhas que
// não são item (menores, não detalhado, total) ficam sem marca.
function _orcMarcarGrupos_(linhas, itens, cls, colunas) {
  const grupoDe = _orcGrupoDoItemManut_(cls), cores = _orcCoresGruposManut_();
  // A marca (8 pt) sai da coluna de valor, que tem folga: o nome fica com a
  // mesma largura de antes e os textos curtos continuam cabendo.
  colunas.unshift({ titulo: '', w: 8, align: 'C' });
  const valor = colunas[colunas.length - 1];
  if (valor.w) valor.w -= 8;
  linhas.forEach((ln, r) => {
    const g = r < itens.length ? grupoDe(itens[r]) : -1;
    ln.celulas.unshift(g >= 0 ? { ponto: cores[g] } : null);
  });
}

// Legenda das marcas, alinhada à direita: ■ Contrato ■ Recorrente ■ Pontual ■ Projeto.
function _orcLegendaGrupos_(slide, x, y, w) {
  const DS = CR_DESIGN_SYSTEM, cores = _orcCoresGruposManut_();
  const nomes = ['Contrato', 'Recorrente', 'Pontual', 'Projeto'], fs = 6;
  // +16 de folga por nome (era +10): "Pontual" quebrava em "Pontua / l" no Slides (gestor, 08/10/2026).
  const larg = nomes.map(n => 6 + 3 + _orcLarguraTexto_(n, fs, DS.typography.body) + 16);
  let cx = x + w - larg.reduce((t, l) => t + l, 0);
  nomes.forEach((n, i) => {
    _orcRet_(slide, cx, y + 3, 6, 6, cores[i], { redondo: true });
    _orcUmaLinha_(slide, cx + 9, y, larg[i] - 9, 12, n,
      { align: 'L', fs: fs, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 14, fsMin: fs });
    cx += larg[i];
  });
}
