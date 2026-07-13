/**
 * ARQUIVO: Suporte_MetasSeed.gs
 * SEÇÃO:   SUPORTE — Carga inicial da aba METAS
 * DESCRIÇÃO: Popula a aba METAS com a ESTRUTURA (papel, indicador, pontos,
 * unidade, sentido) e as METAS (targets) portadas do sistema irmão "Gestão
 * à Vista TV" — mesmas pessoas, mesmos indicadores.
 *
 * Os valores REAIS (desempenho do mês) ficam:
 *   - "AUTO" para Custo M², Check-list/SLA e Disponibilidade — o slide
 *     resolve sozinho a partir dos dados que já calculamos.
 *   - EM BRANCO para o resto (Projeto Sim/Não, Orçamento, Documentos,
 *     Taxa de Reabertura...) — preenchidos à mão todo mês.
 *
 * Rode 1x por cidade (idempotente: se o papel já existir, pula). Revise as
 * metas com o time — são um ponto de partida, não a fonte definitiva.
 */

function _metasNomeContato_(palavraCargo) {
  const c = (getProjetoAtivo().contatos || []).find(x => (x.cargo || '').toLowerCase().includes(palavraCargo));
  return c ? c.nome : null;
}

function _metasJaTemPapel_(aba, papel) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return false;
  const existentes = aba.getRange(2, 1, ultima - 1, 1).getDisplayValues();
  return existentes.some(l => _metasNormPapel_(l[0]) === _metasNormPapel_(papel));
}

function _metasInserir_(aba, linhas) {
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, METAS_COLS_FULL.length).setValues(linhas);
}


// ==========================================
// CURITIBA
// ==========================================
function seedMetasCuritiba() {
  setProjetoAtivo('CURITIBA');
  const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  let aba = ss.getSheetByName(ABA_METAS);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(ABA_METAS); }

  const nomeSup = _metasNomeContato_('supervisor') || 'Supervisor';
  const nomeAna = _metasNomeContato_('analista')   || 'Analista';
  let novas = [];

  if (!_metasJaTemPapel_(aba, 'SUPERVISOR')) {
    const t = 'METAS ' + nomeSup.toUpperCase() + ' — FACILITIES 2026';
    novas = novas.concat([
      ['SUPERVISOR', t, 'Custo M² Megas',                                              25, 'Performance',   'R$',      '<=', 'R$ 4,21', 'AUTO', '', 'R$ 4,05', 'AUTO', ''],
      ['SUPERVISOR', t, 'Implementar Projeto de Adequação e Modernização da Segurança', 20, 'Projetos',      'SIM/NÃO', '=',  'SIM',     '',     '', 'SIM',     '',     ''],
      ['SUPERVISOR', t, 'Controles Diários da Aplicação do "Housekeeping"',             20, 'Procedimentos', 'SIM/NÃO', '=',  'SIM',     '',     '', 'SIM',     '',     ''],
      ['SUPERVISOR', t, 'Check-list / SLA',                                             20, 'Performance',   '%',       '>=', '90',      'AUTO', '', '90',      'AUTO', ''],
      ['SUPERVISOR', t, 'Índice de Disponibilidade Ativos Críticos',                    15, 'Performance',   '%',       '>=', '90',      'AUTO', '', '90',      'AUTO', '']
    ]);
  }
  if (!_metasJaTemPapel_(aba, 'ANALISTA')) {
    const t = 'METAS ' + nomeAna.toUpperCase() + ' — FACILITIES 2026';
    novas = novas.concat([
      ['ANALISTA', t, 'Cumprir Orçamento',                     30, 'Planejamento',  'R$',      '<=', 'R$ 46.931', '', '', 'R$ 302.613', '', ''],
      ['ANALISTA', t, 'Plano de Ação Paisagismo',               25, 'Procedimentos', 'SIM/NÃO', '=',  'SIM',       '', '', 'SIM',        '', ''],
      ['ANALISTA', t, 'Check-list / SLA — Terceiros',           20, 'Performance',   '%',       '>=', '95',        '', '', '95',         '', ''],
      ['ANALISTA', t, 'Documentos de Clientes e Condomínio',    15, 'Padronização',  'SIM/NÃO', '=',  'SIM',       '', '', 'SIM',        '', ''],
      ['ANALISTA', t, 'Taxa de Reabertura',                     10, 'Performance',   '%',       '<=', '2',         '', '', '2',          '', '']
    ]);
  }

  if (!novas.length) { Logger.log('Curitiba: Supervisor e Analista já existem na aba METAS.'); return; }
  _metasInserir_(aba, novas);
  Logger.log('✅ Curitiba: ' + novas.length + ' linha(s) adicionadas na aba METAS.');
}


