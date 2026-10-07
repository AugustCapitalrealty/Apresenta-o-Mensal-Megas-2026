/**
 * ARQUIVO: 22_ContratosTodos.gs
 * SLIDES:  Contratos — ano anterior × Orçamento, todas as contas (pedido do
 *          gestor, 07/10/2026: "um desse com todos os contratos que temos").
 *          Mesmo formato do slide de contratos da manutenção
 *          (21_ContratosComparados.gs), agrupado por conta, em quantas
 *          páginas precisar.
 *
 * Ano anterior: cadastro "2025 - Contratos" (ORC_CONTRATOS_ANO_ANTERIOR_ID),
 * todas as contas da unidade menos IPTU e Seguros (obrigações, não contratos).
 * Ano: linhas dos modelos 070/090 e das planilhas de contratos da cidade
 * (visao.modelos). Cada item do ano vai para o contrato do ano anterior da
 * MESMA conta com mais palavras do nome em comum (os dois "Empresa Auxiliar"
 * — segurança e serviços gerais — não se misturam); a primeira palavra do
 * nome (a marca: MIRIAD, FIRECAM…) basta para casar uma ampliação. Item do
 * ano com "contrato" no texto e sem par = contrato novo. Conta que os modelos
 * do ano não abrem (assistência em informática, por exemplo) fica com o
 * contrato do ano anterior e "fora do modelo".
 */

const ORC_CONTRATOS_FORA = ['IPTU', 'Seguros', 'Seguro'];
const ORC_CONTRATOS_POR_PAGINA = 16;

// Palavras que não identificam fornecedor no casamento por conjunto.
const _ORC_PALAVRAS_NAO_FORNECEDOR = ['empresa', 'servico', 'servicos', 'contrato', 'mega', 'manutencao', 'ltda',
  'eireli', 'curitiba', 'itajai', 'esteio', 'energia', 'eletrica', 'telefone', 'internet', 'sistema', 'licenca',
  'mensal', 'celular', 'fixo', 'tecnologia', 'referente', 'condominio'];

// Número conta mesmo curto: "ARMAZÉM 01" … "ARMAZÉM 09" são contratos
// diferentes do mesmo fornecedor.
function _orcPalavrasFornecedor_(nome) {
  return _orcNorm_(nome).replace(/[^a-z0-9 ]+/g, ' ').split(' ')
    .filter(p => (p.length >= 3 || /^\d+$/.test(p)) && _ORC_PALAVRAS_GENERICAS.indexOf(p) < 0 && _ORC_PALAVRAS_NAO_FORNECEDOR.indexOf(p) < 0);
}

// Palavras para o casamento: as do fornecedor; nome só de palavras genéricas
// ("Telefone fixo") casa pelo nome inteiro.
function _orcPalavrasCasamento_(nome) {
  const ps = _orcPalavrasFornecedor_(nome);
  return ps.length ? ps : _orcNorm_(nome).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(p => p.length >= 3);
}

// Categoria da linha: a do contrato (planilha ou cadastro) ou a tag do item.
// "CONSULTORIA AMBIENTAL" não cabe na coluna (100 pt).
function _orcCategoriaItem_(l) {
  const c = l.catContrato !== undefined ? l.catContrato : (_orcSepararCategoria_(l.item).categoria || '');
  return c.replace(/^CONSULTORIA\b/, 'CONSULT.');
}

