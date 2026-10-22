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
const ORC_PASTA_ATUALIZACAO = 'ATUALIZAÇÃO 22-10-2026';

// Nome da planilha convertida pelo nome do arquivo.
const ORC_NOMES_ATUALIZACAO = [
  [/^mega-esteio-metragem/i, 'MEGA ESTEIO - METRAGEM-COND 2027 (22-10-2026 Pátio)'],
  [/^metragem-itajai/i, 'MEGA ITAJAÍ - METRAGEM-COND 2027 (22-10-2026)'],
  [/^metragem-curitiba/i, 'MEGA CURITIBA - METRAGEM-COND 2027 (22-10-2026)'],
  [/^090-despesas-gerais-item/i, 'MESTRA - 090 - DESPESAS GERAIS (22-10-2026)'],
  [/^070-servicos-de-terceiros-ajustado/i, 'MESTRA - 070 - SERVIÇOS DE TERCEIROS (22-10-2026)'],
  [/^contratos-ajustados\.csv$/i, 'MESTRA - CONTRATOS 2027 - TODOS OS MEGAS (rev03, 22-10-2026)'],
  [/^mega-esteio-mensal/i, 'MEGA ESTEIO - MENSAL 2027 (22-10-2026)'],
  [/^mega-itajai-mensal/i, 'MEGA ITAJAÍ - MENSAL 2027 (22-10-2026)'],
  [/^mega-curitiba-mensal/i, 'MEGA CURITIBA - MENSAL 2027 (22-10-2026)'],
  // Mantidos de 12/10 caso reexecutado lá:
  [/^mega-esteio\.xlsx$/i, 'MEGA ESTEIO - METRAGEM-COND 2027 (12-10-2026 19h41)'],
  [/^mega-itajai\.xlsx$/i, 'MEGA ITAJAÍ - METRAGEM-COND 2027 (12-10-2026 19h42)'],
  [/^mega-curitiba\.xlsx$/i, 'MEGA CURITIBA - METRAGEM-COND 2027 (12-10-2026 19h49)'],
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
    if (ja) {
      if (/^metragem-itajai/i.test(nomeArq)) _orcCorrigirRodapeMetragemItajai_(ja.getId());
      ids[nomeArq] = { id: ja.getId(), nome: nome, ja: true };
      return;
    }
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
      if (/^metragem-itajai/i.test(nomeArq)) _orcCorrigirRodapeMetragemItajai_(id);
    }
    ids[nomeArq] = { id: id, nome: nome };
    Logger.log(nomeArq + ' → ' + nome + ' (' + id + ')');
  });
  // Guarda também o ID da v5 do gestor (pasta VERSÕES) e exporta a planilha de apontamentos do diretor para JSON.
  try {
    const pv = DriveApp.getFolderById('103UkBjeBrhvE1feH94aVOO6jymCoim7s').getFiles();
    while (pv.hasNext()) {
      const fv = pv.next();
      if (/v5/i.test(fv.getName())) ids._v5 = { id: fv.getId(), nome: fv.getName() };
    }
  } catch (e) { Logger.log('v5 não consultada: ' + e.message); }
  try {
    const ssAj = SpreadsheetApp.openById('1kbDZfe0I_dNTDZ-oWijm-YG7q_5XhL2n-OnqyP377Hc');
    const abasAj = {};
    ssAj.getSheets().forEach(sh => { abasAj[sh.getName()] = sh.getDataRange().getValues(); });
    const txtAj = JSON.stringify(abasAj, null, 1), arqAj = existe('ajustes_diretor.json');
    if (arqAj) arqAj.setContent(txtAj); else pasta.createFile('ajustes_diretor.json', txtAj, MimeType.PLAIN_TEXT);
  } catch (e) { Logger.log('ajustes_diretor.json não exportado: ' + e.message); }
  const txt = JSON.stringify(ids, null, 1), arq = existe('IDS.json');
  if (arq) arq.setContent(txt); else pasta.createFile('IDS.json', txt, MimeType.PLAIN_TEXT);
  Logger.log('Pronto: ' + Object.keys(ids).length + ' itens — IDs em IDS.json (' + pasta.getUrl() + ')');
}

// Na Metragem-Itajai).xlsx de 22/10/2026 as 5 linhas abaixo de TOTAL ÁREA COMUM vieram coladas de Curitiba (R$ M² ANO -
// CURITIBA, IPTU 494.047,50 e Seguro 603.782,65): corrige na planilha convertida com o IPTU e o Seguro de Itajaí e o
// R$/m² pela área de Itajaí.
function _orcCorrigirRodapeMetragemItajai_(id) {
  try {
    const sh = SpreadsheetApp.openById(id).getSheets()[0];
    const dados = sh.getDataRange().getValues();
    let idxTot = -1;
    for (let i = 0; i < dados.length; i++) {
      if (/^total .rea comum$/i.test(_orcNorm_(dados[i][0]))) { idxTot = i; break; }
    }
    if (idxTot < 0 || idxTot + 5 >= dados.length) return;
    if (!/curitiba/i.test(String(dados[idxTot + 1][0] || ''))) return;
    const rodape = [
      ['R$ M² ANO - ITAJAÍ', -2.79, -3.76, -3.46, -4.09, -0.62],
      ['IPTU', -348656.05, -618919.49, -455822.87, -480893.13, -25070.26],
      ['SEGURO', -536127.92, -589740.72, -549695.01, -577179.76, -27484.75],
      ['TOTAL ÁREA COMUM + IPTU + SEGURO', -4020616.93, -6091943.30, -5499791.05, -6363233.56, -863442.51],
      ['R$ M² ANO - ITAJAÍ', -3.58, -4.69, -4.24, -4.90, -0.66]
    ];
    sh.getRange(idxTot + 2, 1, 5, 6).setValues(rodape);
    SpreadsheetApp.flush();
    Logger.log('MEGA ITAJAÍ - METRAGEM-COND: rodapé corrigido (estava com IPTU/Seguro/R$/m² de Curitiba).');
  } catch (e) { Logger.log('Rodapé de Itajaí não corrigido: ' + e.message); }
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
