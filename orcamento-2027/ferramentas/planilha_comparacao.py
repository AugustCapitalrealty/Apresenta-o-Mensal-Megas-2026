# Planilha de decisão do gestor: itens de manutenção de 2026 × Orç 2027 de um
# Mega, com a coluna COMPARA? (SIM/NÃO).
# Uso: python ferramentas/planilha_comparacao.py <curitiba|itajai|esteio> [<linhas.json>] [<planilha anterior.xlsx>]
# (antes: node ferramentas/curadoria.js . <cidade> ferramentas/saida/ritmo_linhas_<cidade>.json)
#
# Base Ritmo 2026 (padrão desde 07/10/2026; o JSON vem como {base26, metragem, linhas}):
#   - o lado 2026 é o ritmo; o orçado 2026 fica nas colunas M e N, como referência;
#   - o SIM/NÃO (K) e o comentário (L) do gestor vêm da planilha anterior, pela linha (item do orçado + itens de
#     2027). Se o par mudou, vem só o comentário;
#   - a coluna P ("Olhar de novo?") marca o que o ritmo mudou e o gestor precisa rever. Essas linhas vêm primeiro.
# Base Orç 2026 (JSON em lista, como até 07/10/2026): colunas A–L, como antes.
import glob, json, os, re, sys, unicodedata
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

S = os.path.dirname(os.path.abspath(__file__))
CIDADE = sys.argv[1] if len(sys.argv) > 1 else 'curitiba'
MEGA = {'curitiba': 'Mega Curitiba', 'itajai': 'Mega Itajaí', 'esteio': 'Mega Esteio'}[CIDADE]
ARQ_LINHAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(S, 'saida', 'ritmo_linhas_' + CIDADE + '.json')
ANTERIOR = sys.argv[3] if len(sys.argv) > 3 else (glob.glob(os.path.join(
    S, 'base2026_orcado_2026-10-07', 'ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - ' + MEGA.upper() + '.xlsx')) or [None])[0]

dados = json.load(open(ARQ_LINHAS, encoding='utf-8'))
RITMO = isinstance(dados, dict)
linhas = dados['linhas'] if RITMO else dados
B26 = 'Ritmo 2026' if RITMO else 'Orç 2026'


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', s).strip(' —-')


def reais(v):
    return 'R$ ' + '{:,.0f}'.format(v).replace(',', '.')


# ---- O que o gestor marcou na planilha anterior (base do orçado) ----
ant_par, ant_orc, ant_27 = {}, {}, {}
if RITMO and ANTERIOR:
    ws0 = load_workbook(ANTERIOR, data_only=True)['Comparação']
    for r in ws0.iter_rows(min_row=6, values_only=True):
        n, tipo, it26, o26, it27, cat, o27, d, leit, pq, comp, com = (list(r) + [None] * 12)[:12]
        if not isinstance(n, (int, float)): continue
        reg = {'K': str(comp or '').strip().upper() or None, 'L': str(com or '').strip(), 'linha': int(n)}
        ant_par[(norm(it26), norm(it27))] = reg
        if norm(it26): ant_orc[norm(it26)] = reg
        elif norm(it27): ant_27[norm(it27)] = reg

PREENCHE = {'Compara': 'SIM', 'Não compara': 'NÃO'}
ADIADO = re.compile(r'desloc|realoc', re.I)
for l in linhas:
    l.setdefault('dOrc', ''); l.setdefault('vOrc', 0); l.setdefault('mudou', '')
    l['K'], l['L'], l['olhar'] = PREENCHE.get(l['leitura']), '', ''
    if not RITMO: continue
    a = ant_par.get((norm(l['dOrc']), norm(l['d27'])))
    if a: l['K'], l['L'] = a['K'] or l['K'], a['L']
    elif l['dOrc'] and norm(l['dOrc']) in ant_orc:
        a = ant_orc[norm(l['dOrc'])]
        l['L'] = a['L'] and '[o par mudou; na versão anterior, linha %d] %s' % (a['linha'], a['L'])
    elif not l['dOrc'] and norm(l['d27']) in ant_27:
        a = ant_27[norm(l['d27'])]; l['K'], l['L'] = a['K'] or l['K'], a['L']
    # Olhar de novo?
    grande = l['dOrc'] and l['d26'] and abs(l['v26'] - l['vOrc']) > max(5000, 0.3 * l['vOrc'])
    if l['K'] == 'NÃO' and ADIADO.search(l['L']) and l['v26'] > 0:
        l['olhar'] = 'O gestor disse que foi adiada para 2027, mas tem gasto no ritmo 2026. Parcelamento ou em dobro?'
    elif l['K'] == 'SIM' and l['dOrc'] and not l['d26'] and l['d27']:
        l['olhar'] = 'Marcado SIM, mas não teve gasto no ritmo 2026: ainda compara?'
    elif l['K'] == 'SIM' and l['d27'] and grande:
        l['olhar'] = 'Par SIM com o valor de 2026 bem diferente do orçado: o comentário ainda vale?'
    elif not l['dOrc'] and l['d26'] and l['d27']:
        l['olhar'] = 'Par novo: o item só existe no ritmo 2026.'
    elif not l['dOrc'] and l['d26'] and l['v26'] >= 10000:
        l['olhar'] = 'Novo no ritmo 2026: tem par em 2027?'
    elif 'Erro de digitação' in l['mudou']:
        l['olhar'] = 'Nome trocado no ritmo.'

