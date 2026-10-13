/**
 * ARQUIVO: 30_Importar.gs
 * FERRAMENTA: converte em Planilhas Google os arquivos de uma atualização que a sessão sem conector do Drive
 *             copiou (pelo G:) para uma pasta dentro da pasta do orçamento (12/10/2026).
 *
 *   ▸ importarAtualizacao() → lê a pasta ORC_PASTA_ATUALIZACAO; cada .xlsx vira uma Planilha Google (cópia com
 *     conversão pela API do Drive) e o .csv do cadastro de contratos (";" e Windows-1252, do sistema) vira uma
 *     planilha só com texto, como a importação do rev01. Os IDs vão para "IDS.json" na mesma pasta — a sessão lê
 *     pelo G: e troca os IDs no 01_Config.gs / 02_Dados.gs. Os arquivos originais ficam; nada é apagado.
 *     Arquivo já convertido (mesmo nome na pasta) não é refeito.
 */
const ORC_PASTA_ATUALIZACAO = 'ATUALIZAÇÃO 12-10-2026';

// Nome da planilha convertida pelo nome do arquivo.
const ORC_NOMES_ATUALIZACAO = [
  [/^mega-esteio\.xlsx$/i, 'MEGA ESTEIO - METRAGEM-COND 2027 (12-10-2026 19h41)'],
  [/^mega-itajai\.xlsx$/i, 'MEGA ITAJAÍ - METRAGEM-COND 2027 (12-10-2026 19h42)'],
  [/^mega-curitiba\.xlsx$/i, 'MEGA CURITIBA - METRAGEM-COND 2027 (12-10-2026 19h49)'],
  [/^090-/i, 'MESTRA - 090 - DESPESAS GERAIS (12-10-2026 19h54)'],
  [/^070-/i, 'MESTRA - 070 - SERVIÇOS DE TERCEIROS (12-10-2026 19h54)'],
  [/^contratos-atualizado\.csv$/i, 'MESTRA - CONTRATOS 2027 - TODOS OS MEGAS (rev02, 12-10-2026 19h56)'],
  [/^mega-esteio-ritmo/i, 'MEGA ESTEIO - RITMO 2026 (12-10-2026 20h43)'],
  [/^mega-itajai-ritmo/i, 'MEGA ITAJAÍ - RITMO 2026 (12-10-2026 20h43)'],
  [/^mega-curitiba-ritmo/i, 'MEGA CURITIBA - RITMO 2026 (12-10-2026 20h42)'],
  [/^iptu e seguro/i, 'IPTU E SEGURO - MEGAS 2027 (12-10-2026 19h50)']
];

function importarAtualizacao() {
  const pai = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const it = pai.getFoldersByName(ORC_PASTA_ATUALIZACAO);
  if (!it.hasNext()) throw new Error('Não achei a pasta "' + ORC_PASTA_ATUALIZACAO + '" dentro da pasta do orçamento.');
  const pasta = it.next(), token = ScriptApp.getOAuthToken(), ids = {};
  const existe = nome => { const f = pasta.getFilesByName(nome); return f.hasNext() ? f.next() : null; };
  const arquivos = [];
  const fs = pasta.getFiles();
  while (fs.hasNext()) arquivos.push(fs.next());
  arquivos.forEach(f => {
    const nomeArq = f.getName(), regra = ORC_NOMES_ATUALIZACAO.filter(r => r[0].test(nomeArq))[0];
    if (!regra || f.getMimeType() === MimeType.GOOGLE_SHEETS) return;
    const nome = regra[1], ja = existe(nome);
    if (ja) { ids[nomeArq] = { id: ja.getId(), nome: nome, ja: true }; return; }
    let id;
    if (/\.csv$/i.test(nomeArq)) id = _orcImportarCsvCadastro_(f, nome, pasta);
    else {
      const resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + f.getId() + '/copy?supportsAllDrives=true', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [pasta.getId()] })
      });
      if (resp.getResponseCode() !== 200) { Logger.log(nomeArq + ': conversão falhou (HTTP ' + resp.getResponseCode() + ') ' + resp.getContentText().slice(0, 200)); return; }
      id = JSON.parse(resp.getContentText()).id;
    }
    ids[nomeArq] = { id: id, nome: nome };
    Logger.log(nomeArq + ' → ' + nome + ' (' + id + ')');
  });
  const txt = JSON.stringify(ids, null, 1), arq = existe('IDS.json');
  if (arq) arq.setContent(txt); else pasta.createFile('IDS.json', txt, MimeType.PLAIN_TEXT);
  Logger.log('Pronto: ' + Object.keys(ids).length + ' planilhas — IDs em IDS.json (' + pasta.getUrl() + ')');
}

// CSV do cadastro de contratos do sistema → planilha com texto puro (como o rev01: "25,11", "jan./27", "18").
function _orcImportarCsvCadastro_(arquivo, nome, pasta) {
  const texto = arquivo.getBlob().getDataAsString('windows-1252');
  const MES = { jan: 'jan.', fev: 'fev.', mar: 'mar.', abr: 'abr.', mai: 'mai.', jun: 'jun.', jul: 'jul.', ago: 'ago.', set: 'set.',
                out: 'out.', nov: 'nov.', dez: 'dez.' };
  const linhas = Utilities.parseCsv(texto, ';').filter(r => r.some(v => String(v).trim() !== '')).map((r, i) => r.map(v => {
    let s = String(v).replace(/^="(.*)"$/, '$1');
    if (i === 0) s = s.replace(/^([A-Za-z]{3})\/(\d\d)$/, (x, a, b) => (MES[a.toLowerCase()] || a) + '/' + b);
    return s;
  }));
  const n = Math.max.apply(null, linhas.map(r => r.length));
  linhas.forEach(r => { while (r.length < n) r.push(''); });
  const ss = SpreadsheetApp.create(nome);
  DriveApp.getFileById(ss.getId()).moveTo(pasta);
  const sh = ss.getSheets()[0], rg = sh.getRange(1, 1, linhas.length, n);
  rg.setNumberFormat('@');
  rg.setValues(linhas);
  SpreadsheetApp.flush();
  return ss.getId();
}
