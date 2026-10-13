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

// Valores e campos conferidos com os modelos 090/070 (12/10/2026, 22h). Guilherme: "o resto vamos fazer mas deixe um
// selo sinalizando e depois aviso se tiver ajustes"; a linha de vida do Esteio saiu do orçamento mas fica para a
// defesa. Por slide: titulo (trecho do título sem acento, minúsculo) + mega; era = o(s) VALOR(es) que o slide tinha
// (só troca se ainda for um deles — se o gestor mudou, só avisa); valor = o do orçamento; selo = o texto do selo
// (sem ele: "VALOR DO ORÇAMENTO · ERA …"; nada nos centavos, semSelo); conta/local = textos novos, trocados só se o
// campo ainda tem o texto copiado de outro slide (contaEra/localEra); interno/desc/legenda = no lugar do texto do
// molde; secao = trilha; tabela = linhas da tabela (sem o cabeçalho e o total, que vêm em cabecalho/total), só
// junto com a troca do VALOR; nota = vai para as anotações.
const ORC_GESTOR_AJUSTES = [
  { titulo: 'instalacao de linha de vida vertical', mega: 'Mega Esteio', selo: '⚠ FORA DO ORÇAMENTO 2027 · PARA DECISÃO',
    nota: 'a instalação nos Armazéns A e B2 está com R$ 1 no 090 (fora do Orç 2027); o slide fica para a defesa' },
  { titulo: 'comunicacao horizontal', mega: 'Mega Itajaí', era: 'R$ 105.844,28', valor: 'R$ 95.844,28',
    local: 'Vias, docas, bolsão e calçadas', localEra: ['Pavimentação Intertravada'],
    cabecalho: ['LOCAL', 'TAMANHO (M2)', 'FREQUÊNCIA', 'TOTAL NO ANO'],
    tabela: [['ÁREA DE ACESSO', '100', 'SEMESTRAL (2X)', 'R$ 7.800,00'],
             ['EMB. DESEMBARQ.', '20', 'SEMESTRAL (2X)', 'R$ 1.560,00'],
             ['PONTE', '22,2', 'SEMESTRAL (2X)', 'R$ 1.731,60'],
             ['BOLSÃO', '300', 'ANUAL', 'R$ 11.700,00'],
             ['CALÇADAS', '476,69', 'ANUAL', 'R$ 26.218,14'],
             ['VIAS DE CARRO', '1.059', 'ANUAL', 'R$ 41.334,54'],
             ['TACHINHAS', 'N/A (100 und)', 'SOB DEMANDA', 'R$ 5.500,00']],
    total: ['TOTAL', '1.977,89', 'N/A', 'R$ 95.844,28'],
    nota: 'no 090 são 7 itens que somam R$ 95.844,28 (o semestral entra 2× no ano); o slide dizia R$ 105.844,28' },
  { titulo: 'comunicacao horizontal', mega: 'Mega Curitiba', era: ['R$ —', 'R$ 64.758,16'], valor: 'R$ 75.758,16',
    local: 'Vias, docas, bolsão e lombadas', localEra: ['Armazém, área ou equipamento', 'Pavimento Intertravado'],
    interno: 'PLANO DE MANUTENÇÃO CVISH', legenda: '',
    desc: 'Plano de manutenção contínua da comunicação horizontal, a R$ 39/m² de demarcação viária.\n\n' +
          'a) Semestral: rua principal (descida), acessos, embarque e desembarque, rotatória, rua lateral dos ' +
          'Armazéns 1 e 2 e lombadas\nb) Anual: frente de docas dos Armazéns 1 a 7 e bolsão de pesados\n' +
          'c) Sob demanda: tachinhas refletivas (R$ 55 por unidade)',
    cabecalho: ['LOCAL', 'TAMANHO (M2)', 'FREQUÊNCIA', 'TOTAL NO ANO'],
    tabela: [['FRENTE DE DOCAS', '539,5', 'ANUAL', 'R$ 21.040,50'],
             ['RUA PRINCIPAL', '113,65', 'SEMESTRAL (2X)', 'R$ 8.864,70'],
             ['ACESSOS + EMBARQUE', '137,36', 'SEMESTRAL (2X)', 'R$ 10.714,08'],
             ['ROTATÓRIA + LOMBADAS', '61,56', 'SEMESTRAL (2X)', 'R$ 4.801,68'],
             ['RUA LATERAL AMZ 1/2', '27,4', 'SEMESTRAL (2X)', 'R$ 2.137,20'],
             ['BOLSÃO DE PESADOS', '300', 'ANUAL', 'R$ 11.700,00'],
             ['TACHINHAS', 'N/A (300 und)', 'SOB DEMANDA', 'R$ 16.500,00']],
    total: ['TOTAL', '1.179,47', 'N/A', 'R$ 75.758,16'],
    nota: 'slide ainda no molde: descrição, LOCAL, VALOR e tabela preenchidos com os 9 itens do 090 de Curitiba ' +
          '(a tabela tinha o total e as vias do Itajaí)' },
  { titulo: 'impermeabilizacao lajes subestacoes', mega: 'Mega Itajaí', era: 'R$ 171.230,00', valor: 'R$ 103.084,76',
    nota: 'no 090: casa de bombas R$ 39.426,11 + Subestação 2 R$ 63.658,65; a Subestação 1 não está no orçamento' },
  { titulo: 'copa e cozinha', mega: 'Mega Itajaí', era: 'R$ 21.785,00', valor: 'R$ 21.155,00',
    nota: 'no 090: adequação da copa R$ 18.300 + geladeira R$ 2.855' },
  { titulo: 'torniquetes digicon', mega: 'Mega Itajaí', era: 'R$ 205.500,00', valor: 'R$ 206.700,00',
    nota: 'no 090: 3 torniquetes TX1500 Digicon inox, parcelado em 3×' },
  { titulo: 'implantacao a sense', mega: 'Mega Itajaí', era: 'R$ 15.000,00/mês (Financiamento)',
    valor: 'R$ 12.500,00/mês · R$ 150.000,00 no ano', conta: 'Segurança e vigilância', contaEra: ['Manutenção de imóveis'],
    local: 'Perímetro externo (6 zonas)', localEra: ['Escada Cobertura (Fase 1, 2 e 3)'],
    secao: 5, nota: 'no 070: parcela Alfa Sense (fibra sensitiva), R$ 150.000 no ano, na conta Segurança e Vigilância' },
  { titulo: 'chicote eletrico do trator', mega: 'Mega Esteio', era: 'R$ 54.978,55', valor: 'R$ 54.978,56', semSelo: true },
  { titulo: 'reforma reservatorio spk', mega: 'Mega Itajaí', era: 'R$ 179.543,06', valor: 'R$ 179.543,16', semSelo: true },
  // Curitiba (12/10, 22h — o gestor ainda preenchendo: LOCAL e VALOR copiados do slide anterior).
  { titulo: 'paisagismo restaurante', mega: 'Mega Curitiba', local: 'Restaurante industrial', localEra: ['Pavimento Intertravado'] },
  { titulo: 'defensas entre platos', mega: 'Mega Curitiba', era: 'R$ 216.000,00', valor: 'R$ 146.030,29',
    local: 'Platôs 1, 2 e 3', localEra: ['Pavimento Intertravado'],
    nota: 'no 090: defensas metálicas platôs 1 e 2 R$ 44.823,85 + platôs 2 e 3 R$ 101.206,44' },
  { titulo: 'implantacao torniquete 4', mega: 'Mega Curitiba', era: 'R$ 216.000,00', valor: 'R$ 86.550,00',
    local: 'Acessos', localEra: ['Pavimento Intertravado'],
    nota: 'no 090: torniquete Digicon TX1500 inox R$ 68.900 + mão de obra do 4º torniquete R$ 17.650' },
  { titulo: 'automacao leituras', mega: 'Mega Curitiba', era: 'R$ 68.715,00', valor: 'R$ 87.591,26',
    local: 'Medidores de água e energia', localEra: ['Armazém 1 a 9'],
    nota: 'no 090: hidrômetros R$ 11.914 + RS2000 Modbus R$ 40.107,26 + 22 medidores R$ 21.582 + instalação R$ 4.400 + ' +
          'kit RS2000 R$ 9.588 (materiais de informática); a mensalidade do CAS, R$ 15.300 no ano, está no 070' }
];

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

