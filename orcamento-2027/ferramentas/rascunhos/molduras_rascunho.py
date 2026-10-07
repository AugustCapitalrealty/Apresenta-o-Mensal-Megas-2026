"""Rascunho das molduras em imagem (v2): o mesmo slide antes e depois, com os dados reais. Criado em 07/10/2026.

Antes  = a prévia de hoje (formas do Slides, como o teste grava com PREVIA=).
Depois = moldura desenhada em imagem (fundo, faixa da marca, marca da seção, cards com sombra suave, logo, rodapé da
         marca) + o mesmo conteúdo por cima (textos, tabelas, barras), com as fontes do deck (Montserrat e Open Sans; em
         Curitiba, título em EB Garamond como alternativa da tipografia da Demercado).
O que vai para a imagem nunca é dado: título, números e tabelas continuam texto do Slides.

Uso (de dentro de orcamento-2027, depois de PREVIA=ferramentas/saida node teste/teste_orcamento.js):
  python ferramentas/rascunhos/molduras_rascunho.py <pasta de saída>
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(AQUI))
FONTES = os.path.join(PROJ, 'ferramentas', 'fontes')
IMGS = os.path.abspath(os.path.join(PROJ, '..', '..', 'IMAGENS - SLIDES'))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(PROJ, 'ferramentas', 'saida')
W, H = 1920, 1080
K = W / 720

MARCAS = {
    'curitiba': dict(dark='#00594F', light='#AF9800', accent='#C9B037', txt='#262626', body='#4B5250', muted='#9AA19F',
                     linha='#E3E8E6', bg='#F6F8F7', nome='Demercado Investimentos', mega='MEGA CURITIBA',
                     logo='LOGO - DEMERCADO - POSITIVO.png', titulo_serifa=True),
    'itajai': dict(dark='#151E49', light='#065CA9', accent='#60A5FA', txt='#151E49', body='#475569', muted='#94A3B8',
                   linha='#E2E8F0', bg='#F6F8FB', nome='Capital Realty', mega='MEGA ITAJAÍ', logo=None, titulo_serifa=False),
}
SLIDES = [('DRE — Orçamento 2027', 3), ('Manutenção de imóveis (1/2)', 4)]
# = ORC_SUBCAPAS: as 8 seções de cada Mega (a trilha do topo)
SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Manutenção', 'Segurança', 'Limpeza', 'Projetos', 'Custo por m²']
FAIXA = 11      # pt: altura da faixa de navegação no topo


def fonte(fam, peso, pt):
    arq = {'M': 'Montserrat[wght].ttf', 'O': 'OpenSans[wdth,wght].ttf', 'G': 'EBGaramond[wght].ttf'}[fam]
    f = ImageFont.truetype(os.path.join(FONTES, arq), max(6, int(pt * K)))
    try: f.set_variation_by_name(peso)
    except Exception: pass
    return f


def rgba(c, a=1.0):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (int(255 * a),)


def quebra(d, texto, f, larg):
    linhas = []
    for par in str(texto).split('\n'):
        atual = ''
        for p in par.split(' '):
            t = (atual + ' ' + p).strip()
            if d.textlength(t, font=f) <= larg or not atual: atual = t
            else: linhas.append(atual); atual = p
        linhas.append(atual)
    return linhas


def eh_moldura(f, m):
    """Formas que a moldura passa a desenhar: cards brancos, barra e linha do cabeçalho, logo, rodapé de fonte."""
    t = f.get('tipo')
    if t == 'ROUND_RECTANGLE' and (f.get('cor') or '').upper() == '#FFFFFF': return True
    if t == 'RECTANGLE' and f['x'] < 40 and f['y'] < 20 and f['w'] <= 6: return True       # barra do título
    if t == 'LINE' and 60 <= f['y'] <= 68 and f['w'] > 500: return True                     # linha do cabeçalho
    if t == 'IMAGE' and f['y'] < 60 and f['x'] > 500: return True                           # logo
    return False


def moldura(sl, m, secao):
    im = Image.new('RGB', (W, H), m['bg'])
    d = ImageDraw.Draw(im)
    # Trilha das seções no topo, no estilo da trilha das sub capas: filete fino, número e nome. Progresso: as seções
    # que já passaram e a atual com a cor da marca (a atual em destaque), as futuras sem cor — dá a noção de em que
    # altura da apresentação o slide está.
    x0, larg = 30, (690 - 30) / len(SECOES)
    for i, nome in enumerate(SECOES):
        x, w = x0 + i * larg, larg - 6
        n = i + 1; atual, passou = n == secao, n < secao
        if atual:   d.rectangle([x * K, 2.2 * K, (x + w) * K, 3.6 * K], fill=m['light'])
        elif passou: d.rectangle([x * K, 2.6 * K, (x + w) * K, 3.3 * K], fill=m['light'])
        else:       d.rectangle([x * K, 2.6 * K, (x + w) * K, 3.3 * K], fill=m['linha'])
        cn = m['light'] if (atual or passou) else m['muted']
        ct = m['dark'] if atual else (m['body'] if passou else m['muted'])
        f1 = fonte('M', 'Bold', 4.8)
        f2 = fonte('O', 'Bold' if atual else 'Regular', 4.8)
        d.text((x * K, 5 * K), '%02d' % n, font=f1, fill=cn)
        d.text(((x + 9) * K, 5 * K), nome, font=f2, fill=ct)
    # cards: sombra suave + branco arredondado + borda fina
    cards = [f for f in sl['formas'] if f.get('tipo') == 'ROUND_RECTANGLE' and (f.get('cor') or '').upper() == '#FFFFFF']
    sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sombra)
    for f in cards:
        x, y, w, h = [v * K for v in (f['x'], f['y'], f['w'], f['h'])]
        ds.rounded_rectangle([x, y + 6, x + w, y + h + 6], radius=int(9 * K), fill=(15, 30, 40, 34))
    sombra = sombra.filter(ImageFilter.GaussianBlur(14))
    im = Image.alpha_composite(im.convert('RGBA'), sombra)
    d = ImageDraw.Draw(im)
    for f in cards:
        x, y, w, h = [v * K for v in (f['x'], f['y'], f['w'], f['h'])]
        d.rounded_rectangle([x, y, x + w, y + h], radius=int(9 * K), fill='#FFFFFF', outline=m['linha'], width=2)
    # cabeçalho: marca da seção em cima do título, barra de destaque, linha
    d.rectangle([30 * K, 22 * K, 33 * K, 52 * K], fill=m['light'])
    d.line([(30 * K, 64 * K), (690 * K, 64 * K)], fill=m['linha'], width=2)
    # logo à direita
    if m['logo']:
        lg = Image.open(os.path.join(IMGS, m['logo']))
        lh = int(20 * K); lg = lg.resize((int(lh * lg.width / lg.height), lh), Image.LANCZOS)
        im.alpha_composite(lg, (int(690 * K) - lg.width, int(22 * K)))
    else:
        f1 = fonte('M', 'Bold', 11); tw = d.textlength('CAPITAL REALTY', font=f1)
        d.text((690 * K - tw, 24 * K), 'CAPITAL REALTY', font=f1, fill=m['dark'])
        f2 = fonte('O', 'Regular', 6); tw2 = d.textlength('infraestrutura logística', font=f2)
        d.text((690 * K - tw2, 39 * K), 'infraestrutura logística', font=f2, fill=m['body'])
    return im


def conteudo(im, sl, m, titulo_serifa):
    for f in sl['formas']:
        if eh_moldura(f, m): continue
        x, y, w, h = f['x'] * K, f['y'] * K, f['w'] * K, f['h'] * K
        camada = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(camada)
        t = f.get('tipo')
        if t == 'IMAGE':
            continue
        if t == 'LINE':
            d.line([x, y, x + w, y + h], fill=rgba(m['linha']), width=2)
        elif f.get('texto'):
            if f.get('cor'): d.rectangle([x, y, x + w, y + h], fill=rgba(f['cor'], f.get('alpha', 1)))
            fs = f.get('fs', 10)
            titulo = f['y'] < 20 and fs >= 15
            if titulo and titulo_serifa: ft = fonte('G', 'SemiBold', fs * 1.18)
            elif titulo or (f.get('negrito') and fs >= 12): ft = fonte('M', 'Bold', fs)
            else: ft = fonte('O', 'SemiBold' if f.get('negrito') else 'Regular', fs)
            if any(ch in f['texto'] for ch in '▲▼→'):   # a Open Sans daqui não tem as setas; o Slides tem
                ft = ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts',
                                        'segoeuib.ttf' if f.get('negrito') else 'segoeui.ttf'), ft.size)
            linhas = quebra(d, f['texto'], ft, max(10, w - 14 * K))
            alt = ft.size * 1.22 * len(linhas)
            ty = y + (h - alt) / 2 if len(linhas) == 1 else y + 3 * K
            if titulo: ty += 2 * K       # respiro abaixo da faixa de navegação
            for n, l in enumerate(linhas):
                d.text((x + 7 * K, ty + n * ft.size * 1.22), l, font=ft, fill=rgba(f.get('corTexto') or m['txt']))
        elif f.get('cor'):
            if t == 'ROUND_RECTANGLE': d.rounded_rectangle([x, y, x + w, y + h], radius=int(4 * K), fill=rgba(f['cor'], f.get('alpha', 1)))
            elif t == 'ELLIPSE': d.ellipse([x, y, x + w, y + h], fill=rgba(f['cor'], f.get('alpha', 1)))
            else: d.rectangle([x, y, x + w, y + h], fill=rgba(f['cor'], f.get('alpha', 1)))
        im = Image.alpha_composite(im, camada)
    return im


def lado_a_lado(antes, depois, rotulo):
    a = antes.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS)
    b = depois.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS)
    out = Image.new('RGB', (W + 30, H // 2 + 70), '#FFFFFF')
    d = ImageDraw.Draw(out)
    d.text((10, 14), 'HOJE', font=fonte('M', 'Bold', 9), fill='#6B7280')
    d.text((W // 2 + 30, 14), 'V2 — MOLDURA EM IMAGEM  ·  RASCUNHO', font=fonte('M', 'Bold', 9), fill='#EA580C')
    d.text((10, 44), rotulo, font=fonte('O', 'Regular', 7), fill='#6B7280')
    out = out.crop((0, 0, out.width, out.height + 30)) if False else out
    out2 = Image.new('RGB', (out.width, out.height + 34), '#FFFFFF'); out2.paste(out, (0, 0))
    out2.paste(a, (10, 94)); out2.paste(b, (W // 2 + 20, 94))
    return out2


def main():
    sys.path.insert(0, os.path.join(PROJ, 'ferramentas'))
    import previa_slides
    for cidade, m in MARCAS.items():
        dados = json.load(open(os.path.join(PROJ, 'ferramentas', 'saida', 'formas_%s.json' % cidade), encoding='utf-8'))
        for titulo, secao in SLIDES:
            i = next(j for j, s in enumerate(dados['slides']) if any(f.get('texto') == titulo for f in s['formas']))
            sl = dados['slides'][i]
            tmp = os.path.join(SAIDA, '_antes.png'); previa_slides.LARG = W; previa_slides.desenha(dados, i, tmp)
            antes = Image.open(tmp)
            depois = conteudo(moldura(sl, m, secao), sl, m, m['titulo_serifa'])
            nome = 'RASCUNHO V2 - MOLDURA - %s - %s' % (m['mega'], titulo.split(' —')[0].split(' (')[0].upper())
            depois.convert('RGB').save(os.path.join(SAIDA, nome + ' (depois).png'))
            lado_a_lado(antes, depois, '%s · %s' % (m['mega'].title(), titulo)).save(os.path.join(SAIDA, nome + '.png'))
            print('ok ->', nome)
        os.remove(os.path.join(SAIDA, '_antes.png'))


if __name__ == '__main__':
    main()
