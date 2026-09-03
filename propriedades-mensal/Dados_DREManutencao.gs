/**
 * ARQUIVO: Dados_DREManutencao.gs
 * DADOS — DRE e BRIDGE de MANUTENÇÃO (planilha PLANILHA PROPRIEDADES)
 *
 * Lê a subárvore 06.04.15.01 (manutenção imóveis) de DUAS abas e devolve, por
 * centro de custo, os três recortes que os slides desenham: MÊS, ACUMULADO e
 * ANO.
 *
 * A REGRA QUE NÃO É ÓBVIA — o que é "ritmo" e quando ele vale:
 *
 * A aba RITMO 2026 tem duas colunas por mês. A primeira está rotulada
 * "Planejado" na planilha, mas é o RITMO (projeção). A segunda é o Realizado.
 * O rótulo engana; em todo lugar dos slides ela aparece como "Ritmo".
 *
 * E o ritmo só vale para o que AINDA NÃO ACONTECEU. Nos meses já ocorridos o
 * que conta é o realizado — as duas colunas são independentes e divergem (em
 * Jan: ritmo −5.235, real −4.634). Então a projeção do ano é um SPLICE:
 *
 *     projeção(ano) = Σ realizado(meses ocorridos) + Σ ritmo(meses futuros)
 *
 * Somar a coluna de ritmo inteira dá outro número: −1.083.499 contra os
 * −1.030.231 do splice, 53 mil de diferença. A coluna "Total" da aba é essa
 * soma inteira — por isso ela NÃO é lida aqui. Todo total é recalculado.
 *
 * As duas abas não têm os mesmos centros de custo (ver DRE_EMPRESAS em
 * 01_Config.gs): quem falta numa delas devolve null, nunca zero — não medir é
 * diferente de medir zero (lição 3 do CLAUDE.md).
 */

// Onde o mês vira "já aconteceu". Único lugar que decide isso — se a regra
// mudar, muda aqui e os três recortes acompanham juntos (mesmo motivo de
// _bdChamadoFechado_ existir: definição duplicada é definição que diverge).
function _dreMesOcorrido_(mesIndex, refIndex) {
  return mesIndex <= refIndex;
}

// Uma aba inteira → { codigo: [v0, v1, ...] } com as 24 colunas mensais.
// Ignora as duas colunas de Total da planilha de propósito: todo total daqui
// é recalculado, porque o Total da aba de ritmo soma os 12 meses da coluna e
// não é a projeção (ver o cabeçalho).
function _dreLerAba_(nomeAba) {
  const ss    = SpreadsheetApp.openById(DRE_MANUTENCAO_ID);
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    Logger.log('DRE Manutenção: aba "' + nomeAba + '" não existe. Abas: ' +
               ss.getSheets().map(s => s.getName()).join(' | '));
    return null;
  }

  const valores = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const mapa = {};
  let achou = 0;

  valores.forEach(linha => {
    const rot = String(linha[0] || '').trim();
    if (!rot) return;
    const cod = rot.split(' - ')[0].trim();
    if (!cod) return;
    mapa[cod] = linha.slice(1).map(_dreNum_);
    achou++;
  });

  if (!achou) {
    Logger.log('DRE Manutenção: aba "' + nomeAba + '" não devolveu nenhuma linha com código.');
    return null;
  }
  return mapa;
}

