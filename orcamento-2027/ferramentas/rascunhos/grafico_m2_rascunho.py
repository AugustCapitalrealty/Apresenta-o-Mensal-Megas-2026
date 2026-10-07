"""Rascunho (07/10/2026): gráfico do "Custo por m² mês a mês" redesenhado — antes × depois.

Só usa o que o gerador consegue desenhar com formas no Slides (linhas, círculos, retângulos, texto), para que o
aprovado aqui seja construível sem depender de imagem: grade leve com escala, rótulo direto no fim de cada linha
(sem legenda), marcadores com anel branco, faixa destacando out–dez e a frase que conta a história à esquerda.
Números: Mega Curitiba, do print do deck de Facilities.

Uso (de dentro de orcamento-2027): python ferramentas/rascunhos/grafico_m2_rascunho.py <print.png>
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, '..', 'fontes')
SAIDA = os.path.join(AQUI, 'grafico_m2_rascunho.png')

MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
REAL25 = [2.44, 2.87, 2.98, 2.89, 2.89, 2.63, 2.83, 2.94, 3.08, 2.76, 2.71, 3.53]
RIT26 = [2.40, 3.49, 3.43, 3.57, 3.02, 3.18, 3.36, 3.17, 2.98, 4.06, 4.39, 4.36]
ORC27 = [3.49, 3.51, 3.95, 3.83, 3.83, 4.01, 4.24, 3.74, 3.82, 4.18, 3.69, 3.32]
MEDIA = 3.80

# Demercado (ORC_MARCAS, 01_Config.gs)
DARK, GOLD, BODY, MUTED, LINHA = '#00594F', '#AF9800', '#4B5250', '#9AA19F', '#E3E8E6'
TINT, RED, BG = '#EEF5F3', '#B5524E', '#F8FAF9'

S = 3                      # supersample
K = 1920 / 720 * S         # px por pt
CW, CH = 660, 125          # card em pt (o mesmo espaço do slide atual)
X_JAN, PASSO = 97.9, 44.35 # colunas alinhadas com a tabela de baixo
Y0, Y1 = 20, 112           # faixa do desenho dentro do card
VMIN, VMAX = 2.25, 4.60


def fonte(fam, peso, pt):
    arq = {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]
    f = ImageFont.truetype(os.path.join(FONTES, arq), round(pt * K))
    f.set_variation_by_name(peso)
    return f


def px(x, y): return (x * K, y * K)
def X(i): return X_JAN + i * PASSO
def Y(v): return Y1 - (v - VMIN) / (VMAX - VMIN) * (Y1 - Y0)


def tracejado(d, pts, cor, larg, tam=4, vao=3):
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        dx, dy = xb - xa, yb - ya
        L = (dx * dx + dy * dy) ** .5
        t = 0
        while t < L:
            t2 = min(t + tam, L)
            d.line([px(xa + dx * t / L, ya + dy * t / L), px(xa + dx * t2 / L, ya + dy * t2 / L)], fill=cor, width=round(larg * K))
            t += tam + vao


def linha(d, vals, cor, larg):
    pts = [px(X(i), Y(v)) for i, v in enumerate(vals)]
    d.line(pts, fill=cor, width=round(larg * K), joint='curve')


def texto(d, x, y, s, f, cor, anc='la'):
    d.text(px(x, y), s, font=f, fill=cor, anchor=anc)


def br(v): return ('%.2f' % v).replace('.', ',')


def depois():
    im = Image.new('RGB', (round(CW * K), round(CH * K)), 'white')
    d = ImageDraw.Draw(im)

    # Faixa out–dez: onde a história está
    d.rectangle([px(X(9) - PASSO / 2, 6), px(X(11) + PASSO / 2, CH - 6)], fill=TINT)

    # Grade e escala
    for v in (2.5, 3.0, 3.5, 4.0, 4.5):
        d.line([px(X(0) - PASSO / 2, Y(v)), px(X(11) + PASSO / 2, Y(v))], fill=LINHA, width=round(.5 * K))
        texto(d, X(0) - PASSO / 2 + 1, Y(v) - 1, br(v), fonte('O', 'Regular', 4.8), MUTED, 'ld')

    # Média do Orç 2027
    tracejado(d, [(X(0) - PASSO / 2, Y(MEDIA)), (X(11) + PASSO / 2, Y(MEDIA))], GOLD, .6, 1.2, 1.6)

    # Séries: o contexto fino atrás, o Orç 2027 grosso na frente
    tracejado(d, [(X(i), Y(v)) for i, v in enumerate(REAL25)], MUTED, 1.1)
    linha(d, RIT26, RED, 1.4)
    linha(d, ORC27, GOLD, 2.4)
    r = 2.6
    for i, v in enumerate(ORC27):
        d.ellipse([px(X(i) - r, Y(v) - r), px(X(i) + r, Y(v) + r)], fill='white', outline=GOLD, width=round(1.3 * K))
        texto(d, X(i), Y(v) - 5, br(v), fonte('M', 'Bold', 5.8), DARK, 'md')
    r2 = 1.6
    d.ellipse([px(X(11) - r2, Y(RIT26[11]) - r2), px(X(11) + r2, Y(RIT26[11]) + r2)], fill=RED)

    # Rótulo direto no fim de cada linha (no lugar da legenda)
    xr = X(11) + PASSO / 2 + 4
    rot = [(ORC27[11] - .02, 'Orç 2027', GOLD), (REAL25[11] + .06, 'Real 2025', MUTED),
           (RIT26[11], 'Ritmo 2026', RED), (MEDIA + .02, 'média 3,80', GOLD)]
    for v, s, cor in rot:
        texto(d, xr, Y(v), s, fonte('O', 'Bold' if s != 'média 3,80' else 'SemiBold', 5.6), cor, 'lm')

    # A história, à esquerda (onde hoje fica vazio)
    texto(d, 10, 14, 'O FIM DE 2026', fonte('M', 'Bold', 5), GOLD)
    texto(d, 10, 22, 'já roda acima', fonte('O', 'Bold', 7), DARK)
    texto(d, 10, 31.5, 'do Orç 2027', fonte('O', 'Bold', 7), DARK)
    texto(d, 10, 47, 'Ritmo out–dez', fonte('O', 'Regular', 5.4), BODY)
    texto(d, 10, 54, 'R$ 4,27/m²', fonte('M', 'Bold', 8), RED)
    texto(d, 10, 70, 'Orç 2027 out–dez', fonte('O', 'Regular', 5.4), BODY)
    texto(d, 10, 77, 'R$ 3,73/m²', fonte('M', 'Bold', 8), GOLD)
    texto(d, 10, 94, 'a média do ano (3,80)', fonte('O', 'Regular', 5), MUTED)
    texto(d, 10, 100.5, 'fica abaixo do ritmo', fonte('O', 'Regular', 5), MUTED)
    texto(d, 10, 107, 'de saída de 2026', fonte('O', 'Regular', 5), MUTED)

    # Rótulo da faixa
    texto(d, (X(9) + X(11)) / 2, CH - 8, 'ritmo de saída de 2026', fonte('O', 'SemiBold', 5), DARK, 'md')
    return im.resize((round(CW * K / S), round(CH * K / S)), Image.LANCZOS)


def montar(antes_png):
    novo = depois()
    W = 1920
    a = Image.open(antes_png).convert('RGB').crop((70, 240, 1850, 590)) if antes_png else None
    titulo = ImageFont.truetype(os.path.join(FONTES, 'Montserrat[wght].ttf'), 34)
    titulo.set_variation_by_name('Bold')
    h = 60 + (a.height + 70 if a else 0) + novo.height + 60
    tela = Image.new('RGB', (W, h), BG)
    d = ImageDraw.Draw(tela)
    y = 20
    if a:
        d.text((40, y), 'ANTES', font=titulo, fill=MUTED)
        tela.paste(a, (70, y + 50)); y += a.height + 70
    d.text((40, y), 'DEPOIS (rascunho)', font=titulo, fill=DARK)
    tela.paste(novo, (80, y + 50))
    tela.save(SAIDA)
    print('ok ->', SAIDA)


if __name__ == '__main__':
    montar(sys.argv[1] if len(sys.argv) > 1 else None)
