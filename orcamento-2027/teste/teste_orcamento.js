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
const PEDIDOS_DRIVE = [];
const W = 720, H = 405;
let matrizAtual = FIXTURE;
let decks = {};
const porIdFinanceiro = {};

function num(v, onde) {
  if (typeof v !== 'number' || !isFinite(v)) throw new Error('Número inválido em ' + onde + ': ' + v);
  return v;
}
function cor(c, onde) {
  if (typeof c !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(c)) throw new Error('Cor inválida em ' + onde + ': ' + c);
}
function estiloTexto(reg) {
  const s = {};
  s.setItalic = () => s;
  s.setFontFamily = f => { reg.fonte = f; return s; };
  s.setFontSize = v => { reg.fs = num(v, 'setFontSize'); if (v <= 0) throw new Error('fonte <= 0'); return s; };
  s.setForegroundColor = c => { cor(c, 'setForegroundColor'); reg.corTexto = c; return s; };
  s.setBold = v => { reg.negrito = !!v; return s; };
  return s;
}
function textRange(reg) {
  const tr = {
    setText: t => { reg.texto = String(t); return tr; },
    getTextStyle: () => estiloTexto(reg),
    getParagraphStyle: () => {
      const p = {
        setParagraphAlignment: a => { reg.align = a; return p; },   // a prévia alinha o texto
        setLineSpacing: v => { if (v < 100) throw new Error('Invalid argument: spacing'); return p; }
      };
      return p;
    }
  };
  return tr;
}
let idSlide = 0, idForma = 0;
function novoSlide(deck) {
  const slide = {
    shapes: [], removido: false, id: 'p' + (++idSlide),
    getObjectId: () => slide.id,
    getBackground: () => ({ setSolidFill: c => { cor(c, 'background'); slide.shapes.fundo = c; } }),
    insertShape: (tipo, x, y, w, h) => {
      [x, y, w, h].forEach((v, i) => num(v, 'insertShape[' + i + ']'));
      if (w <= 0 || h <= 0) throw new Error('Dimensão não positiva: ' + w + 'x' + h);
      const reg = { tipo, x, y, w, h, texto: null, id: 'e' + (++idForma) };
      slide.shapes.push(reg);
      const fill = { setSolidFill: (c, a) => { cor(c, 'fill'); reg.cor = c; if (a !== undefined) { num(a, 'alpha'); reg.alpha = a; } }, setTransparent: () => {} };
      const lineFill = { setSolidFill: (c, a) => { cor(c, 'border'); reg.borda = c; } };
      return {
        getFill: () => fill,
        getBorder: () => ({ setTransparent: () => {}, getLineFill: () => lineFill, setWeight: v => { num(v, 'weight'); reg.peso = v; } }),
        setContentAlignment: () => {},
        getText: () => textRange(reg),
        getObjectId: () => reg.id,
        sendToBack: () => { slide.shapes.splice(slide.shapes.indexOf(reg), 1); slide.shapes.unshift(reg); }
      };
    },
    insertLine: (cat, x1, y1, x2, y2) => {
      [x1, y1, x2, y2].forEach((v, i) => num(v, 'insertLine[' + i + ']'));
      // x1…y2: as pontas de verdade (a prévia desenha a linha inclinada certa)
      const reg = { tipo: 'LINE', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), x1, y1, x2, y2 };
      slide.shapes.push(reg);
      const l = {
        getLineFill: () => ({ setSolidFill: c => { cor(c, 'line'); reg.cor = c; } }),
        setWeight: v => { num(v, 'line weight'); reg.peso = v; return l; },
        setDashStyle: () => { reg.dash = true; return l; },
        sendToBack: () => { slide.shapes.splice(slide.shapes.indexOf(reg), 1); slide.shapes.unshift(reg); }
      };
      return l;
    },
    insertImage: b => {
      if (!b) throw new Error('insertImage não deveria ser chamado sem blob');
      const reg = { tipo: 'IMAGE', x: 0, y: 0, w: b.w || 100, h: b.h || 100, nome: b.nome, texto: null };
      slide.shapes.push(reg);
      const img = {
        getWidth: () => reg.w, getHeight: () => reg.h,
        setWidth: v => { reg.w = v; return img; },
        setHeight: v => { reg.h = v; return img; },
        setLeft: v => { reg.x = v; return img; }, setTop: v => { reg.y = v; return img; },
        setRotation: v => { reg.rot = v; return img; }, bringToFront: () => img,
        sendToBack: () => { slide.shapes.splice(slide.shapes.indexOf(reg), 1); slide.shapes.unshift(reg); return img; }
      };
      return img;
    },
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
  deck.insertSlide = (i, layout) => { const s = novoSlide(deck); deck._slides.splice(i, 0, s); return s; };
  deck.getUrl = () => 'https://docs.google.com/presentation/d/teste';
  deck.getSlideById = id => deck._slides.filter(s => s.id === id)[0] || null;
  deck.getPageElementById = id => {
    for (const s of deck._slides) for (const reg of s.shapes) {
      if (reg.id === id) return { asShape: () => ({ setLinkSlide: alvo => { reg.link = alvo.getObjectId(); } }) };
    }
    return null;
  };
  // Gravação: falhasAoSalvar = quantas vezes seguidas o Slides responde
  // "Service unavailable" antes de aceitar.
  deck.salvos = 0; deck.falhasAoSalvar = 0;
  deck.saveAndClose = () => {
    if (deck.falhasAoSalvar > 0) { deck.falhasAoSalvar--; throw new Error(deck.msgFalha || 'Service unavailable: Slides'); }
    deck.salvos++;
  };
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
// Propriedades do script (deck único de Facilities: listas de slides por parte).
const PROPS_DADOS = {};
const PROPS = { getProperty: k => (k in PROPS_DADOS ? PROPS_DADOS[k] : null), setProperty: (k, v) => { PROPS_DADOS[k] = String(v); },
                deleteProperty: k => { delete PROPS_DADOS[k]; } };

// Utilities.parseCsv do dublê: campos entre aspas (com "" dentro) e separador.
function _csv(texto, sep) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"' && campo === '') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

const ctx = {
  Logger: { log: m => LOG.push(String(m)) },
  SpreadsheetApp: {
    openById: id => id === ctx.ORC_TEXTOS_ID ? PLANILHA_TEXTOS : ({
      getSheetByName: nome => {
        if (/^Financeiro \d{4}$/.test(nome)) return porIdFinanceiro[id] ? aba(nome, porIdFinanceiro[id]) : null;
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
  PropertiesService: { getScriptProperties: () => PROPS },
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
  // Guarda os IDs pedidos (fotos das sub capas) antes de recusar.
  DriveApp: { getFileById: id => { PEDIDOS_DRIVE.push(id); throw new Error('sem Drive no teste'); } },
  Utilities: { sleep: () => {}, parseCsv: (t, sep) => _csv(t, sep || ','),
               DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
               // como o Apps Script: bytes com sinal (-128..127)
               computeDigest: (alg, t) => Array.from(require('crypto').createHash(alg).update(t, 'utf8').digest()).map(b => b > 127 ? b - 256 : b) },
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
// Planilha dos Megas: só a aba "Financeiro 2025" (exportada em 06/10/2026).
porIdFinanceiro[CUR.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_curitiba.json');
// Cadastro de contratos de 2026 exportado do sistema em 07/10/2026 (o que
// importarCadastroContratos2026 grava; ferramentas/ritmo2026_fixtures.py):
// contratos de todas as unidades com os valores mês a mês de 2026, já com as
// renovações. A "MESTRA - CONTRATOS 2026" de antes está em
// fixture_contratos_ano_anterior.json (base do orçado da comparação).
const FIX_CAD_2026 = fixture('fixture_contratos_2026_cadastro.json');
porId[G.ORC_CONTRATOS_ANO_ANTERIOR_ID] = FIX_CAD_2026;
// "MESTRA - ORÇAMENTO 2026 ITEM A ITEM": o deck só a lê para achar contrato
// lançado no modelo de 2026 (o carro Barigui de Curitiba).
const FIX_MOD_2026 = fixture('fixture_modelos2026_megas.json');
porId[G.ORC_MODELOS_ANO_ANTERIOR_ID] = FIX_MOD_2026;
// Cadastro "CONTRATOS-2027-COMPLETO" (07/10/2026), no mesmo formato, com os
// valores de 2027 dos três Megas e o cabeçalho em texto ("jan./27").
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_completo.json');
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
perto(conta('Segurança e vigilância').v.ritmo, 1881108.93, 'segurança Ritmo 2026');
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
  ok(ldre[i + 1].tipo === 'm2grupo', 'DRE: R$/m² logo abaixo do grupo ' + g.nome + ' (como nos Megas)');
  let s = 0;
  for (let k = i + 2; k < ldre.length && ldre[k].tipo === 'item'; k++) s += ldre[k].v.orc;
  // Conta que só mostraria "–"/"0" sai da lista mas fica no subtotal: menos
  // de R$ 500 por conta.
  ok(Math.abs(s - g.v.orc) < 2000, 'DRE: subtotal ' + g.nome + ' ≈ soma das contas listadas (' + Math.round(s) + ' × ' + Math.round(g.v.orc) + ')');
});
// Igual à DRE dos Megas: um total só, IPTU e Seguro dentro de Utilities e as
// contas na ordem fixa do mapa.
ok(ldre[0].nome === 'DESPESAS OPERACIONAIS' && ldre[1].tipo === 'm2' &&
   !ldre.some(l => /ÁREA COMUM|IPTU E SEGURO/.test(l.nome)), 'DRE: um total (Despesas Operacionais), sem Área Comum');
const iUtil = ldre.findIndex(l => l.nome === 'UTILITIES, TAXAS E CONSUMO');
const nomesUtil = ldre.slice(iUtil + 2).map(l => l.nome);
ok(nomesUtil.join(' | ') === 'Energia elétrica | Água | Telefone | Material de consumo | Outras taxas e impostos | IPTU | Seguro',
   'DRE: Utilities na ordem dos Megas, com IPTU e Seguro no fim (veio ' + nomesUtil.join(' | ') + ')');
const gM2 = ldre[ldre.indexOf(ldre.filter(l => l.tipo === 'grupo')[0]) + 1];
perto(Math.round(ldre.filter(l => l.tipo === 'm2grupo').reduce((a, l) => a + l.v.orc, 0) * 100) / 100,
      Math.round(rel.m2Total.orc * 100) / 100, 'DRE: R$/m² dos grupos somam o R$/m² do total');
ok(gM2.v.orc > 0 && gM2.v.orcAnt > 0, 'DRE: R$/m² do grupo em todas as colunas');
// Completa como a dos Megas: toda conta com valor numa linha, sem "Demais".
const comValor = rel.contas.filter(c => ['real', 'orcAnt', 'ritmo', 'orc'].some(k => Math.round(Math.abs(c.v[k]) / 1000) >= 1));
pertoReal(ldre.filter(l => l.tipo === 'grupo').reduce((a, l) => a + l.v.orc, 0), rel.total.orc,
          'DRE: grupos somam o total (com as contas que só mostrariam "–")');
ok(['Material de expediente', 'Correios', 'Cópias e reproduções', 'Outras despesas administrativas']
   .every(n => !ldre.some(l => l.nome === n)), 'DRE: conta com "–"/"0" em todas as colunas sai');
ok(ldre.filter(l => l.tipo === 'item').every(l => ['real', 'orcAnt', 'ritmo', 'orc'].some(k => G._orcMil_(l.v[k]) !== '–' && G._orcMil_(l.v[k]) !== '0')),
   'DRE: toda linha listada tem algum valor visível');
ok(!ldre.some(l => /^Demais contas/.test(l.nome)) &&
   ldre.filter(l => l.tipo === 'item').length === comValor.length + 2,
   'DRE: toda conta com valor numa linha, sem "Demais contas" (' + ldre.filter(l => l.tipo === 'item').length + ' itens)');
ok(['Cursos e seminários', 'Despesa com passagens', 'Despesa com taxi', 'Propaganda e publicidade']
   .every(n => ldre.some(l => l.nome === n)), 'DRE: contas pequenas aparecem pelo nome');
ok(ldre.length <= 44, 'DRE cabe em até 44 linhas (veio ' + ldre.length + ')');

const q = G._orcOfensores_(rel);
pertoReal(q.ofensores.total.delta + q.defensores.total.delta, q.total.delta, 'ofensores + defensores = variação total');
perto(q.total.delta, 7168946.55 - 5950510.75,'variação total = Orç 2027 − Ritmo 2026');
ok(q.ofensores.contas.every(c => c.delta >= G.ORC_OFENSOR_MINIMO), 'ofensores listados acima do mínimo');
ok(q.ofensores.contas[0].delta >= q.ofensores.contas[q.ofensores.contas.length - 1].delta, 'ofensores do maior para o menor');
ok(q.defensores.contas.every(c => c.delta <= -G.ORC_OFENSOR_MINIMO), 'defensores listados abaixo do −mínimo');

const mensal = G.obterRelatorioMensal_('CURITIBA');
// PREVIA: números de Curitiba para os rascunhos de gráfico (ferramentas/rascunhos).
if (process.env.PREVIA) {
  const contr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], avul = contr.slice();
  d.categorias.forEach(c => c.itens.forEach(it => it.meses.forEach((v, i) => { (it.contrato ? contr : avul)[i] += v; })));
  const conta = n => mensal.contas[G._orcChaveConta_(n)];
  fs.writeFileSync(path.join(process.env.PREVIA, 'dados_rascunhos_curitiba.json'), JSON.stringify({
    manutencao: { contratos: contr, avulsos: avul },
    mensal: ['Manutenção de imóveis', 'Segurança e vigilância', 'Limpeza e conservação'].reduce((o, n) => {
      const c = conta(n); if (c) o[n] = { orcAnt: c.orcAnt, ritmo: c.real, orc: c.orc }; return o; }, {})
  }, null, 1));
}
const mSeg = mensal.contas[G._orcChaveConta_('Segurança e vigilância')];
ok(!!mSeg, 'mensal: segurança');
pertoReal(mSeg.orc.reduce((a, v) => a + v, 0), 2306916.51, 'mensal: soma dos meses da segurança 2027 = metragem');
perto(mSeg.orcAnt[0], 149186.09, 'mensal: Orç jan/26 da segurança');

const modelos = G._orcLinhasModelosCidade_('CURITIBA');
const contasLL = G._orcContasLinhaALinha_(rel);

// Custo por m² mês a mês (20_M2Mensal.gs): a média dos meses é o R$/m² da
// área comum da METRAGEM — no Orç exato (o mensal fecha conta a conta), no
// ritmo com a diferença do realizado no mensal (centavos de R$/m²).
// Real 2025 da planilha dos Megas: área comum = TOTAL − IPTU − seguro, e a
// soma do ano fecha com o Real 2025 da METRAGEM (Itajaí e Esteio exatos,
// Curitiba a 0,3%: a METRAGEM tem R$ 8,9 mil a mais).
['curitiba', 'itajai', 'esteio'].forEach(c => {
  const ra = G._orcLerFinanceiroMegas_(fixture('fixture_financeiro2025_' + c + '.json'), 2025);
  const rm = G._orcLerMetragem_(fixture('fixture_metragem_' + c + '.json'));
  const soma = ra.ac.reduce((t, v) => t + v, 0);
  ok(Math.abs(soma / rm.areaComum.real - 1) < 0.003, c + ': Real 2025 mês a mês (área comum) fecha com a METRAGEM (' +
     Math.round(soma) + ' × ' + Math.round(rm.areaComum.real) + ')');
});
lanca(() => G._orcLerFinanceiroMegas_([['', 'Orç Jan/25']], 2025), 'cabeçalho inesperado', 'Financeiro 2025 sem "Real Jan/25" → erro');
const realAnt = G.obterRealMensalAnoRetrasado_('CURITIBA');
ok(realAnt && realAnt.ac.length === 12 && realAnt.ac.every(v => v > 0), 'Real 2025 de Curitiba lido pela config (financeiroMegasId)');
const m2m = G._orcM2Mensal_(rel, mensal, realAnt);
const serie = k => m2m.series.filter(s => s.k === k)[0];
ok(m2m.series.map(s => s.nome).join(' | ') === 'Real 2025 | Orç 2026 | Ritmo 2026 | Orç 2027', 'm² mensal: quatro séries');
ok(Math.abs(serie('real').media - rel.m2AreaComum.real) < 0.02, 'm² mensal: média do Real 2025 ≈ R$/m² da METRAGEM (' +
   serie('real').media.toFixed(3) + ' × ' + rel.m2AreaComum.real + ')');
ok(G._orcM2Mensal_(rel, mensal, null).series.length === 3, 'm² mensal: sem a planilha dos Megas, segue sem o Real');
ok(Math.abs(serie('orc').media - rel.areaComum.orc / m2m.area.orc / 12) < 0.001, 'm² mensal: média do Orç 2027 = área comum ÷ área ÷ 12');
ok(Math.abs(serie('orc').media - rel.m2AreaComum.orc) < 0.01 && Math.abs(serie('ritmo').media - rel.m2AreaComum.ritmo) < 0.02,
   'm² mensal: média bate com o R$/m² da área comum da METRAGEM (' + serie('orc').media.toFixed(3) + ', ' +
   serie('ritmo').media.toFixed(3) + ')');
ok(m2m.fora.indexOf('Despesa de pessoal') >= 0, 'm² mensal: despesa de pessoal (sem abertura mensal) entra 1/12 por mês');
['ritmo', 'orc'].forEach(k => ok(Math.abs(m2m.custo[k].areaComum.m2 + m2m.custo[k].iptu.m2 + m2m.custo[k].seguro.m2 - m2m.custo[k].total.m2) < 0.015,
   'm² mensal: área comum + IPTU + seguro = total em R$/m² (' + k + ')'));
ok(m2m.custo.ritmo.areaComum.m2 === rel.m2AreaComum.ritmo, 'm² mensal: R$/m² da área comum é o da METRAGEM');
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
// 08/10/2026: plantios de grama, iluminações perimetrais, recuperações de viga e a TV do quiosque saíram de Projetos
// para Pontual (decisão do gestor) — R$ 698 mil → R$ 595 mil.
ok(clsM.projetos.total > 590000 && clsM.projetos.total < 600000, 'projetos ≈ R$ 595 mil (veio ' + Math.round(clsM.projetos.total) + ')');
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
ok(pSeg.partes.length === 1, 'ponte: segurança numa barra só (o "já roda em dez" saiu em 06/10/2026)');
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
// Curitiba lê os contratos do cadastro mestre desde 07/10/2026 (como Itajaí e
// Esteio): entram também os das outras contas (informática, telefone…).
ok(rj.reajustes.map(x => x.contrato.fornecedor.split(' ')[0] + '@' + (x.mes + 1)).join(',') ===
   'EMPRESA@2,FILTROIL@3,INNON@3,RENTBRELLA@7,LIGGA@7,INFRASPEAK@8,TRANSRESÍDUOS@8,SISTEMA@9,EQUILIBRIO@9,SUINO@9,KEY@12',
   'reajustes previstos: Empresa Auxiliar fev, Filtroil mar, Transresíduos ago, Equilíbrio e Suíno Vivo set, e os das outras contas (' +
   rj.reajustes.map(x => x.contrato.fornecedor.split(' ')[0] + '@' + (x.mes + 1)).join(',') + ')');
perto(rj.umPorCento, rj.baseSemReajuste / 100, 'dissídio: 1% da base sem reajuste');
ok(rj.parcelasFixas.length === 1 && rj.parcelasFixas[0].grupo === 'ITAÚ (FINANCIAMENTO)' &&
   !rj.semReajuste.some(c => /ITAU/.test(c.fornecedor)), 'financiamento Itaú fora de "sem reajuste" (parcela fixa)');
ok(!conc.some(g => /ALTERAÇÃO DE ESCALA|^LPU$|^CONTRATO DE/.test(g.grupo)),
   'item-contrato sem fornecedor não vira fornecedor (' + conc.map(g => g.grupo).join(', ') + ')');
const semF = conc.filter(g => g.grupo === G.ORC_SEM_FORNECEDOR)[0];
ok(semF && semF.n === 7, '5 itens LPU, quadro BT e ar-condicionado como [IDENTIFICAR EMPRESA] (veio ' + (semF && semF.n) + ')');
const rot = t => G._orcRotuloContrato_(ctr.filter(c => c.descricao.indexOf(t) === 0)[0]);
ok(rot('EMPRESA AUXILIAR DE SERVIÇOS GERAIS') === 'EMPRESA AUXILIAR', 'rótulo: ' + rot('EMPRESA AUXILIAR DE SERVIÇOS GERAIS'));
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
// As perguntas em aberto de Curitiba (ORC_PENDENCIAS_GESTOR) criariam o slide
// de revisão: a estrutura do deck é conferida sem elas; elas têm teste próprio
// em "Pendências de dados".
const PEND_GESTOR_REAL = G.ORC_PENDENCIAS_GESTOR;
// Contratos sem 2026 identificado (08/10/2026) também viram pendência; ficam de fora do fluxo principal
// (os índices dos slides de Curitiba contam sem o slide de revisão) e são testados em "Pendências de dados".
const NAO_ID_REAL = G.ORC_CONTRATOS_2026_NAO_ID;
G.ORC_CONTRATOS_2026_NAO_ID = [];
G.ORC_PENDENCIAS_GESTOR = {};
decks = {};
G.gerarCuritiba();
const logGeracao = LOG.slice();
ok(Object.keys(decks).join() === CUR.deckId, 'Curitiba escreve só na apresentação dela');
ok(['CURITIBA', 'ITAJAI', 'ESTEIO'].every(k => G.ORC_CIDADES[k].deckId) &&
   new Set(['CURITIBA', 'ITAJAI', 'ESTEIO'].map(k => G.ORC_CIDADES[k].deckId)).size === 3,
   'cada cidade tem a sua apresentação');
const deck = decks[CUR.deckId];
const slides = deck.getSlides();
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'formas_curitiba.json'),
  JSON.stringify({ W: W, H: H, slides: slides.map(x => ({ fundo: x.shapes.fundo, formas: x.shapes })) }));
const textos = sl => sl.shapes.filter(x => x.texto).map(x => x.texto);
const titulo = sl => textos(sl)[0];

// Seções: a sub capa escreve o número ("01") e o nome logo depois.
// 7 seções desde 07/10/2026: "Projetos × Recorrente" virou parte da Manutenção (roteiro dos itens 13 e 14).
const SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Manutenção', 'Segurança', 'Limpeza e Conservação', 'Custo por m²'];
const iSub = SECOES.map((nome, k) => slides.findIndex(sl => textos(sl)[0] === '0' + (k + 1) && textos(sl)[1] === nome));
ok(iSub.every(i => i > 0) && iSub.every((i, k) => k === 0 || i > iSub[k - 1]),
   'sub capas 01–07 na ordem ' + SECOES.join(', ') + ' (posições ' + iSub.join(',') + ')');
// Sub capas C1 "relatório claro" (07/10/2026): cada seção pede a sua foto
// (sem Drive no teste, o bloco fica cinza), tem a trilha com as 8 seções e,
// nas seções com valor, o número em R$ e R$/m² ao mês.
SECOES.forEach(nome => {
  const cfg = G.ORC_SUBCAPAS[nome];
  const id = cfg && (cfg.foto === 'MEGA' ? CUR.fotoFundoId : G.ORC_FOTOS_SECAO[cfg.foto]);
  ok(id && PEDIDOS_DRIVE.indexOf(id) >= 0, 'sub capa ' + nome + ': pede a foto ' + (cfg && cfg.foto) + ' (' + id + ')');
});
iSub.forEach((i, k) => ok(slides[i] && SECOES.every(n => textos(slides[i]).indexOf(n) >= 0),
  'sub capa ' + SECOES[k] + ': trilha com as 7 seções'));
const tMan = textos(slides[iSub[3]]);
ok(tMan.some(t => /^R\$ [\d,]+ (mil|mi)$/.test(t)) && tMan.indexOf('Orçamento 2027 da conta') >= 0 &&
   tMan.some(t => /^R\$ [\d,]+$/.test(t)) && tMan.indexOf('/m²') >= 0 && tMan.indexOf('/m² ao mês') < 0 && tMan.indexOf('vs. ritmo 2026') >= 0,
   'sub capa Manutenção: valor da conta, R$/m² ao mês e variação contra o ritmo (' + tMan.slice(0, 9).join(' | ') + ')');
ok(textos(slides[iSub[6]]).some(t => /^R\$ [\d,]+$/.test(t)) && textos(slides[iSub[6]]).indexOf('por m², todas as contas') >= 0,
   'sub capa Custo por m²: abre com o R$/m² ao mês');
ok(!textos(slides[iSub[0]]).some(t => /^R\$/.test(t)), 'sub capa Premissas: sem número');
// Sumário logo depois da capa, com as 8 seções; número e nome são link para a sub capa.
const tSum = textos(slides[1]);
ok(titulo(slides[1]) === 'Sumário' && SECOES.every((n, k) => tSum.indexOf(n) >= 0 && tSum.indexOf('0' + (k + 1)) >= 0),
   'Sumário depois da capa, com as 7 seções numeradas');
const linkDe = (sl, txt) => (sl.shapes.filter(sh => sh.texto === txt)[0] || {}).link;
ok(SECOES.every((n, k) => linkDe(slides[1], n) === slides[iSub[k]].id && linkDe(slides[1], '0' + (k + 1)) === slides[iSub[k]].id),
   'Sumário: cada seção leva à sua sub capa');
ok(linkDe(slides[iSub[3]], 'Segurança') === slides[iSub[4]].id && !linkDe(slides[iSub[3]], 'Manutenção'),
   'trilha da sub capa: as outras seções são link, a atual não');
const nPagDemais = G._orcPaginasDemais_(div.demais).length;
// Páginas do linha a linha de cada conta: o slide da conta + as dos itens
// menores que não couberam na composição.
// Manutenção: só a 1ª página — os itens menores estão no item a item com o selinho.
const nLL = contasLL.map((c, k) => k === 0 ? 1 : 1 + G._orcPaginasItens_(G._orcCorteComposicao_(c, modelos, H).fora).length);
// "Por que a manutenção sobe" abre a seção (Curitiba tem 2 obras adiadas na planilha do gestor).
const N_POR_QUE = G.ORC_DECISOES_GESTOR['Mega Curitiba'].adiados.length ? 1 : 0;
// Projetos × recorrente: o slide e as páginas dos itens de cada grupo (dentro da Manutenção).
const nGrupos = G._orcPaginasGrupos_(G._orcClassificarManutencao_(d)).length;
// resumo, a conta, por que sobe, avulsos abertos + item a item, demais, categorias, mensal (08/10/2026: o resumo
// abre a seção e o "contratos e avulsos" saiu)
const N_MANUT = 1 + nLL[0] + N_POR_QUE + 1 + nGrupos + nPagDemais + div.proprias.length + 1;
// Curitiba diverge de verdade (mensal × METRAGEM em IPTU e Seguro), mas a
// contabilidade mandou usar a METRAGEM (valeMetragem): sem slide de revisão.
// Contratos de todas as contas (22_ContratosTodos.gs), depois dos defensores.
const cmpTodos = G._orcCompararTodosContratos_(rel, FIX_CAD_2026, 'Mega Curitiba', modelos, FIX_MOD_2026);
const nTodos = G._orcPaginasContratos_(cmpTodos).length;
const N_ESPERADO = 2 + SECOES.length + 1 + 2 + 3 + nTodos + N_MANUT + nLL[1] + nLL[2] + 2;
ok(slides.length === N_ESPERADO, N_ESPERADO + ' slides: capa, sumário, 7 sub capas, premissas, resumo + ponte, ' +
   'DRE + ofensores + defensores, ' + N_MANUT + ' de manutenção, segurança, limpeza, custo por m² (veio ' +
   slides.length + ')');

ok(!slides.some(sl => titulo(sl) === 'Revisar antes da versão final'), 'IPTU e Seguro em valeMetragem: sem slide de revisão');
ok(iSub[0] === 2 && titulo(slides[3]) === 'Premissas — Orçamento 2027', 'Premissas logo depois do sumário');
const tPrem = textos(slides[3]);
ok(['Premissas', 'O que foi analisado', 'Como ler o relatório'].every(t => tPrem.indexOf(t) >= 0) &&
   tPrem.filter(t => t === G.ORC_PREMISSAS_VAZIO).length === 3,
   'Premissas: três blocos com o espaço para o gestor escrever');

ok(titulo(slides[iSub[1] + 1]) === 'Resumo executivo — Orçamento 2027' &&
   titulo(slides[iSub[1] + 2]) === 'Ponte Ritmo 2026 → Orçamento 2027', 'seção Resumo Executivo: resumo e ponte');
ok([1, 2].every(k => textos(slides[iSub[1] + k]).indexOf('SUGESTÃO') < 0), 'resumo e ponte aprovados: sem o selo SUGESTÃO');
const tPonte = textos(slides[iSub[1] + 2]);
ok(!tPonte.some(t => /já roda|novo/i.test(t)) && tPonte.indexOf('Alta da conta') >= 0 && tPonte.indexOf('Redução') >= 0,
   'ponte: sem "já roda", legenda só com Alta da conta e Redução (' + tPonte.filter(t => /roda|novo|Alta|Redu/i.test(t)).join(' | ') + ')');

const iDRE = iSub[2] + 1;
ok(textos(slides[iDRE]).indexOf('DRE — Orçamento 2027') >= 0 && textos(slides[iDRE]).indexOf('DESPESAS OPERACIONAIS') >= 0,
   'DRE logo depois da sub capa');
const tOf = textos(slides[iDRE + 1]), tDf = textos(slides[iDRE + 2]);
ok(tOf[0] === 'Ofensores — Orçamento 2027' && tOf.some(t => /^OFENSORES/.test(t)) && !tOf.some(t => /^DEFENSORES/.test(t)),
   'um slide só de ofensores');
ok(tDf[0] === 'Defensores — Orçamento 2027' && tDf.some(t => /^DEFENSORES/.test(t)) && !tDf.some(t => /^OFENSORES/.test(t)),
   'um slide só de defensores');
ok(tOf.indexOf('DESPESAS OPERACIONAIS') >= 0 && tDf.indexOf('DESPESAS OPERACIONAIS') >= 0, 'DESPESAS OPERACIONAIS (total geral, nome da DRE) fecha os dois');
ok(!tOf.concat(tDf).some(t => /^Demais contas/.test(t)), 'ofensores/defensores: sem "Demais contas"');
ok(['Material de consumo', 'Representação e refeição', 'Cursos e seminários', 'Despesa com combustíveis'].every(n => tOf.indexOf(n) >= 0),
   'ofensores: conta com variação visível tem linha própria (cursos, refeição, consumo, combustíveis)');

ok(iSub[3] === iDRE + 3 + nTodos, 'Manutenção logo depois dos defensores e dos contratos');
const grupoDe = n => cmpTodos.grupos.filter(g => G._orcChaveConta_(g.conta) === G._orcChaveConta_(n))[0];
const vig = grupoDe('Segurança e vigilância').linhas.filter(l => /VIGILÂNCIA \(EMPRESA AUXILIAR\)/.test(l.nome))[0];
const port = grupoDe('Segurança e vigilância').linhas.filter(l => /PORTARIA/.test(l.nome))[0];
ok(vig && port && /^Ampliação/.test(vig.situacao) && /^Reajuste/.test(port.situacao),
   'contratos: os dois "Empresa Auxiliar" não se misturam; posto adicional é ampliação da vigilância (' +
   (vig && vig.situacao) + ' / ' + (port && port.situacao) + ')');
// Com o cadastro mestre (07/10/2026) Curitiba tem os contratos de 2027 de
// todas as contas: informática é comparada contrato a contrato.
ok(grupoDe('Assistência em informática') && grupoDe('Assistência em informática').metragem &&
   grupoDe('Assistência em informática').linhas.some(l => l.nome === 'KEY ACCESS (CONTRATO)' && /^Reajuste IPCA/.test(l.situacao)),
   'contratos: informática casa com a conta da METRAGEM e é comparada contrato a contrato (Key Access reajuste IPCA)');
// Gestor, 07/10/2026: "TELEFONE FIXO" (novo) e "4IP… – TELEFONE FIXO" (sem
// item) eram o mesmo contrato — o "4" de 4IP saía como numeração.
const tel = grupoDe('Telefone') ? grupoDe('Telefone').linhas.filter(l => /4IP/.test(l.nome)) : [];
ok(tel.length === 1 && tel[0].ant > 0 && tel[0].atual > 0 && !grupoDe('Telefone').linhas.some(l => /^Novo/.test(l.situacao) && /TELEFONE FIXO/.test(l.nome)),
   'contratos: 4IP (telefone fixo) casa 2026 com 2027 numa linha só (' + tel.map(l => l.nome + ' ' + l.situacao).join(' | ') + ')');
// Guilherme, 07/10/2026: o carro Barigui é contrato e em 2026 foi lançado no
// modelo ("Contrato carro alugado"); conta sem contrato no cadastro usa o modelo.
const carro = grupoDe('Despesa com veículos') ? grupoDe('Despesa com veículos').linhas : [];
ok(carro.length === 1 && Math.round(carro[0].ant) === 27480 && Math.round(carro[0].atual) === 27480 && /modelo 2026/.test(carro[0].situacao),
   'contratos: carro de Curitiba casa 2026 (modelo) × 2027 (' + carro.map(l => l.nome + ' ' + Math.round(l.ant) + '→' + Math.round(l.atual) + ' ' + l.situacao).join(' | ') + ')');
ok(!cmpTodos.grupos.some(g => /iptu|seguro/i.test(g.conta)), 'contratos: IPTU e seguros ficam de fora');
perto(grupoDe('Manutenção de imóveis').atual, G._orcCompararContratos_(contasLL[0].v,
  G._orcLerCadastroContratos_(FIX_CAD_2026, 'Mega Curitiba', 'Manutenção de imóveis', 2026),
  G._orcClassificarManutencao_(d).grupos[0].itens).contratos.atual, 'contratos: manutenção igual ao slide da manutenção');
const tTodos = textos(slides[iDRE + 3]);
ok(/^Contratos — 2026 × Orçamento 2027 \(1\/\d\)$/.test(tTodos[0]) && tTodos.indexOf('TODOS OS CONTRATOS') >= 0,
   'contratos de todas as contas depois dos defensores (' + tTodos[0] + ')');
ok(textos(slides[iDRE + 2 + nTodos]).indexOf('TOTAL DOS CONTRATOS') >= 0, 'última página fecha com o total dos contratos');
for (let k = 0; k < nTodos; k++) {
  const tt = textos(slides[iDRE + 3 + k]);
  ok(!tt.some(t => /…$/.test(t)), 'contratos ' + (k + 1) + '/' + nTodos + ': nenhum texto cortado (' + tt.filter(t => /…$/.test(t)).join(' | ') + ')');
}
// Roteiro da Manutenção (08/10/2026): resumo (KPIs, categorias, maiores itens) → a conta → por que sobe → avulsos
// abertos (projetos × recorrente) e item a item → Demais → categorias grandes → distribuição mensal.
const iResManut = iSub[3] + 1, iLLManut = iResManut + 1, iPorQue = iLLManut + 1;
const iInv = iPorQue + N_POR_QUE;
const iDemais = iInv + 1 + nGrupos, iCat0 = iDemais + nPagDemais, iMensal = iCat0 + div.proprias.length;
// Por que a manutenção sobe: ponte Ritmo → Orç com o degrau das obras adiadas
// e a tabela das obras, com o valor de hoje no modelo 090.
{
  const tPQ = textos(slides[iPorQue]);
  const adiC = G._orcAdiados2026_(CUR, G.obterManutencao_('CURITIBA'));
  const vM = contasLL[0].v;
  ok(N_POR_QUE === 1 && titulo(slides[iPorQue]) === 'Por que a manutenção sobe — Orçamento 2027',
     '"Por que a manutenção sobe" logo depois da conta');
  ok(adiC && adiC.itens.length === 2 && adiC.itens.every(it => it.doModelo) && Math.abs(adiC.total - 232580.29) < 1,
     'obras adiadas de Curitiba achadas no modelo 090 pelo nome (R$ ' + (adiC && Math.round(adiC.total)) + ')');
  ok(adiC.itens[0].nome === 'Guard-rail fase 2' && tPQ.indexOf('Guard-rail fase 2') >= 0 && tPQ.indexOf('Torniquete 4 (instalação, corte vidro, periféricos)') >= 0,
     'tabela com as obras sem o número do chamado');
  const semAd = vM.orc - adiC.total;
  ok(tPQ.some(t => t.indexOf('sem as obras adiadas de 2026: +' + G._orcPct_((semAd - vM.ritmo) / vM.ritmo)) >= 0),
     'subtítulo com a alta sem as obras adiadas (' + tPQ[1] + ')');
  ok(tPQ.some(t => /^Sem as obras adiadas: R\$ [\d,]+ (mil|mi) · R\$ [\d,]+\/m² ao mês/.test(t)),
     'leitura sem as obras adiadas em R$ e R$/m² ao mês');
  ok(G._orcAdiados2026_(G.ORC_CIDADES.ESTEIO, G.obterManutencao_('CURITIBA')) === null, 'Mega sem obra adiada: sem o slide');
  ok(tPQ.indexOf('ORÇ 2026') >= 0 && tPQ.indexOf('RITMO 2026') > tPQ.indexOf('ORÇ 2026') && !tPQ.some(t => /gestor/i.test(t)),
     'por que sobe: coluna do Orç 2026 primeiro e sem "comentário do gestor" (08/10/2026)');
}
ok(titulo(slides[iLLManut]) === contasLL[0].nome, 'Manutenção abre com a conta (sem página 2/2)');
// Os itens menores não têm página própria: a linha aponta para o item a item, adiante.
const foraManut = G._orcCorteComposicao_(contasLL[0], modelos, H).fora;
const totalFora = G._orcMoeda_(foraManut.reduce((a, it) => a + it.total, 0));
ok(textos(slides[iLLManut]).some(t => t === '+ ' + foraManut.length + ' itens menores (item a item adiante)') &&
   textos(slides[iLLManut]).indexOf(totalFora) >= 0, 'a conta aponta os itens menores para o item a item adiante');
ok(!slides.some(sl => titulo(sl) === 'Manutenção de imóveis — contratos e avulsos') &&
   titulo(slides[iInv]) === 'Manutenção: projetos × custo recorrente',
   'sem o slide "contratos e avulsos" (gestor, 08/10/2026); os avulsos abertos vêm depois do "por que sobe"');
ok(/^Manutenção de Imóveis — Orçamento 2027/.test(titulo(slides[iResManut])) && iResManut === iSub[3] + 1 &&
   /^Demais categorias/.test(titulo(slides[iDemais])) && textos(slides[iResManut]).some(t => / e mais \d+$/.test(t)),
   'o resumo da manutenção abre a seção (gestor, 08/10/2026) e a barra DEMAIS diz quais são');
ok(textos(slides[iResManut]).indexOf('DEMAIS (' + div.demais.length + ')') >= 0,
   'barra DEMAIS do resumo = as ' + div.demais.length + ' categorias do slide de Demais (mesmo corte — gestor, 08/10/2026)');
ok(titulo(slides[iMensal]) === 'Distribuição mensal' && iSub[4] === iMensal + 1, 'distribuição mensal fecha a Manutenção');
const iSeg = iSub[4] + 1, iLimp = iSub[5] + 1;
const tituloLL = k => contasLL[k].nome + (nLL[k] > 1 ? ' (1/' + nLL[k] + ')' : '');
ok(titulo(slides[iSeg]) === tituloLL(1) && titulo(slides[iLimp]) === tituloLL(2),
   'Segurança e Limpeza: linha a linha depois da sub capa');
ok(iSub[6] === iLimp + nLL[2] && slides.length === iSub[6] + 3, 'Custo por m² fecha o deck, depois da sua sub capa');
// Itens de cada grupo: todos os itens da manutenção, cada um com o selinho.
{
  const clsT = G._orcClassificarManutencao_(d);
  const pagsT = slides.slice(iInv + 1, iInv + 1 + nGrupos);
  const selos = pagsT.reduce((t, s) => t.concat(textos(s).filter(x => G.ORC_GRUPOS_MANUT_SELO.indexOf(x) >= 0)), []);
  const nIt = clsT.grupos.reduce((t, g) => t + g.itens.length, 0);
  ok(nGrupos >= 1 && pagsT.every(s => /^Manutenção: os itens de cada grupo/.test(titulo(s))) && selos.length >= nIt,
     'itens de cada grupo: ' + nIt + ' itens com selinho em ' + nGrupos + ' página(s) (selos: ' + selos.length + ')');
}
const iM2 = iSub[6] + 1;
// Contratos de manutenção 2026 × 2027, fornecedor a fornecedor.
const ant = G._orcLerCadastroContratos_(FIX_CAD_2026, 'Mega Curitiba', 'Manutenção de imóveis', 2026);

// importarCadastroContratos2026: o CSV do sistema vira as mesmas linhas da
// fixture (número, data, cabeçalho "Jan/26" que o leitor entende).
{
  const csvTxt = fs.readFileSync(path.join(__dirname, '..', 'ferramentas', 'bases_2026',
    fs.readdirSync(path.join(__dirname, '..', 'ferramentas', 'bases_2026')).filter(n => /^CONTRATOS 2026 - CADASTRO.*\.csv$/.test(n)).sort().pop()), 'latin1');
  const doCsv = G._orcCsvCadastro_(csvTxt);
  const soma = (dados, uni, conta) => G._orcLerCadastroContratos_(dados, uni, conta, 2026).reduce((t, c) => t + c.total, 0);
  const contas = [['Mega Curitiba', 'Manutenção de imóveis'], ['Mega Itajaí', 'Manutenção de imóveis'], ['Mega Esteio', 'Segurança e vigilância']];
  ok(doCsv.length === FIX_CAD_2026.length && contas.every(([u, c]) => Math.abs(soma(doCsv, u, c) - soma(FIX_CAD_2026, u, c)) < 0.01) &&
     Object.prototype.toString.call(doCsv[1][13]) === '[object Date]' && typeof doCsv[1][15] === 'number',
     'importar cadastro 2026: o CSV do sistema dá os mesmos contratos da fixture (' + contas.map(([u, c]) => Math.round(soma(doCsv, u, c))).join(' / ') + ')');
}
ok(ant.map(c => c.fornecedor.split(' ')[0]).join(',') === 'FIRECAM,MIRIAD,LEANDRO,FILTROIL,EQUILIBRIO',
   'cadastro 2026: os 5 contratos de manutenção de Curitiba (o da Equilíbrio que acabou em jul/25 fica de fora)');
perto(Math.round(ant.reduce((t, c) => t + c.total, 0)), 349470, 'cadastro 2026 (sistema, 07/10/2026): R$ 349.470 em contratos de manutenção (a MESTRA antiga dava R$ 371.718)');
const clsM2 = G._orcClassificarManutencao_(d);
const cmp = G._orcCompararContratos_(contasLL[0].v, ant, clsM2.grupos[0].itens);
const linhaDe = k => cmp.linhas.filter(l => G._orcNorm_(l.itens.map(i => i.descricao).join(' ') + ' ' + l.nome).indexOf(k) >= 0)[0];
ok(linhaDe('miriad').itens.length === 2 && /^Ampliação/.test(linhaDe('miriad').situacao),
   'comparação: a ampliação da Miriad soma no contrato da Miriad (' + linhaDe('miriad').situacao + ')');
ok(cmp.linhas.filter(l => /^Novo/.test(l.situacao)).length === 3 && cmp.linhas.every(l => l.atual > 0),
   'comparação: 3 contratos novos em 2027 (FM Security, quadro BT, AVAC) e nenhum não renovado');
perto(cmp.contratos.atual, clsM2.grupos[0].total, 'comparação: contratos 2027 = grupo Contratos do slide de Projetos');
perto(cmp.avulsos.ant + cmp.contratos.ant, contasLL[0].v.ritmo, 'comparação: avulsos 2026 + contratos 2026 = ritmo da conta');
// Em dinheiro e em m² (o diretor lê os dois — 06/10/2026).
const areaOrc = G._orcAreaImplicita_(rel, 'orc');
const m2Manut = 'R$ ' + G._orcM2_(contasLL[0].v.orc / areaOrc / 12);
ok(tOf.indexOf('R$/M² AO MÊS') >= 0 && tDf.indexOf('R$/M² AO MÊS') >= 0 && tOf.indexOf('R$ MIL') >= 0,
   'ofensores e defensores: colunas de R$ mil e de R$/m² ao mês');
ok(tOf.indexOf('Δ') < 0 && tDf.indexOf('Δ') < 0 && tOf.indexOf('Δ R$') >= 0,
   'ofensores e defensores: sem a coluna Δ do R$/m² (gestor, 08/10/2026), o Δ R$ fica');
ok(tOf.indexOf(G._orcM2_(rel.total.orc / areaOrc / 12)) >= 0, 'ofensores: R$/m² do total (Despesas Operacionais)');
const tLL = textos(slides[iLLManut]);
ok(tLL.indexOf('R$/M² AO MÊS · ORÇ 27') >= 0 && tLL.indexOf(m2Manut) >= 0, 'linha a linha: 5º card com o R$/m² da conta (' + m2Manut + ')');
const tRes = textos(slides[iResManut]);
ok(tRes.indexOf('R$/M² AO MÊS') >= 0 && tRes.indexOf(G._orcMoeda_(d.total).replace(/^R\$ /, 'R$ ') ) >= 0 &&
   tRes.indexOf('R$ ' + G._orcM2_(d.total / areaOrc / 12)) >= 0, 'resumo da manutenção: card com o R$/m² ao mês');
const tMes = textos(slides[iMensal]);
ok(tMes[0] === 'Distribuição mensal' && tMes.filter(t => /^\d+,\d{2}\/m²$/.test(t)).length === d.meses.filter(v => v > 0.005).length,
   'distribuição mensal: cada mês com o R$/m² embaixo do valor');
const tM2m = textos(slides[iM2 + 1]);
ok(tM2m[0] === 'Custo por m² mês a mês — Orçamento 2027', 'custo por m² mês a mês depois do custo por m²');
ok(['Real 2025', 'Orç 2026', 'Ritmo 2026', 'Orç 2027', 'MÉDIA', 'CUSTO CONDOMÍNIO', 'Área comum (sem IPTU e seguro)', 'IPTU', 'Seguro',
    'Total de despesas', 'REAL 2025', 'Área (m², implícita)', G._orcMoeda_(rel.total.orc), G._orcM2_(serie('orc').media),
    'R$ ' + G._orcM2_(serie('orc').media) + '/m²'].every(t => tM2m.indexOf(t) >= 0),
   'm² mês a mês: linhas, tabela dos meses com média, custo do condomínio e área');
ok(!tM2m.some(t => /…$/.test(t)), 'm² mês a mês: nenhum texto cortado (' + tM2m.filter(t => /…$/.test(t)).join(' | ') + ')');
ok(!textos(slides[iSeg]).some(t => /^Não detalhado nos modelos/.test(t)) &&
   textos(slides[iSeg]).some(t => /^CONTRATO — EMPRESA AUXILIAR DE SEGURANÇA/.test(t)),
   'linha a linha da segurança lista os contratos, sem "não detalhado"');
ok(!textos(slides[iLimp]).some(t => /^Não detalhado nos modelos/.test(t)) &&
   textos(slides[iLimp]).some(t => /^CONTRATO — EMPRESA AUXILIAR/.test(t)),
   'linha a linha da limpeza lista os contratos, sem "não detalhado"');
ok(slides.every(sl => !textos(sl).some(t => /^Não detalhado nos modelos/.test(t))),
   'nenhuma das três contas em foco sobra com "não detalhado"');
ok(textos(slides[iSeg]).indexOf('MÊS A MÊS · R$ MIL') >= 0 && textos(slides[iSeg]).indexOf('Orç 2027') >= 0,
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
const tCapa = textos(slides[0]);
ok(['ORÇAMENTO 2027', G._orcCompacto_(rel.total.orc), '/m²', 'vs. ritmo 2026', 'Orçamento 2027, todas as contas',
    'R$ ' + G._orcM2_(rel.total.orc / G._orcAreaImplicita_(rel, 'orc') / 12)].every(t => tCapa.indexOf(t) >= 0),
   'capa: total do orçamento em dinheiro e em m² (' + tCapa.join(' | ') + ')');
// Curitiba é Demercado (ORC_MARCAS): nome e rodapé da marca, sem o slogan da
// Capital; depois da geração, o tema volta à Capital Realty.
ok(tCapa.indexOf('Demercado Investimentos · Facilities · Planejamento 2027') >= 0 && tCapa.indexOf('Expandir Eficiência') < 0 &&
   G.CR_DESIGN_SYSTEM.colors.brandDark === '#151E49' && G.LOGOS_CR.fullPositivo === G.ORC_MARCAS.CAPITAL.logos.fullPositivo,
   'Curitiba com a marca Demercado na capa; o tema volta à Capital no fim');
{
  const cores = [].concat.apply([], slides.slice(0, 8).map(x => x.shapes.map(s => s.cor))).filter(Boolean);
  ok(cores.indexOf('#00594F') >= 0 && cores.indexOf('#151E49') < 0, 'Curitiba: verde Demercado no lugar do azul da Capital (' +
     cores.filter((c, i) => cores.indexOf(c) === i).slice(0, 12).join(' ') + ')');
}
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
ok(titulo(slides[iInv]) === 'Manutenção: projetos × custo recorrente' &&
   titulo(slides[iM2]) === 'Custo por m² ao mês, 2025 → 2027', 'slides aprovados: investimento e custo por m²');
ok(slides.every(sl => textos(sl).indexOf('SUGESTÃO') < 0), 'nenhum slide com o selo SUGESTÃO');
const PENDENTES = /^(Cenários: o que dá para adiar|Contratos: concentração e reajustes|Contratos sem reajuste no orçamento|Fluxo mensal do orçamento|Outras leituras do orçamento)$/;
ok(!slides.some(sl => PENDENTES.test(titulo(sl) || '')), 'pendentes não são gerados');

// R$/m² fica abaixo de R$ 1: a variação não pode usar a tolerância de R$ 0,50.
const tM2 = textos(slides[iM2]);
ok(tM2.indexOf('▲ 9%') >= 0 && tM2.indexOf('▲ 48%') >= 0 && tM2.indexOf('0%') < 0 && tM2.indexOf('▲ novo') < 0,
   'R$/m²: Δ% real (total +9%, limpeza +48%), sem "0%" nem "novo"');
ok(m2Top.every(l => tM2.indexOf(l.nome) >= 0) && tM2.some(t => /^Demais contas \(\d+\)$/.test(t)),
   'R$/m²: o slide lista as 10 contas do top e as Demais');
ok(tM2.some(t => /o custo por m² sobe 9% contra o Ritmo/.test(t)), 'R$/m²: nota diz "custo por m² sobe 9%"');
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
// Divergência confirmada pela contabilidade: nem aviso no rodapé, nem selo,
// nem ⚠ na linha — só o log.
ok(!slides.some(sl => textos(sl).some(t => /^⚠/.test(t))), 'valeMetragem: nenhum ⚠ no deck');
ok(logGeracao.some(l => /vale a METRAGEM.*IPTU/.test(l)) && logGeracao.some(l => /vale a METRAGEM.*Seguro/.test(l)),
   'valeMetragem: a divergência de IPTU e Seguro continua no log');

// Sem o valeMetragem a mesma divergência abre o deck com a revisão: o slide
// lista os dois valores de cada conta; o selo vai nos slides com o total
// geral (e no linha a linha só se a conta divergir); a linha da conta ganha o ⚠.
const valeMetragemCur = CUR.relatorios.valeMetragem;
CUR.relatorios.valeMetragem = [];
decks = {};
G.gerarCuritiba();
const slidesRev = decks[CUR.deckId].getSlides();
CUR.relatorios.valeMetragem = valeMetragemCur;
ok(slidesRev.length === slides.length + 1 && titulo(slidesRev[1]) === 'Revisar antes da versão final',
   'sem valeMetragem: slide de revisão logo depois da capa');
const iR = i => i + 1;                                         // índice no deck com a revisão
ok(textos(slidesRev[iR(iDRE)]).some(t => /^⚠ Mensal ≠ METRAGEM em IPTU/.test(t)),
   'DRE de Curitiba avisa a divergência do mensal em IPTU e Seguro');
const tRev = textos(slidesRev[1]);
ok(['IPTU', 'Seguro', 'R$ 497.079', 'R$ 494.048', 'R$ 614.427', 'R$ 603.783'].every(t => tRev.indexOf(t) >= 0),
   'revisão: mensal × METRAGEM de IPTU e Seguro (' + tRev.filter(t => /^R\$/.test(t)).join(', ') + ')');
ok(tRev.some(t => /^DRE, (Ofensores|Defensores).*Ponte.*Custo por m²$/.test(t)), 'revisão: diz em que slides a conta aparece (' +
   tRev.filter(t => /^DRE/.test(t)).join(' | ') + ')');
ok(!tRev.some(t => /…$/.test(t)), 'revisão: nenhum texto cortado (' + tRev.filter(t => /…$/.test(t)).join(' | ') + ')');
const SELO = '⚠ REVISAR · IPTU, Seguro';
const comSeloIdx = [iSub[1] + 1, iSub[1] + 2, iDRE, iDRE + 1, iDRE + 2, iM2, iM2 + 1]
  .concat(Array.from({ length: nTodos }, (_, k) => iDRE + 3 + k)).map(iR);
ok(comSeloIdx.every(i => textos(slidesRev[i]).indexOf(SELO) >= 0), 'selo REVISAR em resumo, ponte, DRE, ofensores, defensores e os dois de custo por m²');
ok(slidesRev.filter(sl => textos(sl).indexOf(SELO) >= 0).length === comSeloIdx.length,
   'selo só nesses (linha a linha, investimento e manutenção não passam por IPTU/Seguro)');
const nAviso = sl => textos(sl).filter(t => t === '⚠').length;
ok(nAviso(slidesRev[iR(iDRE)]) === 2 && nAviso(slidesRev[iR(iM2)]) === 2, 'DRE e custo por m²: ⚠ nas linhas de IPTU e Seguro (DRE ' +
   nAviso(slidesRev[iR(iDRE)]) + ', m² ' + nAviso(slidesRev[iR(iM2)]) + ')');
ok(['⚠ IPTU', '⚠ Seguro'].every(t => textos(slidesRev[iR(iSub[1] + 2)]).indexOf(t) >= 0), 'ponte: degraus de IPTU e Seguro com ⚠');
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
if (aindaCortadas.length) G.ORC_TEXTOS_ABAS.forEach(n => PLANILHA_TEXTOS.getSheetByName(n).getDataRange().getValues().slice(1)
  .filter(r => r[3] === 'SIM' && r[2] !== 'ESCRITO PELO GESTOR').forEach(r => console.log('   cortado em ' + n + ': ' + r.slice(0, 5).join(' | '))));
ok(aindaCortadas.length === 0, 'com as propostas nenhum texto sai cortado (' + aindaCortadas.map(r => r[1]).join(' | ') + ')');
PLANILHA_TEXTOS = novaPlanilhaTextos();      // as próximas gerações comparam com o deck sem escolhas
LOG.length = 0;

console.log('Geração — cidade sem planilha');
decks = {};
G._orcGerar_(['VAZIA']);
ok(Object.keys(decks).join() === 'deck-vazia', 'cada cidade escreve só na sua apresentação (' + Object.keys(decks).join() + ')');
const sI = decks['deck-vazia'].getSlides();
ok(sI.length === 6, 'cidade vazia: capa, sumário, sub capa e slide de Premissas, aviso dos relatórios, aviso da manutenção (veio ' +
   sI.length + ')');
ok(titulo(sI[1]) === 'Sumário' && textos(sI[1]).indexOf('Premissas') >= 0 && textos(sI[1]).indexOf('DRE') < 0,
   'cidade vazia: o sumário lista só as seções que o deck tem');
ok(textos(sI[4]).some(t => t.indexOf('METRAGEM-COND ainda não foi') >= 0), 'aviso dos relatórios escrito no slide');
ok(textos(sI[5]).some(t => t.indexOf('ainda não foi configurada') >= 0), 'aviso da manutenção escrito no slide');
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

// ---------------- Pendências ----------------
console.log('Pendências de dados');
G.ORC_PENDENCIAS_GESTOR = PEND_GESTOR_REAL;
G.ORC_CONTRATOS_2026_NAO_ID = NAO_ID_REAL;
{
  const relC = G.obterRelatorioAnual_('CURITIBA');
  const pC = G._orcPendencias_(G.ORC_CIDADES.CURITIBA, relC, null, []).filter(p => p.tipo === '2026 não identificado');
  ok(pC.length === 2 && pC.some(p => /Itaú/.test(p.texto)) && pC.some(p => /PMOC/.test(p.texto)),
     'Curitiba: cerca elétrica do Itaú e PMOC como "2026 não identificado" no alerta (' + pC.map(p => p.texto).join(' | ') + ')');
}
{
  const cidX = G.ORC_CIDADES.ESTEIO;
  porId[cidX.relatorios.metragemId] = fixture('fixture_metragem_esteio.json');
  porId[cidX.relatorios.mensalId] = fixture('fixture_mensal_esteio.json');
  porId[cidX.despesasGeraisId] = fixture('fixture_090_esteio_2027.json');
  porId[cidX.servicosTerceirosId] = fixture('fixture_070_esteio_2027.json');
  const relX = G.obterRelatorioAnual_('ESTEIO'), menX = G.obterRelatorioMensal_('ESTEIO');
  const semCadastro = Object.assign({}, cidX, { contratosDoCadastro: false });
  const pX = G._orcPendencias_(semCadastro, relX, menX, G._orcLinhasModelosCidade_('ESTEIO').filter(l => l.linha !== 0));
  ok(pX.filter(p => p.tipo === 'Contratos 2027 não informados').length === 3, 'sem cadastro: as três contas pendentes');
  ok(pX.some(p => p.texto === 'R$ 120.068 em "Não detalhado" — sem os contratos de 2027 no cadastro'), 'pendência da segurança com o valor');
  ok(G._orcPendencias_(cidX, relX, menX, G._orcLinhasModelosCidade_('ESTEIO')).every(p => p.tipo !== 'Contratos 2027 não informados'),
     'com o cadastro: nenhuma conta sem contrato');
  // Perguntas em aberto com o gestor: entram como pendência da conta.
  const comPergunta = Object.assign({}, cidX, { nome: 'Mega Curitiba' });
  const pG = G._orcPendencias_(comPergunta, relX, menX, G._orcLinhasModelosCidade_('ESTEIO'))
    .filter(p => p.tipo === 'Decisão a confirmar');
  ok(pG.length === 1 && pG[0].chave === G._orcChaveConta_('Manutenção de imóveis') && /linha 4/.test(pG[0].texto),
     'pergunta em aberto do Mega vira pendência da Manutenção (selo ⚠ PENDENTE nos slides dela)');
}

// ---------------- Geração — Itajaí e Esteio ----------------
// Mesmo deck de Curitiba com os dados reais de cada cidade (fixtures de
// 05–06/10/2026). Sem planilhas de CONTRATOS ainda: os contratos ficam nos
// itens [CONTRATO] dos modelos e a diferença aparece como "Não detalhado".
const ESTADO_CIDADES = {};
['ITAJAI', 'ESTEIO'].forEach(chave => {
  const c = chave === 'ITAJAI' ? 'itajai' : 'esteio';
  const cid = G.ORC_CIDADES[chave];
  console.log('Geração — ' + cid.nome);
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porId[cid.despesasGeraisId] = fixture('fixture_090_' + c + '_2027.json');
  porId[cid.servicosTerceirosId] = fixture('fixture_070_' + c + '_2027.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  // Fluxo real: gera, aplica as propostas de texto curto, gera de novo.
  decks = {};
  G._orcGerar_([chave]);
  G.aplicarPropostasTextos();
  decks = {};
  G._orcGerar_([chave]);
  const sl = decks[cid.deckId].getSlides();
  const comFalha = sl.map((x, i) => [i + 1, textos(x).filter(t => t.indexOf('Falha ao gerar') === 0)]).filter(f => f[1].length);
  ok(!comFalha.length, c + ': nenhum slide com falha (' + comFalha.map(f => 'slide ' + f[0] + ': ' + f[1].join(' ')).join(' | ') + ')');
  const titulos = sl.map(titulo);
  ['Resumo executivo — Orçamento 2027', 'DRE — Orçamento 2027', 'Ofensores — Orçamento 2027', 'Defensores — Orçamento 2027',
   'Custo por m² mês a mês — Orçamento 2027', 'Manutenção de Imóveis — Orçamento 2027', 'Distribuição mensal']
    .forEach(t => ok(titulos.indexOf(t) >= 0, c + ': tem o slide "' + t + '"'));
  ok(titulos.some(t => /^Contratos — 2026 × Orçamento 2027/.test(t)), c + ': tem os contratos de todas as contas');
  ok(textos(sl[0]).indexOf(cid.nome) >= 0 && textos(sl[0]).indexOf('/m²') >= 0, c + ': capa com o Mega e o R$/m²');
  // Os relatórios fecham entre si; o slide de revisão só traz as pendências
  // de dados (19_Revisar.gs, _orcPendencias_).
  const iRev = titulos.indexOf('Revisar antes da versão final');
  ok(iRev === 1, c + ': slide de revisão logo depois da capa (pendências de dados)');
  if (chave === 'ITAJAI') {
    ok(['Sem provisão de 3%', 'Parcelado ou em dobro?'].every(t => textos(sl[iRev]).indexOf(t) >= 0) &&
       textos(sl[iRev]).indexOf('Reconferir (controladoria)') < 0,
       'Itajaí: as perguntas em aberto com o gestor no slide de revisão');
  }
  const tRev = iRev >= 0 ? textos(sl[iRev]) : [];
  ok(tRev.some(t => /dados pendentes/.test(t)) && !tRev.some(t => /não fecham entre si/.test(t)),
     c + ': revisão só com pendências — os relatórios fecham entre si');
  const iSegC = titulos.indexOf('Segurança e vigilância');
  // Cadastro "CONTRATOS-2027-COMPLETO" fecha exato com o que os modelos não
  // abrem na segurança e na limpeza. Na manutenção o 090 tem itens que a
  // METRAGEM não tem — Itajaí: totem (jan) e iluminação (fev); Esteio: as
  // duas linhas de vida (out) — e fica a pendência com o valor e os meses.
  const excesso = { itajai: 'itens somam R$ 29.313 a mais · JAN R$ 11.500 · FEV R$ 17.813',
                    esteio: 'itens somam R$ 15.268 a mais · OUT R$ 15.268' }[c];
  ok(tRev.indexOf('Modelos acima da METRAGEM') >= 0 && tRev.indexOf('Contratos 2027 não informados') < 0,
     c + ': pendência só da manutenção acima da METRAGEM');
  ok(tRev.indexOf(excesso) >= 0, c + ': pendência com o valor e os meses (' + tRev.filter(t => /^itens somam/.test(t)).join() + ')');
  ok(!sl.some(x => textos(x).some(t => /^Não detalhado nos modelos/.test(t))), c + ': nenhuma conta com "Não detalhado"');
  ok(textos(sl[iSegC]).indexOf(chave === 'ITAJAI' ? 'CONTRATO — PORTOVIG (VIGILÂNCIA)' : 'CONTRATO — VOIGT (SEGURANÇA)') >= 0,
     c + ': segurança com os contratos do cadastro');
  ok(!textos(sl[iSegC]).some(t => /^⚠/.test(t)), c + ': segurança sem selo');
  ok(textos(sl[titulos.indexOf('Manutenção de imóveis')]).indexOf('⚠ PENDENTE · Manutenção de imóveis') >= 0,
     c + ': manutenção com o selo ⚠ PENDENTE');
  ok(!textos(sl[titulos.indexOf('DRE — Orçamento 2027')]).some(t => /^⚠ PENDENTE/.test(t)), c + ': DRE sem o selo (pendência é da conta)');
  ok(textos(sl[titulos.indexOf('Custo por m² mês a mês — Orçamento 2027')]).indexOf('Real 2025') >= 0, c + ': m² mês a mês com o Real 2025');
  sl.forEach((x, i) => x.shapes.forEach(sh => {
    if (sh.tipo === 'ELLIPSE') return;
    const dentro = sh.x >= -0.5 && sh.y >= -0.5 && sh.x + sh.w <= W + 0.5 && sh.y + sh.h <= H + 0.5;
    if (!dentro) ok(false, c + ' slide ' + (i + 1) + ': ' + sh.tipo + ' fora da página "' + (sh.texto || '') + '"');
  }));
  const cortados = [];
  sl.forEach((x, i) => textos(x).forEach(t => { if (/…$/.test(t)) cortados.push((i + 1) + ' ' + titulo(x) + ' :: ' + t); }));
  ok(!cortados.length, c + ': nenhum texto cortado depois de aplicar as propostas (' + cortados.join(' | ') + ')');
  // PREVIA=<pasta>: grava as formas de cada slide (posição, cor, texto) para
  // ferramentas/previa_slides.py desenhar uma prévia sem abrir o Slides.
  if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'formas_' + c + '.json'),
    JSON.stringify({ W: W, H: H, slides: sl.map(x => ({ fundo: x.shapes.fundo, formas: x.shapes })) }));
  ESTADO_CIDADES[c] = { slides: sl.length, cortados: cortados, titulos: titulos,
                        naoDetalhado: sl.filter(x => textos(x).some(t => /^Não detalhado nos modelos/.test(t))).map(titulo) };
  console.log('  ' + sl.length + ' slides · ' + cortados.length + ' textos cortados com "…" · "não detalhado" em: ' +
              ESTADO_CIDADES[c].naoDetalhado.join(', '));
});
if (process.env.DETALHE) console.log(JSON.stringify(ESTADO_CIDADES, null, 1));

console.log('Degradê do véu');
// Faixas lado a lado deixavam listras na sub capa (07/10/2026): agora são
// camadas empilhadas a partir do lado opaco, e a opacidade acumulada segue a
// reta de alphaDe a alphaAte.
{
  const conferir = (op, lado) => {
    const sl = novoSlide(novoDeck());
    G._orcGradiente_(sl, 0, 0, 600, 400, '#151E49', '#151E49', op);
    const ret = sl.shapes;
    const n = op.passos, vert = !!op.vertical, L = vert ? 400 : 600;
    const ancorado = ret.every(r => lado === 'ini' ? (vert ? r.y : r.x) < 0.01 : Math.abs((vert ? r.y + r.h : r.x + r.w) - L) < 0.01);
    let erroMax = 0;
    for (let j = 0; j < n; j++) {
      const meio = (j + 0.5) * L / n;   // a partir do início (esquerda/topo)
      const cobre = ret.filter(r => { const a = vert ? r.y : r.x, b = a + (vert ? r.h : r.w); return a <= meio && meio <= b; });
      const acum = 1 - cobre.reduce((t, r) => t * (1 - r.alpha), 1);
      // a reta vai de alphaDe (primeira faixa) a alphaAte (última)
      const esperado = op.alphaDe + (op.alphaAte - op.alphaDe) * (j / (n - 1));
      erroMax = Math.max(erroMax, Math.abs(acum - esperado));
    }
    return { ancorado: ancorado, erroMax: erroMax, n: ret.length };
  };
  const r1 = conferir({ alphaDe: 0.55, alphaAte: 0, passos: 22 }, 'ini');
  ok(r1.ancorado && r1.erroMax < 0.01, 'véu da sub capa: camadas presas na esquerda e opacidade na reta (erro ' + r1.erroMax.toFixed(4) + ', ' + r1.n + ' camadas)');
  const r2 = conferir({ vertical: true, alphaDe: 0, alphaAte: 0.6, passos: 12 }, 'fim');
  ok(r2.ancorado && r2.erroMax < 0.01, 'véu de baixo da capa: camadas presas embaixo e opacidade na reta (erro ' + r2.erroMax.toFixed(4) + ')');
}

console.log('Deck único de Facilities');
// v2 (07/10/2026): uma apresentação, a abertura e uma seção por Mega, cada parte gerada numa execução e trocando só
// os slides dela, na posição dela.
{
  G.ORC_FACILITIES.deckId = 'FACILITIES';
  decks = {};
  const fac = G.SlidesApp.openById('FACILITIES');                 // o deck novo: um slide em branco
  PROPS_DADOS.ORC_FAC_INICIAL = JSON.stringify([fac.getSlides()[0].getObjectId()]);
  // Fora de ordem de propósito: Itajaí antes da abertura e de Curitiba.
  ['ITAJAI', 'ABERTURA', 'CURITIBA', 'ESTEIO'].forEach(p => G._orcGerarFacilities_(p));
  const sl = fac.getSlides(), ids = sl.map(x => x.getObjectId());
  const lista = p => JSON.parse(PROPS_DADOS['ORC_FAC_' + p] || '[]');
  const pos = p => lista(p).map(id => ids.indexOf(id));
  const ordemOk = ['ABERTURA', 'ESTEIO', 'ITAJAI', 'CURITIBA'].every((p, i, a) => i === 0 || Math.min.apply(null, pos(p)) > Math.max.apply(null, pos(a[i - 1])));
  ok(sl.length === ['ABERTURA', 'CURITIBA', 'ITAJAI', 'ESTEIO'].reduce((t, p) => t + lista(p).length, 0) && ordemOk && pos('ABERTURA')[0] === 0,
     'Facilities: abertura, Esteio, Itajaí e Curitiba em ordem, sem slide sobrando (' + sl.length + ' slides)');
  ok(textos(sl[0]).indexOf('Orçamento 2027, os três Megas') >= 0 && textos(sl[1])[0] === 'Sumário' &&
     textos(sl[2]).indexOf('Os Megas lado a lado — R$/m² ao mês') >= 0 && ['MEGA CURITIBA', 'MEGA ITAJAÍ', 'MEGA ESTEIO', 'FACILITIES'].every(t => textos(sl[2]).indexOf(t) >= 0),
     'Facilities: capa, sumário e o comparativo de R$/m² dos três Megas');
  ok(textos(sl[0]).indexOf('/m²') < 0 && !textos(sl[0]).some(t => /vs\. ritmo|[▲▼]/.test(t)),
     'Facilities: capa só com o total em R$, sem R$/m² nem Δ% contra o ritmo (Jonatas, 08/10/2026: distorce)');
  ok(sl.slice(0, 5).every(x => !textos(x).some(t => /…$/.test(t))),
     'Facilities: abertura sem texto cortado (' + sl.slice(0, 5).map(x => textos(x).filter(t => /…$/.test(t)).join(' | ')).join(' ') + ')');
  {
    const tR = textos(sl[4]);
    ok(tR[0] === 'Ranking dos Megas — R$/m² ao mês por conta' && tR.indexOf('Segurança e vigilância') >= 0 &&
       tR.indexOf('Segurança e vigilância') < tR.indexOf('Manutenção de imóveis') && !tR.some(t => /[▲▼]/.test(t)),
       'Facilities: ranking dos Megas depois do comparativo, Segurança no topo, sem variação (V4, aprovado 08/10/2026)');
  }
  const capaCur = fac.getSlideById(lista('CURITIBA')[0]);
  ok(capaCur && textos(capaCur).indexOf('Mega Curitiba') >= 0 && !lista('CURITIBA').some(id => textos(fac.getSlideById(id)).indexOf('Manutenção') >= 0 &&
     textos(fac.getSlideById(id))[0] === '04'), 'Facilities: cada Mega abre com a capa dele e não tem sub capas');
  const linksCapa = sl[1].shapes.filter(f => f.link).map(f => f.link);
  ok(['CURITIBA', 'ITAJAI', 'ESTEIO'].every(p => linksCapa.indexOf(lista(p)[0]) >= 0) && linksCapa.indexOf(ids[2]) >= 0,
     'Facilities: sumário com link para o comparativo e para a capa de cada Mega');
  // Gerar de novo um Mega troca só os slides dele, no mesmo lugar.
  const antesIt = pos('ITAJAI')[0], nAntes = sl.length, curAntes = lista('CURITIBA').join(), esAntes = lista('ESTEIO').join();
  G._orcGerarFacilities_('ITAJAI');
  const ids2 = fac.getSlides().map(x => x.getObjectId());
  ok(fac.getSlides().length === nAntes && lista('CURITIBA').join() === curAntes && lista('ESTEIO').join() === esAntes &&
     ids2.indexOf(lista('ITAJAI')[0]) === antesIt && fac.getSlides()[1].shapes.filter(f => f.link).map(f => f.link).indexOf(lista('ITAJAI')[0]) >= 0,
     'Facilities: gerar Itajaí de novo troca só os slides dele, no mesmo lugar, e refaz o link do sumário');
  // Troca de ordem (08/10/2026): um deck na ordem antiga (Curitiba antes de Esteio) se arruma ao gerar as partes de novo.
  {
    const ord = G.ORC_FACILITIES.partes.slice();
    G.ORC_FACILITIES.partes = ['ABERTURA', 'CURITIBA', 'ITAJAI', 'ESTEIO'];
    ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(p => G._orcGerarFacilities_(p));
    const velha = fac.getSlides().map(x => x.getObjectId());
    const pv = p => lista(p).map(id => velha.indexOf(id));
    const antigaOk = Math.min.apply(null, pv('ESTEIO')) > Math.max.apply(null, pv('CURITIBA'));
    G.ORC_FACILITIES.partes = ord;
    ['ABERTURA', 'ESTEIO', 'ITAJAI', 'CURITIBA'].forEach(p => G._orcGerarFacilities_(p));
    const nova = fac.getSlides().map(x => x.getObjectId());
    const pn = p => lista(p).map(id => nova.indexOf(id));
    const novaOk = ['ABERTURA', 'ESTEIO', 'ITAJAI', 'CURITIBA'].every((p, i, a) => i === 0 || Math.min.apply(null, pn(p)) > Math.max.apply(null, pn(a[i - 1])));
    ok(antigaOk && novaOk && nova.length === nAntes, 'Facilities: deck na ordem antiga passa para Esteio → Itajaí → Curitiba ao gerar as partes de novo');
  }
  if (process.env.PREVIA) {
    const rels = {}; G.ORC_FAC_MEGAS.forEach(k => { rels[k] = G.obterRelatorioAnual_(k); });
    fs.writeFileSync(path.join(process.env.PREVIA, 'comparativo_m2.json'), JSON.stringify(G._orcComparativoM2_(rels)));
  }
  if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'formas_facilities.json'),
    JSON.stringify({ W: W, H: H, slides: fac.getSlides().map(x => ({ fundo: x.shapes.fundo, formas: x.shapes })) }));
  G.ORC_FACILITIES.deckId = '';
  decks = {};
}