function _orcRevisarSlideGestor_(slide, W, H, mega, nV3) {
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

  // 3. Título interno copiado de outro slide: nenhuma palavra (5+ letras) em comum com o título.
  const palavras = s => _orcNorm_(s).split(/[^a-z0-9]+/).filter(p => p.length >= 5);
  const pt = palavras(titulo);
  const interno = shapes.filter(sh => sh.getLeft() > W * 0.6 && sh.getTop() > 80 && sh.getTop() < 120)
    .filter(sh => { const t = txt(sh).trim(); return t && t === t.toUpperCase() && /[A-ZÀ-Ú]{4}/.test(t); })
    .sort((a, b) => a.getTop() - b.getTop())[0];
  if (interno && titulo) {
    const it = txt(interno).trim();
    if (!palavras(it).some(p => pt.indexOf(p) >= 0)) {
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
  const secao = (ajuste && ajuste.secao) || (seguranca ? 5 : 4);
  if (_orcTrocarMolduraGestor_(slide, W, H, secao)) feito.push('trilha em 0' + secao);

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
      (feito.join('; ') || 'sem mudança') + (avisos.length ? '. CONFERIR: ' + avisos.join('; ') : '') +
      '. Não apague a primeira linha destas anotações.');
  } catch (e) { Logger.log('Anotações do slide revisado não gravadas: ' + e.message); }
  return { v3: nV3, mega: mega, titulo: titulo, feito: feito, avisos: avisos };
}