// Nome que cabe na coluna CONTRATO (util ≈ 166 pt a 7 pt): sem "CONDOMÍNIO
// <cidade>" nem "SERVIÇO DE", ARMAZÉM vira AMZ; "FORNECEDOR - assunto" fica
// "FORNECEDOR – assunto" se couber, senão só o fornecedor — e quando a parte
// da frente é o nome da conta ("ENERGIA ELÉTRICA - HP FINANCIAL…"), vale a de trás.
// util: largura útil da coluna em pt (186 pt de coluna − recuo − folga ≈ 150).
function _orcNomeCurtoContrato_(nome, util) {
  util = util || 150;
  const fs = 7, f = CR_DESIGN_SYSTEM.typography.body;
  const cabe = t => _orcLarguraTexto_(t, fs, f, false) <= util;
  const limpa = x => String(x).replace(/\s+/g, ' ')
    .replace(/\s*-?\s*CONDOM[IÍ]NIO( MEGA)? (CURITIBA|ITAJA[IÍ]|ESTEIO)\.?/gi, '')
    .replace(/\bSERVI[CÇ]OS? (DE )?/gi, '').replace(/\bARMAZ[EÉ]M\b/gi, 'AMZ')
    .replace(/\s*R\$\s*[\d.,]+[^-)]*/g, '').replace(/^[^(]*\)/, m => m.replace(')', ''))
    .replace(/\s+-\s*$/, '').trim();
  // Tira palavras do fim (sem deixar "DE", "E", vírgula ou travessão pendurados).
  const encurta = (x, cabeX) => {
    while (!cabeX(x) && x.split(' ').length > 1) {
      x = x.split(' ').slice(0, -1).join(' ').replace(/(\s+(DE|DA|DO|DAS|DOS|E|PARA|COM|A|O|EM)|[\s,:;(–-])+$/i, '');
    }
    return x.replace(/\s*\([^)]*$/, '');          // parêntese que ficou aberto
  };
  let t = limpa(nome);
  const i = t.indexOf(' - ');
  if (i > 0) {
    let antes = t.slice(0, i).trim(), depois = t.slice(i + 3).trim();
    const pa = _orcPalavrasFornecedor_(antes).map(p => p.slice(0, 6));
    if (!pa.length) return encurta(limpa(depois), cabe);                 // "ENERGIA ELÉTRICA - HP…"
    if (_orcPalavrasFornecedor_(depois).some(p => pa.indexOf(p.slice(0, 6)) >= 0)) return encurta(antes, cabe);   // "VOIGT LIMPEZA - LIMPEZA"
    t = antes + ' – ' + depois;
    if (cabe(t)) return t;
    // O que diferencia costuma estar depois do travessão ("… – AMZ 04"):
    // encurta a parte da frente antes de cortar a de trás.
    const frente = encurta(antes, x => cabe(x + ' – ' + depois));
    if (cabe(frente + ' – ' + depois) && frente.length >= 4) return frente + ' – ' + depois;
  }
  return encurta(t, cabe);
}

let _ORC_CADASTRO_ANT = null;   // cache da leitura (uma por execução)
function _orcCadastroAnoAnterior_() {
  if (!_ORC_CADASTRO_ANT) {
    _ORC_CADASTRO_ANT = SpreadsheetApp.openById(ORC_CONTRATOS_ANO_ANTERIOR_ID).getSheets()[0].getDataRange().getValues();
  }
  return _ORC_CADASTRO_ANT;
}

// Contas (valorização) que a unidade tem no cadastro, menos as obrigações.
function _orcContasDoCadastro_(dados, unidade) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const cu = cab.indexOf('unidade'), cv = cab.indexOf('valorizacao');
  if (cu < 0 || cv < 0) return [];
  const fora = ORC_CONTRATOS_FORA.map(_orcChaveConta_), vistas = {};
  dados.slice(1).forEach(r => {
    if (_orcNorm_(r[cu]) !== _orcNorm_(unidade)) return;
    const k = _orcChaveConta_(r[cv]);
    if (k && fora.indexOf(k) < 0 && !vistas[k]) vistas[k] = String(r[cv]).trim();
  });
  return Object.keys(vistas).map(k => vistas[k]);
}

/**
 * @return { grupos: [{ conta, chave, metragem: v|null, linhas: [{ nome, categoria, ant, atual, situacao }],
 *                      ant, atual }], ant, atual, semPar: { n, ant }, novos: { n, atual } }
 */
