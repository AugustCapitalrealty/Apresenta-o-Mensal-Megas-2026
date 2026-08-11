/**
 * ARQUIVO: 99_main_facilities.gs
 * Boletim versão FACILITIES — público interno de Facilities.
 *
 * Diferenças em relação ao boletim completo:
 *  - Estratificação: apenas 3 Megas (sem Outros Imóveis Esteio)
 *  - Manutenção Corretiva: sem Operação Hangar
 *  - Corretivas por Empreendimento: apenas Mega CWB, ITJ, EST
 *  - Preventivas por Empreendimento: apenas Mega CWB, ITJ, EST
 *  - Overview, Controle de Acesso e Sustentabilidade: inalterados
 *  - Manutenção Preventiva (p06): aguardando dados específicos Facilities
 */
function gerarApresentacaoFacilities(semLimpar = false) {
  Logger.log("Iniciando Boletim MEGAS CENTROS LOGÍSTICOS...");
  try {

    // 00. Limpa slides existentes (pula se chamado por gerarTodasApresentacoes)
    if (!semLimpar) limparApresentacao();

    // Aplica o Design System MEGA (cores, tipografia e logo do brandbook)
    aplicarTemaMega();

    // 01. Capa — versão Megas Centros Logísticos (com faixa inclinada da marca)
    gerarSlide01_Capa('Boletim\nMEGAS CENTROS\nLOGÍSTICOS', 'Expansão & Eficiência Capital Realty', 'mega');

    // 02. Índice
    gerarSlide02_Indice();

    // 03. Overview Executivo (igual ao completo)
    gerarSlide03_OverviewExecutivo();

    // CAPA — MANUTENÇÕES
    gerarCapaManutencoes();

    // 04. Estratificação — apenas 3 Megas
    gerarSlide04_Manutencoes(true);

    // 05. Manutenção Corretiva — sem Hangar
    gerarSlide05_QuadroManutencao_Facilities();

    // 06. Manutenção Preventiva — dados Facilities (aba megas QUADRO COMPARATIVO)
    gerarSlide06_Preventivas_Facilities();

    // 07. Corretivas por Empreendimento — apenas 3 Megas
    gerarSlide07_CorretivasEmpreendimento(true);

    // 08. Preventivas por Empreendimento — apenas 3 Megas
    gerarSlide08_PreventivasEmpreendimento(true);

    // CAPA — CONTROLE DE ACESSO
    gerarCapaControleAcesso();

    // 09. Controle de Acesso (igual ao completo)
    gerarSlide09_ControleAcesso();

    // 10A. Gráficos Acesso — Fluxo + Tempo
    gerarSlide10A_GraficosAcesso();

    // 10B. Gráficos Acesso — Celular + Fila
    gerarSlide10B_GraficosAcesso();

    // CAPA — SUSTENTABILIDADE
    gerarCapaSustentabilidade();

    // 11. Sustentabilidade (igual ao completo)
    gerarSlide11_Sustentabilidade();

    // CAPA FINAL
    gerarCapaFinal();

    Logger.log("✅ Boletim MEGAS CENTROS LOGÍSTICOS gerado com sucesso!");

  } catch(error) {
    Logger.log("❌ ERRO: " + error.message + " | " + error.stack);
  } finally {
    // Restaura o tema Capital Realty (importante para gerarTodasApresentacoes)
    restaurarTemaCapital();
  }
}