// Aplica um ORC_GESTOR_AJUSTES no slide: campos, descrição, tabela, VALOR (só se ainda for o "era") e o selo no
// canto do cabeçalho (o mesmo lugar do ⚠ REVISAR dos slides gerados). campos = { conta, local, valor } (formas).
function _orcAjustarSlideGestor_(slide, W, shapes, a, campos, feito, avisos) {
  const txt = sh => { try { return sh.getText().asString().replace(/\n$/, ''); } catch (e) { return ''; } };
  const trocar = (sh, novo, rotulo) => {
    if (!sh) { avisos.push(rotulo + ' não encontrado no slide'); return; }
    if (txt(sh).trim() === novo) return;
    feito.push(rotulo + ' "' + txt(sh).trim() + '" → "' + novo + '"');
    sh.getText().setText(novo);
  };
  // CONTA/LOCAL: só se ainda têm o texto copiado de outro slide (o gestor pode ter corrigido de outro jeito).
  const campo = (sh, novo, eras, rotulo) => {
    if (!novo) return;
    if (!sh) { avisos.push(rotulo + ' não encontrado no slide'); return; }
    const atual = txt(sh).trim();
    if (atual === novo) return;
    if (eras && eras.indexOf(atual) < 0) { avisos.push(rotulo + ' é "' + atual + '"; sugerido "' + novo + '" (não troquei)'); return; }
    trocar(sh, novo, rotulo);
  };
  campo(campos.conta, a.conta, a.contaEra, 'CONTA');
  campo(campos.local, a.local, a.localEra, 'LOCAL');
  const porTexto = re => shapes.filter(sh => re.test(txt(sh).trim()))[0] || null;
  if (a.desc !== undefined) trocar(porTexto(/^Escreva aqui a descrição/), a.desc, 'descrição');
  if (a.interno !== undefined) trocar(porTexto(/^O QUE MOSTRAR$/), a.interno, 'título interno');
  if (a.legenda !== undefined) { const l = porTexto(/^Legenda: data e local da foto\.?$/); if (l) trocar(l, a.legenda, 'legenda do molde'); }

  // VALOR: troca só se o slide ainda tem o valor conferido; se o gestor já mudou, avisa.
  let trocou = false, anterior = '';
  if (a.valor) {
    const v = campos.valor, atual = v ? txt(v).trim() : '';
    if (!v) avisos.push('VALOR não encontrado no slide (o do orçamento é ' + a.valor + ')');
    else if ([].concat(a.era).indexOf(atual) >= 0) {
      v.getText().setText(a.valor); trocou = true; anterior = atual; feito.push('VALOR ' + atual + ' → ' + a.valor + ' (orçamento)');
    }
    else if (atual !== a.valor) avisos.push('VALOR no slide é ' + atual + '; no orçamento, ' + a.valor + ' (não troquei)');
  }

  // Tabela: cabeçalho + linhas + total, se o tamanho bate (o gestor pode ter mudado a tabela).
  if (a.tabela && trocou) {
    const linhas = [a.cabecalho].concat(a.tabela, [a.total]);
    const tb = (slide.getTables ? slide.getTables() : []).filter(t => t.getNumColumns() === 4)[0];
    if (!tb) avisos.push('tabela não encontrada (a do orçamento soma ' + a.total[3] + ')');
    else if (tb.getNumRows() !== linhas.length) avisos.push('tabela com ' + tb.getNumRows() + ' linhas, esperava ' + linhas.length + ' (não troquei)');
    else {
      let n = 0;
      linhas.forEach((l, r) => l.forEach((v, c) => {
        const cel = tb.getCell(r, c).getText();
        if (cel.asString().replace(/\n$/, '').trim() !== v) { cel.setText(v); n++; }
      }));
      if (n) feito.push('tabela com os itens do orçamento (' + n + ' células)');
    }
  }

  // Selo: ajuste de valor (com o valor antigo) ou o texto do ajuste.
  const selo = a.selo || (trocou && !a.semSelo
    ? (/^R\$\s*—$/.test(anterior) ? '⚠ PREENCHIDO PELO ORÇAMENTO · CONFERIR' : '⚠ VALOR DO ORÇAMENTO · ERA ' + anterior) : '');
  if (selo) {
    const DS = CR_DESIGN_SYSTEM, w = 200, x = W - DS.layout.marginX - w, y = 47;
    _orcRet_(slide, x, y, w, 14, _ORC_COR_REVISAR.borda, { redondo: true });
    _orcUmaLinha_(slide, x, y, w, 14, selo,
      { align: 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6, fsMin: 5, cortar: true });
    feito.push('selo "' + selo + '"');
  }
  if (a.nota) avisos.push(a.nota);
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
