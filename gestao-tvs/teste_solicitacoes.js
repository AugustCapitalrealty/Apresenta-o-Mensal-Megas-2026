// Teste do Kanban de Solicitações das TVs (09_Slide_Solicitacoes.gs) e dos
// arquivos do painel para a TI (gerarArquivosPainelTV em 00_Main.gs).
// Rodar: node gestao-tvs/teste_solicitacoes.js
// Prévia: PREVIA=<pasta> node gestao-tvs/teste_solicitacoes.js → grava
// <pasta>/solicitacoes_tv.svg. Com REAL=<arquivo.json> (resposta de verdade
// da API, salva FORA do repositório — tem nome de gente) a prévia usa ela.
const fs = require('fs'), path = require('path'), D = __dirname + '/';
let ok = 0, falha = 0;
const t = (c, m) => { c ? ok++ : (falha++, console.log('FALHOU: ' + m)); };

// ── Dublê do SlidesApp: registra cada shape e explode em geometria inválida ──
let shapes = [];
function novoShape(tipo, x, y, w, h) {
  [x, y, w, h].forEach(v => { if (typeof v !== 'number' || isNaN(v)) throw new Error('geometria NaN em ' + tipo); });
  if (w < 0 || h < 0) throw new Error('dimensão negativa em ' + tipo);
  const s = { tipo, x, y, w, h, texto: null, fill: null, borda: null, fs: null, bold: false, cor: null, alin: null };
  shapes.push(s);
  const fill = { setSolidFill: c => { if (!c) throw new Error('setSolidFill(' + c + ')'); s.fill = c; } };
  const lineFill = { setSolidFill: c => { if (!c) throw new Error('borda setSolidFill(' + c + ')'); s.borda = c; } };
  const estilo = new Proxy({}, { get: (o, k) => (v) => {
    if (k === 'setFontSize') { if (!(v > 0)) throw new Error('fonte ' + v); s.fs = v; }
    if (k === 'setBold') s.bold = v; if (k === 'setForegroundColor') { if (!v) throw new Error('cor ' + v); s.cor = v; }
    if (k === 'setFontFamily') s.fonte = v;
    return estilo; } });
  const par = { setParagraphAlignment: a => { s.alin = a; return par; }, setLineSpacing: v => { if (v < 100) throw new Error('spacing'); return par; } };
  const texto = { setText: v => { if (s.tipo !== 'TEXT_BOX') throw new Error('texto em ' + s.tipo); s.texto = String(v); return texto; },
                  getTextStyle: () => estilo, getParagraphStyle: () => par };
  const borda = { setTransparent: () => { s.borda = null; return borda; }, getLineFill: () => lineFill, setWeight: () => borda };
  return { getFill: () => fill, getLineFill: () => lineFill, setWeight: () => {}, getBorder: () => borda,
           getText: () => texto, setContentAlignment: () => {}, remove: () => { s.removido = true; } };
}
// Slide com conteúdo "anterior" opcional, para testar a preservação.
let conteudoAnterior = [];
function novoSlide(id) {
  return {
    getObjectId: () => id,
    getPageElements: () => conteudoAnterior.concat(shapes.filter(s => !s.removido).map(s => ({ remove: () => { s.removido = true; } }))),
    insertShape: (tipo, x, y, w, h) => novoShape(tipo, x, y, w, h),
    insertLine: (cat, x1, y1, x2, y2) => novoShape('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)),
    insertImage: () => { throw new Error('sem imagem no teste'); },
    getBackground: () => ({ setSolidFill: () => {} })
  };
}
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }),
  ContentAlignment: { MIDDLE: 'MIDDLE' }, LineCategory: { STRAIGHT: 'STRAIGHT' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START', END: 'END' },
  PredefinedLayout: { BLANK: 'BLANK' }
};
global.DriveApp = { getFileById: () => { throw new Error('sem Drive'); } };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha'); } };
global.MimeType = { PLAIN_TEXT: 'text/plain' };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
global.Utilities = { formatDate: () => '19/10/2026 14:00' };
let chave = 'chave-de-teste';
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k === 'PORTAL_API_KEY' ? chave : null) }) };