function _orcCompararTodosContratos_(rel, cadDados, unidade, linhasModelo) {
  const contas = _orcContasDoCadastro_(cadDados, unidade);
  const doModelo = linhasModelo.filter(l => Math.abs(l.total) > 0.5);
  const chaves = {};
  contas.forEach(c => { chaves[_orcChaveConta_(c)] = c; });
  // Contas que só aparecem em 2027 com contrato também entram.
  doModelo.forEach(l => {
    const k = _orcChaveConta_(l.conta);
    if (!chaves[k] && /\bcontrato\b/.test(_orcNorm_(l.item)) && ORC_CONTRATOS_FORA.map(_orcChaveConta_).indexOf(k) < 0) chaves[k] = l.conta;
  });

  const grupos = Object.keys(chaves).map(k => {
    const ant = contas.indexOf(chaves[k]) >= 0 ? _orcLerCadastroContratos_(cadDados, unidade, chaves[k], ORC_ANO - 1) : [];
    const itens = doModelo.filter(l => _orcChaveConta_(l.conta) === k);
    // Cada item do ano vai para o contrato com mais palavras em comum.
    const pal = ant.map(c => _orcPalavrasCasamento_(c.fornecedor));
    const dono = itens.map(it => {
      const t = ' ' + _orcNorm_(it.item).replace(/[^a-z0-9 ]+/g, ' ') + ' ';
      let melhor = -1, nota = 0;
      pal.forEach((ps, i) => {
        if (!ps.length) return;
        const n = ps.filter(p => t.indexOf(' ' + p + ' ') >= 0).length;
        const marca = t.indexOf(' ' + ps[0] + ' ') >= 0;
        const s = n / ps.length + (marca ? 0.01 : 0);
        if ((s >= 0.5 || marca) && (s > nota || (s === nota && melhor >= 0 && ant[i].total > ant[melhor].total))) { melhor = i; nota = s; }
      });
      return melhor;
    });
    const linhas = ant.map((c, i) => {
      const doAno = itens.filter((it, j) => dono[j] === i);
      const atual = doAno.reduce((t, it) => t + it.total, 0);
      // Ampliação: item a mais do mesmo fornecedor ("ampliação contrato…",
      // "posto adicional…").
      const ampl = doAno.length > 1 ? doAno.filter(it => /ampliacao|adiciona/.test(_orcNorm_(it.item))) : [];
      const pct = c.total ? atual / c.total - 1 : 0, indice = c.reajuste || 'reajuste';
      const base = doAno.filter(it => ampl.indexOf(it) < 0).sort((a, b) => b.total - a.total)[0] || doAno[0];
      return {
        nome: _orcNomeCurtoContrato_(base ? _orcNomeContrato_(_orcSepararCategoria_(base.item).descricao || base.item) : c.fornecedor),
        categoria: base ? _orcCategoriaItem_(base) : '',
        ant: c.total, atual: atual,
        situacao: !doAno.length ? (itens.length ? 'Sem item em ' + ORC_ANO : 'Fora do modelo ' + ORC_ANO) :
          ampl.length ? 'Ampliação ' + _orcCompacto_(ampl.reduce((t, it) => t + it.total, 0)) :
          pct > 0.08 ? 'Acima do ' + indice : pct < -0.005 ? 'Redução' : 'Reajuste' + (c.reajuste ? ' ' + c.reajuste : '')
      };
    });
    itens.forEach((it, j) => {
      if (dono[j] >= 0 || !/\bcontrato\b/.test(_orcNorm_(it.item))) return;
      const sep = _orcSepararCategoria_(it.item);
      linhas.push({ nome: _orcNomeCurtoContrato_(_orcNomeContrato_(sep.descricao || it.item)), categoria: _orcCategoriaItem_(it),
                    ant: 0, atual: it.total, situacao: 'Novo em ' + ORC_ANO });
    });
    linhas.sort((a, b) => Math.max(b.ant, b.atual) - Math.max(a.ant, a.atual));
    // "Assistência informática" (cadastro) = "Assistência em informática" (METRAGEM).
    const semEm = x => x.replace(/\bem\b/g, ' ').replace(/\s+/g, ' ').trim();
    const contaRel = rel.contas.filter(c => semEm(c.chave) === semEm(k))[0];
    return { conta: contaRel ? contaRel.nome : chaves[k], chave: k, metragem: contaRel ? contaRel.v : null, linhas: linhas,
             ant: linhas.reduce((t, l) => t + l.ant, 0), atual: linhas.reduce((t, l) => t + l.atual, 0) };
  }).filter(g => g.linhas.length).sort((a, b) => Math.max(b.ant, b.atual) - Math.max(a.ant, a.atual));

  const todas = [];
  grupos.forEach(g => g.linhas.forEach(l => todas.push(l)));
  const semPar = todas.filter(l => l.ant > 0.5 && l.atual < 0.5), novos = todas.filter(l => /^Novo/.test(l.situacao));
  return { grupos: grupos, ant: todas.reduce((t, l) => t + l.ant, 0), atual: todas.reduce((t, l) => t + l.atual, 0),
           semPar: { n: semPar.length, ant: semPar.reduce((t, l) => t + l.ant, 0) },
           novos: { n: novos.length, atual: novos.reduce((t, l) => t + l.atual, 0) }, n: todas.length };
}

