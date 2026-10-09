"""Rascunhos V16 (demais variações da manutenção) e V19 (itens de cada grupo em quadros) — Mega Curitiba.
Rodar de dentro de orcamento-2027. Saída: argv[1] (pasta)."""
import json, os, sys, re
from PIL import Image, ImageDraw, ImageFont

SAIDA = sys.argv[1]
FON = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')
W, H = 1280, 720
VERDE, OURO, VERM, CINZA = '#00594F', '#AF9800', '#A85450', '#94A3B8'
REC, PROJ = '#3C8C7F', '#D9CB82'
FUNDO, LINHA, ZEBRA, CLARO = '#F8FAF9', '#E3E8E6', '#F2F6F5', '#D7E8E4'
TXT, TXT2 = '#1F2A2E', '#5B6B70'


def F(px, b=False):
    return ImageFont.truetype(os.path.join(FON, 'segoeuib.ttf' if b else 'segoeui.ttf'), int(px))


def brl(v, sinal=False):
    s = f'{abs(v):,.0f}'.replace(',', '.')
    p = ('+' if v > 0 else '−' if v < 0 else '') if sinal else ('−' if v < 0 else '')
    return f'{p}R$ {s}'


def mil(v, sinal=True):
    s = f'{abs(v) / 1000:,.0f}'.replace(',', '.')
    return (('+' if v >= 0 else '−') if sinal else '') + f'R$ {s} mil'


def corta(d, t, f, larg):
    if d.textlength(t, font=f) <= larg: return t
    while t and d.textlength(t + '…', font=f) > larg: t = t[:-1]
    return t.rstrip() + '…'


def base(titulo, sub, fonte):
    im = Image.new('RGB', (W, H), FUNDO); d = ImageDraw.Draw(im)
    d.rectangle([53, 28, 62, 92], fill=OURO)
    d.text((90, 26), titulo, font=F(40, True), fill=VERDE)
    d.text((91, 74), sub, font=F(16), fill=TXT2)
    d.line([53, 114, 1227, 114], fill=LINHA, width=2)
    d.text((66, 690), fonte, font=F(12), fill='#9AA5A8')
    d.text((1227, 690), 'RASCUNHO', font=F(12, True), fill=VERM, anchor='ra')
    return im, d


def card(d, x0, y0, x1, y1):
    d.rounded_rectangle([x0, y0, x1, y1], radius=22, fill='white', outline=LINHA)


