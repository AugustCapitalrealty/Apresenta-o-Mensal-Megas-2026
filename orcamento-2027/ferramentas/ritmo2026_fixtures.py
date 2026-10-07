"""Ritmo 2026 exportado do sistema → fixtures JSON da comparação 2026 × 2027. Criado em 07/10/2026.

Lê ferramentas/bases_2026/ (ver o LEIA-ME de lá) e grava, no formato que comparacao_base.js já lê:
  teste/fixture_ritmo2026_090.json            ← "RITMO 2026 - 090 DESPESAS GERAIS …xlsx" (mesmo formato de
                                                fixture_modelos2026_megas.json: cabeçalho + linhas, meses negativos)
  teste/fixture_contratos_2026_cadastro.json  ← "CONTRATOS 2026 - CADASTRO …csv" (mesmo formato de
                                                fixture_contratos_ano_anterior.json)
Uso (de dentro de orcamento-2027): python ferramentas/ritmo2026_fixtures.py
"""
import csv, glob, json, os, re
import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(AQUI)
BASES = os.path.join(AQUI, 'bases_2026')


def ultimo(padrao):
    arqs = sorted(glob.glob(os.path.join(BASES, padrao)))
    if not arqs: raise SystemExit('Não achei ' + padrao + ' em ' + BASES)
    return arqs[-1]


def gravar(nome, linhas):
    with open(os.path.join(PROJETO, 'teste', nome), 'w', encoding='utf-8') as f:
        json.dump(linhas, f, ensure_ascii=False)
    print(nome, len(linhas) - 1, 'linhas')


# 090: igual à planilha, só sem as colunas vazias do fim.
ws = openpyxl.load_workbook(ultimo('RITMO 2026 - 090 *.xlsx'), read_only=True, data_only=True).worksheets[0]
r090 = [list(r[:20]) for r in ws.iter_rows(values_only=True) if r[0] is not None]
r090 = [r090[0]] + [[str(v) if i < 8 and v is not None else (float(v or 0) if i >= 8 else v) for i, v in enumerate(r)] for r in r090[1:]]
gravar('fixture_ritmo2026_090.json', r090)

# Cadastro: ="…" vira texto, decimal com vírgula vira número, dd/mm/aaaa e Jan/26 viram data ISO.
MES = {m: i + 1 for i, m in enumerate('jan fev mar abr mai jun jul ago set out nov dez'.split())}


def valor(v, col):
    v = v.strip()
    m = re.fullmatch(r'="(.*)"', v)
    if m: return m.group(1) or None
    if v == '': return None
    m = re.fullmatch(r'(\d\d)/(\d\d)/(\d{4})', v)
    if m: return '%s-%s-%sT00:00:00' % (m.group(3), m.group(2), m.group(1))
    if col == 'Valor' or re.fullmatch(r'\w{3}/\d\d', col):
        return float(v.replace('.', '').replace(',', '.'))
    return v


with open(ultimo('CONTRATOS 2026 - CADASTRO *.csv'), encoding='latin-1') as f:
    rd = list(csv.reader(f, delimiter=';'))
cab = [('20%s-%02d-26T00:00:00' % (c[-2:], MES[c[:3].lower()])) if re.fullmatch(r'\w{3}/\d\d', c) else c for c in rd[0]]
cad = [cab] + [[valor(v, rd[0][i]) for i, v in enumerate(r)] for r in rd[1:] if any(x.strip() for x in r)]
gravar('fixture_contratos_2026_cadastro.json', cad)