// ── Dublê da API kanban-megas ────────────────────────────────────────────────
const AGORA = Date.now();
function card(protocolo, status, dias, extra) {
  return Object.assign({ protocolo, status, tipo: 'OC', descricao: 'Serviço ' + protocolo, fornecedor: 'Fornecedor ' + protocolo,
    valor: 1500, emergencial: false, contrato: false, solicitante: 'Pessoa ' + protocolo,
    desde: new Date(AGORA - dias * 86400000 - 3600000).toISOString(), dias_no_status: dias,
    quem: 'Backoffice', proximo: 'Análise da solicitação' }, extra || {});
}
function resposta(n) {
  return {
    gerado_em: '2026-10-19T17:00:00Z', empreendimento: 'mega_curitiba', equipe: 'facilities',
    totais: { solicitante: 1, backoffice: 2, emitida: n, liberada: 0 },
    colunas: {
      solicitante: [card('2026000962', 'aguardando_informacoes', 20)],
      // fora de ordem de propósito: o slide tem que pôr a mais parada primeiro
      backoffice: [card('B2', 'aprovado', 1), card('B1', 'em_analise', 9, { emergencial: true, contrato: true })],
      emitida: Array.from({ length: n }, (_, i) => card('E' + (i + 1), 'aguardando_aceite', 153 - i,
        i === 0 ? { descricao: 'Referente a contratação de projeto técnico para regularização do sistema fotovoltaico em operação no Mega Centro Logístico Curitiba, garanti',
                    fornecedor: 'NOME DE FORNECEDOR MUITO GRANDE ENGENHARIA E MANUTENÇÃO LTDA', valor: 1234567.89, emergencial: true } : {})),
      liberada: []
    }
  };
}
let http = { codigo: 200, corpo: resposta(9) };
let urls = [], headers = [];
global.UrlFetchApp = { fetch: (url, op) => {
  urls.push(url); headers.push(op && op.headers);
  return { getResponseCode: () => http.codigo,
           getContentText: () => typeof http.corpo === 'string' ? http.corpo : JSON.stringify(http.corpo) };
} };

// ── Carrega o projeto ───────────────────────────────────────────────────────
let src = '';
for (const f of ['Config.gs', 'Dados.gs', 'Visual.gs', '00_Main.gs', '09_Slide_Solicitacoes.gs', '10_Slide_Webdox.gs', '11_Slide_Chuva.gs']) src += fs.readFileSync(D + f, 'utf8') + '\n';
(0, eval)(src.replace(/^(const|let) /gm, 'var '));
const CWB = _tvUnidade_('CURITIBA'), ITJ = _tvUnidade_('ITAJA'), EST = _tvUnidade_('ESTEIO');

function rodar(slide) {
  shapes = []; logs.length = 0; urls = []; headers = [];
  atualizarSlideSolicitacoes(slide || novoSlide('x'), CWB);
  return shapes.filter(s => s.texto !== null && !s.removido).map(s => s.texto);
}
const vivas = () => shapes.filter(s => !s.removido);
const conferirGeometria = (rotulo) => {
  // As elipses do header sangram para fora da página de propósito.
  const fora = vivas().filter(s => s.tipo !== 'ELLIPSE' && (s.x < 0 || s.y < 0 || s.x + s.w > 720.01 || s.y + s.h > 405.01));
  t(fora.length === 0, rotulo + ': shape fora da página ' + JSON.stringify(fora[0]));
};