console.log('Grupo da manutenção decidido pelo gestor');
// 08/10/2026: só os itens listados mudam de grupo (exceção item a item).
{
  const achados = {};
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(k => {
    const cls = G._orcClassificarManutencao_(G.obterManutencao_(k));
    const nomes = ['contratos', 'recorrente', 'pontual', 'projetos'];
    cls.grupos.forEach((g, i) => g.itens.forEach(it => {
      const dec = G._orcGrupoDoGestor_(it.descricao);
      if (dec) achados[G._orcNorm_(it.descricao.replace(/^\s*\[[^\]]*\]\s*-?\s*/, ''))] = dec === nomes[i];
    }));
  });
  const faltam = G.ORC_GRUPO_MANUT_GESTOR.filter(e => achados[G._orcNorm_(e[0])] === undefined).map(e => e[0]);
  const errados = G.ORC_GRUPO_MANUT_GESTOR.filter(e => achados[G._orcNorm_(e[0])] === false).map(e => e[0]);
  ok(!faltam.length && !errados.length, 'gestor: os ' + G.ORC_GRUPO_MANUT_GESTOR.length + ' itens reclassificados estão nos modelos e no grupo dele' +
     (faltam.length ? ' — sem item: ' + faltam.join(' | ') : '') + (errados.length ? ' — grupo errado: ' + errados.join(' | ') : ''));
}

