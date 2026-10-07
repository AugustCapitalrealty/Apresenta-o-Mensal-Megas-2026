"""Uma planilha por Mega com o conteúdo dele tirado das planilhas mestras.
Uso: python planilha_mega.py  (gera MEGA_<cidade>.xlsx e .b64 no scratchpad)"""
import base64, json, os, datetime, openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# Rode de dentro de orcamento-2027:  python ferramentas/planilha_mega.py
# Lê as cópias das planilhas mestras em teste/ (fixture_*.json) e grava
# ferramentas/saida/MEGA_<cidade>.xlsx. Para atualizar uma mestra, exporte-a
# do Drive como .xlsx e converta para JSON no mesmo formato (linhas da 1ª aba).
S = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(S, '..', 'teste')
SAIDA = os.path.join(S, 'saida'); os.makedirs(SAIDA, exist_ok=True)
c27 = json.load(open(os.path.join(FIX, 'fixture_contratos_2027_completo.json'), encoding='utf-8'))   # "CONTRATOS-2027-COMPLETO"
c26 = json.load(open(os.path.join(FIX, 'fixture_contratos_ano_anterior.json'), encoding='utf-8'))
mod26 = json.load(open(os.path.join(FIX, 'fixture_modelos2026_megas.json'), encoding='utf-8'))

MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
AZUL = '151E49'
F = 'Arial'
MOEDA = '#,##0.00;-#,##0.00;"–"'

def n(v):
    if isinstance(v, (int, float)): return float(v)
    try: return float(str(v).replace('.', '').replace(',', '.'))
    except Exception: return 0.0

def cabecalho(ws, linha, titulos, larguras):
    for c, (t, w) in enumerate(zip(titulos, larguras), 1):
        cel = ws.cell(row=linha, column=c, value=t)
        cel.font = Font(name=F, bold=True, size=9, color='FFFFFF')
        cel.fill = PatternFill('solid', start_color=AZUL, end_color=AZUL)
        cel.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.freeze_panes = ws.cell(row=linha + 1, column=1)

def titulo(ws, texto, fonte):
    ws['A1'] = texto; ws['A1'].font = Font(name=F, bold=True, size=12, color=AZUL)
    ws['A2'] = fonte; ws['A2'].font = Font(name=F, size=8, color='94A3B8')

def aba_valores(wb, nome, tit, fonte, colunas, larguras, linhas, meses_ini):
    """linhas: listas com as colunas de texto + 12 valores; a coluna Total é fórmula."""
    ws = wb.create_sheet(nome)
    titulo(ws, tit, fonte)
    cab = colunas + MESES + ['Total']
    cabecalho(ws, 4, cab, larguras + [11] * 12 + [13])
    for i, l in enumerate(linhas):
        r = 5 + i
        for c, v in enumerate(l, 1):
            cel = ws.cell(row=r, column=c, value=v)
            cel.font = Font(name=F, size=9)
            if c > meses_ini: cel.number_format = MOEDA
        a, b = get_column_letter(meses_ini + 1), get_column_letter(meses_ini + 12)
        t = ws.cell(row=r, column=meses_ini + 13, value='=SUM({0}{2}:{1}{2})'.format(a, b, r))
        t.font = Font(name=F, size=9, bold=True); t.number_format = MOEDA
    ult = 4 + len(linhas)
    r = ult + 1
    ws.cell(row=r, column=1, value='TOTAL').font = Font(name=F, size=9, bold=True)
    for c in range(meses_ini + 1, meses_ini + 14):
        L = get_column_letter(c)
        cel = ws.cell(row=r, column=c, value='=SUM({0}5:{0}{1})'.format(L, ult))
        cel.font = Font(name=F, size=9, bold=True); cel.number_format = MOEDA
    ws.auto_filter.ref = 'A4:{0}{1}'.format(get_column_letter(meses_ini + 13), ult)
    return ws

