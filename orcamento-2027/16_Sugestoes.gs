/**
 * ARQUIVO: 16_Sugestoes.gs
 * SLIDES:  Seção "Sugestões para discussão" — slides propostos a partir dos
 *          dados, fora da versão aprovada pelo gestor. Ficam no fim do deck,
 *          com faixa laranja no título e selo SUGESTÃO no rodapé, para
 *          serem promovidos (ou descartados) um a um.
 *          Os números vêm de 05_DadosSugestoes.gs.
 */

const ORC_COR_SUGESTAO = '#F97316';

// Faixa laranja sobre a barra do título e selo no rodapé.
function _orcMarcarSugestao_(slide, W, H, fonte) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  _orcRet_(slide, MX, 16, 5, 36, ORC_COR_SUGESTAO);
  const pw = 74;
  if (fonte) {
    _orcUmaLinha_(slide, MX, H - 20, W - MX * 2 - pw - 12, 14, fonte,
      { align: 'L', fs: 7, cor: DS.colors.textMuted, fonte: DS.typography.body, cortar: true });
  }
  _orcRet_(slide, W - MX - pw, H - 19, pw, 13, ORC_COR_SUGESTAO, { redondo: true });
  _orcUmaLinha_(slide, W - MX - pw, H - 19, pw, 13, 'SUGESTÃO',
    { align: 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6 });
}

// ==========================================
// ABERTURA DA SEÇÃO
// ==========================================
const ORC_SUGESTOES_LISTA = [
  ['Resumo executivo', 'o que levar da reunião em 30 segundos'],
  ['Ponte Ritmo → Orçamento', 'de onde vem cada real da alta'],
  ['Manutenção: investimento × recorrente', 'a alta é custo corrente ou projeto?'],
  ['Cenários: o que dá para adiar', 'onde está a folga, se precisar cortar'],
  ['Contratos: concentração e reajustes', 'de quem dependemos e o que já tem reajuste'],
  ['Contratos sem reajuste', 'quanto custa cada 1% que o orçamento não prevê'],
  ['Fluxo mensal do orçamento', 'em que mês o dinheiro sai'],
  ['Custo por m²', 'o Mega está mais caro ou só maior?']
];

function gerarSlideSugestoesAbertura_(slide, W, H, cid) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.brandDark);
  _orcRet_(slide, 0, 0, 6, H, ORC_COR_SUGESTAO);
  _orcUmaLinha_(slide, 48, 40, W - 140, 18, 'SUGESTÕES PARA DISCUSSÃO',
    { align: 'L', fs: 10, bold: true, cor: ORC_COR_SUGESTAO, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, 48, 60, W - 140, 40, 'Outras leituras do orçamento',
    { align: 'L', fs: 26, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 16 });
  _orcUmaLinha_(slide, 48, 100, W - 120, 18,
    cid.nome + ' · slides propostos a partir dos mesmos dados, fora da versão aprovada — cada um pode entrar ou sair',
    { align: 'L', fs: 9, cor: '#CBD5E1', fonte: DS.typography.body, cortar: true });
  const y0 = 136, passo = (H - 40 - y0) / ORC_SUGESTOES_LISTA.length;
  ORC_SUGESTOES_LISTA.forEach((s, i) => {
    const y = y0 + i * passo;
    _orcRet_(slide, 48, y + 3, 20, 20, ORC_COR_SUGESTAO, { redondo: true });
    _orcUmaLinha_(slide, 48, y + 3, 20, 20, String(i + 1),
      { align: 'C', fs: 9, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6 });
    _orcUmaLinha_(slide, 78, y, 260, 26, s[0],
      { align: 'L', fs: 11, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 8, cortar: true });
    _orcUmaLinha_(slide, 340, y, W - 340 - 48, 26, s[1],
      { align: 'L', fs: 9, cor: '#94A3B8', fonte: DS.typography.body, cortar: true });
  });
}

