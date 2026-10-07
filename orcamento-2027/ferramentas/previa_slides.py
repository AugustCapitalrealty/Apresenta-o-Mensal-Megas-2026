"""Prévia aproximada dos slides sem abrir o Google Slides. Criado em 07/10/2026.

O teste grava, com PREVIA=<pasta>, as formas de cada slide que o gerador manda o Slides criar (posição, cor, texto,
tamanho da fonte). Este script desenha essas formas num PNG: serve para conferir layout — sobreposição, alinhamento,
hierarquia — quando a apresentação de verdade não está à mão. Não é o Slides: a fonte é a Segoe UI, as fotos viram um
bloco cinza com "FOTO" e o texto quebra linha por estimativa.

Uso (de dentro de orcamento-2027; precisa de pillow):
  set PREVIA=ferramentas\\saida&& node teste\\teste_orcamento.js          (Windows; no Bash: PREVIA=ferramentas/saida node ...)
  python ferramentas/previa_slides.py ferramentas/saida/formas_curitiba.json 0 1 3 12     (índices dos slides, base 0)
Saída: ferramentas/saida/previa_<cidade>_<índice>.png
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

FON = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')
LARG = 1280
RECUO = 7   # pt: recuo interno da caixa de texto do Slides


def fonte(pt, negrito, k):
    return ImageFont.truetype(os.path.join(FON, 'segoeuib.ttf' if negrito else 'segoeui.ttf'), max(6, int(pt * k)))


def rgba(c, a=1):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (int(255 * a),)


def quebra(d, texto, f, larg):
    linhas = []
    for par in texto.split('\n'):
        atual = ''
        for p in par.split(' '):
            t = (atual + ' ' + p).strip()
            if d.textlength(t, font=f) <= larg or not atual: atual = t
            else: linhas.append(atual); atual = p
        linhas.append(atual)
    return linhas


def desenha(dados, i, destino):
    k = LARG / dados['W']
    sl = dados['slides'][i]
    img = Image.new('RGBA', (LARG, int(dados['H'] * k)), rgba(sl.get('fundo') or '#FFFFFF'))
    for f in sl['formas']:
        x, y, w, h = f['x'] * k, f['y'] * k, f['w'] * k, f['h'] * k
        camada = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(camada)
        tipo = f.get('tipo')
        if tipo == 'IMAGE':
            d.rectangle([x, y, x + w, y + h], fill=(203, 213, 225, 255)); d.text((x + 8, y + 8), 'FOTO', font=fonte(10, True, k), fill=(100, 116, 139, 255))
        elif tipo == 'LINE':
            d.line([x, y, x + w, y + h], fill=(203, 213, 225, 255), width=max(1, int(k)))
        elif f.get('texto'):
            if f.get('cor'): d.rectangle([x, y, x + w, y + h], fill=rgba(f['cor'], f.get('alpha', 1)))
            ft = fonte(f.get('fs', 10), f.get('negrito'), k)
            linhas = quebra(d, f['texto'], ft, max(10, w - 2 * RECUO * k))
            alt = ft.size * 1.25 * len(linhas)
            ty = y + (h - alt) / 2 if len(linhas) == 1 else y + RECUO * k * 0.5
            for n, l in enumerate(linhas):
                d.text((x + RECUO * k, ty + n * ft.size * 1.25), l, font=ft, fill=rgba(f.get('corTexto') or '#151E49'))
        elif f.get('cor'):
            forma = d.ellipse if tipo == 'ELLIPSE' else d.rectangle
            forma([x, y, x + w, y + h], fill=rgba(f['cor'], f.get('alpha', 1)))
        img = Image.alpha_composite(img, camada)
    img.convert('RGB').save(destino)


if __name__ == '__main__':
    arq = sys.argv[1]
    dados = json.load(open(arq, encoding='utf-8'))
    cidade = os.path.splitext(os.path.basename(arq))[0].replace('formas_', '')
    for i in [int(a) for a in sys.argv[2:]] or range(len(dados['slides'])):
        destino = os.path.join(os.path.dirname(arq), f'previa_{cidade}_{i:02d}.png')
        desenha(dados, i, destino); print('ok ->', destino)
