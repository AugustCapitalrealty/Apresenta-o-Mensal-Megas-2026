"""Efeitos de imagem para o deck do orçamento: o que o Google Slides não faz sozinho. Criado em 07/10/2026.

O Apps Script só insere imagem pronta (sem filtro, sem sombra configurável, sem rasgo). Quando um slide pede foto em
P&B com retícula, borda rasgada ou um carimbo de verdade, a imagem é gerada aqui, sobe para o Drive e o gerador insere
pelo ID. Técnicas trazidas da produção de capas de vídeo (ver ../IDEIAS-DESIGN.md).

Uso (precisa de `python -m pip install pillow numpy`; o Deep Freeze apaga a instalação no reinício):
  python efeitos_imagem.py foto    <entrada.jpg> <saida.png> [--cor #151E49] [--papel #F8FAFC] [--celula 7] [--rasgado] [--largura 1600]
  python efeitos_imagem.py carimbo "PENDENTE" <saida.png> [--cor #B91C1C] [--angulo -6]
  python efeitos_imagem.py folha   <pasta_com_png> <saida.jpg> [--colunas 5]
  python efeitos_imagem.py miniatura <slide.png> <saida.png>
  python efeitos_imagem.py caneta  circulo|seta|sublinhado <saida.png> [--cor #EF4444] [--largura 600] [--altura 200]

- foto:      foto em retícula (pontos) na cor da marca sobre papel claro; --rasgado recorta com borda de papel rasgado.
- carimbo:   carimbo de borracha (moldura dupla, letra de máquina, tinta falhada, levemente girado), PNG transparente.
- folha:     folha de contato com todos os PNG de uma pasta (ex.: os de exportarSlidesCuritiba()), numerados, para
             conferir o deck inteiro de uma vez: hierarquia, consistência entre slides, o que destoa.
- caneta:    traço de caneta feito à mão, PNG transparente, para pôr por cima do número que importa: círculo que não
             fecha certinho, seta curva com ponta em V, sublinhado. Um por slide (se tudo é destaque, nada é).
- miniatura: o slide em tamanho de tela, em miniatura da grade do Slides (240 px) e em 160 px: se a mensagem não
             sobrevive à redução, o slide tem destaque demais ou letra pequena demais.
"""
import argparse, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

FONTES = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')


def fonte(nome, tam):
    try:
        return ImageFont.truetype(os.path.join(FONTES, nome), tam)
    except OSError:
        return ImageFont.load_default()