// ==========================================
// S1 — RESUMO EXECUTIVO
// ==========================================
function gerarSlideSugResumo_(slide, W, H, cid, rel, classManut, reaj) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const r = _orcResumoExecutivo_(rel, classManut);
  const a = rel.anos;
  _orcHeader_(slide, W, 'Resumo executivo — Orçamento ' + ORC_ANO, cid.nome + ' · o que levar da reunião');

  const ky = 74, kh = 56, gap = 10, kw = (W - MX * 2 - gap * 2) / 3;
  const v = _orcVariacao_(r.ritmo, r.total);
  const kpis = [
    ['Orçamento ' + a.orc, _orcMoeda_(r.total), 'Ritmo ' + a.ritmo + ': ' + _orcMoeda_(r.ritmo)],
    ['Variação × ritmo', (r.delta >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(r.delta)), v.texto + ' contra o Ritmo ' + a.ritmo],
    ['R$/m² ao mês', r.m2Orc != null ? _orcM2_(r.m2Orc) : '–',
     r.m2Rit != null ? _orcM2_(r.m2Rit) + ' no Ritmo ' + a.ritmo : '']
  ];
  kpis.forEach((k, i) => {
    const x = MX + i * (kw + gap);
    _orcRet_(slide, x, ky, kw, kh, i === 0 ? C.brandDark : C.cardBg, { redondo: true, borda: i === 0 ? null : C.lines });
    const claro = i === 0;
    _orcUmaLinha_(slide, x + 12, ky + 5, kw - 24, 13, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: claro ? C.brandSoft : C.textBody, fonte: DS.typography.titles });
    _orcUmaLinha_(slide, x + 12, ky + 18, kw - 24, 22, k[1],
      { align: 'L', fs: 15, bold: true, cor: claro ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 12, ky + 39, kw - 24, 13, k[2],
      { align: 'L', fs: 7, cor: claro ? '#CBD5E1' : C.textBody, fonte: DS.typography.body, cortar: true });
  });

  // Quatro mensagens, cada uma com o número na frente.
  const manut = rel.contas.filter(c => c.chave === _orcChaveConta_('Manutenção de imóveis'))[0];
  const msgs = [];
  if (r.foco.length) {
    msgs.push([_orcPct_(r.delta ? r.deltaFoco / r.delta : 0).replace(',0%', '%'),
      'da alta vem das três contas em foco: ' + r.foco.map(f => f.nome.split(' ')[0] + ' ' +
        (f.delta >= 0 ? '+' : '−') + _orcCompacto_(Math.abs(f.delta))).join(', ') + '.']);
  }
  if (r.efeitoArea != null) {
    const pctArea = r.areaRit ? (r.areaOrc / r.areaRit - 1) : 0;
    msgs.push(['+' + _orcPct_(pctArea) + ' de área',
      'O Mega fica maior: ' + _orcMilhar_(r.areaRit) + ' → ' + _orcMilhar_(r.areaOrc) + ' m² (área implícita). ' +
      'Efeito área ' + _orcCompacto_(r.efeitoArea) + '; efeito custo por m² ' + _orcCompacto_(r.efeitoCusto) + '.']);
  }
  if (classManut && manut) {
    const semProj = classManut.total - classManut.projetos.total;
    msgs.push([_orcCompacto_(classManut.projetos.total),
      'da manutenção são projetos pontuais. Sem eles a conta fica em ' + _orcCompacto_(semProj) + ', contra ' +
      _orcCompacto_(manut.v.ritmo) + ' no Ritmo ' + a.ritmo + '.']);
  }
  if (reaj) {
    msgs.push([_orcCompacto_(reaj.umPorCento),
      'é o custo de cada 1% de reajuste nos ' + reaj.semReajuste.length + ' contratos que estão com o mesmo valor ' +
      'o ano todo em ' + a.orc + ' (base ' + _orcCompacto_(reaj.baseSemReajuste) + ').']);
  }
  const my = ky + kh + gap, mh = (H - 28 - my - gap) / 2, mw = (W - MX * 2 - gap) / 2;
  msgs.slice(0, 4).forEach((m, i) => {
    const x = MX + (i % 2) * (mw + gap), y = my + Math.floor(i / 2) * (mh + gap);
    _orcRet_(slide, x, y, mw, mh, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, x, y, 4, mh, ORC_COR_SUGESTAO);
    _orcUmaLinha_(slide, x + 14, y + 6, mw - 28, 26, m[0],
      { align: 'L', fs: 18, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10, cortar: true });
    _orcParagrafo_(slide, x + 14, y + 34, mw - 24, mh - 40, m[1], { fs: 8.5, fsMin: 6.5, cor: C.textBody });
  });

  _orcMarcarSugestao_(slide, W, H, 'Fontes: METRAGEM-COND, modelos 070/090 e planilhas de contratos · área implícita = total ÷ R$/m² ÷ 12');
}

