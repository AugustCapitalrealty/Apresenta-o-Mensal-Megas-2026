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

// ==========================================
// DEMERCADO — LEITORES DOS SLIDES 03 A 07
// ==========================================
// Estes leitores não dependem de letras de coluna nem de números de linha.
// A aba é escolhida por palavras do nome e as colunas por seus cabeçalhos;
// dentro dela, o último bloco cujo título contém DEMERCADO é usado. Assim, um
// novo bloco mensal pode ser acrescentado embaixo sem alterar o código.

function _dmNormalizar_(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim().toUpperCase();
}

function _dmAba_(termos, termosExcluidos) {
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const abas = ss.getSheets();
  const norm = termos.map(_dmNormalizar_);
  const excluidos = (termosExcluidos || []).map(_dmNormalizar_);
  // Não usa find() de propósito: se houver "Receitas" e "Composição da
  // Receita", escolhemos a correspondência mais específica, e não a primeira
  // aba na ordem do arquivo (ordem que o usuário pode mudar a qualquer hora).
  const candidatas = abas.filter(s => {
    const nome = _dmNormalizar_(s.getName());
    return norm.every(t => nome.indexOf(t) >= 0) &&
      !excluidos.some(t => nome.indexOf(t) >= 0);
  }).sort((a, b) => {
    const an = _dmNormalizar_(a.getName()), bn = _dmNormalizar_(b.getName());
    const ae = norm.some(t => an === t) ? 1 : 0;
    const be = norm.some(t => bn === t) ? 1 : 0;
    return be - ae || an.length - bn.length;
  });
  const aba = candidatas[0];
  if (!aba) throw new Error('Aba não encontrada (nome deve conter: ' + termos.join(', ') + ').');
  return aba;
}

function _dmMatriz_(sheet) {
  if (!sheet.getLastRow() || !sheet.getLastColumn()) return [];
  return sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
}

function _dmLinhaCabecalho_(m, obrigatorios) {
  let achada = -1, pontos = 0;
  m.forEach((row, i) => {
    const texto = row.concat(_dmCabecalhos_(m, i)).map(_dmNormalizar_);
    const p = obrigatorios.filter(grupo => grupo.some(t => texto.some(c => c.indexOf(_dmNormalizar_(t)) >= 0))).length;
    if (p > pontos || (p === pontos && p === obrigatorios.length)) { pontos = p; achada = i; }
  });
  if (pontos < obrigatorios.length) throw new Error('Cabeçalhos esperados não encontrados: ' + obrigatorios.join(' / ') + '.');
  return achada;
}

// Planilhas financeiras frequentemente usam cabeçalhos em duas linhas, com
// "REALIZADO" mesclado acima de "ANTERIOR" e "ATUAL". Combinar as duas
// linhas evita depender da posição das colunas e também evita confundir os
// dois Realizados ao procurar apenas pelo texto da última linha.
function _dmCabecalhos_(m, headerRow) {
  const atual = m[headerRow] || [];
  const anterior = headerRow > 0 ? m[headerRow - 1] : [];
  let grupo = '';
  return atual.map((valor, col) => {
    const acima = String(anterior[col] || '').trim();
    if (acima) grupo = acima;
    const abaixo = String(valor || '').trim();
    if (!abaixo) return grupo;
    if (!grupo || _dmNormalizar_(grupo) === _dmNormalizar_(abaixo)) return abaixo;
    return grupo + ' ' + abaixo;
  });
}

function _dmCol_(headers, aliases, opcional) {
  const ns = headers.map(_dmNormalizar_);
  for (let a = 0; a < aliases.length; a++) {
    const alvo = _dmNormalizar_(aliases[a]);
    const i = ns.findIndex(h => h === alvo || h.indexOf(alvo) >= 0);
    if (i >= 0) return i;
  }
  if (opcional) return -1;
  throw new Error('Coluna não encontrada: ' + aliases.join(' / ') + '.');
}

function _dmLinhas_(m, hr, cols) {
  const out = [];
  for (let r = hr + 1; r < m.length; r++) {
    const nome = String(m[r][cols.nome] || '').trim();
    if (!nome) continue;
    if (_dmNormalizar_(nome).indexOf('DEMERCADO') >= 0 && out.length) { out.length = 0; continue; }
    const item = { nome: nome };
    Object.keys(cols).forEach(k => { if (k !== 'nome' && cols[k] >= 0) item[k] = m[r][cols[k]]; });
    out.push(item);
  }
  return out;
}

function obterReceitasDemercado_() {
  const s = _dmAba_(['receita'], ['compos']); const m = _dmMatriz_(s);
  const hr = _dmLinhaCabecalho_(m, [['realizado','real'], ['orcamento','orcado'], ['variacao','var']]);
  const h = _dmCabecalhos_(m, hr);
  const c = { nome:_dmCol_(h,['cliente','receita','descricao']), anterior:_dmCol_(h,['realizado anterior','real anterior']),
    orcamento:_dmCol_(h,['orcamento','orcado']), atual:_dmCol_(h,['realizado atual','real atual']),
    variacao:_dmCol_(h,['variacao','var.','var ']), tipo:_dmCol_(h,['tipo','classificacao'],true) };
  const linhas = _dmLinhas_(m,hr,c);
  linhas.forEach(x => { const n=_dmNormalizar_(x.tipo || x.nome); x.grupo=n.indexOf('DEFENSOR')>=0?'defensores':'ofensores'; });
  return { aba:s.getName(), headers:h, ofensores:linhas.filter(x=>x.grupo==='ofensores'), defensores:linhas.filter(x=>x.grupo==='defensores') };
}

