/**
 * ARQUIVO: 06_ImportarControladoria.gs
 * IMPORTA o export da controladoria para a PLANILHA PROPRIEDADES.
 *
 * O export ("Propriedades-*.csv", baixado do sistema da controladoria) traz,
 * por conta e centro de custo, Planejado (= ritmo) e Realizado de cada mês,
 * das empresas 11 (Capital Realty) e 61 (Demercado). Antes isso era colado à
 * mão em duas abas — e em 10/11/2026 as duas estavam com set/out zerados e um
 * ritmo velho, o que tirava o realizado e entortava a projeção do DRE.
 *
 * O que grava (só valores; as abas não têm fórmula):
 *   · RITMO 2026 - PROPRIEDADES  — a DRE do centro GERÊNCIA DE PROPRIEDADES
 *     (x|1.01.01.016): folhas 06.01 / 06.02 / 06.03 / 06.04.NN / 08 e os
 *     subtotais 06, 06.04, 07, 09, 11, 13, mais as colunas de Total.
 *   · RITMO 2026 - MANUTENÇÕES   — só o bloco 06.04.15 (do "06.04.15 -" até
 *     antes do "06.04.16 -"): cada centro listado na aba, os subtotais 010/070
 *     e as linhas 06.04.15 / 06.04.15.01 (= soma dos centros da aba). Centro
 *     com manutenção que a aba não lista NÃO entra — vai para o Logger.
 *   · CONFIG!B1 = o mês, se for passado.
 *
 * Receita, deduções e financeiro do CSV não são usados: o slide é só gasto.
 * Ferramentas equivalentes em Node (para conferir fora do editor):
 * ferramentas/bloco_ritmo.js e ferramentas/bloco_manut.js.
 */

const CONTROLADORIA_PREFIXO = 'Propriedades-';   // nome do CSV na pasta da PLANILHA PROPRIEDADES

/** Menu: importa o CSV mais recente da pasta, sem mexer no CONFIG!B1. */
function importarExportControladoria() {
  return _importarControladoria_(null);
}

function importarControladoriaOutubro2026() {   // usado uma vez, em 10/11/2026
  return _importarControladoria_('OUTUBRO');
}

function _importarControladoria_(mes) {
  const ss = _abrirPlanilha_(DRE_MANUTENCAO_ID, 'DRE_MANUTENCAO_ID');
  const arq = _controladoriaCsv_();
  if (!arq) {
    Logger.log('✗ Nenhum "' + CONTROLADORIA_PREFIXO + '*.csv" na pasta da PLANILHA PROPRIEDADES. ' +
               'Baixe o export da controladoria e salve lá.');
    return false;
  }
  Logger.log('▶ Importando "' + arq.getName() + '" (' + arq.getLastUpdated() + ')');
  const linhas = _controladoriaLer_(arq.getBlob().getDataAsString('ISO-8859-1'));
  Logger.log('  ' + linhas.length + ' linha(s) de conta × centro de custo.');

  _controladoriaPropriedades_(ss, linhas);
  _controladoriaManutencao_(ss, linhas);

  if (mes) {
    ss.getSheetByName('CONFIG').getRange(1, 2).setValue(mes);
    Logger.log('  CONFIG!B1 = ' + mes);
  }
  SpreadsheetApp.flush();
  Logger.log('✓ Importação concluída.');
  return true;
}

// O CSV mais recente com o prefixo, na(s) pasta(s) da PLANILHA PROPRIEDADES.
function _controladoriaCsv_() {
  let melhor = null;
  const pastas = DriveApp.getFileById(DRE_MANUTENCAO_ID).getParents();
  while (pastas.hasNext()) {
    const it = pastas.next().getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().indexOf(CONTROLADORIA_PREFIXO) !== 0 || !/\.csv$/i.test(f.getName())) continue;
      if (!melhor || f.getLastUpdated() > melhor.getLastUpdated()) melhor = f;
    }
  }
  return melhor;
}