// ==========================================
// S2 — PONTE RITMO → ORÇAMENTO
// ==========================================
function gerarSlideSugPonte_(slide, W, H, cid, rel, mensal) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const p = _orcPonte_(rel, mensal);
  _orcHeader_(slide, W, 'Ponte Ritmo ' + a.ritmo + ' → Orçamento ' + a.orc,
    'De onde vem a alta de ' + _orcCompacto_(p.fim - p.inicio) + ' · ' + cid.nome + ' · R$ mil');

  const cx = MX, cy = 72, cw = W - MX * 2, ch = H - 28 - cy;
  _orcCard_(slide, cx, cy, cw, ch, 'Ritmo ' + a.ritmo + ' → Orç ' + a.orc);
  const COR = { total: C.brandMed, saida: '#94A3B8', novo: C.brandLight, reducao: _ORC_COR_VAR.desce };
  const leg = [['Variação da conta', COR.total], ['Já roda em dez/' + String(a.ritmo).slice(-2) + ' × 12', COR.saida],
               ['Novo em ' + a.orc, COR.novo], ['Redução', COR.reducao]];
  let lx = cx + cw - 12;
  leg.slice().reverse().forEach(l => {
    const tw = _orcLarguraTexto_(l[0], 6.5, DS.typography.body) + 22;
    lx -= tw;
    _orcRet_(slide, lx, cy + 9, 7, 7, l[1]);
    _orcUmaLinha_(slide, lx + 9, cy + 5, tw - 9, 14, l[0], { align: 'L', fs: 6.5, cor: C.textBody, fonte: DS.typography.body, folga: 4 });
  });

  // Colunas: início, degraus, fim. O eixo começa num piso redondo (meio
  // milhão abaixo de 85% do menor nível) — senão as barras de total engolem
  // os degraus de algumas centenas de mil. O piso fica escrito no gráfico.
  const niveis = [p.inicio];
  let run = p.inicio;
  p.degraus.forEach(d => { d.partes.forEach(pt => { run += pt.v; niveis.push(run); }); });
  niveis.push(p.fim);
  const piso = Math.floor(Math.min.apply(null, niveis) * 0.85 / 5e5) * 5e5;
  const teto = Math.max.apply(null, niveis) * 1.04;
  const notas = p.degraus.filter(d => d.partes.length > 1);
  const px = cx + 14, pw = cw - 28, pTop = cy + 34, base = cy + ch - 34 - (notas.length ? 12 * notas.length : 0);
  const ph = base - pTop;
  const y = v => base - ph * (v - piso) / (teto - piso);
  const n = p.degraus.length + 2, colW = pw / n, barW = colW * 0.58;
  const rotulo = (i, txt) => _orcUmaLinha_(slide, px + i * colW, base + 2, colW, 22, txt,
    { align: 'C', fs: 6.5, bold: true, cor: C.textBody, fonte: DS.typography.titles, folga: 4, fsMin: 5, cortar: true });
  const valor = (i, yy, txt, cor) => _orcUmaLinha_(slide, px + i * colW, yy, colW, 12, txt,
    { align: 'C', fs: 7, bold: true, cor: cor || C.textMain, fonte: DS.typography.body, folga: 4, fsMin: 5.5 });

  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  const barraTotal = (i, v, nome) => {
    const bx = px + i * colW + (colW - barW) / 2;
    _orcRet_(slide, bx, y(v), barW, base - y(v), C.brandDark);
    valor(i, y(v) - 13, _orcCompacto_(v).replace('R$ ', ''));
    rotulo(i, nome);
  };
  barraTotal(0, p.inicio, 'Ritmo ' + a.ritmo);
  run = p.inicio;
  p.degraus.forEach((d, k) => {
    const i = k + 1, bx = px + i * colW + (colW - barW) / 2;
    const ini = run;
    d.partes.forEach(pt => {
      const de = run, ate = run + pt.v;
      const cor = pt.tipo === 'total' ? (pt.v < 0 ? COR.reducao : COR.total) : COR[pt.tipo];
      _orcRet_(slide, bx, Math.min(y(de), y(ate)), barW, Math.max(0.8, Math.abs(y(de) - y(ate))), cor);
      run = ate;
    });
    _orcLinha_(slide, bx - (colW - barW) / 2 - barW * 0.2, y(ini), bx, y(ini), C.textMuted, 0.5);
    const topo = Math.min(y(ini), y(run));
    valor(i, d.delta >= 0 ? topo - 13 : Math.max(y(ini), y(run)) + 1, _orcDeltaMil_(d.delta),
          d.delta < 0 ? _ORC_COR_VAR.desce : C.textMain);
    rotulo(i, d.nome);
  });
  barraTotal(n - 1, p.fim, 'Orç ' + a.orc);
  _orcUmaLinha_(slide, px, pTop - 4, 200, 11, 'eixo começa em ' + _orcCompacto_(piso),
    { align: 'L', fs: 6, italic: true, cor: C.textMuted, fonte: DS.typography.body, folga: 4 });

  notas.forEach((d, k) => {
    const s = d.partes.filter(pt => pt.tipo === 'saida')[0], nv = d.partes.filter(pt => pt.tipo === 'novo')[0];
    _orcUmaLinha_(slide, px, base + 24 + k * 12, pw, 12,
      d.nome + ': ' + _orcDeltaMil_(s.v) + ' mil já rodam em dez/' + String(a.ritmo).slice(-2) +
      ' (mês × 12 − ritmo) e ' + _orcDeltaMil_(nv.v) + ' mil são novos em ' + a.orc,
      { align: 'L', fs: 7, cor: C.textBody, fonte: DS.typography.body, cortar: true });
  });

  _orcMarcarSugestao_(slide, W, H, 'Fontes: METRAGEM-COND (totais por conta) e Despesas-Mensal (dezembro do ritmo) · ' + cid.nome);
}

