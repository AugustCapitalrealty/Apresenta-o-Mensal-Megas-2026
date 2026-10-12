/**
 * ARQUIVO: 28_Moked.gs
 * SLIDES:  Implantação Moked (Mega Esteio) — os nove slides do gestor na v3
 *          (22 a 30, 12/10/2026) refeitos no estilo dele: o molde de fotos de
 *          26_Fotos.gs (conteúdo à esquerda, linha vertical e o texto à
 *          direita), com o subtítulo preenchido, a trilha em 05 Segurança e o
 *          português revisto.
 *            22 a 27 — os prints do relatório da Moked, agora nativos;
 *            28 e 29 — cópia do slide da v3 (as fotos e as fichas com o recorte
 *                      e a posição do gestor), com o texto redesenhado;
 *            30      — cláusula 3.4 e o rateio do contrato pela área (o rateio
 *                      que o gestor corrigiu em 12/10/2026).
 *
 *   ▸ gerarSlidesMoked()    → apresentação SEPARADA "MOKED - SLIDES PARA A v3",
 *                             na pasta do orçamento: criada na 1ª vez; nas
 *                             seguintes, refeita inteira. A v3 só é LIDA (os
 *                             slides 28 e 29 são copiados dela); o gestor copia
 *                             para a v3 os slides que quiser.
 *   ▸ exportarSlidesMoked() → PNG de cada slide em "_slides-moked" (conferência).
 *
 * Números: relatório "Registros RS 2CONTROL – P311A e P311B" da Moked, emitido
 * em 09/10/2026 (01 - CONTROLE DA APRESENTAÇÃO/MOKED - REFERÊNCIA), o painel
 * semanal de sistemas do MokLog (laudo de 04/10/2026) do slide 27 da v3 e o
 * contrato do slide 30. Os slides levam nas anotações a marca dos slides do
 * gestor (26_Fotos.gs): colados num deck do gerador, a geração não os apaga.
 */

