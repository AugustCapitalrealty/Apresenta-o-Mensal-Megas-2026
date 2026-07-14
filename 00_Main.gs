/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Orquestrador
 * DESCRIÇÃO: Pontos de entrada da geração de slides.
 *
 *   Para rodar UMA cidade:
 *     ▸ gerarCuritiba()   / gerarItajai()   / gerarEsteio()
 *     ▸ regerarCuritiba() / regerarItajai() / regerarEsteio()   (limpa antes)
 *
 *   Para rodar AS TRÊS de uma vez:
 *     ▸ gerarTodas()      → gera (acrescenta)
 *     ▸ regerarTodas()    → limpa e gera
 */


// ==========================================
// PONTOS DE ENTRADA — POR CIDADE
// ==========================================
function gerarCuritiba()   { setProjetoAtivo('CURITIBA'); gerarApresentacaoCompleta_();   }
function gerarItajai()     { setProjetoAtivo('ITAJAI');   gerarApresentacaoCompleta_();   }
function gerarEsteio()     { setProjetoAtivo('ESTEIO');   gerarApresentacaoCompleta_();   }

function regerarCuritiba() { setProjetoAtivo('CURITIBA'); regerarApresentacaoCompleta_(); }
function regerarItajai()   { setProjetoAtivo('ITAJAI');   regerarApresentacaoCompleta_(); }
function regerarEsteio()   { setProjetoAtivo('ESTEIO');   regerarApresentacaoCompleta_(); }


// ==========================================
// PONTOS DE ENTRADA — SLIDES INDIVIDUAIS
// ==========================================
function gerarSoEnergiaSolar() { setProjetoAtivo('CURITIBA'); gerarSlideEnergiaSolar(); }

// Slide avulso — Custo do M² do 1º Quadrimestre (Jan-Abr/2026). Não entra na
// geração mensal automática (é um recorte de período fixo, não do mês de
// referência corrente). Troque a cidade e rode a função correspondente.
function gerarSoCustoM2QuadrimestreCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCustoM2Quadrimestre(); }


// ==========================================
// PONTOS DE ENTRADA — TODAS AS CIDADES
// ==========================================
function gerarTodas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => {
    setProjetoAtivo(c);
    gerarApresentacaoCompleta_();
  });
}

function regerarTodas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => {
    setProjetoAtivo(c);
    regerarApresentacaoCompleta_();
  });
}


