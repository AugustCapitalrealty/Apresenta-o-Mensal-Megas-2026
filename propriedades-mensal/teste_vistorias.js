// Teste da integração com o VistoriaPro (app de vistorias):
//   - a leitura (obterIndicadoresVistorias_, 05_DadosSlides.gs): sem token,
//     HTTP de erro, mês errado, sucesso, e UMA chamada por execução;
//   - o grupo VISTORIAS do Dashboard com os números do app;
//   - o slide Monitoramento de Pendências (22_Slide_Pendencias.gs): cartões,
//     setas, tabela, disciplinas, idade, aviso quando o app falha, posição
//     depois da capa da seção 5, nada fora da página e texto que cabe (medido
//     com a largura real das letras — a tabela de gestao-tvs/Visual.gs).
//
// Rodar: node propriedades-mensal/teste_vistorias.js
// Prévia: PREVIA=<pasta> node propriedades-mensal/teste_vistorias.js → grava
//   <pasta>/formas_pendencias.json; as imagens saem com
//   node ferramentas/previa_slides.js <pasta>/formas_pendencias.json <pasta>
const fs = require('fs'), path = require('path');
const DIR = __dirname;
let ok = 0, falha = 0;
const t = (c, m) => { c ? ok++ : (falha++, console.log('FALHOU: ' + m)); };

// ── Dublê do SlidesApp, gravando no formato de ferramentas/previa_slides.js ──
let formas = [], fundo = null;
function novaForma(tipo, x, y, w, h) {
  [x, y, w, h].forEach(v => { if (typeof v !== 'number' || !isFinite(v)) throw new Error('geometria inválida em ' + tipo); });
  if (w < 0 || h < 0) throw new Error('dimensão negativa em ' + tipo);
  const f = { tipo, x, y, w, h, texto: null };
  formas.push(f);
  const lineFill = { setSolidFill: c => { if (!c) throw new Error('borda ' + c); f.borda = c; } };
  const borda = { setTransparent: () => { delete f.borda; return borda; }, getLineFill: () => lineFill,
                  setWeight: p => { f.peso = p; return borda; }, setDashStyle: () => borda };
  // O primeiro estilo aplicado vale para a caixa (é o que a prévia desenha).
  const estilo = new Proxy({}, { get: (o, k) => (v) => {
    if (k === 'setFontSize') { if (!(v > 0)) throw new Error('fonte ' + v); if (f.fs === undefined) f.fs = v; }
    if (k === 'setBold' && f.negrito === undefined) f.negrito = !!v;
    if (k === 'setItalic' && f.italico === undefined) f.italico = !!v;
    if (k === 'setForegroundColor') { if (!v) throw new Error('cor ' + v); if (f.corTexto === undefined) f.corTexto = v; }
    if (k === 'setFontFamily' && f.fonte === undefined) f.fonte = v;
    return estilo; } });
  const par = { setParagraphAlignment: a => { f.align = a; return par; },
                setLineSpacing: v => { if (v < 100) throw new Error('spacing'); return par; } };
  const texto = {
    setText: v => { if (tipo !== 'TEXT_BOX') throw new Error('texto em ' + tipo); f.texto = String(v); return texto; },
    appendText: v => { f.texto = (f.texto || '') + String(v); return { getTextStyle: () => estilo }; },
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
let movidoPara = null, proximoId = 0;
function novoSlide(notas) {
  const id = 'S' + (proximoId++);
  return {
    getObjectId: () => id, remove: () => {}, move: i => { movidoPara = i; },
    getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: () => {}, asString: () => notas || '' }) }) }),
    getPageElements: () => [],
    getBackground: () => ({ setSolidFill: c => { fundo = c; } }),
    insertShape: (tipo, x, y, w, h) => novaForma(tipo, x, y, w, h),
    insertLine: (cat, x1, y1, x2, y2) => {
      const o = novaForma('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      Object.assign(formas[formas.length - 1], { x1, y1, x2, y2 });
      return o;
    },
    // insertImage(blob, x, y, w, h), como no cabeçalho padrão. Os set* devolvem a própria imagem.
    insertImage: (blob, x, y, w, h) => {
      const f = { tipo: 'IMAGE', x: x || 0, y: y || 0, w: w || 100, h: h || 30, rotulo: 'logo', texto: null };
      formas.push(f);
      const img = { getWidth: () => f.w, getHeight: () => f.h, setLeft: v => { f.x = v; return img; }, setTop: v => { f.y = v; return img; },
                    setWidth: v => { f.w = v; return img; }, setHeight: v => { f.h = v; return img; } };
      return img;
    }
  };
}
// Deck com a capa da seção 5 na posição 6 (e outros slides em volta).
let deckSlides = [];
const deck = {
  getPageWidth: () => 720, getPageHeight: () => 405, getSlides: () => deckSlides,
  appendSlide: () => { const s = novoSlide(''); deckSlides.push(s); return s; }
};
function montarDeck(comCapa) {
  deckSlides = [0, 1, 2, 3, 4, 5].map(() => novoSlide(''));
  if (comCapa) deckSlides.push(novoSlide('【PROP_SECAO_05_AUTO】'));
  deckSlides.push(novoSlide(''));
}
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }), LineCategory: { STRAIGHT: 'STRAIGHT' },
  ContentAlignment: { MIDDLE: 'MIDDLE', TOP: 'TOP' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START', END: 'END' },
  PredefinedLayout: { BLANK: 'BLANK' }, PageElementType: { SHAPE: 'SHAPE' }
};
global.DriveApp = { getFileById: id => ({ getBlob: () => ({ id }) }) };
// Planilhas vazias: o que se testa aqui é o app, não as bases de chamados.
const VAZIA = { getName: () => '(vazia)', getLastRow: () => 0, getLastColumn: () => 0,
                getRange: () => ({ getDisplayValues: () => [], getValues: () => [] }),
                getDataRange: () => ({ getDisplayValues: () => [], getValues: () => [] }) };