const ORC_MOKED = {
  nome: 'MOKED - SLIDES PARA A v3 (Implantação Moked · Mega Esteio)',
  prop: 'ORC_MOKED_DECK_ID',
  titulo: 'Implantação Moked | Rotina de Segurança',
  secao: 5,   // trilha do topo: 05 Segurança
  rodape: 'Fonte: Moked do Brasil — relatório de 09/10/2026 (2CONTROL RS|RD e MokLog CheckTest) · Mega Esteio',

  // 1. Registros no 2CONTROL RS|RD, do primeiro registro de cada projeto até 09/10/2026.
  registros: [[3643, 'registros nos dois Megas'],
              [2891, 'Mega Curitiba (P311A) · mar/2023 a 09/10/2026'],
              [752, 'Mega Itajaí (P311B) · 15/04/2025 a 09/10/2026']],
  // Ocorrências por ano: [ano, Curitiba, Itajaí] (null = o projeto ainda não existia).
  porAno: [['2023', 136, null], ['2024', 414, null], ['2025', 521, 238], ['2026 até 09/10', 358, 215]],
  // Texto do gestor (slide 22 da v3), com o português revisto. "Por dia" e não "por dia útil": são 3.643
  // registros em 1.862 dias-Mega (Curitiba desde mar/2023, Itajaí desde 15/04/2025) = 1,96 por Mega por dia.
  textoRegistros: 'São cerca de 2 registros situacionais por Mega por dia. Eles são elaborados e reportados pelo ' +
                  'líder da segurança e acompanhados pela Moked.\n\nVão desde colisões em cancelas ou equipamentos e ' +
                  'tentativas de acesso não autorizado até a entrada de veículos policiais ou de emergência — ou ' +
                  'qualquer outra situação atípica para a boa convivência e o funcionamento do imóvel.',

  // 2. Registros por área: [área, Curitiba, Itajaí].
  areas: [['Ocorrência', 1429, 453], ['Outro', 967, 146], ['Evento', 246, 81], ['Sistemas Eletrônicos', 151, 49],
          ['Reclamação', 44, 2], ['Relatório', 27, 16], ['Pendências', 27, 5]],

  // 3. Perfil das ocorrências: [tema, Curitiba, Itajaí, contagem mínima (≥)].
  perfil: [['Colisões / batidas de veículo', 143, 102, true], ['Cancelas, totens e portões', 106, 79, true],
           ['Saúde / acionamento de ambulância', 121, 18, true], ['Fumaça / princípio de incêndio', 37, 8, true],
           ['Acesso irregular', 30, 33, true], ['Falhas técnicas e disparos de alarme', 86, 33, false],
           ['Furtos', 4, 14, true], ['Acionamento de polícia', 11, 3, true]],
  // Ocorrências lançadas como "Outros": [Curitiba, Itajaí] de [total de ocorrências].
  outros: [[1112, 1429], [302, 453]],

  // 4. MokLog CheckTest (mai–out/2026): [controle, [número, detalhe] Curitiba, [número, detalhe, atenção] Itajaí].
  moklog: [
    ['Sistemas · relatório semanal (23 itens)', ['21 relatórios · 95–100% conformes', 'desde 24/05/2026'],
                                                ['20 relatórios · 97–99% conformes', 'desde 24/05/2026']],
    ['Acesso de ambulância', ['25 atendimentos desde 08/08', '21 leves, 1 moderado, 1 simulado'],
                             ['17 atendimentos desde 06/08', '12 leves, 5 moderados · 13 à noite']],
    ['Quedas de energia', ['6 quedas desde 13/07', 'a maior, de 18h35, em 31/08'],
                          ['7 quedas desde 06/08', 'a maior, de 10h13, em 06/08']],
    ['Iluminação · teste quinzenal', ['297 pontos · 90,9% operantes', '27 pontos deficientes'],
                                     ['260 pontos · 81,9% operantes', '47 pontos deficientes', true]],
    ['Bolsão · fiscalização de placas', ['1.191 avistamentos', '62 em alerta · 25 críticos · 1 bloqueio'],
                                        ['1.559 avistamentos', '112 em alerta · 53 críticos · 3 bloqueios']],
    ['Ronda · teste perimetral', ['40 testes registrados', 'diurno e noturno, até 09/10/2026'],
                                 ['Ronda registrada por turno', 'com alerta de plantão não enviado']],
    ['Equipe', ['11 ativos · 5 de dia, 6 à noite', '4 líderes, 3 porteiros CCO, 4 rondas'], ['16 ativos', '']]
  ],
  textoMokLog: 'Desde mai/2026, a Moked complementa o RS com o MokLog CheckTest, aplicativo próprio de checklists e ' +
               'registros operacionais. Ele cobre o que o RS não detalha: estado dos sistemas, atendimentos de saúde, ' +
               'rede elétrica, iluminação, pátio e equipe.',
  atencaoMokLog: '• Iluminação do Mega Itajaí: 81,9% operante, com 47 pontos deficientes\n' +
                 '• Placas críticas recorrentes nos bolsões\n' +
                 '• Brigada não aplicada para 8 integrantes do Mega Curitiba — pendência a tratar com a contratada',
  treinamentos: 34,   // ficha de equipe do Mega Curitiba no período

  // 5. Frentes de atuação da Moked: [frente, o que foi feito].
  frentes: [
    ['Registro e controle da operação', '2CONTROL RS|RD desde mar/2023 no Mega Curitiba e abr/2025 no Mega Itajaí; ' +
      'MokLog CheckTest desde mai/2026, com sistemas, saúde, energia, iluminação, bolsão, ronda e equipe.'],
    ['Apuração e fiscalização', 'Apuração de eventos críticos, como a invasão perimetral de fev/2026, inclusive das ' +
      'falhas da equipe de segurança, com retorno ao contratante. Auditoria da troca do controlador diurno por vigilante ' +
      'armado no Mega Curitiba.'],
    ['Diagnósticos e documentação', 'Diagnóstico situacional de segurança do Mega Curitiba; POPs e DDS padronizados; ' +
      'retreinamento das lideranças e mapeamento da equipe.'],
    ['Projetos de segurança eletrônica', 'POC perimetral; fibra sensora Alpha Sense no Mega Curitiba, prevista também ' +
      'para o Mega Itajaí com CFTV de cerca virtual e análise por IA; contratação de segurança eletrônica, SLA e ' +
      'reconhecimento facial nos torniquetes.'],
    ['Presença em campo', 'Visitas aos empreendimentos, reuniões com a administração e a contratada de segurança e ' +
      'canal direto com Facilities para ocorrências e decisões.']
  ],
  caso: 'Registro 168-19879, Mega Curitiba. Na ronda perimetral, a equipe constatou cortes na cerca entre os ' +
        'perímetros 1 e 2, e a varredura achou dois pontos de arrombamento nos fundos do Armazém 5. O responsável por ' +
        'uma obra próxima relatou furto de equipamentos eletrônicos. O CCO buscou as imagens no CFTV, e o local foi ' +
        'registrado em foto, bodycam e CFTV.',
  casoMoked: 'Como consultoria do proprietário, fiscalizou o evento e apurou as falhas, inclusive as operacionais da ' +
             'própria equipe de segurança, e levou as conclusões ao contratante. A apuração se apoiou no histórico de ' +
             'registros da plataforma.',

  // 6. Painel semanal de sistemas do MokLog (print do slide 27 da v3; o Mega não aparece no print).
  painel: {
    rodape: 'Fonte: Moked do Brasil — MokLog CheckTest, relatório semanal de sistemas (06/09 a 04/10/2026) · Mega Esteio',
    semanas: ['06/09', '13/09', '19/09', '20/09', '27/09', '04/10'],
    // Estado em cada semana: O operacional, P parcial, I inoperante, - sem registro.
    linhas: [['Alpha Sense · zonas 04 a 08', 'PO-OOO', 'Resolvida'],
             ['CFTV · câmeras', 'IIIIII', 'Persistente'],
             ['Cerca elétrica · zona 01', 'OIIIOO', 'Resolvida'],
             ['Cerca elétrica · zona 02', 'OIOOOO', 'Resolvida'],
             ['Eclusa do CCO · porta 02', '-POPPO', 'Resolvida'],
             ['Bodycam (3 unidades)', 'OOOOIO', 'Resolvida']],
    semFalha: '217 dispositivos sem nenhuma ocorrência nas 6 semanas',
    semFalhaTexto: 'Entre eles, 134 câmeras do CFTV, 12 intercomunicadores de totem, 7 materiais operacionais, ' +
                   '6 botoeiras e portões de acesso, 6 leitores de QR Code, 5 cancelas, 5 dilaceradores, 5 portões e ' +
                   '5 itens do SDAI (incêndio); os outros 32 estão em 13 grupos menores.',
    classe: 'MODERADO',
    escala: ['BAIXO', 'MODERADO', 'ELEVADO', 'CRÍTICO'],
    porQue: 'O motor de risco da Moked classificou o CFTV em MODERADO: 6 de 140 câmeras estão inoperantes, há até ' +
            '5 dias. Mais de 5 câmeras fora já põem o piso em MODERADO; não há tempo de falha, proporção ou câmeras ' +
            'de perímetro que levem a ELEVADO.',
    base: '229 de 235 ativos · saúde 97%',
    falhas: '6 itens, todos no CFTV'
  },

  // 7. Gestão operacional (slide 28 da v3): a lista do gestor, com o português revisto. As fichas são do print dele.
  gestao: ['Aplicação de orientações e procedimentos', 'Desenvolvimento de POPs',
           'Acompanhamento junto à supervisão da empresa de segurança',
           'Registro e acompanhamento periódico de DDS (Diálogo Diário de Segurança)',
           'Treinamentos e testes operacionais', 'Treinamentos e testes de eventos atípicos',
           'Implantação do posto e integração do novo colaborador', 'Mapeamento do perfil e seleção inicial de candidatos',
           'Seleção e indicação de lideranças', 'Interface administrativa e operacional com a empresa de segurança',
           'Aplicação de treinamentos secos e molhados (estande)'],
  fichas: '11 colaboradores · referência 09/10/2026',
  // 8. Programa de treinamentos (slide 29 da v3).
  programa: ['Treinamento de Tiro Tático Israelense (TTI)', 'Teste de Aptidão Física (TAF)', 'Treinamento em estande'],
  // 9. Contrato (slide 30 da v3): cláusula 3.4 e o rateio pela área de 2027 de cada Mega (m²), como o gestor corrigiu.
  contrato: { mensal: 37633.50, clausula: 34500,
              areas: [['Mega Esteio', 53447.00], ['Mega Itajaí', 108165.91], ['Mega Curitiba', 133054.00]] },
  // Slides da v3 copiados (28 e 29): [título, um trecho do texto do gestor] para achar o slide.
  buscaV3: { 28: ['Treinamento e Capacitação', 'Aplicação de Orientações'],
             29: ['Treinamento e Capacitação', 'Programa Quadrimestral'] }
};

// Cores do painel de sistemas (estado da semana e tendência).
const ORC_MOKED_CORES = {
  P: { fundo: '#FDE68A', texto: '#92400E' }, I: { fundo: '#FCA5A5', texto: '#991B1B' },
  Resolvida: { fundo: '#ECFDF5', borda: '#10B981', texto: '#047857' },
  Persistente: { fundo: '#FEF2F2', borda: '#EF4444', texto: '#B91C1C' }
};

function gerarSlidesMoked() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(ORC_MOKED.prop);
  let deck = null;
  if (id) {
    try { deck = SlidesApp.openById(id); }
    catch (e) { Logger.log('A apresentação da Moked (' + id + ') não abriu — vou criar outra: ' + e.message); }
  }
  if (!deck) {
    deck = SlidesApp.create(ORC_MOKED.nome);
    try { DriveApp.getFileById(deck.getId()).moveTo(DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID)); }
    catch (e) { Logger.log('A apresentação ficou no Meu Drive (não foi para a pasta do orçamento): ' + e.message); }
    props.setProperty(ORC_MOKED.prop, deck.getId());
  }
  const n = _orcGerarMoked_(deck), url = deck.getUrl();
  _orcSalvarDeck_(deck, 'os slides da Moked');
  Logger.log('Pronto: ' + n + ' slides da Moked — ' + url + ' . Para usar na v3: copie o slide (Ctrl+C) e cole ' +
             'na v3 (Ctrl+V) no lugar do slide dele; o número está nas anotações de cada slide.');
}

