/**
 * ARQUIVO: Diagnostico_Identidade.gs
 * CONFERÊNCIA — estoque × fluxo do backlog de corretivas (PROPERTY)
 *
 * POR QUE ESTE ARQUIVO EXISTE: a identidade
 *
 *     backlog(fim) = backlog(início) + criados − fechados
 *
 * era conferida dentro de `obterDashboardPropriedades_`, a cada geração. O
 * commit de performance tirou o cálculo de fluxo do dashboard — com razão,
 * porque ele custava ~2 minutos de leitura da BD-CORRETIVAS e as linhas de
 * fluxo nem são desenhadas no slide. Só que a conferência foi junto, e o
 * dashboard continua mostrando "Backlog em aberto" — agora sem nada que o
 * valide.
 *
 * A saída não é escolher entre rapidez e conferência: é tirar a conferência
 * do caminho crítico. Aqui ela roda SOB DEMANDA, quando alguém quiser saber
 * se o mês fecha, e a geração do deck segue rápida.
 *
 * É a lição 2 do CLAUDE.md, e ela existe porque já aconteceu: JUL/26 saiu com
 * 29 criados, 29 fechados (variação zero) e o backlog subindo de 206 para 220.
 * Nada disso dá erro na tela — só aparece se alguém conferir.
 *
 * Não corrige nada de propósito: só avisa, e é isso que permite o erro
 * aparecer antes da reunião em vez de durante.
 *
 * Ponto de entrada sem sufixo `_`, para aparecer no menu do editor (lição 5).
 */

function conferirIdentidadeBacklog() {
  Logger.log('======================================================');
  Logger.log('CONFERÊNCIA — ESTOQUE × FLUXO (corretivas PROPERTY)');
  Logger.log('======================================================');
  Logger.log('Identidade: backlog(fim) = backlog(início) + criados − fechados');

  const ref    = obterMesReferencia_();
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);
  const nomesCurto = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const rotulo = p => nomesCurto[p.index] + '/' + String(p.ano).slice(-2);

  Logger.log('\nMês de referência: ' + ref.nome + ' ' + ref.ano +
             (_mesEncerrado_(ref.ano, ref.index) ? '  (fechado)' : '  (ainda correndo)'));

  // Só o mês de referência: é o que vai para a reunião, e conferir os 3
  // pontos custaria o triplo da leitura sem responder nada a mais.
  let backlogFim, backlogIni, fluxo;
  try {
    backlogFim = obterBacklogPorCC_(ref.ano, ref.index).reduce((s, b) => s + b.total, 0);
    backlogIni = obterBacklogPorCC_(mesAnt.ano, mesAnt.index).reduce((s, b) => s + b.total, 0);
    fluxo      = obterFluxoCorretivasPropriedades_(ref.ano, ref.index);
  } catch (e) {
    Logger.log('\n✗ a leitura falhou: ' + e.message);
    Logger.log('  Rode diagnosticarPropriedades() para ver se as bases abrem.');
    return;
  }

  const criados  = fluxo.mensal.criados;
  const fechados = fluxo.mensal.fechados;
  const esperado = backlogIni + criados - fechados;
  const dif      = backlogFim - esperado;

  Logger.log('\nAs quatro grandezas:');
  Logger.log('  backlog no fim de ' + rotulo(mesAnt) + ' (início): ' + backlogIni);
  Logger.log('  criados em ' + rotulo(ref) + ':                  ' + criados);
  Logger.log('  fechados em ' + rotulo(ref) + ':                 ' + fechados);
  Logger.log('  backlog no fim de ' + rotulo(ref) + ' (fim):     ' + backlogFim);

  Logger.log('\nConta: ' + backlogIni + ' + ' + criados + ' − ' + fechados + ' = ' + esperado);

  if (dif === 0) {
    Logger.log('\n✓ FECHA. O backlog do slide é consistente com o fluxo do mês.');
    return;
  }

  Logger.log('\n⚠ NÃO FECHA — difere em ' + (dif > 0 ? '+' : '') + dif + ' chamado(s).');
  Logger.log('   (esperado ' + esperado + ', o slide mostra ' + backlogFim + ')');

  // Um mês ainda correndo diverge por construção: chamados entram e saem
  // depois da foto. Só vira problema quando o mês já fechou.
  if (!_mesEncerrado_(ref.ano, ref.index)) {
    Logger.log('\n   O mês ainda está correndo — divergência aqui é esperada.');
    Logger.log('   Reconfira depois que o mês virar.');
    return;
  }

  Logger.log('\n   O mês JÁ FECHOU, então isto é para investigar. Onde olhar,');
  Logger.log('   na ordem em que já deu problema antes:');
  Logger.log('     1. As duas grandezas saem da mesma base bruta? Estoque e');
  Logger.log('        fluxo lidos de planilhas diferentes divergem sempre.');
  Logger.log('     2. A regra de "fechado" é a mesma nos dois lados? Ela mora');
  Logger.log('        em _bdChamadoFechado_ — se um lado exigir Estado E data');
  Logger.log('        e o outro só a data, um chamado conta como fechado e');
  Logger.log('        nunca sai do backlog.');
  Logger.log('     3. Chamado com data de fechamento anterior à de reporte,');
  Logger.log('        ou fora da janela do mês.');
  Logger.log('     4. Mudança de responsável tirando o chamado de PROPERTY');
  Logger.log('        entre um mês e outro — ele some do estoque sem aparecer');
  Logger.log('        como fechado.');
}
