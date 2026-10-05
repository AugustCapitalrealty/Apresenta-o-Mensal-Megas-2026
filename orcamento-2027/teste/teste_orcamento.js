/**
 * Teste do gerador do Orçamento 2027: `node teste/teste_orcamento.js`
 *
 * Lê os .gs da pasta como texto, dubla SpreadsheetApp / SlidesApp / DriveApp /
 * Logger e roda contra a matriz real da aba "Valores do Modelo" de Curitiba
 * (fixture_090_curitiba_2027.json, exportada da planilha em 29/09/2026).
 * O dublê do Slides explode em NaN, dimensão negativa, cor undefined e
 * espaçamento < 100 — os mesmos erros que no Slides de verdade só aparecem
 * rodando.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PASTA = path.join(__dirname, '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_090_curitiba_2027.json'), 'utf8'));

let falhas = 0, total = 0;
function ok(cond, msg) {
  total++;
  if (!cond) { falhas++; console.log('  ✗ ' + msg); }
}
function perto(a, b, msg) { ok(Math.abs(a - b) < 0.01, msg + ' (esperado ' + b + ', veio ' + a + ')'); }
// Entre planilhas diferentes (ou total digitado × soma das linhas) o
// arredondamento da controladoria deixa centavos de diferença.
function pertoReal(a, b, msg) { ok(Math.abs(a - b) < 1, msg + ' (esperado ' + b + ', veio ' + a + ')'); }
function lanca(fn, trecho, msg) {
  try { fn(); ok(false, msg + ' — não lançou'); }
  catch (e) { ok(String(e.message).indexOf(trecho) >= 0, msg + ' — mensagem: ' + e.message); }
}

// ---------------- Dublês ----------------
const LOG = [];
const W = 720, H = 405;
let matrizAtual = FIXTURE;
let decks = {};

function num(v, onde) {
  if (typeof v !== 'number' || !isFinite(v)) throw new Error('Número inválido em ' + onde + ': ' + v);
  return v;
}
function cor(c, onde) {
  if (typeof c !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(c)) throw new Error('Cor inválida em ' + onde + ': ' + c);
}
function estiloTexto(reg) {
  const s = {};
  ['setBold', 'setItalic', 'setFontFamily'].forEach(m => { s[m] = () => s; });
  s.setFontSize = v => { reg.fs = num(v, 'setFontSize'); if (v <= 0) throw new Error('fonte <= 0'); return s; };
  s.setForegroundColor = c => { cor(c, 'setForegroundColor'); return s; };
  return s;
}
function textRange(reg) {
  const tr = {
    setText: t => { reg.texto = String(t); return tr; },
    getTextStyle: () => estiloTexto(reg),
    getParagraphStyle: () => {
      const p = {
        setParagraphAlignment: () => p,
        setLineSpacing: v => { if (v < 100) throw new Error('Invalid argument: spacing'); return p; }
      };
      return p;
    }
  };
  return tr;
}
function novoSlide(deck) {
  const slide = {
    shapes: [], removido: false,
    getBackground: () => ({ setSolidFill: c => cor(c, 'background') }),
    insertShape: (tipo, x, y, w, h) => {
      [x, y, w, h].forEach((v, i) => num(v, 'insertShape[' + i + ']'));
      if (w <= 0 || h <= 0) throw new Error('Dimensão não positiva: ' + w + 'x' + h);
      const reg = { tipo, x, y, w, h, texto: null };
      slide.shapes.push(reg);
      const fill = { setSolidFill: (c, a) => { cor(c, 'fill'); if (a !== undefined) num(a, 'alpha'); }, setTransparent: () => {} };
      const lineFill = { setSolidFill: (c, a) => { cor(c, 'border'); } };
      return {
        getFill: () => fill,
        getBorder: () => ({ setTransparent: () => {}, getLineFill: () => lineFill, setWeight: v => num(v, 'weight') }),
        setContentAlignment: () => {},
        getText: () => textRange(reg)
      };
    },
    insertLine: (cat, x1, y1, x2, y2) => {
      [x1, y1, x2, y2].forEach((v, i) => num(v, 'insertLine[' + i + ']'));
      slide.shapes.push({ tipo: 'LINE', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
      const l = {
        getLineFill: () => ({ setSolidFill: c => cor(c, 'line') }),
        setWeight: v => { num(v, 'line weight'); return l; },
        setDashStyle: () => l
      };
      return l;
    },
    insertImage: () => { throw new Error('insertImage não deveria ser chamado sem blob'); },
    remove: () => { slide.removido = true; deck._slides = deck._slides.filter(s => s !== slide); }
  };
  return slide;
}
function novoDeck() {
  const deck = { _slides: [] };
  deck._slides.push(novoSlide(deck));                    // o slide em branco inicial
  deck.getPageWidth = () => W;
  deck.getPageHeight = () => H;
  deck.getSlides = () => deck._slides.slice();
  deck.appendSlide = () => { const s = novoSlide(deck); deck._slides.push(s); return s; };
  deck.getUrl = () => 'https://docs.google.com/presentation/d/teste';
  return deck;
}

// Relatórios da controladoria e modelo 070, exportados por exportarFixtures()
// (03_Exportar.gs). Cada planilha responde pelo SEU id: com um dublê só, o
// 070 e o 090 devolveriam a mesma matriz e os itens contariam em dobro.
const fixture = nome => {
  const p = path.join(__dirname, nome);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
};
const FIX_METRAGEM = fixture('fixture_metragem_curitiba.json');
const FIX_MENSAL = fixture('fixture_mensal_curitiba.json');
const FIX_070 = fixture('fixture_070_curitiba_2027.json');
let porId = {};          // id → matriz (primeira aba ou "Valores do Modelo")
const aba = (nome, matriz) => ({ getName: () => nome, getDataRange: () => ({ getValues: () => matriz.map(r => r.slice()) }) });

// Planilha de textos (06_TextosTabelas.gs): lida e ESCRITA pela geração.
// Nasce como uma planilha nova do Drive, com uma aba vazia.
function novaPlanilhaTextos() {
  const abas = [];
  const novaAba = nome => {
    let dados = [];
    const sh = {
      getName: () => nome,
      getLastRow: () => dados.length,
      getDataRange: () => ({ getValues: () => dados.map(r => r.slice()) }),
      clearContents: () => { dados = []; return sh; },
      getRange: (r, c, nr, nc) => {
        [r, c, nr, nc].forEach(v => { if (!(v >= 1)) throw new Error('getRange inválido: ' + [r, c, nr, nc]); });
        const rg = {
          setValues: v => {
            if (v.length !== nr || v.some(l => l.length !== nc)) throw new Error('setValues fora da dimensão do range');
            v.forEach((l, i) => {
              const linha = dados[r - 1 + i] || (dados[r - 1 + i] = []);
              l.forEach((val, j) => { linha[c - 1 + j] = val; });
            });
            return rg;
          },
          setFontWeight: () => rg, setBackground: c2 => { cor(c2, 'planilha'); return rg; }, setFontColor: () => rg
        };
        return rg;
      },
      setFrozenRows: () => sh, setColumnWidth: () => sh
    };
    abas.push(sh);
    return sh;
  };
  novaAba('Página1');
  return {
    abas: abas,
    getSheets: () => abas.slice(),
    getSheetByName: n => abas.filter(s => s.getName() === n)[0] || null,
    insertSheet: n => novaAba(n),
    deleteSheet: s => { abas.splice(abas.indexOf(s), 1); }
  };
}
let PLANILHA_TEXTOS = novaPlanilhaTextos();

const ctx = {
  Logger: { log: m => LOG.push(String(m)) },
  SpreadsheetApp: {
    openById: id => id === ctx.ORC_TEXTOS_ID ? PLANILHA_TEXTOS : ({
      getSheetByName: nome => {
        if (nome !== 'Valores do Modelo') return null;
        const mz = id in porId ? porId[id] : matrizAtual;
        return mz ? aba(nome, mz) : null;
      },
      getSheets: () => {
        if (!porId[id]) throw new Error('planilha ' + id + ' sem fixture no teste');
        return [aba('Plan1', porId[id])];
      }
    })
  },
  SlidesApp: {
    ShapeType: { TEXT_BOX: 'TEXT_BOX', RECTANGLE: 'RECTANGLE', ROUND_RECTANGLE: 'ROUND_RECTANGLE', ELLIPSE: 'ELLIPSE' },
    ContentAlignment: { MIDDLE: 'MIDDLE' },
    ParagraphAlignment: { START: 'START', CENTER: 'CENTER', END: 'END' },
    PredefinedLayout: { BLANK: 'BLANK' },
    LineCategory: { STRAIGHT: 'STRAIGHT' },
    DashStyle: { DASH: 'DASH' },
    openById: id => decks[id] || (decks[id] = novoDeck())
  },
  // Sem Drive no teste: força o caminho de reserva do logo (texto no lugar).
  DriveApp: { getFileById: id => { throw new Error('sem Drive no teste'); } },
  console: console
};
vm.createContext(ctx);
fs.readdirSync(PASTA).filter(f => f.endsWith('.gs')).sort().forEach(f => {
  // const/let de topo ficariam presos no escopo do script; var vai pro contexto.
  const fonte = fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/^(const|let) /gm, 'var ');
  vm.runInContext(fonte, ctx, { filename: f });
});
const G = ctx;
const CUR = G.ORC_CIDADES.CURITIBA;
if (!FIX_METRAGEM || !FIX_MENSAL || !FIX_070) {
  console.log('✗ Faltam fixtures em teste/ — rode exportarFixtures() no editor e copie de _fixtures/.');
  process.exit(1);
}
porId[CUR.relatorios.metragemId] = FIX_METRAGEM;
porId[CUR.relatorios.mensalId] = FIX_MENSAL;
porId[CUR.servicosTerceirosId] = FIX_070;
// Geradas da leitura das planilhas de contratos em 30/09/2026 (manutenção:
// 5 contratos, segurança: 4, × 12 meses); exportarFixtures() as substitui
// pela exportação real.
const FIX_CONTRATOS = fixture('fixture_contratos_manutencao_curitiba.json');
const FIX_CONTRATOS_SEG = fixture('fixture_contratos_seguranca_curitiba.json');
porId[CUR.contratos['Manutenção de imóveis']] = FIX_CONTRATOS;
porId[CUR.contratos['Segurança e vigilância']] = FIX_CONTRATOS_SEG;
const FIX_CONTRATOS_LIMP = fixture('fixture_contratos_limpeza_curitiba.json');
porId[CUR.contratos['Limpeza e conservação']] = FIX_CONTRATOS_LIMP;

// ---------------- Helpers ----------------
console.log('Helpers');
ok(G._orcNorm_('manutenção imóveis') === 'manutencao imoveis', '_orcNorm_ tira acento e espaço não-quebrável');
ok(G._orcMoeda_(1417218.55) === 'R$ 1.417.219', '_orcMoeda_');
ok(G._orcCompacto_(1417218.55) === 'R$ 1,42 mi', '_orcCompacto_ milhão');
ok(G._orcCompacto_(302384.66) === 'R$ 302 mil', '_orcCompacto_ mil');
ok(G._orcCompacto_(7458) === 'R$ 7,5 mil', '_orcCompacto_ < 10 mil');
ok(G._orcNum_('-1.234,56') === -1234.56, '_orcNum_ texto BR');
const z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const m = (...idx) => z.map((v, i) => idx.indexOf(i) >= 0 ? 1 : 0);
ok(G._orcQuando_(z.map(() => 1)) === 'JAN–DEZ', '_orcQuando_ ano todo');
ok(G._orcQuando_(m(3, 4, 5)) === 'ABR–JUN', '_orcQuando_ sequência');
ok(G._orcQuando_(m(4, 10)) === 'MAI · NOV', '_orcQuando_ salteado');
ok(G._orcQuando_(m(6)) === 'JUL', '_orcQuando_ um mês');
ok(G._orcQuando_(m(0, 2, 4, 6, 8)) === '5 meses', '_orcQuando_ muitos meses');

console.log('Categoria do item');
let s = G._orcSepararCategoria_('[PPCI] - PINTURA DA TUBULAÇÃO');
ok(s.categoria === 'PPCI' && s.descricao === 'PINTURA DA TUBULAÇÃO', 'tag padrão');
s = G._orcSepararCategoria_('[MONITORAMENTO - KIT SONDA DE MONITORAMENTO');
ok(s.categoria === 'MONITORAMENTO' && s.descricao === 'KIT SONDA DE MONITORAMENTO', 'colchete não fechado');
s = G._orcSepararCategoria_('[CONTRATO] COMPRA DE SACO DE LIXO');
ok(s.categoria === 'CONTRATO' && s.descricao === 'COMPRA DE SACO DE LIXO', 'tag sem hífen');
s = G._orcSepararCategoria_('PROVISÃO PARA MANUTENÇÃO NÃO PREVISTA');
ok(s.categoria === 'PROVISÃO', 'provisão sem tag');
ok(G._orcSepararCategoria_('RATEIO').categoria === 'OUTROS', 'sem tag vira OUTROS');

// ---------------- Dados reais ----------------
console.log('Leitura — Curitiba');
const d = G.obterManutencao_('CURITIBA');
// Modelo 090 (R$ 1.417.218,55) + 5 contratos (R$ 343.189,40).
perto(d.total, 1760407.95, 'total da manutenção = modelo + contratos');
// Itens-contrato do modelo: FM Security 63.694,80 + quadro BT 12.000 + AVAC
// 11.280 + cobertura Miriad 31.617,96 + SDAI Firecam 13.596.
perto(d.totalContratos - 343189.40, 132188.76, 'contratos: planilha (343.189,40) + itens-contrato do modelo (132.188,76)');
ok(d.nItens === 68 && d.nZerados === 1 && d.nContratos === 5,
   'itens: 63 do modelo + 5 contratos, 1 RATEIO zerado (veio ' + d.nItens + '/' + d.nZerados + '/' + d.nContratos + ')');
ok(d.avisos.length === 0, 'todo contrato tem categoria: ' + d.avisos.join(' | '));
ok(d.categorias.length === 19, '19 categorias (veio ' + d.categorias.length + ')');
perto(d.categorias.reduce((a, c) => a + c.total, 0), d.total, 'soma das categorias = total');
perto(d.meses.reduce((a, v) => a + v, 0), d.total, 'soma dos meses = total');
d.categorias.forEach(c => {
  perto(c.meses.reduce((a, v) => a + v, 0), c.total, 'meses de ' + c.nome);
  perto(c.totalContratos + c.totalAvulsos, c.total, 'contratos + avulsos = total de ' + c.nome);
});
const cat = n => d.categorias.filter(c => c.nome === n)[0];
ok(d.categorias[0].nome === 'PPCI', 'maior categoria é PPCI');
// O exemplo do gestor: "PPCI 150k contratos + avulsos" — Firecam 135.600 +
// ampliação SDAI do modelo 13.596.
perto(cat('PPCI').total, 437984.66, 'PPCI');
perto(cat('PPCI').totalContratos, 149196, 'PPCI: contratos (Firecam + ampliação SDAI)');
perto(cat('PPCI').totalAvulsos, 288788.66, 'PPCI: avulsos');
perto(cat('COBERTURA').totalContratos, 138650.28, 'COBERTURA: Miriad + ampliação do modelo');
perto(cat('ELÉTRICA').totalContratos, 41784.72 + 36245.96 + 12000, 'ELÉTRICA: LCW + Filtroil + contrato de quadro BT');
perto(cat('CONSULTORIA AMBIENTAL').total, 22526.40, 'CONSULTORIA AMBIENTAL: Equilíbrio');
perto(cat('SEGURANÇA ELETRÔNICA').total, 63694.80, 'FM Security sai de CONTRATO para SEGURANÇA ELETRÔNICA');
ok(!cat('CONTRATO'), 'categoria CONTRATO deixa de existir');
perto(cat('REVESTIMENTO').total, 148520.45, 'REVESTIMENTO');
ok(cat('REVESTIMENTO').totalContratos === 0, 'REVESTIMENTO só avulsos');
ok(cat('MONITORAMENTO').itens.length === 2, 'MONITORAMENTO junta os dois kits (um com colchete aberto)');
perto(cat('PROVISÃO').total, 39000, 'PROVISÃO');
const div = G._orcDividirCategorias_(d);
ok(div.proprias.map(c => c.nome).join(',') === 'PPCI,PAISAGISMO,SINALIZAÇÃO VIÁRIA,REVESTIMENTO,COBERTURA,SPCQ,ELÉTRICA',
   'categorias com slide próprio: ' + div.proprias.map(c => c.nome).join(','));
ok(div.demais.length === 12, '12 categorias em Demais');

console.log('Contratos de manutenção');
const kk = G._orcLinhasContratos_(FIX_CONTRATOS);
ok(kk.map(k => k.fornecedor).join(' | ') ===
   'FIRECAM | MIRIAD SERVIÇOS INDUSTRIAIS E COMERCIO | LEANDRO CARVALHO WEISS - LCW | FILTROIL | EQUILIBRIO SOLUÇÕES AMBIENTAIS',
   'nome do fornecedor sem código e sem "MANUTENÇÃO -": ' + kk.map(k => k.fornecedor).join(' | '));
perto(kk.filter(k => k.fornecedor === 'FILTROIL')[0].total, 36245.96, 'Filtroil com o reajuste de março');
ok(G._orcMesCompetencia_(new Date(2027, 2, 1)) === 2, 'competência como data');
ok(G._orcMesCompetencia_('03/2026') === -1, 'competência de outro ano ignorada');
const semCat = G._orcLinhasContratos_([FIX_CONTRATOS[0], ['01/2027', '99 - FORNECEDOR NOVO', '', '', '', '', -100]]);
ok(semCat[0].semCategoria && semCat[0].categoria === G.ORC_CONTRATO_SEM_CATEGORIA, 'contrato sem regra → categoria de aviso');
lanca(() => G._orcLinhasContratos_([['Mês', 'Fornecedor', 'Total']]), 'cabeçalho inesperado', 'planilha de contratos fora do formato');
const falsos = [{ nome: 'X', itens: Array.from({ length: 19 }, () => ({ descricao: 'i', total: 1, meses: z })) }];
ok(G._orcPaginasDemais_(falsos).map(p => p.length).join('+') === '10+9', 'Demais: 19 itens viram 10+9, sem página órfã');
ok(G._orcPaginasDemais_([]).length === 0, 'Demais vazio: nenhuma página');

console.log('Relatórios da controladoria — Curitiba');
ok(G._orcNum_('(1.234,56)') === -1234.56, '_orcNum_ negativo entre parênteses');
ok(G._orcChaveConta_('Seguros') === G._orcChaveConta_('Seguro'), 'chave: plural');
ok(G._orcChaveConta_('manutenção imóveis') === G._orcChaveConta_('Manutenção de imóveis'), 'chave: conectivo');
ok(G._orcChaveConta_('despesas c/ veículos') === G._orcChaveConta_('Despesa com veículos'), 'chave: c/');
ok(G._orcChaveConta_('Segurança e Vigilância') === G._orcChaveConta_('Segurança e vigilância'), 'chave: caixa');

const rel = G.obterRelatorioAnual_('CURITIBA');
ok(rel.avisos.length === 0, 'metragem fecha as somas: ' + rel.avisos.join(' | '));
const conta = n => rel.contas.filter(c => c.chave === G._orcChaveConta_(n))[0];
ok(!!conta('Segurança e vigilância'), 'conta de segurança lida');
perto(conta('Segurança e vigilância').v.orc, 2306916.51, 'segurança Orç 2027');
perto(conta('Segurança e vigilância').v.ritmo, 1881793.62, 'segurança Ritmo 2026');
perto(conta('Manutenção de imóveis').v.orc, 1760408.01, 'manutenção Orç 2027');
perto(rel.total.orc, 7168946.55, 'total geral Orç 2027');
perto(rel.areaComum.orcAnt, 5068601.83, 'área comum Orç 2026');
perto(rel.m2Total.orc, 4.49, 'R$/m² total 2027');
ok(rel.contas.every(c => c.grupo !== G.ORC_DRE_OUTRAS), 'toda conta cai num grupo da DRE: ' +
   rel.contas.filter(c => c.grupo === G.ORC_DRE_OUTRAS).map(c => c.nome).join(', '));

const ldre = G._orcLinhasDRE_(rel);
const somaItensDRE = ldre.filter(l => l.tipo === 'item').reduce((a, l) => a + l.v.orc, 0);
pertoReal(somaItensDRE, rel.total.orc, 'DRE: itens (contas + demais + IPTU + seguro) somam o total geral');
ldre.filter(l => l.tipo === 'grupo').forEach(g => {
  const i = ldre.indexOf(g);
  let s = 0;
  for (let k = i + 1; k < ldre.length && ldre[k].tipo === 'item'; k++) s += ldre[k].v.orc;
  perto(s, g.v.orc, 'DRE: subtotal ' + g.nome);
});
ok(ldre.length <= 34, 'DRE cabe em até 34 linhas (veio ' + ldre.length + ')');

const q = G._orcOfensores_(rel);
pertoReal(q.ofensores.total.delta + q.defensores.total.delta, q.total.delta, 'ofensores + defensores = variação total');
perto(q.total.delta, 7168946.55 - 5936986.71, 'variação total = Orç 2027 − Ritmo 2026');
ok(q.ofensores.contas.every(c => c.delta >= G.ORC_OFENSOR_MINIMO), 'ofensores listados acima do mínimo');
ok(q.ofensores.contas[0].delta >= q.ofensores.contas[q.ofensores.contas.length - 1].delta, 'ofensores do maior para o menor');
ok(q.defensores.contas.every(c => c.delta <= -G.ORC_OFENSOR_MINIMO), 'defensores listados abaixo do −mínimo');

const mensal = G.obterRelatorioMensal_('CURITIBA');
const mSeg = mensal.contas[G._orcChaveConta_('Segurança e vigilância')];
ok(!!mSeg, 'mensal: segurança');
pertoReal(mSeg.orc.reduce((a, v) => a + v, 0), 2306916.51, 'mensal: soma dos meses da segurança 2027 = metragem');
perto(mSeg.orcAnt[0], 149186.09, 'mensal: Orç jan/26 da segurança');

const modelos = G._orcLinhasModelosCidade_('CURITIBA');
const contasLL = G._orcContasLinhaALinha_(rel);
ok(contasLL.map(c => c.nome).join(' | ') === 'Manutenção de imóveis | Segurança e vigilância | Limpeza e conservação',
   'linha a linha: só manutenção, segurança e limpeza, nessa ordem (veio ' + contasLL.map(c => c.nome).join(' | ') + ')');
lanca(() => G._orcContasLinhaALinha_({ contas: rel.contas.filter(c => !/limpeza/i.test(c.nome)) }),
      'não encontrada', 'conta do foco ausente no relatório → erro, não slide a menos');
contasLL.forEach(c => {
  const comp = G._orcComposicaoConta_(c, modelos);
  pertoReal(comp.somaItens + comp.base - comp.excesso, c.v.orc, 'composição fecha com o relatório: ' + c.nome);
});
pertoReal(d.total, conta('Manutenção de imóveis').v.orc, 'manutenção: modelo 090 + contratos = METRAGEM');
const compMan = G._orcComposicaoConta_(contasLL[0], modelos);
ok(compMan.base < 1 && compMan.excesso < 1 && compMan.itens.length === 68,
   'manutenção: composição fecha só com itens nomeados, sem "não detalhado" (base ' + Math.round(compMan.base) + ')');
const compSeg = G._orcComposicaoConta_(contasLL.filter(c => /seguran/i.test(c.nome))[0], modelos);
// Segurança: 3 itens do 070 (659.396,04) + 4 contratos (1.647.520,43) =
// METRAGEM (2.306.916,51), com R$ 0,04 de arredondamento.
ok(compSeg.itens.length === 7 && compSeg.base < 1 && compSeg.excesso < 1,
   'segurança: 3 itens do 070 + 4 contratos fecham com a METRAGEM (itens ' + compSeg.itens.length +
   ', base ' + Math.round(compSeg.base) + ')');
perto(compSeg.itens.filter(it => /^CONTRATO — /.test(it.descricao)).reduce((a, it) => a + it.total, 0), 1647520.43,
      'segurança: contratos');
// Limpeza: 9 itens do 070 (537.536,40) + 2 contratos (348.423,60) = METRAGEM (885.960,00).
const compLimp = G._orcComposicaoConta_(contasLL.filter(c => /limpeza/i.test(c.nome))[0], modelos);
ok(compLimp.itens.length === 11 && compLimp.base < 1 && compLimp.excesso < 1,
   'limpeza: 9 itens do 070 + 2 contratos fecham com a METRAGEM (itens ' + compLimp.itens.length +
   ', base ' + Math.round(compLimp.base) + ')');
ok(G._orcLinhasContratos_(FIX_CONTRATOS_LIMP).map(k => k.fornecedor).join(' | ') === 'EMPRESA AUXILIAR | PEST PATROL',
   'limpeza: código da conta grudado sai do nome do fornecedor');

console.log('Sugestões — cálculos');
const clsM = G._orcClassificarManutencao_(d);
perto(clsM.grupos.reduce((a, g) => a + g.total, 0), d.total, 'investimento × recorrente: os 4 grupos somam a manutenção');
ok(clsM.grupos.reduce((a, g) => a + g.itens.length, 0) === d.nItens, 'todo item cai em um grupo só');
perto(clsM.grupos[0].total, d.totalContratos, 'grupo Contratos = contratos da manutenção');
ok(clsM.projetos.total > 690000 && clsM.projetos.total < 705000, 'projetos ≈ R$ 698 mil (veio ' + Math.round(clsM.projetos.total) + ')');
ok(!clsM.projetos.itens.some(it => /ZELADOR/.test(it.descricao)), '"compra de materiais para o zelador" todo mês é recorrente, não projeto');
ok(clsM.projetos.itens.some(it => /PAISAGISMO EM 1500M2/.test(it.descricao)), 'implantação do paisagismo é projeto');

const rx = G._orcResumoExecutivo_(rel, clsM);
perto(rx.efeitoArea + rx.efeitoCusto, rx.delta, 'resumo: efeito área + efeito custo/m² = variação');
ok(rx.areaOrc > rx.areaRit, 'resumo: área implícita cresce (' + Math.round(rx.areaRit) + ' → ' + Math.round(rx.areaOrc) + ')');
perto(rx.deltaFoco, rx.foco.reduce((a, f) => a + f.delta, 0), 'resumo: soma das contas em foco');

const pt = G._orcPonte_(rel, mensal);
pertoReal(pt.inicio + pt.degraus.reduce((a, x) => a + x.delta, 0), pt.fim, 'ponte: ritmo + degraus = orçamento');
pt.degraus.forEach(x => perto(x.partes.reduce((a, p) => a + p.v, 0), x.delta, 'ponte: partes somam o degrau ' + x.nome));
const pSeg = pt.degraus.filter(x => /seguran/i.test(x.nome))[0];
ok(pSeg.partes.length === 2 && pSeg.partes[0].tipo === 'saida', 'ponte: segurança separa o que já roda do novo');
ok(pt.degraus.filter(x => /manuten/i.test(x.nome))[0].partes.length === 1, 'ponte: manutenção não separa (conta de projetos)');

const cn = G._orcCenarios_(rel, clsM);
perto(cn.totalCandidatos + cn.totalNorma, clsM.projetos.total, 'cenários: candidatos + norma = projetos');
ok(cn.norma.every(it => /LINHA DE VIDA/.test(it.descricao) || ['PPCI', 'SPCQ'].indexOf(it.categoria) >= 0),
   'cenários: fora da lista só o que é norma');
ok(cn.linhas.every((l, i) => i === 0 || l.acumulado >= cn.linhas[i - 1].acumulado), 'cenários: acumulado cresce');

const ctr = G._orcContratosCidade_(CUR, modelos);
const conc = G._orcConcentracaoFornecedores_(ctr, rel.total.orc);
ok(conc[0].grupo === 'EMPRESA AUXILIAR' && conc[0].pct > 0.31 && conc[0].pct < 0.33,
   'contratos: Empresa Auxiliar é o maior grupo, ~32% do total, com a escala 12x36 (veio ' + conc[0].grupo + ' ' + (conc[0].pct * 100).toFixed(1) + '%)');
ok(conc[0].contas.length === 2, 'contratos: Auxiliar em segurança e limpeza, sem conta repetida por maiúscula (' + conc[0].contas.join('/') + ')');
ok(conc.some(g => g.grupo === 'MIRIAD') && conc.some(g => g.grupo === 'FIRECAM'), 'contratos: ampliações do 090 no grupo do fornecedor');
const rj = G._orcReajustes_(ctr);
ok(rj.reajustes.map(x => x.contrato.fornecedor.split(' ')[0] + '@' + (x.mes + 1)).join(',') ===
   'SERVIÇO@2,FILTROIL@3,TRANSRESÍDUOS@8,EQUILIBRIO@9,SUINO@9',
   'reajustes previstos: portaria fev, Filtroil mar, Transresíduos ago, Equilíbrio e Suíno Vivo set (' +
   rj.reajustes.map(x => x.contrato.fornecedor.split(' ')[0] + '@' + (x.mes + 1)).join(',') + ')');
perto(rj.umPorCento, rj.baseSemReajuste / 100, 'dissídio: 1% da base sem reajuste');
ok(rj.parcelasFixas.length === 1 && rj.parcelasFixas[0].grupo === 'ITAÚ (FINANCIAMENTO)' &&
   !rj.semReajuste.some(c => /ITAU/.test(c.fornecedor)), 'financiamento Itaú fora de "sem reajuste" (parcela fixa)');
ok(!conc.some(g => /ALTERAÇÃO DE ESCALA|^LPU$|^CONTRATO DE/.test(g.grupo)),
   'item-contrato sem fornecedor não vira fornecedor (' + conc.map(g => g.grupo).join(', ') + ')');
const semF = conc.filter(g => g.grupo === G.ORC_SEM_FORNECEDOR)[0];
ok(semF && semF.n === 7, '5 itens LPU, quadro BT e ar-condicionado como [IDENTIFICAR EMPRESA] (veio ' + (semF && semF.n) + ')');
const rot = t => G._orcRotuloContrato_(ctr.filter(c => c.descricao.indexOf(t) === 0)[0]);
ok(rot('SERVIÇO DE PORTARIA') === 'EMPRESA AUXILIAR · PORTARIA', 'rótulo: ' + rot('SERVIÇO DE PORTARIA'));
ok(rot('COLETA DE REJEITOS') === 'TRANSRESÍDUOS · COLETA DE REJEITOS DO RESTAURANTE', 'rótulo: ' + rot('COLETA DE REJEITOS'));
ok(rot('MIRIAD SERVIÇOS') === 'MIRIAD', 'rótulo: ' + rot('MIRIAD SERVIÇOS'));
ok(rot('AMPLIAÇÃO CONTRATO MANUTENÇÃO COBERTURA') === 'MIRIAD · AMPLIAÇÃO CONTRATO MANUTENÇÃO COBERTURA MIRIAD 6, 7A E 7B',
   'rótulo: ' + rot('AMPLIAÇÃO CONTRATO MANUTENÇÃO COBERTURA'));
ok(rot('LEANDRO') === 'LEANDRO CARVALHO WEISS', 'rótulo: ' + rot('LEANDRO'));
ok(rot('SERVIÇO DE ALTERAÇÃO DE ESCALA') === 'EMPRESA AUXILIAR · ALTERAÇÃO DE ESCALA DE 12X36 DIURNO PARA 24H',
   'rótulo: ' + rot('SERVIÇO DE ALTERAÇÃO DE ESCALA'));
ok(rot('SERVIÇO DE ROÇADA') === '[IDENTIFICAR EMPRESA] · SERVIÇO DE ROÇADA', 'rótulo: ' + rot('SERVIÇO DE ROÇADA'));

const fx = G._orcFluxoMensal_(mensal, rel);
pertoReal(fx.total.reduce((a, v) => a + v, 0), Object.keys(mensal.contas).reduce((a, k) =>
  a + mensal.contas[k].orc.reduce((s, v) => s + v, 0), 0), 'fluxo: blocos somam o relatório mensal');
ok(fx.total.indexOf(Math.max.apply(null, fx.total)) === 3, 'fluxo: pico em abril (IPTU)');
ok(fx.fora.map(c => c.nome).join() === 'Despesa de pessoal', 'fluxo: pessoal fica fora e é avisado');

const m2 = G._orcM2PorConta_(rel);
perto(m2.total.m2.orc, rel.m2Total.orc, 'R$/m²: total recompõe o R$/m² da METRAGEM');
pertoReal(m2.linhas.reduce((a, l) => a + l.v.orc, 0), rel.total.orc, 'R$/m²: linhas somam o total geral');
const m2Top = m2.linhas.slice(0, G.ORC_M2_TOP);
ok(m2Top.length === 10 && /^Demais contas \(\d+\)$/.test(m2.linhas[10].nome) && m2.linhas.length === 11,
   'R$/m²: top 10 contas + Demais (' + m2.linhas.map(l => l.nome).join(', ') + ')');
ok(m2Top.every((l, i) => i === 0 || l.v.orc <= m2Top[i - 1].v.orc), 'R$/m²: top 10 em ordem decrescente do Orç 2027');
ok(m2Top[0].nome === 'Segurança e vigilância' && m2Top.some(l => l.nome === 'IPTU') && m2Top.some(l => l.nome === 'Seguro'),
   'R$/m²: segurança no topo, IPTU e Seguro concorrem ao top');
ok(rel.contas.filter(c => !m2Top.some(l => l.nome === c.nome)).every(c => c.v.orc <= m2Top[9].v.orc),
   'R$/m²: nenhuma conta fora do top é maior que a 10ª');

console.log('Erros que têm que parar a geração');
lanca(() => G._orcLerMetragem_([['', 'Real 2024', 'Orça 2025']]), 'cabeçalho inesperado', 'metragem de outro ano → erro');
lanca(() => G._orcLerMetragem_(FIX_METRAGEM.filter(r => !/^TOTAL/i.test(String(r[0]).replace(/ /g, ' ')))),
      'não encontrada', 'metragem sem as linhas de total → erro');
// Cidade fictícia, sem nenhuma planilha: Itajaí e Esteio já estão configuradas.
G.ORC_CIDADES.VAZIA = { nome: 'Mega Vazio', deckId: 'deck-vazia', despesasGeraisId: '', servicosTerceirosId: '' };
lanca(() => G.obterRelatorioAnual_('VAZIA'), 'ainda não foi', 'cidade sem relatórios');
matrizAtual = FIXTURE.filter((r, i) => i === 0 || G._orcNorm_(r[0]) !== 'manutencao imoveis');
lanca(() => G.obterManutencao_('CURITIBA'), 'Contas encontradas', 'sem a conta → erro, não R$ 0');
matrizAtual = FIXTURE.map(r => [''].concat(r));           // coluna inserida no começo
lanca(() => G.obterManutencao_('CURITIBA'), 'Cabeçalho inesperado', 'coluna deslocada → erro');
matrizAtual = FIXTURE;
lanca(() => G.obterManutencao_('VAZIA'), 'ainda não foi configurada', 'cidade sem planilha');

// Itajaí e Esteio (relatórios recebidos em 05/10/2026, xlsx em fixtures).
// O total geral vem com o mesmo rótulo do subtotal ("TOTAL ÁREA COMUM" duas
// vezes) e o mensal tem que fechar com a METRAGEM conta a conta.
console.log('Relatórios — Itajaí e Esteio');
[['itajai', 6576240.43, 5518167.54], ['esteio', 4207370.9, 3664791.14]].forEach(([c, total, area]) => {
  const r = G._orcLerMetragem_(fixture('fixture_metragem_' + c + '.json'));
  pertoReal(r.total.orc, total, c + ': total geral pelo 2º "TOTAL ÁREA COMUM"');
  pertoReal(r.areaComum.orc, area, c + ': área comum pelo 1º');
  ok(r.avisos.length === 0, c + ': metragem fecha as somas (' + r.avisos.join(' | ') + ')');
  ok(r.m2Total && r.m2AreaComum && r.m2Total.orc > r.m2AreaComum.orc, c + ': R$/m² da área comum e do total separados');
  ok(r.contas.every(x => x.grupo !== G.ORC_DRE_OUTRAS), c + ': toda conta num grupo da DRE (' +
     r.contas.filter(x => x.grupo === G.ORC_DRE_OUTRAS).map(x => x.nome).join(', ') + ')');
  const mm = G._orcLerMensal_(fixture('fixture_mensal_' + c + '.json'));
  G._orcConferirMensal_(r, mm);
  ok(r.avisos.length === 0, c + ': mensal fecha com a METRAGEM conta a conta (' + r.avisos.join(' | ') + ')');
  ok(G.ORC_CONTAS_DETALHE.every(n => mm.contas[G._orcChaveConta_(n)]), c + ': mensal traz as três contas em foco');
});
const relErrado = G._orcLerMetragem_(fixture('fixture_metragem_itajai.json'));
const mensalErrado = G._orcLerMensal_(fixture('fixture_mensal_itajai.json'));
mensalErrado.contas[G._orcChaveConta_('Segurança e vigilância')].orc[3] += 1000;   // um mês digitado errado
G._orcConferirMensal_(relErrado, mensalErrado);
ok(relErrado.avisos.length === 1 && /Segurança e vigilância/.test(relErrado.avisos[0]),
   'mês digitado errado no mensal vira aviso (' + relErrado.avisos.join(' | ') + ')');

// ---------------- Geração ----------------
console.log('Geração — Curitiba');
decks = {};
G.gerarCuritiba();
ok(Object.keys(decks).join() === CUR.deckId, 'Curitiba escreve só na apresentação dela');
ok(['CURITIBA', 'ITAJAI', 'ESTEIO'].every(k => G.ORC_CIDADES[k].deckId) &&
   new Set(['CURITIBA', 'ITAJAI', 'ESTEIO'].map(k => G.ORC_CIDADES[k].deckId)).size === 3,
   'cada cidade tem a sua apresentação');
const deck = decks[CUR.deckId];
const slides = deck.getSlides();
const textos = sl => sl.shapes.filter(x => x.texto).map(x => x.texto);
const titulo = sl => textos(sl)[0];

// Seções: a sub capa escreve o número ("01") e o nome logo depois.
const SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Manutenção', 'Segurança', 'Limpeza e Conservação',
                'Investimento × Recorrente', 'Custo por m²'];
const iSub = SECOES.map((nome, k) => slides.findIndex(sl => textos(sl)[0] === '0' + (k + 1) && textos(sl)[1] === nome));
ok(iSub.every(i => i > 0) && iSub.every((i, k) => k === 0 || i > iSub[k - 1]),
   'sub capas 01–08 na ordem ' + SECOES.join(', ') + ' (posições ' + iSub.join(',') + ')');
const nPagDemais = G._orcPaginasDemais_(div.demais).length;
const N_MANUT = 3 + div.proprias.length + nPagDemais;         // linha a linha, resumo, mensal, categorias, demais
// Curitiba diverge de verdade (mensal × METRAGEM em IPTU e Seguro): +1 slide
// de revisão logo depois da capa.
const N_ESPERADO = 1 + 1 + SECOES.length + 1 + 2 + 3 + N_MANUT + 2 + 2;
ok(slides.length === N_ESPERADO, N_ESPERADO + ' slides: capa, revisão, 8 sub capas, premissas, resumo + ponte, ' +
   'DRE + ofensores + defensores, ' + N_MANUT + ' de manutenção, segurança, limpeza, investimento, custo por m² (veio ' +
   slides.length + ')');

ok(titulo(slides[1]) === 'Revisar antes da versão final', 'slide de revisão logo depois da capa');
ok(iSub[0] === 2 && titulo(slides[3]) === 'Premissas — Orçamento 2027', 'Premissas logo depois da revisão');
const tPrem = textos(slides[3]);
ok(['Premissas', 'O que foi analisado', 'Como ler o relatório'].every(t => tPrem.indexOf(t) >= 0) &&
   tPrem.filter(t => t === G.ORC_PREMISSAS_VAZIO).length === 3,
   'Premissas: três blocos com o espaço para o gestor escrever');

ok(titulo(slides[iSub[1] + 1]) === 'Resumo executivo — Orçamento 2027' &&
   titulo(slides[iSub[1] + 2]) === 'Ponte Ritmo 2026 → Orçamento 2027', 'seção Resumo Executivo: resumo e ponte');
ok([1, 2].every(k => textos(slides[iSub[1] + k]).indexOf('SUGESTÃO') < 0), 'resumo e ponte aprovados: sem o selo SUGESTÃO');

const iDRE = iSub[2] + 1;
ok(textos(slides[iDRE]).indexOf('DRE — Orçamento 2027') >= 0 && textos(slides[iDRE]).indexOf('ÁREA COMUM') >= 0,
   'DRE logo depois da sub capa');
const tOf = textos(slides[iDRE + 1]), tDf = textos(slides[iDRE + 2]);
ok(tOf[0] === 'Ofensores — Orçamento 2027' && tOf.some(t => /^OFENSORES/.test(t)) && !tOf.some(t => /^DEFENSORES/.test(t)),
   'um slide só de ofensores');
ok(tDf[0] === 'Defensores — Orçamento 2027' && tDf.some(t => /^DEFENSORES/.test(t)) && !tDf.some(t => /^OFENSORES/.test(t)),
   'um slide só de defensores');
ok(tOf.some(t => /^TOTAL GERAL/.test(t)) && tDf.some(t => /^TOTAL GERAL/.test(t)), 'TOTAL GERAL fecha os dois');

ok(iSub[3] === iDRE + 3, 'Manutenção logo depois dos defensores');
const iLLManut = iSub[3] + 1, iResManut = iSub[3] + 2, iCat0 = iSub[3] + 4;
const iDemais = iCat0 + div.proprias.length;                  // primeira página de Demais
ok(titulo(slides[iLLManut]) === contasLL[0].nome, 'Manutenção abre com o linha a linha');
ok(iSub[4] === iDemais + nPagDemais, 'Segurança logo depois da última página de Demais');
const iSeg = iSub[4] + 1, iLimp = iSub[5] + 1;
ok(titulo(slides[iSeg]) === contasLL[1].nome && titulo(slides[iLimp]) === contasLL[2].nome,
   'Segurança e Limpeza: linha a linha depois da sub capa');
ok(iSub[6] === iLimp + 1 && iSub[7] === iSub[6] + 2 && slides.length === iSub[7] + 2,
   'Investimento e Custo por m² fecham o deck, cada um depois da sua sub capa');
const iInv = iSub[6] + 1, iM2 = iSub[7] + 1;
ok(!textos(slides[iSeg]).some(t => /^Não detalhado nos modelos/.test(t)) &&
   textos(slides[iSeg]).some(t => /^CONTRATO — SERVIÇO DE VIGILANCIA/.test(t)),
   'linha a linha da segurança lista os contratos, sem "não detalhado"');
ok(!textos(slides[iLimp]).some(t => /^Não detalhado nos modelos/.test(t)) &&
   textos(slides[iLimp]).some(t => /^CONTRATO — EMPRESA AUXILIAR/.test(t)),
   'linha a linha da limpeza lista os contratos, sem "não detalhado"');
ok(slides.every(sl => !textos(sl).some(t => /^Não detalhado nos modelos/.test(t))),
   'nenhuma das três contas em foco sobra com "não detalhado"');
ok(textos(slides[iSeg]).indexOf('MÊS A MÊS') >= 0 && textos(slides[iSeg]).indexOf('Orç 2027') >= 0,
   'linha a linha da segurança com o gráfico mês a mês');
ok(slides.every(sl => !sl.removido), 'slide em branco inicial removido, novos mantidos');
slides.forEach((sl, i) => {
  const falha = textos(sl).filter(t => t.indexOf('Falha ao gerar') === 0);
  ok(!falha.length, 'slide ' + (i + 1) + ' sem aviso de falha: ' + falha.join(' | '));
  sl.shapes.forEach(x => {
    if (x.tipo === 'ELLIPSE') return;                    // grafismo da capa sangra de propósito
    const dentro = x.x >= -0.5 && x.y >= -0.5 && x.x + x.w <= W + 0.5 && x.y + x.h <= H + 0.5;
    ok(dentro, 'slide ' + (i + 1) + ': ' + x.tipo + ' fora da página ' +
       JSON.stringify([x.x, x.y, x.w, x.h].map(v => Math.round(v))) + ' "' + (x.texto || '') + '"');
  });
});
ok(textos(slides[0]).indexOf('Mega Curitiba') >= 0 && textos(slides[0]).indexOf('Manutenção de Imóveis') < 0,
   'capa: título é a cidade, não a conta');
ok(slides.every(sl => textos(sl).indexOf('QUANDO O DINHEIRO SAI') < 0 && textos(sl).indexOf('QUANDO') < 0),
   'nenhum slide fala em "quando o dinheiro sai" — é previsão de entrega');
ok(textos(slides[iCat0]).indexOf('PREVISÃO DE ENTREGA') >= 0 && textos(slides[iCat0]).indexOf('ENTREGA') >= 0,
   'categoria: card e coluna de previsão de entrega');

// Coluna FONTE: uma célula "—" por item, nas linhas de total não.
const nFonte = sl => sl.shapes.filter(x => x.texto === '—').length;
ok(textos(slides[iCat0]).indexOf('FONTE') >= 0, 'categoria: coluna FONTE');
ok(nFonte(slides[iCat0]) === 11, 'PPCI: 11 itens (10 do modelo + Firecam), 11 células de fonte (veio ' +
   nFonte(slides[iCat0]) + ')');
const pagsDemais = slides.slice(iDemais, iDemais + nPagDemais);
const nItensDemais = div.demais.reduce((a, c) => a + c.itens.length, 0);
const fonteDemais = pagsDemais.reduce((a, sl) => a + nFonte(sl), 0);
ok(pagsDemais.every(sl => textos(sl).indexOf('FONTE') >= 0) && fonteDemais === nItensDemais,
   'Demais: coluna FONTE com uma célula por item (veio ' + fonteDemais + ' de ' + nItensDemais + ')');

// Demais: cada categoria aparece uma vez, centrada no bloco dos seus itens,
// e desenhada depois dos fundos (senão a zebra cobre a pill). MONITORAMENTO
// tem dois itens, um deles com o colchete aberto na planilha.
const pagMon = pagsDemais.filter(sl => textos(sl).indexOf('MONITORAMENTO') >= 0)[0];
const tDem = pagMon ? pagMon.shapes : [];
const pillMon = tDem.filter(x => x.texto === 'MONITORAMENTO');
ok(pillMon.length === 1, 'MONITORAMENTO aparece uma vez (veio ' + pillMon.length + ')');
const itensMon = tDem.filter(x => x.texto && x.texto.indexOf('KIT SONDA DE MONITORAMENTO') === 0)
  .sort((a, b) => a.y - b.y);
if (pillMon.length === 1 && itensMon.length === 2) {
  const meioBloco = (itensMon[0].y + itensMon[1].y + itensMon[1].h) / 2;
  perto(pillMon[0].y + pillMon[0].h / 2, meioBloco, 'pill MONITORAMENTO centrada nos 2 itens');
  const iPill = tDem.indexOf(pillMon[0]);
  const ultimoFundo = tDem.reduce((a, x, i) => x.tipo === 'RECTANGLE' && x.w > 600 ? i : a, -1);
  ok(iPill > ultimoFundo, 'pill desenhada depois de todas as faixas de fundo');
} else {
  ok(false, 'itens de MONITORAMENTO não encontrados em Demais');
}
ok(textos(slides[iResManut]).indexOf('R$ 1.760.408') >= 0, 'resumo mostra o total com os contratos');
ok(textos(slides[iResManut]).some(t => /^149 contr\. \+ 289 avulsos/.test(t)), 'resumo: PPCI em barra combinada 149 + 289');
ok(textos(slides[iCat0]).indexOf('PPCI') >= 0 && textos(slides[iCat0]).indexOf('R$ 437.985') >= 0, 'slide PPCI com o total');
ok(textos(slides[iCat0]).some(t => /^CONTRATO — FIRECAM/.test(t)), 'slide PPCI lista o contrato Firecam');
const totDemais = div.demais.reduce((a, c) => a + c.total, 0);
ok(textos(slides[iDemais + nPagDemais - 1]).indexOf(G._orcMoeda_(totDemais)) >= 0, 'Demais fecha com o TOTAL ' + G._orcMoeda_(totDemais));

// Aprovados (05/10/2026): sem selo; os pendentes (90_Pendentes.gs) não saem.
ok(titulo(slides[iInv]) === 'Manutenção: investimento × custo recorrente' &&
   titulo(slides[iM2]) === 'Custo por m² ao mês, 2025 → 2027', 'slides aprovados: investimento e custo por m²');
ok(slides.every(sl => textos(sl).indexOf('SUGESTÃO') < 0), 'nenhum slide com o selo SUGESTÃO');
const PENDENTES = /^(Cenários: o que dá para adiar|Contratos: concentração e reajustes|Contratos sem reajuste no orçamento|Fluxo mensal do orçamento|Outras leituras do orçamento)$/;
ok(!slides.some(sl => PENDENTES.test(titulo(sl) || '')), 'pendentes não são gerados');

// R$/m² fica abaixo de R$ 1: a variação não pode usar a tolerância de R$ 0,50.
const tM2 = textos(slides[iM2]);
ok(tM2.indexOf('▲ 10%') >= 0 && tM2.indexOf('▲ 45%') >= 0 && tM2.indexOf('0%') < 0 && tM2.indexOf('▲ novo') < 0,
   'R$/m²: Δ% real (total +10%, limpeza +45%), sem "0%" nem "novo"');
ok(m2Top.every(l => tM2.indexOf(l.nome) >= 0) && tM2.some(t => /^Demais contas \(\d+\)$/.test(t)),
   'R$/m²: o slide lista as 10 contas do top e as Demais');
ok(tM2.some(t => /o custo por m² sobe 10% contra o Ritmo/.test(t)), 'R$/m²: nota diz "custo por m² sobe 10%"');
LOG.length = 0;

console.log('Planilha de textos');
const plTx = PLANILHA_TEXTOS;
const linhasAba = n => plTx.getSheetByName(n).getDataRange().getValues();
ok(plTx.abas.map(s => s.getName()).join() === G.ORC_TEXTOS_ABAS.join(),
   'uma aba por tipo de tabela, sem a "Página1" vazia (' + plTx.abas.map(s => s.getName()).join(', ') + ')');
ok(G.ORC_TEXTOS_ABAS.every(n => linhasAba(n)[0].join('|') === G.ORC_TEXTOS_CABECALHO.join('|') && linhasAba(n).length > 1),
   'toda aba com cabeçalho e textos');
const PAIS = 'IMPLANTAÇÃO ÁREA DE PAISAGISMO EM 1500M2 AO LADO DO RESTAURANTE INDUSTRIAL';
const lPais = linhasAba('Composição').filter(r => r[0] === PAIS)[0];
ok(lPais && lPais[3] === 'SIM' && /…$/.test(lPais[1]) && lPais[2] === '' && lPais[4] > 10 && lPais[4] < PAIS.length,
   'paisagismo cortado na composição, com quanto cabe e a coluna de escolha vazia (' + JSON.stringify(lPais) + ')');
ok(lPais && /Linha a linha/.test(lPais[5]), 'diz em que slide o texto aparece');
ok(linhasAba('Ofensores').slice(1).every(r => !/ · R\$/.test(r[0])), 'ofensores: a chave é a descrição, sem o valor');

// Fonte única: toda descrição da tabela sai com a mesma letra, cortada ou não.
const fontesDe = (sl, n) => {
  const exib = new Set(linhasAba(n).slice(1).map(r => r[1]));
  return sl.shapes.filter(x => exib.has(x.texto)).map(x => x.fs);
};
[[iLLManut, 'Composição'], [iCat0, 'Categorias'], [iDemais, 'Categorias'], [iDRE + 1, 'Ofensores']].forEach(p => {
  const f = fontesDe(slides[p[0]], p[1]);
  ok(f.length >= 3 && f.every(v => v === f[0]),
     'slide ' + (p[0] + 1) + ' (' + p[1] + '): descrições com a mesma fonte (' + Array.from(new Set(f)).join(', ') + ')');
});
// Tabelas numéricas: uma fonte por tabela, também nos números.
// O relatório de Curitiba diverge de verdade (mensal × METRAGEM em IPTU e
// Seguro): a DRE leva o aviso no rodapé, que não é parte da tabela.
ok(textos(slides[iDRE]).some(t => /^⚠ Mensal ≠ METRAGEM em IPTU/.test(t)),
   'DRE de Curitiba avisa a divergência do mensal em IPTU e Seguro');

// Revisão: o slide lista os dois valores de cada conta; o selo vai nos
// slides com o total geral (e no linha a linha só se a conta divergir); a
// linha da conta ganha o ⚠.
const tRev = textos(slides[1]);
ok(['IPTU', 'Seguro', 'R$ 497.079', 'R$ 494.048', 'R$ 614.427', 'R$ 603.783'].every(t => tRev.indexOf(t) >= 0),
   'revisão: mensal × METRAGEM de IPTU e Seguro (' + tRev.filter(t => /^R\$/.test(t)).join(', ') + ')');
ok(tRev.some(t => /^DRE, (Ofensores|Defensores).*Ponte.*Custo por m²$/.test(t)), 'revisão: diz em que slides a conta aparece (' +
   tRev.filter(t => /^DRE/.test(t)).join(' | ') + ')');
ok(!tRev.some(t => /…$/.test(t)), 'revisão: nenhum texto cortado (' + tRev.filter(t => /…$/.test(t)).join(' | ') + ')');
const SELO = '⚠ REVISAR · IPTU, Seguro';
const comSeloIdx = [iSub[1] + 1, iSub[1] + 2, iDRE, iDRE + 1, iDRE + 2, iM2];
ok(comSeloIdx.every(i => textos(slides[i]).indexOf(SELO) >= 0), 'selo REVISAR em resumo, ponte, DRE, ofensores, defensores e custo por m²');
ok(slides.filter(sl => textos(sl).indexOf(SELO) >= 0).length === comSeloIdx.length,
   'selo só nesses (linha a linha, investimento e manutenção não passam por IPTU/Seguro)');
const nAviso = sl => textos(sl).filter(t => t === '⚠').length;
ok(nAviso(slides[iDRE]) === 2 && nAviso(slides[iM2]) === 2, 'DRE e custo por m²: ⚠ nas linhas de IPTU e Seguro (DRE ' +
   nAviso(slides[iDRE]) + ', m² ' + nAviso(slides[iM2]) + ')');
ok(['⚠ IPTU', '⚠ Seguro'].every(t => textos(slides[iSub[1] + 2]).indexOf(t) >= 0), 'ponte: degraus de IPTU e Seguro com ⚠');
ok(relErrado.revisar.length === 1 && relErrado.revisar[0].nome === 'Segurança e vigilância',
   'mês digitado errado entra em rel.revisar');
[iDRE, iDRE + 1, iDRE + 2].forEach(i => {
  const fs = new Set(slides[i].shapes.filter(x => x.texto && !/^⚠/.test(x.texto) && x.y > 90 && x.y < H - 30).map(x => x.fs));
  ok(fs.size === 1, 'slide ' + (i + 1) + ': tabela numérica com uma fonte só (' + Array.from(fs).join(', ') + ')');
});

// O gestor escolhe o texto curto: vale na geração seguinte, em toda tabela.
const shComp = plTx.getSheetByName('Composição');
const iPais = shComp.getDataRange().getValues().findIndex(r => r[0] === PAIS);
const nAntes = shComp.getLastRow();
shComp.getRange(iPais + 1, 3, 1, 1).setValues([['ÁREA DE PAISAGISMO 1500M2']]);
decks = {};
G.gerarCuritiba();
const s2 = decks[CUR.deckId].getSlides();
ok(textos(s2[iLLManut]).indexOf('ÁREA DE PAISAGISMO 1500M2') >= 0 &&
   !textos(s2[iLLManut]).some(t => /^IMPLANTAÇÃO ÁREA DE PAISAGISMO/.test(t)), 'texto escolhido substitui o original na composição');
const iPaisCat = iCat0 + div.proprias.findIndex(c => c.nome === 'PAISAGISMO');
ok(textos(s2[iPaisCat]).indexOf('ÁREA DE PAISAGISMO 1500M2') >= 0,
   'escolha feita numa aba vale nas outras tabelas (categoria PAISAGISMO)');
const lPais2 = shComp.getDataRange().getValues()[iPais];
ok(shComp.getLastRow() === nAntes && lPais2[2] === 'ÁREA DE PAISAGISMO 1500M2' &&
   lPais2[1] === 'ÁREA DE PAISAGISMO 1500M2' && lPais2[3] === '',
   'nova geração mantém a escolha, atualiza "como aparece hoje" e não duplica a linha (' + JSON.stringify(lPais2) + ')');
PLANILHA_TEXTOS = novaPlanilhaTextos();
LOG.length = 0;

// Propostas (07_PropostasTextos.gs): toda proposta de Curitiba acha sua
// linha e nenhuma sai cortada no deck. As de Itajaí e Esteio ficam sem linha
// aqui (o teste só gera Curitiba) e entram na conta das "sem linha".
console.log('Propostas de texto');
const PROPOSTAS = G.ORC_PROPOSTAS_TEXTOS;
const nProp = PROPOSTAS.length;
ok(PROPOSTAS.every(p => p.length === 4 && p[0] && p[1] && p[2]), 'propostas: [aba, original, proposta, anterior] preenchidas');
decks = {};
G.gerarCuritiba();                                 // a planilha de textos ganha as linhas
const shC = PLANILHA_TEXTOS.getSheetByName('Composição');
shC.getRange(2, 3, 1, 1).setValues([['ESCRITO PELO GESTOR']]);
// Propostas de slides pendentes (contratos, cenários) não têm linha: o
// deck não os gera mais. Ficam fora da conta e aparecem no log.
const temLinha = PROPOSTAS.filter(p => {
  const sh = PLANILHA_TEXTOS.getSheetByName(p[0]);
  return sh && sh.getDataRange().getValues().some(r => G._orcNorm_(r[0]) === G._orcNorm_(p[1]));
}).length;
ok(temLinha > 100, 'a maioria das ' + nProp + ' propostas é de slides gerados (' + temLinha + ')');
// Proposta revista (coluna PROPOSTA ANTERIOR): a célula que ainda tem a
// anterior intacta recebe a nova.
const REJ = 'COLETA DE REJEITOS DO RESTAURANTE (TRANSRESÍDUOS)';
const pRej = PROPOSTAS.filter(p => p[0] === 'Composição' && p[1] === REJ)[0];
const iRej = shC.getDataRange().getValues().findIndex(r => r[0] === REJ);
ok(pRej && pRej[3] && pRej[3] !== pRej[2] && iRej > 0, 'fixture tem uma proposta revista com a anterior (' + JSON.stringify(pRej) + ')');
if (iRej > 0) shC.getRange(iRej + 1, 3, 1, 1).setValues([[pRej[3]]]);
LOG.length = 0;
G.aplicarPropostasTextos();
ok(LOG.some(l => l.indexOf('Propostas aplicadas: ' + (temLinha - 2) + ' · revistas (trocaram a anterior): 1' +
                           ' · já preenchidas (mantidas): 1' +
                           (nProp > temLinha ? ' · sem linha na planilha de textos: ' + (nProp - temLinha) : '')) === 0),
   'aplica toda proposta que tem linha, troca a anterior intacta, mantém a escrita à mão e conta as sem linha (' +
   LOG.join(' | ') + ')');
ok(shC.getDataRange().getValues()[1][2] === 'ESCRITO PELO GESTOR', 'o que o gestor escreveu não é trocado');
ok(iRej > 0 && shC.getDataRange().getValues()[iRej][2] === pRej[2], 'proposta anterior intacta é trocada pela revista');
decks = {};
G.gerarCuritiba();
const todasLinhas = G.ORC_TEXTOS_ABAS.reduce((a, n) =>
  a.concat(PLANILHA_TEXTOS.getSheetByName(n).getDataRange().getValues().slice(1)), []);
const aindaCortadas = todasLinhas.filter(r => r[3] === 'SIM' && r[2] !== 'ESCRITO PELO GESTOR');
ok(aindaCortadas.length === 0, 'com as propostas nenhum texto sai cortado (' + aindaCortadas.map(r => r[1]).join(' | ') + ')');
PLANILHA_TEXTOS = novaPlanilhaTextos();      // as próximas gerações comparam com o deck sem escolhas
LOG.length = 0;

console.log('Geração — cidade sem planilha');
decks = {};
G._orcGerar_(['VAZIA']);
ok(Object.keys(decks).join() === 'deck-vazia', 'cada cidade escreve só na sua apresentação (' + Object.keys(decks).join() + ')');
const sI = decks['deck-vazia'].getSlides();
ok(sI.length === 5, 'cidade vazia: capa, sub capa e slide de Premissas, aviso dos relatórios, aviso da manutenção (veio ' +
   sI.length + ')');
ok(textos(sI[3]).some(t => t.indexOf('METRAGEM-COND ainda não foi') >= 0), 'aviso dos relatórios escrito no slide');
ok(textos(sI[4]).some(t => t.indexOf('ainda não foi configurada') >= 0), 'aviso da manutenção escrito no slide');
ok(!sI.some(sl => textos(sl)[0] === '02'), 'cidade vazia: seção sem dado não ganha sub capa');

console.log('Pendentes (fora do deck, mas ainda desenham)');
[['cenários', s => G.gerarSlideSugCenarios_(s, W, H, CUR, rel, clsM)],
 ['contratos', s => G.gerarSlideSugContratos_(s, W, H, CUR, rel, ctr, rj)],
 ['sem reajuste', s => G.gerarSlideSugSemReajuste_(s, W, H, CUR, rel, rj)],
 ['fluxo mensal', s => G.gerarSlideSugFluxo_(s, W, H, CUR, rel, mensal)]].forEach(p => {
  const sl = novoSlide({ _slides: [] });
  try { p[1](sl); ok(textos(sl).indexOf('SUGESTÃO') >= 0, 'pendente "' + p[0] + '" desenha com o selo'); }
  catch (e) { ok(false, 'pendente "' + p[0] + '" quebrou: ' + e.message); }
});

console.log('Premissas com texto');
const slP = novoSlide({ _slides: [] });
G.gerarSlidePremissas_(slP, W, H, Object.assign({}, CUR,
  { premissas: { premissas: 'Contratos reajustados pelo IPCA em janeiro.', analisado: '', comoLer: '' } }));
const tP = textos(slP);
ok(tP.indexOf('Contratos reajustados pelo IPCA em janeiro.') >= 0 && tP.filter(t => t === G.ORC_PREMISSAS_VAZIO).length === 2,
   'Premissas: texto da configuração no lugar do "Escreva aqui."');

console.log('\n' + (total - falhas) + '/' + total + ' asserções ok');
process.exit(falhas ? 1 : 0);
