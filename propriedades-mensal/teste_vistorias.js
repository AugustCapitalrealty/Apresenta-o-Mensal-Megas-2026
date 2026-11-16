// Teste da integração com o VistoriaPro (app de vistorias):
//   - a leitura (obterIndicadoresVistorias_, 05_DadosSlides.gs): sem token,
//     HTTP de erro, mês errado, sucesso, e UMA chamada por execução;
//   - o grupo VISTORIAS do Dashboard com os números do app;
//   - o slide Monitoramento de Pendências (22_Slide_Pendencias.gs): cartões,
//     setas, tabela, disciplinas, idade, aviso quando o app falha, posição
//     depois da capa da seção 4, nada fora da página e texto que cabe (medido
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
// Deck com a capa da seção 4 na posição 6 (e outros slides em volta).
let deckSlides = [];
const deck = {
  getPageWidth: () => 720, getPageHeight: () => 405, getSlides: () => deckSlides,
  appendSlide: () => { const s = novoSlide(''); deckSlides.push(s); return s; }
};
function montarDeck(comCapa) {
  deckSlides = [0, 1, 2, 3, 4, 5].map(() => novoSlide(''));
  if (comCapa) deckSlides.push(novoSlide('【PROP_SECAO_04_AUTO】'));
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
// Nomes em CAIXA ALTA e por inteiro (16/11/2026): a coluna Imóvel é a da esquerda, abaixo do cabeçalho.
const colunaNome = s.filter(f => f.texto && f.x < 120 && f.y > 160 && f.y < 330 && f.tipo === 'TEXT_BOX');
const linhasImov = colunaNome.filter(f => /^(MEGA|BRADO|FRIGORIFICADO|AR 3000|GAROTO|POSTO|GALPÃO|LOJA)/.test(f.texto));
t(linhasImov.length >= 6 && linhasImov[0].texto === 'MEGA CURITIBA', 'imóveis na ordem do app, o mais crítico primeiro, em caixa alta (' + linhasImov.length + ' linhas)');
t(linhasImov.every(f => f.texto === f.texto.toUpperCase()), 'nomes dos imóveis todos em CAIXA ALTA');
const nomeBrado = linhasImov.filter(f => /^(BRADO CUBATÃO|FRIGORIFICADO PRINCIPAL)/.test(f.texto)).sort((a, b) => a.y - b.y).map(f => f.texto).join(' ');
t(nomeBrado === FIX.imoveis[2].imovel.toUpperCase() && !colunaNome.some(f => /…/.test(f.texto)),
  'nome longo sai INTEIRO (2 linhas), sem "…" → ' + nomeBrado);
const discMostradas = FIX.disciplinas.filter(d => txt.includes(d.disciplina) || txt.some(x => x.indexOf(d.disciplina.slice(0, 12)) === 0));
const avisoDisc = txt.find(x => /^\+ \d+ disciplina\(s\) fora da lista$/.test(x));
t(avisoDisc && discMostradas.length + Number(avisoDisc.match(/\d+/)[0]) === FIX.disciplinas.length,
  'disciplinas: as que não cabem viram "+ N fora da lista" (' + discMostradas.length + ' + ' + avisoDisc + ')');
const barras = s.filter(f => f.tipo === 'RECTANGLE' && f.h === 9);
t(barras.length === 5 && barras.slice(3).every(b => b.cor === C.accentOrange) && barras.slice(0, 3).every(b => b.cor === C.brandLight),
  'idade: 5 barras, as de mais de 90 dias em laranja');
t(txt.some(x => x.indexOf('Fonte: VistoriaPro') === 0), 'rodapé com a fonte do dado');
t(txt.includes('DATA DE CORTE DO HISTÓRICO: 01/08/2026'), 'nota: data de corte vinda do app (01/08/2026)');
t(!txt.includes('SEM LANÇAMENTOS NO MÊS'), 'com atividade no mês, a nota "sem lançamentos" NÃO aparece');
{
  // O "+ N imóvel(is) fora da lista" não pode encostar nas notas do pé do cartão.
  const mais = s.find(f => f.texto && /^\+ \d+ imóvel\(is\)/.test(f.texto));
  const nota = s.find(f => f.texto === 'DATA DE CORTE DO HISTÓRICO: 01/08/2026');
  t(mais && nota && mais.y + mais.h <= nota.y + 0.5, 'nota de corte não fica em cima do "+ N imóvel(is) fora da lista" (' +
    (mais && nota ? (mais.y + mais.h).toFixed(1) + ' ≤ ' + nota.y.toFixed(1) : 'não achei') + ')');
}
t(movidoPara === 7, 'vai para logo depois da capa da seção 4 (índice 7) → ' + movidoPara);

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

// Sem a capa da seção 4 no deck: fica no fim, e o Logger conta.
reiniciar();
rodarSlide('Pendências — sem capa da seção', false);
t(movidoPara === null && logs.some(l => /capa da seção 4/.test(l)), 'sem a capa da seção 4: fica no fim e avisa no Logger');

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

// ── 5b. Mês SEM LANÇAMENTOS (o caso real de outubro/2026) ───────────────────
// O app respondeu, mas ninguém lançou nada no mês: 0 vistorias, 0 visitas, 0 NCs
// novas e resolvidas; o estoque de 320 NCs vem do histórico. Decisão do Guilherme
// (16/11): mostrar em branco mesmo e dizer que é falta de lançamento.
reiniciar();
{
  const ZERO = { mes: '2026-08', vistorias_periodicas: 0, visitas_mensais: 0, visitas_programadas: 0, imoveis_visitados: 0, imoveis_ativos: 6,
                 ncs_abertas_no_mes: 0, ncs_resolvidas_no_mes: 0, ncs_em_aberto: 320, ncs_vencidas: 320, ncs_alta_vencidas: 0,
                 mttr_dias: null, pct_resolvidas_no_prazo: null };
  const disc = [['Piso', 46], ['Forro', 38], ['Pintura', 37], ['Cobertura', 25]];
  for (let i = 1; i <= 18; i++) disc.push(['Disciplina ' + i, 9]);
  resposta = { cod: 200, corpo: Object.assign({}, FIX, {
    atual: ZERO, anterior: Object.assign({}, ZERO, { mes: '2026-07' }),
    idade: { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '>180': 320 },
    imoveis: [
      { imovel: 'ARMAZÉM FRIGORIFICADO BRADO CUBATÃO', em_aberto: 90, vencidas: 90, alta_vencidas: 0, idade_max_dias: 501, indice_saude: 0 },
      { imovel: 'Armazém Monousuário Itajaí', em_aberto: 50, vencidas: 50, alta_vencidas: 0, idade_max_dias: 479, indice_saude: 0 },
      { imovel: 'POSTO CURITIBA', em_aberto: 94, vencidas: 94, alta_vencidas: 0, idade_max_dias: 425, indice_saude: 0 },
      { imovel: 'GALERIA LOJAS GAROTO', em_aberto: 86, vencidas: 86, alta_vencidas: 0, idade_max_dias: 408, indice_saude: 0 }],
    disciplinas: disc.map(d => ({ disciplina: d[0], em_aberto: d[1], vencidas: d[1], resolvidas_no_mes: 0 })) }) };
  const sz = rodarSlide('Pendências — sem lançamentos (outubro/26)');
  const tz = sz.filter(f => f.texto).map(f => f.texto);
  t(!tz.some(x => /NÃO FOI GERADO/.test(x)), 'sem lançamentos: slide sai normalmente, sem aviso de falha');
  t(tz.includes('SEM LANÇAMENTOS NO MÊS'), 'sem lançamentos: nota "SEM LANÇAMENTOS NO MÊS"');
  t(tz.includes('DATA DE CORTE DO HISTÓRICO: 01/08/2026'), 'sem lançamentos: nota de corte 01/08/2026 também aparece');
  const corpo = tz.join(' ');
  t(/Nenhuma vistoria, visita mensal ou NC \(nova ou resolvida\)/.test(corpo) && /foi registrada no VistoriaPro em AGOSTO 2026/.test(corpo) &&
    /As 320 NCs em aberto são o estoque já cadastrado/.test(corpo), 'sem lançamentos: texto da nota diz o que falta e quantas NCs são estoque');
  t(tz.includes('0 de 0') && tz.includes('0 de 6 imóveis'), 'sem lançamentos: os zeros continuam à vista (visitas 0 de 0, 0 de 6 imóveis) — nada escondido');
  t(sz.filter(f => f.texto === '320').length >= 2, 'sem lançamentos: 320 em aberto e 320 vencidas continuam nos cartões');
  const fora2 = sz.filter(f => f.tipo !== 'ELLIPSE' && (f.x < -0.5 || f.y < -0.5 || f.x + f.w > 720.5 || f.y + f.h > 405.5));
  t(!fora2.length, 'sem lançamentos: nada fora da página → ' + JSON.stringify(fora2[0]));
  const estouro2 = sz.filter(f => f.texto && f.fs && f.texto.indexOf('\n') < 0 &&
    _tvLargura_(f.texto, f.fs, f.fonte, f.negrito) > f.w - RECUO + 0.5);
  t(!estouro2.length, 'sem lançamentos: nenhuma linha (inclusive as das notas) estoura a caixa → ' +
    estouro2.map(f => `"${f.texto}"@${f.fs} (${_tvLargura_(f.texto, f.fs, f.fonte, f.negrito).toFixed(0)} > ${(f.w - RECUO).toFixed(0)})`).join(' | '));
  // As notas ficam abaixo da última linha da tabela e dentro do cartão da esquerda.
  const topoNota = Math.min.apply(null, sz.filter(f => f.texto === 'SEM LANÇAMENTOS NO MÊS').map(f => f.y));
  const fimTabela = Math.max.apply(null, sz.filter(f => f.texto === 'GALERIA LOJAS GAROTO').map(f => f.y + f.h));   // a última linha da tabela
  // O nome do local sai inteiro e em caixa alta, mesmo que o app mande em minúsculas/mistas.
  const nomesZ = sz.filter(f => f.texto && f.x < 120 && f.y > 200 && f.y < topoNota - 1 && f.tipo === 'TEXT_BOX').map(f => f.texto);   // abaixo do cabeçalho "Imóvel"
  t(nomesZ.includes('ARMAZÉM FRIGORIFICADO') && nomesZ.includes('BRADO CUBATÃO'), 'sem lançamentos: "ARMAZÉM FRIGORIFICADO BRADO CUBATÃO" inteiro, em 2 linhas → ' + nomesZ.join(' | '));
  t(nomesZ.includes('ARMAZÉM MONOUSUÁRIO') && nomesZ.includes('ITAJAÍ'), 'sem lançamentos: "Armazém Monousuário Itajaí" (mista no app) sai em CAIXA ALTA, inteiro');
  t(nomesZ.every(x => x === x.toUpperCase()) && !nomesZ.some(x => /…/.test(x)), 'sem lançamentos: coluna Imóvel toda em caixa alta e sem "…"');
  t(fimTabela <= topoNota + 0.5, 'sem lançamentos: a nota começa depois da última linha da tabela (' + fimTabela.toFixed(1) + ' ≤ ' + topoNota.toFixed(1) + ')');
  const notaBaixo = Math.max.apply(null, sz.filter(f => f.texto && f.x > 40 && f.x < 60 + 380 && f.y > topoNota - 1 && f.texto !== 'Fonte').map(f => f.y + f.h));
  t(notaBaixo <= 154 + (405 - 154 - 26) + 0.5, 'sem lançamentos: as notas terminam dentro do cartão (' + notaBaixo.toFixed(1) + ')');
  // Sem nenhuma data de corte e com atividade: nenhuma nota (o slide fica como antes).
  reiniciar();
  resposta = { cod: 200, corpo: Object.assign({}, FIX, { data_corte: null }) };
  const sn = rodarSlide('Pendências — sem corte, com atividade').filter(f => f.texto).map(f => f.texto);
  t(!sn.some(x => /DATA DE CORTE|SEM LANÇAMENTOS/.test(x)), 'sem data de corte e com atividade: nenhuma nota aparece');
}
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
