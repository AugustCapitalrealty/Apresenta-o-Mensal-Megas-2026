/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   NÚCLEO — Leitura do modelo de orçamento
 * DESCRIÇÃO: Lê a aba "Valores do Modelo" (uma linha por item orçado, doze
 *            meses) e agrupa a conta de manutenção pela categoria que abre
 *            o nome de cada item: "[PPCI] - ...", "[REVESTIMENTO] - ...".
 */

/**
 * Manutenção de imóveis de uma cidade, agrupada por categoria.
 * @return {{total, meses:number[12], nItens, nZerados,
 *           categorias:[{nome, total, pct, meses, itens:[{descricao, total, meses, linha}]}]}}
 * Valores positivos (o modelo lança despesa com sinal negativo).
 */
function obterManutencao_(chaveCidade) {
  const cid = ORC_CIDADES[chaveCidade];
  if (!cid) throw new Error('Cidade desconhecida: ' + chaveCidade);
  if (!cid.despesasGeraisId) {
    throw new Error(cid.nome + ': a planilha 090-Despesas-Gerais ainda não foi configurada em ORC_CIDADES (01_Config.gs).');
  }

  const linhas = _orcLerModelo_(cid.despesasGeraisId);
  const alvo = linhas.filter(l => l.contaNorm === ORC_CONTA_MANUTENCAO);

  // Zero falso: planilha com linhas mas sem a conta (renomeada, digitada de
  // outro jeito) não pode virar um slide de R$ 0 — tem que parar e dizer o
  // que encontrou.
  if (!alvo.length) {
    const contas = Array.from(new Set(linhas.map(l => l.conta))).join(', ');
    throw new Error(cid.nome + ': nenhuma linha da conta "manutenção imóveis" em "' + ORC_ABA_MODELO +
                    '". Contas encontradas: ' + (contas || '(nenhuma)'));
  }
  const ch = _orcChaveConta_('Manutenção de imóveis');
  const contratos = [];
  _orcContratosDoAno_(cid).filter(g => _orcChaveConta_(g.conta) === ch)
    .forEach(g => Array.prototype.push.apply(contratos, g.contratos));
  return _orcAgruparCategorias_(alvo, contratos);
}

// ==========================================
// CONTRATOS RECORRENTES
// ==========================================
// Cadastros de contratos com os valores do ano do orçamento (pasta 00 -
// PLANILHAS MESTRAS), no formato do "2025 - Contratos"
// (21_ContratosComparados.gs), todas as unidades. Cidade com
// `contratosDoCadastro` usa o PRIMEIRO desta lista que tem valor para ela
// (cadastro novo entra na frente; o anterior fica de reserva até sair).
// 07/10/2026: "CONTRATOS-2027-COMPLETO" — os três Megas; Itajaí igual ao
// "TESTE-2 - COMPLETO" e Curitiba igual às planilhas de contratos por conta
// — que o gerador deixou de ler (os três Megas no cadastro, 07/10/2026).
const ORC_CONTRATOS_ANO_IDS = [
  '1cwbW249I--uhsg3trSTQetb88gnjDgLGQ3aW5Xk_jeY'    // CONTRATOS-2027-COMPLETO
];

const _ORC_CADASTRO_ANO = {};   // cache da leitura por planilha (uma por execução)
function _orcCadastroAno_(id) {
  if (!_ORC_CADASTRO_ANO[id]) _ORC_CADASTRO_ANO[id] = SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getValues();
  return _ORC_CADASTRO_ANO[id];
}

/**
 * Contratos recorrentes do ano da cidade, por conta: [{ conta, contratos }],
 * cada contrato no formato de _orcLinhasContratos_. Duas fontes: o cadastro
 * do ano (cid.contratosDoCadastro — os três Megas desde 07/10/2026) e, no
 * formato antigo, uma planilha por conta (cid.contratos, hoje vazio). Fonte que falhar vai para o
 * log e a conta fica sem os contratos (aparece como "Não detalhado").
 */
