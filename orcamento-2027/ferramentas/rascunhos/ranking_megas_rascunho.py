"""
Rascunho do V4 (gestor, 08/10/2026): ranking dos Megas lado a lado — contas do
maior para o menor R$/m² ao mês de Facilities, só o R$/m² do Orç 2027 de cada
Mega, sem variação. Lê ferramentas/saida/comparativo_m2.json (gerado por
`PREVIA=ferramentas/saida node teste/teste_orcamento.js`) e grava o PNG em
"01 - CONTROLE DA APRESENTAÇÃO".

Uso: python ferramentas/rascunhos/ranking_megas_rascunho.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..'))
d = json.load(open(os.path.join(RAIZ, 'ferramentas', 'saida', 'comparativo_m2.json'), encoding='utf-8'))
SAIDA = os.path.normpath(os.path.join(RAIZ, '..', '..', '01 - CONTROLE DA APRESENTAÇÃO',
                                      'RASCUNHO - V4 - RANKING DOS MEGAS LADO A LADO.png'))

MEGAS = ['ESTEIO', 'ITAJAI', 'CURITIBA']
NOME = {'ESTEIO': 'Mega Esteio', 'ITAJAI': 'Mega Itajaí', 'CURITIBA': 'Mega Curitiba', 'FACILITIES': 'Facilities'}
COR = {'ESTEIO': '#1F3B73', 'ITAJAI': '#3E6DB5', 'CURITIBA': '#00594F', 'FACILITIES': '#9AA5B1'}
NAVY, TXT, CINZA, LINHA = '#13214A', '#334155', '#64748B', '#E2E8F0'

linhas = [l for l in d['linhas'] if l['tipo'] == 'item']
linhas = [l for l in linhas if l['m']['FACILITIES']['orc'] >= 0.005]
linhas.sort(key=lambda l: -l['m']['FACILITIES']['orc'])

W, H = 1600, 900
im = Image.new('RGB', (W, H), '#FFFFFF')
dr = ImageDraw.Draw(im)
F = lambda n, b=False: ImageFont.truetype('C:/Windows/Fonts/' + ('segoeuib.ttf' if b else 'segoeui.ttf'), n)

# cabeçalho no padrão do deck
dr.rectangle([60, 46, 68, 118], fill=NAVY)
dr.text((88, 40), 'Ranking dos Megas — R$/m² ao mês por conta', font=F(40, True), fill=NAVY)
dr.text((90, 92), 'Orçamento 2027 · contas do maior para o menor custo por m² de Facilities · RASCUNHO V4',
        font=F(20), fill=CINZA)
dr.line([60, 134, W - 60, 134], fill=LINHA, width=2)

# legenda
lx = W - 60
for k in ['FACILITIES'] + MEGAS[::-1]:
    t = NOME[k]; tw = dr.textlength(t, font=F(17)); lx -= tw + 34
    dr.rectangle([lx, 98, lx + 16, 114], fill=COR[k]); dr.text((lx + 22, 93), t, font=F(17), fill=TXT)

top, base = 186, H - 60
n = len(linhas)
rowH = min(40, (base - top) / n)
xNome, xBar, xFim = 110, 470, W - 300
vmax = max(max(l['m'][k]['orc'] for k in MEGAS + ['FACILITIES']) for l in linhas)
barH = max(4, (rowH - 8) / 4)
for i, l in enumerate(linhas):
    y = top + i * rowH
    if i % 2 == 0: dr.rectangle([60, y, W - 60, y + rowH], fill='#F8FAFC')
    dr.text((70, y + rowH / 2), str(i + 1), font=F(17, True), fill=CINZA, anchor='lm')
    dr.text((xNome, y + rowH / 2), l['nome'], font=F(18, True), fill=NAVY, anchor='lm')
    for j, k in enumerate(MEGAS + ['FACILITIES']):
        v = l['m'][k]['orc']
        yb = y + 4 + j * barH
        w = (xFim - xBar) * v / vmax
        dr.rectangle([xBar, yb, xBar + max(1, w), yb + barH - 1], fill=COR[k])
    # valores à direita: Esteio · Itajaí · Curitiba | Facilities
    vals = ['%.2f' % l['m'][k]['orc'] for k in MEGAS + ['FACILITIES']]
    mx = max(MEGAS, key=lambda k: l['m'][k]['orc'])
    for j, k in enumerate(MEGAS + ['FACILITIES']):
        x = xFim + 30 + j * 62
        dr.text((x + 50, y + rowH / 2), vals[j].replace('.', ','), font=F(16, k == mx or k == 'FACILITIES'),
                fill=COR[k] if k != 'FACILITIES' else NAVY, anchor='rm')
for j, k in enumerate(MEGAS + ['FACILITIES']):
    x = xFim + 30 + j * 62
    dr.text((x + 50, top - 10), ['EST', 'ITJ', 'CWB', 'FAC'][j], font=F(14, True), fill=CINZA, anchor='rb')

dr.text((60, H - 36), 'Rascunho para aprovação · R$/m² ao mês do Orç 2027 (área implícita da METRAGEM de cada Mega) · '
        'em destaque o Mega mais caro da linha · sem a variação (gestor, 08/10/2026)', font=F(15), fill=CINZA)
im.save(SAIDA)
print(SAIDA, n, 'contas')
