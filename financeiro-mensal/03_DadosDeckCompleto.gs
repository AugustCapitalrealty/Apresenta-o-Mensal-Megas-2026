/**
 * FONTES CONFIRMADAS DO DECK COMPLETO
 *
 * Só há leitura dinâmica para painéis cuja origem foi confirmada no XLSX de
 * Julho/2026. Os demais painéis têm placeholders institucionais explícitos;
 * nenhuma busca genérica tenta adivinhar uma fonte ou reutilizar números.
 */

const DC_ENTIDADES = {
  DEMERCADO: { titulo: 'Demercado' },
  CAPITAL_REALTY: { titulo: 'Capital Realty' },
  CONSOLIDADO_LOCACAO: { titulo: 'Locação Consolidado · Capital Realty + Demercado' },
  DEMINVEST: { titulo: 'Deminvest' },
  CR_INFRA: { titulo: 'Capital Realty Infraestrutura Logística' },
  CR_ESTACIONAMENTOS: { titulo: 'Capital Realty Estacionamento' }
};

const DC_FONTES_CONFIRMADAS = {
  AGENDA: { aba: 'AGENDA', tipo: 'agenda', descricao: 'último bloco mensal completo' },
  RESUMO_EBITDA: { aba: 'Quadro EBITDA', tipo: 'ebitda', bloco: 'último EBITDA' },
  DRE_DEMERCADO: { aba: 'Quadro DRE Apresentação', tipo: 'dre', bloco: 'DRE DEMERCADO' },
  DRE_CAPITAL_REALTY: { aba: 'Quadro DRE Apresentação', tipo: 'dre', bloco: 'DRE CAPITAL REALTY' },
  DRE_HANGAR_VIP: { aba: 'Quadro DRE Apresentação', tipo: 'dre', bloco: 'DRE HANGAR VIP' },
  RECEITAS_DEMERCADO: { aba: 'Receitas Demercado', tipo: 'comparativo', ancora: 'Ofensores Receitas' },
  DESPESAS_DEMERCADO: { aba: 'Despesas Demercado', tipo: 'comparativo', ancora: 'Ofensores Despesas' },
  RECEITAS_CAPITAL_REALTY: {
    aba: 'Receitas Matriz', tipo: 'comparativo', ancora: 'Ofensores Receitas',
    mapeamento: 'Matriz → Capital Realty'
  },
  DESPESAS_CAPITAL_REALTY: {
    aba: 'Despesas Matriz', tipo: 'comparativo', ancora: 'Ofensores Despesas',
    mapeamento: 'Matriz → Capital Realty'
  }
};

// Páginas cuja fonte não existe no XLSX fornecido. A lista é parte do
// contrato do deck: 34 placeholders e zero página omitida.
const DC_PAGINAS_PLACEHOLDER = [
  '03 · Meta Diretoria', '04 · Meta Gerência Financeira',
  '09 · Composição Demercado', '11 · Vacância Demercado',
  '12 · Contratos Demercado', '16 · Composição Capital Realty',
  '18 · Vacância Capital Realty', '19 · Contratos Capital Realty',
  '21 · Composição Locação Consolidada', '22 · Vacância Locação Consolidada',
  '24 · Endividamento', '25 · Prazo de Pagamento', '26 · Prazo de Recebimento',
  '27 · Liquidez Corrente', '28 · Margem EBITDA',
  '30 · Fluxo de Caixa Demercado', '31 · Fluxo de Caixa CR Infra',
  '32 · Fluxo de Caixa CR Estacionamentos',
  '36 · Ritmo Entradas Demercado', '37 · Ritmo Saídas Demercado',
  '38 · Ritmo Saldo Demercado', '39 · Ritmo Fluxo Demercado',
  '41 · Ritmo Entradas Deminvest', '42 · Ritmo Saídas Deminvest',
  '43 · Ritmo Saldo Deminvest', '44 · Ritmo Fluxo Deminvest',
  '46 · Ritmo Entradas CR Infra', '47 · Ritmo Saídas CR Infra',
  '48 · Ritmo Saldo CR Infra', '49 · Ritmo Fluxo CR Infra',
  '51 · Ritmo Entradas CR Estacionamentos', '52 · Ritmo Saídas CR Estacionamentos',
  '53 · Ritmo Saldo CR Estacionamentos', '54 · Ritmo Fluxo CR Estacionamentos'
];

var DC_CACHE_ABAS_ = null;