global.SpreadsheetApp = { openById: () => ({ getName: () => 'dublê', getSheets: () => [], getSheetByName: () => VAZIA }) };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

// ── O app ───────────────────────────────────────────────────────────────────
const FIX = JSON.parse(fs.readFileSync(path.join(DIR, 'teste_vistorias_fixture.json'), 'utf8'));
let token = 'token-de-teste', resposta = { cod: 200, corpo: FIX }, chamadas = [];
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k === 'VISTORIAS_API_TOKEN' ? token : null) }) };
global.UrlFetchApp = { fetch: (url, op) => {
  chamadas.push({ url, op });
  return { getResponseCode: () => resposta.cod, getContentText: () => JSON.stringify(resposta.corpo) };
} };

// ── Carrega o projeto (e a medição de texto das TVs, só para conferir) ──────
const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));
{
  const vis = fs.readFileSync(path.join(DIR, '..', 'gestao-tvs', 'Visual.gs'), 'utf8');
  const ini = vis.indexOf('const _TV_RECUO_'), fim = vis.indexOf('// Corta com');
  (0, eval)(vis.slice(ini, fim).replace(/^(const|let) /gm, 'var '));
}
const RECUO = 14.4;   // recuo interno real da TEXT_BOX (7,2 pt de cada lado)
global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: 7, nome: 'AGOSTO', curto: 'Ago', ano: 2026, fonte: 'dublê', label: 'AGOSTO 2026' });

const reiniciar = () => { _vistoriasCache_ = undefined; _vistoriasMotivo_ = ''; chamadas = []; logs.length = 0; };
const saida = { W: 720, H: 405, slides: [] };
function rodarSlide(rotulo, comCapa) {
  montarDeck(comCapa !== false);
  formas = []; fundo = null; movidoPara = null;
  gerarSlidePendenciasVistorias();
  const vivas = formas.filter(f => !f.removida);
  saida.slides.push({ nome: rotulo, fundo, formas: vivas });
  return vivas;
}

// ── 1. Leitura ──────────────────────────────────────────────────────────────
reiniciar(); token = null;
t(obterIndicadoresVistorias_() === null && /VISTORIAS_API_TOKEN/.test(_vistoriasMotivo_) && !chamadas.length,
  'sem token: null, diz o motivo e nem chama o app');
reiniciar(); token = 'token-de-teste'; resposta = { cod: 401, corpo: { error: 'Token inválido ou revogado' } };
t(obterIndicadoresVistorias_() === null && /HTTP 401 \(Token inválido ou revogado\)/.test(_vistoriasMotivo_), 'HTTP 401: null com o erro do app → ' + _vistoriasMotivo_);
reiniciar(); resposta = { cod: 200, corpo: Object.assign({}, FIX, { mes: '2026-07' }) };
t(obterIndicadoresVistorias_() === null && /não trouxe o mês 2026-08/.test(_vistoriasMotivo_), 'resposta de outro mês: null');
reiniciar(); global.UrlFetchApp.fetch = (() => { const f = global.UrlFetchApp.fetch; return (u, o) => { throw new Error('DNS error'); }; })();
t(obterIndicadoresVistorias_() === null && /indisponível \(DNS error\)/.test(_vistoriasMotivo_), 'rede fora: null com o motivo');
global.UrlFetchApp = { fetch: (url, op) => { chamadas.push({ url, op }); return { getResponseCode: () => resposta.cod, getContentText: () => JSON.stringify(resposta.corpo) }; } };
reiniciar(); resposta = { cod: 200, corpo: FIX };
const v = obterIndicadoresVistorias_();
t(v && v.atual.ncs_em_aberto === 41, 'sucesso: devolve os indicadores');
t(chamadas.length === 1 && chamadas[0].url === VISTORIAS_API_URL + '?mes=2026-08', 'chama o mês da apresentação → ' + (chamadas[0] && chamadas[0].url));
t(chamadas[0] && chamadas[0].op.headers['x-api-key'] === 'token-de-teste' && chamadas[0].op.muteHttpExceptions === true,
  'token no cabeçalho x-api-key (não na URL), muteHttpExceptions');