console.log('Cor da variação nos destaques');
ok(G._orcCorKpi_('▲ 21%', '#00594F') === G._ORC_COR_VAR.sobe && G._orcCorKpi_('▼ 3%', '#00594F') === G._ORC_COR_VAR.desce &&
   G._orcCorKpi_('R$ 4,49', '#00594F') === '#00594F', 'destaques: ▲ vermelho, ▼ verde, número na cor da marca (erro 1 da analista 4)');

console.log('Contratos: junções e renovações (08/10/2026)');
{
  const linhasDe = k => {
    const v = G._orcLerVisaoGeral_(k);
    const cmp = G._orcCompararTodosContratos_(v.rel, FIX_CAD_2026, G.ORC_CIDADES[k].nome, v.modelos, FIX_MOD_2026);
    const out = {};
    cmp.grupos.forEach(g => g.linhas.forEach(l => { out[l.nome] = Object.assign({ conta: g.conta }, l); }));
    return { l: out, cmp: cmp };
  };
  const show = (o, n) => o[n] ? n + ' ' + Math.round(o[n].ant) + '→' + Math.round(o[n].atual) + ' (' + o[n].situacao + ', ' + o[n].conta + ')' : n + ' AUSENTE';
  const it = linhasDe('ITAJAI'), es = linhasDe('ESTEIO'), cu = linhasDe('CURITIBA');
  if (process.env.VER_CONTRATOS) [it, es, cu].forEach(x => Object.keys(x.l).forEach(n => console.log('   ' + show(x.l, n))));
  const I = it.l, E = es.l, C = cu.l;
  ok(I['PORTOVIG VIGILÂNCIA'] && Math.round(I['PORTOVIG VIGILÂNCIA'].ant) === 1315649 && !Object.keys(I).some(n => /PORTVIG/.test(n)),
     'Itajaí: Portvig + Portovig numa linha, 2026 = R$ 1.315.649 (' + show(I, 'PORTOVIG VIGILÂNCIA') + ')');
  ok(I['PORTOVIG LIMPEZA E ZELADORIA'] && Math.round(I['PORTOVIG LIMPEZA E ZELADORIA'].ant) === 162211,
     'Itajaí: limpeza e zeladoria Portovig numa linha, 2026 = R$ 162.211 (' + show(I, 'PORTOVIG LIMPEZA E ZELADORIA') + ')');
  ok(I['LAURI BATISTA (DEDETIZAÇÃO)'] && Math.round(I['LAURI BATISTA (DEDETIZAÇÃO)'].ant) === 23421 && I['LAURI BATISTA (DEDETIZAÇÃO)'].atual > 0,
     'Itajaí: as 3 linhas da Lauri Batista numa só, com 2027 (' + show(I, 'LAURI BATISTA (DEDETIZAÇÃO)') + ')');
  ok(I['TAXAS AMBIENTAIS (AMZ 07 A 09)'] && Math.round(I['TAXAS AMBIENTAIS (AMZ 07 A 09)'].ant) === 6710,
     'Itajaí: Ambiental AMZ 07–09 em "TAXAS AMBIENTAIS" (' + show(I, 'TAXAS AMBIENTAIS (AMZ 07 A 09)') + ')');
  const arca = Object.keys(I).filter(n => /ARCA/.test(n)).map(n => I[n]);
  ok(arca.length === 1 && Math.round(arca[0].ant) === 88428 && /Mudou de conta/.test(arca[0].situacao),
     'Itajaí: Arca Agro numa linha, com o 2026 da Limpeza (' + arca.map(l => l.nome + ' ' + Math.round(l.ant) + '→' + Math.round(l.atual) + ' ' + l.situacao + ' ' + l.conta).join(' | ') + ')');
  const fire = Object.keys(I).filter(n => /FIRECAM/.test(n)).map(n => I[n]);
  ok(fire.length === 1 && /^Ano cheio/.test(fire[0].situacao), 'Itajaí: Firecam começou em jul/26 — "Ano cheio" (' + fire.map(l => l.situacao).join() + ')');
  const pmocI = Object.keys(I).filter(n => /PMOC|AR-COND/.test(n)).map(n => I[n]);
  ok(pmocI.length && pmocI.every(l => /não identificado/.test(l.situacao)), 'Itajaí: PMOC com "2026 não identificado" (' + pmocI.map(l => l.nome + ' ' + l.situacao).join() + ')');
  ok(E['EMPRESA DE SEGURANÇA'] && Math.round(E['EMPRESA DE SEGURANÇA'].ant) === 502815 && !Object.keys(E).some(n => /VOIGT/.test(n) && E[n].conta === E['EMPRESA DE SEGURANÇA'].conta),
     'Esteio: Voigt + nova empresa numa linha "EMPRESA DE SEGURANÇA" (' + show(E, 'EMPRESA DE SEGURANÇA') + ')');
  ok(E['RENTBRELLA (ARMAZÉNS A E B)'] && E['RENTBRELLA (ARMAZÉNS A E B)'].atual > 28000, 'Esteio: Rentbrella A e B numa linha (' + show(E, 'RENTBRELLA (ARMAZÉNS A E B)') + ')');
  ok(C['VIGILÂNCIA COM DRONE AUTÔNOMO'] && C['ROÇADA (LPU)'] && C['LIMPEZA (EMPRESA AUXILIAR)'] && C['LIMPEZA (EMPRESA AUXILIAR)'].atual > 490000,
     'Curitiba: drone, roçada e limpeza + escala unidos (' + ['VIGILÂNCIA COM DRONE AUTÔNOMO', 'ROÇADA (LPU)', 'LIMPEZA (EMPRESA AUXILIAR)'].map(n => show(C, n)).join(' | ') + ')');
  const itau = Object.keys(C).filter(n => /ITAÚ|ITAU/.test(n)).map(n => C[n]);
  ok(itau.length && itau.every(l => /não identificado/.test(l.situacao)) && G._orcContratosNaoIdentificados_(cu.cmp).length >= 1,
     'Curitiba: cerca elétrica do Itaú com "2026 não identificado" e na lista de pendências');
  [it, es, cu].forEach(x => perto(x.cmp.ant, x.cmp.grupos.reduce((t, g) => t + g.linhas.reduce((u, l) => u + l.ant, 0), 0), 'contratos: o total de 2026 fecha com as linhas depois das junções'));
}

