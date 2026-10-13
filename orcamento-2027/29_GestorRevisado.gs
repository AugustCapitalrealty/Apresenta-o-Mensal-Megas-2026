/**
 * ARQUIVO: 29_GestorRevisado.gs
 * SLIDES:  Os slides do gestor na v3 (obras, fotos e substituição da segurança — fora os da Implantação Moked, que
 *          são de 28_Moked.gs) revisados, numa apresentação SEPARADA para ele copiar de volta (12/10/2026).
 *
 *   ▸ gerarSlidesGestorRevisados() → "GESTOR - SLIDES REVISADOS (para a v3)" na pasta do orçamento: criada na 1ª vez;
 *                                    nas seguintes, refeita inteira a partir da v3 de agora.
 *
 * Cada slide é uma CÓPIA do slide da v3 (a v3 só é lida): as fotos, os prints e a formatação do gestor ficam como
 * estão. Na cópia:
 *   - o subtítulo-molde ("Subtítulo: conta, local ou obra · Mega X") vira "conta · local · Mega" — com o Mega da
 *     seção em que o slide está na v3 (havia slides do Itajaí dizendo "Mega Esteio");
 *   - o português (ORC_GESTOR_TROCAS, troca exata de trechos) e o LOCAL copiado de outro slide (ORC_GESTOR_LOCAL);
 *   - o título interno copiado de outro slide (sem nenhuma palavra em comum com o título) vira o título do slide;
 *   - o rodapé leva o Mega certo, e a trilha do topo marca a seção do assunto: 04 Manutenção (05 Segurança na
 *     substituição da segurança) em vez de 08 Fotos.
 * Valores e textos que só o gestor sabe não mudam: o que parece molde esquecido (texto de outro slide, R$ 50.000 do
 * molde) vai para o log e para as anotações do slide.
 */

const ORC_GESTOR_REV = { nome: 'GESTOR - SLIDES REVISADOS (para a v3)', prop: 'ORC_GESTOR_REV_DECK_ID' };

// Trechos trocados em todo texto do slide (exatos, na ordem). Do mais longo para o mais curto quando se sobrepõem.
const ORC_GESTOR_TROCAS = [
  // títulos
  ['Retrofit e Adequação área de Copa e Cozinha', 'Retrofit e Adequação da Área de Copa e Cozinha'],
  ['(Anti-evasão)', '(Antievasão)'],
  // Esteio — obras
  ['De acordo com a NR 35 toda escada fixa acima de 2 metros deve ter linha de vertical instalada',
   'De acordo com a NR-35, toda escada fixa acima de 2 metros deve ter linha de vida vertical instalada'],
  ['linha de vertical', 'linha de vida vertical'],
  ['Premissa de lavação com Drone as telhas metálicas de fechamento no Armazém A + B2.',
   'Premissa: lavagem com drone das telhas metálicas de fechamento dos Armazéns A e B2.'],
  ['Portário', 'Portaria'],
  ['Garam dos Tratores', 'Garagem dos Tratores'],
  ['alvenaria externas com Tinta Suvinil fosco', 'alvenaria externa com tinta Suvinil fosca'],
  ['Vida Útil', 'vida útil'],
  ['menos suscetíveis a eventos de fortes ventos', 'menos suscetível a ventos fortes'],
  ['das vgas', 'das VGAs'],
  ['válvulas gaveta haste ascendente', 'válvulas gaveta de haste ascendente'],
  ['08 chaves de fluxo)', '8 chaves de fluxo'],
  ['METEREOLÓGICA', 'METEOROLÓGICA'],
  // Esteio — substituição da segurança
  ['Contrato atualmente com a VOIGT não é de segurança, mas de mão de obra para serviços de portaria com adicional de periculosidade para ronda',
   'O contrato atual com a VOIGT não é de segurança, e sim de mão de obra para portaria, com adicional de periculosidade para a ronda.'],
  ['A VOIGT não atende com contrato de vigilância armada e nem com porte adequado de vigilância.',
   'A VOIGT não oferece vigilância armada nem tem porte adequado de vigilância.'],
  ['Contrato mesmo padrão do Mega Curitiba e Itajaí, sendo 2 vigilantes armados e a Portaria do Armazém A',
   'Contrato no mesmo padrão do Mega Curitiba e do Mega Itajaí: 2 vigilantes armados e a portaria do Armazém A.'],
  ['Por que Vigilante na Portaria B armado e como vigilante?', 'Por que um vigilante armado na Portaria B?'],
  ['o ronda não poderá ficar saindo toda hora para ir no Armazém B', 'o vigilante da ronda não pode sair a toda hora para ir ao Armazém B'],
  ['tende a ser mais operacional e apoio na área externa, sendo a portaria do A preparada',
   'tende a ser mais operacional e de apoio à área externa, com a portaria do A preparada'],
  // Itajaí
  ['Plano de manutenção continuada de manutenção da comunicação horizontal', 'Plano de manutenção contínua da comunicação horizontal'],
  ['Adotou-se como base', 'Adotaram-se como base'],
  ['SUBST. PAVIMENTAÇÃO INTERTRAVADO', 'SUBST. PAVIMENTO INTERTRAVADO'],
  ['o que é faixa e o que não.', 'o que é faixa e o que não é.'],
  ['no Armazéns 2', 'no Armazém 2'],
  ['Em aço Inoxidável inteiriço', 'em aço inoxidável inteiriço'],
  ['Mõo de Obra', 'Mão de obra']
];

