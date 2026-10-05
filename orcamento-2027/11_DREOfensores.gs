/**
 * ARQUIVO: 11_DREOfensores.gs
 * SLIDES:  DRE do orçamento (padrão da apresentação mensal dos Megas) e o
 *          quadro de Ofensores e Defensores (padrão do financeiro mensal),
 *          um slide para cada bloco.
 *          Ficam juntos porque saem da mesma leitura (obterRelatorioAnual_)
 *          e desenham a mesma tabela numérica.
 *
 * Variação = Orç 2027 contra a base, com o sentido na seta: ▲ vermelha gasta
 * MAIS, ▼ verde gasta MENOS. Base zerada com valor novo aparece como "novo"
 * em vez de um "100%" que não diz nada.
 */

// Conta com menos que isto em TODAS as colunas vai para "Demais contas" do
// seu grupo — mantém a DRE em ~30 linhas, com fonte legível.
const ORC_DRE_AGRUPAR_ABAIXO = 10000;

// Ofensor/defensor com variação menor que isto (em módulo) vai para
// "Demais contas" do bloco.
const ORC_OFENSOR_MINIMO = 5000;

// Vermelho/verde dessaturados, como na DRE mensal: a tabela tem dezenas de
// variações coloridas e o tom saturado pesa demais. Os claros vão sobre fundo
// escuro (linhas de total).
const _ORC_COR_VAR = { sobe: '#A85450', desce: '#4E7B5F', sobeClaro: '#FCA5A5', desceClaro: '#86EFAC' };

// ==========================================
// FORMATOS
// ==========================================
function _orcMil_(v) {
  if (v === null || v === undefined || isNaN(v)) return '–';
  const r = Math.round(v / 1000);
  return r === 0 ? (Math.abs(v) < 0.5 ? '–' : '0') : _orcMilhar_(r);
}

function _orcDeltaMil_(d) {
  const r = Math.round(d / 1000);
  if (r === 0) return Math.abs(d) < 0.5 ? '–' : '0';
  return (r > 0 ? '+' : '−') + _orcMilhar_(Math.abs(r));
}

// { texto, sentido: 1 | -1 | 0 } — sentido 1 = gasta mais que a base.
// tol: abaixo disso o valor conta como zero. Padrão R$ 0,50 (valores em R$);
// R$/m² passa 0.005 — senão tudo abaixo de R$ 0,50/m² vira "novo" ou "0%".
function _orcVariacao_(base, novo, tol) {
  const t = tol === undefined ? 0.5 : tol;
  if (Math.abs(base) < t && Math.abs(novo) < t) return { texto: '–', sentido: 0 };
  if (Math.abs(base) < t) return { texto: '▲ novo', sentido: 1 };
  const p = (novo / base - 1) * 100;
  const r = Math.round(Math.abs(p));
  if (Math.abs(novo - base) < t) return { texto: '0%', sentido: 0 };
  return { texto: (p > 0 ? '▲ ' : '▼ ') + (r > 999 ? '>999' : r) + '%', sentido: p > 0 ? 1 : -1 };
}

function _orcM2_(v) {
  if (v === null || v === undefined || isNaN(v)) return '–';
  return v.toFixed(2).replace('.', ',');
}

// ==========================================
// TABELA NUMÉRICA
// ==========================================
// Estilo por tipo de linha: fundo, cor do texto, negrito e recuo do rótulo.
function _orcEstiloLinha_(tipo) {
  const C = CR_DESIGN_SYSTEM.colors;
  return {
    total:    { bg: C.brandDark,  cor: '#FFFFFF', bold: true,  recuo: 4,  escuro: true },
    m2:       { bg: C.brandMed,   cor: '#FFFFFF', bold: false, recuo: 10, escuro: true },
    subtotal: { bg: C.brandLight, cor: '#FFFFFF', bold: true,  recuo: 4,  escuro: true },
    grupo:    { bg: '#475569',    cor: '#FFFFFF', bold: true,  recuo: 4,  escuro: true },
    secao:    { bg: C.brandDark,  cor: '#FFFFFF', bold: true,  recuo: 4,  escuro: true },
    item:     { bg: null,         cor: C.textMain, bold: false, recuo: 14, escuro: false }
  }[tipo];
}

