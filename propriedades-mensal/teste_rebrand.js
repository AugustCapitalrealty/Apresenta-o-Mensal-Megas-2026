// Teste do rebrand da Apresentação Mensal de Propriedades (06_Visual.gs,
// padrão do Orçamento 2027, o mesmo das TVs). Desenha os slides já
// convertidos e confere em cada um:
//   - título na fonte e na cor da marca, fundo da marca;
//   - nenhum texto que não cabe na caixa (medido com a largura real das
//     letras) e nenhuma forma fora da página;
//   - nada invadindo o rodapé;
//   - a marca não vaza de um slide para o outro (nem para os slides que
//     ainda estão no visual antigo).
// Molde: gestao-tvs/teste_rebrand.js.
//
// Rodar: node propriedades-mensal/teste_rebrand.js
// Prévia: PREVIA=<pasta> node propriedades-mensal/teste_rebrand.js → grava
//   <pasta>/formas_propriedades.json; as imagens saem com
//   node ferramentas/previa_slides.js <pasta>/formas_propriedades.json <pasta>
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = __dirname;
let ok = 0, falha = 0;
const t = (c, m) => { c ? ok++ : (falha++, console.log('FALHOU: ' + m)); };

// ── Dublê do SlidesApp, gravando no formato de ferramentas/previa_slides.js ──
let formas = [], fundo = null;
function novaForma(tipo, x, y, w, h) {
  [x, y, w, h].forEach(v => { if (typeof v !== 'number' || isNaN(v)) throw new Error('geometria NaN em ' + tipo); });
  if (w < 0 || h < 0) throw new Error('dimensão negativa em ' + tipo);
  const f = { tipo, x, y, w, h, texto: null };
  formas.push(f);
  const lineFill = { setSolidFill: c => { if (!c) throw new Error('borda ' + c); f.borda = c; } };
  const borda = { setTransparent: () => { delete f.borda; return borda; }, getLineFill: () => lineFill,
                  setWeight: p => { f.peso = p; return borda; }, setDashStyle: () => borda };
  const estilo = new Proxy({}, { get: (o, k) => (v) => {
    if (k === 'setFontSize') { if (!(v > 0)) throw new Error('fonte ' + v); f.fs = v; }
    if (k === 'setBold') f.negrito = !!v; if (k === 'setItalic') f.italico = !!v;
    if (k === 'setForegroundColor') { if (!v) throw new Error('cor ' + v); f.corTexto = v; }
    if (k === 'setFontFamily') f.fonte = v;
    return estilo; } });
  const par = { setParagraphAlignment: a => { f.align = a; return par; },
                setLineSpacing: v => { if (v < 100) throw new Error('spacing'); return par; } };
  const texto = {
    setText: v => { if (tipo !== 'TEXT_BOX') throw new Error('texto em ' + tipo); f.texto = String(v); return texto; },
    getTextStyle: () => { if (!f.texto) throw new Error('The object has no text.'); return estilo; },
    getParagraphStyle: () => par, asString: () => f.texto || ''
  };
  return {
    getFill: () => ({ setSolidFill: (c, a) => { if (!c) throw new Error('setSolidFill(' + c + ')'); f.cor = c; if (a !== undefined) f.alpha = a; },
                     setTransparent: () => { delete f.cor; } }),
    getBorder: () => borda, getText: () => texto,
    setContentAlignment: a => { f.meio = a === 'MIDDLE'; },
    getLineFill: () => ({ setSolidFill: c => { f.cor = c; } }), setWeight: p => { f.peso = p; },
    setDashStyle: () => {}, remove: () => { f.removida = true; }
  };
}
const notas = { getSpeakerNotesShape: () => ({ getText: () => ({ setText: () => {}, asString: () => '' }) }) };
const slide = {
  getObjectId: () => 'S', getNotesPage: () => notas, remove: () => {}, move: () => {},
  getPageElements: () => formas.filter(f => !f.removida).map(f => ({ remove: () => { f.removida = true; } })),
  getBackground: () => ({ setSolidFill: c => { fundo = c; } }),
  insertShape: (tipo, x, y, w, h) => novaForma(tipo, x, y, w, h),
  insertLine: (cat, x1, y1, x2, y2) => {
    const o = novaForma('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    Object.assign(formas[formas.length - 1], { x1, y1, x2, y2 });
    return o;
  },
  insertImage: () => {
    // Logo 3,5:1, como o da Capital Realty.
    const iw = 350, ih = 100;
    const f = { tipo: 'IMAGE', x: 0, y: 0, w: iw, h: ih, rotulo: 'logo', texto: null };
    formas.push(f);
    // Os set* devolvem a própria imagem, como no Slides (o código encadeia).
    const img = { getWidth: () => iw, getHeight: () => ih, setLeft: v => { f.x = v; return img; }, setTop: v => { f.y = v; return img; },
                  setWidth: v => { f.w = v; return img; }, setHeight: v => { f.h = v; return img; }, bringToFront: () => img };
    return img;
  }
};
const deck = { getPageWidth: () => 720, getPageHeight: () => 405, getSlides: () => [], appendSlide: () => slide };
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }), LineCategory: { STRAIGHT: 'STRAIGHT' },
  ContentAlignment: { MIDDLE: 'MIDDLE', TOP: 'TOP' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START', END: 'END' },
  PredefinedLayout: { BLANK: 'BLANK' }, DashStyle: new Proxy({}, { get: (o, k) => k })
};
global.DriveApp = { getFileById: id => ({ getBlob: () => ({ id }) }) };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha no teste de desenho'); } };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