// Número no formato da controladoria: "1.234,56" e negativo entre parênteses.
// Devolve null (não zero) para célula vazia — a diferença importa: um centro
// de custo ausente de uma aba tem que aparecer como "—", não como zero.
function _dreNum_(v) {
  const t = String(v == null ? '' : v).trim();
  if (!t || t === '-' || t === '—') return null;
  const neg = /^\(.*\)$/.test(t);
  const n = parseFloat(t.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// Soma tratando null como "não tem": se NENHUMA parcela existir devolve null,
// e não zero. Sem isso um centro de custo ausente zeraria o subtotal do grupo.
function _dreSoma_(valores) {
  let s = null;
  valores.forEach(v => { if (v != null) s = (s == null ? 0 : s) + v; });
  return s;
}

/**
 * O dado dos slides. Devolve:
 *
 *   { ref, refIndex, meses, empresas: [ { nome, centros: [ {codigo, nome,
 *     mes:{plan,real}, acum:{plan,real}, ano:{plan,proj}} ], total } ],
 *     total, avisos }
 *
 * Todos os valores em MÓDULO (positivos): a planilha traz despesa negativa, e
 * o slide fala em "gasto", onde maior é pior. O sinal fica na variação.
 */
function obterDREManutencao_() {
  const planMapa  = _dreLerAba_(DRE_ABA_PLANEJAMENTO);
  const ritmoMapa = _dreLerAba_(DRE_ABA_RITMO);
  if (!planMapa && !ritmoMapa) return null;

  const ref      = obterMesReferencia_();
  const refIndex = ref.index;
  const avisos   = [];

  // O último mês com realizado deveria casar com o mês de referência. Quando
  // não casa, o slide sairia com um acumulado que não é o do mês anunciado —
  // registrar a divergência é o que faz isso aparecer antes da reunião.
  if (ritmoMapa && ritmoMapa[DRE_CONTA_RAIZ]) {
    const raiz = ritmoMapa[DRE_CONTA_RAIZ];
    let ultimo = -1;
    for (let m = 0; m < 12; m++) { const r = raiz[2 * m + 1]; if (r != null && r !== 0) ultimo = m; }
    if (ultimo >= 0 && ultimo !== refIndex) {
      const nomes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      avisos.push('Mês de referência é ' + nomes[refIndex] + ', mas o último mês com ' +
                  'realizado na aba de ritmo é ' + nomes[ultimo] + '.');
    }
  }

  const abs = v => (v == null ? null : Math.abs(v));

  const recorte = cod => {
    const p = planMapa ? planMapa[cod] : null;
    const r = ritmoMapa ? ritmoMapa[cod] : null;

    const planMes = p ? abs(p[2 * refIndex + 1]) : null;   // ímpar = Planejado
    const realMes = r ? abs(r[2 * refIndex + 1]) : null;   // ímpar = Realizado

    const planAcum = [], realAcum = [], projAno = [];
    for (let m = 0; m < 12; m++) {
      if (p && m <= refIndex) planAcum.push(abs(p[2 * m + 1]));
      if (r && m <= refIndex) realAcum.push(abs(r[2 * m + 1]));
      // O splice: realizado no que já aconteceu, ritmo no que falta.
      if (r) projAno.push(_dreMesOcorrido_(m, refIndex) ? abs(r[2 * m + 1]) : abs(r[2 * m]));
    }
    const planAno = [];
    if (p) for (let m = 0; m < 12; m++) planAno.push(abs(p[2 * m + 1]));

    return {
      mes:  { plan: planMes,               real: realMes },
      acum: { plan: _dreSoma_(planAcum),   real: _dreSoma_(realAcum) },
      ano:  { plan: _dreSoma_(planAno),    proj: _dreSoma_(projAno) }
    };
  };

  const somarLista = lista => ({
    mes:  { plan: _dreSoma_(lista.map(c => c.mes.plan)),  real: _dreSoma_(lista.map(c => c.mes.real)) },
    acum: { plan: _dreSoma_(lista.map(c => c.acum.plan)), real: _dreSoma_(lista.map(c => c.acum.real)) },
    ano:  { plan: _dreSoma_(lista.map(c => c.ano.plan)),  proj: _dreSoma_(lista.map(c => c.ano.proj)) }
  });

  const empresas = DRE_EMPRESAS.map(emp => {
    const centros = emp.centros.map(c => {
      const rec = recorte(c.codigo);
      return { codigo: c.codigo, nome: c.nome, so: c.so || null,
               mes: rec.mes, acum: rec.acum, ano: rec.ano };
    });
    return { codigo: emp.codigo, nome: emp.nome, centros: centros, total: somarLista(centros) };
  });

  const total = somarLista(empresas.map(e => e.total));

  // A soma das linhas tem que bater com a linha-raiz da planilha. É a mesma
  // ideia do check estoque × fluxo: número que aparece em dois lugares merece
  // conferência, e aqui ela é de graça.
  if (ritmoMapa && ritmoMapa[DRE_CONTA_RAIZ]) {
    const raizReal = _dreSoma_((function () {
      const a = []; for (let m = 0; m <= refIndex; m++) a.push(abs(ritmoMapa[DRE_CONTA_RAIZ][2 * m + 1])); return a;
    })());
    if (raizReal != null && total.acum.real != null && Math.abs(raizReal - total.acum.real) > 1) {
      avisos.push('Realizado acumulado: as linhas somam ' + total.acum.real.toFixed(0) +
                  ', a linha ' + DRE_CONTA_RAIZ + ' diz ' + raizReal.toFixed(0) +
                  ' — falta centro de custo em DRE_EMPRESAS.');
    }
  }

  avisos.forEach(a => Logger.log('DRE Manutenção: ⚠ ' + a));
  Logger.log('DRE Manutenção: ref ' + ref.nome + '/' + ref.ano +
             ' · plano ano ' + (total.ano.plan == null ? '—' : total.ano.plan.toFixed(0)) +
             ' · projeção ano ' + (total.ano.proj == null ? '—' : total.ano.proj.toFixed(0)) +
             ' · realizado acum ' + (total.acum.real == null ? '—' : total.acum.real.toFixed(0)));

  return { ref: ref, refIndex: refIndex, empresas: empresas, total: total, avisos: avisos };
}
