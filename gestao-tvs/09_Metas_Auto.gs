/**
 * ARQUIVO: 09_Metas_Auto.gs
 * DESCRIÇÃO: Auto-preenchimento do slide de Metas (07_Slide_Metas.gs) para
 * indicadores que já são calculados em outras planilhas, em vez de digitados
 * à mão na aba METAS. Lógica portada de
 * AugustCapitalrealty/Apresenta-o-Mensal-Megas-2026 (Slide_Metas.gs +
 * 02_Dados.gs), adaptada às fontes de dados realmente disponíveis aqui.
 *
 * INDICADORES AUTOMÁTICOS (o Real Mês/Real Acum. da linha é SOBRESCRITO; se
 * o cálculo falhar por qualquer motivo — aba/planilha ausente, sem match —
 * o valor digitado na aba METAS prevalece, nada quebra). Todos usam a
 * mesma planilha por unidade, unit.metasAutoSpreadsheetId ("Mega <cidade> -
 * Planilha 2026"), exceto onde indicado:
 *   ▸ CHECK-LIST/SLA (exceto "terceiros"/"acesso") → aba PREVENTIVAS
 *     (Mês/Acum.).
 *   ▸ ÍNDICE DE DISPONIBILIDADE → aba CHAMADOS (Mês/Acum.).
 *   ▸ CUSTO M² → aba METRO QUADRADO (também sobrescreve a Meta em R$/m²
 *     quando a meta for composta, ex. "R$ 4,21 / 80%"); a parte "% das
 *     manutenções planejadas" vem da planilha de PPC (unit.ppcId, aba
 *     DASHBOARD) quando configurada, senão fica em "0%".
 *   ▸ CHECK-LIST/SLA - TERCEIROS (Analista) → aba META.
 *   ▸ CUMPRIR ORÇAMENTO (Analista) → aba FINANCEIRO BRIDGE.
 *   ▸ TAXA DE REABERTURA → planilha externa "MEGA <CIDADE> FACILITIES"
 *     (unit.reaberturaId) — não é exclusivo do Analista; em Esteio é meta
 *     do Supervisor.
 *
 * MÊS DE REFERÊNCIA (obterMesReferencia): NÃO é o mês do calendário — é o
 * mês que a própria planilha "Mega <cidade>" está reportando (lido da aba
 * DADOS, célula B1), porque o fechamento dos indicadores atrasa em relação
 * ao mês corrente (ex.: em julho, o mês fechado mais recente ainda é
 * junho). Usar o calendário faria o Custo M² ler a coluna "Ritmo"
 * (projeção) em vez de "Real", e o PPC ler um mês sem dado lançado ainda.
 *
 * TENDÊNCIA (▲/▼ vs período anterior, exibida como selo sobre o valor):
 * para SLA e Disponibilidade vem da planilha "HISTORICO GERENCIAL"
 * (HISTORICO_VALIDADO_ID, mesma usada pela Apresentação Mensal). Para os
 * demais vem da própria série mensal da fonte. Sem match ou planilha
 * indisponível → sem tendência (o valor aparece normalmente).
 */

// ==========================================
// HISTÓRICO GERENCIAL (planilha Mês | Empreendimento | INDICADOR | DADO)
// ==========================================
function _histNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function _histEmpChave(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function _histParseMes(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mes = parseInt(m[1], 10), ano = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return null;
  return { ord: ano * 100 + mes };
}
function _histNumLenient(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  s = s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}\b)/g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