ORDEM = {'Dúvida': 0, 'Compara': 1, 'Não compara': 2, 'Só 2026': 3, 'Não executado': 4, 'Só 2027': 5}
linhas.sort(key=lambda l: (not l['olhar'], ORDEM[l['leitura']], -max(l['v26'], l['v27'], l['vOrc'])))

# Diferença entre a soma dos itens e a METRAGEM-COND.
if RITMO:
    m = dados['metragem']
    t26, t27 = sum(l['v26'] for l in linhas), sum(l['v27'] for l in linhas)
    dif = lambda a, b: 'igual à' if abs(a - b) < 1 else ('%s %s da' % (reais(abs(a - b)), 'acima' if a > b else 'abaixo'))
    NOTA = ('Ritmo 2026 dos itens: %s (%s METRAGEM-COND, %s). Orç 2027: %s (%s METRAGEM-COND, %s).'
            % (reais(t26), dif(t26, m['ritmo']), reais(m['ritmo']), reais(t27), dif(t27, m['orc']), reais(m['orc'])))
    FONTE26 = ('Ritmo 2026: ritmo item a item do 090 (centro de custo do condomínio) + cadastro de contratos 2026, '
               'exportados em 07/10/2026. Orç 2026 (colunas M e N): "MESTRA - ORÇAMENTO 2026 ITEM A ITEM" + '
               '"MESTRA - CONTRATOS 2026", a base da versão anterior.')
else:
    NOTA = ''
    FONTE26 = 'Orç 2026: "MESTRA - ORÇAMENTO 2026 ITEM A ITEM" (centro de custo do condomínio) + "MESTRA - CONTRATOS 2026".'

F = 'Arial'
AZUL, BRANCO = '151E49', 'FFFFFF'
fill = lambda c: PatternFill('solid', start_color=c, end_color=c)
fino = Side(style='thin', color='E2E8F0')
borda = Border(bottom=fino)
MOEDA = '"R$" #,##0;-"R$" #,##0;"–"'

wb = Workbook()
ws = wb.active
ws.title = 'Comparação'
ws['A1'] = 'Manutenção de imóveis — ' + MEGA + ' · itens do ' + B26 + ' × Orç 2027'
ws['A1'].font = Font(name=F, bold=True, size=13, color=AZUL)
ws['A2'] = ('Preencha a coluna COMPARA? com SIM ou NÃO. O SIM/NÃO e os comentários da versão anterior (base do orçado 2026) '
            'já vêm preenchidos. As linhas laranja (coluna "Olhar de novo?") são as que o ritmo mudou: comece por elas. '
            'Só os pares com SIM entram na comparação item a item da apresentação.' if RITMO else
            'Preencha a coluna COMPARA? com SIM ou NÃO nas linhas amarelas (dúvidas). As outras já vêm com a leitura da '
            'análise e podem ser trocadas. Só os pares com SIM entram na comparação item a item da apresentação.')
ws['A2'].font = Font(name=F, size=9, color='475569')
ws['A3'] = FONTE26 + ' Orç 2027: modelo 090 + "MESTRA - CONTRATOS 2027". ' + NOTA
ws['A3'].font = Font(name=F, size=9, color='94A3B8')

cab = ['#', 'Tipo', 'Item no ' + B26, B26, 'Item(ns) no Orç 2027', 'Categoria 2027', 'Orç 2027', 'Δ R$',
       'Leitura da análise', 'Por quê', 'COMPARA?', 'Comentário do gestor']
if RITMO: cab += ['Item no Orç 2026 (versão anterior)', 'Orç 2026', 'O que mudou com o ritmo', 'Olhar de novo?']
NC = len(cab)
H = 5
for c, t in enumerate(cab, 1):
    cel = ws.cell(row=H, column=c, value=t)
    cel.font = Font(name=F, bold=True, size=9, color=BRANCO)
    cel.fill = fill('F97316' if t in ('COMPARA?', 'Olhar de novo?') else ('64748B' if c in (13, 14, 15) else AZUL))
    cel.alignment = Alignment(vertical='center', horizontal='center' if c in (1, 4, 7, 8, 11, 14) else 'left', wrap_text=True)
ws.row_dimensions[H].height = 26

