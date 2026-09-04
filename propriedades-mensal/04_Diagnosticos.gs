/**
 * ARQUIVO: 04_Diagnosticos.gs
 * DIAGNÓSTICOS — tudo que responde "por que o número não bate?"
 *
 * Estavam em quatro lugares: três no 00_Main, seis no 02_Dados e dois em
 * arquivos próprios. Diagnóstico não é dado nem desenho; é a ferramenta que se
 * usa quando os outros dois discordam, e procurar por ela não deveria exigir
 * saber em qual camada alguém a deixou.
 *
 * TODO ponto de entrada aqui é SEM sufixo `_`: o menu "Selecionar função" do
 * editor esconde qualquer nome que comece ou termine com underscore, e uma
 * ferramenta de diagnóstico que não aparece para quem vai rodá-la não existe
 * (lição 5 do CLAUDE.md).
 *
 * O que tem aqui:
 *   diagnosticarPropriedades      a configuração está de pé?
 *   diagnosticarBacklogClientes   as 28 dependências do slide de clientes
 *   conferirIdentidadeBacklog     estoque × fluxo: o mês fecha?
 *   inspecionarBase               cabeçalho real de uma aba
 *   diagnosticarMotivoPausa       vocabulário da coluna de motivo
 *   diagnosticarEstadosPausa      idem, estados
 *   conferirSLA                   a regra de SLA contra a base
 *   conferirPreventivas           previstas × realizadas
 *   conferirEquipes               a divisão Propriedades × Facilities
 *
 * FICA DE FORA `diagnosticarArquivos`, de propósito: ele roda na primeira
 * linha do pipeline e depende de `_PROP_DEPENDENCIAS_`, que é a tabela do
 * próprio check. Separar o ponto de entrada da tabela que ele lê só criaria
 * uma dependência entre arquivos para não ganhar nada.
 */

