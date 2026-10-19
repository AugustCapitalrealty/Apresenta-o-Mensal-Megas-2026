// Teste do rebrand das TVs (Visual.gs, padrão do Orçamento 2027): desenha os
// slides já convertidos nas duas marcas — Curitiba (Demercado) e Itajaí
// (Capital Realty) — e confere geometria, texto que cabe na caixa e que a
// marca de uma TV não vaza para a outra.
// Rodar: node gestao-tvs/teste_rebrand.js
// Prévia: PREVIA=<pasta> node gestao-tvs/teste_rebrand.js → grava
//   <pasta>/formas_tv.json; as imagens saem com
//   node ferramentas/previa_slides.js <pasta>/formas_tv.json <pasta>
// Com KANBAN=<json> e WEBDOX=<json> (respostas reais das APIs, salvas FORA do
// repositório — têm nome de gente) os slides usam elas.
const fs = require('fs'), path = require('path'), D = __dirname + '/';
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
                  setWeight: p => { f.peso = p; return borda; } };
  const estilo = new Proxy({}, { get: (o, k) => (v) => {
    if (k === 'setFontSize') { if (!(v > 0)) throw new Error('fonte ' + v); f.fs = v; }
    if (k === 'setBold') f.negrito = !!v; if (k === 'setItalic') f.italico = !!v;
    if (k === 'setForegroundColor') { if (!v) throw new Error('cor ' + v); f.corTexto = v; }
    if (k === 'setFontFamily') f.fonte = v;
    return estilo; } });
  const par = { setParagraphAlignment: a => { f.align = a; return par; }, setLineSpacing: v => { if (v < 100) throw new Error('spacing'); return par; } };
  const texto = { setText: v => { if (tipo !== 'TEXT_BOX') throw new Error('texto em ' + tipo); f.texto = String(v); return texto; },
                  getTextStyle: () => estilo, getParagraphStyle: () => par };
  return {
    getFill: () => ({ setSolidFill: (c, a) => { if (!c) throw new Error('setSolidFill(' + c + ')'); f.cor = c; if (a !== undefined) f.alpha = a; } }),
    getBorder: () => borda, getText: () => texto,
    setContentAlignment: a => { f.meio = a === 'MIDDLE'; },
    getLineFill: () => ({ setSolidFill: c => { f.cor = c; } }), setWeight: p => { f.peso = p; },
    remove: () => { f.removida = true; }
  };
}
const slide = {
  getObjectId: () => 'S',
  getPageElements: () => formas.filter(f => !f.removida).map(f => ({ remove: () => { f.removida = true; } })),
  getBackground: () => ({ setSolidFill: c => { fundo = c; } }),
  insertShape: (tipo, x, y, w, h) => novaForma(tipo, x, y, w, h),
  insertLine: (cat, x1, y1, x2, y2) => {
    const o = novaForma('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    Object.assign(formas[formas.length - 1], { x1, y1, x2, y2 });
    return o;
  },
  insertImage: () => {
    const f = { tipo: 'IMAGE', x: 0, y: 0, w: 300, h: 100, rotulo: 'logo', texto: null };
    formas.push(f);
    return { getWidth: () => 300, getHeight: () => 100, setLeft: v => { f.x = v; }, setTop: v => { f.y = v; },
             setWidth: v => { f.w = v; }, setHeight: v => { f.h = v; } };
  }
};
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }), LineCategory: { STRAIGHT: 'STRAIGHT' },
  ContentAlignment: { MIDDLE: 'MIDDLE' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START', END: 'END' },
  PredefinedLayout: { BLANK: 'BLANK' }
};
global.DriveApp = { getFileById: () => ({ getBlob: () => ({}) }) };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha'); } };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
global.Utilities = { formatDate: () => '19/10/2026 14:00' };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => 'chave' }) };