console.log('Roçada do Esteio numa linha');
{
  const vE = G._orcLerVisaoGeral_('ESTEIO');
  const cmpE = G._orcCompararTodosContratos_(vE.rel, FIX_CAD_2026, 'Mega Esteio', vE.modelos, FIX_MOD_2026);
  const limp = cmpE.grupos.filter(g => G._orcChaveConta_(g.conta) === G._orcChaveConta_('Limpeza e conservação'))[0];
  const roc = limp ? limp.linhas.filter(l => l.nome === 'ROÇADA (LPU)') : [];
  ok(roc.length === 1 && Math.abs(roc[0].atual - 138626) < 2 && roc[0].ant > 15000 && !limp.linhas.some(l => /^ROÇADA –/.test(l.nome)) &&
     /^Era avulso em 2026 \(22 itens\)$/.test(roc[0].situacao),
     'contratos do Esteio: a roçada LPU numa linha só, 2026 = avulso da limpeza (' + roc.map(l => Math.round(l.ant) + ' → ' + Math.round(l.atual)).join() + ')');
}

console.log('Capa como imagem');
// Com "CAPA - MEGA <X>.jpg" na pasta de imagens de slide (capas_imagem.py), a
// capa é a imagem do slide inteiro e por cima só os logos e os números.
{
  const ESTEIO = G.ORC_CIDADES.ESTEIO;
  const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  const pedidos = [];
  // Molduras (v2): as que a geração anterior do Esteio anotou (mesmas assinaturas) estão na pasta.
  const MOLDS = Object.keys(G._ORC_MOLDURAS_USADAS).map(h => 'MOLDURA - ' + h + '.png');
  // Formas pelo motor: as imagens que a geração anterior anotou também estão na pasta.
  const GRAFS = Object.keys(G._ORC_GRAFICOS_USADOS).map(h => 'GRAFICO - ' + h + '.png');
  const TEM = ['CAPA - MEGA ESTEIO.jpg', 'SUBCAPA - MEGA ESTEIO - 04.jpg'].concat(MOLDS, GRAFS);
  const pasta = { getFilesByName: n => { pedidos.push(n); return iter(TEM.indexOf(n) >= 0 ? [{ getBlob: () => ({ nome: n, w: 1920, h: 1080 }) }] : []); } };
  ctx.DriveApp.getFolderById = id => ({ getFoldersByName: n => iter(n === G.ORC_PASTA_IMAGENS ? [pasta] : []) });
  decks = {};
  G._orcGerar_(['ESTEIO']);
  delete ctx.DriveApp.getFolderById;
  const capa = decks[ESTEIO.deckId].getSlides()[0];
  const img = capa.shapes.filter(s => s.tipo === 'IMAGE')[0];
  const tc = textos(capa);
  ok(img && img.nome === 'CAPA - MEGA ESTEIO.jpg' && img.x === 0 && img.y === 0 && Math.abs(img.w - W) < 0.01 && Math.abs(img.h - H) < 0.01,
     'capa: imagem do slide inteiro');
  ok(tc.indexOf('ORÇAMENTO 2027') < 0 && tc.indexOf('Mega Esteio') < 0 && tc.indexOf('Expandir Eficiência') < 0,
     'capa em imagem: títulos e rodapé ficam na imagem, não repetidos em texto');
  ok(tc.some(t => /^R\$ [\d,]+ (mil|mi)$/.test(t)) && tc.indexOf('/m²') >= 0 && tc.indexOf('vs. ritmo 2026') >= 0,
     'capa em imagem: os números da METRAGEM por cima, em texto (' + tc.join(' | ') + ')');
  // Sub capa em imagem: só a 04 tem imagem no dublê; as outras ficam com formas.
  const slE = decks[ESTEIO.deckId].getSlides();
  const sub4 = slE.filter(x => x.shapes.some(s => s.nome === 'SUBCAPA - MEGA ESTEIO - 04.jpg'))[0];
  const ts4 = sub4 ? textos(sub4) : [];
  ok(sub4 && ts4.indexOf('04') < 0 && ts4.indexOf('Manutenção') < 0 && ts4.some(t => /^R\$ [\d,]+ (mil|mi)$/.test(t)) &&
     ts4.indexOf('/m²') >= 0, 'sub capa em imagem: só os números da seção por cima (' + ts4.join(' | ') + ')');
  const areas = sub4 ? sub4.shapes.filter(s => s.link) : [];
  ok(areas.length === 6 && areas.every(s => s.alpha === 0.01), 'sub capa em imagem: 6 áreas clicáveis na trilha (7 seções), com link');
  ok(slE.some(x => textos(x)[0] === '05' && textos(x)[1] === 'Segurança'), 'sub capa sem imagem continua com formas');
  // Moldura em imagem: no fundo (primeira forma), sem os cards e sem barra/linha do cabeçalho em formas.
  const comMold = slE.filter(x => x.shapes[0] && /^MOLDURA - /.test(x.shapes[0].nome || ''));
  const llM = slE.filter(x => textos(x)[0] === 'Manutenção de imóveis')[0];
  ok(comMold.length >= 20 && llM && comMold.indexOf(llM) >= 0 &&
     !llM.shapes.some(f => f.tipo === 'ROUND_RECTANGLE' && f.w >= 60 && f.h >= 30) &&
     !llM.shapes.some(f => f.tipo === 'LINE' && f.y === G.CR_DESIGN_SYSTEM.layout.headerH) &&
     Math.abs(llM.shapes[0].w - W) < 0.01 && Math.abs(llM.shapes[0].h - H) < 0.01,
     'moldura em imagem: ' + comMold.length + ' slides com a moldura no fundo; cards e cabeçalho não viram formas');
  // Formas pelo motor: logo acima da moldura, a imagem das formas; no slide, só textos e imagens.
  const comHeader = slE.filter(x => comMold.indexOf(x) >= 0);
  const soTexto = x => x.shapes.every(f => f.tipo === 'TEXT_BOX' || f.tipo === 'IMAGE');
  ok(llM && /^GRAFICO - /.test(llM.shapes[1].nome || '') && Math.abs(llM.shapes[1].w - W) < 0.01 && soTexto(llM) &&
     comHeader.every(soTexto), 'formas pelo motor: ' + comHeader.filter(soTexto).length + ' de ' + comHeader.length +
     ' slides só com textos e imagens (a imagem das formas logo acima da moldura)');
  G._ORC_BLOBS = {};
}

