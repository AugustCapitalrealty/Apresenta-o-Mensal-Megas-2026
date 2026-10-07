"""Rascunhos (07/10/2026) das próximas oportunidades de gráfico — um PNG por slide, no tamanho do slide (720×405 pt).

  1  Os Megas lado a lado (abertura do Facilities): cards do total + 5 painéis de barras por Mega, com o ritmo marcado
  2  Ponte ritmo 2026 → Orç 2027: alta em vermelho, redução em verde (hoje as duas são verdes)
  3  Manutenção de imóveis, mês a mês: Orç 2027 em barras, ritmo 2026 em linha (tracejada na projeção), Orç 2026 fino
  4  Distribuição mensal: cada barra dividida em contratos (base fixa) e avulsos (os picos)

Só formas que o gerador desenha no Slides. Números: Mega Curitiba e o comparativo dos Megas, das fixtures do teste
(PREVIA=ferramentas/saida node teste/teste_orcamento.js grava ferramentas/saida/dados_rascunhos_curitiba.json).
Uso (de dentro de orcamento-2027): python ferramentas/rascunhos/graficos_rascunho.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, '..', 'fontes')
DADOS = os.path.join(AQUI, '..', 'saida', 'dados_rascunhos_curitiba.json')
S = 2
K = 1920 / 720 * S
W, H = 720, 405
MX = 30
MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
SOBE, DESCE = '#A85450', '#4E7B5F'

DEM = dict(dark='#00594F', med='#3C8C7F', light='#AF9800', body='#4B5250', main='#262626', muted='#6B7370',
           linhas='#E3E8E6', bg='#F8FAF9', tint='#EEF5F3', tint2='#D7E8E4', titulo='G')
CAP = dict(dark='#151E49', med='#003D7B', light='#065CA9', body='#475569', main='#1E293B', muted='#64748B',
           linhas='#E2E8F0', bg='#F8FAFC', tint='#EFF6FF', tint2='#DBEAFE', titulo='M')


def fonte(fam, peso, pt):
    arq = {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf', 'G': 'EBGaramond[wght].ttf'}[fam]
    f = ImageFont.truetype(os.path.join(FONTES, arq), round(pt * K))
    f.set_variation_by_name(peso)
    return f


class Slide:
    def __init__(self, m, titulo, sub, rodape):
        self.m = m
        self.im = Image.new('RGB', (round(W * K), round(H * K)), m['bg'])
        self.d = ImageDraw.Draw(self.im)
        self.ret(MX, 38, 3.5, 24, m['light'])
        if m['titulo'] == 'G':
            self.txt(MX + 12, 34, titulo, fonte('G', 'SemiBold', 22), m['dark'])
        else:
            self.txt(MX + 12, 35, titulo, fonte('M', 'Bold', 18), m['dark'])
        self.txt(MX + 12, 58, sub, fonte('O', 'Regular', 8), m['body'])
        self.d.line([self.p(MX, 72), self.p(W - MX, 72)], fill=m['linhas'], width=round(.6 * K))
        self.txt(MX + 6, H - 16, rodape, fonte('O', 'Regular', 6), m['muted'])

    def p(self, x, y): return (x * K, y * K)

    def txt(self, x, y, s, f, cor, anc='la'):
        self.d.text(self.p(x, y), s, font=f, fill=cor, anchor=anc)

    def ret(self, x, y, w, h, cor, borda=None, raio=0):
        self.d.rounded_rectangle([self.p(x, y), self.p(x + w, y + h)], radius=raio * K, fill=cor, outline=borda,
                                 width=round(.6 * K) if borda else 0)

    def card(self, x, y, w, h, rotulo=None):
        self.ret(x, y, w, h, 'white', self.m['linhas'], 6)
        if rotulo:
            self.txt(x + 12, y + 9, rotulo, fonte('M', 'Bold', 7), self.m['body'])

    def linha(self, pts, cor, larg, tracejado=False):
        if not tracejado:
            self.d.line([self.p(*q) for q in pts], fill=cor, width=round(larg * K), joint='curve')
            return
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            dx, dy = xb - xa, yb - ya
            L = (dx * dx + dy * dy) ** .5 or 1
            t = 0
            while t < L:
                t2 = min(t + 3, L)
                self.d.line([self.p(xa + dx * t / L, ya + dy * t / L), self.p(xa + dx * t2 / L, ya + dy * t2 / L)],
                            fill=cor, width=round(larg * K))
                t += 5

    def bola(self, x, y, r, cor, larg=1):
        self.d.ellipse([self.p(x - r, y - r), self.p(x + r, y + r)], fill='white', outline=cor, width=round(larg * K))

    def seta(self, x, y, sobe, cor, t=4.5):
        h = t * .9
        pts = [(x, y + h / 2), (x + t, y + h / 2), (x + t / 2, y - h / 2)] if sobe else \
              [(x, y - h / 2), (x + t, y - h / 2), (x + t / 2, y + h / 2)]
        self.d.polygon([self.p(*q) for q in pts], fill=cor)

    def salvar(self, nome):
        arq = os.path.join(AQUI, nome)
        self.im.resize((1920, 1080), Image.LANCZOS).save(arq)
        print('ok ->', arq)
        return arq


def br(v, n=2): return ('%.*f' % (n, v)).replace('.', ',')


def delta(s, x, y, p, fs=7):
    """▲ 10% em vermelho / ▼ 12% em verde."""
    cor = SOBE if p > 0 else DESCE
    s.seta(x, y, p > 0, cor, fs * .6)
    s.txt(x + fs * .75, y, '%d%%' % round(abs(p) * 100), fonte('O', 'Bold', fs), cor, 'lm')


# ---------------------------------------------------------------- 1  Megas lado a lado
def megas():
    m = CAP
    s = Slide(m, 'Os Megas lado a lado — R$/m² ao mês',
              'Orçamento 2027 por m² nas principais linhas · traço = ritmo 2026 · tracejado = média de Facilities',
              'Fonte: METRAGEM-COND de cada Mega · R$/m² pela área implícita de cada ano · Atenção, Esteio: área de 24,3 para 53,4 mil m² '
              '(entram os Armazéns B1 e B2): o R$/m² cai mesmo com a despesa subindo')
    MEGAS = ['Curitiba', 'Itajaí', 'Esteio']
    # Orç 27 e Δ × ritmo (slide "Os Megas lado a lado" de hoje)
    tot = [('MEGA CURITIBA', 4.49, .10), ('MEGA ITAJAÍ', 5.07, .22), ('MEGA ESTEIO', 6.56, -.12), ('FACILITIES', 5.08, .14)]
    cw = (W - 2 * MX - 3 * 10) / 4
    for k, (nome, v, p) in enumerate(tot):
        x = MX + k * (cw + 10)
        fac = k == 3
        s.ret(x, 82, cw, 50, m['dark'] if fac else 'white', None if fac else m['linhas'], 6)
        cor = 'white' if fac else m['body']
        s.txt(x + 12, 90, nome + ' · DESPESAS OPERACIONAIS', fonte('M', 'Bold', 6), '#AFC4F5' if fac else m['body'])
        s.txt(x + 12, 100, 'R$ ' + br(v) + '/m²', fonte('M', 'Bold', 15), 'white' if fac else m['dark'])
        if fac:
            s.seta(x + 13, 125, True, '#FCA5A5', 4); s.txt(x + 19, 125, '14% × ritmo 2026', fonte('O', 'Bold', 6.5), '#FCA5A5', 'lm')
        else:
            delta(s, x + 12, 125, p, 6.5); s.txt(x + 34, 125, '× ritmo 2026', fonte('O', 'Regular', 6.5), cor, 'lm')

    PAINEIS = [
        ('SEGURANÇA E VIGILÂNCIA', [1.44, 1.32, 2.32], [.11, .08, .34], 1.56),
        ('MANUTENÇÃO DE IMÓVEIS', [1.10, 1.75, 1.32], [.26, .77, -.39], 1.38),
        ('UTILITIES, TAXAS E CONSUMO', [0.91, 1.15, 1.36], [.01, .04, -.02], 1.08),
        ('LIMPEZA E CONSERVAÇÃO', [0.55, 0.31, 0.58], [.45, .16, -.15], 0.47),
        ('PESSOAL E ADMINISTRATIVO', [0.41, 0.49, 0.62], [-.02, .10, -.27], 0.48),
    ]
    pw = (W - 2 * MX - 4 * 8) / 5
    y0 = 142
    ph = H - 26 - y0
    for k, (nome, vals, ps, fac) in enumerate(PAINEIS):
        x = MX + k * (pw + 8)
        s.card(x, y0, pw, ph)
        s.txt(x + 9, y0 + 9, nome, fonte('M', 'Bold', 5.6), m['body'])
        rit = [v / (1 + p) for v, p in zip(vals, ps)]
        mx = max(vals + rit) * 1.12
        bx, bw = x + 9, pw - 18
        X = lambda v: bx + bw * v / mx
        imax = vals.index(max(vals))
        for i, (mega, v, p, r) in enumerate(zip(MEGAS, vals, ps, rit)):
            yy = y0 + 30 + i * 52
            s.txt(bx, yy, mega, fonte('O', 'SemiBold', 7), m['main'])
            s.ret(bx, yy + 11, bw, 13, m['tint'])
            s.ret(bx, yy + 11, X(v) - bx, 13, m['dark'] if i == imax else m['light'])
            s.d.line([s.p(X(r), yy + 8.5), s.p(X(r), yy + 26.5)], fill=m['main'], width=round(1.3 * K))
            s.txt(bx, yy + 30, 'R$ ' + br(v), fonte('M', 'Bold', 7.5), m['dark'])
            delta(s, bx + 32, yy + 34.5, p, 6.5)
        # média de Facilities
        s.linha([(X(fac), y0 + 36), (X(fac), y0 + 30 + 3 * 52 - 12)], m['body'], .7, True)
        s.txt(X(fac), y0 + 30 + 3 * 52 - 10, 'Facilities ' + br(fac), fonte('O', 'SemiBold', 6), m['body'], 'ma')
        acima = max(vals) / fac - 1
        s.d.line([s.p(x + 9, y0 + ph - 34), s.p(x + pw - 9, y0 + ph - 34)], fill=m['linhas'], width=round(.6 * K))
        s.txt(x + 9, y0 + ph - 29, 'Mais caro: ' + MEGAS[imax], fonte('O', 'Bold', 6.8), m['dark'])
        s.txt(x + 9, y0 + ph - 19, '%d%% acima da média' % round(acima * 100), fonte('O', 'Regular', 6.5), m['body'])
    return s.salvar('rascunho_1_megas_lado_a_lado.png')


# ---------------------------------------------------------------- 2  Ponte
def ponte():
    m = DEM
    s = Slide(m, 'Ponte Ritmo 2026 → Orçamento 2027', 'De onde vem a alta de R$ 1,23 mi · Mega Curitiba · R$ mil',
              'Fonte: METRAGEM-COND (totais por conta) · Mega Curitiba')
    s.card(MX, 80, W - 2 * MX, H - 108)
    passos = [('RITMO 2026', 5940, 'T'), ('Manutenção\nde imóveis', 489, '+'), ('Segurança e\nvigilância', 425, '+'),
              ('Limpeza e\nconservação', 333, '+'), ('Seguro', 80, '+'), ('IPTU', 67, '+'), ('Outras altas (10)', 84, '+'),
              ('Reduções (13)', -247, '-'), ('ORÇ 2027', 7170, 'T')]
    base, topo = 5000, 7300
    y0, y1 = 112, 318
    Y = lambda v: y1 - (y1 - y0) * (v - base) / (topo - base)
    n = len(passos)
    cw = (W - 2 * MX - 40) / n
    acum = 0
    s.txt(MX + 14, 92, 'Eixo começa em R$ 5,0 mi', fonte('O', 'Regular', 6), m['muted'])
    for i, (nome, v, t) in enumerate(passos):
        x = MX + 20 + i * cw + cw * .18
        bw = cw * .64
        if t == 'T':
            s.ret(x, Y(v), bw, y1 - Y(v), m['dark'])
            s.txt(x + bw / 2, Y(v) - 4, br(v / 1000) + ' mi', fonte('M', 'Bold', 8), m['dark'], 'md')
            acum = v
        else:
            a, b = acum, acum + v
            cor = SOBE if v > 0 else DESCE
            s.ret(x, Y(max(a, b)), bw, abs(Y(a) - Y(b)), cor)
            lab = ('+' if v > 0 else '−') + str(abs(v))
            pct = abs(v) / 5940 * 100
            s.txt(x + bw / 2, Y(max(a, b)) - 4, lab, fonte('M', 'Bold', 7.5), cor, 'md')
            s.txt(x + bw / 2, Y(min(a, b)) + 3, br(pct, 1) + '%', fonte('O', 'Regular', 6), m['muted'], 'ma')
            acum = b
        if i < n - 1:
            s.d.line([s.p(x + bw, Y(acum)), s.p(x + cw, Y(acum))], fill=m['linhas'], width=round(.6 * K))
        for k, l in enumerate(nome.split('\n')):
            s.txt(x + bw / 2, y1 + 6 + k * 8, l, fonte('O', 'Bold', 6.5), m['dark'] if t == 'T' else m['body'], 'ma')
    s.d.line([s.p(MX + 14, y1), s.p(W - MX - 14, y1)], fill=m['linhas'], width=round(.6 * K))
    lx = W / 2 - 60
    s.ret(lx, 352, 8, 6, SOBE); s.txt(lx + 11, 355, 'Alta da conta', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.ret(lx + 70, 352, 8, 6, DESCE); s.txt(lx + 81, 355, 'Redução', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.txt(W - MX - 14, 355, '% = sobre o ritmo 2026', fonte('O', 'Regular', 6), m['muted'], 'rm')
    return s.salvar('rascunho_2_ponte.png')


# ---------------------------------------------------------------- 3  Manutenção mês a mês
def manut_mes(dados):
    m = DEM
    s = Slide(m, 'Manutenção de imóveis', 'Orç 2027 R$ 1,76 mi · +39% contra o Ritmo 2026 (+489 mil) · Mega Curitiba',
              'Fontes: METRAGEM-COND e Despesas-Mensal 2026 x 2027 (controladoria) · ritmo 2026 fechado até set')
    mm = dados['mensal']['Manutenção de imóveis']
    orc = [v / 1000 for v in mm['orc']]; rit = [v / 1000 for v in mm['ritmo']]; ant = [v / 1000 for v in mm['orcAnt']]
    FECH = 9
    cx, cy, cw, ch = MX, 132, 351, 246
    s.card(cx, cy, cw, ch, 'MÊS A MÊS · R$ MIL')
    # leitura no topo
    rj = sum(rit[:FECH]) / FECH; ro = sum(rit[FECH:]) / 3; oo = sum(orc[FECH:]) / 3; om = sum(orc) / 12
    s.txt(cx + 12, cy + 22, 'Orç 2027: R$ %d mil/mês · ritmo 2026: R$ %d mil/mês em jan–set e R$ %d mil em out–dez (projeção)'
          % (round(om), round(rj), round(ro)), fonte('O', 'Regular', 6.5), m['body'])
    x0, x1 = cx + 14, cx + cw - 12
    y0, y1 = cy + 44, cy + ch - 22
    mx = max(orc + rit) * 1.1
    Y = lambda v: y1 - (y1 - y0) * v / mx
    col = (x1 - x0) / 12
    X = lambda i: x0 + col * (i + .5)
    s.ret(x0 + col * FECH, y0 - 8, col * 3, y1 - y0 + 8, m['tint'])
    s.txt(x0 + col * 10.5, y0 - 6, 'projeção do ritmo', fonte('O', 'SemiBold', 6), m['dark'], 'ma')
    for v in (50, 100, 150, 200):
        s.d.line([s.p(x0, Y(v)), s.p(x1, Y(v))], fill=m['linhas'], width=round(.5 * K))
    for i in range(12):
        bw = col * .56
        s.ret(X(i) - bw / 2, Y(orc[i]), bw, y1 - Y(orc[i]), m['light'])
        s.txt(X(i), Y(orc[i]) + 2.5, str(round(orc[i])), fonte('M', 'Bold', 6), 'white', 'ma')
        s.d.line([s.p(X(i) - bw / 2 - 1, Y(ant[i])), s.p(X(i) + bw / 2 + 1, Y(ant[i]))], fill='#9AA19F', width=round(1.2 * K))
        s.txt(X(i), y1 + 4, MESES[i], fonte('O', 'Regular', 6), m['body'], 'ma')
    pts = [(X(i), Y(v)) for i, v in enumerate(rit)]
    s.linha(pts[:FECH], m['dark'], 1.6)
    s.linha(pts[FECH - 1:], m['dark'], 1.6, True)
    for i in range(12):
        s.bola(X(i), Y(rit[i]), 1.8, m['dark'], 1)
    for i in range(FECH, 12):   # valor do ritmo numa etiqueta branca (legível em cima da barra)
        s.ret(X(i) - 8, Y(rit[i]) - 13, 16, 8.5, 'white', m['dark'], 2)
        s.txt(X(i), Y(rit[i]) - 8.75, str(round(rit[i])), fonte('M', 'Bold', 6.3), m['dark'], 'mm')
    s.d.line([s.p(x0, y1), s.p(x1, y1)], fill=m['linhas'], width=round(.6 * K))
    # legenda curta
    ly, lx = cy + 13, cx + cw - 150
    s.ret(lx, ly - 3, 8, 6, m['light']); s.txt(lx + 11, ly, 'Orç 2027', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.d.line([s.p(lx + 48, ly), s.p(lx + 58, ly)], fill=m['dark'], width=round(1.6 * K)); s.bola(lx + 53, ly, 1.8, m['dark'])
    s.txt(lx + 61, ly, 'Ritmo 2026', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.d.line([s.p(lx + 106, ly), s.p(lx + 116, ly)], fill='#9AA19F', width=round(1.2 * K))
    s.txt(lx + 119, ly, 'Orç 2026', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    # o resto do slide (cards e composição) fica como está
    s.ret(MX, 80, W - 2 * MX, 44, m['tint2'])
    s.txt(W / 2, 102, 'cards do topo — sem mudança', fonte('O', 'Regular', 8), m['muted'], 'mm')
    s.ret(cx + cw + 10, cy, W - MX - (cx + cw + 10), ch, m['tint2'])
    s.txt(cx + cw + 10 + (W - MX - cx - cw - 10) / 2, cy + ch / 2, 'composição do Orç 2027 — sem mudança',
          fonte('O', 'Regular', 8), m['muted'], 'mm')
    return s.salvar('rascunho_3_manutencao_mes_a_mes.png')


# ---------------------------------------------------------------- 4  Distribuição mensal
def distribuicao(dados):
    m = DEM
    c = [v / 1000 for v in dados['manutencao']['contratos']]
    a = [v / 1000 for v in dados['manutencao']['avulsos']]
    t = [x + y for x, y in zip(c, a)]
    tc, ta = sum(c), sum(a)
    s = Slide(m, 'Distribuição mensal',
              'Previsão de entrega do orçamento de manutenção · Mega Curitiba · média de R$ 147 mil por mês (R$ 1,10/m²)',
              'Fonte: 090-Despesas-Gerais — Mega Curitiba — 2027, aba "Valores do Modelo" + cadastro de contratos de 2027')
    cx, cy, cw, ch = MX, 80, W - 2 * MX, 218
    s.card(cx, cy, cw, ch, 'ORÇAMENTO POR MÊS · R$ MIL')
    s.txt(cx + 12, cy + 22, 'Contratos R$ %d mil no ano (%d%%), quase o mesmo valor todo mês · avulsos R$ %s mi (%d%%) fazem os picos'
          % (round(tc), round(tc / (tc + ta) * 100), br(ta / 1000), round(ta / (tc + ta) * 100)),
          fonte('O', 'Regular', 7), m['body'])
    x0, x1 = cx + 20, cx + cw - 20
    y0, y1 = cy + 40, cy + ch - 22
    mx = max(t) * 1.1
    Y = lambda v: y1 - (y1 - y0) * v / mx
    col = (x1 - x0) / 12
    ipk = t.index(max(t))
    for i in range(12):
        x = x0 + col * i + col * .2
        bw = col * .6
        s.ret(x, Y(c[i]), bw, y1 - Y(c[i]), m['dark'])
        s.ret(x, Y(t[i]), bw, Y(c[i]) - Y(t[i]), m['light'] if i != ipk else '#8C7A00')
        s.txt(x + bw / 2, Y(t[i]) - 3, str(round(t[i])), fonte('M', 'Bold', 7.5 if i == ipk else 7), m['main'], 'md')
        s.txt(x + bw / 2, y1 + 4, MESES[i], fonte('O', 'Bold' if i == ipk else 'Regular', 6.5), m['body'], 'ma')
    s.d.line([s.p(x0, y1), s.p(x1, y1)], fill=m['linhas'], width=round(.6 * K))
    # anotação da base fixa
    yb = Y(sum(c) / 12)
    s.linha([(x0, yb), (x1, yb)], 'white', .8, True)
    s.txt(x1 + 2, yb, 'base de\ncontratos\n~R$ 40 mil', fonte('O', 'Bold', 5.6), m['dark'], 'lm')
    ly, lx = cy + 13, cx + cw - 112
    s.ret(lx, ly - 3, 8, 6, m['dark']); s.txt(lx + 11, ly, 'Contratos', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.ret(lx + 56, ly - 3, 8, 6, m['light']); s.txt(lx + 67, ly, 'Avulsos', fonte('O', 'Regular', 6.5), m['body'], 'lm')
    s.ret(MX, cy + ch + 10, W - 2 * MX, H - 26 - (cy + ch + 10), m['tint2'])
    s.txt(W / 2, (cy + ch + 10 + H - 26) / 2, 'os 3 cards dos meses mais pesados — sem mudança', fonte('O', 'Regular', 8), m['muted'], 'mm')
    return s.salvar('rascunho_4_distribuicao_mensal.png')


if __name__ == '__main__':
    dados = json.load(open(DADOS, encoding='utf-8'))
    for f in (megas, ponte):
        f()
    manut_mes(dados)
    distribuicao(dados)