/**
 * colunas: [{ titulo, w, align, destaque }]   (a primeira é o rótulo)
 * linhas:  [{ tipo, nome, revisar, celulas: [{ texto, sentido }] }]
 *   sentido pinta a célula de variação (1 vermelho, -1 verde).
 *   revisar pinta a linha de laranja com um ⚠ no fim do rótulo (conta com
 *   divergência entre os relatórios — 19_Revisar.gs).
 * cabecalhoGrupos: [{ titulo, c0, n }] — faixa acima dos títulos das colunas.
 */
function _orcTabelaNum_(slide, x, y, w, h, colunas, linhas, cabecalhoGrupos) {
  const DS = CR_DESIGN_SYSTEM;
  const C = DS.colors;
  const hGrupo = cabecalhoGrupos && cabecalhoGrupos.length ? 13 : 0;
  const hCab = 16;
  const xs = [];
  let acc = x;
  colunas.forEach(c => { xs.push(acc); acc += c.w; });

  // Faixa de grupos de coluna e títulos.
  (cabecalhoGrupos || []).forEach(g => {
    const gx = xs[g.c0], gw = colunas.slice(g.c0, g.c0 + g.n).reduce((a, c) => a + c.w, 0);
    _orcRet_(slide, gx + 0.5, y, gw - 1, hGrupo - 1, g.cor || C.brandMed);
    _orcUmaLinha_(slide, gx, y, gw, hGrupo - 1, g.titulo,
      { align: 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6, fsMin: 5, cortar: true });
  });
  const yCab = y + hGrupo;
  _orcRet_(slide, x, yCab, w, hCab, C.brandDark);
  colunas.forEach((c, i) => {
    if (c.destaque) _orcRet_(slide, xs[i], yCab, c.w, hCab, C.brandLight);
    _orcUmaLinha_(slide, xs[i] + (i === 0 ? 4 : 0), yCab, c.w - (i === 0 ? 4 : 0), hCab, c.titulo,
      { align: i === 0 ? 'L' : 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles,
        folga: 4, fsMin: 6.5, cortar: true });
  });

  const y0 = yCab + hCab;
  const rowH = Math.min(15, (h - (y0 - y)) / Math.max(1, linhas.length));
  // Uma fonte para a tabela inteira (fsMin = fs em toda célula): o que não
  // cabe é cortado, não encolhido só naquela linha.
  const fs = rowH >= 12 ? 7 : (rowH >= 10 ? 6.5 : 6);

  // Fundos primeiro (zebra recomeça a cada grupo), conteúdo depois.
  let zebra = 0;
  linhas.forEach((ln, r) => {
    const ry = y0 + r * rowH, st = _orcEstiloLinha_(ln.tipo);
    if (st.bg) { _orcRet_(slide, x, ry, w, rowH, st.bg); zebra = 0; }
    else {
      if (ln.revisar) _orcRet_(slide, x, ry, w, rowH, _ORC_COR_REVISAR.fundo);
      else if (zebra % 2 === 1) _orcRet_(slide, x, ry, w, rowH, C.zebra);
      zebra++;
      colunas.forEach((c, i) => { if (c.destaque) _orcRet_(slide, xs[i], ry, c.w, rowH, '#DBEAFE', { alpha: 0.55 }); });
    }
    if (ln.revisar) _orcRet_(slide, x, ry, 2.5, rowH, _ORC_COR_REVISAR.borda);
  });
  linhas.forEach((ln, r) => {
    const ry = y0 + r * rowH, st = _orcEstiloLinha_(ln.tipo);
    const wAviso = ln.revisar ? 12 : 0;
    _orcUmaLinha_(slide, x + st.recuo, ry, colunas[0].w - st.recuo - wAviso, rowH, ln.nome,
      { align: 'L', fs: fs, bold: st.bold, cor: st.cor, fonte: ln.tipo === 'item' ? DS.typography.body : DS.typography.titles,
        folga: 4, fsMin: fs, cortar: true });
    if (ln.revisar) {
      _orcUmaLinha_(slide, x + colunas[0].w - wAviso, ry, wAviso, rowH, '⚠',
        { align: 'C', fs: fs, bold: true, cor: st.escuro ? '#FDBA74' : _ORC_COR_REVISAR.borda, fonte: DS.typography.body,
          folga: 2, fsMin: fs });
    }
    (ln.celulas || []).forEach((cel, k) => {
      if (!cel || !cel.texto) return;
      const i = k + 1, c = colunas[i];
      let cor = st.cor;
      if (cel.sentido === 1) cor = st.escuro ? _ORC_COR_VAR.sobeClaro : _ORC_COR_VAR.sobe;
      else if (cel.sentido === -1) cor = st.escuro ? _ORC_COR_VAR.desceClaro : _ORC_COR_VAR.desce;
      _orcUmaLinha_(slide, xs[i], ry, c.w, rowH, cel.texto,
        { align: c.align || 'C', fs: fs, bold: st.bold || !!cel.bold || cel.sentido !== undefined, cor: cor,
          fonte: DS.typography.body, folga: 4, fsMin: fs, cortar: true, aba: cel.aba, original: cel.original, sufixo: cel.sufixo });
    });
  });
  const yFim = y0 + linhas.length * rowH;
  _orcLinha_(slide, x, yFim, x + w, yFim, C.lines, 1);
  return yFim;
}