def gerar(cidade, unidade, arquivos):
    wb = Workbook()
    ws = wb.active; ws.title = 'LEIA-ME'
    titulo(ws, unidade.upper() + ' — base do Orçamento 2027',
           'Cada aba é o recorte deste Mega tirado das planilhas mestras (pasta "00 - PLANILHAS MESTRAS"). '
           'Para atualizar, gere de novo a partir das mestras; não edite os valores aqui.')
    ws['A4'] = 'Arquivos do Mega e de onde vem cada coisa'; ws['A4'].font = Font(name=F, bold=True, size=10, color=AZUL)
    cabecalho(ws, 5, ['Arquivo', 'O que é', 'A apresentação usa?', 'Onde fica', 'Link'], [46, 70, 14, 30, 12])
    for i, (nome, oque, usa, onde, fid, tipo) in enumerate(arquivos):
        r = 6 + i
        url = 'https://docs.google.com/{0}/d/{1}/edit'.format(tipo, fid)
        for c, v in enumerate([nome, oque, usa, onde, '=HYPERLINK("{0}","abrir")'.format(url)], 1):
            cel = ws.cell(row=r, column=c, value=v)
            cel.font = Font(name=F, size=9, bold=(c == 1), color='065CA9' if c == 5 else '151E49')
            cel.alignment = Alignment(vertical='top', wrap_text=c == 2)
    ws.freeze_panes = None

    # Orç 2026 por item (Modelos 2025 Megas).
    lin = [[r[0].replace('\xa0', ' ').strip(), r[4], str(r[5]).strip()] + [-n(v) for v in r[8:20]]
           for r in mod26[1:] if r[2] == unidade]
    lin = [l for l in lin if any(abs(v) > 0.005 for v in l[3:])]
    lin.sort(key=lambda l: (l[0].lower(), -sum(l[3:])))
    aba_valores(wb, 'Orç 2026 por item', unidade + ' — Orçamento 2026 item a item (R$)',
                'Fonte: "Modelos 2025 Megas" (00 - PLANILHAS MESTRAS). Valores positivos = despesa.',
                ['Conta', 'Centro de custo', 'Item'], [24, 30, 60], lin, 3)

    def contratos(dados, ano):
        cab = dados[0]
        meses = []
        for c, h in enumerate(cab):
            # "jan./27" vira a data 27/01/<ano corrente> na importação: o ano
            # do cabeçalho é o DIA da data.
            if isinstance(h, datetime.datetime) and h.day == ano % 100: meses.append((h.month, c))
            elif isinstance(h, str) and len(h) >= 10 and h[4] == '-' and int(h[8:10]) == ano % 100: meses.append((int(h[5:7]), c))
            elif isinstance(h, str) and h.endswith('/' + str(ano)[2:]) and '.' in h:
                meses.append((['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].index(h[:3].lower()) + 1, c))
        meses = [c for _, c in sorted(meses)]
        assert len(meses) == 12, (ano, meses)
        ix = {str(h).strip().lower(): c for c, h in enumerate(cab) if isinstance(h, str)}
        def col(nome):
            return [c for k, c in ix.items() if k.startswith(nome)][0]
        cu, cn, cd, cv, cr, ci, cf = col('unidade'), col('nome'), col('descri'), col('valoriza'), col('rejuste'), col('data in'), col('data fim')
        def data(v):
            if isinstance(v, datetime.datetime): return v.strftime('%d/%m/%Y')
            s = str(v or '')
            return s[8:10] + '/' + s[5:7] + '/' + s[:4] if len(s) >= 10 and s[4] == '-' else s
        out = []
        for r in dados[1:]:
            if str(r[cu]).strip() != unidade: continue
            vals = [abs(n(r[c])) for c in meses]
            if sum(vals) < 0.5: continue
            out.append([str(r[cn]).strip(), str(r[cd] or '').replace('\n', ' ').strip()[:160], str(r[cv] or '').strip(),
                        data(r[ci]), data(r[cf]), str(r[cr] or '').strip()] + vals)
        out.sort(key=lambda l: (l[2], -sum(l[6:])))
        return out
    aba_valores(wb, 'Contratos 2026', unidade + ' — contratos com os valores de 2026 (R$)',
                'Fonte: "2025 - Contratos" (00 - PLANILHAS MESTRAS). Só contratos com valor em 2026.',
                ['Fornecedor', 'Descrição', 'Conta', 'Início', 'Fim', 'Reajuste'], [34, 50, 22, 11, 11, 9], contratos(c26, 2026), 6)
    # Sem contrato com valor em 2027, a aba não sai.
    k27 = contratos(c27, 2027)
    if k27:
        aba_valores(wb, 'Contratos 2027', unidade + ' — contratos com os valores de 2027 (R$)',
                    'Fonte: "CONTRATOS-2027-COMPLETO" (00 - PLANILHAS MESTRAS). Só contratos com valor em 2027.',
                    ['Fornecedor', 'Descrição', 'Conta', 'Início', 'Fim', 'Reajuste'], [34, 50, 22, 11, 11, 9], k27, 6)

    # Real 2025 mês a mês por conta (planilha mensal do Mega, aba Financeiro 2025).
    fin = json.load(open(os.path.join(FIX, 'fixture_financeiro2025_' + cidade + '.json'), encoding='utf-8'))
    real = [c for c, h in enumerate(fin[0]) if isinstance(h, str) and h.startswith('Real') and 'Ano' not in h][:12]
    lin = []
    for r in fin[1:]:
        nome = str(r[0] or '').replace('\xa0', ' ').strip()
        if not nome or nome.upper().startswith('R$'): continue
        if nome.upper().startswith('TOTAL'): break
        vals = [-n(r[c]) for c in real]
        if any(abs(v) > 0.005 for v in vals): lin.append([nome] + vals)
    aba_valores(wb, 'Real 2025 mensal', unidade + ' — realizado 2025 por conta (R$)',
                'Fonte: aba "Financeiro 2025" da planilha da apresentação mensal dos Megas.',
                ['Conta'], [40], lin, 1)

    out = os.path.join(SAIDA, 'MEGA_' + cidade + '.xlsx')
    wb.save(out)
    print(cidade, os.path.getsize(out), 'bytes;', {ws.title: ws.max_row for ws in wb.worksheets})

S_ = 'spreadsheets'; P_ = 'presentation'
MESTRAS = '00 - PLANILHAS MESTRAS'
COMUNS = [
    ('Modelos 2025 Megas', 'Orçamento 2026 item a item de todos os Megas (mestra)', 'Não', MESTRAS, '1X39BzfFKwSo2v1wt0Lhe1kxjnSdnn4D74kvAxg41bOM', S_),
    ('2025 - Contratos', 'Cadastro de contratos com os valores de 2026, todos os Megas (mestra)', 'Sim', MESTRAS, '11bcQ0zD81kjx_aGNg8nI6s72gxsea3vSH6AcnMssU6A', S_),
    ('CONTRATOS-2027-COMPLETO', 'Cadastro de contratos com os valores de 2027, todos os Megas (mestra) — fonte dos contratos de Itajaí e Esteio', 'Sim (Itajaí e Esteio)', MESTRAS, '1cwbW249I--uhsg3trSTQetb88gnjDgLGQ3aW5Xk_jeY', S_),
    ('2026', 'Totais planejados de 2026 por conta, todas as unidades somadas (mestra)', 'Não', MESTRAS, '113GH2xaZjBWHxAE9qMzko0LiPkR2iKxc7U1h2Aku6rA', S_),
    ('ORÇAMENTO 2027 - TEXTOS DAS TABELAS', 'Textos curtos que aparecem nas tabelas da apresentação', 'Sim', '00 - CONTROLE DA APRESENTAÇÃO', '1whAdU26wkp6gV5RKtgX7jaBhhGIywZ3iV2CSiXdacGY', S_),
]
gerar('curitiba', 'Mega Curitiba', [
    ('MEGA CURITIBA (apresentação)', 'Apresentação do orçamento que o gerador escreve', 'É ela', 'MEGA CURITIBA', '1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI', P_),
    ('METRAGEM-COND-MEGA-CURITIBA', 'Relatório da controladoria: total por conta, IPTU, seguro e R$/m² (Real 25, Orç 26, Ritmo 26, Orç 27)', 'Sim', 'MEGA CURITIBA', '1D8CeKKOKXSsO-BpfNqy8oCLvX019np3Zz_P3fcP3s1c', S_),
    ('Despesas-Mensal-2026-x-2027', 'Relatório da controladoria: mês a mês por conta (Orç 26, Real 26, Orç 27)', 'Sim', 'MEGA CURITIBA', '1QhfFrV8EzUVChX0DGtrTdaOjsMnLBLyHmbI0Eiy-yjM', S_),
    ('090-Despesas-Gerais - MEGA CURITIBA - 2027', 'Modelo do orçamento 2027 item a item (despesas gerais, inclui manutenção)', 'Sim', 'MEGA CURITIBA', '1cMgo0gBmqFj0K8rKDtlnqyEBy7TlMK0OuAS6SMs5_OA', S_),
    ('070-Servicos-de-Terceiros - MEGA CURITIBA - 2027', 'Modelo do orçamento 2027 item a item (serviços de terceiros)', 'Sim', 'MEGA CURITIBA', '1BrIqFUFhFN9IJG77SidP5mlkID4U5UrrRzXfTepBXBw', S_),
    ('MEGA CURITIBA - MANUTENÇÕES DE IMOVEIS - CONTRATOS', 'Contratos de manutenção de 2027 mês a mês', 'Sim', 'MEGA CURITIBA', '1diDWTo5tQPL28YRrejGILSEsRhPkUt4kasmC8ehVlrA', S_),
    ('MEGA CURITIBA - SEGURANÇA E VIGILANCIA - CONTRATOS', 'Contratos de segurança de 2027 mês a mês', 'Sim', 'MEGA CURITIBA', '12EFl12AKmwwCwEZ84j2UO2TQiT2B9I9QwrK5cYdLqK8', S_),
    ('MEGA CURITIBA - LIMPEZA E CONSERVAÇÃO - CONTRATOS', 'Contratos de limpeza de 2027 mês a mês', 'Sim', 'MEGA CURITIBA', '1eLJmH-lHef_mczrQ6kgxOs_aGWHcJB6ZMJMLzF5H4FI', S_),
    ('MEGA CURITIBA ORÇAMENTO', 'Cópia da apresentação com os apontamentos do gestor (29/09)', 'Não', 'MEGA CURITIBA / _ARQUIVO', '1O8IyowBGoowenOFxOSXbcrsoZMzCPzLxBkp2xuCFDf0', P_),
    ('090 / 070 - MEGA CURITIBA - 2026', 'Lançamentos (notas) de jan a jul/2026 de manutenção e segurança — podem abrir os avulsos de 2026', 'Não', 'MEGA CURITIBA / _ARQUIVO', '1nFlC5k98r8Src8hzKly98-Z7WdMkZPvWi3fD7FwESJQ', S_),
    ('Documentos', 'Lançamentos de 2026 (manutenção de máquinas) de Curitiba que estavam na pasta de Itajaí', 'Não', 'MEGA CURITIBA / _ARQUIVO', '1kYE88H_oWkffPeTvHXkyju9rqF1djEKkW0gllqkkg5w', S_),
    ('MEGA CURITIBA - ... - SERVIÇOS (3)', 'Itens do modelo 2027 por conta; repetem o 090/070', 'Não', 'MEGA CURITIBA / _ARQUIVO', '1IdMCRuBOXbpJurfGTA1wm28rFh_Nvq1CioNkAJYHtsQ', S_),
] + COMUNS)
gerar('itajai', 'Mega Itajaí', [
    ('MEGA ITAJAÍ (apresentação)', 'Apresentação do orçamento que o gerador escreve', 'É ela', 'MEGA ITAJAÍ', '1IBhGpq4PPPHj4il-2zEYRX1a_7ftJN_1X0VRFb4kA_E', P_),
    ('METRAGEM-COND-MEGA-ITAJAI', 'Relatório da controladoria: total por conta, IPTU, seguro e R$/m²', 'Sim', 'MEGA ITAJAÍ', '1MXl34wpw1JWxtssYydfFTX9pXX2nmWjxWSuFuikEZYw', S_),
    ('Despesas-Mensal-2026-x-2027 - MEGA ITAJAI', 'Relatório da controladoria: mês a mês por conta', 'Sim', 'MEGA ITAJAÍ', '1IaJvCRMBnuxJhcDhDq3ECvqRRTsyAM4Gvku8jEKrwgA', S_),
    ('090-Despesas-Gerais-MEGA-ITAJAI-2027', 'Modelo do orçamento 2027 item a item (despesas gerais)', 'Sim', 'MEGA ITAJAÍ', '1x2Fqc_t2IEOvc5FnZVyNRo9YUG-3v3viGqmplRJrgwg', S_),
    ('070-Servicos-de-Terceiros - MEGA ITAJAÍ 2027', 'Modelo do orçamento 2027 item a item (serviços de terceiros)', 'Sim', 'MEGA ITAJAÍ', '1jlUb8NJbt6uhfezuK7YHU2qxmxQN0B8wEvaQu8uI0xY', S_),
    ('MODELOS-ITAJAI', 'Itens de segurança do modelo 2027 (Alfa Sense); repetem o 070', 'Não', 'MEGA ITAJAÍ / _ARQUIVO', '1AzjCzYKSp5tRR99qnOALQdi1HF_7kEHZ0tz3B6PpKGM', S_),
] + COMUNS)
gerar('esteio', 'Mega Esteio', [
    ('MEGA ESTEIO (apresentação)', 'Apresentação do orçamento que o gerador escreve', 'É ela', 'MEGA ESTEIO', '1hynGvAf4fCYFexCOi5jvf7dm50TFFwbmPV1jwLy1w_0', P_),
    ('METRAGEM-COND-MEGA-ESTEIO', 'Relatório da controladoria: total por conta, IPTU, seguro e R$/m²', 'Sim', 'MEGA ESTEIO', '1mlDwyG5x6L7SPbjGkG1B8Vq8T34EqGbBiZWnm7Pk2jE', S_),
    ('Despesas-Mensal-2026-x-2027 - MEGA ESTEIO', 'Relatório da controladoria: mês a mês por conta', 'Sim', 'MEGA ESTEIO', '1Un3Seh4c9BJsVBuRFzYIYoiNb_KuXgg84AIbaN9DHBg', S_),
    ('090-Despesas-Gerais-MEGA-ESTEIO - 2027', 'Modelo do orçamento 2027 item a item (despesas gerais)', 'Sim', 'MEGA ESTEIO', '1jC7aDDGSDF6yzPxzmTlbGIbwbe4Se6svwj7XtZkG9qQ', S_),
    ('070-Servicos-de-Terceiros- MEGA ESTEIO 2027', 'Modelo do orçamento 2027 item a item (serviços de terceiros)', 'Sim', 'MEGA ESTEIO', '1hDki35EFiw1d6gGTt3bSb75flqdt-DCr9_Gb8VmkXpk', S_),
] + COMUNS)