// ── Carrega o projeto ───────────────────────────────────────────────────────
const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
const FONTES = ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8'));
(0, eval)(FONTES.join('\n').replace(/^(const|let) /gm, 'var '));
global.getDeckMensal_ = () => deck;

// Lição 7: com const DE VERDADE e na ordem alfabética do editor, nenhum
// arquivo pode ler um const de outro antes de ele existir. Um erro aqui
// derruba o projeto inteiro no Apps Script.
{
  let erro = null;
  try { vm.runInNewContext(FONTES.join('\n'), { Logger: global.Logger, console }); } catch (e) { erro = e; }
  t(!erro, 'carrega com const de verdade, em ordem alfabética (lição 7) → ' + (erro && erro.message));
}
t(/^(const|let) PV_MARCAS|^(const|let) _PV_/m.test(fs.readFileSync(path.join(DIR, '06_Visual.gs'), 'utf8')) &&
  !/^(const|let) [A-Za-z_]+ = .*CR_DESIGN_SYSTEM/m.test(fs.readFileSync(path.join(DIR, '06_Visual.gs'), 'utf8')),
  '06_Visual.gs: const de topo só com valores literais');

// ── Dados do Dashboard (a leitura tem teste próprio: teste_dashboard.js) ────
const linha3 = (atual, mesAnt, anoAnt) => ({ atual, mesAnt, anoAnt });
function dashboard(op) {
  const map = new Map();
  map.set('SLA Preventivas', linha3(96.03, 94.81, 92.5));
  map.set('Backlog em aberto', linha3(74, 80, 95));
  map.set('Percentual de conclusão histórico', linha3(88.4, 87.9, 80.2));
  map.set('Orçamento 2026 (Total)', linha3('R$ 604.543', null, null));
  map.set('Ritmo 2025 (Base)', linha3('R$ 617.369', null, null));
  map.set('Orçamento Capital Realty', linha3('R$ 421.028', null, null));
  map.set('Orçamento Demercado', linha3('R$ 183.515', null, null));
  map.set('Economia Projetada (26/25)', linha3('+R$ 12.826 (−2,1%)', null, null));
  map.set('CAPEX', linha3('—', null, null));
  ['Vistorias - Entrada/saída', 'Vistorias - Recebimento obras', 'Vistorias - Monitoramento', 'Vistorias - Documentação',
   'Adequações - Quantidade', 'Adequações - Prazo médio', 'Adequações - Conclusão (%)'].forEach(k => map.set(k, linha3('—', null, null)));
  map.set('Contratações em andamento', linha3(12, null, null));
  map.set('Contratações conclusão (%)', linha3('4', null, null));
  map.set('Contratações prazo médio', linha3('15', null, null));
  if (op && op.vazio) map.forEach((v, k) => map.set(k, linha3(null, null, null)));
  return { headers: ["AGO'26", "JUL'26", "AGO'25"], map, parcial: !!(op && op.parcial) };
}
let DADOS = dashboard();
global.obterDashboardPropriedades_ = () => DADOS;

