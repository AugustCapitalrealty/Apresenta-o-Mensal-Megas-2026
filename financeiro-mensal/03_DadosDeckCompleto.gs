/**
 * ARQUIVO: 03_DadosDeckCompleto.gs
 * LEITORES DO DECK COMPLETO — páginas 2–4 e 13–54 da referência.
 *
 * A planilha financeira é viva e os blocos mensais mudam de linha. Estes
 * leitores carregam cada aba uma única vez e localizam os blocos pelo texto
 * visível (título, entidade e cabeçalhos). Não há coordenada fixa nem número
 * inventado: se o bloco não existir, a função lança um erro que inclui os
 * termos procurados e o pipeline registra o slide como pendente.
 */

const DC_ENTIDADES = {
  DEMERCADO: {
    titulo: 'Demercado',
    aliases: ['Demercado']
  },
  CAPITAL_REALTY: {
    titulo: 'Capital Realty',
    aliases: ['Capital Realty', 'CR Infraestrutura Logística', 'CR Infra']
  },
  CONSOLIDADO_LOCACAO: {
    titulo: 'Locação Consolidado · Capital Realty + Demercado',
    aliases: ['Locação Consolidado', 'Capital Realty e Demercado', 'Resultado Unidades de Negócios - Locação']
  },
  DEMINVEST: {
    titulo: 'Deminvest',
    aliases: ['Deminvest']
  },
  CR_INFRA: {
    titulo: 'Capital Realty Infraestrutura Logística',
    aliases: ['Capital Realty Infraestrutura Logística', 'CR Infraestrutura Logística', 'CR Infra']
  },
  CR_ESTACIONAMENTOS: {
    titulo: 'Capital Realty Estacionamento',
    aliases: ['Capital Realty Estacionamento', 'Capital Realty Estacionamentos', 'CR Estacionamentos', 'Hangar Vip']
  }
};

const DC_TEMAS = {
  RECEITAS: { termos: ['Receitas'], excluir: ['Composição'], maxLinhas: 34, maxColunas: 9 },
  COMPOSICAO_RECEITA: { termos: ['Composição', 'Receita'], maxLinhas: 34, maxColunas: 10 },
  DESPESAS: { termos: ['Despesas'], maxLinhas: 44, maxColunas: 9 },
  VACANCIA: { termos: ['Vacância'], maxLinhas: 32, maxColunas: 14 },
  CONTRATOS: { termos: ['Cronograma', 'Contratos'], maxLinhas: 36, maxColunas: 14 },
  ENDIVIDAMENTO: { termos: ['Endividamento'], maxLinhas: 34, maxColunas: 14 },
  PRAZO_PAGAMENTO: { termos: ['Prazo', 'Pagamento'], maxLinhas: 30, maxColunas: 16 },
  PRAZO_RECEBIMENTO: { termos: ['Prazo', 'Recebimento'], maxLinhas: 30, maxColunas: 16 },
  LIQUIDEZ_CORRENTE: { termos: ['Liquidez', 'Corrente'], maxLinhas: 30, maxColunas: 16 },
  // A referência original contém a grafia "EBTIDA" em um dos títulos. O
  // leitor ancora em Margem e exclui o Quadro DRE, onde Margem EBITDA/ROL se
  // repete para todas as empresas.
  MARGEM_EBITDA: { termos: ['Margem'], excluir: ['DRE'], preferirAba: 'Indicadores', maxLinhas: 30, maxColunas: 16 },
  // Os anexos de fluxo não podem cair no bloco posterior "Ritmo: Fluxo de
  // Caixa", que tem as mesmas palavras e normalmente fica mais abaixo.
  FLUXO_CAIXA: { termos: ['Fluxo', 'Caixa'], excluir: ['Ritmo'], maxLinhas: 34, maxColunas: 18 },
  RITMO_ENTRADAS: { termos: ['Ritmo', 'Entradas'], maxLinhas: 28, maxColunas: 18 },
  RITMO_SAIDAS: { termos: ['Ritmo', 'Saídas'], maxLinhas: 28, maxColunas: 18 },
  RITMO_SALDO: { termos: ['Ritmo', 'Saldo Final'], maxLinhas: 28, maxColunas: 18 },
  RITMO_FLUXO: { termos: ['Ritmo', 'Fluxo de Caixa'], maxLinhas: 34, maxColunas: 18 }
};

