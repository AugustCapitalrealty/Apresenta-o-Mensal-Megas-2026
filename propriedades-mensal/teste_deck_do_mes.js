// node teste_deck_do_mes.js — a troca NO MESMO LUGAR do _rodarPassos_ (00_Main.gs)
// e a busca da cópia do mês com o prefixo "NN - " (21_Slide_Capas.gs).
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let falhas = 0, total = 0;
function checa(cond, nome) { total++; if (cond) console.log('  ✓ ' + nome); else { falhas++; console.log('  ✗ ' + nome); } }

global.Logger = { log: () => {} };
global.SlidesApp = { PredefinedLayout: { BLANK: 'BLANK' } };
global.MimeType = { GOOGLE_SLIDES: 'slides' };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));

// Deck dublado: Slide.move(i) conta na ordem ANTES de mover, como no Slides.
let seq = 0;
const slides = [];
function novo(nome) {
  const s = { id: 'p' + (++seq), nome, getObjectId() { return this.id; } };
  s.remove = () => slides.splice(slides.indexOf(s), 1);
  s.move = i => { const de = slides.indexOf(s); slides.splice(de, 1); slides.splice(de < i ? i - 1 : i, 0, s); };
  return s;
}
const deck = { getSlides: () => slides.slice(), appendSlide: () => { const s = novo('?'); slides.push(s); return s; } };
global.getDeckMensal_ = () => deck;
const nomes = () => slides.map(s => s.nome).join(' | ');

function montar() {
  slides.length = 0;
  ['CAPA', 'DESTAQUES', 'DASH', 'METAS', 'SECAO MANUT', 'PREV', 'FOTOS (à mão)', 'TAB 1', 'TAB 2', 'FIM']
    .forEach(n => slides.push(novo(n)));
}
// Passo típico: apaga os seus pela "tag" (nome) e recria com appendSlide.
const recria = (velhos, novos) => () => {
  slides.filter(s => velhos.indexOf(s.nome) >= 0).forEach(s => s.remove());
  novos.forEach(n => { deck.appendSlide().nome = n; });
};

console.log('\n== Troca no mesmo lugar ==');
montar();
_rodarPassos_([{ nome: 'Dashboard', fn: recria(['DASH'], ['DASH out']) }]);
checa(nomes() === 'CAPA | DESTAQUES | DASH out | METAS | SECAO MANUT | PREV | FOTOS (à mão) | TAB 1 | TAB 2 | FIM',
      'um slide volta para a posição do antigo');

_rodarPassos_([{ nome: 'Tabela', fn: recria(['TAB 1', 'TAB 2'], ['TAB a', 'TAB b', 'TAB c']) }]);
checa(nomes() === 'CAPA | DESTAQUES | DASH out | METAS | SECAO MANUT | PREV | FOTOS (à mão) | TAB a | TAB b | TAB c | FIM',
      'paginação mudou (2 → 3): os três entram juntos, na ordem, antes do FIM');

_rodarPassos_([{ nome: 'Preventivas', fn: recria(['PREV'], []) }]);
checa(slides.length === 10 && nomes().indexOf('PREV') < 0, 'passo que só apagou não mexe no resto');

console.log('\n== Quando NÃO mexe ==');
montar();
_rodarPassos_([{ nome: 'Novo', fn: recria([], ['TORRE']) }]);
checa(slides[slides.length - 1].nome === 'TORRE', '1ª geração (nada apagado): fica no fim');

montar();
_rodarPassos_([{ nome: 'DRE', fn: () => {
  slides.filter(s => s.nome === 'METAS').forEach(s => s.remove());
  const s = deck.appendSlide(); s.nome = 'DRE'; s.move(5);
} }]);
checa(slides[5].nome === 'DRE' && slides[3].nome === 'SECAO MANUT','quem se posiciona sozinho fica onde se pôs');

montar();
_rodarPassos_([{ nome: 'Encerramento', fn: recria(['FIM'], ['FIM out']) }]);
checa(slides[slides.length - 1].nome === 'FIM out', 'o último continua último');

montar();
const r = _rodarPassos_([{ nome: 'Quebra', fn: () => { throw new Error('x'); } }]);
checa(r.length === 1 && slides.length === 10, 'passo com erro: deck intacto, erro devolvido');