function exportarSlidesMoked() {
  const id = PropertiesService.getScriptProperties().getProperty(ORC_MOKED.prop);
  if (!id) throw new Error('Rode gerarSlidesMoked() primeiro: a apresentação da Moked ainda não existe.');
  _orcExportarSlides_(id, '_slides-moked');
}

// Refaz a apresentação inteira: fica só o primeiro slide (ela não pode ficar vazia), que sai no fim.
// Devolve quantos slides foram gerados.
function _orcGerarMoked_(deck) {
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const velhos = deck.getSlides();
  velhos.slice(1).forEach(s => s.remove());
  // [passo, slide da v3 que ele substitui, desenho, copia o slide da v3?]
  const passos = [['Registros', 22, gerarSlideMokedRegistros_], ['Registros por área', 23, gerarSlideMokedAreas_],
                  ['Perfil das ocorrências', 24, gerarSlideMokedPerfil_], ['Controles no MokLog', 25, gerarSlideMokedMokLog_],
                  ['Atuação da Moked', 26, gerarSlideMokedAtuacao_], ['Painel de sistemas', 27, gerarSlideMokedPainel_],
                  ['Gestão operacional', 28, gerarSlideMokedGestao_, true], ['Programa de treinamentos', 29, gerarSlideMokedPrograma_, true],
                  ['Contrato e rateio', 30, gerarSlideMokedContrato_]];
  const v3 = _orcMokedAbrirV3_();
  const trilha = _ORC_TRILHA;
  _orcAplicarMarca_(ORC_CIDADES.ESTEIO);
  _ORC_TRILHA = ORC_MOKED.secao;
  try {
    passos.forEach(p => {
      const nome = 'Moked — ' + p[0];
      const s = p[3] ? _orcPassoCopiaMoked_(deck, W, H, nome, v3 ? _orcMokedSlideV3_(v3, ORC_MOKED.buscaV3[p[1]]) : null,
                                            (sl, fotos) => p[2](sl, W, H, fotos, p[1]))
                     : _orcPasso_(deck, W, H, nome, sl => p[2](sl, W, H));
      _orcMokedNotas_(s, p[1]);
    });
  } finally {
    _ORC_TRILHA = trilha;
    _orcAplicarMarca_(null);
  }
  if (velhos.length) velhos[0].remove();
  Logger.log('Moked · molduras: ' + _ORC_MOLD_CONTA.com + ' de ' + passos.length + ' slides com a moldura em imagem' +
             (_ORC_MOLD_CONTA.com < passos.length ? ' (sem a imagem na pasta ' + ORC_PASTA_IMAGENS + ', o cartão sai sem a sombra)' : ''));
  _ORC_MOLD_CONTA = { com: 0, sem: {} };
  _ORC_GRAF_CONTA = { com: 0, sem: {} };   // as formas ficam editáveis: nada vai para GRAFICOS PENDENTES.json
  return passos.length;
}

function _orcMokedNotas_(slide, slideV3) {
  try {
    slide.getNotesPage().getSpeakerNotesShape().getText().setText(_orcMarcaFotos_('ESTEIO') + '\n' +
      'Refeito por gerarSlidesMoked() (28_Moked.gs) a partir do slide ' + slideV3 + ' da v3 e do relatório da Moked de ' +
      '09/10/2026. Na v3, entra no lugar do slide ' + slideV3 + '. Edite o texto na v3: gerarSlidesMoked() refaz esta ' +
      'apresentação inteira. Não apague a primeira linha destas anotações.');
  } catch (e) { Logger.log('Anotações do slide da Moked não gravadas: ' + e.message); }
}

// ==========================================
// SLIDES COPIADOS DA v3 (28 e 29: as fotos e as fichas do gestor)
// ==========================================
// A v3 só é lida. Sem acesso a ela, os slides 28 e 29 saem com o lugar das fotos marcado.
function _orcMokedAbrirV3_() {
  try { return SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID); }
  catch (e) { Logger.log('Moked: a v3 não abriu — os slides com fotos saem com o lugar marcado: ' + e.message); return null; }
}

// O slide do gestor (marca de fotos nas anotações) com o título e o trecho de texto de busca ([título, trecho]).
function _orcMokedSlideV3_(v3, busca) {
  const b = busca.map(_orcNorm_);
  const s = v3.getSlides().filter(sl => {
    if (!_orcDonoFotos_(sl)) return false;
    const t = _orcNorm_(sl.getShapes().map(sh => { try { return sh.getText().asString(); } catch (e) { return ''; } }).join(' | '));
    return b.every(x => t.indexOf(x) >= 0);
  })[0] || null;
  if (!s) Logger.log('Moked: não achei na v3 o slide "' + busca.join(' / ') + '" — o lugar das fotos fica marcado.');
  return s;
}

// Copia o slide da v3 (as fotos vêm com o recorte e a posição do gestor), tira o que é redesenhado — textos,
// moldura, cabeçalho e linhas — e desenha o resto como _orcPasso_. fn(slide, fotos): fotos = retângulos das imagens
// que ficaram, ou null sem a v3 (aí o slide nasce em branco).
function _orcPassoCopiaMoked_(deck, W, H, nome, origem, fn) {
  let slide = null, fotos = null;
  if (origem) {
    try { slide = deck.appendSlide(origem); fotos = _orcMokedLimparCopia_(slide, W, H); }
    catch (e) {
      Logger.log('Moked: não copiei o slide da v3 (' + nome + '): ' + e.message);
      if (slide) { try { slide.remove(); } catch (e2) { /* fica */ } }
      slide = null; fotos = null;
    }
  }
  if (!slide) slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  _ORC_SLIDE_ATUAL = nome;
  _orcAbrirMoldura_();
  _ORC_EM_PASSO = { W: W, H: H };
  try { fn(slide, fotos); }
  catch (e) { _ORC_MOLD = null; _ORC_GRAF = null; _orcSlideFalha_(slide, W, H, nome, e); }
  _ORC_EM_PASSO = null;
  _orcFecharGrafico_();
  _orcFecharMoldura_(slide, W, H);
  return slide;
}

