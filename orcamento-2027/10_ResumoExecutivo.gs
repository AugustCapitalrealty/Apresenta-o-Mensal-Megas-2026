/**
 * ARQUIVO: 10_ResumoExecutivo.gs
 * SLIDES:  Seção Resumo Executivo — o resumo de 30 segundos e a ponte
 *          Ritmo → Orçamento. Nasceram como sugestões (ver 90_Pendentes.gs) e
 *          foram aprovados pelo gestor na revisão de 30/09/2026; os cálculos
 *          continuam em 05_DadosSugestoes.gs.
 */

// ==========================================
// RESUMO EXECUTIVO
// ==========================================
function gerarSlideResumoExecutivo_(slide, W, H, cid, rel, classManut, reaj) {
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
    _orcRet_(slide, x, y, 4, mh, C.brandLight);
    _orcUmaLinha_(slide, x + 14, y + 6, mw - 28, 26, m[0],
      { align: 'L', fs: 18, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10, cortar: true });
    _orcParagrafo_(slide, x + 14, y + 34, mw - 24, mh - 40, m[1], { fs: 8.5, fsMin: 6.5, cor: C.textBody });
  });

  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND, modelos 070/090 e planilhas de contratos · área implícita = total ÷ R$/m² ÷ 12');
}

// ==========================================
// PONTE RITMO → ORÇAMENTO
// ==========================================
function gerarSlidePonte_(slide, W, H, cid, rel, mensal) {
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
  // Degrau de conta com divergência entre os relatórios: rótulo laranja com ⚠.
  const rotulo = (i, txt, revisar) => _orcUmaLinha_(slide, px + i * colW, base + 2, colW, 22, (revisar ? '⚠ ' : '') + txt,
    { align: 'C', fs: 6.5, bold: true, cor: revisar ? _ORC_COR_REVISAR.borda : C.textBody, fonte: DS.typography.titles,
      folga: 4, fsMin: 5, cortar: true });
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
    rotulo(i, d.nome, !!d.chave && _orcRevisarDe_(rel, [d.chave]).length > 0);
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

  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND (totais por conta) e Despesas-Mensal (dezembro do ritmo) · ' + cid.nome);
}
