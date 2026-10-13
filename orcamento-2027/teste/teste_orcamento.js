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
    remove: () => { slide.removido = true; deck._slides = deck._slides.filter(s => s !== slide); },
    // Anotações do apresentador (marca dos slides de fotos do gestor, 26_Fotos.gs) e mudança de posição.
    notas: '',
    getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({
      setText: t => { slide.notas = String(t); }, asString: () => slide.notas }) }) }),
    move: i => { deck._slides = deck._slides.filter(s => s !== slide); deck._slides.splice(i, 0, slide); },
    // Formas com texto (27_Atualizar.gs acha o título do slide por aqui).
    // Posição e troca de texto: 29_GestorRevisado.gs corrige as cópias dos slides do gestor.
    getShapes: () => slide.shapes.filter(r => r.tipo !== 'IMAGE' && r.tipo !== 'LINE')
      .map(r => ({ getLeft: () => r.x, getTop: () => r.y, getWidth: () => r.w, getHeight: () => r.h,
                   getText: () => ({ asString: () => r.texto || '', setText: t => { r.texto = String(t); },
                                     replaceAllText: (de, para) => { const p = String(r.texto || '').split(de); r.texto = p.join(para); return p.length - 1; } }),
                   // Link para outro slide (31_VersaoFinal.gs refaz os que iam para slides que saíram).
                   getLink: () => r.link ? { getSlideId: () => r.link } : null,
                   setLinkSlide: alvo => { r.link = alvo.getObjectId(); }, removeLink: () => { delete r.link; } })),
    // Tabelas (forma TABLE com celulas[linha][coluna]): 29_GestorRevisado.gs refaz a tabela do slide do gestor.
    getTables: () => slide.shapes.filter(r => r.tipo === 'TABLE').map(r => ({
      getNumRows: () => r.celulas.length, getNumColumns: () => r.celulas[0].length,
      getCell: (i, j) => ({ getText: () => ({ asString: () => r.celulas[i][j] + '\n', setText: t => { r.celulas[i][j] = String(t); } }) }) })),
    // Elementos da página (cópia de um slide da v3, 28_Moked.gs): tipo, posição, texto e remoção.
    getPageElements: () => slide.shapes.slice().map(reg => ({
      getPageElementType: () => reg.tipo === 'IMAGE' ? 'IMAGE' : reg.tipo === 'LINE' ? 'LINE' : reg.tipo === 'TABLE' ? 'TABLE' : 'SHAPE',
      getLeft: () => reg.x, getTop: () => reg.y, getWidth: () => reg.w, getHeight: () => reg.h,
      asShape: () => ({ getText: () => ({ asString: () => (reg.texto || '') + '\n' }) }),
      remove: () => { const i = slide.shapes.indexOf(reg); if (i >= 0) slide.shapes.splice(i, 1); }
    }))
  };
  return slide;
}
function novoDeck() {
  const deck = { _slides: [] };
  deck._slides.push(novoSlide(deck));                    // o slide em branco inicial
  deck.getPageWidth = () => W;
  deck.getPageHeight = () => H;
  deck.getSlides = () => deck._slides.slice();
  // appendSlide(slide de outra apresentação) copia as formas e as anotações (28_Moked.gs copia slides da v3).
  deck.appendSlide = origem => {
    const s = novoSlide(deck);
    if (origem && origem.shapes) { origem.shapes.forEach(r => s.shapes.push(Object.assign(JSON.parse(JSON.stringify(r)), { id: 'e' + (++idForma) }))); s.notas = origem.notas; }
    deck._slides.push(s);
    return s;
  };
  // insertSlide(i, slide de outra apresentação) também copia (31_VersaoFinal.gs); com layout, slide em branco.
  deck.insertSlide = (i, origem) => {
    const s = novoSlide(deck);
    if (origem && origem.shapes) { origem.shapes.forEach(r => s.shapes.push(Object.assign(JSON.parse(JSON.stringify(r)), { id: 'e' + (++idForma) }))); s.notas = origem.notas; }
    deck._slides.splice(i, 0, s);
    return s;
  };
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
    PageElementType: { SHAPE: 'SHAPE', IMAGE: 'IMAGE', LINE: 'LINE', TABLE: 'TABLE', GROUP: 'GROUP' },
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
// O teste todo roda com a METRAGEM oficial (orcDosModelos desligado): é o
// fluxo que volta quando a controladoria fechar a METRAGEM. O Orç calculado
// pelos modelos tem a sua seção, "Orç 2027 calculado pelos modelos".
const ORC_DOS_MODELOS_CONFIG = {};
Object.keys(G.ORC_CIDADES).forEach(k => {
  ORC_DOS_MODELOS_CONFIG[k] = !!G.ORC_CIDADES[k].relatorios.orcDosModelos;
  G.ORC_CIDADES[k].relatorios.orcDosModelos = false;
});
// Desde 12/10/2026 os três Megas leem os modelos 070/090 de uma planilha com
// todas as unidades (ORC_MODELO_090_ID / _070_ID, filtrada por unidadeModelo).
// O teste antigo roda com as planilhas por Mega de antes
// (fixture_090_<cidade>_2027.json), cada Mega com um ID próprio; a seção
// "Modelos de todas as unidades" testa a exportação completa.
const MODELOS_CONFIG = {};
Object.keys(G.ORC_CIDADES).forEach(k => {
  const cid = G.ORC_CIDADES[k];
  MODELOS_CONFIG[k] = { d: cid.despesasGeraisId, s: cid.servicosTerceirosId };
  if (cid.unidadeModelo) { cid.despesasGeraisId = 'teste-090-' + k; cid.servicosTerceirosId = 'teste-070-' + k; }
});
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
// 12/10/2026: o total avisa que traz IPTU e seguro (Guilherme: "sinalizar quando IPTU tiver incluso").
ok(ldre[0].nome === 'DESPESAS OPERACIONAIS (COM IPTU E SEGURO)' && ldre[0].nome === G.ORC_TOTAL_COM_IPTU && ldre[1].tipo === 'm2' &&
   !ldre.some(l => /ÁREA COMUM/.test(l.nome)), 'DRE: um total (Despesas Operacionais, com IPTU e seguro), sem Área Comum');
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
// Desde 12/10/2026 a área comum usa a mesma área das linhas e dos outros
// slides (o R$/m² escrito na METRAGEM dava 3,46 contra 3,45 na média).
perto(m2m.custo.ritmo.areaComum.m2, rel.areaComum.ritmo / G._orcAreaImplicita_(rel, 'ritmo') / 12,
      'm² mensal: R$/m² da área comum pela área implícita do total, a mesma das linhas');
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
// 8 desde 09/10/2026: a 08 é o Registro fotográfico (slides do gestor, 26_Fotos.gs).
const SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Manutenção', 'Segurança', 'Limpeza e Conservação', 'Custo por m²', 'Registro fotográfico'];
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
ok(textos(slides[iSub[6]]).some(t => /^R\$ [\d,]+$/.test(t)) && textos(slides[iSub[6]]).indexOf('por m², com IPTU e seguro') >= 0,
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
const N_POR_QUE = 1;   // desde 09/10/2026 sai em todo Mega (sem obra adiada: Orç anterior × Ritmo × Orç)
// …e logo depois as demais variações item a item (V16, 09/10/2026): sai com as decisões na base ritmo (semPar).
const N_VAR = G.ORC_DECISOES_GESTOR['Mega Curitiba'].semPar ? 1 : 0;
// Projetos × recorrente: o slide e as páginas dos itens de cada grupo (dentro da Manutenção).
const nGrupos = G._orcPaginasGrupos_(G._orcClassificarManutencao_(d)).length;
// resumo, a conta, por que sobe, avulsos abertos + item a item, demais, categorias, mensal (08/10/2026: o resumo
// abre a seção e o "contratos e avulsos" saiu)
const N_MANUT = 1 + nLL[0] + N_POR_QUE + N_VAR + 1 + nGrupos + nPagDemais + div.proprias.length + 1;
// Curitiba diverge de verdade (mensal × METRAGEM em IPTU e Seguro), mas a
// contabilidade mandou usar a METRAGEM (valeMetragem): sem slide de revisão.
// Contratos de todas as contas (22_ContratosTodos.gs), depois dos defensores.
const cmpTodos = G._orcCompararTodosContratos_(rel, FIX_CAD_2026, 'Mega Curitiba', modelos, FIX_MOD_2026);
const nTodos = G._orcPaginasContratos_(cmpTodos).length;
const N_ESPERADO = 2 + SECOES.length + 1 + 2 + 3 + nTodos + N_MANUT + nLL[1] + nLL[2] + 2 + 3;   // + os 3 moldes de fotos
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
ok(textos(slides[iDRE]).indexOf('DRE — Orçamento 2027') >= 0 && textos(slides[iDRE]).indexOf(G.ORC_TOTAL_COM_IPTU) >= 0,
   'DRE logo depois da sub capa');
const tOf = textos(slides[iDRE + 1]), tDf = textos(slides[iDRE + 2]);
ok(tOf[0] === 'Ofensores — Orçamento 2027' && tOf.some(t => /^OFENSORES/.test(t)) && !tOf.some(t => /^DEFENSORES/.test(t)),
   'um slide só de ofensores');
ok(tDf[0] === 'Defensores — Orçamento 2027' && tDf.some(t => /^DEFENSORES/.test(t)) && !tDf.some(t => /^OFENSORES/.test(t)),
   'um slide só de defensores');
ok(tOf.indexOf('DESPESAS OPERACIONAIS') >= 0 && tDf.indexOf('DESPESAS OPERACIONAIS') >= 0, 'DESPESAS OPERACIONAIS (total geral, nome da DRE) fecha os dois');
// O aviso de IPTU e seguro vai no subtítulo (a coluna CONTA não cabe o rótulo inteiro).
ok([tOf, tDf].every(t => t.some(x => /total com IPTU e seguro$/.test(x))), 'ofensores e defensores: "total com IPTU e seguro" no subtítulo');
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
const iVar = iPorQue + N_POR_QUE, iInv = iVar + N_VAR;
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
  ok(G._orcAdiados2026_(G.ORC_CIDADES.ESTEIO, G.obterManutencao_('CURITIBA')) === null, 'Mega sem obra adiada: sem obras (o slide sai com o quadro Orç anterior × Ritmo × Orç)');
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
ok(iSub[6] === iLimp + nLL[2] && iSub[7] === iSub[6] + 3, 'Custo por m² depois da sua sub capa, antes do Registro fotográfico');
// 08 · Registro fotográfico: os três moldes (1, 2 e 3 fotos) fecham o deck, marcados nas anotações como do gestor.
{
  const fotos = slides.slice(iSub[7] + 1);
  const espacos = sl => sl.shapes.filter(f => f.tipo === 'RECTANGLE' && f.cor === '#E8EEF5').length;
  ok(fotos.length === 3 && fotos.every(sl => titulo(sl) === 'Registro fotográfico — Título do assunto' && sl.notas.indexOf('[REGISTRO FOTOGRÁFICO · CURITIBA]') === 0) &&
     fotos.map(espacos).join() === '1,2,3' && fotos.every(sl => textos(sl).some(t => /^Escreva aqui a descrição/.test(t))),
     'Registro fotográfico: 1, 2 e 3 fotos com a descrição, marcados como slides do gestor (' + fotos.map(espacos).join() + ')');
}
// As demais variações item a item (V16): os degraus somam exatamente o "demais
// variações" da ponte. A diferença ritmo item a item × METRAGEM não vira degrau
// (Guilherme, 12/10/2026, nos três Megas): fica em "não se repetem".
{
  const adiC = G._orcAdiados2026_(CUR, G.obterManutencao_('CURITIBA'));
  LOG.length = 0;
  const vi = G._orcVariacoesItens_(CUR, G.obterManutencao_('CURITIBA'), contasLL[0], adiC);
  const vM = contasLL[0].v, soma = vi.blocos.reduce((t, b) => t + b.v, 0);
  ok(N_VAR === 1 && titulo(slides[iVar]) === 'Por que a manutenção sobe: as demais variações',
     'demais variações logo depois do "por que sobe"');
  perto(soma, vM.orc - vM.ritmo - adiC.total, 'demais variações: os degraus fecham com a ponte (R$ ' + Math.round(soma) + ')');
  ok(vi.blocos.length === 3 && !vi.blocos.some(b => /METRAGEM|090/.test(b.nome + b.curto + b.expl)) &&
     /^gastos do Ritmo 2026 sem item em 2027$/.test(vi.blocos[2].expl) && LOG.some(l => /item a item .* × METRAGEM .*não se repetem/.test(l)),
     'demais variações: sem degrau "METRAGEM × itens" — a diferença fica em "não se repetem" e no log (' +
     vi.blocos.map(b => b.curto + ' ' + Math.round(b.v)).join(' | ') + ')');
  ok(!textos(slides[iVar]).some(t => /METRAGEM × itens|METRAGEM × ITENS|controladoria/.test(t)), 'demais variações: o slide não fala em METRAGEM × itens');
  ok(vi.altas.length === 5 && vi.quedas.length === 5 && vi.altas[0].d >= vi.altas[4].d && vi.quedas[0].d <= vi.quedas[4].d,
     'demais variações: 5 maiores altas e 5 maiores quedas, em ordem');
  const tV = textos(slides[iVar]);
  ok(tV.indexOf('SOBEM') >= 0 && tV.indexOf('CAEM') >= 0 && tV.some(t => /^\+R\$ 252 mil \(\+R\$ 0,08\/m² ao mês\)|^Além das obras adiadas, \+R\$ 252 mil \(\+R\$ 0,08\/m²/.test(t)),
     'demais variações: subtítulo em R$ e R$/m² igual ao degrau da ponte (' + tV[1] + ')');
  ok(G._orcVariacoesItens_(CUR, null, contasLL[0], adiC) === null, 'sem o modelo: sem o slide');
}
// Itens de cada grupo (V19): um quadro por grupo, com o total e todos os itens.
{
  const clsT = G._orcClassificarManutencao_(d);
  const pagsT = slides.slice(iInv + 1, iInv + 1 + nGrupos);
  const tG = pagsT.reduce((t, s) => t.concat(textos(s)), []);
  ok(nGrupos >= 1 && pagsT.every(s => /^Manutenção: os itens de cada grupo/.test(titulo(s))),
     'itens de cada grupo: ' + nGrupos + ' página(s)');
  clsT.grupos.forEach((g, i) => {
    if (!g.itens.length) return;
    const linhas = G._orcItensQuadro_(g);
    perto(linhas.reduce((t, x) => t + x.total, 0), g.total, 'quadro ' + G.ORC_GRUPOS_MANUT_TITULO[i] + ': as linhas somam o grupo');
    ok(tG.indexOf(G.ORC_GRUPOS_MANUT_TITULO[i]) >= 0 && tG.indexOf(G._orcMoeda_(g.total)) >= 0 &&
       linhas.every(x => tG.indexOf(G._orcMoeda_(x.total)) >= 0),
       'quadro ' + G.ORC_GRUPOS_MANUT_TITULO[i] + ': título, total e o valor de cada uma das ' + linhas.length + ' linhas');
  });
  ok(!tG.some(t => G.ORC_GRUPOS_MANUT_SELO && G.ORC_GRUPOS_MANUT_SELO.indexOf(t) >= 0) && !tG.some(t => t === 'GRUPO'),
     'itens de cada grupo: sem a coluna GRUPO e sem o selo repetido');
  const lv = G._orcItensQuadro_(clsT.grupos[3]).filter(x => x.juntos);
  ok(lv.length === 1 && lv[0].juntos === 9 && /^LINHA DE VIDA .*— AMZ 1 a 9 \(9×\)$/.test(lv[0].descricao) && tG.indexOf(lv[0].descricao) >= 0,
     'as 9 linhas de vida iguais (AMZ 1 a 9) numa linha só (' + (lv[0] && lv[0].descricao) + ')');
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
ok(['ORÇAMENTO 2027', G._orcCompacto_(rel.total.orc), '/m²', 'Ritmo 2026', G._orcCompacto_(rel.total.ritmo), 'Orçamento 2027, com IPTU e seguro',
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
// Células da coluna FONTE: "—" ou a fonte guardada (32_Fontes.gs), na coluna do cabeçalho FONTE.
const nFonte = sl => { const h = sl.shapes.filter(x => x.texto === 'FONTE')[0];
  return h ? sl.shapes.filter(x => x !== h && x.texto && Math.abs(x.x - h.x) < 1.5 && x.y > h.y + 2).length : 0; };
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
// Guilherme, 12/10/2026: "aparece o valor no final, tire isso" — o detalhamento é só a descrição.
ok(linhasAba('Ofensores').slice(1).every(r => !/ · R\$ /.test(r[1])) &&
   ![iDRE + 1, iDRE + 2].some(i => textos(slides[i]).some(t => / · R\$ [\d.,]+ (mil|mi)$/.test(t))),
   'ofensores e defensores: detalhamento sem o valor do item no fim');

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

// Detalhamento por conta (gestor, 12/10/2026): toda conta dos ofensores/defensores tem a linha
// "MEGA CURITIBA · CONTA" na aba Ofensores, mesmo sem item nos modelos; o que ele escreve nela vale no
// slide. E o que ele escreve fora das colunas do gerador (coluna G, linhas criadas por ele) não some.
const shOf = plTx.getSheetByName('Ofensores');
const visOf = G._orcLerVisaoGeral_('CURITIBA'), qOf = G._orcOfensores_(visOf.rel);
const contasOf = qOf.ofensores.contas.concat(qOf.defensores.contas).filter(c => c.chave);
const chavesOf = contasOf.map(c => G._orcChaveDetalheConta_(CUR, c.nome));
let lOf = shOf.getDataRange().getValues();
ok(chavesOf.length > 5 && chavesOf.every(k => lOf.filter(r => r[0] === k).length === 1),
   'aba Ofensores: uma linha "MEGA CURITIBA · CONTA" por conta dos ofensores e defensores (' + chavesOf.length + ')');
const semItemOf = contasOf.filter(c => !G._orcItensDaConta_(visOf.modelos, c.chave).length).map(c => G._orcChaveDetalheConta_(CUR, c.nome));
ok(semItemOf.length > 0 && semItemOf.every(k => lOf.filter(r => r[0] === k)[0][1] === ''),
   'conta sem item nos modelos ganha a linha em branco para o gestor preencher (' + semItemOf.join(', ') + ')');
const kOf = semItemOf[0], iKOf = lOf.findIndex(r => r[0] === kOf);
shOf.getRange(iKOf + 1, 3, 1, 1).setValues([['EXPLICAÇÃO DO GESTOR']]);
shOf.getRange(2, 7, 1, 1).setValues([['anotação na coluna G']]);
const nOf = shOf.getLastRow();
shOf.getRange(nOf + 1, 3, 1, 1).setValues([['LINHA CRIADA PELO GESTOR']]);
shOf.getRange(nOf + 1, 7, 1, 1).setValues([['DESPESA DE PESSOAL']]);
decks = {};
G.gerarCuritiba();
const sOf = decks[CUR.deckId].getSlides();
lOf = shOf.getDataRange().getValues();
ok(lOf[1][6] === 'anotação na coluna G' && lOf[nOf][2] === 'LINHA CRIADA PELO GESTOR' && lOf[nOf][6] === 'DESPESA DE PESSOAL',
   'nova geração não apaga a coluna G nem a linha criada pelo gestor (' + JSON.stringify([lOf[1][6], lOf[nOf]]) + ')');
const tOfG = textos(sOf[iDRE + 1]).concat(textos(sOf[iDRE + 2]));
ok(tOfG.indexOf('EXPLICAÇÃO DO GESTOR') >= 0 && lOf.filter(r => r[0] === kOf)[0][1] === 'EXPLICAÇÃO DO GESTOR',
   'texto do gestor na linha da conta vira o detalhamento, sem o valor de item');
ok(tOfG.some(t => /detalhamento: nota da gestão ou maior item/.test(t)), 'rodapé: o detalhamento tem nota da gestão');
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
  // 12/10/2026: os dois achados no razão de 2026 (ORC_CONTRATOS_ANT_RITMO) saem do alerta.
  const pC = G._orcPendencias_(G.ORC_CIDADES.CURITIBA, relC, null, []).filter(p => p.tipo === '2026 não identificado');
  ok(pC.length === 0, 'Curitiba: Itaú e PMOC achados no razão de 2026 — fora do alerta "2026 não identificado" (' +
     pC.map(p => p.texto).join(' | ') + ')');
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
  // Perguntas em aberto com o gestor: entram como pendência da conta. Pergunta de teste — as reais
  // foram todas respondidas em 12/10/2026 (ORC_PENDENCIAS_GESTOR vazio nos três Megas).
  G.ORC_PENDENCIAS_GESTOR['Mega Teste'] = [{ conta: 'Manutenção de imóveis', tipo: 'Decisão a confirmar', texto: 'Pergunta de teste, linha 4' }];
  const comPergunta = Object.assign({}, cidX, { nome: 'Mega Teste' });
  const pG = G._orcPendencias_(comPergunta, relX, menX, G._orcLinhasModelosCidade_('ESTEIO'))
    .filter(p => p.tipo === 'Decisão a confirmar');
  delete G.ORC_PENDENCIAS_GESTOR['Mega Teste'];
  ok(pG.length === 1 && pG[0].chave === G._orcChaveConta_('Manutenção de imóveis') && /linha 4/.test(pG[0].texto),
     'pergunta em aberto do Mega vira pendência da Manutenção (selo ⚠ PENDENTE nos slides dela)');
  ok(['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'].every(n => !(G.ORC_PENDENCIAS_GESTOR[n] || []).length),
     'nenhuma pergunta em aberto com o gestor nos três Megas (12/10/2026)');
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
  // Orç do ano anterior na ponte e no "por que sobe", nos três Megas (09/10/2026).
  const tPonteC = textos(sl[titulos.indexOf('Ponte Ritmo 2026 → Orçamento 2027')] || { shapes: [] });
  const tPQC = textos(sl[titulos.indexOf('Por que a manutenção sobe — Orçamento 2027')] || { shapes: [] });
  ok(tPonteC.indexOf('ORÇ 2026') >= 0 && tPonteC.indexOf('ORÇ 2026 → ORÇ 2027') >= 0 && tPQC.indexOf('ORÇ 2026') >= 0 &&
     (c !== 'esteio' || (tPQC.indexOf('VARIAÇÃO') >= 0 && tPQC.indexOf('R$/M² AO MÊS') >= 0 && tPQC.some(t => /área implícita muda/.test(t)))),
     c + ': ponte e "por que sobe" com o Orç 2026' + (c === 'esteio' ? ' (sem obra adiada: quadro Orç × Ritmo × Orç e o aviso da área)' : ''));
  ok(textos(sl[0]).indexOf(cid.nome) >= 0 && textos(sl[0]).indexOf('/m²') >= 0, c + ': capa com o Mega e o R$/m²');
  // Os relatórios fecham entre si; o slide de revisão só traz as pendências
  // de dados (19_Revisar.gs, _orcPendencias_).
  const iRev = titulos.indexOf('Revisar antes da versão final');
  ok(iRev === 1, c + ': slide de revisão logo depois da capa (pendências de dados)');
  if (chave === 'ITAJAI') {
    // 12/10/2026: o gestor pôs a provisão de 3% e puxou as quatro obras para 2026 — perguntas respondidas.
    ok(['Sem provisão de 3%', 'Parcelado ou em dobro?', 'Reconferir (controladoria)'].every(t => textos(sl[iRev]).indexOf(t) < 0),
       'Itajaí: perguntas do gestor respondidas (provisão de 3% e as quatro obras) — fora do slide de revisão');
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
  // Os itens que fazem a diferença, com o mês e o que fazer (09/10/2026): Itajaí = totem (JAN) e as duas
  // iluminações (FEV); Esteio = as duas linhas de vida (OUT; R$ 2 de arredondamento da METRAGEM).
  const itensFora = { itajai: ['MANUTENÇÃO E PINTURA DO TOTEM MEGA', 'INSTALAÇÃO DE ILUMINAÇÃO ADICIONAL NA LATERAL DO AMZ 4 E 5 (PERÍMETRO)',
                               'INSTALAÇÃO DE ILUMINAÇÃO PARA O BOLSÃO DE VEÍCULOS LEVES (ESTACIONAMENTO)'],
                      esteio: ['INSTALAÇÃO DE LINHA DE VIDA VERTICAL NA ESCADA MARINHEIRO AMZ A',
                               'INSTALAÇÃO DE LINHA DE VIDA VERTICAL NA ESCADA MARINHEIRO AMZ B2'] }[c];
  ok(itensFora.every(n => tRev.indexOf(n) >= 0) && tRev.some(t => /^O que fazer: confirmar com a controladoria/.test(t)),
     c + ': revisão lista os itens do 090 que a METRAGEM não tem e o que fazer (' +
     itensFora.filter(n => tRev.indexOf(n) < 0).join(' | ') + ')');
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

// 12/10/2026: os modelos 070/090 passaram a vir da exportação completa do
// sistema (todas as unidades numa planilha só, ORC_MODELO_090_ID / _070_ID);
// cada Mega fica com a sua unidade (unidadeModelo). Fixtures: as exportações
// "…-Atualizado" de 12/10/2026, 16h (070 e 090 "v2", do .xlsx), como o getValues() devolve.
console.log('Modelos de todas as unidades (exportação de 12/10/2026, 16h)');
const MODELO_SEC = {};
{
  const M090 = fixture('fixture_090_megas_2027.json'), M070 = fixture('fixture_070_megas_2027.json');
  ok(['CURITIBA', 'ITAJAI', 'ESTEIO'].every(k => MODELOS_CONFIG[k].d === G.ORC_MODELO_090_ID && MODELOS_CONFIG[k].s === G.ORC_MODELO_070_ID),
     'os três Megas leem as planilhas de todas as unidades (01_Config.gs)');
  porId[G.ORC_MODELO_090_ID] = M090;
  porId[G.ORC_MODELO_070_ID] = M070;
  // O cadastro de contratos que o deck lê (rev01, sem o Itaú — está no 070); sem limpar o cache
  // da leitura, valeria o "completo" do começo do teste. Volta ao fim da seção.
  const CAD_ANTES = porId[G.ORC_CONTRATOS_ANO_IDS[0]];
  const limparCadastro = () => Object.keys(G._ORC_CADASTRO_ANO).forEach(k => { delete G._ORC_CADASTRO_ANO[k]; });
  porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev01.json');
  limparCadastro();
  // O filtro deixa só a unidade do Mega (Capital Realty, Demercado, CR SP e as
  // comissões por módulo ficam de fora) e o total confere com a exportação.
  const esperado = { CURITIBA: [60, 2521441, 1442635], ITAJAI: [19, 2907387, 453133], ESTEIO: [18, 1474045, 1355264] };
  Object.keys(esperado).forEach(k => {
    const [u, t090, t070] = esperado[k];
    const l090 = G._orcLinhasModelo_(M090, u), l070 = G._orcLinhasModelo_(M070, u);
    ok(G.ORC_CIDADES[k].unidadeModelo === u, k + ': unidade ' + u + ' no 01_Config.gs');
    ok(Math.round(-l090.reduce((a, l) => a - l.total, 0)) === t090 && Math.round(-l070.reduce((a, l) => a - l.total, 0)) === t070,
       k + ': 090 e 070 da unidade ' + u + ' (' + Math.round(l090.reduce((a, l) => a + l.total, 0)) + ' / ' +
       Math.round(l070.reduce((a, l) => a + l.total, 0)) + ')');
  });
  ok(G._orcLinhasModelo_(M090).length > G._orcLinhasModelo_(M090, 60).length, 'sem unidade: todas as linhas (como as planilhas por Mega de antes)');
  lanca(() => G._orcLinhasModelo_(M090, 99), 'Nenhuma linha da unidade 99', 'unidade que não está na planilha: erro em vez de deck zerado');
  // Exportação das 16h: o empréstimo Itaú entra no 070 de Curitiba (tabela SAC), o Moked do Esteio
  // cai para R$ 7.948,98/mês e as duas lavagens das estruturas metálicas de Curitiba saem do ano.
  const itau070 = G._orcLinhasModelo_(M070, 60).filter(l => /EMPR[ÉE]STIMO ITA[ÚU]/i.test(l.item));
  ok(itau070.length === 1 && Math.abs(itau070[0].total - 156486.87) < 0.01 && itau070[0].meses.every((v, i) => !i || v < itau070[0].meses[i - 1]),
     '070 de Curitiba: empréstimo Itaú, R$ 156.486,87 em 2027, parcela caindo mês a mês (' + itau070.map(l => l.total.toFixed(2)).join() + ')');
  const moked18 = G._orcLinhasModelo_(M070, 18).filter(l => /MOKED/.test(l.item));
  ok(moked18.length === 1 && Math.abs(moked18[0].total - 12 * 7948.98) < 0.01,
     '070 do Esteio: Moked de R$ 7.948,98/mês (' + moked18.map(l => l.total.toFixed(2)).join() + ')');
  const lavagens = G._orcLinhasModelo_(M090, 60).filter(l => /LAVAGEM DAS ESTRUTURAS MET/.test(l.item));
  ok(lavagens.length === 2 && lavagens.every(l => l.meses.every(v => Math.abs(v) < 0.5)),
     '090 de Curitiba: lavagens das estruturas metálicas (pórtico e portaria) fora do ano');

  // Geração completa de cada Mega com a exportação nova, como o usuário roda.
  [['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
    const cid = G.ORC_CIDADES[chave];
    const antes = { d: cid.despesasGeraisId, s: cid.servicosTerceirosId };
    cid.despesasGeraisId = G.ORC_MODELO_090_ID;
    cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
    cid.relatorios.orcDosModelos = true;
    porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
    porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
    porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
    try {
      const vis = G._orcLerVisaoGeral_(chave), rel = vis.rel;
      const conta = n => rel.contas.filter(x => x.chave === G._orcChaveConta_(n))[0];
      ok(vis.modelos.filter(l => l.linha).every(l => true) && vis.modelos.length > 0, c + ' (exportação nova): modelos lidos');
      pertoReal(G.obterManutencao_(chave).total, conta('Manutenção de imóveis').v.orc, c + ' (exportação nova): manutenção das categorias = DRE');
      G.ORC_CONTAS_DETALHE.forEach(n => {
        const comp = G._orcComposicaoConta_(conta(n), vis.modelos);
        ok(comp.base === 0 && comp.excesso === 0, c + ' (exportação nova): ' + n + ' fecha item a item com a DRE');
      });
      const naoFecha = [];
      rel.contas.forEach(x => {
        const m = vis.mensal.contas[x.chave];
        if (m) [['orcAnt', 'orcAnt'], ['ritmo', 'real'], ['orc', 'orc']].forEach(([k, campo]) => {
          if (Math.abs(m[campo].reduce((t, v) => t + v, 0) - x.v[k]) > 1) naoFecha.push(x.nome + ' ' + k);
        });
      });
      ok(!naoFecha.length, c + ' (exportação nova): mês a mês = DRE (' + naoFecha.join(', ') + ')');
      ok(!rel.orcCalculado.semConta.length, c + ' (exportação nova): toda conta dos modelos tem linha na METRAGEM (' +
         rel.orcCalculado.semConta.map(s => s.nome + ' ' + Math.round(s.total)).join(', ') + ')');
      // Esteio: a assistente de facilities ("Assessoria de RH", R$ 90 mil no 090) fica DENTRO da Despesa de
      // pessoal da METRAGEM, como consultoria até o RH aprovar — não soma por cima; a conta ganha o asterisco
      // (Guilherme, 12/10/2026, 20h; ORC_CONTAS_DENTRO).
      const pesOf = G._orcLerMetragem_(fixture('fixture_metragem_' + c + '.json')).contas.filter(x => x.chave === G._orcChaveConta_('Despesa de pessoal'))[0];
      pertoReal(conta('Despesa de pessoal').v.orc, pesOf.v.orc, c + ' (exportação nova): Despesa de pessoal = METRAGEM');
      ok(chave === 'ESTEIO' ? !!conta('Despesa de pessoal').asterisco && Math.round(conta('Despesa de pessoal').asterisco.valor) === 90000
                            : !rel.contas.some(x => x.asterisco),
         c + ' (exportação nova): ' + (chave === 'ESTEIO' ? 'Despesa de pessoal com o asterisco dos R$ 90 mil da assistente' : 'nenhuma conta com asterisco'));

      // Item tirado do ano com R$ 0,01 (o sistema não aceita zero) não é item: Itajaí, 12/10/2026 —
      // iluminações, quadro da portaria, totem, encanamento PPR e bebedouro voltaram para 2026.
      const dadosN = G.obterManutencao_(chave);
      ok(!dadosN.categorias.some(cat => cat.itens.some(it => Math.abs(it.total) < 0.5)), c + ' (exportação nova): nenhum item de centavos na manutenção');
      if (chave === 'ITAJAI') {
        const adiN = G._orcAdiados2026_(cid, dadosN);
        ok(adiN && adiN.itens.length === 4 && !adiN.itens.some(i => /ilumina|quadro/i.test(i.nome)) && adiN.itens.every(i => i.doModelo),
           'itajai (exportação nova): obras puxadas para 2026 saem das adiadas (' + (adiN ? adiN.itens.map(i => i.nome + ' ' + Math.round(i.orc2027)).join(' | ') : 'nenhuma') + ')');
        ok(!(G.ORC_PENDENCIAS_GESTOR[cid.nome] || []).length, 'itajai: perguntas do gestor respondidas na exportação de 12/10/2026');
      }
      if (chave === 'CURITIBA') {
        // Itaú uma vez só (o do 070; o rev01 não o traz) e, no slide de contratos, com o 2026 do ritmo.
        const itauLinhas = vis.modelos.filter(l => /itau/.test(G._orcNorm_(l.item)) && Math.abs(l.total) > 0.5);
        ok(itauLinhas.length === 1 && itauLinhas[0].linha > 0, 'curitiba (exportação nova): empréstimo Itaú uma vez só, do 070 (' +
           itauLinhas.map(l => l.item + ' ' + Math.round(l.total)).join(' | ') + ')');
        const cmpC = G._orcCompararTodosContratos_(rel, FIX_CAD_2026, cid.nome, vis.modelos, FIX_MOD_2026);
        const itauC = [];
        cmpC.grupos.forEach(g => g.linhas.filter(l => /itau/.test(G._orcNorm_((l.textos || []).join(' ') + ' ' + l.nome))).forEach(l => itauC.push(l)));
        ok(itauC.length === 1 && Math.abs(itauC[0].ant - 86601.84) < 0.01 && Math.abs(itauC[0].atual - 156486.87) < 0.01 &&
           itauC[0].situacao === 'Ano cheio (começou em jun/26)' && /^FINANCIAMENTO ITAÚ/.test(itauC[0].nome),
           'curitiba (exportação nova): Itaú no slide de contratos, 2026 do ritmo e 2027 do 070 (' +
           itauC.map(l => l.nome + ' ' + Math.round(l.ant) + '→' + Math.round(l.atual) + ' ' + l.situacao).join(' | ') + ')');
      }
      decks = {};
      G._orcGerar_([chave]);
      G.aplicarPropostasTextos();
      decks = {};
      G._orcGerar_([chave]);
      const sl = decks[cid.deckId].getSlides();
      if (chave === 'ESTEIO') {
        // Detalhamento por conta que o gestor escreveu (12/10/2026): nos ofensores, no lugar do maior item.
        const tOfE = sl.filter(x => /^(Ofensores|Defensores) — /.test(titulo(x))).reduce((a, x) => a.concat(textos(x)), []);
        ok(['NOVO ANALISTA DE FACILITIES JR + RATEIO GERÊNCIA', 'ENTRADA DO AMZ B + MANUT. SEMESTRAL DRENAGEM',
            'ENTRADA DO AMZ B + ZELADORIA EXTRA NAS CHUVAS', 'MANUTENÇÃO CHICOTE ELÉTRICO DO TRATOR 3'].every(t => tOfE.indexOf(t) >= 0) &&
           tOfE.filter(t => t === 'ENTRADA DO ARMAZÉM B').length === 4,
           'esteio (exportação nova): detalhamento por conta do gestor nos ofensores (Despesa de pessoal, Água, Seguro…)');
        // Português (12/10/2026, 19h): a célula que ainda tem "chicote elétrica" passa a "elétrico" com aplicarPropostasTextos().
        const shOf = PLANILHA_TEXTOS.getSheetByName('Ofensores'), dOf = shOf.getDataRange().getValues();
        const iCh = dOf.findIndex(r => r[0] === 'MEGA ESTEIO · MANUTENÇÃO DE MÁQUINAS E EQUIPAMENTOS');
        shOf.getRange(iCh + 1, 3, 1, 1).setValues([['MANUTENÇÃO CHICOTE ELÉTRICA DO TRATOR 3']]);
        G.aplicarPropostasTextos();
        ok(iCh > 0 && shOf.getDataRange().getValues()[iCh][2] === 'MANUTENÇÃO CHICOTE ELÉTRICO DO TRATOR 3',
           'esteio: a proposta revista troca "chicote elétrica" por "chicote elétrico" na planilha de textos');
      }
      const comFalha = sl.map((x, i) => [i + 1, textos(x).filter(t => t.indexOf('Falha ao gerar') === 0)]).filter(f => f[1].length);
      ok(!comFalha.length, c + ' (exportação nova): nenhum slide com falha (' + comFalha.map(f => 'slide ' + f[0] + ': ' + f[1].join(' ')).join(' | ') + ')');
      const tRevN = textos(sl[sl.map(titulo).indexOf('Revisar antes da versão final')] || { shapes: [] });
      ok(!tRevN.some(t => /maior: (IPTU|Seguro)/.test(t)), c + ' (exportação nova): resumo do mês a mês sem IPTU e Seguro');
      const cortados = [];
      sl.forEach((x, i) => textos(x).forEach(t => { if (/…$/.test(t)) cortados.push((i + 1) + ' ' + titulo(x) + ' :: ' + t); }));
      ok(!cortados.length, c + ' (exportação nova): nenhum texto cortado (' + cortados.join(' | ') + ')');
      ok(!sl.some(x => textos(x).some(t => /^⚠ REVISAR/.test(t))), c + ' (exportação nova): nenhum slide com ⚠ REVISAR');
      MODELO_SEC[c] = { slides: sl.length, orc: rel.total.orc, metragem: G._orcLerMetragem_(fixture('fixture_metragem_' + c + '.json')).total.orc,
                        mudou: rel.orcCalculado.mudou.map(m => m.nome + ' ' + G._orcMoeda_(m.metragem) + ' → ' + G._orcMoeda_(m.calculado)) };
      console.log('  ' + cid.nome + ': ' + sl.length + ' slides · Orç 2027 ' + G._orcMoeda_(rel.total.orc) + ' (METRAGEM ' +
                  G._orcMoeda_(MODELO_SEC[c].metragem) + ') · ajustadas: ' + rel.orcCalculado.mudou.length);
    } finally {
      cid.despesasGeraisId = antes.d;
      cid.servicosTerceirosId = antes.s;
      cid.relatorios.orcDosModelos = false;
    }
  });
  if (process.env.DETALHE) console.log(JSON.stringify(MODELO_SEC, null, 1));
  // Cadastro de contratos 2027 "rev01" (12/10/2026), o que o deck lê agora: Moked de Curitiba e de Itajaí
  // com os valores novos; o empréstimo Itaú da cerca elétrica sai (zerado em 2027 — "foi para os modelos").
  const REV01 = fixture('fixture_contratos_2027_rev01.json');
  const segC = G._orcLerCadastroContratos_(REV01, 'Mega Curitiba', 'Segurança e vigilância', 2027);
  const segI = G._orcLerCadastroContratos_(REV01, 'Mega Itajaí', 'Segurança e vigilância', 2027);
  const tot = (l, re) => l.filter(k => re.test(k.fornecedor + ' ' + k.descricao)).reduce((t, k) => t + k.total, 0);
  ok(Math.round(tot(segC, /MOKED|CONSULTORIA DE SEGURAN/i)) === 248480 && !segC.some(k => /ITAU/i.test(k.fornecedor + k.descricao)) &&
     Math.round(tot(segI, /MOKED/i)) === 203663,
     'cadastro rev01: Moked Curitiba R$ 248.480, Moked Itajaí R$ 203.663, Itaú fora dos contratos de 2027');
  porId[G.ORC_CONTRATOS_ANO_IDS[0]] = CAD_ANTES;
  limparCadastro();
}

// Out/2026: a controladoria não fecha a METRAGEM a tempo e o Orç 2027 de cada
// conta sai dos modelos 070/090 + contratos (relatorios.orcDosModelos,
// 04_DadosRelatorios.gs). Real 2025, Orç e Ritmo 2026 seguem da METRAGEM; a
// área também, e o R$/m² é refeito com ela.
console.log('Orç 2027 calculado pelos modelos');
ok(['CURITIBA', 'ITAJAI', 'ESTEIO'].every(k => ORC_DOS_MODELOS_CONFIG[k]), 'orcDosModelos ligado nos três Megas no 01_Config.gs');
[['CURITIBA', 'curitiba', 0], ['ITAJAI', 'itajai', 29313], ['ESTEIO', 'esteio', 15268]].forEach(([chave, c, degrau]) => {
  const cid = G.ORC_CIDADES[chave];
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porId[cid.despesasGeraisId] = chave === 'CURITIBA' ? FIXTURE : fixture('fixture_090_' + c + '_2027.json');
  porId[cid.servicosTerceirosId] = fixture('fixture_070_' + c + '_2027.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  const oficial = G.obterRelatorioAnual_(chave);
  cid.relatorios.orcDosModelos = true;
  try {
    const rel = G.obterRelatorioAnual_(chave), mensal = G.obterRelatorioMensal_(chave);
    const conta = (r, n) => r.contas.filter(x => x.chave === G._orcChaveConta_(n))[0];
    const manut = conta(rel, 'Manutenção de imóveis').v.orc, manutOf = conta(oficial, 'Manutenção de imóveis').v.orc;
    ok(Math.round(manut - manutOf) === degrau, c + ': manutenção = modelo 090 + contratos (' + Math.round(manut - manutOf) +
       ' acima da METRAGEM, esperado ' + degrau + ')');
    ok(['real', 'orcAnt', 'ritmo'].every(k => rel.total[k] === oficial.total[k] && rel.m2Total[k] === oficial.m2Total[k]),
       c + ': Real 2025, Orç 2026 e Ritmo 2026 seguem da METRAGEM');
    pertoReal(rel.areaComum.orc, rel.contas.reduce((a, x) => a + x.v.orc, 0), c + ': área comum = soma das contas');
    pertoReal(rel.total.orc, rel.areaComum.orc + rel.iptu.orc + rel.seguro.orc, c + ': total = área comum + IPTU + Seguro');
    perto(G._orcAreaImplicita_(rel, 'orc'), G._orcAreaImplicita_(oficial, 'orc'), c + ': área do Orç 2027 é a da METRAGEM');
    perto(rel.areaComum.orc / rel.m2AreaComum.orc, oficial.areaComum.orc / oficial.m2AreaComum.orc,
          c + ': área da área comum também');
    ok(degrau === 0 || rel.m2Total.orc > oficial.m2Total.orc, c + ': R$/m² sobe junto com o total');
    // Zerada nos modelos: fica a METRAGEM.
    ok(conta(rel, 'Representação e refeição').v.orc === conta(oficial, 'Representação e refeição').v.orc && conta(oficial, 'Representação e refeição').v.orc > 0,
       c + ': Representação e refeição (zerada nos modelos) fica com a METRAGEM');
    if (chave === 'ESTEIO') {
      // Sinônimos: "Manutenção de bens móveis" e "Quilometragem / Estacionamento" nos modelos.
      perto(conta(rel, 'Manutenção de máquinas e equipamentos').v.orc, 146045.62, 'esteio: bens móveis dos modelos = máquinas e equipamentos');
      perto(conta(rel, 'KM, estacionamento e pedágio').v.orc, 1200, 'esteio: quilometragem dos modelos = KM, estacionamento e pedágio');
    }
    if (chave === 'CURITIBA') {
      perto(rel.seguro.orc, oficial.seguro.orc, 'curitiba: Seguro em valeMetragem fica com a METRAGEM (o modelo tem R$ 10.645 a mais)');
    }
    ok(rel.orcCalculado && !rel.orcCalculado.semConta.length, c + ': toda conta dos modelos tem linha na METRAGEM (' +
       (rel.orcCalculado ? rel.orcCalculado.semConta.map(s => s.nome).join(', ') : 'sem orcCalculado') + ')');
    ok(rel.orcCalculado.mudou.some(m => m.nome === 'Manutenção de imóveis') === (degrau > 0),
       c + ': lista o que mudou (' + rel.orcCalculado.mudou.map(m => m.nome).join(', ') + ')');
    if (degrau) {
      // Chega a METRAGEM nova, já com a manutenção dos modelos: nada a ajustar,
      // nenhum aviso — sem mexer no 01_Config.gs.
      const nova = fixture('fixture_metragem_' + c + '.json'), dif = manut - manutOf;
      const col = nova[0].findIndex(h => /^orca? 2027$/.test(G._orcNorm_(String(h))));
      nova.forEach((r, i) => {
        const n = G._orcNorm_(String(r[0]));
        if (i && (/^manutencao de imoveis/.test(n) || /^total area comum/.test(n))) r[col] -= dif;
      });
      porId[cid.relatorios.metragemId] = nova;
      const relNova = G.obterRelatorioAnual_(chave);
      ok(!relNova.avisos.length && !relNova.orcCalculado.mudou.length &&
         !G._orcPendencias_(cid, relNova, null, G._orcLinhasModelosCidade_(chave)).some(p => /ajustado/.test(p.tipo)),
         c + ': METRAGEM nova que bate com os modelos — nada ajustado, nenhum aviso (' +
         relNova.avisos.concat(relNova.orcCalculado.mudou.map(m => m.nome)).join(' | ') + ')');
      pertoReal(relNova.total.orc, rel.total.orc, c + ': METRAGEM nova e Orç calculado dão o mesmo total');
      porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
    }
    // Mês a mês: os 12 meses fecham com o anual — nenhum ⚠ REVISAR novo.
    G._orcConferirMensal_(rel, mensal, cid.relatorios.valeMetragem);
    ok(!rel.revisar.length, c + ': mensal fecha com o Orç calculado (' + rel.revisar.map(r => r.nome).join(', ') + ')');
    // Um número, uma fonte (apresentação de 13/10/2026): o total da manutenção
    // dos slides de categoria (obterManutencao_) é o mesmo da DRE/ponte, e as
    // três contas em foco fecham item a item, sem "Não detalhado" nem excesso.
    pertoReal(G.obterManutencao_(chave).total, manut, c + ': manutenção dos slides de categoria = manutenção da DRE');
    const modelos = G._orcLinhasModelosCidade_(chave);
    G.ORC_CONTAS_DETALHE.forEach(n => {
      const comp = G._orcComposicaoConta_(conta(rel, n), modelos);
      ok(comp.base === 0 && comp.excesso === 0, c + ': ' + n + ' fecha item a item com a DRE (sobra ' +
         Math.round(comp.base) + ', excesso ' + Math.round(comp.excesso) + ')');
    });

    // Um número, uma fonte (12/10/2026: "não aparecer na DRE um valor e na
    // estratificação outro"): na leitura da geração o mês a mês soma a DRE em
    // toda conta e coluna, o realizado do ritmo fica intacto, o Real do ano
    // retrasado fecha com a METRAGEM e o R$/m² da tabela é a média das linhas.
    const vis = G._orcLerVisaoGeral_(chave), cru = G.obterRelatorioMensal_(chave);
    const contasV = vis.rel.contas.concat([{ nome: 'IPTU', chave: G._orcChaveConta_('IPTU'), v: vis.rel.iptu },
                                           { nome: 'Seguro', chave: G._orcChaveConta_('Seguro'), v: vis.rel.seguro }]);
    const naoFecha = [], mexeuRealizado = [];
    contasV.forEach(x => {
      const m = vis.mensal.contas[x.chave];
      if (!m) return;
      [['orcAnt', 'orcAnt'], ['ritmo', 'real'], ['orc', 'orc']].forEach(([k, campo]) => {
        if (Math.abs(m[campo].reduce((t, v) => t + v, 0) - x.v[k]) > 1) naoFecha.push(x.nome + ' ' + k);
      });
      for (let i = 0; i < G.ORC_RITMO_ULTIMO_MES_FECHADO; i++) {
        if (Math.abs(m.real[i] - cru.contas[x.chave].real[i]) > 0.01 && mexeuRealizado.indexOf(x.nome) < 0) mexeuRealizado.push(x.nome);
      }
    });
    ok(!naoFecha.length, c + ': mês a mês soma a DRE em toda conta e coluna (' + naoFecha.join(', ') + ')');
    ok(mexeuRealizado.length <= 2, c + ': ritmo realizado (jan–set) intacto, salvo conta sem espaço na projeção (' + mexeuRealizado.join(', ') + ')');
    if (vis.realAnt) pertoReal(vis.realAnt.ac.reduce((t, v) => t + v, 0), vis.rel.areaComum.real, c + ': Real 2025 mês a mês = DRE');
    const m2v = G._orcM2Mensal_(vis.rel, vis.mensal, vis.realAnt);
    m2v.series.filter(s => m2v.custo[s.k]).forEach(s => ok(s.media.toFixed(2) === m2v.custo[s.k].areaComum.m2.toFixed(2),
      c + ': m² mês a mês — média das linhas = tabela (' + s.nome + ': ' + s.media.toFixed(2) + ' × ' + m2v.custo[s.k].areaComum.m2.toFixed(2) + ')'));
    const pv = G._orcPonte_(vis.rel, vis.mensal);
    pertoReal(pv.degraus.reduce((t, x) => t + x.delta, 0), pv.fim - pv.inicio, c + ': ponte — degraus somam Orç − Ritmo');
    ok(G._orcClassificarManutencao_(G.obterManutencao_(chave)).grupos.reduce((t, g) => t + g.total, 0) - manut < 1,
       c + ': projetos × recorrente somam a manutenção da DRE');

    // Geração completa, como o usuário roda.
    decks = {};
    G._orcGerar_([chave]);
    G.aplicarPropostasTextos();
    decks = {};
    G._orcGerar_([chave]);
    const sl = decks[cid.deckId].getSlides(), titulos = sl.map(titulo);
    const comFalha = sl.map((x, i) => [i + 1, textos(x).filter(t => t.indexOf('Falha ao gerar') === 0)]).filter(f => f[1].length);
    ok(!comFalha.length, c + ' (Orç calculado): nenhum slide com falha (' + comFalha.map(f => 'slide ' + f[0] + ': ' + f[1].join(' ')).join(' | ') + ')');
    const iRev = titulos.indexOf('Revisar antes da versão final'), tRev = iRev >= 0 ? textos(sl[iRev]) : [];
    // METRAGEM que bate não gera aviso; a que não bate vira "Orç 2027 ajustado" (12/10/2026).
    const ajustado = tRev.indexOf('Orç 2027 ajustado') >= 0 &&
      tRev.indexOf('não bate com os modelos 070/090 + contratos; o deck usa os modelos') >= 0;
    ok(degrau ? iRev === 1 && ajustado : !ajustado,
       c + (degrau ? ' (Orç calculado): revisão avisa que a METRAGEM foi ajustada pelos modelos'
                   : ' (Orç calculado): METRAGEM bate — sem aviso de ajuste'));
    ok(rel.orcCalculado.mudou.length === 0 || degrau > 0,
       c + ': METRAGEM que bate não lista nada (' + rel.orcCalculado.mudou.map(m => m.nome).join(', ') + ')');
    ok(tRev.indexOf('Modelos acima da METRAGEM') < 0, c + ' (Orç calculado): sem a pendência "Modelos acima da METRAGEM"');
    if (degrau) ok(tRev.some(t => /^METRAGEM R\$ .* → modelos R\$ /.test(t)), c + ' (Orç calculado): revisão mostra METRAGEM → modelos');
    // O selo da manutenção só fica por pendência de dado da conta (pergunta do gestor, 2026 não identificado),
    // nunca por divergência de fonte ("Modelos acima da METRAGEM").
    const pendM = G._orcPendencias_(cid, rel, mensal, G._orcLinhasModelosCidade_(chave))
      .filter(p => p.chave === G._orcChaveConta_('Manutenção de imóveis'));
    ok(textos(sl[titulos.indexOf('Manutenção de imóveis')]).some(t => /^⚠ PENDENTE · Manutenção/.test(t)) === (pendM.length > 0) &&
       !pendM.some(p => p.tipo === 'Modelos acima da METRAGEM'),
       c + ' (Orç calculado): selo ⚠ PENDENTE da manutenção só por pendência da conta (' + pendM.map(p => p.tipo).join(', ') + ')');
    ok(!sl.some(x => textos(x).some(t => /^⚠ REVISAR/.test(t))), c + ' (Orç calculado): nenhum slide com ⚠ REVISAR');
    if (chave === 'CURITIBA') {
      // Seguro: METRAGEM R$ 604 mil (valeMetragem) e item do modelo R$ 614 mil — o item não sai ao lado da conta.
      const tOf = sl.filter(x => /^(Ofensores|Defensores) —/.test(titulo(x))).map(textos).reduce((a, t) => a.concat(t), []);
      ok(tOf.length && !tOf.some(t => /R\$ 614 mil/.test(t)), 'curitiba: ofensores sem o item do seguro maior que a conta');
    }
    const cortados = [];
    sl.forEach((x, i) => textos(x).forEach(t => { if (/…$/.test(t)) cortados.push((i + 1) + ' ' + titulo(x) + ' :: ' + t); }));
    ok(!cortados.length, c + ' (Orç calculado): nenhum texto cortado (' + cortados.join(' | ') + ')');
    console.log('  ' + cid.nome + ': ' + sl.length + ' slides · Orç 2027 ' + G._orcMoeda_(rel.total.orc) + ' (METRAGEM ' +
                G._orcMoeda_(oficial.total.orc) + ') · R$/m² ' + rel.m2Total.orc.toFixed(2) + ' (METRAGEM ' + oficial.m2Total.orc.toFixed(2) + ')');
  } finally {
    cid.relatorios.orcDosModelos = false;
  }
});

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
  // Os slides de fotos do gestor (3 por Mega) ficam fora das listas das partes: nunca saem.
  const fotosDe = p => sl.filter(x => x.notas.indexOf('[REGISTRO FOTOGRÁFICO · ' + p + ']') === 0).map(x => ids.indexOf(x.getObjectId()));
  ok(sl.length === ['ABERTURA', 'CURITIBA', 'ITAJAI', 'ESTEIO'].reduce((t, p) => t + lista(p).length, 0) + 9 && ordemOk && pos('ABERTURA')[0] === 0,
     'Facilities: abertura, Esteio, Itajaí e Curitiba em ordem, sem slide sobrando (' + sl.length + ' slides)');
  const fotosNoFim = p => { const f = fotosDe(p); return f.length === 3 && Math.min.apply(null, f) === Math.max.apply(null, pos(p)) + 1; };
  ok(['ESTEIO', 'ITAJAI', 'CURITIBA'].every(fotosNoFim) && lista('ITAJAI').every(id => sl.filter(x => x.getObjectId() === id)[0].notas === ''),
     'Facilities: os 3 slides de fotos no fim de cada Mega, fora da lista da parte (' + ['ESTEIO', 'ITAJAI', 'CURITIBA'].map(p => fotosDe(p).join('-')).join(' | ') + ')');
  // O gestor preenche e duplica (Ctrl+D leva as anotações); gerar Itajaí de novo não apaga nem recria os slides dele,
  // e Itajaí continua antes de Curitiba.
  const fotoI = sl.filter(x => x.notas.indexOf('[REGISTRO FOTOGRÁFICO · ITAJAI]') === 0);
  fotoI[0].shapes.push({ tipo: 'TEXT_BOX', x: 50, y: 300, w: 100, h: 14, texto: 'ESCRITO PELO GESTOR' });
  const copia = fac.insertSlide(ids.indexOf(fotoI[0].getObjectId()) + 1);
  copia.notas = fotoI[0].notas;
  const idsFotoI = fotoI.map(x => x.getObjectId()).concat([copia.getObjectId()]);
  G._orcGerarFacilities_('ITAJAI');
  const sl2 = fac.getSlides(), idsR = sl2.map(x => x.getObjectId());
  const fotoI2 = sl2.filter(x => x.notas.indexOf('[REGISTRO FOTOGRÁFICO · ITAJAI]') === 0);
  const pos2 = p => lista(p).map(id => idsR.indexOf(id));
  ok(fotoI2.length === 4 && fotoI2.every(x => idsFotoI.indexOf(x.getObjectId()) >= 0) &&
     textos(fotoI2[0]).indexOf('ESCRITO PELO GESTOR') >= 0 &&
     Math.min.apply(null, fotoI2.map(x => idsR.indexOf(x.getObjectId()))) === Math.max.apply(null, pos2('ITAJAI')) + 1 &&
     Math.max.apply(null, fotoI2.map(x => idsR.indexOf(x.getObjectId()))) < Math.min.apply(null, pos2('CURITIBA')),
     'Facilities: gerar Itajaí de novo mantém os slides de fotos do gestor (e a cópia dele) no fim de Itajaí');
  copia.remove();
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
  const idsAgora = fac.getSlides().map(x => x.getObjectId());   // o deck de agora (Itajaí já foi gerado de novo acima)
  const antesIt = idsAgora.indexOf(lista('ITAJAI')[0]), nAntes = idsAgora.length, curAntes = lista('CURITIBA').join(), esAntes = lista('ESTEIO').join();
  G._orcGerarFacilities_('ITAJAI');
  const ids2 = fac.getSlides().map(x => x.getObjectId());
  ok(fac.getSlides().length === nAntes && lista('CURITIBA').join() === curAntes && lista('ESTEIO').join() === esAntes &&
     ids2.indexOf(lista('ITAJAI')[0]) === antesIt && fac.getSlides()[1].shapes.filter(f => f.link).map(f => f.link).indexOf(lista('ITAJAI')[0]) >= 0,
     'Facilities: gerar Itajaí de novo troca só os slides dele, no mesmo lugar, e refaz o link do sumário');
  // Atualizar só alguns slides (27_Atualizar.gs, 09/10/2026): troca a ponte, o "por que sobe" e as demais variações
  // no mesmo lugar, sem mexer no resto; slide que falta entra depois do de referência.
  {
    const tit = id => textos(fac.getSlideById(id))[0] || '';
    const ehDe = (p, pref) => lista(p).filter(id => tit(id).indexOf(pref) === 0);
    const n0 = fac.getSlides().length, outrosAntes = lista('ESTEIO').filter(id => !/^(Ponte Ritmo|Por que a manutenção sobe)/.test(tit(id))).join();
    const ponteAntes = ehDe('ESTEIO', 'Ponte Ritmo ')[0], posPonte = fac.getSlides().map(x => x.getObjectId()).indexOf(ponteAntes);
    // O "por que sobe" do Esteio some (como num deck gerado antes de 09/10/2026): a atualização o põe de volta.
    const pq = ehDe('ESTEIO', 'Por que a manutenção sobe — ')[0];
    fac.getSlideById(pq).remove();
    PROPS_DADOS.ORC_FAC_ESTEIO = JSON.stringify(lista('ESTEIO').filter(id => id !== pq));
    G.atualizarSlidesFacilities();
    const idsA = fac.getSlides().map(x => x.getObjectId());
    const ponteNova = ehDe('ESTEIO', 'Ponte Ritmo ')[0];
    const iLL = idsA.indexOf(ehDe('ESTEIO', 'Manutenção de imóveis')[0]), iPQ = idsA.indexOf(ehDe('ESTEIO', 'Por que a manutenção sobe — ')[0]);
    ok(fac.getSlides().length === n0 && ponteNova && ponteNova !== ponteAntes && idsA.indexOf(ponteNova) === posPonte &&
       lista('ESTEIO').filter(id => !/^(Ponte Ritmo|Por que a manutenção sobe)/.test(tit(id))).join() === outrosAntes &&
       iPQ === iLL + 1 && idsA.indexOf(ehDe('ESTEIO', 'Por que a manutenção sobe:')[0]) === iPQ + 1 &&
       lista('ESTEIO').every(id => idsA.indexOf(id) >= 0) && ['ITAJAI', 'CURITIBA'].every(p => ehDe(p, 'Ponte Ritmo ').length === 1),
       'atualizarSlidesFacilities: ponte trocada no mesmo lugar, o resto intacto e o "por que sobe" que faltava volta depois da conta');
  }
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
  // Guilherme, 12/10/2026: as seis coletas de lixo (uma por armazém, ~R$ 6.710 cada) numa linha.
  ok(I['COLETA DE LIXO (AMZ 01 A 06)'] && Math.round(I['COLETA DE LIXO (AMZ 01 A 06)'].ant) === 40259 &&
     Math.round(I['COLETA DE LIXO (AMZ 01 A 06)'].atual) === 40259 && I['COLETA DE LIXO (AMZ 01 A 06)'].situacao === 'Junta 6 linhas' &&
     !Object.keys(I).some(n => /COLETA DE LIXO AMZ|LIMPEZA URBANA/.test(n)),
     'Itajaí: coleta de lixo dos AMZ 01–06 numa linha (' + show(I, 'COLETA DE LIXO (AMZ 01 A 06)') + ')');
  const arca = Object.keys(I).filter(n => /ARCA/.test(n)).map(n => I[n]);
  ok(arca.length === 1 && Math.round(arca[0].ant) === 88428 && /Mudou de conta/.test(arca[0].situacao),
     'Itajaí: Arca Agro numa linha, com o 2026 da Limpeza (' + arca.map(l => l.nome + ' ' + Math.round(l.ant) + '→' + Math.round(l.atual) + ' ' + l.situacao + ' ' + l.conta).join(' | ') + ')');
  const fire = Object.keys(I).filter(n => /FIRECAM/.test(n)).map(n => I[n]);
  ok(fire.length === 1 && /^Ano cheio/.test(fire[0].situacao), 'Itajaí: Firecam começou em jul/26 — "Ano cheio" (' + fire.map(l => l.situacao).join() + ')');
  const pmocI = Object.keys(I).filter(n => /PMOC|AR-COND/.test(n)).map(n => I[n]);
  // 12/10/2026: o 2026 do PMOC do Itajaí é o "Contrato de condicionadores de ar" do ritmo (Perri), R$ 760 set–dez.
  ok(pmocI.length === 1 && pmocI[0].ant === 3040 && pmocI[0].situacao === 'Ano cheio (começou em set/26)',
     'Itajaí: PMOC com o 2026 do ritmo (R$ 760 set–dez) e "Ano cheio" (' + pmocI.map(l => l.nome + ' ' + Math.round(l.ant) + ' ' + l.situacao).join() + ')');
  ok(E['EMPRESA DE SEGURANÇA'] && Math.round(E['EMPRESA DE SEGURANÇA'].ant) === 502815 && !Object.keys(E).some(n => /VOIGT/.test(n) && E[n].conta === E['EMPRESA DE SEGURANÇA'].conta),
     'Esteio: Voigt + nova empresa numa linha "EMPRESA DE SEGURANÇA" (' + show(E, 'EMPRESA DE SEGURANÇA') + ')');
  ok(E['RENTBRELLA (ARMAZÉNS A E B)'] && E['RENTBRELLA (ARMAZÉNS A E B)'].atual > 28000, 'Esteio: Rentbrella A e B numa linha (' + show(E, 'RENTBRELLA (ARMAZÉNS A E B)') + ')');
  ok(C['VIGILÂNCIA COM DRONE AUTÔNOMO'] && C['ROÇADA (LPU)'] && C['LIMPEZA (EMPRESA AUXILIAR)'] && C['LIMPEZA (EMPRESA AUXILIAR)'].atual > 490000,
     'Curitiba: drone, roçada e limpeza + escala unidos (' + ['VIGILÂNCIA COM DRONE AUTÔNOMO', 'ROÇADA (LPU)', 'LIMPEZA (EMPRESA AUXILIAR)'].map(n => show(C, n)).join(' | ') + ')');
  // Itaú e PMOC de Curitiba achados no razão de 2026 (Guilherme, 12/10/2026): o 2026 entra na linha.
  const itau = Object.keys(C).filter(n => /ITAÚ|ITAU/.test(n)).map(n => C[n]);
  ok(itau.length === 1 && Math.abs(itau[0].ant - 86601.84) < 0.01 && /^Ano cheio \(começou em jun\/26\)$/.test(itau[0].situacao),
     'Curitiba: cerca elétrica do Itaú com o 2026 do ritmo ("Financiamento da Fibra Òptica", jul–dez) (' +
     itau.map(l => Math.round(l.ant) + ' ' + l.situacao).join() + ')');
  const pmocC = Object.keys(C).filter(n => /PMOC|AR CONDICIONADO|AR-COND/.test(n)).map(n => C[n]);
  ok(pmocC.length === 1 && pmocC[0].ant === 4000 && /^Era avulso em 2026$/.test(pmocC[0].situacao),
     'Curitiba: PMOC com os R$ 4.000 de 2026 (3 preventivas CLIMATIZAR) (' + pmocC.map(l => l.nome + ' ' + Math.round(l.ant) + ' ' + l.situacao).join() + ')');
  ok(!G._orcContratosNaoIdentificados_(cu.cmp).length, 'Curitiba: nenhum contrato com "2026 não identificado"');
  // Canaveral do Itajaí (V34, razão de 2026 "Teste_1", jan–out): contrato = notas da Canaveral; fora = nota
  // "fora de contrato" + compras gerais (sem diesel, caminhão-pipa e placas).
  const canC = Object.keys(I).filter(n => I[n].conta === 'Material de consumo' && /LIMPEZA E CONSUMO|CANAVERAL/.test(n)).map(n => I[n]);
  const canF = Object.keys(I).filter(n => I[n].conta === 'Material de consumo' && /FORA DO CONTRATO/.test(n)).map(n => I[n]);
  ok(canC.length === 1 && Math.abs(canC[0].ant - 21183.39) < 0.01 && canC[0].situacao === 'Realizado jan–out/26' &&
     canF.length === 1 && Math.abs(canF[0].ant - 11580.83) < 0.01 && canF[0].situacao === 'Realizado jan–out/26',
     'Itajaí: Canaveral contrato (R$ 21.183) e fora do contrato (R$ 11.581) com o 2026 do razão (' +
     canC.concat(canF).map(l => l.nome + ' ' + Math.round(l.ant) + ' ' + l.situacao).join(' | ') + ')');
  ok(!G._orcContratosNaoIdentificados_(it.cmp).length && !G.ORC_CONTRATOS_2026_NAO_ID.length,
     'Itajaí: nenhum contrato com "2026 não identificado" (12/10/2026)');
  // Lovable começou em mai/26 (nota "RATEIO ENTRE OS 3 MEGAS - MAIO/2026"; razão de Curitiba): sai de
  // "Novo em 2027", 2026 = mai–dez, 8 × o mensal do cadastro de 2027.
  [[I, 60.51, 'Itajaí'], [E, 13.59, 'Esteio']].forEach(([M, mensal, nome]) => {
    const lov = Object.keys(M).filter(n => /LOVABLE/.test(n)).map(n => M[n]);
    ok(lov.length === 1 && lov[0].situacao === 'Ano cheio (começou em mai/26)' && Math.abs(lov[0].ant - 8 * mensal) < 0.01,
       nome + ': Lovable "Ano cheio (começou em mai/26)", 2026 = 8 × R$ ' + mensal + ' (' + lov.map(l => Math.round(l.ant) + ' ' + l.situacao).join() + ')');
  });
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
  ok(tc.some(t => /^R\$ [\d,]+ (mil|mi)$/.test(t)) && tc.indexOf('/m²') >= 0 && tc.indexOf('Ritmo 2026') >= 0 && !tc.some(t => /vs\. ritmo/.test(t)),
     'capa em imagem: os números da METRAGEM por cima, em texto (' + tc.join(' | ') + ')');
  // Sub capa em imagem: só a 04 tem imagem no dublê; as outras ficam com formas.
  const slE = decks[ESTEIO.deckId].getSlides();
  const sub4 = slE.filter(x => x.shapes.some(s => s.nome === 'SUBCAPA - MEGA ESTEIO - 04.jpg'))[0];
  const ts4 = sub4 ? textos(sub4) : [];
  ok(sub4 && ts4.indexOf('04') < 0 && ts4.indexOf('Manutenção') < 0 && ts4.some(t => /^R\$ [\d,]+ (mil|mi)$/.test(t)) &&
     ts4.indexOf('/m²') >= 0, 'sub capa em imagem: só os números da seção por cima (' + ts4.join(' | ') + ')');
  const areas = sub4 ? sub4.shapes.filter(s => s.link) : [];
  ok(areas.length === 7 && areas.every(s => s.alpha === 0.01), 'sub capa em imagem: 7 áreas clicáveis na trilha (8 seções), com link');
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
  // Os slides de fotos do gestor ficam fora: sem a imagem do molde, o espaço da foto é um retângulo de verdade.
  const comHeader = slE.filter(x => comMold.indexOf(x) >= 0 && !x.notas);
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
  ok(nSub === 8 && d.salvos === nSub + 1,
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

// Deck por Mega: a geração apaga tudo e recria, MENOS os slides de fotos do gestor, que voltam para o fim.
{
  decks = {};
  G.gerarCuritiba();
  const d = decks[CUR.deckId];
  const marca = x => x.notas.indexOf('[REGISTRO FOTOGRÁFICO · CURITIBA]') === 0;
  const f1 = d.getSlides().filter(marca), n1 = d.getSlides().length;
  f1[1].shapes.push({ tipo: 'TEXT_BOX', x: 50, y: 300, w: 100, h: 14, texto: 'FOTO DO GESTOR' });
  G.gerarCuritiba();
  const s2 = d.getSlides(), f2 = s2.filter(marca);
  ok(f2.length === 3 && f2.map(x => x.id).join() === f1.map(x => x.id).join() && s2.slice(-3).every(marca) &&
     textos(f2[1]).indexOf('FOTO DO GESTOR') >= 0 && s2.length === n1 && textos(s2[s2.length - 4])[1] === 'Registro fotográfico',
     'deck por Mega: gerar de novo mantém os 3 slides de fotos do gestor, no fim, depois da sub capa 08 (' + s2.length + ' slides)');
}
// Sombra (Guilherme, 09/10/2026: "esse tem que ser o padrão"): todo slide com
// cabeçalho tem o conteúdo em card da moldura — tabela solta no fundo ganha o
// card do tamanho dela (_orcSombraTabela_), e é ele que leva a sombra.
{
  const semCard = {};
  G._ORC_MOLDURAS_PASSOS.forEach(p => {
    const s = JSON.parse(G._ORC_MOLDURAS_USADAS[p[2]]);
    if (s.header && !s.cards.length) semCard[p[1]] = true;
  });
  ok(!Object.keys(semCard).length, 'sombra: todo slide com cabeçalho tem card na moldura (sem card: ' + Object.keys(semCard).join(' | ') + ')');
}
console.log('Atualização de 12/10/2026, 19h56 (METRAGEM, 070 e contratos)');
// O rateio da Moked corrigido (gestor, 12/10/2026): Curitiba e Itajaí no cadastro de contratos (rev02) e o
// Esteio no 070 (R$ 7.000/mês). Com ele a METRAGEM nova fecha com o Orç dos modelos nos três Megas — no
// Esteio, com a cadeira de assistente de facilities DENTRO da despesa de pessoal (ORC_CONTAS_DENTRO: até as
// 20h ela somava por cima e o deck ficava R$ 90 mil acima). O 090 não mudou.
{
  const CAD_ANTES = porId[G.ORC_CONTRATOS_ANO_IDS[0]], M090_ANTES = porId[G.ORC_MODELO_090_ID], M070_ANTES = porId[G.ORC_MODELO_070_ID];
  const limpar = () => Object.keys(G._ORC_CADASTRO_ANO).forEach(k => { delete G._ORC_CADASTRO_ANO[k]; });
  porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
  porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027_1956.json');
  porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev02.json');
  limpar();
  const REV02 = fixture('fixture_contratos_2027_rev02.json');
  const tot = (l, re) => l.filter(k => re.test(k.fornecedor + ' ' + k.descricao)).reduce((t, k) => t + k.total, 0);
  ok(Math.round(tot(G._orcLerCadastroContratos_(REV02, 'Mega Curitiba', 'Segurança e vigilância', 2027), /MOKED|CONSULTORIA DE SEGURAN/i)) === 213377 &&
     Math.round(tot(G._orcLerCadastroContratos_(REV02, 'Mega Itajaí', 'Segurança e vigilância', 2027), /MOKED/i)) === 174891,
     'cadastro rev02: Moked Curitiba R$ 213.377 (17.781,40/mês) e Itajaí R$ 174.891 (14.574,25/mês)');
  const esperado = { CURITIBA: [7528284, 0], ITAJAI: [6643596, 0], ESTEIO: [4020587, 0] };
  [['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
    const cid = G.ORC_CIDADES[chave];
    const antes = { d: cid.despesasGeraisId, s: cid.servicosTerceirosId, o: cid.relatorios.orcDosModelos };
    cid.despesasGeraisId = G.ORC_MODELO_090_ID;
    cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
    cid.relatorios.orcDosModelos = true;
    const metNova = fixture('fixture_metragem_' + c + '_1956.json');
    porId[cid.relatorios.metragemId] = metNova;
    porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
    porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
    try {
      const rel = G._orcLerVisaoGeral_(chave).rel, met = G._orcLerMetragem_(metNova);
      ok(Math.round(rel.total.orc) === esperado[chave][0] && Math.round(rel.total.orc - met.total.orc) === esperado[chave][1],
         c + ' (19h56): Orç 2027 ' + G._orcMoeda_(rel.total.orc) + ', METRAGEM nova ' + G._orcMoeda_(met.total.orc) +
         ' (diferença esperada ' + G._orcMoeda_(esperado[chave][1]) + ')');
      if (chave === 'ESTEIO') {
        const moked = G._orcLinhasModelo_(fixture('fixture_070_megas_2027_1956.json'), 18).filter(l => /MOKED/.test(l.item));
        ok(moked.length === 1 && Math.abs(moked[0].total - 84000) < 0.01, 'esteio (19h56): Moked de R$ 7.000/mês no 070');
      }
      decks = {};
      G._orcGerar_([chave]);
      const sl = decks[cid.deckId].getSlides();
      ok(!sl.some(x => textos(x).some(t => t.indexOf('Falha ao gerar') === 0 || /…$/.test(t))), c + ' (19h56): nenhum slide com falha ou texto cortado');
      // Resumo executivo: o card do Orçamento do ano anterior e as mensagens com o porquê (12/10/2026).
      const re = sl.filter(x => titulo(x) === 'Resumo executivo — Orçamento 2027')[0], tre = re ? textos(re) : [];
      ok(tre.indexOf('ORÇAMENTO 2026') >= 0 && tre.some(t => /contas que mais sobem/.test(t)) && tre.some(t => /já são contratos/.test(t)) &&
         !tre.some(t => /…$/.test(t)), c + ' (19h56): resumo com o Orçamento 2026 e as mensagens novas (' + tre.slice(-8).join(' / ') + ')');
      // O asterisco da Despesa de pessoal: na DRE e nos ofensores do Esteio, com a nota no rodapé (a tabela não
      // encolhe — a moldura continua a mesma); nos outros Megas, nada.
      const nota = '* Despesa de pessoal: inclui R$ 90.000 da assistente de facilities, como consultoria até o RH aprovar.';
      const temNota = x => textos(x).some(t => /^Fonte: /.test(t) && t.indexOf(nota) >= 0);
      const comAst = sl.filter(x => textos(x).indexOf('Despesa de pessoal*') >= 0).map(titulo);
      ok(chave === 'ESTEIO' ? ['DRE — Orçamento 2027', 'Ofensores — Orçamento 2027'].every(t => comAst.indexOf(t) >= 0) &&
                              sl.filter(x => textos(x).indexOf('Despesa de pessoal*') >= 0).every(temNota)
                            : !comAst.length && !sl.some(temNota),
         c + ' (19h56): ' + (chave === 'ESTEIO' ? '"Despesa de pessoal*" e a nota na DRE e nos ofensores (' + comAst.join(', ') + ')' : 'sem asterisco'));
      ok(!rel.orcCalculado.semConta.some(s => /assessoria de rh|pessoal/i.test(s.nome)), c + ' (19h56): a assistente não vira pendência');
    } finally {
      cid.despesasGeraisId = antes.d;
      cid.servicosTerceirosId = antes.s;
      cid.relatorios.orcDosModelos = antes.o;
    }
  });
  // RITMO-ATUAL (20h43): o 2026 mês a mês fecha com a METRAGEM — os ajustes do mês a mês quase somem.
  {
    const cid = G.ORC_CIDADES.ESTEIO, antes = { d: cid.despesasGeraisId, s: cid.servicosTerceirosId, o: cid.relatorios.orcDosModelos };
    cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID; cid.relatorios.orcDosModelos = true;
    porId[cid.relatorios.metragemId] = fixture('fixture_metragem_esteio_1956.json');
    porId[cid.relatorios.mensalId] = fixture('fixture_mensal_esteio.json');
    const rit = G._orcLerRitmo_(fixture('fixture_ritmo_esteio_1956.json'));
    const manutR = rit[G._orcChaveConta_('Manutenção de imóveis')], kmR = rit[G._orcChaveConta_('KM, estacionamento e pedágio')];
    ok(manutR && Math.round(manutR.real.reduce((a, v) => a + v, 0)) === 601837 && !!kmR && !!rit[G._orcChaveConta_('Manutenção de máquinas e equipamentos')],
       'RITMO-ATUAL: lido conta a conta, Manutenção de imóveis com Ritmo 2026 = R$ 601.837 (METRAGEM), KM e bens móveis pelo sinônimo');
    const semR = G._orcLerVisaoGeral_('ESTEIO').rel.mensalConciliado || [];
    cid.relatorios.ritmoId = 'teste-ritmo-esteio';
    porId['teste-ritmo-esteio'] = fixture('fixture_ritmo_esteio_1956.json');
    const comR = G._orcLerVisaoGeral_('ESTEIO').rel.mensalConciliado || [];
    const grande = l => l.filter(a => Math.abs(a.dif) >= 1000 && a.k !== 'orc' && !/IPTU|Seguro/.test(a.nome));
    ok(grande(semR).length >= 4 && grande(comR).length === 0,
       'esteio: com a RITMO-ATUAL o 2026 mês a mês fecha com a DRE (ajustes de R$ 1 mil ou mais: ' + grande(semR).length + ' → ' +
       grande(comR).map(a => a.nome + ' ' + Math.round(a.dif)).join(', ') + ')');
    delete cid.relatorios.ritmoId;
    Object.assign(cid, { despesasGeraisId: antes.d, servicosTerceirosId: antes.s }); cid.relatorios.orcDosModelos = antes.o;
  }
  porId[G.ORC_CONTRATOS_ANO_IDS[0]] = CAD_ANTES;
  porId[G.ORC_MODELO_090_ID] = M090_ANTES;
  porId[G.ORC_MODELO_070_ID] = M070_ANTES;
  limpar();
}

console.log('Slides da Moked (28_Moked.gs)');
// Os slides da Implantação Moked (v3, 22 a 30) refeitos numa apresentação separada: criada na 1ª vez (o ID fica
// nas propriedades) e refeita inteira nas seguintes. Os slides 28 e 29 são cópias dos da v3 (as fotos do gestor).
{
  // A v3 de mentira: os slides 28 e 29 do gestor (marca nas anotações, título, texto dele, imagens, moldura, logo,
  // cartão e linha do molde) e um slide sem a marca com o mesmo texto, que não pode ser o escolhido.
  const v3 = novoDeck();
  const slideGestor = (textoDireita, imgs) => {
    const s = v3.appendSlide();
    s.notas = '[REGISTRO FOTOGRÁFICO · ESTEIO]\nSlide do gestor';
    s.shapes.push({ tipo: 'IMAGE', x: 0, y: 0, w: 720, h: 405, nome: 'MOLDURA - 10830624af2a.png' },
                  { tipo: 'IMAGE', x: 600, y: 20, w: 90, h: 24, nome: 'logo' },
                  { tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26, texto: 'Implantação Moked | Treinamento e Capacitação' },
                  { tipo: 'TEXT_BOX', x: 44, y: 36, w: 520, h: 18, texto: 'Subtítulo: conta, local ou obra · Mega Esteio' },
                  { tipo: 'ROUND_RECTANGLE', x: 30, y: 74, w: 660, h: 300, texto: null },
                  { tipo: 'LINE', x: 448, y: 92, w: 0, h: 264 },
                  { tipo: 'TEXT_BOX', x: 456, y: 96, w: 222, h: 200, texto: textoDireita },
                  { tipo: 'TEXT_BOX', x: 30, y: 385, w: 660, h: 14, texto: 'Fotos e textos preenchidos pelo gestor · Mega Esteio' });
    imgs.forEach(r => s.shapes.push(Object.assign({ tipo: 'IMAGE' }, r)));
    return s;
  };
  v3.appendSlide().shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26,
    texto: 'Implantação Moked | Treinamento e Capacitação · Aplicação de Orientações · Programa Quadrimestral' });
  slideGestor('Gestão Operacional Moked\nAplicação de Orientações e Procedimentos\nTreinamentos e Testes de Eventos de Atípicos',
    [{ x: 52, y: 88, w: 384, h: 97, nome: 'print do relatório' }, { x: 112, y: 193, w: 315, h: 161, nome: 'fichas' }]);
  slideGestor('Gestão Operacional Moked\nPrograma Quadrimestral de Treinamentos e aprimentos da equipe',
    [{ x: 52, y: 91, w: 229, h: 126, nome: 'foto 1' }, { x: 52, y: 223, w: 229, h: 127, nome: 'foto 2' },
     { x: 286, y: 88, w: 150, h: 267, nome: 'foto 3' }, { x: 499, y: 236, w: 166, h: 120, nome: 'ficha' }]);
  decks[G.ORC_DECK_VERSAO_GESTOR_ID] = v3;
  const v3Antes = JSON.stringify(v3._slides.map(s => s.shapes));
  // O slide do contrato lê a linha da Moked do Esteio no 070 (o de 12/10/2026, 19h56: R$ 7.000/mês).
  const s070Esteio = G.ORC_CIDADES.ESTEIO.servicosTerceirosId, s070Antes = porId[s070Esteio];
  porId[s070Esteio] = fixture('fixture_070_megas_2027_1956.json');

  const criadas = [];
  G.SlidesApp.create = nome => { const d = novoDeck(); d.getId = () => 'moked-teste'; decks['moked-teste'] = d; criadas.push(nome); return d; };
  delete PROPS_DADOS[G.ORC_MOKED.prop];
  const trilhaAntes = G._ORC_TRILHA, nMold = G._ORC_MOLDURAS_PASSOS.length;
  G.gerarSlidesMoked();
  G.gerarSlidesMoked();
  const sl = decks['moked-teste'].getSlides(), tudo = sl.map(s => textos(s).join(' | '));
  ok(criadas.length === 1 && PROPS_DADOS[G.ORC_MOKED.prop] === 'moked-teste',
     'Moked: a apresentação é criada uma vez e o ID fica nas propriedades (' + criadas.length + ' criadas)');
  ok(sl.length === 9, 'Moked: 9 slides (22 a 30 da v3) depois de gerar duas vezes (' + sl.length + ')');
  ok(JSON.stringify(v3._slides.map(s => s.shapes)) === v3Antes, 'Moked: a v3 só é lida (nada mudou nela)');
  // 28 e 29: cópias da v3 — ficam as imagens do conteúdo; saem moldura, logo, textos, cartão e linha do gestor.
  const imgs = s => s.shapes.filter(r => r.tipo === 'IMAGE').map(r => r.nome);
  ok(['print do relatório', 'fichas'].every(n => imgs(sl[6]).indexOf(n) >= 0) && imgs(sl[6]).indexOf('logo') < 0 &&
     imgs(sl[6]).indexOf('MOLDURA - 10830624af2a.png') < 0,
     'Moked: o 28 vem da v3 com o print e as fichas do gestor, sem a moldura e o logo antigos (' + imgs(sl[6]).join(', ') + ')');
  ok(!textos(sl[6]).some(t => /Subtítulo:|Gestão Operacional Moked|Eventos de Atípicos|preenchidos pelo gestor/.test(t)) &&
     textos(sl[6]).some(t => t.indexOf('• Treinamentos e testes de eventos atípicos') >= 0),
     'Moked: no 28 sai o texto antigo do gestor e entra a lista com o português revisto');
  const ficha = sl[7].shapes.filter(r => r.nome === 'ficha')[0];
  const direita = sl[7].shapes.filter(r => r.texto && r.x >= 450 && r.y > 80 && r.y < 380);
  ok(ficha && ['foto 1', 'foto 2', 'foto 3'].every(n => imgs(sl[7]).indexOf(n) >= 0) && direita.length &&
     direita.every(r => r.y + r.h <= ficha.y), 'Moked: no 29 ficam as fotos e a ficha, e o texto da direita para acima da ficha (' +
     direita.map(r => Math.round(r.y + r.h)).join(', ') + ' × ' + (ficha && ficha.y) + ')');
  ok(textos(sl[7]).some(t => /aprimoramento da equipe/.test(t)) && !textos(sl[7]).some(t => /aprimentos|Gestão Operacional Moked/.test(t)),
     'Moked: no 29, "aprimoramento" no lugar de "aprimentos"');
  // 30: a cláusula e o rateio como o gestor corrigiu (12/10/2026).
  const rat = G._orcMokedRateio_();
  ok(['Implantação Moked | Contrato e Rateio', '18,14%', '36,71%', '45,15%', 'R$ 6.826,00', 'R$ 13.814,45', 'R$ 16.993,04',
      '294.666,91', 'R$ 37.633,50', 'R$ 34.500,00'].every(x => tudo[8].indexOf(x) >= 0) &&
     Math.abs(rat.linhas.reduce((s, l) => s + l[3], 0) - G.ORC_MOKED.contrato.mensal) < 0.01,
     'Moked: o 30 com a cláusula e o rateio pela área (18,14% · R$ 6.826,00 …), que soma o contrato');
  ok(tudo[8].indexOf('MOKED NO ORÇAMENTO 2027 · MEGA ESTEIO') >= 0 && tudo[8].indexOf('R$ 84.000 no ano · R$ 7.000,00 por mês') >= 0,
     'Moked: o 30 mostra a linha da Moked no Orç 2027 do Esteio, lida do 070 (R$ 84.000 no ano)');
  porId[s070Esteio] = s070Antes;
  ok(sl.every(s => !textos(s).some(t => t.indexOf('Falha ao gerar') === 0)), 'Moked: nenhum slide com falha');
  ok(sl.every(s => !textos(s).some(t => /…$/.test(t))), 'Moked: nenhum texto cortado (' +
     sl.map(s => textos(s).filter(t => /…$/.test(t)).join(' / ')).filter(x => x).join(' | ') + ')');
  ok(sl.every(s => s.notas.indexOf('[REGISTRO FOTOGRÁFICO · ESTEIO]') === 0),
     'Moked: todos com a marca dos slides do gestor do Esteio nas anotações (a geração não os apaga)');
  ok(sl.every(s => textos(s).some(t => /^Implantação Moked \| /.test(t)) && !textos(s).some(t => /^Subtítulo:/.test(t))),
     'Moked: título "Implantação Moked | …" e subtítulo preenchido');
  [['3.643', 0], ['2.891', 0], ['752', 0], ['cerca de 2 registros situacionais por Mega por dia', 0], ['1.882', 1],
   ['82% de tudo', 1], ['≥ 143', 2], ['78% no Mega Curitiba', 2], ['81,9% operantes', 3], ['Brigada não aplicada', 3],
   ['168-19879', 4], ['MODERADO', 5], ['217 dispositivos', 5]]
    .forEach(c => ok(tudo[c[1]].indexOf(c[0]) >= 0, 'Moked: o slide ' + (c[1] + 1) + ' mostra "' + c[0] + '"'));
  ok(!tudo.some(t => /´|dia útil|aprimentos/.test(t)), 'Moked: sem os erros do texto original (acento solto, "dia útil")');
  // Os números do relatório fecham entre si.
  const M = G.ORC_MOKED, somaA = M.areas.reduce((s, r) => [s[0] + r[1], s[1] + r[2]], [0, 0]);
  ok(somaA[0] === M.registros[1][0] && somaA[1] === M.registros[2][0] && somaA[0] + somaA[1] === M.registros[0][0],
     'Moked: as áreas somam os registros de cada Mega (' + somaA.join(' + ') + ')');
  ok(M.porAno.reduce((s, p) => s + p[1], 0) === M.areas[0][1] && M.porAno.reduce((s, p) => s + (p[2] || 0), 0) === M.areas[0][2],
     'Moked: as ocorrências por ano somam a área Ocorrência de cada Mega');
  ok(M.painel.linhas.every(l => l[1].length === M.painel.semanas.length && /^[OPI-]+$/.test(l[1])),
     'Moked: painel com um estado por semana em cada dispositivo');
  // Moldura: a do molde de fotos do gestor, com a trilha em 05 Segurança (a imagem foi montada a partir da 08).
  const mold = G._ORC_MOLDURAS_PASSOS.slice(nMold).filter(p => /^Moked/.test(p[1])).map(p => p[2]);
  const spec = mold.length ? JSON.parse(G._ORC_MOLDURAS_USADAS[mold[0]]) : {};
  ok(mold.length === 18 && mold.every(x => x === mold[0]) && spec.secao === 5 && spec.cards.length === 1 &&
     mold[0] === '4c4ed339ecdc', 'Moked: uma moldura só (MOLDURA - 4c4ed339ecdc.png), trilha em 05 Segurança (' + mold[0] + ')');
  ok(G._ORC_TRILHA === trilhaAntes && G.CR_DESIGN_SYSTEM.colors.brandDark === G.ORC_MARCAS.CAPITAL.colors.brandDark,
     'Moked: trilha e marca voltam ao que eram');
  // Sem a v3 (o slide não está lá): 28 e 29 saem com o lugar das fotos marcado, e o resto igual.
  decks[G.ORC_DECK_VERSAO_GESTOR_ID] = novoDeck();
  G.gerarSlidesMoked();
  const sl2 = decks['moked-teste'].getSlides();
  ok(sl2.length === 9 && textos(sl2[6]).some(t => t.indexOf('Fotos do slide 28 da v3') === 0) &&
     textos(sl2[7]).some(t => t.indexOf('Fotos do slide 29 da v3') === 0) &&
     sl2.every(s => !textos(s).some(t => t.indexOf('Falha ao gerar') === 0)),
     'Moked: sem o slide na v3, o lugar das fotos fica marcado nos slides 28 e 29');
  delete decks[G.ORC_DECK_VERSAO_GESTOR_ID];
  delete G.SlidesApp.create;
}

console.log('Slides do gestor revisados (29_GestorRevisado.gs)');
// Cópias dos slides do gestor da v3 com subtítulo, português, título interno, LOCAL, rodapé e trilha corrigidos.
{
  const v3 = novoDeck();
  const gerado = sub => { const s = v3.appendSlide(); s.shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 36, w: 500, h: 18, texto: sub }); };
  const doGestor = (titulo, mega, extra) => {
    const s = v3.appendSlide();
    s.notas = '[REGISTRO FOTOGRÁFICO · ESTEIO]\nSlide do gestor';
    s.shapes.push({ tipo: 'IMAGE', x: 0, y: 0, w: 720, h: 405, nome: 'MOLDURA - 10830624af2a.png' },
                  { tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26, texto: titulo },
                  { tipo: 'TEXT_BOX', x: 44, y: 36, w: 520, h: 18, texto: 'Subtítulo: conta, local ou obra · ' + mega },
                  { tipo: 'TEXT_BOX', x: 456, y: 90, w: 222, h: 12, texto: extra.interno },
                  { tipo: 'TEXT_BOX', x: 456, y: 104, w: 222, h: 60, texto: extra.desc },
                  { tipo: 'TEXT_BOX', x: 456, y: 176, w: 222, h: 10, texto: 'CONTA' },
                  { tipo: 'TEXT_BOX', x: 456, y: 186, w: 222, h: 16, texto: 'Manutenção de imóveis' },
                  { tipo: 'TEXT_BOX', x: 456, y: 208, w: 222, h: 10, texto: 'LOCAL' },
                  { tipo: 'TEXT_BOX', x: 456, y: 218, w: 222, h: 16, texto: extra.local },
                  { tipo: 'TEXT_BOX', x: 30, y: 385, w: 660, h: 14, texto: 'Fotos e textos preenchidos pelo gestor · ' + mega },
                  { tipo: 'IMAGE', x: 52, y: 90, w: 380, h: 260, nome: 'foto' });
  };
  gerado('Manutenção · Mega Esteio');
  doGestor('Implantação Moked | Rotina de Segurança', 'Mega Esteio', { interno: 'X', desc: 'x', local: 'x' });
  doGestor('Automação Monitoramento Canal BR 116', 'Mega Esteio',
    { interno: 'MEDIÇÃO CANAL BR 116 + ESTAÇÃO METEREOLÓGICA', desc: 'texto', local: 'Escada Cobertura A e B2 (Fase 1)' });
  doGestor('Subst. Chicote Elétrico do Trator 03', 'Mega Esteio', { interno: 'PINTURA DA TUBULAÇÃO DE INCÊNDIO AÉREA', desc: '* Orçamento', local: 'Trator 03' });
  gerado('Manutenção: os itens de cada grupo (1/2) · Mega Itajaí');
  doGestor('Implantação Mastro de Bandeiras', 'Mega Esteio', { interno: 'LIMPEZA E LAVAGEM DAS ESTRUTURAS METÁLICAS',
    desc: 'Premissa de lavação com Drone as telhas metálicas de fechamento no Armazém A + B2. R$ 50.000,00', local: 'Fachadas armazém A e B2' });
  const v3Antes = JSON.stringify(v3._slides.map(s => s.shapes));
  const deck = novoDeck();
  const res = G._orcGerarGestorRevisados_(deck, v3), sl = deck.getSlides(), tt = s => textos(s).join(' | ');
  ok(sl.length === 3 && res.length === 3 && JSON.stringify(v3._slides.map(s => s.shapes)) === v3Antes,
     'gestor revisado: 3 slides (sem o da Moked) e a v3 intacta (' + sl.length + ')');
  ok(textos(sl[0]).indexOf('Manutenção de imóveis · Canal da BR-116 · Mega Esteio') >= 0 && tt(sl[0]).indexOf('METEOROLÓGICA') >= 0 &&
     textos(sl[0]).indexOf('Canal da BR-116') >= 0 && textos(sl[0]).indexOf('MEDIÇÃO CANAL BR 116 + ESTAÇÃO METEOROLÓGICA') >= 0,
     'gestor revisado: subtítulo preenchido, LOCAL e "meteorológica" corrigidos, título interno com palavra em comum mantido (' + tt(sl[0]) + ')');
  ok(textos(sl[1]).indexOf('SUBST. CHICOTE ELÉTRICO DO TRATOR 03') >= 0, 'gestor revisado: título interno copiado vira o título do slide');
  ok(textos(sl[2]).indexOf('Manutenção de imóveis · Fachadas armazém A e B2 · Mega Itajaí') >= 0 &&
     textos(sl[2]).indexOf('Fotos e textos preenchidos pelo gestor · Mega Itajaí') >= 0 && res[2].mega === 'Mega Itajaí' &&
     res[2].avisos.length === 2 && sl[2].notas.indexOf('[REGISTRO FOTOGRÁFICO · ITAJAI]') === 0,
     'gestor revisado: slide do Itajaí com o Mega certo e o aviso do molde esquecido (' + res[2].avisos.join(' / ') + ')');
  ok(sl.every(s => s.shapes.some(r => r.nome === 'foto')), 'gestor revisado: as fotos do gestor ficam');
}

console.log('Versão final (31_VersaoFinal.gs)');
// Cópia do deck de Facilities + os slides do gestor da v3 no lugar deles, a Moked no lugar dos slides dela.
{
  const gerado = (deck, titulo, sub) => {
    const s = deck.appendSlide();
    s.shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26, texto: titulo, id: 'e' + (++idForma) },
                  { tipo: 'TEXT_BOX', x: 44, y: 36, w: 520, h: 18, texto: sub, id: 'e' + (++idForma) });
    return s;
  };
  const doGestor = (deck, titulo, mega, nota) => {
    const s = deck.appendSlide();
    s.notas = (nota || '[REGISTRO FOTOGRÁFICO · ESTEIO]') + '\nSlide do gestor';
    s.shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26, texto: titulo },
                  { tipo: 'TEXT_BOX', x: 44, y: 36, w: 520, h: 18, texto: 'Subtítulo: conta, local ou obra · ' + mega },
                  { tipo: 'TEXT_BOX', x: 30, y: 385, w: 660, h: 14, texto: 'Fotos e textos preenchidos pelo gestor · ' + mega },
                  { tipo: 'IMAGE', x: 52, y: 90, w: 380, h: 260, nome: 'foto' });
    return s;
  };
  // A v3: o que o gestor montou em cima de uma geração antiga.
  const v3 = novoDeck(); v3._slides = [];
  gerado(v3, 'Sumário', 'Mega Esteio · Orçamento 2027');
  gerado(v3, 'Manutenção: projetos × custo recorrente', 'R$ 848 mil · Mega Esteio');
  doGestor(v3, 'Implantação Moked | Rotina de Segurança', 'Mega Esteio');
  doGestor(v3, 'Implantação Moked | Treinamento e Capacitação', 'Mega Esteio');
  doGestor(v3, 'Substituição Segurança | Cenário Hoje', 'Mega Esteio');
  gerado(v3, 'Manutenção: os itens de cada grupo (1/2)', '62 itens · Mega Esteio');
  doGestor(v3, 'Pintura Tubulação de Incêndio', 'Mega Esteio');
  gerado(v3, 'Manutenção: os itens de cada grupo (2/2)', '62 itens · Mega Esteio');
  gerado(v3, 'Sumário', 'Mega Itajaí · Orçamento 2027');
  gerado(v3, 'Manutenção: os itens de cada grupo (1/2)', '50 itens · Mega Itajaí');
  doGestor(v3, 'Pintura dos Prédios de Apoio', 'Mega Esteio');
  doGestor(v3, 'Retrofit e Adequação área de Copa e Cozinha', 'Mega Itajaí');
  gerado(v3, 'Sumário', 'Mega Curitiba · Orçamento 2027');
  doGestor(v3, 'Registro fotográfico — Título do assunto', 'Mega Curitiba', '[REGISTRO FOTOGRÁFICO · CURITIBA]');
  // A Moked (28_Moked.gs): três slides aqui.
  const mk = novoDeck(); mk._slides = [];
  ['Moked A', 'Moked B', 'Moked C'].forEach(t => doGestor(mk, t, 'Mega Esteio'));
  // A cópia do deck de Facilities gerado agora: Itajaí sem a paginação "(1/2)"; moldes de fotos e Revisar.
  const fac = novoDeck(); fac._slides = [];
  gerado(fac, 'Revisar antes da versão final', 'Mega Esteio · dados pendentes');
  const sumE = gerado(fac, 'Sumário', 'Mega Esteio · Orçamento 2027');
  gerado(fac, 'Manutenção: projetos × custo recorrente', 'R$ 850 mil · Mega Esteio');
  gerado(fac, 'Manutenção: os itens de cada grupo (1/2)', '63 itens · Mega Esteio');
  gerado(fac, 'Manutenção: os itens de cada grupo (2/2)', '63 itens · Mega Esteio');
  const fotoE = doGestor(fac, 'Registro fotográfico — Título do assunto', 'Mega Esteio');
  gerado(fac, 'Sumário', 'Mega Itajaí · Orçamento 2027');
  gerado(fac, 'Manutenção: os itens de cada grupo', '50 itens · Mega Itajaí');
  const sumC = gerado(fac, 'Sumário', 'Mega Curitiba · Orçamento 2027');
  const fotoC = doGestor(fac, 'Registro fotográfico — Título do assunto', 'Mega Curitiba', '[REGISTRO FOTOGRÁFICO · CURITIBA]');
  sumE.shapes[1].link = fotoE.id; sumC.shapes[1].link = fotoC.id;
  const v3Antes = JSON.stringify(v3._slides.map(s => [s.shapes, s.notas]));
  const r = G._orcMontarVersaoFinal_(fac, v3, mk), sl = fac.getSlides();
  const ordem = sl.map(s => textos(s)[0] || '');
  const esperado = ['Sumário', 'Manutenção: projetos × custo recorrente', 'Moked A', 'Moked B', 'Moked C',
    'Substituição Segurança | Cenário Hoje', 'Manutenção: os itens de cada grupo (1/2)', 'Pintura Tubulação de Incêndio',
    'Manutenção: os itens de cada grupo (2/2)', 'Sumário', 'Manutenção: os itens de cada grupo', 'Pintura dos Prédios de Apoio',
    'Retrofit e Adequação da Área de Copa e Cozinha', 'Sumário'];
  ok(JSON.stringify(ordem) === JSON.stringify(esperado),
     'versão final: Moked e slides do gestor no lugar da v3, sem Revisar e sem moldes (' + ordem.join(' / ') + ')');
  ok(r.gestor === 4 && r.moked === 3 && r.total === 14, 'versão final: 4 do gestor e 3 da Moked (' + r.gestor + ', ' + r.moked + ', ' + r.total + ')');
  ok(textos(sl[11]).indexOf('Fotos e textos preenchidos pelo gestor · Mega Itajaí') >= 0 && sl[11].notas.indexOf('[REGISTRO FOTOGRÁFICO · ITAJAI]') === 0,
     'versão final: slide do gestor revisado com o Mega da seção (' + textos(sl[11]).join(' | ') + ')');
  ok(sumE.shapes[1].link === sl[2].id && !('link' in sumC.shapes[1]),
     'versão final: link do sumário vai para o primeiro slide do gestor do Mega; sem slide do gestor, sai');
  ok(JSON.stringify(v3._slides.map(s => [s.shapes, s.notas])) === v3Antes, 'versão final: a v3 não muda');
}

console.log('Ajustes dos slides do gestor (ORC_GESTOR_AJUSTES)');
// Valor do orçamento com selo, campos copiados de outro slide, tabela refeita e o slide fora do orçamento.
{
  const v3 = novoDeck(); v3._slides = [];
  const gerado = sub => { const s = v3.appendSlide(); s.shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 36, w: 500, h: 18, texto: sub }); };
  const doGestor = (titulo, mega, campos, extra) => {
    const s = v3.appendSlide();
    s.notas = '[REGISTRO FOTOGRÁFICO · ESTEIO]\nSlide do gestor';
    s.shapes.push({ tipo: 'IMAGE', x: 0, y: 0, w: 720, h: 405, nome: 'MOLDURA - 10830624af2a.png' },
                  { tipo: 'TEXT_BOX', x: 44, y: 12, w: 520, h: 26, texto: titulo },
                  { tipo: 'TEXT_BOX', x: 44, y: 36, w: 520, h: 18, texto: 'Subtítulo: conta, local ou obra · ' + mega },
                  { tipo: 'TEXT_BOX', x: 463, y: 96, w: 222, h: 12, texto: campos.interno || 'TÍTULO DO ASSUNTO' },
                  { tipo: 'TEXT_BOX', x: 463, y: 110, w: 222, h: 60, texto: campos.desc || 'texto do gestor' },
                  { tipo: 'TEXT_BOX', x: 463, y: 262, w: 222, h: 10, texto: 'CONTA' },
                  { tipo: 'TEXT_BOX', x: 463, y: 272, w: 222, h: 16, texto: campos.conta },
                  { tipo: 'TEXT_BOX', x: 463, y: 294, w: 222, h: 10, texto: 'LOCAL' },
                  { tipo: 'TEXT_BOX', x: 463, y: 304, w: 222, h: 16, texto: campos.local },
                  { tipo: 'TEXT_BOX', x: 463, y: 326, w: 222, h: 10, texto: 'VALOR NO ORÇ 2027' },
                  { tipo: 'TEXT_BOX', x: 463, y: 336, w: 222, h: 16, texto: campos.valor },
                  { tipo: 'IMAGE', x: 52, y: 90, w: 380, h: 260, nome: 'foto' });
    (extra || []).forEach(r => s.shapes.push(r));
  };
  const tabela = (linhas, total) => ({ tipo: 'TABLE', x: 44, y: 188, w: 390, h: 180,
    celulas: [['LOCAL', 'TAMANHO (M2)', 'FREQUÊNCIA', 'TOTAL']].concat(linhas, [total]) });
  gerado('Manutenção · Mega Esteio');
  doGestor('Instalação de Linha de Vida Vertical | Fase 1', 'Mega Esteio',
    { conta: 'Manutenção de imóveis', local: 'Escada Cobertura A e B2 (Fase 1)', valor: 'R$ 15.270,00' });
  doGestor('Subst. Chicote Elétrico do Trator 03', 'Mega Esteio',
    { conta: 'Manutenção de Bens Móveis', local: 'Trator 03', valor: 'R$ 54.978,55', interno: 'CHICOTE ELÉTRICO DO TRATOR' });
  gerado('Manutenção: os itens de cada grupo (1/2) · Mega Itajaí');
  const linhasIt = [['ÁREA DE ACESSO', '100', 'SEMESTRAL (2X)', 'R$ 3.900,00'], ['EMB. DESEMBARQ.', '20', 'SEMESTRAL (2X)', 'R$ 780,00'],
    ['PONTE', '22,2', 'SEMESTRAL (2X)', 'R$ 865,80'], ['BOLSÃO', '300', 'ANUAL', 'R$ 11.700,00'], ['CALÇADAS', '476,69', 'ANUAL', 'R$ 26.218,14'],
    ['VIAS DE CARRO', '1.059', 'ANUAL', 'R$ 41.334,54'], ['TACHINHAS', 'N/A (100 und)', 'SOB DEMANDA', 'R$ 5.500,00']];
  doGestor('Manutenção Comunicação Horizontal (CVISH)', 'Mega Itajaí',
    { conta: 'Manutenção de imóveis', local: 'Pavimentação Intertravada', valor: 'R$ 105.844,28', interno: 'PLANO DE MANUTENÇÃO CVISH' },
    [tabela(linhasIt, ['TOTAL', '1.977,89', 'N/A', 'R$ 105.844,28'])]);
  doGestor('Implantação A Sense', 'Mega Itajaí',
    { conta: 'Manutenção de imóveis', local: 'Escada Cobertura (Fase 1, 2 e 3)', valor: 'R$ 15.000,00/mês (Financiamento)',
      interno: 'PROJETO DE FIBRA ÓPTICA A SENSE' });
  doGestor('Implantação Torniquetes Digicon TX 1500', 'Mega Itajaí',
    { conta: 'Manutenção de imóveis', local: 'Acessos', valor: 'R$ 205.000,00', interno: 'AQUISIÇÃO DE 3 TORNIQUETES DIGICON' });
  gerado('Manutenção · Mega Curitiba');
  doGestor('Comunicação Horizontal (CVISH)', 'Mega Curitiba',
    { conta: 'Manutenção de imóveis', local: 'Armazém, área ou equipamento', valor: 'R$ —', interno: 'O QUE MOSTRAR',
      desc: 'Escreva aqui a descrição: o que as fotos mostram e por que isso importa para o orçamento.' },
    [tabela(linhasIt, ['TOTAL', '1.977,89', 'N/A', 'R$ 105.844,28']),
     { tipo: 'TEXT_BOX', x: 463, y: 356, w: 222, h: 12, texto: 'Legenda: data e local da foto.' }]);
  doGestor('Implantação Torniquete 4', 'Mega Curitiba',
    { conta: 'Manutenção de imóveis', local: 'Pavimento Intertravado', valor: 'R$ 216.000,00', interno: 'TORNIQUETE 4' });
  doGestor('Paisagismo Restaurante Sodexo + Jardim Vertical', 'Mega Curitiba',
    { conta: 'Manutenção de imóveis', local: 'Fundos do restaurante', valor: 'R$ 216.000,00', interno: 'PAISAGISMO' });
  const v3Antes = JSON.stringify(v3._slides.map(s => s.shapes));
  const deck = novoDeck();
  const res = G._orcGerarGestorRevisados_(deck, v3), sl = deck.getSlides();
  const tem = (s, t) => textos(s).indexOf(t) >= 0;
  const tab = s => s.shapes.filter(r => r.tipo === 'TABLE')[0].celulas;
  ok(sl.length === 8 && JSON.stringify(v3._slides.map(s => s.shapes)) === v3Antes, 'ajustes: 8 slides e a v3 intacta');
  ok(tem(sl[6], 'R$ 86.550,00') && tem(sl[6], 'Acessos') && tem(sl[6], '⚠ VALOR DO ORÇAMENTO · ERA R$ 216.000,00'),
     'ajustes: torniquete 4 de Curitiba com LOCAL e VALOR copiados → os do orçamento (' + textos(sl[6]).join(' | ') + ')');
  ok(tem(sl[7], 'Fundos do restaurante') && tem(sl[7], 'R$ 216.000,00') && res[7].avisos.some(a => a.indexOf('não troquei') >= 0),
     'ajustes: LOCAL que o gestor já corrigiu fica, só com aviso');
  ok(tem(sl[0], '⚠ FORA DO ORÇAMENTO 2027 · PARA DECISÃO') && tem(sl[0], 'R$ 15.270,00'),
     'ajustes: linha de vida do Esteio fica, com o selo "fora do orçamento" e o valor do gestor');
  ok(tem(sl[1], 'R$ 54.978,56') && !textos(sl[1]).some(t => t.indexOf('⚠') === 0), 'ajustes: centavos corrigidos sem selo');
  const it = tab(sl[2]);
  ok(tem(sl[2], 'R$ 95.844,28') && tem(sl[2], '⚠ VALOR DO ORÇAMENTO · ERA R$ 105.844,28') && tem(sl[2], 'Vias, docas, bolsão e calçadas') &&
     it[0][3] === 'TOTAL NO ANO' && it[1][3] === 'R$ 7.800,00' && it[8][3] === 'R$ 95.844,28' && tem(sl[2], 'Manutenção de imóveis · Vias, docas, bolsão e calçadas · Mega Itajaí'),
     'ajustes: CVISH do Itajaí com o valor do orçamento, selo, LOCAL e a tabela no ano (' + it.map(l => l[3]).join(' / ') + ')');
  ok(tem(sl[3], 'Segurança e vigilância') && tem(sl[3], 'Perímetro externo (6 zonas)') && tem(sl[3], 'R$ 12.500,00/mês · R$ 150.000,00 no ano') &&
     tem(sl[3], 'Segurança e vigilância · Perímetro externo (6 zonas) · Mega Itajaí'),
     'ajustes: A Sense com CONTA, LOCAL, valor do 070 e subtítulo de segurança (' + textos(sl[3]).join(' | ') + ')');
  ok(tem(sl[4], 'R$ 205.000,00') && !tem(sl[4], 'R$ 206.700,00') && res[4].avisos.some(a => a.indexOf('não troquei') >= 0),
     'ajustes: valor mudado pelo gestor não é trocado, só avisado');
  const cu = tab(sl[5]);
  ok(tem(sl[5], 'R$ 75.758,16') && tem(sl[5], '⚠ PREENCHIDO PELO ORÇAMENTO · CONFERIR') && tem(sl[5], 'PLANO DE MANUTENÇÃO CVISH') &&
     tem(sl[5], 'Vias, docas, bolsão e lombadas') && !textos(sl[5]).some(t => /^Escreva aqui|^Legenda: data/.test(t)) &&
     cu[1][0] === 'FRENTE DE DOCAS' && cu[8][1] === '1.179,47' && cu[8][3] === 'R$ 75.758,16',
     'ajustes: CVISH de Curitiba preenchido pelo orçamento (descrição, LOCAL, VALOR e tabela)');
  // A tabela de Curitiba soma o total.
  const soma = cu.slice(1, 8).reduce((a, l) => a + Number(l[3].replace(/[R$\s.]/g, '').replace(',', '.')), 0);
  ok(Math.abs(soma - 75758.16) < 0.01, 'ajustes: as linhas da tabela de Curitiba somam o total (' + soma.toFixed(2) + ')');
  const somaIt = it.slice(1, 8).reduce((a, l) => a + Number(l[3].replace(/[R$\s.]/g, '').replace(',', '.')), 0);
  ok(Math.abs(somaIt - 95844.28) < 0.01, 'ajustes: as linhas da tabela do Itajaí somam o total (' + somaIt.toFixed(2) + ')');
}

