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

// Blocos dos próximos slides. A localização é deliberadamente por conteúdo,
// e não por coordenada: a planilha mensal insere novos blocos e desloca os
// antigos. Cada leitor exige o título e TODOS os cabeçalhos distintivos.
const BLOCOS_FINANCEIROS = {
  receitas: {
    titulo: 'Receitas',
    cabecalhos: [['empreendimento', 'empresa'], ['real 2025'], ['orç 2026', 'orc 2026'],
      ['real 2026'], ['variação', 'variacao']]
  },
  composicaoReceita: {
    titulo: 'Composição de Receita',
    cabecalhos: [['empreendimento', 'empresa', 'carteira'], ['receita'], ['%']]
  },
  despesas: {
    titulo: 'Despesas',
    cabecalhos: [['empreendimento', 'empresa'], ['real 2025'], ['orç 2026', 'orc 2026'],
      ['real 2026'], ['variação', 'variacao']]
  },
  vacancia: {
    titulo: 'Vacância',
    cabecalhos: [['empreendimento'], ['área construída', 'area construida'],
      ['área ocupada', 'area ocupada'], ['área disponível', 'area disponivel'],
      ['vacância física', 'vacancia fisica']]
  },
  cronogramaContratos: {
    titulo: 'Cronograma dos Contratos',
    cabecalhos: [['empreendimento'], ['prazo indeterminado', 'indeterminado'],
      ['contratos', 'quantidade'], ['%']]
  }
};

const MESES_NOME_REF = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const FIN_REFERENCIA_DECK = { index: 6, nome: 'JULHO', curto: 'Julho', ano: 2026,
  label: 'JULHO / 2026' };
var FIN_MES_REFERENCIA_CACHE_ = null;

