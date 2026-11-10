/**
 * ARQUIVO: 24_OrdemDeck.gs
 * A ORDEM DO DECK, num lugar só — último passo do pipeline.
 *
 * Estrutura definida com o Guilherme em 10/11/2026 (depois de o deck de
 * outubro sair com o Bridge dentro de Manutenções e o conteúdo depois da
 * última seção):
 *
 *   Capa · Destaques · Dashboard
 *   01 Financeiro ............ DRE · Bridge (tabela) · Bridge (gráfico)
 *   Metas dos analistas
 *   02 Manutenções ........... Preventivas · Corretivas · Backlog por CC ·
 *                              Emergencial · Pendentes por motivo · Backlog de Clientes
 *   03 Contratações e Obras .. Gestão de Contratações · Recebimento de Obras · fotos
 *   04 Vistorias ............. Monitoramento de Pendências · fotos
 *   05 Adequações de Clientes  Análise de Projetos · fotos
 *   Encerramento
 *
 * Como ordena: cada slide gerado é achado pela tag da nota. Slide feito à mão
 * (sem tag, ou cópia de um gerado — nota com o ID de outro slide) fica COLADO
 * no slide que vem antes dele e anda junto; o que tem "DESTAQUES" no texto vai
 * logo depois da capa. Slide com tag que não está na estrutura (sobra de
 * versão antiga) também anda colado no anterior. Para mudar a ordem do deck,
 * mude _estruturaDeck_() — e só ela.
 */

// Função, não constante: as tags vêm de outros arquivos, e no Apps Script a
// ordem de carga dos arquivos não é garantida no topo.
function _estruturaDeck_() {
  const hist = t => t.replace('_AUTO】', '_HIST_AUTO】');
  return [
    TAG_CAPA, 'DESTAQUES', TAG_DASHBOARD,
    _capaTagSecao_(1), TAG_DRE_PROPRIEDADES, TAG_BRIDGE_MANUTENCAO, TAG_BRIDGE_GRAFICO,
    TAG_METAS,
    _capaTagSecao_(2), TAG_PREVENTIVAS, TAG_CORRETIVAS, TAG_BACKLOG, TAG_BACKLOG_EMERG_DETALHE,
    TAG_CHAMADOS_PENDENTES, TAG_BACKLOG_CLIENTES,
    _capaTagSecao_(3), TAG_CONTRATACOES, TAG_CONTRATACOES_HIST, TAG_RECEBIMENTO, hist(TAG_RECEBIMENTO), _fotosTag_(3),
    _capaTagSecao_(4), TAG_PENDENCIAS, _fotosTag_(4),
    _capaTagSecao_(5), TAG_ANALISE_PROJETOS, hist(TAG_ANALISE_PROJETOS), _fotosTag_(5),
    TAG_ENCERRAMENTO
  ];
}

function ordenarDeck() {
  const deck = getDeckMensal_();
  const ordem = _estruturaDeck_();
  const blocos = [];
  let atual = null;

  deck.getSlides().forEach(s => {
    let notas = '';
    try { notas = s.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) {}
    const k = _ordemRank_(s, notas, ordem);
    if (k >= 0) {
      atual = { rank: k, slides: [s] };
      blocos.push(atual);
    } else if (atual) {
      atual.slides.push(s);
    } else {
      atual = { rank: -1, slides: [s] };   // à mão antes de qualquer gerado: fica no começo
      blocos.push(atual);
    }
  });

  // sort estável: páginas da mesma tag ficam na ordem em que estavam.
  const final = blocos.map((b, i) => ({ b: b, i: i }))
    .sort((x, y) => (x.b.rank - y.b.rank) || (x.i - y.i))
    .reduce((acc, x) => acc.concat(x.b.slides), []);

  // Slide.move(i) conta na ordem ANTES de mover; os já colocados ocupam 0..i-1,
  // então o i-ésimo está sempre em i ou depois.
  final.forEach((s, i) => s.move(i));
  Logger.log('✓ Deck ordenado: ' + final.length + ' slides em ' + blocos.length + ' bloco(s).');
}

// Posição do slide na estrutura; -1 = anda colado no anterior.
function _ordemRank_(s, notas, ordem) {
  for (let i = 0; i < ordem.length; i++) {
    const tag = ordem[i];
    if (tag === 'DESTAQUES' || notas.indexOf(tag) < 0) continue;
    const j = notas.indexOf(_TAB_ID_NOTA_);
    if (j >= 0 && notas.slice(j + _TAB_ID_NOTA_.length).split(/\s/)[0] !== s.getObjectId()) return -1;   // cópia à mão
    return i;
  }
  if (_ordemEhDestaques_(s)) return ordem.indexOf('DESTAQUES');
  return -1;
}

function _ordemEhDestaques_(s) {
  try {
    return s.getShapes().some(x => {
      try { return /DESTAQUES DO PER[IÍ]ODO/i.test(x.getText().asString()); } catch (e) { return false; }
    });
  } catch (e) { return false; }
}

// Sobras da estrutura antiga (6 seções): a capa e as fotos da seção 06.
function _ordemLimparSobras_() {
  const deck = getDeckMensal_();
  _slideLimpar_(deck, _capaTagSecao_(6));
  _slideLimpar_(deck, _fotosTag_(6));
}

// Só reordena a cópia do mês, sem gerar nada.
function ordenarDeckDoMes() {
  const arq = _capasDeckDoMes_(obterMesReferencia_());
  if (!arq) { Logger.log('✗ Deck do mês não encontrado — nada alterado.'); return; }
  _deckAlvoId_ = arq.getId();
  try { ordenarDeck(); } finally { _deckAlvoId_ = ''; }
}