// Na cópia ficam só as imagens do conteúdo (fotos, prints) e as formas sem texto do gestor. Saem: a moldura
// (imagem do slide inteiro), o que está no cabeçalho (logo, trilha, barra), as caixas de texto, as linhas, as
// tabelas e o cartão. Devolve os retângulos das imagens que ficaram.
function _orcMokedLimparCopia_(slide, W, H) {
  const T = SlidesApp.PageElementType, fotos = [];
  slide.getPageElements().forEach(el => {
    const tipo = el.getPageElementType(), x = el.getLeft(), y = el.getTop(), w = el.getWidth(), h = el.getHeight();
    let sai = false;
    if (tipo === T.IMAGE) sai = (w >= W * 0.9 && h >= H * 0.9) || y + h <= 66;
    else if (tipo === T.SHAPE) {
      let texto = '';
      try { texto = el.asShape().getText().asString().trim(); } catch (e) { texto = ''; }
      sai = texto !== '' || y + h <= 66 || (w >= 300 && h >= 200);
    } else if (tipo === T.LINE || tipo === T.TABLE) sai = true;
    if (sai) el.remove();
    else if (tipo === T.IMAGE) fotos.push({ x: x, y: y, w: w, h: h });
  });
  return fotos;
}

// Onde a coluna da direita tem que parar: acima da imagem do gestor que esteja nela (a ficha do slide 29).
function _orcMokedLimiteDireita_(a, fotos) {
  const nela = (fotos || []).filter(r => r.x + r.w > a.dx + 10 && r.y > a.dy + 40);
  return nela.length ? Math.min.apply(null, nela.map(r => r.y)) - 8 : null;
}

// Sem a v3: o lugar das fotos fica marcado.
function _orcMokedSemFotos_(slide, a, slideV3) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  _orcRet_(slide, a.ex, a.ey + 4, a.ew, a.eh - 8, '#E8EEF5', { borda: C.textMuted, peso: 0.75 });
  _orcParagrafo_(slide, a.ex + 20, a.ey + a.eh / 2 - 22, a.ew - 40, 44, 'Fotos do slide ' + slideV3 + ' da v3: copie e ' +
    'cole aqui (a v3 não abriu ou o slide não foi achado nesta geração).',
    { fs: 8, fsMin: 7, cor: C.textBody, fonte: DS.typography.body, align: 'C', meio: true });
}

// ==========================================
// MOLDE (o do gestor, 26_Fotos.gs) E COLUNA DA DIREITA
// ==========================================
// Cabeçalho, cartão, linha vertical e rodapé. Devolve a área da esquerda (ex, ey, ew, eh) e a da direita (dx, dy, dw, dh).
function _orcMokedMolde_(slide, W, H, subtitulo, rodape, titulo) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  _orcHeader_(slide, W, titulo || ORC_MOKED.titulo, subtitulo);
  const cy = 74, ch = H - 31 - cy, cw = W - MX * 2;
  _orcCard_(slide, MX, cy, cw, ch, null);
  const px = MX + 10, py = cy + 10, ph = ch - 20, ew = 410;
  const dx = px + ew + 16, dw = MX + cw - 12 - dx;
  _orcLinha_(slide, dx - 8, py + 8, dx - 8, py + ph - 8, DS.colors.lines, 0.75);
  _orcRodape_(slide, W, H, rodape || ORC_MOKED.rodape);
  return { ex: px, ey: py, ew: ew, eh: ph, dx: dx, dy: py, dw: dw, dh: ph };
}

function _orcMokedRotulo_(slide, x, y, w, texto) {
  const DS = CR_DESIGN_SYSTEM;
  _orcUmaLinha_(slide, x, y, w, 12, texto,
    { align: 'L', fs: 7.5, bold: true, cor: DS.colors.textBody, fonte: DS.typography.titles, fsMin: 6, folga: 4 });
}

// Linhas que o texto ocupa numa caixa de largura w, quebrando por palavra como o Slides (a conta de
// _orcLinhasTexto_ divide a largura total e erra para menos nos textos longos).
function _orcMokedLinhas_(texto, w, fs, fonte, bold) {
  const util = Math.max(12, w - _ORC_RECUO_TEXTBOX) * 0.96, esp = _orcLarguraTexto_(' ', fs, fonte, bold);
  return String(texto).split('\n').reduce((n, par) => {
    let linhas = 1, x = 0;
    par.split(' ').forEach(p => {
      const pw = _orcLarguraTexto_(p, fs, fonte, bold);
      if (x > 0 && x + esp + pw > util) { linhas++; x = pw; }
      else x += (x > 0 ? esp : 0) + pw;
    });
    return n + linhas;
  }, 0);
}

// Altura do parágrafo no Slides: linhas × a altura de linha da fonte (Open Sans 1,362 e Montserrat 1,219 do
// corpo — é o "simples" do Slides) × espaçamento 115 de _orcParagrafo_, mais o recuo de cima e de baixo.
function _orcMokedAltura_(texto, w, fs, fonte, bold) {
  return _orcMokedLinhas_(texto, w, fs, fonte, bold) * fs * (fonte === 'Montserrat' ? 1.219 : 1.362) * 1.15 + 8;
}

// Legenda alinhada à direita (termina em xFim): [cor, texto, borda]; sem cor, só o texto.
function _orcMokedLegenda_(slide, xFim, y, itens) {
  const DS = CR_DESIGN_SYSTEM, T = DS.typography;
  let x = xFim;
  itens.slice().reverse().forEach(it => {
    const w = _orcLarguraTexto_(it[1], 7, T.body, false) * 1.1 + 16;
    x -= w;
    _orcUmaLinha_(slide, x, y, w, 12, it[1], { align: 'L', fs: 7, cor: DS.colors.textBody, fonte: T.body, fsMin: 6, folga: 4 });
    if (it[0]) _orcRet_(slide, x - 4, y + 2.5, 7, 7, it[0], it[2] ? { borda: it[2] } : {});
    x -= 13;
  });
}

// Coluna da direita, como no molde do gestor: blocos [rótulo, texto] de cima para baixo (a partir de y0) e,
// colados no fim, os destaques [rótulo cinza, valor]. Uma fonte só nos textos: desce de 9 até tudo caber
// (até o limite, se houver — a ficha do gestor no pé da coluna do slide 29).
function _orcMokedColuna_(slide, a, y0, blocos, destaques, limite) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography;
  const dest = destaques || [];
  const fim = Math.min(limite || Infinity, a.dy + a.dh - dest.length * 32 - (dest.length ? 4 : 0));
  const alt = (t, fs) => _orcMokedAltura_(t, a.dw, fs, T.body, false);
  const total = fs => blocos.reduce((s, b) => s + 14 + alt(b[1], fs) + 6, 0);
  let fs = 9;
  while (fs > 6.5 && y0 + total(fs) > fim) fs -= 0.25;
  let y = y0;
  blocos.forEach(b => {
    _orcMokedRotulo_(slide, a.dx, y, a.dw, b[0]);
    const h = alt(b[1], fs);
    _orcParagrafo_(slide, a.dx, y + 14, a.dw, h, b[1], { fs: fs, fsMin: fs, cor: C.textBody, fonte: T.body });
    y += 14 + h + 6;
  });
  dest.forEach((d, i) => {
    const yd = a.dy + a.dh - (dest.length - i) * 32;
    _orcUmaLinha_(slide, a.dx, yd, a.dw, 10, d[0], { align: 'L', fs: 6.5, bold: true, cor: C.textMuted, fonte: T.titles, fsMin: 6, folga: 4 });
    _orcUmaLinha_(slide, a.dx, yd + 10, a.dw, 16, d[1], { align: 'L', fs: 9.5, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 7, folga: 4 });
  });
}