console.log('Fontes guardadas (32_Fontes.gs)');
// A coluna FONTE digitada no slide vai para a aba "Fontes" e volta na geração seguinte.
{
  const deck = novoDeck(); deck._slides = [];
  const s = deck.appendSlide();
  const caixa = (x, y, t) => s.shapes.push({ tipo: 'TEXT_BOX', x: x, y: y, w: 100, h: 18, texto: t });
  caixa(44, 12, 'Demais categorias (1/2)');
  caixa(44, 36, '14 categorias com menos de 5% cada · R$ 222.859 · 26,3% do orçamento de manutenção');
  caixa(172, 76, 'ITEM'); caixa(560, 76, 'FONTE');
  caixa(172, 96, 'LINHA DE VIDA – ESCADA MARINHEIRO AMZ A'); caixa(560, 96, 'ORÇ. PROSSALTER');
  caixa(172, 118, 'REVISÃO SEMESTRAL DOS BEBEDOUROS (AMZ A E B)'); caixa(560, 118, '—');
  caixa(172, 140, 'COMPRA DE 22 MEDIDORES DE ENERGIA TRIFASICO DIRETO 100A…'); caixa(560, 140, 'ORÇ. CAS');
  caixa(44, 385, 'Orçamento 2027 · Mega Esteio · Manutenção de Imóveis · categorias abaixo de 5% do total');
  const abaVelha = PLANILHA_TEXTOS.getSheetByName('Fontes');   // a das gerações acima: este teste começa sem ela
  if (abaVelha) PLANILHA_TEXTOS.deleteSheet(abaVelha);
  const lidas = G._orcFontesDoSlide_(s, null);
  ok(lidas.length === 2 && lidas[0].mega === 'Mega Esteio' && lidas[0].fonte === 'ORÇ. PROSSALTER',
     'fontes: lê a coluna FONTE digitada, sem o "—" (' + JSON.stringify(lidas) + ')');
  G._orcTextosReiniciar_();
  const r1 = G._orcGuardarFontes_(lidas);
  const aba = PLANILHA_TEXTOS.getSheetByName('Fontes');
  ok(r1.novas === 2 && aba && aba.getDataRange().getValues().length === 3, 'fontes: 2 linhas novas na aba Fontes');
  // A fonte volta: pelo texto do item, pelo começo do texto cortado e só no Mega certo.
  G._orcTextosReiniciar_();
  ok(G._orcCelulaFonte_(G.ORC_CIDADES.ESTEIO, 'Linha de vida – escada marinheiro AMZ A').texto === 'ORÇ. PROSSALTER' &&
     G._orcCelulaFonte_(G.ORC_CIDADES.ESTEIO, 'COMPRA DE 22 MEDIDORES DE ENERGIA TRIFASICO DIRETO 100A - PROJETO AUTOMAÇÃO DE LEITURAS').texto === 'ORÇ. CAS' &&
     G._orcCelulaFonte_(G.ORC_CIDADES.ITAJAI, 'LINHA DE VIDA – ESCADA MARINHEIRO AMZ A').texto === '—' &&
     G._orcCelulaFonte_().texto === '—',
     'fontes: a geração escreve a fonte guardada do item (texto exato ou cortado), só no Mega dele');
  // Fonte trocada no slide troca a da aba; "—" não apaga.
  s.shapes[5].texto = 'ORÇ. PROSSALTER (REV.)';
  const r2 = G._orcGuardarFontes_(G._orcFontesDoSlide_(s, 'Mega Esteio'));
  ok(r2.trocadas === 1 && r2.iguais === 1 && aba.getDataRange().getValues()[1][2] === 'ORÇ. PROSSALTER (REV.)',
     'fontes: fonte nova no slide troca a da aba (' + JSON.stringify(r2) + ')');
  // A aba Fontes não vira "texto escolhido" das descrições.
  G._orcTextosReiniciar_();
  ok(!Object.keys(G._orcLerEscolhas_()).some(a => a === 'Fontes'), 'fontes: a aba Fontes não é lida como textos');
  // Slide que não é de manutenção não é lido.
  const outro = deck.appendSlide();
  outro.shapes.push({ tipo: 'TEXT_BOX', x: 172, y: 76, w: 100, h: 18, texto: 'ITEM' }, { tipo: 'TEXT_BOX', x: 560, y: 76, w: 100, h: 18, texto: 'FONTE' },
                    { tipo: 'TEXT_BOX', x: 560, y: 96, w: 100, h: 18, texto: 'X' }, { tipo: 'TEXT_BOX', x: 172, y: 96, w: 100, h: 18, texto: 'Y · Mega Esteio' });
  ok(G._orcFontesDoSlide_(outro, null).length === 0, 'fontes: só as tabelas de manutenção');
  PLANILHA_TEXTOS.deleteSheet(aba);
  G._orcTextosReiniciar_();
}

