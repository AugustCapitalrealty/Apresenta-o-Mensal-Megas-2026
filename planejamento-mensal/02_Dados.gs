/**
 * ARQUIVO: 02_Dados.gs
 * LEITURA DE DADOS — export da controladoria (financeiro) e planilha de P&G
 * (metas e projetos). Nada aqui desenha.
 */

// ==========================================
// NÚMERO, TEXTO, DATA
// ==========================================

// Texto da controladoria → número. "-1.234,56" e "(1.234,56)" = negativo.
// Vazio → null (não medido ≠ zero).
function _pgNum_(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  let t = String(v).replace(/ /g, ' ').trim();
  if (!t || t === '-' || t === '—' || t === '---') return null;
  const neg = /^\(.*\)$/.test(t);
  t = t.replace(/[()]/g, '').replace(/R\$/gi, '').replace(/%/g, '').trim();
  t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// Tira acento para comparar. Classe ESCAPADA de propósito (lição do README do repo).
function _pgNorm_(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// Célula de data da planilha (Date) ou texto "dd/mm/aaaa" → Date; senão null.
function _pgData_(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return new Date(ano, Number(m[2]) - 1, Number(m[1]));
}

function _pgDataCurta_(d) {
  if (!d) return '—';
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
}

// Mês por extenso (com ou sem acento) → índice 0–11; -1 se não reconhecer.
function _pgMesIdx_(txt) {
  const t = _pgNorm_(txt);
  for (let i = 0; i < 12; i++) {
    const nome = _pgNorm_(PG_MESES[i]);
    if (t === nome || t === nome.slice(0, 3)) return i;
  }
  return -1;
}


// ==========================================
// FINANCEIRO — export da controladoria
// ==========================================

/**
 * Acha o export mais recente na pasta de P&G: arquivo "Planejamento-<Mês>-<Ano>.csv".
 * O MÊS DE REFERÊNCIA DO DECK SAI DO NOME DO ARQUIVO.
 *
 * POR QUE NÃO DETECTAR PELO ÚLTIMO MÊS COM REALIZADO: o export de out/26 já
 * traz R$ 11,53 realizado em NOVEMBRO (seguro de vida). Detectar pelo dado
 * daria um deck de novembro sem novembro. O nome do arquivo é uma decisão de
 * quem salvou — é a fonte certa.
 */
function _pgAcharExport_() {
  const pasta = DriveApp.getFolderById(PG_PASTA_ID);
  const it = pasta.getFiles();
  let melhor = null;
  while (it.hasNext()) {
    const f = it.next();
    const m = f.getName().match(/^planejamento[-_ ]+([a-zçãéêíóôú]+)[-_ ]+(\d{4})\.csv$/i);
    if (!m) continue;
    const mes = _pgMesIdx_(m[1]);
    if (mes < 0) { Logger.log('⚠ Export ignorado (mês não reconhecido no nome): ' + f.getName()); continue; }
    const chave = Number(m[2]) * 12 + mes;
    if (!melhor || chave > melhor.chave) melhor = { arquivo: f, mes: mes, ano: Number(m[2]), chave: chave };
  }
  if (!melhor) throw new Error('Nenhum export "Planejamento-<Mês>-<Ano>.csv" na pasta de P&G (' + PG_PASTA_ID + '). ' +
    'Salve o CSV da controladoria com esse nome (ex.: Planejamento-Outubro-2026.csv).');
  return melhor;
}

// O export vem em ISO-8859-1 (Excel/ERP). Se alguém regravar em UTF-8, também lê.
function _pgTextoCsv_(arquivo) {
  const blob = arquivo.getBlob();
  const utf8 = blob.getDataAsString('UTF-8');
  return utf8.indexOf('�') >= 0 ? blob.getDataAsString('ISO-8859-1') : utf8;
}

// Célula do export: ="06.04.21.05" → 06.04.21.05 ; "1|1.01.01.008" fica como está.
function _pgCelula_(c) {
  return String(c == null ? '' : c).trim().replace(/^=/, '').replace(/^"+|"+$/g, '').trim();
}

/**
 * Lê o export e devolve:
 *   { mes, ano, arquivo, linhas: [{ conta, desc, empresa, centro, P[12], R[12] }], avisos: [] }
 * P = coluna "Planejado" = RITMO (decisão do Guilherme, 12/11/2026 — nunca é orçamento).
 * R = Realizado. Valores como vêm: despesa NEGATIVA.
 */
function obterFinanceiroPG_() {
  const exp = _pgAcharExport_();
  const tabela = Utilities.parseCsv(_pgTextoCsv_(exp.arquivo), ';');
  if (!tabela.length) throw new Error('Export vazio: ' + exp.arquivo.getName());
  const cab = tabela[0].map(_pgCelula_);

  // Colunas mensais pelo cabeçalho ("PlanejadoJan/26", "RealizadoOut/26"), não pela posição.
  const colP = Array(12).fill(-1), colR = Array(12).fill(-1);
  cab.forEach((h, j) => {
    const m = h.match(/^(planejado|realizado)\s*([a-zç]{3})\/(\d{2})$/i);
    if (!m) return;
    const i = _pgMesIdx_(m[2]);
    if (i < 0) return;
    if (/^p/i.test(m[1])) colP[i] = j; else colR[i] = j;
  });
  const achar = re => cab.findIndex(h => re.test(_pgNorm_(h)));
  const cConta = achar(/^estr\.? da conta/), cDesc = achar(/^descricao da conta/),
        cEmp = achar(/^descricao da unidade/), cCentro = achar(/^descricao do centro de custo/);
  if (cConta < 0 || colP.indexOf(-1) >= 0 || colR.indexOf(-1) >= 0) {
    throw new Error('Cabeçalho do export não reconhecido (esperado "Estr. da conta" e Planejado/Realizado de Jan a Dez). ' +
      'Arquivo: ' + exp.arquivo.getName());
  }

  const linhas = [], avisos = [], centros = {};
  tabela.slice(1).forEach(r => {
    const conta = _pgCelula_(r[cConta]);
    if (!/^\d{2}(\.\d+)*$/.test(conta)) return;
    const centro = cCentro >= 0 ? _pgCelula_(r[cCentro]) : '';
    if (centro) centros[centro] = true;
    linhas.push({
      conta: conta,
      desc: cDesc >= 0 ? _pgCelula_(r[cDesc]) : conta,
      empresa: cEmp >= 0 ? _pgCelula_(r[cEmp]) : '',
      centro: centro,
      P: colP.map(j => _pgNum_(r[j]) || 0),
      R: colR.map(j => _pgNum_(r[j]) || 0)
    });
  });
  const nomesCentro = Object.keys(centros);
  if (nomesCentro.some(c => _pgNorm_(c).indexOf('planejamento') < 0)) {
    avisos.push('Export com centro de custo que não é P&G: ' + nomesCentro.join(', '));
  }
  Logger.log('Financeiro: ' + exp.arquivo.getName() + ' · ' + linhas.length + ' contas · mês de referência ' +
    PG_MESES[exp.mes] + ' ' + exp.ano);
  return { mes: exp.mes, ano: exp.ano, arquivo: exp.arquivo.getName(), linhas: linhas, avisos: avisos };
}

// Rubrica da conta (primeiro prefixo que casa, na ordem de PG_RUBRICAS). null = fora do 06.
function _pgRubricaDaConta_(conta) {
  if (!/^06(\.|$)/.test(conta)) return null;
  for (let g = 0; g < PG_RUBRICAS.length; g++) {
    const itens = PG_RUBRICAS[g].itens;
    for (let k = 0; k < itens.length; k++) {
      if (itens[k][1].some(p => conta === p || conta.indexOf(p + '.') === 0)) return { g: g, k: k };
    }
  }
  return null;
}

/**
 * Agrega o financeiro no formato do DRE. Despesa POSITIVA (despesa = −valor):
 * um crédito no realizado (estorno) entra negativo e abate, como na planilha.
 *
 *   grupos[g] = { nome, P[12], R[12], itens: [{ nome, P[12], R[12], contas: [...] }] }
 *   total     = { P[12], R[12] }
 *   deprec    = { P[12], R[12] }      (08 — fora do total)
 *   creditos  = [{ desc, mes, valor }]  (realizado positivo no export)
 *   foraMapa  = [descrições]           (06 que caiu em "Outras (fora do mapa)")
 */
function agregarFinanceiroPG_(fin) {
  const z = () => Array(12).fill(0);
  const grupos = PG_RUBRICAS.map(g => ({
    nome: g.grupo, detalhar: g.detalhar !== false, mesAMes: g.mesAMes !== false && g.detalhar !== false, P: z(), R: z(),
    itens: g.itens.map(it => ({ nome: it[0], P: z(), R: z(), contas: {} }))
  }));
  const total = { P: z(), R: z() }, deprec = { P: z(), R: z() };
  const creditos = [], foraMapa = {}, ignoradas = {};
  const ultimo = PG_RUBRICAS.length - 1, ultimoItem = PG_RUBRICAS[ultimo].itens.length - 1;

  fin.linhas.forEach(l => {
    const P = l.P.map(v => -v), R = l.R.map(v => -v);
    if (/^08(\.|$)/.test(l.conta)) {
      for (let i = 0; i < 12; i++) { deprec.P[i] += P[i]; deprec.R[i] += R[i]; }
      return;
    }
    const pos = _pgRubricaDaConta_(l.conta);
    if (!pos) {
      if (l.P.some(v => v) || l.R.some(v => v)) ignoradas[l.conta + ' ' + l.desc] = true;
      return;
    }
    if (pos.g === ultimo && pos.k === ultimoItem) foraMapa[l.conta + ' ' + l.desc] = true;
    const g = grupos[pos.g], it = g.itens[pos.k];
    it.contas[l.conta + ' ' + l.desc] = true;
    for (let i = 0; i < 12; i++) {
      it.P[i] += P[i]; it.R[i] += R[i];
      g.P[i] += P[i]; g.R[i] += R[i];
      total.P[i] += P[i]; total.R[i] += R[i];
    }
    // Crédito de grupo fechado (pessoal) sai somado no mês com o nome do grupo — nunca a conta.
    const descCred = g.detalhar ? l.desc : _pgNomeGrupo_(g.nome);
    l.R.forEach((v, i) => {
      if (!(v > 0.005 && i <= fin.mes)) return;
      const ja = creditos.find(c => c.desc === descCred && c.mes === i);
      if (ja && !g.detalhar) ja.valor += v; else creditos.push({ desc: descCred, mes: i, valor: v });
    });
  });

  Object.keys(foraMapa).forEach(c => Logger.log('⚠ Conta fora do mapa de rubricas (entrou em "Outras"): ' + c));
  Object.keys(ignoradas).forEach(c => Logger.log('⚠ Conta fora das despesas operacionais (06/08), não entrou: ' + c));
  return { grupos: grupos, total: total, deprec: deprec, creditos: creditos,
           foraMapa: Object.keys(foraMapa), ignoradas: Object.keys(ignoradas) };
}

// Somas de uma série (despesa) para o mês de referência m.
function _pgSomas_(serie, m) {
  const soma = (a, i, j) => a.slice(i, j).reduce((x, y) => x + y, 0);
  return {
    mesP: serie.P[m], mesR: serie.R[m],
    acumP: soma(serie.P, 0, m + 1), acumR: soma(serie.R, 0, m + 1),
    anoP: soma(serie.P, 0, 12),
    proj: soma(serie.R, 0, m + 1) + soma(serie.P, m + 1, 12)    // real até o mês + ritmo depois
  };
}

// "PESSOAL" → "Pessoal"; "VIAGENS E DESLOCAMENTOS" → "Viagens e deslocamentos".
function _pgNomeGrupo_(nome) { const t = String(nome).toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); }

/**
 * Contas com maior diferença real × ritmo no acumulado (para as notas do DRE).
 * Agrupa a mesma conta das duas empresas (11 e 61). Grupo fechado (pessoal)
 * entra como UM item com o nome do grupo — nunca por conta.
 */
function _pgMaioresVariacoes_(fin, n) {
  const m = fin.mes, por = {};
  fin.linhas.forEach(l => {
    const pos = _pgRubricaDaConta_(l.conta);
    if (!pos) return;
    const grp = PG_RUBRICAS[pos.g];
    const k = grp.detalhar === false ? 'G:' + grp.grupo : l.conta;
    por[k] = por[k] || { conta: k, desc: grp.detalhar === false ? _pgNomeGrupo_(grp.grupo) : l.desc, dif: 0, real: 0, ritmo: 0 };
    for (let i = 0; i <= m; i++) { por[k].real += -l.R[i]; por[k].ritmo += -l.P[i]; }
  });
  return Object.keys(por).map(k => por[k])
    .map(x => { x.dif = x.real - x.ritmo; return x; })
    .filter(x => Math.abs(x.dif) >= 500)
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
    .slice(0, n || 4);
}


// ==========================================
// PLANILHA DE P&G — METAS e PROJETOS
// ==========================================

function _pgPlanilha_() {
  const id = PropertiesService.getScriptProperties().getProperty(PG_PROP_PLANILHA);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { Logger.log('⚠ ' + PG_PROP_PLANILHA + ' inválido: ' + e.message); } }
  const it = DriveApp.getFolderById(PG_PASTA_ID).getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName() === PG_PLANILHA_NOME) return SpreadsheetApp.openById(f.getId());
  }
  return null;
}