// ==========================================
// DRE
// ==========================================
// Linhas da DRE, já agrupadas e somadas. Separado do desenho para o teste
// conferir a estrutura e as somas sem olhar coordenada.
function _orcLinhasDRE_(rel) {
  const soma = lista => ['real', 'orcAnt', 'ritmo', 'orc'].reduce((o, k) => {
    o[k] = lista.reduce((a, v) => a + v[k], 0); return o;
  }, {});
  const out = [];
  out.push({ tipo: 'total', nome: 'TOTAL GERAL — ÁREA COMUM + IPTU + SEGURO', v: rel.total });
  if (rel.m2Total) out.push({ tipo: 'm2', nome: 'R$/m²', v: rel.m2Total });
  out.push({ tipo: 'subtotal', nome: 'ÁREA COMUM', v: rel.areaComum });
  if (rel.m2AreaComum) out.push({ tipo: 'm2', nome: 'R$/m²', v: rel.m2AreaComum });

  const grupos = ORC_DRE_GRUPOS.map(g => g.nome).concat([ORC_DRE_OUTRAS]);
  grupos.forEach(nomeGrupo => {
    const contas = rel.contas.filter(c => c.grupo === nomeGrupo);
    if (!contas.length) return;
    out.push({ tipo: 'grupo', nome: nomeGrupo.toUpperCase(), v: soma(contas.map(c => c.v)) });
    const pequena = c => Math.max(c.v.real, c.v.orcAnt, c.v.ritmo, c.v.orc) < ORC_DRE_AGRUPAR_ABAIXO;
    const miudas = contas.filter(pequena);
    contas.filter(c => !pequena(c) || miudas.length === 1)
      .forEach(c => out.push({ tipo: 'item', nome: c.nome, chaves: [c.chave], v: c.v }));
    if (miudas.length > 1) {
      out.push({ tipo: 'item', nome: 'Demais contas (' + miudas.length + ')', v: soma(miudas.map(c => c.v)),
                 agrupadas: miudas.map(c => c.nome), chaves: miudas.map(c => c.chave) });
    }
  });
  out.push({ tipo: 'grupo', nome: 'IPTU E SEGURO', v: soma([rel.iptu, rel.seguro]) });
  out.push({ tipo: 'item', nome: 'IPTU', chaves: [_orcChaveConta_('IPTU')], v: rel.iptu });
  out.push({ tipo: 'item', nome: 'Seguro', chaves: [_orcChaveConta_('Seguro')], v: rel.seguro });
  return out;
}