// LOCAL copiado de outro slide: [início do título (sem acento, minúsculo), LOCAL certo].
const ORC_GESTOR_LOCAL = [['automacao monitoramento canal br 116', 'Canal da BR-116']];

// Texto do molde de outro slide esquecido no slide (aviso, não troca).
const ORC_GESTOR_MOLDE = [/Premissa: lavagem com drone/, /Premissa de lavação com Drone/];

// LOCAL copiado de outro slide (erro de molde), por Mega: troca só se o campo ainda tem o texto copiado (localEra).
// 12/10/2026, 22h45 (Guilherme): "não altere números nem acrescente nada… apenas altere erros; valores estão todos
// certos" — os valores do slide, a CONTA e o texto do gestor ficam como estão; sem selos.
const ORC_GESTOR_AJUSTES = [
  { titulo: 'comunicacao horizontal', mega: 'Mega Itajaí', local: 'Vias, docas, bolsão e calçadas', localEra: ['Pavimentação Intertravada'] },
  { titulo: 'comunicacao horizontal', mega: 'Mega Curitiba', local: 'Vias, docas, bolsão e lombadas',
    localEra: ['Armazém, área ou equipamento', 'Pavimento Intertravado'] },
  { titulo: 'implantacao a sense', mega: 'Mega Itajaí', local: 'Perímetro externo (6 zonas)', localEra: ['Escada Cobertura (Fase 1, 2 e 3)'] },
  { titulo: 'paisagismo restaurante', mega: 'Mega Curitiba', local: 'Restaurante industrial', localEra: ['Pavimento Intertravado'] },
  { titulo: 'defensas entre platos', mega: 'Mega Curitiba', local: 'Platôs 1, 2 e 3', localEra: ['Pavimento Intertravado'] },
  { titulo: 'implantacao torniquete 4', mega: 'Mega Curitiba', local: 'Acessos', localEra: ['Pavimento Intertravado'] },
  { titulo: 'automacao leituras', mega: 'Mega Curitiba', local: 'Medidores de água e energia', localEra: ['Armazém 1 a 9'] }
];

// Título interno copiado de outro slide (os que apareceram na v3): troca pelo título do slide quando não tem
// palavra em comum com ele. Título interno escrito pelo gestor (fora desta lista) fica como está.
const ORC_GESTOR_INTERNOS_COPIADOS = ['PINTURA DA TUBULAÇÃO DE INCÊNDIO AÉREA', 'LIMPEZA E LAVAGEM DAS ESTRUTURAS METÁLICAS'];

