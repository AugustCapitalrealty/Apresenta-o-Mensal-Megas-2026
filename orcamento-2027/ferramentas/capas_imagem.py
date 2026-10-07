"""Capa K2b de cada Mega como imagem de slide inteiro (1920×1080). Criado em 07/10/2026.

Desenhada em Pillow fica igual à simulação aprovada (degradê suave, recorte da foto, Montserrat e Open Sans de verdade),
o que as formas do Slides não reproduzem bem. Vai na imagem tudo o que não muda com os dados: a foto em faixa com o
degradê azul, o filete, "ORÇAMENTO <ano>", o nome do Mega, o subtítulo e o rodapé. Ficam como texto do Slides, por
cima, os três números (total, R$/m² ao mês, variação), que vêm da METRAGEM a cada geração, e os logos.

Uso (de dentro de orcamento-2027; precisa de pillow e numpy):
  python ferramentas/capas_imagem.py                      (os três Megas)
  python ferramentas/capas_imagem.py --previa "R$ 6,58 mi" "R$ 5,07" "▲ 22%" "MEGA ITAJAÍ"
     (só a prévia de um Mega, com os números desenhados, em ferramentas/saida/; não vai para o Drive)
Entrada: APRESENTAÇÃO ORÇAMENTO\\_fotos-subcapas\\MEGA <X>.png (de zipFotosSubcapas()).
Saída:   APRESENTAÇÃO ORÇAMENTO\\IMAGENS - SLIDES\\CAPA - MEGA <X>.jpg — a pasta que o gerador procura
         (ORC_PASTA_IMAGENS em 01_Config.gs). O Drive for Desktop sobe sozinho; depois é só gerar a cidade.
As medidas são as do gerarSlideCapa_ (pt de uma página 720×405); mudou uma, mude a outra.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))   # APRESENTAÇÃO ORÇAMENTO
FOTOS = os.path.join(RAIZ, '_fotos-subcapas')
SAIDA = os.path.join(RAIZ, 'IMAGENS - SLIDES')
FONTES = os.path.join(AQUI, 'fontes')
ANO = 2027
W, H = 1920, 1080
K = W / 720                                     # px por pt
NAVY, LIGHT, AZUL, TXT, MUTED, LINHA = '#151E49', '#065CA9', '#60A5FA', '#475569', '#94A3B8', '#E2E8F0'
FOCO = {'MEGA CURITIBA': 0.26, 'MEGA ITAJAÍ': 0.30, 'MEGA ESTEIO': 0.52}   # = ORC_FOTO_FOCO (horizontal)
FOCO_Y = {'MEGA CURITIBA': 0.12, 'MEGA ITAJAÍ': 0.0, 'MEGA ESTEIO': 0.5}  # altura do recorte: 0 = topo da foto
RECUO = 7.2                                     # pt: recuo interno da caixa de texto do Slides


def fonte(fam, peso, pt):
    f = ImageFont.truetype(os.path.join(FONTES, {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]), int(pt * K))
    f.set_variation_by_name(peso)
    return f


def texto(d, caixa, txt, fam, peso, pt, cor, pt_min=None):
    """Texto alinhado à esquerda numa caixa (x, y, w, h em pt), centrado na altura, como a caixa do Slides."""
    x, y, w, h = caixa
    while True:
        f = fonte(fam, peso, pt)
        if d.textlength(txt, font=f) <= (w - 2 * RECUO) * K or not pt_min or pt <= pt_min: break
        pt -= 0.5
    d.text(((x + RECUO) * K, (y + h / 2) * K), txt, font=f, fill=cor, anchor='lm')


def faixa_foto(nome, w, h):
    im = Image.open(os.path.join(FOTOS, nome + '.png')).convert('RGB')
    f = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * f + 1), int(im.height * f + 1)), Image.LANCZOS)
    foco = FOCO.get(nome, 0.5)
    x = int(min(max(foco * im.width - w / 2, 0), im.width - w)); y = int((im.height - h) * FOCO_Y.get(nome, 0.5))
    return im.crop((x, y, x + w, y + h))


def capa(mega, nome_exibido):
    t = Image.new('RGB', (W, H), 'white')
    fh = int(210 * K)
    t.paste(faixa_foto(mega, W, fh), (0, 0))
    # degradê azul: 85% à esquerda até 0 à direita (suave, pixel a pixel)
    alfa = (np.linspace(0.85, 0.0, W)[None, :].repeat(fh, 0) * 255).astype(np.uint8)
    camada = Image.new('RGBA', (W, fh), NAVY); camada.putalpha(Image.fromarray(alfa))
    t.paste(camada, (0, 0), camada)
    d = ImageDraw.Draw(t)
    d.rectangle([0, fh, W, fh + int(4 * K)], fill=LIGHT)
    texto(d, (48, 226, 300, 16), 'ORÇAMENTO ' + str(ANO), 'M', 'Bold', 10, LIGHT)
    texto(d, (46, 242, 320, 54), nome_exibido, 'M', 'Bold', 40, NAVY, pt_min=24)
    texto(d, (48, 296, 330, 18), 'Despesas do condomínio · do Ritmo %d ao Orçamento %d' % (ANO - 1, ANO), 'O', 'Regular', 11, TXT, pt_min=8)
    d.line([(48 * K, 372 * K), (684 * K, 372 * K)], fill=LINHA, width=max(1, int(0.75 * K)))
    texto(d, (48, 376, 400, 16), 'Capital Realty · Facilities · Planejamento %d' % ANO, 'O', 'Regular', 7.5, MUTED)
    d.rectangle([584 * K, 381 * K, 589 * K, 386 * K], fill=AZUL)
    texto(d, (592, 376, 100, 16), 'Expandir Eficiência', 'M', 'Bold', 8, NAVY)
    return t


def numeros(t, total, m2, var):
    """Só para a prévia: os números como o gerador põe por cima (mesmas caixas de gerarSlideCapa_)."""
    d = ImageDraw.Draw(t)
    texto(d, (384, 246, 156, 36), total, 'M', 'Bold', 26, NAVY)
    texto(d, (384, 282, 156, 14), 'Orçamento %d, todas as contas' % ANO, 'O', 'Regular', 8.5, TXT)
    for i, (v, r) in enumerate([(m2, '/m² ao mês'), (var, 'vs. ritmo %d' % (ANO - 1))]):
        texto(d, (546 + i * 80, 252, 76, 22), v, 'M', 'Bold', 16, NAVY)
        texto(d, (546 + i * 80, 274, 76, 14), r, 'O', 'Regular', 8.5, TXT)
    # logos (no deck são as imagens oficiais)
    texto(d, (48, 30, 260, 24), 'CAPITAL REALTY', 'M', 'Bold', 13, 'white')
    d.rectangle([574 * K, 21 * K, 702 * K, 69 * K], fill='white')
    texto(d, (586, 30, 110, 30), 'logo do Mega', 'O', 'Regular', 8, MUTED)
    return t


def main(args):
    if args and args[0] == '--previa':
        total, m2, var, mega = args[1:5]
        destino = os.path.join(AQUI, 'saida', 'previa_capa_%s.jpg' % mega.replace(' ', '_'))
        numeros(capa(mega, mega.title()), total, m2, var).save(destino, quality=90)
        print('prévia ->', destino); return
    os.makedirs(SAIDA, exist_ok=True)
    for mega in ('MEGA CURITIBA', 'MEGA ITAJAÍ', 'MEGA ESTEIO'):
        if not os.path.exists(os.path.join(FOTOS, mega + '.png')):
            print('sem foto:', mega); continue
        destino = os.path.join(SAIDA, 'CAPA - %s.jpg' % mega)
        capa(mega, mega.title()).save(destino, quality=90, optimize=True)
        print('ok ->', os.path.relpath(destino, RAIZ), '(%d KB)' % (os.path.getsize(destino) // 1024))


if __name__ == '__main__':
    main(sys.argv[1:])
