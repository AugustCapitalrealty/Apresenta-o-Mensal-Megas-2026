"""Rascunho v2 (07/10/2026): gráfico do Custo por m² com a avaliação da analista + calendário da "Previsão de entrega".

Gráfico — o que mudou da v1 (avaliação da analista):
  1. mensagem honesta, nas duas faces: +10% sobre o ritmo 2026 no ano, mas 11% abaixo da saída de 2026 (out–dez);
  2. ritmo 2026 contínuo até o último mês fechado e tracejado na projeção; a faixa diz "projeção";
  3. nenhum texto em ouro nem em cinza claro (contraste); o ouro fica só na linha;
  4. fonte mínima de 6,5 pt;
  5. rótulo do Orç vai para baixo quando outra linha passa logo acima (dez);
  6. os 3 pontos do ritmo em out–dez com valor;
  7. à direita só os nomes das 3 linhas; a linha da média saiu (está no painel e na tabela);
  8. grade 2,50–4,00, faixa só na altura do gráfico, ritmo no verde da marca.
Calendário — o card "Previsão de entrega" das categorias vira 12 meses em 4×3, com o valor do mês e a cor pela
intensidade; mês sem entrega fica vazio; o destaque só aparece quando há pico de verdade (todo mês igual = contrato).

Só formas que o gerador desenha no Slides (linhas, círculos, retângulos, texto).
Uso (de dentro de orcamento-2027): python ferramentas/rascunhos/grafico_m2_rascunho_v2.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, '..', 'fontes')
SAIDA = os.path.join(AQUI, 'grafico_m2_rascunho_v2.png')

MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
REAL25 = [2.44, 2.87, 2.98, 2.89, 2.89, 2.63, 2.83, 2.94, 3.08, 2.76, 2.71, 3.53]
RIT26 = [2.40, 3.49, 3.43, 3.57, 3.02, 3.18, 3.36, 3.17, 2.98, 4.06, 4.39, 4.36]
ORC27 = [3.49, 3.51, 3.95, 3.83, 3.83, 4.01, 4.24, 3.74, 3.82, 4.18, 3.69, 3.32]
FECHADO = 9                # último mês fechado do ritmo (set) — no gerador viria da configuração

DARK, GOLD, BODY, CINZA, LINHA = '#00594F', '#AF9800', '#4B5250', '#6B7370', '#E3E8E6'
TINT, TINT2, MED, RED, BG = '#EEF5F3', '#D7E8E4', '#3C8C7F', '#B5524E', '#F8FAF9'
REAL_COR = '#A7AEAC'

S = 3
K = 1920 / 720 * S
X_JAN, PASSO = 97.9, 44.35
Y0, Y1 = 18, 108
VMIN, VMAX = 2.25, 4.55


def fonte(fam, peso, pt):
    arq = {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]
    f = ImageFont.truetype(os.path.join(FONTES, arq), round(pt * K))
    f.set_variation_by_name(peso)
    return f


def px(x, y): return (x * K, y * K)
def X(i): return X_JAN + i * PASSO
def Y(v): return Y1 - (v - VMIN) / (VMAX - VMIN) * (Y1 - Y0)
def br(v): return ('%.2f' % v).replace('.', ',')


def tracejado(d, pts, cor, larg, tam=4, vao=3):
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        dx, dy = xb - xa, yb - ya
        L = (dx * dx + dy * dy) ** .5
        t = 0
        while t < L:
            t2 = min(t + tam, L)
            d.line([px(xa + dx * t / L, ya + dy * t / L), px(xa + dx * t2 / L, ya + dy * t2 / L)], fill=cor, width=round(larg * K))
            t += tam + vao


def linha(d, pts, cor, larg):
    d.line([px(x, y) for x, y in pts], fill=cor, width=round(larg * K), joint='curve')


def texto(d, x, y, s, f, cor, anc='la'):
    d.text(px(x, y), s, font=f, fill=cor, anchor=anc)


def ret(d, x, y, w, h, cor, borda=None, raio=0, larg=.6):
    d.rounded_rectangle([px(x, y), px(x + w, y + h)], radius=raio * K, fill=cor, outline=borda,
                        width=round(larg * K) if borda else 0)


def seta(d, x, y, sobe, cor):
    d.polygon([px(x, y + 2.5), px(x + 5.5, y + 2.5), px(x + 2.75, y - 2.5)] if sobe else
              [px(x, y - 2.5), px(x + 5.5, y - 2.5), px(x + 2.75, y + 2.5)], fill=cor)


# ------------------------------------------------------------------ gráfico
def grafico():
    CW, CH = 660, 125
    im = Image.new('RGB', (round(CW * K), round(CH * K)), 'white')
    d = ImageDraw.Draw(im)
    xa, xb = X(0) - PASSO / 2, X(11) + PASSO / 2

    # Faixa da projeção (só na altura do gráfico)
    d.rectangle([px(X(FECHADO) - PASSO / 2, Y0 - 6), px(xb, Y1)], fill=TINT)
    texto(d, (X(FECHADO) + X(11)) / 2, Y1 + 3, 'out–dez 2026 = projeção do ritmo', fonte('O', 'SemiBold', 6.5), DARK, 'ma')

    for v in (2.5, 3.0, 3.5, 4.0):
        d.line([px(xa, Y(v)), px(xb, Y(v))], fill=LINHA, width=round(.5 * K))
        texto(d, xa + 1, Y(v) - 1, br(v), fonte('O', 'Regular', 6), CINZA, 'ld')

    # Real 2025 (contexto), ritmo 2026 (fechado contínuo, projeção tracejada), Orç 2027 na frente
    tracejado(d, [(X(i), Y(v)) for i, v in enumerate(REAL25)], REAL_COR, 1.1)
    pr = [(X(i), Y(v)) for i, v in enumerate(RIT26)]
    linha(d, pr[:FECHADO], DARK, 1.6)
    tracejado(d, pr[FECHADO - 1:], DARK, 1.6, 3, 2)
    linha(d, [(X(i), Y(v)) for i, v in enumerate(ORC27)], GOLD, 2.6)

    for i in range(FECHADO, 12):          # valores do ritmo na projeção
        r = 1.7
        d.ellipse([px(X(i) - r, Y(RIT26[i]) - r), px(X(i) + r, Y(RIT26[i]) + r)], fill='white', outline=DARK, width=round(1 * K))
        if 0 < ORC27[i] - RIT26[i] <= 0.30:   # Orç logo acima → valor do ritmo embaixo
            texto(d, X(i) + 3, Y(RIT26[i]) + 3, br(RIT26[i]), fonte('M', 'Bold', 6.5), DARK, 'la')
        else:
            texto(d, X(i), Y(RIT26[i]) - 4, br(RIT26[i]), fonte('M', 'Bold', 6.5), DARK, 'md')

    for i, v in enumerate(ORC27):
        r = 2.7
        d.ellipse([px(X(i) - r, Y(v) - r), px(X(i) + r, Y(v) + r)], fill='white', outline=GOLD, width=round(1.4 * K))
        # outra linha logo acima (até 0,30) → rótulo embaixo
        acima = any(0 < s[i] - v <= 0.30 for s in (RIT26, REAL25))
        if i == 9: acima = False          # out: o ritmo cruza por baixo
        if acima:
            texto(d, X(i), Y(v) + 4.5, br(v), fonte('M', 'Bold', 7), BODY, 'ma')
        else:
            texto(d, X(i), Y(v) - 4.5, br(v), fonte('M', 'Bold', 7), BODY, 'md')

    # Nome das linhas à direita, com espaço mínimo
    xr = xb + 4
    alvo = sorted([(Y(RIT26[11]), 'Ritmo 2026', DARK), (Y(REAL25[11]), 'Real 2025', CINZA), (Y(ORC27[11]), 'Orç 2027', BODY)])
    ult = -99
    for y, s, cor in alvo:
        y = max(y, ult + 9); ult = y
        texto(d, xr, y, s, fonte('O', 'Bold', 6.8), cor, 'lm')
    # amostra da cor ao lado do nome do Orç (o ouro só como traço)
    yo = [y for y, s, c in alvo if s == 'Orç 2027'][0]

    # Painel da esquerda: os números que sustentam a conclusão
    x0 = 8
    texto(d, x0, 8, 'ORÇ 2027 · MÉDIA', fonte('M', 'Bold', 5.6), CINZA)
    texto(d, x0, 15, 'R$ 3,80/m²', fonte('M', 'Bold', 10), DARK)
    d.line([px(x0, 33), px(x0 + 66, 33)], fill=LINHA, width=round(.6 * K))
    texto(d, x0, 38, '× ritmo 2026 (3,45)', fonte('O', 'Regular', 6.5), BODY)
    seta(d, x0, 50.5, True, RED); texto(d, x0 + 8, 46, '10%', fonte('O', 'Bold', 9), RED)
    d.line([px(x0, 60), px(x0 + 66, 60)], fill=LINHA, width=round(.6 * K))
    texto(d, x0, 65, '× saída de 2026', fonte('O', 'Regular', 6.5), BODY)
    texto(d, x0, 72.5, 'out–dez (4,27)', fonte('O', 'Regular', 6.5), BODY)
    seta(d, x0, 85.5, False, DARK); texto(d, x0 + 8, 81, '11%', fonte('O', 'Bold', 9), DARK)
    texto(d, x0, 96, 'saída 2026 é projeção;', fonte('O', 'Regular', 6.5), CINZA)
    texto(d, x0, 104, 'degrau a explicar', fonte('O', 'Regular', 6.5), CINZA)
    return im.resize((round(CW * K / S), round(CH * K / S)), Image.LANCZOS)


# ------------------------------------------------------------------ calendário
def compacto(v):
    return ('%.1f mil' % (v / 1000)).replace('.', ',') if v < 1e6 else ('%.2f mi' % (v / 1e6)).replace('.', ',')


def misturar(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(a[k] + (b[k] - a[k]) * t) for k in range(3))


def calendario(meses, legenda):
    """Card 168 × 150 pt, como o painel do slide de categoria."""
    CW, CH = 168, 150
    im = Image.new('RGB', (round((CW + 12) * K), round((CH + 12) * K)), BG)
    d = ImageDraw.Draw(im)
    ox, oy = 6, 6
    ret(d, ox, oy, CW, CH, 'white', LINHA, 7)
    texto(d, ox + 12, oy + 11, 'PREVISÃO DE ENTREGA', fonte('M', 'Bold', 7.5), BODY)

    vals = [v for v in meses if v > 0.5]
    mx, mn = max(vals), min(vals)
    plano = mx / mn < 1.10 and len(vals) == 12
    iPico = meses.index(mx)
    gx, gy, gw = ox + 12, oy + 26, CW - 24
    cw, ch, g = (gw - 3 * 4) / 4, 25, 4
    for i, v in enumerate(meses):
        cx, cy = gx + (i % 4) * (cw + g), gy + (i // 4) * (ch + g)
        if v <= 0.5:
            ret(d, cx, cy, cw, ch, 'white', LINHA, 3)
            cor_m, cor_v, txt = CINZA, CINZA, '—'
        else:
            t = 0.35 if plano else 0.15 + 0.85 * (v - mn) / ((mx - mn) or 1)
            pico = (not plano) and i == iPico
            fundo = DARK if pico else misturar(TINT, MED, t * 0.75)
            ret(d, cx, cy, cw, ch, fundo, None, 3)
            claro = pico or t > 0.7
            cor_m, cor_v = ('white', 'white') if claro else (BODY, DARK)
            txt = compacto(v)
        texto(d, cx + 3.5, cy + 3, MESES[i], fonte('M', 'Bold', 5.6), cor_m)
        texto(d, cx + 3.5, cy + 12, txt, fonte('O', 'Bold', 7), cor_v)
    yl = gy + 3 * (ch + g) + 2
    for k, s in enumerate(legenda):
        texto(d, gx, yl + k * 8.5, s, fonte('O', 'Bold' if k == 0 else 'Regular', 6.5), DARK if k == 0 else BODY)
    return im.resize((round((CW + 12) * K / S), round((CH + 12) * K / S)), Image.LANCZOS)


def montar():
    g = grafico()
    plano = [139000 / 12] * 12
    pico = [8200, 8200, 48500, 8200, 8200, 8200, 8200, 31000, 8200, 8200, 0, 8200]
    c1 = calendario(plano, ['R$ 11,6 mil todo mês', 'contrato Miriad (cobertura)'])
    c2 = calendario(pico, ['Pico em MAR: R$ 48,5 mil', 'avulso de cobertura; NOV sem entrega'])

    tt = ImageFont.truetype(os.path.join(FONTES, 'Montserrat[wght].ttf'), 34); tt.set_variation_by_name('Bold')
    st = ImageFont.truetype(os.path.join(FONTES, 'OpenSans[wdth,wght].ttf'), 24); st.set_variation_by_name('Regular')
    W = 1920
    h = 20 + 50 + g.height + 60 + 50 + c1.height + 40
    tela = Image.new('RGB', (W, h), BG)
    d = ImageDraw.Draw(tela)
    y = 20
    d.text((40, y), 'GRÁFICO DO CUSTO POR M² — v2 (com a avaliação da analista)', font=tt, fill=DARK)
    tela.paste(g, (80, y + 50)); y += 50 + g.height + 60
    d.text((40, y), 'PREVISÃO DE ENTREGA — CALENDÁRIO', font=tt, fill=DARK)
    tela.paste(c1, (80, y + 50))
    tela.paste(c2, (80 + c1.width + 60, y + 50))
    d.text((80, y + 50 + c1.height + 4), 'Miriad (Curitiba): contrato, todo mês igual', font=st, fill=BODY)
    d.text((80 + c1.width + 60, y + 50 + c1.height + 4), 'exemplo ilustrativo: categoria com avulsos', font=st, fill=BODY)
    tela = tela.crop((0, 0, W, y + 50 + c1.height + 40))
    tela.save(SAIDA)
    print('ok ->', SAIDA)


if __name__ == '__main__':
    montar()