// Mostra o cabeçalho real de uma aba e uma linha de exemplo. Use quando a
// leitura reclamar de coluna ausente — o mapeamento é por conteúdo do
// cabeçalho, então é aqui que se vê o nome de verdade.
function inspecionarBase(nomeAba) {
  const aba = nomeAba || BD_ABA_PREVENTIVAS;
  Logger.log('======================================================');
  Logger.log('CABEÇALHO DE ' + aba);
  Logger.log('======================================================');
  try {
    const ss = _abrirPlanilha_(BD_CORRETIVAS_ID, 'BD_CORRETIVAS_ID');
    Logger.log('Planilha: "' + ss.getName() + '"');
    Logger.log('Abas: ' + ss.getSheets().map(s => s.getName()).join(', '));

    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('\n⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    Logger.log('\n' + sheet.getName() + ': ' + (data.length - 1) + ' linhas.');
    if (data.length < 2) return;
    data[0].forEach((h, i) => {
      const ex = String(data[1][i] || '').substring(0, 40);
      if (h || ex) Logger.log('  [' + String(i).padStart(2) + '] ' + String(h).padEnd(32) + ' ex.: ' + ex);
    });
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Procura coluna de "motivo da pausa" (ou parecido) na BD-CORRETIVAS, pra
// avaliar se dá pra montar um slide de "Chamados Pendentes por Motivo",
// equivalente honesto ao "Chamados Pendentes (Backlog) por Estado" dos
// Megas (que lá vem de aba digitada à mão, sem fonte bruta — não existe
// pro portfólio de Propriedades). Mostra TODAS as colunas do cabeçalho e,
// pra qualquer uma cujo nome pareça ser de status/motivo/pausa, o
// vocabulário completo (valor + quantas linhas têm esse valor) — mesmo
// espírito de conferirSLA(): responder "que coluna é essa e o que tem
// dentro" sem abrir a planilha.
function diagnosticarMotivoPausa(nomeAba) {
  const aba = nomeAba || BD_ABA_CORRETIVAS;
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — MOTIVO DA PAUSA — ' + aba);
  Logger.log('======================================================');
  try {
    const ss    = _abrirPlanilha_(BD_CORRETIVAS_ID, 'BD_CORRETIVAS_ID');
    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) { Logger.log('Aba vazia.'); return; }

    const hdrOriginal = data[0];
    const hdrNorm      = hdrOriginal.map(_histNorm_);

    Logger.log('\nTodas as colunas (' + hdrOriginal.length + '):');
    hdrOriginal.forEach((h, i) => {
      if (String(h).trim()) Logger.log('  [' + String(i).padStart(2) + '] ' + h);
    });

    // Candidatas: qualquer cabeçalho que contenha uma dessas palavras.
    const CHAVES = ['motivo', 'pausa', 'status', 'situacao', 'fase', 'etapa', 'estagio'];
    const candidatas = [];
    hdrNorm.forEach((h, i) => {
      if (CHAVES.some(k => h.indexOf(k) >= 0)) candidatas.push(i);
    });

    if (!candidatas.length) {
      Logger.log('\n⚠ Nenhuma coluna com nome parecido com motivo/pausa/status/situação/fase/etapa.');
      Logger.log('Se a coluna existir com outro nome, veja a lista completa acima e me diga qual é.');
      return;
    }

    candidatas.forEach(ci => {
      Logger.log('\n--- Coluna [' + ci + '] "' + hdrOriginal[ci] + '" ---');
      const vocab = {};
      for (let r = 1; r < data.length; r++) {
        const v = String(data[r][ci] || '').trim() || '(vazio)';
        vocab[v] = (vocab[v] || 0) + 1;
      }
      Object.keys(vocab).sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
        Logger.log('  ' + String(vocab[v]).padStart(6) + '  ' + v);
      });
    });
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Confere a lógica que o usuário descreveu pro backlog "por motivo": não
// existe coluna "Motivo" separada — inspecionarBase mostrou "Pausado por"
// [8], "Pausado em" [9] e "Estado" [28]. A hipótese é: pra um chamado
// ABERTO (Estado ≠ Fechada/Cancelada), se "Pausado por"/"Pausado em"
// estiver preenchido, o valor de ESTADO nesse momento já É o motivo da
// pausa (ex.: "Aguardando Aprovação Superior"); se não tiver pausa
// registrada, é "Em resolução" — não importa o que Estado diga.
//
// Mostra, separadamente, o vocabulário de Estado dos abertos COM pausa e
// dos abertos SEM pausa — se a hipótese estiver certa, o primeiro grupo
// tem vários valores diferentes e ricos (os "motivos"), e o segundo tem
// um valor só (ou poucos, genéricos) repetido em todas as linhas.
function diagnosticarEstadosPausa(nomeAba) {
  const aba = nomeAba || BD_ABA_CORRETIVAS;
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — ESTADO x PAUSA — ' + aba);
  Logger.log('======================================================');
  try {
    const ss    = _abrirPlanilha_(BD_CORRETIVAS_ID, 'BD_CORRETIVAS_ID');
    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) { Logger.log('Aba vazia.'); return; }

    const hdr = data[0].map(_histNorm_);
    const col = nome => hdr.findIndex(h => h.indexOf(nome) >= 0);
    const cEstado     = col('estado');
    const cPausadoPor = col('pausado por');
    const cPausadoEm  = col('pausado em');
    if (cEstado < 0) { Logger.log('⚠ Coluna Estado não encontrada.'); return; }

    Logger.log('Colunas: Estado=[' + cEstado + ']  Pausado por=[' + cPausadoPor +
               ']  Pausado em=[' + cPausadoEm + ']');

    let abertos = 0, pausados = 0, semPausa = 0;
    const vocabPausado  = {};
    const vocabSemPausa = {};

    for (let r = 1; r < data.length; r++) {
      const estado = String(data[r][cEstado] || '').trim();
      const n = _histNorm_(estado);
      if (n === 'fechada' || n === 'fechado' || n === 'cancelada') continue;
      abertos++;

      const temPausa = (cPausadoPor >= 0 && String(data[r][cPausadoPor] || '').trim()) ||
                        (cPausadoEm  >= 0 && String(data[r][cPausadoEm]  || '').trim());

      if (temPausa) {
        pausados++;
        vocabPausado[estado] = (vocabPausado[estado] || 0) + 1;
      } else {
        semPausa++;
        vocabSemPausa[estado] = (vocabSemPausa[estado] || 0) + 1;
      }
    }

    Logger.log('\nTotal de linhas: ' + (data.length - 1));
    Logger.log('Abertos (Estado ≠ Fechada/Cancelada): ' + abertos);
    Logger.log('  · com Pausado por/em preenchido: ' + pausados);
    Logger.log('  · sem pausa registrada: ' + semPausa);

    const imprimeVocab = (titulo, vocab) => {
      Logger.log('\n--- ' + titulo + ' ---');
      const chaves = Object.keys(vocab);
      if (!chaves.length) { Logger.log('  (nenhum registro)'); return; }
      chaves.sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
        Logger.log('  ' + String(vocab[v]).padStart(6) + '  ' + (v || '(vazio)'));
      });
    };
    imprimeVocab('ESTADO dos ABERTOS **COM** pausa (candidatos a "motivo")', vocabPausado);
    imprimeVocab('ESTADO dos ABERTOS **SEM** pausa (deveria virar "Em resolução")', vocabSemPausa);
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Confere a regra de SLA contra a base real. Roda nas duas janelas porque só
// quem conhece o relatório sabe qual delas reproduz o número oficial.
function conferirSLA(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('SLA — ' + aba + ' — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Regra: cumpridos ÷ (cumpridos + não cumpridos). "Sem SLA" fica fora.');

  const todos = _propLerBase_(aba);
  if (!todos.length) {
    Logger.log('\nBase vazia. Rode inspecionarBase("' + aba + '") para ver o cabeçalho.');
    return;
  }

  // Vocabulário real da coluna: a classificação depende das strings exatas, e
  // um valor novo na planilha tem que aparecer aqui, não sumir na conta.
  const vocab = {};
  todos.forEach(it => {
    const v = String(it.sla || '(vazio)').trim();
    vocab[v] = (vocab[v] || 0) + 1;
  });
  Logger.log('\nValores da coluna SLA na base inteira (' + todos.length + ' registros):');
  Object.keys(vocab).sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
    Logger.log('  ' + _slaClasse_(v === '(vazio)' ? '' : v).padEnd(13) + v + ': ' + vocab[v]);
  });

  const semData = todos.filter(it => !it.dtReporte && !it.dtFechado).length;
  if (semData) Logger.log('\n⚠ ' + semData + ' registro(s) sem nenhuma data legível.');

  [['inicio', 'data prevista/reporte no mês'],
   ['fim',    'data de execução/fechamento no mês']].forEach(([janela, rotulo]) => {
    const lista = slaPorImovel_(aba, ref.ano, ref.index, janela);
    const cons  = slaPortfolio_(aba, ref.ano, ref.index, janela);

    Logger.log('\n--- Janela: ' + rotulo + ' ---');
    if (!lista.length) { Logger.log('  nenhum registro nesta janela.'); return; }
    Logger.log('  ' + 'IMÓVEL'.padEnd(26) + 'CUMPR'.padStart(7) + 'N/CUMPR'.padStart(9) +
               'SEM SLA'.padStart(9) + 'SLA'.padStart(9));
    const linha = (rot, r) => Logger.log('  ' + rot.padEnd(26) + String(r.cumpridos).padStart(7) +
      String(r.naoCumpridos).padStart(9) + String(r.semSla).padStart(9) +
      (r.pct === null ? '—' : r.pct.toFixed(2) + '%').padStart(9));
    lista.forEach(g => linha(g.cc, g));
    Logger.log('  ' + '-'.repeat(60));
    linha('MEGAS', cons.megas);
    linha('DEMAIS IMÓVEIS', cons.demais);
    linha('PORTFÓLIO', cons.total);
    if (cons.total.desconhecidos.length) {
      Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
                 Array.from(new Set(cons.total.desconhecidos)).join(', '));
    }
  });

  Logger.log('\nA janela oficial é "data de agendamento" (SLA_JANELA_PADRAO), ' +
             'verificada contra a planilha de controle em 12 casos.');
}