console.log('Foto da sub capa');
// O branco que cobre a sobra da foto passa 2 pt da borda dela: borda com
// borda, o Slides deixava um fio cinza contornando a foto (07/10/2026).
{
  G._ORC_BLOBS = {};
  G._ORC_BLOBS['FOTO-TESTE@1600'] = { blob: { nome: 'foto', w: 1600, h: 900 } };
  const sl = novoSlide(novoDeck());
  const k = W / 720, bx = 410 * k, by = 30 * k, bw = 274 * k, bh = 262 * k;
  const pos = G._orcFotoEmBloco_(sl, W, H, 'FOTO-TESTE', bx, by, bw, bh, 0.4);
  const img = sl.shapes.filter(s => s.tipo === 'IMAGE')[0];
  const brancos = sl.shapes.filter(s => s.cor === '#FFFFFF');
  const f2 = 2 * k;
  const esq = brancos.filter(r => Math.abs(r.x + r.w - bx) < 0.01)[0];
  const dir = brancos.filter(r => Math.abs(r.x - (bx + bw)) < 0.01)[0];
  ok(pos && img && Math.abs(img.h - bh) < 0.01 && img.x < bx && img.x + img.w > bx + bw, 'foto cobre o bloco sem deformar (sobra dos dois lados)');
  ok(esq && esq.x <= Math.max(0, img.x - f2) + 0.01 && esq.y <= img.y - f2 + 0.01 && esq.y + esq.h >= img.y + img.h + f2 - 0.01,
     'branco da esquerda passa 2 pt da borda da foto');
  ok(dir && dir.x + dir.w >= Math.min(W, img.x + img.w + f2) - 0.01, 'branco da direita passa 2 pt da borda da foto (ou vai até a borda da página)');
  ok(brancos.every(r => r.x >= -0.01 && r.y >= -0.01 && r.x + r.w <= W + 0.01 && r.y + r.h <= H + 0.01), 'branco dentro da página');
  G._ORC_BLOBS = {};
}

