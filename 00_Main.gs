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
function gerarSoMetasGuilherme() { setProjetoAtivo('CURITIBA'); gerarSlidesMetasGuilherme(); }

// Gestão de Utilities (consumo/gasto de energia e água) — busca automática na
// aba UTILITIES da planilha da cidade (ver Slide_Utilities.gs). Só Itajaí e
// Esteio; Curitiba usa gerarSoEnergiaSolar() acima.
function gerarSoUtilitiesItajai() { setProjetoAtivo('ITAJAI'); gerarSlidesUtilities_(); }
function gerarSoUtilitiesEsteio() { setProjetoAtivo('ESTEIO'); gerarSlidesUtilities_(); }

// Monitoramento Pluviométrico e Canal de Drenagem — só Mega Esteio, busca
// automática na planilha externa do sistema de gestão predial (ver
// Slide_Utilities.gs / monitoramentoId em 01_Config.gs).
function gerarSoMonitoramentoEsteio() { setProjetoAtivo('ESTEIO'); gerarSlidesMonitoramentoEsteio_(); }

// Backlog Facilities — evolução mensal de chamados, busca automática na aba
// BACKLOG da planilha de Histórico Validado (ver Slide_BacklogFacilities.gs).
// Sem linha para a cidade, cai no slide manual de espaço reservado.
function gerarSoBacklogFacilitiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogFacilities(); }

// Chamados por Prioridade — barras Abertos/Fechados por Prioridade + lista
// dos Emergenciais, busca automática nas abas CHAMADOS ABERTOS MES/CHAMADOS
// FECHADOS MES da planilha de Histórico Validado, filtrado pelo Centro de
// Custos da cidade ativa (ver Slide_ChamadosPrioridade.gs). Sem as abas
// preenchidas, cai no slide manual de espaço reservado.
function gerarSoChamadosPrioridadeCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideChamadosPrioridade(); }
function gerarSoChamadosPrioridadeItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideChamadosPrioridade(); }
function gerarSoChamadosPrioridadeEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideChamadosPrioridade(); }

// Chamados de Clientes — barras Abertos/Fechados por Cliente + lista
// completa de chamados de cada período, mesmas abas do Chamados por
// Prioridade, mas agrupado por Cliente e sem as linhas do próprio
// condomínio (ver Slide_ChamadosClientes.gs). Sem as abas preenchidas,
// cai no slide manual de espaço reservado.
function gerarSoChamadosClientesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideChamadosClientes(); }
function gerarSoChamadosClientesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideChamadosClientes(); }
function gerarSoChamadosClientesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideChamadosClientes(); }

// Backlog Emergencial — Detalhe — chamados de prioridade Emergencial ainda em
// aberto (Estado != Fechado) no Mega ativo, com o detalhe por Equipe
// responsável (Facilities x Property), busca automática na aba "BACKLOG -
// EMERGENCIAL - DETALHE" da planilha de Histórico Validado (ver
// Slide_BacklogEmergencialDetalhe.gs). Sem a aba preenchida, cai no slide
// manual de espaço reservado.
function gerarSoBacklogEmergencialDetalheCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogEmergencialDetalhe(); }

// Slide avulso — Custo do M² do 1º Quadrimestre (Jan-Abr/2026). Não entra na
// geração mensal automática (é um recorte de período fixo, não do mês de
// referência corrente). Troque a cidade e rode a função correspondente.
function gerarSoCustoM2QuadrimestreCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCustoM2Quadrimestre(); }

// DRE avulso — só a versão Realizado + Ritmo (a que entra na apresentação
// completa agora). Gera direto na apresentação do Curitiba, sem rodar o
// resto do fluxo.
function gerarSoDRECuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideDREComRitmo(); }
function gerarSoDREItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideDREComRitmo(); }
function gerarSoDREEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideDREComRitmo(); }

// Slides de fotos avulsos — busca automática no Drive (se a cidade tiver a
// seção em fotosServicos, no 01_Config.gs); senão cai no slide manual de
// colar foto por foto.
function gerarSoServicosContratadosCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlidesServicosContratados_(); }
function gerarSoServicosContratadosItajai()   { setProjetoAtivo('ITAJAI');   gerarSlidesServicosContratados_(); }
function gerarSoServicosContratadosEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlidesServicosContratados_(); }

function gerarSoServicosInternosCuritiba()    { setProjetoAtivo('CURITIBA'); gerarSlidesServicosInternos_(); }
function gerarSoServicosInternosItajai()      { setProjetoAtivo('ITAJAI');   gerarSlidesServicosInternos_(); }
function gerarSoServicosInternosEsteio()      { setProjetoAtivo('ESTEIO');   gerarSlidesServicosInternos_(); }

// COMPLEMENTOS ainda não entra na apresentação completa — falta definir em que
// ponto do fluxo ele aparece. Roda avulso enquanto isso.
function gerarSoComplementosCuritiba()        { setProjetoAtivo('CURITIBA'); gerarSlidesComplementos_(); }


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
    { nome: 'Chamados Pendentes (Backlog)',        fn: gerarSlideBacklogPendentes },
    { nome: 'Backlog Facilities',                  fn: gerarSlideBacklogFacilities },
    { nome: 'Capa Seção - Serviços Contratados',   fn: () => gerarCapaSecao('SERVIÇOS', 'CONTRATADOS', 'CONTRATADOS') },
    { nome: 'Fotos - Serviços Contratados',        fn: gerarSlidesServicosContratados_ },
    { nome: 'Capa Seção - Serviços Internos',      fn: () => gerarCapaSecao('SERVIÇOS', 'INTERNOS', 'INTERNOS') },
    { nome: 'Fotos - Serviços Internos',           fn: gerarSlidesServicosInternos_ },
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
