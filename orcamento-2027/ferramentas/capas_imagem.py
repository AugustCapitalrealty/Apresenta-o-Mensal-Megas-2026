"""Capa K2b e sub capas C1 de cada Mega como imagem de slide inteiro (1920×1080). Criado em 07/10/2026.

Desenhada em Pillow fica igual à simulação aprovada (degradê suave, recorte da foto, Montserrat e Open Sans de verdade),
o que as formas do Slides não reproduzem bem. Vai na imagem tudo o que não muda com os dados: a foto em faixa com o
degradê azul, o filete, "ORÇAMENTO <ano>", o nome do Mega, o subtítulo e o rodapé. Ficam como texto do Slides, por
cima, os três números (total, R$/m² ao mês, variação), que vêm da METRAGEM a cada geração, e os logos.

Sub capas (C1): vão na imagem a foto no bloco, o número e o título da seção, a frase, a trilha das 8 seções e o
rodapé; ficam como texto por cima os números da seção (valor, R$/m² ao mês, variação) e, sobre a trilha, áreas
transparentes com o link para as outras sub capas. A imagem só vale para o deck com as 8 seções (o número da seção
está desenhado nela); deck com seção faltando volta às formas.

Uso (de dentro de orcamento-2027; precisa de pillow e numpy):
  python ferramentas/capas_imagem.py                      (capa e 8 sub capas dos três Megas)
  python ferramentas/capas_imagem.py "MEGA CURITIBA"      (só um Mega; Curitiba sai com as cores da Demercado)
  python ferramentas/capas_imagem.py --previa-subcapa     (prévia da sub capa 04 de Itajaí, com números)
  python ferramentas/capas_imagem.py --previa "R$ 6,58 mi" "R$ 5,07" "▲ 22%" "MEGA ITAJAÍ"
     (só a prévia de um Mega, com os números desenhados, em ferramentas/saida/; não vai para o Drive)
Entrada: APRESENTAÇÃO ORÇAMENTO\\_fotos-subcapas\\MEGA <X>.png (de zipFotosSubcapas()).
Saída:   APRESENTAÇÃO ORÇAMENTO\\IMAGENS - SLIDES\\CAPA - MEGA <X>.jpg e SUBCAPA - MEGA <X> - <nn>.jpg — a pasta que o gerador procura
         (ORC_PASTA_IMAGENS em 01_Config.gs). O Drive for Desktop sobe sozinho; depois é só gerar a cidade.
As medidas são as do gerarSlideCapa_ e do gerarSlideSubcapa_ (pt de uma página 720×405); mudou uma, mude a outra.
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
MARCA, SLOGAN = 'Capital Realty', 'Expandir Eficiência'
# = ORC_MARCAS (01_Config.gs): o Mega Curitiba é da Demercado (07/10/2026).
MARCAS = {
    'CAPITAL':   dict(NAVY='#151E49', LIGHT='#065CA9', AZUL='#60A5FA', TXT='#475569', MUTED='#94A3B8', LINHA='#E2E8F0',
                      MARCA='Capital Realty', SLOGAN='Expandir Eficiência'),
    'DEMERCADO': dict(NAVY='#00594F', LIGHT='#AF9800', AZUL='#C9B037', TXT='#4B5250', MUTED='#9AA19F', LINHA='#E3E8E6',
                      MARCA='Demercado Investimentos', SLOGAN=''),
}
MARCA_DO_MEGA = {'MEGA CURITIBA': 'DEMERCADO'}


def usar_marca(mega):
    globals().update(MARCAS[MARCA_DO_MEGA.get(mega, 'CAPITAL')])
FOCO = {'MEGA CURITIBA': 0.26, 'MEGA ITAJAÍ': 0.30, 'MEGA ESTEIO': 0.52}   # = ORC_FOTO_FOCO (horizontal)
FOCO_Y = {'MEGA CURITIBA': 0.12, 'MEGA ITAJAÍ': 0.0, 'MEGA ESTEIO': 0.5}  # altura do recorte: 0 = topo da foto
RECUO = 7.2                                     # pt: recuo interno da caixa de texto do Slides
FOLGA_Y = 3.6                                   # pt: recuo de cima da caixa de texto do Slides
# = ORC_SUBCAPAS (01_Config.gs), na ordem do deck: título, foto, frase
SECOES = [('Premissas', 'DOCUMENTACAO', 'Como este orçamento foi construído'),
          ('Resumo Executivo', 'MEGA', 'O orçamento do ano em uma página'),
          ('DRE', 'OPERACIONAL', 'Conta a conta, do ritmo ao orçamento'),
          ('Manutenção', 'CORRETIVA', 'O custo para manter o Mega rodando'),
          ('Segurança', 'PATRIMONIAL', 'Vigilância, portaria e monitoramento'),
          ('Limpeza e Conservação', 'INTERNOS', 'O Mega limpo e conservado o ano inteiro'),
          ('Projetos × Recorrente', 'PREVENTIVA', 'O que é obra pontual e o que é rotina'),
          ('Custo por m²', 'CONTRATADOS', 'Quanto custa cada m² por mês')]
# = ORC_FOTO_FOCO (onde está o assunto, fração da largura)
FOCO_X = {'CORRETIVA': 0.40, 'PATRIMONIAL': 0.45, 'INTERNOS': 0.65, 'PREVENTIVA': 0.68, 'CONTRATADOS': 0.47,
          'DOCUMENTACAO': 0.58, 'OPERACIONAL': 0.47, 'MEGA CURITIBA': 0.26, 'MEGA ITAJAÍ': 0.30, 'MEGA ESTEIO': 0.52}


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


def paragrafo(d, caixa, txt, fam, peso, pt, cor):
    """Texto que quebra em linhas dentro da caixa, de cima para baixo (como _orcParagrafo_)."""
    x, y, w, h = caixa
    f = fonte(fam, peso, pt)
    linhas, atual = [], ''
    for p in txt.split(' '):
        t = (atual + ' ' + p).strip()
        if d.textlength(t, font=f) <= (w - 2 * RECUO) * K or not atual: atual = t
        else: linhas.append(atual); atual = p
    linhas.append(atual)
    for i, l in enumerate(linhas):
        d.text(((x + RECUO) * K, (y + FOLGA_Y) * K + i * pt * 1.2 * K), l, font=f, fill=cor)


def foto_bloco(chave, w, h):
    """Foto cobrindo o bloco w×h (px), centrada no assunto (FOCO_X) e na altura."""
    arq = [a for a in os.listdir(FOTOS) if os.path.splitext(a)[0] == chave]
    im = Image.open(os.path.join(FOTOS, arq[0])).convert('RGB')
    f = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * f + 1), int(im.height * f + 1)), Image.LANCZOS)
    x = int(min(max(FOCO_X.get(chave, 0.5) * im.width - w / 2, 0), im.width - w)); y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def subcapa(mega, nome_mega, n):
    """Sub capa C1 da seção n (1–8) do Mega, sem os números (vão em texto por cima)."""
    titulo, chave, frase = SECOES[n - 1]
    t = Image.new('RGB', (W, H), 'white')
    bx, by, bw, bh = 410, 30, 274, 262
    t.paste(foto_bloco(mega if chave == 'MEGA' else chave, int(bw * K), int(bh * K)), (int(bx * K), int(by * K)))
    d = ImageDraw.Draw(t)
    d.rectangle([bx * K, by * K, (bx + 4) * K, (by + bh) * K], fill=LIGHT)
    texto(d, (46, 26, 200, 66), '%02d' % n, 'M', 'Bold', 54, AZUL)
    texto(d, (48, 116, 340, 44), titulo, 'M', 'Bold', 32, NAVY, pt_min=20)
    texto(d, (48, 160, 340, 22), frase, 'O', 'Regular', 12.5, TXT, pt_min=9)
    d.rectangle([(48 + RECUO) * K, 190 * K, (88 + RECUO) * K, 193 * K], fill=LIGHT)   # alinhado com o texto
    larg = 636 / len(SECOES)
    for i, (nome, _, _) in enumerate(SECOES):
        x, w, atual = 48 + i * larg, larg - 6, i == n - 1
        if atual: d.rectangle([x * K, 311 * K, (x + w) * K, 314 * K], fill=LIGHT)
        else: d.rectangle([x * K, 312 * K, (x + w) * K, 313 * K], fill=LINHA)
        texto(d, (x, 318, w, 12), '%02d' % (i + 1), 'M', 'Bold', 8, LIGHT if atual else MUTED)
        paragrafo(d, (x, 329, w, 26), nome, 'O', 'Bold' if atual else 'Regular', 7.5, NAVY if atual else MUTED)
    d.line([(48 * K, 372 * K), (684 * K, 372 * K)], fill=LINHA, width=max(1, int(0.75 * K)))
    texto(d, (48, 376, 500, 16), '%s · Orçamento %d · %s · Facilities' % (nome_mega, ANO, MARCA), 'O', 'Regular', 7.5, MUTED)
    return t


def numeros_subcapa(t, valor, rotulo, kpis):
    """Só para a prévia: os números da seção como o gerador põe por cima (caixas de gerarSlideSubcapa_)."""
    d = ImageDraw.Draw(t)
    texto(d, (48, 200, 170, 40), valor, 'M', 'Bold', 28, NAVY, pt_min=16)
    texto(d, (48, 240, 170, 14), rotulo, 'O', 'Regular', 9, TXT)
    for i, (v, r) in enumerate(kpis):
        texto(d, (222 + i * 90, 208, 80, 22), v, 'M', 'Bold', 16, NAVY, pt_min=10)
        texto(d, (222 + i * 90, 230, 80, 14), r, 'O', 'Regular', 9, TXT)
    return t


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
    texto(d, (48, 376, 400, 16), '%s · Facilities · Planejamento %d' % (MARCA, ANO), 'O', 'Regular', 7.5, MUTED)
    if SLOGAN:
        d.rectangle([584 * K, 381 * K, 589 * K, 386 * K], fill=AZUL)
        texto(d, (592, 376, 100, 16), SLOGAN, 'M', 'Bold', 8, NAVY)
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
    texto(d, (48, 30, 260, 24), MARCA.upper(), 'M', 'Bold', 13, 'white')
    d.rectangle([574 * K, 21 * K, 702 * K, 69 * K], fill='white')
    texto(d, (586, 30, 110, 30), 'logo do Mega', 'O', 'Regular', 8, MUTED)
    return t


def main(args):
    if args and args[0] == '--previa-subcapa':
        mega = 'MEGA ITAJAÍ'
        destino = os.path.join(AQUI, 'saida', 'previa_subcapa_04.jpg')
        numeros_subcapa(subcapa(mega, mega.title(), 4), 'R$ 2,27 mi', 'Orçamento 2027 da conta',
                        [('R$ 1,75', '/m² ao mês'), ('▲ 77%', 'vs. ritmo 2026')]).save(destino, quality=90)
        print('prévia ->', destino); return
    if args and args[0] == '--previa':
        total, m2, var, mega = args[1:5]
        destino = os.path.join(AQUI, 'saida', 'previa_capa_%s.jpg' % mega.replace(' ', '_'))
        usar_marca(mega)
        numeros(capa(mega, mega.title()), total, m2, var).save(destino, quality=90)
        print('prévia ->', destino); return
    os.makedirs(SAIDA, exist_ok=True)
    so = [a.upper() for a in args]   # ex.: "MEGA CURITIBA" refaz só um Mega
    for mega in ('MEGA CURITIBA', 'MEGA ITAJAÍ', 'MEGA ESTEIO'):
        if so and mega not in so: continue
        usar_marca(mega)
        if not os.path.exists(os.path.join(FOTOS, mega + '.png')):
            print('sem foto:', mega); continue
        destino = os.path.join(SAIDA, 'CAPA - %s.jpg' % mega)
        capa(mega, mega.title()).save(destino, quality=90, optimize=True)
        print('ok ->', os.path.relpath(destino, RAIZ), '(%d KB)' % (os.path.getsize(destino) // 1024))
        for n in range(1, len(SECOES) + 1):
            destino = os.path.join(SAIDA, 'SUBCAPA - %s - %02d.jpg' % (mega, n))
            subcapa(mega, mega.title(), n).save(destino, quality=90, optimize=True)
        print('   + %d sub capas' % len(SECOES))


if __name__ == '__main__':
    main(sys.argv[1:])