// Num slide gerado de verdade (não montado à mão): a coluna FONTE digitada é achada, e o slide de categoria também.
{
  const gerados = Object.keys(decks).map(k => decks[k]).filter(d => d._slides)
    .reduce((a, d) => a.concat(d._slides), []);
  const demais = gerados.filter(s => /^Demais categorias/.test(textos(s)[0] || ''))[0];
  const cat = gerados.filter(s => textos(s).some(t => /^TOTAL [A-ZÁÉÍÓÚÇ]/.test(t)) && textos(s).some(t => t === '% CAT.'))[0];
  const digitar = s => {
    const iF = s.shapes.findIndex(r => r.texto === 'FONTE');
    const cel = s.shapes.filter(r => r.texto === '—' && Math.abs(r.x - s.shapes[iF].x) < 1.5)[0];
    cel.texto = 'ORÇ. TESTE';
  };
  ok(!!demais && !!cat, 'fontes: há slides de Demais e de categoria nos decks do teste');
  digitar(demais); digitar(cat);
  const a = G._orcFontesDoSlide_(demais, 'Mega Teste'), b = G._orcFontesDoSlide_(cat, 'Mega Teste');
  const teste = l => l.filter(x => x.fonte === 'ORÇ. TESTE');
  ok(teste(a).length === 1 && teste(a)[0].item.length > 5 && teste(b).length === 1,
     'fontes: lidas nos slides gerados (' + JSON.stringify(teste(a).concat(teste(b))) + ')');
  // As fontes dos prints de 12/10 já saem na geração (antes de qualquer salvarFontes()).
  const comPrint = gerados.filter(s => /^Demais categorias/.test(textos(s)[0] || '') && textos(s).some(t => /Mega Esteio/.test(t)))
    .reduce((acc, s) => acc.concat(textos(s)), []);
  ok(comPrint.indexOf('ORÇ. MIRIAD') >= 0 || comPrint.indexOf('ORÇ. PROSSALTER') >= 0 || comPrint.indexOf('PREMISSA') >= 0,
     'fontes: as dos prints saem nas Demais categorias do Esteio gerado');
}

// Manifesto das molduras (v2): assinatura -> especificacao de toda moldura que
// os tres Megas usaram; ferramentas/molduras_imagem.py desenha as imagens.
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'molduras.json'), JSON.stringify(G._ORC_MOLDURAS_USADAS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'graficos.json'), JSON.stringify(G._ORC_GRAFICOS_USADOS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'graficos_passos.json'), JSON.stringify(G._ORC_GRAFICOS_PASSOS, null, 1));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'molduras_passos.json'), JSON.stringify(G._ORC_MOLDURAS_PASSOS, null, 1));
console.log('\n' + (total - falhas) + '/' + total + ' asserções ok');
process.exit(falhas ? 1 : 0);
