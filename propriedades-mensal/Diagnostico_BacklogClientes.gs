/**
 * ARQUIVO: Diagnostico_BacklogClientes.gs
 * DIAGNÓSTICO — por que o slide BACKLOG DE CLIENTES — PROPERTIES sai vazio
 *
 * POR QUE ESTE ARQUIVO EXISTE: o sintoma "o card aparece com o título e a
 * contagem certos, mas nada dentro" NÃO é problema de dados — a contagem só
 * existe porque a leitura funcionou. É `_backlogClientesTabela_` lançando
 * exceção DEPOIS de `criarCardPainel` e ANTES de desenhar a primeira célula.
 *
 * A causa quase certa é a lição 6 do CLAUDE.md: o código é colado à mão,
 * arquivo por arquivo, então o editor fica com metade de uma versão. As
 * funções que a tabela usa moram em OUTROS arquivos:
 *
 *     _sTxt                                    → Slide_Corretivas.gs
 *     LOGO_LARG_PADRAO / LOGO_ALT_PADRAO       → Slide_LogosClientes.gs
 *     _getClienteLogoBlob_/_insertLogoFitLegenda_ → Slide_LogosClientes.gs
 *     criarCardPainel / criarHeaderPadrao      → 01_Config.gs
 *     _propLerCorretivas_ e os _hist*_         → 02_Dados.gs
 *
 * Falta uma só e o slide sai exatamente assim: header, card, e vazio.
 *
 * Rode `diagnosticarBacklogClientes()` — sem sufixo `_`, para aparecer no
 * menu "Selecionar função" do editor (lição 5).
 */

// Cada dependência com o arquivo que a declara e quantos parâmetros ela DEVE
// declarar. `fn.length` acusa o descompasso de assinatura antes de rodar, e o
// nome do arquivo diz o que recopiar — sem isso o erro não aponta para lugar
// nenhum (lição 6 do CLAUDE.md).
const _DEPS_BACKLOG_CLIENTES_ = [
  { nome: '_sTxt',                             arquivo: 'Slide_Corretivas.gs',      args: 10 },
  { nome: 'criarCardPainel',                   arquivo: '01_Config.gs',             args: 7  },
  { nome: 'criarHeaderPadrao',                 arquivo: '01_Config.gs',             args: 3  },
  { nome: 'getDeckMensal_',                    arquivo: '01_Config.gs',             args: 0  },
  { nome: 'CR_DESIGN_SYSTEM',                  arquivo: '01_Config.gs',             valor: true },
  { nome: 'TAG_BACKLOG_CLIENTES',              arquivo: '01_Config.gs',             valor: true },
  { nome: '_tabRemoverPorTag_',                arquivo: '03_Tabelas.gs',            args: 2  },
  { nome: '_tabMarcarSlide_',                  arquivo: '03_Tabelas.gs',            args: 2  },
  { nome: 'LOGO_LARG_PADRAO',                  arquivo: 'Slide_LogosClientes.gs',   valor: true },
  { nome: 'LOGO_ALT_PADRAO',                   arquivo: 'Slide_LogosClientes.gs',   valor: true },
  { nome: '_getClienteLogoBlob_',              arquivo: 'Slide_LogosClientes.gs',   args: 1  },
  { nome: '_insertLogoFitLegenda_',            arquivo: 'Slide_LogosClientes.gs',   args: 8  },
  { nome: 'obterMesReferencia_',               arquivo: '02_Dados.gs',              args: 0  },
  { nome: '_propLerCorretivas_',               arquivo: '02_Dados.gs',              args: 0  },
  { nome: '_histAbertoNoMes_',                 arquivo: '02_Dados.gs',              args: 5  },
  { nome: '_ehCondominio_',                    arquivo: '02_Dados.gs',              args: 1  },
  { nome: '_chamadoResponsabilidadeLocatario_', arquivo: '02_Dados.gs',             args: 1  },
  { nome: '_propEquipeCorretiva_',             arquivo: '02_Dados.gs',              args: 1  },
  { nome: '_histFormatarDataCurta_',           arquivo: '02_Dados.gs',              args: 1  },
  { nome: '_histDiasAberto_',                  arquivo: '02_Dados.gs',              args: 2  },
  { nome: '_histNorm_',                        arquivo: '02_Dados.gs',              args: 1  },
  // Do próprio Slide_BacklogClientesProperties.gs: se estes faltarem, é o
  // arquivo do slide que está velho no editor.
  { nome: '_backlogClientesTabela_',           arquivo: 'Slide_BacklogClientesProperties.gs', args: 10 },
  { nome: '_paginarGruposBacklog_',            arquivo: 'Slide_BacklogClientesProperties.gs', args: 2  },
  { nome: '_charsQueCabem_',                   arquivo: 'Slide_BacklogClientesProperties.gs', args: 2  },
  { nome: '_linhasPorChamadoQueCabem_',        arquivo: 'Slide_BacklogClientesProperties.gs', args: 6  },
  { nome: '_clienteDisplay_',                  arquivo: 'Slide_BacklogClientesProperties.gs', args: 1  },
  { nome: '_TABELA_LINHA_COR_',                arquivo: 'Slide_BacklogClientesProperties.gs', valor: true },
  { nome: '_CLIENTE_PALETA_',                  arquivo: 'Slide_BacklogClientesProperties.gs', valor: true }
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
