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
 *
 *   Para rodar UM SLIDE avulso (gerarSoXxxCuritiba/Itajai/Esteio): a função
 *   fica no próprio arquivo do slide (ex.: gerarSoChamadosClientesCuritiba
 *   está em Slide_ChamadosClientes.gs, perto de gerarSlideChamadosClientes),
 *   não aqui — Apps Script compila todos os arquivos num namespace só, então
 *   a localização não muda o comportamento, só a organização. Este arquivo
 *   fica só com o pipeline completo e os pontos de entrada por cidade/todas.
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

// Mesma apresentação + o slide de CHECK DE CONSISTÊNCIA no final (confere
// se os números que aparecem em mais de um slide batem entre si). O check
// é DESCARTÁVEL: nasce marcado pra ser apagado antes de apresentar, por
// isso não entra em gerarApresentacaoCompleta_ — quem quiser conferir usa
// estas entradas. Ver Slide_CheckConsistencia.gs.
function regerarCuritibaComCheck() { setProjetoAtivo('CURITIBA'); regerarApresentacaoCompleta_(); gerarSlideCheckConsistencia(); }
function regerarItajaiComCheck()   { setProjetoAtivo('ITAJAI');   regerarApresentacaoCompleta_(); gerarSlideCheckConsistencia(); }
function regerarEsteioComCheck()   { setProjetoAtivo('ESTEIO');   regerarApresentacaoCompleta_(); gerarSlideCheckConsistencia(); }


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
    { nome: 'Capa',                                fn: gerarSlideCapa },
    { nome: 'Destaques do Período',                fn: gerarSlideDestaques },
    { nome: 'Dashboard',                           fn: gerarSlideDashboard },
    { nome: 'Metas',                               fn: gerarSlidesMetas },
    { nome: 'Capa Seção - Manutenção Preventiva',  fn: () => gerarCapaSecao('MANUTENÇÃO', 'PREVENTIVA', 'PREVENTIVA') },
    { nome: 'Preventivas',                         fn: gerarSlidePreventivas },
    { nome: 'Capa Seção - Manutenção Corretiva',   fn: () => gerarCapaSecao('MANUTENÇÃO', 'CORRETIVA', 'CORRETIVA') },
    { nome: 'Corretivas',                          fn: gerarSlideCorretivas },
    { nome: 'Chamados por Prioridade',             fn: gerarSlideChamadosPrioridade },
    { nome: 'Chamados de Clientes',                fn: gerarSlideChamadosClientes },
    { nome: 'Backlog Emergencial — Detalhe',       fn: gerarSlideBacklogEmergencialDetalhe },
    { nome: 'Backlog de Clientes — Detalhe',       fn: gerarSlideBacklogClientesDetalhes },
    { nome: 'Backlog de Clientes — Facilities',    fn: gerarSlideBacklogClientesFacilities },
    { nome: 'Backlog de Clientes — Properties',    fn: gerarSlideBacklogClientesProperties },
    { nome: 'Chamados Pendentes (Backlog)',        fn: gerarSlideBacklogPendentes },
    { nome: 'Backlog Facilities',                  fn: gerarSlideBacklogFacilities },
    { nome: 'Capa Seção - Serviços Contratados',   fn: () => gerarCapaSecao('SERVIÇOS', 'CONTRATADOS', 'CONTRATADOS') },
    { nome: 'Fotos - Serviços Contratados',        fn: gerarSlidesServicosContratados_ },
    { nome: 'Capa Seção - Serviços Internos',      fn: () => gerarCapaSecao('SERVIÇOS', 'INTERNOS', 'INTERNOS') },
    { nome: 'Fotos - Serviços Internos',           fn: gerarSlidesServicosInternos_ },
    { nome: 'Capa Seção - Complementos',           fn: () => gerarCapaSecao('SERVIÇOS', 'COMPLEMENTARES', 'COMPLEMENTOS') },
    { nome: 'Fotos - Complementos',                fn: gerarSlidesComplementos_ },
    { nome: 'Capa Seção - Segurança Patrimonial',  fn: () => gerarCapaSecao('SEGURANÇA', 'PATRIMONIAL', 'PATRIMONIAL') },
    { nome: 'Acesso e Segurança',                  fn: gerarSlideTempo },
    { nome: 'Fotos - Serviços Segurança',          fn: () => gerarSlideRegistroFotos('SERVIÇOS SEGURANÇA') },
    { nome: 'Capa Seção - Resultado Operacional',  fn: () => gerarCapaSecao('RESULTADO', 'OPERACIONAL', 'OPERACIONAL') },
    { nome: 'Financeiro Mensal',                   fn: gerarSlideFinanceiro },
    { nome: 'Bridge Variação',                     fn: gerarSlideBridge },
    { nome: 'Bridge Gráfico',                      fn: gerarSlideBridgeGrafico },
    { nome: 'Financeiro Anual',                    fn: gerarSlideFinanceiroAnual },
    // DRE (aba FINANCEIRO BRIDGE) — Mês + Acumulado sempre pelo Realizado; a
    // projeção anual (3º bloco) pelo Ritmo atual (projeção run-rate). Só essa
    // página entra na apresentação (a versão "Realizado + Orçado" continua
    // disponível via gerarSlideDRE(), avulsa, se precisar).
    { nome: 'DRE — Realizado + Ritmo',             fn: gerarSlideDREComRitmo },
    { nome: 'Custo M²',                            fn: gerarSlideCustoM2 },
    // Mega Curitiba tem projeto de geração própria (Energia Solar), por isso
    // usa a capa "Utilities/Geração e Consumo"; Itajaí e Esteio acompanham
    // consumo/gasto (sem geração própria), então entram com a capa mais
    // genérica de Gestão Sustentável (mesma seção, foto e título diferentes).
    { nome: 'Capa Seção - Utilities/Sustentabilidade', fn: () => {
        if (getProjetoAtivo().nome === 'Mega Curitiba') {
          gerarCapaSecao('UTILITIES', 'GERAÇÃO E CONSUMO', 'UTILITIES');
        } else {
          gerarCapaSecao('GESTÃO', 'SUSTENTÁVEL', 'SUSTENTAVEL');
        }
      } },
    // Curitiba tem projeto de Energia Solar próprio; Itajaí e Esteio usam a
    // aba UTILITIES (consumo/gasto de energia e água) — ver Slide_Utilities.gs.
    { nome: 'Energia Solar / Utilities',           fn: () => {
        if (getProjetoAtivo().nome === 'Mega Curitiba') gerarSlideEnergiaSolar();
        else gerarSlidesUtilities_();
      } },
    // Monitoramento Pluviométrico e Canal de Drenagem — só Mega Esteio (aba
    // de contenção de cheias própria daquele empreendimento).
    { nome: 'Monitoramento Pluviométrico',         fn: () => {
        if (getProjetoAtivo().nome === 'Mega Esteio') gerarSlidesMonitoramentoEsteio_();
      } },
    { nome: 'Capa Seção - Documentação',           fn: () => gerarCapaSecao('DOCUMENTAÇÃO', 'LEGAL', 'DOCUMENTACAO') },
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

  // Versionamento automático no Drive DESLIGADO a pedido do usuário — sem a
  // Drive API habilitada no editor ele só gerava um log de aviso a cada
  // geração, sem nenhum efeito. A função continua em Suporte_Historico.gs
  // (registrarRevisaoAutomatica_) e as versões SOB DEMANDA (marcarFinalCuritiba
  // / marcarFinalItajai / marcarFinalEsteio) continuam funcionando normalmente
  // — só o registro automático de toda execução foi removido do pipeline.

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
  //
  // Por que isto tem try/catch (e um retry) e nada mais no pipeline tinha
  // até aqui: TODOS os passos de conteúdo (o array `passos` em
  // gerarApresentacaoCompleta_) já rodam dentro do próprio try/catch deles —
  // um erro ali vira uma linha "✗ ERRO" no log e a geração continua. Este
  // remove() é o ÚNICO ponto do pipeline que ficava DESPROTEGIDO: se a API
  // do Slides der um soluço passageiro bem no fim de uma execução longa
  // (comum depois de centenas de chamadas de insertShape/insertImage —
  // "Service unavailable: Slides"), a apresentação já está 100% pronta e
  // correta, mas o erro sobe sem tratamento e aparece pro usuário como se a
  // geração inteira tivesse falhado. Um retry único depois de uma pausa
  // curta resolve a maioria dos casos (é transitório); se persistir, vira
  // um aviso no Logger — pior cenário é sobrar o slide de capa antigo pra
  // apagar à mão, nunca perda de conteúdo.
  try {
    const slides = getDeckAtivo().getSlides();
    if (slides.length > 1) {
      slides[0].remove();
      Logger.log('  Capa antiga (slide 1) removida — capa gerada assumiu o lugar.');
    }
  } catch (e) {
    try {
      Utilities.sleep(3000);
      const slides = getDeckAtivo().getSlides();
      if (slides.length > 1) {
        slides[0].remove();
        Logger.log('  Capa antiga (slide 1) removida — capa gerada assumiu o lugar (2ª tentativa).');
      }
    } catch (e2) {
      Logger.log('  ⚠ Não foi possível remover a capa antiga (instabilidade da API do Slides: ' + e2.message +
                 '). A apresentação foi gerada normalmente — só apague o slide 1 (capa antiga) à mão, se ele ainda estiver lá.');
    }
  }
}