// ── Dados: fixtures pequenas, ou as respostas reais das APIs ────────────────
const AGORA = Date.now();
const KANBAN = process.env.KANBAN ? JSON.parse(fs.readFileSync(process.env.KANBAN, 'utf8')) : {
  gerado_em: '2026-10-19T17:00:00Z', totais: {},
  colunas: {
    solicitante: [{ protocolo: '2026000962', status: 'aguardando_informacoes', descricao: 'Emissão de ordem de compra para reparo do portão', fornecedor: 'IRMAOS FERREIRA ACABAMENTOS LTDA', valor: 2100, solicitante: 'Pessoa A', desde: new Date(AGORA - 20 * 864e5).toISOString(), dias_no_status: 20 }],
    backoffice: [{ protocolo: '2026001031', status: 'em_processamento', descricao: 'Emissão de Ordem de Compra (OC) para manutenção', fornecedor: 'FIRECAM', valor: 17000, emergencial: true, contrato: true, proximo: 'Aprovação e emissão da OC', desde: new Date(AGORA - 5 * 864e5).toISOString(), dias_no_status: 5 }],
    emitida: Array.from({ length: 6 }, (_, i) => ({ protocolo: '20260007' + (80 + i), status: 'aguardando_aceite', descricao: 'Referente a contratação de projeto técnico ' + i, fornecedor: i ? null : 'NERA ENERGIA', valor: 4000 + i, solicitante: 'Pessoa B', desde: new Date(AGORA - (54 - i) * 864e5).toISOString(), dias_no_status: 54 - i })),
    liberada: []
  }
};
const WEBDOX = process.env.WEBDOX ? JSON.parse(fs.readFileSync(process.env.WEBDOX, 'utf8')) : {
  gerado_em: '2026-10-19T17:00:00Z', importado_em: '2026-10-16T14:36:36Z',
  kpis: { andamento: 5, aguardando_megas: 2, atrasados: 4, tempo_medio_dias: 74 },
  colunas: {
    juridico: Array.from({ length: 4 }, (_, i) => ({ numero: String(230 + i), objeto: 'DEMERCADO_MAFESA_INSTALAÇÕES_MCTBA-F7', fase: 'Elaboração da minuta', passo_atual: 'Jurídico: análise', responsavel: 'Pessoa Jurídica', dias_no_passo: 66.8 - i * 10, sla_passo_dias: 5, sla_status: i < 3 ? 'atrasado' : 'no_prazo', retrabalhos: i, aguardando_megas: false, protocolo_solicitacao: i === 0 ? '2026000787' : null })),
    facilities: [],
    backoffice: [{ numero: '240', objeto: 'CONTRATO DE MANUTENÇÃO PREDIAL', fase: 'Validação do solicitante', responsavel: 'Pessoa C', dias_no_passo: 3, sla_passo_dias: 4, sla_status: 'atencao', aguardando_megas: true, retrabalhos: 0 }],
    outros: []
  }
};
global.UrlFetchApp = { fetch: url => ({ getResponseCode: () => 200,
  getContentText: () => JSON.stringify(url.indexOf('webdox-megas') >= 0 ? WEBDOX : KANBAN) }) };

// ── Carrega o projeto ───────────────────────────────────────────────────────
let src = '';
for (const f of ['Config.gs', 'Dados.gs', 'Visual.gs', '00_Main.gs', '01_Slide_Corretivas.gs',
                 '09_Slide_Solicitacoes.gs', '10_Slide_Webdox.gs']) src += fs.readFileSync(D + f, 'utf8') + '\n';
(0, eval)(src.replace(/^(const|let) /gm, 'var '));
const CWB = _tvUnidade_('CURITIBA'), ITJ = _tvUnidade_('ITAJA');

const CORRETIVAS = {
  atual: { total: 74, facilities: 46, propriedades: 28 }, anterior: { total: 80, facilities: 50, propriedades: 27 },
  historico: ['24/08', '31/08', '07/09', '14/09', '21/09', '28/09', '05/10', '12/10', '19/10']
    .map((d, i) => ({ dataCurta: d, total: [92, 88, 85, 90, 84, 81, 79, 80, 74][i] })),
  dias: 7
};
const SLIDES = {
  'Visão geral corretiva': u => criarDashboardCorretivas(slide, CORRETIVAS.atual, CORRETIVAS.anterior,
                                   CORRETIVAS.historico, '19/10/2026 08:00', u, CORRETIVAS.dias),
  'Solicitações': u => atualizarSlideSolicitacoes(slide, u),
  'Webdox': u => atualizarSlideWebdox(slide, u)
};