// Páginas: linhas de grupo e de contrato, sem deixar o nome da conta sozinho
// no pé da página; grupo que continua repete o nome com "(cont.)".
function _orcPaginasContratos_(cmp) {
  const linhas = [];
  cmp.grupos.forEach(g => {
    linhas.push({ grupo: g });
    g.linhas.forEach(l => linhas.push({ contrato: l, g: g }));
  });
  const paginas = [];
  let atual = [];
  linhas.forEach((l, i) => {
    const cheia = atual.length >= ORC_CONTRATOS_POR_PAGINA || (l.grupo && atual.length >= ORC_CONTRATOS_POR_PAGINA - 1);
    if (cheia) {
      paginas.push(atual);
      atual = [];
      if (l.contrato) atual.push({ grupo: l.g, cont: true });
    }
    atual.push(l);
  });
  if (atual.length) paginas.push(atual);
  return paginas;
}

function gerarSlideContratosTodos_(slide, W, H, cid, rel, cmp, pagina, iPag, nPag) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos, tw = W - MX * 2;
  const aRit = _orcAreaImplicita_(rel, 'ritmo'), aOrc = _orcAreaImplicita_(rel, 'orc');
  const m2 = (v, area) => area ? v / area / 12 : null;
  _orcHeader_(slide, W, 'Contratos — ' + a.ritmo + ' × Orçamento ' + a.orc + (nPag > 1 ? ' (' + (iPag + 1) + '/' + nPag + ')' : ''),
    cmp.n + ' contratos em ' + cmp.grupos.length + ' contas · ' + cid.nome + ' · em R$ e em R$/m² ao mês');

  // ---- Três cards: todos os contratos, os que não seguem e os novos ----
  const ky = 70, kh = 50, gap = 10, kw = (tw - gap * 2) / 3;
  const vT = _orcVariacao_(cmp.ant, cmp.atual);
  [['Todos os contratos', _orcCompacto_(cmp.ant) + ' → ' + _orcCompacto_(cmp.atual),
    'R$ ' + _orcM2_(m2(cmp.ant, aRit)) + ' → R$ ' + _orcM2_(m2(cmp.atual, aOrc)) + ' por m² ao mês', vT],
   ['Sem item em ' + a.orc + ' (' + cmp.semPar.n + ')', _orcCompacto_(cmp.semPar.ant),
    'contratos de ' + a.ritmo + ' que o orçamento não abre', null],
   ['Novos em ' + a.orc + ' (' + cmp.novos.n + ')', _orcCompacto_(cmp.novos.atual),
    'R$ ' + _orcM2_(m2(cmp.novos.atual, aOrc)) + ' por m² ao mês', null]
  ].forEach((k, i) => {
    const x = MX + i * (kw + gap), esc = i === 0;
    _orcRet_(slide, x, ky, kw, kh, esc ? C.brandDark : C.cardBg, { redondo: true, borda: esc ? null : C.lines });
    _orcUmaLinha_(slide, x + 12, ky + 4, kw - 90, 13, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: esc ? C.brandSoft : C.textBody, fonte: DS.typography.titles, fsMin: 6 });
    if (k[3] && k[3].texto !== '–') {
      _orcUmaLinha_(slide, x + kw - 12 - 74, ky + 4, 74, 13, k[3].texto + ' × ' + a.ritmo,
        { align: 'R', fs: 7, bold: true, fonte: DS.typography.body,
          cor: k[3].sentido === 1 ? _ORC_COR_VAR.sobeClaro : _ORC_COR_VAR.desceClaro });
    }
    _orcUmaLinha_(slide, x + 12, ky + 17, kw - 24, 20, k[1],
      { align: 'L', fs: 13, bold: true, cor: esc ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 12, ky + 35, kw - 24, 12, k[2],
      { align: 'L', fs: 6.5, cor: esc ? '#CBD5E1' : C.textBody, fonte: DS.typography.body, fsMin: 5.5 });
  });

  // ---- Tabela ----
  const linhaTab = (tipo, nome, de, para, situacao, categoria) => {
    const d = para - de, v = _orcVariacao_(de, para);
    return { tipo: tipo, nome: nome, celulas: [
      { texto: String(categoria || '').replace(/^CONTRATO\s+/i, '') }, { texto: de > 0.5 ? _orcMilhar_(Math.round(de)) : '–' },
      { texto: para > 0.5 ? _orcMilhar_(Math.round(para)) : '–', bold: true },
      { texto: Math.abs(d) < 0.5 ? '0' : (d > 0 ? '+' : '−') + _orcMilhar_(Math.round(Math.abs(d))), sentido: Math.abs(d) < 0.5 ? 0 : (d > 0 ? 1 : -1) },
      { texto: v.texto, sentido: v.sentido },
      { texto: _orcM2_(m2(de, aRit)) }, { texto: _orcM2_(m2(para, aOrc)), bold: true },
      { texto: situacao || '' }] };
  };
  const linhas = pagina.map(l => {
    if (l.grupo) {
      const g = l.grupo;
      const mt = g.metragem ? 'conta: ' + _orcCompacto_(g.metragem.ritmo) + ' → ' + _orcCompacto_(g.metragem.orc) : '';
      return linhaTab('grupo', g.conta.toUpperCase() + (l.cont ? ' (cont.)' : ''), g.ant, g.atual, mt, '');
    }
    const c = l.contrato;
    return linhaTab('item', c.nome, c.ant, c.atual, c.situacao, c.categoria);
  });
  const ultima = iPag === nPag - 1;
  if (ultima) linhas.push(linhaTab('total', 'TOTAL DOS CONTRATOS', cmp.ant, cmp.atual, ''));
  const lab = 186, cat = 100, nW = 54, dW = 44, pW = 34, mW = 28, sW = tw - lab - cat - nW * 2 - dW - pW - mW * 2;
  const ty = ky + kh + 8;
  _orcTabelaNum_(slide, MX, ty, tw, Math.min(13 + 16 + 14.5 * linhas.length, H - 26 - ty), [
    { titulo: 'CONTRATO', w: lab }, { titulo: 'CATEGORIA', w: cat, align: 'L' },
    { titulo: String(a.ritmo), w: nW }, { titulo: 'ORÇ ' + a.orc, w: nW, destaque: true },
    { titulo: 'Δ', w: dW }, { titulo: 'Δ %', w: pW },
    { titulo: String(a.ritmo).slice(-2), w: mW }, { titulo: String(a.orc).slice(-2), w: mW, destaque: true },
    { titulo: 'SITUAÇÃO', w: sW, align: 'L' }
  ], linhas, [{ titulo: 'R$', c0: 2, n: 4 }, { titulo: 'R$/M²', c0: 6, n: 2, cor: '#475569' }]);

  _orcRodape_(slide, W, H, 'Fontes: "' + (ORC_ANO - 2) + ' - Contratos" (valores de ' + a.ritmo + '), modelos 070/090 e contratos de ' +
    a.orc + ' · IPTU e seguros fora · "fora do modelo": a conta não é aberta por item no modelo de ' + a.orc + ' · ' + cid.nome);
}