// Linhas de uma aba como objetos, pelo nome do cabeçalho (sem acento). Aba ausente → null.
function _pgLerAba_(nomeAba) {
  const ss = _pgPlanilha_();
  if (!ss) return null;
  const sh = ss.getSheetByName(nomeAba);
  if (!sh) return null;
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const cab = v[0].map(_pgNorm_);
  return v.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => { const o = {}; cab.forEach((h, j) => { o[h] = r[j]; }); return o; });
}

// "Situação em" (CONFIG!B1): de que mês são metas e projetos. Texto livre ("OUTUBRO 2026").
function _pgSituacaoEm_() {
  const ss = _pgPlanilha_();
  const sh = ss && ss.getSheetByName('CONFIG');
  if (!sh) return '';
  return String(sh.getRange('B1').getDisplayValue() || '').trim().toUpperCase();
}

/**
 * Metas (aba METAS). Pontos atingidos = soma dos pontos com Status ano = Verde.
 * Status vazio ou desconhecido não pontua e aparece como "—".
 */
function obterMetasPG_() {
  const rows = _pgLerAba_('METAS');
  if (rows == null) return null;
  const st = v => { const k = _pgNorm_(v); return PG_STATUS_META[k] ? k : ''; };
  const metas = rows.map((r, i) => ({
    n: r['no'] || r['n'] || (i + 1),
    meta: String(r['meta'] || '').trim(),
    direcionador: String(r['direcionador'] || '').trim(),
    prazo: _pgData_(r['prazo']),
    pontos: _pgNum_(r['pontos']) || 0,
    realMes: String(r['real mes'] || '').trim(),
    statusMes: st(r['status mes']),
    realAno: String(r['real ano'] || '').trim(),
    statusAno: st(r['status ano']),
    andamento: String(r['andamento'] || '').trim(),
    proximo: String(r['proximo passo'] || '').trim()
  })).filter(m => m.meta);
  const total = metas.reduce((s, m) => s + m.pontos, 0);
  const atingidos = metas.filter(m => m.statusAno === 'verde').reduce((s, m) => s + m.pontos, 0);
  return { metas: metas, total: total, atingidos: atingidos, situacao: _pgSituacaoEm_() };
}