// Série mensal (ordenada) de um indicador para a unidade, lida da planilha
// HISTORICO_VALIDADO_ID. [] se a planilha/indicador não existir/não bater.
function lerHistoricoGerencial(unit, indicador) {
  const alvoEmp = _histEmpChave(unit.name);
  const alvoInd = _histNorm(indicador);
  const saida = [];
  try {
    const ss = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    ss.getSheets().forEach(sheet => {
      const data = sheet.getDataRange().getDisplayValues();
      if (data.length < 2) return;
      const hdr = data[0].map(_histNorm);
      const cMes = hdr.findIndex(h => h.indexOf('mes') === 0);
      const cEmp = hdr.findIndex(h => h.indexOf('empreend') >= 0);
      const cInd = hdr.findIndex(h => h.indexOf('indicador') >= 0);
      const cVal = hdr.findIndex(h => h.indexOf('dado') >= 0 || h.indexOf('valor') >= 0);
      if (cMes < 0 || cInd < 0 || cVal < 0) return;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (cEmp >= 0 && _histEmpChave(row[cEmp]) !== alvoEmp) continue;
        if (_histNorm(row[cInd]) !== alvoInd) continue;
        const mes = _histParseMes(row[cMes]);
        const val = _histNumLenient(row[cVal]);
        if (!mes || isNaN(val)) continue;
        saida.push({ ord: mes.ord, valor: val });
      }
    });
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler HISTORICO GERENCIAL ("${indicador}", ${unit.name}): ${e.message}`);
  }
  saida.sort((a, b) => a.ord - b.ord);
  return saida;
}

// Variação do valor ATUAL vs o mês anterior no HISTÓRICO GERENCIAL. O "mês
// de referência" é o mesmo usado nos outros indicadores automáticos
// (obterMesReferencia — o mês que a planilha "Mega <cidade>" está
// reportando agora, não necessariamente o mês do calendário). null se não
// houver mês anterior na base.
function deltaVsMesAnterior(unit, atualTxt, indicador) {
  const atualN = _histNumLenient(atualTxt);
  if (isNaN(atualN)) return null;
  const serie = lerHistoricoGerencial(unit, indicador);
  if (!serie.length) return null;

  const ordRef = obterMesReferencia(unit).ord;

  let prev = null;
  serie.forEach(p => { if (p.ord < ordRef && (!prev || p.ord > prev.ord)) prev = p; });
  if (!prev) {
    const outros = serie.filter(p => p.ord !== ordRef);
    if (outros.length) prev = outros[outros.length - 1];
  }
  if (!prev) return null;
  return Math.round((atualN - prev.valor) * 100) / 100;
}

// Texto + cor da seta de tendência (▲/▼), para desenhar como selo sobre o
// valor. menorMelhor=true → delta negativo é bom (ex.: custo). null se não
// houver delta.
function tendenciaTexto(delta, menorMelhor) {
  const ds = CR_DESIGN_SYSTEM;
  if (delta == null || isNaN(delta)) return null;
  if (delta === 0) return { txt: '▬ 0', cor: ds.colors.textBody };
  const seta = delta > 0 ? '▲' : '▼';
  // Sempre 2 casas decimais quando houver fração (ex.: 0,3 -> "0,30"),
  // igual a formatarNumeroBR() da Apresentação Mensal — _fmtNumeroBR já
  // implementa a mesma regra (minimumFractionDigits/maximumFractionDigits:2).
  const numTxt = _fmtNumeroBR(Math.abs(delta));
  const txt = `${seta} ${delta > 0 ? '+' : '−'}${numTxt}`;
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? ds.colors.accentGreen : ds.colors.accentRed };
}


// ==========================================
// MÊS DE REFERÊNCIA — o mês que a planilha "Mega <cidade> - Planilha 2026"
// está reportando agora (lido da aba DADOS, célula B1, ex.: "JUN"), e NÃO o
// mês do calendário: a organização fecha os indicadores com atraso (ex.:
// em julho, os dados ainda mostram junho como último mês fechado). Usar o
// mês do calendário faria os indicadores automáticos lerem uma coluna
// "Ritmo" (projeção) em vez de "Real" (fechado), ou ficarem vazios.
// Fallback: mês anterior ao calendário. Resultado em cache por unidade.
// ==========================================
const MESES_3_REF = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
let _mesReferenciaCache = {};
function obterMesReferencia(unit) {
  if (!unit.metasAutoSpreadsheetId) {
    const hoje = new Date();
    const idx = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getMonth();
    const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return { index: idx, ano: ano, ord: ano * 100 + (idx + 1) };
  }

  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _mesReferenciaCache) return _mesReferenciaCache[chave];

  const hoje = new Date();
  let idx = -1;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const sheet = ss.getSheetByName('DADOS') || ss.getSheets()[0];
    const cab = _histNorm(sheet.getRange(1, 2).getDisplayValue());
    idx = MESES_3_REF.findIndex(m => cab.indexOf(m) === 0);
  } catch (e) {
    Logger.log(`⚠️ Mês de referência (${unit.name}): usando fallback de calendário. ${e.message}`);
  }
  if (idx < 0) idx = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getMonth(); // último dia do mês anterior
  const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();

  const ref = { index: idx, ano: ano, ord: ano * 100 + (idx + 1) };
  _mesReferenciaCache[chave] = ref;
  return ref;
}


// ==========================================
// CHECK-LIST/SLA (aba PREVENTIVAS da planilha "Mega <cidade>")
// Colunas: A=INDICADOR, B=MENSAL, C=ANUAL (acumulado) — mesma estrutura da
// aba CHAMADOS. Indicador de linha contém "sla" ou "atend".
// ==========================================
let _preventivasCache = {};
function obterDadosPreventivasAuto(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _preventivasCache) return _preventivasCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('PREVENTIVAS');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const linha = data.find(r => {
        const n = _histNorm(r[0]);
        return n.indexOf('sla') >= 0 || n.indexOf('atend') >= 0;
      });
      if (linha) out = { mes: linha[1], acum: linha[2] };
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler SLA de Preventivas (${unit.name}): ${e.message}`);
  }
  _preventivasCache[chave] = out;
  return out;
}


