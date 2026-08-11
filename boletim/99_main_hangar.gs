/**
 * ARQUIVO: 99_main_hangar.gs
 * Boletim versão HANGAR VIP — público interno da operação Hangar.
 *
 * Conteúdo:
 *  - Capa + Índice
 *  - Capa Manutenções
 *  - Manutenção Corretiva (p05 completo — inclui card Operação Hangar)
 *  - Manutenção Preventiva (p06)
 *  - Corretivas por Empreendimento — apenas HANGAR VIP
 *  - Preventivas por Empreendimento — apenas HANGAR VIP
 *  - Capa Final
 *
 * Removidos: Overview Executivo, Estratificação, Controle de Acesso, Sustentabilidade
 */
function gerarApresentacaoHangar(semLimpar = false) {
  Logger.log("Iniciando Boletim HANGAR VIP...");
  try {

    // 00. Limpa slides existentes (pula se chamado por gerarTodasApresentacoes)
    if (!semLimpar) limparApresentacao();

    // Aplica o Design System Hangar VIP (cores, tipografia e logo do brandbook)
    aplicarTemaHangar();

    // 01. Capa — versão Hangar VIP (com elemento circular da marca)
    gerarSlide01_Capa('Boletim\nHangar VIP', 'Operação Hangar — Capital Realty', 'hangar');

    // 02. Índice
    gerarSlide02_Indice();

    // CAPA — MANUTENÇÕES
    gerarCapaManutencoes();

    // 05. Manutenção Corretiva — dados da aba "hangar QUADRO COMPARATIVO"
    gerarSlide05_QuadroManutencao_Hangar();

    // 06. Manutenção Preventiva — dados da aba "hangar QUADRO COMPARATIVO"
    gerarSlide06_Preventivas_Hangar();

    // 07. Corretivas por Empreendimento — apenas Hangar VIP
    gerarSlide07_CorretivasEmpreendimento(false, 'HANGAR VIP');

    // 08. Preventivas por Empreendimento — apenas Hangar VIP
    gerarSlide08_PreventivasEmpreendimento(false, 'HANGAR VIP');

    // CAPA FINAL
    gerarCapaFinal();

    Logger.log("✅ Boletim HANGAR VIP gerado com sucesso!");

  } catch(error) {
    Logger.log("❌ ERRO: " + error.message + " | " + error.stack);
  } finally {
    // Restaura o tema Capital Realty (importante para gerarTodasApresentacoes)
    restaurarTemaCapital();
  }
}

/**
 * PRÉVIA RÁPIDA — gera SOMENTE o slide de Corretivas filtrado para Hangar VIP.
 */
function testarSlide07_Hangar() {
  limparApresentacao();
  gerarSlide07_CorretivasEmpreendimento(false, 'HANGAR VIP');
  Logger.log("✅ Prévia Corretivas Hangar VIP gerada.");
}

/**
 * PRÉVIA RÁPIDA — gera SOMENTE o slide de Preventivas filtrado para Hangar VIP.
 */
function testarSlide08_Hangar() {
  limparApresentacao();
  gerarSlide08_PreventivasEmpreendimento(false, 'HANGAR VIP');
  Logger.log("✅ Prévia Preventivas Hangar VIP gerada.");
}