/**
 * Projetos do ano (aba PROJETOS): Projeto · Área cliente · Situação · Concluído em · O que foi feito.
 * Aceita também a aba no formato da 1ª versão (Status/Entregue em/Observação):
 * Status "Entregue" vira Concluído, qualquer outro status preenchido vira Em andamento.
 */
function obterProjetosPG_() {
  const rows = _pgLerAba_('PROJETOS');
  if (rows == null) return null;
  return rows.map(r => {
    let k = _pgNorm_(r['situacao']);
    if (!k && r['status'] != null) {
      const st = _pgNorm_(r['status']);
      k = st === 'entregue' ? 'concluido' : st === 'pausado' ? 'pausado' : st ? 'em andamento' : '';
    }
    if (k === 'concluida' || k === 'entregue') k = 'concluido';
    return {
      projeto: String(r['projeto'] || '').trim(),
      area: String(r['area cliente'] || r['area'] || '').trim(),
      situacao: PG_SITUACAO_PROJETO[k] ? k : '',
      concluidoEm: _pgData_(r['concluido em'] != null ? r['concluido em'] : r['entregue em']),
      feito: String(r['o que foi feito'] || r['observacao'] || '').trim()
    };
  }).filter(p => p.projeto);
}

function _pgSituacao_(p) { return PG_SITUACAO_PROJETO[p.situacao] || PG_STATUS_VAZIO; }

// Lista do ano: concluídos (pela data), depois em andamento, pausados e sem situação.
function _pgProjetosOrdenados_(lista) {
  return lista.slice().sort((a, b) => (_pgSituacao_(a).ordem - _pgSituacao_(b).ordem) ||
    ((a.concluidoEm || 0) - (b.concluidoEm || 0)) || a.projeto.localeCompare(b.projeto));
}