function gerarSlidesGestorRevisados() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(ORC_GESTOR_REV.prop);
  let deck = null;
  if (id) {
    try { deck = SlidesApp.openById(id); }
    catch (e) { Logger.log('A apresentação revisada (' + id + ') não abriu — vou criar outra: ' + e.message); }
  }
  if (!deck) {
    deck = SlidesApp.create(ORC_GESTOR_REV.nome);
    try { DriveApp.getFileById(deck.getId()).moveTo(DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID)); }
    catch (e) { Logger.log('A apresentação ficou no Meu Drive (não foi para a pasta do orçamento): ' + e.message); }
    props.setProperty(ORC_GESTOR_REV.prop, deck.getId());
  }
  const res = _orcGerarGestorRevisados_(deck, SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID)), url = deck.getUrl();
  _orcSalvarDeck_(deck, 'os slides revisados do gestor');
  res.forEach(r => Logger.log('Slide ' + r.v3 + ' da v3 (' + r.mega + ') — ' + r.titulo + ': ' + (r.feito.join('; ') || 'sem mudança') +
                              (r.avisos.length ? ' · ATENÇÃO: ' + r.avisos.join('; ') : '')));
  Logger.log('Pronto: ' + res.length + ' slides revisados — ' + url + ' . Na v3, troque cada slide pelo revisado (o número do ' +
             'slide da v3 está nas anotações).');
}

// Refaz a apresentação a partir da v3. Devolve [{ v3, mega, titulo, feito: [...], avisos: [...] }].
function _orcGerarGestorRevisados_(deck, v3) {
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const velhos = deck.getSlides();
  velhos.slice(1).forEach(s => s.remove());
  const res = [];
  let mega = null;
  _orcAplicarMarca_(null);
  v3.getSlides().forEach((s, i) => {
    const textos = s.getShapes().map(sh => { try { return sh.getText().asString(); } catch (e) { return ''; } });
    if (!_orcDonoFotos_(s)) {
      // O Mega da seção: o dos slides gerados ("… · Mega Itajaí") que vêm antes.
      const m = textos.join(' | ').match(/·\s*(Mega (?:Esteio|Itajaí|Curitiba))(?![A-Za-zÀ-ú])/);
      if (m) mega = m[1];
      return;
    }
    const titulo = _orcTituloGestor_(s);
    if (/^Implantação Moked/i.test(titulo) || /Título do assunto/.test(titulo)) return;   // Moked: 28_Moked.gs; molde vazio
    res.push(_orcRevisarSlideGestor_(deck.appendSlide(s), W, H, mega || 'Mega Esteio', i + 1));
  });
  if (velhos.length) velhos[0].remove();
  return res;
}

// Título do slide do gestor: a caixa de texto do cabeçalho (topo até 30 pt, à esquerda).
function _orcTituloGestor_(slide) {
  const cs = slide.getShapes().filter(sh => sh.getTop() < 30 && sh.getLeft() < 120)
    .map(sh => { try { return sh.getText().asString().trim(); } catch (e) { return ''; } })
    .filter(t => t && !/^Subtítulo:/.test(t));
  return cs.sort((a, b) => b.length - a.length)[0] || '';
}

// Com a marca do Mega do slide (Demercado em Curitiba): a moldura da trilha nova, o selo e as tabelas redesenhadas
// saem no padrão dele — antes saía a moldura da Capital nos slides de Curitiba (12/10/2026).
function _orcRevisarSlideGestor_(slide, W, H, mega, nV3) {
  const chave = Object.keys(ORC_CIDADES).filter(k => ORC_CIDADES[k].nome === mega)[0];
  _orcAplicarMarca_(chave ? ORC_CIDADES[chave] : null);
  try { return _orcRevisarSlideGestorNaMarca_(slide, W, H, mega, nV3); }
  finally { _orcAplicarMarca_(null); }
}