t(!/token/.test(chamadas[0].url), 'o token não aparece na URL');

// ── 2. Dashboard ────────────────────────────────────────────────────────────
reiniciar();
const dash = obterDashboardPropriedades_().map;
t(dash.get('Vistorias - Periódicas').atual === 2, 'Dashboard: vistorias periódicas = 2');
t(dash.get('Vistorias - Visitas mensais').atual === '9 de 11', 'Dashboard: visitas mensais "9 de 11"');
t(dash.get('Vistorias - NCs abertas no mês').atual === 14 && dash.get('Vistorias - NCs resolvidas no mês').atual === 18, 'Dashboard: NCs abertas 14 e resolvidas 18 no mês');
gerarSlidePendenciasVistorias.call(null);
t(chamadas.length === 1, 'Dashboard e slide de Pendências usam a MESMA chamada ao app (' + chamadas.length + ')');

// ── 3. Slide com dados ──────────────────────────────────────────────────────
reiniciar();
const s = rodarSlide('Pendências — agosto/2026');
const txt = s.filter(f => f.texto).map(f => f.texto);
t(!txt.some(x => /NÃO FOI GERADO/.test(x)), 'slide: sem aviso de falha');
t(txt.includes('MONITORAMENTO DE PENDÊNCIAS'), 'slide: título');
t(txt.some(x => x.indexOf('posição em 31/08/2026') >= 0 && x.indexOf('AGOSTO 2026') >= 0), 'slide: subtítulo com o mês e a posição');
const comCor = (texto, cor) => s.some(f => f.texto === texto && f.corTexto === cor);
const C = CR_DESIGN_SYSTEM.colors;
t(txt.includes('41') && comCor('▼ 4', C.accentGreen), 'em aberto 41, ▼ 4 em verde (o estoque caiu)');
t(comCor('7', C.accentRed) && comCor('▲ 2', C.accentRed), 'vencidas 7 e ▲ 2 em vermelho');
t(txt.includes('17% do aberto · 2 alta'), 'vencidas: % do aberto e quantas são de prioridade alta');
t(txt.includes('18') && comCor('▲ 7', C.accentGreen), 'resolvidas no mês 18, ▲ 7 em verde');
t(txt.includes('83,3% no prazo'), 'resolvidas: % no prazo');
t(txt.includes('23,5d') && comCor('▼ 7,5', C.accentGreen), 'tempo médio 23,5d, ▼ 7,5 em verde');
t(txt.includes('9 de 11') && txt.includes('9 de 12 imóveis'), 'visitas mensais 9 de 11 e imóveis visitados');
t(comCor('41', C.accentRed), 'saúde 41 do Mega Curitiba em vermelho');
const linhasImov = s.filter(f => f.texto && f.x < 300 && f.y > 160 && /^(Mega|Brado|AR|Garoto|Posto|Galpão|Loja)/.test(f.texto));
t(linhasImov.length >= 6 && linhasImov[0].texto === 'Mega Curitiba', 'imóveis na ordem do app, o mais crítico primeiro (' + linhasImov.length + ' linhas)');
const longo = s.find(f => f.texto && f.texto.indexOf('Brado Cubatão') === 0);
t(longo && longo.texto !== FIX.imoveis[2].imovel, 'nome longo de imóvel é cortado → ' + (longo && longo.texto));
const discMostradas = FIX.disciplinas.filter(d => txt.includes(d.disciplina) || txt.some(x => x.indexOf(d.disciplina.slice(0, 12)) === 0));
const avisoDisc = txt.find(x => /^\+ \d+ disciplina\(s\) fora da lista$/.test(x));
t(avisoDisc && discMostradas.length + Number(avisoDisc.match(/\d+/)[0]) === FIX.disciplinas.length,
  'disciplinas: as que não cabem viram "+ N fora da lista" (' + discMostradas.length + ' + ' + avisoDisc + ')');