const _orcMokedPct_ = (v, total) => Math.round(v / total * 100) + '%';

// ==========================================
// 1. REGISTROS (slide 22 da v3)
// ==========================================
function gerarSlideMokedRegistros_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · registros da operação no Mega Curitiba e no Mega Itajaí, mar/2023 a out/2026');
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew, 'REGISTROS NO SISTEMA 2CONTROL RS|RD');
  const gap = 8, kw = (a.ew - gap * 2) / 3, ky = a.ey + 18, kh = 58;
  M.registros.forEach((k, i) => {
    const x = a.ex + i * (kw + gap);
    _orcRet_(slide, x, ky, kw, kh, C.zebra, { redondo: true });
    _orcUmaLinha_(slide, x + 6, ky + 5, kw - 12, 26, _orcMilhar_(k[0]),
      { align: 'L', fs: 20, bold: true, cor: C.brandLight, fonte: T.titles, fsMin: 14, folga: 4 });
    _orcParagrafo_(slide, x + 6, ky + 31, kw - 12, 24, k[1], { fs: 7, fsMin: 6, cor: C.textBody, fonte: T.body });
  });

  // Ocorrências por ano: as colunas de Curitiba e de Itajaí lado a lado.
  const gy = ky + kh + 12;
  _orcMokedRotulo_(slide, a.ex, gy, a.ew * 0.55, 'OCORRÊNCIAS POR ANO');
  _orcMokedLegenda_(slide, a.ex + a.ew, gy, [[C.brandDark, 'Mega Curitiba'], [C.brandAccent, 'Mega Itajaí']]);
  const base = a.ey + a.eh - 18, topo = gy + 30;
  const max = Math.max.apply(null, M.porAno.map(p => Math.max(p[1] || 0, p[2] || 0)));
  const gw = a.ew / M.porAno.length, bw = 30, entre = 4;
  _orcLinha_(slide, a.ex, base, a.ex + a.ew, base, C.lines, 0.75);
  M.porAno.forEach((p, i) => {
    const gx = a.ex + i * gw, x0 = gx + (gw - bw * 2 - entre) / 2;
    [[p[1], C.brandDark], [p[2], C.brandAccent]].forEach((b, j) => {
      const x = x0 + j * (bw + entre), h = b[0] ? (base - topo) * b[0] / max : 0;
      if (h > 0) _orcRet_(slide, x, base - h, bw, h, b[1]);
      _orcUmaLinha_(slide, x - 8, base - h - 13, bw + 16, 12, b[0] ? _orcMilhar_(b[0]) : '–',
        { align: 'C', fs: 7.5, bold: !!b[0], cor: b[0] ? C.textMain : C.textMuted, fonte: T.titles, fsMin: 6, folga: 4 });
    });
    _orcUmaLinha_(slide, gx, base + 2, gw, 13, p[0], { align: 'C', fs: 7.5, bold: true, cor: C.textBody, fonte: T.titles, fsMin: 6 });
  });

  const ano = k => M.porAno.filter(p => p[0].indexOf(k) === 0)[0];
  const a24 = ano('2024'), a25 = ano('2025'), a26 = ano('2026');
  _orcMokedColuna_(slide, a, a.dy + 2, [['O QUE SÃO OS REGISTROS', M.textoRegistros]], [
    ['OCORRÊNCIAS · MEGA CURITIBA', _orcMilhar_(a24[1]) + ' em 2024 → ' + _orcMilhar_(a25[1]) + ' em 2025 (+' +
      Math.round((a25[1] / a24[1] - 1) * 100) + '%)'],
    ['OCORRÊNCIAS · MEGA ITAJAÍ', _orcMilhar_(a25[2]) + ' em 2025 · ' + _orcMilhar_(a26[2]) + ' até 09/10/2026']]);
}

// ==========================================
// 2. REGISTROS POR ÁREA (slide 23 da v3)
// ==========================================
function gerarSlideMokedAreas_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · volume de registros por área no 2CONTROL RS|RD, mar/2023 a out/2026');
  const cur = M.areas.reduce((s, r) => s + r[1], 0), ita = M.areas.reduce((s, r) => s + r[2], 0), total = cur + ita;
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew * 0.55, 'REGISTROS POR ÁREA');
  _orcMokedLegenda_(slide, a.ex + a.ew, a.ey + 2, [[C.brandDark, 'Mega Curitiba'], [C.brandAccent, 'Mega Itajaí']]);
  const colunas = [{ titulo: 'Área', w: 108 }, { titulo: 'Curitiba', w: 58, align: 'R' }, { titulo: 'Itajaí', w: 58, align: 'R' },
                   { titulo: 'Total', w: 54, align: 'R' }, { titulo: '%', w: 40, align: 'R' }, { titulo: '', w: null }];
  const linhas = M.areas.map(r => ({ celulas: [{ texto: r[0] }, { texto: _orcMilhar_(r[1]) }, { texto: _orcMilhar_(r[2]) },
    { texto: _orcMilhar_(r[1] + r[2]), bold: true }, { texto: _orcMokedPct_(r[1] + r[2], total) }, null] }));
  linhas.push({ total: true, celulas: [{ texto: 'Total' }, { texto: _orcMilhar_(cur) }, { texto: _orcMilhar_(ita) },
    { texto: _orcMilhar_(total) }, { texto: '100%' }, null] });
  const ty = a.ey + 18, rowH = 26, hCab = 20;
  const fimTab = _orcTabela_(slide, a.ex, ty, a.ew, colunas, linhas, rowH, { fs: 8, hCab: hCab });
  // Barra de cada área na última coluna: o total da área, com a parte de cada Mega.
  const bx = a.ex + 318 + 4, bmax = a.ew - 318 - 12, maior = Math.max.apply(null, M.areas.map(r => r[1] + r[2]));
  M.areas.forEach((r, i) => {
    const by = ty + hCab + i * rowH + (rowH - 9) / 2, wt = Math.max(1, bmax * (r[1] + r[2]) / maior), wc = wt * r[1] / (r[1] + r[2]);
    _orcRet_(slide, bx, by, wc, 9, C.brandDark);
    if (wt - wc > 0.2) _orcRet_(slide, bx + wc, by, wt - wc, 9, C.brandAccent);
  });
  _orcParagrafo_(slide, a.ex, fimTab + 4, a.ew, a.ey + a.eh - fimTab - 4,
    'Contagem feita na própria plataforma, do primeiro registro de cada projeto até 09/10/2026. QR Ronda, Rotina, ' +
    'Solicitação e Visita In-Loco não entram na contagem.', { fs: 7, fsMin: 6, cor: C.textMuted, fonte: T.body });

  const oc = M.areas[0], ou = M.areas[1];
  _orcMokedColuna_(slide, a, a.dy + 2, [['O QUE ISSO MOSTRA',
    oc[0] + ' é a área mais volumosa nos dois Megas: ' + _orcMilhar_(oc[1] + oc[2]) + ' dos ' + _orcMilhar_(total) +
    ' registros (' + _orcMokedPct_(oc[1] + oc[2], total) + '). Somada a “' + ou[0] + '”, chega a ' +
    _orcMokedPct_(oc[1] + oc[2] + ou[1] + ou[2], total) + ' de tudo o que a segurança registra.\n\nCada registro traz quem ' +
    'avisou, quem foi avisado, o detalhamento, as medidas tomadas, os danos e, em muitos casos, fotos.']], [
    [oc[0].toUpperCase(), _orcMilhar_(oc[1] + oc[2]) + ' registros · ' + _orcMokedPct_(oc[1] + oc[2], total)],
    [ou[0].toUpperCase(), _orcMilhar_(ou[1] + ou[2]) + ' registros · ' + _orcMokedPct_(ou[1] + ou[2], total)]]);
}