// ==========================================
// FLUXOS INTERNOS (usam o projeto já setado)
// ==========================================
function gerarApresentacaoCompleta_() {
  const projeto = getProjetoAtivo();
  Logger.log('▶ Gerando apresentação de ' + projeto.nome);

  // Ordem oficial da apresentação (espelha o relatório manual):
  // capas de seção e slides de fotos são gerados entre os slides de dados.
  const passos = [
    { nome: 'Capa de Abertura',                    fn: gerarSlideCapa },
    { nome: 'Agenda',                              fn: gerarSlideAgenda },
    { nome: 'Destaques do Período',                fn: gerarSlideDestaques },
    { nome: 'Dashboard',                           fn: gerarSlideDashboard },
    { nome: 'Metas',                               fn: gerarSlidesMetas },
    { nome: 'Capa Seção - Manutenção Preventiva',  fn: () => gerarCapaSecao('MANUTENÇÃO', 'PREVENTIVA') },
    { nome: 'Preventivas',                         fn: gerarSlidePreventivas },
    { nome: 'Capa Seção - Manutenção Corretiva',   fn: () => gerarCapaSecao('MANUTENÇÃO', 'CORRETIVA') },
    { nome: 'Corretivas',                          fn: gerarSlideCorretivas },
    { nome: 'Chamados por Prioridade',             fn: () => gerarSlideReservaGraficos('CHAMADOS POR PRIORIDADE', 'Abertos x Fechados', [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]) },
    { nome: 'Chamados Pendentes (Backlog)',        fn: gerarSlideBacklogPendentes },
    { nome: 'Backlog Facilities',                  fn: () => gerarSlideReservaGraficos('BACKLOG FACILITIES', 'Evolução mensal do backlog', [{ titulo: '' }]) },
    { nome: 'Capa Seção - Serviços Contratados',   fn: () => gerarCapaSecao('SERVIÇOS', 'CONTRATADOS') },
    { nome: 'Fotos - Serviços Contratados',        fn: () => gerarSlideRegistroFotos('SERVIÇOS CONTRATADOS') },
    { nome: 'Capa Seção - Serviços Internos',      fn: () => gerarCapaSecao('SERVIÇOS', 'INTERNOS') },
    { nome: 'Fotos - Serviços Internos',           fn: () => gerarSlideRegistroFotos('SERVIÇOS INTERNOS') },
    { nome: 'Capa Seção - Segurança Patrimonial',  fn: () => gerarCapaSecao('SEGURANÇA', 'PATRIMONIAL') },
    { nome: 'Acesso e Segurança',                  fn: gerarSlideTempo },
    { nome: 'Fotos - Serviços Segurança',          fn: () => gerarSlideRegistroFotos('SERVIÇOS SEGURANÇA') },
    { nome: 'Capa Seção - Resultado Operacional',  fn: () => gerarCapaSecao('RESULTADO', 'OPERACIONAL') },
    { nome: 'Financeiro Mensal',                   fn: gerarSlideFinanceiro },
    { nome: 'Bridge Variação',                     fn: gerarSlideBridge },
    { nome: 'Bridge Gráfico',                      fn: gerarSlideBridgeGrafico },
    { nome: 'Financeiro Anual',                    fn: gerarSlideFinanceiroAnual },
    { nome: 'DRE',                                 fn: gerarSlideDRE },
    { nome: 'Custo M²',                            fn: gerarSlideCustoM2 },
    { nome: 'Energia Solar',                       fn: gerarSlideEnergiaSolar },
    { nome: 'Documentação Legal',                  fn: gerarSlideDocumentos },
    { nome: 'Encerramento',                        fn: gerarSlideEncerramento }
  ];

  const erros = [];
  passos.forEach(p => {
    try {
      Logger.log('  → ' + p.nome);
      p.fn();
    } catch (e) {
      erros.push(p.nome + ': ' + e.message);
      Logger.log('    ✗ ERRO: ' + e.message);
    }
  });

  Logger.log('✔ ' + projeto.nome + ' — ' + (erros.length ? erros.length + ' erro(s).' : 'Sem erros.'));
  if (erros.length) Logger.log(erros.join('\n'));

  // Versionamento visual no Drive (mantido)
  if (typeof registrarRevisaoAutomatica_ === 'function') registrarRevisaoAutomatica_();

  // NÃO gravamos mais o histórico numérico automático: os dados podiam sair
  // errados. O histórico agora é mantido manualmente na planilha validada
  // (HISTORICO_VALIDADO_ID, em 01_Config.gs). Ver Suporte_RegistroDados.gs.
}

function limparApresentacao_() {
  const deck = getDeckAtivo();
  const slides = deck.getSlides();
  for (let i = slides.length - 1; i >= 1; i--) slides[i].remove();
  Logger.log('  Apresentação limpa (' + (slides.length - 1) + ' slides removidos).');
}

function regerarApresentacaoCompleta_() {
  limparApresentacao_();
  gerarApresentacaoCompleta_();

  // A capa agora é GERADA (gerarSlideCapa), então o primeiro slide antigo
  // que limparApresentacao_ preservou fica obsoleto — remove se sobrou.
  const slides = getDeckAtivo().getSlides();
  if (slides.length > 1) {
    slides[0].remove();
    Logger.log('  Capa antiga (slide 1) removida — capa gerada assumiu o lugar.');
  }
}
