/**
 * ARQUIVO: 33_GestorRedesenho.gs
 * SLIDES:  Slides do gestor com TABELA EM PRINT (proposta escaneada, planilha colada) ou tabela simples do Slides:
 *          a tabela vira a do padrão do deck, com os números da proposta digitados — como nos slides da Moked
 *          (12/10/2026: "nem melhorou igual na moked alguns slides que fazia sentido e tinha oportunidade").
 *
 * Roda dentro da revisão de cada slide (29_GestorRevisado.gs), na cópia — a v3 só é lida: tira o print (ou a tabela
 * do Slides) e desenha a tabela no mesmo espaço, na marca do Mega. Fotos, logos e o texto do gestor ficam.
 * Se o print não estiver mais onde estava (o gestor mexeu no slide), não mexe e avisa no log.
 *
 * Por slide: titulo (trecho do título sem acento, minúsculo) + mega; tirar = elementos a tirar ({ tipo, x, y, w, h }
 * com tolerância, ou { tipo: 'TABLE' } = a tabela do lado esquerdo); seValor = só redesenha se o VALOR do slide for
 * esse (a tabela soma ele); desenhar(slide) = a tabela; o = o que foi feito (log).
 */

// Tabelas digitadas das propostas (conferidas com os prints da v3 e com o 090/070, 12/10/2026).
const ORC_CVISH = {
  precos: [['Tachão monodirecional amarelo', 'un', 'R$ 55,00'],
           ['Demarcação viária, tinta acrílica', 'm²', 'R$ 39,00'],
           ['Calotas (fornecer e colocar)', 'un', 'R$ 25,00']],
  itajai: { linhas: [['Área de acessos', '100', 'Semestral (2×)', 'R$ 7.800,00'],
                     ['Embarque e desembarque', '20', 'Semestral (2×)', 'R$ 1.560,00'],
                     ['Ponte', '22,2', 'Semestral (2×)', 'R$ 1.731,60'],
                     ['Bolsão', '300', 'Anual', 'R$ 11.700,00'],
                     ['Calçadas', '476,69', 'Anual', 'R$ 26.218,14'],
                     ['Vias de carro', '1.059', 'Anual', 'R$ 41.334,54'],
                     ['Tachinhas', '100 un', 'Sob demanda', 'R$ 5.500,00']],
            total: ['Total', '1.977,89', '', 'R$ 95.844,28'] },
  curitiba: { linhas: [['Frente de docas (Amz 1 a 7)', '539,5', 'Anual', 'R$ 21.040,50'],
                       ['Bolsão de pesados', '300', 'Anual', 'R$ 11.700,00'],
                       ['Área de acessos', '122,36', 'Semestral (2×)', 'R$ 9.544,08'],
                       ['Rua principal (descida)', '113,65', 'Semestral (2×)', 'R$ 8.864,70'],
                       ['Rotatória', '33,96', 'Semestral (2×)', 'R$ 2.648,88'],
                       ['Lombadas', '27,6', 'Semestral (2×)', 'R$ 2.152,80'],
                       ['Rua lateral (Amz 1 e 2)', '27,4', 'Semestral (2×)', 'R$ 2.137,20'],
                       ['Embarque e desembarque', '15', 'Semestral (2×)', 'R$ 1.170,00'],
                       ['Tachinhas', '300 un', 'Sob demanda', 'R$ 16.500,00']],
              total: ['Total', '1.179,47', '', 'R$ 75.758,16'] }
};