function gerarSlideDRE_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const a = rel.anos;
  _orcHeader_(slide, W, 'DRE — Orçamento ' + ORC_ANO,
    'Despesas do condomínio · ' + cid.nome + ' · valores em R$ mil · variação do Orç ' + a.orc +
    ' contra o Ritmo e o Orç ' + a.ritmo);

  const linhas = _orcLinhasDRE_(rel).map(l => {
    if (l.tipo === 'm2') {
      // R$/m²: só os valores. A variação seria idêntica à da linha em R$
      // (dividir os dois lados pela mesma área não muda a razão).
      return { tipo: 'm2', nome: l.nome, celulas: [
        { texto: _orcM2_(l.v.real) }, { texto: _orcM2_(l.v.orcAnt) }, { texto: _orcM2_(l.v.ritmo) },
        { texto: _orcM2_(l.v.orc) }, null, null, null] };
    }
    const vR = _orcVariacao_(l.v.ritmo, l.v.orc), vO = _orcVariacao_(l.v.orcAnt, l.v.orc);
    const d = l.v.orc - l.v.ritmo;
    return { tipo: l.tipo, nome: l.nome, revisar: !!l.chaves && _orcRevisarDe_(rel, l.chaves).length > 0, celulas: [
      { texto: _orcMil_(l.v.real) }, { texto: _orcMil_(l.v.orcAnt) }, { texto: _orcMil_(l.v.ritmo) },
      { texto: _orcMil_(l.v.orc), bold: true },
      { texto: _orcDeltaMil_(d), sentido: Math.abs(d) < 0.5 ? 0 : (d > 0 ? 1 : -1) },
      { texto: vR.texto, sentido: vR.sentido }, { texto: vO.texto, sentido: vO.sentido }] };
  });

  const tw = W - MX * 2, labW = 196;
  const numW = (tw - labW) / 7;
  const colunas = [
    { titulo: 'R$ MIL', w: labW },
    { titulo: 'REAL ' + a.real, w: numW }, { titulo: 'ORÇ ' + a.orcAnt, w: numW },
    { titulo: 'RITMO ' + a.ritmo, w: numW }, { titulo: 'ORÇ ' + a.orc, w: numW, destaque: true },
    { titulo: 'Δ R$ × RITMO', w: numW }, { titulo: 'Δ% × RITMO', w: numW }, { titulo: 'Δ% × ORÇ ' + a.orcAnt, w: numW }
  ];
  const ty = 72, th = H - 26 - ty - (rel.avisos.length ? 10 : 0);
  _orcTabelaNum_(slide, MX, ty, tw, th, colunas, linhas, [
    { titulo: 'VALORES', c0: 1, n: 4 },
    { titulo: 'ORÇ ' + a.orc + ' CONTRA', c0: 5, n: 3, cor: '#475569' }
  ]);

  _orcAvisosRodape_(slide, W, H, rel.avisos);
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND — ' + cid.nome + ' (controladoria) · despesa em R$ mil, ' +
    '▲ vermelho gasta mais, ▼ verde gasta menos');
}

// Divergência de soma do relatório vai escrita no slide, acima do rodapé —
// para ser vista antes da reunião, não durante.
function _orcAvisosRodape_(slide, W, H, avisos) {
  if (!avisos || !avisos.length) return;
  _orcUmaLinha_(slide, CR_DESIGN_SYSTEM.layout.marginX, H - 32, W - CR_DESIGN_SYSTEM.layout.marginX * 2, 12,
    '⚠ ' + avisos[0] + (avisos.length > 1 ? ' (+' + (avisos.length - 1) + ' no log)' : ''),
    { align: 'L', fs: 6.5, bold: true, cor: CR_DESIGN_SYSTEM.colors.accentRed, fonte: CR_DESIGN_SYSTEM.typography.body,
      fsMin: 5, cortar: true });
}

// ==========================================
// OFENSORES E DEFENSORES
// ==========================================
/**
 * Contas (mais IPTU e Seguro) com a variação Orç 2027 − Ritmo 2026, divididas
 * em ofensores (sobem) e defensores (caem), da maior variação para a menor.
 * Variação abaixo de ORC_OFENSOR_MINIMO vai para "Demais" do bloco, para o
 * quadro fechar com o total sem listar centavos.
 */
function _orcOfensores_(rel) {
  const todas = rel.contas.map(c => ({ nome: c.nome, chave: c.chave, v: c.v }))
    .concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), v: rel.iptu },
             { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), v: rel.seguro }]);
  todas.forEach(c => { c.delta = c.v.orc - c.v.ritmo; });
  const bloco = (filtro, ordem) => {
    const lista = todas.filter(filtro).sort(ordem);
    const grandes = lista.filter(c => Math.abs(c.delta) >= ORC_OFENSOR_MINIMO);
    const miudas = lista.filter(c => Math.abs(c.delta) < ORC_OFENSOR_MINIMO);
    const somaV = l => ['real', 'orcAnt', 'ritmo', 'orc'].reduce((o, k) => { o[k] = l.reduce((a, c) => a + c.v[k], 0); return o; }, {});
    return {
      contas: grandes,
      demais: miudas.length ? { nome: 'Demais contas (' + miudas.length + ')', v: somaV(miudas),
                                chaves: miudas.map(c => c.chave),
                                delta: miudas.reduce((a, c) => a + c.delta, 0) } : null,
      total: { v: somaV(lista), delta: lista.reduce((a, c) => a + c.delta, 0) }
    };
  };
  return {
    ofensores: bloco(c => c.delta > 0.5, (a, b) => b.delta - a.delta),
    defensores: bloco(c => c.delta < -0.5, (a, b) => a.delta - b.delta),
    total: { v: rel.total, delta: rel.total.orc - rel.total.ritmo }
  };
}

