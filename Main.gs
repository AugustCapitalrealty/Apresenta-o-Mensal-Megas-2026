/**
 * ARQUIVO: Main.gs
 * DESCRIÇÃO: Orquestrador da geração da apresentação.
 *            Lê PROJETO_ATIVO em Config.gs e gera TODOS os slides em sequência
 *            na apresentação correspondente à cidade ativa.
 *
 * Todos os slides abrem a apresentação via getDeckAtivo() (Config.gs), que
 * resolve o ID pela config PROJETOS + PROJETO_ATIVO. Por isso este script
 * pode ser executado de QUALQUER editor vinculado ao projeto — a geração
 * sempre acontece na apresentação da cidade configurada em PROJETO_ATIVO.
 */


// ==========================================
// ORQUESTRADOR PRINCIPAL
// ==========================================
function gerarApresentacaoCompleta() {
  const projeto = getProjetoAtivo();
  Logger.log('▶ Gerando apresentação de ' + projeto.nome + ' (' + PROJETO_ATIVO + ')');

  const passos = [
    { nome: 'Slide 04 - Dashboard',         fn: gerarSlideDashboard       },
    { nome: 'Slide 05 - Preventivas',       fn: gerarSlidePreventivas     },
    { nome: 'Slide 06 - Corretivas',        fn: gerarSlideCorretivas      },
    { nome: 'Slide 07 - Tempo',             fn: gerarSlideTempo           },
    { nome: 'Slide 08 - Financeiro',        fn: gerarSlideFinanceiro      },
    { nome: 'Slide 11 - Financeiro Anual',  fn: gerarSlideFinanceiroAnual },
    { nome: 'Slide 26 - Custo M²',          fn: gerarSlideCustoM2         },
    { nome: 'Slide 14 - Encerramento',      fn: gerarSlideEncerramento    }
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

  Logger.log('✔ Concluído. ' + (erros.length ? erros.length + ' erro(s).' : 'Sem erros.'));
  if (erros.length) Logger.log(erros.join('\n'));
}


// ==========================================
// LIMPAR SLIDES GERADOS (mantém o slide 1 = capa)
// ==========================================
function limparApresentacao() {
  const deck = getDeckAtivo();
  const slides = deck.getSlides();
  for (let i = slides.length - 1; i >= 1; i--) {
    slides[i].remove();
  }
  Logger.log('Apresentação limpa (' + (slides.length - 1) + ' slides removidos).');
}


// ==========================================
// FLUXO COMPLETO: LIMPA E REGERA
// ==========================================
function regerarApresentacaoCompleta() {
  limparApresentacao();
  gerarApresentacaoCompleta();
}