function _orcRevisarSlideGestorNaMarca_(slide, W, H, mega, nV3) {
  const feito = [], avisos = [];
  const txt = sh => { try { return sh.getText().asString().replace(/\n$/, ''); } catch (e) { return ''; } };
  const shapes = slide.getShapes();
  // 1. Português e títulos.
  let trocas = 0;
  shapes.forEach(sh => ORC_GESTOR_TROCAS.forEach(t => {
    if (txt(sh).indexOf(t[0]) < 0) return;
    try { trocas += sh.getText().replaceAllText(t[0], t[1]) || 0; } catch (e) { /* forma sem texto */ }
  }));
  if (trocas) feito.push(trocas + ' correção(ões) de texto');
  const titulo = _orcTituloGestor_(slide);
  const nt = _orcNorm_(titulo);

  // 2. CONTA e LOCAL: o valor é a caixa logo abaixo do rótulo (molde de 26_Fotos.gs).
  const valorDe = rotulo => {
    const r = shapes.filter(sh => txt(sh).trim() === rotulo)[0];
    if (!r) return null;
    return shapes.filter(sh => sh !== r && Math.abs(sh.getLeft() - r.getLeft()) < 4 &&
                               sh.getTop() - r.getTop() > 4 && sh.getTop() - r.getTop() < 18)[0] || null;
  };
  const shConta = valorDe('CONTA'), shLocal = valorDe('LOCAL');
  const local = ORC_GESTOR_LOCAL.filter(l => nt.indexOf(l[0]) === 0)[0];
  if (local && shLocal && txt(shLocal).trim() !== local[1]) {
    feito.push('LOCAL "' + txt(shLocal).trim() + '" → "' + local[1] + '"');
    shLocal.getText().setText(local[1]);
  }
  const ajuste = ORC_GESTOR_AJUSTES.filter(a => a.mega === mega && nt.indexOf(a.titulo) >= 0)[0] || null;
  if (ajuste) _orcAjustarSlideGestor_(slide, W, shapes, ajuste, { conta: shConta, local: shLocal, valor: valorDe('VALOR NO ORÇ 2027') },
                                      feito, avisos);
  const conta = shConta ? txt(shConta).trim() : '', lugar = shLocal ? txt(shLocal).trim() : '';

  // 3. Título interno copiado de outro slide (ORC_GESTOR_INTERNOS_COPIADOS) e sem palavra (5+ letras) em comum com o título.
  const palavras = s => _orcNorm_(s).split(/[^a-z0-9]+/).filter(p => p.length >= 5);
  const pt = palavras(titulo);
  const interno = shapes.filter(sh => sh.getLeft() > W * 0.6 && sh.getTop() > 80 && sh.getTop() < 120)
    .filter(sh => { const t = txt(sh).trim(); return t && t === t.toUpperCase() && /[A-ZÀ-Ú]{4}/.test(t); })
    .sort((a, b) => a.getTop() - b.getTop())[0];
  if (interno && titulo) {
    const it = txt(interno).trim();
    if (ORC_GESTOR_INTERNOS_COPIADOS.indexOf(it) >= 0 && !palavras(it).some(p => pt.indexOf(p) >= 0)) {
      const novo = titulo.replace(/\s*\|\s*/g, ' · ').toUpperCase();
      interno.getText().setText(novo);
      feito.push('título interno "' + it + '" → "' + novo + '"');
    }
  }

  // 4. Subtítulo e rodapé com o Mega da seção.
  const sub = shapes.filter(sh => /^Subtítulo:/.test(txt(sh).trim()))[0];
  const seguranca = /^substituicao seguranca/.test(nt);   // subtítulo "Segurança e vigilância · Mega"
  if (sub) {
    const partes = (seguranca ? ['Segurança e vigilância'] : [conta, lugar]).filter(String).concat([mega]);
    const veio = txt(sub).trim(), megaVeio = (veio.match(/Mega \S+/) || [''])[0];
    sub.getText().setText(partes.join(' · '));
    feito.push('subtítulo "' + partes.join(' · ') + '"' + (megaVeio && megaVeio !== mega ? ' (dizia ' + megaVeio + ')' : ''));
  }
  const rod = shapes.filter(sh => /^Fotos e textos preenchidos pelo gestor/.test(txt(sh).trim()))[0];
  if (rod && txt(rod).trim() !== 'Fotos e textos preenchidos pelo gestor · ' + mega) {
    rod.getText().setText('Fotos e textos preenchidos pelo gestor · ' + mega);
    feito.push('rodapé com o ' + mega);
  }

  // 5. Trilha: a moldura da seção do assunto no lugar da de 08 Fotos.
  const secao = seguranca ? 5 : 4;
  if (_orcTrocarMolduraGestor_(slide, W, H, secao)) feito.push('trilha em 0' + secao);

  // 5b. Tabela em print ou tabela simples → tabela no padrão do deck (33_GestorRedesenho.gs).
  const red = ORC_GESTOR_REDESENHOS.filter(r => r.mega === mega && nt.indexOf(r.titulo) >= 0)[0];
  if (red) _orcRedesenharGestor_(slide, W, H, red, feito, avisos);

  // 6. O que parece molde esquecido: só avisa.
  const tudo = shapes.map(txt).join(' | ');
  if (ORC_GESTOR_MOLDE.some(re => re.test(tudo)) && !/lavagem|limpeza|telha/i.test(nt))
    avisos.push('a descrição é a do molde da limpeza das telhas do Esteio');
  if (/R\$\s*50\.000,00/.test(tudo) && /Fachadas armazém A e B2/.test(tudo) && !/telha/i.test(nt))
    avisos.push('CONTA/LOCAL/VALOR ainda do molde (Fachadas armazém A e B2, R$ 50.000)');

  const chave = _orcNorm_(mega.replace(/^Mega /, '')).toUpperCase();
  try {
    slide.getNotesPage().getSpeakerNotesShape().getText().setText(_orcMarcaFotos_(chave) + '\n' +
      'Revisado por gerarSlidesGestorRevisados() (29_GestorRevisado.gs) a partir do slide ' + nV3 + ' da v3: ' +
      (feito.join('; ') || 'sem mudança') +
      '. Não apague a primeira linha destas anotações.');
  } catch (e) { Logger.log('Anotações do slide revisado não gravadas: ' + e.message); }
  return { v3: nV3, mega: mega, titulo: titulo, feito: feito, avisos: avisos };
}