console.log('Gravação no Slides');
// "Service unavailable: Slides" no fim da execução (Esteio, 07/10/2026):
// grava os slides novos, depois a remoção dos antigos, com nova tentativa.
{
  const ESTEIO = G.ORC_CIDADES.ESTEIO;
  decks = {};
  const d = novoDeck();
  decks[ESTEIO.deckId] = d;
  const antigo = d.getSlides()[0];
  d.falhasAoSalvar = 2;                       // duas recusas, a terceira passa
  LOG.length = 0;
  PEDIDOS_DRIVE.length = 0;
  G._orcGerar_(['ESTEIO']);
  const nSub = d.getSlides().filter(x => /^0\d$/.test(textos(x)[0] || '')).length;
  ok(nSub === 7 && d.salvos === nSub + 1,
     'Slides ocupado: uma gravação por seção + a da remoção, depois de tentar de novo (' + d.salvos + ' gravações, ' + nSub + ' seções)');
  ok(PEDIDOS_DRIVE.filter(id => id === G.LOGOS_CR.fullPositivo).length === 1, 'logo do cabeçalho pedido ao Drive uma vez só');
  ok(PEDIDOS_DRIVE.filter(id => id === ESTEIO.fotoFundoId).length === 1, 'foto do Mega (capa e Resumo) pedida uma vez só');
  ok(LOG.some(m => /^Mega Esteio · leitura das planilhas: [\d,]+ s$/.test(m)) &&
     LOG.some(m => /^Mega Esteio · Manutenção: [\d,]+ s desenhando \+ [\d,]+ s gravando \(total [\d,]+ s\)$/.test(m)),
     'log com o tempo da leitura e de cada seção');
  ok(LOG.filter(m => /^Slides ocupado/.test(m)).length === 2, 'cada nova tentativa fica no log');
  ok(d.getSlides().indexOf(antigo) < 0 && d.getSlides().length > 1, 'slide antigo apagado, novos ficam');

  decks = {};
  const d2 = novoDeck();
  decks[ESTEIO.deckId] = d2;
  const antigo2 = d2.getSlides()[0];
  d2.falhasAoSalvar = 99;
  let erro = null;
  try { G._orcGerar_(['ESTEIO']); } catch (e) { erro = e; }
  ok(erro && /O Slides não gravou os slides novos de Mega Esteio/.test(erro.message) && /Rode a geração de novo/.test(erro.message),
     'Slides fora do ar: para com mensagem do que fazer (' + (erro && erro.message) + ')');
  ok(d2.getSlides().indexOf(antigo2) >= 0, 'sem gravar os novos, o slide antigo não é apagado');

  // Apresentação com sobra de gerações que falharam: os antigos saem logo no
  // começo (uma gravação), o primeiro sai no fim, e nada antigo fica.
  decks = {};
  const d4 = novoDeck();
  decks[ESTEIO.deckId] = d4;
  for (let i = 0; i < 4; i++) d4.appendSlide();
  const antigos4 = d4.getSlides();
  LOG.length = 0;
  G._orcGerar_(['ESTEIO']);
  const nSub4 = d4.getSlides().filter(x => /^0\d$/.test(textos(x)[0] || '')).length;
  ok(antigos4.every(s => d4.getSlides().indexOf(s) < 0), 'apresentação com 5 slides antigos: nenhum sobra');
  ok(d4.salvos === nSub4 + 2 && LOG.some(m => /4 slides antigos apagados antes de gerar/.test(m)),
     'limpeza dos antigos é a primeira gravação (' + d4.salvos + ' gravações, ' + nSub4 + ' seções)');

  // "Service timed out" (Curitiba, 07/10/2026) também tenta de novo.
  decks = {};
  const d3 = novoDeck();
  decks[ESTEIO.deckId] = d3;
  d3.falhasAoSalvar = 1; d3.msgFalha = 'Service timed out: Slides';
  LOG.length = 0;
  let erro3 = null;
  try { G._orcGerar_(['ESTEIO']); } catch (e) { erro3 = e; }
  ok(!erro3 && LOG.some(m => /^Slides ocupado.*timed out/.test(m)), 'Slides lento (timed out): tenta de novo e termina (' + (erro3 && erro3.message) + ')');
}

console.log('\n' + (total - falhas) + '/' + total + ' asserções ok');
// Manifesto das molduras (v2): assinatura -> especificacao de toda moldura que
// os tres Megas usaram; ferramentas/molduras_imagem.py desenha as imagens.
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'molduras.json'), JSON.stringify(G._ORC_MOLDURAS_USADAS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'graficos.json'), JSON.stringify(G._ORC_GRAFICOS_USADOS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'graficos_passos.json'), JSON.stringify(G._ORC_GRAFICOS_PASSOS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'molduras_passos.json'), JSON.stringify(G._ORC_MOLDURAS_PASSOS, null, 1));
process.exit(falhas ? 1 : 0);
