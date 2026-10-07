"""Trilha de progresso do topo dos slides, como imagem (1920×32 px = 720×12 pt). Criado em 07/10/2026.

Mesmo desenho da trilha das sub capas (aprovado pelo Guilherme): filete fino, número e nome da seção. As seções até a
atual com a cor da marca (a atual com filete mais grosso e nome em negrito), as futuras em cinza — dá a noção de em
que altura da apresentação o slide está. Uma imagem por seção destacada e por marca:
  IMAGENS - SLIDES\\TRILHA - CAPITAL - 01.png … 08.png  e  TRILHA - DEMERCADO - 01.png … 08.png
O gerador (_orcTrilhaTopo_, 00_Helpers.gs) põe a imagem em (0, 0) com a largura do slide em todo slide com cabeçalho
dentro de uma seção. Fundo transparente: serve para qualquer fundo claro.

Uso (de dentro de orcamento-2027; precisa de pillow): python ferramentas/trilha_imagem.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, '..', '..', '..', 'IMAGENS - SLIDES'))
FONTES = os.path.join(AQUI, 'fontes')
W, H = 1920, 32
K = W / 720
# = ORC_SUBCAPAS (01_Config.gs), nomes curtos para caber
SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Manutenção', 'Segurança', 'Limpeza', 'Projetos', 'Custo por m²']
# = ORC_MARCAS (01_Config.gs): cor de destaque, cor do título, texto, apagado, filete
MARCAS = {
    'CAPITAL':   dict(light='#065CA9', dark='#151E49', body='#475569', muted='#94A3B8', linha='#E2E8F0'),
    'DEMERCADO': dict(light='#AF9800', dark='#00594F', body='#4B5250', muted='#9AA19F', linha='#E3E8E6'),
}


def fonte(fam, peso, pt):
    f = ImageFont.truetype(os.path.join(FONTES, {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]), round(pt * K))
    f.set_variation_by_name(peso)
    return f


def trilha(m, secao):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x0, larg = 30, (690 - 30) / len(SECOES)
    for i, nome in enumerate(SECOES):
        x, w = x0 + i * larg, larg - 6
        n = i + 1
        atual, passou = n == secao, n < secao
        if atual:
            d.rectangle([x * K, 2.2 * K, (x + w) * K, 3.6 * K], fill=m['light'])
        else:
            d.rectangle([x * K, 2.6 * K, (x + w) * K, 3.3 * K], fill=m['light'] if passou else m['linha'])
        d.text((x * K, 5 * K), '%02d' % n, font=fonte('M', 'Bold', 4.8), fill=m['light'] if (atual or passou) else m['muted'])
        d.text(((x + 9) * K, 5 * K), nome, font=fonte('O', 'Bold' if atual else 'Regular', 4.8),
               fill=m['dark'] if atual else (m['body'] if passou else m['muted']))
    return im


if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    for marca, m in MARCAS.items():
        for n in range(1, len(SECOES) + 1):
            trilha(m, n).save(os.path.join(SAIDA, 'TRILHA - %s - %02d.png' % (marca, n)), optimize=True)
        print('ok -> TRILHA - %s - 01…%02d.png' % (marca, len(SECOES)))