// ==========================================
// 3. PERFIL DAS OCORRÊNCIAS (slide 24 da v3)
// ==========================================
function gerarSlideMokedPerfil_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · perfil das ocorrências no Mega Curitiba e no Mega Itajaí, mar/2023 a out/2026');
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew * 0.6, 'TEMAS DAS OCORRÊNCIAS');
  _orcMokedLegenda_(slide, a.ex + a.ew, a.ey + 2, [[C.brandDark, 'Mega Curitiba'], [C.brandAccent, 'Mega Itajaí']]);
  const y0 = a.ey + 20, rh = (a.ey + a.eh - y0) / M.perfil.length;
  const lw = 150, x0 = a.ex + lw + 2, bmax = a.ew - lw - 2 - 40;
  const max = Math.max.apply(null, M.perfil.map(p => Math.max(p[1], p[2])));
  M.perfil.forEach((p, i) => {
    const ry = y0 + i * rh;
    if (i) _orcLinha_(slide, a.ex, ry, a.ex + a.ew, ry, C.lines, 0.5);
    _orcParagrafo_(slide, a.ex, ry, lw, rh, p[0], { fs: 7.5, fsMin: 6.5, cor: C.textMain, fonte: T.body, meio: true });
    [[p[1], C.brandDark], [p[2], C.brandAccent]].forEach((b, j) => {
      const by = ry + (rh - 21) / 2 + j * 12, w = Math.max(1, bmax * b[0] / max);
      _orcRet_(slide, x0, by, w, 9, b[1]);
      _orcUmaLinha_(slide, x0 + w + 1, by - 2, 44, 13, (p[3] ? '≥ ' : '') + _orcMilhar_(b[0]),
        { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: T.body, fsMin: 6, folga: 4 });
    });
  });

  const tema = n => M.perfil.filter(p => p[0].indexOf(n) === 0)[0];
  const col = tema('Colisões'), can = tema('Cancelas'), sau = tema('Saúde'), fum = tema('Fumaça');
  const pctOutros = o => _orcMokedPct_(o[0], o[1]);
  _orcMokedColuna_(slide, a, a.dy + 2, [['O QUE ISSO MOSTRA',
    'Colisões e danos a cancelas lideram nos dois Megas. No Mega Curitiba também pesam o atendimento de saúde (≥ ' +
    sau[1] + ') e os princípios de incêndio (≥ ' + fum[1] + ').\n\n“≥” indica contagem mínima: a maior parte das ' +
    'ocorrências está lançada como “Outros” (' + pctOutros(M.outros[0]) + ' no Mega Curitiba e ' + pctOutros(M.outros[1]) +
    ' no Mega Itajaí), e o tema foi identificado pelo resumo de cada registro. Lançar o tipo certo (colisão, saúde, ' +
    'furto) permitiria acompanhar um indicador por tema.']], [
    ['COLISÕES', '≥ ' + (col[1] + col[2]) + ' nos dois Megas'],
    ['CANCELAS, TOTENS E PORTÕES', '≥ ' + (can[1] + can[2]) + ' nos dois Megas']]);
}

// ==========================================
// 4. CONTROLES NO MOKLOG (slide 25 da v3)
// ==========================================
function gerarSlideMokedMokLog_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · controles operacionais no MokLog CheckTest, mai a out/2026');
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew, 'CONTROLES NO MOKLOG CHECKTEST · MAI A OUT/2026');
  const ws = [100, (a.ew - 100) / 2, (a.ew - 100) / 2], xs = [a.ex, a.ex + ws[0], a.ex + ws[0] + ws[1]];
  const ty = a.ey + 18, hc = 18, rh = (a.ey + a.eh - 2 - ty - hc) / M.moklog.length;
  _orcRet_(slide, a.ex, ty, a.ew, hc, C.brandDark);
  ['Controle', 'Mega Curitiba · P311A', 'Mega Itajaí · P311B'].forEach((t, i) =>
    _orcUmaLinha_(slide, xs[i], ty, ws[i], hc, t.toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: '#FFFFFF', fonte: T.titles, folga: 6, fsMin: 6, cortar: true }));
  M.moklog.forEach((r, i) => {
    const ry = ty + hc + i * rh;
    if (i % 2 === 1) _orcRet_(slide, a.ex, ry, a.ew, rh, C.zebra);
    _orcParagrafo_(slide, xs[0], ry, ws[0], rh, r[0], { fs: 7.5, fsMin: 6.5, bold: true, cor: C.textMain, fonte: T.body, meio: true });
    [r[1], r[2]].forEach((cel, j) => {
      const yy = ry + (rh - (cel[1] ? 25 : 13)) / 2;
      _orcUmaLinha_(slide, xs[j + 1], yy, ws[j + 1], 13, cel[0],
        { align: 'L', fs: 8, bold: true, cor: cel[2] ? C.accentOrange : C.textMain, fonte: T.body, fsMin: 6.5, folga: 4 });
      _orcUmaLinha_(slide, xs[j + 1], yy + 12, ws[j + 1], 12, cel[1],
        { align: 'L', fs: 7, cor: C.textBody, fonte: T.body, fsMin: 6, folga: 4 });
    });
  });
  const fim = ty + hc + M.moklog.length * rh;
  _orcLinha_(slide, a.ex, fim, a.ex + a.ew, fim, C.lines, 1);

  _orcMokedColuna_(slide, a, a.dy + 2, [['O QUE O MOKLOG COBRE', M.textoMokLog], ['PONTOS DE ATENÇÃO', M.atencaoMokLog]], [
    ['TREINAMENTOS · MEGA CURITIBA', M.treinamentos + ' registrados no período']]);
}