// ==========================================
// ÍNDICE DE DISPONIBILIDADE (aba CHAMADOS da planilha "Mega <cidade>")
// ==========================================
let _disponibilidadeCache = {};
function obterIndiceDisponibilidade(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _disponibilidadeCache) return _disponibilidadeCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('CHAMADOS');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const linha = data.find(r => _histNorm(r[0]).indexOf('disponibilidade') >= 0);
      if (linha) out = { mes: linha[1], acum: linha[2] };
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Índice de Disponibilidade (${unit.name}): ${e.message}`);
  }
  _disponibilidadeCache[chave] = out;
  return out;
}


// ==========================================
// CHECK-LIST/SLA - TERCEIROS (Analista) — aba META da planilha "Mega <cidade>"
// Colunas: MÊS (data) | CARGO | META (descrição) | RESULTADO MÊS | RESULTADO
// ACUMULADO. Lida com getValues() (não getDisplayValues()) porque a coluna
// MÊS é uma data de verdade — extrair ano/mês do objeto Date evita depender
// do formato de exibição da célula.
// ==========================================
let _metaAnalistaRawCache = {};
function _lerMetaAnalistaRaw(unit) {
  if (!unit.metasAutoSpreadsheetId) return [];
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _metaAnalistaRawCache) return _metaAnalistaRawCache[chave];

  let saida = [];
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('META');
    if (aba) {
      const ultima = aba.getLastRow();
      if (ultima >= 2) {
        const raw = aba.getRange(2, 1, ultima - 1, 5).getValues();
        raw.forEach(l => {
          const dt = l[0];
          if (!(dt instanceof Date)) return;
          const vMes = _histNumLenient(l[3]);
          const vAcum = _histNumLenient(l[4]);
          if (isNaN(vMes) && isNaN(vAcum)) return;
          saida.push({
            ord: dt.getFullYear() * 100 + (dt.getMonth() + 1),
            cargo: _histNorm(l[1]),
            desc: _histNorm(l[2]),
            mes: vMes,
            acum: vAcum
          });
        });
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler aba META (${unit.name}): ${e.message}`);
  }
  _metaAnalistaRawCache[chave] = saida;
  return saida;
}

// Série [{ord, mes, acum}] para CARGO=Analista e Descrição batendo matchFn,
// ordenada por mês. Quando há mais de uma linha para o mesmo mês, a ÚLTIMA
// linha da planilha vence (correção manual).
function _serieMetaAnalista(unit, matchFn) {
  const porOrd = {};
  _lerMetaAnalistaRaw(unit).forEach(l => {
    if (l.cargo.indexOf('analista') >= 0 && matchFn(l.desc)) porOrd[l.ord] = l;
  });
  return Object.keys(porOrd).map(k => porOrd[k]).sort((a, b) => a.ord - b.ord);
}