// Painel do mês: execução e SLA lado a lado, por imóvel, com Megas x demais
// e o acumulado do ano.
function conferirPreventivas(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Previstas = agendadas no mês · Realizadas = dessas, Estado "Fechada"');
  Logger.log('SLA = cumpridos ÷ (cumpridos + não cumpridos); "Sem SLA" fora.');

  const lista = indicadoresPorImovel_(aba, ref.ano, ref.index);
  if (!lista.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'IMÓVEL'.padEnd(26) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  const linha = (rot, d) => Logger.log('  ' + rot.padEnd(26) +
    String(d.execucao.previstas).padStart(6) + String(d.execucao.realizadas).padStart(6) +
    pct(d.execucao.pct).padStart(10) +
    (d.sla.cumpridos + '/' + d.sla.naoCumpridos).padStart(9) + pct(d.sla.pct).padStart(9));

  lista.forEach(g => linha(g.cc, g));
  const cons = indicadoresPortfolio_(aba, ref.ano, ref.index);
  Logger.log('  ' + '-'.repeat(66));
  linha('MEGAS', cons.megas);
  linha('DEMAIS IMÓVEIS', cons.demais);
  linha('PORTFÓLIO', cons.total);

  const ac = indicadoresAcumulado_(aba, ref.ano, ref.index);
  Logger.log('\n  ' + '-'.repeat(66));
  linha('ACUMULADO ' + ref.ano, ac);

  const semSla   = lista.reduce((s, g) => s + g.sla.semSla, 0);
  const emAberto = lista.reduce((s, g) => s + g.execucao.emAberto, 0);

  if (cons.parcial) {
    Logger.log('\n  ⚠ MÊS AINDA ABERTO — números PROVISÓRIOS.');
    Logger.log('    ' + emAberto + ' preventiva(s) nem fechada(s) nem cancelada(s): ainda podem');
    Logger.log('    ser executadas até o fim do mês, e o "Sem SLA" delas só se resolve');
    Logger.log('    no fechamento. Não compare com meses fechados nem leve para o slide.');
  } else if (emAberto) {
    Logger.log('\n  ' + emAberto + ' preventiva(s) do mês seguem sem fechar nem cancelar.');
  }

  if (semSla) {
    Logger.log('\n  ' + semSla + ' registro(s) "Sem SLA" no mês: entram nas PREVISTAS ' +
               'e ficam fora do denominador do SLA.');
  }
  const desc = cons.total.desconhecidos;
  if (desc.length) {
    Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
               Array.from(new Set(desc)).join(', '));
  }
}