// ── Slides já no visual novo ────────────────────────────────────────────────
const SLIDES = {
  'Dashboard Operacional': () => gerarSlideIndicadoresGerais()
};
// O que cada um precisa ter. A marca de cada slide (Demercado só onde o
// conteúdo é da Demercado).
const MARCA = { 'Dashboard Operacional': 'CAPITAL' };
const MARCAS = {
  CAPITAL: { fonte: 'Montserrat', cor: '#151E49', fundo: '#F8FAFC' },
  DEMERCADO: { fonte: 'EB Garamond', cor: '#00594F', fundo: '#F8FAF9' }
};

const ORIGINAL = JSON.stringify({ c: CR_DESIGN_SYSTEM.colors, t: CR_DESIGN_SYSTEM.typography });
const saida = { W: 720, H: 405, slides: [] };
function rodar(nome, rotulo) {
  formas = []; fundo = null; logs.length = 0;
  SLIDES[nome]();
  const vivas = formas.filter(f => !f.removida);
  saida.slides.push({ nome: rotulo || nome, fundo, formas: vivas });
  return vivas;
}

function conferir(nome, vivas, rot) {
  const m = MARCAS[MARCA[nome]];
  t(!logs.some(l => /✗|falha|NÃO FOI GERADO/i.test(l)), rot + ': sem falha no Logger → ' + logs.filter(l => /✗|falha/i.test(l)).join(' | '));
  t(!vivas.some(f => /NÃO FOI GERADO/.test(f.texto || '')), rot + ': sem aviso de falha no slide');
  const titulo = vivas.find(f => f.texto && f.y < 40 && f.fs >= 14);
  t(titulo && titulo.fonte === m.fonte, rot + ': título na fonte da marca → ' + (titulo && titulo.fonte));
  t(titulo && titulo.corTexto === m.cor, rot + ': título na cor da marca → ' + (titulo && titulo.corTexto));
  t(fundo === m.fundo, rot + ': fundo da marca → ' + fundo);
  const fora = vivas.filter(f => f.x < 0 || f.y < 0 || f.x + f.w > 720.01 || f.y + f.h > 405.01);
  t(!fora.length, rot + ': forma fora da página → ' + JSON.stringify(fora[0]));
  const estouro = vivas.filter(f => f.texto && f.fs && f.texto.indexOf('\n') < 0 && f.h <= 36 &&
    _pvLargura_(f.texto, f.fs, f.fonte, f.negrito) > f.w - _PV_RECUO_ + 0.5);
  t(!estouro.length, rot + ': texto que não cabe → ' + estouro.map(f => `"${f.texto}"@${f.fs}`).join(' | '));
  const NL = String.fromCharCode(10);
  const paragrafo = vivas.filter(f => f.texto && f.fs && f.texto.indexOf(NL) >= 0).filter(f => {
    const ls = f.texto.split(NL);
    return ls.some(l => _pvLargura_(l, f.fs, f.fonte, f.negrito) > f.w - _PV_RECUO_ + 0.5) || ls.length * f.fs * 1.25 + 8 > f.h + 0.5;
  });
  t(!paragrafo.length, rot + ': parágrafos cabem → ' + paragrafo.map(f => JSON.stringify(f.texto)).join(' | '));
  // Caixa de uma linha: a linha (corpo × 1,15) cabe na altura.
  const baixa = vivas.filter(f => f.texto && f.fs && f.texto.indexOf(NL) < 0 && f.fs * 1.15 > f.h + 0.5);
  t(!baixa.length, rot + ': linha cabe na altura da caixa → ' + baixa.map(f => `"${f.texto}"@${f.fs} h=${f.h}`).join(' | '));
  const rodape = vivas.find(f => f.texto && f.texto.indexOf('Fonte:') === 0);
  t(rodape && rodape.y >= 381, rot + ': rodapé "Fonte: …" no pé da página');
  const sobreRodape = vivas.filter(f => f.y + f.h > 381 && f.y < 405 && f !== rodape);
  t(!sobreRodape.length, rot + ': nada invade o rodapé → ' + sobreRodape.map(f => f.tipo + ' ' + (f.texto || '')).join(' | '));
  // Verde e vermelho só para variação (▲/▼ ou sinal na frente).
  const c = { verde: ['#10B981', '#6EE7B7'], vermelho: ['#EF4444', '#FCA5A5'] };
  const corSemVariacao = vivas.filter(f => f.texto && c.verde.concat(c.vermelho).indexOf(f.corTexto) >= 0 &&
    !/^(▲|▼|economia [+−-]|[+−-])/.test(f.texto));
  t(!corSemVariacao.length, rot + ': verde/vermelho só em variação → ' + corSemVariacao.map(f => f.texto).join(' | '));
  const cheios = vivas.filter(f => f.tipo === 'ROUND_RECTANGLE' && f.cor === m.cor);
  t(cheios.length === 1, rot + ': um só cartão cheio na cor escura da marca (' + cheios.length + ')');
  // A marca foi desfeita: os slides antigos seguem com a paleta deles.
  t(JSON.stringify({ c: CR_DESIGN_SYSTEM.colors, t: CR_DESIGN_SYSTEM.typography }) === ORIGINAL,
    rot + ': CR_DESIGN_SYSTEM volta ao original depois do slide');
}