// ==========================================
// TAXA DE REABERTURA (Analista) — planilha externa "MEGA <CIDADE>
// FACILITIES" (unit.reaberturaId), aba TAXA DE ABERTURA: uma linha
// FECHADOS, uma linha REABERTOS, um mês por coluna. O cabeçalho de mês é
// uma data de verdade (lida com getValues(), mesma lógica da aba META).
// ==========================================
let _reaberturaCache = {};
function obterDadosTaxaReabertura(unit) {
  if (!unit.reaberturaId) return null;
  const chave = unit.reaberturaId;
  if (chave in _reaberturaCache) return _reaberturaCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.reaberturaId);
    const aba = ss.getSheetByName('TAXA DE ABERTURA') || ss.getSheetByName('TAXA DE REABERTURA');
    if (aba) {
      const data = aba.getDataRange().getValues();
      let rFechados = -1, rReabertos = -1;
      for (let r = 0; r < data.length; r++) {
        const lbl = _histNorm(data[r][0] || data[r][1] || '');
        if (rFechados < 0 && lbl.indexOf('fechado') >= 0) rFechados = r;
        if (rReabertos < 0 && lbl.indexOf('reaberto') >= 0) rReabertos = r;
      }
      if (rFechados >= 0 && rReabertos >= 0) {
        const hdrRow = Math.min(rFechados, rReabertos) - 1;
        if (hdrRow >= 0) {
          const cols = [];
          data[hdrRow].forEach((cell, c) => {
            if (cell instanceof Date) cols.push({ c: c, ord: cell.getFullYear() * 100 + (cell.getMonth() + 1) });
          });
          if (cols.length) {
            cols.sort((a, b) => a.ord - b.ord);
            out = cols.map(g => ({
              ord: g.ord,
              fechados: _histNumLenient(data[rFechados][g.c]),
              reabertos: _histNumLenient(data[rReabertos][g.c])
            }));
          }
        }
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Taxa de Reabertura (${unit.name}): ${e.message}`);
  }
  _reaberturaCache[chave] = out;
  return out;
}


// ==========================================
// CUMPRIR ORÇAMENTO (Analista) — soma das rubricas Energia Elétrica, Água,
// Telefone, Material de Consumo e Informática na aba FINANCEIRO BRIDGE da
// planilha "Mega <cidade>".
// ==========================================
let _orcamentoAnalistaCache = {};
function obterDadosOrcamentoAnalista(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _orcamentoAnalistaCache) return _orcamentoAnalistaCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('FINANCEIRO BRIDGE');
    if (aba) {
      const data = aba.getDataRange().getValues();
      const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);

      let hdrRow = -1;
      for (let r = 0; r < Math.min(5, data.length); r++) {
        if (data[r].some(c => /^or[cç]/i.test(_histNorm(c)))) { hdrRow = r; break; }
      }

      if (hdrRow >= 0) {
        const hdr = data[hdrRow];
        const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const grupos = [];
        for (let c = 1; c + 1 < hdr.length; c += 3) {
          if (!/^or[cç]/.test(_histNorm(hdr[c]))) break;
          const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\/(\d{2,4})/);
          if (!m) continue;
          const idxMes = MESES.indexOf(_histNorm(m[1]).substring(0, 3));
          if (idxMes < 0) continue;
          const ano2 = m[2].length === 2 ? m[2] : m[2].slice(-2);
          grupos.push({ ord: (2000 + parseInt(ano2, 10)) * 100 + (idxMes + 1), cOrc: c, cReal: c + 1 });
        }

        // Rubricas-alvo por palavra-chave (radical "materia" cobre "material"
        // e "materiais"; "informatic" cobre "Materiais de Informática" e
        // "Assistência de Informática").
        const bateRubrica = norm => {
          if (norm.indexOf('energia') >= 0 && norm.indexOf('eletric') >= 0) return true;
          if (norm === 'agua' || norm.indexOf('agua') === 0) return true;
          if (norm.indexOf('telefon') >= 0) return true;
          if (norm.indexOf('materia') >= 0 && norm.indexOf('consumo') >= 0) return true;
          if (norm.indexOf('informatic') >= 0) return true;
          return false;
        };

        const linhasAlvo = [];
        for (let r = hdrRow + 1; r < data.length; r++) {
          const norm = _histNorm(data[r][0]);
          if (norm && bateRubrica(norm)) linhasAlvo.push(r);
        }

        if (grupos.length && linhasAlvo.length) {
          out = grupos.map(g => {
            let orc = 0, real = 0;
            linhasAlvo.forEach(r => { orc += toAbs(data[r][g.cOrc]); real += toAbs(data[r][g.cReal]); });
            return { ord: g.ord, orc: orc, real: real };
          }).sort((a, b) => a.ord - b.ord);
        }
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Cumprir Orçamento (FINANCEIRO BRIDGE, ${unit.name}): ${e.message}`);
  }
  _orcamentoAnalistaCache[chave] = out;
  return out;
}