// ── Cenário 1: resposta normal ──────────────────────────────────────────────
console.log('Cenário 1: Mega Curitiba, 1 / 2 / 9 / 0');
let textos = rodar();
t(urls[0] === PORTAL_KANBAN_URL + '?empreendimento=mega_curitiba', 'chama a URL da unidade → ' + urls[0]);
t(headers[0] && headers[0]['x-api-key'] === 'chave-de-teste', 'manda a chave no header x-api-key');
t(textos.indexOf('Solicitações em andamento') >= 0 && textos.indexOf('12 de Facilities · Mega Curitiba') >= 0, 'cabeçalho da TV com o total (12) e o Mega');
t(textos.indexOf('Posição: 19/10/2026 14:00') >= 0, 'canto do cabeçalho diz de quando é a posição');
['COM O SOLICITANTE', 'COM O BACKOFFICE', 'EMITIDAS', 'LIBERADAS'].forEach(c => t(textos.indexOf(c) >= 0, 'coluna ' + c));
t(textos.indexOf('Nenhuma no momento') >= 0, 'coluna vazia avisa "Nenhuma no momento"');
t(textos.indexOf('B1') >= 0 && textos.indexOf('B1') < textos.indexOf('B2'), 'backoffice: a mais parada (B1) vem primeiro');
t(textos.indexOf('EMERG.') >= 0, 'emergencial ganha o selo EMERG.');
t(textos.some(x => /^Contrato · /.test(x)), 'contrato marcado no início da linha de baixo');
t(textos.indexOf('R$ 1,2 mi') >= 0 && textos.indexOf('R$ 2 mil') >= 0, 'valores compactos');
t(textos.indexOf('153d') >= 0, 'selo de 153 dias');
const cortada = textos.find(x => x.indexOf('Referente a contratação') === 0);
t(cortada && cortada.slice(-1) === '…', 'descrição longa cortada com "…" → ' + cortada);
const cabem = textos.filter(x => /^E\d+$/.test(x)).length;
t(cabem === 4, 'emitidas: só os cards que cabem (' + cabem + ')');
t(textos.indexOf('+ ' + (9 - cabem) + ' mais recentes') >= 0, '"+ ' + (9 - cabem) + ' mais recentes" no pé da coluna');
t(textos.indexOf('E1') >= 0 && textos.indexOf('E9') < 0, 'o corte esconde as mais RECENTES, não as mais paradas');
conferirGeometria('cenário 1');
const estouro = vivas().filter(s => s.texto && s.fs && s.texto.indexOf('\n') < 0 && s.h <= 16 &&
  _tvLargura_(s.texto, s.fs, s.fonte, s.bold) > s.w - _TV_RECUO_ + 0.5);
t(estouro.length === 0, 'texto de linha única cabe na caixa → ' + estouro.map(s => s.texto + '@' + s.fs).join(' | '));
const seloTexto = vivas().find(s => s.texto === '153d');
t(seloTexto && seloTexto.fs >= 6.5, 'selo "153d" sem encolher demais (fonte ' + (seloTexto && seloTexto.fs) + ')');

// Fornecedor em linha própria, em todas as colunas
t(textos.indexOf('Fornecedor B1') >= 0 && textos.indexOf('Fornecedor 2026000962') >= 0, 'fornecedor aparece também no backoffice e no solicitante');
http = { codigo: 200, corpo: (() => { const r = resposta(1); r.colunas.backoffice[0].fornecedor = null; return r; })() };
t(rodar().indexOf('Fornecedor a definir') >= 0, 'sem fornecedor: "Fornecedor a definir"');
http = { codigo: 200, corpo: resposta(9) }; textos = rodar();

// Medição: os textos que QUEBRARAM na TV de 19/10/2026 com a conta antiga
// (nº de letras × fator fixo) têm que ser vistos como "não cabe" agora.
// Largura útil do card: coluna (720 − 60 − 30)/4 = 157,5 → texto 151,5.
const wTexto = 151.5;
t(_tvLargura_('Emissão de Ordem de Compra para pagam…', 7, 'Open Sans', false) > wTexto - _TV_RECUO_,
  'descrição que quebrou na TV agora não cabe (é cortada antes)');
t(_tvLargura_('T IANKOSKI CONSTRUCOES E…', 6.5, 'Open Sans', true) > wTexto - 50 - _TV_RECUO_,
  'fornecedor em maiúscula que quebrou na TV agora não cabe');
t(_tvLargura_('2026000962', 8, 'Montserrat', true) < wTexto - 28 - _TV_RECUO_, 'protocolo cabe com folga');

// ── Régua de tempo (mesma do portal) ────────────────────────────────────────
t(_solTom_({ status: 'em_analise', dias: 3 }) === 'ok' && _solTom_({ status: 'em_analise', dias: 4 }) === 'atencao' &&
  _solTom_({ status: 'em_analise', dias: 6 }) === 'atrasado', 'em análise: prazo 5');
t(_solTom_({ status: 'aprovado', dias: 2 }) === 'atencao', 'aprovado: prazo 3, 2 dias = atenção');
t(_solTom_({ status: 'aguardando_aceite', dias: 3 }) === 'ok' && _solTom_({ status: 'aguardando_aceite', dias: 5 }) === 'atencao' &&
  _solTom_({ status: 'aguardando_aceite', dias: 54 }) === 'atrasado', 'sem prazo: 3 ok / 5 atenção / 54 atrasado');

