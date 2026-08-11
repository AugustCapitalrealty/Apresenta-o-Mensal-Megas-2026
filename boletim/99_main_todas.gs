/**
 * ARQUIVO: 99_main_todas.gs
 * Gera as 3 versões do Boletim em sequência no MESMO arquivo de apresentação.
 * O usuário separa os slides manualmente depois.
 *
 * Ordem gerada:
 *   1. Boletim Propriedades & Facilities (completo)
 *   2. Boletim MEGAS CENTROS LOGÍSTICOS (Facilities)
 *   3. Boletim Hangar VIP
 */
function gerarTodasApresentacoes() {
  Logger.log("========================================");
  Logger.log("  GERANDO TODAS AS APRESENTAÇÕES");
  Logger.log("========================================");

  try {

    // Limpa a apresentação uma única vez no início
    limparApresentacao();

    // ---- 1/3 — BOLETIM COMPLETO ----
    Logger.log("▶ 1/3 — Boletim Completo (Propriedades & Facilities)...");
    gerarApresentacaoCompleta(true);  // semLimpar = true
    Logger.log("✅ Boletim Completo concluído.");

    // ---- 2/3 — BOLETIM MEGAS CENTROS LOGÍSTICOS ----
    Logger.log("▶ 2/3 — Boletim MEGAS CENTROS LOGÍSTICOS...");
    gerarApresentacaoFacilities(true);  // semLimpar = true
    Logger.log("✅ Boletim Facilities concluído.");

    // ---- 3/3 — BOLETIM HANGAR VIP ----
    Logger.log("▶ 3/3 — Boletim Hangar VIP...");
    gerarApresentacaoHangar(true);  // semLimpar = true
    Logger.log("✅ Boletim Hangar VIP concluído.");

  } catch(error) {
    Logger.log("❌ ERRO: " + error.message + " | " + error.stack);
  }

  Logger.log("========================================");
  Logger.log("  TODAS AS APRESENTAÇÕES GERADAS!");
  Logger.log("  Separe os slides manualmente no Google");
  Logger.log("  Slides usando Arquivo > Mover slides.");
  Logger.log("========================================");
}
