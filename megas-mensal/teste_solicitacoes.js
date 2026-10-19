// Teste do Kanban de Solicitações (17_Slide_Solicitacoes.gs): leitura da
// API do portal (chave, erros HTTP, formato), regra de cor do tempo na etapa
// e a geometria do slide.
// Rodar: node megas-mensal/teste_solicitacoes.js
// Prévia: PREVIA=<pasta> node megas-mensal/teste_solicitacoes.js → grava
// <pasta>/solicitacoes.svg. Com REAL=<arquivo.json> (resposta de verdade da
// API, salva fora do repositório — tem nome de gente) a prévia usa ela.
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
           getText: () => texto, setContentAlignment: () => {} };
}
const slide = {
  insertShape: (tipo, x, y, w, h) => novoShape(tipo, x, y, w, h),
  insertLine: (cat, x1, y1, x2, y2) => novoShape('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)),
  insertImage: () => { throw new Error('sem imagem no teste'); },
  getBackground: () => ({ setSolidFill: () => {} })
};
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }), LineCategory: { STRAIGHT: 'STRAIGHT' },
  ContentAlignment: { MIDDLE: 'MIDDLE' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START' },
  PredefinedLayout: { BLANK: 'BLANK' }
};
global.DriveApp = { getFileById: () => { throw new Error('sem Drive'); } };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha'); } };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
global.Utilities = { formatDate: (d) => '19/10 às 14:00' };
let chave = 'chave-de-teste';
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k === 'PORTAL_API_KEY' ? chave : null) }) };