console.log('\n== Cópia do mês com prefixo ==');
const arquivos = [
  { id: 'MODELO', nome: '# - Apresentação Propriedades Inicial' },
  { id: 'SET', nome: '08 - APRESENTAÇÃO PROPRIEDADES - SETEMBRO/2026' },
  { id: 'OUT', nome: ' 10 - APRESENTAÇÃO PROPRIEDADES - OUTUBRO/2026' }
];
DECK_PROPRIEDADES_ID = 'MODELO';
global.DriveApp = { getFileById: () => ({ getParents: () => {
  let foi = false;
  return { hasNext: () => !foi, next: () => { foi = true; return { getFilesByType: () => {
    let i = 0;
    return { hasNext: () => i < arquivos.length, next: () => { const a = arquivos[i++]; return { getId: () => a.id, getName: () => a.nome }; } };
  } }; } };
} }) };
checa((_capasDeckDoMes_({ nome: 'OUTUBRO', ano: 2026 }) || { getId: () => null }).getId() === 'OUT', 'acha " 10 - … OUTUBRO/2026"');
checa((_capasDeckDoMes_({ nome: 'SETEMBRO', ano: 2026 }) || { getId: () => null }).getId() === 'SET', 'acha "08 - … SETEMBRO/2026"');
checa(_capasDeckDoMes_({ nome: 'NOVEMBRO', ano: 2026 }) === null, 'mês sem cópia → null (não cai no modelo)');

console.log('\n== Limpeza por tag não apaga cópia feita à mão (10/11/2026) ==');
{
  const TAG = '【RECEBIMENTO_AUTO】';
  const lista = [];
  const sl = (id, nota, fotoArea) => {
    const s = { id, nota, getObjectId: () => id,
      getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({
        asString: () => s.nota, setText: t => { s.nota = t; } }) }) }),
      getImages: () => (fotoArea ? [{ getWidth: () => fotoArea, getHeight: () => 1 }] : []),
      getShapes: () => [], remove: () => lista.splice(lista.indexOf(s), 1) };
    return s;
  };
  const dk = { getSlides: () => lista.slice(), getPageWidth: () => 720, getPageHeight: () => 405 };
  const novo = sl('g1', ''); _tabMarcarSlide_(novo, TAG);
  lista.push(novo,
    sl('copia', novo.nota, 0),                                   // duplicado do gerado: nota com o ID de outro slide
    sl('antigoSemFoto', TAG + '\nGerado em 01/10/2026', 0),      // gerado antes do ID
    sl('antigoComFoto', TAG + '\nGerado em 01/10/2026', 60000),  // "Serviços Contratados" com foto
    sl('capaAntiga', '【PROP_CAPA_AUTO】\nGerado em 01/10/2026', 200000),
    sl('outro', 'nota qualquer', 0));
  checa(/slide-id: g1/.test(novo.nota), 'a nota do slide gerado guarda o próprio ID');
  _tabRemoverPorTag_(dk, TAG);
  const ids = lista.map(s => s.id).join(',');
  checa(ids.indexOf('g1') < 0 && ids.indexOf('antigoSemFoto') < 0, 'remove o gerado e o antigo sem foto');
  checa(ids.indexOf('copia') >= 0, 'mantém a CÓPIA de um slide gerado (ID diferente)');
  checa(ids.indexOf('antigoComFoto') >= 0, 'mantém slide antigo com foto grande (feito à mão)');
  _tabRemoverPorTag_(dk, TAG_CAPA);
  checa(lista.every(s => s.id !== 'capaAntiga'), 'capa antiga com foto ainda é trocada (a capa é gerada com foto)');
  checa(lista.some(s => s.id === 'outro'), 'slide sem a tag não é tocado');
}