// ==========================================
// S3 — MANUTENÇÃO: INVESTIMENTO × RECORRENTE
// ==========================================
function gerarSlideSugInvestimento_(slide, W, H, cid, rel, classManut) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const cls = classManut, proj = cls.projetos;
  const manut = rel.contas.filter(c => c.chave === _orcChaveConta_('Manutenção de imóveis'))[0];
  _orcHeader_(slide, W, 'Manutenção: investimento × custo recorrente',
    _orcCompacto_(cls.total) + ' · ' + _orcCompacto_(proj.total) + ' (' + _orcPct_(cls.total ? proj.total / cls.total : 0) +
    ') são projetos pontuais · ' + cid.nome);

  const ty = 72, gap = 10, lw = 250, rx = MX + lw + gap, rw = W - MX - rx, bh = H - 28 - ty;
  _orcCard_(slide, MX, ty, lw, bh, 'Composição do Orç ' + a.orc);
  const cores = [C.brandDark, C.brandMed, C.brandLight, ORC_COR_SUGESTAO];
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
  _orcUmaLinha_(slide, MX + 12, by + 6, lw - 24, 13, 'SEM OS PROJETOS', { align: 'L', fs: 7, bold: true, cor: C.textBody, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, MX + 12, by + 19, lw - 24, 24, _orcMoeda_(semProj),
    { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10 });
  if (manut) {
    const vv = _orcVariacao_(manut.v.ritmo, semProj);
    _orcParagrafo_(slide, MX + 12, by + 44, lw - 20, ty + bh - by - 50,
      'Contra ' + _orcMoeda_(manut.v.ritmo) + ' no Ritmo ' + a.ritmo + ' (' + vv.texto + '). A alta da manutenção ' +
      'vem dos projetos; o custo de manter fica ' + (semProj <= manut.v.ritmo ? 'abaixo' : 'acima') + ' do ritmo.',
      { fs: 7.5, fsMin: 6, cor: C.textBody });
  }

  // Tabela dos projetos.
  _orcCard_(slide, rx, ty, rw, bh, 'Projetos / investimento — do maior para o menor');
  const disp = bh - 30 - 18, maxL = Math.floor(disp / 14) - 1;
  let itens = proj.itens.slice(), resto = null;
  if (itens.length > maxL) {
    const fora = itens.slice(maxL - 1);
    resto = { n: fora.length, total: fora.reduce((s, it) => s + it.total, 0) };
    itens = itens.slice(0, maxL - 1);
  }
  const linhas = itens.map(it => ({ celulas: [
    { texto: it.descricao }, { texto: it.categoria, cor: C.textBody, fs: 6.5 },
    { texto: _orcQuando_(it.meses), cor: C.textBody, fs: 7 }, { texto: _orcMoeda_(it.total), bold: true }] }));
  if (resto) linhas.push({ celulas: [{ texto: '+ ' + resto.n + ' itens menores', cor: C.textBody }, null, null,
                                     { texto: _orcMoeda_(resto.total), bold: true }] });
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL PROJETOS' }, null, null, { texto: _orcMoeda_(proj.total) }] });
  _orcTabela_(slide, rx + 8, ty + 22, rw - 16, [
    { titulo: 'Item', w: null, align: 'L' }, { titulo: 'Categoria', w: 92, align: 'L' },
    { titulo: 'Entrega', w: 52, align: 'C' }, { titulo: 'Valor', w: 70, align: 'R' }
  ], linhas, Math.min(16, disp / linhas.length), { hCab: 16 });

  _orcMarcarSugestao_(slide, W, H, 'Critério: contrato → recorrente (6+ meses) → projeto (implantação, instalação, compra, ' +
    'defensas, melhoria, plantio) → pontual');
}