# ---------------------------------------------------------------- V16
def v16():
    L = json.load(open('ferramentas/saida/ritmo_linhas_curitiba.json', encoding='utf-8'))['linhas']
    met = json.load(open('teste/fixture_metragem_curitiba.json', encoding='utf-8'))
    lin = [r for r in met if r and str(r[0]).replace('\xa0', ' ').strip() == 'Manutenção de imóveis'][0]
    ritmo, orc = -lin[3], -lin[4]
    ADI = ('DEFENSAS METÁLICAS', '4º TORNIQUETE', '4° TORNIQUETE')
    adi = [l for l in L if any(a in (l.get('d27') or '') for a in ADI) and not l.get('v26')]
    tot_adi = sum(l['v27'] for l in adi)
    resto = [l for l in L if l not in adi]
    v26 = lambda l: l.get('v26') or 0
    v27 = lambda l: l.get('v27') or 0
    novos = [l for l in resto if not v26(l) and v27(l)]
    some = [l for l in resto if v26(l) and not v27(l)]
    pares = [l for l in resto if v26(l) and v27(l)]
    soma_itens26 = sum(v26(l) for l in L)
    blocos = [
        ('Itens novos em 2027', f'{len(novos)} itens sem gasto parecido no ritmo 2026', sum(v27(l) for l in novos)),
        ('Mesmo serviço nos dois anos', f'{len(pares)} pares (sem as obras adiadas): reajuste, área nova, escopo', sum(v27(l) - v26(l) for l in pares)),
        ('Gastos de 2026 que não se repetem', f'{len(some)} itens do ritmo 2026 sem item em 2027', -sum(v26(l) for l in some)),
        ('Ritmo da METRAGEM acima dos itens', 'a soma item a item fica abaixo da METRAGEM (pendência G7)', -(ritmo - soma_itens26)),
    ]
    demais = orc - ritmo - tot_adi
    assert abs(sum(b[2] for b in blocos) - demais) < 1, (sum(b[2] for b in blocos), demais)
    print('V16 demais', demais, [round(b[2]) for b in blocos], 'adiadas', tot_adi)

    # o R$/m² das demais variações sai do slide 17 (a conta separa a área de cada ano)
    j17 = json.load(open('ferramentas/saida/formas_curitiba.json', encoding='utf-8'))['slides'][17]['formas']
    m2_demais = [f['texto'] for f in j17 if re.fullmatch(r'[+−]R\$ [\d,]+/m²', (f.get('texto') or '').replace('\xa0', ' '))][1]
    im, d = base('Por que a manutenção sobe: as demais variações',
                 f'Além das obras adiadas, {mil(demais)} ({m2_demais} ao mês) · Ritmo 2026 → Orç 2027, item a item · Mega Curitiba',
                 'Fonte: planilha de comparação RITMO 2026 x ORÇ 2027 (pares do gestor) e METRAGEM-COND de 08/10/2026 · Mega Curitiba')
    # --- esquerda: degraus
    card(d, 53, 132, 640, 670)
    d.text((88, 152), 'DE ONDE VÊM OS ' + mil(demais).upper(), font=F(15, True), fill='#444')
    acs = [0]; [acs.append(acs[-1] + b[2]) for b in blocos]
    escala = 470 / (max(acs) - min(acs))
    zero = 100 - min(acs) * escala  # x do ritmo 2026 no eixo das barras
    y = 200; acum = 0
    for nome, expl, v in blocos:
        d.text((88, y), nome, font=F(16, True), fill=TXT)
        d.text((88, y + 22), corta(d, expl, F(12.5), 520), font=F(12.5), fill=TXT2)
        yb = y + 48
        x_ini = zero + acum * escala; acum += v; x_fim = zero + acum * escala
        cor = VERM if v > 0 else VERDE
        d.rectangle([min(x_ini, x_fim), yb, max(x_ini, x_fim), yb + 22], fill=cor)
        d.text((604, y - 2), mil(v), font=F(19, True), fill=cor, anchor='ra')
        y += 100
    d.line([zero, 245, zero, y - 25], fill='#B8C2C0', width=1)
    d.text((zero, y - 22), 'ritmo 2026', font=F(11), fill=TXT2, anchor='ma')
    # total
    d.rounded_rectangle([74, 600, 620, 650], radius=10, fill='#EEF5F3'); d.rectangle([74, 600, 80, 650], fill=OURO)
    d.text((100, 606), f'= Demais variações: {mil(demais)}', font=F(16, True), fill=VERDE)
    d.text((100, 629), f'Com as obras adiadas ({mil(tot_adi)}), a alta toda da manutenção: {mil(orc - ritmo)}', font=F(12.5), fill=TXT2)

    # --- direita: maiores altas e quedas
    card(d, 660, 132, 1227, 670)
    d.text((694, 152), 'MAIORES ALTAS E QUEDAS, ITEM A ITEM', font=F(15, True), fill='#444')
    def nome(l):
        a, b = (l.get('d26') or '').strip(), (l.get('d27') or '').strip()
        n = b if b else a
        n = re.sub(r'\s*#\d+', '', n); n = n.split(' + ')[0]
        return n[:1].upper() + n[1:].lower()
    altas = sorted(resto, key=lambda l: -(v27(l) - v26(l)))[:5]
    quedas = sorted(resto, key=lambda l: v27(l) - v26(l))[:5]
    xs = [680, 1010, 1100, 1204]
    def cab(y, t, cor):
        d.rectangle([676, y, 1210, y + 26], fill=cor)
        d.text((xs[0] + 8, y + 5), t, font=F(12, True), fill='white')
        for x, h in zip(xs[1:], ['RITMO 2026', 'ORÇ 2027', 'Δ']):
            d.text((x, y + 5), h, font=F(12, True), fill='white', anchor='ra')
    def linhas(y, ls):
        for i, l in enumerate(ls):
            if i % 2: d.rectangle([676, y, 1210, y + 24], fill=ZEBRA)
            d.text((xs[0] + 8, y + 4), corta(d, nome(l), F(12.5), 245), font=F(12.5), fill=TXT)
            d.text((xs[1], y + 4), brl(v26(l)) if v26(l) else '–', font=F(12.5), fill=TXT, anchor='ra')
            d.text((xs[2], y + 4), brl(v27(l)) if v27(l) else '–', font=F(12.5), fill=TXT, anchor='ra')
            dv = v27(l) - v26(l)
            d.text((xs[3], y + 4), brl(dv, True), font=F(12.5, True), fill=VERM if dv > 0 else VERDE, anchor='ra')
            y += 24
        return y
    y = linhas(cab(185, 'SOBEM', VERM) or 211, altas)
    y = linhas(cab(y + 18, 'CAEM', VERDE) or y + 44, quedas)
    d.text((694, y + 18), 'Os dez itens somam ' + mil(sum(v27(l) - v26(l) for l in altas + quedas)) +
           '; o resto se espalha em ' + str(len(resto) - 10) + ' itens.', font=F(12.5), fill=TXT2)
    d.text((694, y + 38), 'Sem par = o gestor não ligou o item de 2027 a um gasto de 2026.', font=F(12.5), fill=TXT2)
    p = os.path.join(SAIDA, 'RASCUNHO - V16 - DEMAIS VARIAÇÕES DA MANUTENÇÃO - MEGA CURITIBA.png')
    im.save(p); print('ok', p)


