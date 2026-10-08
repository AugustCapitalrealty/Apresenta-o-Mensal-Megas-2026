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

// Selinho de cada grupo, nas cores das barras (pedido do gestor, 07/10/2026:
// "abrir e sinalizar melhor o que é contrato, recorrente, projetos e pontual").
const ORC_GRUPOS_MANUT_SELO = ['CONTRATO', 'RECORRENTE', 'PONTUAL', 'PROJETO'];
function _orcCoresGruposManut_() {
  const C = CR_DESIGN_SYSTEM.colors;
  return [C.brandDark, C.brandMed, C.brandLight, C.brandSoft];
}
function _orcSeloGrupo_(i) {
  const cores = _orcCoresGruposManut_();
  return { texto: ORC_GRUPOS_MANUT_SELO[i], fundo: cores[i], cor: i === 3 ? CR_DESIGN_SYSTEM.colors.brandDark : '#FFFFFF' };
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
// Linhas por coluna e colunas por página dos slides de itens por grupo.
const ORC_GRUPOS_LINHAS_COLUNA = 26;

// Todos os itens da manutenção, grupo a grupo (cabeçalho do grupo + itens do
// maior para o menor), em páginas de duas colunas. Cabeçalho que cairia na
// última linha de uma coluna desce para a próxima.
function _orcPaginasGrupos_(cls) {
  const linhas = [];
  cls.grupos.forEach((g, i) => {
    if (!g.itens.length) return;
    linhas.push({ grupo: i, g: g });
    g.itens.forEach(it => linhas.push({ item: it, grupo: i }));
  });
  const N = ORC_GRUPOS_LINHAS_COLUNA, colunas = [];
  let col = [];
  linhas.forEach(l => {
    if (col.length === N || (l.g && col.length === N - 1)) { colunas.push(col); col = []; }
    if (!col.length && !l.g && l.item) col.push({ grupo: l.grupo, g: cls.grupos[l.grupo], cont: true });
    col.push(l);
  });
  if (col.length) colunas.push(col);
  const paginas = [];
  for (let i = 0; i < colunas.length; i += 2) paginas.push(colunas.slice(i, i + 2));
  return paginas;
}

function gerarSlideGruposManut_(slide, W, H, cid, rel, cls, pagina, iPag, nPag) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const nItens = cls.grupos.reduce((t, g) => t + g.itens.length, 0);
  _orcHeader_(slide, W, 'Manutenção: os itens de cada grupo' + (nPag > 1 ? ' (' + (iPag + 1) + '/' + nPag + ')' : ''),
    nItens + ' itens do Orç ' + rel.anos.orc + ' · ' + _orcMoeda_(cls.total) + ' · contrato, recorrente, pontual e projeto · ' + cid.nome);
  const ty = 74, hCab = 16, gap = 12, cw = (W - MX * 2 - gap) / 2;
  const rowH = Math.min(14, (H - 30 - ty - hCab) / ORC_GRUPOS_LINHAS_COLUNA);
  const fs = rowH >= 12 ? 7 : 6.5;
  // Sem a coluna de entrega (o slide de projetos já a mostra): o nome precisa
  // da largura da composição para o texto curto caber.
  const colunas = [{ titulo: 'Grupo', w: 58, align: 'C' }, { titulo: 'Item', w: null, align: 'L' },
                   { titulo: 'Valor', w: 58, align: 'C' }];
  pagina.forEach((col, k) => {
    const linhas = col.map(l => l.g
      ? { total: true, celulas: [{ selo: _orcSeloGrupo_(l.grupo) },
          { texto: l.g.nome.toUpperCase() + (l.cont ? ' (cont.)' : ' · ' + l.g.itens.length + (l.g.itens.length === 1 ? ' item' : ' itens')) },
          { texto: l.cont ? '' : _orcMoeda_(l.g.total) }] }
      : { celulas: [{ selo: _orcSeloGrupo_(l.grupo) }, { texto: l.item.descricao, aba: 'Composição' },
          { texto: _orcMoeda_(l.item.total), bold: true }] });
    _orcTabela_(slide, MX + k * (cw + gap), ty, cw, colunas, linhas, rowH, { hCab: hCab, fs: fs });
  });
  _orcRodape_(slide, W, H, 'Contrato: tag [CONTRATO] ou cadastro de contratos · recorrente: valor em 6 meses ou mais · ' +
    'projeto: palavra de obra nova (implantação, instalação, compra, plantio) · pontual: o resto · ' + cid.nome);
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