// ==========================================
// SÓ OS SLIDES DE FINANCEIRO
// ==========================================
// Gera, no deck da cidade ativa, apenas o bloco financeiro — na MESMA ordem
// e com as MESMAS funções que gerarApresentacaoCompleta_ usa, pra não haver
// risco de o avulso divergir do que sai na apresentação de verdade.
//
// Serve pra conferir os números depois de mexer na planilha (ou no código)
// sem esperar o deck inteiro: são 6 slides em vez de ~30. Igual aos outros
// pontos de entrada avulsos, ANEXA ao deck atual — não apaga nada e não
// substitui a apresentação; apague os slides gerados quando terminar a
// conferência.
//
// A capa de seção ("RESULTADO OPERACIONAL") fica de fora de propósito: numa
// rodada de conferência ela é só um slide a mais pra apagar depois. Quem
// quiser o bloco completo com capa usa a apresentação completa.
//
// Cada slide roda isolado: se um falhar (aba faltando, instabilidade da API),
// os outros continuam e o erro aparece no resumo do Logger — mesmo
// comportamento do pipeline completo.
function gerarSlidesFinanceiro_() {
  const projeto = getProjetoAtivo();
  Logger.log('▶ FINANCEIRO — ' + projeto.nome);

  const passos = [
    { nome: 'Financeiro Mensal',       fn: gerarSlideFinanceiro },
    { nome: 'Bridge Variação',         fn: gerarSlideBridge },
    { nome: 'Bridge Gráfico',          fn: gerarSlideBridgeGrafico },
    { nome: 'Financeiro Anual',        fn: gerarSlideFinanceiroAnual },
    { nome: 'DRE — Realizado + Ritmo', fn: gerarSlideDREComRitmo },
    { nome: 'Custo M²',                fn: gerarSlideCustoM2 }
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

  _financeiroConferencia_();

  Logger.log('✔ Financeiro ' + projeto.nome + ' — ' + passos.length + ' slide(s), ' +
             (erros.length ? erros.length + ' erro(s).' : 'sem erros.'));
  if (erros.length) Logger.log(erros.join('\n'));
  return erros;
}

// Resumo dos números que amarram TODOS os slides financeiros entre si: a
// área (divisor de todo R$/m² do deck) e o custo/meta do mês de referência.
// Vale a pena logar porque foi exatamente aqui que apareceram os problemas
// já corrigidos — área lida errado da aba e custo saindo negativo por causa
// do formato contábil. Batendo estes três números, os seis slides fecham.
function _financeiroConferencia_() {
  try {
    const area = obterAreaM2_();
    const cm   = obterDadosCustoM2();
    if (!cm) { Logger.log('  Conferência: sem dados de Custo M² pra conferir.'); return; }

    const fmt = v => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(2).replace('.', ',');
    Logger.log('  Conferência (mês ' + cm.referencia.nomeMesExtenso + '/' + cm.referencia.ano + '):');
    Logger.log('    área      = ' + (area ? Math.round(area).toLocaleString('pt-BR') + ' m²' : '—'));
    Logger.log('    custo m²  = R$ ' + fmt(cm.kpis.custo) + '/m²');
    Logger.log('    meta m²   = R$ ' + fmt(cm.kpis.meta) + '/m²');
    if (cm.kpis.custo != null && cm.kpis.custo < 0) {
      Logger.log('    ⚠ custo NEGATIVO — a aba METRO QUADRADO está em formato contábil e ' +
                 'algo escapou do Math.abs (ver numeroCelula em 02_Dados.gs).');
    }
    if (!area) {
      Logger.log('    ⚠ sem área: o R$/m² dos slides vai sair omitido. Confira a aba ' +
                 'METRO QUADRADO (linha "TOTAL ÁREA..." e o R$/m² logo abaixo).');
    }
  } catch (e) {
    Logger.log('  Conferência não pôde ser feita: ' + e.message);
  }
}

// Pontos de entrada por cidade — é por eles que se roda no editor do Apps
// Script (o menu suspenso lista só funções sem argumento).
function gerarSoFinanceiroCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlidesFinanceiro_(); }
function gerarSoFinanceiroItajai()   { setProjetoAtivo('ITAJAI');   gerarSlidesFinanceiro_(); }
function gerarSoFinanceiroEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlidesFinanceiro_(); }

// Os três de uma vez — pra conferir se os números batem entre as cidades
// numa rodada só (foi assim que apareceu a diferença de metragem de Esteio).
function gerarSoFinanceiroTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(cidade => {
    setProjetoAtivo(cidade);
    gerarSlidesFinanceiro_();
  });
}