# ---------------------------------------------------------------- V19
def itens_do_deck():
    j = json.load(open('ferramentas/saida/formas_curitiba.json', encoding='utf-8'))
    grupos, atual = [], None
    for s in (19, 20):
        fs = [f for f in j['slides'][s]['formas'] if f.get('texto') and f['tipo'] == 'TEXT_BOX' and 85 < f['y'] < 380]
        for lado in (0, 1):
            col = [f for f in fs if (f['x'] < 330) == (lado == 0)]
            nomes = sorted([f for f in col if f['w'] > 150], key=lambda f: f['y'])
            vals = [f for f in col if f['texto'].startswith('R$')]
            for n in nomes:
                v = min(vals, key=lambda f: abs(f['y'] - n['y']), default=None)
                t = n['texto']
                if '·' in t or '(cont.)' in t:
                    if '(cont.)' in t: continue
                    atual = {'nome': t.split('·')[0].strip(), 'itens': [], 'total': v['texto']}; grupos.append(atual)
                else:
                    atual['itens'].append((t, v['texto']))
    return grupos


def v19():
    G = itens_do_deck()
    for g in G: print('V19', g['nome'], len(g['itens']), g['total'])
    cores = {'CONTRATOS': (VERDE, 'white'), 'RECORRENTE (6+ MESES)': (REC, 'white'),
             'MANUTENÇÃO PONTUAL': (OURO, 'white'), 'PROJETOS': (PROJ, VERDE)}
    leg = {'CONTRATOS': 'Serviço com contrato fechado com o fornecedor',
           'RECORRENTE (6+ MESES)': 'Se repete ao longo do ano (6+ meses, semestral ou anual)',
           'MANUTENÇÃO PONTUAL': 'Serviço em poucos meses para manter o que já existe',
           'PROJETOS': 'Obra ou compra nova, que não existia'}
    total = sum(int(re.sub(r'\D', '', g['total'])) for g in G)
    RH = 19.5

    def quadro(d, g, x0, y0, x1, itens, cont=False, n_col=1, RH=RH, fs=12):
        cor, ct = cores[g['nome']]
        n = len(itens); por_col = -(-n // n_col)
        y1 = y0 + 62 + por_col * RH + 10
        d.rounded_rectangle([x0, y0, x1, y1], radius=14, fill='white', outline=LINHA)
        d.rounded_rectangle([x0, y0, x1, y0 + 54], radius=14, fill=cor); d.rectangle([x0, y0 + 30, x1, y0 + 54], fill=cor)
        v = int(re.sub(r'\D', '', g['total']))
        nome = {'RECORRENTE (6+ MESES)': 'RECORRENTE'}.get(g['nome'], g['nome']) + (' (cont.)' if cont else '')
        d.text((x0 + 16, y0 + 7), nome, font=F(17, True), fill=ct)
        d.text((x0 + 16, y0 + 31), leg[g['nome']], font=F(12.5), fill=ct)
        d.text((x1 - 16, y0 + 5), g['total'], font=F(19, True), fill=ct, anchor='ra')
        d.text((x1 - 16, y0 + 31), f"{len(g['itens'])} itens · {v / total * 100:.0f}% da manutenção".replace('.', ','),
               font=F(12.5), fill=ct, anchor='ra')
        larg = (x1 - x0 - 20) / n_col
        for i, (t, val) in enumerate(itens):
            c, r = divmod(i, por_col)
            xa = x0 + 10 + c * larg; y = y0 + 60 + r * RH
            if r % 2: d.rectangle([xa, y, xa + larg - 8, y + RH], fill=ZEBRA)
            d.text((xa + 8, y + (RH - fs) / 2 - 2), corta(d, t, F(fs), larg - 100), font=F(fs), fill=TXT)
            d.text((xa + larg - 16, y + (RH - fs) / 2 - 2), val, font=F(fs, True), fill=TXT, anchor='ra')
        return y1

    g = {x['nome']: x for x in G}
    sub = f'{sum(len(x["itens"]) for x in G)} itens do Orç 2027 · R$ {total:,}'.replace(',', '.') + ' · Mega Curitiba'
    fonte = 'Contrato: cadastro de contratos · recorrente: 6+ meses, semestral ou anual · projeto: obra ou compra nova · pontual: o resto · Mega Curitiba'
    # página 1: contratos + recorrente | projetos
    im, d = base('Manutenção: os itens de cada grupo (1/2)', sub, fonte)
    y = quadro(d, g['CONTRATOS'], 53, 132, 636, g['CONTRATOS']['itens'])
    quadro(d, g['RECORRENTE (6+ MESES)'], 53, y + 14, 636, g['RECORRENTE (6+ MESES)']['itens'])
    proj = g['PROJETOS']['itens']
    lv = [p for p in proj if 'LINHA DE VIDA VERTICAL' in p[0]]
    proj2 = [p for p in proj if p not in lv]
    if lv:
        v = int(re.sub(r'\D', '', lv[0][1]))
        proj2.insert(1, (f'LINHA DE VIDA VERTICAL NAS ESCADAS DE ACESSO — AMZ 1 A {len(lv)} ({len(lv)} × R$ {v:,})'.replace(',', '.'),
                         f'R$ {v * len(lv):,}'.replace(',', '.')))
        proj2.sort(key=lambda p: -int(re.sub(r'\D', '', p[1])))
    quadro(d, g['PROJETOS'], 652, 132, 1227, proj2)
    p1 = os.path.join(SAIDA, 'RASCUNHO - V19 - ITENS DE CADA GRUPO EM QUADROS (1 de 2) - MEGA CURITIBA.png')
    im.save(p1); print('ok', p1)
    # página 2: pontual em duas colunas
    im, d = base('Manutenção: os itens de cada grupo (2/2)', sub, fonte)
    quadro(d, g['MANUTENÇÃO PONTUAL'], 53, 132, 1227, g['MANUTENÇÃO PONTUAL']['itens'], n_col=2, RH=29, fs=13.5)
    p2 = os.path.join(SAIDA, 'RASCUNHO - V19 - ITENS DE CADA GRUPO EM QUADROS (2 de 2) - MEGA CURITIBA.png')
    im.save(p2); print('ok', p2)


v16(); v19()
