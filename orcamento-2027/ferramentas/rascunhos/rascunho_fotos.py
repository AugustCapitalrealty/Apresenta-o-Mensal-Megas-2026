"""Rascunho: 3 moldes de slide de fotos (1, 2 e 3 fotos) para o gestor preencher. Marca Capital Realty."""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SAIDA = sys.argv[1]
FON = os.path.join(os.environ['WINDIR'], 'Fonts')
W, H = 1920, 1080
K = W / 720
NAVY, LIGHT, AZUL, TXT, MUTED, LINHA, BG = '#151E49', '#065CA9', '#60A5FA', '#475569', '#94A3B8', '#E2E8F0', '#F8FAFC'
F = lambda pt, b=False: ImageFont.truetype(os.path.join(FON, 'segoeuib.ttf' if b else 'segoeui.ttf'), int(pt * K))
P = lambda *v: [x * K for x in v]


def base(titulo, sub):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle(P(30, 16, 35, 52), fill=LIGHT)
    d.text(P(44, 12), titulo, font=F(19, True), fill=NAVY)
    d.text(P(44, 38), sub, font=F(9.5), fill=TXT)
    d.line(P(30, 64, 690, 64), fill=LINHA, width=3)
    d.text(P(30, 386), 'Fotos e textos preenchidos pelo gestor · Mega Itajaí', font=F(7), fill=MUTED)
    d.text(P(690, 386), 'RASCUNHO', font=F(7, True), fill='#A85450', anchor='ra')
    return im


def card(im, x, y, w, h):
    sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle(P(x, y + 2.2, x + w, y + h + 2.2), radius=7 * K, fill=(16, 32, 40, 30))
    im.paste(sombra.filter(ImageFilter.GaussianBlur(5 * K)), (0, 0), sombra.filter(ImageFilter.GaussianBlur(5 * K)))
    ImageDraw.Draw(im).rounded_rectangle(P(x, y, x + w, y + h), radius=7 * K, fill='white', outline=LINHA, width=2)


def foto(d, x, y, w, h, n):
    d.rectangle(P(x, y, x + w, y + h), fill='#E8EEF5')
    for i in range(0, int((w + h) * 2), 8):           # borda tracejada
        pass
    for xx in range(int(x), int(x + w), 6):
        d.line(P(xx, y, min(xx + 3, x + w), y), fill=MUTED, width=2); d.line(P(xx, y + h, min(xx + 3, x + w), y + h), fill=MUTED, width=2)
    for yy in range(int(y), int(y + h), 6):
        d.line(P(x, yy, x, min(yy + 3, y + h)), fill=MUTED, width=2); d.line(P(x + w, yy, x + w, min(yy + 3, y + h)), fill=MUTED, width=2)
    cx, cy = x + w / 2, y + h / 2
    d.rounded_rectangle(P(cx - 14, cy - 18, cx + 14, cy + 2), radius=3 * K, outline=MUTED, width=4)
    d.ellipse(P(cx - 5, cy - 13, cx + 5, cy - 3), outline=MUTED, width=4)
    d.text(P(cx, cy + 8), 'FOTO %d' % n, font=F(8, True), fill=TXT, anchor='ma')
    d.text(P(cx, cy + 19), 'clique com o botão direito → Substituir imagem', font=F(6.5), fill=MUTED, anchor='ma')


def legenda(d, x, y, w, texto='Legenda da foto: o que é, onde fica, quando.'):
    d.text(P(x, y), texto, font=F(7.5), fill=TXT)


def descricao(d, x, y, w, h, titulo='O QUE MOSTRAR'):
    d.text(P(x, y), titulo, font=F(7.5, True), fill=TXT)
    texto = ['Escreva aqui a descrição: o que as fotos mostram e por que', 'isso importa para o orçamento (ex.: estado atual da cobertura,',
             'obra prevista, comparação antes × depois).']
    for i, t in enumerate(texto): d.text(P(x, y + 16 + i * 12), t, font=F(8), fill=TXT)


def molde1():
    im = base('Registro fotográfico — Título do assunto', 'Subtítulo: conta, local ou obra · Mega Itajaí')
    card(im, 30, 74, 660, 300); d = ImageDraw.Draw(im)
    foto(d, 40, 84, 400, 280, 1)
    d.line(P(456, 92, 456, 356), fill=LINHA, width=2)
    descricao(d, 470, 92, 210, 0)
    for i, (k, v) in enumerate([('Conta', 'Manutenção de imóveis'), ('Local', 'Armazém 1, cobertura'), ('Valor no Orç 2027', 'R$ —')]):
        d.text(P(470, 170 + i * 30), k.upper(), font=F(6.5, True), fill=MUTED)
        d.text(P(470, 180 + i * 30), v, font=F(9, True), fill=NAVY)
    legenda(d, 470, 340, 210, 'Legenda: data e local da foto.')
    return im


def molde2():
    im = base('Registro fotográfico — Título do assunto', 'Subtítulo: conta, local ou obra · Mega Itajaí')
    card(im, 30, 74, 660, 300); d = ImageDraw.Draw(im)
    for i in range(2):
        x = 40 + i * 325
        foto(d, x, 84, 315, 200, i + 1)
        legenda(d, x, 290, 315)
    d.line(P(40, 308, 680, 308), fill=LINHA, width=2)
    descricao(d, 40, 316, 640, 50, 'DESCRIÇÃO')
    return im


def molde3():
    im = base('Registro fotográfico — Título do assunto', 'Subtítulo: conta, local ou obra · Mega Itajaí')
    card(im, 30, 74, 660, 300); d = ImageDraw.Draw(im)
    for i in range(3):
        x = 40 + i * 216.7
        foto(d, x, 84, 206.7, 190, i + 1)
        legenda(d, x, 280, 206, 'Legenda da foto %d.' % (i + 1))
    d.line(P(40, 308, 680, 308), fill=LINHA, width=2)
    descricao(d, 40, 316, 640, 50, 'DESCRIÇÃO')
    return im


for n, f in [(1, molde1), (2, molde2), (3, molde3)]:
    p = os.path.join(SAIDA, 'RASCUNHO - SLIDES DE FOTOS - MOLDE %d FOTO%s.png' % (n, '' if n == 1 else 'S'))
    f().save(p); print('ok', p)