const saida = { W: 720, H: 405, slides: [] };
function rodar(nome, unit) {
  formas = []; fundo = null; logs.length = 0;
  SLIDES[nome](unit);
  const vivas = formas.filter(f => !f.removida);
  saida.slides.push({ nome: nome + ' — ' + unit.name, fundo: fundo, formas: vivas });
  return vivas;
}

for (const unit of [CWB, ITJ, CWB]) {   // Curitiba de novo no fim: a marca volta e não "gruda"
  const demercado = unit === CWB;
  for (const nome of Object.keys(SLIDES)) {
    const rot = `${nome} (${unit.name})`;
    let vivas;
    try { vivas = rodar(nome, unit); } catch (e) { t(false, rot + ': exceção ' + e.message); continue; }
    t(!logs.some(l => /✗|falha/i.test(l)), rot + ': sem falha no Logger → ' + logs.filter(l => /✗|falha/i.test(l)).join(' | '));
    const titulo = vivas.find(f => f.texto && f.y < 40 && f.fs >= 14);
    t(titulo && titulo.fonte === (demercado ? 'EB Garamond' : 'Montserrat'), rot + ': título na fonte da marca → ' + (titulo && titulo.fonte));
    t(titulo && titulo.corTexto === (demercado ? '#00594F' : '#151E49'), rot + ': título na cor da marca → ' + (titulo && titulo.corTexto));
    t(fundo === (demercado ? '#F8FAF9' : '#F8FAFC'), rot + ': fundo da marca → ' + fundo);
    const fora = vivas.filter(f => f.x < 0 || f.y < 0 || f.x + f.w > 720.01 || f.y + f.h > 405.01);
    t(!fora.length, rot + ': forma fora da página → ' + JSON.stringify(fora[0]));
    const estouro = vivas.filter(f => f.texto && f.fs && f.texto.indexOf('\n') < 0 && f.h <= 36 &&
      _tvLargura_(f.texto, f.fs, f.fonte, f.negrito) > f.w - _TV_RECUO_ + 0.5);
    t(!estouro.length, rot + ': texto que não cabe → ' + estouro.map(f => `"${f.texto}"@${f.fs}`).join(' | '));
    const sobreRodape = vivas.filter(f => f.y + f.h > 381 && f.y < 384 && f.texto && f.texto.indexOf('Fonte') !== 0);
    t(!sobreRodape.length, rot + ': nada invade o rodapé → ' + sobreRodape.map(f => f.texto).join(' | '));
  }
}

// Conteúdo específico
const est = rodar('Webdox', CWB);
const cardsWeb = est.filter(f => f.texto && /^#\d/.test(f.texto));
const totalWeb = Object.values(WEBDOX.colunas).reduce((s, l) => s + l.length, 0);
t(cardsWeb.length === totalWeb, `Webdox: todos os ${totalWeb} contratos aparecem (${cardsWeb.length})`);
t(est.some(f => f.texto === 'Webdox: importado em 19/10/2026 14:00'), 'Webdox: cabeçalho diz de quando é a importação');
t(est.some(f => f.texto === 'Aguardando os Megas'), 'Webdox: "Aguardando os Megas" no card');
t(!est.some(f => f.texto && f.texto.indexOf('_') >= 0 && /^[A-Z]/.test(f.texto)), 'Webdox: objeto sem "_" do nome do arquivo');
const cor = rodar('Visão geral corretiva', ITJ);
t(cor.some(f => f.texto === '74 chamados em aberto · ▼ −6 em 7 dias · Mega Itajaí'), 'Corretivas: subtítulo com o número e a variação');
t(cor.some(f => f.texto === '▼ −6 (−7,5%) em 7 dias' && f.corTexto === '#6EE7B7'), 'Corretivas: queda da fila em verde claro no cartão cheio');
t(cor.some(f => f.texto === '▲ +1 (+3,7%) em 7 dias' && f.corTexto === '#EF4444'), 'Corretivas: Property subiu, em vermelho');

if (process.env.PREVIA) {
  fs.mkdirSync(process.env.PREVIA, { recursive: true });
  fs.writeFileSync(path.join(process.env.PREVIA, 'formas_tv.json'), JSON.stringify(saida));
  console.log('Formas: ' + path.join(process.env.PREVIA, 'formas_tv.json') + ' — ' +
              saida.slides.map((s, i) => i + ' ' + s.nome).join(' · '));
}

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