// Mostra a divisão por equipe com o volume de cada uma — inclusive a ronda,
// para a decisão sobre ela ser tomada com o número na frente.
function conferirEquipes(ano, mes) {
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS POR EQUIPE — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Equipe = quem consta em "Fechado por" (regra das preventivas).');

  const d = indicadoresPorEquipe_(ref.ano, ref.index);
  const eqs = Object.keys(d).filter(k => k !== 'parcial');
  if (!eqs.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'EQUIPE'.padEnd(20) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  eqs.sort((a, b) => d[b].execucao.previstas - d[a].execucao.previstas).forEach(eq => {
    Logger.log('  ' + eq.padEnd(20) + String(d[eq].execucao.previstas).padStart(6) +
      String(d[eq].execucao.realizadas).padStart(6) + pct(d[eq].execucao.pct).padStart(10) +
      (d[eq].sla.cumpridos + '/' + d[eq].sla.naoCumpridos).padStart(9) +
      pct(d[eq].sla.pct).padStart(9));
  });

  if (d.TERCEIROS) {
    Logger.log('\n  TERCEIROS = ronda e portaria de cada empreendimento (' +
               d.TERCEIROS.execucao.previstas + ' no mês).');
    Logger.log('  Execução contratada, contada à parte da equipe interna.');
  }
  if (d['NÃO IDENTIFICADA']) {
    Logger.log('\n  ' + d['NÃO IDENTIFICADA'].execucao.previstas + ' sem equipe: ainda abertas ' +
               '(sem "Fechado por") ou nome novo — acrescente em _PROP_EQUIPE_.');
  }
  if (d.parcial) Logger.log('\n  ⚠ mês ainda aberto — números provisórios.');
}

// ==========================================
// DIAGNÓSTICO — O QUE FALTA PARA O PROJETO RODAR
// ==========================================
// Mesmo espírito do diagnosticarBacklog() dos Megas: antes de qualquer
// conta, dizer se a configuração está de pé. Rode isto primeiro.
function diagnosticarPropriedades() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — Apresentação Mensal de Propriedades');
  Logger.log('======================================================');

  const pend = [];

  Logger.log('\nDeck de destino:');
  if (!DECK_PROPRIEDADES_ID) {
    Logger.log('  · sem DECK_PROPRIEDADES_ID em 01_Config.gs');
    pend.push('DECK_PROPRIEDADES_ID sem ID');
  } else {
    try {
      const d = SlidesApp.openById(DECK_PROPRIEDADES_ID);
      Logger.log('  ✓ "' + d.getName() + '" (' + d.getSlides().length + ' slides)');
    } catch (e) {
      Logger.log('  ✗ não abriu: ' + e.message);
      pend.push('deck inacessível');
    }
  }

  Logger.log('\nFontes de dados:');
  [['BD-CORRETIVAS', BD_CORRETIVAS_ID],
   ['Histórico Validado', HISTORICO_VALIDADO_ID],
   ['Planilha de Propriedades', PROPRIEDADES_SPREADSHEET_ID],
   ['Torre Manutenção (CR)', typeof TORRE_MANUTENCAO_CR_ID !== 'undefined' ? TORRE_MANUTENCAO_CR_ID : ''],
   ['Torre Manutenção (Demercado)', typeof TORRE_MANUTENCAO_DEMERCADO_ID !== 'undefined' ? TORRE_MANUTENCAO_DEMERCADO_ID : '']
  ].forEach(([nome, id]) => {
    if (!id) { Logger.log('  · ' + nome + ' — sem ID configurado'); pend.push(nome + ' sem ID'); return; }
    try {
      const ss = _abrirPlanilha_(id, 'id');
      Logger.log('  ✓ ' + nome + ' — "' + ss.getName() + '" (' + ss.getSheets().length + ' abas)');
    } catch (e) {
      Logger.log('  ✗ ' + nome + ' — não abriu: ' + e.message);
      pend.push(nome + ' inacessível');
    }
  });

  Logger.log('\n' + (pend.length
    ? 'PENDÊNCIAS (' + pend.length + '):\n    ' + pend.join('\n    ')
    : 'Configuração completa. Rode gerarApresentacaoPropriedades().'));

  // Esta função só confere se a configuração está de pé — é rápida de
  // propósito. A conferência dos NÚMEROS (identidade estoque × fluxo) lê a
  // BD-CORRETIVAS inteira e mora à parte, para não pesar aqui nem na geração.
  Logger.log('\nPara conferir se o backlog do mês fecha com o fluxo, rode' +
             ' conferirIdentidadeBacklog().');
}

