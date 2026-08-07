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
