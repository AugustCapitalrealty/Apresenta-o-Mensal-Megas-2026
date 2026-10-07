/**
 * ARQUIVO: 03_Exportar.gs
 * SEÇÃO:   FERRAMENTA — Exporta slides (PNG) e planilhas (JSON) para o G:
 * DESCRIÇÃO: Joga numa pasta do Drive compartilhado (sincronizada em G: pelo
 *            Drive for Desktop) o que uma sessão sem acesso ao Drive precisa
 *            para trabalhar: os slides gerados como PNG (revisão visual) e as
 *            planilhas que o gerador lê como JSON (fixtures do teste).
 *            Ver HANDOFF.md, "Sem acesso ao Drive".
 */

// Cópia revisada pelo gestor (29/09/2026) e a pasta "APRESENTAÇÃO ORÇAMENTO".
const ORC_DECK_REVISAO_ID = '1O8IyowBGoowenOFxOSXbcrsoZMzCPzLxBkp2xuCFDf0';
const ORC_PASTA_ORCAMENTO_ID = '13PO9xDvPG3wmoVLfv41fZZo0I3rvl_gw';
// "MESTRA - ORÇAMENTO 2026 ITEM A ITEM - TODOS OS MEGAS" (só as ferramentas
// de comparação item a item usam; o gerador não lê).
const ORC_MODELOS_ANO_ANTERIOR_ID = '1X39BzfFKwSo2v1wt0Lhe1kxjnSdnn4D74kvAxg41bOM';

// Cópia com os comentários do gestor → _slides-exportados.
function exportarSlidesRevisao() { _orcExportarSlides_(ORC_DECK_REVISAO_ID, '_slides-exportados'); }
// Apresentação que o gerador escreve → "_slides-gerados - MEGA <X>" (revisão
// visual). Uma função por Mega: as três juntas passam dos 6 min do Apps Script.
function exportarSlidesCuritiba() { _orcExportarSlides_(ORC_CIDADES.CURITIBA.deckId, '_slides-gerados - MEGA CURITIBA'); }
function exportarSlidesItajai()   { _orcExportarSlides_(ORC_CIDADES.ITAJAI.deckId, '_slides-gerados - MEGA ITAJAÍ'); }
function exportarSlidesEsteio()   { _orcExportarSlides_(ORC_CIDADES.ESTEIO.deckId, '_slides-gerados - MEGA ESTEIO'); }

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
 * Salva o getValues() de TODAS as planilhas que o gerador lê, dos três
 * Megas, como JSON na pasta "_fixtures" (G:\…\APRESENTAÇÃO ORÇAMENTO\
 * _fixtures), com o mesmo nome dos arquivos de teste/ — basta copiar por
 * cima. É o valor que o Apps Script enxerga de verdade (número como número,
 * não "(1.234,56)"). Planilha que falhar vai para o log e não para as outras.
 */
function exportarFixtures() {
  const pai = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const it = pai.getFoldersByName('_fixtures');
  const pasta = it.hasNext() ? it.next() : pai.createFolder('_fixtures');
  const fontes = {};
  [['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
    const cid = ORC_CIDADES[chave];
    fontes['fixture_metragem_' + c + '.json'] = [cid.relatorios.metragemId, null];
    fontes['fixture_mensal_' + c + '.json'] = [cid.relatorios.mensalId, null];
    fontes['fixture_070_' + c + '_' + ORC_ANO + '.json'] = [cid.servicosTerceirosId, ORC_ABA_MODELO];
    fontes['fixture_090_' + c + '_' + ORC_ANO + '.json'] = [cid.despesasGeraisId, ORC_ABA_MODELO];
    fontes['fixture_financeiro' + (ORC_ANO - 2) + '_' + c + '.json'] = [cid.relatorios.financeiroMegasId, 'Financeiro ' + (ORC_ANO - 2)];
  });
  const cur = ORC_CIDADES.CURITIBA.contratos;
  fontes['fixture_contratos_manutencao_curitiba.json'] = [cur['Manutenção de imóveis'], null];
  fontes['fixture_contratos_seguranca_curitiba.json'] = [cur['Segurança e vigilância'], null];
  fontes['fixture_contratos_limpeza_curitiba.json'] = [cur['Limpeza e conservação'], null];
  fontes['fixture_contratos_ano_anterior.json'] = [ORC_CONTRATOS_ANO_ANTERIOR_ID, null];
  fontes['fixture_contratos_2027_completo.json'] = [ORC_CONTRATOS_ANO_IDS[0], null];
  fontes['fixture_modelos2026_megas.json'] = [ORC_MODELOS_ANO_ANTERIOR_ID, null];
  let ok = 0;
  Object.keys(fontes).forEach(nome => {
    try {
      const ss = SpreadsheetApp.openById(fontes[nome][0]);
      const aba = fontes[nome][1] ? ss.getSheetByName(fontes[nome][1]) : ss.getSheets()[0];
      if (!aba) throw new Error('aba "' + fontes[nome][1] + '" não existe');
      const dados = aba.getDataRange().getValues();
      const velhos = pasta.getFilesByName(nome);
      while (velhos.hasNext()) velhos.next().setTrashed(true);
      pasta.createFile(nome, JSON.stringify(dados), MimeType.PLAIN_TEXT);
      ok++;
      Logger.log(nome + ': ' + dados.length + ' linhas × ' + (dados[0] || []).length + ' colunas (aba "' + aba.getName() + '")');
    } catch (e) {
      Logger.log('FALHOU ' + nome + ': ' + e.message);
    }
  });
  Logger.log('Pronto: ' + ok + ' de ' + Object.keys(fontes).length + ' arquivos em ' + pasta.getUrl());
}

/**
 * Copia as fotos das sub capas (ORC_FOTOS_SECAO e a foto da capa de cada
 * Mega) para a pasta "_fotos-subcapas" (G:\…\APRESENTAÇÃO ORÇAMENTO\
 * _fotos-subcapas), com o nome da chave: PREVENTIVA.jpg, MEGA CURITIBA.png…
 * É de lá que ferramentas/subcapas_youtube.py tira as fotos para tratar
 * (retícula, papel rasgado). Foto que falhar vai para o log.
 */
function exportarFotosSubcapas() {
  const pai = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const it = pai.getFoldersByName('_fotos-subcapas');
  const pasta = it.hasNext() ? it.next() : pai.createFolder('_fotos-subcapas');
  const velhos = pasta.getFiles();
  while (velhos.hasNext()) velhos.next().setTrashed(true);

  const fotos = {};
  Object.keys(ORC_FOTOS_SECAO).forEach(k => { fotos[k] = ORC_FOTOS_SECAO[k]; });
  Object.keys(ORC_CIDADES).forEach(k => {
    const cid = ORC_CIDADES[k];
    if (cid.fotoFundoId) fotos[cid.nome.toUpperCase()] = cid.fotoFundoId;
  });
  let ok = 0;
  Object.keys(fotos).forEach(nome => {
    try {
      const b = DriveApp.getFileById(fotos[nome]).getBlob();
      const ext = (b.getContentType() || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
      pasta.createFile(b.setName(nome + '.' + ext));
      Logger.log('Salva ' + nome + '.' + ext);
      ok++;
    } catch (e) {
      Logger.log('FALHOU ' + nome + ': ' + e.message);
    }
  });
  Logger.log('Pronto: ' + ok + ' de ' + Object.keys(fotos).length + ' fotos em ' + pasta.getUrl());
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
