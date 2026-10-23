// "Formas pelo motor" em PNG, SEM Python — o mesmo desenho de graficos_imagem.py (23/10/2026: o antivírus isola a
// máquina quando roda Python). Lê um manifesto { assinatura: especificação } (o do teste com PREVIA, ou "GRAFICOS
// PENDENTES.json" que a geração grava na pasta de imagens) e grava "GRAFICO - <assinatura>.png" (transparente,
// 1920×1080) na pasta de imagens — só as que faltam; --todas refaz.
// Uso: node ferramentas/graficos_imagem.js <manifesto.json> [pasta de imagens] [--todas]
//
// Especificação (pt de um slide 720×405): {"v":1,"w":720,"h":405,"p":[...]} com
//   ["r", x, y, w, h, cor, redondo, borda, peso, alpha]     retângulo (cor "" = sem fundo)
//   ["l", x1, y1, x2, y2, cor, peso, tracejada]             linha
//   ["e", x, y, w, h, fundo, borda, peso]                   elipse
// Antialias pela distância ao contorno de cada forma (como as molduras), em vez do supersample do Pillow.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const args = process.argv.slice(2), todas = args.indexOf('--todas') >= 0;
const [manifesto, pastaArg] = args.filter(a => a !== '--todas');
const PASTA = pastaArg || path.resolve(__dirname, '..', '..', '..', 'IMAGENS - SLIDES');
const LARG = 1920;

// ---------- PNG RGBA ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function pngGravar(arq, w, h, rgba) {
  const lin = w * 4, linhas = Buffer.alloc((lin + 1) * h);
  for (let y = 0; y < h; y++) { linhas[y * (lin + 1)] = 0; rgba.copy(linhas, y * (lin + 1) + 1, y * lin, (y + 1) * lin); }
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([len, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(arq, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0))]));
}

// ---------- desenho ----------
const hex = c => [1, 3, 5].map(i => parseInt(String(c).substr(i, 2), 16));
const cobre = d => Math.max(0, Math.min(1, 0.5 - d));   // distância ao contorno (px, negativa dentro) → cobertura

