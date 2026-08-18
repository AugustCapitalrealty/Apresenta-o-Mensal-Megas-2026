/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   Leitura de dados da planilha do Financeiro
 *
 * Hoje só tem o essencial para a CAPA (mês de referência). O mapeamento das
 * abas de DRE por empresa (Real/Orçado/Ritmo por mês) entra aqui conforme os
 * slides forem especificados com a Ester.
 */

const MESES_NOME_REF = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

/**
 * Mês de referência da apresentação. PROVISÓRIO: usa só o calendário (mês
 * fechado anterior a hoje) — mês corrente ainda não fechou, então o relatório
 * fala do mês anterior. Quando soubermos qual aba/célula da planilha registra
 * o mês de fato coberto pelos números (padrão usado em megas-mensal/02_Dados.gs,
 * obterMesReferencia_), troque este fallback pela leitura real — a capa nunca
 * deve divergir do conteúdo dos outros slides.
 */
function obterMesReferencia_() {
  const hoje = new Date();
  const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior
  const idx = ant.getMonth();
  const ano = ant.getFullYear();
  const nome = MESES_NOME_REF[idx];
  return {
    index: idx,
    nome: nome,
    curto: nome.charAt(0) + nome.slice(1).toLowerCase(),
    ano: ano,
    label: nome + ' / ' + ano
  };
}