// ==========================================
// ITAJAÍ
// ==========================================
function seedMetasItajai() {
  setProjetoAtivo('ITAJAI');
  const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  let aba = ss.getSheetByName(ABA_METAS);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(ABA_METAS); }

  const nomeSup = _metasNomeContato_('supervisor') || 'Supervisor';
  const nomeAna = _metasNomeContato_('analista')   || 'Analista';
  let novas = [];

  if (!_metasJaTemPapel_(aba, 'SUPERVISOR')) {
    const t = 'METAS ' + nomeSup.toUpperCase() + ' — FACILITIES 2026';
    novas = novas.concat([
      ['SUPERVISOR', t, 'Custo M² Megas',                                              25, 'Performance',   'R$',      '<=', 'R$ 4,41', 'AUTO', '', 'R$ 4,70', 'AUTO', ''],
      ['SUPERVISOR', t, 'Implementar Projeto de Adequação e Modernização da Segurança', 20, 'Projetos',      'SIM/NÃO', '=',  'NÃO',     '',     '', 'NÃO',     '',     ''],
      ['SUPERVISOR', t, 'Controles Diários da Aplicação do "Housekeeping"',             20, 'Procedimentos', 'SIM/NÃO', '=',  'NÃO',     '',     '', 'NÃO',     '',     ''],
      ['SUPERVISOR', t, 'Check-list / SLA',                                             20, 'Performance',   '%',       '>=', '90',      'AUTO', '', '90',      'AUTO', ''],
      ['SUPERVISOR', t, 'Disponibilidade de Ativos Críticos',                           15, 'Performance',   '%',       '>=', '90',      'AUTO', '', '80',      'AUTO', '']
    ]);
  }
  if (!_metasJaTemPapel_(aba, 'ANALISTA')) {
    const t = 'METAS ' + nomeAna.toUpperCase() + ' — FACILITIES 2026';
    novas = novas.concat([
      ['ANALISTA', t, 'Cumprir Orçamento',                    30, 'Planejamento',  'R$',      '<=', 'R$ 36.724', '', '', 'R$ 297.010', '', ''],
      ['ANALISTA', t, 'Implementar Contrato de Preço Único',   25, 'Procedimentos', 'SIM/NÃO', '=',  'SIM',       '', '', 'SIM',        '', ''],
      ['ANALISTA', t, 'Check-list / SLA — Terceiros',          20, 'Performance',   '%',       '>=', '95',        '', '', '95',         '', ''],
      ['ANALISTA', t, 'Documentos de Clientes e Condomínio',   15, 'Padronização',  'SIM/NÃO', '=',  'SIM',       '', '', 'SIM',        '', ''],
      ['ANALISTA', t, 'Taxa de Reabertura',                    10, 'Performance',   '%',       '<=', '2',         '', '', '2',          '', '']
    ]);
  }

  if (!novas.length) { Logger.log('Itajaí: Supervisor e Analista já existem na aba METAS.'); return; }
  _metasInserir_(aba, novas);
  Logger.log('✅ Itajaí: ' + novas.length + ' linha(s) adicionadas na aba METAS.');
}


// ==========================================
// ESTEIO (só Supervisor)
// ==========================================
function seedMetasEsteio() {
  setProjetoAtivo('ESTEIO');
  const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  let aba = ss.getSheetByName(ABA_METAS);
  if (!aba) { CRIAR_ABA_METAS(); aba = ss.getSheetByName(ABA_METAS); }

  if (_metasJaTemPapel_(aba, 'SUPERVISOR')) {
    Logger.log('Esteio: Supervisor já existe na aba METAS.');
    return;
  }

  const nomeSup = _metasNomeContato_('responsável') || _metasNomeContato_('supervisor') || 'Supervisor';
  const t = 'METAS ' + nomeSup.toUpperCase() + ' — FACILITIES 2026';
  const linhas = [
    ['SUPERVISOR', t, 'Custo M² Megas',                     25, 'Performance', 'R$',      '<=', 'R$ 6,87', 'AUTO', '', 'R$ 8,16', 'AUTO', ''],
    ['SUPERVISOR', t, 'Implementar Contrato de Preço Único', 25, 'Performance', 'SIM/NÃO', '=',  'SIM',     '',     '', 'SIM',     '',     ''],
    ['SUPERVISOR', t, 'Check-list / SLA',                    20, 'Performance', '%',       '>=', '90',      'AUTO', '', '90',      'AUTO', ''],
    ['SUPERVISOR', t, 'Disponibilidade de Ativos Críticos',  15, 'Performance', '%',       '>=', '90',      'AUTO', '', '90',      'AUTO', ''],
    ['SUPERVISOR', t, 'Taxa de Reabertura',                  10, 'Performance', '%',       '<=', '2',       '',     '', '2',       '',     '']
  ];
  _metasInserir_(aba, linhas);
  Logger.log('✅ Esteio: ' + linhas.length + ' linha(s) adicionadas na aba METAS.');
}
