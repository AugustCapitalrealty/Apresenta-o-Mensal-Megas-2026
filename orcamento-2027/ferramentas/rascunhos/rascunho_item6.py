"""Rascunho do item 6: composição da manutenção com o Ritmo 2026 ao lado (slide 720x405 pt em 1920x1080)."""
import json, sys
from PIL import Image, ImageDraw, ImageFont

FONTES = r'G:\Drives compartilhados\08.000 - Business Analysis\APRESENTAÇÃO ORÇAMENTO\Apresenta-o-Mensal-Megas-2026\orcamento-2027\ferramentas\fontes'
dados = json.load(open(sys.argv[1], encoding='utf-8'))
SAIDA = sys.argv[2]
K = 1920 / 720
NAVY, AZUL, LIGHT, TXT, MUTED, LINHA = '#151E49', '#0B5CAD', '#60A5FA', '#334155', '#94A3B8', '#E2E8F0'
VERM, VERDE, LARANJA = '#B91C1C', '#15803D', '#EA580C'


def fonte(fam, peso, pt):
    arq = {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf'}[fam]
    f = ImageFont.truetype(FONTES + '\\' + arq, int(pt * K))
    try: f.set_variation_by_axes([{'Regular': 400, 'SemiBold': 600, 'Bold': 700}[peso]] + ([100] if fam == 'O' else []))
    except Exception:
        try: f.set_variation_by_axes([100, {'Regular': 400, 'SemiBold': 600, 'Bold': 700}[peso]])
        except Exception: pass
    return f


def txt(d, x, y, s, fam='O', peso='Regular', pt=7, cor=TXT, w=None, align='L'):
    f = fonte(fam, peso, pt)
    s = str(s)
    if w:
        while d.textlength(s, font=f) > w * K and len(s) > 4: s = s[:-2].rstrip() + '…' if not s.endswith('…') else s[:-2] + '…'
    tw = d.textlength(s, font=f)
    xx = x * K + (w * K - tw if align == 'R' else ((w * K - tw) / 2 if align == 'C' else 0))
    d.text((xx, y * K), s, font=f, fill=cor)


def ret(d, x, y, w, h, cor, borda=None, r=0):
    box = [x * K, y * K, (x + w) * K, (y + h) * K]
    if r: d.rounded_rectangle(box, radius=r * K, fill=cor, outline=borda, width=max(1, int(0.8 * K)) if borda else 0)
    else: d.rectangle(box, fill=cor, outline=borda)


def moeda(v): return 'R$ ' + '{:,.0f}'.format(v).replace(',', '.')


def pct(r, o):
    if r < 0.5: return ('novo', VERM)
    p = round((o / r - 1) * 100)
    return (('+' if p > 0 else ('−' if p < 0 else '')) + str(abs(p)) + '%', VERM if p > 0 else (VERDE if p < 0 else TXT))


def seta(d, x, y, cor, sobe):
    # triângulo de 4 pt: ▲ vermelho gasta mais, ▼ verde gasta menos
    pts = [(x, y + 3.4), (x + 4, y + 3.4), (x + 2, y)] if sobe else [(x, y), (x + 4, y), (x + 2, y + 3.4)]
    d.polygon([(a * K, b * K) for a, b in pts], fill=cor)


im = Image.new('RGB', (1920, 1080), '#F8FAFC')
# Marca d'água "RASCUNHO" em diagonal
wm = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
dw = ImageDraw.Draw(wm)
dw.text((260, 380), 'RASCUNHO', font=fonte('M', 'Bold', 110), fill=(234, 88, 12, 22))
im.paste(wm.rotate(18, resample=Image.BICUBIC), (0, 0), wm.rotate(18, resample=Image.BICUBIC))
d = ImageDraw.Draw(im)

# Cabeçalho
ret(d, 24, 14, 3, 30, AZUL)
txt(d, 34, 11, 'Manutenção de imóveis — composição com o Ritmo 2026', 'M', 'Bold', 17, NAVY)
txt(d, 34, 34, 'Proposta para o item 6 da revisão do gestor · ' + dados['mega'] + ' · pares marcados SIM nas planilhas de comparação · em R$',
    'O', 'Regular', 7.5, TXT)
ret(d, 590, 16, 106, 18, LARANJA, r=3)
txt(d, 590, 19.5, 'RASCUNHO · PROPOSTA', 'M', 'Bold', 7.5, '#FFFFFF', w=106, align='C')
d.line([(24 * K, 52 * K), (696 * K, 52 * K)], fill=LINHA, width=int(0.8 * K))

# Tabela
X, Y, RH = 24, 60, 8.3
cols = [('ITEM DO ORÇ 2027', 262, 'L'), ('RITMO 2026', 52, 'R'), ('VALOR 2027', 54, 'R'), ('Δ%', 46, 'R')]
TW = sum(c[1] for c in cols)
ret(d, X, Y, TW, 13, NAVY)
cx = X
for i, (t, w, a) in enumerate(cols):
    if i == 3: ret(d, cx, Y, w, 13, '#64748B')
    txt(d, cx + 4, Y + 2.4, t, 'O', 'Bold', 6.3, '#FFFFFF', w=w - 8, align=a)
    cx += w
txt(d, X + TW - 46, Y - 7.5, 'opcional', 'O', 'Regular', 5.5, LARANJA, w=46, align='R')
y = Y + 13
ret(d, X, y, TW, RH, '#DBEAFE')
txt(d, X + 4, y + 0.5, 'COMPARÁVEIS COM 2026 — %d PARES' % len(dados['grupos']), 'O', 'Bold', 6, NAVY)
y += RH


def linha(y, nome, r, o, negrito=False, sub=False, fundo=None, cor=NAVY):
    if fundo: ret(d, X, y, TW, RH, fundo)
    d.line([(X * K, (y + RH) * K), ((X + TW) * K, (y + RH) * K)], fill=LINHA, width=1)
    peso = 'Bold' if negrito else 'Regular'
    txt(d, X + (12 if sub else 6), y + 0.5, nome, 'O', peso, 5.8, MUTED if sub else cor, w=262 - (16 if sub else 10))
    if r is not None: txt(d, X + 262, y + 0.5, moeda(r), 'O', peso, 5.8, cor, w=48, align='R')
    if o is not None: txt(d, X + 314, y + 0.5, moeda(o), 'O', 'Bold' if not sub else 'Regular', 5.8, MUTED if sub else cor, w=50, align='R')
    if r is not None and o is not None:
        t, c = pct(r, o)
        txt(d, X + 368, y + 0.5, t.lstrip('+−'), 'O', 'Bold', 5.8, c, w=40, align='R')
        if t[0] in '+−':
            larg = d.textlength(t.lstrip('+−'), font=fonte('O', 'Bold', 5.8)) / K
            seta(d, X + 408 - larg - 6, y + 2.6, c, t[0] == '+')


for g in dados['grupos']:
    if len(g['itens']) == 1:
        linha(y, g['itens'][0]['nome'], g['ritmo'], g['orc']); y += RH
    else:
        nome = '%s — %d itens em 2027' % (g['de2026'].upper(), len(g['itens']))
        linha(y, nome, g['ritmo'], g['orc'], negrito=True, fundo='#EFF6FF'); y += RH
        for it in g['itens']:
            linha(y, it['nome'], None, it['v'], sub=True); y += RH
linha(y, 'TOTAL DOS ITENS COMPARÁVEIS', dados['compR'], dados['comp27'], negrito=True, fundo='#DBEAFE'); y += RH
linha(y, 'ITENS PONTUAIS / SEM PAR EM 2026 — %d itens (só o total)' % dados['nPontuais'], None, dados['pontuais'], negrito=True, fundo='#F1F5F9'); y += RH
linha(y, 'TOTAL MANUTENÇÃO DE IMÓVEIS — ORÇ 2027', None, dados['total27'], negrito=True, fundo=NAVY, cor='#FFFFFF')

# Painel da direita
PX, PW = 452, 244
t, c = pct(dados['compR'], dados['comp27'])
ret(d, PX, 60, PW, 62, '#FFFFFF', LINHA, r=5)
txt(d, PX + 10, 66, 'ITENS COMPARÁVEIS COM 2026', 'O', 'Bold', 6.5, TXT)
txt(d, PX + PW - 60, 66, t + ' × ritmo', 'O', 'Bold', 6.5, c, w=50, align='R')
txt(d, PX + 10, 78, '%s → %s' % (moeda(dados['compR']).replace('R$ ', 'R$ '), moeda(dados['comp27'])), 'M', 'Bold', 13, NAVY, w=PW - 20)
txt(d, PX + 10, 100, 'do Ritmo 2026 ao Orç 2027 · %d pares, %d itens de 2027' % (len(dados['grupos']), sum(len(g['itens']) for g in dados['grupos'])),
    'O', 'Regular', 6.3, MUTED, w=PW - 20)
ret(d, PX, 128, PW, 50, '#FFFFFF', LINHA, r=5)
txt(d, PX + 10, 134, 'ITENS PONTUAIS / SEM PAR EM 2026', 'O', 'Bold', 6.5, TXT)
txt(d, PX + 10, 146, moeda(dados['pontuais']), 'M', 'Bold', 13, NAVY)
txt(d, PX + 10, 166, '%d itens · na tabela só o somatório, no fim' % dados['nPontuais'], 'O', 'Regular', 6.3, MUTED, w=PW - 20)
ret(d, PX, 184, PW, 40, NAVY, r=5)
txt(d, PX + 10, 190, 'TOTAL DA CONTA · ORÇ 2027', 'O', 'Bold', 6.5, LIGHT)
txt(d, PX + 10, 201, moeda(dados['total27']), 'M', 'Bold', 13, '#FFFFFF')

ret(d, PX, 232, PW, 140, '#FFF7ED', r=5)
ret(d, PX, 232, 3, 140, LARANJA)
txt(d, PX + 10, 238, 'COMO FICARIA NO DECK', 'O', 'Bold', 6.5, LARANJA)
notas = [
    'Item com par SIM traz o Ritmo 2026 ao lado do valor de 2027;',
    'os pontuais não têm ritmo: entram só no somatório do fim.',
    'Quando um item de 2026 virou vários em 2027, eles ficam juntos',
    'e o ritmo aparece uma vez, na linha do grupo.',
    'Vale para as páginas 1/2 e 2/2 da composição da Manutenção.',
    'DECIDIR: manter a coluna Δ% (cinza)? Ajuda a ler, mas aperta',
    'a página 2/2, que hoje tem 56 itens em duas colunas.',
    'DEPENDE: o gestor validar as linhas laranja das planilhas',
    '"RITMO 2026 x ORÇ 2027"; estes pares ainda são os da versão',
    'anterior (base do orçado), levados para o ritmo.',
]
for i, n in enumerate(notas):
    bold = n.startswith(('DECIDIR', 'DEPENDE'))
    txt(d, PX + 10, 250 + i * 11.4, n, 'O', 'Bold' if bold else 'Regular', 6.4, NAVY if bold else TXT, w=PW - 18)

txt(d, 24, 392, 'Rascunho para decisão, não vai para a reunião · Ritmo 2026: 090 item a item + cadastro de contratos 2026 (exportados em '
    '07/10/2026) · Orç 2027: modelo 090 + MESTRA - CONTRATOS 2027 · ' + dados['mega'], 'O', 'Regular', 5.8, MUTED, w=672)
im.save(SAIDA, quality=92)
print(SAIDA, 'última linha da tabela em y =', round(y + RH, 1), 'pt')