// ==========================================
// PPC — PLANO DE PREVENTIVAS CUMPRIDO (planilha "PPC MEGA <CIDADE> 2026")
// Aba DASHBOARD: linha 4 = mês (JANEIRO..DEZEMBRO, uma coluna por mês),
// linha 7 = aderência % do mês, linha 8 = meta %, linha 9 = acumulado %.
// Fonte da parte "% das manutenções planejadas" da meta composta Custo M².
// Retorna array indexado por mês (0=Jan..11=Dez) com {aderencia, meta,
// acumulado}, ou null se a unidade não tiver ppcId / aba fora do formato.
// ==========================================
function _histPct(v) {
  return _histNumLenient(String(v == null ? '' : v).replace('%', ''));
}

let _ppcCache = {};
function obterDadosPPC(unit) {
  if (!unit.ppcId) return null;
  const chave = unit.ppcId;
  if (chave in _ppcCache) return _ppcCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.ppcId);
    const aba = ss.getSheetByName('DASHBOARD');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      if (data.length >= 9) {
        const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const linhaMes = data[3];       // linha 4
        const linhaAderencia = data[6]; // linha 7
        const linhaMeta = data[7];      // linha 8
        const linhaAcumulado = data[8]; // linha 9

        const porMes = [];
        linhaMes.forEach((cell, c) => {
          const idxMes = MESES.indexOf(_histNorm(cell));
          if (idxMes < 0) return;
          porMes[idxMes] = {
            aderencia: _histPct(linhaAderencia[c]),
            meta: _histPct(linhaMeta[c]),
            acumulado: _histPct(linhaAcumulado[c])
          };
        });
        if (porMes.length) out = porMes;
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler PPC (${unit.name}): ${e.message}`);
  }
  _ppcCache[chave] = out;
  return out;
}

function _fmtNumeroBR(v) {
  if (v == null || isNaN(v)) return null;
  const temDecimal = Math.abs(v % 1) > 1e-9;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: temDecimal ? 2 : 0, maximumFractionDigits: 2 });
}

// Igual a formatarPorcentagem() da Apresentação Mensal: arredonda para
// inteiro e acrescenta "%" (ex.: 99.41 -> "99%"). Valores já com "%" ou
// não numéricos voltam como estão.
function _fmtPercentInt(v) {
  if (v == null || v === '' || v === '-') return null;
  const s = String(v);
  if (s.indexOf('%') >= 0) return s;
  const n = _histNumLenient(s);
  if (isNaN(n)) return s;
  const pct = (n <= 1 && n !== 0) ? n * 100 : n;
  return Math.round(pct) + '%';
}

function _fmtMoedaSlideSemCentavos(v) {
  if (v == null || isNaN(v)) return null;
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}


// ==========================================
// CUSTO M² (aba METRO QUADRADO da planilha "Mega <cidade>")
// Estrutura fixa: header (linha 1) com blocos de 3 colunas por mês
// ("Orç Mmm/AA", "Real Mmm/AA", "Variação R$"); a linha "R$/m²" fica logo
// abaixo da linha "TOTAL ÁREA ... COM IPTU E SEGURO".
// ==========================================
const _CUSTO_M2_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function _custoM2ParseNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  let s = String(valor).trim().replace(/\s/g, '').replace('R$', '').replace(/[()]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.abs(n);
}

function _custoM2ExtrairMeses(headerRow) {
  const meses = [];
  for (let c = 1; c < headerRow.length; c += 3) {
    const txt = String(headerRow[c] || '').replace(/ /g, ' ').trim();
    const m = txt.match(/Or[cç]\s+([A-Za-zçÇ]{3})\/(\d{2,4})/i);
    if (!m) continue;
    const mesKey = _histNorm(m[1]).substring(0, 3);
    const idx = _CUSTO_M2_MESES.indexOf(mesKey);
    if (idx < 0) continue;
    meses.push({ index: idx, colOrc: c, colReal: c + 1 });
  }
  return meses;
}

let _custoM2Cache = {};
function _obterSerieCustoM2(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _custoM2Cache) return _custoM2Cache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('METRO QUADRADO');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const meses = _custoM2ExtrairMeses(data[0] || []);

      const normLbl = s => String(s || '').replace(/ /g, ' ').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      let idxComIptu = -1;
      for (let r = 0; r < data.length; r++) {
        const lbl = normLbl(data[r][0]);
        if (lbl.indexOf('TOTAL ÁREA') >= 0 && lbl.indexOf('IPTU E SEGURO') >= 0) { idxComIptu = r + 1; break; }
      }

      if (idxComIptu >= 0 && meses.length) {
        const linha = data[idxComIptu];
        const orc = [], real = [];
        meses.forEach(m => {
          orc[m.index] = _custoM2ParseNumero(linha[m.colOrc]);
          real[m.index] = _custoM2ParseNumero(linha[m.colReal]);
        });
        out = { orcSerie: orc, realSerie: real };
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Custo M² (${unit.name}): ${e.message}`);
  }
  _custoM2Cache[chave] = out;
  return out;
}

