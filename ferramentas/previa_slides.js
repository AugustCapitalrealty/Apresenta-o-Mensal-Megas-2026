// Prévia de slides sem o Google Slides e sem Python: lê as formas que os
// testes registram e grava um HTML por slide, com as fontes de verdade
// (orcamento-2027/ferramentas/fontes), e fotografa com o Chrome headless.
//
// Uso: node ferramentas/previa_slides.js <formas.json> <pasta de saída> [índices]
//   <formas.json> = { W, H, slides: [{ fundo, formas: [...] }] } — o formato
//   que orcamento-2027/teste/teste_orcamento.js grava com PREVIA=<pasta>
//   (formas_<cidade>.json) e que gestao-tvs/teste_rebrand.js também grava.
//   [índices] = "5,12,38" (padrão: todos).
// Saída: slide_<n>.html e slide_<n>.png (1440×810, 2 px por pt).
//
// Forma: { tipo: RECTANGLE|ROUND_RECTANGLE|ELLIPSE|LINE|TEXT_BOX|IMAGE, x, y, w, h,
//          cor, alpha, borda, peso, texto, fs, negrito, italico, corTexto, fonte,
//          align: START|CENTER|END, meio, x1, y1, x2, y2, rotulo }
// É uma aproximação: o recuo interno de 7,2 pt da caixa de texto é imitado,
// mas a quebra de linha do Slides pode diferir em uma ou outra palavra.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const [arq, saida, sel] = process.argv.slice(2);
if (!arq || !saida) { console.log('Uso: node ferramentas/previa_slides.js <formas.json> <pasta> [índices]'); process.exit(1); }
const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
const W = dados.W || 720, H = dados.H || 405;
fs.mkdirSync(saida, { recursive: true });

const FONTES = path.resolve(__dirname, '..', 'orcamento-2027', 'ferramentas', 'fontes');
const url = f => 'file:///' + path.join(FONTES, f).replace(/\\/g, '/');
const css = `
@font-face { font-family: 'Montserrat'; src: url('${url('Montserrat[wght].ttf')}'); font-weight: 100 900; }
@font-face { font-family: 'Open Sans'; src: url('${url('OpenSans[wdth,wght].ttf')}'); font-weight: 300 800; }
@font-face { font-family: 'EB Garamond'; src: url('${url('EBGaramond[wght].ttf')}'); font-weight: 400 800; }
html, body { margin: 0; padding: 0; }
.s { position: relative; width: ${W}pt; height: ${H}pt; overflow: hidden; transform: scale(${1440 / (W * 4 / 3)}); transform-origin: 0 0; }
.f { position: absolute; box-sizing: border-box; }
.t { position: absolute; box-sizing: border-box; padding: 0 7.2pt; display: flex; flex-direction: column;
     white-space: pre-wrap; overflow-wrap: break-word; line-height: 1.18; }`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function rgba(cor, alpha) {
  if (!cor) return 'transparent';
  if (alpha === undefined || alpha === 1) return cor;
  const n = parseInt(cor.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function forma(f) {
  const pos = `left:${f.x}pt;top:${f.y}pt;width:${Math.max(f.w, 0)}pt;height:${Math.max(f.h, 0)}pt;`;
  if (f.tipo === 'LINE') {
    const dx = f.x2 - f.x1, dy = f.y2 - f.y1, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return `<div class="f" style="left:${f.x1}pt;top:${f.y1 - (f.peso || 1) / 2}pt;width:${len}pt;height:0;` +
           `border-top:${f.peso || 1}pt ${f.tracejado ? 'dashed' : 'solid'} ${f.cor};transform-origin:0 50%;transform:rotate(${ang}deg)"></div>`;
  }
  if (f.tipo === 'TEXT_BOX') {
    if (f.texto === null || f.texto === undefined) return '';
    const meio = f.meio !== undefined ? f.meio : f.h <= (f.fs || 10) * 2.4;
    const al = f.align === 'CENTER' ? 'center' : (f.align === 'END' ? 'right' : 'left');
    return `<div class="t" style="${pos}justify-content:${meio ? 'center' : 'flex-start'};${meio ? '' : 'padding-top:3.6pt;'}` +
           `text-align:${al};font-family:'${f.fonte || 'Open Sans'}';font-size:${f.fs || 14}pt;` +
           `font-weight:${f.negrito ? 700 : 400};${f.italico ? 'font-style:italic;' : ''}color:${f.corTexto || '#000'}">${esc(f.texto)}</div>`;
  }
  if (f.tipo === 'IMAGE') {
    return `<div class="f" style="${pos}background:#CBD5E1;display:flex;align-items:center;justify-content:center;` +
           `font:600 8pt 'Open Sans';color:#475569">${esc(f.rotulo || 'imagem')}</div>`;
  }
  const raio = f.tipo === 'ELLIPSE' ? '50%' : (f.tipo === 'ROUND_RECTANGLE' ? `${Math.min(f.w, f.h) * 0.08}pt` : '0');
  const borda = f.borda ? `border:${f.peso || 1}pt solid ${f.borda};` : '';
  return `<div class="f" style="${pos}background:${rgba(f.cor, f.alpha)};border-radius:${raio};${borda}"></div>`;
}

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const indices = sel ? sel.split(',').map(Number) : dados.slides.map((_, i) => i);
indices.forEach(i => {
  const s = dados.slides[i];
  if (!s) return;
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style>` +
               `<div class="s" style="background:${s.fundo || '#FFFFFF'}">${s.formas.map(forma).join('')}</div>`;
  const h = path.resolve(saida, `slide_${i}.html`), png = path.resolve(saida, `slide_${i}.png`);
  fs.writeFileSync(h, html);
  if (chrome) {
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
      '--window-size=1440,810', '--virtual-time-budget=2000', `--screenshot=${png}`, 'file:///' + h.replace(/\\/g, '/')],
      { stdio: 'ignore' });
  }
  console.log(chrome ? png : h);
});