function _dcNorm_(valor) {
  return String(valor == null ? '' : valor).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function _dcEntidade_(chave) {
  const entidade = DC_ENTIDADES[chave];
  if (!entidade) throw new Error('Entidade do deck desconhecida: ' + chave + '.');
  return entidade;
}

function _dcAbas_() {
  if (DC_CACHE_ABAS_) return DC_CACHE_ABAS_;
  const ss = SpreadsheetApp.openById(FINANCEIRO_SPREADSHEET_ID);
  const nomesPermitidos = Object.keys(DC_FONTES_CONFIRMADAS)
    .map(chave => DC_FONTES_CONFIRMADAS[chave])
    .filter(fonte => fonte.tipo === 'agenda' || fonte.tipo === 'comparativo')
    .map(fonte => _dcNorm_(fonte.aba));
  DC_CACHE_ABAS_ = ss.getSheets().filter(sheet =>
    nomesPermitidos.indexOf(_dcNorm_(sheet.getName())) >= 0).map(sheet => {
    const nr = sheet.getLastRow(), nc = sheet.getLastColumn();
    return {
      nome: sheet.getName(), norm: _dcNorm_(sheet.getName()), sheet: sheet,
      valores: nr && nc ? sheet.getRange(1, 1, nr, nc).getDisplayValues() : []
    };
  });
  return DC_CACHE_ABAS_;
}

// Correspondência exata depois de remover acentos e espaços excedentes.
function _dcAbaExata_(nome) {
  const alvo = _dcNorm_(nome);
  const aba = _dcAbas_().find(a => a.norm === alvo);
  if (!aba) throw new Error('Aba confirmada "' + nome + '" não encontrada.');
  return aba;
}

function _dcLinhaVazia_(row) {
  return !row || row.every(v => !String(v == null ? '' : v).trim());
}

function _dcReferenciaFonte_(matriz) {
  const texto = (matriz || []).map(r => r.join(' ')).join(' ');
  const meses = 'JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO';
  const re = new RegExp('(' + meses + ')\\s*[\\/\\- ]\\s*(20\\d{2}|\\d{2})', 'i');
  const m = texto.match(re);
  if (!m) return null;
  const ano = m[2].length === 2 ? '20' + m[2] : m[2];
  return m[1].toUpperCase() + ' / ' + ano;
}

function _dcComMetadados_(aba, linha, matriz) {
  const referenciaFonte = _dcReferenciaFonte_(matriz);
  const referenciaDeck = obterMesReferencia_().label;
  return {
    aba: aba.nome, linha: linha + 1, matriz: matriz,
    referenciaFonte: referenciaFonte,
    divergenciaMes: !!referenciaFonte && _dcNorm_(referenciaFonte) !== _dcNorm_(referenciaDeck)
  };
}

/** Seleciona o último bloco de agenda mensal completo, não uma pauta curta. */
function obterAgendaResultados_() {
  const aba = _dcAbaExata_(DC_FONTES_CONFIRMADAS.AGENDA.aba);
  const esperados = ['assunto', 'inicio', 'termino', 'responsavel'];
  const candidatos = [];
  aba.valores.forEach((row, r) => {
    const norm = row.map(_dcNorm_);
    const indices = esperados.map(h => norm.indexOf(h));
    if (indices.some(i => i < 0)) return;
    const inicio = Math.min.apply(null, indices), fim = Math.max.apply(null, indices);
    if (fim - inicio !== 3) return;
    const linhas = [row.slice(inicio, fim + 1)];
    for (let rr = r + 1; rr < aba.valores.length; rr++) {
      const trecho = aba.valores[rr].slice(inicio, fim + 1);
      if (_dcLinhaVazia_(trecho)) break;
      if (esperados.every((h, i) => _dcNorm_(trecho[i]) === h)) break;
      if (trecho.every(v => String(v == null ? '' : v).trim())) linhas.push(trecho);
    }
    // A pauta mensal possui pelo menos cinco assuntos. Isso exclui blocos
    // históricos curtos (assembleias/auditorias) mantidos abaixo na aba.
    if (linhas.length >= 6) candidatos.push({ linha: r, matriz: linhas });
  });
  if (!candidatos.length) throw new Error('Nenhum bloco mensal completo localizado na aba "' + aba.nome + '".');
  const escolhido = candidatos[candidatos.length - 1];
  return _dcComMetadados_(aba, escolhido.linha, escolhido.matriz);
}

/** Lê Ofensores + Defensores até a linha TOTAL DE ... do quadro confirmado. */
function _dcLerComparativo_(chave) {
  const fonte = DC_FONTES_CONFIRMADAS[chave];
  if (!fonte || fonte.tipo !== 'comparativo') throw new Error('Fonte comparativa desconhecida: ' + chave + '.');
  const aba = _dcAbaExata_(fonte.aba), ancora = _dcNorm_(fonte.ancora);
  let inicio = -1;
  aba.valores.forEach((row, r) => {
    if (row.some(v => _dcNorm_(v).indexOf(ancora) === 0)) inicio = r;
  });
  if (inicio < 0) throw new Error('Cabeçalho "' + fonte.ancora + '" não encontrado na aba "' + aba.nome + '".');

  const primeiraColuna = aba.valores[inicio].findIndex(v => String(v == null ? '' : v).trim());
  if (primeiraColuna < 0) throw new Error('Cabeçalho vazio na aba "' + aba.nome + '".');
  const matriz = [];
  for (let r = inicio; r < aba.valores.length; r++) {
    const row = aba.valores[r].slice(primeiraColuna, primeiraColuna + 6);
    if (_dcLinhaVazia_(row)) break;
    matriz.push(row);
    if (/^total de\b/.test(_dcNorm_(row[0]))) break;
  }
  if (matriz.length < 3 || !matriz.some(r => /^total de\b/.test(_dcNorm_(r[0])))) {
    throw new Error('Quadro da aba "' + aba.nome + '" não termina em TOTAL DE.');
  }
  const resultado = _dcComMetadados_(aba, inicio, matriz);
  resultado.mapeamento = fonte.mapeamento || null;
  return resultado;
}

function obterBlocoDeck_(tema, entidade) {
  const mapa = {
    'RECEITAS|DEMERCADO': 'RECEITAS_DEMERCADO',
    'DESPESAS|DEMERCADO': 'DESPESAS_DEMERCADO',
    'RECEITAS|CAPITAL_REALTY': 'RECEITAS_CAPITAL_REALTY',
    'DESPESAS|CAPITAL_REALTY': 'DESPESAS_CAPITAL_REALTY'
  };
  const fonte = mapa[tema + '|' + entidade];
  if (!fonte) throw new Error('Fonte de dados não disponível para ' + tema + ' · ' + entidade + '.');
  return _dcLerComparativo_(fonte);
}

// Compatibilidade com chamadas públicas antigas. O pipeline usa placeholders
// explícitos para estes casos e nunca tenta fabricar ou inferir os dados.
function obterMetasResultados_(tipo) { throw new Error('Fonte de dados não disponível para Meta · ' + tipo + '.'); }
function obterIndicadorDeck_(tema) { throw new Error('Fonte de dados não disponível para Indicador · ' + tema + '.'); }
function obterFluxoCaixaDeck_(entidade) { throw new Error('Fonte de dados não disponível para Fluxo · ' + entidade + '.'); }
function obterRitmoDeck_(entidade, tipo) { throw new Error('Fonte de dados não disponível para ' + tipo + ' · ' + entidade + '.'); }

function diagnosticarDeckCompleto() {
  DC_CACHE_ABAS_ = null;
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — Deck Financeiro de 55 páginas');
  Logger.log('Referência geral: ' + obterMesReferencia_().label);
  Logger.log('======================================================');

  const testes = [
    ['Agenda', obterAgendaResultados_],
    ['Resumo EBITDA', obterResumoResultadoEBITDA_],
    ['DRE Demercado', function() { return obterDREEmpresa_('DEMERCADO'); }],
    ['DRE Capital Realty', function() { return obterDREEmpresa_('CAPITAL REALTY'); }],
    ['DRE Hangar Vip', function() { return obterDREEmpresa_('HANGAR VIP'); }],
    ['Receitas Demercado', function() { return _dcLerComparativo_('RECEITAS_DEMERCADO'); }],
    ['Despesas Demercado', function() { return _dcLerComparativo_('DESPESAS_DEMERCADO'); }],
    ['Receitas Capital Realty', function() { return _dcLerComparativo_('RECEITAS_CAPITAL_REALTY'); }],
    ['Despesas Capital Realty', function() { return _dcLerComparativo_('DESPESAS_CAPITAL_REALTY'); }]
  ];
  testes.forEach(t => {
    try {
      const d = t[1]();
      const aba = d.aba || (t[0].indexOf('DRE') === 0 ? QUADRO_DRE_SHEET : QUADRO_EBITDA_SHEET);
      const mes = d.referenciaFonte || (d.mes && d.ano ? String(d.mes).toUpperCase() + ' / ' + d.ano : null);
      const diverge = mes && _dcNorm_(mes) !== _dcNorm_(obterMesReferencia_().label);
      Logger.log('✓ ' + t[0] + ' → ' + aba + (mes ? ' · ' + mes : '') +
        (diverge ? ' · ⚠ divergência de mês preservada' : ''));
    } catch (e) { Logger.log('✗ ' + t[0] + ' → ' + e.message); }
  });

  Logger.log('\nPlaceholders sem fonte confirmada (' + DC_PAGINAS_PLACEHOLDER.length + '):');
  DC_PAGINAS_PLACEHOLDER.forEach(nome => Logger.log('  · ' + nome));
  Logger.log('\nResumo esperado: 55 páginas; 34 placeholders; zero página omitida.');
}