const barras = s.filter(f => f.tipo === 'RECTANGLE' && f.h === 9);
t(barras.length === 5 && barras.slice(3).every(b => b.cor === C.accentOrange) && barras.slice(0, 3).every(b => b.cor === C.brandLight),
  'idade: 5 barras, as de mais de 90 dias em laranja');
t(txt.some(x => x.indexOf('Fonte: VistoriaPro') === 0), 'rodapé com a fonte do dado');
t(movidoPara === 7, 'vai para logo depois da capa da seção 5 (índice 7) → ' + movidoPara);

// Geometria: nada fora da página e texto de uma linha que cabe na caixa.
const fora = s.filter(f => f.tipo !== 'ELLIPSE' && (f.x < -0.5 || f.y < -0.5 || f.x + f.w > 720.5 || f.y + f.h > 405.5));
t(!fora.length, 'nada fora da página → ' + JSON.stringify(fora[0]));
const estouro = s.filter(f => f.texto && f.fs && f.texto.indexOf('\n') < 0 &&
  _tvLargura_(f.texto, f.fs, f.fonte, f.negrito) > f.w - RECUO + 0.5);
t(!estouro.length, 'texto que não cabe na caixa → ' + estouro.map(f => `"${f.texto}"@${f.fs} (${_tvLargura_(f.texto, f.fs, f.fonte, f.negrito).toFixed(0)} > ${(f.w - RECUO).toFixed(0)})`).join(' | '));
const sobrepostos = [];
const caixas = s.filter(f => f.texto && f.y > 70);
caixas.forEach((a, i) => caixas.slice(i + 1).forEach(b => {
  // Mesma linha e caixas que se cruzam com texto alinhado para o mesmo lado = sobreposição.
  const cruzam = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  if (cruzam && a.align === b.align && Math.abs(a.y - b.y) < 2 && a.x === b.x) sobrepostos.push(a.texto + ' / ' + b.texto);
}));
t(!sobrepostos.length, 'nenhum texto em cima de outro → ' + sobrepostos.join(' | '));

// Sem a capa da seção 5 no deck: fica no fim, e o Logger conta.
reiniciar();
rodarSlide('Pendências — sem capa da seção', false);
t(movidoPara === null && logs.some(l => /capa da seção 5/.test(l)), 'sem a capa da seção 5: fica no fim e avisa no Logger');

// ── 4. App fora: aviso no slide, nada de zeros ──────────────────────────────
reiniciar(); resposta = { cod: 500, corpo: { error: 'boom' } };
const f1 = rodarSlide('Pendências — app fora');
const aviso = f1.find(f => f.texto && /NÃO FOI GERADO/.test(f.texto));
t(aviso && /HTTP 500 \(boom\)/.test(aviso.texto) && /diagnosticarVistorias/.test(aviso.texto), 'app fora: aviso com o motivo e o diagnóstico');
t(!f1.some(f => f.texto === '0'), 'app fora: nenhum zero inventado');
resposta = { cod: 200, corpo: FIX };

// ── 5. Mês sem nenhuma pendência ────────────────────────────────────────────
reiniciar();
resposta = { cod: 200, corpo: Object.assign({}, FIX, {
  atual: Object.assign({}, FIX.atual, { ncs_em_aberto: 0, ncs_vencidas: 0, ncs_alta_vencidas: 0, ncs_resolvidas_no_mes: 0, mttr_dias: null, pct_resolvidas_no_prazo: null }),
  imoveis: [], disciplinas: [], idade: { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '>180': 0 } }) };
const z = rodarSlide('Pendências — mês limpo');
t(z.some(f => f.texto === 'Nenhuma NC em aberto no fim do mês.') && z.some(f => f.texto === '—') && z.some(f => f.texto === 'nenhuma no mês'),
  'mês sem pendência: mensagem, tempo médio "—" e "nenhuma no mês"');
resposta = { cod: 200, corpo: FIX };

// ── 6. diagnosticarVistorias ────────────────────────────────────────────────
reiniciar();
diagnosticarVistorias();
t(logs.some(l => /Token nas Propriedades do script: sim/.test(l)) && logs.some(l => /41 em aberto, 7 vencida\(s\)/.test(l)), 'diagnóstico mostra token e os números');

if (process.env.PREVIA) {
  fs.mkdirSync(process.env.PREVIA, { recursive: true });
  const arq = path.join(process.env.PREVIA, 'formas_pendencias.json');
  fs.writeFileSync(arq, JSON.stringify(saida));
  console.log('Formas: ' + arq + ' — ' + saida.slides.map((x, i) => i + ' ' + x.nome).join(' · '));
}

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
