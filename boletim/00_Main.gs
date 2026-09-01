/**
 * ARQUIVO: 00_Main.gs
 * DESCRIÇÃO: Orquestrador do boletim — os três escopos num arquivo só.
 *
 * Junta o que eram 99_main.gs, 99_main_facilities.gs, 99_main_hangar.gs e
 * 99_main_todas.gs. Os quatro repetiam a mesma estrutura (limpa → aplica tema
 * → desenha slide por slide → restaura tema) e divergiam só na LISTA de
 * slides e no tema. Agora a lista é dado (BOLETINS) e o motor é um só.
 *
 * O QUE ISSO CONSERTA, além de tirar 3 arquivos:
 *   · um slide que falhava derrubava o boletim inteiro, porque o try/catch
 *     era um só em volta de tudo. Agora cada passo é isolado — boletim com um
 *     slide faltando é melhor que boletim que não saiu.
 *   · o log dizia "gerado com sucesso" mesmo depois de estourar no meio.
 *   · o tema volta no `finally`, então erro no meio não deixa o próximo
 *     boletim saindo com a cor da marca errada.
 */

// ==========================================================================
// OS TRÊS ESCOPOS
// ==========================================================================
// `slides` é a sequência exata que cada boletim gera. `tema`/`restaurar` são
// os nomes das funções de Config.gs (guardados como texto para o objeto poder
// ser declarado antes delas — o Apps Script iça `function`, mas não a ordem
// de avaliação de um `const`).
const BOLETINS = {
  COMPLETO: {
    nome: 'Propriedades & Facilities',
    tema: null,
    slides: [
      ['Capa',                    function () { gerarSlide01_Capa(); }],
      ['Índice',                  function () { gerarSlide02_Indice(); }],
      ['Overview Executivo',      function () { gerarSlide03_OverviewExecutivo(); }],
      ['Capa Manutenções',        function () { gerarCapaManutencoes(); }],
      ['Estratificação',          function () { gerarSlide04_Manutencoes(); }],
      ['Manutenção Corretiva',    function () { gerarSlide05_QuadroManutencao(); }],
      ['Manutenção Preventiva',   function () { gerarSlide06_Preventivas(); }],
      ['Corretivas / Empreend.',  function () { gerarSlide07_CorretivasEmpreendimento(); }],
      ['Preventivas / Empreend.', function () { gerarSlide08_PreventivasEmpreendimento(); }],
      ['Capa Controle de Acesso', function () { gerarCapaControleAcesso(); }],
      ['Controle de Acesso',      function () { gerarSlide09_ControleAcesso(); }],
      ['Gráficos de Acesso A',    function () { gerarSlide10A_GraficosAcesso(); }],
      ['Gráficos de Acesso B',    function () { gerarSlide10B_GraficosAcesso(); }],
      ['Capa Sustentabilidade',   function () { gerarCapaSustentabilidade(); }],
      ['Sustentabilidade',        function () { gerarSlide11_Sustentabilidade(); }],
      ['Capa Final',              function () { gerarCapaFinal(); }],
      ['Checklist',               function () { gerarSlideChecklist(); }]
    ]
  },

  FACILITIES: {
    nome: 'MEGAS Centros Logísticos',
    tema: 'MEGA',
    slides: [
      ['Capa',                    function () { gerarSlide01_Capa('Boletim\nMEGAS CENTROS\nLOGÍSTICOS', 'Expansão & Eficiência Capital Realty', 'mega'); }],
      ['Índice',                  function () { gerarSlide02_Indice(); }],
      ['Overview Executivo',      function () { gerarSlide03_OverviewExecutivo(); }],
      ['Capa Manutenções',        function () { gerarCapaManutencoes(); }],
      ['Estratificação',          function () { gerarSlide04_Manutencoes(true); }],
      ['Manutenção Corretiva',    function () { gerarSlide05_QuadroManutencao_Facilities(); }],
      ['Manutenção Preventiva',   function () { gerarSlide06_Preventivas_Facilities(); }],
      ['Corretivas / Empreend.',  function () { gerarSlide07_CorretivasEmpreendimento(true); }],
      ['Preventivas / Empreend.', function () { gerarSlide08_PreventivasEmpreendimento(true); }],
      ['Capa Controle de Acesso', function () { gerarCapaControleAcesso(); }],
      ['Controle de Acesso',      function () { gerarSlide09_ControleAcesso(); }],
      ['Gráficos de Acesso A',    function () { gerarSlide10A_GraficosAcesso(); }],
      ['Gráficos de Acesso B',    function () { gerarSlide10B_GraficosAcesso(); }],
      ['Capa Sustentabilidade',   function () { gerarCapaSustentabilidade(); }],
      ['Sustentabilidade',        function () { gerarSlide11_Sustentabilidade(); }],
      ['Capa Final',              function () { gerarCapaFinal(); }]
    ]
  },

  HANGAR: {
    nome: 'Hangar VIP',
    tema: 'HANGAR',
    slides: [
      ['Capa',                    function () { gerarSlide01_Capa('Boletim\nHangar VIP', 'Operação Hangar — Capital Realty', 'hangar'); }],
      ['Índice',                  function () { gerarSlide02_Indice(); }],
      ['Capa Manutenções',        function () { gerarCapaManutencoes(); }],
      ['Manutenção Corretiva',    function () { gerarSlide05_QuadroManutencao_Hangar(); }],
      ['Manutenção Preventiva',   function () { gerarSlide06_Preventivas_Hangar(); }],
      ['Corretivas / Empreend.',  function () { gerarSlide07_CorretivasEmpreendimento(false, 'HANGAR VIP'); }],
      ['Preventivas / Empreend.', function () { gerarSlide08_PreventivasEmpreendimento(false, 'HANGAR VIP'); }],
      ['Capa Final',              function () { gerarCapaFinal(); }]
    ]
  }
};