for (const nome of Object.keys(SLIDES)) {
  for (const [rotulo, dados] of [['dados completos', dashboard()], ['mês em andamento', dashboard({ parcial: true })],
                                 ['sem dados', dashboard({ vazio: true })]]) {
    DADOS = dados;
    const rot = `${nome} (${rotulo})`;
    let vivas;
    try { vivas = rodar(nome, rot); } catch (e) { t(false, rot + ': exceção ' + e.stack); continue; }
    conferir(nome, vivas, rot);
  }
}

// ── Conteúdo do Dashboard ───────────────────────────────────────────────────
DADOS = dashboard();
const d = rodar('Dashboard Operacional', 'Dashboard Operacional');
t(d.some(f => f.texto === "SLA de preventivas 96,03% · ▲ +1,2 p.p. vs JUL'26"), 'Dashboard: subtítulo com o SLA e a variação');
t(d.some(f => f.texto === "Performance: AGO'26"), 'Dashboard: canto com o mês de referência');
t(d.some(f => f.texto === "▲ +1,2 p.p. vs JUL'26" && f.corTexto === '#6EE7B7'), 'Dashboard: SLA subiu, verde claro no cartão cheio');
t(d.some(f => f.texto === "▼ −6 vs JUL'26" && f.corTexto === '#10B981'), 'Dashboard: backlog caiu, verde');
t(d.some(f => f.texto === 'economia +R$ 12.826 (−2,1%)' && f.corTexto === '#10B981'), 'Dashboard: economia projetada em verde');
t(d.some(f => f.texto === '+R$ 12.826 (−2,1%)' && f.corTexto === '#10B981'), 'Dashboard: economia na tabela do orçamento em verde');
['SLA PREVENTIVAS', 'BACKLOG EM ABERTO', '% CONCLUSÃO HISTÓRICO', 'ORÇAMENTO 2026'].forEach(r =>
  t(d.some(f => f.texto === r), 'Dashboard: cartão ' + r));