// ==========================================
// S4 — CENÁRIOS
// ==========================================
function gerarSlideSugCenarios_(slide, W, H, cid, rel, classManut) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const cen = _orcCenarios_(rel, classManut);
  _orcHeader_(slide, W, 'Cenários: o que dá para adiar',
    'Projetos da manutenção fora de norma, do maior para o menor, com o efeito acumulado · ' + cid.nome);

  const ty = 72, pw = 170, gap = 10, tw = W - MX * 2 - pw - gap;
  const disp = H - 28 - ty - 18, maxL = Math.floor(disp / 14) - 1;
  const lista = cen.linhas.slice(0, maxL);
  const linhas = lista.map(l => ({ celulas: [
    { texto: l.item.descricao }, { texto: _orcCompacto_(l.item.total), bold: true },
    { texto: _orcCompacto_(l.acumulado), cor: C.textBody }, { texto: _orcCompacto_(l.total) },
    { texto: l.m2 != null ? _orcM2_(l.m2) : '–', cor: C.textBody }, _orcCelulaFonte_()] }));
  if (cen.linhas.length > lista.length) {
    const ult = cen.linhas[cen.linhas.length - 1];
    linhas.push({ celulas: [{ texto: '+ ' + (cen.linhas.length - lista.length) + ' itens menores', cor: C.textBody },
      null, { texto: _orcCompacto_(ult.acumulado), cor: C.textBody }, { texto: _orcCompacto_(ult.total) },
      { texto: ult.m2 != null ? _orcM2_(ult.m2) : '–', cor: C.textBody }, null] });
  }
  _orcTabela_(slide, MX, ty, tw, [
    { titulo: 'Projeto', w: null, align: 'L' }, { titulo: 'Valor', w: 56, align: 'R' },
    { titulo: 'Acumulado', w: 60, align: 'R' }, { titulo: 'Total ' + a.orc, w: 60, align: 'R' },
    { titulo: 'R$/m²', w: 40, align: 'R' }, { titulo: 'Decisão', w: 56, align: 'C' }
  ], linhas, Math.min(17, disp / linhas.length), { hCab: 18 });

  // Painel: base, adiando tudo, fora da lista.
  const px = W - MX - pw;
  const ult = cen.linhas.length ? cen.linhas[cen.linhas.length - 1] : null;
  const cards = [
    ['Base', _orcMoeda_(cen.base), 'R$/m² ' + (cen.m2Base != null ? _orcM2_(cen.m2Base) : '–')],
    ['Adiando todos', ult ? _orcMoeda_(ult.total) : '–',
     ult ? '−' + _orcCompacto_(cen.totalCandidatos) + ' · R$/m² ' + (ult.m2 != null ? _orcM2_(ult.m2) : '–') +
           ' · ' + _orcVariacao_(cen.ritmo, ult.total).texto + ' × ritmo' : ''],
    ['Fora da lista (norma)', _orcCompacto_(cen.totalNorma),
     cen.norma.length + ' itens de PPCI/SPCQ/linha de vida — obrigatórios']
  ];
  const chh = (H - 28 - ty - gap * 2) / 3;
  cards.forEach((k, i) => {
    const y = ty + i * (chh + gap);
    _orcRet_(slide, px, y, pw, chh, i === 1 ? C.brandDark : C.cardBg, { redondo: true, borda: i === 1 ? null : C.lines });
    const claro = i === 1;
    _orcUmaLinha_(slide, px + 12, y + 6, pw - 24, 13, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: claro ? C.brandSoft : C.textBody, fonte: DS.typography.titles, cortar: true });
    _orcUmaLinha_(slide, px + 12, y + 20, pw - 24, 22, k[1],
      { align: 'L', fs: 14, bold: true, cor: claro ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    _orcParagrafo_(slide, px + 12, y + 43, pw - 18, chh - 47, k[2],
      { fs: 7, fsMin: 5.5, cor: claro ? '#CBD5E1' : C.textBody });
  });

  _orcMarcarSugestao_(slide, W, H, 'Coluna Decisão para o gestor marcar (manter / adiar / cortar) · R$/m² com a área do orçamento fixa');
}

