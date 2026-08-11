/**
 * ARQUIVO: 99_main.gs
 * Função principal para orquestrar e gerar todos os slides na ordem correta.
 * ORDEM: Capa → Índice → Overview → Estratificação → Corretiva → Preventiva
 *        → Corretivas Emp. → Preventivas Emp. → Controle Acesso → Gráficos Acesso
 */
function gerarApresentacaoCompleta() {
  Logger.log("Iniciando a geração da apresentação da Capital Realty...");
  try {
    // Opcional: Limpar slides existentes antes de gerar novos (descomente se desejar)
    // limparApresentacao();

    // 01. Capa
    Logger.log("Gerando Slide 01: Capa...");
    gerarSlide01_Capa();

    // 02. Índice / Sumário
    Logger.log("Gerando Slide 02: Índice...");
    gerarSlide02_Indice();

    // 03. Overview Executivo
    Logger.log("Gerando Slide 03: Overview Executivo...");
    gerarSlide03_OverviewExecutivo();

    // CAPA — MANUTENÇÕES
    Logger.log("Gerando Capa: Manutenções...");
    gerarCapaManutencoes();

    // 04. Estratificação de Manutenções
    Logger.log("Gerando Slide 04: Estratificação de Manutenções...");
    gerarSlide04_Manutencoes();

    // 05. Manutenção Corretiva
    Logger.log("Gerando Slide 05: Manutenção Corretiva...");
    gerarSlide05_QuadroManutencao();

    // 06. Manutenção Preventiva (SLA + Agendadas x Realizadas)
    Logger.log("Gerando Slide 06: Manutenção Preventiva...");
    gerarSlide06_Preventivas();

    // 07. Corretivas por Empreendimento
    Logger.log("Gerando Slide 07: Corretivas por Empreendimento...");
    gerarSlide07_CorretivasEmpreendimento();

    // 08. Preventivas por Empreendimento
    Logger.log("Gerando Slide 08: Preventivas por Empreendimento...");
    gerarSlide08_PreventivasEmpreendimento();

    // CAPA — CONTROLE DE ACESSO
    Logger.log("Gerando Capa: Controle de Acesso...");
    gerarCapaControleAcesso();

    // 09. Controle de Acesso (KPIs)
    Logger.log("Gerando Slide 09: Controle de Acesso...");
    gerarSlide09_ControleAcesso();

    // 10A. Gráficos Acesso — Fluxo + Tempo
    Logger.log("Gerando Slide 10A: Gráficos Acesso (Fluxo + Tempo)...");
    gerarSlide10A_GraficosAcesso();

    // 10B. Gráficos Acesso — Celular + Fila
    Logger.log("Gerando Slide 10B: Gráficos Acesso (Celular + Fila)...");
    gerarSlide10B_GraficosAcesso();

    // CAPA — SUSTENTABILIDADE
    Logger.log("Gerando Capa: Sustentabilidade...");
    gerarCapaSustentabilidade();

    // 11. Sustentabilidade — Energia Solar
    Logger.log("Gerando Slide 11: Sustentabilidade...");
    gerarSlide11_Sustentabilidade();

    // CAPA FINAL
    Logger.log("Gerando Capa Final...");
    gerarCapaFinal();

    // ⚠ CHECKLIST — REMOVER ANTES DE APRESENTAR
    Logger.log("Gerando Slide Checklist...");
    gerarSlideChecklist();

    Logger.log("✅ Apresentação gerada com sucesso!");
    
  } catch (error) {
    Logger.log("❌ ERRO FATAL ao gerar apresentação: " + error.message + " | Stack: " + error.stack);
  }
}

/**
 * Função Auxiliar (Opcional): Apaga todos os slides existentes.
 * Útil para não acumular slides toda vez que rodar o script.
 */
function limparApresentacao() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slides = presentation.getSlides();
  
  // Apaga do último para o primeiro
  for (let i = slides.length - 1; i >= 0; i--) {
    slides[i].remove();
  }
  Logger.log("Apresentação limpa. Pronta para gerar novos slides.");
}
