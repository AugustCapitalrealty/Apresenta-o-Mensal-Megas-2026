/**
 * ARQUIVO: Suporte_SetupPlanilha.gs
 * SEÇÃO:   SUPORTE — Setup inicial (uso único)
 * DESCRIÇÃO: Script para rodar 1 ÚNICA VEZ no editor da planilha.
 *            Duplica as abas-modelo para cada cidade (CURITIBA, ITAJAI, ESTEIO),
 *            mantendo formatação, fórmulas e formatos.
 *
 * COMO USAR:
 *   1. Abra a planilha → Extensões → Apps Script
 *   2. Cole este arquivo no editor
 *   3. Rode a função `setupAbasPorCidade()` uma vez
 *   4. Confira as novas abas criadas (ex.: DADOS_CURITIBA, PREVENTIVAS_ITAJAI, ...)
 *   5. Preencha os dados de cada cidade na aba correspondente
 *
 * Seguro rodar de novo: se a aba já existe, ele PULA (não sobrescreve).
 */

const CIDADES_SETUP = ['CURITIBA', 'ITAJAI', 'ESTEIO'];

// Abas-modelo atuais → serão duplicadas com sufixo "_CIDADE"
const ABAS_MODELO = [
  'DADOS',
  'PREVENTIVAS',
  'INDICADORES',
  'TEMPO',
  'FINANCEIRO',
  'METRO QUADRADO',
  'FINANCEIRO ANUAL'
];

function setupAbasPorCidade() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = [];

  ABAS_MODELO.forEach(nomeBase => {
    const modelo = ss.getSheetByName(nomeBase);
    if (!modelo) {
      log.push('AVISO: aba-modelo "' + nomeBase + '" não encontrada. Pulando.');
      return;
    }

    CIDADES_SETUP.forEach(cidade => {
      const nomeNovo = nomeBase + '_' + cidade;

      if (ss.getSheetByName(nomeNovo)) {
        log.push('• ' + nomeNovo + ' já existe — pulando.');
        return;
      }

      const copia = modelo.copyTo(ss);
      copia.setName(nomeNovo);
      log.push('✔ ' + nomeNovo + ' criada.');
    });
  });

  Logger.log(log.join('\n'));
  SpreadsheetApp.getUi().alert(
    'Setup concluído',
    log.join('\n') + '\n\nAgora preencha os dados de cada cidade na aba correspondente.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