// ==========================================
// S5 — CONTRATOS
// ==========================================
function gerarSlideSugContratos_(slide, W, H, cid, rel, contratos, reaj) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  // Itens-contrato sem empresa entram no ranking como [IDENTIFICAR EMPRESA]
  // (barra cinza), mas não contam como fornecedor no subtítulo.
  const conc = _orcConcentracaoFornecedores_(contratos, rel.total.orc);
  const nForn = conc.filter(g => g.grupo !== ORC_SEM_FORNECEDOR).length;
  const totalContr = contratos.reduce((s, c) => s + c.total, 0);
  _orcHeader_(slide, W, 'Contratos: concentração e reajustes',
    _orcCompacto_(totalContr) + ' em contratos recorrentes (' + _orcPct_(rel.total.orc ? totalContr / rel.total.orc : 0) +
    ' do orçamento) · ' + nForn + ' fornecedores · ' + cid.nome);

  const ty = 72, gap = 10, lw = 330, rx = MX + lw + gap, rw = W - MX - rx, bh = H - 28 - ty;
  _orcCard_(slide, MX, ty, lw, bh, 'Maiores fornecedores — % do orçamento total');
  const top = conc.slice(0, 9);
  const rowH = (bh - 32) / top.length, maxT = top.length ? top[0].total : 1;
  const labW = 118, valW = 84, barMax = lw - 24 - labW - valW - 8;
  top.forEach((g, i) => {
    const y = ty + 26 + i * rowH;
    _orcUmaLinha_(slide, MX + 12, y, labW, rowH, g.grupo,
      { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: DS.typography.titles, fsMin: 5.5, cortar: true });
    _orcRet_(slide, MX + 12 + labW + 4, y + rowH * 0.3, Math.max(2, barMax * g.total / maxT), rowH * 0.4,
      g.grupo === ORC_SEM_FORNECEDOR ? C.textMuted : i === 0 ? ORC_COR_SUGESTAO : C.brandLight);
    _orcUmaLinha_(slide, MX + lw - 12 - valW, y, valW, rowH, _orcCompacto_(g.total) + ' · ' + _orcPct_(g.pct),
      { align: 'R', fs: 7, cor: C.textBody, fonte: DS.typography.body, fsMin: 5.5 });
  });

  // Reajustes previstos.
  const rh = bh * 0.58;
  _orcCard_(slide, rx, ty, rw, rh, 'Reajustes já previstos em ' + a.orc);
  // Fonte fixa no nome (fsMin = fs): encolher só os longos deixava cada linha
  // de um tamanho; o que não cabe é cortado.
  const linhas = reaj.reajustes.slice(0, 7).map(x => ({ celulas: [
    { texto: _orcRotuloContrato_(x.contrato), fs: 7, fsMin: 7 }, { texto: ORC_MESES[x.mes], cor: C.textBody, fs: 7 },
    { texto: _orcMilhar_(x.de) + ' → ' + _orcMilhar_(x.para), cor: C.textBody, fs: 7 },
    { texto: '+' + _orcPct_(x.pct), bold: true, cor: _ORC_COR_VAR.sobe, fs: 7.5 }] }));
  if (!linhas.length) linhas.push({ celulas: [{ texto: 'Nenhum contrato muda de valor no ano', cor: C.textBody }, null, null, null] });
  _orcTabela_(slide, rx + 8, ty + 22, rw - 16, [
    { titulo: 'Contrato', w: null, align: 'L' }, { titulo: 'Mês', w: 30, align: 'C' },
    { titulo: 'R$/mês', w: 78, align: 'C' }, { titulo: '%', w: 40, align: 'R' }
  ], linhas, Math.min(16, (rh - 30 - 16) / linhas.length), { hCab: 16 });

  // Contratos sem reajuste: quanto custa cada 1% (lista no slide seguinte).
  const sy = ty + rh + gap, sh = bh - rh - gap;
  _orcRet_(slide, rx, sy, rw, sh, C.brandDark, { redondo: true });
  _orcUmaLinha_(slide, rx + 12, sy + 6, rw - 24, 13, 'SEM REAJUSTE NO ORÇAMENTO',
    { align: 'L', fs: 7, bold: true, cor: C.brandSoft, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, rx + 12, sy + 20, rw - 24, 26, _orcCompacto_(reaj.umPorCento) + ' a cada 1%',
    { align: 'L', fs: 18, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 10 });
  _orcParagrafo_(slide, rx + 12, sy + 48, rw - 18, sh - 52,
    reaj.semReajuste.length + ' contratos (' + _orcCompacto_(reaj.baseSemReajuste) + ') estão com o mesmo valor ' +
    'o ano todo. Se forem reajustados em janeiro, cada 1% soma ' + _orcCompacto_(reaj.umPorCento) + ' no ano (5% ≈ ' +
    _orcCompacto_(reaj.umPorCento * 5) + '). Lista no próximo slide.',
    { fs: 7.5, fsMin: 6, cor: '#CBD5E1' });

  _orcMarcarSugestao_(slide, W, H, 'Fontes: planilhas de contratos + itens-contrato dos modelos 070/090' +
    ' · ' + ORC_SEM_FORNECEDOR + ': item do modelo sem a empresa no texto');
}