/** Referência institucional desta edição do deck. */
function obterMesReferencia_() {
  if (!FIN_MES_REFERENCIA_CACHE_) {
    // A referência institucional desta edição é deliberadamente fixa. Alguns
    // quadros confirmados ainda estão em Junho/2026; esses rótulos permanecem
    // intactos no conteúdo e recebem um aviso de divergência no slide.
    FIN_MES_REFERENCIA_CACHE_ = Object.assign({}, FIN_REFERENCIA_DECK);
  }
  return FIN_MES_REFERENCIA_CACHE_;
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
  _exigirCabecalhosResumo_(headers, 'EBITDA', QUADRO_EBITDA_SHEET);

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

  if (!empresas.length || !empresas.some(e => e.total)) {
    throw new Error('Bloco "EBITDA (Em R$/Mil)" sem linhas ou sem linha TOTAL na aba "' + QUADRO_EBITDA_SHEET + '".');
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
 *
 * Os RÓTULOS das colunas também vêm da planilha ("Orçado 2026", "Ritmo 2026",
 * "Ritmo 2026 x Orç 2026"): eles citam o ano, e escrevê-los no código faria o
 * slide mostrar o ano errado na virada do exercício.
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

  // Colunas do quadro: tudo que tem rótulo a partir da coluna C. Uma coluna
  // acrescentada na planilha entra sozinha, sem mexer no código.
  const cabecalho = sheet.getRange(headerRow, 3, 1, 6).getDisplayValues()[0];
  const colunas = [];
  for (let c = 0; c < cabecalho.length; c++) {
    const nome = String(cabecalho[c] || '').trim();
    if (!nome) break;
    colunas.push(nome);
  }
  if (colunas.length < 3) throw new Error('Cabeçalhos esperados (Orçado, Ritmo e variação) não encontrados no bloco "Ebitda Pré-Premiação Anual".');

  const linhas = [];
  let r = headerRow + 1;
  while (r <= lastRow) {
    const rotulo = String(sheet.getRange(r, 2).getDisplayValue() || '').trim();
    if (!rotulo) break;
    linhas.push({
      nome: rotulo,
      valores: sheet.getRange(r, 3, 1, colunas.length).getDisplayValues()[0]
    });
    r++;
  }

  if (!linhas.length) throw new Error('Bloco "Ebitda Pré-Premiação Anual" não contém linhas de dados.');

  return { titulo: titulo, colunas: colunas, linhas: linhas };
}


// ==========================================
// DRE POR EMPRESA — Painel Executivo
// ==========================================
// Aba "Quadro DRE Apresentação": um bloco por empresa (Capital Realty,
// Demercado, Garoto, Hangar Vip, Postos, BMFD, DCL...), cada um com a mesma
// estrutura de 15 colunas (Mês | Acumulado do ano | Ritmo) do Quadro EBITDA,
// e uma cascata de linhas numeradas (1 - FATURAMENTO BRUTO ... 13 - LUCRO
// LÍQUIDO, com sub-itens indentados como "10.1 - RECEITAS FINANCEIRAS")
// terminando na linha "Margem EBITDA/ROL".
const QUADRO_DRE_SHEET = 'Quadro DRE Apresentação';

/**
 * Lê o DRE de UMA empresa pelo nome (ex.: 'DEMERCADO', 'CAPITAL REALTY' —
 * comparação sem diferenciar maiúsculas). Lança erro claro se não achar.
 *
 * Algumas empresas têm DOIS blocos (ex.: Demercado — "Sem Equivalência
 * Patrimonial" e "Com Equivalência Patrimonial", por causa da participação na
 * DCL). O Painel Executivo usa a versão SEM equivalência — é a nota logo
 * abaixo da linha Margem EBITDA/ROL que desempata; sem nota reconhecida em
 * nenhum candidato, fica com o primeiro bloco encontrado.
 */
function obterDREEmpresa_(nomeEmpresa) {
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(QUADRO_DRE_SHEET);
  if (!sheet) throw new Error('Aba "' + QUADRO_DRE_SHEET + '" não encontrada na planilha do Financeiro.');

  const lastRow = sheet.getLastRow();
  const colB = sheet.getRange(1, 2, lastRow, 1).getDisplayValues();
  const alvo = String(nomeEmpresa).toUpperCase().trim();

  const titleRows = [];
  for (let r = 0; r < colB.length; r++) {
    const v = String(colB[r][0] || '');
    if (/^DRE\s/i.test(v) && v.toUpperCase().indexOf(alvo) >= 0) titleRows.push(r + 1);
  }
  if (!titleRows.length) {
    throw new Error('Bloco "DRE ' + nomeEmpresa + '" não encontrado na aba "' + QUADRO_DRE_SHEET + '".');
  }

  const blocos = titleRows.map(r => _lerBlocoDRE_(sheet, r));
  let escolhido = blocos.find(b => b.notaPreferida === true);
  if (!escolhido) escolhido = blocos.find(b => b.notaPreferida !== false) || blocos[0];
  return escolhido;
}

function _lerBlocoDRE_(sheet, titleRow) {
  const nomeEmpresa = String(sheet.getRange(titleRow, 2).getDisplayValue() || '')
    .split('\n')[0].replace(/^DRE\s+/i, '').trim();
  const mesNome    = sheet.getRange(titleRow, 3).getDisplayValue();
  const acumLabel  = sheet.getRange(titleRow, 8).getDisplayValue();
  const ritmoLabel = sheet.getRange(titleRow, 13).getDisplayValue();
  const headerRow  = titleRow + 1;
  const headers    = sheet.getRange(headerRow, 3, 1, 15).getDisplayValues()[0];
  _exigirCabecalhosResumo_(headers, 'DRE ' + nomeEmpresa, QUADRO_DRE_SHEET);

  const anos = [];
  headers.forEach(h => {
    const m = String(h).match(/\d{4}/g);
    if (m) m.forEach(a => anos.push(Number(a)));
  });
  const ano = anos.length ? Math.max.apply(null, anos) : new Date().getFullYear();

  const linhas = [];
  let r = headerRow + 1;
  let margemEncontrada = false;
  while (true) {
    const raw = sheet.getRange(r, 2).getDisplayValue();
    const rotulo = String(raw || '').trim();
    if (!rotulo) break;

    const ehMargem = /^margem\s+ebitda/i.test(rotulo);
    linhas.push({
      rotulo: rotulo,
      valores: _linhaResumoEbitda_(sheet, r),   // mesmas 15 colunas do Quadro EBITDA
      margem: ehMargem,
      ebitda: /^7\s*-\s*ebitda\b/i.test(rotulo),
      indentado: /^\s/.test(String(raw))
    });

    r++;
    if (ehMargem) { margemEncontrada = true; break; }
  }
  if (!linhas.length || !margemEncontrada) {
    throw new Error('Bloco "DRE ' + nomeEmpresa + '" sem linhas ou sem o cabeçalho final "Margem EBITDA/ROL".');
  }

  // Nota logo abaixo da Margem (ex.: "* Sem Equivalência Patrimonial") — só
  // serve para desempatar quando a empresa tem mais de um bloco.
  const nota = margemEncontrada ? String(sheet.getRange(r, 2).getDisplayValue() || '').trim() : '';
  let notaPreferida = null;
  if (/sem\s+equival/i.test(nota)) notaPreferida = true;
  else if (/com\s+equival/i.test(nota)) notaPreferida = false;

  return { empresa: nomeEmpresa, mes: mesNome, ano: ano, acumuladoLabel: acumLabel,
           ritmoLabel: ritmoLabel, headers: headers, linhas: linhas,
           nota: nota, notaPreferida: notaPreferida };
}

function _exigirCabecalhosResumo_(headers, bloco, aba) {
  if (headers.length !== 15 || headers.some(h => !String(h || '').trim())) {
    throw new Error('Bloco "' + bloco + '" na aba "' + aba + '" deve ter 15 cabeçalhos preenchidos (Mês, Acumulado e Ritmo).');
  }
  const normalizados = headers.map(_finNorm_);
  const texto = normalizados.join(' | ');
  ['real', 'orc'].forEach(nome => {
    if (texto.indexOf(nome) < 0) throw new Error('Cabeçalho "' + nome + '" não encontrado no bloco "' + bloco + '" da aba "' + aba + '".');
  });
  // Cada grupo tem Real, Orç, Real/Ritmo e dois comparativos. A planilha real
  // nomeia estes últimos como "Real x Orç" e "Real x Real"; arquivos antigos
  // podem usar "Variação". Aceitamos os dois contratos sem afrouxar as 15
  // colunas preenchidas.
  for (let inicio = 0; inicio < 15; inicio += 5) {
    const comparativos = normalizados.slice(inicio + 3, inicio + 5);
    if (comparativos.some(h => h.indexOf(' x ') < 0 && h.indexOf('variacao') < 0)) {
      throw new Error('Comparativos Real x Orç/Real x Real ausentes no bloco "' + bloco + '" da aba "' + aba + '".');
    }
  }
}


// ==========================================
// BLOCOS TEMÁTICOS — localização e validação
// ==========================================

function obterReceitas_() { return _lerBlocoFinanceiro_('receitas'); }
function obterComposicaoReceita_() { return _lerBlocoFinanceiro_('composicaoReceita'); }
function obterDespesas_() { return _lerBlocoFinanceiro_('despesas'); }
function obterVacancia_() { return _lerBlocoFinanceiro_('vacancia'); }
function obterCronogramaContratos_() { return _lerBlocoFinanceiro_('cronogramaContratos'); }

/** Localiza o último bloco válido em todas as abas e nunca fabrica zeros. */
function _lerBlocoFinanceiro_(chave) {
  const spec = BLOCOS_FINANCEIROS[chave];
  if (!spec) throw new Error('Leitor financeiro desconhecido: "' + chave + '".');
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const candidatos = [];

  ss.getSheets().forEach(sheet => {
    const range = sheet.getDataRange();
    const exibidos = range.getDisplayValues();
    for (let r = 0; r < exibidos.length; r++) {
      for (let c = 0; c < exibidos[r].length; c++) {
        if (_finNorm_(exibidos[r][c]) === _finNorm_(spec.titulo)) {
          candidatos.push({ sheet: sheet, titleRow: r, titleCol: c, exibidos: exibidos });
        }
      }
    }
  });
  if (!candidatos.length) {
    throw new Error('Bloco "' + spec.titulo + '" não encontrado em nenhuma aba da planilha do Financeiro.');
  }

  const erros = [];
  for (let i = candidatos.length - 1; i >= 0; i--) {
    try { return _materializarBlocoFinanceiro_(candidatos[i], spec); }
    catch (e) { erros.push(candidatos[i].sheet.getName() + ': ' + e.message); }
  }
  throw new Error('Bloco "' + spec.titulo + '" encontrado, mas sem os cabeçalhos esperados. ' + erros.join(' | '));
}

function _materializarBlocoFinanceiro_(cand, spec) {
  const exibidos = cand.exibidos;
  let headerRow = -1;
  let indices = null;
  // Cabeçalhos podem ocupar até três linhas abaixo do título (células mescladas).
  for (let r = cand.titleRow; r < Math.min(exibidos.length, cand.titleRow + 5); r++) {
    const combinados = exibidos[r].map((v, c) => {
      const acima = r > cand.titleRow ? exibidos[r - 1][c] : '';
      return _finNorm_(String(acima || '') + ' ' + String(v || ''));
    });
    const encontrados = spec.cabecalhos.map(opcoes => _finIndiceCabecalho_(combinados, opcoes));
    if (encontrados.every(c => c >= 0)) { headerRow = r; indices = encontrados; break; }
  }
  if (headerRow < 0) {
    throw new Error('cabeçalhos ausentes: ' + spec.cabecalhos.map(x => x.join('/')).join(', '));
  }

  const primeiraColuna = Math.min.apply(null, indices);
  let ultimaColuna = Math.max.apply(null, indices);
  while (ultimaColuna + 1 < exibidos[headerRow].length &&
         String(exibidos[headerRow][ultimaColuna + 1] || '').trim()) ultimaColuna++;
  const headers = exibidos[headerRow].slice(primeiraColuna, ultimaColuna + 1);
  if (headers.some(h => !String(h || '').trim())) {
    throw new Error('cabeçalho contém coluna sem nome entre as colunas usadas.');
  }

  const linhas = [];
  for (let r = headerRow + 1; r < exibidos.length; r++) {
    const row = exibidos[r].slice(primeiraColuna, ultimaColuna + 1);
    if (row.every(v => !String(v || '').trim())) break;
    linhas.push(row);
  }
  if (!linhas.length) throw new Error('bloco não contém linhas de dados.');

  const resultado = { titulo: spec.titulo, aba: cand.sheet.getName(),
    linhaTitulo: cand.titleRow + 1, linhaCabecalho: headerRow + 1,
    cabecalhos: headers, linhas: linhas };
  _validarBlocoFinanceiro_(resultado);
  return resultado;
}

function _finIndiceCabecalho_(headers, opcoes) {
  for (let c = 0; c < headers.length; c++) {
    if (opcoes.some(o => headers[c].indexOf(_finNorm_(o)) >= 0)) return c;
  }
  return -1;
}

function _finNorm_(valor) {
  return String(valor || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function _finNumero_(valor) {
  if (typeof valor === 'number') return valor;
  let s = String(valor == null ? '' : valor).trim();
  if (!s || s === '-') return null;
  const negativo = /^\(.*\)$/.test(s);
  const percentual = s.indexOf('%') >= 0;
  s = s.replace(/[R$%\s()]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  if (!isFinite(n)) return null;
  return (negativo ? -n : n) / (percentual ? 100 : 1);
}

function _validarBlocoFinanceiro_(bloco) {
  const largura = bloco.cabecalhos.length;
  bloco.linhas.forEach((linha, i) => {
    if (linha.length !== largura) throw new Error('Tabela "' + bloco.titulo +
      '": linha ' + (bloco.linhaCabecalho + i + 1) + ' tem ' + linha.length +
      ' colunas; esperado: ' + largura + '.');
  });
  _validarTotalFinanceiro_(bloco);
  if (bloco.titulo === 'Composição de Receita') _validarComposicaoFinanceira_(bloco);
  if (bloco.titulo === 'Vacância') _validarAreasVacancia_(bloco);
}

function _validarTotalFinanceiro_(bloco) {
  const totalIdx = bloco.linhas.findIndex(l => /^total\b/i.test(String(l[0]).trim()));
  if (totalIdx < 0) return;
  for (let c = 1; c < bloco.cabecalhos.length; c++) {
    const informado = _finNumero_(bloco.linhas[totalIdx][c]);
    const fontes = bloco.linhas.slice(0, totalIdx).map(l => _finNumero_(l[c])).filter(v => v !== null);
    if (informado === null || !fontes.length) continue;
    const calculado = fontes.reduce((a, b) => a + b, 0);
    const tol = Math.max(0.01, Math.abs(informado) * 0.001);
    if (Math.abs(calculado - informado) > tol) throw new Error('Total não concilia em "' +
      bloco.cabecalhos[c] + '": fonte=' + calculado + ', total=' + informado + '.');
  }
}

function _validarComposicaoFinanceira_(bloco) {
  bloco.cabecalhos.forEach((h, c) => {
    if (_finNorm_(h).indexOf('%') < 0 && _finNorm_(h).indexOf('participacao') < 0) return;
    const valores = bloco.linhas.filter(l => !/^total\b/i.test(String(l[0]).trim()))
      .map(l => _finNumero_(l[c])).filter(v => v !== null);
    if (!valores.length) return;
    const soma = valores.reduce((a, b) => a + b, 0);
    if (Math.abs(soma - 1) > 0.02) throw new Error('Composição em "' + h +
      '" soma ' + (soma * 100).toFixed(2) + '%, fora da tolerância de 98% a 102%.');
  });
}

function _validarAreasVacancia_(bloco) {
  const hs = bloco.cabecalhos.map(_finNorm_);
  const cConstruida = hs.findIndex(h => h.indexOf('area construida') >= 0);
  const cOcupada = hs.findIndex(h => h.indexOf('area ocupada') >= 0);
  const cDisponivel = hs.findIndex(h => h.indexOf('area disponivel') >= 0);
  bloco.linhas.forEach((l, i) => {
    const construida = _finNumero_(l[cConstruida]);
    const ocupada = _finNumero_(l[cOcupada]);
    const disponivel = _finNumero_(l[cDisponivel]);
    if ([construida, ocupada, disponivel].some(v => v === null)) return;
    const tol = Math.max(1, Math.abs(construida) * 0.001);
    if (Math.abs(ocupada + disponivel - construida) > tol) throw new Error('Áreas não conciliam na linha ' +
      (bloco.linhaCabecalho + i + 1) + ': ocupada + disponível != construída.');
  });
}
