// Teste do Mapa de Chuvas (24_Slide_MapaChuvas.gs): turnos do anel, média de
// 10 anos, chamados ligados à chuva e a geometria do slide.
// Rodar: node megas-mensal/teste_mapa_chuvas.js
// Prévia: PREVIA=<pasta> node megas-mensal/teste_mapa_chuvas.js  → grava
// <pasta>/mapa_chuvas.svg (abrir no navegador ou Chrome --headless --screenshot).
const fs = require('fs'), path = require('path'), D = __dirname + '/';
let ok = 0, falha = 0;
const t = (c, m) => { c ? ok++ : (falha++, console.log('FALHOU: ' + m)); };

// ── Dublê do SlidesApp: registra cada shape e explode em geometria inválida ──
let shapes = [];
function novoShape(tipo, x, y, w, h) {
  [x, y, w, h].forEach(v => { if (typeof v !== 'number' || isNaN(v)) throw new Error('geometria NaN em ' + tipo); });
  if (w < 0 || h < 0) throw new Error('dimensão negativa em ' + tipo);
  const s = { tipo, x, y, w, h, texto: null, fill: null, borda: null, fs: null, bold: false, cor: null, alin: null, meio: false };
  shapes.push(s);
  const fill = { setSolidFill: c => { if (!c) throw new Error('setSolidFill(' + c + ')'); s.fill = c; }, setTransparent: () => { s.fill = null; } };
  const lineFill = { setSolidFill: c => { if (!c) throw new Error('borda setSolidFill(' + c + ')'); s.borda = c; } };
  const estilo = new Proxy({}, { get: (o, k) => (v) => {
    if (k === 'setFontSize') { if (!(v > 0)) throw new Error('fonte ' + v); s.fs = v; }
    if (k === 'setBold') s.bold = v; if (k === 'setForegroundColor') { if (!v) throw new Error('cor ' + v); s.cor = v; }
    if (k === 'setItalic') s.italic = v; if (k === 'setFontFamily') s.fonte = v;
    return estilo; } });
  const par = { setParagraphAlignment: a => { s.alin = a; return par; }, setLineSpacing: v => { if (v < 100) throw new Error('spacing'); return par; } };
  const texto = { setText: v => { if (s.tipo !== 'TEXT_BOX') throw new Error('texto em ' + s.tipo); s.texto = String(v); return texto; },
                  getTextStyle: () => estilo, getParagraphStyle: () => par };
  return {
    getFill: () => fill, getLineFill: () => lineFill, setWeight: () => {},
    getBorder: () => ({ setTransparent: () => { s.borda = null; }, getLineFill: () => lineFill, setWeight: () => {} }),
    getText: () => texto, setContentAlignment: a => { s.meio = a === 'MIDDLE'; }
  };
}
const slide = {
  insertShape: (tipo, x, y, w, h) => novoShape(tipo, x, y, w, h),
  insertLine: (cat, x1, y1, x2, y2) => { const o = novoShape('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); shapes[shapes.length - 1].linha = [x1, y1, x2, y2]; return o; },
  insertImage: () => { throw new Error('sem imagem no teste'); },
  getBackground: () => ({ setSolidFill: () => {} })
};
let slidesCriados = 0;
global.SlidesApp = {
  ShapeType: new Proxy({}, { get: (o, k) => k }), LineCategory: { STRAIGHT: 'STRAIGHT' },
  ContentAlignment: { MIDDLE: 'MIDDLE' }, ParagraphAlignment: { CENTER: 'CENTER', START: 'START' },
  PredefinedLayout: { BLANK: 'BLANK' }
};
global.DriveApp = { getFileById: () => { throw new Error('sem Drive'); } };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha'); } };
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

// ── Dublê da Open-Meteo ─────────────────────────────────────────────────────
// Histórico: 3 mm/dia, setembro dos anos anteriores 4 mm/dia (média = 120).
// Setembro/2026 (o mês do teste): dia 5 = 12 mm, dia 10 = 0,6, dia 23 = 30.
const SET26 = { 5: 12, 10: 0.6, 23: 30 };
function chuvaDia(iso) {
  const a = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
  if (a === 2026 && m === 9) return SET26[d] || 0;
  return m === 9 ? 4 : 3;
}
// Horário: (dia, hora) do setembro de 2026 e do 1º de outubro.
const HORAS = { '2026-09-23T15': 14.2, '2026-09-05T03': 3.0, '2026-09-10T08': 0.6,
                '2026-10-01T02': 1.0, '2026-09-01T02': 5.0 };
function dias(ini, fim) {
  const out = []; let d = new Date(ini + 'T00:00:00Z');
  const f = new Date(fim + 'T00:00:00Z');
  while (d <= f) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
}
let urls = [], openMeteoFora = false;
global.UrlFetchApp = { fetch: url => {
  urls.push(url);
  if (openMeteoFora) return { getResponseCode: () => 500, getContentText: () => '' };
  const q = new URL(url).searchParams;
  let corpo;
  if (url.indexOf('archive-api') >= 0 && q.get('daily')) {
    const ts = dias(q.get('start_date'), q.get('end_date'));
    corpo = { daily: { time: ts, precipitation_sum: ts.map(chuvaDia) } };
  } else if (url.indexOf('archive-api') >= 0) {
    const ts = [];
    dias(q.get('start_date'), q.get('end_date')).forEach(d => { for (let h = 0; h < 24; h++) ts.push(d + 'T' + String(h).padStart(2, '0') + ':00'); });
    corpo = { hourly: { time: ts, precipitation: ts.map(x => HORAS[x.slice(0, 13)] || 0) } };
  } else {
    const ts = dias('2026-10-16', '2026-10-29');
    corpo = { daily: { time: ts,
      weather_code: ts.map((x, i) => [0, 2, 3, 61, 63, 80, 95, 1, 3, 51, 65, 2, 0, 81][i]),
      temperature_2m_max: ts.map((x, i) => 24 + (i % 5)), temperature_2m_min: ts.map((x, i) => 14 + (i % 4)),
      precipitation_sum: ts.map((x, i) => [0, 0, 0.4, 6, 18.5, 3, 24, 0, 0, 1.2, 12, 0, 0, 7][i]),
      precipitation_probability_max: ts.map((x, i) => [5, 10, 30, 70, 90, 60, 95, 10, 20, 45, 85, 15, 5, 65][i]) } };
  }
  return { getResponseCode: () => 200, getContentText: () => JSON.stringify(corpo) };
} };
global.Utilities = { sleep: () => {}, formatDate: () => hoje };
let hoje = '2026-10-16';

// ── Carrega o projeto ───────────────────────────────────────────────────────
let src = '';
for (const f of ['00_Helpers.gs', '01_Config.gs', '02_Dados.gs', '13_Slide_Metas.gs', '24_Slide_MapaChuvas.gs']) src += fs.readFileSync(D + f, 'utf8') + '\n';
(0, eval)(src.replace(/^(const|let) /gm, 'var '));

global.getDeckAtivo = () => ({ getPageWidth: () => 720, getPageHeight: () => 405, appendSlide: () => { slidesCriados++; return slide; } });
global.obterMesReferencia_ = () => ({ index: 8, nome: 'SETEMBRO', curto: 'Setembro', sigla: 'SET', mes: '09', ano: 2026, siglaAno: 'SET/26' });
const U = (a, m, d, h, mi, s) => new Date(Date.UTC(a, m - 1, d, h || 0, mi || 0, s || 0));
const BD_PADRAO = [
  { id: '101', descricao: 'Infiltração no telhado do galpão 3', dtReporte: U(2026, 9, 23, 16, 10),
    estado: 'Fechado', estadoSistema: 'Fechado', dtFechado: U(2026, 9, 25, 9), local: 'GALPÃO 3', cliente: 'Locatária Alfa Logística S.A.', prioridade: 'Alta' },
  { id: '102', descricao: 'GOTEIRA sobre a doca', dtReporte: U(2026, 9, 12, 3, 40),
    estado: 'Aguardando material', estadoSistema: 'Pausado', dtFechado: null, local: 'DOCA 12', cliente: '', prioridade: 'Emergencial' },
  { id: '103', descricao: 'Troca de chuveiro no vestiário', dtReporte: U(2026, 9, 14, 10) },
  { id: '104', descricao: 'Alagamento na portaria', dtReporte: U(2026, 9, 7),
    estado: 'Fechado', estadoSistema: 'Fechado', dtFechado: null, local: 'PORTARIA', cliente: '', prioridade: 'Média' },
  { id: '105', descricao: 'Chuva forte derrubou placa', dtReporte: U(2026, 8, 30, 15) },
  { id: '106', descricao: 'Calha entupida', dtReporte: U(2026, 9, 23, 17, 5),
    estado: 'Em atendimento', estadoSistema: 'Em atendimento', dtFechado: null, local: 'GALPÃO 3', cliente: 'Locatária Alfa', prioridade: 'Baixa' }
];
let bd = BD_PADRAO;
global._lerBdCorretivasCru_ = () => bd;
setProjetoAtivo('ESTEIO');

// Limpa o cache entre cenários — trocar o dublê sem limpar não teria efeito.
function rodar(fn) { shapes = []; logs.length = 0; urls = []; _mapaChuvasCache = {}; slidesCriados = 0; (fn || gerarSlideMapaChuvas)(); return shapes.filter(s => s.texto !== null).map(s => s.texto); }

// ── Cenário 1: setembro/2026 completo ───────────────────────────────────────
console.log('Cenário 1: SET/26, Mega Esteio, tudo respondendo');
const d = obterMapaChuvas_();
t(d.mes && Math.abs(d.mes.total - 42.6) < 1e-9, 'total do mês = 42,6 → ' + (d.mes && d.mes.total));
t(d.mes.diasChuva === 2, 'dias com ≥1 mm = 2 (o dia de 0,6 não conta) → ' + d.mes.diasChuva);
t(d.mes.completo, 'mês completo');
const ult = d.meses[d.meses.length - 1];
t(d.meses.length === 12 && d.meses[0].ano === 2025 && d.meses[0].mes === 9, 'janela OUT/25 → SET/26');
t(Math.abs(ult.media - 120) < 1e-9, 'média de setembro dos 10 anos = 120 → ' + ult.media);
t(Math.abs(d.meses[0].real - 93) < 1e-9, 'OUT/25 realizado = 31 × 3 = 93 → ' + d.meses[0].real);
t(Math.abs(d.meses[0].media - 93) < 1e-9, 'média de outubro = 93 → ' + d.meses[0].media);
const c = d.turnos.celulas;
t(c[22][1] === 14.2, 'dia 23 às 15h → tarde do dia 23');
t(c[3][2] === 3.0, 'dia 5 às 3h → noite do dia 4');
t(c[4][2] === 0, 'noite do dia 5 fica seca (a chuva das 3h foi para o dia 4)');
t(c[9][0] === 0.6, 'dia 10 às 8h → manhã do dia 10');
t(c[29][2] === 1.0, '1º de outubro às 2h → noite do dia 30');
t(c[0][2] === 0, 'madrugada do dia 1º (mês anterior) não entra');
t(d.turnos.pico.valor === 14.2 && d.turnos.pico.dia === 23 && d.turnos.pico.turno === 1, 'pico = 14,2 mm/h, 23, tarde');
t(_chuvaClasse_(14.2).nome === 'Forte' && _chuvaClasse_(10).nome === 'Forte', 'forte a partir de 10');
t(_chuvaClasse_(9.99).nome === 'Moderada' && _chuvaClasse_(2.5).nome === 'Moderada', 'moderada 2,5–10');
t(_chuvaClasse_(0.5).nome === 'Leve' && _chuvaClasse_(0.49) === null && _chuvaClasse_(0) === null, 'leve a partir de 0,5; abaixo é seco');
const imp = d.impactos.map(i => i.id + ':' + i.dia + '/' + i.turno).join(' ');
t(imp === '104:7/0 102:11/2 101:23/1 106:23/1', 'impactos (chuveiro e agosto fora; madrugada → noite anterior; sem hora → manhã) → ' + imp);
const daily = urls.find(u => u.indexOf('daily=precipitation_sum') >= 0);
t(/start_date=2015-01-01/.test(daily) && /end_date=2026-09-30/.test(daily), 'diário de 2015-01-01 a 2026-09-30 → ' + daily);
const hourly = urls.find(u => u.indexOf('hourly=') >= 0);
t(/start_date=2026-09-01/.test(hourly) && /end_date=2026-10-01/.test(hourly), 'horário até o dia 1º do mês seguinte');
t(/latitude=-29.8519/.test(daily), 'coordenadas do Esteio');

let tx = rodar();
t(slidesCriados === 1, 'um slide');
t(tx.includes('43 mm'), 'KPI chuva no mês = 43 mm');
t(tx.some(s => s === '▼ 65% abaixo da média de 10 anos (120 mm)'), 'KPI: ▼ 65% abaixo da média → ' + tx.filter(s => /média/.test(s)).join(' | '));
t(tx.includes('2 de 30'), 'KPI dias com chuva = 2 de 30');
t(tx.includes('14,2 mm/h') && tx.includes('23/09 · tarde · chuva forte'), 'KPI pico 14,2 mm/h, 23/09 tarde');
t(tx.includes('4'), 'KPI chamados = 4');
t(tx.includes('SETEMBRO') && tx.includes('2026'), 'centro do anel com o mês');
for (let dia = 1; dia <= 30; dia++) if (!tx.includes(String(dia))) t(false, 'rótulo do dia ' + dia);
t(!tx.includes('31'), 'setembro sem dia 31');
const pontos = shapes.filter(s => s.tipo === 'ELLIPSE' && s.w < 10 && s.w > 6);
t(pontos.length === 90, '30 dias × 3 turnos = 90 pontos → ' + pontos.length);
t(pontos.filter(s => s.fill === '#1E3A8A').length === 1, '1 ponto forte');
t(pontos.filter(s => s.fill === '#0284C7').length === 1, '1 ponto moderado');
t(pontos.filter(s => s.fill === '#7DD3FC').length === 2, '2 pontos leves');
const xs = shapes.filter(s => s.tipo === 'LINE' && s.borda === CR_DESIGN_SYSTEM.colors.accentRed);
t(xs.length === 3 * 2 + 2, '3 células com ✕ (101 e 106 na mesma) + legenda → ' + xs.length / 2);
t(tx.includes('OUT/25') && tx.includes('SET/26') && tx.includes('93'), 'painel de 12 meses');
t(tx.includes('HOJE') && tx.includes('16/10') && tx.includes('29/10'), 'previsão de 16/10 a 29/10');
t(tx.some(s => /^72 mm previstos · 7 dias com chuva · maior volume: 24 mm em 22\/10$/.test(s)), 'rodapé da previsão → ' + tx.filter(s => /previstos/.test(s)).join(''));
t(!tx.some(s => /indisponível|Falha/.test(s)), 'nenhum aviso de falha → ' + tx.filter(s => /indisponível|Falha/.test(s)).join(' | '));
// Geometria: nada sai da página (a elipse do header sangra de propósito).
const fora = shapes.filter(s => !(s.tipo === 'ELLIPSE' && s.w === 450) && (s.x < -14 || s.y < 0 || s.x + s.w > 734 || s.y + s.h > 405));
t(fora.length === 0, 'shapes dentro da página → ' + fora.map(s => s.tipo + '@' + s.x.toFixed(0) + ',' + s.y.toFixed(0) + ' ' + (s.texto || '')).slice(0, 5).join(' | '));
const visiveis = shapes.filter(s => s.tipo !== 'TEXT_BOX' && !(s.tipo === 'ELLIPSE' && s.w === 450));
t(visiveis.every(s => s.x >= 0 && s.x + s.w <= 720 && s.y + s.h <= 400), 'formas visíveis dentro da margem');

if (process.env.PREVIA) {
  fs.mkdirSync(process.env.PREVIA, { recursive: true });
  fs.writeFileSync(path.join(process.env.PREVIA, 'mapa_chuvas.svg'), svg(shapes));
  console.log('  prévia: ' + path.join(process.env.PREVIA, 'mapa_chuvas.svg'));
}

// ── Cenário 2: Open-Meteo fora do ar ────────────────────────────────────────
console.log('Cenário 2: Open-Meteo fora do ar');
openMeteoFora = true;
let erro = null;
try { tx = rodar(); } catch (e) { erro = e; }
t(!erro, 'não lança exceção → ' + (erro && erro.message));
t(tx.some(s => /Previsão indisponível/.test(s)) && tx.some(s => /Histórico indisponível/.test(s)), 'avisos nos painéis');
t(tx.includes('sem dado horário'), 'anel avisa sem dado horário');
t(tx.includes('4'), 'chamados continuam aparecendo (vêm da BD, não da Open-Meteo)');
t(shapes.filter(s => s.tipo === 'ELLIPSE' && s.w < 10 && s.w > 6 && s.fill === '#FFFFFF').length === 90, '90 pontos vazios');
openMeteoFora = false;

// ── Cenário 3: mês ainda em andamento ───────────────────────────────────────
console.log('Cenário 3: gerado em 20/09 com o mês de referência = setembro');
hoje = '2026-09-20';
tx = rodar();
t(tx.includes('parcial: dados até 19/09'), 'KPI avisa parcial → ' + tx.filter(s => /parcial/.test(s)).join(''));
t(tx.includes('SET/26*'), 'mês parcial marcado com * no painel de 12 meses');
t(/end_date=2026-09-19/.test(urls.find(u => u.indexOf('hourly=') >= 0)), 'horário não pede além de ontem');
hoje = '2026-10-16';

// ── Cenário 4: slide dos chamados ligados à chuva ───────────────────────────
console.log('Cenário 4: slide dos chamados');
tx = rodar(gerarSlideChamadosChuva);
t(slidesCriados === 1, 'um slide para 4 chamados');
t(tx.includes('4 CHAMADOS · 1 FECHADO · 3 EM ABERTO'), 'título com a contagem (104 tem estado Fechado mas sem data → aberto, regra do backlog) → ' + tx.find(s => /CHAMADO/.test(s) && /ABERTO/.test(s)));
const ordem = tx.filter(s => /^10[1-6]$/.test(s)).join(',');
t(ordem === '104,102,101,106', 'ordem por dia e turno → ' + ordem);
t(tx.includes('Fechado 25/09'), 'pílula fechado com data');
t(tx.includes('Fechado sem data'), '104: estado Fechado sem data de fechamento');
t(tx.includes('Aguardando material'), 'aberto mostra o estado');
t(tx.includes('manhã · sem hora'), 'reporte sem hora');
t(tx.includes('noite · 03:40'), 'madrugada aparece como noite do dia anterior, com a hora real');
t(tx.includes('11/09'), 'goteira das 3h40 do dia 12 cai no dia 11');
t(tx.includes('14,2 mm/h') && tx.includes('forte'), 'chuva do turno do 101/106 = 14,2 forte');
t(tx.includes('termo: infiltração') && tx.includes('termo: goteira') && tx.includes('termo: calha'), 'termo que pôs na lista');
t(tx.includes('Emergencial') && tx.includes('GALPÃO 3'), 'prioridade e local');
t(!tx.some(s => /chuveiro|placa/.test(s)), 'chuveiro e agosto fora');
const fora2 = shapes.filter(s => !(s.tipo === 'ELLIPSE' && s.w === 450) && (s.x < -14 || s.y < 0 || s.x + s.w > 734 || s.y + s.h > 405));
t(fora2.length === 0, 'tabela dentro da página → ' + fora2.map(s => s.tipo + ' ' + (s.texto || '')).slice(0, 3).join(' | '));
if (process.env.PREVIA) fs.writeFileSync(path.join(process.env.PREVIA, 'chamados_chuva.svg'), svg(shapes));

const muitos = [];
for (let i = 0; i < 25; i++) muitos.push({ id: String(500 + i), descricao: 'Infiltração na cobertura, trecho ' + i + ', água escorrendo pela parede até o piso do mezanino e molhando paletes armazenados',
  dtReporte: U(2026, 9, 1 + i, 9), estado: 'Aberto', estadoSistema: 'Aberto', dtFechado: null, local: 'GALPÃO COM NOME MUITO COMPRIDO DE VERDADE ' + i, cliente: 'Cliente', prioridade: 'Alta' });
bd = muitos;
tx = rodar(gerarSlideChamadosChuva);
t(slidesCriados === 3, '25 chamados → 3 slides de 9 → ' + slidesCriados);
t(tx.some(s => /· 3\/3$/.test(s)), 'subtítulo com a página');
t(shapes.every(s => s.tipo !== 'TEXT_BOX' || !s.texto || !/^Falha/.test(s.texto)), 'sem aviso de falha');
bd = [];
rodar(gerarSlideChamadosChuva);
t(slidesCriados === 0, 'sem chamado de chuva → nenhum slide');
bd = BD_PADRAO;

// Cache: o slide dos chamados reaproveita a leitura do mapa.
_mapaChuvasCache = {}; urls = [];
obterMapaChuvas_(); const n1 = urls.length; obterMapaChuvas_();
t(n1 === 3 && urls.length === 3, 'segunda leitura vem do cache → ' + n1 + '/' + urls.length);

// ── Cenário 5: Mega Curitiba fica em Campina Grande do Sul ──────────────────
setProjetoAtivo('CURITIBA');
rodar();
t(urls.every(u => /latitude=-25.3047&longitude=-49.0553/.test(u)), 'Curitiba consulta Campina Grande do Sul');

console.log(ok + ' ok, ' + falha + ' falha(s)');
process.exitCode = falha ? 1 : 0;

// ── Prévia em SVG (aproximação: fonte, cor e caixa de cada shape) ───────────
function svg(lista) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fam = f => f && /Montserrat/.test(f) ? 'Montserrat, Arial' : 'Open Sans, Arial';
  let o = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810" viewBox="0 0 720 405">' +
          '<rect width="720" height="405" fill="#F8FAFC"/>';
  lista.forEach(s => {
    if (s.tipo === 'LINE') {
      o += `<line x1="${s.linha[0]}" y1="${s.linha[1]}" x2="${s.linha[2]}" y2="${s.linha[3]}" stroke="${s.borda || '#000'}" stroke-width="1.5"/>`;
    } else if (s.tipo === 'TEXT_BOX') {
      if (!s.texto) return;
      const cx = s.alin === 'CENTER' ? s.x + s.w / 2 : s.x + 7;
      const cy = s.meio ? s.y + s.h / 2 : s.y + 7 + (s.fs || 10) * 0.5;
      o += `<text x="${cx}" y="${cy}" font-size="${s.fs || 10}" font-family="${fam(s.fonte)}" font-weight="${s.bold ? 700 : 400}" ` +
           `font-style="${s.italic ? 'italic' : 'normal'}" fill="${s.cor || '#000'}" dominant-baseline="middle" ` +
           `text-anchor="${s.alin === 'CENTER' ? 'middle' : 'start'}">${esc(s.texto)}</text>`;
    } else {
      const fill = s.fill || 'none', st = s.borda ? `stroke="${s.borda}" stroke-width="0.75"` : '';
      if (s.tipo === 'ELLIPSE') o += `<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" fill="${fill}" ${st} ${s.w === 450 ? 'fill-opacity="0.03"' : ''}/>`;
      else o += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.tipo === 'ROUND_RECTANGLE' ? 4 : 0}" fill="${fill}" ${st}/>`;
    }
  });
  return o + '</svg>';
}