// ── Falha com slide JÁ preenchido: a TV fica como está ──────────────────────
console.log('Falhas');
const removidos = [];
conteudoAnterior = [{ remove: () => removidos.push(1) }];
http = { codigo: 500, corpo: 'boom' };
textos = rodar();
t(removidos.length === 0 && shapes.length === 0, 'portal fora: slide anterior preservado, nada desenhado');
t(logs.some(l => l.indexOf('preservado') >= 0), 'e o Logger diz que preservou');
conteudoAnterior = [];

// ── Falha com slide VAZIO: aviso do motivo ──────────────────────────────────
const avisa = (rotulo, trecho) => {
  const tx = rodar();
  const aviso = tx.find(x => x.indexOf('ainda não disponível') >= 0);
  t(aviso && aviso.indexOf(trecho) >= 0, rotulo + ' → ' + (aviso || '(sem aviso)'));
  conferirGeometria(rotulo);
};
chave = null;                      avisa('sem chave', 'PORTAL_API_KEY');
t(urls.length === 0, 'sem chave nem chama o portal');
chave = 'chave-de-teste';
http = { codigo: 401, corpo: '' };  avisa('chave errada', 'recusou a chave');
http = { codigo: 404, corpo: '' };  avisa('função fora do ar', 'kanban-megas não encontrada');
http = { codigo: 200, corpo: '<html>' }; avisa('resposta não-JSON', 'não é JSON');
const semColuna = resposta(2); delete semColuna.colunas.liberada; semColuna.colunas.liberadas = [];
http = { codigo: 200, corpo: semColuna }; avisa('coluna renomeada (zero falso)', 'sem a coluna "liberada"');
const div = resposta(2); div.totais.emitida = 5;
http = { codigo: 200, corpo: div }; rodar();
t(logs.some(l => l.indexOf('diz 5 em "emitida", mas mandou 2') >= 0), 'totais divergentes vão para o Logger');

// ── Posição na TV: depois de tudo, nada muda de lugar ───────────────────────
console.log('Posição e painel da TI');
t(_solIndice_(CWB) === 8 && _solIndice_(ITJ) === 8, 'Curitiba/Itajaí: 6 base + 2 metas → kanban é o 9º slide');
t(_solIndice_(EST) === 8, 'Esteio: 6 base + 1 meta + cheias → kanban é o 9º slide');
t(_solIndice_(EST) > 6 + EST.metas.length, 'kanban depois das Cheias (que ficam no índice 7)');

// ── Arquivos para a TI ──────────────────────────────────────────────────────
const criados = {};
global.DriveApp = {
  getFileById: () => { throw new Error('sem Drive'); },
  getRootFolder: () => ({
    getFilesByName: () => ({ hasNext: () => false }),
    createFile: (nome, conteudo) => { criados[nome] = JSON.parse(conteudo); return { getUrl: () => 'https://drive/' + nome }; }
  })
};
// 11 slides: … kanban, Webdox e, por último no deck, a Chuva do mês
const nSlides = { [CWB.deckId]: 11, [ITJ.deckId]: 11, [EST.deckId]: 11 };
SlidesApp.openById = id => ({ getSlides: () => Array.from({ length: nSlides[id] }, (_, i) => novoSlide('ID_' + i)) });
logs.length = 0;
gerarArquivosPainelTV();
t(Object.keys(criados).sort().join(',') === 'Painel_Curitiba.txt,Painel_Esteio.txt,Painel_Itajai.txt',
  'um arquivo por TV, com o nome que a TI já usa → ' + Object.keys(criados).join(','));
const est = criados['Painel_Esteio.txt'];
t(est && est.websites.length === 12, 'Esteio: 11 slides + a planilha extra');
t(est && est.websites[6].url.endsWith('id.ID_10'), 'Esteio: a Chuva do mês (último do deck) vem logo depois do Tempo');
t(est && est.websites[8].url.endsWith('id.ID_7') && est.websites[9].url.endsWith('id.ID_8') && est.websites[10].url.endsWith('id.ID_9'), 'Esteio: Cheias, Kanban e Webdox entram, na ordem');
t(est && est.websites[11].url.indexOf('pubhtml') >= 0, 'Esteio: a planilha publicada continua no fim');
t(est && est.websites[0].duration === 20 && est.websites[1].duration === 30, 'capa 20 s, demais 30 s');
t(est && est.fullscreen === true && est.settingsReloadIntervalMinutes === 60 && est.websites[0].tabReloadIntervalSeconds === 600,
  'mesmas configurações gerais do arquivo antigo');