// ==========================================
// S5b — CONTRATOS SEM REAJUSTE
// ==========================================
function gerarSlideSugSemReajuste_(slide, W, H, cid, rel, reaj) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const lista = reaj.semReajuste;
  _orcHeader_(slide, W, 'Contratos sem reajuste no orçamento',
    lista.length + ' contratos com o mesmo valor de jan a dez · cada 1% de reajuste = ' +
    _orcCompacto_(reaj.umPorCento) + ' no ano · ' + cid.nome);

  const mensal = c => c.meses.filter(v => Math.abs(v) > 0.5)[0] || 0;
  // "Manutenção de imóveis" → "Manutenção": a conta só distingue o contrato.
  const conta = c => {
    const nome = ORC_CONTAS_DETALHE.filter(n => _orcChaveConta_(n) === _orcChaveConta_(c.conta))[0] || c.conta;
    return nome.split(' ')[0];
  };
  const linhas = lista.map(c => ({ celulas: [
    { texto: _orcRotuloContrato_(c), fs: 7.5, fsMin: 7.5 },
    { texto: conta(c), cor: C.textBody, fs: 7.5 },
    { texto: _orcMilhar_(mensal(c)), fs: 7.5 }, { texto: _orcMilhar_(c.total), fs: 7.5, bold: true },
    { texto: _orcMilhar_(c.total * 0.01), cor: C.textBody, fs: 7.5 },
    { texto: _orcMilhar_(c.total * 0.05), cor: _ORC_COR_VAR.sobe, fs: 7.5 }] }));
  const somaMes = lista.reduce((s, c) => s + mensal(c), 0);
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL' }, null, { texto: _orcMilhar_(somaMes) },
    { texto: _orcMilhar_(reaj.baseSemReajuste) }, { texto: _orcMilhar_(reaj.umPorCento) },
    { texto: _orcMilhar_(reaj.umPorCento * 5) }] });

  const ty = 72, hCab = 18;
  const rowH = Math.min(17, (H - 28 - ty - hCab - 6) / linhas.length);
  _orcTabela_(slide, MX, ty, W - MX * 2, [
    { titulo: 'Contrato', w: null, align: 'L' }, { titulo: 'Conta', w: 78, align: 'L' },
    { titulo: 'R$/mês', w: 70, align: 'R' }, { titulo: 'Total ' + a.orc, w: 80, align: 'R' },
    { titulo: '+1% (R$/ano)', w: 74, align: 'R' }, { titulo: '+5% (R$/ano)', w: 74, align: 'R' }
  ], linhas, rowH, { hCab: hCab });

  const fixas = reaj.parcelasFixas || [];
  _orcMarcarSugestao_(slide, W, H, 'Contrato com o mesmo valor em 10+ meses · reajuste a partir de janeiro' +
    (fixas.length ? ' · fora: parcela de financiamento (' + fixas.map(c => c.grupo + ' ' + _orcCompacto_(c.total)).join(', ') + ')' : ''));
}

// ==========================================
// S6 — FLUXO MENSAL
// ==========================================
function gerarSlideSugFluxo_(slide, W, H, cid, rel, mensal) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const f = _orcFluxoMensal_(mensal, rel);
  let iPico = 0;
  f.total.forEach((v, i) => { if (v > f.total[iPico]) iPico = i; });
  _orcHeader_(slide, W, 'Fluxo mensal do orçamento',
    'Todas as contas do relatório mensal · pico em ' + ORC_MESES[iPico] + ' (' + _orcCompacto_(f.total[iPico]) + ') · ' + cid.nome);

  const cx = MX, cy = 72, cw = W - MX * 2, ch = H - 28 - cy;
  _orcCard_(slide, cx, cy, cw, ch, 'Orç ' + a.orc + ' por mês e conta');
  const cores = [C.brandDark, C.brandMed, C.brandLight, ORC_COR_SUGESTAO, '#FBBF24', '#CBD5E1'];
  const series = f.blocos.map((b, i) => ({ nome: b.nome, cor: cores[i % cores.length], v: b.orc }));
  const leg = series.map(s => [s.nome.split(' ')[0], s.cor]).concat([['Real/ritmo ' + a.ritmo, C.accentRed]]);
  let lx = cx + cw - 12;
  leg.slice().reverse().forEach(l => {
    const tw = _orcLarguraTexto_(l[0], 6.5, DS.typography.body) + 22;
    lx -= tw;
    _orcRet_(slide, lx, cy + 9, 7, l[1] === C.accentRed ? 2 : 7, l[1]);
    _orcUmaLinha_(slide, lx + 9, cy + 5, tw - 9, 14, l[0], { align: 'L', fs: 6.5, cor: C.textBody, fonte: DS.typography.body, folga: 4 });
  });

  const px = cx + 14, pw = cw - 28, pTop = cy + 40, base = cy + ch - 34, ph = base - pTop;
  const max = Math.max.apply(null, f.total.concat(f.real)) || 1;
  const colW = pw / 12, barW = colW * 0.6;
  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  for (let i = 0; i < 12; i++) {
    const bx = px + i * colW + (colW - barW) / 2;
    let acc = 0;
    series.forEach(s => {
      const v = s.v[i];
      if (v > 0.5) {
        const h0 = ph * acc / max, h1 = ph * (acc + v) / max;
        _orcRet_(slide, bx, base - h1, barW, Math.max(0.5, h1 - h0), s.cor);
        acc += v;
      }
    });
    _orcUmaLinha_(slide, px + i * colW, base - ph * acc / max - 13, colW, 12, String(Math.round(acc / 1000)),
      { align: 'C', fs: 7, bold: i === iPico, cor: C.textMain, fonte: DS.typography.body, folga: 4, fsMin: 5.5 });
    if (f.real[i] > 0.5) {
      const yr = base - ph * f.real[i] / max;
      _orcRet_(slide, bx - 2, yr - 1, barW + 4, 2, C.accentRed);
    }
    _orcUmaLinha_(slide, px + i * colW, base + 3, colW, 13, ORC_MESES[i],
      { align: 'C', fs: 7, bold: i === iPico, cor: C.textBody, fonte: DS.typography.titles, folga: 4 });
  }
  const nota = f.fora.length ? 'Fora do gráfico (sem abertura mensal): ' + f.fora.map(c => c.nome + ' ' + _orcCompacto_(c.v.orc)).join(', ') +
    ' · valores em R$ mil' : 'Valores em R$ mil';
  _orcUmaLinha_(slide, px, base + 17, pw, 12, nota, { align: 'L', fs: 7, cor: C.textBody, fonte: DS.typography.body, cortar: true });

  _orcMarcarSugestao_(slide, W, H, 'Fonte: Despesas-Mensal ' + a.ritmo + ' x ' + a.orc + ' (controladoria) · linha vermelha = real/ritmo do ano anterior');
}

