/**
 * ARQUIVO: 90_Pendentes.gs
 * SLIDES:  Sugestões com pendência — NÃO entram na geração (revisão do
 *          gestor, 05/10/2026). Ficam aqui, fora do pipeline, até serem
 *          corrigidas:
 *
 *   ▸ Contratos: concentração e reajustes  } custo de implantação entre um
 *   ▸ Contratos sem reajuste               } mês e outro é lido como reajuste
 *   ▸ Fluxo mensal do orçamento            → informações inconsistentes
 *   ▸ Cenários: o que dá para adiar        → em revisão
 *
 * Para voltar com um deles: corrija, chame no pipeline (_orcGerarCidade_,
 * 00_Main.gs) e troque _orcMarcarSugestao_ por _orcRodape_, como foi feito
 * com 17_Investimento.gs e 18_CustoM2.gs. Cálculos em 05_DadosSugestoes.gs.
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
    { texto: l.item.descricao, aba: 'Sugestões' }, { texto: _orcCompacto_(l.item.total), bold: true },
    { texto: _orcCompacto_(l.acumulado), cor: C.textBody }, { texto: _orcCompacto_(l.total) },
    { texto: l.m2 != null ? _orcM2_(l.m2) : '–', cor: C.textBody }, _orcCelulaFonte_()] }));
  if (cen.linhas.length > lista.length) {
    const ult = cen.linhas[cen.linhas.length - 1];
    linhas.push({ celulas: [{ texto: '+ ' + (cen.linhas.length - lista.length) + ' itens menores', cor: C.textBody },
      null, { texto: _orcCompacto_(ult.acumulado), cor: C.textBody }, { texto: _orcCompacto_(ult.total) },
      { texto: ult.m2 != null ? _orcM2_(ult.m2) : '–', cor: C.textBody }, null] });
  }
  _orcTabela_(slide, MX, ty, tw, [
    { titulo: 'Projeto', w: null, align: 'L' }, { titulo: 'Valor', w: 56, align: 'C' },
    { titulo: 'Acumulado', w: 60, align: 'C' }, { titulo: 'Total ' + a.orc, w: 60, align: 'C' },
    { titulo: 'R$/m²', w: 40, align: 'C' }, { titulo: 'Decisão', w: 56, align: 'C' }
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
      { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: DS.typography.titles, fsMin: 7, cortar: true, aba: 'Sugestões' });
    _orcRet_(slide, MX + 12 + labW + 4, y + rowH * 0.3, Math.max(2, barMax * g.total / maxT), rowH * 0.4,
      g.grupo === ORC_SEM_FORNECEDOR ? C.textMuted : i === 0 ? ORC_COR_SUGESTAO : C.brandLight);
    _orcUmaLinha_(slide, MX + lw - 12 - valW, y, valW, rowH, _orcCompacto_(g.total) + ' · ' + _orcPct_(g.pct),
      { align: 'R', fs: 7, cor: C.textBody, fonte: DS.typography.body, fsMin: 7, cortar: true });
  });

  // Reajustes previstos.
  const rh = bh * 0.58;
  _orcCard_(slide, rx, ty, rw, rh, 'Reajustes já previstos em ' + a.orc);
  // Fonte fixa no nome (fsMin = fs): encolher só os longos deixava cada linha
  // de um tamanho; o que não cabe é cortado.
  const linhas = reaj.reajustes.slice(0, 7).map(x => ({ celulas: [
    { texto: _orcRotuloContrato_(x.contrato), fs: 7, aba: 'Sugestões' }, { texto: ORC_MESES[x.mes], cor: C.textBody, fs: 7 },
    { texto: _orcMilhar_(x.de) + ' → ' + _orcMilhar_(x.para), cor: C.textBody, fs: 7 },
    { texto: '+' + _orcPct_(x.pct), bold: true, cor: _ORC_COR_VAR.sobe, fs: 7.5 }] }));
  if (!linhas.length) linhas.push({ celulas: [{ texto: 'Nenhum contrato muda de valor no ano', cor: C.textBody }, null, null, null] });
  _orcTabela_(slide, rx + 8, ty + 22, rw - 16, [
    { titulo: 'Contrato', w: null, align: 'L' }, { titulo: 'Mês', w: 30, align: 'C' },
    { titulo: 'R$/mês', w: 78, align: 'C' }, { titulo: '%', w: 40, align: 'C' }
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
    { texto: _orcRotuloContrato_(c), fs: 7.5, aba: 'Sugestões' },
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
    { titulo: 'R$/mês', w: 70, align: 'C' }, { titulo: 'Total ' + a.orc, w: 80, align: 'C' },
    { titulo: '+1% (R$/ano)', w: 74, align: 'C' }, { titulo: '+5% (R$/ano)', w: 74, align: 'C' }
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