function grafico(spec) {
  const k = LARG / spec.w, W = Math.round(spec.w * k), H = Math.round(spec.h * k);
  const img = new Float32Array(W * H * 4);   // RGBA pré-multiplicado, 0..1
  const pintar = (i, cor, a) => {
    if (a <= 0) return;
    const p = i * 4, f = 1 - a;
    img[p] = cor[0] / 255 * a + img[p] * f; img[p + 1] = cor[1] / 255 * a + img[p + 1] * f;
    img[p + 2] = cor[2] / 255 * a + img[p + 2] * f; img[p + 3] = a + img[p + 3] * f;
  };
  // Percorre a caixa (px) e pinta com a cobertura que dist(x, y) der.
  const varrer = (x0, y0, x1, y1, dist, cor, alpha) => {
    const xi = Math.max(0, Math.floor(x0) - 2), xf = Math.min(W - 1, Math.ceil(x1) + 2);
    const yi = Math.max(0, Math.floor(y0) - 2), yf = Math.min(H - 1, Math.ceil(y1) + 2);
    for (let y = yi; y <= yf; y++) for (let x = xi; x <= xf; x++) {
      const a = dist(x + 0.5, y + 0.5);
      if (a > 0) pintar(y * W + x, cor, a * alpha);
    }
  };
  // Retângulo arredondado: distância com sinal.
  const dRet = (x0, y0, x1, y1, r) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = Math.max(0, (x1 - x0) / 2), hy = Math.max(0, (y1 - y0) / 2), rr = Math.min(r, hx, hy);
    return (px, py) => {
      const qx = Math.abs(px - cx) - (hx - rr), qy = Math.abs(py - cy) - (hy - rr);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
    };
  };
  // Elipse: f = |p/r| − 1 dividido pelo gradiente (aproximação de primeira ordem da distância).
  const dElip = (cx, cy, rx, ry) => (px, py) => {
    rx = Math.max(rx, 0.01); ry = Math.max(ry, 0.01);
    const u = (px - cx) / rx, v = (py - cy) / ry, f = Math.hypot(u, v);
    if (f < 1e-9) return -Math.min(rx, ry);
    const g = Math.hypot(u / rx, v / ry) / f;
    return (f - 1) / g;
  };
  // Segmento com espessura: ponta reta (butt, como o Pillow) ou redonda.
  const dSeg = (x1, y1, x2, y2, larg, redonda) => {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9, ux = dx / L, uy = dy / L;
    return (px, py) => {
      const t = (px - x1) * ux + (py - y1) * uy, n = Math.abs(-(px - x1) * uy + (py - y1) * ux);
      if (redonda) {
        const tc = Math.max(0, Math.min(L, t));
        return Math.hypot(px - (x1 + ux * tc), py - (y1 + uy * tc)) - larg / 2;
      }
      return Math.max(n - larg / 2, -t, t - L);
    };
  };
  const caixaSeg = (x1, y1, x2, y2, larg) => [Math.min(x1, x2) - larg, Math.min(y1, y2) - larg, Math.max(x1, x2) + larg, Math.max(y1, y2) + larg];

  spec.p.forEach(q => {
    const t = q[0];
    if (t === 'r') {
      const [, x, y, w, h, cor, red, borda, peso, alpha] = q;
      const x0 = x * k, y0 = y * k, x1 = (x + w) * k, y1 = (y + h) * k;
      const raio = red ? Math.min(w, h) * 0.1667 * k : 0;
      const a = alpha === undefined || alpha === null ? 1 : alpha;
      const fora = dRet(x0, y0, x1, y1, raio);
      if (cor) varrer(x0, y0, x1, y1, (px, py) => cobre(fora(px, py)), hex(cor), a);
      if (borda) {
        // contorno por dentro da caixa, como o outline do Pillow
        const e = Math.max(1, peso * k), dentro = dRet(x0 + e, y0 + e, x1 - e, y1 - e, Math.max(0, raio - e));
        varrer(x0, y0, x1, y1, (px, py) => Math.max(0, cobre(fora(px, py)) - cobre(dentro(px, py))), hex(borda), 1);
      }
    } else if (t === 'l') {
      const [, x1, y1, x2, y2, cor, peso, tracejada] = q;
      const larg = Math.max(1, peso * k), c = hex(cor);
      if (tracejada) {
        // o DASH do Slides: traço ~4× a espessura, vão ~3×
        const tr = 4 * peso, va = 3 * peso, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
        for (let s = 0; s < L; s += tr + va) {
          const e = Math.min(s + tr, L);
          const a1 = (x1 + dx * s / L) * k, b1 = (y1 + dy * s / L) * k, a2 = (x1 + dx * e / L) * k, b2 = (y1 + dy * e / L) * k;
          const d = dSeg(a1, b1, a2, b2, larg, false), bx = caixaSeg(a1, b1, a2, b2, larg);
          varrer(bx[0], bx[1], bx[2], bx[3], (px, py) => cobre(d(px, py)), c, 1);
        }
      } else {
        // ponta redonda nas linhas inclinadas: as linhas do gráfico emendam sem dente
        const redonda = peso >= 1 && x1 !== x2 && y1 !== y2;
        const d = dSeg(x1 * k, y1 * k, x2 * k, y2 * k, larg, redonda), bx = caixaSeg(x1 * k, y1 * k, x2 * k, y2 * k, larg);
        varrer(bx[0], bx[1], bx[2], bx[3], (px, py) => cobre(d(px, py)), c, 1);
      }
    } else if (t === 'e') {
      const [, x, y, w, h, fundo, borda, peso] = q;
      const cx = (x + w / 2) * k, cy = (y + h / 2) * k, rx = w / 2 * k, ry = h / 2 * k;
      const fora = dElip(cx, cy, rx, ry);
      if (fundo) varrer(cx - rx, cy - ry, cx + rx, cy + ry, (px, py) => cobre(fora(px, py)), hex(fundo), 1);
      if (borda) {
        const e = Math.max(1, peso * k), dentro = dElip(cx, cy, Math.max(0, rx - e), Math.max(0, ry - e));
        varrer(cx - rx, cy - ry, cx + rx, cy + ry, (px, py) => Math.max(0, cobre(fora(px, py)) - cobre(dentro(px, py))), hex(borda), 1);
      }
    }
  });

  // pré-multiplicado → RGBA comum
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = img[i * 4 + 3];
    if (a <= 0) continue;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(img[i * 4 + c] / a * 255)));
    out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  return { w: W, h: H, rgba: out };
}

const specs = JSON.parse(fs.readFileSync(manifesto, 'utf8'));
let novas = 0;
Object.keys(specs).sort().forEach(assin => {
  const destino = path.join(PASTA, 'GRAFICO - ' + assin + '.png');
  if (fs.existsSync(destino) && !todas) return;
  const spec = typeof specs[assin] === 'string' ? JSON.parse(specs[assin]) : specs[assin];
  const g = grafico(spec);
  pngGravar(destino, g.w, g.h, g.rgba);
  novas++;
  console.log('GRAFICO - ' + assin + '.png');
});
console.log(Object.keys(specs).length + ' especificações, ' + novas + ' desenhadas agora em ' + PASTA);
