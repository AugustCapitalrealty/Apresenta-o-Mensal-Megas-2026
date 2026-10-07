"""Molduras dos slides em imagem (v2, 07/10/2026): o fundo de cada slide numa imagem só.

O gerador não desenha mais, em formas, os cards (arredondados, brancos ou escuros, de 60×30 pt para cima) nem o fundo
do cabeçalho (barra de destaque, trilha de progresso, linha): anota o que o slide teria e procura
"MOLDURA - <assinatura>.png" na pasta IMAGENS - SLIDES (_orcFecharMoldura_, 00_Helpers.gs). Achou: uma imagem no
fundo, atrás do conteúdo. Não achou: as formas de sempre. O teste grava, com PREVIA=, o manifesto de todas as
molduras que os três Megas usam (ferramentas/saida/molduras.json: assinatura → especificação); este script desenha
cada uma, com o que o Slides não faz bem: sombra suave nos cards, cantos uniformes.

Uso (de dentro de orcamento-2027; precisa de pillow):
  PREVIA=ferramentas/saida node teste/teste_orcamento.js      (grava o manifesto)
  python ferramentas/molduras_imagem.py                         (desenha as que faltam na pasta)
  python ferramentas/molduras_imagem.py --todas                 (redesenha todas)
Mudou layout, cor ou trilha? A assinatura muda sozinha: rode os dois comandos de novo e gere a cidade. Moldura velha
sem uso pode ficar na pasta (ou ganhar o prefixo "PODE EXCLUIR - ").
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import trilha_imagem   # noqa: E402  (o mesmo desenho da trilha aprovada)

SAIDA = trilha_imagem.SAIDA
MANIFESTO = os.path.join(AQUI, 'saida', 'molduras.json')
W, H = 1920, 1080
RAIO = 7          # pt: canto dos cards
SOMBRA = (16, 32, 40, 30)


def moldura(spec):
    k = W / spec['W']
    im = Image.new('RGBA', (W, H), spec['bg'])
    # sombra suave de todos os cards numa camada só
    sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sombra)
    for x, y, w, h, cor, borda, peso in spec['cards']:
        ds.rounded_rectangle([x * k, (y + 2.2) * k, (x + w) * k, (y + h + 2.2) * k], radius=int(RAIO * k), fill=SOMBRA)
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(5 * k)))
    d = ImageDraw.Draw(im)
    for x, y, w, h, cor, borda, peso in spec['cards']:
        caixa = [x * k, y * k, (x + w) * k, (y + h) * k]
        if borda: d.rounded_rectangle(caixa, radius=int(RAIO * k), fill=cor, outline=borda, width=max(1, round(peso * k)))
        else: d.rounded_rectangle(caixa, radius=int(RAIO * k), fill=cor)
    if spec['header']:
        mx = 30
        d.rectangle([mx * k, 16 * k, (mx + 5) * k, 52 * k], fill=spec['cor'])                    # barra de destaque
        d.line([(mx * k, 64 * k), ((spec['W'] - mx) * k, 64 * k)], fill=spec['linhas'], width=max(1, round(k)))
        if spec['secao']:
            t = trilha_imagem.trilha(trilha_imagem.MARCAS[spec['marca']], spec['secao'])
            t = t.resize((W, round(W * t.height / t.width)), Image.LANCZOS)
            im.alpha_composite(t, (0, 0))
    return im.convert('RGB')


def main(args):
    manifesto = json.load(open(MANIFESTO, encoding='utf-8'))
    novas = 0
    for assin, texto in sorted(manifesto.items()):
        destino = os.path.join(SAIDA, 'MOLDURA - %s.png' % assin)
        if os.path.exists(destino) and '--todas' not in args: continue
        moldura(json.loads(texto)).save(destino, optimize=True)
        novas += 1
    print('%d molduras no manifesto, %d desenhadas agora em %s' % (len(manifesto), novas, SAIDA))


if __name__ == '__main__':
    main(sys.argv[1:])
