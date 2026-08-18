/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   Leitura de dados da planilha do Financeiro
 *
 * Hoje tem o mês de referência (capa) e o bloco EBITDA/Pré-Premiação da aba
 * "Quadro EBITDA" (slide Resumo do Resultado). O restante do DRE por empresa
 * entra aqui conforme os slides forem especificados com a Ester.
 */

// Aba com o quadro-resumo de EBITDA por empresa e o quadro de Pré-Premiação.
const QUADRO_EBITDA_SHEET = 'Quadro EBITDA';

const MESES_NOME_REF = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

/**
 * Mês de referência da apresentação. PROVISÓRIO: usa só o calendário (mês
 * fechado anterior a hoje) — mês corrente ainda não fechou, então o relatório
 * fala do mês anterior. Quando soubermos qual aba/célula da planilha registra
 * o mês de fato coberto pelos números (padrão usado em megas-mensal/02_Dados.gs,
 * obterMesReferencia_), troque este fallback pela leitura real — a capa nunca
 * deve divergir do conteúdo dos outros slides.
 */
function obterMesReferencia_() {
  const hoje = new Date();
  const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior
  const idx = ant.getMonth();
  const ano = ant.getFullYear();
  const nome = MESES_NOME_REF[idx];
  return {
    index: idx,
    nome: nome,
    curto: nome.charAt(0) + nome.slice(1).toLowerCase(),
    ano: ano,
    label: nome + ' / ' + ano
  };
}


// ==========================================
// QUADRO EBITDA — Resumo do Resultado
// ==========================================
// A aba "Quadro EBITDA" cresce por baixo a cada mês: o bloco de um mês
// anterior (ex.: NOVEMBRO/2025, linha 3) continua lá em cima, intacto, e o
// bloco do mês mais recente (ex.: JUNHO/2026, linha 29) é acrescentado depois.
// Por isso as funções abaixo procuram sempre o ÚLTIMO bloco pela palavra-chave
// na coluna B, nunca por número de linha fixo — assim o mês seguinte que a
// Ester acrescentar não exige mexer no código.
//
// Os valores são lidos com getDisplayValue() (texto exatamente como aparece
// na planilha: milhar, decimal, parênteses de negativo, % com a casa decimal
// que cada célula tem configurada) em vez de reconstruídos a partir do número
// bruto — a aba tem formatos que variam célula a célula (ex.: a coluna
// "Ritmo 2026 x Orç 2026" sai com 1 casa decimal, as outras com 0), e
// reproduzir isso na mão divergiria da planilha sem ninguém perceber.

/**
 * Lê o bloco "EBITDA (Em R$/Mil)" mais recente: mês, acumulado do ano e
 * ritmo, por empresa — cada empresa com sua linha de valores e, quando
 * existir, a linha "Margem EBITDA/ROL" logo abaixo — e a linha TOTAL ao
 * final. Lança erro claro se a aba ou o bloco não forem encontrados (melhor
 * falhar alto do que desenhar um slide com número errado).
 */
