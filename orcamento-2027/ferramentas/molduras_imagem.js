// Molduras dos slides (fundo + cabeçalho + cards com sombra) em PNG, SEM Python — o mesmo desenho de
// molduras_imagem.py (12/10/2026: o antivírus não deixa rodar Python). Lê um manifesto { assinatura: especificação }
// (o do teste com PREVIA, ou "MOLDURAS PENDENTES.json" que a geração grava na pasta de imagens) e grava
// "MOLDURA - <assinatura>.png" na pasta de imagens (só as que faltam; --todas refaz).
// Uso: node ferramentas/molduras_imagem.js <manifesto.json> [pasta de imagens] [--todas]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const args = process.argv.slice(2), todas = args.indexOf('--todas') >= 0;
const [manifesto, pastaArg] = args.filter(a => a !== '--todas');
const PASTA = pastaArg || path.resolve(__dirname, '..', '..', '..', 'IMAGENS - SLIDES');
const WPX = 1920, HPX = 1080, RAIO = 7, SOMBRA = [16, 32, 40, 30];

// ---------- PNG ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function pngGravar(arq, w, h, rgb) {
  const linhas = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { linhas[y * (w * 3 + 1)] = 0; rgb.copy(linhas, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([len, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(arq, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0))]));
}
// PNG RGBA/RGB 8 bits, sem entrelaçamento → { w, h, px: RGBA }.
function pngLer(arq) {
  const b = fs.readFileSync(arq);
  let p = 8, w = 0, h = 0, tipo = 0, prof = 0; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), t = b.toString('ascii', p + 4, p + 8), d = b.slice(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; tipo = d[9]; if (d[12]) throw new Error('PNG entrelaçado'); }
    if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (prof !== 8 || (tipo !== 6 && tipo !== 2)) throw new Error('PNG não suportado: tipo ' + tipo + ', ' + prof + ' bits');
  const bpp = tipo === 6 ? 4 : 3, cru = zlib.inflateSync(Buffer.concat(idat)), lin = w * bpp, out = Buffer.alloc(w * h * 4);
  let ant = Buffer.alloc(lin);
  for (let y = 0; y < h; y++) {
    const f = cru[y * (lin + 1)], l = Buffer.from(cru.slice(y * (lin + 1) + 1, (y + 1) * (lin + 1)));
    for (let i = 0; i < lin; i++) {
      const a = i >= bpp ? l[i - bpp] : 0, up = ant[i], c = i >= bpp ? ant[i - bpp] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      l[i] = (l[i] + [0, a, up, (a + up) >> 1, pr][f]) & 255;
    }
    for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) out[(y * w + x) * 4 + k] = k < bpp ? l[x * bpp + k] : 255;
    ant = l;
  }
  return { w: w, h: h, px: out };
}

// ---------- desenho ----------
const hex = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
// Cobertura (0..1) de um retângulo arredondado em cada pixel, com antialias (distância ao contorno).
function cobertura(x0, y0, x1, y1, r, f) {
  const xi = Math.max(0, Math.floor(x0) - 1), xf = Math.min(WPX - 1, Math.ceil(x1) + 1);
  const yi = Math.max(0, Math.floor(y0) - 1), yf = Math.min(HPX - 1, Math.ceil(y1) + 1);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, rr = Math.min(r, hx, hy);
  for (let y = yi; y <= yf; y++) for (let x = xi; x <= xf; x++) {
    const qx = Math.abs(x + 0.5 - cx) - (hx - rr), qy = Math.abs(y + 0.5 - cy) - (hy - rr);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
    const a = Math.max(0, Math.min(1, 0.5 - d));
    if (a > 0) f(y * WPX + x, a);
  }
}
function borrar(buf, sigma) {
  // Gauss ≈ três caixas (horizontal e vertical).
  const n = 3, wIdeal = Math.sqrt(12 * sigma * sigma / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  const raios = [0, 1, 2].map(i => ((i < m ? wl : wl + 2) - 1) / 2);
  const tmp = new Float32Array(buf.length);
  const caixa = (src, dst, r, horiz) => {
    const L = horiz ? WPX : HPX, N = horiz ? HPX : WPX, id = horiz ? (i, j) => i * WPX + j : (i, j) => j * WPX + i;
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = -r; j <= r; j++) s += src[id(i, Math.min(L - 1, Math.max(0, j)))];
      for (let j = 0; j < L; j++) {
        dst[id(i, j)] = s / (2 * r + 1);
        s += src[id(i, Math.min(L - 1, j + r + 1))] - src[id(i, Math.max(0, j - r))];
      }
    }
  };
  raios.forEach(r => { caixa(buf, tmp, r, true); caixa(tmp, buf, r, false); });
}

