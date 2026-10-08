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
      // A variação em R$ segue ▲ vermelho / ▼ verde, não a cor da marca (erro 1 da analista 4).
      { align: 'L', fs: 15, bold: true, fonte: DS.typography.titles, fsMin: 9,
        cor: claro ? '#FFFFFF' : i === 1 ? (r.delta > 0.5 ? _ORC_COR_VAR.sobe : r.delta < -0.5 ? _ORC_COR_VAR.desce : C.brandDark) : C.brandDark });
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
    // Sinal certo e frase que segue o sinal (analista 3: "+-0,2% de área" e "fica maior" com a área caindo).
    msgs.push([(pctArea >= 0 ? '+' : '−') + _orcPct_(Math.abs(pctArea)) + ' de área',
      (Math.abs(pctArea) < 0.005 ? 'A área fica praticamente igual: ' : pctArea > 0 ? 'O Mega fica maior: ' : 'O Mega fica menor: ') +
      _orcMilhar_(r.areaRit) + ' → ' + _orcMilhar_(r.areaOrc) + ' m² (área implícita). ' +
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
  const a = rel.anos, dez = 'dez/' + String(a.ritmo).slice(-2);
  const p = _orcPonte_(rel, mensal);
  const alta = p.fim - p.inicio;
  _orcHeader_(slide, W, 'Ponte Ritmo ' + a.ritmo + ' → Orçamento ' + a.orc,
    'De onde vem a ' + (alta >= 0 ? 'alta' : 'queda') + ' de ' + _orcCompacto_(Math.abs(alta)) + ' · ' + cid.nome + ' · R$ mil');

  const cx = MX, cy = 72, cw = W - MX * 2, ch = H - 28 - cy;
  _orcCard_(slide, cx, cy, cw, ch, null);
  // Alta em vermelho e redução em verde, como as setas ▲▼ do resto do deck
  // (rascunho de 07/10/2026: as duas eram verdes).
  const COR = { total: _ORC_COR_VAR.sobe, saida: '#94A3B8', novo: C.brandLight, reducao: _ORC_COR_VAR.desce };

  // Chips no topo do card, como no bridge dos Megas: a mensagem do slide
  // antes do gráfico. O segundo só sai quando alguma conta separa o que já
  // roda em dezembro do que é novo.
  // Texto que começa em xVis e ocupa a largura medida, numa linha só: a
  // caixa recua o recuo interno (~7pt) para a esquerda e sobra folga à
  // direita (skill slides-caixa-texto-sem-quebra). Devolve a largura do texto.
  const textoJusto = (xVis, yy, hh, txt, fs, op) => {
    const o = op || {}, f = o.fonte || DS.typography.titles;
    const larg = _orcLarguraTexto_(txt, fs, f, !!o.bold);
    _orcUmaLinha_(slide, xVis - _ORC_RECUO_TEXTBOX / 2, yy, larg + _ORC_RECUO_TEXTBOX, hh, txt,
      { align: 'L', fs: fs, fsMin: fs, bold: !!o.bold, cor: o.cor, fonte: f, folga: 12 });
    return larg;
  };
  const chip = (x, titulo, valor, fundo, cor) => {
    const fsT = 6.5, fsV = 8.5, f = DS.typography.titles;
    const w = 12 + _orcLarguraTexto_(titulo, fsT, f, true) + 10 + _orcLarguraTexto_(valor, fsV, f, true) + 12;
    _orcRet_(slide, x, cy + 10, w, 22, fundo, { redondo: true });
    const wT = textoJusto(x + 12, cy + 10, 22, titulo, fsT, { bold: true, cor: cor });
    textoJusto(x + 12 + wT + 10, cy + 10, 22, valor, fsV, { bold: true, cor: cor });
    return x + w + 8;
  };
  const sobe = alta >= 0;
  let chipX = chip(cx + 14, 'RITMO ' + a.ritmo + ' → ORÇ ' + a.orc,
    (sobe ? '▲ +' : '▼ −') + _orcCompacto_(Math.abs(alta)) + ' (' + (sobe ? '+' : '−') +
    _orcPct_(p.inicio ? Math.abs(alta / p.inicio) : 0) + ')',
    sobe ? '#FEF2F2' : '#F0FDF4', sobe ? _ORC_COR_VAR.sobe : _ORC_COR_VAR.desce);
  const notas = p.degraus.filter(d => d.partes.length > 1);
  if (notas.length) {
    const soma = tipo => notas.reduce((t, d) => t + d.partes.filter(pt => pt.tipo === tipo)[0].v, 0);
    chip(chipX, notas.map(d => d.nome.split(' ')[0]).join(' e ').toUpperCase(),
      _orcDeltaMil_(soma('saida')) + ' mil já rodam em ' + dez + ' · ' + _orcDeltaMil_(soma('novo')) + ' mil novos',
      C.brandTint, C.brandMed);
  }

  // Colunas: início, degraus, fim. O eixo começa num piso redondo (meio
  // milhão abaixo de 85% do menor nível) — senão as barras de total engolem
  // os degraus de algumas centenas de mil. O piso fica escrito no gráfico.
  const niveis = [p.inicio];
  let run = p.inicio;
  p.degraus.forEach(d => { d.partes.forEach(pt => { run += pt.v; niveis.push(run); }); });
  niveis.push(p.fim);
  const piso = Math.floor(Math.min.apply(null, niveis) * 0.85 / 5e5) * 5e5;
  const teto = Math.max.apply(null, niveis) * 1.04;
  const px = cx + 14, pw = cw - 28, pTop = cy + 56, base = cy + ch - 52;
  const ph = base - pTop;
  const y = v => base - ph * (v - piso) / (teto - piso);
  const n = p.degraus.length + 2, colW = pw / n, barW = Math.min(colW * 0.56, 40);
  // Nome da coluna em até duas linhas. Degrau de conta com divergência entre
  // os relatórios: rótulo laranja com ⚠.
  const rotulo = (i, txt, op) => {
    const o = op || {};
    _orcParagrafo_(slide, px + i * colW - 4, base + 3, colW + 8, 22, (o.revisar ? '⚠ ' : '') + txt,
      { align: 'C', fs: 6.5, fsMin: 5.5, bold: true, espac: 100, fonte: DS.typography.titles,
        cor: o.revisar ? _ORC_COR_REVISAR.borda : (o.cor || C.textBody) });
  };
  const valor = (i, yy, txt, cor, fs) => _orcUmaLinha_(slide, px + i * colW, yy, colW, 12, txt,
    { align: 'C', fs: fs || 7, bold: true, cor: cor, fonte: DS.typography.titles, folga: 4, fsMin: 5.5 });

  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  const barraTotal = (i, v, nome) => {
    const bx = px + i * colW + (colW - barW) / 2;
    _orcRet_(slide, bx, y(v), barW, base - y(v), C.brandDark);
    valor(i, y(v) - 14, _orcCompacto_(v).replace('R$ ', ''), C.brandDark, 7.5);
    rotulo(i, nome.toUpperCase(), { cor: C.brandDark });
  };
  barraTotal(0, p.inicio, 'Ritmo ' + a.ritmo);
  run = p.inicio;
  p.degraus.forEach((d, k) => {
    const i = k + 1, bx = px + i * colW + (colW - barW) / 2;
    const ini = run;
    d.partes.forEach(pt => {
      const de = run, ate = run + pt.v;
      const cor = pt.tipo === 'total' ? (pt.v < 0 ? COR.reducao : COR.total) : COR[pt.tipo];
      const yy = Math.min(y(de), y(ate)), hh = Math.max(0.8, Math.abs(y(de) - y(ate)));
      _orcRet_(slide, bx, yy, barW, hh, cor);
      // Parte de degrau separado: o valor dentro da barra, se couber.
      if (d.partes.length > 1 && hh >= 10) {
        _orcUmaLinha_(slide, bx, yy + (hh - 10) / 2, barW, 10, _orcDeltaMil_(pt.v),
          { align: 'C', fs: 6, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 4, fsMin: 5 });
      }
      run = ate;
    });
    _orcLinha_(slide, bx - (colW - barW), y(ini), bx, y(ini), C.lines, 0.75);
    const corV = d.delta < 0 ? COR.reducao : COR.total;
    valor(i, d.delta >= 0 ? Math.min(y(ini), y(run)) - 13 : Math.max(y(ini), y(run)) + 1, _orcDeltaMil_(d.delta), corV);
    // O degrau em % do ritmo, do lado oposto ao valor.
    if (p.inicio) {
      _orcUmaLinha_(slide, px + i * colW, d.delta >= 0 ? Math.max(y(ini), y(run)) + 1.5 : Math.min(y(ini), y(run)) - 12, colW, 10,
        _orcPct_(Math.abs(d.delta / p.inicio)), { align: 'C', fs: 6, fsMin: 5.5, cor: C.textBody, fonte: DS.typography.body, folga: 4 });
    }
    rotulo(i, d.nome, { revisar: !!d.chave && _orcRevisarDe_(rel, [d.chave]).length > 0 });
  });
  barraTotal(n - 1, p.fim, 'Orç ' + a.orc);
  _orcUmaLinha_(slide, px, pTop - 14, 200, 11, 'eixo começa em ' + _orcCompacto_(piso),
    { align: 'L', fs: 6, italic: true, cor: C.textMuted, fonte: DS.typography.body, folga: 4 });

  // Legenda centralizada no pé do card, itens juntos (padrão dos Megas). Só
  // entra a cor que aparece no gráfico.
  const temReducao = p.degraus.some(d => d.partes.some(pt => pt.tipo === 'total' && pt.v < 0));
  const leg = [['Alta da conta', COR.total]];
  if (temReducao) leg.push(['Redução', COR.reducao]);
  if (notas.length) leg.push(['Já roda em ' + dez + ' (' + dez + ' × 12 − ritmo)', COR.saida], ['Novo em ' + a.orc, COR.novo]);
  const fsL = 7, gapL = 16;
  const larg = leg.map(l => 12 + _orcLarguraTexto_(l[0], fsL, DS.typography.body, false));
  let lx = cx + (cw - larg.reduce((t, w) => t + w, 0) - gapL * (leg.length - 1)) / 2;
  const ly = cy + ch - 18;
  leg.forEach((l, k) => {
    _orcRet_(slide, lx, ly + 2.5, 8, 8, l[1], { redondo: true });
    textoJusto(lx + 12, ly, 13, l[0], fsL, { cor: C.textBody, fonte: DS.typography.body });
    lx += larg[k] + gapL;
  });

  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND (totais por conta) · % = degrau sobre o ritmo ' + a.ritmo +
    (notas.length ? ' e Despesas-Mensal (dezembro do ritmo)' : '') + ' · ' + cid.nome);
}