COR = {'Dúvida': 'FEF3C7', 'Só 2026': 'F8FAFC', 'Só 2027': 'F8FAFC', 'Não executado': 'F8FAFC'}
for i, l in enumerate(linhas):
    r = H + 1 + i
    vals = [i + 1, l['tipo'], l['d26'] or '—', l['v26'] or None, l['d27'] or '—', l['cat27'] or '', l['v27'] or None,
            '=G{0}-D{0}'.format(r), l['leitura'], l['motivo'], l['K'], l['L'] or None]
    if RITMO: vals += [l['dOrc'] or '—', l['vOrc'] or None, l['mudou'] or None, l['olhar'] or None]
    cinza = l['leitura'] in ('Só 2026', 'Só 2027', 'Não executado') and not l['olhar']
    for c, v in enumerate(vals, 1):
        cel = ws.cell(row=r, column=c, value=v)
        cel.font = Font(name=F, size=9, bold=(c in (11, 16)), color='94A3B8' if (cinza and c not in (4, 7)) or c in (13, 14) else '151E49')
        cel.alignment = Alignment(vertical='top', wrap_text=c in (3, 5, 10, 12, 13, 15, 16), horizontal='center' if c in (1, 11) else None)
        cel.border = borda
        if c in (4, 7, 8, 14): cel.number_format = MOEDA
        if l['olhar']: cel.fill = fill('FFEDD5')
        elif l['leitura'] in COR: cel.fill = fill(COR[l['leitura']])
    if l['olhar']: ws.cell(row=r, column=16).fill = fill('FDBA74')
    elif l['leitura'] == 'Dúvida' and not l['K']: ws.cell(row=r, column=11).fill = fill('FDE68A')
ult = H + len(linhas)

dv = DataValidation(type='list', formula1='"SIM,NÃO"', allow_blank=True, showDropDown=False)
dv.error = 'Use SIM ou NÃO'
ws.add_data_validation(dv)
dv.add('K{0}:K{1}'.format(H + 1, ult + 200))

for col, w in zip('ABCDEFGHIJKLMNOP', [5, 10, 42, 13, 52, 18, 13, 13, 14, 60, 12, 30, 36, 12, 30, 30][:NC]):
    ws.column_dimensions[col].width = w
ws.freeze_panes = 'D6'
ws.auto_filter.ref = 'A{0}:{1}{2}'.format(H, 'ABCDEFGHIJKLMNOP'[NC - 1], ult)

# ---- Resumo: tudo por fórmula sobre a aba de comparação ----
rs = wb.create_sheet('Resumo')
rs['A1'] = 'Resumo da comparação (atualiza sozinho com as marcações)'
rs['A1'].font = Font(name=F, bold=True, size=12, color=AZUL)
C = "'Comparação'!"
itens = [
    ('Total ' + B26 + ' (R$)', '=SUM({0}D6:D1000)'.format(C)),
    ('Total Orç 2027 (R$)', '=SUM({0}G6:G1000)'.format(C)),
    ('Itens marcados SIM — ' + B26 + ' (R$)', '=SUMIFS({0}D6:D1000,{0}K6:K1000,"SIM")'.format(C)),
    ('Itens marcados SIM — Orç 2027 (R$)', '=SUMIFS({0}G6:G1000,{0}K6:K1000,"SIM")'.format(C)),
    ('Variação dos itens que comparam (R$)', '=B6-B5'),
    ('Variação dos itens que comparam (%)', '=IF(B5=0,0,B6/B5-1)'),
    ('Pares marcados SIM', '=COUNTIF({0}K6:K1000,"SIM")'.format(C)),
    ('Dúvidas ainda sem resposta', '=COUNTIFS({0}I6:I1000,"Dúvida",{0}K6:K1000,"")'.format(C)),
]
if RITMO:
    itens += [('Linhas para olhar de novo (o ritmo mudou)', '=COUNTIF({0}P6:P1000,"?*")'.format(C)),
              ('Total Orç 2026, versão anterior (R$)', '=SUM({0}N6:N1000)'.format(C))]
for i, (rot, f) in enumerate(itens):
    r = 3 + i
    a = rs.cell(row=r, column=1, value=rot); a.font = Font(name=F, size=10)
    b = rs.cell(row=r, column=2, value=f); b.font = Font(name=F, size=10, bold=True, color=AZUL)
    b.number_format = '0.0%' if '(%)' in rot else ('#,##0' if 'Pares' in rot or 'Dúvidas' in rot or 'Linhas' in rot else MOEDA)
rf = 4 + len(itens)
rs.cell(row=rf, column=1, value='Fonte: aba Comparação (' + MEGA + '). ' + FONTE26 + ' ' + NOTA).font = Font(name=F, size=8, color='94A3B8')
rs.column_dimensions['A'].width = 44
rs.column_dimensions['B'].width = 18

os.makedirs(os.path.join(S, 'saida'), exist_ok=True)
out = os.path.join(S, 'saida', ('comparacao_ritmo_' if RITMO else 'comparacao_itens_') + CIDADE + '.xlsx')
wb.save(out)
print(out, os.path.getsize(out), '· olhar de novo:', sum(1 for l in linhas if l['olhar']), '·', NOTA)