// ==========================================
// 5. ATUAÇÃO DA MOKED (slide 26 da v3)
// ==========================================
function gerarSlideMokedAtuacao_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · o que a Moked faz como consultoria do proprietário');
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew, 'ATUAÇÃO DA MOKED NO MEGA CURITIBA E NO MEGA ITAJAÍ');
  // Cada frente com a altura do seu texto (o título em cima, a descrição colada nele); o que sobra do cartão é
  // dividido entre elas.
  const y0 = a.ey + 18, disp = a.ey + a.eh - y0, lw = a.ew - 26;
  const alt = (t, fs) => _orcMokedAltura_(t, lw, fs, T.body, false) - 0.8;
  const soma = fs => M.frentes.reduce((s, f) => s + 13 + alt(f[1], fs) + 4, 0);
  let fs = 8;
  while (fs > 6.5 && soma(fs) > disp) fs -= 0.25;
  const sobra = Math.max(0, disp - soma(fs)) / M.frentes.length;
  let ry = y0;
  M.frentes.forEach((f, i) => {
    const h = alt(f[1], fs), yt = ry + 1 + sobra / 2;
    if (i) _orcLinha_(slide, a.ex, ry, a.ex + a.ew, ry, C.lines, 0.5);
    _orcUmaLinha_(slide, a.ex, yt, 28, 16, ('0' + (i + 1)).slice(-2),
      { align: 'L', fs: 11, bold: true, cor: C.brandLight, fonte: T.titles, folga: 4 });
    _orcUmaLinha_(slide, a.ex + 26, yt + 1, lw, 14, f[0],
      { align: 'L', fs: 8.5, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 7, folga: 4 });
    _orcParagrafo_(slide, a.ex + 26, yt + 13, lw, h, f[1], { fs: fs, fsMin: fs, cor: C.textBody, fonte: T.body });
    ry += 13 + h + 4 + sobra;
  });
  _orcMokedColuna_(slide, a, a.dy + 2, [['CASO · INVASÃO PERIMETRAL EM 27/02/2026', M.caso], ['O QUE A MOKED FEZ', M.casoMoked]], []);
}

// ==========================================
// 6. PAINEL DE SISTEMAS (slide 27 da v3)
// ==========================================
function gerarSlideMokedPainel_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, P = ORC_MOKED.painel, K = ORC_MOKED_CORES;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · painel semanal de sistemas do MokLog CheckTest, laudo de 04/10/2026', P.rodape);
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew * 0.5, 'FALHAS NAS 6 SEMANAS');
  _orcMokedLegenda_(slide, a.ex + a.ew, a.ey + 2, [[C.zebra, 'Operacional', C.lines], [K.P.fundo, 'Parcial'],
                                                   [K.I.fundo, 'Inoperante'], [null, '— sem registro']]);
  // Grade: dispositivo × semana × tendência.
  const wd = 136, wt = 64, wsem = (a.ew - wd - wt) / P.semanas.length;
  const ty = a.ey + 18, hc = 18, rh = 27;
  _orcRet_(slide, a.ex, ty, a.ew, hc, C.brandDark);
  const cab = (x, w, t, al) => _orcUmaLinha_(slide, x, ty, w, hc, t, { align: al, fs: 6.5, bold: true, cor: '#FFFFFF', fonte: T.titles, folga: 4, fsMin: 5.5 });
  cab(a.ex, wd, 'DISPOSITIVO', 'L');
  P.semanas.forEach((s, i) => cab(a.ex + wd + i * wsem, wsem, s, 'C'));
  cab(a.ex + wd + P.semanas.length * wsem, wt, 'TENDÊNCIA', 'C');
  P.linhas.forEach((l, r) => {
    const ry = ty + hc + r * rh;
    _orcLinha_(slide, a.ex, ry + rh, a.ex + a.ew, ry + rh, C.lines, 0.5);
    _orcUmaLinha_(slide, a.ex, ry, wd, rh, l[0], { align: 'L', fs: 7.5, bold: true, cor: C.textMain, fonte: T.body, fsMin: 6, folga: 4 });
    l[1].split('').forEach((e, i) => {
      const x = a.ex + wd + i * wsem;
      if (e === '-') {
        _orcUmaLinha_(slide, x, ry, wsem, rh, '—', { align: 'C', fs: 7, cor: C.textMuted, fonte: T.body, folga: 2 });
        return;
      }
      _orcRet_(slide, x + 2, ry + 3, wsem - 4, rh - 6, e === 'O' ? C.zebra : K[e].fundo);
      if (e !== 'O') _orcUmaLinha_(slide, x, ry, wsem, rh, e, { align: 'C', fs: 7.5, bold: true, cor: K[e].texto, fonte: T.titles, folga: 2 });
    });
    const k = K[l[2]], px = a.ex + wd + P.semanas.length * wsem + 4;
    _orcRet_(slide, px, ry + (rh - 13) / 2, wt - 8, 13, k.fundo, { redondo: true, borda: k.borda });
    _orcUmaLinha_(slide, px, ry + (rh - 13) / 2, wt - 8, 13, l[2], { align: 'C', fs: 6.5, bold: true, cor: k.texto, fonte: T.titles, folga: 2, fsMin: 5.5 });
  });
  // Os que não falharam nenhuma vez.
  const by = ty + hc + P.linhas.length * rh + 10, bh = a.ey + a.eh - 2 - by;
  _orcRet_(slide, a.ex, by, a.ew, bh, K.Resolvida.fundo, { redondo: true, borda: '#A7F3D0' });
  _orcUmaLinha_(slide, a.ex + 4, by + 6, a.ew - 8, 14, P.semFalha,
    { align: 'L', fs: 8.5, bold: true, cor: K.Resolvida.texto, fonte: T.titles, fsMin: 7, folga: 4 });
  _orcParagrafo_(slide, a.ex + 4, by + 22, a.ew - 8, bh - 26, P.semFalhaTexto, { fs: 8, fsMin: 6.5, cor: C.textBody, fonte: T.body });

  // Direita: a classificação do motor de risco, o porquê e a base.
  _orcMokedRotulo_(slide, a.dx, a.dy + 2, a.dw, 'CLASSIFICAÇÃO DO ATIVO');
  _orcUmaLinha_(slide, a.dx, a.dy + 15, a.dw, 26, P.classe,
    { align: 'L', fs: 18, bold: true, cor: C.accentOrange, fonte: T.titles, fsMin: 12, folga: 4 });
  const sx = a.dx + 7, sw = a.dw - 14, n = P.escala.length, seg = (sw - (n - 1) * 2) / n, sy = a.dy + 45;
  P.escala.forEach((e, i) => {
    const x = sx + i * (seg + 2), ativo = e === P.classe;
    _orcRet_(slide, x, sy, seg, 13, ativo ? C.accentOrange : C.lines);
    _orcUmaLinha_(slide, x, sy, seg, 13, e, { align: 'C', fs: 5.5, bold: true, cor: ativo ? '#FFFFFF' : C.textMuted, fonte: T.titles, fsMin: 4.5, folga: 2 });
  });
  _orcUmaLinha_(slide, sx - 7, sy + 14, sw / 2 + 7, 10, 'menor exposição', { align: 'L', fs: 6, cor: C.textMuted, fonte: T.body, folga: 4 });
  _orcUmaLinha_(slide, sx + sw / 2, sy + 14, sw / 2 + 7, 10, 'maior exposição', { align: 'R', fs: 6, cor: C.textMuted, fonte: T.body, folga: 4 });
  _orcMokedColuna_(slide, a, sy + 32, [['POR QUE', P.porQue]], [
    ['BASE OPERACIONAL · LAUDO DE 04/10/2026', P.base], ['ONDE ESTÃO AS FALHAS', P.falhas]]);
}