const ORC_GESTOR_REDESENHOS = [
  { titulo: 'comunicacao horizontal', mega: 'Mega Itajaí', seValor: 'R$ 95.844,28', o: 'tabela e preços da Eletrosinal no padrão do deck',
    tirar: [{ tipo: 'TABLE' }, { tipo: 'IMAGE', x: 218.5, y: 91.2, w: 220.6, h: 74.4 }],
    desenhar: (s, W, H) => _orcRedesenhoCvish_(s, ORC_CVISH.itajai) },
  { titulo: 'comunicacao horizontal', mega: 'Mega Curitiba', seValor: 'R$ 75.758,16', o: 'tabela e preços da Eletrosinal no padrão do deck',
    tirar: [{ tipo: 'TABLE' }, { tipo: 'IMAGE', x: 218.5, y: 91.2, w: 220.6, h: 74.4 }],
    desenhar: (s, W, H) => _orcRedesenhoCvish_(s, ORC_CVISH.curitiba) },
  { titulo: 'reforma reservatorio spk', mega: 'Mega Itajaí', o: 'proposta da Platner em tabela',
    tirar: [{ tipo: 'IMAGE', x: 44, y: 199.8, w: 401.8, h: 118.2 }],
    desenhar: (s, W, H) => _orcRedesenhoTabela_(s, 196, 'PROPOSTA PLATNER · ITENS',
      [{ titulo: 'Serviço', w: null }, { titulo: 'Un', w: 30, align: 'C' }, { titulo: 'Qtd', w: 48, align: 'R' }, { titulo: 'Valor', w: 84, align: 'R' }],
      [['Lavagem interna e externa (mão de obra)', 'm²', '640,00', 'R$ 34.800,00'],
       ['Lixamento e tratamento da ferrugem (mão de obra)', 'vb', '1,00', 'R$ 10.663,19'],
       ['Pintura interna epóxi p/ água potável, RAL 9003', 'm²', '347,50', 'R$ 66.845,49'],
       ['Pintura externa PU, cinza RAL 7038', 'm²', '292,50', 'R$ 67.234,38']],
      ['Total da proposta', '', '', 'R$ 179.543,06'], 22,
      'Material e mão de obra nas pinturas. No Orç ' + ORC_ANO + ': R$ 179.543,16.') },
  { titulo: 'substituicao seguranca | comparativo megas', mega: 'Mega Esteio', o: 'proposta da Inovar e comparativo dos Megas em tabelas',
    tirar: [{ tipo: 'IMAGE', x: 48.9, y: 99.1, w: 379.8, h: 122.4 }, { tipo: 'IMAGE', x: 48.9, y: 231.3, w: 379.8, h: 105.4 }],
    desenhar: (s, W, H) => _orcRedesenhoComparativo_(s) },
  { titulo: 'implantacao a sense', mega: 'Mega Itajaí', o: 'cabo sensor por zona em tabela',
    tirar: [{ tipo: 'IMAGE', x: 46.4, y: 204.9, w: 391.6, h: 150.4 }],
    desenhar: (s, W, H) => _orcRedesenhoTabela_(s, 204, 'CABO SENSOR POR ZONA · ANÁLISE VALIDADA PELA EQUIPE ALPHASENSE',
      [{ titulo: 'Zona', w: 40, align: 'C' }, { titulo: 'Aplicação', w: null }, { titulo: 'Linear', w: 66, align: 'R' },
       { titulo: 'Fator', w: 50, align: 'C' }, { titulo: 'Cabo sensor', w: 80, align: 'R' }],
      [['Z1', 'Enterrado', '270 m', '×3', '810 m'], ['Z2', 'Alambrado', '343 m', '×2', '686 m'],
       ['Z3', 'Alambrado', '450 m', '×2', '900 m'], ['Z4', 'Alambrado', '310 m', '×2', '620 m'],
       ['Z5', 'Gradil', '320 m', '×2', '640 m'], ['Z6', 'Alambrado', '315 m', '×2', '630 m']],
      ['Total', '6 zonas', '2.008 m', '', '4.286 m'], 14,
      'O quantitativo anterior (~2.550 m) estava subdimensionado. Somar 5% a 10% de margem de emenda e perda e o cabo de ' +
      'descida até cada controladora. Fonte: Eng. José Aleixo, equipe AlphaSense.') }
];

// Área da esquerda do molde de fotos (até a linha vertical do texto do gestor).
const ORC_GESTOR_ESQ = { x: 44, w: 396, fim: 368 };

function _orcRedesenharGestor_(slide, W, H, r, shValor, feito, avisos) {
  if (r.seValor) {
    let v = '';
    try { v = shValor ? shValor.getText().asString().trim() : ''; } catch (e) { /* sem texto */ }
    if (v !== r.seValor) { avisos.push('tabela não redesenhada: o VALOR do slide é ' + (v || '—') + ' e a do orçamento soma ' + r.seValor); return; }
  }
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
  alvos.forEach(el => el.remove());
  r.desenhar(slide, W, H);
  feito.push('redesenhado: ' + r.o);
}

