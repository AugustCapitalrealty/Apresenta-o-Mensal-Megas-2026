"""Capa, capas de seção e encerramento da APRESENTAÇÃO MENSAL DE PROPRIEDADES como imagem de slide inteiro (1920×1080).
Criado em 16/10/2026 (Guilherme: "coloque capas e sub capas e contra capas com as imagens que aprendemos"; "sem trilha").

Mesmo desenho das capas do Orçamento 2027 de Propriedades (orcamento-2027-propriedades/ferramentas/capas_propriedades.py):
vai na imagem o que não muda de um mês para outro (fotos, véu, filete, títulos, frases, rodapé); o MÊS, os logos e a
data ficam como texto do Slides, por cima (21_Slide_Capas.gs). As caixas são as de lá (pt de uma página 720×405):
mudou uma, mude a outra.

As seções são as que o time já usa no deck (capas feitas à mão até setembro/2026) = SECOES_MENSAL em 21_Slide_Capas.gs.

Fotos: APRESENTAÇÃO ORÇAMENTO\\_fotos-subcapas. Saída: APRESENTAÇÃO ORÇAMENTO\\IMAGENS - SLIDES (o Drive sobe sozinho).

Uso (precisa de pillow):
  python ferramentas/capas_mensal.py            (as imagens, direto na pasta IMAGENS - SLIDES)
  python ferramentas/capas_mensal.py --previa   (prévias com o mês de exemplo em ferramentas/saida/)
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))   # APRESENTAÇÃO ORÇAMENTO
FOTOS = os.path.join(RAIZ, '_fotos-subcapas')
SAIDA = os.path.join(RAIZ, 'IMAGENS - SLIDES')
FONTES = os.path.join(AQUI, '..', '..', 'orcamento-2027', 'ferramentas', 'fontes')
PREVIA = os.path.join(AQUI, 'saida')
W, H = 1920, 1080
K = W / 720                                     # px por pt
RECUO, FOLGA_Y = 7.2, 3.6                       # pt: recuos da caixa de texto do Slides

# = CR_DESIGN_SYSTEM (01_Config.gs) — as mesmas cores das capas do Orçamento 2027
M = dict(NAVY='#151E49', LIGHT='#065CA9', AZUL='#60A5FA', TXT='#475569', MUTED='#94A3B8', LINHA='#E2E8F0')

# = SECOES_MENSAL (21_Slide_Capas.gs): título, frase e foto de cada seção, na ordem do deck
SECOES = [
    ('Financeiro', 'DRE, bridge, torre de manutenção e CAPEX', 'DOCUMENTACAO'),
    ('Manutenções', 'Preventivas, corretivas e backlog de chamados', 'CORRETIVA'),
    ('Gestão de Contratações', 'Processos em andamento, contratações fechadas e backlog de clientes', 'CONTRATADOS'),
    ('Obras e Contratações em Andamento', 'Serviços contratados em andamento e concluídos no mês', 'PREVENTIVA'),
    ('Vistorias', 'Recebimento de obras, vistorias de rotina e SGQ', 'PATRIMONIAL'),
    ('Adequações de Clientes', 'Análise de projetos e status dos projetos aprovados', 'INTERNOS'),
]
FOTO_ENCERRAMENTO = 'MEGA CURITIBA'
# Onde está o assunto da foto (fração da largura) — = FOCO_X de capas_propriedades.py
FOCO_X = {'CORRETIVA': 0.40, 'PATRIMONIAL': 0.45, 'CONTRATADOS': 0.47, 'DOCUMENTACAO': 0.58, 'OPERACIONAL': 0.485,
          'MEGA CURITIBA': 0.26, 'MEGA ITAJAÍ': 0.30, 'MEGA ESTEIO': 0.52}


def fonte(fam, peso, pt):
    f = ImageFont.truetype(os.path.join(FONTES, {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]),
                           int(pt * K))
    f.set_variation_by_name(peso)
    return f


def texto(d, caixa, txt, fam, peso, pt, cor, pt_min=None, align='L'):
    """Texto numa caixa (x, y, w, h em pt), centrado na altura, como a caixa do Slides."""
    x, y, w, h = caixa
    while True:
        f = fonte(fam, peso, pt)
        if d.textlength(txt, font=f) <= (w - 2 * RECUO) * K or not pt_min or pt <= pt_min: break
        pt -= 0.5
    if align == 'R': d.text(((x + w - RECUO) * K, (y + h / 2) * K), txt, font=f, fill=cor, anchor='rm')
    else: d.text(((x + RECUO) * K, (y + h / 2) * K), txt, font=f, fill=cor, anchor='lm')


def paragrafo(d, caixa, txt, fam, peso, pt, cor):
    x, y, w, h = caixa
    f = fonte(fam, peso, pt)
    linhas, atual = [], ''
    for p in txt.split(' '):
        t = (atual + ' ' + p).strip()
        if d.textlength(t, font=f) <= (w - 2 * RECUO) * K or not atual: atual = t
        else: linhas.append(atual); atual = p
    linhas.append(atual)
    for i, l in enumerate(linhas):
        d.text(((x + RECUO) * K, (y + FOLGA_Y) * K + i * pt * 1.25 * K), l, font=f, fill=cor)


def abrir(chave):
    arq = [a for a in os.listdir(FOTOS) if os.path.splitext(a)[0] == chave]
    if not arq: raise SystemExit('sem a foto ' + chave + ' em ' + FOTOS)
    return Image.open(os.path.join(FOTOS, arq[0])).convert('RGB')


def recorte(chave, w, h, zoom=1.0, foco_y=0.5, foco_x=None):
    """Foto cobrindo w×h px, com zoom, centrada no assunto (FOCO_X) e na altura foco_y (0 = topo)."""
    im = abrir(chave)
    f = max(w / im.width, h / im.height) * zoom
    im = im.resize((int(im.width * f + 1), int(im.height * f + 1)), Image.LANCZOS)
    fx = FOCO_X.get(chave, 0.5) if foco_x is None else foco_x
    x = int(min(max(fx * im.width - w / 2, 0), im.width - w))
    y = int(min(max(foco_y * im.height - h / 2, 0), im.height - h))
    return im.crop((x, y, x + w, y + h))


def degrade(im, cor, a0, a1, ate=1.0):
    """Véu da cor da marca da esquerda (opacidade a0) para a direita (a1 em 'ate' da largura; depois a1)."""
    w, h = im.size
    larg = max(1, int(w * ate))
    linha = [int(255 * (a0 + (a1 - a0) * min(x / larg, 1.0))) for x in range(w)]
    mascara = Image.new('L', (w, 1)); mascara.putdata(linha)
    mascara = mascara.resize((w, h))
    im.paste(Image.new('RGB', (w, h), cor), (0, 0), mascara)
    return im


def rodape(d, txt):
    d.line([(48 * K, 372 * K), (684 * K, 372 * K)], fill=M['LINHA'], width=max(1, int(0.75 * K)))
    texto(d, (48, 376, 420, 16), txt, 'O', 'Regular', 7.5, M['MUTED'])


# ------------------------------------------------------------------ capa (o C verde, = capa do Orçamento 2027)
def capa():
    t = Image.new('RGB', (W, H), 'white')
    fh = int(210 * K)
    t.paste(degrade(recorte('OPERACIONAL', W, fh, zoom=1.15, foco_y=0.24), M['NAVY'], 0.90, 0.0, 0.45), (0, 0))
    d = ImageDraw.Draw(t)
    d.rectangle([0, fh, W, fh + int(4 * K)], fill=M['LIGHT'])
    texto(d, (48, 226, 400, 16), 'APRESENTAÇÃO MENSAL', 'M', 'Bold', 10, M['LIGHT'])
    texto(d, (46, 242, 600, 54), 'Gestão de Propriedades', 'M', 'Bold', 38, M['NAVY'], pt_min=24)
    texto(d, (48, 296, 420, 18), 'Obras, contratações e indicadores do mês', 'O', 'Regular', 11, M['TXT'], pt_min=8)
    # 318–350 pt: livre para o mês (pill, texto do Slides)
    rodape(d, 'Capital Realty · Demercado · Gerência de Propriedades')
    return t


# ------------------------------------------------------------------ capa de seção (= contra capa do Orçamento 2027, sem a trilha)
def secao(n):
    titulo, frase, foto = SECOES[n - 1]
    t = Image.new('RGB', (W, H), 'white')
    bx, by, bw, bh = 410, 30, 274, 326
    t.paste(recorte(foto, int(bw * K), int(bh * K)), (int(bx * K), int(by * K)))
    d = ImageDraw.Draw(t)
    d.rectangle([bx * K, by * K, (bx + 4) * K, (by + bh) * K], fill=M['LIGHT'])
    texto(d, (46, 26, 200, 66), '%02d' % n, 'M', 'Bold', 54, M['AZUL'])
    texto(d, (48, 96, 340, 16), 'PROPRIEDADES · APRESENTAÇÃO MENSAL', 'M', 'Bold', 9, M['LIGHT'])
    if len(titulo) > 24:                                    # "Obras e Contratações em Andamento": duas linhas
        paragrafo(d, (48, 112, 352, 80), titulo, 'M', 'Bold', 26, M['NAVY'])
        y = 186
    else:
        texto(d, (48, 116, 352, 44), titulo, 'M', 'Bold', 30, M['NAVY'], pt_min=18)
        y = 160
    paragrafo(d, (48, y, 352, 40), frase, 'O', 'Regular', 12, M['TXT'])
    d.rectangle([(48 + RECUO) * K, (y + 40) * K, (88 + RECUO) * K, (y + 43) * K], fill=M['LIGHT'])
    rodape(d, 'Capital Realty · Demercado · Apresentação Mensal · Propriedades')
    return t


# ------------------------------------------------------------------ encerramento (foto à direita, painel da marca à esquerda)
def encerramento():
    t = Image.new('RGB', (W, H), 'white')
    t.paste(recorte(FOTO_ENCERRAMENTO, W, H), (0, 0))
    pw = int(330 * K)
    t.paste(degrade(t.crop((0, 0, W, H)), M['NAVY'], 0.96, 0.10, 0.62), (0, 0))
    d = ImageDraw.Draw(t)
    d.rectangle([0, 0, int(6 * K), H], fill=M['LIGHT'])
    texto(d, (46, 120, 300, 16), 'APRESENTAÇÃO MENSAL · PROPRIEDADES', 'M', 'Bold', 9, M['AZUL'])
    texto(d, (44, 138, 320, 64), 'Obrigado', 'M', 'Bold', 48, '#FFFFFF')
    d.rectangle([(48 + RECUO) * K, 210 * K, (88 + RECUO) * K, 213 * K], fill=M['AZUL'])
    texto(d, (46, 222, 320, 18), 'INFRAESTRUTURA INSPIRA.', 'M', 'Bold', 12, '#FFFFFF')
    texto(d, (46, 240, 320, 18), 'LOGÍSTICA CONECTA.', 'M', 'Bold', 12, M['AZUL'])
    # 330–360 pt à esquerda: livre para os logos (texto do Slides)
    return t


def todas():
    yield 'CAPA - PROPRIEDADES MENSAL.jpg', capa()
    for n in range(1, len(SECOES) + 1):
        yield 'SECAO - PROPRIEDADES MENSAL - %02d.jpg' % n, secao(n)
    yield 'ENCERRAMENTO - PROPRIEDADES MENSAL.jpg', encerramento()


# ------------------------------------------------------------------ prévia: o que o Slides põe por cima
def previa(nome, t):
    d = ImageDraw.Draw(t)
    if nome.startswith('CAPA'):
        texto(d, (48, 30, 300, 30), 'logos CR + DM', 'M', 'Bold', 13, '#FFFFFF')
        d.rounded_rectangle([48 * K, 322 * K, 248 * K, 348 * K], radius=int(4 * K), fill=M['LIGHT'])
        texto(d, (48, 322, 200, 26), 'SETEMBRO 2026', 'M', 'Bold', 11, '#FFFFFF')
    elif nome.startswith('SECAO'):
        texto(d, (464, 376, 220, 16), 'SETEMBRO 2026', 'M', 'Bold', 7.5, M['LIGHT'], align='R')
    elif nome.startswith('ENCERRAMENTO'):
        texto(d, (48, 330, 300, 28), 'logos CR + DM', 'M', 'Bold', 11, '#FFFFFF')
    return t


def main(args):
    if args and args[0] == '--previa':
        os.makedirs(PREVIA, exist_ok=True)
        for nome, t in todas():
            previa(nome, t).resize((960, 540), Image.LANCZOS).save(os.path.join(PREVIA, nome), quality=88)
        print('prévias ->', PREVIA); return
    os.makedirs(SAIDA, exist_ok=True)
    for nome, t in todas():
        destino = os.path.join(SAIDA, nome)
        t.save(destino, quality=90, optimize=True)
        print('ok ->', nome, '(%d KB)' % (os.path.getsize(destino) // 1024))


if __name__ == '__main__':
    main(sys.argv[1:])
