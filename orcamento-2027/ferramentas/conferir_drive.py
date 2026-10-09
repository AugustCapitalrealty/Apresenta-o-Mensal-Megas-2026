"""Confere se o Drive já tem as imagens da pasta IMAGENS - SLIDES com o MESMO conteúdo (MD5) da pasta local.
Criado em 09/10/2026: conta_drive.py só olha os "GRAFICO - " pelo nome; sub capas e trilhas são regravadas com o
mesmo nome, e só o conteúdo diz se a versão nova já subiu. Gere o deck só depois de "tudo no Drive".

Uso (de dentro de orcamento-2027):  python ferramentas/conferir_drive.py [--horas 12] [--esperar MINUTOS]
  --horas: confere os arquivos locais alterados nas últimas N horas (padrão 12)
Usa o token do clasp (~/.clasprc.json; só metadados); nunca imprime o token."""
import hashlib, json, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conta_drive import LOCAL, token   # noqa: E402


def md5(p):
    h = hashlib.md5()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def no_drive(tk, nomes):
    """nome → conjunto de md5 dos arquivos com esse nome no Drive (consulta por prefixo, em lotes)."""
    out = {}
    for pref in sorted({n.split(' - ')[0] + ' - ' for n in nomes}):
        pag = None
        while True:
            q = {'q': "name contains '%s' and trashed = false" % pref, 'fields': 'nextPageToken, files(name, md5Checksum)',
                 'pageSize': 1000, 'corpora': 'allDrives', 'includeItemsFromAllDrives': 'true', 'supportsAllDrives': 'true'}
            if pag: q['pageToken'] = pag
            req = urllib.request.Request('https://www.googleapis.com/drive/v3/files?' + urllib.parse.urlencode(q),
                                         headers={'Authorization': 'Bearer ' + tk})
            r = json.load(urllib.request.urlopen(req))
            for f in r.get('files', []): out.setdefault(f['name'], set()).add(f.get('md5Checksum'))
            pag = r.get('nextPageToken')
            if not pag: break
    return out


def main(args):
    sys.stdout.reconfigure(encoding='utf-8')
    horas = float(args[args.index('--horas') + 1]) if '--horas' in args else 12
    esperar = float(args[args.index('--esperar') + 1]) if '--esperar' in args else 0
    limite = time.time() - horas * 3600
    locais = {n: md5(os.path.join(LOCAL, n)) for n in os.listdir(LOCAL)
              if not n.startswith('PODE EXCLUIR') and os.path.getmtime(os.path.join(LOCAL, n)) >= limite
              and n.lower().endswith(('.png', '.jpg'))}
    fim = time.time() + esperar * 60
    while True:
        drive = no_drive(token(), locais)
        faltam = sorted(n for n, h in locais.items() if h not in drive.get(n, set()))
        print('%d imagens alteradas nas últimas %g h · %d já no Drive com o conteúdo novo · faltam %d' %
              (len(locais), horas, len(locais) - len(faltam), len(faltam)))
        if not faltam:
            print('tudo no Drive — pode gerar'); return
        for n in faltam[:12]: print('   falta:', n)
        if time.time() >= fim: return
        time.sleep(45)


if __name__ == '__main__':
    main(sys.argv[1:])