var DC_CACHE_ABAS_ = null;

function _dcNorm_(valor) {
  return String(valor == null ? '' : valor).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function _dcAbas_() {
  if (DC_CACHE_ABAS_) return DC_CACHE_ABAS_;
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  DC_CACHE_ABAS_ = ss.getSheets().map(sheet => {
    const nr = sheet.getLastRow(), nc = sheet.getLastColumn();
    return { nome: sheet.getName(), norm: _dcNorm_(sheet.getName()), sheet: sheet,
      valores: nr && nc ? sheet.getRange(1, 1, nr, nc).getDisplayValues() : [] };
  });
  return DC_CACHE_ABAS_;
}

function _dcEntidade_(chave) {
  const e = DC_ENTIDADES[chave];
  if (!e) throw new Error('Entidade do deck desconhecida: ' + chave + '.');
  return e;
}

/**
 * Encontra a melhor linha-âncora. O título pode estar numa aba genérica e o
 * nome da entidade algumas linhas acima; por isso a pontuação usa uma janela
 * de cinco linhas, além do nome da aba. Em empate vence o bloco mais abaixo,
 * que normalmente é o mês mais recente.
 */
function _dcLocalizar_(spec) {
  const termos = (spec.termos || []).map(_dcNorm_);
  const excluir = (spec.excluir || []).map(_dcNorm_);
  const entidade = spec.entidade ? _dcEntidade_(spec.entidade) : null;
  const aliases = entidade ? entidade.aliases.map(_dcNorm_) : [];
  let melhor = null;

  _dcAbas_().forEach(aba => {
    const nomeAba = aba.norm;
    aba.valores.forEach((row, r) => {
      const linha = _dcNorm_(row.join(' | '));
      const inicio = Math.max(0, r - 2), fim = Math.min(aba.valores.length, r + 3);
      const janela = _dcNorm_(aba.valores.slice(inicio, fim).map(x => x.join(' | ')).join(' | '));
      if (excluir.some(t => linha.indexOf(t) >= 0 || nomeAba.indexOf(t) >= 0)) return;

      let score = 0, termosAchados = 0;
      termos.forEach(t => {
        if (linha.indexOf(t) >= 0) { score += 18; termosAchados++; }
        else if (nomeAba.indexOf(t) >= 0) { score += 8; termosAchados++; }
        else if (janela.indexOf(t) >= 0) { score += 4; termosAchados++; }
      });
      if (termos.length && termosAchados < Math.min(termos.length, spec.minTermos || termos.length)) return;

      if (aliases.length) {
        const aliasExato = row.some(v => aliases.indexOf(_dcNorm_(v)) >= 0);
        const naLinha = aliases.some(a => linha.indexOf(a) >= 0);
        const naJanela = aliases.some(a => janela.indexOf(a) >= 0);
        const naAba = aliases.some(a => nomeAba.indexOf(a) >= 0);
        if (!naLinha && !naJanela && !naAba) return;
        // "Capital Realty" também aparece no nome do consolidado. Um título
        // de célula exatamente igual à entidade é o desempate seguro para não
        // entregar o bloco consolidado no slide individual.
        score += aliasExato ? 34 : (naLinha ? 22 : (naJanela ? 12 : 8));
      }
      if (spec.preferirAba && nomeAba.indexOf(_dcNorm_(spec.preferirAba)) >= 0) score += 6;
      const candidato = { aba: aba, linha: r, score: score };
      if (!melhor || score > melhor.score || (score === melhor.score && r > melhor.linha)) melhor = candidato;
    });
  });

  if (!melhor) {
    throw new Error('Bloco não localizado. Termos: ' + termos.join(', ') +
      (entidade ? '; entidade: ' + entidade.titulo : '') + '.');
  }
  return melhor;
}

function _dcPrimeiraColuna_(row) {
  for (let c = 0; c < row.length; c++) if (String(row[c] || '').trim()) return c;
  return 0;
}

function _dcRecortar_(local, spec) {
  const m = local.aba.valores;
  const maxLinhas = spec.maxLinhas || 32, maxColunas = spec.maxColunas || 16;
  let primeiraColuna = _dcPrimeiraColuna_(m[local.linha] || []);
  const proximas = m.slice(local.linha, Math.min(m.length, local.linha + 6));
  proximas.forEach(row => { primeiraColuna = Math.min(primeiraColuna, _dcPrimeiraColuna_(row)); });
  // A linha do título costuma ter só duas células, enquanto a tabela logo
  // abaixo pode ir até dezembro. Medir a largura pela primeira linha cortava
  // silenciosamente todos os meses depois da primeira coluna.
  const larguraAba = m.length ? Math.max.apply(null, m.map(row => row.length)) : 0;
  const fimColuna = Math.min(larguraAba, primeiraColuna + maxColunas);
  const linhas = [];
  let vazias = 0;
  for (let r = local.linha; r < Math.min(m.length, local.linha + maxLinhas); r++) {
    const row = m[r].slice(primeiraColuna, fimColuna);
    const vazia = row.every(v => !String(v || '').trim());
    if (vazia) {
      vazias++;
      if (linhas.length >= 3 && vazias >= 2) break;
      continue;
    }
    vazias = 0;
    linhas.push(row);
  }
  if (!linhas.length) throw new Error('Bloco localizado na aba "' + local.aba.nome + '", mas sem dados visíveis.');

  let ultima = 0;
  linhas.forEach(row => row.forEach((v, c) => { if (String(v || '').trim()) ultima = Math.max(ultima, c); }));
  const matriz = linhas.map(row => row.slice(0, ultima + 1));
  return { aba: local.aba.nome, linha: local.linha + 1, matriz: matriz };
}

function obterBlocoDeck_(tema, entidade) {
  const base = DC_TEMAS[tema];
  if (!base) throw new Error('Tema do deck desconhecido: ' + tema + '.');
  const spec = { termos: base.termos, excluir: base.excluir || [], entidade: entidade,
    preferirAba: base.preferirAba, maxLinhas: base.maxLinhas, maxColunas: base.maxColunas };
  return _dcRecortar_(_dcLocalizar_(spec), spec);
}

function obterAgendaResultados_() {
  const spec = { termos: ['Agenda', 'Assunto', 'Responsável'], minTermos: 2, maxLinhas: 18, maxColunas: 7 };
  return _dcRecortar_(_dcLocalizar_(spec), spec);
}

function obterMetasResultados_(tipo) {
  const ehGerencia = _dcNorm_(tipo).indexOf('gerencia') >= 0;
  const spec = { termos: ehGerencia ? ['Meta', 'Gerência'] : ['Meta', 'Diretoria'],
    minTermos: 2, maxLinhas: ehGerencia ? 22 : 16, maxColunas: 12 };
  return _dcRecortar_(_dcLocalizar_(spec), spec);
}

function obterIndicadorDeck_(tema) {
  return obterBlocoDeck_(tema, tema === 'ENDIVIDAMENTO' ? 'DEMERCADO' : null);
}

function obterFluxoCaixaDeck_(entidade) {
  return obterBlocoDeck_('FLUXO_CAIXA', entidade);
}

function obterRitmoDeck_(entidade, tipo) {
  return obterBlocoDeck_(tipo, entidade);
}

function _dcNumero_(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  let s = String(valor == null ? '' : valor).trim();
  if (!s || s === '-' || /^n\/?a$/i.test(s)) return null;
  const negativo = /^\(.*\)$/.test(s) || /^-/.test(s);
  const percentual = s.indexOf('%') >= 0;
  s = s.replace(/[R$%\s()]/g, '').replace(/^-/, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  if (!isFinite(n)) return null;
  return (negativo ? -n : n) / (percentual ? 100 : 1);
}

function _dcEhMes_(valor) {
  const n = _dcNorm_(valor).substr(0, 3);
  return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'].indexOf(n) >= 0;
}

/** Extrai séries tanto de meses nas colunas quanto de meses nas linhas. */
function _dcSeries_(bloco) {
  const m = bloco.matriz;
  for (let r = 0; r < m.length; r++) {
    const meses = [];
    m[r].forEach((v, c) => { if (_dcEhMes_(v)) meses.push(c); });
    if (meses.length >= 3) {
      const series = [];
      for (let rr = r + 1; rr < Math.min(m.length, r + 9); rr++) {
        const valores = meses.map(c => _dcNumero_(m[rr][c]));
        if (valores.filter(v => v !== null).length < 2) continue;
        const nome = m[rr].slice(0, meses[0]).filter(Boolean).join(' ') || 'Série ' + (series.length + 1);
        series.push({ nome: String(nome), valores: valores.map(v => v === null ? 0 : v) });
      }
      if (series.length) return { categorias: meses.map(c => String(m[r][c])), series: series.slice(0, 4) };
    }
  }

  for (let c = 0; c < Math.max.apply(null, m.map(r => r.length)); c++) {
    const linhasMes = [];
    m.forEach((row, r) => { if (_dcEhMes_(row[c])) linhasMes.push(r); });
    if (linhasMes.length >= 3) {
      const candidatos = [];
      const largura = Math.max.apply(null, m.map(r => r.length));
      for (let cc = c + 1; cc < largura; cc++) {
        const valores = linhasMes.map(r => _dcNumero_(m[r][cc]));
        if (valores.filter(v => v !== null).length < 2) continue;
        candidatos.push({ nome: String((m[Math.max(0, linhasMes[0] - 1)] || [])[cc] || 'Série ' + (candidatos.length + 1)),
          valores: valores.map(v => v === null ? 0 : v) });
      }
      if (candidatos.length) return { categorias: linhasMes.map(r => String(m[r][c])), series: candidatos.slice(0, 4) };
    }
  }

  const categorias = [], serie = [];
  m.forEach(row => {
    const nome = row.find(v => String(v || '').trim() && _dcNumero_(v) === null);
    const numero = row.map(_dcNumero_).find(v => v !== null);
    if (nome && numero !== undefined && numero !== null) { categorias.push(String(nome)); serie.push(numero); }
  });
  return categorias.length >= 2 ? { categorias: categorias.slice(0, 12), series: [{ nome: 'Realizado', valores: serie.slice(0, 12) }] } : null;
}

function diagnosticarDeckCompleto() {
  DC_CACHE_ABAS_ = null;
  const testes = [
    ['Agenda', () => obterAgendaResultados_()],
    ['Meta Diretoria', () => obterMetasResultados_('Diretoria')],
    ['Meta Gerência', () => obterMetasResultados_('Gerência')]
  ];
  ['DEMERCADO', 'CAPITAL_REALTY'].forEach(entidade => {
    ['RECEITAS', 'COMPOSICAO_RECEITA', 'DESPESAS', 'VACANCIA', 'CONTRATOS'].forEach(tema =>
      testes.push([tema + ' · ' + entidade, () => obterBlocoDeck_(tema, entidade)]));
  });
  ['COMPOSICAO_RECEITA', 'VACANCIA'].forEach(tema =>
    testes.push([tema + ' · CONSOLIDADO', () => obterBlocoDeck_(tema, 'CONSOLIDADO_LOCACAO')]));
  ['ENDIVIDAMENTO', 'PRAZO_PAGAMENTO', 'PRAZO_RECEBIMENTO', 'LIQUIDEZ_CORRENTE', 'MARGEM_EBITDA']
    .forEach(tema => testes.push(['INDICADOR · ' + tema, () => obterIndicadorDeck_(tema)]));
  ['DEMERCADO', 'CR_INFRA', 'CR_ESTACIONAMENTOS'].forEach(entidade =>
    testes.push(['FLUXO · ' + entidade, () => obterFluxoCaixaDeck_(entidade)]));
  ['DEMERCADO', 'DEMINVEST', 'CR_INFRA', 'CR_ESTACIONAMENTOS'].forEach(entidade => {
    ['RITMO_ENTRADAS', 'RITMO_SAIDAS', 'RITMO_SALDO', 'RITMO_FLUXO'].forEach(tema =>
      testes.push([tema + ' · ' + entidade, () => obterRitmoDeck_(entidade, tema)]));
  });
  testes.forEach(t => {
    try { const d = t[1](); Logger.log('✓ ' + t[0] + ' → ' + d.aba + ', linha ' + d.linha); }
    catch (e) { Logger.log('✗ ' + t[0] + ' → ' + e.message); }
  });
}