function _orcContratosDoAno_(cid) {
  const out = [];
  Object.keys(cid.contratos || {}).forEach(conta => {
    const id = cid.contratos[conta];
    if (!id) return;
    try { out.push({ conta: conta, contratos: _orcLerContratos_(id) }); }
    catch (e) { Logger.log('Contratos de "' + conta + '" ignorados: ' + e.message); }
  });
  if (cid.contratosDoCadastro) {
    for (let i = 0; i < ORC_CONTRATOS_ANO_IDS.length; i++) {
      const doCadastro = [];
      try {
        const dados = _orcCadastroAno_(ORC_CONTRATOS_ANO_IDS[i]);
        _orcContasDoCadastro_(dados, cid.nome).forEach(conta => {
          const ks = _orcLerCadastroContratos_(dados, cid.nome, conta, ORC_ANO).map(k => _orcContratoItem_(k.fornecedor, k.meses));
          if (ks.length) doCadastro.push({ conta: conta, contratos: ks });
        });
      } catch (e) { Logger.log('Cadastro de contratos ' + ORC_CONTRATOS_ANO_IDS[i] + ' ignorado: ' + e.message); }
      if (doCadastro.length) { Array.prototype.push.apply(out, doCadastro); break; }
    }
  }
  return out;
}

function _orcLerContratos_(planilhaId) {
  return _orcLinhasContratos_(SpreadsheetApp.openById(planilhaId).getSheets()[0].getDataRange().getValues());
}

/**
 * Planilha de contratos: uma linha por contrato e competência (MM/AAAA),
 * valor negativo. Devolve um item por contrato, com os doze meses do ano do
 * orçamento, já na categoria de ORC_CONTRATOS_CATEGORIA.
 * @return [{ descricao, fornecedor, categoria, meses, total, contrato: true, semCategoria }]
 */
function _orcLinhasContratos_(dados) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const col = { comp: cab.indexOf('competencia'), contrato: cab.indexOf('contrato'), valor: cab.indexOf('valor') };
  if (col.comp < 0 || col.contrato < 0 || col.valor < 0) {
    throw new Error('Planilha de contratos: cabeçalho inesperado. Esperava "Competência", "Contrato" e "Valor" ' +
                    'na linha 1. Encontrado: ' + (dados[0] || []).filter(String).join(' | '));
  }
  const porNome = {};
  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    const nome = String(r[col.contrato] === null || r[col.contrato] === undefined ? '' : r[col.contrato])
      .replace(/ /g, ' ').trim();
    if (!nome) continue;
    const mes = _orcMesCompetencia_(r[col.comp]);
    if (mes < 0) continue;                                   // outro ano ou competência ilegível
    const c = porNome[nome] || (porNome[nome] = { nome: nome, meses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    c.meses[mes] += -_orcNum_(r[col.valor]);                 // despesa vem negativa
  }
  return Object.keys(porNome).map(k => _orcContratoItem_(porNome[k].nome, porNome[k].meses))
    .filter(c => Math.abs(c.total) > 0.005);
}

// Um contrato como item da conta, na categoria de ORC_CONTRATOS_CATEGORIA.
function _orcContratoItem_(nome, meses) {
  const fornecedor = _orcFornecedorContrato_(nome);
  const n = _orcNorm_(nome);
  const regra = ORC_CONTRATOS_CATEGORIA.filter(x => n.indexOf(_orcNorm_(x.termo)) >= 0)[0];
  return {
    descricao: 'CONTRATO — ' + fornecedor,
    fornecedor: fornecedor,
    categoria: regra ? regra.categoria : ORC_CONTRATO_SEM_CATEGORIA,
    semCategoria: !regra,
    meses: meses,
    total: meses.reduce((a, v) => a + v, 0),
    contrato: true
  };
}

// "01/2027" (texto) ou uma data → índice do mês (0..11) se for do ano do
// orçamento; -1 caso contrário.
function _orcMesCompetencia_(v) {
  // toString em vez de instanceof: vale também para data vinda de outro
  // contexto (o teste roda os .gs num vm separado).
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getFullYear() === ORC_ANO ? v.getMonth() : -1;
  const m = String(v === null || v === undefined ? '' : v).trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m || +m[2] !== ORC_ANO || +m[1] < 1 || +m[1] > 12) return -1;
  return +m[1] - 1;
}