// Um slide por bloco (lado = 'ofensores' | 'defensores'): juntos não cabiam
// com folga e o gestor pediu separados (30/09/2026). O TOTAL GERAL fecha os
// dois, para cada slide mostrar o peso do bloco no orçamento.
function gerarSlideOfensores_(slide, W, H, cid, rel, linhasModelo, lado) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const a = rel.anos;
  const q = _orcOfensores_(rel);
  const ofensor = lado !== 'defensores';
  _orcHeader_(slide, W, (ofensor ? 'Ofensores' : 'Defensores') + ' — Orçamento ' + ORC_ANO,
    'O que puxa o orçamento para ' + (ofensor ? 'cima' : 'baixo') + ' · Orç ' + a.orc + ' contra o Ritmo ' + a.ritmo +
    ' · ' + cid.nome + ' · R$ mil');

  // Maior item orçado da conta nos modelos 070/090 — dá nome ao número. A
  // chave na planilha de textos é só a descrição, sem o valor.
  const maiorItem = chave => {
    const it = _orcItensDaConta_(linhasModelo || [], chave)[0];
    const sufixo = it ? ' · ' + _orcCompacto_(it.total) : '';
    return it ? { texto: _orcTextoEscolhido_('Ofensores', it.descricao) + sufixo,
                  aba: 'Ofensores', original: it.descricao, sufixo: sufixo } : null;
  };
  const linhaConta = (c, tipo) => {
    const v = _orcVariacao_(c.v.ritmo, c.v.orc);
    const chaves = c.chaves || (c.chave ? [c.chave] : null);
    return { tipo: tipo || 'item', nome: c.nome, revisar: !!chaves && _orcRevisarDe_(rel, chaves).length > 0, celulas: [
      { texto: _orcMil_(c.v.orcAnt) }, { texto: _orcMil_(c.v.ritmo) }, { texto: _orcMil_(c.v.orc), bold: true },
      { texto: _orcDeltaMil_(c.delta), sentido: c.delta > 0.5 ? 1 : (c.delta < -0.5 ? -1 : 0) },
      { texto: v.texto, sentido: v.sentido },
      c.chave ? maiorItem(c.chave) : null] };
  };
  const b = ofensor ? ['OFENSORES — SOBEM EM ' + a.orc, q.ofensores, 'TOTAL OFENSORES']
                    : ['DEFENSORES — CAEM EM ' + a.orc, q.defensores, 'TOTAL DEFENSORES'];
  const linhas = [{ tipo: 'secao', nome: b[0], celulas: [] }];
  b[1].contas.forEach(c => linhas.push(linhaConta(c)));
  if (b[1].demais) linhas.push(linhaConta(b[1].demais));
  linhas.push(linhaConta({ nome: b[2], v: b[1].total.v, delta: b[1].total.delta }, 'grupo'));
  linhas.push(linhaConta({ nome: 'TOTAL GERAL (ÁREA COMUM + IPTU + SEGURO)', v: q.total.v, delta: q.total.delta }, 'total'));

  const tw = W - MX * 2, labW = 170, numW = 54, itemW = tw - labW - numW * 5;
  const colunas = [
    { titulo: 'CONTA', w: labW },
    { titulo: 'ORÇ ' + a.orcAnt, w: numW }, { titulo: 'RITMO ' + a.ritmo, w: numW },
    { titulo: 'ORÇ ' + a.orc, w: numW, destaque: true },
    { titulo: 'Δ R$', w: numW }, { titulo: 'Δ %', w: numW },
    { titulo: 'MAIOR ITEM ORÇADO EM ' + a.orc, w: itemW, align: 'L' }
  ];
  _orcTabelaNum_(slide, MX, 74, tw, H - 26 - 74, colunas, linhas, null);
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND — ' + cid.nome + ' (controladoria); maior item: modelos 070 e 090 de ' +
    a.orc + ' · contas com variação abaixo de ' + _orcCompacto_(ORC_OFENSOR_MINIMO) + ' em "Demais"');
}