["AGO'26", "JUL'26", "AGO'25"].forEach(m => t(d.some(f => f.texto === m && f.corTexto === '#FFFFFF'), 'Dashboard: coluna ' + m + ' no cabeçalho escuro'));
t(d.some(f => f.texto === '96,03%') && d.some(f => f.texto === '94,81%') && d.some(f => f.texto === '92,50%'), 'Dashboard: SLA nos três meses');
['MANUTENÇÃO · TRÊS MESES', 'GESTÃO DE CONTRATAÇÕES', 'ORÇAMENTO 2026', 'VISTORIAS E ADEQUAÇÕES', 'VISTORIAS', 'ADEQUAÇÕES DE CLIENTES']
  .forEach(r => t(d.some(f => f.texto === r), 'Dashboard: ' + r));
// Piora: SLA cai e backlog sobe → vermelho (claro no cartão cheio).
DADOS = dashboard();
DADOS.map.set('SLA Preventivas', linha3(91, 94, 90));
DADOS.map.set('Backlog em aberto', linha3(90, 80, 95));
const p = rodar('Dashboard Operacional', 'Dashboard Operacional (piora)');
t(p.some(f => f.texto === "▼ −3,0 p.p. vs JUL'26" && f.corTexto === '#FCA5A5'), 'Dashboard: SLA caiu, vermelho claro no cartão cheio');
t(p.some(f => f.texto === "▲ +10 vs JUL'26" && f.corTexto === '#EF4444'), 'Dashboard: backlog subiu, vermelho');
// Mês em andamento avisa no canto.
DADOS = dashboard({ parcial: true });
t(rodar('Dashboard Operacional', 'Dashboard Operacional (parcial)').some(f => f.texto === "Performance: AGO'26 · mês em andamento"),
  'Dashboard: mês em andamento no canto');

// ── A marca não vaza ────────────────────────────────────────────────────────
// Um slide Demercado no meio: dentro dele a marca é a Demercado; depois,
// tudo volta — inclusive para os slides que ainda estão no visual antigo.
{
  let dentro = null;
  _pvComMarca_('DEMERCADO', () => { dentro = { cor: CR_DESIGN_SYSTEM.colors.brandDark, fonte: CR_DESIGN_SYSTEM.typography.heading }; });
  t(dentro.cor === '#00594F' && dentro.fonte === 'EB Garamond', 'Marca: dentro do slide Demercado, paleta e título da Demercado');
  t(JSON.stringify({ c: CR_DESIGN_SYSTEM.colors, t: CR_DESIGN_SYSTEM.typography }) === ORIGINAL, 'Marca: depois do Demercado, volta ao original');
  _pvAplicarMarca_('DEMERCADO');
  _pvAplicarMarca_('CAPITAL');
  t(CR_DESIGN_SYSTEM.colors.brandDark === '#151E49' && CR_DESIGN_SYSTEM.typography.heading === 'Montserrat',
    'Marca: aplicar a Capital depois da Demercado parte da Capital (nada da Demercado gruda)');
  _pvRestaurarMarca_();
  let lancou = false;
  try { _pvComMarca_('DEMERCADO', () => { throw new Error('desenho quebrou'); }); } catch (e) { lancou = true; }
  t(lancou && JSON.stringify({ c: CR_DESIGN_SYSTEM.colors, t: CR_DESIGN_SYSTEM.typography }) === ORIGINAL,
    'Marca: restaurada mesmo quando o desenho lança exceção');
  t(CR_DESIGN_SYSTEM.colors.textMain === '#16213E', 'Marca: slides antigos seguem com o textMain deles (#16213E)');
}

if (process.env.PREVIA) {
  fs.mkdirSync(process.env.PREVIA, { recursive: true });
  const arq = path.join(process.env.PREVIA, 'formas_propriedades.json');
  fs.writeFileSync(arq, JSON.stringify(saida));
  console.log('Formas: ' + arq + ' — ' + saida.slides.map((s, i) => i + ' ' + s.nome).join(' · '));
}

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