// ── de Diagnostico_Identidade.gs ────────────────────────────
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

// ── de Diagnostico_BacklogClientes.gs ────────────────────────────
// Cada dependência com o arquivo que a declara e quantos parâmetros ela DEVE
// declarar. `fn.length` acusa o descompasso de assinatura antes de rodar, e o
// nome do arquivo diz o que recopiar — sem isso o erro não aponta para lugar
// nenhum (lição 6 do CLAUDE.md).
const _DEPS_BACKLOG_CLIENTES_ = [
  { nome: '_sTxt',                             arquivo: '00_Helpers.gs',      args: 11 },
  { nome: 'criarCardPainel',                   arquivo: '00_Helpers.gs',             args: 7  },
  { nome: 'criarHeaderPadrao',                 arquivo: '00_Helpers.gs',             args: 3  },
  { nome: 'getDeckMensal_',                    arquivo: '01_Config.gs',             args: 0  },
  { nome: 'CR_DESIGN_SYSTEM',                  arquivo: '01_Config.gs',             valor: true },
  { nome: 'TAG_BACKLOG_CLIENTES',              arquivo: '01_Config.gs',             valor: true },
  { nome: '_tabRemoverPorTag_',                arquivo: '03_Tabelas.gs',            args: 2  },
  { nome: '_tabMarcarSlide_',                  arquivo: '03_Tabelas.gs',            args: 2  },
  { nome: 'LOGO_LARG_PADRAO',                  arquivo: '01_Config.gs',   valor: true },
  { nome: 'LOGO_ALT_PADRAO',                   arquivo: '01_Config.gs',   valor: true },
  { nome: '_getClienteLogoBlob_',              arquivo: '00_Helpers.gs',   args: 1  },
  { nome: '_insertLogoFitLegenda_',            arquivo: '00_Helpers.gs',   args: 8  },
  { nome: 'obterMesReferencia_',               arquivo: '02_Dados.gs',              args: 0  },
  { nome: '_propLerCorretivas_',               arquivo: '02_Dados.gs',              args: 0  },
  { nome: '_histAbertoNoMes_',                 arquivo: '02_Dados.gs',              args: 5  },
  { nome: '_ehCondominio_',                    arquivo: '02_Dados.gs',              args: 1  },
  { nome: '_chamadoResponsabilidadeLocatario_', arquivo: '02_Dados.gs',             args: 1  },
  { nome: '_propEquipeCorretiva_',             arquivo: '02_Dados.gs',              args: 1  },
  { nome: '_histFormatarDataCurta_',           arquivo: '05_DadosSlides.gs',              args: 1  },
  { nome: '_histDiasAberto_',                  arquivo: '05_DadosSlides.gs',              args: 2  },
  { nome: '_histNorm_',                        arquivo: '02_Dados.gs',              args: 1  },
  // Do próprio 15_Slide_BacklogClientes.gs: se estes faltarem, é o
  // arquivo do slide que está velho no editor.
  { nome: '_backlogClientesTabela_',           arquivo: '15_Slide_BacklogClientes.gs', args: 10 },
  { nome: '_paginarGruposBacklog_',            arquivo: '15_Slide_BacklogClientes.gs', args: 2  },
  { nome: '_charsQueCabem_',                   arquivo: '00_Helpers.gs', args: 2  },
  { nome: '_linhasPorChamadoQueCabem_',        arquivo: '15_Slide_BacklogClientes.gs', args: 6  },
  { nome: '_clienteDisplay_',                  arquivo: '15_Slide_BacklogClientes.gs', args: 1  },
  { nome: '_TABELA_LINHA_COR_',                arquivo: '01_Config.gs', valor: true },
  { nome: '_CLIENTE_PALETA_',                  arquivo: '01_Config.gs', valor: true }
];