def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------- texturas ----------
def ruido(w, h, escala, rng):
    a = rng.random((max(2, h // escala), max(2, w // escala))) * 255
    return np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255 - 0.5


def papel(w, h, base, seed=1, fibra=6):
    """Papel liso com fibra fina e variação suave de tom (fica atrás da retícula)."""
    rng = np.random.default_rng(seed)
    v = ruido(w, h, 2, rng) * fibra + ruido(w, h, 90, rng) * 7
    arr = np.clip(np.array(hexrgb(base), np.float32)[None, None, :] + v[..., None], 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


# ---------- retícula ----------
def meio_tom(im, celula, ang=45, gama=.7):
    """Retícula: pontos pretos em fundo branco (L). gama < 1 clareia, como jornal."""
    g = np.asarray(ImageOps.autocontrast(im.convert('L'), cutoff=1), dtype=np.float32) / 255
    g = np.clip(g, 0, 1) ** gama
    h, w = g.shape
    out = Image.new('L', (w, h), 255); d = ImageDraw.Draw(out)
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang)); n = int(max(w, h) / celula * 1.5) + 2
    cx, cy = w / 2, h / 2
    for i in range(-n, n):
        for j in range(-n, n):
            x = cx + (i * c - j * s) * celula; y = cy + (i * s + j * c) * celula
            xi, yi = int(x), int(y)
            if 0 <= xi < w and 0 <= yi < h:
                r = celula * .55 * math.sqrt(1 - g[yi, xi])
                if r > .35: d.ellipse([x - r, y - r, x + r, y + r], fill=0)
    return out


def foto_reticula(caminho, cor='#151E49', fundo='#F8FAFC', celula=7, largura=1600, seed=1):
    """Foto (caminho ou imagem PIL) -> pontos na cor da marca sobre papel. Desenha em 2x e reduz (pontos sem serrilhado)."""
    im = (caminho if isinstance(caminho, Image.Image) else Image.open(caminho)).convert('RGB')
    f = largura * 2 / im.width
    im = im.resize((largura * 2, int(im.height * f)), Image.LANCZOS)
    ht = meio_tom(im, celula * 2)
    base = papel(*im.size, fundo, seed).convert('RGB')
    tinta = Image.new('RGB', im.size, hexrgb(cor))
    out = Image.composite(base, tinta, ht)
    return out.resize((largura, out.height // 2), Image.LANCZOS)


# ---------- recorte e sombra ----------
def borda_rasgada(tam, recuo, amp, seed):
    """Contorno de papel rasgado (lista de pontos) dentro de um retângulo."""
    rng = np.random.default_rng(seed + 7); w, h = tam; pts = []

    def lado(a, b, n):
        v = np.cumsum(rng.normal(0, amp * .45, n)); v -= np.linspace(v[0], v[-1], n); v = np.clip(v, -amp, amp)
        for t, o in zip(np.linspace(0, 1, n, endpoint=False), v):
            x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
            nx, ny = (b[1] - a[1]), -(b[0] - a[0]); L = math.hypot(nx, ny); pts.append((x + nx / L * o, y + ny / L * o))
    r = recuo; cs = [(r, r), (w - r, r), (w - r, h - r), (r, h - r)]
    for i in range(4):
        a, b = cs[i], cs[(i + 1) % 4]; lado(a, b, max(8, int(math.dist(a, b) / 6)))
    return pts


def rasgar(im, amp=9, seed=1):
    """Recorta a imagem com borda de papel rasgado (RGBA)."""
    out = im.convert('RGBA')
    mk = Image.new('L', out.size, 0)
    ImageDraw.Draw(mk).polygon(borda_rasgada(out.size, amp + 4, amp, seed), fill=255)
    out.putalpha(mk)
    return out


def com_sombra(peca, dx=10, dy=12, opacidade=.32, desfoque=12):
    """Devolve a peça RGBA com sombra suave embutida (o Slides não deixa configurar sombra pelo Apps Script)."""
    m = desfoque * 2 + max(dx, dy)
    tela = Image.new('RGBA', (peca.width + 2 * m, peca.height + 2 * m), (0, 0, 0, 0))
    a = peca.split()[3]
    sombra = Image.new('RGBA', peca.size, (15, 23, 42, 0))
    sombra.putalpha(a.point(lambda p: int(p * opacidade)).filter(ImageFilter.GaussianBlur(desfoque)))
    tela.alpha_composite(sombra, (m + dx, m + dy)); tela.alpha_composite(peca, (m, m))
    return tela


# ---------- carimbo ----------
def carimbo(texto, cor='#B91C1C', angulo=-6, tam=120, seed=3):
    """Carimbo de borracha: moldura dupla, letra de máquina (Courier New Bold), tinta falhada, girado."""
    f = fonte('courbd.ttf', tam)
    l, t, r, b = f.getbbox(texto); w, h = r - l + 90, b - t + 70
    lay = Image.new('L', (w, h), 0); d = ImageDraw.Draw(lay)
    d.rectangle([5, 5, w - 6, h - 6], outline=255, width=9); d.rectangle([20, 20, w - 21, h - 21], outline=255, width=4)
    d.text((45 - l, 35 - t), texto, font=f, fill=255)
    rng = np.random.default_rng(seed)
    falha = Image.fromarray((rng.random((h // 3 + 1, w // 3 + 1)) > .25).astype(np.uint8) * 255).resize((w, h), Image.NEAREST)
    lay = Image.composite(lay, Image.new('L', (w, h), 0), falha).point(lambda p: int(p * .9))
    out = Image.new('RGBA', (w, h), hexrgb(cor) + (0,)); out.putalpha(lay)
    return out.rotate(angulo, Image.BICUBIC, expand=True)


# ---------- caneta (anotação à mão) ----------
def _traco(d, pts, cor, larg):
    d.line(pts, fill=cor, width=larg, joint='curve')
    r = larg / 2
    for x, y in (pts[0], pts[-1]): d.ellipse([x - r, y - r, x + r, y + r], fill=cor)


def caneta(tipo, largura=600, altura=200, cor='#EF4444', espessura=None, seed=2):
    """Traço à mão em 2x e reduzido. circulo: elipse que passa do ponto de partida; seta: curva com ponta em V;
    sublinhado: linha levemente torta que sobe no fim."""
    rng = np.random.default_rng(seed); S = 2
    w, h = largura * S, altura * S; larg = int((espessura or max(4, altura // 28)) * S)
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); c = hexrgb(cor) + (255,)
    m = larg * 2
    if tipo == 'circulo':
        cx, cy, rx, ry = w / 2, h / 2, w / 2 - m, h / 2 - m
        t0 = rng.uniform(.6, 1.2) * math.pi; voltas = 1.12
        ts = np.linspace(t0, t0 + voltas * 2 * math.pi, 160)
        drift = np.linspace(0, 1, len(ts))
        pts = [(cx + rx * (1 - .06 * k) * math.cos(t), cy + ry * (1 + .05 * k) * math.sin(t) - k * ry * .08)
               for t, k in zip(ts, drift)]
        _traco(d, pts, c, larg)
    elif tipo == 'seta':
        a, b = (m, h - m), (w - m * 2, m * 2)
        mx, my = (a[0] + b[0]) / 2, min(a[1], b[1]) + (h - 2 * m) * .05
        pts = [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mx + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * my + t * t * b[1])
               for t in np.linspace(0, 1, 40)]
        _traco(d, pts, c, larg)
        ang = math.atan2(b[1] - pts[-5][1], b[0] - pts[-5][0]); ponta = min(w, h) * .22
        for sg in (-1, 1):
            _traco(d, [b, (b[0] - ponta * math.cos(ang + sg * .55), b[1] - ponta * math.sin(ang + sg * .55))], c, larg)
    else:  # sublinhado
        xs = np.linspace(m, w - m, 50)
        pts = [(x, h / 2 + math.sin(x / w * math.pi * 1.3) * h * .08 - (x / w) ** 3 * h * .18) for x in xs]
        _traco(d, pts, c, larg)
    return lay.resize((largura, altura), Image.LANCZOS)


# ---------- revisão ----------
def opaca(caminho, fundo='#FFFFFF'):
    """Abre a imagem sem transparência (o fundo transparente vira branco, não preto)."""
    im = Image.open(caminho).convert('RGBA')
    base = Image.new('RGBA', im.size, fundo); base.alpha_composite(im)
    return base.convert('RGB')


def folha_contato(pasta, colunas=5, largura=360):
    """Todos os PNG/JPG da pasta numa grade numerada (ordem alfabética = ordem dos slides exportados)."""
    arqs = sorted(a for a in os.listdir(pasta) if a.lower().endswith(('.png', '.jpg', '.jpeg')))
    if not arqs: raise SystemExit('Nenhuma imagem em ' + pasta)
    ims = [opaca(os.path.join(pasta, a)) for a in arqs]
    # Célula na proporção mais alta do lote (até 1,5): cada imagem cabe inteira, sem deformar.
    alt = int(largura * min(1.5, max(im.height / im.width for im in ims)))
    gap, rot = 16, 22
    linhas = math.ceil(len(ims) / colunas)
    tela = Image.new('RGB', (gap + colunas * (largura + gap), gap + linhas * (alt + rot + gap)), '#E2E8F0')
    d = ImageDraw.Draw(tela); fr = fonte('arialbd.ttf', 14)
    for k, (a, im) in enumerate(zip(arqs, ims)):
        x = gap + (k % colunas) * (largura + gap); y = gap + (k // colunas) * (alt + rot + gap)
        d.text((x, y), f'{k + 1:02d}  {os.path.splitext(a)[0][:38]}', font=fr, fill='#151E49')
        f = min(largura / im.width, alt / im.height)
        r = im.resize((max(1, int(im.width * f)), max(1, int(im.height * f))), Image.LANCZOS)
        tela.paste(r, (x + (largura - r.width) // 2, y + rot + (alt - r.height) // 2))
    return tela


def miniaturas(caminho):
    """O slide em 3 tamanhos: tela (960), grade do Slides (240) e mínimo (160)."""
    im = opaca(caminho)
    tams = [960, 240, 160]
    alts = [int(t * im.height / im.width) for t in tams]
    tela = Image.new('RGB', (sum(tams) + 80, max(alts) + 50), '#0F172A')
    d = ImageDraw.Draw(tela); fr = fonte('arial.ttf', 14); x = 20
    for t, a in zip(tams, alts):
        tela.paste(im.resize((t, a), Image.LANCZOS), (x, 20)); d.text((x, 26 + a), f'{t} px', font=fr, fill='#94A3B8'); x += t + 20
    return tela


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('foto'); a.add_argument('entrada'); a.add_argument('saida')
    a.add_argument('--cor', default='#151E49'); a.add_argument('--papel', default='#F8FAFC')
    a.add_argument('--celula', type=int, default=7); a.add_argument('--largura', type=int, default=1600)
    a.add_argument('--rasgado', action='store_true')
    a = sub.add_parser('carimbo'); a.add_argument('texto'); a.add_argument('saida')
    a.add_argument('--cor', default='#B91C1C'); a.add_argument('--angulo', type=float, default=-6)
    a = sub.add_parser('folha'); a.add_argument('pasta'); a.add_argument('saida'); a.add_argument('--colunas', type=int, default=5)
    a = sub.add_parser('miniatura'); a.add_argument('entrada'); a.add_argument('saida')
    a = sub.add_parser('caneta'); a.add_argument('tipo', choices=['circulo', 'seta', 'sublinhado']); a.add_argument('saida')
    a.add_argument('--cor', default='#EF4444'); a.add_argument('--largura', type=int, default=600)
    a.add_argument('--altura', type=int, default=200)
    o = p.parse_args()

    if o.cmd == 'foto':
        im = foto_reticula(o.entrada, o.cor, o.papel, o.celula, o.largura)
        if o.rasgado: im = com_sombra(rasgar(im))
        im.save(o.saida)
    elif o.cmd == 'carimbo':
        carimbo(o.texto, o.cor, o.angulo).save(o.saida)
    elif o.cmd == 'caneta':
        caneta(o.tipo, o.largura, o.altura, o.cor).save(o.saida)
    elif o.cmd == 'folha':
        folha_contato(o.pasta, o.colunas).save(o.saida, quality=90)
    else:
        miniaturas(o.entrada).save(o.saida)
    print('ok ->', o.saida)


if __name__ == '__main__':
    sys.exit(main())
