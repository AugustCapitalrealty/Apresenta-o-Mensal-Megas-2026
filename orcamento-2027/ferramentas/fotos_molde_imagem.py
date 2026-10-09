"""Imagens de exemplo dos espaços de foto dos moldes do Registro fotográfico (26_Fotos.gs). Criado em 09/10/2026.

O gestor clica com o botão direito na imagem → Substituir imagem: a foto dele entra no tamanho e na posição do espaço.
Uma imagem por espaço, na proporção exata dele (pt de uma página 720×405, medidas de gerarSlideFotos_); mudou o
layout lá, mude aqui. Cinza neutro: serve às duas marcas.

Uso (de dentro de orcamento-2027; precisa de pillow):  python ferramentas/fotos_molde_imagem.py
Saída: APRESENTAÇÃO ORÇAMENTO\\IMAGENS - SLIDES\\FOTO - MOLDE <m> - <n>.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, '..', '..', '..', 'IMAGENS - SLIDES'))
FON = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')
K = 4                                             # px por pt
FUNDO, TRACO, TEXTO = '#E8EEF5', '#94A3B8', '#475569'
# molde → (largura, altura) em pt de cada espaço = gerarSlideFotos_ (card 660 − 20 de margem, 10 entre as fotos)
MOLDES = {1: (400, 280), 2: ((640 - 10) / 2, 200), 3: ((640 - 20) / 3, 190)}


def espaco(w, h, n):
    W, H = int(w * K), int(h * K)
    im = Image.new('RGB', (W, H), FUNDO)
    d = ImageDraw.Draw(im)
    t, e = 6, 3                                   # traço e espaço (px) da borda tracejada, em pt * K
    for x in range(0, W, (t + e) * 2):
        d.line([(x, 1), (min(x + t * 2, W), 1)], fill=TRACO, width=4); d.line([(x, H - 2), (min(x + t * 2, W), H - 2)], fill=TRACO, width=4)
    for y in range(0, H, (t + e) * 2):
        d.line([(1, y), (1, min(y + t * 2, H))], fill=TRACO, width=4); d.line([(W - 2, y), (W - 2, min(y + t * 2, H))], fill=TRACO, width=4)
    cx, cy = W / 2, H / 2
    d.rounded_rectangle([cx - 14 * K, cy - 22 * K, cx + 14 * K, cy - 2 * K], radius=3 * K, outline=TRACO, width=int(1.4 * K))
    d.ellipse([cx - 5 * K, cy - 17 * K, cx + 5 * K, cy - 7 * K], outline=TRACO, width=int(1.4 * K))
    f1 = ImageFont.truetype(os.path.join(FON, 'segoeuib.ttf'), int(9 * K))
    f2 = ImageFont.truetype(os.path.join(FON, 'segoeui.ttf'), int(6.5 * K))
    d.text((cx, cy + 4 * K), 'FOTO %d' % n, font=f1, fill=TEXTO, anchor='ma')
    d.text((cx, cy + 17 * K), 'botão direito → Substituir imagem', font=f2, fill=TRACO, anchor='ma')
    return im


def main():
    for m, (w, h) in MOLDES.items():
        for n in range(1, m + 1):
            destino = os.path.join(SAIDA, 'FOTO - MOLDE %d - %d.png' % (m, n))
            espaco(w, h, n).save(destino, optimize=True)
            print('ok ->', os.path.basename(destino), '(%d x %d px)' % (int(w * K), int(h * K)))


if __name__ == '__main__':
    main()