function diagnosticarBacklogClientes() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — BACKLOG DE CLIENTES — PROPERTIES');
  Logger.log('======================================================');

  // ── 1. O código novo está mesmo carregado? ───────────────────────────
  // Primeiro isto, sempre: sem as dependências no lugar, qualquer conta
  // abaixo mente ou explode.
  Logger.log('\n1) DEPENDÊNCIAS (o editor tem todos os arquivos?)');
  const recopiar = {};
  _DEPS_BACKLOG_CLIENTES_.forEach(d => {
    let ref;
    try { ref = eval(d.nome); } catch (e) { ref = undefined; }

    if (ref === undefined || ref === null) {
      Logger.log('  ✗ ' + d.nome + ' — NÃO EXISTE neste projeto');
      recopiar[d.arquivo] = (recopiar[d.arquivo] || []).concat(d.nome);
      return;
    }
    if (d.valor) { Logger.log('  ✓ ' + d.nome); return; }
    if (typeof ref !== 'function') {
      Logger.log('  ✗ ' + d.nome + ' — existe mas não é função (' + typeof ref + ')');
      recopiar[d.arquivo] = (recopiar[d.arquivo] || []).concat(d.nome);
      return;
    }
    // Assinatura fora do esperado = arquivo de outra versão no editor.
    if (ref.length !== d.args) {
      Logger.log('  ✗ ' + d.nome + ' — declara ' + ref.length + ' parâmetro(s), esperado ' +
                 d.args + ' → versão ANTIGA no editor');
      recopiar[d.arquivo] = (recopiar[d.arquivo] || []).concat(d.nome + '(' + ref.length + '≠' + d.args + ')');
      return;
    }
    Logger.log('  ✓ ' + d.nome + '(' + d.args + ')');
  });

  const arquivosRuins = Object.keys(recopiar);
  if (arquivosRuins.length) {
    Logger.log('\n  ⚠ RECOPIE ESTES ARQUIVOS PARA O EDITOR:');
    arquivosRuins.forEach(f => Logger.log('      · ' + f + '  → ' + recopiar[f].join(', ')));
    Logger.log('\n  É isto que deixa o slide vazio. Pare aqui, recopie, rode de novo.');
    return;
  }
  Logger.log('  → todas presentes com a assinatura certa.');

  // ── 2. Os dados ──────────────────────────────────────────────────────
  Logger.log('\n2) DADOS (o que a base devolve)');
  let dados;
  try {
    dados = obterDadosBacklogClientesProperties_();
  } catch (e) {
    Logger.log('  ✗ a leitura EXPLODIU: ' + e.message);
    Logger.log('     → o slide sairia vazio por aqui, não pelo desenho.');
    return;
  }
  if (!dados) {
    Logger.log('  · nenhum chamado de cliente em aberto — o slide "zero" é o correto.');
    Logger.log('     (o log de obterDadosBacklogClientesProperties_ diz o que os 4 filtros cortaram)');
    return;
  }
  const ref = obterMesReferencia_();
  Logger.log('  ✓ mês de referência: ' + ref.nome + '/' + ref.ano);
  Logger.log('  ✓ total em aberto: ' + dados.total + ' chamado(s)');
  Logger.log('  ✓ itens na lista:  ' + dados.lista.length +
             (dados.lista.length === dados.total ? '' : '  ⚠ DIVERGE do total'));

  const clientes = {};
  dados.lista.forEach(it => { clientes[it.cliente] = (clientes[it.cliente] || 0) + 1; });
  const nomes = Object.keys(clientes);
  Logger.log('  ✓ clientes distintos: ' + nomes.length);
  nomes.slice(0, 12).forEach(c =>
    Logger.log('      · ' + c + ' (' + clientes[c] + ') → exibe como "' + _clienteDisplay_(c) + '"'));
  if (nomes.length > 12) Logger.log('      · ... e mais ' + (nomes.length - 12));

  // Campo vazio não quebra o desenho (vira "—"), mas explica coluna em branco.
  const semDesc = dados.lista.filter(it => !it.descricao).length;
  const semData = dados.lista.filter(it => !it.dataReporte).length;
  const semEmp  = dados.lista.filter(it => !it.empreendimento).length;
  if (semDesc || semData || semEmp) {
    Logger.log('  ⚠ campos vazios: ' + semDesc + ' sem descrição, ' +
               semData + ' sem data, ' + semEmp + ' sem empreendimento');
  }

  // ── 3. A paginação ───────────────────────────────────────────────────
  Logger.log('\n3) PAGINAÇÃO (quantas páginas e o que cai em cada uma)');
  const deck = getDeckMensal_();
  const H = deck.getPageHeight();
  const topY = 76, listaH = (H - 16) - topY;

  const porCliente = {}, ordem = [];
  dados.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordem.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordem.map(c => porCliente[c]);
  const paginas = _paginarGruposBacklog_(grupos, listaH);

  Logger.log('  ✓ altura útil do card: ' + listaH.toFixed(0) + 'pt');
  Logger.log('  ✓ ' + grupos.length + ' grupo(s) em ' + paginas.length + ' página(s)');
  paginas.forEach((p, i) => {
    const n = p.reduce((s, g) => s + g.length, 0);
    Logger.log('      · página ' + (i + 1) + ': ' + p.length + ' cliente(s), ' + n + ' chamado(s)' +
               (p.length === 0 ? '   ⚠ PÁGINA VAZIA — é este o bug' : ''));
  });

  const somaPaginas = paginas.reduce((s, p) => s + p.reduce((a, g) => a + g.length, 0), 0);
  Logger.log('  ' + (somaPaginas === dados.total ? '✓' : '⚠') +
             ' soma das páginas = ' + somaPaginas + ' / total = ' + dados.total);

  Logger.log('\n→ Dependências OK e páginas com conteúdo: se o slide AINDA sai');
  Logger.log('  vazio, o erro está no desenho de uma célula. Veja a Execução no');
  Logger.log('  editor (Ver > Execuções) — a exceção aparece lá com a linha.');
}