// → [{ conta: '06.04.15.01', cc: '14.01.01.003', v: [24 números] }]
// cc: "1|4.01.01.003" vira "14.01.01.003", o código da planilha.
function _controladoriaLer_(texto) {
  const num = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
  const limpa = s => String(s).replace(/[="]/g, '').trim();
  return texto.split(/\r?\n/).slice(1).filter(l => l.trim()).map(l => {
    const c = l.split(';');
    const v = [];
    for (let i = 0; i < 24; i++) v.push(num(c[8 + i]));
    return { conta: limpa(c[0]), cc: limpa(c[4]).replace('|', ''), v: v };
  });
}

const _ctrlZ_ = () => { const a = []; for (let i = 0; i < 24; i++) a.push(0); return a; };
const _ctrlSoma_ = (x, y) => x.map((v, i) => v + y[i]);
const _ctrlR2_ = x => Math.round(x * 100) / 100;
// 24 colunas mensais + Total da 1ª e da 2ª coluna (Planejado, Realizado).
function _ctrlLinha_(v) {
  let a = 0, b = 0;
  for (let m = 0; m < 12; m++) { a += v[2 * m]; b += v[2 * m + 1]; }
  return v.map(_ctrlR2_).concat([_ctrlR2_(a), _ctrlR2_(b)]);
}
const _ctrlCodigo_ = rot => String(rot || '').trim().split(' - ')[0].trim();

function _controladoriaPropriedades_(ss, linhas) {
  const aba = ss.getSheetByName(DRE_PROP_ABA_RITMO);
  if (!aba) throw new Error('aba "' + DRE_PROP_ABA_RITMO + '" não existe');
  // Folha da DRE: 06.01/02/03 inteiros; 06.04.NN; o resto pelo 1º nível (08…).
  const chave = conta => {
    const p = conta.split('.');
    if (p[0] === '06' && /^0[123]$/.test(p[1])) return '06.' + p[1];
    if (p[0] === '06') return '06.04.' + p[2];
    return p[0];
  };
  const folha = {};
  linhas.filter(l => /1\.01\.01\.016$/.test(l.cc)).forEach(l => {
    const k = chave(l.conta);
    folha[k] = _ctrlSoma_(folha[k] || _ctrlZ_(), l.v);
  });

  const n = aba.getLastRow();
  const rot = aba.getRange(1, 1, n, 1).getDisplayValues().map(r => r[0]);
  const v = {};
  for (let i = 2; i < n; i++) { const k = _ctrlCodigo_(rot[i]); if (k) v[k] = folha[k] || _ctrlZ_(); }
  const somaDe = ks => ks.reduce((s, k) => _ctrlSoma_(s, v[k] || _ctrlZ_()), _ctrlZ_());
  v['06.04'] = somaDe(Object.keys(v).filter(k => /^06\.04\.\d+$/.test(k)));
  v['06'] = somaDe(['06.01', '06.02', '06.03', '06.04']);
  v['07'] = somaDe(['05', '06']);
  v['09'] = somaDe(['07', '08']);
  v['11'] = somaDe(['09', '10']);
  v['13'] = somaDe(['11', '12']);

  const saida = [];
  for (let i = 2; i < n; i++) saida.push(_ctrlLinha_(v[_ctrlCodigo_(rot[i])] || _ctrlZ_()));
  aba.getRange(3, 2, saida.length, 26).setValues(saida);
  const r = m => Math.round(v['06'][2 * m + 1]).toLocaleString('pt-BR');
  Logger.log('  ' + DRE_PROP_ABA_RITMO + ': ' + saida.length + ' linhas · realizado 06 SET ' + r(8) + ' · OUT ' + r(9));
}

function _controladoriaManutencao_(ss, linhas) {
  const aba = ss.getSheetByName(DRE_ABA_RITMO);
  if (!aba) throw new Error('aba "' + DRE_ABA_RITMO + '" não existe');
  const porCC = {};
  linhas.filter(l => l.conta.indexOf('06.04.15') === 0).forEach(l => {
    porCC[l.cc] = _ctrlSoma_(porCC[l.cc] || _ctrlZ_(), l.v);
  });

  const n = aba.getLastRow();
  const rot = aba.getRange(1, 1, n, 1).getDisplayValues().map(r => r[0]);
  const ini = rot.findIndex(t => _ctrlCodigo_(t) === '06.04.15');
  const fim = rot.findIndex(t => _ctrlCodigo_(t) === '06.04.16');
  if (ini < 0 || fim <= ini) throw new Error('bloco 06.04.15 não encontrado na aba "' + DRE_ABA_RITMO + '"');

  const usados = {}, grupos = {};
  const linhasBloco = [];
  let grupo = null;
  for (let i = ini; i < fim; i++) {
    const k = _ctrlCodigo_(rot[i]);
    let val = null;
    if (/^\d{2}\.\d{2}\.\d{2}\.\d{3}$/.test(k)) {
      val = porCC[k] || _ctrlZ_(); usados[k] = true;
      if (grupo) grupos[grupo] = _ctrlSoma_(grupos[grupo], val);
    } else if (/^0[17]0$/.test(k)) {
      grupo = k; grupos[k] = _ctrlZ_();
    }
    linhasBloco.push({ k: k, val: val });
  }
  const total = Object.keys(grupos).reduce((s, g) => _ctrlSoma_(s, grupos[g]), _ctrlZ_());
  const saida = linhasBloco.map(l => _ctrlLinha_(l.val || grupos[l.k] || total));
  aba.getRange(ini + 1, 2, saida.length, 26).setValues(saida);

  const r = m => Math.round(total[2 * m + 1]).toLocaleString('pt-BR');
  Logger.log('  ' + DRE_ABA_RITMO + ': linhas ' + (ini + 1) + '–' + fim + ' · realizado 06.04.15 SET ' + r(8) + ' · OUT ' + r(9));
  const fora = Object.keys(porCC).filter(k => !usados[k] && porCC[k].some(x => Math.abs(x) > 0.005));
  if (fora.length) {
    Logger.log('  Centros com manutenção fora da aba (não entram no DRE): ' + fora.map(k => {
      let real = 0; for (let m = 0; m < 12; m++) real += porCC[k][2 * m + 1];
      return k + ' (' + Math.round(real).toLocaleString('pt-BR') + ' no ano)';
    }).join(', '));
  }
}
