// node teste_descricoes.js — feedback da diretoria de 31/10/2026: descrições
// inteiras, com o local (Backlog de Clientes e Emergencial). O slide Demora
// Crônica, feito na mesma leva, foi retirado em 10/11/2026.
// Dublês de Slides e da planilha; os chamados são inventados no formato do BD-CORRETIVAS.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let falhas = 0, total = 0;
function checa(cond, nome) { total++; if (cond) console.log('  ✓ ' + nome); else { falhas++; console.log('  ✗ ' + nome); } }

const LARG = 720, ALT = 405;
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
const espelho = new Proxy({}, { get: (_, k) => k });
global.SlidesApp = { ShapeType: espelho, ContentAlignment: espelho, ParagraphAlignment: espelho,
                     PredefinedLayout: espelho, LineCategory: espelho, DashStyle: espelho };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
global.DriveApp = { getFileById: () => ({ getBlob: () => null }) };

// ── Slides ──
const slides = [];
function estilo() { const o = {}; ['setFontSize', 'setBold', 'setItalic', 'setForegroundColor', 'setFontFamily', 'setUnderline']
  .forEach(k => { o[k] = () => o; }); return o; }
function texto() {
  const o = { _t: '', setText(t) { o._t = String(t); return o; },
    appendText(t) { o._t += String(t); return { getTextStyle: estilo }; },
    getTextStyle: estilo, getRange: () => ({ getTextStyle: estilo }), asString: () => o._t,
    getParagraphStyle: () => ({ setLineSpacing: () => ({}), setParagraphAlignment: () => ({}) }) };
  return o;
}
function novoSlide() {
  const s = { shapes: [], nota: '' };
  const ins = (tipo, x, y, w, h) => {
    if ([x, y, w, h].some(v => typeof v !== 'number' || !isFinite(v)) || w < 0 || h < 0)
      throw new Error('geometria inválida ' + tipo + ' ' + JSON.stringify([x, y, w, h]));
    const t = texto();
    const sh = { tipo, x, y, w, h, get txt() { return t._t; }, getText: () => t,
      getFill: () => ({ setSolidFill: () => {} }),
      getBorder: () => { const b = { setTransparent: () => b, setWeight: () => b, getLineFill: () => ({ setSolidFill: () => {} }) }; return b; },
      setContentAlignment: () => sh };
    s.shapes.push(sh); return sh;
  };
  Object.assign(s, {
    insertShape: ins,
    insertTextBox: (txt, x, y, w, h) => { const t = ins('TEXT_BOX', x, y, w, h); t.getText().setText(txt); return t; },
    insertLine: (c, x1, y1, x2, y2) => { const l = ins('LINE', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      l.getLineFill = () => ({ setSolidFill: () => {} }); l.setWeight = () => l; l.setDashStyle = () => l; return l; },
    insertImage: () => ({ setWidth() { return this; }, setHeight() { return this; }, setLeft() { return this; }, setTop() { return this; },
                          getWidth: () => 100, getHeight: () => 50 }),
    getBackground: () => ({ setSolidFill: () => {} }),
    getObjectId: () => 'p' + slides.indexOf(s),
    getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({
      setText: t => { s.nota = String(t); }, asString: () => s.nota }) }) }),
    remove: () => slides.splice(slides.indexOf(s), 1),
    move: i => { const de = slides.indexOf(s); slides.splice(de, 1); slides.splice(de < i ? i - 1 : i, 0, s); }
  });
  return s;
}
const deck = { getPageWidth: () => LARG, getPageHeight: () => ALT, getSlides: () => slides.slice(),
               appendSlide: () => { const s = novoSlide(); slides.push(s); return s; } };

// ── Planilha: só a aba DEMORA CRÔNICA importa aqui ──
let abaDemora = null;   // matriz; null = a aba não existe
function abaDe(m) {
  return {
    getDataRange: () => ({ getDisplayValues: () => m.map(r => r.map(String)) }),
    getRange: (r, c, nr, nc) => ({ setValues: v => { v.forEach((lin, i) => { m[r - 1 + i] = lin.slice(); }); } })
  };
}
global.SpreadsheetApp = { openById: () => ({ getName: () => 'dublê', getSheets: () => [],
  getSheetByName: n => (n === 'DEMORA CRÔNICA' && abaDemora ? abaDe(abaDemora) : null),
  insertSheet: n => { abaDemora = []; return abaDe(abaDemora); } }) };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));
global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2026, label: 'OUTUBRO 2026' });
global._propEquipeCorretiva_ = () => 'PROPERTY';
global._chamadoResponsabilidadeLocatario_ = () => false;

const D = s => new Date(s + 'T12:00:00Z');
const LONGA = 'Nas fachadas laterais e fundos do Ed. Carlos Gomes foram identificados pontos de infiltração ' +
              'com desplacamento do reboco e risco de queda de material sobre a calçada, exigindo isolamento ' +
              'da área e contratação de empresa para recuperação.';