function obterResumoResultadoEBITDA_() {
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(QUADRO_EBITDA_SHEET);
  if (!sheet) throw new Error('Aba "' + QUADRO_EBITDA_SHEET + '" não encontrada na planilha do Financeiro.');

  const lastRow = sheet.getLastRow();
  const colB = sheet.getRange(1, 2, lastRow, 1).getDisplayValues();
  let blockRow = -1;
  for (let r = 0; r < colB.length; r++) {
    if (String(colB[r][0]).indexOf('EBITDA') === 0) blockRow = r + 1; // 1-indexado; fica com o ÚLTIMO bloco
  }
  if (blockRow < 0) {
    throw new Error('Bloco "EBITDA (Em R$/Mil)" não encontrado na aba "' + QUADRO_EBITDA_SHEET + '".');
  }

  const mesNome     = sheet.getRange(blockRow, 3).getDisplayValue();   // col C: "JUNHO"
  const acumLabel   = sheet.getRange(blockRow, 8).getDisplayValue();  // col H: "ACUMULADO JANEIRO A JUNHO"
  const ritmoLabel  = sheet.getRange(blockRow, 13).getDisplayValue(); // col M: "RITMO"
  const headerRow   = blockRow + 1;
  const headers     = sheet.getRange(headerRow, 3, 1, 15).getDisplayValues()[0]; // col C..Q

  // Ano do quadro: o maior ano citado nos cabeçalhos (ex.: "Real 2025" e
  // "Orç 2026" convivem — o ano corrente é o maior dos dois).
  const anos = [];
  headers.forEach(h => {
    const m = String(h).match(/\d{4}/g);
    if (m) m.forEach(a => anos.push(Number(a)));
  });
  const ano = anos.length ? Math.max.apply(null, anos) : new Date().getFullYear();

  const empresas = [];
  let r = headerRow + 1;
  while (r <= lastRow) {
    const rotulo = String(sheet.getRange(r, 2).getDisplayValue() || '').trim();
    if (!rotulo) break; // linha em branco fecha o bloco

    if (rotulo.toUpperCase() === 'TOTAL') {
      empresas.push({ nome: 'TOTAL', total: true, valores: _linhaResumoEbitda_(sheet, r) });
      break;
    }

    const rotuloMargem = String(sheet.getRange(r + 1, 2).getDisplayValue() || '').trim();
    const temMargem = rotuloMargem.toUpperCase().indexOf('MARGEM') === 0;
    empresas.push({
      nome: rotulo,
      valores: _linhaResumoEbitda_(sheet, r),
      margem: temMargem ? _linhaResumoEbitda_(sheet, r + 1) : null
    });
    r += temMargem ? 2 : 1;
  }

  return { mes: mesNome, ano: ano, acumuladoLabel: acumLabel, ritmoLabel: ritmoLabel,
           headers: headers, empresas: empresas };
}

// Os 15 valores (3 grupos de 5: Real/Orç/Real|Ritmo + 2 variações) de uma
// linha, como TEXTO exibido — ver nota sobre getDisplayValue() acima.
function _linhaResumoEbitda_(sheet, row) {
  return sheet.getRange(row, 3, 1, 15).getDisplayValues()[0];
}

/**
 * Lê o quadro "Ebitda Pré-Premiação Anual — Ritmo <ano>": uma linha por
 * grupo (ex.: Presidência/Diretoria, Capital Realty/Demercado, CR
 * Estacionamentos) com Orçado, Ritmo e a variação entre os dois.
 */
function obterEbitdaPrePremiacao_() {
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(QUADRO_EBITDA_SHEET);
  if (!sheet) throw new Error('Aba "' + QUADRO_EBITDA_SHEET + '" não encontrada na planilha do Financeiro.');

  const lastRow = sheet.getLastRow();
  const colB = sheet.getRange(1, 2, lastRow, 1).getDisplayValues();
  let headerRow = -1;
  for (let r = 0; r < colB.length; r++) {
    if (String(colB[r][0]).indexOf('Ebitda Pré-Premiação Anual') === 0) headerRow = r + 1;
  }
  if (headerRow < 0) {
    throw new Error('Bloco "Ebitda Pré-Premiação Anual" não encontrado na aba "' + QUADRO_EBITDA_SHEET + '".');
  }

  const titulo = sheet.getRange(headerRow, 2).getDisplayValue();

  const linhas = [];
  let r = headerRow + 1;
  while (r <= lastRow) {
    const rotulo = String(sheet.getRange(r, 2).getDisplayValue() || '').trim();
    if (!rotulo) break;
    linhas.push({
      nome: rotulo,
      orcado: sheet.getRange(r, 3).getDisplayValue(),
      ritmo: sheet.getRange(r, 4).getDisplayValue(),
      variacao: sheet.getRange(r, 5).getDisplayValue()
    });
    r++;
  }

  return { titulo: titulo, linhas: linhas };
}