// Aplica um ORC_GESTOR_AJUSTES: o LOCAL, se ainda é o texto copiado de outro slide.
function _orcAjustarSlideGestor_(slide, W, shapes, a, campos, feito, avisos) {
  const sh = campos.local;
  if (!a.local || !sh) return;
  let atual = '';
  try { atual = sh.getText().asString().replace(/\n$/, '').trim(); } catch (e) { return; }
  if (atual === a.local || (a.localEra || []).indexOf(atual) < 0) return;
  sh.getText().setText(a.local);
  feito.push('LOCAL "' + atual + '" → "' + a.local + '" (copiado de outro slide)');
}

// Troca a imagem da moldura (a do slide inteiro) pela do molde de fotos com a trilha na seção dada. Sem a imagem na
// pasta, fica a que estava. Devolve true se trocou.
function _orcTrocarMolduraGestor_(slide, W, H, secao) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  const spec = _orcSpecMoldura_({ header: true, secao: secao,
    cards: [{ x: MX, y: 74, w: W - MX * 2, h: H - 31 - 74, cor: DS.colors.cardBg, borda: DS.colors.lines, peso: 0.75 }] }, W, H);
  const img = _orcImagemDaPasta_('MOLDURA - ' + _orcAssinatura_(spec) + '.png');
  if (!img) { Logger.log('Moldura da seção ' + secao + ' (' + _orcAssinatura_(spec) + ') não está na pasta — fica a de antes.'); return false; }
  const velha = slide.getPageElements().filter(el => el.getPageElementType() === SlidesApp.PageElementType.IMAGE &&
                                                    el.getWidth() >= W * 0.9 && el.getHeight() >= H * 0.9)[0];
  if (!velha) return false;
  velha.remove();
  slide.insertImage(img).setLeft(0).setTop(0).setWidth(W).setHeight(H).sendToBack();
  return true;
}
