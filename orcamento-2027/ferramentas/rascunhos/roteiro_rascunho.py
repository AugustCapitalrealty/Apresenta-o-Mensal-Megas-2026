"""Rascunho dos itens 13 e 14 (storytelling): a seção de Manutenção hoje × proposta, com miniaturas dos slides reais.
Criado em 07/10/2026. Uso (de dentro de orcamento-2027, depois de PREVIA=ferramentas/saida node teste/teste_orcamento.js):
  python ferramentas/rascunhos/roteiro_rascunho.py <arquivo de saída .png>
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(PROJ, 'ferramentas'))
import previa_slides  # noqa: E402

FONTES = os.path.join(PROJ, 'ferramentas', 'fontes')
TW, TH = 384, 216
NAVY, AZUL, CINZA, LINHA = '#151E49', '#065CA9', '#64748B', '#E2E8F0'
TAG = {'MOVIDO': '#065CA9', 'SAI': '#B91C1C', 'MESMO': '#94A3B8', 'MUDA': '#EA580C'}


def fonte(peso, px, fam='M'):
    f = ImageFont.truetype(os.path.join(FONTES, {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]), px)
    f.set_variation_by_name(peso); return f


def miniatura(dados, i, tmp):
    previa_slides.LARG = TW
    previa_slides.desenha(dados, i, tmp)
    return Image.open(tmp).convert('RGB').resize((TW, TH), Image.LANCZOS)


def faixa(d, img, y, titulo, slides, dados, tmp, por_linha=6):
    d.text((40, y), titulo, font=fonte('Bold', 30), fill=NAVY)
    y += 52
    for n, (idx, legenda, tag, nota) in enumerate(slides):
        col, lin = n % por_linha, n // por_linha
        x, yy = 40 + col * (TW + 28), y + lin * (TH + 108)
        mini = miniatura(dados, idx, tmp)
        img.paste(mini, (x, yy))
        cor = TAG.get(tag, CINZA)
        d.rectangle([x - 2, yy - 2, x + TW + 1, yy + TH + 1], outline=cor if tag != 'MESMO' else LINHA, width=3 if tag != 'MESMO' else 1)
        d.ellipse([x - 14, yy - 14, x + 22, yy + 22], fill=NAVY)
        d.text((x + 4, yy + 4), str(n + 1), font=fonte('Bold', 18), fill='white', anchor='mm')
        d.text((x, yy + TH + 8), legenda, font=fonte('SemiBold', 17, 'O'), fill=NAVY)
        if tag:
            tw = d.textlength(tag, font=fonte('Bold', 13))
            d.rounded_rectangle([x, yy + TH + 36, x + tw + 16, yy + TH + 58], radius=6, fill=cor)
            d.text((x + 8, yy + TH + 47), tag, font=fonte('Bold', 13), fill='white', anchor='lm')
        if nota:
            d.text((x + (d.textlength(tag, font=fonte('Bold', 13)) + 26 if tag else 0), yy + TH + 38), nota, font=fonte('Regular', 14, 'O'), fill=CINZA)
    linhas = (len(slides) + por_linha - 1) // por_linha
    return y + linhas * (TH + 108)


def main(destino):
    dados = json.load(open(os.path.join(PROJ, 'ferramentas', 'saida', 'formas_esteio.json'), encoding='utf-8'))
    tit = lambda s: next((f['texto'] for f in s['formas'] if f.get('texto')), '')
    acha = lambda t: next(i for i, s in enumerate(dados['slides']) if tit(s).startswith(t))
    i = {k: acha(t) for k, t in [('ll1', 'Manutenção de imóveis (1/2)'), ('ll2', 'Manutenção de imóveis (2/2)'),
                                 ('ca', 'Manutenção de imóveis — contratos'), ('cat', 'Manutenção de Imóveis — Orçamento'),
                                 ('mens', 'Distribuição mensal'), ('rev', 'REVESTIMENTO'), ('ppci', 'PPCI'), ('cob', 'COBERTURA'),
                                 ('d1', 'Demais categorias (1/2)'), ('d2', 'Demais categorias (2/2)'),
                                 ('pr', 'Manutenção: projetos × custo'), ('g1', 'Manutenção: os itens de cada grupo (1/2)'),
                                 ('g2', 'Manutenção: os itens de cada grupo (2/2)')]}
    hoje = [(i['ll1'], 'A conta (cards, mês a mês, composição)', '', ''),
            (i['ll2'], 'Composição: itens menores', '', ''),
            (i['ca'], 'Contratos e avulsos', '', ''),
            (i['cat'], 'Por categoria (barra "DEMAIS")', '', ''),
            (i['mens'], 'Distribuição mensal', '', ''),
            (i['rev'], 'Categorias grandes (7 slides)…', '', ''),
            (i['d1'], 'Demais categorias (1/2)', '', ''),
            (i['d2'], 'Demais categorias (2/2)', '', ''),
            (i['pr'], '… seção 07: projetos × recorrente', '', ''),
            (i['g1'], 'Itens de cada grupo (1/2)', '', ''),
            (i['g2'], 'Itens de cada grupo (2/2)', '', '')]
    proposta = [(i['ll1'], 'A conta (visão geral)', 'MESMO', '"+ N itens" leva ao 4'),
                (i['ca'], 'Contratos e avulsos', 'MUDA', 'linha "Avulsos" com link p/ o 3'),
                (i['pr'], 'Os avulsos abertos: recorrente, pontual, projetos', 'MOVIDO', 'item 13 · era a seção 07'),
                (i['g1'], 'Item a item, com o selinho (1/2)', 'MOVIDO', 'substitui a composição 2/2'),
                (i['g2'], 'Item a item, com o selinho (2/2)', 'MOVIDO', ''),
                (i['cat'], 'Por categoria', 'MUDA', 'barra DEMAIS diz quais são'),
                (i['d1'], 'Demais categorias (1/2)', 'MOVIDO', 'item 14 · logo após a barra'),
                (i['d2'], 'Demais categorias (2/2)', 'MOVIDO', ''),
                (i['rev'], 'Categorias grandes (7 slides)…', 'MESMO', ''),
                (i['mens'], 'Distribuição mensal', 'MOVIDO', 'fecha a seção'),
                (i['ll2'], 'Composição: itens menores', 'SAI', 'repetia os itens do 4 e 5')]
    W = 40 * 2 + 6 * TW + 5 * 28
    img = Image.new('RGB', (W, 2000), 'white'); d = ImageDraw.Draw(img)
    d.text((40, 30), 'RASCUNHO · ITENS 13 E 14 · ROTEIRO DA SEÇÃO MANUTENÇÃO', font=fonte('Bold', 22), fill='#EA580C')
    d.text((40, 64), 'Mega Esteio (vale para os três Megas) · o que vem depois do quê, para a pergunta "e o que tem dentro disso?" ser '
                     'respondida no slide seguinte', font=fonte('Regular', 20, 'O'), fill=CINZA)
    tmp = os.path.join(PROJ, 'ferramentas', 'saida', '_mini.png')
    y = faixa(d, img, 120, 'HOJE', hoje, dados, tmp)
    d.line([(40, y + 10), (W - 40, y + 10)], fill=LINHA, width=3)
    y = faixa(d, img, y + 40, 'PROPOSTA', proposta, dados, tmp)
    notas = ['Item 13 — o slide "projetos × recorrente" já separa os avulsos em recorrente, pontual e projetos: sai da seção 07 e vem logo depois',
             '   de "contratos e avulsos", com as páginas item a item (selinho). A seção 07 deixa de existir: o deck fica com 7 seções (a trilha muda junto).',
             'Item 14 — as páginas dos "Demais" vêm logo depois do slide por categoria, e a barra "DEMAIS (12)" escreve as maiores pelo nome.',
             'Redundância (e-mail, E2) — a composição 2/2 (itens menores) sai: os mesmos itens estão nas páginas item a item, agora com o grupo de cada um.']
    for n, t in enumerate(notas):
        d.text((40, y + 20 + n * 30), t, font=fonte('Regular', 19, 'O'), fill=NAVY)
    img = img.crop((0, 0, W, y + 20 + len(notas) * 30 + 30))
    img.save(destino); os.remove(tmp)
    print('ok ->', destino, img.size)


if __name__ == '__main__':
    main(sys.argv[1])