// ── Dublê da API kanban-megas ────────────────────────────────────────────────
const AGORA = Date.now();
const haDias = d => new Date(AGORA - d * 86400000 - 3600000).toISOString();
function card(protocolo, status, dias, extra) {
  return Object.assign({ protocolo, status, tipo: 'OC', descricao: 'Serviço ' + protocolo, fornecedor: 'Fornecedor ' + protocolo,
    valor: 1500, emergencial: false, contrato: false, solicitante: 'Pessoa ' + protocolo,
    desde: haDias(dias), dias_no_status: dias, quem: 'Backoffice', proximo: 'Análise da solicitação' }, extra || {});
}
function resposta(n) {
  // n = quantos cards na coluna "emitida" (testa o corte)
  return {
    gerado_em: '2026-10-19T17:00:00Z', empreendimento: 'mega_curitiba', equipe: 'facilities',
    totais: { solicitante: 1, backoffice: 2, emitida: n, liberada: 0 },
    colunas: {
      solicitante: [card('S1', 'aguardando_informacoes', 2)],
      // fora de ordem de propósito: o slide tem que pôr a mais parada primeiro
      backoffice: [card('B2', 'aprovado', 1), card('B1', 'em_analise', 9, { emergencial: true, contrato: true })],
      emitida: Array.from({ length: n }, (_, i) => card('E' + (i + 1), 'aguardando_aceite', 40 - i,
        i === 0 ? { descricao: 'Referente a contratação de projeto técnico para regularização do sistema fotovoltaico em operação no Mega Centro Logístico Curitiba, garanti',
                    fornecedor: 'NOME DE FORNECEDOR MUITO GRANDE ENGENHARIA E MANUTENÇÃO LTDA', valor: 1234567.89 } : {})),
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
for (const f of ['00_Helpers.gs', '01_Config.gs', '13_Slide_Metas.gs', '17_Slide_Solicitacoes.gs']) src += fs.readFileSync(D + f, 'utf8') + '\n';
(0, eval)(src.replace(/^(const|let) /gm, 'var '));
global.getDeckAtivo = () => ({ getPageWidth: () => 720, getPageHeight: () => 405, appendSlide: () => slide });
setProjetoAtivo('CURITIBA');

function rodar() { shapes = []; logs.length = 0; urls = []; headers = []; gerarSlideSolicitacoes(); return shapes.filter(s => s.texto !== null).map(s => s.texto); }
const conferirGeometria = (rotulo) => {
  // A elipse do header sangra para fora da página de propósito.
  const fora = shapes.filter(s => s.tipo !== 'ELLIPSE' && (s.x < 0 || s.y < 0 || s.x + s.w > 720 + 0.01 || s.y + s.h > 405 + 0.01));
  t(fora.length === 0, rotulo + ': shape fora da página ' + JSON.stringify(fora[0]));
};

// ── Cenário 1: resposta normal ──────────────────────────────────────────────
console.log('Cenário 1: Mega Curitiba, 1 / 2 / 9 / 0');
let textos = rodar();
t(urls.length === 1 && urls[0] === PORTAL_KANBAN_URL + '?empreendimento=mega_curitiba', 'chama a URL do Mega ativo → ' + urls[0]);
t(headers[0] && headers[0]['x-api-key'] === 'chave-de-teste', 'manda a chave no header x-api-key');
t(!textos.some(x => x.indexOf('Kanban não gerado') >= 0), 'sem aviso de falha');
['COM O SOLICITANTE', 'COM O BACKOFFICE', 'EMITIDAS', 'LIBERADAS'].forEach(c => t(textos.indexOf(c) >= 0, 'coluna ' + c));
t(textos.some(x => x.indexOf('12 em andamento') >= 0), 'subtítulo com o total (1+2+9+0 = 12)');
t(textos.indexOf('Nenhuma no momento') >= 0, 'coluna vazia avisa "Nenhuma no momento"');
t(textos.indexOf('B1') >= 0 && textos.indexOf('B1') < textos.indexOf('B2'), 'backoffice: a mais parada (B1, 9 dias) vem primeiro');
t(textos.indexOf('EMERG.') >= 0, 'emergencial ganha o selo EMERG.');
t(textos.some(x => /^Contrato · /.test(x)), 'solicitação com contrato marcada no início da linha de baixo');
t(textos.indexOf('R$ 1,2 mi') >= 0 && textos.indexOf('R$ 2 mil') >= 0, 'valores compactos (R$ 1,2 mi / R$ 2 mil)');
const cortada = textos.find(x => x.indexOf('Referente a contratação') === 0);
t(cortada && cortada.slice(-1) === '…' && cortada.length < 140, 'descrição longa cortada com "…" → ' + cortada);
const cabem = textos.filter(x => /^E\d+$/.test(x)).length;
t(cabem >= 5 && cabem < 9, 'emitidas: só os cards que cabem (' + cabem + ')');
t(textos.indexOf('+ ' + (9 - cabem) + ' mais recentes') >= 0, 'emitidas: "+ ' + (9 - cabem) + ' mais recentes" no pé da coluna');
t(textos.indexOf('E1') >= 0 && textos.indexOf('E9') < 0, 'o corte esconde as mais RECENTES (E9), não as mais paradas (E1)');
conferirGeometria('cenário 1');
// Nenhum texto de uma linha pode estourar a caixa (lição 1 do CLAUDE.md)
const estouro = shapes.filter(s => s.texto && s.fs && s.texto.indexOf('\n') < 0 && s.h <= 16 &&
  _gLarguraTexto_(s.texto, s.fs, s.fonte, s.bold) > s.w - _G_RECUO_TEXTBOX + 0.5);
t(estouro.length === 0, 'texto de linha única cabe na caixa → ' + estouro.map(s => s.texto + '@' + s.fs).join(' | '));
// Cards não invadem a coluna vizinha
const cards = shapes.filter(s => s.tipo === 'RECTANGLE' && s.fill === CR_DESIGN_SYSTEM.colors.cardBg && s.h === 40);
const colX = [0, 1, 2, 3].map(i => 30 + i * ((720 - 60 - 24) / 4 + 8));
t(cards.every(c => colX.some(x => c.x >= x && c.x + c.w <= x + (720 - 60 - 24) / 4 + 0.01)), 'cards dentro da coluna');

// ── Cor do tempo na etapa: mesma régua do portal ────────────────────────────
console.log('Régua de tempo');
t(_solTom_({ status: 'em_analise', dias: 3 }) === 'ok', 'em análise, 3 dias (prazo 5) → ok');
t(_solTom_({ status: 'em_analise', dias: 4 }) === 'atencao', 'em análise, 4 dias → atenção (último dia)');
t(_solTom_({ status: 'em_analise', dias: 6 }) === 'atrasado', 'em análise, 6 dias → atrasado');
t(_solTom_({ status: 'aprovado', dias: 2 }) === 'atencao', 'aprovado, 2 dias (prazo 3) → atenção');
t(_solTom_({ status: 'aguardando_aceite', dias: 3 }) === 'ok', 'sem prazo: 3 dias → ok');
t(_solTom_({ status: 'aguardando_aceite', dias: 5 }) === 'atencao', 'sem prazo: 5 dias → atenção');
t(_solTom_({ status: 'aguardando_aceite', dias: 54 }) === 'atrasado', 'sem prazo: 54 dias → atrasado');

// ── Falhas: o slide avisa, não sai vazio ────────────────────────────────────
console.log('Falhas');
const avisa = (rotulo, trecho) => {
  const tx = rodar();
  const aviso = tx.find(x => x.indexOf('Kanban não gerado') >= 0);
  t(aviso && aviso.indexOf(trecho) >= 0, rotulo + ' → ' + (aviso || '(sem aviso)'));
  conferirGeometria(rotulo);
};
chave = null;                     avisa('sem chave', 'PORTAL_API_KEY');
t(urls.length === 0, 'sem chave nem chama o portal');
chave = 'chave-de-teste';
http = { codigo: 401, corpo: '' }; avisa('chave errada', 'recusou a chave');
http = { codigo: 404, corpo: '' }; avisa('função fora do ar', 'kanban-megas não encontrada');
http = { codigo: 500, corpo: 'boom' }; avisa('erro do portal', 'HTTP 500');
http = { codigo: 200, corpo: '<html>' }; avisa('resposta não-JSON', 'não é JSON');
// Zero falso: coluna renomeada no portal é erro, não coluna vazia.
const semColuna = resposta(2); delete semColuna.colunas.liberada; semColuna.colunas.liberadas = [];
http = { codigo: 200, corpo: semColuna }; avisa('coluna renomeada', 'sem a coluna "liberada"');
http = { codigo: 200, corpo: { totais: {} } }; avisa('sem "colunas"', 'sem "colunas"');

// Totais divergentes viram aviso no Logger (o slide segue com os cards)
const div = resposta(2); div.totais.emitida = 5;
http = { codigo: 200, corpo: div }; rodar();
t(logs.some(l => l.indexOf('diz 5 em "emitida", mas mandou 2') >= 0), 'totais divergentes vão para o Logger');

// ── Diagnóstico ─────────────────────────────────────────────────────────────
console.log('Diagnóstico');
const torto = resposta(1); torto.colunas.solicitante.push(card('X9', 'em_analise', 1));
http = { codigo: 200, corpo: torto }; logs.length = 0; diagnosticarSolicitacoes();
t(logs.some(l => l.indexOf('termina em …este') >= 0), 'mostra o fim da chave, não a chave');
t(logs.filter(l => l.indexOf('✓ Mega') === 0).length === 3, 'consulta os três Megas');
t(logs.some(l => l.indexOf('X9=em_analise') >= 0), 'acusa status fora da coluna esperada');

// ── Prévia em SVG ───────────────────────────────────────────────────────────
if (process.env.PREVIA) {
  http = { codigo: 200, corpo: process.env.REAL ? fs.readFileSync(process.env.REAL, 'utf8') : resposta(9) };
  rodar();
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810" viewBox="0 0 720 405"><rect width="720" height="405" fill="#F8FAFC"/>';
  shapes.forEach(s => {
    if (s.texto === null) {
      if (s.tipo === 'ELLIPSE') return;
      const rx = s.tipo === 'ROUND_RECTANGLE' ? 3 : 0;
      svg += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${Math.max(s.h, 0.6)}" rx="${rx}" fill="${s.fill || 'none'}" stroke="${s.borda || 'none'}" stroke-width="0.6"/>`;
    } else {
      const centro = s.alin === 'CENTER';
      const linhas = s.texto.split('\n');
      linhas.forEach((ln, i) => {
        const y = linhas.length > 1 ? s.y + 10 + i * (s.fs || 10) * 1.3 : s.y + s.h / 2 + (s.fs || 10) * 0.35;
        svg += `<text x="${centro ? s.x + s.w / 2 : s.x + 7}" y="${y}" font-family="${s.fonte || 'Open Sans'}" font-size="${s.fs || 10}" font-weight="${s.bold ? 700 : 400}" fill="${s.cor || '#000'}" text-anchor="${centro ? 'middle' : 'start'}">${esc(ln)}</text>`;
      });
    }
  });
  svg += '</svg>';
  fs.writeFileSync(path.join(process.env.PREVIA, 'solicitacoes.svg'), svg);
  console.log('Prévia: ' + path.join(process.env.PREVIA, 'solicitacoes.svg'));
}

console.log(`\n${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