// "05.01. MANUTENÇÃO - FIRECAM" → "FIRECAM";
// "01.01.01MANUTENÇÃO - MIRIAD SERVIÇOS…" → "MIRIAD SERVIÇOS…";
// "02.02LIMPEZAECONSERVAÇÃO - EMPRESA AUXILIAR" → "EMPRESA AUXILIAR";
// "01Limpezaeconservação1 - PEST PATROL" → "PEST PATROL";
// "80364 - EQUILIBRIO SOLUÇÕES AMBIENTAIS" → "EQUILIBRIO SOLUÇÕES AMBIENTAIS".
// O primeiro trecho cai quando é só o código da conta (letras grudadas, com
// ou sem número), não quando é parte do nome do fornecedor.
const _ORC_PREFIXOS_CONTA = ['manutencao', 'limpezaeconservacao'];
function _orcFornecedorContrato_(nome) {
  let s = String(nome).replace(/^[\d.\s]+/, '').replace(/^-\s*/, '').trim();
  const i = s.indexOf(' - ');
  if (i > 0 && _ORC_PREFIXOS_CONTA.indexOf(_orcNorm_(s.slice(0, i)).replace(/[^a-z]/g, '')) >= 0) {
    s = s.slice(i + 3).trim();
  }
  return s || String(nome).trim();
}

// Item do modelo que é contrato: a tag [CONTRATO] ou "contrato" na descrição
// ("[AVAC] - CONTRATO DE MANUTENÇÃO…", "[PPCI] - AMPLIAÇÃO CONTRATO…").
function _orcItemEhContrato_(categoriaOriginal, descricao) {
  return _orcNorm_(categoriaOriginal) === 'contrato' || /\bcontrato\b/.test(_orcNorm_(descricao));
}

function _orcRecategorizar_(categoria, descricao) {
  const r = ORC_RECATEGORIZAR.filter(x => _orcNorm_(x.de) === _orcNorm_(categoria) &&
                                          _orcNorm_(descricao).indexOf(_orcNorm_(x.termo)) >= 0)[0];
  return r ? r.para : categoria;
}

function _orcLerModelo_(planilhaId) {
  const aba = SpreadsheetApp.openById(planilhaId).getSheetByName(ORC_ABA_MODELO);
  if (!aba) throw new Error('Aba "' + ORC_ABA_MODELO + '" não encontrada na planilha ' + planilhaId);
  return _orcLinhasModelo_(aba.getDataRange().getValues());
}

// Separado da leitura para o teste passar a matriz direto.
function _orcLinhasModelo_(dados) {
  const cab = dados[0] || [];
  if (_orcNorm_(cab[ORC_COL.item]) !== 'item' || _orcNorm_(cab[ORC_COL.mes1]) !== 'mes 1' ||
      _orcNorm_(cab[ORC_COL.mes1 + 11]) !== 'mes 12') {
    throw new Error('Cabeçalho inesperado em "' + ORC_ABA_MODELO + '": esperava "Item" na coluna F e ' +
                    '"Mês 1".."Mês 12" em I..T. Encontrado: F="' + cab[ORC_COL.item] + '", I="' +
                    cab[ORC_COL.mes1] + '", T="' + cab[ORC_COL.mes1 + 11] + '".');
  }

  const out = [];
  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    const conta = String(r[ORC_COL.conta] === null || r[ORC_COL.conta] === undefined ? '' : r[ORC_COL.conta])
      .replace(/ /g, ' ').trim();
    if (!conta) continue;
    const meses = [];
    for (let m = 0; m < 12; m++) meses.push(-_orcNum_(r[ORC_COL.mes1 + m]));   // despesa vem negativa
    out.push({
      linha: i + 1,
      conta: conta,
      contaNorm: _orcNorm_(conta),
      item: String(r[ORC_COL.item] === null || r[ORC_COL.item] === undefined ? '' : r[ORC_COL.item])
        .replace(/ /g, ' ').trim(),
      meses: meses,
      total: meses.reduce((a, b) => a + b, 0)
    });
  }
  return out;
}