const BASE = [
  { id: '2844117', cc: 'HANGAR VIP', cliente: 'ESTACIONAMENTO HANGAR VIP', estado: 'Aberto', descricao: 'C16. Sem evidências de corrosão/oxidação: Não conforme na estrutura do pátio',
    local: '06.20.000001.01 - HANGAR VIP - ÁREA COMUM - Pátio', area: 'Estrutura', dtReporte: D('2021-11-24') },
  { id: '6389786', cc: 'MEGA CURITIBA', cliente: 'SHPX LOGISTICA', estado: 'Pausado', motivoPausa: 'Orçamento 2027',
    dtPausado: D('2026-03-01'), dtAprovado: D('2023-09-20'), dtIniciado: D('2023-10-01'),
    descricao: 'Fissuras no piso do módulo 12', local: '06.01.006287.12 - MEGA Curitiba - SHOPEE - Módulo 12', area: 'Piso', dtReporte: D('2023-09-15') },
  { id: '18190018', cc: 'CARLOS GOMES', cliente: 'ASSOCIACAO DE ENSINO', estado: 'Aprovado', dtAprovado: D('2026-05-25'),
    descricao: LONGA, local: '06.30.0001.02 - PRAÇA CARLOS GOMES - FACHADA', area: 'Fachada', dtReporte: D('2026-03-21'),
    descEstado: 'Aguardando 3ª proposta' },
  { id: '20276377', cc: 'MEGA ESTEIO', cliente: 'SHPX LOGISTICA', estado: 'Aberto', prioridade: 'Emergencial',
    descricao: 'Sinistro: calhas deslocadas', local: '01.06.000003.09 - MEGA Esteio - ARMAZÉM A - Módulo 09', area: 'Cobertura', dtReporte: D('2026-09-21') },
  { id: '20276401', cc: 'MEGA ESTEIO', cliente: 'SHPX LOGISTICA', estado: 'Aberto', prioridade: 'Emergencial',
    descricao: 'Sinistro: calhas deslocadas', local: '01.06.000003.10 - MEGA Esteio - ARMAZÉM A - Módulo 10', area: 'Cobertura', dtReporte: D('2026-09-21') },
  { id: '999', cc: 'MEGA ITAJAÍ', cliente: 'X', estado: 'Fechado', descricao: 'fechado', dtReporte: D('2024-01-01'), dtFechado: D('2024-02-01') }
];
global._propLerCorretivas_ = () => BASE.map(b => Object.assign({ responsaveis: 'Jonatas Augusto Ferreira', prioridade: 'Normal',
  motivoPausa: '', descEstado: '', observacoes: '', dtAprovado: null, dtIniciado: null, dtPausado: null, dtFechado: null }, b));

const dentro = s => s.shapes.filter(x => x.tipo !== 'ELLIPSE')
  .every(x => x.x >= -1 && x.y >= -0.5 && x.x + x.w <= LARG + 1 && x.y + x.h <= ALT + 0.5);
const textoDe = s => s.shapes.map(x => x.txt).join(' | ');

console.log('\n== Onde é o chamado ==');
checa(_propOndeChamado_('06.01.006287.56.04 - MEGA Curitiba - ÁREA COMUM - Portaria', 'Portas') === 'Área Comum - Portaria · Portas',
      'tira código e imóvel, "ÁREA COMUM" vira título, acrescenta a Área');
checa(_propOndeChamado_('01.06.000003.56.03.A - MEGA Esteio - Cobertura', 'Cobertura') === 'Cobertura', 'não repete a Área');
checa(_propOndeChamado_('', 'Piso') === 'Piso' && _propOndeChamado_('', '') === '', 'sem Local: só a Área (ou nada)');

console.log('\n== Backlog Emergencial: descrição com o módulo ==');
const emerg = obterBacklogEmergencialDetalhe_();
checa(emerg.length === 2 && emerg[0].descricao !== emerg[1].descricao, 'os dois sinistros iguais agora se distinguem');
checa(/Módulo 09 · Cobertura — Sinistro/.test(emerg.map(e => e.descricao).join(' ')), 'formato "<onde> — <descrição>"');

console.log('\n== Backlog de Clientes: descrição inteira ==');
gerarSlideBacklogClientesProperties();
const bkc = slides.filter(s => /PROP_BACKLOG_CLIENTES/.test(s.nota));
checa(bkc.length >= 1, 'gerou ' + bkc.length + ' página(s)');
checa(bkc.some(s => textoDe(s).indexOf('contratação de empresa para recuperação.') >= 0), 'a descrição longa sai INTEIRA, sem "…"');
checa(bkc.some(s => textoDe(s).indexOf('Fachada') >= 0), 'com o local na frente');
checa(bkc.every(dentro), 'nada fora da página');
checa(!bkc.some(s => /NÃO FOI GERADO/.test(textoDe(s))), 'sem aviso de falha');

{ // Muitos chamados longos de um cliente só: o grupo quebra em páginas, nada transborda.
  const longos = Array.from({ length: 14 }, (_, i) => ({ id: String(100 + i), cliente: 'ACME', empreendimento: 'MEGA ESTEIO',
    descricao: LONGA, onde: 'Armazém A - Módulo ' + i + ' · Cobertura', dataReporte: '01/01/25', diasAberto: 600 - i }));
  const pgs = _paginarGruposBacklog_([longos], ALT - 16 - 76, LARG - 60);
  checa(pgs.length > 1 && pgs.reduce((s, p) => s + p.reduce((t, g) => t + g.length, 0), 0) === 14,
        'cliente com 14 chamados longos: ' + pgs.length + ' páginas, nenhum perdido');
  checa(pgs.slice(1).every(p => p[0].continua), 'a partir da 2ª página o grupo diz "cont."');
}

console.log(falhas ? '\n✗ ' + falhas + ' de ' + total + ' falharam' : '\n✓ ' + total + '/' + total + ' passaram');
process.exitCode = falhas ? 1 : 0;
