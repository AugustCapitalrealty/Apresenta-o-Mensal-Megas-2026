/**
 * ARQUIVO: 04_Deck.gs
 * O DECK — achar/criar o deck do mês, trocar cada slide gerado NO MESMO LUGAR
 * e pôr o deck na ordem fixa.
 *
 * Um deck por mês, na pasta de P&G: "PLANEJAMENTO & GESTÃO - RESULTADOS MM/AAAA".
 * Rodar de novo troca só os slides gerados (achados pela tag na nota); o que
 * foi feito à mão (Destaques, slides extras) fica.
 *
 * Lições trazidas de propriedades-mensal (10/11/2026):
 *  - Slide DUPLICADO de um gerado herda a nota com a tag e era apagado na
 *    regeração. Por isso a nota guarda "slide-id: <id>" e só o próprio slide
 *    (id igual) é tratado como gerado; a cópia vira slide manual.
 *  - Um Presentation só por execução (abrir de novo com openById não vê os
 *    slides criados pelo passo anterior).
 */

const PG_TAG = {
  CAPA: '【PG_CAPA】', DASHBOARD: '【PG_DASHBOARD】',
  SEC1: '【PG_SECAO_1】', DRE: '【PG_DRE】', BRIDGE_TAB: '【PG_BRIDGE_TABELA】', BRIDGE_GRAF: '【PG_BRIDGE_GRAFICO】',
  SEC2: '【PG_SECAO_2】', FAROL: '【PG_FAROL】', META: '【PG_META_DETALHE】',
  SEC3: '【PG_SECAO_3】', PORTFOLIO: '【PG_PORTFOLIO】', CRONOGRAMA: '【PG_CRONOGRAMA】', ENTREGAS: '【PG_ENTREGAS】',
  FIM: '【PG_ENCERRAMENTO】'
};
const PG_ID_NOTA = 'slide-id: ';

// A ORDEM DO DECK — mudar a ordem é mudar só esta lista.
function _pgEstrutura_() {
  const T = PG_TAG;
  return [T.CAPA, 'DESTAQUES', T.DASHBOARD,
    T.SEC1, T.DRE, T.BRIDGE_TAB, T.BRIDGE_GRAF,
    T.SEC2, T.FAROL, T.META,
    T.SEC3, T.PORTFOLIO, T.CRONOGRAMA, T.ENTREGAS,
    T.FIM];
}

let _pgDeckAtual_ = null;

function _pgNomeDeck_(mes, ano) {
  return 'PLANEJAMENTO & GESTÃO - RESULTADOS ' + ('0' + (mes + 1)).slice(-2) + '/' + ano;
}

// Acha o deck do mês na pasta; se não existir, cria (e remove o slide em branco inicial no fim).
function _pgAbrirDeck_(mes, ano) {
  const nome = _pgNomeDeck_(mes, ano);
  const pasta = DriveApp.getFolderById(PG_PASTA_ID);
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName() === nome && /presentation/.test(f.getMimeType())) {
      Logger.log('Deck do mês: ' + nome + ' (' + f.getUrl() + ')');
      return { deck: SlidesApp.openById(f.getId()), novo: false, url: f.getUrl() };
    }
  }
  const deck = SlidesApp.create(nome);
  const arq = DriveApp.getFileById(deck.getId());
  arq.moveTo(pasta);
  Logger.log('Deck do mês CRIADO: ' + nome + ' (' + arq.getUrl() + ')');
  return { deck: deck, novo: true, url: arq.getUrl(), brancos: deck.getSlides() };
}

function _pgNotas_(s) {
  try { return s.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { return ''; }
}

// Slide gerado por ESTE passo: nota com a tag e com o próprio id (cópia à mão tem outro id).
function _pgEhGerado_(s, tag) {
  const n = _pgNotas_(s);
  if (n.indexOf(tag) < 0) return false;
  const j = n.indexOf(PG_ID_NOTA);
  return j < 0 || n.slice(j + PG_ID_NOTA.length).split(/\s/)[0] === s.getObjectId();
}

/**
 * Roda um passo do pipeline trocando os slides dele no mesmo lugar.
 * fn(novo) desenha; novo() devolve um slide em branco já marcado.
 * Falha → slide de aviso no lugar (e os outros passos continuam).
 */
function _pgPasso_(nome, tag, fn) {
  const deck = _pgDeckAtual_;
  const antigos = deck.getSlides().filter(s => _pgEhGerado_(s, tag));
  let pos = antigos.length ? deck.getSlides().findIndex(s => s.getObjectId() === antigos[0].getObjectId())
                           : deck.getSlides().length;
  const criados = [];
  const novo = () => {
    const s = deck.insertSlide(pos++, SlidesApp.PredefinedLayout.BLANK);
    s.getBackground().setSolidFill(CR_DESIGN_SYSTEM.bgSlide);
    try { s.getNotesPage().getSpeakerNotesShape().getText().setText(tag + '\n' + PG_ID_NOTA + s.getObjectId()); } catch (e) {}
    criados.push(s);
    return s;
  };
  try {
    fn(novo);
    Logger.log('✓ ' + nome + (criados.length > 1 ? ' (' + criados.length + ' slides)' : ''));
  } catch (e) {
    Logger.log('✗ ' + nome + ': ' + e.message + (e.stack ? '\n' + e.stack : ''));
    criados.forEach(s => { try { s.remove(); } catch (x) {} });
    criados.length = 0;
    _pgSlideFalha_(novo(), nome, e);
  }
  antigos.forEach(s => { try { s.remove(); } catch (e) {} });
  return criados;
}

// Ordem fixa: cada slide gerado acha seu lugar pela tag; slide manual anda colado
// no anterior; o que tem "DESTAQUES DO PERÍODO" vai logo depois da capa.
function _pgOrdenar_() {
  const deck = _pgDeckAtual_;
  const ordem = _pgEstrutura_();
  const blocos = [];
  let atual = null;
  deck.getSlides().forEach(s => {
    const k = _pgRank_(s, ordem);
    if (k >= 0) { atual = { rank: k, slides: [s] }; blocos.push(atual); }
    else if (atual) atual.slides.push(s);
    else { atual = { rank: -1, slides: [s] }; blocos.push(atual); }
  });
  const final = blocos.map((b, i) => ({ b: b, i: i }))
    .sort((x, y) => (x.b.rank - y.b.rank) || (x.i - y.i))
    .reduce((acc, x) => acc.concat(x.b.slides), []);
  final.forEach((s, i) => s.move(i));
}

function _pgRank_(s, ordem) {
  for (let i = 0; i < ordem.length; i++) {
    if (ordem[i] !== 'DESTAQUES' && _pgEhGerado_(s, ordem[i])) return i;
  }
  if (_pgEhDestaques_(s)) return ordem.indexOf('DESTAQUES');
  return -1;
}

function _pgEhDestaques_(s) {
  try {
    return s.getShapes().some(x => {
      try { return /DESTAQUES DO PER[IÍ]ODO/i.test(x.getText().asString()); } catch (e) { return false; }
    });
  } catch (e) { return false; }
}