// Rótulo + tabela no padrão do deck (+ nota embaixo). linhas/total: textos; a última coluna em negrito.
function _orcRedesenhoTabela_(slide, y, rotulo, colunas, linhas, total, rowH, nota) {
  const DS = CR_DESIGN_SYSTEM, A = ORC_GESTOR_ESQ, n = colunas.length;
  _orcMokedRotulo_(slide, A.x, y, A.w, rotulo);
  const ls = linhas.map(l => ({ celulas: l.map((t, i) => ({ texto: t, bold: i === n - 1, fs: 7.5 })) }));
  if (total) ls.push({ total: true, celulas: total.map(t => t ? { texto: t, fs: 7.5 } : null) });
  const fim = _orcTabela_(slide, A.x, y + 13, A.w, colunas, ls, rowH, { fs: 7.5, hCab: 16 });
  if (nota) _orcParagrafo_(slide, A.x, fim + 3, A.w, Math.max(12, A.fim - fim - 3), nota,
                           { fs: 6.5, fsMin: 5.5, cor: DS.colors.textBody, fonte: DS.typography.body });
  return fim;
}

// CVISH: os preços da Eletrosinal ao lado do logo e a tabela do ano embaixo.
function _orcRedesenhoCvish_(slide, t) {
  const A = ORC_GESTOR_ESQ, px = 222, pw = A.x + A.w - px;
  _orcMokedRotulo_(slide, px, 88, pw, 'PREÇOS DA ELETROSINAL');
  _orcTabela_(slide, px, 101, pw, [{ titulo: 'Serviço', w: null }, { titulo: 'Un', w: 24, align: 'C' }, { titulo: 'Valor', w: 50, align: 'R' }],
    ORC_CVISH.precos.map(l => ({ celulas: l.map((v, i) => ({ texto: v, fs: 6.5, bold: i === 2 })) })), 15, { fs: 6.5, hCab: 14 });
  const rowH = Math.min(20, (A.fim - 186 - 16) / (t.linhas.length + 1));
  _orcRedesenhoTabela_(slide, 172, 'PLANO DE DEMARCAÇÃO · R$ 39/M² · VALOR NO ANO',
    [{ titulo: 'Local', w: null }, { titulo: 'm²', w: 56, align: 'R' }, { titulo: 'Frequência', w: 96, align: 'C' }, { titulo: 'No ano', w: 84, align: 'R' }],
    t.linhas, t.total, rowH, null);
}

// Substituição da segurança: a proposta da Inovar e o comparativo dos Megas (valores por mês).
function _orcRedesenhoComparativo_(slide) {
  const DS = CR_DESIGN_SYSTEM, A = ORC_GESTOR_ESQ;
  const f1 = _orcRedesenhoTabela_(slide, 90, 'PROPOSTA INOVAR · CONTRATO DE 12 MESES · POR MÊS',
    [{ titulo: 'Item', w: null }, { titulo: 'Por mês', w: 90, align: 'R' }],
    [['Posto de vigilância armada · 24 h, segunda a domingo', 'R$ 39.000,00'],
     ['Posto de vigilância desarmada (rondas) · 24 h', 'R$ 37.000,00'],
     ['Moto, combustível e equipamentos · 24 h', 'R$ 4.600,00'],
     ['Valor retido', 'R$ 2.000,00']], null, 15, null);
  _orcParagrafo_(slide, A.x, f1 + 2, A.w, 11, 'Com nota fiscal; reajuste anual no mês seguinte ao dissídio da categoria, previsto para jan/' + ORC_ANO + '.',
    { fs: 6.5, fsMin: 5.5, cor: DS.colors.textBody, fonte: DS.typography.body });
  const linhas = [['Mega Esteio', 'R$ 26.537,09', 'R$ 78.000,00', '—', 'R$ 104.537,09'],
                  ['Mega Itajaí', 'R$ 37.034,59', 'R$ 74.069,18', '—', 'R$ 111.103,77'],
                  ['Mega Curitiba', 'R$ 25.787,61', 'R$ 64.138,79', 'R$ 32.069,40', 'R$ 121.995,80']];
  _orcRedesenhoTabela_(slide, f1 + 18, 'COMPARATIVO DOS MEGAS · POR MÊS',
    [{ titulo: 'Condomínio', w: null }, { titulo: 'Portaria/CCO*', w: 74, align: 'R' }, { titulo: 'Vigilante (2)', w: 74, align: 'R' },
     { titulo: 'Posto apoio', w: 70, align: 'R' }, { titulo: 'Total', w: 76, align: 'R' }],
    linhas, ['Total', 'R$ 89.359,29', 'R$ 216.207,97', 'R$ 32.069,40', 'R$ 337.636,66'], 17,
    '* Em Curitiba, a Portaria/CCO é "Controlador de Acesso"; no Esteio, "Porteiro"; no Itajaí, "Vigilante Desarmado".');
}