const itj = criados['Painel_Itajai.txt'];
t(itj && itj.websites.length === 11 && itj.websites[8].url.endsWith('id.ID_7'), 'Itajaí: inclui as Metas do Analista');
t(itj && itj.websites[0].url === 'https://docs.google.com/presentation/d/' + ITJ.deckId + '/present?slide=id.ID_0', 'URL no formato do painel');
t(logs.some(l => l.indexOf('7. Chuva do Mês') >= 0) && logs.some(l => l.indexOf('9. Metas ANALISTA') >= 0) && logs.some(l => l.indexOf('10. Kanban de Solicitações') >= 0) && logs.some(l => l.indexOf('11. Contratos no Webdox') >= 0),
  'Logger lista cada slide com o nome');
nSlides[CWB.deckId] = 10; logs.length = 0; gerarArquivosPainelTV();
t(logs.some(l => l.indexOf('tem 10 slides e o esperado são 11') >= 0), 'avisa quando o deck ainda não tem a Chuva do mês');

// ── Ordem de carga do Apps Script ───────────────────────────────────────────
// O Apps Script carrega os .gs em ordem alfabética: "09_…" vem ANTES de
// "Config.gs". Um const de topo que leia CR_DESIGN_SYSTEM quebraria o projeto
// inteiro ao carregar ("Cannot access … before initialization"). Aqui o
// projeto é avaliado com const de verdade, na ordem real.
console.log('Ordem de carga');
{
  const vm = require('vm');
  const arqs = fs.readdirSync(D).filter(f => f.endsWith('.gs')).sort();
  const ctx = vm.createContext({ Logger: { log() {} }, console });
  let erro = null;
  try { vm.runInContext(arqs.map(f => fs.readFileSync(D + f, 'utf8')).join('\n'), ctx); } catch (e) { erro = e.message; }
  t(!erro, 'projeto carrega na ordem alfabética do editor → ' + erro);
}

// ── Prévia em SVG ───────────────────────────────────────────────────────────
if (process.env.PREVIA) {
  http = { codigo: 200, corpo: process.env.REAL ? fs.readFileSync(process.env.REAL, 'utf8') : resposta(9) };
  rodar();
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810" viewBox="0 0 720 405"><rect width="720" height="405" fill="#F8FAFC"/>';
  vivas().forEach(s => {
    if (s.texto === null) {
      const rx = s.tipo === 'ROUND_RECTANGLE' ? 3 : 0;
      if (s.tipo === 'ELLIPSE') svg += `<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" fill="${s.fill}"/>`;
      else svg += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${Math.max(s.h, 0.6)}" rx="${rx}" fill="${s.fill || 'none'}" stroke="${s.borda || 'none'}" stroke-width="0.6"/>`;
    } else {
      const anc = s.alin === 'CENTER' ? 'middle' : (s.alin === 'END' ? 'end' : 'start');
      const x = anc === 'middle' ? s.x + s.w / 2 : (anc === 'end' ? s.x + s.w - 7 : s.x + 7);
      s.texto.split('\n').forEach((ln, i, arr) => {
        const y = arr.length > 1 ? s.y + 12 + i * (s.fs || 10) * 1.3 : s.y + s.h / 2 + (s.fs || 10) * 0.35;
        svg += `<text x="${x}" y="${y}" font-family="${s.fonte || 'Open Sans'}" font-size="${s.fs || 10}" font-weight="${s.bold ? 700 : 400}" fill="${s.cor || '#000'}" text-anchor="${anc}">${esc(ln)}</text>`;
      });
    }
  });
  svg += '</svg>';
  fs.writeFileSync(path.join(process.env.PREVIA, 'solicitacoes_tv.svg'), svg);
  console.log('Prévia: ' + path.join(process.env.PREVIA, 'solicitacoes_tv.svg'));
}

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