// Mês/Real/Orç do mês de referência (mês corrente, com fallback ao último
// mês com dado completo) + tendência vs mês anterior, direto da série.
function obterDadosCustoM2(unit) {
  const serie = _obterSerieCustoM2(unit);
  if (!serie) return null;
  const { orcSerie: orc, realSerie: real } = serie;

  const temDados = i => orc[i] != null && real[i] != null;
  const mesAtual = obterMesReferencia(unit).index;
  let ref = temDados(mesAtual) ? mesAtual : -1;
  if (ref < 0) { for (let i = real.length - 1; i >= 0; i--) { if (temDados(i)) { ref = i; break; } } }
  if (ref < 0) return null;

  let delta = null;
  if (ref > 0 && real[ref] != null && real[ref - 1] != null) {
    delta = Math.round((real[ref] - real[ref - 1]) * 100) / 100;
  }
  return { orcado: orc[ref], realizado: real[ref], refIndex: ref, delta };
}

// Custo/m² ACUMULADO = média dos R$/m² mensais até o mês de referência.
function obterCustoM2Acumulado(unit) {
  const cm = obterDadosCustoM2(unit);
  const serie = _obterSerieCustoM2(unit);
  if (!cm || !serie) return null;

  const media = (arr, fim) => {
    let s = 0, n = 0;
    for (let i = 0; i <= fim && i < arr.length; i++) {
      if (arr[i] != null && arr[i] > 0) { s += arr[i]; n++; }
    }
    return n ? s / n : null;
  };

  const orcado = media(serie.orcSerie, cm.refIndex);
  const realizado = media(serie.realSerie, cm.refIndex);
  if (realizado == null) return null;
  const realizadoAnt = cm.refIndex > 0 ? media(serie.realSerie, cm.refIndex - 1) : null;
  const delta = realizadoAnt != null ? Math.round((realizado - realizadoAnt) * 100) / 100 : null;
  return { orcado, realizado, delta };
}