console.log('\n== Ordenar o deck pela estrutura (o deck embaralhado de 10/11/2026) ==');
{
  const lista = [];
  let n = 0;
  const sl = (nome, tag, texto) => {
    const s = { nome, id: 'o' + (++n), nota: '', getObjectId: () => s.id,
      getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ asString: () => s.nota }) }) }),
      getShapes: () => [{ getText: () => ({ asString: () => texto || nome }) }],
      move: i => { const de = lista.indexOf(s); lista.splice(de, 1); lista.splice(de < i ? i - 1 : i, 0, s); } };
    if (tag) s.nota = tag + '\nGerado em 10/11/2026\n' + _TAB_ID_NOTA_ + s.id;
    lista.push(s); return s;
  };
  const hist = t => t.replace('_AUTO】', '_HIST_AUTO】');
  // A ordem do pptx das 17:31: capas todas no topo, Bridge dentro de Manutenções, conteúdo depois da 06.
  sl('Capa', TAG_CAPA);
  sl('Sec1', _capaTagSecao_(1)); sl('DRE', TAG_DRE_PROPRIEDADES);
  sl('Sec2', _capaTagSecao_(2)); sl('Bridge', TAG_BRIDGE_MANUTENCAO); sl('BridgeG', TAG_BRIDGE_GRAFICO);
  sl('Sec3', _capaTagSecao_(3)); sl('Fotos3', _fotosTag_(3));
  sl('Sec4', _capaTagSecao_(4)); sl('Pend', TAG_PENDENCIAS); sl('Fotos4', _fotosTag_(4));
  sl('Sec5', _capaTagSecao_(5));
  sl('Dash', TAG_DASHBOARD); sl('Prev', TAG_PREVENTIVAS); sl('Corr', TAG_CORRETIVAS); sl('Back', TAG_BACKLOG);
  sl('Emerg1', TAG_BACKLOG_EMERG_DETALHE); sl('Emerg2', TAG_BACKLOG_EMERG_DETALHE); sl('Motivo', TAG_CHAMADOS_PENDENTES);
  sl('Cli1', TAG_BACKLOG_CLIENTES); sl('Cli2', TAG_BACKLOG_CLIENTES);
  sl('Receb', TAG_RECEBIMENTO); sl('Obra à mão', null); sl('RecebH', hist(TAG_RECEBIMENTO));
  sl('Analise', TAG_ANALISE_PROJETOS); sl('AnaliseH', hist(TAG_ANALISE_PROJETOS));
  sl('Contr', TAG_CONTRATACOES); sl('ContrH', TAG_CONTRATACOES_HIST);
  sl('Metas1', TAG_METAS); sl('Metas2', TAG_METAS); sl('Fotos5', _fotosTag_(5));
  sl('Destaques', null, 'DESTAQUES DO PERÍODO');
  const copia = sl('Cópia à mão', TAG_RECEBIMENTO); copia.nota = copia.nota.replace(_TAB_ID_NOTA_ + copia.id, _TAB_ID_NOTA_ + 'outro');
  sl('Fim', TAG_ENCERRAMENTO);

  const salvo = global.getDeckMensal_;
  global.getDeckMensal_ = () => ({ getSlides: () => lista.slice() });
  ordenarDeck();
  global.getDeckMensal_ = salvo;
  const ord = lista.map(s => s.nome).join(' | ');
  console.log('    ' + ord);
  // "Cópia à mão" vinha logo depois dos Destaques: anda colada neles.
  checa(ord === ['Capa', 'Destaques', 'Cópia à mão', 'Dash', 'Sec1', 'DRE', 'Bridge', 'BridgeG', 'Metas1', 'Metas2',
    'Sec2', 'Prev', 'Corr', 'Back', 'Emerg1', 'Emerg2', 'Motivo', 'Cli1', 'Cli2',
    'Sec3', 'Contr', 'ContrH', 'Receb', 'Obra à mão', 'RecebH', 'Fotos3',
    'Sec4', 'Pend', 'Fotos4',
    'Sec5', 'Analise', 'AnaliseH', 'Fotos5', 'Fim'].join(' | '),
    'Capa · Destaques · Dashboard · Financeiro · Metas · Manutenções · Contratações e Obras · Vistorias · Adequações · Obrigado');
  checa(ord.indexOf('Receb | Obra à mão | RecebH') >= 0, 'slide feito à mão anda colado no anterior');
  global.getDeckMensal_ = () => ({ getSlides: () => lista.slice() });
  ordenarDeck();
  global.getDeckMensal_ = salvo;
  checa(lista.map(s => s.nome).join(' | ') === ord, 'ordenar de novo não muda nada');
}

console.log(falhas ? '\n✗ ' + falhas + ' de ' + total + ' falharam' : '\n✓ ' + total + '/' + total + ' passaram');
process.exitCode = falhas ? 1 : 0;
