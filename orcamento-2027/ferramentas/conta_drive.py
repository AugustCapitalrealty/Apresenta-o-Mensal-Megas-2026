"""Conta no Drive (API, só metadados) os PNG "GRAFICO - " que já subiram, comparando com os da pasta local.
Uso: python conta_drive.py [--esperar MINUTOS]   (com --esperar, repete a cada 45 s até subir tudo)
Usa o token do clasp (~/.clasprc.json); nunca imprime o token."""
import json, os, sys, time, urllib.parse, urllib.request

LOCAL = r'G:\Drives compartilhados\08.000 - Business Analysis\APRESENTAÇÃO ORÇAMENTO\IMAGENS - SLIDES'


def token():
    rc = json.load(open(os.path.expanduser('~/.clasprc.json'), encoding='utf-8'))
    t = rc.get('tokens', {}).get('default') or rc.get('token') or {}
    cs = rc.get('oauth2ClientSettings', {})
    cid = t.get('client_id') or cs.get('clientId')
    sec = t.get('client_secret') or cs.get('clientSecret')
    dados = urllib.parse.urlencode({'client_id': cid, 'client_secret': sec, 'refresh_token': t['refresh_token'],
                                    'grant_type': 'refresh_token'}).encode()
    return json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', dados))['access_token']


def no_drive(tk):
    nomes, pag = set(), None
    while True:
        q = {'q': "name contains 'GRAFICO - ' and trashed = false", 'fields': 'nextPageToken, files(name)',
             'pageSize': 1000, 'corpora': 'allDrives', 'includeItemsFromAllDrives': 'true', 'supportsAllDrives': 'true'}
        if pag: q['pageToken'] = pag
        req = urllib.request.Request('https://www.googleapis.com/drive/v3/files?' + urllib.parse.urlencode(q),
                                     headers={'Authorization': 'Bearer ' + tk})
        r = json.load(urllib.request.urlopen(req))
        nomes |= {f['name'] for f in r.get('files', [])}
        pag = r.get('nextPageToken')
        if not pag: return nomes


locais = {n for n in os.listdir(LOCAL) if n.startswith('GRAFICO - ') and n.endswith('.png')}
espera = float(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == '--esperar' else 0
fim = time.time() + espera * 60
tk = token()
while True:
    faltam = locais - no_drive(tk)
    print('%s · no Drive: %d de %d' % (time.strftime('%H:%M:%S'), len(locais) - len(faltam), len(locais)), flush=True)
    if not faltam or time.time() > fim: break
    time.sleep(45)
print('PRONTO' if not faltam else 'AINDA FALTAM %d' % len(faltam))