function moldura(spec, trilhas) {
  const k = WPX / spec.W, img = new Float32Array(WPX * HPX * 3), bg = hex(spec.bg);
  for (let i = 0; i < WPX * HPX; i++) { img[i * 3] = bg[0]; img[i * 3 + 1] = bg[1]; img[i * 3 + 2] = bg[2]; }
  const pintar = (i, cor, a) => { for (let c = 0; c < 3; c++) img[i * 3 + c] = img[i * 3 + c] * (1 - a) + cor[c] * a; };
  // sombra de todos os cards numa camada só
  const sombra = new Float32Array(WPX * HPX);
  spec.cards.forEach(([x, y, w, h]) => cobertura(x * k, (y + 2.2) * k, (x + w) * k, (y + h + 2.2) * k, RAIO * k,
    (i, a) => { sombra[i] = Math.max(sombra[i], a); }));
  borrar(sombra, 5 * k);
  for (let i = 0; i < sombra.length; i++) if (sombra[i] > 0.001) pintar(i, SOMBRA, sombra[i] * SOMBRA[3] / 255);
  spec.cards.forEach(([x, y, w, h, cor, borda, peso]) => {
    const r = RAIO * k;
    if (borda) {
      const e = Math.max(1, Math.round(peso * k));
      cobertura(x * k, y * k, (x + w) * k, (y + h) * k, r, (i, a) => pintar(i, hex(borda), a));
      cobertura(x * k + e, y * k + e, (x + w) * k - e, (y + h) * k - e, Math.max(0, r - e), (i, a) => pintar(i, hex(cor), a));
    } else cobertura(x * k, y * k, (x + w) * k, (y + h) * k, r, (i, a) => pintar(i, hex(cor), a));
  });
  if (spec.header) {
    const mx = 30;
    cobertura(mx * k, 16 * k, (mx + 5) * k, 52 * k, 0, (i, a) => pintar(i, hex(spec.cor), a));               // barra de destaque
    const lw = Math.max(1, Math.round(k));
    cobertura(mx * k, 64 * k - lw / 2, (spec.W - mx) * k, 64 * k + lw / 2, 0, (i, a) => pintar(i, hex(spec.linhas), a));
    if (spec.secao) {
      const t = trilhas(spec.marca, spec.secao);
      if (!t) throw new Error('falta TRILHA - ' + spec.marca + ' - ' + ('0' + spec.secao).slice(-2) + '.png');
      const th = Math.round(WPX * t.h / t.w);
      for (let y = 0; y < th; y++) for (let x = 0; x < WPX; x++) {
        const sx = Math.min(t.w - 1, Math.floor(x * t.w / WPX)), sy = Math.min(t.h - 1, Math.floor(y * t.h / th)), p = (sy * t.w + sx) * 4;
        pintar(y * WPX + x, [t.px[p], t.px[p + 1], t.px[p + 2]], t.px[p + 3] / 255);
      }
    }
  }
  const rgb = Buffer.alloc(WPX * HPX * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = Math.max(0, Math.min(255, Math.round(img[i])));
  return rgb;
}

const specs = JSON.parse(fs.readFileSync(manifesto, 'utf8'));
const cache = {};
const trilhas = (marca, secao) => {
  const n = 'TRILHA - ' + marca + ' - ' + ('0' + secao).slice(-2) + '.png';
  if (!(n in cache)) cache[n] = fs.existsSync(path.join(PASTA, n)) ? pngLer(path.join(PASTA, n)) : null;
  return cache[n];
};
let novas = 0;
Object.keys(specs).sort().forEach(assin => {
  const destino = path.join(PASTA, 'MOLDURA - ' + assin + '.png');
  if (fs.existsSync(destino) && !todas) return;
  const spec = typeof specs[assin] === 'string' ? JSON.parse(specs[assin]) : specs[assin];
  pngGravar(destino, WPX, HPX, moldura(spec, trilhas));
  novas++;
  console.log('MOLDURA - ' + assin + '.png');
});
console.log(Object.keys(specs).length + ' molduras no manifesto, ' + novas + ' desenhadas agora em ' + PASTA);