// ==========================================
// S7 — R$/m² POR CONTA
// ==========================================
function gerarSlideSugM2_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const d = _orcM2PorConta_(rel);
  const vt = _orcVariacao_(d.total.m2.ritmo, d.total.m2.orc, 0.005);
  const vArea = d.area.ritmo && d.area.orc ? d.area.orc / d.area.ritmo - 1 : null;
  _orcHeader_(slide, W, 'Custo por m² ao mês, ' + a.real + ' → ' + a.orc,
    'O Mega está mais caro ou só maior? · ' + cid.nome + ' · R$/m² ao mês');

  const linha = (l, tipo) => {
    const v = _orcVariacao_(l.m2.ritmo, l.m2.orc, 0.005);
    return { tipo: tipo, nome: l.nome, celulas: [
      { texto: _orcM2_(l.m2.real) }, { texto: _orcM2_(l.m2.orcAnt) }, { texto: _orcM2_(l.m2.ritmo) },
      { texto: _orcM2_(l.m2.orc), bold: true }, { texto: v.texto, sentido: v.sentido }] };
  };
  const linhas = [linha(d.total, 'total')].concat(d.linhas.map(l => linha(l, 'item')));
  linhas.push({ tipo: 'm2', nome: 'Área implícita (m²)', celulas: ['real', 'orcAnt', 'ritmo', 'orc'].map(k =>
    ({ texto: d.area[k] ? _orcMilhar_(d.area[k]) : '–' })).concat([
    { texto: vArea != null ? (vArea >= 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(vArea) * 100) + '%' : '–' }]) });

  const tw = W - MX * 2, labW = 200, numW = (tw - labW) / 5;
  const th = Math.min(H - 28 - 72 - 70, 16 * (linhas.length + 1) + 29);
  const yFim = _orcTabelaNum_(slide, MX, 72, tw, th, [
    { titulo: 'R$/M² AO MÊS', w: labW },
    { titulo: 'REAL ' + a.real, w: numW }, { titulo: 'ORÇ ' + a.orcAnt, w: numW },
    { titulo: 'RITMO ' + a.ritmo, w: numW }, { titulo: 'ORÇ ' + a.orc, w: numW, destaque: true },
    { titulo: 'Δ% × RITMO', w: numW }
  ], linhas, null);

  // Nota em card baixo: é uma frase só; esticada até o rodapé fica vazia.
  const ny = yFim + 12, nh = Math.min(H - 28 - ny, 52);
  if (nh > 30 && vArea != null) {
    _orcRet_(slide, MX, ny, tw, nh, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, MX, ny, 4, nh, ORC_COR_SUGESTAO);
    _orcParagrafo_(slide, MX + 14, ny + 6, tw - 24, nh - 12,
      'A área implícita cresce ' + _orcPct_(vArea) + ' e o custo por m² ' + vt.texto.replace('▲ ', 'sobe ').replace('▼ ', 'cai ') +
      ' contra o Ritmo ' + a.ritmo + '. Área implícita = total ÷ R$/m² ÷ 12 da METRAGEM — confirmar com a ABL oficial antes de usar.',
      { fs: 8.5, fsMin: 6.5, cor: C.textBody, meio: true });
  }

  _orcMarcarSugestao_(slide, W, H, 'Fonte: METRAGEM-COND — ' + cid.nome + ' · comparação com os outros Megas quando Itajaí e Esteio estiverem configurados');
}
