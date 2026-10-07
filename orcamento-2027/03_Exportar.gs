/**
 * ARQUIVO: 03_Exportar.gs
 * SEÇÃO:   FERRAMENTA — Exporta slides como PNG
 * DESCRIÇÃO: Salva cada slide de uma apresentação como PNG numa pasta do
 *            Drive compartilhado, para revisar fora do Slides (o Drive for
 *            Desktop sincroniza a pasta em G:). Usada para ler os
 *            apontamentos do gestor, que vêm como imagens coladas no deck.
 */

// Cópia revisada pelo gestor (29/09/2026) e a pasta "APRESENTAÇÃO ORÇAMENTO".
const ORC_DECK_REVISAO_ID = '1O8IyowBGoowenOFxOSXbcrsoZMzCPzLxBkp2xuCFDf0';
const ORC_PASTA_ORCAMENTO_ID = '13PO9xDvPG3wmoVLfv41fZZo0I3rvl_gw';

// Cópia com os comentários do gestor → _slides-exportados.
function exportarSlidesRevisao() { _orcExportarSlides_(ORC_DECK_REVISAO_ID, '_slides-exportados'); }
// Apresentação de Curitiba que o gerador escreve → _slides-gerados (revisão visual).
function exportarSlidesGerados() { _orcExportarSlides_(ORC_CIDADES.CURITIBA.deckId, '_slides-gerados'); }

function _orcExportarSlides_(deckId, nomePasta) {
  const deck = SlidesApp.openById(deckId);
  const pai = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const it = pai.getFoldersByName(nomePasta);
  const pasta = it.hasNext() ? it.next() : pai.createFolder(nomePasta);

  // Apaga a exportação anterior para não misturar versões.
  const velhos = pasta.getFiles();
  while (velhos.hasNext()) velhos.next().setTrashed(true);

  const token = ScriptApp.getOAuthToken();
  deck.getSlides().forEach((s, i) => {
    const n = String(i + 1).padStart(2, '0');
    const url = 'https://docs.google.com/presentation/d/' + deckId +
                '/export/png?pageid=' + s.getObjectId();
    const resp = _orcBuscarComEspera_(url, token);
    if (resp.getResponseCode() === 200) {
      pasta.createFile(resp.getBlob().setName('slide_' + n + '.png'));
      Logger.log('Salvo slide_' + n + '.png');
    } else {
      Logger.log('Slide ' + n + ': HTTP ' + resp.getResponseCode());
    }

    // Imagens coladas no slide, no arquivo original: a exportação da página
    // só mostra o que está dentro da área visível e às vezes não as desenha.
    s.getImages().forEach((img, k) => {
      Logger.log('Slide ' + n + ', imagem ' + (k + 1) + ': pos ' + Math.round(img.getLeft()) + ',' +
                 Math.round(img.getTop()) + ' tam ' + Math.round(img.getWidth()) + 'x' + Math.round(img.getHeight()) +
                 (img.getSourceUrl() ? ' origem ' + img.getSourceUrl() : ''));
      try {
        const b = img.getBlob();
        const ext = (b.getContentType() || 'image/png').split('/')[1].replace('jpeg', 'jpg');
        pasta.createFile(b.setName('slide_' + n + '_img' + (k + 1) + '.' + ext));
      } catch (e) {
        Logger.log('  não deu para salvar: ' + e.message);
      }
    });
  });
  Logger.log('Pronto: ' + pasta.getUrl());
}

/**
 * Salva o getValues() das planilhas que o gerador lê como JSON, na mesma
 * pasta, para virar fixture do teste (teste/fixture_*.json). É o valor que o
 * Apps Script enxerga de verdade — número como número, não "(1.234,56)".
 */
function exportarFixtures() {
  const pai = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const it = pai.getFoldersByName('_fixtures');
  const pasta = it.hasNext() ? it.next() : pai.createFolder('_fixtures');
  const cid = ORC_CIDADES.CURITIBA;
  const fontes = {
    'fixture_metragem_curitiba.json':  [cid.relatorios.metragemId, null],
    'fixture_mensal_curitiba.json':    [cid.relatorios.mensalId, null],
    'fixture_070_curitiba_2027.json':  [cid.servicosTerceirosId, ORC_ABA_MODELO],
    'fixture_contratos_manutencao_curitiba.json': [cid.contratos['Manutenção de imóveis'], null],
    'fixture_contratos_seguranca_curitiba.json':  [cid.contratos['Segurança e vigilância'], null],
    'fixture_contratos_limpeza_curitiba.json':    [cid.contratos['Limpeza e conservação'], null],
    'fixture_contratos_ano_anterior.json':        [ORC_CONTRATOS_ANO_ANTERIOR_ID, null],
    'fixture_contratos_2027_completo.json':       [ORC_CONTRATOS_ANO_IDS[0], null]
  };
  Object.keys(fontes).forEach(nome => {
    const ss = SpreadsheetApp.openById(fontes[nome][0]);
    const aba = fontes[nome][1] ? ss.getSheetByName(fontes[nome][1]) : ss.getSheets()[0];
    const dados = aba.getDataRange().getValues();
    const velhos = pasta.getFilesByName(nome);
    while (velhos.hasNext()) velhos.next().setTrashed(true);
    pasta.createFile(nome, JSON.stringify(dados), MimeType.PLAIN_TEXT);
    Logger.log(nome + ': ' + dados.length + ' linhas × ' + (dados[0] || []).length + ' colunas (aba "' + aba.getName() + '")');
  });
  Logger.log('Pronto: ' + pasta.getUrl());
}

// O export do Slides devolve 429 quando as chamadas vêm rápido demais: espera
// um pouco antes de cada uma e tenta de novo, com espera crescente.
function _orcBuscarComEspera_(url, token) {
  let resp;
  for (let t = 0; t < 5; t++) {
    Utilities.sleep(t === 0 ? 1500 : 4000 * t);
    resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 429) break;
  }
  return resp;
}