/**
 * "[PPCI] - PINTURA DA TUBULAÇÃO" → { categoria: 'PPCI', descricao: 'PINTURA DA TUBULAÇÃO' }.
 * Também aceita o colchete não fechado que existe na planilha
 * ("[MONITORAMENTO - KIT SONDA ..."). Sem categoria: provisão vira PROVISÃO,
 * o resto OUTROS.
 */
function _orcSepararCategoria_(item) {
  const t = String(item).trim();
  const m = t.match(/^\[([^\]]+?)(?:\]\s*-?\s*|\s+-\s+)([\s\S]*)$/);
  if (m) return { categoria: m[1].trim().toUpperCase(), descricao: m[2].trim() || t };
  if (/^provis/.test(_orcNorm_(t))) return { categoria: 'PROVISÃO', descricao: t };
  return { categoria: 'OUTROS', descricao: t };
}

/**
 * @param linhas     linhas da conta no modelo 090 (avulsos e alguns contratos)
 * @param contratos  saída de _orcLinhasContratos_ (contratos recorrentes)
 * Cada categoria soma os dois e separa totalContratos × totalAvulsos — é o
 * que a barra combinada do resumo mostra.
 */
function _orcAgruparCategorias_(linhas, contratos) {
  const zeros = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const mapa = {};
  const meses = zeros();
  let total = 0, nItens = 0, nZerados = 0, totalContratos = 0;
  const avisos = [];

  const somar = (categoria, item) => {
    const chave = _orcNorm_(categoria);
    const c = mapa[chave] || (mapa[chave] = { nome: categoria, total: 0, totalContratos: 0, totalAvulsos: 0,
                                              meses: zeros(), itens: [] });
    c.total += item.total;
    if (item.contrato) { c.totalContratos += item.total; totalContratos += item.total; }
    else c.totalAvulsos += item.total;
    item.meses.forEach((v, i) => { c.meses[i] += v; meses[i] += v; });
    c.itens.push(item);
    total += item.total;
    nItens++;
  };

  linhas.forEach(l => {
    // Linha "RATEIO" do modelo vem zerada nos doze meses: não é item orçado.
    if (l.meses.every(v => Math.abs(v) < 0.005)) { nZerados++; return; }
    const s = _orcSepararCategoria_(l.item);
    somar(_orcRecategorizar_(s.categoria, s.descricao), {
      descricao: s.descricao, total: l.total, meses: l.meses, linha: l.linha,
      contrato: _orcItemEhContrato_(s.categoria, s.descricao)
    });
  });
  (contratos || []).forEach(k => {
    if (k.semCategoria) avisos.push('Contrato "' + k.fornecedor + '" sem categoria em ORC_CONTRATOS_CATEGORIA (01_Config.gs)');
    somar(k.categoria, { descricao: k.descricao, total: k.total, meses: k.meses, contrato: true });
  });
  avisos.forEach(a => Logger.log('AVISO manutenção: ' + a));

  const categorias = Object.keys(mapa).map(k => mapa[k]).sort((a, b) => b.total - a.total);
  categorias.forEach(c => {
    c.itens.sort((a, b) => b.total - a.total);
    c.pct = total ? c.total / total : 0;
  });
  return { total: total, meses: meses, nItens: nItens, nZerados: nZerados, categorias: categorias,
           totalContratos: totalContratos, nContratos: (contratos || []).length, avisos: avisos };
}

// Categorias que ganham slide próprio e as que vão juntas em "Demais".
function _orcDividirCategorias_(dados) {
  const proprias = dados.categorias.filter(c => c.pct >= ORC_FATIA_SLIDE_PROPRIO);
  const demais = dados.categorias.filter(c => c.pct < ORC_FATIA_SLIDE_PROPRIO);
  return { proprias: proprias, demais: demais };
}

// Todos os itens da conta, do maior para o menor, com a categoria junto.
function _orcTodosItens_(dados) {
  const out = [];
  dados.categorias.forEach(c => c.itens.forEach(it => out.push(Object.assign({ categoria: c.nome }, it))));
  return out.sort((a, b) => b.total - a.total);
}