// ==========================================
// 7. GESTÃO OPERACIONAL (slide 28 da v3: o print do relatório e as fichas são os do gestor)
// ==========================================
function gerarSlideMokedGestao_(slide, W, H, fotos, slideV3) {
  const M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · gestão operacional da Moked e fichas individuais da equipe do Mega Curitiba',
    'Fonte: Moked do Brasil — 2CONTROL RS|RD do P311A e fichas individuais de 09/10/2026 · Mega Esteio',
    'Implantação Moked | Treinamento e Capacitação');
  if (!fotos) _orcMokedSemFotos_(slide, a, slideV3);
  _orcMokedColuna_(slide, a, a.dy + 2, [['GESTÃO OPERACIONAL DA MOKED', M.gestao.map(t => '• ' + t).join('\n')]],
    [['FICHAS INDIVIDUAIS · MEGA CURITIBA', M.fichas]], _orcMokedLimiteDireita_(a, fotos));
}

// ==========================================
// 8. PROGRAMA DE TREINAMENTOS (slide 29 da v3: as fotos e a ficha são as do gestor)
// ==========================================
function gerarSlideMokedPrograma_(slide, W, H, fotos, slideV3) {
  const M = ORC_MOKED;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · programa quadrimestral de treinamentos da equipe de segurança',
    'Fotos do gestor: treinamento da equipe de segurança no estande de tiro · Mega Esteio',
    'Implantação Moked | Treinamento e Capacitação');
  if (!fotos) _orcMokedSemFotos_(slide, a, slideV3);
  _orcMokedColuna_(slide, a, a.dy + 2, [
    ['PROGRAMA QUADRIMESTRAL', 'Treinamento e aprimoramento da equipe a cada quatro meses:\n' +
      M.programa.map(t => '• ' + t).join('\n')],
    ['CUSTO', 'Os valores saem do próprio contrato de segurança.']], [], _orcMokedLimiteDireita_(a, fotos));
}

// ==========================================
// 9. CONTRATO E RATEIO (slide 30 da v3)
// ==========================================
// 37633.5 → "37.633,50" (n casas).
const _orcMokedDec_ = (v, n) => {
  const s = Math.abs(v).toFixed(n).split('.');
  return (v < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (n ? ',' + s[1] : '');
};

// Rateio do contrato pela área: { total, linhas: [[Mega, área, participação, valor por mês]] }.
function _orcMokedRateio_() {
  const K = ORC_MOKED.contrato, total = K.areas.reduce((s, r) => s + r[1], 0);
  return { total: total, linhas: K.areas.map(r => [r[0], r[1], r[1] / total, K.mensal * r[1] / total]) };
}

function gerarSlideMokedContrato_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, K = ORC_MOKED.contrato;
  const a = _orcMokedMolde_(slide, W, H, 'Segurança · cláusula 3.4 do contrato e o rateio pela área dos três Megas',
    'Fonte: contrato com a Moked (cláusula 3.4) e áreas de 2027 dos Megas · Mega Esteio', 'Implantação Moked | Contrato e Rateio');
  const pct = p => (p * 100).toFixed(2).replace('.', ',') + '%', rs = v => 'R$ ' + _orcMokedDec_(v, 2);
  const rat = _orcMokedRateio_(), est = rat.linhas.filter(l => /Esteio/.test(l[0]))[0];

  // A cláusula, em resumo, num quadro com a barra da marca.
  _orcMokedRotulo_(slide, a.ex, a.ey + 2, a.ew, 'CLÁUSULA 3.4 DO CONTRATO COM A MOKED');
  const qy = a.ey + 18, qh = 86;
  _orcRet_(slide, a.ex, qy, a.ew, qh, C.brandTint);
  _orcRet_(slide, a.ex, qy, 3, qh, C.brandLight);
  _orcParagrafo_(slide, a.ex + 8, qy + 4, a.ew - 12, qh - 8,
    'Com a inclusão de um terceiro empreendimento, a remuneração mensal da gestão de segurança dos três passa a ser de ' +
    rs(K.clausula) + ', como um pacote corporativo distribuído proporcionalmente aos empreendimentos indicados pela ' +
    'contratante.\nCláusula 3.4.1: não há cobrança de startup para os empreendimentos incluídos, nem na renovação ou ' +
    'ampliação do contrato.', { fs: 8.5, fsMin: 7, cor: C.textMain, fonte: T.body, meio: true });

  // O rateio pela área, com o Mega Esteio em negrito.
  const ty = qy + qh + 14;
  _orcMokedRotulo_(slide, a.ex, ty, a.ew, 'RATEIO PELA ÁREA · CONTRATO MOKED HOJE: ' + rs(K.mensal) + ' POR MÊS');
  const colunas = [{ titulo: 'Condomínio', w: 130 }, { titulo: 'Área (m²)', w: 92, align: 'R' }, { titulo: '%', w: 70, align: 'R' },
                   { titulo: 'Valor por mês', w: null, align: 'R' }];
  const linhas = rat.linhas.map(l => ({ celulas: [l[0], _orcMokedDec_(l[1], 2), pct(l[2]), rs(l[3])]
    .map(t => ({ texto: t, bold: l === est })) }));
  linhas.push({ total: true, celulas: ['Total', _orcMokedDec_(rat.total, 2), '100,00%', rs(K.mensal)].map(t => ({ texto: t })) });
  const fim = _orcTabela_(slide, a.ex, ty + 16, a.ew, colunas, linhas, 24, { fs: 8.5, hCab: 20 });
  _orcParagrafo_(slide, a.ex, fim + 4, a.ew, a.ey + a.eh - fim - 4,
    'Valor de cada Mega = contrato × participação do Mega na área dos três.', { fs: 7, fsMin: 6, cor: C.textMuted, fonte: T.body });

  _orcMokedColuna_(slide, a, a.dy + 2, [['O QUE ISSO MOSTRA',
    'Pela cláusula 3.4, a gestão de segurança dos três Megas vira um pacote corporativo, dividido entre eles pela área. ' +
    'Com ' + pct(est[2]) + ' da área, o Mega Esteio fica com ' + rs(est[3]) + ' por mês do contrato.\n\n' +
    'A entrada do Mega Esteio não tem custo de startup (cláusula 3.4.1).']], [
    ['CONTRATO MOKED · TRÊS MEGAS', rs(K.mensal) + ' por mês'],
    ['MEGA ESTEIO · ' + pct(est[2]) + ' DA ÁREA', rs(est[3]) + ' por mês']]);
}