function _fmtMoedaSlide(v) {
  if (v == null || isNaN(v)) return null;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// ==========================================
// DISPATCHER — resolve o valor automático de UMA linha da tabela de Metas
// pela Descrição. Retorna { valor, metaValor?, trend } ou null (sem match ou
// sem dado — a célula digitada na aba METAS permanece como está).
// ==========================================
function obterMetaAuto(unit, descricao, metaAtual, qual) {
  const d = _histNorm(descricao);
  const ehMensal = qual === 'mes';

  try {
    // CHECK-LIST/SLA (Preventivas) — exceto SLA de Terceiros (Analista).
    // Arredondado com "%" (ex.: "99%"), igual à Apresentação Mensal
    // (formatarPorcentagem); a tendência usa indicadores distintos para
    // mês/acumulado ("SLA MENSAL"/"SLA ACUMULADO", aba PREVENTIVAS do
    // HISTORICO GERENCIAL).
    if ((d.indexOf('check') >= 0 || d.indexOf('sla') >= 0) && d.indexOf('terceiro') < 0 && d.indexOf('acesso') < 0) {
      const prev = obterDadosPreventivasAuto(unit);
      if (!prev) return null;
      const val = ehMensal ? prev.mes : prev.acum;
      if (!val || val === '-') return null;
      // O VALOR exibido fica cru (ex. "99,41", sem arredondar/sem "%") —
      // pedido explícito, diferente da Apresentação Mensal. A TENDÊNCIA
      // continua comparando a versão arredondada ("99%") contra o mês
      // anterior, que é o cálculo que bate com a Apresentação Mensal
      // (ex.: +0,75) — arredondar só pra exibição não deveria mudar isso.
      const valFmt = _fmtPercentInt(val);
      const delta = deltaVsMesAnterior(unit, valFmt, ehMensal ? 'SLA MENSAL' : 'SLA ACUMULADO');
      return { valor: String(val), trend: tendenciaTexto(delta, false) };
    }

    // CHECK-LIST/SLA - TERCEIROS (Analista)
    if (d.indexOf('terceiro') >= 0) {
      const serie = _serieMetaAnalista(unit, desc => desc.indexOf('terceiro') >= 0);
      if (!serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      const atual = serie.find(s => s.ord === refOrd) || serie[serie.length - 1];
      const val = ehMensal ? atual.mes : atual.acum;
      if (val == null || isNaN(val)) return null;

      const anteriores = serie.filter(s => s.ord < atual.ord);
      let delta = null;
      if (anteriores.length) {
        const prev = anteriores[anteriores.length - 1];
        const pval = ehMensal ? prev.mes : prev.acum;
        if (pval != null && !isNaN(pval)) delta = Math.round((val - pval) * 100) / 100;
      }
      return { valor: _fmtNumeroBR(val), trend: tendenciaTexto(delta, false) };
    }

    // TAXA DE REABERTURA (Analista)
    if (d.indexOf('reabertura') >= 0) {
      const serie = obterDadosTaxaReabertura(unit);
      if (!serie || !serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      let idx = serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) idx = serie.length - 1;

      const pctAte = fim => {
        let f = 0, r = 0;
        for (let j = 0; j <= fim; j++) {
          if (!isNaN(serie[j].fechados)) f += serie[j].fechados;
          if (!isNaN(serie[j].reabertos)) r += serie[j].reabertos;
        }
        return f > 0 ? (r / f) * 100 : (f === 0 ? null : 0);
      };

      let valorNum, prevNum = null;
      if (ehMensal) {
        const f = serie[idx].fechados, r = serie[idx].reabertos;
        valorNum = (!isNaN(f) && f > 0) ? (r / f) * 100 : (f === 0 ? 0 : null);
        if (idx > 0) {
          const fp = serie[idx - 1].fechados, rp = serie[idx - 1].reabertos;
          prevNum = (!isNaN(fp) && fp > 0) ? (rp / fp) * 100 : (fp === 0 ? 0 : null);
        }
      } else {
        valorNum = pctAte(idx);
        if (idx > 0) prevNum = pctAte(idx - 1);
      }
      if (valorNum == null) return null;

      let delta = null;
      if (prevNum != null) delta = Math.round((valorNum - prevNum) * 100) / 100;
      return { valor: _fmtNumeroBR(Math.round(valorNum * 100) / 100), trend: tendenciaTexto(delta, true) };
    }

    // CUMPRIR ORÇAMENTO (Analista)
    if (d.indexOf('orcamento') >= 0) {
      const serie = obterDadosOrcamentoAnalista(unit);
      if (!serie || !serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      let idx = serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) idx = serie.length - 1;

      const somaAte = (campo, fim) => serie.slice(0, fim + 1).reduce((s, m) => s + m[campo], 0);

      let orcVal, realVal, orcPrev = null, realPrev = null;
      if (ehMensal) {
        orcVal = serie[idx].orc; realVal = serie[idx].real;
        if (idx > 0) { orcPrev = serie[idx - 1].orc; realPrev = serie[idx - 1].real; }
      } else {
        orcVal = somaAte('orc', idx); realVal = somaAte('real', idx);
        if (idx > 0) { orcPrev = somaAte('orc', idx - 1); realPrev = somaAte('real', idx - 1); }
      }

      let delta = null;
      if (realPrev != null) delta = Math.round((realVal - realPrev) * 100) / 100;

      return {
        valor: _fmtMoedaSlideSemCentavos(realVal),
        metaValor: _fmtMoedaSlideSemCentavos(orcVal),
        trend: tendenciaTexto(delta, true)
      };
    }

    // ÍNDICE DE DISPONIBILIDADE — indicadores distintos para mês/acumulado
    // ("Índice de disponibilidade"/"Índice de disponibilidade - ACUMULADO",
    // aba CHAMADOS do HISTORICO GERENCIAL). Valor fica cru (sem arredondar/
    // sem "%"), igual à Apresentação Mensal.
    if (d.indexOf('disponibilidade') >= 0) {
      const disp = obterIndiceDisponibilidade(unit);
      if (!disp) return null;
      const val = ehMensal ? disp.mes : disp.acum;
      if (!val || val === '-') return null;
      const delta = deltaVsMesAnterior(unit, val, ehMensal ? 'Índice de disponibilidade' : 'Índice de disponibilidade - ACUMULADO');
      return { valor: String(val), trend: tendenciaTexto(delta, false) };
    }

    // CUSTO M² (menor = melhor)
    if (d.indexOf('custo') >= 0 && (d.indexOf('m²') >= 0 || d.indexOf('m2') >= 0)) {
      const cmRef = obterDadosCustoM2(unit); // também dá o mês de referência p/ o PPC
      let valorNum, metaNum, delta;
      if (ehMensal) {
        if (!cmRef) return null;
        valorNum = cmRef.realizado; metaNum = cmRef.orcado; delta = cmRef.delta;
      } else {
        const ac = obterCustoM2Acumulado(unit);
        if (!ac) return null;
        valorNum = ac.realizado; metaNum = ac.orcado; delta = ac.delta;
      }
      if (valorNum == null) return null;

      let valor = _fmtMoedaSlide(valorNum);
      let metaValor = metaNum != null ? _fmtMoedaSlide(metaNum) : null;
      // Meta composta (ex.: "R$ 4,21 / 80%") → a parte "% das manutenções
      // planejadas" vem da planilha de PPC (obterDadosPPC, unit.ppcId).
      // Unidade sem ppcId → mantém o valor digitado na aba METAS (0% / alvo
      // manual), como antes.
      const barra = String(metaAtual || '').indexOf('/');
      let delta2 = null;
      if (barra >= 0) {
        const ppc = obterDadosPPC(unit);
        const i = cmRef ? cmRef.refIndex : -1;
        const p = (ppc && i >= 0) ? ppc[i] : null;
        if (p && !isNaN(p.aderencia) && !isNaN(p.acumulado)) {
          const pctAtual = ehMensal ? p.aderencia : p.acumulado;
          valor += ' / ' + _fmtNumeroBR(Math.round(pctAtual * 100) / 100) + '%';
          if (metaValor != null && !isNaN(p.meta)) {
            metaValor += ' / ' + _fmtNumeroBR(Math.round(p.meta * 100) / 100) + '%';
          }
          const pAnt = i > 0 ? ppc[i - 1] : null;
          const pctAnt = pAnt ? (ehMensal ? pAnt.aderencia : pAnt.acumulado) : null;
          if (pctAnt != null && !isNaN(pctAnt)) delta2 = Math.round((pctAtual - pctAnt) * 100) / 100;
        } else {
          valor += ' / 0%';
          if (metaValor != null) metaValor += ' / ' + String(metaAtual).slice(barra + 1).trim();
        }
      }

      // Tendência composta: R$ (menor = melhor) + % planejado (maior = melhor),
      // dois selos unidos por "/" — mesmo formato da Apresentação Mensal.
      const t1 = tendenciaTexto(delta, true);
      const t2 = tendenciaTexto(delta2, false);
      let trend = t1;
      if (t2) {
        trend = t1
          ? { txt: [t1.txt, t2.txt].filter(Boolean).join(' / '), cor: t1.cor || t2.cor }
          : t2;
      }
      return { valor: valor, metaValor: metaValor, trend: trend };
    }
  } catch (e) {
    Logger.log(`⚠️ obterMetaAuto("${descricao}", ${unit.name}, ${qual}): ${e.message}`);
  }

  return null;
}