function obterComposicaoReceitaDemercado_() {
  const s=_dmAba_(['compos','receita']); const m=_dmMatriz_(s);
  const hr=_dmLinhaCabecalho_(m,[['cliente','empreendimento'],['participacao','percentual','%']]); const h=_dmCabecalhos_(m,hr);
  const c={nome:_dmCol_(h,['cliente','empreendimento','descricao']),participacao:_dmCol_(h,['participacao','percentual','%']),tipo:_dmCol_(h,['tipo','visao','categoria'],true)};
  const linhas=_dmLinhas_(m,hr,c); const porCliente=[], porEmpreendimento=[];
  linhas.forEach(x => (_dmNormalizar_(x.tipo).indexOf('EMPREEND')>=0 ? porEmpreendimento : porCliente).push(x));
  return {aba:s.getName(),porCliente:porCliente,porEmpreendimento:porEmpreendimento};
}

function obterDespesasDemercado_() {
  const s=_dmAba_(['despesa']); const m=_dmMatriz_(s);
  const hr=_dmLinhaCabecalho_(m,[['orcamento','orcado'],['realizado','real'],['variacao','var']]); const h=_dmCabecalhos_(m,hr);
  const c={nome:_dmCol_(h,['despesa','descricao','conta']),orcamento:_dmCol_(h,['orcamento','orcado']),realizado:_dmCol_(h,['realizado','real']),variacao:_dmCol_(h,['variacao','var']),tipo:_dmCol_(h,['tipo','classificacao'],true)};
  const linhas=_dmLinhas_(m,hr,c); linhas.forEach(x=>{const n=_dmNormalizar_(x.tipo||x.nome);x.grupo=n.indexOf('DEFENSOR')>=0?'defensores':'ofensores';});
  return {aba:s.getName(),ofensores:linhas.filter(x=>x.grupo==='ofensores'),defensores:linhas.filter(x=>x.grupo==='defensores')};
}

function obterVacanciaDemercado_() {
  const s=_dmAba_(['vac']); const m=_dmMatriz_(s);
  const hr=_dmLinhaCabecalho_(m,[['mes'],['orcamento','orcado'],['realizado','real']]); const h=_dmCabecalhos_(m,hr);
  const c={nome:_dmCol_(h,['mes','periodo']),orcamento:_dmCol_(h,['orcamento','orcado']),realizado:_dmCol_(h,['realizado','real']),ocupada:_dmCol_(h,['area ocupada','abl ocupada'],true),disponivel:_dmCol_(h,['area disponivel','abl disponivel'],true),construida:_dmCol_(h,['area construida','abl total'],true)};
  return {aba:s.getName(),serie:_dmLinhas_(m,hr,c)};
}

function obterContratosDemercado_() {
  const s=_dmAba_(['contrat']); const m=_dmMatriz_(s);
  const hr=_dmLinhaCabecalho_(m,[['contrato','cliente'],['abl','area'],['receita','valor'],['vencimento','ano']]); const h=_dmCabecalhos_(m,hr);
  const c={nome:_dmCol_(h,['contrato','cliente','locatario']),vencimento:_dmCol_(h,['vencimento','ano','prazo']),abl:_dmCol_(h,['abl','area']),receita:_dmCol_(h,['receita','valor'])};
  const contratos=_dmLinhas_(m,hr,c); const grupos={};
  contratos.forEach(x=>{const ano=(_dmNormalizar_(x.vencimento).match(/20\d{2}/)||['INDETERMINADO'])[0];(grupos[ano]||(grupos[ano]={ano:ano,contratos:[],abl:0,receita:0})).contratos.push(x);grupos[ano].abl+=_dmNumero_(x.abl);grupos[ano].receita+=_dmNumero_(x.receita);});
  const totalA=Object.keys(grupos).reduce((n,k)=>n+grupos[k].abl,0), totalR=Object.keys(grupos).reduce((n,k)=>n+grupos[k].receita,0);
  const anos=Object.keys(grupos).sort().map(k=>{const g=grupos[k];g.pctAbl=totalA?g.abl/totalA:0;g.pctReceita=totalR?g.receita/totalR:0;return g;});
  _dmValidar100_(anos.map(x=>x.pctAbl),'ABL'); _dmValidar100_(anos.map(x=>x.pctReceita),'receita');
  return {aba:s.getName(),contratos:contratos,anos:anos};
}
function _dmNumero_(v){let s=String(v||'').replace(/[^0-9,().-]/g,'');const neg=/\(|^-/.test(s);s=s.replace(/[()-]/g,'').replace(/\./g,'').replace(',','.');const n=Number(s)||0;return neg?-n:n;}
function _dmValidar100_(v,nome){const soma=v.reduce((a,b)=>a+b,0);if(v.length&&Math.abs(soma-1)>0.001)throw new Error('Percentuais de '+nome+' não totalizam 100% ('+(soma*100).toFixed(2)+'%).');}
