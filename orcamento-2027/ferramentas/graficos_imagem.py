"""Formas pelo motor (07/10/2026): as formas do conteúdo de cada slide numa imagem só, logo acima da moldura.

Em todo slide com cabeçalho, o gerador não cria mais retângulos, linhas e bolinhas do conteúdo (fundos de tabela,
faixas, barras, linhas dos gráficos): anota cada um e procura "GRAFICO - <assinatura>.png" na pasta IMAGENS - SLIDES
(_orcFecharGrafico_, 00_Helpers.gs). Achou: a imagem atrás dos textos, logo acima da moldura. Não achou: as formas de
sempre, e a especificação vai para "GRAFICOS PENDENTES.json" na mesma pasta. A assinatura sai das próprias formas —
a imagem só muda quando algum número (ou o layout) muda.

Este script desenha cada especificação (PNG transparente, 1920×1080, com antialias e pontas redondas nas linhas
contínuas), lendo:
  ferramentas/saida/graficos.json                 (o manifesto do teste: PREVIA=ferramentas/saida node teste/...)
  IMAGENS - SLIDES/GRAFICOS PENDENTES.json         (o que a geração de verdade não achou na pasta)

Uso (de dentro de orcamento-2027; precisa de pillow):
  PREVIA=ferramentas/saida node teste/teste_orcamento.js
  python ferramentas/graficos_imagem.py            (desenha as que faltam na pasta)
  python ferramentas/graficos_imagem.py --todas    (redesenha todas)
Imagem velha sem uso pode ficar na pasta (ou ganhar o prefixo "PODE EXCLUIR - ").

Especificação (JSON, pt de um slide 720×405): {"v":1,"w":720,"h":405,"p":[...]} com
  ["r", x, y, w, h, cor, redondo, borda, peso, alpha]     retângulo (cor "" = sem fundo)
  ["l", x1, y1, x2, y2, cor, peso, tracejada]             linha
  ["e", x, y, w, h, fundo, borda, peso]                   elipse
"""
import json, os, sys
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, '..', '..', '..', 'IMAGENS - SLIDES'))
MANIFESTO = os.path.join(AQUI, 'saida', 'graficos.json')
PENDENTES = os.path.join(SAIDA, 'GRAFICOS PENDENTES.json')
LARG = 1920
SS = 2   # supersample


def rgba(c, a=1.0):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (round(255 * a),)


def desenhar(spec):
    k = LARG / spec['w'] * SS
    W, H = round(spec['w'] * k), round(spec['h'] * k)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im, 'RGBA')
    P = lambda x, y: (x * k, y * k)
    for q in spec['p']:
        t = q[0]
        if t == 'r':
            _, x, y, w, h, cor, red, borda, peso, alpha = q
            caixa = [P(x, y), P(x + w, y + h)]
            raio = min(w, h) * 0.1667 * k if red else 0
            larg = max(1, round(peso * k)) if borda else 0
            fill = rgba(cor, alpha) if cor else None
            out = rgba(borda) if borda else None
            if raio: d.rounded_rectangle(caixa, radius=raio, fill=fill, outline=out, width=larg)
            else: d.rectangle(caixa, fill=fill, outline=out, width=larg)
        elif t == 'l':
            _, x1, y1, x2, y2, cor, peso, tracejada = q
            larg = max(1, round(peso * k))
            c = rgba(cor)
            if tracejada:
                # o DASH do Slides: traço ~4× a espessura, vão ~3×
                tr, va = 4 * peso, 3 * peso
                dx, dy = x2 - x1, y2 - y1
                L = (dx * dx + dy * dy) ** .5 or 1
                s = 0
                while s < L:
                    e = min(s + tr, L)
                    d.line([P(x1 + dx * s / L, y1 + dy * s / L), P(x1 + dx * e / L, y1 + dy * e / L)], fill=c, width=larg)
                    s += tr + va
            else:
                d.line([P(x1, y1), P(x2, y2)], fill=c, width=larg)
                if peso >= 1 and (x1 != x2 and y1 != y2):   # ponta redonda: as linhas do gráfico emendam sem dente
                    r = larg / 2
                    for x, y in ((x1, y1), (x2, y2)):
                        cx, cy = P(x, y)
                        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
        elif t == 'e':
            _, x, y, w, h, fundo, borda, peso = q
            d.ellipse([P(x, y), P(x + w, y + h)], fill=rgba(fundo) if fundo else None,
                      outline=rgba(borda) if borda else None, width=max(1, round(peso * k)) if borda else 0)
    return im.resize((round(W / SS), round(H / SS)), Image.LANCZOS)


def main(args):
    specs = {}
    for arq in (MANIFESTO, PENDENTES):
        if os.path.exists(arq):
            specs.update(json.load(open(arq, encoding='utf-8')))
    novas = 0
    for assin, texto in sorted(specs.items()):
        destino = os.path.join(SAIDA, 'GRAFICO - %s.png' % assin)
        if os.path.exists(destino) and '--todas' not in args: continue
        desenhar(json.loads(texto)).save(destino, optimize=True)
        novas += 1
    print('%d especificações, %d desenhadas agora em %s' % (len(specs), novas, SAIDA))


if __name__ == '__main__':
    main(sys.argv[1:])