// ==========================================================================
// PONTOS DE ENTRADA
// ==========================================================================
// O menu "Selecionar função" do editor só lista funções SEM parâmetro (e
// esconde as que começam ou terminam com "_"), então cada recorte que alguém
// vai querer rodar precisa da sua própria função sem argumento.

/** Os três boletins em sequência, no mesmo arquivo de apresentação. */
function gerarTodasApresentacoes() {
  limparApresentacao();
  const erros = []
    .concat(_bolGerar_('COMPLETO',   { semLimpar: true }))
    .concat(_bolGerar_('FACILITIES', { semLimpar: true }))
    .concat(_bolGerar_('HANGAR',     { semLimpar: true }));
  Logger.log(erros.length
    ? '⚠️ Terminou com ' + erros.length + ' problema(s). Separe os slides em Arquivo > Mover slides.'
    : '🎉 Os três boletins foram gerados. Separe os slides em Arquivo > Mover slides.');
  return erros;
}

// SEM PARÂMETRO de propósito: o menu do editor não lista função que declara
// argumento, e é por estas três que se roda um boletim individual. Quem
// precisa da variante "não limpar antes" é gerarTodasApresentacoes, que chama
// o motor direto.
function gerarApresentacaoCompleta()   { return _bolGerar_('COMPLETO'); }
function gerarApresentacaoFacilities() { return _bolGerar_('FACILITIES'); }
function gerarApresentacaoHangar()     { return _bolGerar_('HANGAR'); }


// ==========================================================================
// MOTOR
// ==========================================================================

// Aplica o tema do escopo, se houver. Os nomes ficam aqui, num lugar só, em
// vez de espalhados pelos mains.
function _bolAplicarTema_(tema) {
  if (tema === 'MEGA')   aplicarTemaMega();
  if (tema === 'HANGAR') aplicarTemaHangar();
}

function _bolEscopo_(chave) {
  const e = BOLETINS[chave];
  if (!e) {
    throw new Error('Escopo "' + chave + '" não existe. Disponíveis: ' +
                    Object.keys(BOLETINS).join(', ') + '.');
  }
  return e;
}

/**
 * Gera um boletim inteiro. Cada slide é isolado: o que falha registra o erro
 * e não impede os outros — boletim com um slide faltando é melhor que boletim
 * que não saiu. Devolve a lista de erros (vazia = tudo certo).
 */
function _bolGerar_(chave, opts) {
  opts = opts || {};
  const escopo = _bolEscopo_(chave);
  const erros = [];

  Logger.log('▶ Boletim ' + escopo.nome + ' — ' + escopo.slides.length + ' slide(s)');
  if (!opts.semLimpar) limparApresentacao();

  try {
    _bolAplicarTema_(escopo.tema);
    escopo.slides.forEach(function (passo) {
      try {
        passo[1]();
        Logger.log('  ✓ ' + passo[0]);
      } catch (e) {
        erros.push(escopo.nome + ' / ' + passo[0] + ': ' + e.message);
        Logger.log('  ✗ ' + passo[0] + ' — ' + e.message);
      }
    });
  } finally {
    // Sempre restaura: sem isto, um erro no meio deixaria o PRÓXIMO boletim
    // saindo com as cores da marca anterior.
    restaurarTemaCapital();
  }

  // Relatório honesto — o log antigo dizia "gerado com sucesso" mesmo depois
  // de estourar no meio.
  const ok = escopo.slides.length - erros.length;
  Logger.log(erros.length
    ? '⚠️ ' + escopo.nome + ': ' + ok + ' de ' + escopo.slides.length + ' slide(s). Com erro:\n  · ' + erros.join('\n  · ')
    : '✅ ' + escopo.nome + ': ' + ok + ' slide(s) gerados.');
  return erros;
}


/**
 * Gera UM slide sozinho, no escopo pedido — para conferir um ajuste sem
 * reprocessar o boletim inteiro. É o que os atalhos `ver*` dos arquivos de
 * slide usam (ex.: verManutencaoCorretivaFacilities).
 *
 * Limpa a apresentação: o objetivo é olhar aquele slide, não acrescentá-lo ao
 * fim de um boletim já montado.
 */
function _bolVerSlide_(chave, nomePasso) {
  const escopo = _bolEscopo_(chave);
  const passo = escopo.slides.filter(function (p) { return p[0] === nomePasso; })[0];
  if (!passo) {
    throw new Error('O boletim ' + escopo.nome + ' não tem o slide "' + nomePasso + '". Tem: ' +
                    escopo.slides.map(function (p) { return p[0]; }).join(' | ') + '.');
  }

  limparApresentacao();
  try {
    _bolAplicarTema_(escopo.tema);
    passo[1]();
    Logger.log('✅ ' + nomePasso + ' — ' + escopo.nome);
  } finally {
    restaurarTemaCapital();
  }
}


/** Apaga todos os slides da apresentação. */
function limparApresentacao() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slides = presentation.getSlides();
  for (let i = slides.length - 1; i >= 0; i--) slides[i].remove();
  Logger.log('Apresentação limpa. Pronta para gerar novos slides.');
}
