"""Fotos tratadas das sub capas "recorte" do deck do orçamento. Criado em 07/10/2026.

Lê as fotos que exportarFotosSubcapas() (03_Exportar.gs) jogou em  APRESENTAÇÃO ORÇAMENTO\\_fotos-subcapas  e grava em
APRESENTAÇÃO ORÇAMENTO\\IMAGENS - SUBCAPAS  (a pasta que o gerador procura, ORC_PASTA_IMAGENS_SUBCAPAS):
  SUBCAPA - <CHAVE>.png       a foto como recorte de papel: retícula azul-marinho em papel claro, borda rasgada, sombra
  CANETA - SUBLINHADO.png     o traço de caneta azul que vai embaixo da frase
O Drive for Desktop sobe a pasta sozinho; depois é só gerar a cidade de novo.

Uso (de dentro de orcamento-2027; precisa de `python -m pip install pillow numpy`):
  python ferramentas/subcapas_youtube.py              (todas)
  python ferramentas/subcapas_youtube.py PREVENTIVA   (só algumas)

O recorte de cada foto fica em CAIXAS: escolha o pedaço que explica a seção (o objeto, não a paisagem) e confira na
folha de revisão (ferramentas/saida/subcapas_folha.jpg) em tamanho pequeno. Sem caixa, corte central em 4:5.
"""
import os, sys, zlib
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import efeitos_imagem as ef

RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))   # APRESENTAÇÃO ORÇAMENTO
ENTRADA = os.path.join(RAIZ, '_fotos-subcapas')
SAIDA = os.path.join(RAIZ, 'IMAGENS - SUBCAPAS')
REVISAO = os.path.join(AQUI, 'saida')
Image.MAX_IMAGE_PIXELS = None   # foto de drone passa de 89 MP

MARINHO, PAPEL, AZUL = '#151E49', '#F8FAFC', '#60A5FA'   # brandDark, bgSlide e o azul de destaque das capas
PROPORCAO = 4 / 5     # recorte em pé: cabe ao lado do título
CELULA = 6            # tamanho do ponto da retícula (px na largura de 900)

# Pedaço de cada foto (x0, y0, x1, y1 em frações). Escolhido olhando as fotos; sem entrada, corte central.
CAIXAS = {
}


def recortar(im, chave):
    if chave in CAIXAS:
        x0, y0, x1, y1 = CAIXAS[chave]
        return im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
    w, h = im.size
    if w / h > PROPORCAO:
        nw = int(h * PROPORCAO); x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / PROPORCAO); y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def main(chaves):
    if not os.path.isdir(ENTRADA):
        raise SystemExit('Sem fotos em ' + ENTRADA + ': rode exportarFotosSubcapas() no editor e espere o Drive sincronizar.')
    os.makedirs(SAIDA, exist_ok=True); os.makedirs(REVISAO, exist_ok=True)
    feitas = []
    for arq in sorted(os.listdir(ENTRADA)):
        chave, ext = os.path.splitext(arq)
        if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp') or (chaves and chave not in chaves):
            continue
        im = Image.open(os.path.join(ENTRADA, arq)).convert('RGB')
        im = recortar(im, chave)
        seed = zlib.crc32(chave.encode('utf-8')) % 1000   # o rasgo muda de foto para foto, mas é sempre o mesmo para cada uma
        peca = ef.com_sombra(ef.rasgar(ef.foto_reticula(im, MARINHO, PAPEL, CELULA, 900, seed), amp=10, seed=seed))
        destino = os.path.join(SAIDA, 'SUBCAPA - ' + chave + '.png')
        peca.save(destino, optimize=True)
        feitas.append(destino)
        print('ok ->', os.path.relpath(destino, RAIZ), f'({os.path.getsize(destino) // 1024} KB)')
    ef.caneta('sublinhado', 600, 120, AZUL, espessura=7).save(os.path.join(SAIDA, 'CANETA - SUBLINHADO.png'))
    print('ok -> IMAGENS - SUBCAPAS\\CANETA - SUBLINHADO.png')
    if feitas:
        folha = os.path.join(REVISAO, 'subcapas_folha.jpg')
        ef.folha_contato(SAIDA, colunas=4, largura=240).save(folha, quality=88)
        print('folha de revisão ->', folha)


if __name__ == '__main__':
    main(sys.argv[1:])
