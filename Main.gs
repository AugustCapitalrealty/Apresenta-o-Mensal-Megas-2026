/**
 * ARQUIVO: Main.gs
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

  Logger.log('✔ ' + projeto.nome + ' — ' + (erros.length ? erros.length + ' erro(s).' : 'Sem erros.'));
  if (erros.length) Logger.log(erros.join('\n'));
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
}
